const { supabase } = require('../config/supabase');

const ACTIVITY_SELECT = '*';
const VERSION_SELECT = '*';
const ITEM_SELECT = '*';
const SUBMISSION_SELECT = '*';
const ANSWER_SELECT = '*';
const ANSWER_HYDRATION_PAGE_SIZE = 500;
const DEFAULT_FORM_CONTEXT = 'visitor';

class ActivityIntelligenceSqlReader {
    constructor() {
        this.activitiesTable = 'activity_intelligence_activities';
        this.formVersionsTable = 'activity_intelligence_form_versions';
        this.formItemsTable = 'activity_intelligence_form_items';
        this.submissionsTable = 'activity_intelligence_submissions';
        this.answersTable = 'activity_intelligence_submission_answers';
        this.supplementsTable = 'activity_intelligence_submission_supplements';
    }

    async listActivities() {
        const { data, error } = await supabase
            .from(this.activitiesTable)
            .select(ACTIVITY_SELECT)
            .order('form_open_start', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false, nullsFirst: false });

        if (error) throw this._dbError('listActivities', error);
        return (data || []).map(row => this.mapActivityRow(row));
    }

    async getActivityById(activityId) {
        const { data, error } = await supabase
            .from(this.activitiesTable)
            .select(ACTIVITY_SELECT)
            .eq('activity_id', activityId)
            .maybeSingle();

        if (error) throw this._dbError('getActivityById', error);
        return data ? this.mapActivityRow(data) : null;
    }

    async getFormBundle(activityId, formContext = DEFAULT_FORM_CONTEXT) {
        const { data: versions, error: versionError } = await supabase
            .from(this.formVersionsTable)
            .select(VERSION_SELECT)
            .eq('activity_id', activityId)
            .eq('form_context', formContext || DEFAULT_FORM_CONTEXT)
            .in('status', ['draft', 'published'])
            .order('version_number', { ascending: true });

        if (versionError) throw this._dbError('getFormBundle.versions', versionError);

        const mappedVersions = (versions || []).map(row => this.mapFormVersionRow(row));
        const versionIds = mappedVersions.map(version => version.versionId);
        const itemsByVersionId = await this.getItemsByVersionIds(versionIds);

        return {
            published: this._attachItems(mappedVersions.find(version => version.status === 'published'), itemsByVersionId),
            draft: this._attachItems(mappedVersions.find(version => version.status === 'draft'), itemsByVersionId)
        };
    }

    async getPublishedForm(activityId, formContext = DEFAULT_FORM_CONTEXT) {
        return this._getSingleVersionWithItems(activityId, 'published', formContext);
    }

    async getDraftForm(activityId, formContext = DEFAULT_FORM_CONTEXT) {
        return this._getSingleVersionWithItems(activityId, 'draft', formContext);
    }

    async getVersionWithItems(formVersionId) {
        if (!formVersionId) return null;

        const { data: version, error } = await supabase
            .from(this.formVersionsTable)
            .select(VERSION_SELECT)
            .eq('form_version_id', formVersionId)
            .maybeSingle();

        if (error) throw this._dbError('getVersionWithItems.version', error);
        if (!version) return null;

        const mappedVersion = this.mapFormVersionRow(version);
        const itemsByVersionId = await this.getItemsByVersionIds([mappedVersion.versionId]);
        return this._attachItems(mappedVersion, itemsByVersionId);
    }

    async getItemsByVersionIds(versionIds) {
        if (!Array.isArray(versionIds) || versionIds.length === 0) return new Map();

        const { data, error } = await supabase
            .from(this.formItemsTable)
            .select(ITEM_SELECT)
            .in('form_version_id', versionIds)
            .order('sort_order', { ascending: true });

        if (error) throw this._dbError('getItemsByVersionIds', error);

        return (data || []).reduce((acc, row) => {
            const item = this.mapFormItemRow(row);
            const list = acc.get(item.formVersionId) || [];
            list.push(item);
            acc.set(item.formVersionId, list);
            return acc;
        }, new Map());
    }

    async listSubmissions(activityId, filters = {}) {
        let query = supabase
            .from(this.submissionsTable)
            .select(SUBMISSION_SELECT)
            .eq('activity_id', activityId);

        if (filters.state && filters.state !== 'all') {
            query = query.eq('status', filters.state);
        } else if (!filters.includeVoid) {
            query = query.neq('status', 'void');
        }

        if (filters.dateStart) query = query.gte('created_at', `${filters.dateStart}T00:00:00.000Z`);
        if (filters.dateEnd) query = query.lte('created_at', `${filters.dateEnd}T23:59:59.999Z`);
        if (filters.recorderUserId) query = query.eq('created_by_user_id', filters.recorderUserId);
        if (filters.recorderDisplayName) query = query.eq('created_by_display_name', filters.recorderDisplayName);
        if (filters.recordContext) query = query.eq('record_context', filters.recordContext);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw this._dbError('listSubmissions', error);

        const submissions = (data || []).map(row => this.mapSubmissionRow(row));
        return this.hydrateSubmissionDetails(submissions, { search: filters.search });
    }

    async listFormAssistItems() {
        const { data, error } = await supabase
            .from(this.formItemsTable)
            .select(ITEM_SELECT)
            .order('sort_order', { ascending: true });

        if (error) throw this._dbError('listFormAssistItems', error);
        return (data || []).map(row => this.mapFormItemRow(row));
    }

    async searchSubmissionAnswersByItems(formItemIds, queryText, limit = 120, filters = {}) {
        const ids = Array.isArray(formItemIds) ? formItemIds.filter(Boolean) : [];
        const q = String(queryText || '').trim();
        if (!ids.length || !q) return [];

        let query = supabase
            .from(this.answersTable)
            .select(ANSWER_SELECT)
            .in('form_item_id', ids)
            .ilike('value_text', `%${q}%`);

        const submissionIds = Array.isArray(filters.submissionIds) ? filters.submissionIds.filter(Boolean) : [];
        if (submissionIds.length) query = query.in('submission_id', submissionIds);

        const { data, error } = await query
            .order('submission_answer_id', { ascending: false })
            .limit(Math.max(1, Math.min(Number(limit) || 120, 300)));

        if (error) throw this._dbError('searchSubmissionAnswersByItems', error);
        return (data || []).map(row => this.mapAnswerRow(row));
    }

    async listSubmissionIdsByActivityIds(activityIds) {
        const ids = Array.isArray(activityIds) ? [...new Set(activityIds.filter(Boolean))] : [];
        if (!ids.length) return [];

        const { data, error } = await supabase
            .from(this.submissionsTable)
            .select('submission_id')
            .in('activity_id', ids)
            .neq('status', 'void')
            .order('created_at', { ascending: false });

        if (error) throw this._dbError('listSubmissionIdsByActivityIds', error);
        return (data || []).map(row => row.submission_id).filter(Boolean);
    }

    async getSubmissionsByIds(submissionIds, filters = {}) {
        const ids = Array.isArray(submissionIds) ? [...new Set(submissionIds.filter(Boolean))] : [];
        if (!ids.length) return [];

        let query = supabase
            .from(this.submissionsTable)
            .select(SUBMISSION_SELECT)
            .in('submission_id', ids)
            .neq('status', 'void');

        const activityIds = Array.isArray(filters.activityIds) ? filters.activityIds.filter(Boolean) : [];
        if (activityIds.length) query = query.in('activity_id', activityIds);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw this._dbError('getSubmissionsByIds', error);

        const submissions = (data || []).map(row => this.mapSubmissionRow(row));
        return this.hydrateSubmissionDetails(submissions);
    }

    async getActivitiesByIds(activityIds) {
        const ids = Array.isArray(activityIds) ? [...new Set(activityIds.filter(Boolean))] : [];
        if (!ids.length) return new Map();

        const { data, error } = await supabase
            .from(this.activitiesTable)
            .select(ACTIVITY_SELECT)
            .in('activity_id', ids);

        if (error) throw this._dbError('getActivitiesByIds', error);
        return new Map((data || []).map(row => {
            const activity = this.mapActivityRow(row);
            return [activity.id, activity];
        }));
    }

    async getSubmissionById(submissionId) {
        const { data, error } = await supabase
            .from(this.submissionsTable)
            .select(SUBMISSION_SELECT)
            .eq('submission_id', submissionId)
            .maybeSingle();

        if (error) throw this._dbError('getSubmissionById', error);
        if (!data) return null;

        const hydrated = await this.hydrateSubmissionDetails([this.mapSubmissionRow(data)]);
        return hydrated[0] || null;
    }

    async hydrateSubmissionDetails(submissions, options = {}) {
        if (!Array.isArray(submissions) || submissions.length === 0) return [];

        const submissionIds = submissions.map(submission => submission.id);
        const versionIds = [...new Set(submissions.map(submission => submission.formVersionId).filter(Boolean))];

        const [answersBySubmissionId, itemsByVersionId, versionsById] = await Promise.all([
            this.getAnswersBySubmissionIds(submissionIds),
            this.getItemsByVersionIds(versionIds),
            this.getVersionsByIds(versionIds)
        ]);

        const hydrated = submissions.map(submission => {
            const answers = answersBySubmissionId.get(submission.id) || [];
            const items = itemsByVersionId.get(submission.formVersionId) || [];
            const version = versionsById.get(submission.formVersionId) || null;
            return this.mapSubmissionDto(submission, answers, version, items);
        });

        if (!options.search) return hydrated;

        const needle = String(options.search).trim().toLowerCase();
        if (!needle) return hydrated;

        return hydrated.filter(submission => {
            const haystack = [
                submission.createdByDisplayName,
                submission.updatedByDisplayName,
                submission.card && submission.card.name,
                submission.card && submission.card.company,
                ...Object.values(submission.answers || {}).flat(),
                ...Object.values(submission.otherAnswers || {})
            ].filter(value => value !== null && value !== undefined).join(' ').toLowerCase();

            return haystack.includes(needle);
        });
    }

    async getAnswersBySubmissionIds(submissionIds) {
        if (!Array.isArray(submissionIds) || submissionIds.length === 0) return new Map();

        const rows = [];
        let from = 0;

        while (true) {
            const to = from + ANSWER_HYDRATION_PAGE_SIZE - 1;
            const { data, error } = await supabase
                .from(this.answersTable)
                .select(ANSWER_SELECT)
                .in('submission_id', submissionIds)
                .order('submission_answer_id', { ascending: true })
                .range(from, to);

            if (error) throw this._dbError('getAnswersBySubmissionIds', error);

            const pageRows = data || [];
            rows.push(...pageRows);

            if (pageRows.length < ANSWER_HYDRATION_PAGE_SIZE) break;
            from += ANSWER_HYDRATION_PAGE_SIZE;
        }

        return rows.reduce((acc, row) => {
            const answer = this.mapAnswerRow(row);
            const list = acc.get(answer.submissionId) || [];
            list.push(answer);
            acc.set(answer.submissionId, list);
            return acc;
        }, new Map());
    }

    async getSupplementSummariesBySubmissionIds(submissionIds, actorUserId) {
        const rows = await this.getSupplementsBySubmissionIds(submissionIds);
        return rows.reduce((acc, row) => {
            const current = acc.get(row.submissionId) || {
                additionalVisitorCount: 0,
                contributionCount: 0,
                myContribution: null
            };
            if (row.supplementType === 'additional_visitor') current.additionalVisitorCount += 1;
            if (row.supplementType === 'contribution') {
                current.contributionCount += 1;
                if (actorUserId && row.actorUserId === actorUserId) current.myContribution = row;
            }
            acc.set(row.submissionId, current);
            return acc;
        }, new Map());
    }

    async getSupplementsBySubmissionIds(submissionIds) {
        const ids = Array.isArray(submissionIds) ? [...new Set(submissionIds.filter(Boolean))] : [];
        if (!ids.length) return [];

        const { data, error } = await supabase
            .from(this.supplementsTable)
            .select('*')
            .in('submission_id', ids)
            .order('created_at', { ascending: true });

        if (error) throw this._dbError('getSupplementsBySubmissionIds', error);
        return (data || []).map(row => this.mapSupplementRow(row)).filter(Boolean);
    }

    async getVersionsByIds(versionIds) {
        if (!Array.isArray(versionIds) || versionIds.length === 0) return new Map();

        const { data, error } = await supabase
            .from(this.formVersionsTable)
            .select(VERSION_SELECT)
            .in('form_version_id', versionIds);

        if (error) throw this._dbError('getVersionsByIds', error);

        return new Map((data || []).map(row => {
            const version = this.mapFormVersionRow(row);
            return [version.versionId, version];
        }));
    }

    mapActivityRow(row) {
        if (!row) return null;

        return {
            id: row.activity_id,
            name: row.name,
            description: row.description || '',
            settings: row.settings && typeof row.settings === 'object' ? row.settings : {},
            formOpenStart: row.form_open_start,
            formOpenEnd: row.form_open_end,
            exhibitionStart: row.exhibition_start,
            exhibitionEnd: row.exhibition_end,
            createdByUserId: row.created_by_user_id,
            createdByDisplayName: row.created_by_display_name,
            createdAt: row.created_at,
            updatedByUserId: row.updated_by_user_id,
            updatedByDisplayName: row.updated_by_display_name,
            updatedAt: row.updated_at
        };
    }

    mapFormVersionRow(row) {
        if (!row) return null;

        return {
            versionId: row.form_version_id,
            activityId: row.activity_id,
            formContext: row.form_context || DEFAULT_FORM_CONTEXT,
            versionNumber: row.version_number,
            status: row.status,
            publishedAt: row.published_at,
            publishedByUserId: row.published_by_user_id,
            publishedByDisplayName: row.published_by_display_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: []
        };
    }

    mapFormItemRow(row) {
        if (!row) return null;

        const settings = row.settings && typeof row.settings === 'object' ? row.settings : {};

        return {
            formItemId: row.form_item_id,
            formVersionId: row.form_version_id,
            itemKey: row.item_key,
            fieldId: row.item_key,
            itemId: row.item_key,
            type: row.item_type,
            category: this._categoryForType(row.item_type),
            title: row.title || '',
            helperText: row.helper_text || '',
            placeholder: row.placeholder || '',
            options: this._mapOptions(row.options),
            optionEntries: Array.isArray(row.options) ? row.options : [],
            allowOther: Boolean(settings.allowOther),
            settings,
            visible: row.is_hidden !== true,
            removedInDraft: Boolean(row.is_removed),
            sortOrder: row.sort_order
        };
    }

    mapSubmissionRow(row) {
        if (!row) return null;

        return {
            id: row.submission_id,
            activityId: row.activity_id,
            formVersionId: row.form_version_id,
            recordContext: row.record_context || DEFAULT_FORM_CONTEXT,
            status: row.status,
            cardId: row.card_id,
            createdByUserId: row.created_by_user_id,
            createdByDisplayName: row.created_by_display_name,
            createdAt: row.created_at,
            updatedByUserId: row.updated_by_user_id,
            updatedByDisplayName: row.updated_by_display_name,
            updatedAt: row.updated_at
        };
    }

    mapAnswerRow(row) {
        if (!row) return null;

        return {
            answerId: row.submission_answer_id,
            submissionId: row.submission_id,
            formItemId: row.form_item_id,
            valueText: row.value_text,
            valueNumber: row.value_number,
            valueBoolean: row.value_boolean,
            valueJsonb: row.value_jsonb,
            otherText: row.other_text
        };
    }

    mapSupplementRow(row) {
        if (!row) return null;
        const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
        return {
            supplementId: row.supplement_id,
            submissionId: row.submission_id,
            supplementType: row.supplement_type,
            actorUserId: row.actor_user_id,
            actorDisplayName: row.actor_display_name,
            cardId: row.card_id,
            payload,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    mapSubmissionDto(submission, answerRows, formVersion, items) {
        const itemsByFormItemId = new Map((items || []).map(item => [item.formItemId, item]));
        const answers = {};
        const otherAnswers = {};

        (answerRows || []).forEach(answer => {
            const item = itemsByFormItemId.get(answer.formItemId);
            if (!item) return;

            if (answer.otherText) otherAnswers[item.itemKey] = answer.otherText;

            if (answer.valueText !== null && answer.valueText !== undefined) answers[item.itemKey] = answer.valueText;
            else if (answer.valueNumber !== null && answer.valueNumber !== undefined) answers[item.itemKey] = answer.valueNumber;
            else if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) answers[item.itemKey] = answer.valueBoolean;
            else if (answer.valueJsonb !== null && answer.valueJsonb !== undefined) answers[item.itemKey] = answer.valueJsonb;
        });

        return {
            ...submission,
            answers,
            otherAnswers,
            card: null,
            formSnapshot: formVersion ? {
                versionId: formVersion.versionId,
                formContext: formVersion.formContext || DEFAULT_FORM_CONTEXT,
                versionNumber: formVersion.versionNumber,
                publishedAt: formVersion.publishedAt,
                items: items || []
            } : null
        };
    }

    _attachItems(version, itemsByVersionId) {
        if (!version) return null;
        return {
            ...version,
            items: itemsByVersionId.get(version.versionId) || []
        };
    }

    async _getSingleVersionWithItems(activityId, status, formContext = DEFAULT_FORM_CONTEXT) {
        const { data, error } = await supabase
            .from(this.formVersionsTable)
            .select(VERSION_SELECT)
            .eq('activity_id', activityId)
            .eq('form_context', formContext || DEFAULT_FORM_CONTEXT)
            .eq('status', status)
            .maybeSingle();

        if (error) throw this._dbError(`getSingleVersion.${status}`, error);
        if (!data) return null;

        const version = this.mapFormVersionRow(data);
        const itemsByVersionId = await this.getItemsByVersionIds([version.versionId]);
        return this._attachItems(version, itemsByVersionId);
    }

    _mapOptions(options) {
        if (!Array.isArray(options)) return [];
        return options.map(option => {
            if (option && typeof option === 'object') return option.label || option.value || '';
            return option;
        });
    }

    _categoryForType(type) {
        if (['section_heading', 'information_text', 'form_thumbnail'].includes(type)) return 'layout_component';
        if (type === 'card_link') return 'integration_component';
        return 'field';
    }

    _dbError(method, error) {
        return new Error(`[ActivityIntelligenceSqlReader] ${method} DB Error: ${error.message}`);
    }
}

module.exports = ActivityIntelligenceSqlReader;
