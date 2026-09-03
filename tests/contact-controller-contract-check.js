const assert = require('assert');

const ContactController = require('../controllers/contact.controller');

function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        statusCalls: [],
        jsonCalls: 0,
        status(code) {
            this.statusCode = code;
            this.statusCalls.push(code);
            return this;
        },
        json(body) {
            this.body = body;
            this.jsonCalls += 1;
            return this;
        }
    };
}

async function assertUpdateForwardingAndSuccessResponse() {
    const calls = [];
    const expectedBody = {
        name: 'Updated Contact',
        email: 'updated@example.test'
    };
    const expectedResult = {
        success: true,
        contactId: 'contact-update-1'
    };
    const contactService = {
        async updateContact(contactId, updateData, actorName) {
            calls.push({ contactId, updateData, actorName });
            return expectedResult;
        },
        async deleteContact() {
            throw new Error('Unexpected deleteContact call during update test');
        }
    };
    const controller = new ContactController(contactService, {}, {});
    const req = {
        params: { contactId: 'contact-update-1' },
        body: expectedBody,
        user: {
            username: 'actor-username-not-selected',
            name: 'Actor Name Not Selected',
            displayName: 'Distinct Contact Auditor'
        }
    };
    const res = makeResponse();

    await controller.updateContact(req, res);

    assert.strictEqual(calls.length, 1, 'updateContact must call the service exactly once');
    assert.strictEqual(calls[0].contactId, 'contact-update-1', 'updateContact must forward req.params.contactId');
    assert.strictEqual(calls[0].updateData, expectedBody, 'updateContact must forward the exact req.body object');
    assert.strictEqual(calls[0].actorName, 'Distinct Contact Auditor', 'updateContact must prefer req.user.displayName for the audit user');
    assert.strictEqual(res.statusCode, 200, 'successful update must retain the default HTTP 200 status');
    assert.deepStrictEqual(res.statusCalls, [], 'successful update must not set an explicit status');
    assert.strictEqual(res.jsonCalls, 1, 'successful update must send exactly one JSON response');
    assert.strictEqual(res.body, expectedResult, 'successful update must return the exact service result');
}

async function assertUpdateErrorResponseContract() {
    const failure = new Error('deterministic contact update failure');
    const contactService = {
        async updateContact() {
            throw failure;
        }
    };
    const controller = new ContactController(contactService, {}, {});
    const req = {
        params: { contactId: 'contact-error-1' },
        body: { name: 'Rejected Update' },
        user: { displayName: 'Error Path Actor' }
    };
    const res = makeResponse();
    const originalConsoleError = console.error;
    const loggedErrors = [];

    console.error = (...args) => loggedErrors.push(args);
    try {
        await controller.updateContact(req, res);
    } finally {
        console.error = originalConsoleError;
    }

    assert.strictEqual(loggedErrors.length, 1, 'service failure must pass through the shared error handler');
    assert.strictEqual(res.statusCode, 500, 'generic update failure must produce HTTP 500');
    assert.strictEqual(res.jsonCalls, 1, 'generic update failure must send exactly one JSON response');
    assert.deepStrictEqual(res.body, {
        success: false,
        error: '伺服器內部錯誤，請稍後再試或聯絡管理員。',
        details: failure.message
    }, 'generic update failure must preserve the current shared error response contract');
}

async function assertDeleteDispatch() {
    const calls = [];
    const expectedResult = {
        success: true,
        deletedContactId: 'contact-delete-1'
    };
    const contactService = {
        async deleteContact(contactId, actorName) {
            calls.push({ method: 'deleteContact', contactId, actorName });
            return expectedResult;
        },
        async updateContact() {
            throw new Error('Unexpected updateContact call during delete test');
        },
        async deletePotentialContact() {
            throw new Error('Unexpected deletePotentialContact call during core delete test');
        }
    };
    const controller = new ContactController(contactService, {}, {});
    const req = {
        params: { contactId: 'contact-delete-1' },
        user: {
            username: 'delete-username-not-selected',
            displayName: 'Distinct Delete Auditor'
        }
    };
    const res = makeResponse();

    await controller.deleteContact(req, res);

    assert.deepStrictEqual(calls, [{
        method: 'deleteContact',
        contactId: 'contact-delete-1',
        actorName: 'Distinct Delete Auditor'
    }], 'deleteContact must dispatch only the core destructive service method with contact ID and audit user');
    assert.strictEqual(res.statusCode, 200, 'successful delete must retain the default HTTP 200 status');
    assert.deepStrictEqual(res.statusCalls, [], 'successful delete must not set an explicit status');
    assert.strictEqual(res.jsonCalls, 1, 'successful delete must send exactly one JSON response');
    assert.strictEqual(res.body, expectedResult, 'successful delete must return the exact service result');
}

async function assertMissingCardIdentifierBlockedBeforeService() {
    let workflowCalls = 0;
    const contactService = {
        async updateContact() {
            throw new Error('Unexpected Contact service call during invalid link-card test');
        }
    };
    const workflowService = {
        async linkBusinessCardToContact() {
            workflowCalls += 1;
            throw new Error('Invalid input must be blocked before Workflow service dispatch');
        }
    };
    const controller = new ContactController(contactService, workflowService, {});
    const req = {
        params: { contactId: 'contact-link-1' },
        body: {},
        user: { displayName: 'Link Actor' }
    };
    const res = makeResponse();

    await controller.linkCardToContact(req, res);

    assert.strictEqual(workflowCalls, 0, 'missing businessCardRowIndex must block Workflow service dispatch');
    assert.deepStrictEqual(res.statusCalls, [400], 'missing businessCardRowIndex must explicitly set HTTP 400');
    assert.strictEqual(res.jsonCalls, 1, 'invalid link-card request must send exactly one JSON response');
    assert.deepStrictEqual(res.body, {
        success: false,
        error: '缺少 businessCardRowIndex 參數'
    }, 'invalid link-card request must preserve the current validation response contract');
}

async function main() {
    await assertUpdateForwardingAndSuccessResponse();
    await assertUpdateErrorResponseContract();
    await assertDeleteDispatch();
    await assertMissingCardIdentifierBlockedBeforeService();

    console.log('Contact controller contract checks passed.');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
