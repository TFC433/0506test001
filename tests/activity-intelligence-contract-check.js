const assert = require('assert');

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
    textItem: '44444444-4444-4444-8444-444444444441',
    numberItem: '44444444-4444-4444-8444-444444444442',
    boolItem: '44444444-4444-4444-8444-444444444443',
    choiceItem: '44444444-4444-4444-8444-444444444444',
    cardItem: '44444444-4444-4444-8444-444444444445',
    oldTextItem: '44444444-4444-4444-8444-444444444446',
    optionAlpha: '55555555-5555-4555-8555-555555555551',
    card: '66666666-6666-4666-8666-666666666661',
    secondCard: '66666666-6666-4666-8666-666666666663',
    missingCard: '66666666-6666-4666-8666-666666666662',
    newSubmission: '77777777-7777-4777-8777-777777777771',
    oldSubmission: '77777777-7777-4777-8777-777777777772'
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
    { formItemId: IDS.cardItem, itemKey: IDS.cardKey, fieldId: IDS.cardKey, type: 'card_link', title: 'Card', options: [], optionEntries: [], visible: true, removedInDraft: false }
];

const oldItems = [
    { formItemId: IDS.oldTextItem, itemKey: IDS.oldTextKey, fieldId: IDS.oldTextKey, type: 'short_text', title: 'Old Text', options: [], optionEntries: [] }
];

function makeHarness() {
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
        async listSubmissions() {
            return [...submissions.values()];
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
                driveFileId: 'drive-1',
                driveLink: 'https://drive.example/file',
                driveFilename: 'card.jpg'
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

    const service = new ActivityIntelligenceService({
        activityIntelligenceSqlReader: reader,
        activityIntelligenceSqlWriter: writer,
        rawContactSqlReader
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
