const assert = require('assert');

const ActivityIntelligenceService = require('../services/activity-intelligence-service');
const ActivityIntelligenceController = require('../controllers/activity-intelligence.controller');

const baseActivity = {
    id: 'act-1',
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
    { formItemId: 'item-text-pub', itemKey: 'text', fieldId: 'text', type: 'short_text', title: 'Text', options: [], optionEntries: [] },
    { formItemId: 'item-number-pub', itemKey: 'num', fieldId: 'num', type: 'number', title: 'Number', options: [], optionEntries: [] },
    { formItemId: 'item-bool-pub', itemKey: 'bool', fieldId: 'bool', type: 'yes_no', title: 'Bool', options: [], optionEntries: [] },
    {
        formItemId: 'item-choice-pub',
        itemKey: 'choice',
        fieldId: 'choice',
        type: 'multiple_choice',
        title: 'Choice',
        options: ['Alpha'],
        optionEntries: [{ optionKey: 'opt-alpha', label: 'Alpha', value: 'Alpha' }]
    },
    { formItemId: 'item-card-pub', itemKey: 'card', fieldId: 'card', type: 'card_link', title: 'Card', options: [], optionEntries: [] }
];

const oldItems = [
    { formItemId: 'item-text-old', itemKey: 'text', fieldId: 'text', type: 'short_text', title: 'Old Text', options: [], optionEntries: [] }
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
                published: { versionId: 'pub-v1', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
                draft: { versionId: 'draft-v2', versionNumber: 2, items: publishedItems.map(item => ({ ...item })) }
            };
        },
        async getPublishedForm() {
            return { versionId: 'pub-v1', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems };
        },
        async getDraftForm() {
            return { versionId: 'draft-v2', versionNumber: 2, items: publishedItems.map(item => ({ ...item })) };
        },
        async getVersionWithItems(versionId) {
            return versionId === 'old-v1'
                ? { versionId: 'old-v1', versionNumber: 1, publishedAt: '2026-07-01T00:00:00.000Z', items: oldItems }
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
            return { activity_id: 'new-act' };
        },
        async duplicateActivity(payload) {
            calls.duplicateActivity = payload;
            return { activity_id: 'copy-act' };
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
            submissions.set('sub-new', {
                id: 'sub-new',
                activityId: payload.p_submission.activity_id,
                formVersionId: payload.p_submission.form_version_id,
                status: 'active',
                answers: {},
                otherAnswers: {},
                cardId: payload.p_submission.card_id,
                card: null,
                formSnapshot: { versionId: 'pub-v1', versionNumber: 1, publishedAt: '2026-08-01T00:00:00.000Z', items: publishedItems },
                createdByUserId: payload.p_actor.userId,
                createdByDisplayName: payload.p_actor.displayName,
                createdAt: '2026-08-02T00:00:00.000Z',
                updatedByUserId: payload.p_actor.userId,
                updatedByDisplayName: payload.p_actor.displayName,
                updatedAt: '2026-08-02T00:00:00.000Z'
            });
            return { submission_id: 'sub-new' };
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
            if (cardId === 'missing-card') return null;
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

    submissions.set('old-sub', {
        id: 'old-sub',
        activityId: 'act-1',
        formVersionId: 'old-v1',
        status: 'active',
        answers: {},
        otherAnswers: {},
        cardId: 'card-1',
        card: null,
        formSnapshot: { versionId: 'old-v1', versionNumber: 1, publishedAt: '2026-07-01T00:00:00.000Z', items: oldItems },
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

    return { service, calls, publishedItems, submissions };
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
        createdByUserId: 'spoof'
    }, actor());
    assert.strictEqual(calls.createActivity.p_activity.created_by_user_id, 'real-user');
    assert.strictEqual(calls.createActivity.p_activity.created_by_display_name, 'Real User');

    await assertRejectsStatus(() => service.createActivity({ formOpenStart: '2026-08-01', formOpenEnd: '2026-08-31' }, actor()), 400);
    await assertRejectsStatus(() => service.createActivity({ name: 'Bad', formOpenStart: '2026-08-31', formOpenEnd: '2026-08-01' }, actor()), 400);

    const activity = await service.getActivity('act-1');
    assert.strictEqual(activity.id, 'act-1');
    assert(activity.status && ['upcoming', 'open', 'ended'].includes(activity.status.key));

    const originalPublishedTitle = publishedItems[0].title;
    await service.saveDraft('act-1', { items: [{ itemKey: 'text', type: 'short_text', title: 'Draft Text' }] }, actor());
    assert.strictEqual(calls.saveDraft.p_items[0].title, 'Draft Text');
    assert.strictEqual(publishedItems[0].title, originalPublishedTitle);

    await service.publishDraft('act-1', actor());
    assert.strictEqual(calls.publishDraft.p_activity_id, 'act-1');
    assert.strictEqual(calls.publishDraft.p_actor.userId, 'real-user');

    await service.createSubmission('act-1', {
        cardId: 'card-1',
        answers: {
            text: 'hello',
            num: '42',
            bool: 'yes',
            choice: ['Alpha']
        },
        otherAnswers: {
            choice: 'custom'
        }
    }, actor());
    const answerByKey = new Map(calls.createSubmission.p_answers.map(row => [row.item_key, row]));
    assert.strictEqual(answerByKey.get('text').value_text, 'hello');
    assert.strictEqual(answerByKey.get('num').value_number, 42);
    assert.strictEqual(answerByKey.get('bool').value_boolean, true);
    assert.deepStrictEqual(answerByKey.get('choice').value_jsonb[0].optionKey, 'opt-alpha');
    assert.strictEqual(answerByKey.get('choice').other_text, 'custom');
    assert(!answerByKey.has('card'));

    await service.updateSubmission('old-sub', { answers: { text: 'historical edit' } }, actor());
    assert.strictEqual(calls.updateSubmission.p_answers[0].form_item_id, 'item-text-old');

    await assertRejectsStatus(() => service.createSubmission('act-1', { cardId: 'missing-card' }, actor()), 404);
    const enriched = await service.getSubmission('old-sub');
    assert.strictEqual(enriched.card.cardId, 'card-1');
    assert.strictEqual(enriched.card.thumbnailUrl, '/api/drive/thumbnail?fileId=drive-1');

    await service.voidSubmission('old-sub', actor());
    assert.strictEqual(calls.updateSubmissionStatus.status, 'void');
    await service.restoreSubmission('old-sub', actor());
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
