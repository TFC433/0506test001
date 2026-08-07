const { randomUUID } = require('crypto');

const ANSWER_ITEM_TYPES = new Set([
    'short_text',
    'long_text',
    'number',
    'yes_no',
    'single_choice',
    'multiple_choice',
    'dropdown'
]);

const CHOICE_ITEM_TYPES = new Set(['single_choice', 'multiple_choice', 'dropdown']);

const ALLOWED_ITEM_TYPES = new Set([
    'section_heading',
    'information_text',
    ...ANSWER_ITEM_TYPES,
    'card_link',
    'form_thumbnail'
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ActivityIntelligenceError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

class ActivityIntelligenceService {
    constructor({ activityIntelligenceSqlReader, activityIntelligenceSqlWriter, rawContactSqlReader, externalService, config }) {
        this.reader = activityIntelligenceSqlReader;
        this.writer = activityIntelligenceSqlWriter;
        this.rawContactSqlReader = rawContactSqlReader;
        this.externalService = externalService;
        this.config = config || {};
    }

    async listActivities() {
        const activities = await this.reader.listActivities();
        return activities.map(activity => this._activityDto(activity));
    }

    async createActivity(payload = {}, user = {}) {
        const input = this._validateActivityInput(payload, { requireAll: true });
        const actor = this._actorFromUser(user);
        const items = this._normalizeFormItems(this._defaultFormItems(), { assignMissingKeys: true });

        const result = await this.writer.createActivity({
            p_activity: {
                activity_id: randomUUID(),
                ...this._activityInputToRow(input),
                ...this._actorCreateRow(actor)
            },
            p_items: items,
            p_actor: actor
        });

        const activityId = this._resultId(result, 'activity_id');
        const activity = await this.reader.getActivityById(activityId);
        return this._activityDto(activity);
    }

    async getActivity(activityId) {
        const activity = await this._requireActivity(activityId);
        return this._activityDto(activity);
    }

    async updateActivity(activityId, payload = {}, user = {}) {
        await this._requireActivity(activityId);
        const input = this._validateActivityInput(payload, { requireAll: false });
        const actor = this._actorFromUser(user);

        const row = {
            ...this._activityInputToRow(input),
            ...this._actorUpdateRow(actor),
            updated_at: new Date().toISOString()
        };

        const updated = await this.writer.updateActivity(activityId, row);
        if (!updated) throw new ActivityIntelligenceError(404, 'Activity not found.', 'ACTIVITY_NOT_FOUND');
        return this._activityDto(this.reader.mapActivityRow(updated));
    }

    async duplicateActivity(activityId, payload = {}, user = {}) {
        const source = await this._requireActivity(activityId);
        const input = this._validateActivityInput({
            name: payload.name || `${source.name} Copy`,
            description: payload.description !== undefined ? payload.description : source.description,
            formOpenStart: payload.formOpenStart || source.formOpenStart,
            formOpenEnd: payload.formOpenEnd || source.formOpenEnd,
            exhibitionStart: payload.exhibitionStart !== undefined ? payload.exhibitionStart : source.exhibitionStart,
            exhibitionEnd: payload.exhibitionEnd !== undefined ? payload.exhibitionEnd : source.exhibitionEnd
        }, { requireAll: true });
        const actor = this._actorFromUser(user);

        const result = await this.writer.duplicateActivity({
            p_source_activity_id: activityId,
            p_activity: {
                activity_id: randomUUID(),
                ...this._activityInputToRow(input),
                ...this._actorCreateRow(actor)
            },
            p_actor: actor
        });

        const newActivityId = this._resultId(result, 'activity_id');
        const activity = await this.reader.getActivityById(newActivityId);
        return this._activityDto(activity);
    }

    async getForm(activityId) {
        await this._requireActivity(activityId);
        const form = await this.reader.getFormBundle(activityId);
        return this._formBundleDto(form);
    }

    async getDraftForm(activityId) {
        await this._requireActivity(activityId);
        const draft = await this.reader.getDraftForm(activityId);
        if (!draft) throw new ActivityIntelligenceError(404, 'Draft form not found.', 'DRAFT_NOT_FOUND');
        return this._versionDto(draft);
    }

    async getPublishedForm(activityId) {
        await this._requireActivity(activityId);
        const published = await this.reader.getPublishedForm(activityId);
        if (!published) throw new ActivityIntelligenceError(404, 'Published form not found.', 'PUBLISHED_NOT_FOUND');
        return this._versionDto(published);
    }

    async saveDraft(activityId, payload = {}, user = {}) {
        await this._requireActivity(activityId);
        const actor = this._actorFromUser(user);
        const items = this._normalizeFormItems(payload.items || [], { assignMissingKeys: true });

        await this.writer.saveDraft({
            p_activity_id: activityId,
            p_items: items,
            p_actor: actor
        });

        return this.getForm(activityId);
    }

    async discardDraft(activityId, user = {}) {
        await this._requireActivity(activityId);
        const actor = this._actorFromUser(user);

        await this.writer.discardDraft({
            p_activity_id: activityId,
            p_actor: actor
        });

        return this.getForm(activityId);
    }

    async publishDraft(activityId, user = {}) {
        await this._requireActivity(activityId);
        const actor = this._actorFromUser(user);

        await this.writer.publishDraft({
            p_activity_id: activityId,
            p_actor: actor
        });

        return this.getForm(activityId);
    }

    async uploadFormMedia(payload = {}) {
        const folderId = this.config.ACTIVITY_INTELLIGENCE && this.config.ACTIVITY_INTELLIGENCE.FORM_MEDIA_FOLDER_ID;
        if (!folderId) {
            throw new ActivityIntelligenceError(400, 'Activity Intelligence form media folder is not configured.', 'FORM_MEDIA_FOLDER_NOT_CONFIGURED');
        }
        if (!this.externalService || typeof this.externalService.uploadDriveFile !== 'function') {
            throw new ActivityIntelligenceError(500, 'Activity Intelligence media upload is unavailable.', 'FORM_MEDIA_UPLOAD_UNAVAILABLE');
        }

        const file = payload.file || {};
        const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
            throw new ActivityIntelligenceError(400, 'Image file is required.', 'FORM_MEDIA_FILE_REQUIRED');
        }
        if (!allowedTypes.has(file.mimeType)) {
            throw new ActivityIntelligenceError(400, 'Unsupported image type. Use JPG, PNG, or WebP.', 'FORM_MEDIA_TYPE_NOT_ALLOWED');
        }
        if (payload.activityId) this._assertUuid(payload.activityId, 'activityId');
        if (payload.itemKey) this._assertUuid(payload.itemKey, 'itemKey');

        const extension = this._extensionForMimeType(file.mimeType);
        const activityPart = payload.activityId || 'activity';
        const itemPart = payload.itemKey || 'item';
        const fileName = `activity-intelligence-${activityPart}-${itemPart}-${Date.now()}-${randomUUID()}${extension}`;

        return this.externalService.uploadDriveFile({
            folderId,
            fileName,
            mimeType: file.mimeType,
            buffer: file.buffer
        });
    }

    async listSubmissions(activityId, query = {}) {
        await this._requireActivity(activityId);
        const filters = this._normalizeSubmissionFilters(query);
        const submissions = await this.reader.listSubmissions(activityId, filters);
        return this._enrichSubmissionCards(submissions);
    }

    async createSubmission(activityId, payload = {}, user = {}) {
        await this._requireActivity(activityId);
        const published = await this.reader.getPublishedForm(activityId);
        if (!published) throw new ActivityIntelligenceError(409, 'Activity has no current published form.', 'NO_CURRENT_PUBLISHED_FORM');

        const actor = this._actorFromUser(user);
        const cardId = await this._validateOptionalCard(payload.cardId);
        const answers = this._answerRowsFromPayload(payload, published.items);

        const result = await this.writer.createSubmission({
            p_submission: {
                submission_id: randomUUID(),
                activity_id: activityId,
                form_version_id: published.versionId,
                card_id: cardId,
                status: 'active',
                ...this._actorCreateRow(actor)
            },
            p_answers: answers,
            p_actor: actor
        });

        const submissionId = this._resultId(result, 'submission_id');
        return this.getSubmission(submissionId);
    }

    async getSubmission(submissionId) {
        const submission = await this.reader.getSubmissionById(submissionId);
        if (!submission) throw new ActivityIntelligenceError(404, 'Submission not found.', 'SUBMISSION_NOT_FOUND');
        const enriched = await this._enrichSubmissionCards([submission]);
        return enriched[0];
    }

    async updateSubmission(submissionId, payload = {}, user = {}) {
        const current = await this.reader.getSubmissionById(submissionId);
        if (!current) throw new ActivityIntelligenceError(404, 'Submission not found.', 'SUBMISSION_NOT_FOUND');

        const formVersion = await this.reader.getVersionWithItems(current.formVersionId);
        if (!formVersion) throw new ActivityIntelligenceError(409, 'Submission historical form version is unavailable.', 'FORM_VERSION_NOT_FOUND');

        const actor = this._actorFromUser(user);
        const cardId = payload.cardId === undefined ? current.cardId : await this._validateOptionalCard(payload.cardId);
        const answerPayload = {
            answers: payload.answers === undefined ? current.answers : payload.answers,
            otherAnswers: payload.otherAnswers === undefined ? current.otherAnswers : payload.otherAnswers
        };
        const answers = this._answerRowsFromPayload(answerPayload, formVersion.items);

        await this.writer.updateSubmission({
            p_submission_id: submissionId,
            p_card_id: cardId,
            p_answers: answers,
            p_actor: actor
        });

        return this.getSubmission(submissionId);
    }

    async voidSubmission(submissionId, user = {}) {
        return this._setSubmissionStatus(submissionId, 'void', user);
    }

    async restoreSubmission(submissionId, user = {}) {
        return this._setSubmissionStatus(submissionId, 'active', user);
    }

    _validateActivityInput(payload, options = {}) {
        const requireAll = options.requireAll === true;
        const normalized = {};

        if (requireAll || payload.name !== undefined) {
            const name = String(payload.name || '').trim();
            if (!name) throw new ActivityIntelligenceError(400, 'Activity name is required.', 'INVALID_ACTIVITY_NAME');
            normalized.name = name;
        }

        if (payload.description !== undefined) normalized.description = String(payload.description || '');

        if (requireAll || payload.formOpenStart !== undefined || payload.formOpenEnd !== undefined) {
            const formOpenStart = this._normalizeDate(payload.formOpenStart);
            const formOpenEnd = this._normalizeDate(payload.formOpenEnd);
            if (!formOpenStart || !formOpenEnd) {
                throw new ActivityIntelligenceError(400, 'Form open start and end dates are required.', 'INVALID_FORM_DATE_RANGE');
            }
            if (formOpenEnd < formOpenStart) {
                throw new ActivityIntelligenceError(400, 'Form open end date cannot be earlier than start date.', 'INVALID_FORM_DATE_RANGE');
            }
            normalized.formOpenStart = formOpenStart;
            normalized.formOpenEnd = formOpenEnd;
        }

        const hasExhibitionStart = payload.exhibitionStart !== undefined && payload.exhibitionStart !== null && payload.exhibitionStart !== '';
        const hasExhibitionEnd = payload.exhibitionEnd !== undefined && payload.exhibitionEnd !== null && payload.exhibitionEnd !== '';
        if (requireAll || payload.exhibitionStart !== undefined || payload.exhibitionEnd !== undefined) {
            if (hasExhibitionStart !== hasExhibitionEnd) {
                throw new ActivityIntelligenceError(400, 'Exhibition start and end must be provided together or both omitted.', 'INVALID_EXHIBITION_DATE_RANGE');
            }
            normalized.exhibitionStart = hasExhibitionStart ? this._normalizeDate(payload.exhibitionStart) : null;
            normalized.exhibitionEnd = hasExhibitionEnd ? this._normalizeDate(payload.exhibitionEnd) : null;
            if (normalized.exhibitionStart && normalized.exhibitionEnd && normalized.exhibitionEnd < normalized.exhibitionStart) {
                throw new ActivityIntelligenceError(400, 'Exhibition end date cannot be earlier than start date.', 'INVALID_EXHIBITION_DATE_RANGE');
            }
        }

        return normalized;
    }

    _activityInputToRow(input) {
        const row = {};
        if (input.name !== undefined) row.name = input.name;
        if (input.description !== undefined) row.description = input.description;
        if (input.formOpenStart !== undefined) row.form_open_start = input.formOpenStart;
        if (input.formOpenEnd !== undefined) row.form_open_end = input.formOpenEnd;
        if (input.exhibitionStart !== undefined) row.exhibition_start = input.exhibitionStart;
        if (input.exhibitionEnd !== undefined) row.exhibition_end = input.exhibitionEnd;
        return row;
    }

    _activityDto(activity) {
        if (!activity) return null;
        return {
            ...activity,
            status: this._deriveActivityStatus(activity)
        };
    }

    _deriveActivityStatus(activity) {
        const today = new Date().toISOString().slice(0, 10);
        if (today < activity.formOpenStart) return { key: 'upcoming', label: '尚未開始' };
        if (today >= activity.formOpenStart && today <= activity.formOpenEnd) return { key: 'open', label: '進行中' };
        return { key: 'ended', label: '已結束' };
    }

    _formBundleDto(form) {        return {
            published: form && form.published ? this._versionDto(form.published) : null,
            draft: form && form.draft ? this._versionDto(form.draft) : null
        };
    }

    _versionDto(version) {
        if (!version) return null;
        return {
            versionId: version.versionId,
            versionNumber: version.versionNumber,
            publishedAt: version.publishedAt,
            publishedByUserId: version.publishedByUserId,
            publishedByDisplayName: version.publishedByDisplayName,
            items: (version.items || []).map(item => this._formItemDto(item))
        };
    }

    _formItemDto(item) {
        return {
            ...item,
            options: Array.isArray(item.options) ? item.options : [],
            optionEntries: Array.isArray(item.optionEntries) ? item.optionEntries : [],
            settings: item.settings || {}
        };
    }

    _normalizeFormItems(items, options = {}) {
        if (!Array.isArray(items)) {
            throw new ActivityIntelligenceError(400, 'Form items must be an array.', 'INVALID_FORM_ITEMS');
        }

        const seenKeys = new Set();
        const normalized = items.map((item, index) => this._normalizeFormItem(item, index, seenKeys, options));

        const cardLinks = normalized.filter(item => item.item_type === 'card_link').length;
        const thumbnails = normalized.filter(item => item.item_type === 'form_thumbnail').length;
        if (cardLinks > 1) throw new ActivityIntelligenceError(400, 'Only one card_link item is allowed.', 'DUPLICATE_CARD_LINK');
        if (thumbnails > 1) throw new ActivityIntelligenceError(400, 'Only one form_thumbnail item is allowed.', 'DUPLICATE_FORM_THUMBNAIL');

        return normalized;
    }

    _normalizeFormItem(item = {}, index, seenKeys, options = {}) {
        const type = item.type || item.itemType || item.item_type;
        if (!ALLOWED_ITEM_TYPES.has(type)) {
            throw new ActivityIntelligenceError(400, `Unsupported form item type: ${type || ''}`, 'INVALID_FORM_ITEM_TYPE');
        }

        const suppliedKey = item.itemKey || item.item_key || item.fieldId || item.field_id || item.itemId || item.item_id;
        const itemKey = suppliedKey || (options.assignMissingKeys ? randomUUID() : null);
        if (!itemKey) throw new ActivityIntelligenceError(400, 'Form item key is required.', 'MISSING_ITEM_KEY');
        this._assertUuid(itemKey, 'itemKey');
        if (seenKeys.has(itemKey)) throw new ActivityIntelligenceError(400, `Duplicate form item key: ${itemKey}`, 'DUPLICATE_ITEM_KEY');
        seenKeys.add(itemKey);

        const title = String(item.title || '').trim();
        if (!title) throw new ActivityIntelligenceError(400, 'Form item title is required.', 'MISSING_ITEM_TITLE');

        const settings = this._normalizeItemSettings(item);
        const optionEntries = this._normalizeOptions(item, type);

        return {
            item_key: itemKey,
            item_type: type,
            title,
            helper_text: String(item.helperText || item.helper_text || ''),
            placeholder: String(item.placeholder || ''),
            options: optionEntries,
            settings,
            is_hidden: item.visible === false || item.isHidden === true || item.is_hidden === true,
            is_removed: Boolean(item.removedInDraft || item.isRemoved || item.is_removed),
            sort_order: Number.isInteger(item.sortOrder) ? item.sortOrder : index + 1
        };
    }

    _normalizeItemSettings(item) {
        const sourceSettings = item.settings && typeof item.settings === 'object' ? item.settings : {};
        const settings = { ...sourceSettings };

        if (item.allowOther !== undefined || item.allow_other !== undefined || sourceSettings.allowOther !== undefined) {
            settings.allowOther = Boolean(item.allowOther || item.allow_other || sourceSettings.allowOther);
        }

        ['thumbnailTitle', 'altText', 'thumbnailVariant'].forEach(key => {
            if (item[key] !== undefined) settings[key] = item[key];
            else if (sourceSettings[key] !== undefined) settings[key] = sourceSettings[key];
        });

        return settings;
    }

    _extensionForMimeType(mimeType) {
        if (mimeType === 'image/png') return '.png';
        if (mimeType === 'image/webp') return '.webp';
        return '.jpg';
    }

    _normalizeOptions(item, type) {
        if (!CHOICE_ITEM_TYPES.has(type)) return [];
        const options = Array.isArray(item.optionEntries)
            ? item.optionEntries
            : (Array.isArray(item.option_entries) ? item.option_entries : item.options);

        if (!Array.isArray(options) || options.length === 0) {
            throw new ActivityIntelligenceError(400, 'Choice fields must include at least one option.', 'MISSING_OPTIONS');
        }

        return options.map((option, index) => {
            const source = option && typeof option === 'object' ? option : { label: option };
            const label = String(source.label || source.value || '').trim();
            if (!label) throw new ActivityIntelligenceError(400, 'Choice option labels cannot be blank.', 'INVALID_OPTION');
            const optionKey = source.optionKey || source.option_key || randomUUID();
            this._assertUuid(optionKey, 'optionKey');
            return {
                optionKey,
                label,
                value: source.value || label,
                sortOrder: index + 1
            };
        });
    }

    _answerRowsFromPayload(payload, items) {
        const answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
        const otherAnswers = payload.otherAnswers && typeof payload.otherAnswers === 'object' ? payload.otherAnswers : {};

        return (items || [])
            .filter(item => ANSWER_ITEM_TYPES.has(item.type))
            .map(item => this._answerRowForItem(item, answers[item.itemKey] !== undefined ? answers[item.itemKey] : answers[item.fieldId], otherAnswers[item.itemKey] || otherAnswers[item.fieldId]))
            .filter(Boolean);
    }

    _answerRowForItem(item, value, otherText) {
        const hasOtherText = String(otherText || '').trim() !== '';
        if (this._isEmptyAnswer(value) && !hasOtherText) return null;
        this._assertUuid(item.formItemId, 'formItemId');

        const row = {
            form_item_id: item.formItemId
        };

        if (hasOtherText) row.other_text = String(otherText).trim();

        if (item.type === 'short_text' || item.type === 'long_text') {
            row.value_text = String(value || '').trim();
        } else if (item.type === 'number') {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) throw new ActivityIntelligenceError(400, `Invalid number answer for ${item.itemKey}.`, 'INVALID_NUMBER_ANSWER');
            row.value_number = numeric;
        } else if (item.type === 'yes_no') {
            row.value_boolean = this._normalizeBooleanAnswer(value);
        } else if (CHOICE_ITEM_TYPES.has(item.type)) {
            row.value_jsonb = this._normalizeChoiceAnswer(value, item);
        }

        return row;
    }

    _normalizeChoiceAnswer(value, item) {
        const values = Array.isArray(value) ? value : [value];
        const cleaned = values
            .filter(entry => !this._isEmptyAnswer(entry))
            .map(entry => {
                if (entry && typeof entry === 'object') {
                    const optionKey = entry.optionKey || entry.option_key || null;
                    if (optionKey) this._assertUuid(optionKey, 'optionKey');
                    return {
                        optionKey,
                        label: entry.label || entry.value || '',
                        value: entry.value || entry.label || ''
                    };
                }
                const option = (item.optionEntries || []).find(candidate => candidate.optionKey === entry || candidate.value === entry || candidate.label === entry);
                return option ? { optionKey: option.optionKey, label: option.label, value: option.value } : { value: entry };
            });

        return item.type === 'multiple_choice' ? cleaned : (cleaned[0] || null);
    }

    _normalizeBooleanAnswer(value) {
        if (value === true || value === false) return value;
        const normalized = String(value || '').trim().toLowerCase();
        if (['yes', 'y', 'true', '1', '是', '有'].includes(normalized)) return true;
        if (['no', 'n', 'false', '0', '否', '無'].includes(normalized)) return false;
        throw new ActivityIntelligenceError(400, 'Invalid yes/no answer.', 'INVALID_BOOLEAN_ANSWER');
    }

    _normalizeSubmissionFilters(query = {}) {
        const state = query.state || query.status || null;
        if (state && !['active', 'void', 'all'].includes(state)) {
            throw new ActivityIntelligenceError(400, 'Invalid submission state filter.', 'INVALID_SUBMISSION_STATE');
        }

        return {
            dateStart: this._normalizeOptionalDate(query.dateStart || query.start),
            dateEnd: this._normalizeOptionalDate(query.dateEnd || query.end),
            recorderUserId: query.recorderUserId || query.userId || null,
            recorderDisplayName: query.recorderDisplayName || query.recorder || null,
            state,
            includeVoid: query.includeVoid === 'true' || query.includeVoid === true || state === 'void' || state === 'all',
            search: query.search || query.q || ''
        };
    }

    async _setSubmissionStatus(submissionId, status, user) {
        const current = await this.reader.getSubmissionById(submissionId);
        if (!current) throw new ActivityIntelligenceError(404, 'Submission not found.', 'SUBMISSION_NOT_FOUND');

        const actor = this._actorFromUser(user);
        const updated = await this.writer.updateSubmissionStatus(submissionId, status, this._actorUpdateRow(actor));
        if (!updated) throw new ActivityIntelligenceError(404, 'Submission not found.', 'SUBMISSION_NOT_FOUND');
        return this.getSubmission(submissionId);
    }

    async _requireActivity(activityId) {
        if (!activityId) throw new ActivityIntelligenceError(400, 'Activity ID is required.', 'MISSING_ACTIVITY_ID');
        const activity = await this.reader.getActivityById(activityId);
        if (!activity) throw new ActivityIntelligenceError(404, 'Activity not found.', 'ACTIVITY_NOT_FOUND');
        return activity;
    }

    async _validateOptionalCard(cardId) {
        if (cardId === undefined || cardId === null || cardId === '') return null;
        this._assertUuid(cardId, 'cardId');
        const card = await this.rawContactSqlReader.getRawContactByCardId(cardId);
        if (!card) throw new ActivityIntelligenceError(404, 'RAW card not found.', 'RAW_CARD_NOT_FOUND');
        return cardId;
    }

    async _enrichSubmissionCards(submissions) {
        const enriched = [];
        for (const submission of submissions) {
            if (!submission.cardId) {
                enriched.push(submission);
                continue;
            }

            const card = await this.rawContactSqlReader.getRawContactByCardId(submission.cardId);
            enriched.push({
                ...submission,
                card: card ? {
                    cardId: card.cardId,
                    name: card.name,
                    company: card.company,
                    position: card.position,
                    email: card.email,
                    phone: card.phone,
                    mobile: card.mobile,
                    driveFileId: card.driveFileId,
                    driveLink: card.driveLink,
                    driveFilename: card.driveFilename,
                    thumbnailUrl: card.driveFileId ? `/api/external/thumbnail?fileId=${encodeURIComponent(card.driveFileId)}` : null
                } : null
            });
        }
        return enriched;
    }

    _actorFromUser(user = {}) {
        const userId = user.userId || user.user_id || user.id || user.username || user.email;
        const displayName = user.displayName || user.display_name || user.name || user.username || user.email || 'Unknown User';

        if (!userId) {
            throw new ActivityIntelligenceError(401, 'Authenticated actor identity is unavailable.', 'ACTOR_UNAVAILABLE');
        }

        return {
            userId: String(userId),
            displayName: String(displayName),
            username: user.username || String(userId),
            role: user.role || null,
            sessionId: user.session_id || user.sessionId || null
        };
    }

    _actorCreateRow(actor) {
        return {
            created_by_user_id: actor.userId,
            created_by_display_name: actor.displayName,
            updated_by_user_id: actor.userId,
            updated_by_display_name: actor.displayName
        };
    }

    _actorUpdateRow(actor) {
        return {
            updated_by_user_id: actor.userId,
            updated_by_display_name: actor.displayName
        };
    }

    _normalizeDate(value) {
        if (!value) return null;
        const normalized = String(value).slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
    }

    _assertUuid(value, label) {
        if (!UUID_REGEX.test(String(value || ''))) {
            throw new ActivityIntelligenceError(400, `${label} must be a valid UUID.`, 'INVALID_UUID');
        }
    }

    _normalizeOptionalDate(value) {
        if (!value) return null;
        const normalized = this._normalizeDate(value);
        if (!normalized) throw new ActivityIntelligenceError(400, 'Invalid date filter.', 'INVALID_DATE_FILTER');
        return normalized;
    }

    _isEmptyAnswer(value) {
        if (value === null || value === undefined) return true;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return false;
        return String(value).trim() === '';
    }

    _resultId(result, key) {
        if (!result) return null;
        if (typeof result === 'string') return result;
        if (Array.isArray(result)) return this._resultId(result[0], key);
        return result[key] || result.id || result.activityId || result.submissionId || null;
    }

    _defaultFormItems() {
        return [
            { type: 'card_link', title: '名片連結', helperText: '連結本次紀錄使用的 RAW 名片。' },
            { type: 'section_heading', title: '展場客戶訪談資訊', helperText: '記錄本次展場接觸的基本背景。' },
            { type: 'multiple_choice', title: '客戶參觀目的', options: ['了解產品方案', '尋找合作夥伴', '評估導入需求', '既有客戶交流', '其他'], allowOther: true },
            { type: 'short_text', title: '客戶姓名', placeholder: '請輸入客戶姓名' },
            { type: 'short_text', title: '公司名稱', placeholder: '請輸入公司或單位名稱' },
            { type: 'short_text', title: '職稱', placeholder: '請輸入職稱' },
            { type: 'number', title: '同行人數', placeholder: '請輸入人數' },
            { type: 'short_text', title: '聯絡方式', placeholder: '例如電話、Email、LINE 或其他聯絡資訊' },
            { type: 'section_heading', title: '需求與產業輪廓', helperText: '協助後續業務判斷優先順序與適合方案。' },
            { type: 'multiple_choice', title: '客戶關注議題', options: ['AI', '自動化', '數位轉型', '資訊安全', '系統整合'], allowOther: true },
            { type: 'dropdown', title: '客戶產業大類', options: ['製造業', '科技業', '醫療照護', '金融服務', '政府與教育', '其他'], allowOther: true },
            { type: 'dropdown', title: '客戶產業細項', options: ['半導體', 'CNC 加工', '電子組裝', '機械設備', '通路代理', '其他'], allowOther: true },
            { type: 'single_choice', title: '後續追蹤優先度', options: ['高', '中', '低', '暫不追蹤'], allowOther: true },
            { type: 'section_heading', title: '補充紀錄', helperText: '可先快速紀錄，細節展後再補。' },
            { type: 'information_text', title: '填寫提示', helperText: '訪談過程可先記錄關鍵字，詳細需求與內部備註可於展後整理時完成。' },
            { type: 'long_text', title: '補充紀錄 1', placeholder: '請輸入第一段補充紀錄' },
            { type: 'long_text', title: '補充紀錄 2', placeholder: '請輸入第二段補充紀錄' },
            { type: 'long_text', title: '補充紀錄 3', placeholder: '請輸入第三段補充紀錄' }
        ];
    }
}

ActivityIntelligenceService.ActivityIntelligenceError = ActivityIntelligenceError;

module.exports = ActivityIntelligenceService;
