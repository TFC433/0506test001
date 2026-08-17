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
            supplements.set(payload.p_supplement_id, {
                supplementId: payload.p_supplement_id,
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
            return { supplement_id: payload.p_supplement_id };
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

    return { service, calls, publishedItems, supplements };
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
    const bodyStart = source.indexOf('{', start);
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

function assertRealActiveIntelligenceRuntimeSourceContract(managementSource, cssSource, service) {
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
    assert(managementSource.includes('aim-record-context-label-mobile">主動</span>'), 'mobile active badge must use short label');
    assert(cssSource.includes('.aim-record-context-label-desktop') && cssSource.includes('display: none;'), 'mobile layout must hide the desktop active badge');
    assert(cssSource.includes('.aim-record-context-label-mobile') && cssSource.includes('border-radius: 4px'), 'mobile active badge must use compact rectangular styling');
    assert(!cssSource.includes('aim-record-card-active-intelligence-prototype'), 'prototype active record styling must be removed');
    assert(!cssSource.includes('aim-prototype-chart'), 'prototype analytics chart styling must be removed');
    assertCardAssistShortTextMappingBuilderContract(managementSource);
    assertActiveIntelligenceAnalyticsV1Contract(managementSource, cssSource);
    assertOtherHistorySuggestionsV1Contract(managementSource, cssSource, service);
    assertStableVisualAssetsAndActiveBannerSharingContract(managementSource, service);
    assertDesktopUnifiedVisitorRecordLandingContract(managementSource);
}

function assertVisitorSupplementalRecordMvpSourceContract(managementSource, apiSource, cssSource, sqlSource) {
    assert(managementSource.includes('quickAdditionalVisitorsEnabled(activity)'));
    assert(managementSource.includes('currentVisitorCountField(activity)'));
    assert(managementSource.includes('visitorNumberValue(ui.quickOtherAnswers'));
    assert(managementSource.includes("context: 'quick-additional-visitor'"));
    assert(managementSource.includes("context: 'record-additional-visitor'"));
    assert(managementSource.includes('renderSupplementalDetail(record, activity)'));
    assert(managementSource.includes('我的補充紀錄'));
    assert(managementSource.includes('查看完整訪談紀錄'));
    assert(managementSource.includes('recordBelongsToCurrentUser'));
    assert(managementSource.includes('record.createdByUserId === currentUser.userId || recordHasMyContribution(record)'));
    assert(!/payloadAnswersForItems\([^)]*additional/i.test(managementSource));
    assert(!/submission_answers/i.test(managementSource));
    assert(apiSource.includes('/additional-visitors'));
    assert(apiSource.includes('/my-contribution'));
    assert(cssSource.includes('.aim-supplemental-detail'));
    assert(sqlSource.includes('activity_intelligence_submission_supplements'));
    assert(sqlSource.includes('activity_intelligence_save_additional_visitor'));
    assert(sqlSource.includes('activity_intelligence_delete_additional_visitor'));
    assert(sqlSource.includes('activity_intelligence_upsert_my_contribution'));
    assert(sqlSource.includes('activity_intelligence_delete_my_contribution'));
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

function assertOtherHistorySuggestionsV1Contract(managementSource, cssSource, service) {
    assert(managementSource.includes('enableOtherHistorySuggestions'), 'Other history suggestions setting must exist in the frontend source');
    assert(managementSource.includes('啟用「其他」歷史值建議'), 'Builder must expose the approved Other history suggestion label');
    assert(managementSource.includes('從此活動同一題目的過往「其他」內容提供建議，仍可輸入新內容。'), 'Builder must expose the approved Other history suggestion helper');
    assert(managementSource.includes('data-action="other-history-suggestion"'), 'Runtime suggestions must be clickable without a second choice system');
    assert(managementSource.includes('setQuickOtherAnswer(fieldId, value)') && managementSource.includes('setWorkingOther(fieldId, value)'), 'Clicking a suggestion must write only other_text state');
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

function assertDesktopUnifiedVisitorRecordLandingContract(managementSource) {
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
        "const loadRecordsCalls = [];",
        "const state = { activities: [], selectedActivityId: null };",
        "const ui = { selectedActivityId: null, view: 'overview', tab: 'overview', records: { scope: 'all' }, recordContextMode: recordContextActiveMode, formContext: formContextFieldIntelligenceMode };",
        "const Store = { escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[char])); }, formatDate(value) { return value || ''; }, activitySubtitle(activity) { return activity && activity.location ? activity.location : ''; } };",
        "function isMobileFormViewport() { return mobile; }",
        "function activityStatus(activity) { return { key: activity && activity.open ? 'open' : 'ended' }; }",
        "function openActivities() { return state.activities.filter(activity => activityStatus(activity).key === 'open'); }",
        "function resetAllQuickStates() { resetCalls += 1; }",
        "function applyRoleLanding() { fallbackCalls += 1; ui.view = 'fallback'; }",
        "function canCreateRecord(activity) { return currentUser && currentUser.authenticated && activity && activityStatus(activity).key === 'open'; }",
        "function loadRecordsForActivity(activityId, options) { loadRecordsCalls.push({ activityId, options }); }",
        "function statusPill(status) { return `<span class=\"aim-pill\">${status.key}</span>`; }",
        extractFunctionDeclaration(managementSource, 'enterVisitorRecordEntryState'),
        extractFunctionDeclaration(managementSource, 'applyUnifiedVisitorRecordLanding'),
        extractFunctionDeclaration(managementSource, 'applyInitialLanding'),
        extractFunctionDeclaration(managementSource, 'chooseCurrentActivity'),
        extractFunctionDeclaration(managementSource, 'renderActivityChooser'),
        "({ state, ui, loadRecordsCalls, setUser(value) { currentUser = value; }, setMobile(value) { mobile = value; }, applyInitialLanding, chooseCurrentActivity, renderActivityChooser, counts() { return { fallbackCalls, resetCalls }; } });"
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
    contract.loadRecordsCalls.length = 0;
    contract.chooseCurrentActivity('activity-a');
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext,
        loadedActivityId: contract.loadRecordsCalls[0] && contract.loadRecordsCalls[0].activityId
    }, {
        id: 'activity-a',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor',
        loadedActivityId: 'activity-a'
    }, 'choosing Activity A must enter Activity A Visitor Add Record directly');

    contract.loadRecordsCalls.length = 0;
    contract.chooseCurrentActivity('activity-b');
    assert.deepStrictEqual({
        id: contract.ui.selectedActivityId,
        view: contract.ui.view,
        tab: contract.ui.tab,
        scope: contract.ui.records.scope,
        recordContextMode: contract.ui.recordContextMode,
        formContext: contract.ui.formContext,
        loadedActivityId: contract.loadRecordsCalls[0] && contract.loadRecordsCalls[0].activityId
    }, {
        id: 'activity-b',
        view: 'workspace',
        tab: 'records',
        scope: 'entry',
        recordContextMode: 'visitor',
        formContext: 'visitor',
        loadedActivityId: 'activity-b'
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

async function main() {
    const { service, calls, publishedItems } = makeHarness();

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
        supplementId: IDS.additionalVisitorSupplement,
        cardId: IDS.secondCard,
        personalInterest: 'Robotics procurement',
        cardSnapshot: { name: 'Browser Must Not Win' }
    }, actor());
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_supplement_id, IDS.additionalVisitorSupplement);
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_id, IDS.secondCard);
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot.name, 'Card Name');
    assert.strictEqual(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot.company, 'Card Co');
    assert(!JSON.stringify(supplementalHarness.calls.saveAdditionalVisitor.p_card_snapshot).includes('Browser Must Not Win'));
    const supplementalDetail = await supplementalHarness.service.getSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(supplementalDetail.supplementalSummary.additionalVisitorCount, 1);
    assert.strictEqual(supplementalDetail.supplements.additionalVisitors[0].personalInterest, 'Robotics procurement');
    assert.strictEqual(supplementalDetail.supplements.additionalVisitors[0].cardSnapshot.name, 'Card Name');
    const supplementalListAfter = await supplementalHarness.service.listSubmissions(IDS.activity, { recordContext: 'visitor' }, actor());
    const supplementalListRow = supplementalListAfter.find(record => record.id === IDS.oldSubmission);
    assert.strictEqual(supplementalListRow.supplementalSummary.additionalVisitorCount, 1);
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
    const cssSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles', 'activity-intelligence', 'activity-intelligence-management.css'), 'utf8');
    const activityIntelligenceSqlSource = fs.readFileSync(path.join(__dirname, '..', 'docs', 'schema', 'activity-intelligence-transactions-v1.sql'), 'utf8');
    assertFormAssistCjkContract(managementSource);
    assertVisitorKpiOtherNumericContract(managementSource);
    await assertVisitorKpiCacheHydrationContract(managementSource);
    assertMobileAnalyticsBreakpointRerenderContract(managementSource);
    assertContextFoundationSqlContract(activityIntelligenceSqlSource);
    assertDualStreamFormBuilderSourceContract(managementSource, apiSource, cssSource);
    assertRealActiveIntelligenceRuntimeSourceContract(managementSource, cssSource, service);
    assertVisitorSupplementalRecordMvpSourceContract(managementSource, apiSource, cssSource, activityIntelligenceSqlSource);
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
