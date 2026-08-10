const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ActivityIntelligenceService = require('../services/activity-intelligence-service');
const ActivityIntelligenceController = require('../controllers/activity-intelligence.controller');

const IDS = {
    activity: '11111111-1111-4111-8111-111111111111',
    newActivity: '11111111-1111-4111-8111-111111111112',
    copyActivity: '11111111-1111-4111-8111-111111111113',
    publishedVersion: '22222222-2222-4222-8222-222222222221',
    draftVersion: '22222222-2222-4222-8222-222222222222',
    oldVersion: '22222222-2222-4222-8222-222222222223',
    textKey: '33333333-3333-4333-8333-333333333331',
    numberKey: '33333333-3333-4333-8333-333333333332',
    boolKey: '33333333-3333-4333-8333-333333333333',
    choiceKey: '33333333-3333-4333-8333-333333333334',
    cardKey: '33333333-3333-4333-8333-333333333335',
    oldTextKey: '33333333-3333-4333-8333-333333333336',
    longKey: '33333333-3333-4333-8333-333333333337',
    textItem: '44444444-4444-4444-8444-444444444441',
    numberItem: '44444444-4444-4444-8444-444444444442',
    boolItem: '44444444-4444-4444-8444-444444444443',
    choiceItem: '44444444-4444-4444-8444-444444444444',
    cardItem: '44444444-4444-4444-8444-444444444445',
    oldTextItem: '44444444-4444-4444-8444-444444444446',
    longItem: '44444444-4444-4444-8444-444444444447',
    optionAlpha: '55555555-5555-4555-8555-555555555551',
    card: '66666666-6666-4666-8666-666666666661',
    secondCard: '66666666-6666-4666-8666-666666666663',
    missingCard: '66666666-6666-4666-8666-666666666662',
    newSubmission: '77777777-7777-4777-8777-777777777771',
    oldSubmission: '77777777-7777-4777-8777-777777777772',
    aiSubmission: '77777777-7777-4777-8777-777777777773',
    voidSubmission: '77777777-7777-4777-8777-777777777774',
    otherActivity: '11111111-1111-4111-8111-111111111114'
};

const baseActivity = {
    id: IDS.activity,
    name: 'Expo',
    description: '',
    formOpenStart: '2026-08-01',
    formOpenEnd: '2026-08-31',
    exhibitionStart: null,
    exhibitionEnd: null,
    createdByUserId: 'creator',
    createdByDisplayName: 'Creator',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedByUserId: 'creator',
    updatedByDisplayName: 'Creator',
    updatedAt: '2026-08-01T00:00:00.000Z'
};

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
        visible: true,
        removedInDraft: false
    },
    { formItemId: IDS.longItem, itemKey: IDS.longKey, fieldId: IDS.longKey, type: 'long_text', title: 'Long Need', options: [], optionEntries: [], visible: true, removedInDraft: false },
    { formItemId: IDS.cardItem, itemKey: IDS.cardKey, fieldId: IDS.cardKey, type: 'card_link', title: 'Card', options: [], optionEntries: [], visible: true, removedInDraft: false }
];

const oldItems = [
    { formItemId: IDS.oldTextItem, itemKey: IDS.oldTextKey, fieldId: IDS.oldTextKey, type: 'short_text', title: 'Old Text', options: [], optionEntries: [] }
];

function makeHarness(options = {}) {
    const calls = {};
    const submissions = new Map();

    const reader = {
        mapActivityRow: row => ({ ...baseActivity, id: row.activity_id || row.id, name: row.name || baseActivity.name }),
        async listActivities() {
            return [baseActivity];
        },
        async getActivityById(id) {
            return id === 'missing' ? null : { ...baseActivity, id };
        },
        async getFormBundle() {
            return {
                published: { versionId: IDS.publishedVersion, versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
                draft: { versionId: IDS.draftVersion, versionNumber: 2, items: publishedItems.map(item => ({ ...item })) }
            };
        },
        async getPublishedForm() {
            return { versionId: IDS.publishedVersion, versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems };
        },
        async getDraftForm() {
            return { versionId: IDS.draftVersion, versionNumber: 2, items: publishedItems.map(item => ({ ...item })) };
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
                if (filters.dateStart && submission.createdAt.slice(0, 10) < filters.dateStart) return false;
                if (filters.dateEnd && submission.createdAt.slice(0, 10) > filters.dateEnd) return false;
                if (filters.recorderDisplayName && submission.createdByDisplayName !== filters.recorderDisplayName) return false;
                return true;
            });
        },
        async getSubmissionById(id) {
            return submissions.get(id) || null;
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
                status: 'active',
                answers: {},
                otherAnswers: {},
                cardId: payload.p_submission.card_id,
                card: null,
                formSnapshot: { versionId: IDS.publishedVersion, versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
                createdByUserId: payload.p_actor.userId,
                createdByDisplayName: payload.p_actor.displayName,
                createdAt: '2026-08-02T00:00:00.000Z',
                updatedByUserId: payload.p_actor.userId,
                updatedByDisplayName: payload.p_actor.displayName,
                updatedAt: '2026-08-02T00:00:00.000Z'
            });
            return { submission_id: IDS.newSubmission };
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
        status: 'active',
        answers: { [IDS.oldTextKey]: 'existing answer' },
        otherAnswers: {},
        cardId: IDS.card,
        card: null,
        formSnapshot: { versionId: IDS.oldVersion, versionNumber: 1, publishedAt: '2026-07-01T00:00:00.000Z', items: oldItems },
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
        status: 'active',
        answers: {
            [IDS.textKey]: 'Structured short text',
            [IDS.longKey]: '完整長文字需求：客戶正在評估自動化產線，要求九月前安排後續拜訪。',
            [IDS.numberKey]: 88,
            [IDS.boolKey]: true,
            [IDS.choiceKey]: [{ optionKey: IDS.optionAlpha, label: 'Alpha', value: 'Alpha' }]
        },
        otherAnswers: { [IDS.choiceKey]: 'Other detail' },
        cardId: IDS.card,
        card: null,
        formSnapshot: { versionId: IDS.publishedVersion, versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
        createdByUserId: 'analyst',
        createdByDisplayName: 'Analyst',
        createdAt: '2026-08-15T10:00:00.000Z',
        updatedByUserId: 'analyst',
        updatedByDisplayName: 'Analyst',
        updatedAt: '2026-09-05T10:00:00.000Z'
    });

    submissions.set(IDS.voidSubmission, {
        id: IDS.voidSubmission,
        activityId: IDS.activity,
        formVersionId: IDS.publishedVersion,
        status: 'void',
        answers: { [IDS.longKey]: 'This void answer must not reach Gemini context.' },
        otherAnswers: {},
        cardId: null,
        card: null,
        formSnapshot: { versionId: IDS.publishedVersion, versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
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

    return { service, calls, publishedItems };
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

    const originalPublishedTitle = publishedItems[0].title;
    await service.saveDraft(IDS.activity, {
        items: [
            { itemKey: IDS.textKey, type: 'short_text', title: 'Draft Text', visible: false },
            { itemKey: IDS.choiceKey, type: 'multiple_choice', title: 'Choice', options: ['Ignored'], optionEntries: [{ optionKey: IDS.optionAlpha, label: 'Alpha', value: 'Alpha' }] },
            { itemKey: IDS.cardKey, type: 'card_link', title: 'Card', removedInDraft: true }
        ]
    }, actor());
    assert.strictEqual(calls.saveDraft.p_items[0].title, 'Draft Text');
    assert.strictEqual(calls.saveDraft.p_items[0].is_hidden, true);
    assert.strictEqual(calls.saveDraft.p_items[2].is_removed, true);
    assert.strictEqual(calls.saveDraft.p_items[1].options[0].optionKey, IDS.optionAlpha);
    assert.strictEqual(calls.saveDraft.p_items[1].options[0].label, 'Alpha');
    assert.strictEqual(publishedItems[0].title, originalPublishedTitle);

    await service.publishDraft(IDS.activity, actor());
    assert.strictEqual(calls.publishDraft.p_activity_id, IDS.activity);
    assert.strictEqual(calls.publishDraft.p_actor.userId, 'real-user');

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
    assert.strictEqual(answerByFormItemId.get(IDS.textItem).value_text, 'hello');
    assert.strictEqual(answerByFormItemId.get(IDS.numberItem).value_number, 42);
    assert.strictEqual(answerByFormItemId.get(IDS.boolItem).value_boolean, true);
    assert.strictEqual(answerByFormItemId.get(IDS.choiceItem).value_jsonb[0].optionKey, IDS.optionAlpha);
    assert.strictEqual(answerByFormItemId.get(IDS.choiceItem).other_text, 'custom');
    assert(!answerByFormItemId.has(IDS.cardItem));

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
    assert.strictEqual(enriched.card.cardId, IDS.card);
    assert.strictEqual(enriched.card.thumbnailUrl, '/api/external/thumbnail?fileId=drive-1');

    await service.voidSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(calls.updateSubmissionStatus.status, 'void');
    await service.restoreSubmission(IDS.oldSubmission, actor());
    assert.strictEqual(calls.updateSubmissionStatus.status, 'active');

    const aiCalls = [];
    const aiHarness = makeHarness({
        formAiTextGenerator: async payload => {
            aiCalls.push(payload);
            return aiCalls.length === 1 ? '第一個完整分析結果' : '第二個完整分析結果';
        }
    });
    const aiResult = await aiHarness.service.analyzeActivity(IDS.activity, { question: '請分析主要需求' }, actor());
    assert.deepStrictEqual(aiResult, { completed: true, answer: '第一個完整分析結果' });
    assert.strictEqual(aiHarness.calls.listSubmissions.activityId, IDS.activity);
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateStart, '2026-08-01');
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateEnd, '2026-08-31');
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.includeVoid, false);
    assert(aiCalls[0].systemInstruction.includes('未受信任的商業資料'));
    assert(aiCalls[0].systemInstruction.includes('不得聲稱可查詢 CRM'));
    assert(aiCalls[0].systemInstruction.includes('繁體中文'));
    assert(aiCalls[0].userPrompt.includes('完整長文字需求：客戶正在評估自動化產線'));
    assert(aiCalls[0].userPrompt.includes('Card Co'));
    assert(aiCalls[0].userPrompt.includes('RAW note'));
    assert(!aiCalls[0].userPrompt.includes('This void answer must not reach Gemini context.'));
    assert(!Object.prototype.hasOwnProperty.call(aiResult, 'model'));

    await aiHarness.service.analyzeActivity(IDS.activity, {
        question: '只看 Analyst',
        filters: { start: '2026-07-01', end: '2026-09-10', recorder: 'Analyst' }
    }, actor());
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateStart, '2026-08-01');
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.dateEnd, '2026-08-31');
    assert.strictEqual(aiHarness.calls.listSubmissions.filters.recorderDisplayName, 'Analyst');
    assert(!aiCalls[1].userPrompt.includes('第一個完整分析結果'));

    await assertRejectsCode(() => aiHarness.service.analyzeActivity(IDS.activity, { question: '' }, actor()), 'FORM_AI_EMPTY_QUESTION');
    await assertRejectsCode(() => aiHarness.service.analyzeActivity(IDS.activity, { question: 'no data', filters: { recorder: 'Nobody' } }, actor()), 'FORM_AI_NO_DATA');
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
