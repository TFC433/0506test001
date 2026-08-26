const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ActivityIntelligenceService = require('../services/activity-intelligence-service');
const ActivityIntelligenceController = require('../controllers/activity-intelligence.controller');

const IDS = {
    activity: '11111111-1111-4111-8111-111111111111',
    newActivity: '11111111-1111-4111-8111-111111111112',
    copyActivity: '11111111-1111-4111-8111-111111111113',
    publishedVersion: '22222222-2222-4222-8222-222222222221',
    draftVersion: '22222222-2222-4222-8222-222222222222',
    oldVersion: '22222222-2222-4222-8222-222222222223',
    activePublishedVersion: '22222222-2222-4222-8222-222222222224',
    activeDraftVersion: '22222222-2222-4222-8222-222222222225',
    textKey: '33333333-3333-4333-8333-333333333331',
    numberKey: '33333333-3333-4333-8333-333333333332',
    boolKey: '33333333-3333-4333-8333-333333333333',
    choiceKey: '33333333-3333-4333-8333-333333333334',
    cardKey: '33333333-3333-4333-8333-333333333335',
    oldTextKey: '33333333-3333-4333-8333-333333333336',
    longKey: '33333333-3333-4333-8333-333333333337',
    activeLongKey: '33333333-3333-4333-8333-333333333338',
    textItem: '44444444-4444-4444-8444-444444444441',
    numberItem: '44444444-4444-4444-8444-444444444442',
    boolItem: '44444444-4444-4444-8444-444444444443',
    choiceItem: '44444444-4444-4444-8444-444444444444',
    cardItem: '44444444-4444-4444-8444-444444444445',
    oldTextItem: '44444444-4444-4444-8444-444444444446',
    longItem: '44444444-4444-4444-8444-444444444447',
    activeLongItem: '44444444-4444-4444-8444-444444444448',
    optionAlpha: '55555555-5555-4555-8555-555555555551',
    card: '66666666-6666-4666-8666-666666666661',
    secondCard: '66666666-6666-4666-8666-666666666663',
    missingCard: '66666666-6666-4666-8666-666666666662',
    newSubmission: '77777777-7777-4777-8777-777777777771',
    oldSubmission: '77777777-7777-4777-8777-777777777772',
    aiSubmission: '77777777-7777-4777-8777-777777777773',
    voidSubmission: '77777777-7777-4777-8777-777777777774',
    activeAiSubmission: '77777777-7777-4777-8777-777777777775',
    additionalVisitorSupplement: '88888888-8888-4888-8888-888888888881',
    createdAdditionalVisitorSupplement: '88888888-8888-4888-8888-888888888883',
    contributionSupplement: '88888888-8888-4888-8888-888888888882',
    otherActivity: '11111111-1111-4111-8111-111111111114'
};
const OTHER_CHOICE_VALUE = Buffer.from('5YW25LuW', 'base64').toString('utf8');

const baseActivity = {
    id: IDS.activity,
    name: 'Expo',
    description: '',
    formOpenStart: '2026-08-01',
    formOpenEnd: '2026-08-31',
    exhibitionStart: null,
    exhibitionEnd: null,
    settings: {},
    createdByUserId: 'creator',
    createdByDisplayName: 'Creator',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedByUserId: 'creator',
    updatedByDisplayName: 'Creator',
    updatedAt: '2026-08-01T00:00:00.000Z'
};

const FORM_ASSIST_CJK_EXPECTED_COPY = Object.freeze({
    activitySourcesTitle: '歷史建議資料來源',
    activitySourcesHelper1: '選擇此活動填表時可用於姓名與公司歷史建議的活動資料。',
    activitySourcesHelper2: '未選擇任何活動時，不提供歷史資料建議。',
    currentActivity: '目前活動',
    formActionLabel: '從名片帶入',
    cardImportTitle: '套用名片資料？',
    cardImportDescription: '目前表單已有姓名、職稱或公司內容。請選擇這次名片資料的套用方式。',
    cardImportCancel: '取消',
    cardImportPreserve: '保留已有內容，只補空欄',
    cardImportOverwrite: '覆蓋已有內容'
});

const publishedItems = [
    { formItemId: IDS.textItem, itemKey: IDS.textKey, fieldId: IDS.textKey, type: 'short_text', title: 'Text', options: [], optionEntries: [], visible: true, removedInDraft: false },
    { formItemId: IDS.numberItem, itemKey: IDS.numberKey, fieldId: IDS.numberKey, type: 'number', title: 'Number', options: [], optionEntries: [], visible: true, removedInDraft: false },
    { formItemId: IDS.boolItem, itemKey: IDS.boolKey, fieldId: IDS.boolKey, type: 'yes_no', title: 'Bool', options: [], optionEntries: [], visible: true, removedInDraft: false },
    {
        formItemId: IDS.choiceItem,
        itemKey: IDS.choiceKey,
        fieldId: IDS.choiceKey,
        type: 'multiple_choice',
        title: 'Choice',
        options: ['Display value should not be preferred'],
        optionEntries: [{ optionKey: IDS.optionAlpha, label: 'Alpha', value: 'Alpha' }],
        settings: { allowOptionNotes: true },
        visible: true,
        removedInDraft: false
    },
    { formItemId: IDS.longItem, itemKey: IDS.longKey, fieldId: IDS.longKey, type: 'long_text', title: 'Long Need', options: [], optionEntries: [], visible: true, removedInDraft: false },
    { formItemId: IDS.cardItem, itemKey: IDS.cardKey, fieldId: IDS.cardKey, type: 'card_link', title: 'Card', options: [], optionEntries: [], visible: true, removedInDraft: false }
];

const oldItems = [
    { formItemId: IDS.oldTextItem, itemKey: IDS.oldTextKey, fieldId: IDS.oldTextKey, type: 'short_text', title: 'Old Text', options: [], optionEntries: [] }
];

const activeItems = [
    { formItemId: IDS.activeLongItem, itemKey: IDS.activeLongKey, fieldId: IDS.activeLongKey, type: 'long_text', title: 'Active Long Signal', options: [], optionEntries: [], visible: true, removedInDraft: false }
];

function makeHarness(options = {}) {
    const calls = {};
    const submissions = new Map();
    const supplements = new Map();
    const missingFormContexts = new Set(options.missingFormContexts || []);
    const initializedFormContexts = new Set(options.initializedFormContexts || []);
    const draftItemsByContext = options.draftItemsByContext || {};

    const itemsForFormContext = formContext => {
        if (formContext !== 'field_intelligence') return publishedItems;
        if (missingFormContexts.has(formContext) && initializedFormContexts.has(formContext)) return [];
        return activeItems;
    };
    const versionIdForFormContext = formContext => formContext === 'field_intelligence' ? IDS.activePublishedVersion : IDS.publishedVersion;
    const draftVersionIdForFormContext = formContext => formContext === 'field_intelligence' ? IDS.activeDraftVersion : IDS.draftVersion;
    const itemsForVersionId = versionId => {
        if (versionId === IDS.oldVersion) return oldItems;
        if (versionId === IDS.activePublishedVersion) return activeItems;
        return publishedItems;
    };
    const answerRowsForSubmission = submission => {
        const items = itemsForVersionId(submission.formVersionId);
        return Object.entries(submission.answers || {}).map(([fieldId, value]) => {
            const item = items.find(candidate => candidate.fieldId === fieldId || candidate.itemKey === fieldId);
            const row = {
                submissionId: submission.id,
                formItemId: item && item.formItemId,
                valueText: null,
                valueNumber: null,
                valueBoolean: null,
                valueJsonb: null,
                otherText: null
            };
            if (typeof value === 'number') row.valueNumber = value;
            else if (typeof value === 'boolean') row.valueBoolean = value;
            else if (Array.isArray(value) || (value && typeof value === 'object')) row.valueJsonb = value;
            else row.valueText = value;
            return row;
        });
    };
    const formBundleForContext = (activityId, formContext = 'visitor') => {
        if (missingFormContexts.has(formContext) && !initializedFormContexts.has(formContext)) {
            return { published: null, draft: null };
        }
        const items = itemsForFormContext(formContext);
        const draftItems = draftItemsByContext[formContext] || items;
        return {
            published: { versionId: versionIdForFormContext(formContext), formContext, versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items },
            draft: { versionId: draftVersionIdForFormContext(formContext), formContext, versionNumber: 2, items: draftItems.map(item => ({ ...item })) }
        };
    };

    const reader = {
        mapActivityRow: row => ({ ...baseActivity, id: row.activity_id || row.id, name: row.name || baseActivity.name }),
        async listActivities() {
            return [baseActivity];
        },
        async getActivityById(id) {
            return id === 'missing' ? null : { ...baseActivity, id, settings: options.activitySettings || baseActivity.settings };
        },
        async getFormBundle(activityId, formContext = 'visitor') {
            calls.getFormBundle = { activityId, formContext };
            return formBundleForContext(activityId, formContext);
        },
        async getPublishedForm(activityId, formContext = 'visitor') {
            calls.getPublishedForm = { activityId, formContext };
            return formBundleForContext(activityId, formContext).published;
        },
        async getDraftForm(activityId, formContext = 'visitor') {
            calls.getDraftForm = { activityId, formContext };
            return formBundleForContext(activityId, formContext).draft;
        },
        async getVersionWithItems(versionId) {
            return versionId === IDS.oldVersion
                ? { versionId: IDS.oldVersion, versionNumber: 1, publishedAt: '2026-07-01T00:00:00.000Z', items: oldItems }
                : null;
        },
        async listSubmissions(activityId, filters = {}) {
            calls.listSubmissions = { activityId, filters };
            return [...submissions.values()].filter(submission => {
                if (submission.activityId !== activityId) return false;
                if (filters.state && filters.state !== 'all' && submission.status !== filters.state) return false;
                if (!filters.includeVoid && submission.status === 'void') return false;
                if (filters.recordContext && submission.recordContext !== filters.recordContext) return false;
                if (filters.dateStart && submission.createdAt.slice(0, 10) < filters.dateStart) return false;
                if (filters.dateEnd && submission.createdAt.slice(0, 10) > filters.dateEnd) return false;
                if (filters.recorderDisplayName && submission.createdByDisplayName !== filters.recorderDisplayName) return false;
                return true;
            });
        },
        async listSubmissionOverviewRows(activityIds, filters = {}) {
            calls.listSubmissionOverviewRows = { activityIds, filters };
            const ids = new Set(activityIds || []);
            return [...submissions.values()].filter(submission => {
                if (!ids.has(submission.activityId)) return false;
                if (filters.recorderUserId && submission.createdByUserId !== filters.recorderUserId) return false;
                return true;
            }).map(submission => ({
                id: submission.id,
                activityId: submission.activityId,
                formVersionId: submission.formVersionId,
                recordContext: submission.recordContext,
                status: submission.status,
                createdByUserId: submission.createdByUserId,
                createdByDisplayName: submission.createdByDisplayName,
                createdAt: submission.createdAt,
                updatedByUserId: submission.updatedByUserId,
                updatedByDisplayName: submission.updatedByDisplayName,
                updatedAt: submission.updatedAt
            }));
        },
        async getOverviewAnswerRowsBySubmissionIds(submissionIds) {
            calls.getOverviewAnswerRowsBySubmissionIds = submissionIds;
            const ids = new Set(submissionIds || []);
            return [...submissions.values()].filter(submission => ids.has(submission.id)).flatMap(answerRowsForSubmission);
        },
        async getItemsByVersionIds(versionIds) {
            calls.getItemsByVersionIds = versionIds;
            return new Map((versionIds || []).map(versionId => [versionId, itemsForVersionId(versionId)]));
        },
        async getSubmissionById(id) {
            return submissions.get(id) || null;
        },
        async getSupplementsBySubmissionIds(submissionIds) {
            calls.getSupplementsBySubmissionIds = (calls.getSupplementsBySubmissionIds || 0) + 1;
            const ids = new Set(submissionIds || []);
            return [...supplements.values()].filter(row => ids.has(row.submissionId));
        },
        async getSupplementSummariesBySubmissionIds(submissionIds, actorUserId) {
            calls.getSupplementSummariesBySubmissionIds = (calls.getSupplementSummariesBySubmissionIds || 0) + 1;
            const rows = await this.getSupplementsBySubmissionIds(submissionIds);
            return rows.reduce((acc, row) => {
                const current = acc.get(row.submissionId) || { additionalVisitorCount: 0, contributionCount: 0, myContribution: null };
                if (row.supplementType === 'additional_visitor') current.additionalVisitorCount += 1;
                if (row.supplementType === 'contribution') {
                    current.contributionCount += 1;
                    if (actorUserId && row.actorUserId === actorUserId) current.myContribution = row;
                }
                acc.set(row.submissionId, current);
                return acc;
            }, new Map());
        }
    };

    const writer = {
        async createActivity(payload) {
            calls.createActivity = payload;
            return { activity_id: IDS.newActivity };
        },
        async duplicateActivity(payload) {
            calls.duplicateActivity = payload;
            return { activity_id: IDS.copyActivity };
        },
        async saveDraft(payload) {
            calls.saveDraft = payload;
            return { activity_id: payload.p_activity_id };
        },
        async discardDraft(payload) {
            calls.discardDraft = payload;
            return { activity_id: payload.p_activity_id };
        },
        async publishDraft(payload) {
            calls.publishDraft = payload;
            return { activity_id: payload.p_activity_id };
        },
        async createSubmission(payload) {
            calls.createSubmissionCount = (calls.createSubmissionCount || 0) + 1;
            calls.createSubmission = payload;
            submissions.set(IDS.newSubmission, {
                id: IDS.newSubmission,
                activityId: payload.p_submission.activity_id,
                formVersionId: payload.p_submission.form_version_id,
                recordContext: payload.p_submission.record_context || 'visitor',
                status: 'active',
                answers: {},
                otherAnswers: {},
                cardId: payload.p_submission.card_id,
                card: null,
                formSnapshot: { versionId: IDS.publishedVersion, formContext: payload.p_submission.record_context || 'visitor', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
                createdByUserId: payload.p_actor.userId,
                createdByDisplayName: payload.p_actor.displayName,
                createdAt: '2026-08-02T00:00:00.000Z',
                updatedByUserId: payload.p_actor.userId,
                updatedByDisplayName: payload.p_actor.displayName,
                updatedAt: '2026-08-02T00:00:00.000Z'
            });
            return { submission_id: IDS.newSubmission };
        },
        async initializeFormContext(payload) {
            calls.initializeFormContext = payload;
            initializedFormContexts.add(payload.p_form_context);
            return {
                activity_id: payload.p_activity_id,
                form_context: payload.p_form_context,
                published_form_version_id: IDS.publishedVersion,
                draft_form_version_id: IDS.draftVersion,
                created: true
            };
        },
        async updateSubmission(payload) {
            calls.updateSubmission = payload;
            return { submission_id: payload.p_submission_id };
        },
        async updateSubmissionStatus(submissionId, status) {
            calls.updateSubmissionStatus = { submissionId, status };
            const current = submissions.get(submissionId);
            if (current) submissions.set(submissionId, { ...current, status });
            return current ? { submission_id: submissionId } : null;
        },
        async updateActivity(activityId, row) {
            calls.updateActivity = { activityId, row };
            return { activity_id: activityId, ...row };
        },
        async saveAdditionalVisitor(payload) {
            calls.saveAdditionalVisitor = payload;
            calls.saveAdditionalVisitorHistory = calls.saveAdditionalVisitorHistory || [];
            calls.saveAdditionalVisitorHistory.push(payload);
            const supplementId = payload.p_supplement_id || IDS.createdAdditionalVisitorSupplement;
            supplements.set(supplementId, {
                supplementId,
                submissionId: payload.p_submission_id,
                supplementType: 'additional_visitor',
                actorUserId: payload.p_actor.userId,
                actorDisplayName: payload.p_actor.displayName,
                cardId: payload.p_card_id,
                payload: {
                    cardSnapshot: payload.p_card_snapshot,
                    personalInterest: payload.p_personal_interest
                },
                createdAt: '2026-08-18T00:00:00.000Z',
                updatedAt: '2026-08-18T00:00:00.000Z'
            });
            return { supplement_id: supplementId };
        },
        async deleteAdditionalVisitor(payload) {
            calls.deleteAdditionalVisitor = payload;
            supplements.delete(payload.p_supplement_id);
            return { supplement_id: payload.p_supplement_id };
        },
        async upsertMyContribution(payload) {
            calls.upsertMyContribution = payload;
            supplements.set(IDS.contributionSupplement, {
                supplementId: IDS.contributionSupplement,
                submissionId: payload.p_submission_id,
                supplementType: 'contribution',
                actorUserId: payload.p_actor.userId,
                actorDisplayName: payload.p_actor.displayName,
                cardId: null,
                payload: { note: payload.p_note },
                createdAt: '2026-08-18T00:00:00.000Z',
                updatedAt: '2026-08-18T00:00:00.000Z'
            });
            return { supplement_id: IDS.contributionSupplement };
        },
        async deleteMyContribution(payload) {
            calls.deleteMyContribution = payload;
            supplements.delete(IDS.contributionSupplement);
            return { submission_id: payload.p_submission_id };
        }
    };

    const rawContactSqlReader = {
        async getRawContactByCardId(cardId) {
            calls.getRawContactByCardId = (calls.getRawContactByCardId || 0) + 1;
            if (cardId === IDS.missingCard) return null;
            return {
                cardId,
                name: 'Card Name',
                company: 'Card Co',
                position: 'Buyer',
                email: 'card@example.test',
                phone: '',
                mobile: '0912',
                fax: '02-0000',
                website: 'https://card.example.test',
                address: 'Taipei',
                driveFileId: 'drive-1',
                driveLink: 'https://drive.example/file',
                driveFilename: 'card.jpg',
                sourceFilename: 'scan-source.jpg',
                notes: 'RAW note'
            };
        },
        async getRawContactsByCardIds(cardIds) {
            calls.getRawContactsByCardIds = calls.getRawContactsByCardIds || [];
            calls.getRawContactsByCardIds.push([...(cardIds || [])]);
            return new Map((cardIds || [])
                .filter(cardId => cardId !== IDS.missingCard)
                .map(cardId => [String(cardId), {
                    cardId,
                    name: 'Card Name',
                    company: 'Card Co',
                    position: 'Buyer',
                    jobTitle: 'Buyer',
                    email: 'card@example.test',
                    phone: '',
                    mobile: '0912',
                    fax: '02-0000',
                    website: 'https://card.example.test',
                    address: 'Taipei',
                    driveFileId: 'drive-1',
                    driveLink: 'https://drive.example/file',
                    driveFilename: 'card.jpg',
                    sourceFilename: 'scan-source.jpg',
                    notes: 'RAW note'
                }]));
        }
    };

    submissions.set(IDS.oldSubmission, {
        id: IDS.oldSubmission,
        activityId: IDS.activity,
        formVersionId: IDS.oldVersion,
        recordContext: 'visitor',
        status: 'active',
        answers: { [IDS.oldTextKey]: 'existing answer' },
        otherAnswers: {},
        cardId: IDS.card,
        card: null,
        formSnapshot: { versionId: IDS.oldVersion, formContext: 'visitor', versionNumber: 1, publishedAt: '2026-07-01T00:00:00.000Z', items: oldItems },
        createdByUserId: 'old-user',
        createdByDisplayName: 'Old User',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedByUserId: 'old-user',
        updatedByDisplayName: 'Old User',
        updatedAt: '2026-07-01T00:00:00.000Z'
    });

    submissions.set(IDS.aiSubmission, {
        id: IDS.aiSubmission,
        activityId: IDS.activity,
        formVersionId: IDS.publishedVersion,
        recordContext: 'visitor',
        status: 'active',
        answers: {
            [IDS.textKey]: 'Structured short text UNIQUE_VISITOR_SIGNAL',
            [IDS.longKey]: '完整長文字需求：客戶正在評估自動化產線，要求九月前安排後續拜訪。',
            [IDS.numberKey]: 88,
            [IDS.boolKey]: true,
            [IDS.choiceKey]: [
                { optionKey: IDS.optionAlpha, label: 'Alpha', value: 'Alpha', note: 'PoC planned for December' },
                { value: OTHER_CHOICE_VALUE, note: 'custom option should be evaluated next phase' }
            ]
        },
        otherAnswers: { [IDS.choiceKey]: 'Other detail' },
        cardId: IDS.card,
        card: null,
        formSnapshot: { versionId: IDS.publishedVersion, formContext: 'visitor', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
        createdByUserId: 'analyst',
        createdByDisplayName: 'Analyst',
        createdAt: '2026-08-15T10:00:00.000Z',
        updatedByUserId: 'analyst',
        updatedByDisplayName: 'Analyst',
        updatedAt: '2026-09-05T10:00:00.000Z'
    });

    if (options.includeActiveAiSubmission !== false) {
        submissions.set(IDS.activeAiSubmission, {
            id: IDS.activeAiSubmission,
            activityId: IDS.activity,
            formVersionId: IDS.activePublishedVersion,
            recordContext: 'field_intelligence',
            status: 'active',
            answers: {
                [IDS.activeLongKey]: 'UNIQUE_ACTIVE_SIGNAL'
            },
            otherAnswers: {},
            cardId: null,
            card: null,
            formSnapshot: { versionId: IDS.activePublishedVersion, formContext: 'field_intelligence', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: activeItems },
            createdByUserId: 'active-analyst',
            createdByDisplayName: 'Active Analyst',
            createdAt: '2026-08-17T10:00:00.000Z',
            updatedByUserId: 'active-analyst',
            updatedByDisplayName: 'Active Analyst',
            updatedAt: '2026-08-17T10:00:00.000Z'
        });
    }

    submissions.set(IDS.voidSubmission, {
        id: IDS.voidSubmission,
        activityId: IDS.activity,
        formVersionId: IDS.publishedVersion,
        recordContext: 'visitor',
        status: 'void',
        answers: { [IDS.longKey]: 'This void answer must not reach Gemini context.' },
        otherAnswers: {},
        cardId: null,
        card: null,
        formSnapshot: { versionId: IDS.publishedVersion, formContext: 'visitor', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
        createdByUserId: 'analyst',
        createdByDisplayName: 'Analyst',
        createdAt: '2026-08-16T10:00:00.000Z',
        updatedByUserId: 'analyst',
        updatedByDisplayName: 'Analyst',
        updatedAt: '2026-08-16T10:00:00.000Z'
    });

    const service = new ActivityIntelligenceService({
        activityIntelligenceSqlReader: reader,
        activityIntelligenceSqlWriter: writer,
        rawContactSqlReader,
        formAiTextGenerator: options.formAiTextGenerator
    });

    return { service, calls, publishedItems, supplements, submissions };
}

function actor() {
    return { username: 'real-user', displayName: 'Real User', role: 'admin', session_id: 'session-1' };
}

async function assertRejectsStatus(fn, statusCode) {
    let caught = null;
    try {
        await fn();
    } catch (error) {
        caught = error;
    }
    assert(caught, 'Expected rejection');
    assert.strictEqual(caught.statusCode, statusCode);
}

async function assertRejectsCode(fn, code) {
    let caught = null;
    try {
        await fn();
    } catch (error) {
        caught = error;
    }
    assert(caught, `Expected rejection ${code}`);
    assert.strictEqual(caught.code, code);
    return caught;
}

async function captureConsoleWarn(fn) {
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args);
    try {
        await fn(warnings);
    } finally {
        console.warn = originalWarn;
    }
    return warnings;
}

function assertFormAssistCjkContract(managementSource) {
    const match = managementSource.match(/const FORM_ASSIST_COPY = Object\.freeze\((\{[\s\S]*?\n  \})\);/);
    assert(match, 'FORM_ASSIST_COPY block must exist');
    const sourceBlock = match[0];
    const copy = vm.runInNewContext(`(${match[1]})`);

    Object.entries(FORM_ASSIST_CJK_EXPECTED_COPY).forEach(([key, expected]) => {
        assert.strictEqual(copy[key], expected, `FORM_ASSIST_COPY.${key} must match approved CJK copy`);
        assert(sourceBlock.includes(`${key}: '${expected}'`), `FORM_ASSIST_COPY.${key} must be readable UTF-8 source`);
    });

    assert(!/\\u(?:[0-9a-fA-F]{4}|\{[0-9a-fA-F]+\})/.test(sourceBlock), 'FORM_ASSIST_COPY must not use Unicode escape source values');
    Object.entries(copy).forEach(([key, value]) => {
        const text = String(value);
        assert(!text.includes('\uFFFD'), `FORM_ASSIST_COPY.${key} must not contain replacement characters`);
        assert(!/嚙|謅/.test(text), `FORM_ASSIST_COPY.${key} must not contain known mojibake markers`);
        if (/[\uE000-\uF8FF]/.test(text)) {
            assert(
                Object.prototype.hasOwnProperty.call(FORM_ASSIST_CJK_EXPECTED_COPY, key) &&
                FORM_ASSIST_CJK_EXPECTED_COPY[key] === text,
                `FORM_ASSIST_COPY.${key} contains unexpected private-use characters`
            );
        }
    });
}

function extractFunctionDeclaration(source, name) {
    const marker = `function ${name}(`;
    const start = source.indexOf(marker);
    assert(start >= 0, `${name} must exist`);
    const paramsStart = source.indexOf('(', start);
    assert(paramsStart >= 0, `${name} must have params`);
    let parenDepth = 0;
    let paramsEnd = -1;
    for (let index = paramsStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '(') parenDepth += 1;
        if (char === ')') {
            parenDepth -= 1;
            if (parenDepth === 0) {
                paramsEnd = index;
                break;
            }
        }
    }
    assert(paramsEnd >= 0, `${name} params must close`);
    const bodyStart = source.indexOf('{', paramsEnd);
    assert(bodyStart >= 0, `${name} must have a body`);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }
    throw new Error(`${name} body was not closed`);
}

function assertVisitorKpiOtherNumericContract(managementSource) {
    const source = [
        `const otherAnswerValue = ${JSON.stringify(OTHER_CHOICE_VALUE)};`,
        'function otherAnswersForRecord(record) { return record && record.runtimeOtherAnswers ? record.runtimeOtherAnswers : {}; }',
        'function optionLabel(value) { return value && typeof value === "object" ? (value.label || value.value || "") : value; }',
        extractFunctionDeclaration(managementSource, 'analyticsOtherText'),
        extractFunctionDeclaration(managementSource, 'visitorCountTotal'),
        extractFunctionDeclaration(managementSource, 'visitorRecordCountValue'),
        extractFunctionDeclaration(managementSource, 'visitorAnswerIsOther'),
        extractFunctionDeclaration(managementSource, 'visitorNumberValue'),
        '({ visitorCountTotal, visitorRecordCountValue, visitorNumberValue });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const field = { fieldId: 'visitorField', itemKey: 'visitorField', itemId: 'visitorField', type: 'single_choice' };
    const record = (answer, otherText) => ({
        answers: { visitorField: answer },
        runtimeOtherAnswers: otherText === undefined ? {} : { visitorField: otherText }
    });

    assert.strictEqual(contract.visitorRecordCountValue(record('1'), field), 1);
    assert.strictEqual(contract.visitorRecordCountValue(record('3'), field), 3);
    assert.strictEqual(contract.visitorRecordCountValue(record('4'), field), 4);
    assert.strictEqual(contract.visitorRecordCountValue(record(OTHER_CHOICE_VALUE, '10'), field), 10);
    assert.strictEqual(contract.visitorRecordCountValue(record(OTHER_CHOICE_VALUE, String.fromCodePoint(0xFF13)), field), 3);
    assert.strictEqual(contract.visitorRecordCountValue(record(OTHER_CHOICE_VALUE, ''), field), null);
    assert.strictEqual(contract.visitorRecordCountValue(record(OTHER_CHOICE_VALUE, 'not numeric'), field), null);
    assert.strictEqual(contract.visitorCountTotal([
        record('1'),
        record('3'),
        record('4'),
        record(OTHER_CHOICE_VALUE, '10')
    ], field), 18);
    assert.strictEqual(contract.visitorRecordCountValue(record('3', '10'), field), 3);
}

async function assertVisitorKpiCacheHydrationContract(managementSource) {
    const source = [
        `const otherAnswerValue = ${JSON.stringify(OTHER_CHOICE_VALUE)};`,
        `const visitorCountFieldTitle = String.fromCodePoint(0x540C, 0x884C, 0x4EBA, 0x6578);`,
        'const state = { activities: [] };',
        'const formBundles = new Map();',
        'const formContextVisitorMode = "visitor";',
        'const formContextFieldIntelligenceMode = "field_intelligence";',
        'let apiPublished = null;',
        'let publishedFetchCount = 0;',
        'const Store = { clone(value) { return JSON.parse(JSON.stringify(value)); } };',
        'const window = { ActivityIntelligenceApi: { async getPublishedForm() { publishedFetchCount += 1; return Store.clone(apiPublished); } } };',
        'function otherAnswersForRecord(record) { return record && record.runtimeOtherAnswers ? record.runtimeOtherAnswers : {}; }',
        'function optionLabel(value) { return value && typeof value === "object" ? (value.label || value.value || "") : value; }',
        'function normalizeDesignerItem(item) { return { ...item, itemKey: item.itemKey || item.fieldId || item.itemId, itemId: item.itemId || item.itemKey || item.fieldId, fieldId: item.fieldId || item.itemKey || item.itemId, visible: item.visible !== false, retired: Boolean(item.retired), removedInDraft: Boolean(item.removedInDraft) }; }',
        extractFunctionDeclaration(managementSource, 'normalizeFormContext'),
        extractFunctionDeclaration(managementSource, 'formBundleCacheKey'),
        extractFunctionDeclaration(managementSource, 'isCompleteFormBundle'),
        extractFunctionDeclaration(managementSource, 'loadPublishedFormForActivity').replace(/^function /, 'async function '),
        extractFunctionDeclaration(managementSource, 'hydrateActivityFormBundle'),
        extractFunctionDeclaration(managementSource, 'normalizeFormBundleDto'),
        extractFunctionDeclaration(managementSource, 'normalizeVersionDto'),
        extractFunctionDeclaration(managementSource, 'publishedRecordItems'),
        extractFunctionDeclaration(managementSource, 'formDesign'),
        extractFunctionDeclaration(managementSource, 'currentVisitorCountField'),
        extractFunctionDeclaration(managementSource, 'analyticsOtherText'),
        extractFunctionDeclaration(managementSource, 'visitorCountTotal'),
        extractFunctionDeclaration(managementSource, 'visitorRecordCountValue'),
        extractFunctionDeclaration(managementSource, 'visitorAnswerIsOther'),
        extractFunctionDeclaration(managementSource, 'visitorNumberValue'),
        '({ state, formBundles, loadPublishedFormForActivity, publishedRecordItems, currentVisitorCountField, visitorCountTotal, getFetchCount: () => publishedFetchCount, setApiPublished: value => { apiPublished = value; } });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const activityId = 'activity-visitor-cache';
    const visitorField = {
        itemKey: 'visitorField',
        fieldId: 'visitorField',
        itemId: 'visitorField',
        type: 'single_choice',
        title: String.fromCodePoint(0x540C, 0x884C, 0x4EBA, 0x6578),
        options: ['1', '3', '4', OTHER_CHOICE_VALUE],
        visible: true
    };
    const published = {
        versionId: 'published-v1',
        versionNumber: 1,
        publishedAt: '2026-08-15T00:00:00.000Z',
        publishedByUserId: 'admin',
        publishedByDisplayName: 'Admin',
        items: [visitorField]
    };
    const makeActivity = () => ({ id: activityId, formFields: [] });
    const record = (answer, otherText) => ({
        answers: { visitorField: answer },
        runtimeOtherAnswers: otherText === undefined ? {} : { visitorField: otherText }
    });

    contract.state.activities = [makeActivity()];
    contract.setApiPublished(published);
    const coldBundle = await contract.loadPublishedFormForActivity(activityId);
    assert.strictEqual(contract.getFetchCount(), 1);
    assert.strictEqual(coldBundle.published.versionId, 'published-v1');
    assert.strictEqual(contract.state.activities[0].formDesignRuntime, coldBundle);
    assert.deepStrictEqual(contract.state.activities[0].formFields, coldBundle.published.items);
    assert.strictEqual(contract.publishedRecordItems(contract.state.activities[0])[0].fieldId, 'visitorField');

    contract.state.activities = [makeActivity()];
    const cachedBundle = await contract.loadPublishedFormForActivity(activityId);
    assert.strictEqual(contract.getFetchCount(), 1);
    assert.strictEqual(cachedBundle, coldBundle);
    assert.strictEqual(contract.state.activities[0].formDesignRuntime, cachedBundle);
    assert.deepStrictEqual(contract.state.activities[0].formFields, cachedBundle.published.items);

    const cacheVisibleItems = contract.publishedRecordItems(contract.state.activities[0]);
    assert.deepStrictEqual(cacheVisibleItems, contract.publishedRecordItems({ formDesignRuntime: coldBundle }));
    assert.strictEqual(contract.currentVisitorCountField(contract.state.activities[0]).fieldId, 'visitorField');
    assert.strictEqual(contract.visitorCountTotal([
        record('1'),
        record('3'),
        record('4'),
        record(OTHER_CHOICE_VALUE, '10')
    ], visitorField), 18);
}

function makeRetrieveCompletenessContext(count) {
    return {
        formVersions: {
            version1: {
                fields: [
                    {
                        itemKey: 'topicField',
                        type: 'multiple_choice',
                        title: 'Topic',
                        options: [{ label: 'IoT', value: 'IoT' }]
                    }
                ]
            }
        },
        submissions: Array.from({ length: count }, (_, index) => ({
            status: 'active',
            createdAt: `2026-04-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
            createdByDisplayName: 'Analyst',
            formVersionId: 'version1',
            answers: [{
                itemKey: 'topicField',
                value: [{ label: 'IoT', value: 'IoT' }],
                otherText: ''
            }],
            rawCard: null
        }))
    };
}

function retrieveIot(service, count, args = {}) {
    return service._executeFormAiRetrieveTool({
        filters: {
            fields: [{ field: { itemKey: 'topicField' }, values: ['IoT'] }]
        },
        ...args
    }, makeRetrieveCompletenessContext(count));
}

function aggregateIot(service, count, args = {}) {
    return service._executeFormAiAggregateTool({
        aggregate: 'count',
        groupBy: 'none',
        filters: {
            fields: [{ field: { itemKey: 'topicField' }, values: ['IoT'] }]
        },
        ...args
    }, makeRetrieveCompletenessContext(count));
}

function assertMobileAnalyticsBreakpointRerenderContract(managementSource) {
    const setupSource = [
        "const mobileFormMediaQuery = '(max-width: 640px)';",
        'let mobileFormBreakpointListenerRegistered = false;',
        'let currentUser = { authenticated: true };',
        'let renderCount = 0;',
        'let matchedQuery = "";',
        'const listeners = [];',
        'const window = { matchMedia(query) { matchedQuery = query; return { addEventListener(type, handler) { listeners.push({ type, handler }); } }; } };',
        'function render() { renderCount += 1; }',
        extractFunctionDeclaration(managementSource, 'setupMobileFormBreakpointRenderListener'),
        '({ setupMobileFormBreakpointRenderListener, listeners, get matchedQuery() { return matchedQuery; }, get renderCount() { return renderCount; }, setCurrentUser(value) { currentUser = value; } });'
    ].join('\n');
    const setupContract = vm.runInNewContext(setupSource, {});
    setupContract.setupMobileFormBreakpointRenderListener();
    setupContract.setupMobileFormBreakpointRenderListener();
    assert.strictEqual(setupContract.matchedQuery, '(max-width: 640px)', 'breakpoint listener must reuse authoritative mobile media query');
    assert.strictEqual(setupContract.listeners.length, 1, 'breakpoint listener must register once');
    assert.strictEqual(setupContract.listeners[0].type, 'change', 'breakpoint listener must use media query change events');
    setupContract.listeners[0].handler();
    assert.strictEqual(setupContract.renderCount, 1, 'breakpoint change must trigger render for authenticated state');
    setupContract.setCurrentUser(null);
    setupContract.listeners[0].handler();
    assert.strictEqual(setupContract.renderCount, 1, 'breakpoint change must not render before currentUser exists');
    setupContract.setCurrentUser({ authenticated: false });
    setupContract.listeners[0].handler();
    assert.strictEqual(setupContract.renderCount, 1, 'breakpoint change must not render unauthenticated shell');

    const initBody = extractFunctionDeclaration(managementSource, 'init');
    const renderBody = extractFunctionDeclaration(managementSource, 'render');
    assert(initBody.includes('setupMobileFormBreakpointRenderListener();'), 'listener setup must run during initialization');
    assert(!renderBody.includes('setupMobileFormBreakpointRenderListener'), 'listener setup must not run inside render');

    const shortcutSource = [
        "const mobileFormMediaQuery = '(max-width: 640px)';",
        'let currentUser = { authenticated: true, role: "super_admin" };',
        'let ui = { mobileAnalysisMode: false };',
        'let mobileMatches = false;',
        'const window = { matchMedia(query) { assert.strictEqual(query, mobileFormMediaQuery); return { matches: mobileMatches }; } };',
        'function canManageActivities() { return currentUser && ["super_admin", "admin"].includes(currentUser.role); }',
        extractFunctionDeclaration(managementSource, 'isMobileFormViewport'),
        extractFunctionDeclaration(managementSource, 'canUseAnalytics'),
        extractFunctionDeclaration(managementSource, 'renderMobileAnalysisHeaderAction'),
        'function renderShortcut() { return renderMobileAnalysisHeaderAction(); }',
        '({ renderShortcut, setMobile(value) { mobileMatches = value; }, setRole(value) { currentUser.role = value; }, setMobileAnalysisMode(value) { ui.mobileAnalysisMode = value; } });'
    ].join('\n');
    const shortcutContract = vm.runInNewContext(shortcutSource, { assert });
    assert(!shortcutContract.renderShortcut().includes('mobile-analysis-enter'), 'desktop predicate must omit mobile Analytics shortcut');
    shortcutContract.setMobile(true);
    assert(shortcutContract.renderShortcut().includes('mobile-analysis-enter'), 'desktop-to-mobile rerender must allow eligible shortcut');
    shortcutContract.setMobile(false);
    assert(!shortcutContract.renderShortcut().includes('mobile-analysis-enter'), 'mobile-to-desktop rerender must remove shortcut through predicate');
    shortcutContract.setMobile(true);
    shortcutContract.setRole('recorder');
    assert(!shortcutContract.renderShortcut().includes('mobile-analysis-enter'), 'unauthorized role must remain blocked after breakpoint change');
    shortcutContract.setRole('super_admin');
    shortcutContract.setMobileAnalysisMode(true);
    assert(!shortcutContract.renderShortcut().includes('mobile-analysis-enter'), 'mobile Analysis Mode guard must remain respected');
}

function assertContextFoundationSqlContract(sqlSource) {
    assert(sqlSource.includes('add column if not exists form_context text'), 'form_versions must add form_context');
    assert(sqlSource.includes('add column if not exists record_context text'), 'submissions must add record_context');
    assert(sqlSource.includes("check (form_context in ('visitor', 'field_intelligence'))"), 'form_context must be constrained');
    assert(sqlSource.includes("check (record_context in ('visitor', 'field_intelligence'))"), 'record_context must be constrained');
    assert(sqlSource.includes('activity_intelligence_form_versions_activity_context_version_uidx'), 'version numbers must be unique per activity/context');
    assert(sqlSource.includes('activity_intelligence_form_versions_one_draft_per_context_uidx'), 'draft uniqueness must be context-aware');
    assert(sqlSource.includes('activity_intelligence_form_versions_one_published_per_context_uidx'), 'published uniqueness must be context-aware');
    assert(sqlSource.includes('activity_intelligence_submissions_activity_context_status_created_idx'), 'submission query index must include context');
    assert(sqlSource.includes("and form_context = v_form_context\n      and status = 'draft'"), 'draft lookup must include context');
    assert(sqlSource.includes("and form_context = v_form_context\n      and status = 'published'"), 'published lookup must include context');
    assert(sqlSource.includes('select form_version_id, form_context'), 'submission creation must read selected version context');
    assert(sqlSource.includes('and form_context = v_requested_context'), 'submission creation must select by requested context');
    assert(sqlSource.includes('Activity Intelligence form_context is immutable'), 'form_context must be immutable');
    assert(sqlSource.includes('Activity Intelligence submission record_context is immutable'), 'record_context must be immutable');
    assert(sqlSource.includes('Submission record_context must match form version context'), 'submission context must match form version context');
    assert(sqlSource.includes('activity_intelligence_initialize_form_context'), 'missing form contexts must be initializable');
    assert(sqlSource.includes("'published_form_version_id', v_published_version_id"), 'initializer must create or return a published version');
    assert(sqlSource.includes("'draft_form_version_id', v_draft_version_id"), 'initializer must create or return a draft version');
    assert(sqlSource.includes("'created', true"), 'initializer must report newly created streams');
}

function assertDualStreamFormBuilderSourceContract(managementSource, apiSource, cssSource) {
    assert(managementSource.includes("const formContextFieldIntelligenceMode = 'field_intelligence';"), 'Form Design must use canonical field_intelligence context');
    assert(managementSource.includes('function renderFormContextTabs'), 'Form Design must render context tabs');
    assert(managementSource.includes('data-action="form-context"'), 'Form Design context tabs must be actionable');
    assert(managementSource.includes('formBundleCacheKey(activityId, context)'), 'form bundle cache must include context');
    assert(managementSource.includes('activity.formDesignRuntimeByContext'), 'activity form runtime state must be separated by context');
    assert(managementSource.includes('initializeMissing: context === formContextFieldIntelligenceMode'), 'field_intelligence must lazy-initialize when missing');
    assert(managementSource.includes('ActivityIntelligenceApi.saveDraft(activity.id, serializeDraftItems(formDesign(activity, formContext).draft.items, formContext), formContext)'), 'save draft must route active context');
    assert(managementSource.includes('ActivityIntelligenceApi.discardDraft(activity.id, formContext)'), 'discard draft must route active context');
    assert(managementSource.includes('ActivityIntelligenceApi.publishDraft(activity.id, formContext)'), 'publish draft must route active context');
    assert(managementSource.includes('renderFormPreview(activity, formContext)'), 'preview must use active context');
    assert(apiSource.includes('initializeFormContext(activityId, formContext)'), 'API client must expose form context initialization');
    assert(apiSource.includes('formContextSuffix(formContext)'), 'API form reads must accept context');
    assert(cssSource.includes('.aim-form-context-tabs'), 'context tabs must have dedicated mobile-safe styling');
}

async function assertRealActiveIntelligenceRuntimeSourceContract(managementSource, cssSource, service) {
    assert(managementSource.includes('async function switchRecordContextMode'), 'record-context mode switch must load runtime form context');
    assert(managementSource.includes('await loadPublishedFormForActivity(activity.id, formContext);'), 'active runtime entry must load the published context bundle');
    assert(managementSource.includes('const formContext = activeRecordFormContext();'), 'runtime record form context must be derived explicitly');
    assert(managementSource.includes('return ui.recordContextMode === recordContextActiveMode ? formContextFieldIntelligenceMode : formContextVisitorMode;'), 'active UI mode must map to field_intelligence form context');
    assert(managementSource.includes('quickStateByContext'), 'quick answers must be isolated by form context');
    assert(managementSource.includes('syncQuickStateForContext(formContext)'), 'mode switching must point renderer state at the selected context');
    assert(managementSource.includes('resetQuickState(formContext)'), 'successful save must clear only the submitted context state');
    assert(managementSource.includes('renderActiveIntelligenceRuntimeForm(fields, open)'), 'active runtime must use the real field list');
    assert(managementSource.includes('fields.map(field => renderQuickField(field, open)).join'), 'active runtime must reuse the generic quick field renderer');
    assert(managementSource.includes("if (field.type === 'section_heading')"), 'user-defined section_heading items must still render through the generic renderer');
    assert(!managementSource.includes('aim-active-intelligence-entry-head'), 'system-generated active runtime heading block must be removed');
    assert(!managementSource.includes('renderActiveIntelligenceEntryPrototype'), 'hardcoded active entry prototype renderer must be removed');
    assert(!managementSource.includes('renderActiveIntelligencePrototypeRecordCard'), 'mock active record card renderer must be removed');
    assert(!managementSource.includes('renderActiveIntelligencePrototypeChart'), 'fake active analytics charts must be removed');
    assert(!managementSource.includes('aim-active-company'), 'hardcoded active company field must be removed');
    assert(!managementSource.includes('aim-active-followup'), 'hardcoded active follow-up field must be removed');
    assert(!managementSource.includes('aim-active-note'), 'hardcoded active note field must be removed');
    assert(!managementSource.includes('產品需求'), 'active runtime must not hardcode business schema options');
    assert(!managementSource.includes('技術討論'), 'active runtime must not hardcode business schema options');
    assert(!managementSource.includes('展品回饋'), 'active runtime must not hardcode business schema options');
    assert(managementSource.includes('firstMissingRequiredAnswer(items, ui.quickAnswers || {}, ui.quickOtherAnswers || {})'), 'required validation must be schema-driven before submission');
    assert(managementSource.includes('itemIsRequired(item)'), 'required validation must read normalized item metadata');
    assert(managementSource.includes('recordContext: formContext'), 'submission payload must explicitly route the selected record context');
    assert(managementSource.includes('data-action="record-context-filter"'), 'desktop records must expose an active intelligence quick filter');
    assert(managementSource.includes('ui.records.recordContext === formContextFieldIntelligenceMode && !recordIsFieldIntelligence(r)'), 'active intelligence quick filter must use authoritative recordContext');
    assert(managementSource.includes("ui.records.recordContext = ui.records.recordContext === next ? 'all' : next;"), 'active intelligence quick filter must compose with existing filters by toggling only context state');
    assert(managementSource.includes('const label = active ?'), 'selected active filter action must return to all records');
    assert(managementSource.includes('const cardAssistRoles = new Set([\'person_name\', \'job_title\', \'company_name\']);'), 'Card Assist roles must be limited to the approved schema values');
    assert(managementSource.includes('settings.enableCardAssist = true'), 'section_heading must persist enableCardAssist');
    assert(managementSource.includes('settings.cardAssistField = cardAssistField'), 'short_text must persist cardAssistField');
    assert(managementSource.includes("if (field.type !== 'short_text') return '';"), 'non-short-text fields must not expose Card Assist mapping');
    assert(!managementSource.includes('formAssistFixedSemantics'), 'Card Assist must not use fixed field ids');
    assert(!managementSource.includes('formAssistSemanticForField'), 'Card Assist must not use visible title matching');
    assert(managementSource.includes('function cardAssistTargetsForSection(sectionId)'), 'Card Assist targets must be section-scoped');
    assert(managementSource.includes("if (field.type === 'section_heading') break;"), 'Card Assist section scan must stop at the next section heading');
    assert(managementSource.includes('data-section="${Store.escapeHtml(field.fieldId)}"'), 'Card Assist button must carry the triggering section id');
    assert(managementSource.includes('importQuickAssistCard(card, ui.cardPicker && ui.cardPicker.sectionId)'), 'existing card picker must import only into the triggering section');
    assert(managementSource.includes('duplicateCardAssistRoleItem'), 'duplicate Card Assist roles must be caught before publish');
    assert(managementSource.includes('const activeBadge = recordIsFieldIntelligence(record);'), 'real active record cards must use recordContext for visible identity');
    assert(cssSource.includes('.aim-record-card-field-intelligence'), 'real active record cards must receive dedicated light-purple styling');
    assert(cssSource.includes('.aim-record-context-label'), 'active record cards must include a visible context badge');
    assert(managementSource.includes('<span class="aim-record-context-label">主動</span>'), 'active badge must use the compact short label');
    assert(managementSource.includes('aim-record-card-meta-labels'), 'active and supplemental metadata labels must be grouped with completeness');
    assert(cssSource.includes('.aim-record-context-label') && cssSource.includes('border-radius: 999px'), 'desktop active badge must use compact pill styling');
    assert(!cssSource.includes('aim-record-card-active-intelligence-prototype'), 'prototype active record styling must be removed');
    assert(!cssSource.includes('aim-prototype-chart'), 'prototype analytics chart styling must be removed');
    assertCardAssistShortTextMappingBuilderContract(managementSource);
    assertActiveIntelligenceAnalyticsV1Contract(managementSource, cssSource);
    assertOtherHistorySuggestionsV1Contract(managementSource, cssSource, service);
    assertStableVisualAssetsAndActiveBannerSharingContract(managementSource, service);
    await assertDesktopUnifiedVisitorRecordLandingContract(managementSource);
}

function assertVisitorSupplementalRecordMvpSourceContract(managementSource, apiSource, cssSource, sqlSource) {
    assert(managementSource.includes('quickAdditionalVisitorsEnabled(activity)'));
    assert(managementSource.includes('currentVisitorCountField(activity)'));
    assert(managementSource.includes('visitorNumberValue(ui.quickOtherAnswers'));
    assert(managementSource.includes("context: 'quick-additional-visitor'"));
    assert(managementSource.includes("context: 'record-additional-visitor'"));
    assert(managementSource.includes('renderSupplementalDetail(record, activity)'));
    [
        '同行訪客（選填）',
        '＋ 新增同行訪客',
        '個人關注',
        '請填寫追加訪客的關注議題',
        '查看',
        '更換',
        '移除',
        '＋ 補充我的紀錄',
        '補充我的紀錄',
        '刪除我的補充',
        '確定刪除這筆補充紀錄？原始訪談紀錄不會受到影響。',
        '編輯',
        '我的補充',
        '我有補充'
    ].forEach(copy => assert(managementSource.includes(copy), `missing approved supplemental copy: ${copy}`));
    assert(!managementSource.includes('查看完整訪談紀錄'));
    assert(!managementSource.includes('data-action="save-additional-visitor-interest"'));
    assert(!managementSource.includes('查看名片'));
    assert(!managementSource.includes('更換名片'));
    assert(!managementSource.includes('個人關注（選填）'));
    assert(!managementSource.includes('data-action="view-full-record"'));
    assert(!managementSource.includes('function renderContributorFocusedDetail'));
    assert(!managementSource.includes('personalFullRecordIds'));
    assert(!managementSource.includes('個人興趣或補充備註'));
    assert(!managementSource.includes('編輯我的補充紀錄'));
    assert(!managementSource.includes('新增我的補充紀錄'));
    assert(!managementSource.includes('尚無同行訪客。'));
    assert(!managementSource.includes('尚無補充紀錄。'));
    assert(managementSource.includes('recordBelongsToCurrentUser'));
    assert(managementSource.includes('record.createdByUserId === currentUser.userId || recordHasMyContribution(record)'));
    assert(managementSource.includes('if (!additionalVisitors.length && !contributions.length) return \'\';'));
    assert(managementSource.includes('const contributorOnly = recordIsContributorOnly(record);'));
    assert(managementSource.includes("contributorOnly\n        ? '<span class=\"aim-record-context-label aim-record-context-label-supplemental\">我有補充</span>'"));
    assert(managementSource.includes('aim-record-card-meta-labels'), 'supplemental record-card cues must remain in the metadata label group');
    assert(managementSource.includes('if (record && !record.supplementalDetailsLoaded) record = await fetchRecordDetails(record.id);'), 'canonical edit must hydrate supplements before opening the drawer');
    assert(managementSource.includes('workingAdditionalVisitors: editableAdditionalVisitorRows(record)'), 'canonical edit drawer must hydrate persisted Additional Visitors');
    assert(managementSource.includes('renderRecordDrawerAdditionalVisitors(record, activity, editing)'), 'canonical edit drawer must render Additional Visitors in the same edit session');
    assert(managementSource.includes('recordDrawerAdditionalVisitorsCanAdd(activity)'), 'record edit add affordance must use current Visitor Count');
    assert(managementSource.includes('persistRecordAdditionalVisitorChanges(updated, pendingAdditionalVisitors)'), 'record save must persist supplemental visitor changes after canonical update');
    assert(managementSource.includes('if (entry.supplementId) payload.supplementId = entry.supplementId;'), 'existing Additional Visitor save must retain supplementId for UPDATE semantics');
    assert(managementSource.includes('if (entry.supplementId) updated = await window.ActivityIntelligenceApi.deleteAdditionalVisitor(submissionId, entry.supplementId);'), 'removing persisted Additional Visitors must call the existing delete path');
    assert(managementSource.includes('toast(supplementalResult.supplementalError ? \'已儲存紀錄，但部分附加資訊未儲存。\' : \'已儲存紀錄。\');'), 'canonical save must surface partial supplemental failures');
    assert(managementSource.includes('submission = await window.ActivityIntelligenceApi.saveAdditionalVisitor(submission.id || submission.submissionId, {'));
    assert(managementSource.indexOf('let submission = await window.ActivityIntelligenceApi.createSubmission') < managementSource.indexOf('submission = await window.ActivityIntelligenceApi.saveAdditionalVisitor'));
    assert(managementSource.includes('cardId: entry.cardId,\n            personalInterest: entry.personalInterest || \'\''));
    assert(!managementSource.includes('p_actor: ui.'));
    assert(!/payloadAnswersForItems\([^)]*additional/i.test(managementSource));
    assert(!/submission_answers/i.test(managementSource));
    assert(apiSource.includes('/additional-visitors'));
    assert(apiSource.includes('/my-contribution'));
    assert(cssSource.includes('.aim-supplemental-detail'));
    assert(cssSource.includes('.aim-supplemental-visitor-line'));
    assert(!cssSource.includes('.aim-contributor-note-section'));
    assert(!cssSource.includes('.aim-contributor-focused-detail'));
    assert(cssSource.includes('.aim-supplemental-add-action'));
    assert(cssSource.includes('.aim-supplemental-entry-text-action'));
    assert(cssSource.includes('.aim-supplemental-entry-card'));
    assert(cssSource.includes('.aim-supplemental-visitor-title-line'));
    assert(cssSource.includes('.aim-supplemental-visitor-job'));
    assert(cssSource.includes('.aim-supplemental-visitor-company'));
    assert(cssSource.includes('.aim-contribution-author-line'));
    assert(cssSource.includes('.aim-contribution-row-actions'));
    assert(cssSource.includes('.aim-contribution-note'));
    assert(cssSource.includes('.aim-contribution-timestamp'));
    assert(cssSource.includes('.aim-contribution-mine-cue'));
    assert(cssSource.includes('.aim-record-drawer-supplemental-editor'));
    assert(cssSource.includes('.aim-record-contribution-create'));
    assert(cssSource.includes('.aim-contribution-delete-action'));
    assert(cssSource.includes('color: var(--aim-blue-dark);'));
    assert(cssSource.includes('.aim-supplemental-entry {\n  gap: 10px;\n  padding: 10px 12px 12px;\n  border: 1px solid var(--aim-border);\n  border-radius: 6px;\n  background: #fbfcfe;\n}'));
    assert(cssSource.includes('.aim-supplemental-entry-card {\n  gap: 8px;\n  padding: 9px 10px;\n  border: 1px solid var(--aim-border);\n  border-radius: 6px;\n  background: #fff;\n}'));
    assert(cssSource.includes('.aim-supplemental-add-action {\n  flex: 0 0 auto;\n  min-height: 30px;\n  padding: 5px 10px;'));
    assert(cssSource.includes('border-color: #bfdbfe;\n  background: #f8fbff;\n  color: var(--aim-blue);'));
    assert(managementSource.includes('class="aim-supplemental-detail"'));
    assert(!managementSource.includes('class="aim-inline-record-meta-card aim-supplemental-detail"'));
    assert(managementSource.includes('class="aim-supplemental-interest-text"'));
    assert(managementSource.includes('有同行訪客時，可補充其名片與個別關注重點。'));
    assert(managementSource.includes('aim-button aim-button-small aim-supplemental-add-action'));
    assert(managementSource.includes('aim-supplemental-text-action aim-supplemental-entry-text-action'));
    assert(managementSource.includes('class="aim-supplemental-visitor-row aim-supplemental-entry-card"'));
    assert(managementSource.includes('class="aim-supplemental-visitor-title-line"'));
    assert(managementSource.includes('class="aim-supplemental-visitor-name"'));
    assert(managementSource.includes('class="aim-supplemental-visitor-job"'));
    assert(managementSource.includes('class="aim-supplemental-visitor-company"'));
    assert(managementSource.includes('class="aim-contribution-author-line"'));
    assert(managementSource.includes('class="aim-contribution-row-actions"'));
    assert(managementSource.includes('class="aim-contribution-note"'));
    assert(managementSource.includes('class="aim-contribution-timestamp"'));
    assert(managementSource.includes('aim-contribution-mine-cue">我的補充</span>'));
    assert(managementSource.includes('class="aim-supplemental-interest-label">個人關注</span><span class="aim-small">請填寫追加訪客的關注議題</span>'));
    assert(managementSource.includes('aim-textarea aim-auto-grow aim-supplemental-interest-input'));
    assert(managementSource.includes('aim-textarea aim-auto-grow aim-additional-interest-edit'));
    assert(!managementSource.includes('aim-input aim-supplemental-interest-input'));
    assert(!managementSource.includes('aim-input aim-additional-interest-edit'));
    assert(managementSource.includes('aim-record-context-label aim-record-context-label-supplemental">同行 ${supplementalSummary.additionalVisitorCount}</span>'));
    assert(managementSource.includes('aim-record-context-label aim-record-context-label-supplemental">補充 ${supplementalSummary.contributionCount}</span>'));
    assert(managementSource.includes('aim-record-context-label aim-record-context-label-supplemental">我有補充</span>'));
    assert(managementSource.includes('<span class="aim-record-context-label">主動</span>'));
    assert(cssSource.includes('.aim-record-context-label-supplemental'));
    assert(cssSource.includes('background: var(--aim-blue-soft);'));
    assert(cssSource.includes('color: var(--aim-blue);'));
    assert(cssSource.includes('.aim-record-card-meta .aim-record-context-label {\n    max-width: 100%;\n    min-height: 16px;\n    padding: 1px 5px;'));
    assert(cssSource.includes('border-radius: 999px;'), 'desktop supplemental metadata labels must keep pill geometry');
    assert(cssSource.includes('border-radius: 4px;'), 'mobile supplemental metadata labels must keep compact geometry');
    assert(cssSource.includes('font-size: 10px;\n    font-weight: 700;\n    line-height: 1.1;\n    white-space: nowrap;'));
    assert(!cssSource.includes('.aim-record-context-label {\n  border-color: #bfdbfe'));
    assert(cssSource.includes('.aim-supplemental-text-action'));
    assert(cssSource.indexOf('.aim-button {') < cssSource.indexOf('.aim-supplemental-text-action'));
    assert(cssSource.indexOf('.aim-button {') < cssSource.indexOf('.aim-supplemental-add-action'));
    assert(cssSource.indexOf('.aim-record-context-label {') < cssSource.indexOf('.aim-record-context-label-supplemental'));
    assert(cssSource.indexOf('.aim-inline-record-meta-card {') < cssSource.indexOf('.aim-supplemental-detail {'));
    assert(cssSource.indexOf('.aim-supplemental-visitor-main span,') < cssSource.indexOf('.aim-supplemental-visitor-company'));
    assert(!cssSource.includes('.aim-record-drawer-supplement-action'));
    const supplementalCssBlock = cssSource.slice(cssSource.indexOf('.aim-supplemental-entry,'), cssSource.indexOf('.aim-answer-badges'));
    assert(!supplementalCssBlock.includes('!important'));
    assert(!cssSource.includes('.aim-supplemental-detail-row textarea,\n.aim-supplemental-interest-input'));
    assert(sqlSource.includes('activity_intelligence_submission_supplements'));
    assert(sqlSource.includes('activity_intelligence_save_additional_visitor'));
    assert(sqlSource.includes('activity_intelligence_delete_additional_visitor'));
    assert(sqlSource.includes('activity_intelligence_upsert_my_contribution'));
    assert(sqlSource.includes('activity_intelligence_delete_my_contribution'));

    const renderSource = [
        'const Store = { escapeHtml: value => String(value || ""), formatDateTime: value => String(value || "") };',
        'function recordIsFieldIntelligence() { return false; }',
        'function canEditRecord() { return true; }',
        'function canContributeToRecord() { return true; }',
        'function isMyContribution() { return false; }',
        'function selectedActivity() { return {}; }',
        extractFunctionDeclaration(managementSource, 'renderAdditionalVisitorDetailRow'),
        extractFunctionDeclaration(managementSource, 'renderContributionDetailRow'),
        extractFunctionDeclaration(managementSource, 'renderSupplementalDetail'),
        '({ renderAdditionalVisitorDetailRow, renderSupplementalDetail })'
    ].join('\n');
    const contract = vm.runInNewContext(renderSource, {});
    const baseRecord = { id: 'record-1', recordContext: 'visitor', supplements: { additionalVisitors: [], contributions: [], myContribution: null } };
    const zeroHtml = contract.renderSupplementalDetail(baseRecord, {});
    assert.strictEqual(zeroHtml, '');
    const additionalOnlyHtml = contract.renderSupplementalDetail({
        ...baseRecord,
        supplements: {
            additionalVisitors: [{ supplementId: 's1', cardSnapshot: { cardId: 'c1', name: 'A', company: 'Co' }, personalInterest: 'Need A' }],
            contributions: [],
            myContribution: null
        }
    }, {});
    assert(additionalOnlyHtml.includes('附加資訊'));
    assert(additionalOnlyHtml.includes('同行訪客'));
    assert(!additionalOnlyHtml.includes('補充紀錄'));
    assert(!additionalOnlyHtml.includes('aim-inline-record-meta-card'));
    assert(!additionalOnlyHtml.includes('record-add-additional-visitor'));
    assert(!additionalOnlyHtml.includes('record-change-additional-visitor-card'));
    assert(!additionalOnlyHtml.includes('save-additional-visitor-interest'));
    assert(!additionalOnlyHtml.includes('delete-additional-visitor'));
    assert(!additionalOnlyHtml.includes('aim-additional-interest-edit'));
    assert(!additionalOnlyHtml.includes('<textarea'));
    assert(!additionalOnlyHtml.includes('查看名片'));
    assert(additionalOnlyHtml.includes('>查看</button>'));
    assert(additionalOnlyHtml.includes('class="aim-supplemental-visitor-company">Co</span>'));
    assert(additionalOnlyHtml.includes('aim-supplemental-text-action'));
    const editRowHtml = contract.renderAdditionalVisitorDetailRow(baseRecord, {
        rowIndex: 0,
        supplementId: 's1',
        cardSnapshot: { cardId: 'c1', name: 'A', company: 'Co', jobTitle: 'Title' },
        personalInterest: 'Need A'
    }, true);
    assert(editRowHtml.includes('class="aim-supplemental-visitor-row aim-supplemental-detail-row aim-supplemental-entry-card"'));
    assert(editRowHtml.includes('data-index="0"'));
    assert(editRowHtml.includes('>查看</button>'));
    assert(editRowHtml.includes('>更換</button>'));
    assert(editRowHtml.includes('>移除</button>'));
    assert(editRowHtml.includes('class="aim-supplemental-interest-label">個人關注</span><span class="aim-small">請填寫追加訪客的關注議題</span>'));
    assert(!editRowHtml.includes('儲存'));
    assert(!editRowHtml.includes('查看名片'));
    assert(!editRowHtml.includes('更換名片'));
    const contributionOnlyHtml = contract.renderSupplementalDetail({
        ...baseRecord,
        supplements: {
            additionalVisitors: [],
            contributions: [{ supplementId: 's2', note: 'Note', actorDisplayName: 'User', updatedAt: '2026-08-17' }],
            myContribution: null
        }
    }, {});
    assert(contributionOnlyHtml.includes('附加資訊'));
    assert(!contributionOnlyHtml.includes('同行訪客'));
    assert(contributionOnlyHtml.includes('補充紀錄'));
    assert(!contributionOnlyHtml.includes('open-my-contribution'));
    assert(contributionOnlyHtml.includes('class="aim-contribution-row'));
    assert(contributionOnlyHtml.includes('class="aim-contribution-author-line"'));
    const bothHtml = contract.renderSupplementalDetail({
        ...baseRecord,
        supplements: {
            additionalVisitors: [{ supplementId: 's1', cardSnapshot: { cardId: 'c1', name: 'A', company: 'Co' }, personalInterest: 'Need A' }],
            contributions: [{ supplementId: 's2', note: 'Note', actorDisplayName: 'User', updatedAt: '2026-08-17' }],
            myContribution: null
        }
    }, {});
    assert(bothHtml.includes('同行訪客'));
    assert(bothHtml.includes('補充紀錄'));

    const mineContributionSource = [
        'const Store = { escapeHtml: value => String(value || ""), formatDateTime: value => String(value || "") };',
        'let mine = true;',
        'function isMyContribution() { return mine; }',
        'function canContributeToRecord() { return true; }',
        'function selectedActivity() { return {}; }',
        extractFunctionDeclaration(managementSource, 'renderContributionDetailRow'),
        '({ renderContributionDetailRow, setMine: value => { mine = value; } })'
    ].join('\n');
    const mineContributionContract = vm.runInNewContext(mineContributionSource, {});
    const mineContributionHtml = mineContributionContract.renderContributionDetailRow(baseRecord, {
        supplementId: 'mine',
        note: 'Mine note',
        actorDisplayName: 'Me',
        updatedAt: '2026-08-17'
    });
    assert(mineContributionHtml.includes('我的補充'));
    assert(mineContributionHtml.includes('>編輯</button>'));
    assert(mineContributionHtml.includes('class="aim-contribution-note">Mine note</p>'));
    assert(mineContributionHtml.includes('class="aim-contribution-timestamp">2026-08-17</span>'));
    assert(mineContributionHtml.indexOf('class="aim-contribution-note"') < mineContributionHtml.indexOf('class="aim-contribution-timestamp"'), 'timestamp must render after contribution content');
    assert(mineContributionHtml.indexOf('class="aim-contribution-author-line"') < mineContributionHtml.indexOf('class="aim-contribution-note"'), 'author identity must render before content');
    const metaOnly = mineContributionHtml.slice(mineContributionHtml.indexOf('class="aim-contribution-meta"'), mineContributionHtml.indexOf('class="aim-contribution-note"'));
    assert(!metaOnly.includes('2026-08-17'), 'timestamp must not compete in the main identity/action row');
    assert(!mineContributionHtml.includes('編輯我的紀錄'));
    mineContributionContract.setMine(false);
    const otherContributionHtml = mineContributionContract.renderContributionDetailRow(baseRecord, {
        supplementId: 'other',
        note: 'Other note',
        actorDisplayName: 'Other User',
        updatedAt: '2026-08-17'
    });
    assert(!otherContributionHtml.includes('open-my-contribution'), 'other users contributions must not render edit action');
    assert(otherContributionHtml.includes('class="aim-contribution-note">Other note</p>'));
    assert(otherContributionHtml.includes('class="aim-contribution-timestamp">2026-08-17</span>'));

    const contributionCreateSource = [
        'const Store = { escapeHtml: value => String(value || "") };',
        'let allowContribution = true;',
        'let hasContribution = false;',
        'function canContributeToRecord() { return allowContribution; }',
        'function recordHasMyContribution() { return hasContribution; }',
        extractFunctionDeclaration(managementSource, 'renderContributionCreateAction'),
        '({ renderContributionCreateAction, setAllow: value => { allowContribution = value; }, setHas: value => { hasContribution = value; } })'
    ].join('\n');
    const contributionCreateContract = vm.runInNewContext(contributionCreateSource, {});
    const createContributionHtml = contributionCreateContract.renderContributionCreateAction(baseRecord, {});
    assert(createContributionHtml.includes('＋ 補充我的紀錄'));
    assert(createContributionHtml.includes('data-action="open-my-contribution"'));
    contributionCreateContract.setAllow(false);
    assert.strictEqual(contributionCreateContract.renderContributionCreateAction(baseRecord, {}), '');
    contributionCreateContract.setAllow(true);
    contributionCreateContract.setHas(true);
    assert.strictEqual(contributionCreateContract.renderContributionCreateAction(baseRecord, {}), '');

    const quickRowSource = [
        'const Store = { escapeHtml: value => String(value || "") };',
        extractFunctionDeclaration(managementSource, 'renderQuickAdditionalVisitorRow'),
        '({ renderQuickAdditionalVisitorRow })'
    ].join('\n');
    const quickContract = vm.runInNewContext(quickRowSource, {});
    const quickHtml = quickContract.renderQuickAdditionalVisitorRow({
        card: { cardId: 'c1', name: 'A', jobTitle: 'Title', company: 'Co' },
        personalInterest: 'Need A'
    }, 0, true);
    assert(quickHtml.includes('class="aim-supplemental-visitor-row aim-supplemental-entry-card"'));
    assert(!quickHtml.includes('aim-card'));
    assert(!quickHtml.includes('thumb'));
    assert(!quickHtml.includes('儲存'));
    assert(!quickHtml.includes('Title / Co'));
    assert(quickHtml.includes('class="aim-supplemental-visitor-name">A</strong>'));
    assert(quickHtml.includes('class="aim-supplemental-visitor-job">Title</span>'));
    assert(quickHtml.includes('class="aim-supplemental-visitor-company">Co</span>'));
    assert(quickHtml.includes('>查看</button>'));
    assert(!quickHtml.includes('>查看名片</button>'));
    assert(quickHtml.includes('>移除</button>'));
    assert(!quickHtml.includes('個人關注（選填）'));
    assert(quickHtml.includes('class="aim-supplemental-interest-label">個人關注</span>'));
    assert(quickHtml.includes('<span class="aim-small">請填寫追加訪客的關注議題</span>'));
    assert(quickHtml.includes('placeholder="請填寫追加訪客的關注議題"'));
    assert(quickHtml.includes('aim-supplemental-entry-text-action'));
    assert(quickHtml.includes('aim-textarea aim-auto-grow aim-supplemental-interest-input'));

    const drawerAdditionalSource = [
        'const Store = { escapeHtml: value => String(value || "") };',
        'let rows = [];',
        'let canAdd = false;',
        'function recordIsFieldIntelligence() { return false; }',
        'function canEditRecord() { return true; }',
        'function activeRecordDrawerAdditionalVisitors() { return rows; }',
        'function recordDrawerAdditionalVisitorsCanAdd() { return canAdd; }',
        extractFunctionDeclaration(managementSource, 'renderAdditionalVisitorDetailRow'),
        extractFunctionDeclaration(managementSource, 'renderRecordDrawerAdditionalVisitors'),
        '({ renderRecordDrawerAdditionalVisitors, setRows: value => { rows = value; }, setCanAdd: value => { canAdd = value; } })'
    ].join('\n');
    const drawerAdditionalContract = vm.runInNewContext(drawerAdditionalSource, {});
    drawerAdditionalContract.setRows([{
        supplementId: 's1',
        cardId: 'c1',
        card: { cardId: 'c1', name: 'A', company: 'Co' },
        personalInterest: 'Need A',
        removed: false
    }]);
    drawerAdditionalContract.setCanAdd(false);
    const existingCountOneHtml = drawerAdditionalContract.renderRecordDrawerAdditionalVisitors(baseRecord, {}, true);
    assert(existingCountOneHtml.includes('同行訪客（選填）'));
    assert(existingCountOneHtml.includes('data-index="0"'));
    assert(!existingCountOneHtml.includes('record-add-additional-visitor'), 'Visitor Count <=1 must hide only the new-add affordance');
    drawerAdditionalContract.setRows([]);
    drawerAdditionalContract.setCanAdd(true);
    const canAddHtml = drawerAdditionalContract.renderRecordDrawerAdditionalVisitors(baseRecord, {}, true);
    assert(canAddHtml.includes('＋ 新增同行訪客'));
    assert(canAddHtml.includes('record-add-additional-visitor'));

    const supplementalCrudStateSource = [
        'let uuidCounter = 0;',
        'function newUuid() { uuidCounter += 1; return `client-${uuidCounter}`; }',
        'function normalizeRawCard(card) { return card && { cardId: card.cardId || card.card_id || "", name: card.name || "", company: card.company || "", position: card.position || card.jobTitle || "" }; }',
        'let ui = { drawer: { type: "record", id: "record-1", working: { vc: "2" }, workingOther: {}, workingAdditionalVisitors: [] } };',
        extractFunctionDeclaration(managementSource, 'editableAdditionalVisitorRows'),
        extractFunctionDeclaration(managementSource, 'activeRecordDrawerAdditionalVisitors'),
        extractFunctionDeclaration(managementSource, 'applyRecordAdditionalVisitorCard'),
        extractFunctionDeclaration(managementSource, 'updateRecordAdditionalVisitorInterest'),
        extractFunctionDeclaration(managementSource, 'removeRecordAdditionalVisitor'),
        '({ ui, editableAdditionalVisitorRows, applyRecordAdditionalVisitorCard, updateRecordAdditionalVisitorInterest, removeRecordAdditionalVisitor })'
    ].join('\n');
    const supplementalCrudState = vm.runInNewContext(supplementalCrudStateSource, {});
    supplementalCrudState.ui.drawer.workingAdditionalVisitors = supplementalCrudState.editableAdditionalVisitorRows({
        supplements: {
            additionalVisitors: [{ supplementId: 's1', cardId: 'c1', cardSnapshot: { cardId: 'c1', name: 'A', company: 'Co' }, personalInterest: 'Need A' }]
        }
    });
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[0].supplementId, 's1');
    supplementalCrudState.updateRecordAdditionalVisitorInterest(0, 'Need B');
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[0].personalInterest, 'Need B');
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[0].dirty, true);
    supplementalCrudState.applyRecordAdditionalVisitorCard({ cardId: 'c2', name: 'B' }, { submissionId: 'record-1', index: '0' });
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[0].supplementId, 's1');
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[0].cardId, 'c2');
    supplementalCrudState.applyRecordAdditionalVisitorCard({ cardId: 'c3', name: 'C' }, { submissionId: 'record-1', index: '' });
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[1].supplementId, '');
    supplementalCrudState.removeRecordAdditionalVisitor(0);
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors[0].removed, true);
    supplementalCrudState.removeRecordAdditionalVisitor(1);
    assert.strictEqual(supplementalCrudState.ui.drawer.workingAdditionalVisitors.length, 1);
}

function assertActiveIntelligenceAnalyticsV1Contract(managementSource, cssSource) {
    assert(!managementSource.includes('function renderActiveIntelligenceAnalyticsEmptyState'), 'active analytics placeholder renderer must be removed');
    assert(!managementSource.includes('正式分析尚未啟用'), 'active analytics must not render the neutral placeholder copy');
    assert(managementSource.includes('return activeAnalytics ? recordIsFieldIntelligence(r) : !recordIsFieldIntelligence(r);'), 'analyticsRecords must use recordContext as the authoritative dataset split');
    assert(managementSource.includes('analyticsMetrics(activity, records, { includeVisitorCount: !activeAnalytics })'), 'analytics metrics must receive context-specific Visitor Count behavior');
    assert(managementSource.includes('const visitorField = options.includeVisitorCount === false ? null : currentVisitorCountField(activity);'), 'Visitor Count KPI must be suppressible for Active Analytics');
    assert(managementSource.includes('analysisContext: analyticsFormContext()'), 'Assistant request must carry the selected Analytics context');
    assert(managementSource.includes('const assistant = !isMobileFormViewport() ? renderAnalyticsAiPanel(activity, records) :'), 'desktop shared AI panel must remain visible and use the current Analytics context');
    assert(managementSource.includes('${renderMobileAnalyticsAiPanel(activity, records)}'), 'mobile shared AI panel must remain visible and use the current Analytics context');
    assert(!managementSource.includes('!activeAnalytics && !isMobileFormViewport() ? renderAnalyticsAiPanel'), 'Active Analytics must not hide the shared desktop AI panel');
    assert(!managementSource.includes("activeAnalytics ? '' : renderMobileAnalyticsAiPanel"), 'Active Analytics must not hide the shared mobile AI panel');
    assert(managementSource.includes('function analyticsRecords(activity, scope)'), 'analyticsRecords must support explicit Analytics scopes');
    assert(managementSource.includes('publishedRecordItems(activity, context)'), 'Active Analytics schema seed must use the active form context');
    const renderAnalyticsSource = extractFunctionDeclaration(managementSource, 'renderAnalytics');
    const renderMobileAnalysisSource = extractFunctionDeclaration(managementSource, 'renderMobileAnalysis');
    assert((renderAnalyticsSource.match(/renderAnalyticsAiPanel/g) || []).length === 1, 'desktop Analytics must render exactly one shared AI panel call');
    assert(renderAnalyticsSource.indexOf('renderAnalyticsAiPanel') < renderAnalyticsSource.indexOf('renderAnalyticsScopeSelector()'), 'desktop Analytics selector must remain below the shared AI panel');
    assert((renderMobileAnalysisSource.match(/renderMobileAnalyticsAiPanel/g) || []).length === 1, 'mobile Analytics must render exactly one shared AI panel call');
    assert(renderMobileAnalysisSource.indexOf('renderMobileAnalyticsAiPanel') < renderMobileAnalysisSource.indexOf('renderAnalyticsScopeSelector()'), 'mobile Analytics selector must remain below the shared AI panel');
    assert(!renderAnalyticsSource.includes('aim-analytics-active-kpi-row'), 'Active Analytics must reuse the shared KPI row component');
    assert(!renderAnalyticsSource.includes('aim-analytics-active-chart-grid'), 'Active Analytics must reuse the shared chart grid component');
    assert(!renderMobileAnalysisSource.includes('aim-mobile-analysis-active-context'), 'Mobile Active Analytics must reuse the shared mobile analysis shell');
    const activeAnalyticsSource = [
        renderAnalyticsSource,
        renderMobileAnalysisSource,
        extractFunctionDeclaration(managementSource, 'analyticFields')
    ].join('\n');
    assert(!/competitor|information type|cooperation|follow-up|product|technology/i.test(activeAnalyticsSource), 'Active Analytics must not hardcode business question titles');
    assert(!cssSource.includes('.aim-analytics-active-kpi-row'), 'Active Analytics must not add purple KPI card styling');
    assert(!cssSource.includes('.aim-analytics-active-chart-grid'), 'Active Analytics must not add purple chart card styling');
    assert(!cssSource.includes('.aim-mobile-analysis-active-context'), 'Active Analytics must not add purple chart control styling');
    assert(cssSource.includes('.aim-mode-tab[aria-selected="true"]'), 'Visitor selector selected state must preserve the existing mode-tab styling');
    assert(cssSource.includes('.aim-analytics-scope-tabs .aim-mode-tab[data-mode="active-intelligence"][aria-selected="true"]'), 'Active selector selected state must keep only a subtle purple cue');

    const source = [
        'const formContextVisitorMode = "visitor";',
        'const formContextFieldIntelligenceMode = "field_intelligence";',
        'const recordContextVisitorMode = "visitor";',
        'const recordContextActiveMode = "active-intelligence";',
        'const visitorCountFieldTitle = "同行人數";',
        'const yesNoOptions = ["是", "否"];',
        'const otherAnswerValue = "其他";',
        'const Store = { CURRENT_DATE: "2026-08-16", clone(value) { return JSON.parse(JSON.stringify(value)); } };',
        'let ui = { analyticsScope: recordContextVisitorMode };',
        'let selectedAnalyticsActivity = null;',
        'const state = { records: [] };',
        'function selectedActivity() { return selectedAnalyticsActivity; }',
        'function isIsoDateOnly(value) { return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(value || "").slice(0, 10)); }',
        'function shiftLocalDate(value, amount) { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }',
        'function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : formContextVisitorMode; }',
        'function normalizeDesignerItem(item) { const key = item.itemKey || item.fieldId || item.itemId || item.title; return { ...item, itemKey: item.itemKey || key, itemId: item.itemId || key, fieldId: item.fieldId || key, options: item.options || [], optionEntries: item.optionEntries || [], visible: item.visible !== false, retired: Boolean(item.retired), removedInDraft: Boolean(item.removedInDraft) }; }',
        'function designerItemKey(item) { return item && (item.itemKey || item.itemId || item.fieldId); }',
        'function formDesign(activity, context) { return activity.formDesignRuntimeByContext[context]; }',
        'function recordsFor(activityId) { return state.records.filter(record => record.activityId === activityId); }',
        'function recordIsFieldIntelligence(record) { return record && record.recordContext === formContextFieldIntelligenceMode; }',
        'function otherAnswersForRecord(record) { return record && record.runtimeOtherAnswers ? record.runtimeOtherAnswers : {}; }',
        'function optionLabel(value) { return value && typeof value === "object" ? (value.label || value.value || "") : value; }',
        'function formatAnalyticsPercent(value) { return `${Number(value || 0).toFixed(1)}%`; }',
        extractFunctionDeclaration(managementSource, 'publishedRecordItems'),
        extractFunctionDeclaration(managementSource, 'answerProducingItems'),
        extractFunctionDeclaration(managementSource, 'snapshotRecordItems'),
        extractFunctionDeclaration(managementSource, 'hasValue'),
        extractFunctionDeclaration(managementSource, 'recordCoverage'),
        extractFunctionDeclaration(managementSource, 'analyticsRecords'),
        extractFunctionDeclaration(managementSource, 'unique'),
        extractFunctionDeclaration(managementSource, 'analyticsMetrics'),
        extractFunctionDeclaration(managementSource, 'analyticsScopeIsActive'),
        extractFunctionDeclaration(managementSource, 'analyticsFormContext'),
        extractFunctionDeclaration(managementSource, 'analyticsCompletenessStats'),
        extractFunctionDeclaration(managementSource, 'currentVisitorCountField'),
        extractFunctionDeclaration(managementSource, 'visitorCountTotal'),
        extractFunctionDeclaration(managementSource, 'visitorRecordCountValue'),
        extractFunctionDeclaration(managementSource, 'visitorAnswerIsOther'),
        extractFunctionDeclaration(managementSource, 'visitorNumberValue'),
        extractFunctionDeclaration(managementSource, 'analyticsOtherText'),
        extractFunctionDeclaration(managementSource, 'analyticFields'),
        extractFunctionDeclaration(managementSource, 'analyticsFieldOptionLabels'),
        extractFunctionDeclaration(managementSource, 'analyticsAnswerLabels'),
        'function analyticsAnswerLabel(value, field, otherText = "") { if (value === undefined || value === null || value === "") return ""; if (field.type === "yes_no") { if (value === true) return yesNoOptions[0]; if (value === false) return yesNoOptions[1]; } const label = String(optionLabel(value, field) || "").trim(); if (!label) return ""; if (label === "__other" || label === otherAnswerValue) return otherText || otherAnswerValue; return label; }',
        extractFunctionDeclaration(managementSource, 'categoricalChartRow'),
        extractFunctionDeclaration(managementSource, 'analyticsDateBuckets'),
        extractFunctionDeclaration(managementSource, 'categoricalTrendData'),
        extractFunctionDeclaration(managementSource, 'categoricalFieldChartData'),
        extractFunctionDeclaration(managementSource, 'count'),
        extractFunctionDeclaration(managementSource, 'activityTrendChartData'),
        extractFunctionDeclaration(managementSource, 'recorderDistributionChartData'),
        '({ state, ui, setSelectedActivity(activity) { selectedAnalyticsActivity = activity; }, analyticsRecords, analyticsMetrics, analyticsFormContext, analyticFields, categoricalFieldChartData, activityTrendChartData, recorderDistributionChartData });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const activity = {
        id: 'analytics-activity',
        formFields: [
            { itemKey: 'visitor-count', fieldId: 'visitor-count', type: 'single_choice', title: '同行人數', options: ['1', '2', '3'] },
            { itemKey: 'visitor-topic', fieldId: 'visitor-topic', type: 'single_choice', title: 'Visitor Topic', options: ['V1', 'V2'] }
        ],
        formDesignRuntimeByContext: {
            visitor: { published: { items: [
                { itemKey: 'visitor-count', fieldId: 'visitor-count', type: 'single_choice', title: '同行人數', options: ['1', '2', '3'] },
                { itemKey: 'visitor-topic', fieldId: 'visitor-topic', type: 'single_choice', title: 'Visitor Topic', options: ['V1', 'V2'] }
            ] } },
            field_intelligence: {
                published: {
                    items: [
                        { itemKey: 'active-topic', fieldId: 'active-topic', type: 'single_choice', title: 'Active Topic', options: ['Hot', 'Cold'] }
                    ]
                }
            }
        }
    };
    const visitorSnapshot = { items: activity.formFields };
    const activeCurrentSnapshot = { items: activity.formDesignRuntimeByContext.field_intelligence.published.items };
    const activeHistoricalSnapshot = {
        items: [
            { itemKey: 'old-active-topic', fieldId: 'old-active-topic', type: 'single_choice', title: 'Old Active Topic', options: ['Old', 'Other'] },
            { itemKey: 'old-active-missing', fieldId: 'old-active-missing', type: 'short_text', title: 'Old Missing' }
        ]
    };
    contract.setSelectedActivity(activity);
    contract.state.records = [
        { id: 'visitor-1', activityId: activity.id, recordContext: 'visitor', status: 'active', createdAt: '2026-08-16T01:00:00.000Z', createdByUserId: 'visitor-a', createdByDisplayName: 'Visitor A', answers: { 'visitor-count': '3', 'visitor-topic': 'V1' }, formRuntimeSnapshot: visitorSnapshot },
        { id: 'visitor-2', activityId: activity.id, recordContext: 'visitor', status: 'active', createdAt: '2026-08-15T01:00:00.000Z', createdByUserId: 'visitor-b', createdByDisplayName: 'Visitor B', answers: { 'visitor-count': '2' }, formRuntimeSnapshot: visitorSnapshot },
        { id: 'active-1', activityId: activity.id, recordContext: 'field_intelligence', status: 'active', createdAt: '2026-08-16T02:00:00.000Z', createdByUserId: 'active-a', createdByDisplayName: 'Active A', answers: { 'active-topic': 'Hot' }, formRuntimeSnapshot: activeCurrentSnapshot },
        { id: 'active-2', activityId: activity.id, recordContext: 'field_intelligence', status: 'active', createdAt: '2026-08-14T02:00:00.000Z', createdByUserId: 'active-b', createdByDisplayName: 'Active B', answers: { 'old-active-topic': 'Old' }, formRuntimeSnapshot: activeHistoricalSnapshot },
        { id: 'active-void', activityId: activity.id, recordContext: 'field_intelligence', status: 'void', createdAt: '2026-08-16T03:00:00.000Z', createdByUserId: 'active-c', createdByDisplayName: 'Active C', answers: { 'active-topic': 'Cold' }, formRuntimeSnapshot: activeCurrentSnapshot }
    ];

    contract.ui.analyticsScope = 'visitor';
    const visitorRecords = contract.analyticsRecords(activity);
    assert.deepStrictEqual(visitorRecords.map(record => record.id), ['visitor-1', 'visitor-2'], 'Visitor Analytics dataset must contain only visitor records');
    const visitorMetrics = contract.analyticsMetrics(activity, visitorRecords, { includeVisitorCount: true });
    assert.strictEqual(visitorMetrics.total, 2);
    assert.strictEqual(visitorMetrics.today, 1);
    assert.strictEqual(visitorMetrics.recorders, 2);
    assert.strictEqual(visitorMetrics.visitorCount, 5, 'Visitor Count KPI must remain available in Visitor Analytics');
    assert.strictEqual(contract.analyticsFormContext(), 'visitor');

    contract.ui.analyticsScope = 'active-intelligence';
    const activeRecords = contract.analyticsRecords(activity);
    assert.deepStrictEqual(activeRecords.map(record => record.id), ['active-1', 'active-2'], 'Active Analytics dataset must contain only field_intelligence records');
    assert.deepStrictEqual(contract.analyticsRecords(activity, 'visitor').map(record => record.id), ['visitor-1', 'visitor-2'], 'shared AI shell must be able to keep visitor-scoped behavior while Active Analytics is selected');
    assert.deepStrictEqual(contract.analyticsRecords(activity, 'field_intelligence').map(record => record.id), ['active-1', 'active-2'], 'explicit field_intelligence scope must keep returning Active records');
    const activeMetrics = contract.analyticsMetrics(activity, activeRecords, { includeVisitorCount: false });
    assert.strictEqual(activeMetrics.total, 2, 'Active total KPI must use Active submissions only');
    assert.strictEqual(activeMetrics.today, 1, 'Active today KPI must use Active submissions only');
    assert.strictEqual(activeMetrics.recorders, 2, 'Active recorder KPI must use Active submissions only');
    assert.strictEqual(activeMetrics.visitorCount, null, 'Visitor Count KPI must be absent from Active Analytics');
    assert.strictEqual(activeMetrics.completeness.totalAnswered, 2, 'Active completeness must use each record historical schema');
    assert.strictEqual(activeMetrics.completeness.totalExpected, 3, 'Active completeness expected slots must be historical-schema safe');
    assert.strictEqual(contract.analyticsFormContext(), 'field_intelligence');
    const activeFields = contract.analyticFields(activity, activeRecords, contract.analyticsFormContext());
    assert(activeFields.some(field => field.fieldId === 'active-topic'), 'Active current schema fields must generate Analytics cards');
    assert(activeFields.some(field => field.fieldId === 'old-active-topic'), 'Historical Active schema fields must remain analyzable');
    assert(!activeFields.some(field => field.fieldId === 'visitor-count'), 'Visitor schema fields must not leak into Active Analytics');
    const activeTopicChart = contract.categoricalFieldChartData(activeFields.find(field => field.fieldId === 'active-topic'), activeRecords);
    assert.strictEqual(activeTopicChart.denominator, 1, 'Active schema question chart must count Active answers only');
    assert.strictEqual(contract.activityTrendChartData(activeRecords).dailyCounts.reduce((sum, value) => sum + value, 0), 2, 'Active trend must use Active records only');
    assert.strictEqual(JSON.stringify(contract.recorderDistributionChartData(activeRecords).rows.map(row => row.label).sort()), JSON.stringify(['Active A', 'Active B']), 'Active recorder distribution must use Active records only');

    contract.ui.analyticsScope = 'visitor';
    assert.deepStrictEqual(contract.analyticsRecords(activity).map(record => record.id), ['visitor-1', 'visitor-2'], 'Switching back to Visitor must restore the visitor dataset');
}

function assertCompanyKpiDedupQualityV1Contract(managementSource, cssSource) {
    ['來拜訪公司數（去重）', '同公司重複紀錄數', '無公司名稱', '情報來源數（去重）', '同來源重複紀錄數', '無情報來源'].forEach(label => {
        assert(managementSource.includes(label), `Company KPI label ${label} must exist in source`);
    });
    assert(managementSource.includes('data-action="open-company-kpi-modal"'), 'Company KPI cards must be clickable through a shared action');
    assert(managementSource.includes('data-action="close-company-kpi-modal"'), 'Company KPI modal must use a shared close action');
    assert(cssSource.includes('.aim-company-kpi-card'), 'Company KPI cards must have dedicated interactive styling');
    assert(cssSource.includes('.aim-company-kpi-dialog'), 'Company KPI detail modal must have dialog styling');
    assert(cssSource.includes('table-layout: fixed'), 'Company KPI detail table must use compact fixed layout');
    assert(cssSource.includes('white-space: nowrap') && cssSource.includes('text-overflow: ellipsis'), 'Company KPI detail table must prefer single-line ellipsis cells');
    assert(cssSource.includes('.aim-company-kpi-sort-header'), 'Company KPI unique modal must expose lightweight sortable table headers');
    assert(cssSource.includes('.aim-company-kpi-table-invalid th:nth-child(2)') && cssSource.includes('width: 110px'), 'Invalid/missing-source identity column must stay compact');
    assert(cssSource.includes('.aim-company-kpi-table-invalid th:nth-child(3)') && cssSource.includes('width: 260px'), 'Invalid/missing-source Company Type column must be expanded');
    assert(cssSource.includes('.aim-company-kpi-row-number'), 'Company KPI detail table must style compact row numbers');
    assert(managementSource.includes("const visitorField = options.includeVisitorCount === false ? null : currentVisitorCountField(activity);"), 'Visitor Count opt-out contract must remain unchanged');
    assert(managementSource.includes("return publishedRecordItems(activity).find(field => field.type === 'single_choice' && field.title === visitorCountFieldTitle) || null;"), 'Visitor Count detector must remain single_choice/title based');
    assert(managementSource.includes("moreTypes: ['rose', 'polarBar', 'treemap', 'bubble']"), 'More chart availability must remain intact');

    const companyHelperSource = [
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiCards'),
        extractFunctionDeclaration(managementSource, 'companyKpiDerivation'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiDetailModal')
    ].join('\n');
    assert(!/ActivityIntelligenceApi|fetch\s*\(/.test(companyHelperSource), 'Company KPI helpers must not add frontend API fetches');

    const source = [
        'const cardAssistRoles = new Set(["person_name", "job_title", "company_name"]);',
        'const formContextVisitorMode = "visitor";',
        'const formContextFieldIntelligenceMode = "field_intelligence";',
        'const recordContextVisitorMode = "visitor";',
        'const recordContextActiveMode = "active-intelligence";',
        'const otherAnswerValue = "其他";',
        'const Store = { CURRENT_DATE: "2026-08-16", clone(value) { return JSON.parse(JSON.stringify(value)); }, escapeHtml(value) { return String(value === undefined || value === null ? "" : value).replace(/[&<>"\']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "\'": "&#39;" }[char])); }, answerText(value) { if (Array.isArray(value)) return value.join("、"); if (value && typeof value === "object") return value.label || value.value || JSON.stringify(value); return value === undefined || value === null ? "" : String(value); }, formatDateTime(value) { return String(value || "").replace("T", " ").slice(0, 16); } };',
        'let ui = { analyticsScope: recordContextVisitorMode, companyKpiModal: null };',
        'let selectedAnalyticsActivity = null;',
        'const state = { records: [] };',
        'function selectedActivity() { return selectedAnalyticsActivity; }',
        'function canUseAnalytics() { return true; }',
        'function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : formContextVisitorMode; }',
        'function normalizeDesignerItem(item) { const key = item.itemKey || item.fieldId || item.itemId || item.title; return { ...item, itemKey: item.itemKey || key, itemId: item.itemId || key, fieldId: item.fieldId || key, options: item.options || [], optionEntries: item.optionEntries || [], visible: item.visible !== false, retired: Boolean(item.retired), removedInDraft: Boolean(item.removedInDraft), settings: item.settings || {} }; }',
        'function formDesign(activity, context) { return activity.formDesignRuntimeByContext[normalizeFormContext(context)]; }',
        'function recordsFor(activityId) { return state.records.filter(record => record.activityId === activityId); }',
        'function recordIsFieldIntelligence(record) { return normalizeFormContext(record && record.recordContext) === formContextFieldIntelligenceMode; }',
        'function otherAnswersForRecord(record) { return record && record.runtimeOtherAnswers ? record.runtimeOtherAnswers : {}; }',
        'function displayAnswerValue(field, value, otherAnswers) { if (!field || !otherAnswers || !hasValue(otherAnswers[field.fieldId])) return value; if (Array.isArray(value)) return value.map(item => item === otherAnswerValue ? `${otherAnswerValue}：${otherAnswers[field.fieldId]}` : item); return value === otherAnswerValue ? `${otherAnswerValue}：${otherAnswers[field.fieldId]}` : value; }',
        'function analyticsScopeCaption(records) { return `${records.length} records`; }',
        extractFunctionDeclaration(managementSource, 'publishedRecordItems'),
        extractFunctionDeclaration(managementSource, 'answerProducingItems'),
        extractFunctionDeclaration(managementSource, 'cardAssistFieldRole'),
        extractFunctionDeclaration(managementSource, 'hasValue'),
        extractFunctionDeclaration(managementSource, 'analyticsRecords'),
        extractFunctionDeclaration(managementSource, 'analyticsScopeIsActive'),
        extractFunctionDeclaration(managementSource, 'analyticsFormContext'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiCards'),
        extractFunctionDeclaration(managementSource, 'companyKpiDerivation'),
        extractFunctionDeclaration(managementSource, 'companyKpiUniqueSortState'),
        extractFunctionDeclaration(managementSource, 'companyKpiSortedUniqueGroups'),
        extractFunctionDeclaration(managementSource, 'currentCompanyKpiFields'),
        extractFunctionDeclaration(managementSource, 'companyKpiCopy'),
        extractFunctionDeclaration(managementSource, 'currentCompanyNameField'),
        extractFunctionDeclaration(managementSource, 'currentFieldIntelligenceSourceField'),
        extractFunctionDeclaration(managementSource, 'currentCompanyTypeField'),
        extractFunctionDeclaration(managementSource, 'companyKpiLegacyCompanyNameField'),
        extractFunctionDeclaration(managementSource, 'companyKpiCompanyTypeField'),
        extractFunctionDeclaration(managementSource, 'companyKpiRecordEntry'),
        extractFunctionDeclaration(managementSource, 'companyKpiAnswerText'),
        extractFunctionDeclaration(managementSource, 'normalizeCompanyKpiKey'),
        extractFunctionDeclaration(managementSource, 'companyKpiRecordOrderCompare'),
        extractFunctionDeclaration(managementSource, 'companyKpiTypeDisplay'),
        extractFunctionDeclaration(managementSource, 'companyKpiBlankDisplay'),
        extractFunctionDeclaration(managementSource, 'companyKpiSimilarNamePairs'),
        extractFunctionDeclaration(managementSource, 'companyKpiSimilarNameGroups'),
        extractFunctionDeclaration(managementSource, 'companyKpiEstimatedCompanyCount'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiDetailModal'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiUniqueDetail'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiDuplicateDetail'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiInvalidDetail'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiTable'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiHeaderCell'),
        extractFunctionDeclaration(managementSource, 'renderCompanyKpiSimilarNameAdvisory'),
        extractFunctionDeclaration(managementSource, 'companyKpiAdvisoryEstimateText'),
        '({ state, ui, setSelectedActivity(activity) { selectedAnalyticsActivity = activity; }, analyticsRecords, analyticsFormContext, renderCompanyKpiCards, companyKpiDerivation, companyKpiUniqueSortState, companyKpiSortedUniqueGroups, currentCompanyKpiFields, currentFieldIntelligenceSourceField, currentCompanyTypeField, normalizeCompanyKpiKey, renderCompanyKpiDetailModal, renderCompanyKpiSimilarNameAdvisory, companyKpiSimilarNameGroups, companyKpiEstimatedCompanyCount, companyKpiAdvisoryEstimateText });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const companyNameField = { itemKey: 'companyName', itemId: 'companyName', fieldId: 'companyName', type: 'short_text', title: 'Renamed Company', settings: { cardAssistField: 'company_name' }, visible: true };
    const activeCompanyNameField = { itemKey: 'activeCompanyName', itemId: 'activeCompanyName', fieldId: 'activeCompanyName', type: 'short_text', title: '公司名稱', settings: { cardAssistField: 'company_name' }, visible: true };
    const sourceField = { itemKey: 'intelSource', itemId: 'intelSource', fieldId: 'intelSource', type: 'short_text', title: '情報來源', visible: true };
    const companyTypeField = { itemKey: 'companyType', itemId: 'companyType', fieldId: 'companyType', type: 'single_choice', title: '公司類型', options: ['MTB', 'MTU'], visible: true };
    const activity = {
        id: 'company-kpi-activity',
        formDesignRuntimeByContext: {
            visitor: { published: { items: [companyNameField, companyTypeField] } },
            field_intelligence: { published: { items: [activeCompanyNameField, sourceField, companyTypeField] } }
        }
    };
    const record = (id, createdAt, companyName, companyType, extra = {}) => {
        const answers = { companyName, companyType, ...(extra.answers || {}) };
        const { answers: ignoredAnswers, ...rest } = extra;
        return {
            id,
            submissionId: id,
            activityId: activity.id,
            recordContext: 'visitor',
            status: 'active',
            createdAt,
            createdByUserId: `${id}-user`,
            createdByDisplayName: `${id} Recorder`,
            answers,
            ...rest
        };
    };

    contract.setSelectedActivity(activity);
    contract.state.records = [
        record('abc-1', '2026-08-10T01:00:00.000Z', 'ABC科技', 'MTB'),
        record('abc-2', '2026-08-10T01:00:00.000Z', 'ａｂｃ科技', 'MTU'),
        record('hiwin-short', '2026-08-11T01:00:00.000Z', '上銀', 'MTB'),
        record('hiwin-long', '2026-08-12T01:00:00.000Z', '上銀科技', 'MTU'),
        record('hiwin-suffix', '2026-08-12T02:00:00.000Z', '上銀科技股份有限公司', 'MTU'),
        record('blank-name', '2026-08-13T01:00:00.000Z', '   ', ''),
        record('void-record', '2026-08-14T01:00:00.000Z', 'ABC科技', 'MTB', { status: 'void' }),
        record('active-1', '2026-08-15T01:00:00.000Z', 'Wrong Visitor Name A', 'MTB', { recordContext: 'field_intelligence', answers: { activeCompanyName: 'Should Not Count A', intelSource: '新代', companyType: 'MTB' } }),
        record('active-2', '2026-08-16T01:00:00.000Z', 'Wrong Visitor Name B', 'MTU', { recordContext: 'field_intelligence', answers: { activeCompanyName: 'Should Not Count B', intelSource: '新代科技', companyType: 'MTU' } }),
        record('active-3', '2026-08-16T02:00:00.000Z', 'Wrong Visitor Name C', 'MTB', { recordContext: 'field_intelligence', answers: { activeCompanyName: 'Should Not Count C', intelSource: '新代', companyType: 'MTB' } }),
        record('active-blank', '2026-08-17T01:00:00.000Z', 'Wrong Visitor Name D', '', { recordContext: 'field_intelligence', answers: { activeCompanyName: 'Should Not Count D', intelSource: '   ', companyType: '' } })
    ];

    const records = contract.analyticsRecords(activity);
    const data = contract.companyKpiDerivation(activity, records, contract.analyticsFormContext());
    assert.strictEqual(data.capable, true, 'Company KPI must render when Company Name is clear');
    assert.strictEqual(data.copy.identityLabel, '公司名稱', 'Visitor Company KPI identity label must remain Company Name');
    assert.strictEqual(contract.currentCompanyKpiFields(activity, 'visitor').companyNameField.fieldId, 'companyName', 'Visitor Company KPI must keep the existing Company Name resolver');
    assert.strictEqual(contract.currentCompanyKpiFields(activity, 'field_intelligence').companyNameField.fieldId, 'intelSource', 'Field Intelligence Company KPI must use the exact 情報來源 field as identity');
    assert.strictEqual(records.length, 6, 'Company KPI must use the existing Analytics scope and exclude void/other-context records');
    assert.strictEqual(data.uniqueCompanyCount, 4, 'Unique Company count must count distinct valid Company Name identities');
    assert.strictEqual(data.duplicateRecordCount, 1, 'Duplicate KPI must count duplicate records, not duplicate company groups');
    assert.strictEqual(data.invalidRecordCount, 1, 'Blank Company Name must be invalid');
    assert.strictEqual(data.uniqueCompanyCount + data.duplicateRecordCount + data.invalidRecordCount, records.length, 'Company KPI three-bucket invariant must hold');
    const abc = data.uniqueGroups.find(group => group.key === 'abc科技');
    assert(abc, 'NFKC/case normalized ABC group must exist');
    assert.strictEqual(abc.representative.record.id, 'abc-1', 'Earliest createdAt/submissionId must select the representative');
    assert.strictEqual(JSON.stringify(abc.duplicateRecords.map(entry => entry.record.id)), JSON.stringify(['abc-2']), 'Later same-identity records must be duplicate records');
    assert.strictEqual(abc.companyTypes.join('、'), 'MTB、MTU', 'Company Type must remain metadata and aggregate across one Company Name identity');
    assert(data.similarNamePairs.some(pair => pair.a === '上銀' && pair.b === '上銀科技'), 'Containment-based similar names must be advisory candidates');
    const advisoryGroups = contract.companyKpiSimilarNameGroups(data.similarNamePairs);
    assert.strictEqual(contract.companyKpiEstimatedCompanyCount(data.uniqueCompanyCount, advisoryGroups), 2, 'Overlapping similar-name pairs must reduce by connected components, not by blind pair count');
    assert.strictEqual(data.uniqueCompanyCount, data.uniqueGroups.length, 'Unique modal groups must derive from the KPI aggregation');
    assert.strictEqual(data.duplicateRecordCount, data.duplicateGroups.reduce((sum, group) => sum + group.duplicateRecords.length, 0), 'Duplicate modal counts must derive from the KPI aggregation');
    assert.strictEqual(data.invalidRecordCount, data.invalidRecords.length, 'Invalid modal rows must derive from the KPI aggregation');
    assert.strictEqual(contract.normalizeCompanyKpiKey(' ＡＢＣ   Tech '), 'abc tech', 'Company normalization must use NFKC, trim, whitespace collapse, and case-insensitive English comparison');
    assert.notStrictEqual(contract.normalizeCompanyKpiKey('上銀科技股份有限公司'), contract.normalizeCompanyKpiKey('上銀科技'), 'Company KPI must not strip meaningful company suffixes');

    const cards = contract.renderCompanyKpiCards(data);
    assert(cards.includes('來拜訪公司數（去重）') && cards.includes('4 家'), 'Unique Company card must show final label and 家 unit without changing official count');
    assert(cards.includes('同公司重複紀錄數') && cards.includes('1 筆'), 'Duplicate Record card must show final label and 筆 unit');
    assert(cards.includes('無公司名稱') && cards.includes('1 筆'), 'Invalid Record card must show final label and 筆 unit');
    assert.strictEqual(contract.renderCompanyKpiCards({ capable: false }), '', 'Company KPI group must be hidden when capability is absent');

    contract.ui.companyKpiModal = { mode: 'unique', sortKey: '', sortDirection: '' };
    const uniqueModal = contract.renderCompanyKpiDetailModal();
    assert(uniqueModal.includes('來拜訪公司數（去重）') && uniqueModal.includes('<th class="aim-company-kpi-row-number">#</th>') && uniqueModal.includes('公司名稱') && uniqueModal.includes('公司類型') && uniqueModal.includes('總紀錄'), 'Unique modal must render final title and row-numbered columns');
    assert(uniqueModal.includes('MTB、MTU'), 'Unique modal must show distinct Company Type metadata without splitting identity');
    assert(uniqueModal.includes('名稱相近，請人工確認'), 'Unique modal must render advisory only when candidate pairs exist');
    assert(uniqueModal.includes('data-action="company-kpi-header-sort"') && uniqueModal.includes('data-sort-key="companyType"') && uniqueModal.includes('data-sort-key="total"'), 'Unique modal must expose Company Type and Total Records header sorting');
    assert(!uniqueModal.includes('<select') && !uniqueModal.includes('data-action="company-kpi-type-filter"') && !uniqueModal.includes('data-action="company-kpi-sort"'), 'Unique modal must remove the separate Company Type filter and sort dropdown toolbar');
    assert(uniqueModal.includes('若以下相近名稱皆視為同公司，推估來拜訪公司數：2 家'), 'Unique modal must render connected-component advisory estimate with corrected directional copy');
    assert(!uniqueModal.includes('若以上相近名稱'), 'Unique modal must not keep the obsolete advisory direction copy');
    assert(uniqueModal.includes('正式統計仍以目前紀錄內容為準。'), 'Unique modal must state advisory estimate is not official');
    assert(uniqueModal.includes('上銀 / 上銀科技 / 上銀科技股份有限公司：3 → 1，少 2 家'), 'Unique modal must render connected similar-name groups instead of duplicate pair rows');
    assert.strictEqual((uniqueModal.match(/↔/g) || []).length, 0, 'Connected advisory display must not render individual pair rows');
    assert.strictEqual(uniqueModal.includes('4 家'), false, 'Advisory estimate must not rewrite official KPI value inside the advisory section');
    assert.strictEqual(contract.renderCompanyKpiSimilarNameAdvisory([], data.uniqueCompanyCount, data.context), '', 'Empty advisory must remain hidden');
    const defaultSortState = contract.companyKpiUniqueSortState();
    assert.strictEqual(defaultSortState.key, '', 'Unique Company modal default sort must preserve existing order with no active sort key');
    assert.strictEqual(defaultSortState.direction, '', 'Unique Company modal default sort must preserve existing order with no active sort direction');
    const originalNames = contract.companyKpiSortedUniqueGroups(data).map(group => group.displayName).join('|');
    assert.strictEqual(originalNames, 'ABC科技|上銀|上銀科技|上銀科技股份有限公司', 'Original display order must stay unchanged by default');
    contract.ui.companyKpiModal = { mode: 'unique', companyTypeFilter: 'MTU', uniqueSort: 'total-asc', sortKey: '', sortDirection: '' };
    assert.strictEqual(contract.companyKpiSortedUniqueGroups(data).map(group => group.displayName).join('|'), originalNames, 'Removed Company Type filter and dropdown sort state must not hide or reorder rows');
    contract.ui.companyKpiModal = { mode: 'unique', sortKey: 'total', sortDirection: 'asc' };
    const totalAscSorted = contract.companyKpiSortedUniqueGroups(data);
    assert.strictEqual(totalAscSorted.map(group => group.displayName).join('|'), '上銀|上銀科技|上銀科技股份有限公司|ABC科技', 'Total Records header ascending sort must reorder display rows without filtering');
    assert.strictEqual(data.uniqueGroups.map(group => group.displayName).join('|'), originalNames, 'Display filter/sort must not mutate official aggregation order');
    const totalAscModal = contract.renderCompanyKpiDetailModal();
    assert(totalAscModal.indexOf('title="上銀"') < totalAscModal.indexOf('title="ABC科技"'), 'Visible row order must follow header sort state');
    assert(totalAscModal.includes('<td class="aim-company-kpi-row-number">1</td>') && totalAscModal.includes('<td class="aim-company-kpi-row-number">2</td>'), 'Visible row numbers must reflect current display order');
    assert(totalAscModal.includes('推估來拜訪公司數：2 家'), 'Similar-name estimate must ignore display sorting');
    contract.ui.companyKpiModal = { mode: 'unique', sortKey: 'total', sortDirection: 'desc' };
    assert(contract.renderCompanyKpiDetailModal().includes('總紀錄 ↓'), 'Total Records header must show a lightweight descending indicator when active');
    contract.ui.companyKpiModal = { mode: 'unique', sortKey: 'companyType', sortDirection: 'asc' };
    assert(contract.renderCompanyKpiDetailModal().includes('公司類型 ↑'), 'Company Type header must show a lightweight ascending indicator when active');
    contract.ui.companyKpiModal = { mode: 'duplicate' };
    const duplicateModal = contract.renderCompanyKpiDetailModal();
    assert(duplicateModal.includes('同公司重複紀錄數') && duplicateModal.includes('<th class="aim-company-kpi-row-number">#</th>') && duplicateModal.includes('重複筆數'), 'Duplicate modal must render final title and row-numbered grouped columns');
    contract.ui.companyKpiModal = { mode: 'invalid' };
    const invalidModal = contract.renderCompanyKpiDetailModal();
    assert(invalidModal.includes('無公司名稱') && invalidModal.includes('<th class="aim-company-kpi-row-number">#</th>') && invalidModal.includes('（空白）') && invalidModal.includes('blank-name Recorder') && invalidModal.includes('2026-08-13 01:00'), 'Invalid modal must render final title plus record-level blank, recorder, and time details');

    const withoutType = { ...activity, formDesignRuntimeByContext: { visitor: { published: { items: [companyNameField] } } } };
    const withoutTypeData = contract.companyKpiDerivation(withoutType, records, 'visitor');
    assert.strictEqual(contract.currentCompanyTypeField(withoutType, 'visitor').reason, 'COMPANY_TYPE_FIELD=ABSENT');
    assert.strictEqual(withoutTypeData.capable, true, 'Missing Company Type must not hide the KPI group');
    assert.strictEqual(withoutTypeData.uniqueCompanyCount + withoutTypeData.duplicateRecordCount + withoutTypeData.invalidRecordCount, records.length, 'Missing Company Type must not affect the three-bucket invariant');
    assert.strictEqual(withoutTypeData.invalidRecordCount, 1, 'Missing Company Type must not create invalid records');
    assert(contract.renderCompanyKpiCards(withoutTypeData).includes('來拜訪公司數（去重）'), 'Unique Company Name with no Company Type must still render Company KPI cards');
    contract.setSelectedActivity(withoutType);
    contract.ui.companyKpiModal = { mode: 'unique' };
    assert(contract.renderCompanyKpiDetailModal().includes('—'), 'Unique modal must tolerate unavailable Company Type metadata');
    contract.setSelectedActivity(activity);

    const withoutName = { ...activity, formDesignRuntimeByContext: { visitor: { published: { items: [companyTypeField] } } } };
    assert.strictEqual(contract.currentCompanyKpiFields(withoutName, 'visitor').reason, 'COMPANY_NAME_FIELD=ABSENT');
    assert.strictEqual(contract.companyKpiDerivation(withoutName, records, 'visitor').capable, false, 'Missing Company Name must hide the KPI group');

    const withCustomerIndustry = {
        ...activity,
        formDesignRuntimeByContext: { visitor: { published: { items: [companyNameField, companyTypeField, { ...companyTypeField, fieldId: 'customerIndustry', itemKey: 'customerIndustry', itemId: 'customerIndustry', title: '客戶產業大類' }] } } }
    };
    assert.strictEqual(contract.currentCompanyTypeField(withCustomerIndustry, 'visitor').field.fieldId, 'companyType', 'Customer Industry must not be treated as Company Type metadata');
    assert.strictEqual(contract.companyKpiDerivation(withCustomerIndustry, records, 'visitor').capable, true, 'Company Type and Customer Industry coexistence must not hide the KPI group');

    const ambiguousType = {
        ...activity,
        formDesignRuntimeByContext: { visitor: { published: { items: [companyNameField, companyTypeField, { ...companyTypeField, fieldId: 'companyType2', itemKey: 'companyType2', itemId: 'companyType2', title: '公司類型' }] } } }
    };
    const ambiguousTypeData = contract.companyKpiDerivation(ambiguousType, records, 'visitor');
    assert.strictEqual(contract.currentCompanyTypeField(ambiguousType, 'visitor').reason, 'COMPANY_TYPE_FIELD=AMBIGUOUS');
    assert.strictEqual(ambiguousTypeData.capable, true, 'Company Type ambiguity must not hide the KPI group');
    assert.strictEqual(ambiguousTypeData.uniqueGroups.every(group => group.companyTypes.length === 0), true, 'Ambiguous Company Type metadata must be unavailable instead of guessed');
    assert.strictEqual(ambiguousTypeData.uniqueCompanyCount + ambiguousTypeData.duplicateRecordCount + ambiguousTypeData.invalidRecordCount, records.length, 'Ambiguous Company Type must not affect the three-bucket invariant');

    contract.ui.analyticsScope = 'active-intelligence';
    const activeRecords = contract.analyticsRecords(activity);
    const activeData = contract.companyKpiDerivation(activity, activeRecords, contract.analyticsFormContext());
    assert.strictEqual(activeRecords.length, 4, 'Field Intelligence Company KPI must use field_intelligence records only');
    assert.strictEqual(activeData.capable, true, 'Field Intelligence Company KPI capability must use its own form context');
    assert.strictEqual(activeData.copy.identityLabel, '情報來源', 'Field Intelligence Company KPI copy must use source semantics');
    assert.strictEqual(activeData.fields.companyNameField.fieldId, 'intelSource', 'Field Intelligence identity must be sourced from 情報來源, not 公司名稱');
    assert.strictEqual(activeData.uniqueCompanyCount, 2, 'Field Intelligence Unique Source count must be isolated from Visitor names');
    assert.strictEqual(activeData.duplicateRecordCount, 1, 'Field Intelligence Duplicate count must be isolated from Visitor records');
    assert.strictEqual(activeData.invalidRecordCount, 1, 'Blank Field Intelligence 情報來源 must be invalid');
    assert.strictEqual(activeData.uniqueCompanyCount + activeData.duplicateRecordCount + activeData.invalidRecordCount, activeRecords.length, 'Field Intelligence three-bucket invariant must hold independently');
    assert.strictEqual(contract.companyKpiAdvisoryEstimateText(contract.companyKpiEstimatedCompanyCount(activeData.uniqueCompanyCount, contract.companyKpiSimilarNameGroups(activeData.similarNamePairs)), activeData.context), '若以下相近名稱皆視為同一情報來源，推估情報來源數：1 家', 'Field Intelligence similar-name advisory copy must use source semantics');
    contract.ui.companyKpiModal = { mode: 'unique', sortKey: '', sortDirection: '' };
    contract.setSelectedActivity(activity);
    const activeModal = contract.renderCompanyKpiDetailModal();
    assert(activeModal.includes('情報來源數（去重）') && activeModal.includes('情報來源') && activeModal.includes('新代') && !activeModal.includes('Should Not Count') && !activeModal.includes('上銀'), 'Shared Company KPI modal must render context-safe Field Intelligence source data without Visitor or Company Name leakage');
    assert(activeModal.includes('若以下相近名稱皆視為同一情報來源，推估情報來源數：1 家'), 'Field Intelligence modal must render source-context similar-name advisory copy');
    const activeSourceOnly = { ...activity, formDesignRuntimeByContext: { ...activity.formDesignRuntimeByContext, field_intelligence: { published: { items: [sourceField, companyTypeField] } } } };
    assert.strictEqual(contract.companyKpiDerivation(activeSourceOnly, activeRecords, 'field_intelligence').capable, true, 'Field Intelligence Company KPI must not require a Company Name field when 情報來源 exists');
    const activeWithoutSource = { ...activity, formDesignRuntimeByContext: { ...activity.formDesignRuntimeByContext, field_intelligence: { published: { items: [activeCompanyNameField, companyTypeField] } } } };
    assert.strictEqual(contract.currentCompanyKpiFields(activeWithoutSource, 'field_intelligence').reason, 'FIELD_INTELLIGENCE_SOURCE_FIELD=ABSENT');
    assert.strictEqual(contract.companyKpiDerivation(activeWithoutSource, activeRecords, 'field_intelligence').capable, false, 'Field Intelligence capability must fail when 情報來源 is absent even if 公司名稱 exists');
    const activeAmbiguousSource = { ...activity, formDesignRuntimeByContext: { ...activity.formDesignRuntimeByContext, field_intelligence: { published: { items: [sourceField, { ...sourceField, fieldId: 'intelSource2', itemKey: 'intelSource2', itemId: 'intelSource2' }, companyTypeField] } } } };
    assert.strictEqual(contract.currentCompanyKpiFields(activeAmbiguousSource, 'field_intelligence').reason, 'FIELD_INTELLIGENCE_SOURCE_FIELD=AMBIGUOUS');
    assert.strictEqual(contract.companyKpiDerivation(activeAmbiguousSource, activeRecords, 'field_intelligence').capable, false, 'Field Intelligence capability must fail rather than guess between multiple 情報來源 fields');
    contract.ui.analyticsScope = 'visitor';

    const ambiguousName = {
        ...activity,
        formDesignRuntimeByContext: { visitor: { published: { items: [companyNameField, { ...companyNameField, fieldId: 'companyName2', itemKey: 'companyName2', itemId: 'companyName2' }, companyTypeField] } } }
    };
    assert.strictEqual(contract.currentCompanyKpiFields(ambiguousName, 'visitor').reason, 'COMPANY_NAME_FIELD=AMBIGUOUS');
    assert.strictEqual(contract.companyKpiDerivation(ambiguousName, records, 'visitor').capable, false, 'Ambiguous Company Name must hide the KPI group');
}

function assertOtherHistorySuggestionsV1Contract(managementSource, cssSource, service) {
    assert(managementSource.includes('enableOtherHistorySuggestions'), 'Other history suggestions setting must exist in the frontend source');
    assert(managementSource.includes('啟用「其他」歷史值建議'), 'Builder must expose the approved Other history suggestion label');
    assert(managementSource.includes('從此活動同一題目的過往「其他」內容提供建議，仍可輸入新內容。'), 'Builder must expose the approved Other history suggestion helper');
    assert(managementSource.includes('data-action="other-history-suggestion"'), 'Runtime suggestions must be clickable without a second choice system');
    assert(managementSource.includes('setQuickOtherAnswer(fieldId, value)') && managementSource.includes('setWorkingOther(fieldId, value)'), 'Clicking a suggestion must write only other_text state');
    assert(managementSource.includes("root.addEventListener('pointerdown'"), 'Other history suggestions must commit on pointerdown before mobile blur can hide the list');
    assert(managementSource.includes("'.aim-other-history-suggestion[data-action=\"other-history-suggestion\"]'"), 'Pointer handling must be scoped to Other history suggestion buttons');
    assert(managementSource.includes('event.preventDefault();\n    applyOtherHistorySuggestion(el);'), 'Pointer selection must prevent blur and write authoritative state');
    assert(!managementSource.includes('ActivityIntelligenceApi.otherHistory'), 'Other history suggestions must not add a new frontend API path');
    assert(cssSource.includes('.aim-other-history-suggestion'), 'Other history suggestions must have compact badge styling');
    assert(cssSource.includes('.aim-runtime-other-control:not(:focus-within) .aim-other-history-suggestions'), 'Other history suggestions must remain focus-scoped');

    const normalizedRows = service._normalizeFormItems([
        { itemKey: IDS.choiceKey, type: 'single_choice', title: 'Topic', options: ['A'], allowOther: true, settings: { enableOtherHistorySuggestions: true } },
        { itemKey: IDS.numberKey, type: 'single_choice', title: 'No Other', options: ['A'], allowOther: false, settings: { enableOtherHistorySuggestions: true } },
        { itemKey: IDS.boolKey, type: 'dropdown', title: 'Dropdown', options: ['A'], allowOther: true, settings: { enableOtherHistorySuggestions: true } },
        { itemKey: IDS.longKey, type: 'multiple_choice', title: 'Multi', options: ['A'], allowOther: true, settings: { enableOtherHistorySuggestions: true } }
    ]);
    assert.strictEqual(normalizedRows[0].settings.enableOtherHistorySuggestions, true, 'server normalization must persist eligible single_choice setting');
    assert(!Object.prototype.hasOwnProperty.call(normalizedRows[1].settings, 'enableOtherHistorySuggestions'), 'server normalization must strip setting without Other flow');
    assert(!Object.prototype.hasOwnProperty.call(normalizedRows[2].settings, 'enableOtherHistorySuggestions'), 'server normalization must strip setting from dropdown fields');
    assert.strictEqual(normalizedRows[3].settings.enableOtherHistorySuggestions, true, 'server normalization must persist eligible multiple_choice setting');

    const source = [
        'const otherAnswerValue = "其他";',
        "const choiceFieldTypes = ['single_choice', 'multiple_choice', 'dropdown'];",
        "const previewPlacementValues = new Set(['none', 'primary', 'badges', 'text']);",
        "const compactPreviewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);",
        "const previewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'multiple_choice', 'dropdown']);",
        "const cardAssistRoles = new Set(['person_name', 'job_title', 'company_name']);",
        "function thumbnailSettingsForItem() { return {}; }",
        'function newUuid() { return "99999999-9999-4999-8999-999999999999"; }',
        'function fieldTypeLabel(type) { return type; }',
        'function makeCardLinkItem(item) { return { ...item, type: "card_link", itemKey: item.itemKey || "card", fieldId: item.fieldId || item.itemKey || "card", options: [], optionEntries: [], settings: item.settings || {}, allowOther: false }; }',
        'function makeFormThumbnailItem(item) { return { ...item, type: "form_thumbnail", itemKey: item.itemKey || "thumb", fieldId: item.fieldId || item.itemKey || "thumb", options: [], optionEntries: [], settings: item.settings || {}, allowOther: false }; }',
        'const Store = { clone(value) { return JSON.parse(JSON.stringify(value)); }, escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"\']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "\'": "&#39;" }[char])); } };',
        'let selected = { id: "activity-a" };',
        'const state = { records: [] };',
        'function selectedActivity() { return selected; }',
        'function recordsFor(activityId) { return state.records.filter(record => record.activityId === activityId); }',
        'function otherAnswersForRecord(record) { return record.runtimeOtherAnswers || {}; }',
        extractFunctionDeclaration(managementSource, 'normalizeOptionEntries'),
        extractFunctionDeclaration(managementSource, 'normalizePreviewPlacement'),
        extractFunctionDeclaration(managementSource, 'designerItemKey'),
        extractFunctionDeclaration(managementSource, 'normalizeDesignerItem'),
        extractFunctionDeclaration(managementSource, 'answerHasOther'),
        extractFunctionDeclaration(managementSource, 'fieldAllowsOtherHistorySuggestions'),
        extractFunctionDeclaration(managementSource, 'fieldHasOtherHistorySuggestionsEnabled'),
        extractFunctionDeclaration(managementSource, 'renderOtherHistorySuggestions'),
        extractFunctionDeclaration(managementSource, 'otherHistorySuggestionsForField'),
        extractFunctionDeclaration(managementSource, 'otherHistoryFieldKey'),
        extractFunctionDeclaration(managementSource, 'otherHistorySnapshotField'),
        extractFunctionDeclaration(managementSource, 'otherHistorySuggestionKey'),
        extractFunctionDeclaration(managementSource, 'designerItemSignature'),
        extractFunctionDeclaration(managementSource, 'designerItemsEqual'),
        extractFunctionDeclaration(managementSource, 'serializeDraftItems'),
        '({ state, setSelected(value) { selected = value; }, normalizeDesignerItem, fieldAllowsOtherHistorySuggestions, fieldHasOtherHistorySuggestionsEnabled, otherHistorySuggestionsForField, renderOtherHistorySuggestions, designerItemSignature, designerItemsEqual, serializeDraftItems, answerHasOther });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const field = contract.normalizeDesignerItem({ itemKey: 'field-a', fieldId: 'field-a', type: 'single_choice', title: 'Same Title', options: ['Alpha'], allowOther: true, settings: { enableOtherHistorySuggestions: true } });
    const disabledField = contract.normalizeDesignerItem({ itemKey: 'field-a', fieldId: 'field-a', type: 'single_choice', title: 'Same Title', options: ['Alpha'], allowOther: true, settings: {} });
    const sameTitleOtherField = contract.normalizeDesignerItem({ itemKey: 'field-b', fieldId: 'field-b', type: 'single_choice', title: 'Same Title', options: ['Alpha'], allowOther: true, settings: { enableOtherHistorySuggestions: true } });
    const multiField = contract.normalizeDesignerItem({ itemKey: 'field-m', fieldId: 'field-m', type: 'multiple_choice', title: 'Multi', options: ['Alpha'], allowOther: true, settings: { enableOtherHistorySuggestions: true } });
    const noOtherField = contract.normalizeDesignerItem({ itemKey: 'field-c', fieldId: 'field-c', type: 'single_choice', title: 'No Other', options: ['Alpha'], allowOther: false, settings: { enableOtherHistorySuggestions: true } });
    const dropdownField = contract.normalizeDesignerItem({ itemKey: 'field-d', fieldId: 'field-d', type: 'dropdown', title: 'Dropdown', options: ['Alpha'], allowOther: true, settings: { enableOtherHistorySuggestions: true } });
    assert.strictEqual(contract.fieldAllowsOtherHistorySuggestions(field), true);
    assert.strictEqual(contract.fieldAllowsOtherHistorySuggestions(multiField), true);
    assert.strictEqual(contract.fieldAllowsOtherHistorySuggestions(noOtherField), false);
    assert.strictEqual(contract.fieldAllowsOtherHistorySuggestions(dropdownField), false);
    assert.strictEqual(contract.fieldHasOtherHistorySuggestionsEnabled(field), true);
    assert.strictEqual(contract.fieldHasOtherHistorySuggestionsEnabled(noOtherField), false);
    assert(!Object.prototype.hasOwnProperty.call(noOtherField.settings, 'enableOtherHistorySuggestions'), 'normalizeDesignerItem must strip ineligible setting');
    assert.strictEqual(contract.serializeDraftItems([field])[0].settings.enableOtherHistorySuggestions, true, 'serializeDraftItems must persist eligible setting through item settings');
    assert(!Object.prototype.hasOwnProperty.call(contract.serializeDraftItems([dropdownField])[0].settings, 'enableOtherHistorySuggestions'), 'serializeDraftItems must not persist dropdown setting');
    assert.strictEqual(disabledField.enableOtherHistorySuggestions, false, 'eligible choice item must expose disabled other history state');
    assert(contract.designerItemSignature(field).includes('"enableOtherHistorySuggestions":true'), 'designer dirty-state signature must include enabled other history state');
    assert(contract.designerItemSignature(disabledField).includes('"enableOtherHistorySuggestions":false'), 'designer dirty-state signature must include disabled other history state');
    assert(!contract.designerItemsEqual(disabledField, field), 'false to true history setting changes must be detected as real item changes');
    assert(!contract.designerItemsEqual(field, disabledField), 'true to false history setting changes must be detected as real item changes');
    const reselectedField = contract.normalizeDesignerItem(contract.serializeDraftItems([field])[0]);
    assert.strictEqual(reselectedField.enableOtherHistorySuggestions, true, 'reselect hydration must read the applied value from item settings');
    assert.strictEqual(contract.serializeDraftItems([reselectedField])[0].settings.enableOtherHistorySuggestions, true, 'publish serialization must preserve the applied setting');
    ['visitor', 'field_intelligence'].forEach(formContext => {
        const contextField = contract.normalizeDesignerItem({ itemKey: `${formContext}-field`, fieldId: `${formContext}-field`, type: 'multiple_choice', title: formContext, options: ['Alpha'], allowOther: true, settings: { enableOtherHistorySuggestions: true } });
        assert.strictEqual(contextField.settings.enableOtherHistorySuggestions, true, `${formContext} must use the shared other history builder setting path`);
    });
    assert(managementSource.includes('updateFormDesignDraft({ enableOtherHistorySuggestions: enableOtherHistorySuggestions.checked, settings });'), 'checkbox changes must update the actual field draft settings');
    assert(managementSource.includes('const draft = normalizeDesignerItem(ui.formDesignDraft || {});') && managementSource.includes('design.draft.items[index] = draft;'), 'applyFieldDraft must normalize and apply the current field draft');

    const record = (id, activityId, item, answer, otherText, createdAt, status = 'active') => ({
        id,
        activityId,
        status,
        createdAt,
        updatedAt: createdAt,
        answers: { [item.fieldId]: answer },
        runtimeOtherAnswers: otherText === undefined ? {} : { [item.fieldId]: otherText },
        formRuntimeSnapshot: { items: [item] }
    });
    contract.state.records = [
        record('r1', 'activity-a', field, '其他', 'Digital Twin', '2026-08-01T01:00:00.000Z'),
        record('r2', 'activity-a', field, '其他', 'digital twin', '2026-08-03T01:00:00.000Z'),
        record('r3', 'activity-a', field, '其他', 'Digital Twin', '2026-08-02T01:00:00.000Z'),
        record('r4', 'activity-a', field, '其他', 'AI Agent', '2026-08-04T01:00:00.000Z'),
        record('r5', 'activity-a', field, '其他', 'AI Agent', '2026-08-02T02:00:00.000Z'),
        record('r6', 'activity-a', field, '其他', 'Edge AI', '2026-08-05T01:00:00.000Z'),
        record('r7', 'activity-a', field, 'Alpha', 'Official must not count', '2026-08-06T01:00:00.000Z'),
        record('r8', 'activity-a', field, '其他', '   ', '2026-08-07T01:00:00.000Z'),
        record('r9', 'activity-a', field, '其他', 'Void must not count', '2026-08-08T01:00:00.000Z', 'void'),
        record('r10', 'activity-b', field, '其他', 'Other Activity', '2026-08-09T01:00:00.000Z'),
        record('r11', 'activity-a', sameTitleOtherField, '其他', 'Other Field', '2026-08-10T01:00:00.000Z'),
        record('r12', 'activity-a', multiField, ['Alpha', '其他'], 'Multi Other', '2026-08-11T01:00:00.000Z')
    ];
    ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4'].forEach((value, index) => {
        contract.state.records.push(record(`extra-${index}`, 'activity-a', field, '其他', value, `2026-08-${12 + index}T01:00:00.000Z`));
    });
    const suggestions = contract.otherHistorySuggestionsForField(field, '', 6);
    assert.strictEqual(suggestions.length, 6, 'initial focus must return at most six suggestions');
    assert.strictEqual(suggestions[0].count, 3, 'suggestions must sort by usage count first');
    assert.strictEqual(suggestions[1].value, 'AI Agent', 'recency must break usage-count ties');
    const suggestionJson = JSON.stringify(suggestions);
    assert(!suggestionJson.includes('Official must not count'), 'official option selections must not contribute');
    assert(!suggestionJson.includes('Other Activity'), 'other activities must not contribute');
    assert(!suggestionJson.includes('Other Field'), 'same title on another stable field must not contribute');
    assert(!suggestionJson.includes('Void must not count'), 'void submissions must not contribute');
    assert.strictEqual(contract.otherHistorySuggestionsForField(field, 'agent', 6)[0].value, 'AI Agent', 'typing filter must be case-insensitive for Latin text');
    assert.strictEqual(contract.otherHistorySuggestionsForField(field, 'DIGITAL', 6)[0].count, 3, 'typing filter must preserve duplicate grouping');
    assert.strictEqual(contract.otherHistorySuggestionsForField(multiField, '', 6)[0].value, 'Multi Other', 'multiple_choice must use the shared history implementation');
    assert.strictEqual(contract.answerHasOther(['Alpha', '其他']), true, 'multiple_choice Other selection semantics must remain intact');
    const beforeNewValue = contract.otherHistorySuggestionsForField(field, 'physical', 6);
    assert.strictEqual(beforeNewValue.length, 0, 'free-text new values must remain allowed without preexisting history');
    contract.state.records.push(record('new-value', 'activity-a', field, '其他', 'Physical AI', '2026-08-20T01:00:00.000Z'));
    assert.strictEqual(contract.otherHistorySuggestionsForField(field, 'physical', 6)[0].value, 'Physical AI', 'new submitted other_text can become a future suggestion');
    const html = contract.renderOtherHistorySuggestions(field, 'quick', 'digital');
    assert(html.includes('· 3次'), 'badge must display usage count');
    assert(html.includes('data-value="digital twin"') || html.includes('data-value="Digital Twin"'), 'badge value must be only the canonical historical string');
    assert(!html.includes('data-value="Digital Twin · 3次"'), 'badge must not store the count suffix as other_text');

    const selectionSource = [
        'let quickOtherAnswers = {};',
        'let workingOther = {};',
        'let refreshedValue = "";',
        'let focused = false;',
        'let selectedInput = { value: "", focus() { focused = true; } };',
        'const document = { querySelector() { return selectedInput; } };',
        'function cssEscape(value) { return String(value || ""); }',
        'function setQuickOtherAnswer(fieldId, value) { if (String(value || "").trim()) quickOtherAnswers[fieldId] = value; else delete quickOtherAnswers[fieldId]; }',
        'function setWorkingOther(fieldId, value) { if (String(value || "").trim()) workingOther[fieldId] = value; else delete workingOther[fieldId]; }',
        'function refreshOtherHistorySuggestions(input) { refreshedValue = input.value; }',
        extractFunctionDeclaration(managementSource, 'applyOtherHistorySuggestion'),
        '({ applyOtherHistorySuggestion, quickOtherAnswers, workingOther, selectedInput, getFocused: () => focused, getRefreshedValue: () => refreshedValue })'
    ].join('\n');
    const selectionContract = vm.runInNewContext(selectionSource, {});
    selectionContract.applyOtherHistorySuggestion({ dataset: { field: 'field-a', context: 'quick', value: '賣玉米' } });
    assert.strictEqual(selectionContract.quickOtherAnswers['field-a'], '賣玉米', 'selecting a counted display badge must write only the historical value to quick other_text state');
    assert.strictEqual(selectionContract.selectedInput.value, '賣玉米', 'selection must update the live Other input value');
    assert.strictEqual(selectionContract.getFocused(), true, 'selection must keep the input interaction stable after writeback');
    assert.strictEqual(selectionContract.getRefreshedValue(), '賣玉米', 'rerender/refresh must preserve the selected value');
    selectionContract.applyOtherHistorySuggestion({ dataset: { field: 'field-a', context: 'record', value: 'Record Other' } });
    assert.strictEqual(selectionContract.workingOther['field-a'], 'Record Other', 'desktop/record click path must remain supported by the shared selector action');
}

function assertAnalyticsChartTypeImplementationContract(managementSource, cssSource) {
    assert(managementSource.includes("const analyticsCategoricalFieldTypes = ['yes_no', 'single_choice', 'multiple_choice', 'dropdown'];"), 'categorical Analytics types must be centralized');
    assert(managementSource.includes("const analyticsChartTypeValues = ['bar', 'pie', 'trend', 'rose', 'polarBar', 'treemap', 'bubble'];"), 'chart state must accept Rose and Polar Bar alongside existing More charts');
    assert(managementSource.includes("bubble: 'Bubble'"), 'Bubble chart type label must use English chart terminology');
    assert(!managementSource.includes("bubble: '氣泡'"), 'Bubble chart type label must not use the old Chinese display name');
    assert(managementSource.includes('data-action="${scope === \'mobile\' ? \'mobile-analytics-chart-more\' : \'analytics-chart-more\'}"'), 'desktop and mobile More chart selectors must share the local renderer');
    assert(managementSource.includes('aria-haspopup="true"'), 'More selector must expose popup semantics');
    assert(managementSource.includes('aria-expanded="${open}"'), 'More selector must expose expanded state');
    assert(managementSource.includes('aria-selected="${view.type === value}"'), 'More menu must expose selected chart state');
    assert(cssSource.includes('.aim-chart-more-menu'), 'More menu must have local chart-control styling');
    assert(managementSource.includes("ui.analyticsChartModal = { chartKey: el.dataset.chartKey || '', reading: defaultAnalyticsChartReadingState() };"), 'opening an expanded chart must reset reading controls to non-persisted defaults');
    assert(managementSource.includes("ui.analyticsChartModal = null;"), 'closing an expanded chart must discard modal reading state');
    assert(managementSource.includes("action === 'analytics-chart-reading'"), 'expanded reading controls must use a frontend-only action');
    assert(managementSource.includes("ui.analyticsChartModal.reading = reading;"), 'expanded reading adjustments must stay on the open modal session');
    assert(managementSource.includes("type: control === 'type' && analyticsChartTypeValues.includes(value) ? value : current.type"), 'chart switching must keep using chart view state without replacing modal reading state');
    assert(managementSource.includes("valueMode: control === 'valueMode' && ['count', 'percentage'].includes(value) ? value : current.valueMode"), 'metric switching must keep using chart view state without replacing modal reading state');
    assert(!/localStorage|sessionStorage|document\.cookie|history\.pushState/.test(extractFunctionDeclaration(managementSource, 'renderAnalyticsChartModal')), 'expanded reading controls must not persist through browser storage or URL state');
    assert(cssSource.includes('.aim-chart-reading-controls') && cssSource.includes('.aim-chart-reading-segment button:disabled'), 'expanded reading controls must have scoped lightweight disabled-state styling');
    assert(cssSource.includes('.aim-chart-modal-controls') && cssSource.includes('display: flex;') && cssSource.includes('flex-wrap: wrap;') && cssSource.includes('.aim-chart-reading-controls'), 'expanded modal toolbar controls must be composed as one wrapping flex row');
    assert(cssSource.includes('.aim-chart-reading-icon-button') && cssSource.includes('.aim-chart-reading-icon'), 'icon-only chart theme buttons must have lightweight scoped styling');

    const bubblePointsSource = extractFunctionDeclaration(managementSource, 'analyticsBubblePoints');
    const bubbleOptionSource = extractFunctionDeclaration(managementSource, 'analyticsBubbleOption');
    const source = [
        'const analyticsCategoricalFieldTypes = ["yes_no", "single_choice", "multiple_choice", "dropdown"];',
        'const analyticsChartTypeLabels = { bar: "Bar", pie: "Pie", trend: "Trend", rose: "Rose", polarBar: "Polar Bar", treemap: "Treemap", bubble: "Bubble" };',
        'const analyticsChartReadingSizeBounds = Object.freeze({ min: -1, max: 3, step: 2 });',
        'const ui = { analytics: { chartMoreOpen: "", mobileChartMoreOpen: "" } };',
        'const Store = { escapeHtml(value) { return String(value || ""); } };',
        'function analyticsChartStyles(options = {}) { const dark = Boolean(options.modal && options.reading && options.reading.theme === "dark"); const controlled = Boolean(options.modal && options.reading); return { isDark: dark, chartThemeControlled: controlled, primary: dark ? "#f8fafc" : "#111", secondary: dark ? "#cbd5e1" : "#333", muted: dark ? "#94a3b8" : "#666", border: dark ? "#334155" : "#ddd", background: dark ? "#111827" : "#ffffff", tooltipBackground: dark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)" }; }',
        'function analyticsTrendXAxis(dates) { return { data: dates }; }',
        'function analyticsTrendYAxis() { return {}; }',
        'function formatAnalyticsDateLabel(value) { return String(value || ""); }',
        'function formatAnalyticsPercent(value) { return `${Math.round(Number(value || 0) * 10) / 10}%`; }',
        'function escapeChartHtml(value) { return Store.escapeHtml(value); }',
        extractFunctionDeclaration(managementSource, 'defaultAnalyticsChartReadingState'),
        extractFunctionDeclaration(managementSource, 'sanitizeAnalyticsChartReadingState'),
        extractFunctionDeclaration(managementSource, 'clampAnalyticsChartReadingSize'),
        extractFunctionDeclaration(managementSource, 'analyticsChartReadingFromOptions'),
        extractFunctionDeclaration(managementSource, 'analyticsReadingFontSize'),
        extractFunctionDeclaration(managementSource, 'analyticsChartAppearanceOption'),
        extractFunctionDeclaration(managementSource, 'analyticsChartTooltipOption'),
        extractFunctionDeclaration(managementSource, 'analyticsSplitLabelRichStyles'),
        extractFunctionDeclaration(managementSource, 'analyticsChartReadingControlsSupported'),
        extractFunctionDeclaration(managementSource, 'renderAnalyticsChartReadingControls'),
        extractFunctionDeclaration(managementSource, 'analyticsChartReadingThemeIcon'),
        extractFunctionDeclaration(managementSource, 'renderAnalyticsChartReadingSizeControl'),
        extractFunctionDeclaration(managementSource, 'chartCapabilitiesForField'),
        extractFunctionDeclaration(managementSource, 'analyticsChartHasCategoricalRows'),
        extractFunctionDeclaration(managementSource, 'analyticsChartRoseAvailable'),
        extractFunctionDeclaration(managementSource, 'chartTypeAllowedForChart'),
        extractFunctionDeclaration(managementSource, 'chartCapabilitiesForChart'),
        extractFunctionDeclaration(managementSource, 'analyticsValidatedChartView'),
        extractFunctionDeclaration(managementSource, 'renderAnalyticsChartTypeControls'),
        extractFunctionDeclaration(managementSource, 'categoricalChartRow'),
        extractFunctionDeclaration(managementSource, 'analyticsChartPoint'),
        extractFunctionDeclaration(managementSource, 'analyticsSortedCategoricalRows'),
        extractFunctionDeclaration(managementSource, 'sortedAnalyticsBarRows'),
        extractFunctionDeclaration(managementSource, 'analyticsTooltipFormatter'),
        extractFunctionDeclaration(managementSource, 'analyticsBarOption'),
        extractFunctionDeclaration(managementSource, 'analyticsPieOption'),
        extractFunctionDeclaration(managementSource, 'analyticsCategoryColor'),
        extractFunctionDeclaration(managementSource, 'analyticsPieLabelFormatter'),
        extractFunctionDeclaration(managementSource, 'analyticsRoseLabelFormatter'),
        extractFunctionDeclaration(managementSource, 'analyticsRoseOption'),
        extractFunctionDeclaration(managementSource, 'analyticsPolarBarOption'),
        extractFunctionDeclaration(managementSource, 'analyticsTierSourceValues'),
        extractFunctionDeclaration(managementSource, 'analyticsMagnitudeTier'),
        extractFunctionDeclaration(managementSource, 'analyticsTreemapVisualValue'),
        extractFunctionDeclaration(managementSource, 'analyticsTreemapLabelFormatter'),
        extractFunctionDeclaration(managementSource, 'analyticsTreemapLabelRichStyles'),
        extractFunctionDeclaration(managementSource, 'analyticsTreemapOption'),
        extractFunctionDeclaration(managementSource, 'analyticsBubbleSymbolSize'),
        extractFunctionDeclaration(managementSource, 'analyticsBubbleExternalLabels'),
        extractFunctionDeclaration(managementSource, 'analyticsApplyExpandedExternalLabelOverlay'),
        extractFunctionDeclaration(managementSource, 'analyticsTreemapRenderedTileGeometries'),
        extractFunctionDeclaration(managementSource, 'analyticsNormalizeTreemapLayout'),
        extractFunctionDeclaration(managementSource, 'analyticsTreemapExternalLabelGraphicElements'),
        extractFunctionDeclaration(managementSource, 'analyticsBubbleExternalLabelGraphicElements'),
        extractFunctionDeclaration(managementSource, 'analyticsSplitAnnotationSides'),
        extractFunctionDeclaration(managementSource, 'analyticsExternalLabelGraphicElements'),
        extractFunctionDeclaration(managementSource, 'analyticsAssignExternalLabelRows'),
        extractFunctionDeclaration(managementSource, 'analyticsReadableLabelColor'),
        extractFunctionDeclaration(managementSource, 'analyticsShortChartLabel'),
        bubblePointsSource,
        extractFunctionDeclaration(managementSource, 'analyticsBubbleMetricValue'),
        extractFunctionDeclaration(managementSource, 'analyticsBubbleContinuousSymbolSize'),
        extractFunctionDeclaration(managementSource, 'analyticsBubbleLabelFormatter'),
        extractFunctionDeclaration(managementSource, 'analyticsBubbleLabelRichStyles'),
        bubbleOptionSource,
        extractFunctionDeclaration(managementSource, 'analyticsVisibleTrendSeries'),
        extractFunctionDeclaration(managementSource, 'activityTrendOption'),
        extractFunctionDeclaration(managementSource, 'analyticsCategoricalTrendOption'),
        '({ ui, defaultAnalyticsChartReadingState, sanitizeAnalyticsChartReadingState, analyticsChartReadingControlsSupported, renderAnalyticsChartReadingControls, chartCapabilitiesForField, chartCapabilitiesForChart, analyticsValidatedChartView, renderAnalyticsChartTypeControls, categoricalChartRow, analyticsBarOption, analyticsPieOption, analyticsRoseOption, analyticsPolarBarOption, analyticsTierSourceValues, analyticsMagnitudeTier, analyticsTreemapVisualValue, analyticsTreemapOption, analyticsBubbleMetricValue, analyticsBubbleContinuousSymbolSize, analyticsBubbleOption, analyticsReadableLabelColor, analyticsApplyExpandedExternalLabelOverlay, analyticsTreemapRenderedTileGeometries, analyticsAssignExternalLabelRows, analyticsTooltipFormatter, activityTrendOption, analyticsCategoricalTrendOption });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const rows = labels => labels.map(label => ({ label, count: 1, percent: 10, selectionPercent: 10 }));
    const smallSingle = { chartKey: 'small', fieldType: 'single_choice', allowPie: true, allowTrend: true, rows: rows(['A', 'B', 'C', 'D', 'E', 'F']) };
    const largeSingle = { chartKey: 'large', fieldType: 'single_choice', allowPie: true, allowTrend: true, rows: rows(['A', 'B', 'C', 'D', 'E', 'F', 'G']) };
    const largeDropdown = { ...largeSingle, fieldType: 'dropdown' };
    const multi = { chartKey: 'multi', fieldType: 'multiple_choice', allowPie: true, allowTrend: true, multiChoice: true, rows: [{ label: 'IoT', count: 72, percent: 72 / 102 * 100, selectionPercent: 72 / 155 * 100 }] };
    const yesNo = { chartKey: 'yes-no', fieldType: 'yes_no', allowPie: true, allowTrend: true, rows: rows(['Yes', 'No']) };
    const recorder = { chartKey: 'recorder-distribution', allowPie: true, allowTrend: false, rows: [{ label: 'Recorder A', count: 3, percent: 60, selectionPercent: 60 }, { label: 'Recorder B', count: 2, percent: 40, selectionPercent: 40 }] };

    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(smallSingle).primaryTypes), JSON.stringify(['bar', 'pie', 'trend']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(smallSingle).moreTypes), JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(largeSingle).primaryTypes), JSON.stringify(['bar', 'pie', 'trend']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(largeSingle).moreTypes), JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(largeDropdown).primaryTypes), JSON.stringify(['bar', 'pie', 'trend']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(largeDropdown).moreTypes), JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(multi).primaryTypes), JSON.stringify(['bar', 'pie', 'trend']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(multi).moreTypes), JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(yesNo).primaryTypes), JSON.stringify(['bar', 'pie', 'trend']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(yesNo).moreTypes), JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(recorder).primaryTypes), JSON.stringify(['bar', 'pie']));
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart(recorder).moreTypes), JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']));
    [smallSingle, largeSingle, largeDropdown, multi, yesNo, recorder].forEach(chart => {
        const capabilities = contract.chartCapabilitiesForChart(chart);
        assert.strictEqual(new Set(capabilities.moreTypes).size, capabilities.moreTypes.length, 'More chart types must not include duplicates');
        if (capabilities.moreTypes.includes('rose')) {
            assert(capabilities.moreTypes.includes('treemap'), 'Rose availability must imply Treemap availability');
            assert(capabilities.moreTypes.includes('bubble'), 'Rose availability must imply Bubble availability');
            assert.strictEqual(
                JSON.stringify(capabilities.moreTypes.filter(type => ['rose', 'polarBar', 'treemap', 'bubble'].includes(type))),
                JSON.stringify(['rose', 'polarBar', 'treemap', 'bubble']),
                'Rose-capable More charts must keep stable Rose, Polar Bar, Treemap, Bubble ordering'
            );
        }
    });
    assert.deepStrictEqual(
        contract.chartCapabilitiesForChart(smallSingle).moreTypes.filter(type => type === 'rose' || type === 'polarBar'),
        contract.chartCapabilitiesForChart(largeSingle).moreTypes.filter(type => type === 'rose' || type === 'polarBar'),
        'Rose and Polar Bar must not depend on category-count recommendation branching'
    );
    assert.strictEqual(contract.analyticsValidatedChartView(smallSingle, {}).type, 'bar', 'Bar must remain the default chart');
    assert.strictEqual(contract.analyticsValidatedChartView(multi, {}).type, 'bar', 'multiple-choice must not default to Bubble');
    assert.strictEqual(contract.analyticsValidatedChartView(largeSingle, { type: 'bubble', valueMode: 'percentage' }).type, 'bubble', 'Bubble must now be selectable wherever Rose is available');
    assert.strictEqual(contract.analyticsValidatedChartView(multi, { type: 'treemap', valueMode: 'percentage' }).type, 'treemap', 'Treemap must now be selectable wherever Rose is available');
    assert.strictEqual(contract.analyticsValidatedChartView(largeSingle, { type: 'pie' }).type, 'pie', 'primary Pie chart type must remain selectable');
    assert.strictEqual(contract.analyticsValidatedChartView(largeSingle, { type: 'rose' }).type, 'rose', 'More-contained Rose chart type must remain selectable');
    assert.strictEqual(contract.analyticsValidatedChartView(largeSingle, { type: 'polarBar' }).type, 'polarBar', 'More-contained Polar Bar chart type must remain selectable');
    assert.strictEqual(contract.analyticsValidatedChartView(recorder, { type: 'rose' }).type, 'rose', 'Recorder distribution Rose must remain selectable');
    assert.strictEqual(contract.analyticsValidatedChartView(recorder, { type: 'polarBar' }).type, 'polarBar', 'Recorder distribution Polar Bar must remain selectable');
    assert.strictEqual(contract.analyticsValidatedChartView(largeSingle, { type: 'treemap' }).type, 'treemap', 'More-contained Treemap chart type must remain selectable');
    assert.strictEqual(contract.analyticsValidatedChartView(multi, { type: 'bubble' }).type, 'bubble', 'More-contained Bubble chart type must remain selectable');
    const fallbackControls = contract.renderAnalyticsChartTypeControls({ chartKey: 'fallback', fieldType: 'short_text', allowPie: false, allowTrend: false, rows: [] }, { type: 'bar' }, 'analytics-chart-view', 'desktop');
    assert(!fallbackControls.includes('analytics-chart-more'), 'empty More control must not render');
    assert.strictEqual(JSON.stringify(contract.chartCapabilitiesForChart({ chartKey: 'number', fieldType: 'number', allowPie: false, allowTrend: false, rows: [] }).moreTypes), JSON.stringify([]), 'non-Rose non-categorical charts must not receive Treemap or Bubble');
    contract.ui.analytics.chartMoreOpen = 'yes-no';
    const yesNoControls = contract.renderAnalyticsChartTypeControls(yesNo, { type: 'polarBar' }, 'analytics-chart-view', 'desktop');
    contract.ui.analytics.chartMoreOpen = '';
    assert(yesNoControls.includes('data-value="rose"') && yesNoControls.includes('data-value="polarBar"') && yesNoControls.includes('data-value="treemap"') && yesNoControls.includes('data-value="bubble"'), 'Rose-capable charts must render the unified More chart set');
    const treemapControls = contract.renderAnalyticsChartTypeControls(largeSingle, { type: 'treemap' }, 'analytics-chart-view', 'desktop');
    assert(treemapControls.includes('更多：Treemap') && treemapControls.includes('aria-pressed="true"'), 'active More chart state must be represented on the More trigger');
    assert(treemapControls.indexOf('data-value="bar"') < treemapControls.indexOf('data-value="pie"') && treemapControls.indexOf('data-value="pie"') < treemapControls.indexOf('data-value="trend"'), 'primary toolbar order must remain Bar, Pie, Trend');
    assert(!treemapControls.includes('標籤大小') && !treemapControls.includes('數值大小'), 'thumbnail chart controls must not render expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(smallSingle, { type: 'bar' }), 'Bar must support expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(smallSingle, { type: 'pie' }), 'Pie must support expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(smallSingle, { type: 'trend' }), 'Trend must support expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(smallSingle, { type: 'rose' }), 'Rose must support expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(smallSingle, { type: 'polarBar' }), 'Polar Bar must support expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(smallSingle, { type: 'treemap' }), 'Treemap must use the existing expanded reading controls');
    assert(contract.analyticsChartReadingControlsSupported(multi, { type: 'bubble' }), 'Bubble must use the existing expanded reading controls');
    assert.strictEqual(JSON.stringify(contract.defaultAnalyticsChartReadingState()), JSON.stringify({ labelSize: 0, valueSize: 0, theme: 'light' }), 'new expanded chart sessions must start at Light and baseline sizes');
    assert.strictEqual(JSON.stringify(contract.sanitizeAnalyticsChartReadingState({ labelSize: 9, valueSize: -8, theme: 'dark' })), JSON.stringify({ labelSize: 3, valueSize: -1, theme: 'dark' }), 'expanded reading size controls must be bounded');
    const baselineReadingControls = contract.renderAnalyticsChartReadingControls(contract.defaultAnalyticsChartReadingState());
    assert(baselineReadingControls.includes('>標籤<') && baselineReadingControls.includes('>數值<') && baselineReadingControls.includes('A−') && baselineReadingControls.includes('A+'), 'expanded reading controls must render compact approved size-control copy');
    assert(!baselineReadingControls.includes('>標籤大小<') && !baselineReadingControls.includes('>數值大小<'), 'expanded reading controls must not visibly render old verbose size copy');
    assert(!baselineReadingControls.includes('>Light<') && !baselineReadingControls.includes('>Dark<'), 'expanded reading theme controls must be icon-only without visible Light/Dark words');
    assert(baselineReadingControls.includes('<svg') && baselineReadingControls.includes('stroke="currentColor"'), 'expanded reading theme controls must use currentColor inline SVG icons');
    assert(baselineReadingControls.includes('aria-label="Light chart"') && baselineReadingControls.includes('aria-label="Dark chart"'), 'icon-only chart theme buttons must preserve accessible Light/Dark meaning');
    assert(baselineReadingControls.includes('data-action="analytics-chart-reading"') && baselineReadingControls.includes('aria-pressed="true"'), 'expanded reading controls must expose active button state');
    const boundedReadingControls = contract.renderAnalyticsChartReadingControls({ labelSize: -1, valueSize: 3, theme: 'dark' });
    assert(boundedReadingControls.includes('data-control="labelSize" data-delta="-1" type="button" disabled'), 'label decrease must disable at minimum bound');
    assert(boundedReadingControls.includes('data-control="valueSize" data-delta="1" type="button" disabled'), 'value increase must disable at maximum bound');

    const respondentRow = contract.categoricalChartRow('IoT', 72, 102, 155);
    assert(Math.abs(respondentRow.percent - 70.588) < 0.01, 'row.percent must remain respondent percentage');
    assert(Math.abs(respondentRow.selectionPercent - 46.451) < 0.01, 'row.selectionPercent must remain selection composition');
    const barOption = contract.analyticsBarOption({ title: 'Multi', rows: [respondentRow] }, { type: 'bar', valueMode: 'percentage' });
    assert.strictEqual(barOption.series[0].data[0].value, 70.6, 'Bar percentage must use respondent percentage');
    const readingState = { labelSize: 2, valueSize: 1, theme: 'dark' };
    const readingBarOption = contract.analyticsBarOption({ title: 'Multi', rows: [respondentRow] }, { type: 'bar', valueMode: 'percentage' }, { modal: true, reading: readingState });
    assert.strictEqual(readingBarOption.backgroundColor, '#111827', 'expanded Dark chart theme must be scoped to the ECharts option');
    assert.strictEqual(readingBarOption.tooltip.backgroundColor, 'rgba(15, 23, 42, 0.96)', 'expanded Dark chart tooltip must be chart-local and readable');
    assert.strictEqual(readingBarOption.yAxis.axisLabel.fontSize, 16, 'Bar category labels must respond to label size control');
    assert.strictEqual(readingBarOption.series[0].label.fontSize, 14, 'Bar value labels must respond to value size control independently');
    assert.strictEqual(readingBarOption.xAxis.axisLabel.fontSize, undefined, 'Bar numeric axis ticks must not be controlled as category labels');
    const pieOption = contract.analyticsPieOption({ title: 'Multi', rows: [respondentRow], multiChoice: true }, { type: 'pie', valueMode: 'percentage' });
    assert.strictEqual(pieOption.series[0].data[0].value, 46.5, 'multiple-choice Pie geometry must use selection composition');
    assert.strictEqual(pieOption.series[0].data[0].selectionComposition, true, 'multiple-choice Pie points must carry composition semantics');
    assert(pieOption.series[0].data[0].respondentPercent > pieOption.series[0].data[0].selectionPercent, 'Pie point must preserve respondent percent separately');
    assert.strictEqual(pieOption.series[0].label.rich, undefined, 'thumbnail Pie labels must keep the existing non-reading label shape');
    const readingPieOption = contract.analyticsPieOption({ title: 'Multi', rows: [respondentRow], multiChoice: true }, { type: 'pie', valueMode: 'percentage' }, { modal: true, reading: { labelSize: 1, valueSize: 3, theme: 'light' } });
    assert.strictEqual(readingPieOption.series[0].label.formatter({ name: 'Full Category Name', data: { realPercent: 45.9, realCount: 22 } }), '{label|Full Category Name}\n{value|45.9%}', 'expanded Pie labels must use ECharts rich text for split category/value sizing');
    assert.strictEqual(readingPieOption.series[0].label.rich.label.fontSize, 13, 'Pie category label portion must respond to label size control');
    assert.strictEqual(readingPieOption.series[0].label.rich.value.fontSize, 17, 'Pie value label portion must respond to value size control independently');
    const tooltip = contract.analyticsTooltipFormatter({ marker: '', name: 'IoT', data: pieOption.series[0].data[0] });
    assert(tooltip.includes('填答者選取率') && tooltip.includes('選項組成占比'), 'multiple-choice Pie tooltip must distinguish respondent rate and selection composition');
    const roseOption = contract.analyticsRoseOption({ title: 'Multi', rows: [respondentRow], multiChoice: true }, { type: 'rose', valueMode: 'percentage' });
    assert.strictEqual(roseOption.series[0].type, 'pie', 'Rose must use native ECharts pie renderer');
    assert.strictEqual(roseOption.series[0].roseType, 'area', 'Rose must use native ECharts Nightingale area mode');
    assert.strictEqual(roseOption.series[0].startAngle, 90, 'Rose must start descending categories from the conventional top position');
    assert.strictEqual(roseOption.series[0].clockwise, true, 'Rose must proceed clockwise through descending categories');
    assert.strictEqual(JSON.stringify(roseOption.series[0].radius), JSON.stringify(['18%', '72%']), 'Rose thumbnail radius must remain unchanged');
    assert.strictEqual(JSON.stringify(roseOption.series[0].center), JSON.stringify(['50%', '52%']), 'Rose thumbnail center must remain unchanged');
    assert.strictEqual(roseOption.series[0].labelLine.length, 13, 'Rose thumbnail labelLine length must remain unchanged');
    assert.strictEqual(roseOption.series[0].labelLine.length2, 8, 'Rose thumbnail labelLine length2 must remain unchanged');
    assert.strictEqual(roseOption.series[0].data[0].value, 46.5, 'multiple-choice Rose geometry must preserve existing Pie selection-composition semantics');
    assert.strictEqual(roseOption.series[0].data[0].selectionComposition, true, 'multiple-choice Rose points must preserve tooltip semantic distinction');
    assert.strictEqual(roseOption.series[0].label.formatter({ name: 'Full Category Name', data: { realPercent: 45.9, realCount: 22 } }), 'Full Category Name 45.9%', 'Rose percent label must show canonical category plus current selected metric only');
    assert.strictEqual(roseOption.series[0].label.fontWeight, 'normal', 'Rose labels must align to Bar/Pie normal label hierarchy');
    assert.strictEqual(roseOption.series[0].label.color, barOption.series[0].label.color, 'Rose labels must reuse the accepted Bar label color hierarchy');
    assert.strictEqual(roseOption.series[0].label.rich, undefined, 'thumbnail Rose labels must keep the existing non-reading label shape');
    const readingRoseOption = contract.analyticsRoseOption({ title: 'Multi', rows: [respondentRow], multiChoice: true }, { type: 'rose', valueMode: 'percentage' }, { modal: true, reading: { labelSize: 1, valueSize: 2, theme: 'dark' } });
    assert.strictEqual(readingRoseOption.series[0].label.formatter({ name: 'Full Category Name', data: { realPercent: 45.9, realCount: 22 } }), '{label|Full Category Name} {value|45.9%}', 'expanded Rose labels must use ECharts rich text for split category/value sizing');
    assert.strictEqual(readingRoseOption.series[0].label.rich.label.fontSize, 13, 'Rose category label portion must respond to label size control');
    assert.strictEqual(readingRoseOption.series[0].label.rich.value.fontSize, 15, 'Rose current metric portion must respond to value size control independently');
    assert(parseFloat(readingRoseOption.series[0].radius[1]) >= 68, 'expanded Rose must use more of the available canvas without changing value mapping');
    assert(parseFloat(readingRoseOption.series[0].center[1]) <= 52, 'expanded Rose must reduce unnecessary top whitespace using native center placement');
    assert(readingRoseOption.series[0].labelLine.length < 22 && readingRoseOption.series[0].labelLine.length2 < 18, 'expanded Rose label lines must stay compact enough for the adjusted canvas use');
    assert.strictEqual(readingRoseOption.series[0].data[0].value, roseOption.series[0].data[0].value, 'expanded Rose layout changes must not alter native value-to-shape data');
    const roseCountOption = contract.analyticsRoseOption({ title: 'Single', rows: [respondentRow] }, { type: 'rose', valueMode: 'count' });
    assert.strictEqual(roseCountOption.series[0].label.formatter({ name: 'Full Category Name', data: { realPercent: 45.9, realCount: 22 } }), 'Full Category Name 22筆', 'Rose count label must show canonical category plus current selected metric only');
    assert(Number(roseCountOption.series[0].itemStyle.borderRadius) > 0, 'Rose must use restrained native sector border radius');
    assert(Number(roseCountOption.series[0].data[0].itemStyle.borderRadius) > 0, 'Rose sector data colors must preserve native border radius');
    const unsortedRows = [
        { label: 'First', count: 5, percent: 90, selectionPercent: 10 },
        { label: 'Second', count: 2, percent: 20, selectionPercent: 60 },
        { label: 'Third', count: 9, percent: 50, selectionPercent: 60 },
        { label: 'Fourth', count: 1, percent: 10, selectionPercent: 5 }
    ];
    const originalOrder = unsortedRows.map(row => row.label);
    const sortedRosePercent = contract.analyticsRoseOption({ title: 'Unsorted', rows: unsortedRows, multiChoice: true }, { type: 'rose', valueMode: 'percentage' });
    assert.deepStrictEqual(sortedRosePercent.series[0].data.map(point => point.name), ['Second', 'Third', 'First', 'Fourth'], 'Rose percentage ordering must descend by the displayed selection-composition metric with stable ties');
    const sortedRoseCount = contract.analyticsRoseOption({ title: 'Unsorted', rows: unsortedRows }, { type: 'rose', valueMode: 'count' });
    assert.deepStrictEqual(sortedRoseCount.series[0].data.map(point => point.name), ['Third', 'First', 'Second', 'Fourth'], 'Rose count ordering must descend by displayed count');
    assert.deepStrictEqual(unsortedRows.map(row => row.label), originalOrder, 'Rose and Polar ordering must not mutate shared source rows');
    const polarOption = contract.analyticsPolarBarOption({ title: 'Single', rows: [respondentRow] }, { type: 'polarBar', valueMode: 'percentage' });
    assert(polarOption.polar && polarOption.angleAxis && polarOption.radiusAxis, 'Polar Bar must use native polar coordinate components');
    assert.strictEqual(polarOption.series[0].type, 'bar', 'Polar Bar must use native ECharts bar renderer');
    assert.strictEqual(polarOption.series[0].coordinateSystem, 'polar', 'Polar Bar must use native ECharts polar coordinate system');
    assert.strictEqual(polarOption.angleAxis.type, 'category', 'Polar Bar must use category-angle architecture');
    assert.strictEqual(polarOption.radiusAxis.type, 'value', 'Polar Bar must use numeric value-radius architecture');
    assert.deepStrictEqual(polarOption.angleAxis.data, ['IoT'], 'Polar Bar category labels must live on the angular category axis');
    assert.notStrictEqual(polarOption.radiusAxis.type, 'category', 'Polar Bar must not use the previous concentric progress-ring radius categories');
    assert.notStrictEqual(polarOption.angleAxis.type, 'value', 'Polar Bar must not use the previous progress-ring numeric angle axis');
    assert.strictEqual(polarOption.series[0].data[0].value, 70.6, 'Polar Bar percentage must use respondent percentage like Bar');
    assert.strictEqual(polarOption.series[0].label.formatter({ data: { realPercent: 45.9, realCount: 22 } }), '45.9%', 'Polar Bar mark labels must show the selected metric without progress wording');
    assert.strictEqual(polarOption.angleAxis.axisLabel.fontWeight, 'normal', 'Polar category labels must align to Bar/Pie normal label hierarchy');
    assert.strictEqual(polarOption.series[0].label.fontWeight, 'normal', 'Polar value labels must align to Bar/Pie normal label hierarchy');
    const readingPolarOption = contract.analyticsPolarBarOption({ title: 'Single', rows: [respondentRow] }, { type: 'polarBar', valueMode: 'percentage' }, { modal: true, reading: { labelSize: 1, valueSize: 2, theme: 'dark' } });
    assert.strictEqual(readingPolarOption.angleAxis.axisLabel.fontSize, 14, 'Polar category labels must respond to label size control');
    assert.strictEqual(readingPolarOption.series[0].label.fontSize, 16, 'Polar value labels must respond to value size control independently');
    assert.strictEqual(readingPolarOption.radiusAxis.axisLabel.fontSize, undefined, 'Polar numeric radius ticks must not be controlled as category or value labels');
    const sortedPolarPercent = contract.analyticsPolarBarOption({ title: 'Unsorted', rows: unsortedRows }, { type: 'polarBar', valueMode: 'percentage' });
    assert.deepStrictEqual(sortedPolarPercent.angleAxis.data, ['First', 'Third', 'Second', 'Fourth'], 'Polar Bar percentage ordering must descend by displayed respondent percentage');
    const sortedPolarCount = contract.analyticsPolarBarOption({ title: 'Unsorted', rows: unsortedRows }, { type: 'polarBar', valueMode: 'count' });
    assert.deepStrictEqual(sortedPolarCount.angleAxis.data, ['Third', 'First', 'Second', 'Fourth'], 'Polar Bar count ordering must descend by displayed count');
    const polarTooltip = contract.analyticsTooltipFormatter({ marker: '', name: 'IoT', data: polarOption.series[0].data[0] });
    assert(polarTooltip.includes('72 筆') && polarTooltip.includes('70.6%'), 'Polar Bar tooltip must preserve exact respondent count and percent');
    const recorderRose = contract.analyticsRoseOption(recorder, { type: 'rose', valueMode: 'count' });
    assert.strictEqual(recorderRose.series[0].data[0].name, 'Recorder A', 'Recorder Rose must preserve recorder names as canonical labels');
    const recorderPolar = contract.analyticsPolarBarOption(recorder, { type: 'polarBar', valueMode: 'count' });
    assert.deepStrictEqual(recorderPolar.angleAxis.data, ['Recorder A', 'Recorder B'], 'Recorder Polar Bar must preserve recorder names on category angle axis');
    const recorderUnsorted = { chartKey: 'recorder-distribution', allowPie: true, allowTrend: false, rows: [{ label: 'Recorder A', count: 2, percent: 20, selectionPercent: 20 }, { label: 'Recorder B', count: 5, percent: 50, selectionPercent: 50 }, { label: 'Recorder C', count: 5, percent: 50, selectionPercent: 50 }] };
    assert.deepStrictEqual(contract.analyticsRoseOption(recorderUnsorted, { type: 'rose', valueMode: 'count' }).series[0].data.map(point => point.name), ['Recorder B', 'Recorder C', 'Recorder A'], 'Recorder Rose must use the same stable descending categorical order');
    assert.deepStrictEqual(contract.analyticsPolarBarOption(recorderUnsorted, { type: 'polarBar', valueMode: 'count' }).angleAxis.data, ['Recorder B', 'Recorder C', 'Recorder A'], 'Recorder Polar Bar must use the same stable descending categorical order');
    assert.deepStrictEqual(contract.analyticsBarOption({ title: 'Unsorted', rows: unsortedRows }, { type: 'bar', valueMode: 'percentage' }).yAxis.data, ['First', 'Third', 'Second', 'Fourth'], 'Bar ordering behavior must remain the existing descending respondent-percent baseline');
    assert.deepStrictEqual(contract.analyticsPieOption({ title: 'Unsorted', rows: unsortedRows }, { type: 'pie', valueMode: 'percentage' }).series[0].data.map(point => point.name), originalOrder, 'Pie ordering must remain unchanged source order');
    const readingTrendOption = contract.analyticsCategoricalTrendOption({
        trend: { dates: ['2026-08-01'], answeredByDate: [1], series: [{ label: 'A', total: 1, counts: [1], percents: [100] }] }
    }, { type: 'trend', valueMode: 'percentage' }, { modal: true, reading: { labelSize: 2, valueSize: 3, theme: 'dark' } });
    assert.strictEqual(readingTrendOption.legend.textStyle.fontSize, 16, 'Trend identity legend text must respond to label size control');
    assert.strictEqual(readingTrendOption.backgroundColor, '#111827', 'Trend expanded Dark chart must use chart-local ECharts appearance');
    assert.strictEqual(readingTrendOption.series[0].label, undefined, 'Trend value size control must not invent permanent point value labels');

    const skewedRows = [73, 31, 20, 12, 12, 8, 5, 3, 2, 1, 1, 1].map((count, index) => contract.categoricalChartRow(`Tier ${index}`, count, 100, 120));
    const tierValues = contract.analyticsTierSourceValues(skewedRows);
    const tiers = skewedRows.map(row => contract.analyticsMagnitudeTier(row.count, tierValues));
    assert.deepStrictEqual(tiers, skewedRows.map(row => contract.analyticsMagnitudeTier(row.count, tierValues)), 'tier assignment must be deterministic');
    assert(tiers.every(tier => Number.isInteger(tier) && tier >= 1 && tier <= 10), 'tier assignment must stay inside an approx-10-tier system');
    assert(new Set(tiers).size <= 10, 'tier assignment must be finite and capped at 10 levels');
    for (let index = 1; index < skewedRows.length; index += 1) {
        assert(tiers[index - 1] >= tiers[index], 'larger source values must never receive smaller tiers');
    }
    assert.strictEqual(tiers[0], 10, 'largest category must reach the dominant tier');
    assert.strictEqual(tiers[tiers.length - 1], 1, 'smallest category must remain visible as tier 1');

    const treemapOption = contract.analyticsTreemapOption({ title: 'Single', rows: [respondentRow] }, { type: 'treemap', valueMode: 'percentage' });
    assert.strictEqual(treemapOption.series[0].type, 'treemap');
    assert.strictEqual(treemapOption.series[0].label.overflow, 'truncate', 'Treemap labels must use native truncation');
    assert.strictEqual(treemapOption.series[0].label.ellipsis, '...', 'Treemap labels must expose native ellipsis text');
    assert.strictEqual(treemapOption.series[0].labelLayout, undefined, 'Treemap must not use hideOverlap label suppression');
    assert.notStrictEqual(
        treemapOption.series[0].label.formatter({ name: 'Very Long Category Name', data: { realPercent: 12.3, realCount: 4 } }),
        '',
        'Treemap positive leaf formatter must always attempt a visible category label'
    );
    assert.strictEqual(treemapOption.series[0].data[0].value, 70.6, 'Treemap percentage geometry must use the raw current respondent percentage metric');
    assert.strictEqual(treemapOption.series[0].data[0].realCount, 72, 'Treemap must preserve raw count data');
    assert.strictEqual(treemapOption.series[0].data[0].rawValue, 72, 'Treemap must carry the original count beside the selected metric value');
    const treemapTooltip = contract.analyticsTooltipFormatter({ marker: '', name: 'IoT', data: treemapOption.series[0].data[0] });
    assert(treemapTooltip.includes('72 筆') && treemapTooltip.includes('70.6%'), 'Treemap tooltip must preserve exact respondent count and percent');
    const treemapCountOption = contract.analyticsTreemapOption({ title: 'Single', rows: [respondentRow] }, { type: 'treemap', valueMode: 'count' });
    assert.strictEqual(treemapCountOption.series[0].data[0].value, 72, 'Treemap count geometry must use the raw count metric');
    const treemapSkewed = contract.analyticsTreemapOption({ title: 'Skewed', rows: skewedRows }, { type: 'treemap', valueMode: 'percentage' });
    const treemapVisualValues = treemapSkewed.series[0].data.map(point => point.value);
    assert.deepStrictEqual(treemapVisualValues, skewedRows.map(row => Number(row.percent.toFixed(1))), 'Treemap percentage values must use raw row percentages without tiering');
    assert.deepStrictEqual(skewedRows.map(row => row.count), [73, 31, 20, 12, 12, 8, 5, 3, 2, 1, 1, 1], 'Treemap rendering must not mutate source rows');
    const treemapModal = contract.analyticsTreemapOption({ title: 'Skewed', rows: skewedRows }, { type: 'treemap', valueMode: 'percentage' }, { modal: true });
    assert.strictEqual(treemapModal.series[0].labelLine.show, false, 'expanded Treemap must not treat native labelLine as the external-label implementation');
    assert.strictEqual(treemapModal.series[0].label.overflow, 'truncate', 'expanded Treemap labels must keep native truncation');
    assert.strictEqual(treemapModal.series[0].labelLayout, undefined, 'expanded Treemap must not use hideOverlap label suppression');
    assert.strictEqual(treemapModal.__aimExternalLabelOverlay, undefined, 'expanded Treemap must not request the geometry-driven graphic overlay');
    assert(!treemapModal.series[0].data.some(point => point.externalLabelCandidate), 'expanded Treemap must not mark categories for external labels');
    assert.strictEqual(treemapSkewed.__aimExternalLabelOverlay, undefined, 'thumbnail Treemap must remain native without graphic overlay');
    const treemapLayoutCalls = [];
    const treemapChart = {
        getWidth: () => 640,
        getHeight: () => 520,
        getModel: () => ({
            getSeriesByIndex: () => ({
                getData: () => ({
                    getItemLayout: index => {
                        treemapLayoutCalls.push(index);
                        return { x: 0, y: 0, width: 10, height: 10 };
                    }
                })
            })
        }),
        setOption(option) {
            this.appliedOption = option;
        }
    };
    assert.strictEqual(contract.analyticsApplyExpandedExternalLabelOverlay(treemapChart, treemapModal), false, 'expanded Treemap must not apply a graphic annotation overlay');
    assert.strictEqual(treemapLayoutCalls.length, 0, 'expanded Treemap must not request final tile layout for annotation');
    assert.strictEqual(treemapChart.appliedOption, undefined, 'expanded Treemap must not create graphic leader lines or text labels');
    const readingTreemapOption = contract.analyticsTreemapOption({ title: 'Single', rows: [respondentRow] }, { type: 'treemap', valueMode: 'percentage' }, { modal: true, reading: { labelSize: 1, valueSize: 2, theme: 'dark' } });
    assert.strictEqual(readingTreemapOption.backgroundColor, '#111827', 'Treemap expanded Dark chart must use chart-local ECharts appearance');
    assert.strictEqual(readingTreemapOption.tooltip.backgroundColor, 'rgba(15, 23, 42, 0.96)', 'Treemap expanded Dark tooltip must use existing chart-local tooltip styling');
    assert.strictEqual(readingTreemapOption.series[0].label.fontSize, 14, 'Treemap category labels must respond to label size control');
    assert.strictEqual(readingTreemapOption.series[0].label.rich.value.fontSize, 16, 'Treemap value labels must respond to value size control');

    assert(!bubbleOptionSource.includes('analyticsBubblePoints'), 'Bubble active renderer must not call packed-coordinate helper');
    assert(!bubbleOptionSource.includes('__aimExternalLabelOverlay'), 'Bubble active renderer must not request external-label overlay');
    assert(!bubbleOptionSource.includes('externalLabelCandidate'), 'Bubble active renderer must not mark external label candidates');
    assert(!bubbleOptionSource.includes('visualTier'), 'Bubble active renderer must not use discrete visual tiers');
    assert(!bubbleOptionSource.includes('convertToPixel'), 'Bubble active renderer must not depend on chart-instance geometry');
    assert(!bubbleOptionSource.includes('analyticsReadableLabelColor'), 'Bubble active renderer must not use adaptive fill-luminance label color');
    assert(!bubblePointsSource.includes('Math.random'), 'retained old Bubble packing helper must remain deterministic while inactive');
    assert.strictEqual(contract.analyticsBubbleContinuousSymbolSize(50, 0, 100, 18, 50), 34, 'Bubble continuous size mapping must linearly interpolate thumbnail symbols');
    assert.strictEqual(contract.analyticsBubbleContinuousSymbolSize(5, 5, 5, 18, 50), 34, 'equal Bubble metric values must use the neutral thumbnail midpoint');
    const bubbleChart = {
        title: 'Bubble',
        rows: skewedRows
    };
    const bubbleOption = contract.analyticsBubbleOption(bubbleChart, { type: 'bubble', valueMode: 'percentage' });
    assert.strictEqual(bubbleOption.series[0].type, 'scatter', 'Bubble must use ECharts scatter');
    assert.strictEqual(bubbleOption.xAxis.type, 'category', 'Bubble X axis must represent categories');
    assert.strictEqual(bubbleOption.yAxis.type, 'value', 'Bubble Y axis must represent the current metric');
    assert.strictEqual(bubbleOption.xAxis.axisLabel.rotate, 30, 'Bubble X-axis labels must use fixed 30-degree rotation');
    assert.strictEqual(bubbleOption.xAxis.axisLabel.fontSize, 9, 'Bubble thumbnail X-axis labels must use compact readable text');
    assert.strictEqual(bubbleOption.xAxis.axisLabel.overflow, 'truncate', 'Bubble X-axis labels must use native truncation');
    assert.strictEqual(bubbleOption.xAxis.axisLabel.ellipsis, '...', 'Bubble X-axis labels must use explicit ellipsis text');
    assert.strictEqual(bubbleOption.grid.bottom, 64, 'Bubble thumbnail grid must reserve room for rotated X-axis labels');
    assert.strictEqual(bubbleOption.series[0].data[0].value[0], 'Tier 0', 'Bubble X values must use category identity');
    assert.strictEqual(bubbleOption.series[0].data[0].value[1], 73, 'Bubble percent-mode Y value must use respondent percent');
    assert.strictEqual(bubbleOption.series[0].data[0].symbolSize, 50, 'Bubble percent-mode symbol size must follow the current metric');
    assert.strictEqual(bubbleOption.series[0].data[0].realCount, 73, 'Bubble must preserve respondent count data without backend transformation');
    assert.strictEqual(Math.round(bubbleOption.series[0].data[0].realPercent * 10) / 10, 73, 'Bubble precise percent must remain respondent percentage');
    assert.strictEqual(bubbleOption.series.length, 1, 'thumbnail Bubble must use one native scatter series');
    assert(!bubbleOption.series[0].data.some(point => point.visualTier || point.externalLabelCandidate), 'Bubble data points must not carry packed-layout tier or annotation state');
    assert(!bubbleOption.series[0].data.some(point => Object.prototype.hasOwnProperty.call(point, 'labelColor')), 'Bubble data points must not carry adaptive label color state');
    assert.strictEqual(bubbleOption.series[0].label.color, '#ffffff', 'Bubble labels must use stable white text');
    assert.strictEqual(bubbleOption.series[0].label.textBorderColor, 'rgba(15, 23, 42, 0.75)', 'Bubble labels must use a dark neutral outline');
    assert.strictEqual(bubbleOption.series[0].label.textBorderWidth, 2, 'Bubble labels must use a restrained native text border width');
    assert.strictEqual(bubbleOption.series[0].label.fontWeight, 600, 'Bubble labels must use semibold typography');
    assert.strictEqual(contract.analyticsReadableLabelColor('rgba(15, 23, 42, 0.92)', { isDark: false }), '#ffffff', 'Bubble label color must use light text on dark resolved fills');
    assert.strictEqual(contract.analyticsReadableLabelColor('rgba(251, 191, 36, 0.72)', { isDark: false }), '#0f172a', 'Bubble label color must use dark text on light resolved fills');
    const countBubbleOption = contract.analyticsBubbleOption(bubbleChart, { type: 'bubble', valueMode: 'count' });
    assert.strictEqual(countBubbleOption.series[0].data[0].value[1], 73, 'Bubble count-mode Y value must use count');
    assert.strictEqual(countBubbleOption.series[0].data[0].symbolSize, 50, 'Bubble count-mode symbol size must follow count');
    const unsortedBubbleRows = [
        { label: 'First', count: 5, percent: 90, selectionPercent: 10 },
        { label: 'Second', count: 2, percent: 20, selectionPercent: 60 },
        { label: 'Third', count: 9, percent: 50, selectionPercent: 60 },
        { label: 'Fourth', count: 1, percent: 10, selectionPercent: 5 }
    ];
    const unsortedBubbleOriginal = unsortedBubbleRows.map(row => row.label);
    const percentBubbleOption = contract.analyticsBubbleOption({ title: 'Unsorted Bubble', rows: unsortedBubbleRows }, { type: 'bubble', valueMode: 'percentage' });
    assert.strictEqual(JSON.stringify(percentBubbleOption.xAxis.data), JSON.stringify(['First', 'Third', 'Second', 'Fourth']), 'Bubble percentage order must descend by current percent metric');
    assert.strictEqual(JSON.stringify(percentBubbleOption.series[0].data.map(point => point.value[1])), JSON.stringify([90, 50, 20, 10]), 'Bubble percent-mode Y values must follow the sorted current metric');
    const countSortedBubbleOption = contract.analyticsBubbleOption({ title: 'Unsorted Bubble', rows: unsortedBubbleRows }, { type: 'bubble', valueMode: 'count' });
    assert.strictEqual(JSON.stringify(countSortedBubbleOption.xAxis.data), JSON.stringify(['Third', 'First', 'Second', 'Fourth']), 'Bubble count order must descend by count');
    assert.strictEqual(JSON.stringify(unsortedBubbleRows.map(row => row.label)), JSON.stringify(unsortedBubbleOriginal), 'Bubble sorting must not mutate source rows');
    const equalBubbleOption = contract.analyticsBubbleOption({ title: 'Equal Bubble', rows: [{ label: 'A', count: 3, percent: 30 }, { label: 'B', count: 3, percent: 30 }, { label: 'C', count: 1, percent: 10 }] }, { type: 'bubble', valueMode: 'count' });
    assert.strictEqual(JSON.stringify(equalBubbleOption.xAxis.data), JSON.stringify(['A', 'B', 'C']), 'Bubble equal current metric values must preserve source order');
    assert(countSortedBubbleOption.series[0].data[0].symbolSize > countSortedBubbleOption.series[0].data[1].symbolSize, 'larger Bubble metric values must produce larger symbols');
    const bubbleModal = contract.analyticsBubbleOption(bubbleChart, { type: 'bubble', valueMode: 'percentage' }, { modal: true });
    assert.strictEqual(bubbleModal.series.length, 1, 'expanded Bubble must not use the previous ruler-like external label series');
    assert.strictEqual(bubbleModal.__aimExternalLabelOverlay, undefined, 'expanded Bubble must not request the geometry-driven graphic overlay');
    assert.strictEqual(bubbleModal.series[0].data[0].symbolSize, 76, 'expanded Bubble must use the larger native scatter size range');
    assert.strictEqual(bubbleModal.xAxis.axisLabel.rotate, 30, 'expanded Bubble X-axis labels must use fixed 30-degree rotation');
    assert.strictEqual(bubbleModal.xAxis.axisLabel.fontSize, 10, 'expanded Bubble X-axis labels must use compact readable text');
    assert.strictEqual(bubbleModal.grid.bottom, 72, 'expanded Bubble grid must reserve room for rotated X-axis labels');
    const bubbleChartMock = {
        getWidth: () => 640,
        getHeight: () => 520,
        convertToPixel() {
            this.convertToPixelCalled = true;
            return [0, 0];
        },
        setOption(option) {
            this.appliedOption = option;
        }
    };
    assert.strictEqual(contract.analyticsApplyExpandedExternalLabelOverlay(bubbleChartMock, bubbleModal), false, 'expanded Bubble must not apply a graphic annotation overlay');
    assert.strictEqual(bubbleChartMock.convertToPixelCalled, undefined, 'expanded Bubble must not call convertToPixel for annotation');
    assert.strictEqual(bubbleChartMock.appliedOption, undefined, 'expanded Bubble must not create graphic leader lines or text labels');
    const readingBubbleOption = contract.analyticsBubbleOption({ title: 'Single', rows: [respondentRow] }, { type: 'bubble', valueMode: 'percentage' }, { modal: true, reading: { labelSize: 1, valueSize: 2, theme: 'dark' } });
    assert.strictEqual(readingBubbleOption.backgroundColor, '#111827', 'Bubble expanded Dark chart must use chart-local ECharts appearance');
    assert.strictEqual(readingBubbleOption.tooltip.backgroundColor, 'rgba(15, 23, 42, 0.96)', 'Bubble expanded Dark tooltip must use existing chart-local tooltip styling');
    assert.strictEqual(readingBubbleOption.series[0].label.fontSize, 13, 'Bubble labels must respond to label size control');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.value.fontSize, 16, 'Bubble value labels must respond to value size control');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.label.color, '#ffffff', 'Bubble rich category labels must use stable white text');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.value.color, '#ffffff', 'Bubble rich value labels must use stable white text');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.label.textBorderColor, 'rgba(15, 23, 42, 0.75)', 'Bubble rich category labels must use a dark neutral outline');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.value.textBorderColor, 'rgba(15, 23, 42, 0.75)', 'Bubble rich value labels must use a dark neutral outline');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.label.textBorderWidth, 2, 'Bubble rich category labels must use the native text border');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.value.textBorderWidth, 2, 'Bubble rich value labels must use the native text border');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.label.fontWeight, 600, 'Bubble rich category labels must remain semibold');
    assert.strictEqual(readingBubbleOption.series[0].label.rich.value.fontWeight, 600, 'Bubble rich value labels must remain semibold');
    const bubbleTooltip = contract.analyticsTooltipFormatter({ marker: '', name: 'Tier 0', data: bubbleOption.series[0].data[0] });
    assert(bubbleTooltip.includes('73 筆') && bubbleTooltip.includes('73%'), 'Bubble tooltip must preserve exact respondent count and percent');

    assert(managementSource.includes('${capabilities.primaryTypes.map(value => `<button data-action="${action}"'), 'primary chart buttons must be rendered from capability order');
    assert(managementSource.includes('${capabilities.moreTypes.map(value => `<button data-action="${action}"'), 'More chart buttons must be rendered separately without reordering primary buttons');
    assert(managementSource.includes("${view.type === value ? ' ✓' : ''}"), 'selected More chart must be indicated inside the menu');

    const activityTrend = contract.activityTrendOption({ dates: ['2026-08-01'], dailyCounts: [1], cumulativeCounts: [1] }, { activityMode: 'daily' });
    assert.strictEqual(activityTrend.series[0].smooth, false, 'Activity Trend must render straight line segments');
    assert(activityTrend.series[0].areaStyle, 'Activity Trend area fill must remain');
    const categoricalTrend = contract.analyticsCategoricalTrendOption({ trend: { dates: ['2026-08-01'], answeredByDate: [1], series: [{ label: 'A', total: 1, counts: [1], percents: [100] }] } }, { valueMode: 'percentage' });
    assert.strictEqual(categoricalTrend.series[0].smooth, true, 'Categorical Trend must restore smooth line segments');
}

function assertStableVisualAssetsAndActiveBannerSharingContract(managementSource, service) {
    assert(managementSource.includes('data-stable-image-key="logo:form"'), 'stable logo image identity must be present in rendered logo markup');
    assert(managementSource.includes('replaceHtmlPreservingStableImages(root,'), 'full render must preserve stable image nodes across root HTML replacement');
    assert(managementSource.includes('replaceHtmlPreservingStableImages(preview,'), 'preview refresh must preserve stable form thumbnail image nodes');
    assert(managementSource.includes('settings.thumbnailSource'), 'thumbnailSource must be stored on form_thumbnail settings');
    assert(managementSource.includes('縮圖來源'), 'Active thumbnail editor must expose the approved source label');
    assert(managementSource.includes('與訪客紀錄共用'), 'Active thumbnail editor must expose the approved shared label');
    assert(managementSource.includes('自訂'), 'Active thumbnail editor must expose the approved custom label');
    assert(!managementSource.includes('AssetManager'), 'stable visual assets must not introduce a generic asset framework');

    const source = [
        "const formContextVisitorMode = 'visitor';",
        "const formContextFieldIntelligenceMode = 'field_intelligence';",
        "const thumbnailSourceSharedVisitor = 'shared_visitor';",
        "const thumbnailSourceCustom = 'custom';",
        "const thumbnailSourceValues = new Set([thumbnailSourceSharedVisitor, thumbnailSourceCustom]);",
        "const thumbnailDefaults = Object.freeze({ driveFileId: '', fit: 'cover', focalX: 50, focalY: 50, zoom: 1 });",
        "const thumbnailFitOptions = new Set(['cover', 'contain']);",
        "const choiceFieldTypes = ['single_choice', 'multiple_choice', 'dropdown'];",
        "const previewPlacementValues = new Set(['none', 'primary', 'badges', 'text']);",
        "const compactPreviewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);",
        "const previewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'multiple_choice', 'dropdown']);",
        "const cardAssistRoles = new Set(['person_name', 'job_title', 'company_name']);",
        "let selected = null;",
        "let activeContext = formContextVisitorMode;",
        "const ui = { formDesignDraftDirty: false, formDesignMessage: '' };",
        "const Store = { clone(value) { return JSON.parse(JSON.stringify(value)); }, escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); } };",
        "function newUuid() { return '99999999-9999-4999-8999-999999999999'; }",
        "function fieldTypeLabel(type) { return type; }",
        "function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : formContextVisitorMode; }",
        "function currentFormContext() { return activeContext; }",
        "function selectedActivity() { return selected; }",
        "function formDesign(activity, formContext) { return activity.formDesignRuntimeByContext[normalizeFormContext(formContext)]; }",
        "function option(value, label, selectedValue) { return `<option value=\"${Store.escapeHtml(value)}\" ${String(value) === String(selectedValue) ? 'selected' : ''}>${Store.escapeHtml(label)}</option>`; }",
        "function makeCardLinkItem(item) { return { ...item, type: 'card_link', itemKey: item && item.itemKey || 'card', fieldId: item && item.fieldId || 'card', options: [], optionEntries: [], settings: item && item.settings || {}, allowOther: false }; }",
        extractFunctionDeclaration(managementSource, 'clampNumber'),
        extractFunctionDeclaration(managementSource, 'normalizeThumbnailSource'),
        extractFunctionDeclaration(managementSource, 'normalizeThumbnailSettings'),
        extractFunctionDeclaration(managementSource, 'thumbnailSettingsForItem'),
        extractFunctionDeclaration(managementSource, 'thumbnailSourceForItem'),
        extractFunctionDeclaration(managementSource, 'normalizeOptionEntries'),
        extractFunctionDeclaration(managementSource, 'normalizePreviewPlacement'),
        extractFunctionDeclaration(managementSource, 'makeFormThumbnailItem'),
        extractFunctionDeclaration(managementSource, 'normalizeDesignerItem'),
        extractFunctionDeclaration(managementSource, 'visitorPublishedThumbnailItem'),
        extractFunctionDeclaration(managementSource, 'resolvedFormThumbnailItem'),
        extractFunctionDeclaration(managementSource, 'designerItemSignature'),
        extractFunctionDeclaration(managementSource, 'designerItemsEqual'),
        extractFunctionDeclaration(managementSource, 'designerItemKey'),
        extractFunctionDeclaration(managementSource, 'serializeDraftItems'),
        extractFunctionDeclaration(managementSource, 'driveThumbnailUrl'),
        extractFunctionDeclaration(managementSource, 'thumbnailImageStyle'),
        extractFunctionDeclaration(managementSource, 'renderFormThumbnailVisual'),
        extractFunctionDeclaration(managementSource, 'renderFormThumbnailEditor'),
        extractFunctionDeclaration(managementSource, 'syncStableImageAttributes'),
        extractFunctionDeclaration(managementSource, 'restoreStableImages'),
        '({ setActivity(value) { selected = value; }, setContext(value) { activeContext = value; }, normalizeDesignerItem, makeFormThumbnailItem, thumbnailSourceForItem, renderFormThumbnailEditor, designerItemSignature, designerItemsEqual, serializeDraftItems, resolvedFormThumbnailItem, thumbnailSettingsForItem, syncStableImageAttributes, restoreStableImages });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const thumbnail = (itemKey, driveFileId, sourceMode) => contract.normalizeDesignerItem({
        itemKey,
        fieldId: itemKey,
        type: 'form_thumbnail',
        title: 'Thumbnail',
        settings: {
            thumbnail: { driveFileId, fit: 'cover', focalX: 40, focalY: 60, zoom: 1.25 },
            ...(sourceMode ? { thumbnailSource: sourceMode } : {})
        }
    });
    const visitorA = thumbnail('visitor-thumb', 'drive-a', null);
    const visitorB = thumbnail('visitor-thumb', 'drive-b', null);
    const activeCustom = thumbnail('active-thumb', 'drive-custom', 'custom');
    const activeShared = thumbnail('active-thumb', 'drive-dormant', 'shared_visitor');
    const activeEmpty = thumbnail('active-empty', '', null);
    const activity = {
        formDesignRuntimeByContext: {
            visitor: { published: { formContext: 'visitor', items: [visitorA] }, draft: { formContext: 'visitor', items: [visitorB, { itemKey: 'visitor-field', fieldId: 'visitor-field', type: 'short_text', title: 'Visitor Field', settings: {} }] } },
            field_intelligence: { published: { formContext: 'field_intelligence', items: [activeShared, { itemKey: 'active-field', fieldId: 'active-field', type: 'short_text', title: 'Active Field', settings: {} }] }, draft: { formContext: 'field_intelligence', items: [activeShared] } }
        }
    };
    contract.setActivity(activity);

    contract.setContext('visitor');
    const visitorHtml = contract.renderFormThumbnailEditor(visitorA);
    assert(!visitorHtml.includes('aim-field-thumbnail-source'), 'Visitor form_thumbnail must not expose Active sharing controls');
    contract.setContext('field_intelligence');
    const activeHtml = contract.renderFormThumbnailEditor(activeShared);
    assert(activeHtml.includes('id="aim-field-thumbnail-source"'), 'Active form_thumbnail must expose thumbnailSource');
    const sourceValues = Array.from(activeHtml.matchAll(/<option value="([^"]*)"/g)).map(match => match[1]);
    assert.deepStrictEqual(sourceValues, ['shared_visitor', 'custom'], 'thumbnailSource allowed values must be exact and ordered');
    assert.strictEqual(contract.thumbnailSourceForItem(activeCustom, 'field_intelligence'), 'custom', 'existing Active custom image without source must remain custom when image exists');
    assert.strictEqual(contract.thumbnailSourceForItem(contract.normalizeDesignerItem({ ...activeCustom, settings: { thumbnail: { driveFileId: 'legacy-drive' } } }), 'field_intelligence'), 'custom');
    assert.strictEqual(contract.thumbnailSourceForItem(activeEmpty, 'field_intelligence'), 'shared_visitor', 'empty Active thumbnail without source must default to shared Visitor');
    assert.strictEqual(contract.makeFormThumbnailItem({ settings: { thumbnailSource: 'shared_visitor' } }).settings.thumbnailSource, 'shared_visitor', 'new Active thumbnail can be initialized as shared Visitor');
    assert(managementSource.includes('updateFormDesignDraft({ thumbnailSource: source, settings });'), 'source selector must update the actual field draft');
    assert(!contract.designerItemsEqual(activeCustom, activeShared, 'field_intelligence'), 'custom to shared_visitor must be a real designer item change');
    assert(!contract.designerItemsEqual(activeShared, activeCustom, 'field_intelligence'), 'shared_visitor to custom must be a real designer item change');
    assert(contract.designerItemSignature(activeShared, 'field_intelligence').includes('"thumbnailSource":"shared_visitor"'), 'designer item signature must include thumbnailSource');
    assert.strictEqual(contract.serializeDraftItems([activeShared], 'field_intelligence')[0].settings.thumbnailSource, 'shared_visitor', 'draft serialization must preserve Active thumbnailSource');
    assert.strictEqual(contract.serializeDraftItems([activeShared], 'field_intelligence')[0].settings.thumbnail.driveFileId, 'drive-dormant', 'shared mode must not delete dormant Active custom thumbnail metadata');
    assert.strictEqual(contract.normalizeDesignerItem(contract.serializeDraftItems([activeShared], 'field_intelligence')[0]).settings.thumbnailSource, 'shared_visitor', 'reload hydration must preserve thumbnailSource');
    assert.strictEqual(service._normalizeFormItems([{
        itemKey: IDS.thumbKey || IDS.textKey,
        type: 'form_thumbnail',
        title: 'Thumbnail',
        settings: { thumbnailSource: 'shared_visitor', thumbnail: { driveFileId: 'drive-dormant' } }
    }])[0].settings.thumbnailSource, 'shared_visitor', 'service normalization must preserve thumbnailSource on form_thumbnail');

    assert.strictEqual(contract.thumbnailSettingsForItem(contract.resolvedFormThumbnailItem(activity, 'visitor', visitorA)).driveFileId, 'drive-a', 'Visitor must resolve its own thumbnail');
    assert.strictEqual(contract.thumbnailSettingsForItem(contract.resolvedFormThumbnailItem(activity, 'field_intelligence', activeCustom)).driveFileId, 'drive-custom', 'Active custom must resolve its own thumbnail');
    assert.strictEqual(contract.thumbnailSettingsForItem(contract.resolvedFormThumbnailItem(activity, 'field_intelligence', activeShared)).driveFileId, 'drive-a', 'Active shared must resolve Visitor published thumbnail');
    assert.strictEqual(activeShared.settings.thumbnail.driveFileId, 'drive-dormant', 'shared resolution must not copy Visitor thumbnail into Active settings');
    activity.formDesignRuntimeByContext.visitor.published.items = [visitorB];
    assert.strictEqual(contract.thumbnailSettingsForItem(contract.resolvedFormThumbnailItem(activity, 'field_intelligence', activeShared)).driveFileId, 'drive-b', 'Visitor publish A to B must update shared Active resolution');
    activity.formDesignRuntimeByContext.visitor.published.items = [visitorA];
    activity.formDesignRuntimeByContext.visitor.draft.items = [visitorB];
    assert.strictEqual(contract.thumbnailSettingsForItem(contract.resolvedFormThumbnailItem(activity, 'field_intelligence', activeShared)).driveFileId, 'drive-a', 'Visitor unpublished draft must not alter Active published runtime resolution');
    activity.formDesignRuntimeByContext.visitor.published.items = [];
    assert.strictEqual(contract.thumbnailSettingsForItem(contract.resolvedFormThumbnailItem(activity, 'field_intelligence', activeShared)).driveFileId, '', 'missing Visitor published thumbnail must produce a valid empty shared result');
    assert(activity.formDesignRuntimeByContext.field_intelligence.published.items.some(item => item.itemKey === 'active-field'), 'Active fields must remain context-isolated during thumbnail resolution');
    assert(!activity.formDesignRuntimeByContext.field_intelligence.published.items.some(item => item.itemKey === 'visitor-field'), 'Visitor fields must not copy into Active during thumbnail resolution');

    const fakeImage = attrs => ({
        attrs: { ...attrs },
        replacement: null,
        getAttribute(name) { return this.attrs[name] || null; },
        setAttribute(name, value) { this.attrs[name] = String(value); },
        removeAttribute(name) { delete this.attrs[name]; },
        getAttributeNames() { return Object.keys(this.attrs); },
        replaceWith(node) { this.replacement = node; }
    });
    const previous = fakeImage({ src: '/api/drive/thumbnail?fileId=drive-a', style: 'old', 'data-stable-image-key': 'form-thumbnail:/api/drive/thumbnail?fileId=drive-a' });
    const next = fakeImage({ src: '/api/drive/thumbnail?fileId=drive-a', style: 'new', alt: 'updated', 'data-stable-image-key': 'form-thumbnail:/api/drive/thumbnail?fileId=drive-a' });
    contract.restoreStableImages({ querySelectorAll: () => [next] }, new Map([[next.getAttribute('data-stable-image-key'), [previous]]]));
    assert.strictEqual(next.replacement, previous, 'same resolved thumbnail asset can reuse the existing image node');
    assert.strictEqual(previous.attrs.src, '/api/drive/thumbnail?fileId=drive-a', 'same asset crop changes must not require changing src');
    assert.strictEqual(previous.attrs.style, 'new', 'same asset presentation changes must update style only');
    assert.strictEqual(previous.attrs.alt, 'updated', 'same asset reuse must keep presentation attributes fresh');
    const differentPrevious = fakeImage({ src: '/api/drive/thumbnail?fileId=drive-a', 'data-stable-image-key': 'form-thumbnail:/api/drive/thumbnail?fileId=drive-a' });
    const differentNext = fakeImage({ src: '/api/drive/thumbnail?fileId=drive-b', 'data-stable-image-key': 'form-thumbnail:/api/drive/thumbnail?fileId=drive-b' });
    contract.restoreStableImages({ querySelectorAll: () => [differentNext] }, new Map([[differentPrevious.getAttribute('data-stable-image-key'), [differentPrevious]]]));
    assert.strictEqual(differentNext.replacement, null, 'different resolved asset identity must trigger a real image update');
}

async function assertDesktopUnifiedVisitorRecordLandingContract(managementSource) {
    assert(managementSource.includes('applyInitialLanding({ explicitSelectedActivityId: selectedActivityIdBeforeLoad });'), 'startup must use the unified initial landing boundary with captured explicit selection state');
    assert(extractFunctionDeclaration(managementSource, 'applyUnifiedVisitorRecordLanding'), 'shared visitor record landing helper must exist');
    assert(managementSource.includes('function enterVisitorRecordEntryState('), 'Visitor Records entry state helper must exist');
    assert(managementSource.includes('function chooseCurrentActivity('), 'chooser selection action helper must exist');
    const initialLandingSource = extractFunctionDeclaration(managementSource, 'applyInitialLanding');
    assert(initialLandingSource.includes('applyUnifiedVisitorRecordLanding(options)'), 'initial landing must use the shared Activity-count landing policy');
    assert(!initialLandingSource.includes('isMobileFormViewport()'), 'mobile initial landing must not be diverted to role-only landing');
    assert(managementSource.includes("ui.tab = 'records';") && managementSource.includes("ui.records.scope = 'entry';"), 'default landing must use the existing records entry flow');
    assert(managementSource.includes('ui.recordContextMode = recordContextVisitorMode;'), 'default landing must use Visitor record context');
    assert(managementSource.includes('ui.formContext = formContextVisitorMode;'), 'default landing must reset Form Design context to Visitor');
    assert(managementSource.includes("ui.view = 'activityChooser';"), 'multi-open desktop landing must expose an Activity chooser state');
    assert(managementSource.includes('選擇目前活動'), 'chooser heading must use the requested concise Traditional Chinese copy');
    assert(managementSource.includes('目前有多個進行中的活動，請選擇要紀錄的活動。'), 'chooser helper must use the requested concise Traditional Chinese copy');
    assert(managementSource.includes('進入紀錄'), 'chooser action must use the requested concise Traditional Chinese copy');
    assert(managementSource.includes('data-action="choose-current-activity"'), 'chooser rows must use the direct choose-current-activity action');
    assert(managementSource.includes("if (action === 'choose-current-activity' && currentUser && currentUser.authenticated)"), 'chooser action must be available to authenticated desktop roles');
    assert(!managementSource.includes('applyUnifiedVisitorRecordLanding(' + ');\\n    render();'), 'shared landing must not be a post-render redirect');
    assert(!/location\.(search|hash)/.test(managementSource), 'no supported URL search/hash deep-link mechanism exists to override');
    const renderSource = extractFunctionDeclaration(managementSource, 'render');
    assert(!renderSource.includes('applyInitialLanding') && !renderSource.includes('applyUnifiedVisitorRecordLanding'), 'ordinary render must not force the landing again');
    assert(renderSource.includes("ui.view === 'activityChooser' ? renderActivityChooser() : renderOverview()"), 'desktop chooser content must render for non-recorder roles');
    const renderMobileFrameworkSource = extractFunctionDeclaration(managementSource, 'renderMobileFramework');
    assert(renderMobileFrameworkSource.includes("if (ui.view === 'activityChooser') return '';"), 'mobile chooser must not render record tabs before Activity selection');
    const renderActivityChooserSource = extractFunctionDeclaration(managementSource, 'renderActivityChooser');
    assert(!renderActivityChooserSource.includes('ActivityIntelligenceApi'), 'chooser must use already loaded Activity state without a decoration fetch');
    const selectTabSource = extractFunctionDeclaration(managementSource, 'selectTab');
    assert(!selectTabSource.includes('applyInitialLanding') && !selectTabSource.includes('applyUnifiedVisitorRecordLanding'), 'subsequent tab navigation must not force the landing again');
    assert(managementSource.includes("if (tabName === 'form' && !canDesignForm()) ui.tab = 'overview';"), 'Form Design permission checks must remain authoritative');
    assert(managementSource.includes("else if (tabName === 'analytics' && !canUseAnalytics()) ui.tab = 'overview';"), 'Analytics permission checks must remain authoritative');
    assert(managementSource.includes('if (action === \'form-context\')'), 'Active Intelligence remains reachable through existing form context navigation');
    assert(managementSource.includes('data-action="tab" data-tab="records"') || managementSource.includes("sidebarTab('records'"), 'Records navigation must remain available through existing sidebar tabs');
    assert(managementSource.includes("sidebarTab('analytics'") && managementSource.includes("sidebarTab('form'"), 'Analytics and Form Design navigation must remain permission-controlled and reachable');
    assert(managementSource.includes('data-stable-image-key="logo:form"'), 'stable visual asset behavior must remain present');
    assert(!managementSource.includes('activity_intelligence_') && !managementSource.includes('CREATE TABLE'), 'landing change must not add DB/schema code to frontend');

    const source = [
        "const formContextVisitorMode = 'visitor';",
        "const formContextFieldIntelligenceMode = 'field_intelligence';",
        "const recordContextVisitorMode = 'visitor';",
        "const recordContextActiveMode = 'active-intelligence';",
        "let currentUser = null;",
        "let mobile = false;",
        "let fallbackCalls = 0;",
        "let resetCalls = 0;",
        "const loadPublishedFormCalls = [];",
        "const backgroundLoadCalls = [];",
        "const state = { activities: [], selectedActivityId: null };",
        "const ui = { selectedActivityId: null, view: 'overview', tab: 'overview', records: { scope: 'all' }, recordContextMode: recordContextActiveMode, formContext: formContextFieldIntelligenceMode };",
        "const Store = { escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); }, formatDate(value) { return value || ''; }, activitySubtitle(activity) { return activity && activity.location ? activity.location : ''; } };",
        "function isMobileFormViewport() { return mobile; }",
        "function activityStatus(activity) { return { key: activity && activity.open ? 'open' : 'ended' }; }",
        "function openActivities() { return state.activities.filter(activity => activityStatus(activity).key === 'open'); }",
        "function resetAllQuickStates() { resetCalls += 1; }",
        "function applyRoleLanding() { fallbackCalls += 1; ui.view = 'fallback'; }",
        "function canCreateRecord(activity) { return currentUser && currentUser.authenticated && activity && activityStatus(activity).key === 'open'; }",
        "function loadPublishedFormForActivity(activityId) { loadPublishedFormCalls.push(activityId); return Promise.resolve(); }",
        "function startBackgroundRecordLoadForActivity(activityId, options) { backgroundLoadCalls.push({ activityId, options }); }",
        "function statusPill(status) { return `<span class=\"aim-pill\">${status.key}</span>`; }",
        extractFunctionDeclaration(managementSource, 'enterVisitorRecordEntryState'),
        extractFunctionDeclaration(managementSource, 'applyUnifiedVisitorRecordLanding'),
        extractFunctionDeclaration(managementSource, 'applyInitialLanding'),
        extractFunctionDeclaration(managementSource, 'chooseCurrentActivity').replace(/^function /, 'async function '),
        extractFunctionDeclaration(managementSource, 'renderActivityChooser'),
        "({ state, ui, loadPublishedFormCalls, backgroundLoadCalls, setUser(value) { currentUser = value; }, setMobile(value) { mobile = value; }, applyInitialLanding, chooseCurrentActivity, renderActivityChooser, counts() { return { fallbackCalls, resetCalls }; } });"
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const roles = ['recorder', 'admin', 'super_admin'];
    roles.forEach(role => {
        contract.state.activities = [{ id: 'activity-a', open: true }, { id: 'activity-b', open: true }];
        contract.state.selectedActivityId = null;
        contract.ui.selectedActivityId = null;
        contract.ui.view = 'overview';
        contract.ui.tab = 'overview';
        contract.ui.records.scope = 'all';
        contract.ui.recordContextMode = 'active-intelligence';
        contract.ui.formContext = 'field_intelligence';
        contract.setUser({ authenticated: true, role });
        contract.setMobile(false);
        contract.applyInitialLanding();
        assert.strictEqual(contract.ui.view, 'activityChooser', `${role} desktop multi-open entry must show chooser`);
        assert.notStrictEqual(contract.ui.selectedActivityId, 'activity-a', `${role} desktop multi-open entry must not silently choose item 0`);
        assert.deepStrictEqual({
            tab: contract.ui.tab,
            scope: contract.ui.records.scope,
            recordContextMode: contract.ui.recordContextMode,
            formContext: contract.ui.formContext
        }, {
            tab: 'records',
            scope: 'entry',
            recordContextMode: 'visitor',
            formContext: 'visitor'
        }, `${role} desktop chooser state must be prepared for Visitor Records entry`);
    });

    contract.state.activities = [{ id: 'closed-a', open: false }, { id: 'activity-b', open: true }];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.ui.tab = 'overview';
    contract.ui.records.scope = 'all';
    contract.ui.recordContextMode = 'active-intelligence';
    contract.ui.formContext = 'field_intelligence';
    contract.setUser({ authenticated: true, role: 'admin' });
    contract.setMobile(false);
    contract.applyInitialLanding();
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext
    }, {
        id: 'activity-b',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor'
    }, 'exactly one open Activity must auto-enter Visitor Add Record');

    contract.state.activities = [
        { id: 'activity-a', name: 'Alpha', open: true, formOpenStart: '2026-08-01', formOpenEnd: '2026-08-02', location: 'Taipei' },
        { id: 'closed-c', name: 'Closed', open: false, formOpenStart: '2026-08-03', formOpenEnd: '2026-08-04' },
        { id: 'activity-b', name: 'Beta', open: true, formOpenStart: '2026-08-05', formOpenEnd: '2026-08-06' }
    ];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.applyInitialLanding();
    assert.strictEqual(contract.ui.view, 'activityChooser', 'two open Activities must produce chooser state');
    const chooserHtml = contract.renderActivityChooser();
    assert(chooserHtml.includes('Alpha') && chooserHtml.includes('Beta'), 'chooser must render all eligible open Activities');
    assert(!chooserHtml.includes('Closed'), 'chooser must not render closed Activities');
    assert(chooserHtml.includes('進入紀錄'), 'chooser must render a clear enter-record action');

    contract.state.activities = [
        { id: 'activity-a', open: true },
        { id: 'activity-b', open: true },
        { id: 'activity-c', open: true }
    ];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.applyInitialLanding();
    assert.strictEqual(contract.ui.view, 'activityChooser', 'three or more open Activities must use the same chooser state as two');

    contract.state.activities = [{ id: 'activity-a', open: true }, { id: 'activity-b', open: true }];
    contract.ui.selectedActivityId = 'activity-a';
    contract.ui.view = 'overview';
    contract.applyInitialLanding({ explicitSelectedActivityId: 'activity-b' });
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext
    }, {
        id: 'activity-b',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor'
    }, 'explicit selected open Activity must be preserved when session state supports it');

    contract.ui.selectedActivityId = 'activity-a';
    contract.ui.view = 'overview';
    contract.applyInitialLanding({ explicitSelectedActivityId: 'closed-activity' });
    assert.strictEqual(contract.ui.view, 'activityChooser', 'selected Activity that is no longer open must not be blindly preserved');
    assert.strictEqual(contract.ui.selectedActivityId, null, 'invalid selected Activity must be cleared for chooser selection');

    contract.state.activities = [{ id: 'activity-a', open: true }, { id: 'activity-b', open: true }];
    contract.loadPublishedFormCalls.length = 0;
    contract.backgroundLoadCalls.length = 0;
    await contract.chooseCurrentActivity('activity-a');
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext,
        publishedFormActivityId: contract.loadPublishedFormCalls[0],
        backgroundActivityId: contract.backgroundLoadCalls[0] && contract.backgroundLoadCalls[0].activityId
    }, {
        id: 'activity-a',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor',
        publishedFormActivityId: 'activity-a',
        backgroundActivityId: 'activity-a'
    }, 'choosing Activity A must enter Activity A Visitor Add Record directly');

    contract.loadPublishedFormCalls.length = 0;
    contract.backgroundLoadCalls.length = 0;
    await contract.chooseCurrentActivity('activity-b');
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext,
        publishedFormActivityId: contract.loadPublishedFormCalls[0],
        backgroundActivityId: contract.backgroundLoadCalls[0] && contract.backgroundLoadCalls[0].activityId
    }, {
        id: 'activity-b',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor',
        publishedFormActivityId: 'activity-b',
        backgroundActivityId: 'activity-b'
    }, 'choosing Activity B must enter Activity B Visitor Add Record directly');

    contract.state.activities = [];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.setMobile(false);
    contract.applyInitialLanding();
    assert.strictEqual(contract.ui.view, 'fallback', 'zero open Activities must use existing safe fallback behavior');

    contract.state.activities = [{ id: 'closed-a', open: false }, { id: 'activity-b', open: true }];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.ui.tab = 'overview';
    contract.ui.records.scope = 'all';
    contract.ui.recordContextMode = 'active-intelligence';
    contract.ui.formContext = 'field_intelligence';
    contract.setMobile(true);
    contract.applyInitialLanding();
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext
    }, {
        id: 'activity-b',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor'
    }, 'mobile exactly one open Activity must auto-enter Visitor Add Record');

    roles.forEach(role => {
        contract.state.activities = [{ id: 'activity-a', open: true }, { id: 'activity-b', open: true }];
        contract.state.selectedActivityId = null;
        contract.ui.selectedActivityId = null;
        contract.ui.view = 'overview';
        contract.ui.tab = 'overview';
        contract.ui.records.scope = 'all';
        contract.ui.recordContextMode = 'active-intelligence';
        contract.ui.formContext = 'field_intelligence';
        contract.setUser({ authenticated: true, role });
        contract.setMobile(true);
        contract.applyInitialLanding();
        assert.strictEqual(contract.ui.view, 'activityChooser', `${role} mobile multi-open entry must show chooser`);
        assert.notStrictEqual(contract.ui.selectedActivityId, 'activity-a', `${role} mobile multi-open entry must not silently choose item 0`);
        assert.deepStrictEqual({
            tab: contract.ui.tab,
            scope: contract.ui.records.scope,
            recordContextMode: contract.ui.recordContextMode,
            formContext: contract.ui.formContext
        }, {
            tab: 'records',
            scope: 'entry',
            recordContextMode: 'visitor',
            formContext: 'visitor'
        }, `${role} mobile chooser state must share the Visitor Records entry policy`);
    });

    contract.state.activities = [
        { id: 'activity-a', name: 'Alpha', open: true, formOpenStart: '2026-08-01', formOpenEnd: '2026-08-02' },
        { id: 'closed-c', name: 'Closed', open: false, formOpenStart: '2026-08-03', formOpenEnd: '2026-08-04' },
        { id: 'activity-b', name: 'Beta', open: true, formOpenStart: '2026-08-05', formOpenEnd: '2026-08-06' }
    ];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.setMobile(true);
    contract.applyInitialLanding();
    assert.strictEqual(contract.ui.view, 'activityChooser', 'mobile two open Activities must produce chooser state');
    const mobileChooserHtml = contract.renderActivityChooser();
    assert(mobileChooserHtml.includes('Alpha') && mobileChooserHtml.includes('Beta'), 'mobile chooser must list open Activities from current loaded state');
    assert(!mobileChooserHtml.includes('Closed'), 'mobile chooser must not list closed Activities');

    contract.state.activities = [
        { id: 'activity-a', open: true },
        { id: 'activity-b', open: true },
        { id: 'activity-c', open: true }
    ];
    contract.ui.selectedActivityId = null;
    contract.ui.view = 'overview';
    contract.setMobile(true);
    contract.applyInitialLanding();
    assert.strictEqual(contract.ui.view, 'activityChooser', 'mobile three or more open Activities must use the shared chooser state');

    contract.state.activities = [{ id: 'activity-a', open: true }, { id: 'activity-b', open: true }];
    contract.ui.selectedActivityId = 'activity-a';
    contract.ui.view = 'overview';
    contract.setMobile(true);
    contract.applyInitialLanding({ explicitSelectedActivityId: 'activity-b' });
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext
    }, {
        id: 'activity-b',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor'
    }, 'mobile explicit selected open Activity must be preserved when session state supports it');

    contract.ui.selectedActivityId = 'activity-a';
    contract.ui.view = 'overview';
    contract.setMobile(true);
    contract.applyInitialLanding({ explicitSelectedActivityId: 'closed-activity' });
    assert.strictEqual(contract.ui.view, 'activityChooser', 'mobile stale selected Activity must not suppress chooser');
    assert.strictEqual(contract.ui.selectedActivityId, null, 'mobile stale selected Activity must be cleared for chooser selection');

    roles.forEach(role => {
        contract.state.activities = [{ id: 'activity-a', open: true }, { id: 'activity-b', open: true }];
        contract.ui.selectedActivityId = null;
        contract.ui.view = 'overview';
        contract.ui.tab = 'overview';
        contract.ui.records.scope = 'all';
        contract.ui.recordContextMode = 'active-intelligence';
        contract.ui.formContext = 'field_intelligence';
        contract.setUser({ authenticated: true, role });
        contract.setMobile(false);
        contract.applyInitialLanding({ explicitSelectedActivityId: 'activity-a' });
        assert.deepStrictEqual({
            view: contract.ui.view,
            tab: contract.ui.tab,
            scope: contract.ui.records.scope,
            recordContextMode: contract.ui.recordContextMode,
            formContext: contract.ui.formContext
        }, {
            view: 'workspace',
            tab: 'records',
            scope: 'entry',
            recordContextMode: 'visitor',
            formContext: 'visitor'
        }, `${role} desktop normal entry must land on Visitor Add Record`);
    });
}

async function assertOverviewLoadOptimizationContract(managementSource, apiSource, routesSource, controllerSource) {
    assert(apiSource.includes('getOverviewSummary(query)'), 'client API must expose a lightweight Overview summary request');
    assert(apiSource.includes('return request(`/overview-summary${suffix}`);'), 'Overview summary API must use the single summary endpoint');
    assert(routesSource.includes("router.get('/overview-summary', requireSubmissionListAccess, scopeSubmissionList"), 'Overview summary route must reuse existing submission-list auth boundaries');
    assert(controllerSource.includes('getOverviewSummary = async (req, res) =>'), 'controller must expose Overview summary handler');

    const loadOverviewDataSource = extractFunctionDeclaration(managementSource, 'loadOverviewData');
    assert(loadOverviewDataSource.includes('await refreshOverviewSummary('), 'initial Overview must load summary data');
    assert(!loadOverviewDataSource.includes('refreshOverviewRecords'), 'initial Overview must not call the legacy all-activity full-record refresh');
    assert(!managementSource.includes('Promise.all(activities.map(activity => loadRecordsForActivity(activity.id'), 'NO_INITIAL_ALL_ACTIVITY_FULL_SUBMISSION_FANOUT');
    assert(!managementSource.includes('async function refreshOverviewRecords'), 'legacy all-activity full-record refresh helper must be removed');
    assert(managementSource.includes("if (ui.tab === 'records' && ui.records.scope === 'entry')"), 'Records entry must use the staged published-form path');
    assert(managementSource.includes("startBackgroundRecordLoadForActivity(ui.selectedActivityId, { includeVoid: true });"), 'Records entry must start background full-record hydration');
    assert(managementSource.includes("else if (ui.tab === 'records' || ui.tab === 'analytics') await loadRecordsForActivity(ui.selectedActivityId, { includeVoid: true });"), 'Records history and Analytics must still load full records on demand');
    assert(managementSource.includes("if (ui.tab === 'overview' && ui.view === 'workspace') await loadPublishedFormForActivity(ui.selectedActivityId);"), 'selected activity Overview may load its one published form for field-count display');

    const harness = makeHarness();
    const summary = await harness.service.getOverviewSummary({ today: '2026-08-15', timezoneOffsetMinutes: 0 }, actor());
    assert.strictEqual(harness.calls.listSubmissions, undefined, 'Overview summary must not call full submission hydration');
    assert.strictEqual(harness.calls.getPublishedForm, undefined, 'Overview summary must not fetch every published form');
    assert.deepStrictEqual(harness.calls.listSubmissionOverviewRows.activityIds, [IDS.activity], 'Overview summary must request one lightweight multi-activity row set');
    assert.strictEqual(harness.calls.getOverviewAnswerRowsBySubmissionIds.length, 4, 'Overview low-count/recent summary may use lightweight answer projection');
    const activitySummary = summary.activities.find(item => item.activityId === IDS.activity);
    assert(activitySummary, 'Overview summary must include the activity row');
    assert.strictEqual(activitySummary.total, 4, 'Overview total must include void records like the previous activity table metric');
    assert.strictEqual(activitySummary.active, 3, 'Overview active count must exclude void records');
    assert.strictEqual(activitySummary.today, 1, 'Overview today count must use non-void records for the supplied local day');
    assert.strictEqual(activitySummary.recorders, 3, 'Overview recorder count must use unique non-void recorder user ids');
    assert.strictEqual(activitySummary.low, 2, 'Overview low-completeness count must preserve answered <= 1 semantics for non-void records');
    assert.strictEqual(activitySummary.recentRecords.length, 3, 'Overview recent projection must exclude void records');
    assert.strictEqual(activitySummary.recentRecords[0].id, IDS.activeAiSubmission, 'Overview recent projection must be newest-first');
}

function assertCardAssistShortTextMappingBuilderContract(managementSource) {
    const source = [
        "const fieldTypes = [['section_heading', 'Section'], ['information_text', 'Info'], ['short_text', 'Short'], ['long_text', 'Long'], ['number', 'Number'], ['yes_no', 'Yes No'], ['single_choice', 'Single'], ['multiple_choice', 'Multiple'], ['dropdown', 'Dropdown']];",
        "const specialDesignerTypes = [['form_thumbnail', 'Thumbnail'], ['card_link', 'Card Link']];",
        "const choiceFieldTypes = ['single_choice', 'multiple_choice', 'dropdown'];",
        "const previewPlacementValues = new Set(['none', 'primary', 'badges', 'text']);",
        "const previewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'multiple_choice', 'dropdown']);",
        "const compactPreviewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);",
        "const cardAssistRoles = new Set(['person_name', 'job_title', 'company_name']);",
        "const cardAssistRoleLabels = Object.freeze({ person_name: '姓名', job_title: '職稱', company_name: '公司名稱' });",
        "const cardLinkHelperCopy = 'Card link';",
        "const thumbnailDefaults = Object.freeze({ driveFileId: '', fit: 'cover', focalX: 50, focalY: 50, zoom: 1 });",
        "const thumbnailFitOptions = new Set(['cover', 'contain']);",
        "const Store = { clone(value) { return JSON.parse(JSON.stringify(value)); }, escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); } };",
        "function newUuid() { return '99999999-9999-4999-8999-999999999999'; }",
        extractFunctionDeclaration(managementSource, 'fieldTypeLabel'),
        "function option(value, label, selected) { return `<option value=\"${Store.escapeHtml(value)}\" ${String(value) === String(selected) ? 'selected' : ''}>${Store.escapeHtml(label)}</option>`; }",
        extractFunctionDeclaration(managementSource, 'clampNumber'),
        extractFunctionDeclaration(managementSource, 'normalizeThumbnailSettings'),
        extractFunctionDeclaration(managementSource, 'thumbnailSettingsForItem'),
        extractFunctionDeclaration(managementSource, 'normalizeOptionEntries'),
        extractFunctionDeclaration(managementSource, 'normalizePreviewPlacement'),
        extractFunctionDeclaration(managementSource, 'makeCardLinkItem'),
        extractFunctionDeclaration(managementSource, 'makeFormThumbnailItem'),
        extractFunctionDeclaration(managementSource, 'normalizeDesignerItem'),
        extractFunctionDeclaration(managementSource, 'designerItemSignature'),
        extractFunctionDeclaration(managementSource, 'designerItemsEqual'),
        extractFunctionDeclaration(managementSource, 'renderCardAssistDesignerControls'),
        extractFunctionDeclaration(managementSource, 'serializeDraftItems'),
        '({ normalizeDesignerItem, designerItemsEqual, renderCardAssistDesignerControls, serializeDraftItems });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const roles = ['', 'person_name', 'job_title', 'company_name'];
    const visibleLabels = ['不帶入', '姓名', '職稱', '公司名稱'];
    const optionValues = html => Array.from(html.matchAll(/<option value="([^"]*)"/g)).map(match => match[1]);
    const optionLabels = html => Array.from(html.matchAll(/<option value="[^"]*"[^>]*>([^<]*)<\/option>/g)).map(match => match[1]);
    const shortItem = {
        item_key: IDS.textKey,
        field_id: IDS.textKey,
        item_type: 'short_text',
        title: 'Unrelated visible title',
        settings: {}
    };
    const normalizedShort = contract.normalizeDesignerItem(shortItem);
    assert.strictEqual(normalizedShort.type, 'short_text');
    assert.strictEqual(normalizedShort.itemKey, IDS.textKey);
    const shortHtml = contract.renderCardAssistDesignerControls(normalizedShort);
    assert(shortHtml.includes('id="aim-field-card-assist-role"'), 'short_text settings UI must expose the Card Assist mapping select');
    assert(shortHtml.includes('名片帶入資料'), 'short_text setting label must use final Card Assist copy');
    assert(shortHtml.includes('選擇此欄位要從名片帶入的資料。'), 'short_text mapping helper must use final Card Assist copy');
    assert.deepStrictEqual(optionValues(shortHtml), roles, 'Card Assist mapping options must use only canonical role values plus unset');
    assert.deepStrictEqual(optionLabels(shortHtml), visibleLabels, 'Card Assist visible option labels must use final copy');
    assert.deepStrictEqual(optionValues(contract.renderCardAssistDesignerControls(contract.normalizeDesignerItem({
        ...shortItem,
        item_key: IDS.numberKey,
        title: 'Another unrelated title',
        settings: { enableCardAssist: false }
    }))), roles, 'short_text mapping UI must not depend on title or section enable state');
    ['visitor', 'field_intelligence'].forEach(formContext => {
        const item = contract.normalizeDesignerItem({ ...shortItem, item_key: `${formContext}-field`, field_id: `${formContext}-field` });
        assert(contract.renderCardAssistDesignerControls(item).includes('aim-field-card-assist-role'), `${formContext} short_text must use the shared mapping UI`);
    });
    ['section_heading', 'information_text', 'long_text', 'number', 'yes_no', 'single_choice', 'multiple_choice', 'dropdown'].forEach(type => {
        const html = contract.renderCardAssistDesignerControls(contract.normalizeDesignerItem({
            itemKey: `${type}-field`,
            type,
            title: type,
            settings: { cardAssistField: 'person_name' }
        }));
        assert(!html.includes('aim-field-card-assist-role'), `${type} must not expose cardAssistField mapping`);
    });
    const sectionHtml = contract.renderCardAssistDesignerControls(contract.normalizeDesignerItem({
        itemKey: 'section-field',
        type: 'section_heading',
        title: 'Section',
        settings: { enableCardAssist: true }
    }));
    assert(sectionHtml.includes('aim-field-enable-card-assist'), 'section_heading must keep its enableCardAssist control');
    assert(sectionHtml.includes('讓此區段啟用「名片帶入」'), 'section_heading checkbox must use final Card Assist copy');
    assert(sectionHtml.includes('啟用後，請在本區段的文字欄位設定名片帶入的資料。'), 'section_heading helper must use final Card Assist copy');
    assert(!sectionHtml.includes('aim-field-card-assist-role'), 'section_heading must not expose cardAssistField');
    const baseDraft = contract.normalizeDesignerItem(shortItem);
    const setMapping = (draft, value) => {
        const role = ['person_name', 'job_title', 'company_name'].includes(value) ? value : '';
        const settings = { ...(draft.settings || {}) };
        if (role) settings.cardAssistField = role;
        else delete settings.cardAssistField;
        return contract.normalizeDesignerItem({ ...draft, cardAssistField: role, settings });
    };
    const personDraft = setMapping(baseDraft, 'person_name');
    assert.strictEqual(personDraft.settings.cardAssistField, 'person_name', 'mapping changes must update the current field draft settings');
    assert.strictEqual(personDraft.cardAssistField, 'person_name');
    assert(!contract.designerItemsEqual(baseDraft, personDraft), 'mapping-only changes must be detected as real item changes');
    assert(contract.renderCardAssistDesignerControls(personDraft).includes('value="person_name" selected'), 'reselect hydration must render the saved mapping selected');
    roles.slice(1).forEach(role => {
        const mapped = setMapping(baseDraft, role);
        const serialized = contract.serializeDraftItems([mapped])[0];
        assert.strictEqual(serialized.settings.cardAssistField, role, `${role} must survive field apply and draft serialization`);
    });
    const cleared = setMapping(personDraft, '');
    assert.strictEqual(cleared.cardAssistField, '');
    assert(!Object.prototype.hasOwnProperty.call(cleared.settings, 'cardAssistField'), 'clearing the mapping must remove the persisted setting');
    assert(!Object.prototype.hasOwnProperty.call(contract.serializeDraftItems([cleared])[0].settings, 'cardAssistField'), 'cleared mapping must stay removed during serialization');
    assert(managementSource.includes('updateFormDesignDraft({ cardAssistField: role, settings });'), 'Card Assist select must update the actual field draft');
    assert(managementSource.includes('cardAssistField: normalized.cardAssistField ||'), 'designer dirty-state signature must include cardAssistField');
    assert(managementSource.includes('item.type || item.itemType || item.item_type'), 'browser item normalization must accept backend item_type shape');
    assert(!managementSource.includes('title.includes'), 'Card Assist mapping must not infer roles from visible titles');
}

function assertLongTextPreviewExplicitDesignerStateContract(managementSource) {
    const source = [
        "const formContextVisitorMode = 'visitor';",
        "const formContextFieldIntelligenceMode = 'field_intelligence';",
        "const choiceFieldTypes = ['single_choice', 'multiple_choice', 'dropdown'];",
        "const previewPlacementValues = new Set(['none', 'primary', 'badges', 'text']);",
        "const previewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'multiple_choice', 'dropdown']);",
        "const compactPreviewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);",
        "const fixedPreviewFieldIds = new Set();",
        "const cardAssistRoles = new Set(['person_name', 'job_title', 'company_name']);",
        "const Store = { clone(value) { return JSON.parse(JSON.stringify(value)); }, escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); } };",
        "function newUuid() { return '99999999-9999-4999-8999-999999999999'; }",
        "function fieldTypeLabel(type) { return type; }",
        "function makeCardLinkItem(item) { return { ...item, type: 'card_link', itemKey: item.itemKey || 'card', fieldId: item.fieldId || item.itemKey || 'card', options: [], optionEntries: [], settings: item.settings || {}, allowOther: false }; }",
        "function makeFormThumbnailItem(item) { return { ...item, type: 'form_thumbnail', itemKey: item.itemKey || 'thumb', fieldId: item.fieldId || item.itemKey || 'thumb', options: [], optionEntries: [], settings: item.settings || {}, allowOther: false }; }",
        "function thumbnailSettingsForItem() { return {}; }",
        "function thumbnailSourceForItem() { return ''; }",
        "function option(value, label, selected) { return `<option value=\"${Store.escapeHtml(value)}\" ${String(value) === String(selected) ? 'selected' : ''}>${Store.escapeHtml(label)}</option>`; }",
        "let currentContext = formContextVisitorMode;",
        "const activity = { formDesignRuntimeByContext: {} };",
        "function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : formContextVisitorMode; }",
        "function currentFormContext() { return currentContext; }",
        "function selectedActivity() { return activity; }",
        "function formDesign(sourceActivity, formContext) { const context = normalizeFormContext(formContext); return sourceActivity.formDesignRuntimeByContext[context]; }",
        extractFunctionDeclaration(managementSource, 'normalizeOptionEntries'),
        extractFunctionDeclaration(managementSource, 'designerItemKey'),
        extractFunctionDeclaration(managementSource, 'normalizePreviewPlacement'),
        extractFunctionDeclaration(managementSource, 'normalizeDesignerItem'),
        extractFunctionDeclaration(managementSource, 'previewPlacementForItem'),
        extractFunctionDeclaration(managementSource, 'isFixedPreviewField'),
        extractFunctionDeclaration(managementSource, 'isPreviewPlacementEligible'),
        extractFunctionDeclaration(managementSource, 'previewPlacementOptionsForField'),
        extractFunctionDeclaration(managementSource, 'effectiveDesignerPreviewPlacement'),
        extractFunctionDeclaration(managementSource, 'renderPreviewPlacementEditor'),
        extractFunctionDeclaration(managementSource, 'designerItemSignature'),
        extractFunctionDeclaration(managementSource, 'serializeDraftItems'),
        "({ activity, setContext(value) { currentContext = value; }, normalizeDesignerItem, renderPreviewPlacementEditor, effectiveDesignerPreviewPlacement, designerItemSignature, serializeDraftItems });"
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const checked = html => /id="aim-field-preview-enabled"[^>]*checked/.test(html);
    const item = (itemKey, title, settings) => contract.normalizeDesignerItem({
        itemKey,
        fieldId: itemKey,
        type: 'long_text',
        title,
        settings: settings || {}
    });

    const implicitFirst = item('implicit-first', '情報紀錄', {});
    contract.activity.formDesignRuntimeByContext.visitor = { draft: { items: [implicitFirst] } };
    contract.setContext('visitor');
    assert.strictEqual(contract.effectiveDesignerPreviewPlacement(implicitFirst), 'text', 'first long_text effective fallback remains available');
    assert.strictEqual(checked(contract.renderPreviewPlacementEditor(implicitFirst)), false, 'first long_text without explicit previewPlacement must render unchecked');

    const explicit = item('explicit-text', '情報紀錄', { previewPlacement: 'text' });
    assert.strictEqual(checked(contract.renderPreviewPlacementEditor(explicit)), true, 'explicit long_text previewPlacement=text must render checked');
    assert.strictEqual(contract.serializeDraftItems([explicit])[0].settings.previewPlacement, 'text', 'explicit long_text previewPlacement must survive serialization');
    assert.notStrictEqual(contract.designerItemSignature(implicitFirst, 'visitor'), contract.designerItemSignature(explicit, 'visitor'), 'explicit previewPlacement must affect dirty-state signature');

    const activeInfo = item('active-info', '情報紀錄', {});
    const activeFollow = item('active-follow', '後續動作', { previewPlacement: 'text' });
    contract.activity.formDesignRuntimeByContext.field_intelligence = { draft: { items: [activeInfo, activeFollow] } };
    contract.setContext('field_intelligence');
    assert.strictEqual(checked(contract.renderPreviewPlacementEditor(activeInfo)), false, 'Active first long_text fallback field must render unchecked without explicit setting');
    assert.strictEqual(checked(contract.renderPreviewPlacementEditor(activeFollow)), true, 'Active explicit second long_text field must render checked');

    const visitorInfo = item('visitor-info', '情報紀錄', { previewPlacement: 'text' });
    const visitorFollow = item('visitor-follow', '後續動作', { previewPlacement: 'text' });
    contract.activity.formDesignRuntimeByContext.visitor = { draft: { items: [visitorInfo, visitorFollow] } };
    contract.setContext('visitor');
    assert.strictEqual(checked(contract.renderPreviewPlacementEditor(visitorInfo)), true, 'Visitor first explicit long_text field must stay checked');
    assert.strictEqual(checked(contract.renderPreviewPlacementEditor(visitorFollow)), true, 'Visitor second explicit long_text field must stay checked');
    assert(managementSource.includes('updateFormDesignDraft({\n      previewPlacement: nextPlacement,\n      settings: {\n        ...(ui.formDesignDraft.settings || {}),\n        previewPlacement: nextPlacement\n      }\n    });'), 'preview toggle must continue writing previewPlacement and settings.previewPlacement');
    assert(managementSource.includes("items.filter(item => previewPlacementForItem(item) === 'text').length >= 2"), 'max-two explicit long_text validation must remain unchanged');
}

function assertVisitorRecordPreviewIdentityContract(managementSource) {
    const missingName = '未填姓名';
    const source = [
        "const formContextVisitorMode = 'visitor';",
        "const formContextFieldIntelligenceMode = 'field_intelligence';",
        "const cardAssistRoles = new Set(['person_name', 'job_title', 'company_name']);",
        "const compactPreviewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);",
        `const otherAnswerValue = ${JSON.stringify(OTHER_CHOICE_VALUE)};`,
        "const Store = { clone(value) { return JSON.parse(JSON.stringify(value)); }, answerText(value) { if (Array.isArray(value)) return value.filter(item => item != null && String(item).trim()).join(', '); return String(value == null ? '' : value); }, escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); } };",
        "function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : formContextVisitorMode; }",
        "function recordIsFieldIntelligence(record) { return normalizeFormContext(record && record.recordContext) === formContextFieldIntelligenceMode; }",
        "function normalizeDesignerItem(item) { const settings = item && item.settings && typeof item.settings === 'object' ? item.settings : {}; const fieldId = item.fieldId || item.field_id || item.itemKey || item.item_key || ''; const type = item.type || item.itemType || item.item_type || 'short_text'; const cardAssistField = type === 'short_text' && cardAssistRoles.has(String(item.cardAssistField || settings.cardAssistField || '').trim()) ? String(item.cardAssistField || settings.cardAssistField || '').trim() : ''; return { ...item, fieldId, type, title: item.title || '', settings, cardAssistField, previewPlacement: item.previewPlacement || settings.previewPlacement || '' }; }",
        "function recordEditFields(activity) { return (activity && activity.formFields || []).map(normalizeDesignerItem); }",
        "function previewPlacementForItem(item) { return item && item.previewPlacement || ''; }",
        extractFunctionDeclaration(managementSource, 'hasValue'),
        extractFunctionDeclaration(managementSource, 'answerProducingItems'),
        extractFunctionDeclaration(managementSource, 'snapshotRecordItems'),
        extractFunctionDeclaration(managementSource, 'otherAnswersForRecord'),
        extractFunctionDeclaration(managementSource, 'displayAnswerValue'),
        extractFunctionDeclaration(managementSource, 'cardAssistFieldRole'),
        extractFunctionDeclaration(managementSource, 'semanticPreviewField'),
        extractFunctionDeclaration(managementSource, 'activeIntelligencePreview'),
        extractFunctionDeclaration(managementSource, 'activeBoothSourceField'),
        extractFunctionDeclaration(managementSource, 'activeCompanySourceField'),
        extractFunctionDeclaration(managementSource, 'activeInformationTypeField'),
        extractFunctionDeclaration(managementSource, 'legacyPreviewField'),
        extractFunctionDeclaration(managementSource, 'categoricalValues'),
        extractFunctionDeclaration(managementSource, 'isChoiceField'),
        extractFunctionDeclaration(managementSource, 'recordPreview'),
        '({ recordPreview });'
    ].join('\n');
    const contract = vm.runInNewContext(source, {});
    const items = [
        { fieldId: 'topic', type: 'multiple_choice', title: '客戶關注議題', settings: { previewPlacement: 'badges' } },
        { fieldId: 'person', type: 'short_text', title: '訪談對象', settings: { cardAssistField: 'person_name' } },
        { fieldId: 'job', type: 'short_text', title: '職稱', settings: { cardAssistField: 'job_title' } },
        { fieldId: 'company', type: 'short_text', title: '公司名稱', settings: { cardAssistField: 'company_name' } }
    ];
    const visitorRecord = {
        id: 'visitor-semantic',
        recordContext: 'visitor',
        answers: {
            topic: ['IoT', '數位雙生', '客製開發'],
            person: '施俊晟',
            job: '主任',
            company: '台灣發那那'
        },
        submission: { card_id: null },
        formRuntimeSnapshot: { items }
    };
    const visitorPreview = contract.recordPreview(visitorRecord, {});
    assert.strictEqual(visitorPreview.customer, '施俊晟', 'Visitor preview must resolve person_name from Card Assist semantics');
    assert.strictEqual(visitorPreview.jobTitle, '主任', 'Visitor preview must resolve job_title from Card Assist semantics');
    assert.strictEqual(visitorPreview.company, '台灣發那那', 'Visitor preview must resolve company_name from Card Assist semantics');
    assert.notStrictEqual(visitorPreview.customer, 'IoT, 數位雙生, 客製開發', 'choice answers must not override semantic Visitor identity');
    assert.strictEqual(visitorRecord.submission.card_id, null, 'test fixture must prove card_id can be null while identity still resolves');

    const choiceOnlyVisitor = {
        id: 'visitor-choice-only',
        recordContext: 'visitor',
        answers: { topic: ['IoT', '數位雙生', '客製開發'] },
        formRuntimeSnapshot: { items: [items[0]] }
    };
    const choiceOnlyPreview = contract.recordPreview(choiceOnlyVisitor, {});
    assert.strictEqual(choiceOnlyPreview.customer || missingName, missingName, 'filled 客戶關注議題 must not become the Visitor name');

    const legacyVisitor = {
        id: 'visitor-legacy',
        recordContext: 'visitor',
        answers: { legacyName: 'Legacy Person' },
        formRuntimeSnapshot: { items: [{ fieldId: 'legacyName', type: 'short_text', title: '姓名' }] }
    };
    assert.strictEqual(contract.recordPreview(legacyVisitor, {}).customer, 'Legacy Person', 'missing semantic name must preserve safe legacy text identity fallback');

    const activeItems = [
        { fieldId: 'person', type: 'short_text', title: '訪談對象', settings: { cardAssistField: 'person_name' } },
        { fieldId: 'job', type: 'short_text', title: '職稱', settings: { cardAssistField: 'job_title' } },
        { fieldId: 'companyType', type: 'single_choice', title: '公司類型' },
        { fieldId: 'topic', type: 'multiple_choice', title: '情報主題' },
        { fieldId: 'booth', type: 'short_text', title: 'BOOTH名稱' },
        { fieldId: 'informationType', type: 'single_choice', title: '情報類型' }
    ];
    const activeRecord = {
        id: 'active-source',
        recordContext: 'field_intelligence',
        answers: {
            person: '施俊晟',
            job: '總經理',
            companyType: 'SI系統商(上層/OT層)',
            topic: ['IoT', '數位雙生'],
            booth: '麥當勞',
            informationType: '市場情報'
        },
        formRuntimeSnapshot: { items: activeItems }
    };
    const activePreview = contract.recordPreview(activeRecord, {});
    assert.strictEqual(activePreview.customer, '麥當勞', 'Active preview must prioritize BOOTH/source name');
    assert.strictEqual(activePreview.company, '市場情報', 'Active preview secondary value must use 情報類型');
    assert.strictEqual(activePreview.jobTitle, '', 'Active preview must not use Visitor job_title semantics');
    assert.notStrictEqual(activePreview.customer, '施俊晟', 'Active preview must not use Visitor person_name semantics');
    assert.notStrictEqual(activePreview.company, 'SI系統商(上層/OT層)', '公司類型 must not replace 情報類型 in Active preview');
    assert(activePreview.badgeGroups.some(group => group.field.fieldId === 'companyType'), 'other generic Active preview fields must remain available');
    assert(activePreview.badgeGroups.some(group => group.field.fieldId === 'topic'), 'additional generic Active preview badges must remain available');
    assert(!activePreview.badgeGroups.some(group => group.field.fieldId === 'informationType'), 'Active 情報類型 consumed by the subject must not duplicate in generic preview badges');
    assert(managementSource.includes("const explicitTextFields = items.filter(field => field.type === 'long_text' && previewPlacementForItem(field) === 'text').slice(0, 2);"), 'long-text preview selection logic must remain on the existing path');
    assert(managementSource.includes("fields.filter(field => field.type === 'long_text' && previewPlacementForItem(field) !== 'none').slice(0, 1);"), 'long-text preview fallback selection must remain unchanged');

    const implicitLongTextPreview = contract.recordPreview({
        id: 'implicit-long-text',
        recordContext: 'field_intelligence',
        answers: { note: 'first note', follow: 'second note' },
        formRuntimeSnapshot: { items: [
            { fieldId: 'note', type: 'long_text', title: '情報紀錄' },
            { fieldId: 'follow', type: 'long_text', title: '後續動作' }
        ] }
    }, {});
    assert.deepStrictEqual(implicitLongTextPreview.textPreviews.map(item => item.label), ['情報紀錄'], 'zero explicit long_text previews must preserve first-long-text runtime fallback');

    const explicitLongTextPreview = contract.recordPreview({
        id: 'explicit-long-text',
        recordContext: 'field_intelligence',
        answers: { note: 'first note', follow: 'second note' },
        formRuntimeSnapshot: { items: [
            { fieldId: 'note', type: 'long_text', title: '情報紀錄', settings: { previewPlacement: 'text' } },
            { fieldId: 'follow', type: 'long_text', title: '後續動作', settings: { previewPlacement: 'text' } }
        ] }
    }, {});
    assert.deepStrictEqual(explicitLongTextPreview.textPreviews.map(item => item.label), ['情報紀錄', '後續動作'], 'two explicit long_text previews must both remain selected for collapsed preview');

    const companyFallbackPreview = contract.recordPreview({
        id: 'active-company-fallback',
        recordContext: 'field_intelligence',
        answers: { company: '台灣發那那', informationType: '競品情報' },
        formRuntimeSnapshot: { items: [
            { fieldId: 'company', type: 'short_text', title: '公司名稱', settings: { cardAssistField: 'company_name' } },
            { fieldId: 'informationType', type: 'single_choice', title: '情報類型' }
        ] }
    }, {});
    assert.strictEqual(companyFallbackPreview.customer, '台灣發那那', 'Active preview can use company_name as source fallback');
    assert.strictEqual(companyFallbackPreview.company, '競品情報');

    const missingSourcePreview = contract.recordPreview({
        id: 'active-missing-source',
        recordContext: 'field_intelligence',
        answers: { informationType: '市場情報' },
        formRuntimeSnapshot: { items: [{ fieldId: 'informationType', type: 'single_choice', title: '情報類型' }] }
    }, {});
    assert.strictEqual(missingSourcePreview.customer, '未填攤位名稱', 'missing Active source must use the approved placeholder');
    assert.strictEqual(missingSourcePreview.company, '市場情報');

    const renderCardBody = extractFunctionDeclaration(managementSource, 'renderRecordCard');
    assert(renderCardBody.includes('const preview = recordPreview(record, activity);'), 'record cards must keep one shared preview source');
    assert.strictEqual((renderCardBody.match(/recordPreview\(record, activity\)/g) || []).length, 1, 'collapsed and expanded card header must not fork recordPreview logic');
    assert(!extractFunctionDeclaration(managementSource, 'renderInlineRecordDetail').includes('recordPreview(record, activity)'), 'expanded FORM detail must not introduce separate preview identity logic');
}

function assertRecordCardMetaResponsiveContract(managementSource, cssSource) {
    const metaSource = [
        "const formContextFieldIntelligenceMode = 'field_intelligence';",
        "const Store = { escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); }, formatDateTime(value) { return value; } };",
        "function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : 'visitor'; }",
        "function recordIsFieldIntelligence(record) { return normalizeFormContext(record && record.recordContext) === formContextFieldIntelligenceMode; }",
        "function recordIsContributorOnly(record) { return Boolean(record && record.contributorOnly); }",
        extractFunctionDeclaration(managementSource, 'renderRecordCardMeta'),
        '({ renderRecordCardMeta });'
    ].join('\n');
    const metaContract = vm.runInNewContext(metaSource, {});
    const scopedVisitorMeta = metaContract.renderRecordCardMeta({
        recordContext: 'visitor',
        status: 'active',
        createdByDisplayName: 'Recorder',
        createdAt: '2026-08-18 18:18',
        supplementalSummary: { additionalVisitorCount: 2, contributionCount: 1 }
    }, { name: '2026台北自動化國際大展' }, { answered: 11, total: 11, percent: 100 }, { showActivityName: false });
    const crossActivityMeta = metaContract.renderRecordCardMeta({
        recordContext: 'visitor',
        status: 'active',
        createdByDisplayName: 'Cross Recorder',
        createdAt: '2026-08-18 18:18',
        supplementalSummary: {}
    }, { name: '2026台北自動化國際大展' }, { answered: 9, total: 11, percent: 82 });
    const activeMeta = metaContract.renderRecordCardMeta({
        recordContext: 'field_intelligence',
        status: 'active',
        createdByDisplayName: 'TFC施俊晟',
        createdAt: '2026-08-19 08:20',
        supplementalSummary: {}
    }, { name: '2026台北自動化國際大展' }, { answered: 8, total: 8, percent: 100 }, { showActivityName: false });
    const mineMeta = metaContract.renderRecordCardMeta({
        recordContext: 'visitor',
        status: 'active',
        createdByDisplayName: 'Contributor',
        createdAt: '2026-08-19 08:20',
        contributorOnly: true,
        supplementalSummary: { myContribution: true }
    }, { name: '2026台北自動化國際大展' }, { answered: 7, total: 11, percent: 64 }, { showActivityName: false });

    assert(!scopedVisitorMeta.includes('aim-record-card-activity'), 'activity-scoped Record Cards must not repeat Activity name');
    assert(crossActivityMeta.includes('aim-record-card-activity') && crossActivityMeta.includes('2026台北自動化國際大展'), 'cross-activity renderer default must preserve Activity identity');
    assert(scopedVisitorMeta.indexOf('aim-record-card-time') < scopedVisitorMeta.indexOf('aim-record-card-recorder'), 'scoped metadata order must start with timestamp then recorder');
    assert(scopedVisitorMeta.indexOf('aim-record-card-recorder') < scopedVisitorMeta.indexOf('aim-record-card-completeness'), 'scoped metadata order must place completeness after recorder');
    assert(scopedVisitorMeta.includes('Recorder: Recorder'), 'recorder metadata must use exact Recorder: copy');
    assert(!scopedVisitorMeta.includes('紀錄者：'), 'old Record Card recorder copy must be removed from this presentation path');
    assert(scopedVisitorMeta.includes('aim-record-card-meta-labels'), 'metadata cues must render inside the completeness metadata group');
    assert(scopedVisitorMeta.indexOf('完整度') < scopedVisitorMeta.indexOf('同行 2'), '同行 cue must appear beside completeness');
    assert(scopedVisitorMeta.indexOf('完整度') < scopedVisitorMeta.indexOf('補充 1'), '補充 cue must appear beside completeness');
    assert(activeMeta.indexOf('完整度') < activeMeta.indexOf('主動'), '主動 cue must appear beside completeness');
    assert(mineMeta.indexOf('完整度') < mineMeta.indexOf('我有補充'), '我有補充 cue must appear beside completeness');
    assert(managementSource.includes("renderRecordCard(record, activity, 'all', { showActivityName: false })"), 'activity-scoped all-record cards must opt out of repeated Activity name');
    assert(managementSource.includes("renderRecordCard(record, activity, 'personal', { showActivityName: false })"), 'activity-scoped personal cards must opt out of repeated Activity name');

    const actionSource = [
        "function canHardDelete() { return false; }",
        "function canOpenRecordDrawer() { return false; }",
        extractFunctionDeclaration(managementSource, 'renderRecordReviewActions'),
        '({ renderRecordReviewActions });'
    ].join('\n');
    const actionContract = vm.runInNewContext(actionSource, {});
    const collapsedAction = actionContract.renderRecordReviewActions({ id: 'record-a' }, {}, 'all', false);
    assert(collapsedAction.includes('aim-record-action-label-desktop">查看</span>'), 'desktop Record expand action must keep framed 查看 copy');
    assert(collapsedAction.includes('aim-record-action-label-mobile">＋ 查看</span>'), 'mobile Record expand action copy must be exactly ＋ 查看');
    assert(!extractFunctionDeclaration(managementSource, 'renderAdditionalVisitorDetailRow').includes('aim-record-action-label-mobile'), 'Supplemental 查看 actions must not use the Record expand action label');

    const subjectSource = [
        "const formContextFieldIntelligenceMode = 'field_intelligence';",
        "const Store = { escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); } };",
        "function normalizeFormContext(value) { return value === formContextFieldIntelligenceMode ? formContextFieldIntelligenceMode : 'visitor'; }",
        "function recordIsFieldIntelligence(record) { return normalizeFormContext(record && record.recordContext) === formContextFieldIntelligenceMode; }",
        "function renderPreviewPrimaryGroup() { return '<span></span>'; }",
        "function priorityPill() { return '<span></span>'; }",
        extractFunctionDeclaration(managementSource, 'renderRecordCardSubject'),
        '({ renderRecordCardSubject });'
    ].join('\n');
    const subjectContract = vm.runInNewContext(subjectSource, {});
    const visitorSubject = subjectContract.renderRecordCardSubject({ recordContext: 'visitor' }, {
        customer: '施俊晟',
        jobTitle: '主任',
        company: '台灣發那那'
    });
    const activeSubject = subjectContract.renderRecordCardSubject({ recordContext: 'field_intelligence' }, {
        customer: '麥當勞',
        company: '市場情報'
    });
    assert(visitorSubject.includes('aim-record-subject-label">訪客</span>'), 'Visitor subject must render the lightweight 訪客 label');
    assert(visitorSubject.includes('aim-record-subject-label">公司</span>'), 'Visitor subject must render the lightweight 公司 label');
    assert(visitorSubject.includes('施俊晟') && visitorSubject.includes('主任') && visitorSubject.includes('台灣發那那'), 'Visitor subject values must remain unchanged');
    assert(activeSubject.includes('aim-record-subject-label">情報來源</span>'), 'Active subject must render the lightweight 情報來源 label');
    assert(activeSubject.includes('aim-record-subject-label">情報類型</span>'), 'Active subject must render the lightweight 情報類型 label');
    assert(activeSubject.includes('麥當勞') && activeSubject.includes('市場情報'), 'Active subject values must remain unchanged');

    const detailFieldSource = [
        "const Store = { escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); }, answerText(value) { return Array.isArray(value) ? value.join(', ') : String(value == null ? '' : value); } };",
        "function categoricalValues(value) { return Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []); }",
        "function answerBadgeClass() { return ''; }",
        "function answerBadgePaletteClass() { return ''; }",
        extractFunctionDeclaration(managementSource, 'renderRecordDetailCompactField'),
        extractFunctionDeclaration(managementSource, 'renderRecordDetailChoiceBadge'),
        extractFunctionDeclaration(managementSource, 'renderRecordDetailCompactCategoricalField'),
        extractFunctionDeclaration(managementSource, 'renderRecordDetailLongText'),
        '({ renderRecordDetailCompactField, renderRecordDetailCompactCategoricalField, renderRecordDetailLongText });'
    ].join('\n');
    const detailFieldContract = vm.runInNewContext(detailFieldSource, {});
    const shortTextHtml = detailFieldContract.renderRecordDetailCompactField({ type: 'short_text', title: 'Renamed Field' }, 'Alpha');
    const numberHtml = detailFieldContract.renderRecordDetailCompactField({ type: 'number', title: 'Count' }, 1);
    const singleChoiceHtml = detailFieldContract.renderRecordDetailCompactCategoricalField({ type: 'single_choice', title: 'Choice' }, 'A');
    const longTextHtml = detailFieldContract.renderRecordDetailLongText({ type: 'long_text', title: 'Long' }, 'Long value');
    assert(!shortTextHtml.includes('data-field-type='), 'alignment-only short_text schema marker must be removed');
    assert(!numberHtml.includes('data-field-type='), 'non-short compact fields must not keep alignment-only schema markers');
    assert(!singleChoiceHtml.includes('data-field-type='), 'compact categorical fields must not keep alignment-only schema markers');
    assert(!longTextHtml.includes('data-field-type='), 'long_text content fields must not receive compact-row schema marker');
    assert(!/data-title|nth-child|公司名稱|訪談對象|職稱|data-field-type/.test(extractFunctionDeclaration(managementSource, 'renderRecordDetailCompactField')), 'expanded detail compact markup must not keep title-based or alignment-only markers');

    const baseLabelRule = cssSource.match(/\.aim-record-context-label \{[\s\S]*?\n\}/);
    const supplementalLabelRule = cssSource.match(/\.aim-record-context-label-supplemental \{[\s\S]*?\n\}/);
    const mobileLabelRule = cssSource.match(/\.aim-record-card-meta \.aim-record-context-label \{[\s\S]*?\n  \}/);
    const subjectLabelRule = cssSource.match(/\.aim-record-subject-label \{[\s\S]*?\n\}/);
    const subjectPrimaryRules = Array.from(cssSource.matchAll(/\.aim-record-card-primary \{[\s\S]*?\n(?:  )?\}/g)).map(match => match[0]);
    const desktopSubjectPrimaryRule = subjectPrimaryRules[0] || '';
    const mobileSubjectPrimaryRule = subjectPrimaryRules[subjectPrimaryRules.length - 1] || '';
    const mobileMetaRule = cssSource.match(/\.aim-record-card-recorder,\n  \.aim-record-card-time \{[\s\S]*?\n  \}/);
    const mobileSubjectValueRule = cssSource.match(/\.aim-record-card-primary strong \{[\s\S]*?\n  \}/);
    const mobileJobRule = cssSource.match(/\.aim-record-card-job-title \{[\s\S]*?\n  \}/);
    const mobileCompanyRule = cssSource.match(/\.aim-record-card-company \{[\s\S]*?\n  \}/);
    const mobileBreakpointStart = cssSource.indexOf('@media (max-width: 640px)');
    const mobileBreakpointEnd = cssSource.indexOf('@media', mobileBreakpointStart + 1);
    const desktopCss = cssSource.slice(0, mobileBreakpointStart);
    const mobileCss = cssSource.slice(mobileBreakpointStart, mobileBreakpointEnd > -1 ? mobileBreakpointEnd : cssSource.length);
    const desktopInlineMetaRule = desktopCss.match(/\.aim-inline-record-meta \{[\s\S]*?\n\}/);
    const desktopInlineMetaItemRule = desktopCss.match(/\.aim-inline-record-meta>div \{[\s\S]*?\n\}/);
    const desktopInlineMetaLabelRule = desktopCss.match(/\.aim-inline-record-meta dt \{[\s\S]*?\n\}/);
    const desktopInlineMetaValueRule = desktopCss.match(/\.aim-inline-record-meta dd \{[\s\S]*?\n\}/);
    const mobileGenericCompactFieldRule = mobileCss.match(/\.aim-record-detail-field \{[\s\S]*?\n  \}/);
    const mobileCompactCategoricalRule = mobileCss.match(/\.aim-record-detail-field-categorical \{[\s\S]*?\n  \}/);
    const mobileCategoricalLabelRule = mobileCss.match(/\.aim-record-detail-field-categorical>\.aim-record-detail-label \{[\s\S]*?\n  \}/);
    const mobileCompactBadgesRule = mobileCss.match(/\.aim-record-detail-field-categorical>\.aim-answer-badges \{[\s\S]*?\n  \}/);
    const mobileInlineMetaRule = mobileCss.match(/\.aim-inline-record-meta \{[\s\S]*?\n  \}/);
    const mobileInlineMetaItemRule = mobileCss.match(/\.aim-inline-record-meta>div \{[\s\S]*?\n  \}/);
    const mobileInlineMetaLabelRule = mobileCss.match(/\.aim-inline-record-meta dt \{[\s\S]*?\n  \}/);
    const mobileInlineMetaValueRule = mobileCss.match(/\.aim-inline-record-meta dd \{[\s\S]*?\n  \}/);
    const mobileInlineMetaRules = [
        mobileInlineMetaRule && mobileInlineMetaRule[0],
        mobileInlineMetaItemRule && mobileInlineMetaItemRule[0],
        mobileInlineMetaLabelRule && mobileInlineMetaLabelRule[0],
        mobileInlineMetaValueRule && mobileInlineMetaValueRule[0]
    ].filter(Boolean).join('\n');
    assert(baseLabelRule && baseLabelRule[0].includes('border-radius: 999px;'), 'desktop metadata labels must use compact pill geometry');
    assert(baseLabelRule[0].includes('background: #f1eaff;') && baseLabelRule[0].includes('color: #5b3b91;'), '主動 must remain purple');
    assert(supplementalLabelRule && supplementalLabelRule[0].includes('background: var(--aim-blue-soft);') && supplementalLabelRule[0].includes('color: var(--aim-blue);'), 'Supplemental cues must remain blue');
    assert(baseLabelRule[0].includes('min-height: 20px;') && baseLabelRule[0].includes('font-size: 12px;'), 'compact metadata cues must share approximate height and font scale');
    assert(mobileLabelRule && mobileLabelRule[0].includes('border-radius: 4px;') && mobileLabelRule[0].includes('font-size: 10px;'), 'mobile metadata labels must keep compact rectangular geometry');
    assert(cssSource.includes('.aim-record-card-meta-labels'), 'completeness label group must have a shared wrapping style');
    assert(subjectLabelRule && subjectLabelRule[0].includes('font-weight: 400;') && subjectLabelRule[0].includes('color: var(--aim-muted-2);'), 'subject semantic labels must use quiet muted helper styling');
    assert(subjectLabelRule && !/border|background/.test(subjectLabelRule[0]), 'subject semantic labels must not be badges, pills, or framed controls');
    assert(desktopSubjectPrimaryRule.includes('display: flex;') && desktopSubjectPrimaryRule.includes('flex-direction: row;') && desktopSubjectPrimaryRule.includes('flex-wrap: wrap;'), 'desktop subject semantic pairs must share one horizontal flex row');
    assert(!/grid-template|display:\s*grid|table/.test(desktopSubjectPrimaryRule), 'desktop subject layout must not use a rigid table/grid structure');
    assert(mobileSubjectPrimaryRule.includes('flex-direction: column;') && mobileSubjectPrimaryRule.includes('flex-wrap: nowrap;'), 'mobile subject semantic pairs must remain two-line');
    assert(mobileMetaRule && mobileMetaRule[0].includes('font-weight: 400;'), 'mobile timestamp and Recorder metadata must not be artificially bold');
    assert(mobileSubjectValueRule && mobileSubjectValueRule[0].includes('font-weight: 400;'), 'mobile primary subject value must not be artificially bold');
    assert(mobileJobRule && mobileJobRule[0].includes('font-weight: 400;'), 'mobile Visitor job title must not be artificially bold');
    assert(mobileCompanyRule && mobileCompanyRule[0].includes('font-weight: 400;'), 'mobile company/information type value must not be artificially bold');
    assert(cssSource.includes('.aim-record-card-recorder') && cssSource.includes('.aim-record-card-time'), 'mobile recorder and timestamp must remain secondary metadata');
    assert(cssSource.includes('.aim-record-card-completeness') && cssSource.includes('flex: 1 1 100%;'), 'mobile completeness and labels must share one metadata row/group');
    assert(cssSource.includes('.aim-record-actions .aim-button[data-action="toggle-record-expansion"][aria-expanded="false"]'), 'mobile Record expand action must be scoped to the Record card toggle');
    assert(cssSource.includes('border-color: transparent;') && cssSource.includes('background: transparent;') && cssSource.includes('color: var(--aim-red);'), 'mobile Record expand action must be borderless theme-red text');
    assert(cssSource.includes('.aim-record-action-label-desktop') && cssSource.includes('.aim-record-action-label-mobile'), 'responsive action labels must preserve desktop and mobile copy separately');
    assert(cssSource.includes('.aim-record-actions .aim-button {\n    min-height: 28px;'), 'desktop Record action must retain the framed compact button family outside the mobile text-action override');
    assert(!/toggle-record-expansion[\s\S]*?!important/.test(cssSource), 'Record expand responsive CSS must not use !important');
    assert(desktopInlineMetaRule && desktopInlineMetaRule[0].includes('display: flex;') && desktopInlineMetaRule[0].includes('flex-wrap: wrap;') && desktopInlineMetaRule[0].includes('gap: 4px 16px;'), 'desktop expanded metadata must keep the accepted wrapping flex layout');
    assert(desktopInlineMetaItemRule && desktopInlineMetaItemRule[0].includes('flex: 1 1 112px;'), 'desktop expanded metadata columns must remain unchanged');
    assert(!mobileGenericCompactFieldRule || !mobileGenericCompactFieldRule[0].includes('grid-template-columns'), 'generic compact FORM fields must not receive the previous broad fixed-column treatment');
    assert(!mobileCss.includes('[data-field-type="short_text"]'), 'mobile short_text alignment selector must be removed with the experiment');
    assert(!mobileCss.includes('5.5em') && !mobileCss.includes('4.5em'), 'alignment magic widths must be removed from mobile CSS');
    assert(!mobileCss.includes('column-gap: 6px;'), 'alignment-specific short_text gap must be removed from mobile CSS');
    assert(mobileCompactCategoricalRule && mobileCompactCategoricalRule[0].includes('flex-wrap: wrap;'), 'mobile compact categorical rows must restore wrapping flex behavior');
    assert(mobileCategoricalLabelRule && mobileCategoricalLabelRule[0].includes('flex: 0 0 auto;'), 'mobile categorical labels must restore intrinsic-width behavior');
    assert(mobileCompactBadgesRule && mobileCompactBadgesRule[0].includes('flex: 1 0 max-content;') && mobileCompactBadgesRule[0].includes('overflow: visible;'), 'mobile compact choice values must restore pre-repair badge flow');
    assert(!mobileCss.includes('.aim-record-detail-field-categorical>.aim-answer-badges .aim-answer-badge'), 'mobile compact choice badges must not receive short_text truncation rules');
    assert(!mobileCss.includes('.aim-record-detail-field[data-field-type') && !mobileCss.includes('data-title'), 'mobile rollback must not leave schema-marker or title-specific alignment selectors');
    assert(mobileInlineMetaRule && mobileInlineMetaRule[0].includes('gap: 4px;'), 'mobile expanded metadata must use compact row spacing');
    assert(mobileInlineMetaItemRule && mobileInlineMetaItemRule[0].includes('display: flex;'), 'mobile expanded metadata items must become label/value rows');
    assert(mobileInlineMetaItemRule[0].includes('flex: 1 1 100%;') && mobileInlineMetaItemRule[0].includes('width: 100%;'), 'mobile expanded metadata items must consume full available width');
    assert(!mobileInlineMetaItemRule[0].includes('112px') && !mobileInlineMetaItemRule[0].includes('50%') && !mobileInlineMetaItemRule[0].includes('grid-template'), 'mobile expanded metadata must not keep narrow multi-column sizing');
    assert(mobileInlineMetaLabelRule && mobileInlineMetaLabelRule[0].includes('flex: 0 0 auto;'), 'mobile metadata labels must use natural compact width, not a fixed alignment column');
    assert(!mobileInlineMetaLabelRule[0].includes('max-width:') && !mobileInlineMetaLabelRule[0].includes('text-overflow: ellipsis;') && !mobileInlineMetaLabelRule[0].includes('white-space: nowrap;'), 'mobile metadata labels must not keep alignment-specific truncation');
    assert(mobileInlineMetaLabelRule[0].includes('font-size: 11px;') && mobileInlineMetaLabelRule[0].includes('font-weight: 400;') && mobileInlineMetaLabelRule[0].includes('line-height: 1.3;'), 'mobile metadata labels must match the mobile Record Card metadata tier');
    assert(desktopInlineMetaLabelRule && desktopInlineMetaLabelRule[0].includes('color: var(--aim-muted-2);'), 'expanded metadata labels must stay muted');
    assert(mobileInlineMetaValueRule && mobileInlineMetaValueRule[0].includes('flex: 1 1 auto;'), 'mobile metadata values, including activity and recent update, must receive flexible horizontal space');
    assert(mobileInlineMetaValueRule[0].includes('min-width: 0;') && mobileInlineMetaValueRule[0].includes('overflow-wrap: break-word;'), 'mobile metadata values must use natural wrapping behavior after alignment rollback');
    assert(!mobileInlineMetaValueRule[0].includes('white-space: nowrap;') && !mobileInlineMetaValueRule[0].includes('text-overflow: ellipsis;') && !mobileInlineMetaValueRule[0].includes('overflow: hidden;'), 'mobile metadata values must not keep alignment-specific truncation');
    assert(mobileInlineMetaValueRule[0].includes('font-size: 11px;') && mobileInlineMetaValueRule[0].includes('font-weight: 400;') && mobileInlineMetaValueRule[0].includes('line-height: 1.3;'), 'mobile metadata values must match the mobile Record Card metadata tier');
    assert(mobileMetaRule && mobileMetaRule[0].includes('font-size: 11px;') && mobileMetaRule[0].includes('font-weight: 400;'), 'Record Card metadata tier used for comparison must remain unchanged');
    assert(desktopInlineMetaValueRule && desktopInlineMetaValueRule[0].includes('color: #475569;'), 'desktop expanded metadata values must remain unchanged');
    assert(!mobileCss.includes('.aim-record-detail-choice h3 {') && !mobileCss.includes('.aim-record-detail-text h3 {'), 'mobile compact alignment must not affect content-style headings');
    assert(!mobileCss.includes('.aim-record-detail-text>div {') && !mobileCss.includes('.aim-record-detail-choice-list {'), 'mobile compact alignment must not affect long/content-style values');
    assert(desktopCss.match(/\.aim-record-detail-value \{[\s\S]*?font-size: 13px;/), 'business compact value font size must remain defined outside the mobile alignment patch');
    assert(!/font-weight:\s*(600|700|bold)/.test(mobileInlineMetaRules), 'mobile expanded metadata must not introduce bold labels or values');
    assert(!mobileInlineMetaRules.includes('.aim-record-detail-label') && !mobileInlineMetaRules.includes('.aim-record-detail-value'), 'mobile expanded metadata patch must not alter FORM answer typography');
    assert(!mobileInlineMetaRules.includes('.aim-record-card'), 'expanded metadata patch must not alter collapsed Record Card layout rules');
    assert(!mobileInlineMetaRules.includes('!important') && !mobileCss.includes('[data-field-type') && !mobileCss.includes('grid-template-columns: 4.5em'), 'mobile rollback CSS must not use !important or leave alignment-only selectors');
}

async function assertRawCardBatchEnrichmentContract() {
    const harness = makeHarness({ includeActiveAiSubmission: false });
    const duplicateSubmissionId = '77777777-7777-4777-8777-777777777776';
    const missingCardSubmissionId = '77777777-7777-4777-8777-777777777777';
    harness.submissions.set(duplicateSubmissionId, {
        ...harness.submissions.get(IDS.aiSubmission),
        id: duplicateSubmissionId,
        createdAt: '2026-08-16T11:00:00.000Z',
        updatedAt: '2026-08-16T11:00:00.000Z',
        cardId: IDS.card
    });
    harness.submissions.set(missingCardSubmissionId, {
        ...harness.submissions.get(IDS.aiSubmission),
        id: missingCardSubmissionId,
        createdAt: '2026-08-16T12:00:00.000Z',
        updatedAt: '2026-08-16T12:00:00.000Z',
        cardId: IDS.missingCard
    });

    const rows = await harness.service.listSubmissions(IDS.activity, { state: 'all' }, actor());

    assert.strictEqual(harness.calls.getRawContactByCardId || 0, 0, 'listSubmissions card enrichment must not use repeated single-card lookups');
    assert.strictEqual(harness.calls.getRawContactsByCardIds.length, 1, 'listSubmissions card enrichment must use one batch lookup');
    assert.deepStrictEqual(harness.calls.getRawContactsByCardIds[0], [IDS.card, IDS.missingCard], 'batch lookup must deduplicate card IDs and include missing IDs once');
    assert.deepStrictEqual(rows.map(row => row.id), [...harness.submissions.values()].map(row => row.id), 'batch enrichment must preserve submission ordering');

    const enriched = rows.find(row => row.id === IDS.aiSubmission);
    assert(enriched.card, 'matched RAW Contact must still enrich the submission');
    assert.strictEqual(enriched.card.cardId, IDS.card);
    assert.strictEqual(enriched.card.name, 'Card Name');
    assert.strictEqual(enriched.card.company, 'Card Co');
    assert.strictEqual(enriched.card.position, 'Buyer');
    assert.strictEqual(enriched.card.jobTitle, 'Buyer');
    assert.strictEqual(enriched.card.email, 'card@example.test');
    assert.strictEqual(enriched.card.mobile, '0912');
    assert.strictEqual(enriched.card.thumbnailUrl, '/api/external/thumbnail?fileId=drive-1');
    assert.strictEqual(rows.find(row => row.id === missingCardSubmissionId).card, null, 'unmatched RAW Contact must preserve null card behavior');
    assert.strictEqual(rows.find(row => row.id === IDS.voidSubmission).card, null, 'submissions without cardId must preserve original card behavior');
}

function assertRawCardBatchReaderSourceContract(rawContactSqlSource, serviceSource) {
    const enrichStart = serviceSource.indexOf('async _enrichSubmissionCards');
    const enrichEnd = serviceSource.indexOf('async _enrichSubmissionSummaries', enrichStart);
    const enrichSource = enrichStart >= 0 && enrichEnd > enrichStart ? serviceSource.slice(enrichStart, enrichEnd) : '';
    assert(rawContactSqlSource.includes('async getRawContactsByCardIds(cardIds)'), 'RAW reader must expose a narrow batch card lookup');
    assert(rawContactSqlSource.includes(".in('card_id', ids)"), 'RAW batch lookup must query card_id with an IN filter');
    assert(rawContactSqlSource.includes('return new Map();'), 'RAW batch lookup must safely return an empty map for empty input');
    assert(serviceSource.includes('getRawContactsByCardIds(uniqueCardIds)'), 'submission card enrichment must use the RAW card batch reader');
    assert(enrichSource && !enrichSource.includes('getRawContactByCardId'), 'submission card enrichment must not call the single-card reader');
    assert(enrichSource && !enrichSource.includes('Promise.all'), 'submission card enrichment must not substitute parallel N-plus-one requests');
    assert(!serviceSource.includes('submissions' + 'Profile'), 'temporary submissions profiling service plumbing must be removed');
    assert(!serviceSource.includes('card_batch' + '_query_ms'), 'temporary card batch timing must be removed');
    assert(!serviceSource.includes('card_enrichment' + '_ms'), 'temporary card enrichment timing must be removed');
}

function assertDriveThumbnailRepresentationContract(sources) {
    const serviceSource = sources.externalServiceSource;
    const controllerSource = sources.externalControllerSource;
    const managementSource = sources.managementSource;
    const contactsSource = sources.contactsSource;
    const leadsSource = sources.leadsSource;
    const fanucCardMainListStart = leadsSource.indexOf('function createCardHTML(lead)');
    const fanucCardMainListEnd = leadsSource.indexOf('function openPreview(driveLink)', fanucCardMainListStart);
    const fanucCardMainListSource = fanucCardMainListStart >= 0 && fanucCardMainListEnd > fanucCardMainListStart
        ? leadsSource.slice(fanucCardMainListStart, fanucCardMainListEnd)
        : '';
    const thumbnailBranchStart = serviceSource.indexOf('if (representation === DRIVE_THUMBNAIL_REPRESENTATION)');
    const sourceBranchStart = serviceSource.indexOf("const response = await drive.files.get(", thumbnailBranchStart);
    const thumbnailBranch = thumbnailBranchStart >= 0 && sourceBranchStart > thumbnailBranchStart
        ? serviceSource.slice(thumbnailBranchStart, sourceBranchStart)
        : '';

    assert(serviceSource.includes("fields: 'thumbnailLink,mimeType'"), 'Drive thumbnail representation must use Drive thumbnailLink metadata');
    assert(serviceSource.includes('const auth = await this.googleClientService.getAuthClient();'), 'private Drive thumbnailLink must be fetched with existing Google credentials');
    assert(serviceSource.includes("alt: 'media'"), 'source representation must preserve the original Drive media stream path');
    assert(thumbnailBranch && !thumbnailBranch.includes("alt: 'media'"), 'thumbnail representation must not fall back to original media streaming');
    assert(controllerSource.includes('const { fileId, link, representation, profile } = req.query;'), 'Drive thumbnail controller must pass representation/profile through');
    assert(controllerSource.includes('X-Drive-Image-Representation'), 'Drive thumbnail controller must expose representation diagnostics');

    assert(contactsSource.includes("crmDriveImageProxyUrl(contact.driveLink, 'thumbnail', 'crm')"), 'CRM raw list must request thumbnail representation');
    assert(contactsSource.includes("crmDriveImageProxyUrl(contact.driveLink, 'source')"), 'CRM edit/full preview must request source representation');
    assert(leadsSource.includes("const LEAD_LIST_PAGE_SIZE = 50;"), 'FANUC card page size must remain 50 records');
    assert(fanucCardMainListSource.includes("leadDriveImageProxyUrl(lead.driveLink, 'source')"), 'FANUC card main list must request source representation');
    assert(!fanucCardMainListSource.includes("leadDriveImageProxyUrl(lead.driveLink, 'thumbnail', 'card')"), 'FANUC card main list must not request Drive thumbnail representation');
    assert(fanucCardMainListSource.includes('data-source-url="${imageUrl}"'), 'FANUC card main list source URL must be deferred until near viewport');
    assert(!fanucCardMainListSource.includes('<img src="${imageUrl}"'), 'FANUC card main list must not make source images immediately eligible');
    assert(leadsSource.includes('new IntersectionObserver'), 'FANUC card main list must use IntersectionObserver for near-viewport loading');
    assert(leadsSource.includes('root: null'), 'FANUC card observer must use the browser viewport root');
    assert(leadsSource.includes("rootMargin: FANUC_CARD_IMAGE_PRELOAD_ROOT_MARGIN"), 'FANUC card observer must use the declared preload margin');
    assert(leadsSource.includes('disconnectLeadCardImageObserver();'), 'FANUC card rerender must disconnect stale observed nodes');
    assert(leadsSource.includes('observeLeadCardImages();'), 'FANUC card rerender must register the current page images');
    assert(leadsSource.includes("leadDriveImageProxyUrl(driveLink, 'source')"), 'FANUC card lightbox must request source representation');
    assert(leadsSource.includes("leadDriveImageProxyUrl(lead.driveLink, 'source')"), 'FANUC card edit preview must request source representation');

    assert(managementSource.includes("thumbnailUrl: rawCardImageUrl({ driveLink: card.driveLink || card.drive_link || '', driveFileId }, { representation: 'thumbnail', profile: 'card' })"), 'RAW card normalization must create a card-list thumbnail URL');
    assert(managementSource.includes("sourceUrl: rawCardImageUrl({ driveLink: card.driveLink || card.drive_link || '', driveFileId }, { representation: 'source' })"), 'RAW card normalization must create an original/source URL');
    assert(managementSource.includes("thumbnailProfile: 'forms'"), 'Forms linked-card thumbnails must use the compact forms profile');
    assert(managementSource.includes("const imageUrl = size === 'large'"), 'RAW card visual renderer must branch large viewer images away from thumbnails');
    assert(managementSource.includes("? (normalized.sourceUrl || rawCardImageUrl(normalized, { representation: 'source' }))"), 'RAW card large viewer must prefer source/original media');
    assert(managementSource.includes("renderRawCardVisual(card, 'large')"), 'RAW card viewer must keep the large-source render path');
}

async function main() {
    const { service, calls, publishedItems } = makeHarness();

    await assertRawCardBatchEnrichmentContract();

    await service.createActivity({
        name: 'Created',
        formOpenStart: '2026-08-01',
        formOpenEnd: '2026-08-31',
        createdByUserId: 'spoof',
        items: [{ itemKey: IDS.textKey, type: 'short_text', title: 'Client Injected' }]
    }, actor());
    assert.strictEqual(calls.createActivity.p_activity.created_by_user_id, 'real-user');
    assert.strictEqual(calls.createActivity.p_activity.created_by_display_name, 'Real User');
    assert(calls.createActivity.p_items.every(item => /^[0-9a-f-]{36}$/i.test(item.item_key)));
    assert(!calls.createActivity.p_items.some(item => item.title === 'Client Injected'));

    await assertRejectsStatus(() => service.createActivity({ formOpenStart: '2026-08-01', formOpenEnd: '2026-08-31' }, actor()), 400);
    await assertRejectsStatus(() => service.createActivity({ name: 'Bad', formOpenStart: '2026-08-31', formOpenEnd: '2026-08-01' }, actor()), 400);
    await assertRejectsStatus(() => service.saveDraft(IDS.activity, { items: [{ itemKey: 'fdp_section_visit', type: 'section_heading', title: 'Bad key' }] }, actor()), 400);

    const activity = await service.getActivity(IDS.activity);
    assert.strictEqual(activity.id, IDS.activity);
    assert(activity.status && ['upcoming', 'open', 'ended'].includes(activity.status.key));

    const settingsHarness = makeHarness({
        activitySettings: {
            formAssistSuggestionSourceActivityIds: [IDS.otherActivity],
            untouched: 'keep'
        }
    });
    await settingsHarness.service.updateActivity(IDS.activity, {
        settings: {
            aiAnalysisQuickQuestions: ['  First question  ', '', 'Third question', 'Ignored question']
        }
    }, actor());
    assert.deepStrictEqual(settingsHarness.calls.updateActivity.row.settings.formAssistSuggestionSourceActivityIds, [IDS.otherActivity]);
    assert.strictEqual(settingsHarness.calls.updateActivity.row.settings.untouched, 'keep');
    assert.deepStrictEqual(settingsHarness.calls.updateActivity.row.settings.aiAnalysisQuickQuestions, ['First question', '', 'Third question']);
    await assertRejectsCode(() => settingsHarness.service.updateActivity(IDS.activity, {
        settings: { aiAnalysisQuickQuestions: 'invalid' }
    }, actor()), 'AI_ANALYSIS_INVALID_QUICK_QUESTIONS');
    const malformedSettingsHarness = makeHarness({
        activitySettings: { aiAnalysisQuickQuestions: 'invalid' }
    });
    const malformedSettingsActivity = await malformedSettingsHarness.service.getActivity(IDS.activity);
    assert(!Object.prototype.hasOwnProperty.call(malformedSettingsActivity.settings, 'aiAnalysisQuickQuestions'));

    const retrieve74 = retrieveIot(service, 74);
    assert.strictEqual(retrieve74.totalMatching, 74);
    assert.strictEqual(retrieve74.returnedCount, 74);
    assert.strictEqual(retrieve74.retrieved, 74);
    assert.strictEqual(retrieve74.records.length, 74);
    assert.strictEqual(retrieve74.truncated, false);
    assert.strictEqual(retrieve74.explicitLimit, null);

    const retrieve120 = retrieveIot(service, 120);
    assert.strictEqual(retrieve120.totalMatching, 120);
    assert.strictEqual(retrieve120.returnedCount, 120);
    assert.strictEqual(retrieve120.records.length, 120);
    assert.strictEqual(retrieve120.truncated, false);

    const retrieve200 = retrieveIot(service, 200);
    assert.strictEqual(retrieve200.totalMatching, 200);
    assert.strictEqual(retrieve200.returnedCount, 200);
    assert.strictEqual(retrieve200.records.length, 200);
    assert.strictEqual(retrieve200.truncated, false);

    const retrieveLimited = retrieveIot(service, 74, { limit: 5 });
    assert.strictEqual(retrieveLimited.totalMatching, 74);
    assert.strictEqual(retrieveLimited.returnedCount, 5);
    assert.strictEqual(retrieveLimited.retrieved, 5);
    assert.strictEqual(retrieveLimited.records.length, 5);
    assert.strictEqual(retrieveLimited.truncated, true);
    assert.strictEqual(retrieveLimited.explicitLimit, 5);

    const aggregate74 = aggregateIot(service, 74);
    assert.strictEqual(aggregate74.aggregate, 'count');
    assert.strictEqual(aggregate74.groupBy, 'none');
    assert.strictEqual(aggregate74.total, 74);

    const originalPublishedTitle = publishedItems[0].title;
    await service.saveDraft(IDS.activity, {
        items: [
            { itemKey: IDS.textKey, type: 'short_text', title: 'Draft Text', visible: false },
            { itemKey: IDS.choiceKey, type: 'multiple_choice', title: 'Choice', options: ['Ignored'], optionEntries: [{ optionKey: IDS.optionAlpha, label: 'Alpha', value: 'Alpha' }] },
            { itemKey: IDS.cardKey, type: 'card_link', title: 'Card', removedInDraft: true }
        ]
    }, actor());
    assert.strictEqual(calls.saveDraft.p_form_context, 'visitor');
    assert.strictEqual(calls.saveDraft.p_items[0].title, 'Draft Text');
    assert.strictEqual(calls.saveDraft.p_items[0].is_hidden, true);
    assert.strictEqual(calls.saveDraft.p_items[2].is_removed, true);
    assert.strictEqual(calls.saveDraft.p_items[1].options[0].optionKey, IDS.optionAlpha);
    assert.strictEqual(calls.saveDraft.p_items[1].options[0].label, 'Alpha');
    assert.strictEqual(publishedItems[0].title, originalPublishedTitle);

    await service.publishDraft(IDS.activity, actor());
    assert.strictEqual(calls.publishDraft.p_activity_id, IDS.activity);
    assert.strictEqual(calls.publishDraft.p_form_context, 'visitor');
    assert.strictEqual(calls.publishDraft.p_actor.userId, 'real-user');
    assert.strictEqual(calls.getFormBundle.formContext, 'visitor');

    await service.createSubmission(IDS.activity, {
        cardId: IDS.card,
        answers: {
            [IDS.textKey]: 'hello',
            [IDS.numberKey]: '42',
            [IDS.boolKey]: 'yes',
            [IDS.choiceKey]: ['Alpha']
        },
        otherAnswers: {
            [IDS.choiceKey]: 'custom'
        }
    }, actor());
    const answerByFormItemId = new Map(calls.createSubmission.p_answers.map(row => [row.form_item_id, row]));
    assert.strictEqual(calls.getPublishedForm.formContext, 'visitor');
    assert.strictEqual(calls.createSubmission.p_submission.record_context, 'visitor');
    assert.strictEqual(answerByFormItemId.get(IDS.textItem).value_text, 'hello');
    assert.strictEqual(answerByFormItemId.get(IDS.numberItem).value_number, 42);
    assert.strictEqual(answerByFormItemId.get(IDS.boolItem).value_boolean, true);
    assert.strictEqual(answerByFormItemId.get(IDS.choiceItem).value_jsonb[0].optionKey, IDS.optionAlpha);
    assert.strictEqual(answerByFormItemId.get(IDS.choiceItem).other_text, 'custom');
    assert(!answerByFormItemId.has(IDS.cardItem));

    const contextHarness = makeHarness();
    const fieldPublished = await contextHarness.service.getPublishedForm(IDS.activity, 'field_intelligence');
    assert.strictEqual(contextHarness.calls.getPublishedForm.formContext, 'field_intelligence');
    assert.strictEqual(fieldPublished.formContext, 'field_intelligence');
    await contextHarness.service.saveDraft(IDS.activity, {
        formContext: 'field_intelligence',
        items: [{ itemKey: IDS.textKey, type: 'short_text', title: 'Field Text' }]
    }, actor());
    assert.strictEqual(contextHarness.calls.saveDraft.p_form_context, 'field_intelligence');
    assert.strictEqual(contextHarness.calls.getFormBundle.formContext, 'field_intelligence');
    await contextHarness.service.saveDraft(IDS.activity, {
        formContext: 'field_intelligence',
        items: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'A', settings: { enableCardAssist: true } },
            { itemKey: IDS.numberKey, type: 'short_text', title: 'Display A', settings: { cardAssistField: 'person_name' } },
            { itemKey: IDS.boolKey, type: 'section_heading', title: 'B', settings: { enableCardAssist: true } },
            { itemKey: IDS.choiceKey, type: 'short_text', title: 'Display B', settings: { cardAssistField: 'person_name' } },
            { itemKey: IDS.longKey, type: 'long_text', title: 'No mapping', settings: { cardAssistField: 'company_name' } }
        ]
    }, actor());
    assert.strictEqual(contextHarness.calls.saveDraft.p_items[0].settings.enableCardAssist, true);
    assert.strictEqual(contextHarness.calls.saveDraft.p_items[1].settings.cardAssistField, 'person_name');
    assert.strictEqual(contextHarness.calls.saveDraft.p_items[3].settings.cardAssistField, 'person_name');
    assert(!contextHarness.calls.saveDraft.p_items[4].settings.cardAssistField);
    await contextHarness.service.saveDraft(IDS.activity, {
        formContext: 'field_intelligence',
        items: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'Dup', settings: { enableCardAssist: true } },
            { itemKey: IDS.numberKey, type: 'short_text', title: 'One', settings: { cardAssistField: 'person_name' } },
            { itemKey: IDS.boolKey, type: 'short_text', title: 'Two', settings: { cardAssistField: 'person_name' } }
        ]
    }, actor());
    assert.strictEqual(contextHarness.calls.saveDraft.p_items[1].settings.cardAssistField, 'person_name');
    assert.strictEqual(contextHarness.calls.saveDraft.p_items[2].settings.cardAssistField, 'person_name');
    const cardAssistDraftVariants = {
        none: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'Off', settings: { enableCardAssist: false } }
        ],
        zero: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'Empty', settings: { enableCardAssist: true } }
        ],
        one: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'One', settings: { enableCardAssist: true } },
            { itemKey: IDS.numberKey, type: 'short_text', title: 'A', settings: { cardAssistField: 'person_name' } }
        ],
        two: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'Two', settings: { enableCardAssist: true } },
            { itemKey: IDS.numberKey, type: 'short_text', title: 'A', settings: { cardAssistField: 'person_name' } },
            { itemKey: IDS.boolKey, type: 'short_text', title: 'B', settings: { cardAssistField: 'company_name' } }
        ],
        three: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'Three', settings: { enableCardAssist: true } },
            { itemKey: IDS.numberKey, type: 'short_text', title: 'A', settings: { cardAssistField: 'person_name' } },
            { itemKey: IDS.boolKey, type: 'short_text', title: 'B', settings: { cardAssistField: 'job_title' } },
            { itemKey: IDS.choiceKey, type: 'short_text', title: 'C', settings: { cardAssistField: 'company_name' } }
        ],
        reused: [
            { itemKey: IDS.textKey, type: 'section_heading', title: 'A', settings: { enableCardAssist: true } },
            { itemKey: IDS.numberKey, type: 'short_text', title: 'A1', settings: { cardAssistField: 'person_name' } },
            { itemKey: IDS.boolKey, type: 'section_heading', title: 'B', settings: { enableCardAssist: true } },
            { itemKey: IDS.choiceKey, type: 'short_text', title: 'B1', settings: { cardAssistField: 'person_name' } }
        ]
    };
    for (const draftItems of Object.values(cardAssistDraftVariants)) {
        const publishHarness = makeHarness({ draftItemsByContext: { field_intelligence: draftItems } });
        await publishHarness.service.publishDraft(IDS.activity, actor(), 'field_intelligence');
        assert.strictEqual(publishHarness.calls.publishDraft.p_form_context, 'field_intelligence');
    }
    const duplicatePublishHarness = makeHarness({
        draftItemsByContext: {
            field_intelligence: [
                { itemKey: IDS.textKey, type: 'section_heading', title: 'Dup', settings: { enableCardAssist: true } },
                { itemKey: IDS.numberKey, type: 'short_text', title: 'One', settings: { cardAssistField: 'person_name' } },
                { itemKey: IDS.boolKey, type: 'short_text', title: 'Two', settings: { cardAssistField: 'person_name' } }
            ]
        }
    });
    await assertRejectsCode(() => duplicatePublishHarness.service.publishDraft(IDS.activity, actor(), 'field_intelligence'), 'DUPLICATE_CARD_ASSIST_FIELD');
    await contextHarness.service.publishDraft(IDS.activity, actor(), 'field_intelligence');
    assert.strictEqual(contextHarness.calls.publishDraft.p_form_context, 'field_intelligence');
    await contextHarness.service.createSubmission(IDS.activity, {
        recordContext: 'field_intelligence',
        answers: { [IDS.textKey]: 'field note' }
    }, actor());
    assert.strictEqual(contextHarness.calls.getPublishedForm.formContext, 'field_intelligence');
    assert.strictEqual(contextHarness.calls.createSubmission.p_submission.record_context, 'field_intelligence');
    await contextHarness.service.listSubmissions(IDS.activity, { recordContext: 'visitor' });
    assert.strictEqual(contextHarness.calls.listSubmissions.filters.recordContext, 'visitor');
    await assertRejectsCode(() => contextHarness.service.getPublishedForm(IDS.activity, 'invalid'), 'INVALID_FORM_CONTEXT');

    const missingContextHarness = makeHarness({ missingFormContexts: ['field_intelligence'] });
    const initializedForm = await missingContextHarness.service.initializeFormContext(IDS.activity, {
        formContext: 'field_intelligence'
    }, actor());
    assert.strictEqual(missingContextHarness.calls.initializeFormContext.p_activity_id, IDS.activity);
    assert.strictEqual(missingContextHarness.calls.initializeFormContext.p_form_context, 'field_intelligence');
    assert.strictEqual(initializedForm.published.formContext, 'field_intelligence');
    assert.strictEqual(initializedForm.draft.formContext, 'field_intelligence');
    assert.strictEqual(initializedForm.published.versionNumber, 1);
    assert.strictEqual(initializedForm.draft.versionNumber, 2);
    assert.deepStrictEqual(initializedForm.published.items, []);
    assert.deepStrictEqual(initializedForm.draft.items, []);
    assert.notDeepStrictEqual(initializedForm.draft.items, publishedItems);

    await service.updateSubmission(IDS.oldSubmission, { cardId: IDS.secondCard }, actor());
    assert.strictEqual(calls.updateSubmission.p_card_id, IDS.secondCard);
    assert.strictEqual(calls.updateSubmission.p_answers[0].form_item_id, IDS.oldTextItem);
    assert.strictEqual(calls.updateSubmission.p_answers[0].value_text, 'existing answer');

    await service.updateSubmission(IDS.oldSubmission, { answers: { [IDS.oldTextKey]: 'historical edit' } }, actor());
    assert.strictEqual(calls.updateSubmission.p_card_id, IDS.card);
    assert.strictEqual(calls.updateSubmission.p_answers[0].form_item_id, IDS.oldTextItem);
    assert.strictEqual(calls.updateSubmission.p_answers[0].value_text, 'historical edit');

    await assertRejectsStatus(() => service.createSubmission(IDS.activity, { cardId: IDS.missingCard }, actor()), 404);
    const enriched = await service.getSubmission(IDS.oldSubmission);
    assert.strictEqual(enriched.recordContext, 'visitor');
    assert.strictEqual(enriched.card.cardId, IDS.card);
    assert.strictEqual(enriched.card.thumbnailUrl, '/api/external/thumbnail?fileId=drive-1');

    const supplementalHarness = makeHarness();
    const supplementalListBefore = await supplementalHarness.service.listSubmissions(IDS.activity, { recordContext: 'visitor' }, actor());
    assert.strictEqual(supplementalHarness.calls.getSupplementSummariesBySubmissionIds, 1);
    assert.strictEqual(supplementalListBefore.find(record => record.id === IDS.oldSubmission).supplements, null);
    await supplementalHarness.service.saveAdditionalVisitor(IDS.oldSubmission, {
        cardId: IDS.secondCard,
        personalInterest: 'Create path interest',
        actor: { userId: 'browser-must-not-win' },
        cardSnapshot: { name: 'Browser Must Not Win', card_id: IDS.card }
    }, actor());
    const createSupplementCall = supplementalHarness.calls.saveAdditionalVisitorHistory[0];
    assert.strictEqual(createSupplementCall.p_supplement_id, null);
    assert.strictEqual(createSupplementCall.p_card_id, IDS.secondCard);
    assert.strictEqual(createSupplementCall.p_actor.userId, 'real-user');
    assert.strictEqual(createSupplementCall.p_card_snapshot.cardId, IDS.secondCard);
    assert.strictEqual(createSupplementCall.p_personal_interest, 'Create path interest');
    assert.strictEqual(supplementalHarness.calls.createSubmissionCount || 0, 0);
    assert(!JSON.stringify(createSupplementCall).includes('Browser Must Not Win'));
    assert(!JSON.stringify(supplementalHarness.submissions.get(IDS.oldSubmission).answers).includes('Create path interest'));
    const createSupplementDetail = await supplementalHarness.service.getSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(createSupplementDetail.supplementalSummary.additionalVisitorCount, 1);
    assert.strictEqual(createSupplementDetail.supplements.additionalVisitors[0].supplementId, IDS.createdAdditionalVisitorSupplement);
    assert.strictEqual(createSupplementDetail.supplements.additionalVisitors[0].personalInterest, 'Create path interest');
    await supplementalHarness.service.saveAdditionalVisitor(IDS.oldSubmission, {
        supplementId: IDS.additionalVisitorSupplement,
        cardId: IDS.secondCard,
        personalInterest: 'Robotics procurement',
        actor: { userId: 'browser-must-not-win' },
        cardSnapshot: { name: 'Browser Must Not Win', card_id: IDS.card }
    }, actor());
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_supplement_id, IDS.additionalVisitorSupplement);
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_id, IDS.secondCard);
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_actor.userId, 'real-user');
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot.name, 'Card Name');
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot.company, 'Card Co');
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot.cardId, IDS.secondCard);
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot.card_id, undefined);
    assert(!JSON.stringify(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot).includes('Browser Must Not Win'));
    assert.strictEqual(supplementalHarness.calls.createSubmissionCount || 0, 0);
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitorHistory[1].p_supplement_id, IDS.additionalVisitorSupplement);
    const supplementalDetail = await supplementalHarness.service.getSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(supplementalDetail.supplementalSummary.additionalVisitorCount, 2);
    const updatedSupplement = supplementalDetail.supplements.additionalVisitors.find(entry => entry.supplementId === IDS.additionalVisitorSupplement);
    assert.strictEqual(updatedSupplement.personalInterest, 'Robotics procurement');
    assert.strictEqual(updatedSupplement.cardSnapshot.name, 'Card Name');
    await assertRejectsCode(() => supplementalHarness.service.saveAdditionalVisitor(IDS.oldSubmission, {
        supplementId: 'not-a-uuid',
        cardId: IDS.secondCard
    }, actor()), 'INVALID_UUID');
    const supplementalListAfter = await supplementalHarness.service.listSubmissions(IDS.activity, { recordContext: 'visitor' }, actor());
    const supplementalListRow = supplementalListAfter.find(record => record.id === IDS.oldSubmission);
    assert.strictEqual(supplementalListRow.supplementalSummary.additionalVisitorCount, 2);
    assert.strictEqual(supplementalListRow.supplements, null);
    await supplementalHarness.service.upsertMyContribution(IDS.oldSubmission, { note: 'Follow up from contributor' }, actor());
    assert.strictEqual(supplementalHarness.calls.upsertMyContribution.p_note, 'Follow up from contributor');
    assert.strictEqual(supplementalHarness.calls.upsertMyContribution.p_actor.userId, 'real-user');
    const contributionDetail = await supplementalHarness.service.getSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(contributionDetail.supplementalSummary.contributionCount, 1);
    assert.strictEqual(contributionDetail.supplementalSummary.myContribution.note, 'Follow up from contributor');
    assert.strictEqual(contributionDetail.supplements.contributions.length, 1);
    await assertRejectsCode(() => supplementalHarness.service.upsertMyContribution(IDS.aiSubmission, { note: 'creator note' }, {
        username: 'analyst',
        displayName: 'Analyst',
        role: 'recorder'
    }), 'PRIMARY_RECORDER_CONTRIBUTION_FORBIDDEN');
    await assertRejectsCode(() => supplementalHarness.service.saveAdditionalVisitor(IDS.activeAiSubmission, {
        supplementId: IDS.additionalVisitorSupplement,
        cardId: IDS.card
    }, actor()), 'SUPPLEMENT_CONTEXT_FORBIDDEN');

    await service.voidSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(calls.updateSubmissionStatus.status, 'void');
    await service.restoreSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(calls.updateSubmissionStatus.status, 'active');

    const aiCalls = [];
    const aiHarness = makeHarness({
        formAiTextGenerator: async payload => {
            aiCalls.push(payload);
            if (aiCalls.length % 2 === 1) {
                const activePlan = payload.userPrompt.includes('"analysisContext":"field_intelligence"');
                return JSON.stringify({
                    strategy: 'tool_query',
                    intent: 'contract test',
                    toolCalls: [
                        {
                            tool: 'retrieve_submissions',
                            arguments: activePlan
                                ? { fields: [IDS.activeLongKey], limit: 10 }
                                : { limit: 10 }
                        }
                    ]
                });
            }
            return aiCalls.length === 2 ? '第一個完整分析結果' : '第二個完整分析結果';
        }
    });
    const aiResult = await aiHarness.service.analyzeActivity(IDS.activity, { question: '請分析主要需求' }, actor());
    assert.deepStrictEqual(aiResult, { completed: true, answer: '第一個完整分析結果' });
    assert.strictEqual(aiHarness.calls.listSubmissions.activityId, IDS.activity);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateStart, null);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateEnd, null);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.includeVoid, false);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.recordContext, 'visitor');
    assert.strictEqual(aiHarness.calls.getPublishedForm.formContext, 'visitor');
    assert(aiCalls[0].userPrompt.includes('"analysisContext":"visitor"'));
    assert(aiCalls[1].userPrompt.includes('"analysisContext":"visitor"'));
    assert(aiCalls[0].systemInstruction.includes('資料查詢規劃器'));
    assert(aiCalls[0].systemInstruction.includes('domainContext'));
    assert(aiCalls[0].systemInstruction.includes('FORM 工具證據'));
    assert(aiCalls[0].systemInstruction.includes('CUSTOMER FORM EVIDENCE FIRST'));
    assert(aiCalls[0].systemInstruction.includes('不得決定預設查詢主題'));
    assert(aiCalls[0].userPrompt.includes('domainContext'));
    assert(aiCalls[1].systemInstruction.includes('表單資料分析助手'));
    assert(aiCalls[1].systemInstruction.includes('一般回答不得輸出'));
    assert(aiCalls[1].systemInstruction.includes('EVIDENCE FIRST, DOMAIN INTERPRETATION SECOND'));
    assert(aiCalls[1].systemInstruction.includes('domainContext 單獨不足以支撐結論'));
    assert(aiCalls[1].systemInstruction.includes('不要把 Domain Lens 類別當 checklist'));
    assert(aiCalls[1].userPrompt.includes('先提供 evidence，再提供次要 domainContext'));
    assert(aiCalls[1].userPrompt.includes('不要暴露內部工具或識別碼'));
    assert(aiCalls[1].userPrompt.indexOf('"evidence"') < aiCalls[1].userPrompt.indexOf('"domainContext"'));
    assert(aiCalls[1].userPrompt.includes('完整長文字需求：客戶正在評估自動化產線'));
    assert(aiCalls[1].userPrompt.includes('Card Co'));
    assert(aiCalls[1].userPrompt.includes('RAW note'));
    assert(aiCalls[1].userPrompt.includes('UNIQUE_VISITOR_SIGNAL'));
    assert(!aiCalls[1].userPrompt.includes('UNIQUE_ACTIVE_SIGNAL'));
    assert(!aiCalls[1].userPrompt.includes('This void answer must not reach Gemini context.'));
    assert(!aiCalls[1].userPrompt.includes('optionKey'));
    assert(!Object.prototype.hasOwnProperty.call(aiResult, 'model'));

    const activeAiResult = await aiHarness.service.analyzeActivity(IDS.activity, { question: 'active signal', analysisContext: 'field_intelligence' }, actor());
    assert.strictEqual(activeAiResult.completed, true);
    assert(String(activeAiResult.answer || '').trim());
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.recordContext, 'field_intelligence');
    assert.strictEqual(aiHarness.calls.getPublishedForm.formContext, 'field_intelligence');
    assert(aiCalls[2].userPrompt.includes('"analysisContext":"field_intelligence"'));
    assert(aiCalls[3].userPrompt.includes('"analysisContext":"field_intelligence"'));
    assert(aiCalls[3].userPrompt.includes('UNIQUE_ACTIVE_SIGNAL'));
    assert(!aiCalls[3].userPrompt.includes('UNIQUE_VISITOR_SIGNAL'));

    const harmlessMetadataPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'metadata tolerance',
        rationale: 'planner note',
        toolCalls: [{
            tool: 'retrieve_submissions',
            reason: 'need customer text',
            arguments: { fields: [IDS.longKey], limit: 10 }
        }]
    });
    assert.deepStrictEqual(harmlessMetadataPlan.toolCalls, [{
        tool: 'retrieve_submissions',
        arguments: { fields: [IDS.longKey], limit: 10 }
    }]);
    const toolDefinitions = aiHarness.service._formAiToolDefinitions();
    toolDefinitions.forEach(definition => {
        const contract = aiHarness.service._formAiToolArgumentContract(definition.tool);
        assert.deepStrictEqual(
            Object.keys(definition.arguments).sort(),
            contract.executableKeys.slice().sort()
        );
    });
    const metadataShapesPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'metadata shapes',
        toolCalls: [{
            tool: 'retrieve_submissions',
            arguments: {
                fields: [IDS.longKey],
                limit: 10,
                reason: 'need customer text',
                rationale: 'planner rationale',
                description: 'descriptive planner note',
                explanation: 'why this tool is relevant',
                intent: 'retrieve supporting evidence'
            }
        }]
    });
    assert.deepStrictEqual(metadataShapesPlan.toolCalls, [{
        tool: 'retrieve_submissions',
        arguments: { fields: [IDS.longKey], limit: 10 }
    }]);
    const promotedRuntimePlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'promoted filter fields',
        toolCalls: [{
            tool: 'aggregate_submissions',
            arguments: {
                aggregate: 'count',
                groupBy: 'none',
                fields: [{ field: 'topicField', values: ['IoT'] }]
            }
        }]
    });
    assert.deepStrictEqual(promotedRuntimePlan.toolCalls[0].arguments, {
        aggregate: 'count',
        groupBy: 'none',
        filters: { fields: [{ field: 'topicField', values: ['IoT'] }] }
    });
    const promotedRuntimeResult = aiHarness.service._executeFormAiAggregateTool(
        promotedRuntimePlan.toolCalls[0].arguments,
        makeRetrieveCompletenessContext(74)
    );
    assert.strictEqual(promotedRuntimeResult.total, 74);
    const promotedWithOtherFiltersPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'promoted filter fields with other filters',
        toolCalls: [{
            tool: 'aggregate_submissions',
            arguments: {
                aggregate: 'count',
                groupBy: 'none',
                filters: { dateStart: '2026-04-01' },
                fields: [{ field: 'topicField', values: ['IoT'] }]
            }
        }]
    });
    assert.deepStrictEqual(promotedWithOtherFiltersPlan.toolCalls[0].arguments, {
        aggregate: 'count',
        groupBy: 'none',
        filters: {
            dateStart: '2026-04-01',
            fields: [{ field: 'topicField', values: ['IoT'] }]
        }
    });
    const duplicatePromotedPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'duplicate promoted filter fields',
        toolCalls: [{
            tool: 'aggregate_submissions',
            arguments: {
                aggregate: 'count',
                groupBy: 'none',
                filters: { fields: [{ field: 'topicField', values: ['IoT'] }] },
                fields: [{ field: 'topicField', values: ['IoT'] }]
            }
        }]
    });
    assert.deepStrictEqual(duplicatePromotedPlan.toolCalls[0].arguments, {
        aggregate: 'count',
        groupBy: 'none',
        filters: { fields: [{ field: 'topicField', values: ['IoT'] }] }
    });
    const multiplePromotedPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'multiple promoted filter fields',
        toolCalls: [{
            tool: 'aggregate_submissions',
            arguments: {
                aggregate: 'count',
                groupBy: 'none',
                fields: [
                    { field: 'topicField', values: ['IoT'] },
                    { field: { itemKey: 'topicField' }, value: 'IoT' }
                ]
            }
        }]
    });
    assert.deepStrictEqual(multiplePromotedPlan.toolCalls[0].arguments, {
        aggregate: 'count',
        groupBy: 'none',
        filters: {
            fields: [
                { field: 'topicField', values: ['IoT'] },
                { field: { itemKey: 'topicField' }, value: 'IoT' }
            ]
        }
    });
    const ambiguousAliasWarnings = await captureConsoleWarn(async () => {
        const nonAsciiFieldTitle = String.fromCodePoint(0x6B04, 0x4F4D, 0x4E59);
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
            strategy: 'tool_query',
            intent: 'malformed promoted filter fields',
            toolCalls: [{
                tool: 'aggregate_submissions',
                arguments: {
                    aggregate: 'count',
                    groupBy: 'none',
                    fields: [{ badKey: nonAsciiFieldTitle }]
                }
            }]
        })), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
    });
    assert.strictEqual(ambiguousAliasWarnings.length, 1);
    assert.strictEqual(ambiguousAliasWarnings[0][0], '[ActivityIntelligence] FORM AI ambiguous semantic alias');
    assert.strictEqual(ambiguousAliasWarnings[0][1].tool, 'aggregate_submissions');
    assert.strictEqual(ambiguousAliasWarnings[0][1].alias, 'fields');
    assert.strictEqual(ambiguousAliasWarnings[0][1].category, 'ambiguous_semantic_alias');
    assert.strictEqual(ambiguousAliasWarnings[0][1].canonicalFiltersFieldsPresent, false);
    assert.strictEqual(ambiguousAliasWarnings[0][1].canonicalFiltersFieldsType, 'undefined');
    assert.strictEqual(ambiguousAliasWarnings[0][1].fieldsType, 'array');
    assert.strictEqual(ambiguousAliasWarnings[0][1].fieldsLength, 1);
    assert.deepStrictEqual(ambiguousAliasWarnings[0][1].fieldsItemTypes, ['object']);
    assert.deepStrictEqual(ambiguousAliasWarnings[0][1].fieldsObjectKeys, [['badKey']]);
    assert.deepStrictEqual(ambiguousAliasWarnings[0][1].fieldsItems[0], {
        type: 'object',
        keys: ['badKey'],
        identifiers: {}
    });
    const conflictingAliasWarnings = await captureConsoleWarn(async () => {
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
            strategy: 'tool_query',
            intent: 'conflicting promoted filter fields',
            toolCalls: [{
                tool: 'aggregate_submissions',
                arguments: {
                    aggregate: 'count',
                    groupBy: 'none',
                    filters: { fields: [{ field: 'topicField', values: ['MES'] }] },
                    fields: [{ field: 'topicField', values: ['IoT'] }]
                }
            }]
        })), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
    });
    assert.strictEqual(conflictingAliasWarnings.length, 1);
    assert.strictEqual(conflictingAliasWarnings[0][0], '[ActivityIntelligence] FORM AI ambiguous semantic alias');
    assert.strictEqual(conflictingAliasWarnings[0][1].category, 'conflicting_semantic_alias');
    assert.strictEqual(conflictingAliasWarnings[0][1].canonicalFiltersFieldsPresent, true);
    assert.strictEqual(conflictingAliasWarnings[0][1].canonicalFiltersFieldsType, 'array');
    assert.strictEqual(conflictingAliasWarnings[0][1].fieldsType, 'array');
    assert.strictEqual(conflictingAliasWarnings[0][1].fieldsLength, 1);
    const removedScalarAliasWarnings = await captureConsoleWarn(async () => {
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
            strategy: 'tool_query',
            intent: 'removed scalar fields alias',
            toolCalls: [{
                tool: 'aggregate_submissions',
                arguments: {
                    aggregate: 'count',
                    groupBy: 'field',
                    fields: 'field-a'
                }
            }]
        })), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
            strategy: 'tool_query',
            intent: 'removed scalar fields array alias',
            toolCalls: [{
                tool: 'aggregate_submissions',
                arguments: {
                    aggregate: 'count',
                    groupBy: 'field',
                    fields: ['field-a']
                }
            }]
        })), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
    });
    assert.strictEqual(removedScalarAliasWarnings.length, 2);
    assert(removedScalarAliasWarnings.every(entry => entry[1].category === 'ambiguous_semantic_alias'));
    const aggregateMetadataPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'count IoT',
        toolCalls: [{
            tool: 'aggregate_submissions',
            arguments: {
                aggregate: 'count',
                groupBy: 'none',
                filters: { fields: [{ field: { itemKey: 'topicField' }, values: ['IoT'] }] },
                intent: 'count records selecting IoT',
                reason: 'simple count'
            }
        }]
    });
    assert.deepStrictEqual(aggregateMetadataPlan.toolCalls, [{
        tool: 'aggregate_submissions',
        arguments: {
            aggregate: 'count',
            groupBy: 'none',
            filters: { fields: [{ field: { itemKey: 'topicField' }, values: ['IoT'] }] }
        }
    }]);
    const aggregateMetadataResult = aiHarness.service._executeFormAiAggregateTool(
        aggregateMetadataPlan.toolCalls[0].arguments,
        makeRetrieveCompletenessContext(74)
    );
    assert.strictEqual(aggregateMetadataResult.total, 74);
    const semanticWarnings = await captureConsoleWarn(async () => {
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
            strategy: 'tool_query',
            intent: 'semantic unknown',
            toolCalls: [{
                tool: 'aggregate_submissions',
                arguments: {
                    aggregate: 'count',
                    groupBy: 'none',
                    filters: { fields: [{ field: { itemKey: 'topicField' }, values: ['IoT'] }] },
                    operator: 'contains'
                }
            }]
        })), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
    });
    assert.strictEqual(semanticWarnings.length, 1);
    assert.strictEqual(semanticWarnings[0][0], '[ActivityIntelligence] FORM AI unsupported tool argument');
    assert.strictEqual(semanticWarnings[0][1].tool, 'aggregate_submissions');
    assert.deepStrictEqual(semanticWarnings[0][1].unsupportedKeys, ['operator']);
    assert(semanticWarnings[0][1].supportedKeys.includes('filters'));
    assert.strictEqual(semanticWarnings[0][1].category, 'semantic_or_unknown_argument');
    const strictExecutorWarnings = await captureConsoleWarn(async () => {
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._executeFormAiAggregateTool({
            aggregate: 'count',
            reason: 'planner note that should not reach executor'
        }, makeRetrieveCompletenessContext(1))), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
    });
    assert.strictEqual(strictExecutorWarnings.length, 1);
    assert.strictEqual(strictExecutorWarnings[0][1].category, 'executor_contract_violation');
    const strictAggregateFieldsWarnings = await captureConsoleWarn(async () => {
        await assertRejectsCode(() => Promise.resolve(aiHarness.service._executeFormAiAggregateTool({
            aggregate: 'count',
            groupBy: 'field',
            fields: 'topicField'
        }, makeRetrieveCompletenessContext(1))), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');
    });
    assert.strictEqual(strictAggregateFieldsWarnings.length, 1);
    assert.strictEqual(strictAggregateFieldsWarnings[0][1].category, 'executor_contract_violation');
    const directDomainPlan = aiHarness.service._validateFormAiPlan({
        strategy: 'direct_domain_answer',
        intent: 'terminology',
        toolCalls: []
    });
    assert.deepStrictEqual(directDomainPlan, {
        strategy: 'direct_domain_answer',
        intent: 'terminology',
        toolCalls: []
    });
    await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
        strategy: 'direct_domain_answer',
        intent: 'bad direct',
        toolCalls: [{ tool: 'retrieve_submissions', arguments: {} }]
    })), 'FORM_AI_PLANNER_INVALID_TOOL_COUNT');
    const plannerSystemInstruction = aiHarness.service._formAiPlannerSystemInstruction();
    assert(plannerSystemInstruction.includes('direct_domain_answer'));
    assert(plannerSystemInstruction.includes('complete enumeration'));
    assert(plannerSystemInstruction.includes('without a limit'));
    assert(plannerSystemInstruction.includes('exact internal glossary'));
    assert(plannerSystemInstruction.includes('Activity, customers, companies, people, submissions'));
    assert(plannerSystemInstruction.includes('Use only the documented executable argument keys'));
    assert(plannerSystemInstruction.includes('semantic arguments outside the documented contract are invalid'));
    const finalizerSystemInstruction = aiHarness.service._formAiFinalizerSystemInstruction();
    assert(finalizerSystemInstruction.includes('totalMatching'));
    assert(finalizerSystemInstruction.includes('returnedCount'));
    assert(finalizerSystemInstruction.includes('Answer the user question first'));
    assert(finalizerSystemInstruction.includes('Do not add a mandatory domain paragraph'));
    assert(finalizerSystemInstruction.includes('For simple deterministic counts'));
    assert(finalizerSystemInstruction.includes('concrete FORM evidence'));
    assert(finalizerSystemInstruction.includes('customer/person name'));
    assert(finalizerSystemInstruction.includes('Option Note'));
    assert(finalizerSystemInstruction.includes('must not replace available FORM evidence'));
    await assertRejectsCode(() => Promise.resolve(aiHarness.service._validateFormAiPlan({
        strategy: 'tool_query',
        intent: 'unsafe key',
        toolCalls: [{
            tool: 'retrieve_submissions',
            sql: 'select * from submissions',
            arguments: {}
        }]
    })), 'FORM_AI_UNSUPPORTED_TOOL_ARGUMENT');

    const mixedIsolationContext = {
        analysisContext: 'visitor',
        effectiveScope: { analysisContext: 'visitor' },
        formVersions: {
            version1: {
                fields: [
                    { itemKey: 'signalField', type: 'long_text', title: 'Signal' },
                    { itemKey: 'choiceSignal', type: 'single_choice', title: 'Choice Signal', options: [{ label: 'Visitor', value: 'Visitor' }, { label: 'Active', value: 'Active' }] }
                ]
            }
        },
        submissions: [
            {
                recordContext: 'visitor',
                status: 'active',
                createdAt: '2026-08-01T00:00:00.000Z',
                createdByDisplayName: 'Visitor Analyst',
                formVersionId: 'version1',
                answers: [
                    { itemKey: 'signalField', value: 'UNIQUE_VISITOR_SIGNAL', otherText: '' },
                    { itemKey: 'choiceSignal', value: 'Visitor', otherText: '' }
                ],
                rawCard: null
            },
            {
                recordContext: 'field_intelligence',
                status: 'active',
                createdAt: '2026-08-02T00:00:00.000Z',
                createdByDisplayName: 'Active Analyst',
                formVersionId: 'version1',
                answers: [
                    { itemKey: 'signalField', value: 'UNIQUE_ACTIVE_SIGNAL', otherText: '' },
                    { itemKey: 'choiceSignal', value: 'Active', otherText: '' }
                ],
                rawCard: null
            }
        ]
    };
    const visitorRetrieveIsolation = aiHarness.service._executeFormAiRetrieveTool({}, mixedIsolationContext);
    assert.strictEqual(visitorRetrieveIsolation.totalMatching, 1);
    assert.strictEqual(visitorRetrieveIsolation.filtersApplied.analysisContext, 'visitor');
    assert(JSON.stringify(visitorRetrieveIsolation).includes('UNIQUE_VISITOR_SIGNAL'));
    assert(!JSON.stringify(visitorRetrieveIsolation).includes('UNIQUE_ACTIVE_SIGNAL'));
    const visitorAggregateIsolation = aiHarness.service._executeFormAiAggregateTool({ aggregate: 'count', groupBy: 'none' }, mixedIsolationContext);
    assert.strictEqual(visitorAggregateIsolation.total, 1);
    assert.strictEqual(visitorAggregateIsolation.filtersApplied.analysisContext, 'visitor');
    const visitorFullTextIsolation = aiHarness.service._executeFormAiRetrieveTool({ fullTextScan: true }, mixedIsolationContext);
    assert.strictEqual(visitorFullTextIsolation.totalMatchingRecords, 1);
    assert.strictEqual(visitorFullTextIsolation.filtersApplied.analysisContext, 'visitor');
    assert(JSON.stringify(visitorFullTextIsolation).includes('UNIQUE_VISITOR_SIGNAL'));
    assert(!JSON.stringify(visitorFullTextIsolation).includes('UNIQUE_ACTIVE_SIGNAL'));
    mixedIsolationContext.analysisContext = 'field_intelligence';
    mixedIsolationContext.effectiveScope.analysisContext = 'field_intelligence';
    const activeRetrieveIsolation = aiHarness.service._executeFormAiRetrieveTool({}, mixedIsolationContext);
    assert.strictEqual(activeRetrieveIsolation.totalMatching, 1);
    assert.strictEqual(activeRetrieveIsolation.filtersApplied.analysisContext, 'field_intelligence');
    assert(JSON.stringify(activeRetrieveIsolation).includes('UNIQUE_ACTIVE_SIGNAL'));
    assert(!JSON.stringify(activeRetrieveIsolation).includes('UNIQUE_VISITOR_SIGNAL'));
    const activeAggregateIsolation = aiHarness.service._executeFormAiAggregateTool({ aggregate: 'count', groupBy: 'none' }, mixedIsolationContext);
    assert.strictEqual(activeAggregateIsolation.total, 1);
    assert.strictEqual(activeAggregateIsolation.filtersApplied.analysisContext, 'field_intelligence');
    const activeFullTextIsolation = aiHarness.service._executeFormAiRetrieveTool({ fullTextScan: true }, mixedIsolationContext);
    assert.strictEqual(activeFullTextIsolation.totalMatchingRecords, 1);
    assert.strictEqual(activeFullTextIsolation.filtersApplied.analysisContext, 'field_intelligence');
    assert(JSON.stringify(activeFullTextIsolation).includes('UNIQUE_ACTIVE_SIGNAL'));
    assert(!JSON.stringify(activeFullTextIsolation).includes('UNIQUE_VISITOR_SIGNAL'));

    const fullTextContext = {
        formVersions: {
            version1: {
                fields: [
                    { itemKey: 'companyField', type: 'short_text', title: '公司名稱' },
                    { itemKey: 'nameField', type: 'short_text', title: '客戶姓名' },
                    { itemKey: 'longAnswered', type: 'long_text', title: '情報紀錄' },
                    { itemKey: 'longEmpty', type: 'long_text', title: '後續動作' },
                    { itemKey: 'choiceWithNotes', type: 'multiple_choice', title: 'Choice With Notes', options: [{ label: 'Digital Twin', value: 'Digital Twin' }], allowOther: true }
                ]
            }
        },
        submissions: Array.from({ length: 167 }, (_, index) => ({
            status: 'active',
            createdAt: `2026-03-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
            createdByDisplayName: 'Analyst',
            formVersionId: 'version1',
            answers: [
                { itemKey: 'companyField', value: '中華精測科技股份有限公司', otherText: '' },
                { itemKey: 'nameField', value: `客戶${index + 1}`, otherText: '' },
                ...(index < 165 ? [{
                    itemKey: 'longAnswered',
                    value: index === 0 ? '可以去介紹，約時間，寄mail相關資料' : `長文字 ${index + 1}`,
                    otherText: ''
                }] : []),
                ...(index === 0 ? [{
                    itemKey: 'choiceWithNotes',
                    value: [
                        { label: 'Digital Twin', value: 'Digital Twin', note: 'PoC planned for December' },
                        { label: OTHER_CHOICE_VALUE, value: OTHER_CHOICE_VALUE, note: 'evaluate next PoC phase' }
                    ],
                    otherText: 'AI visual inspection'
                }] : [])
            ],
            rawCard: null,
            supplemental: index === 0 ? {
                additionalVisitors: [{
                    name: 'Supplement Visitor',
                    company: 'Supplement Co',
                    position: 'Procurement',
                    personalInterest: 'interested in wafer automation'
                }],
                contributions: [{
                    actorDisplayName: 'Contributor',
                    note: 'Contributor supplemental note about September follow-up'
                }]
            } : null
        }))
    };
    const fullTextScan = aiHarness.service._executeFormAiRetrieveTool({
        fullTextScan: true,
        fields: ['longEmpty'],
        filters: { fields: [{ field: { itemKey: 'longEmpty' }, values: ['拜訪'] }] },
        limit: 1
    }, fullTextContext);
    assert.strictEqual(fullTextScan.mode, 'full_long_text_scan');
    assert.strictEqual(fullTextScan.totalMatchingRecords, 167);
    assert.strictEqual(fullTextScan.recordsWithLongText, 165);
    assert.strictEqual(fullTextScan.totalLongTextAnswers, 165);
    assert.strictEqual(fullTextScan.retrievedLongTextAnswers, 165);
    assert.strictEqual(fullTextScan.totalOptionNoteAnswers, 2);
    assert.strictEqual(fullTextScan.retrievedOptionNoteAnswers, 2);
    assert.strictEqual(fullTextScan.recordsWithSupplementalEvidence, 1);
    assert(JSON.stringify(fullTextScan).includes('Contributor supplemental note about September follow-up'));
    assert(JSON.stringify(fullTextScan).includes('Supplement Visitor'));
    assert(JSON.stringify(fullTextScan).includes('PoC planned for December'));
    assert(JSON.stringify(fullTextScan).includes('AI visual inspection'));
    assert(!Object.prototype.hasOwnProperty.call(aiHarness.service._formAiChoiceValue({ label: 'Ignored Blank Note', value: 'Ignored Blank Note', note: '   ' }), 'note'));
    assert.strictEqual(fullTextScan.limitApplied, false);
    assert.strictEqual(fullTextScan.ignoredFieldFilters, true);
    assert(JSON.stringify(fullTextScan).includes('可以去介紹，約時間，寄mail相關資料'));
    assert(!/itemKey|formVersionId|submissionId|cardId|optionKey|longAnswered|version1/.test(JSON.stringify(fullTextScan)));

    const narrowRetrieve = aiHarness.service._executeFormAiRetrieveTool({ fields: ['longAnswered'], limit: 80 }, fullTextContext);
    assert.strictEqual(narrowRetrieve.retrieved, 80);
    assert.strictEqual(narrowRetrieve.totalMatching, 167);

    const optionNoteRetrieve = aiHarness.service._executeFormAiRetrieveTool({ fields: ['choiceWithNotes'], limit: 1 }, fullTextContext);
    const optionNoteJson = JSON.stringify(optionNoteRetrieve);
    assert(optionNoteJson.includes('PoC planned for December'));
    assert(optionNoteJson.includes('evaluate next PoC phase'));
    assert(optionNoteJson.includes('AI visual inspection'));
    assert(!optionNoteJson.includes('optionKey'));

    const optionNoteAggregate = aiHarness.service._executeFormAiAggregateTool({
        aggregate: 'count',
        groupBy: 'field',
        field: 'choiceWithNotes'
    }, fullTextContext);
    assert.strictEqual(optionNoteAggregate.selectionTotal, 2);
    assert.deepStrictEqual(optionNoteAggregate.rows.map(row => row.label).sort(), ['AI visual inspection', 'Digital Twin']);
    assert(!JSON.stringify(optionNoteAggregate).includes('PoC planned for December'));
    assert(!JSON.stringify(optionNoteAggregate).includes('Contributor supplemental note'));

    const entitySubstring = aiHarness.service._executeFormAiRetrieveTool({
        filters: { fields: [{ field: { itemKey: 'companyField' }, values: ['中華精測'] }] }
    }, fullTextContext);
    assert.strictEqual(entitySubstring.totalMatching, 167);

    await aiHarness.service.analyzeActivity(IDS.activity, {
        question: '只看 Analyst',
        filters: { start: '2026-07-01', end: '2026-09-10', recorder: 'Analyst' }
    }, actor());
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateStart, null);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateEnd, null);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.recorderDisplayName, 'Analyst');
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.recordContext, 'visitor');
    assert(!aiCalls[4].userPrompt.includes('第一個完整分析結果'));

    await assertRejectsCode(() => aiHarness.service.analyzeActivity(IDS.activity, { question: '' }, actor()), 'FORM_AI_EMPTY_QUESTION');
    await assertRejectsCode(() => aiHarness.service.analyzeActivity(IDS.activity, { question: 'no data', filters: { recorder: 'Nobody' } }, actor()), 'FORM_AI_NO_DATA');
    await assertRejectsCode(() => aiHarness.service.analyzeActivity(IDS.activity, { question: 'bad context', analysisContext: 'all' }, actor()), 'INVALID_FORM_CONTEXT');
    const emptyActiveHarness = makeHarness({
        includeActiveAiSubmission: false,
        formAiTextGenerator: async () => {
            throw new Error('zero active records must not call the AI provider');
        }
    });
    const emptyActiveResult = await emptyActiveHarness.service.analyzeActivity(IDS.activity, { question: 'active no data', analysisContext: 'field_intelligence' }, actor());
    assert.strictEqual(emptyActiveHarness.calls.listSubmissions.filters.recordContext, 'field_intelligence');
    assert.deepStrictEqual(emptyActiveResult, {
        completed: true,
        answer: '目前選取的分析範圍沒有可分析的有效表單紀錄。'
    });
    await assertRejectsCode(() => aiHarness.service.analyzeActivity(IDS.activity, { question: 'role' }, { ...actor(), role: 'recorder' }), 'FORM_AI_FORBIDDEN');

    const failingAiHarness = makeHarness({
        formAiTextGenerator: async () => {
            throw new Error('provider down');
        }
    });
    await assertRejectsCode(() => failingAiHarness.service.analyzeActivity(IDS.activity, { question: 'fail' }, actor()), 'FORM_AI_PROVIDER_ERROR');

    const originalKey = process.env.FORM_GEMINI_API_KEY;
    const originalModel = process.env.FORM_GEMINI_API_MODEL;
    delete process.env.FORM_GEMINI_API_KEY;
    process.env.FORM_GEMINI_API_MODEL = 'deployment-owned-model';
    const missingKeyHarness = makeHarness();
    await assertRejectsCode(() => missingKeyHarness.service.analyzeActivity(IDS.activity, { question: 'missing key' }, actor()), 'FORM_AI_NOT_CONFIGURED');
    process.env.FORM_GEMINI_API_KEY = 'deployment-owned-key';
    delete process.env.FORM_GEMINI_API_MODEL;
    const missingModelHarness = makeHarness();
    await assertRejectsCode(() => missingModelHarness.service.analyzeActivity(IDS.activity, { question: 'missing model' }, actor()), 'FORM_AI_NOT_CONFIGURED');
    if (originalKey === undefined) delete process.env.FORM_GEMINI_API_KEY;
    else process.env.FORM_GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.FORM_GEMINI_API_MODEL;
    else process.env.FORM_GEMINI_API_MODEL = originalModel;

    const managementSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'activity-intelligence', 'activity-intelligence-management.js'), 'utf8');
    const apiSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'activity-intelligence', 'activity-intelligence-api.js'), 'utf8');
    const routesSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'activity-intelligence.routes.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'activity-intelligence.controller.js'), 'utf8');
    const serviceSource = fs.readFileSync(path.join(__dirname, '..', 'services', 'activity-intelligence-service.js'), 'utf8');
    const externalServiceSource = fs.readFileSync(path.join(__dirname, '..', 'services', 'external-service.js'), 'utf8');
    const externalControllerSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'external.controller.js'), 'utf8');
    const contactsSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'contacts', 'contacts.js'), 'utf8');
    const leadsSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'leads-view.js'), 'utf8');
    const rawContactSqlSource = fs.readFileSync(path.join(__dirname, '..', 'data', 'raw-contact-sql-reader.js'), 'utf8');
    const cssSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles', 'activity-intelligence', 'activity-intelligence-management.css'), 'utf8');
    const activityIntelligenceSqlSource = fs.readFileSync(path.join(__dirname, '..', 'docs', 'schema', 'activity-intelligence-transactions-v1.sql'), 'utf8');
    assertRawCardBatchReaderSourceContract(rawContactSqlSource, serviceSource);
    assertDriveThumbnailRepresentationContract({ externalServiceSource, externalControllerSource, managementSource, contactsSource, leadsSource });
    assertFormAssistCjkContract(managementSource);
    assertVisitorKpiOtherNumericContract(managementSource);
    await assertVisitorKpiCacheHydrationContract(managementSource);
    assertMobileAnalyticsBreakpointRerenderContract(managementSource);
    assertContextFoundationSqlContract(activityIntelligenceSqlSource);
    assertDualStreamFormBuilderSourceContract(managementSource, apiSource, cssSource);
    await assertRealActiveIntelligenceRuntimeSourceContract(managementSource, cssSource, service);
    assertAnalyticsChartTypeImplementationContract(managementSource, cssSource);
    assertCompanyKpiDedupQualityV1Contract(managementSource, cssSource);
    assertLongTextPreviewExplicitDesignerStateContract(managementSource);
    assertVisitorRecordPreviewIdentityContract(managementSource);
    assertRecordCardMetaResponsiveContract(managementSource, cssSource);
    assertVisitorSupplementalRecordMvpSourceContract(managementSource, apiSource, cssSource, activityIntelligenceSqlSource);
    await assertOverviewLoadOptimizationContract(managementSource, apiSource, routesSource, controllerSource);
    assert(managementSource.includes("if (ui.analytics.ai.state === 'loading') return;"));
    assert(managementSource.includes("state === 'loading'"));
    assert(!managementSource.includes('FORM_GEMINI_API_KEY'));
    assert(!managementSource.includes('FORM_GEMINI_API_MODEL'));
    assert(!apiSource.includes('FORM_GEMINI_API_KEY'));
    assert(!apiSource.includes('FORM_GEMINI_API_MODEL'));

    const controller = new ActivityIntelligenceController({
        async getActivity() {
            const error = new Error('Activity not found.');
            error.statusCode = 404;
            throw error;
        }
    });
    const res = {
        code: null,
        body: null,
        status(code) {
            this.code = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    await controller.getActivity({ params: { activityId: 'missing' } }, res);
    assert.strictEqual(res.code, 404);
    assert.strictEqual(res.body.success, false);

    console.log('Activity Intelligence contract checks passed.');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
