const assert = require('assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'system-manager-contract-secret';
process.env.LINE_LEAD_SESSION_SECRET = process.env.LINE_LEAD_SESSION_SECRET || 'line-lead-contract-secret';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AuthService = require('../services/auth-service');
const ActivityIntelligenceService = require('../services/activity-intelligence-service');
const LineLeadsController = require('../controllers/line-leads.controller');
const {
    getEffectiveRoles,
    isAdminEquivalentRole,
    roleAllows
} = require('../middleware/role.middleware');
const {
    verifyBearerTokenFromRequest
} = require('../middleware/auth.middleware');
const {
    getLineLeadSession,
    issueLineLeadSessionJwt,
    requireLineLeadSession,
    resolveCrmSystemManagerLineUser
} = require('../middleware/line-lead-session.middleware');

function makeCrmToken(payload) {
    return jwt.sign(payload, config.AUTH.JWT_SECRET, { expiresIn: config.AUTH.JWT_EXPIRES_IN });
}

function makeExpiredCrmToken(payload) {
    return jwt.sign(payload, config.AUTH.JWT_SECRET, { expiresIn: -1 });
}

function makeRequest({ token, headers = {}, originalUrl = '/api/line/leads', services = {} } = {}) {
    const allHeaders = { ...headers };
    if (token) allHeaders.authorization = `Bearer ${token}`;
    return {
        headers: allHeaders,
        originalUrl,
        url: originalUrl,
        get(name) {
            return allHeaders[String(name || '').toLowerCase()] || allHeaders[name] || '';
        },
        app: {
            get(key) {
                return key === 'services' ? services : undefined;
            }
        }
    };
}

function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        cookies: [],
        clearedCookies: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        cookie(name, value, options) {
            this.cookies.push({ name, value, options });
            return this;
        },
        clearCookie(name, options) {
            this.clearedCookies.push({ name, options });
            return this;
        }
    };
}

function lineCookieHeader(lineJwt) {
    return `${config.LINE_LEAD.COOKIE_NAME}=${encodeURIComponent(lineJwt)}`;
}

async function assertLineFallback({ label, token, originalUrl, headers = {}, lineJwt, services }) {
    const req = makeRequest({
        token,
        originalUrl,
        headers: {
            ...headers,
            cookie: lineCookieHeader(lineJwt)
        },
        services
    });
    const res = makeResponse();

    await getLineLeadSession(req, res);
    assert.strictEqual(res.statusCode, 200, label);
    assert.strictEqual(res.body.userId, 'line-user', label);
    assert.strictEqual(res.body.displayName, 'Line User', label);
    assert.strictEqual(res.body.role, 'recorder', label);
    assert.strictEqual(res.body.authSource, undefined, label);

    const protectedReq = makeRequest({
        token,
        originalUrl,
        headers: {
            ...headers,
            cookie: lineCookieHeader(lineJwt)
        },
        services
    });
    const protectedRes = makeResponse();
    let nextCalled = false;
    await requireLineLeadSession(protectedReq, protectedRes, () => {
        nextCalled = true;
    });
    assert.strictEqual(protectedRes.statusCode, 200, label);
    assert.strictEqual(nextCalled, true, label);
    assert.strictEqual(protectedReq.lineUser.userId, 'line-user', label);
    assert.strictEqual(protectedReq.lineUser.role, 'recorder', label);
}

async function main() {
    assert.strictEqual(config.AUTH.JWT_EXPIRES_IN, '8h');

    const portalSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'portal.html'), 'utf8');
    assert(portalSource.includes('href="/dashboard.html" aria-label="CRM"'));
    assert(portalSource.includes('href="/views/activity-intelligence.html" aria-label="Activity Intelligence"'));
    assert(portalSource.includes('href="/leads-view.html" aria-label="OCR"'));
    assert(!portalSource.includes('href="/login.html" aria-label="CRM"'));

    assert.deepStrictEqual(getEffectiveRoles('system_manager'), ['system_manager', 'admin']);
    assert.deepStrictEqual(getEffectiveRoles('super_admin'), ['super_admin', 'admin']);
    assert.deepStrictEqual(getEffectiveRoles('sales'), ['sales']);
    assert.strictEqual(isAdminEquivalentRole('system_manager'), true);
    assert.strictEqual(roleAllows(new Set(['admin', 'super_admin']), 'system_manager'), true);
    assert.strictEqual(roleAllows(new Set(['super_admin']), 'system_manager'), false);
    assert.strictEqual(roleAllows(new Set(['recorder', 'admin', 'super_admin']), 'system_manager'), true);

    const authService = new AuthService({
        cache: {},
        async getUsers() {
            return [{
                username: 'manager001',
                passwordHash: 'plain-password',
                displayName: 'Manager One',
                role: 'system_manager'
            }];
        }
    }, null, {
        async startUserSession(user) {
            assert.strictEqual(user.username, 'manager001');
            assert.strictEqual(user.displayName, 'Manager One');
            assert.strictEqual(user.role, 'system_manager');
            return { session_id: 'session-login' };
        }
    });

    const login = await authService.login('manager001', 'plain-password', {});
    assert.strictEqual(login.role, 'system_manager');
    assert.strictEqual(login.session_id, 'session-login');
    const decodedLoginToken = jwt.verify(login.token, config.AUTH.JWT_SECRET);
    assert.strictEqual(decodedLoginToken.username, 'manager001');
    assert.strictEqual(decodedLoginToken.displayName, 'Manager One');
    assert.strictEqual(decodedLoginToken.role, 'system_manager');
    assert.strictEqual(decodedLoginToken.session_id, 'session-login');
    assert.strictEqual(decodedLoginToken.exp - decodedLoginToken.iat, 8 * 60 * 60);

    const verifiedReq = makeRequest({ token: login.token });
    const verified = verifyBearerTokenFromRequest(verifiedReq, {
        attachToRequest: true,
        touchLastSeen: false
    });
    assert.strictEqual(verified.ok, true);
    assert.strictEqual(verifiedReq.user.role, 'system_manager');

    const touches = [];
    const services = {
        auditLoggerService: {
            async touchUserSession(sessionId) {
                touches.push(sessionId);
            }
        }
    };
    const formToken = makeCrmToken({
        username: 'manager-form',
        displayName: 'Form Manager',
        role: 'system_manager',
        session_id: 'session-form'
    });
    const formReq = makeRequest({
        token: formToken,
        originalUrl: '/api/line/activity-intelligence/activities',
        headers: { 'x-line-session-product': 'form' },
        services
    });
    const formLineUser = resolveCrmSystemManagerLineUser(formReq);
    assert.strictEqual(formLineUser.userId, 'manager-form');
    assert.strictEqual(formLineUser.username, 'manager-form');
    assert.strictEqual(formLineUser.displayName, 'Form Manager');
    assert.strictEqual(formLineUser.role, 'system_manager');
    assert.strictEqual(formLineUser.authSource, 'crm');
    assert.strictEqual(formLineUser.accessClass, 'member');

    const cardDisplayName = Buffer.from('546L5aSn5piO', 'base64').toString('utf8');
    const cardToken = makeCrmToken({
        username: 'manager-card',
        displayName: cardDisplayName,
        role: 'system_manager',
        session_id: 'session-card'
    });
    const cardLineUser = resolveCrmSystemManagerLineUser(makeRequest({ token: cardToken, services }));
    assert.strictEqual(cardLineUser.userId, 'crm:manager-card');
    assert.strictEqual(cardLineUser.username, 'manager-card');
    assert.strictEqual(cardLineUser.displayName, cardDisplayName);

    const adminToken = makeCrmToken({
        username: 'admin001',
        displayName: 'Admin One',
        role: 'admin',
        session_id: 'session-admin'
    });
    const salesToken = makeCrmToken({
        username: 'sales001',
        displayName: 'Sales One',
        role: 'sales',
        session_id: 'session-sales'
    });
    const superAdminToken = makeCrmToken({
        username: 'super001',
        displayName: 'Super One',
        role: 'super_admin',
        session_id: 'session-super'
    });
    const unknownRoleToken = makeCrmToken({
        username: 'unknown001',
        displayName: 'Unknown One',
        role: 'unknown',
        session_id: 'session-unknown'
    });
    const expiredSystemManagerToken = makeExpiredCrmToken({
        username: 'expired-manager',
        displayName: 'Expired Manager',
        role: 'system_manager',
        session_id: 'session-expired'
    });
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: adminToken, services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: salesToken, services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: superAdminToken, services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: unknownRoleToken, services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: expiredSystemManagerToken, services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: 'TEST_LOCAL_TOKEN', services })), null);
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: 'not-a-jwt', services })), null);

    const sessionRes = makeResponse();
    await getLineLeadSession(makeRequest({ token: formToken, headers: { 'x-line-session-product': 'form' }, services }), sessionRes);
    assert.strictEqual(sessionRes.statusCode, 200);
    assert.strictEqual(sessionRes.body.authenticated, true);
    assert.strictEqual(sessionRes.body.role, 'system_manager');
    assert.strictEqual(sessionRes.body.authSource, 'crm');
    assert.strictEqual(sessionRes.body.accessClass, 'member');
    assert.strictEqual(sessionRes.body.whitelisted, true);
    assert.deepStrictEqual(sessionRes.cookies, []);

    const lineJwt = issueLineLeadSessionJwt({ userId: 'line-user', displayName: 'Line User' }, 3600);
    const fallbackServices = {
        systemService: {
            async getSystemConfig() {
                return {
                    [config.LINE_LEAD.WHITELIST_CONFIG_CATEGORY]: [{ value: 'line-user', style: 'recorder' }],
                    [config.LINE_LEAD.SESSION_CONFIG_CATEGORY]: []
                };
            }
        }
    };
    const fastPassFailures = [
        ['form-no-crm-token', null],
        ['form-expired-crm-token', expiredSystemManagerToken],
        ['form-malformed-crm-token', 'not-a-jwt'],
        ['form-admin-crm-token', adminToken],
        ['form-sales-crm-token', salesToken],
        ['form-super-admin-crm-token', superAdminToken],
        ['form-unknown-role-crm-token', unknownRoleToken],
        ['card-no-crm-token', null],
        ['card-expired-crm-token', expiredSystemManagerToken],
        ['card-malformed-crm-token', 'not-a-jwt'],
        ['card-admin-crm-token', adminToken],
        ['card-sales-crm-token', salesToken],
        ['card-super-admin-crm-token', superAdminToken],
        ['card-unknown-role-crm-token', unknownRoleToken]
    ];
    for (const [label, token] of fastPassFailures) {
        const form = label.startsWith('form-');
        await assertLineFallback({
            label,
            token,
            originalUrl: form ? '/api/line/activity-intelligence/activities' : '/api/line/leads',
            headers: form ? { 'x-line-session-product': 'form' } : {},
            lineJwt,
            services: fallbackServices
        });
    }

    const cardSessionRes = makeResponse();
    await getLineLeadSession(makeRequest({ token: cardToken, services }), cardSessionRes);
    assert.strictEqual(cardSessionRes.statusCode, 200);
    assert.strictEqual(cardSessionRes.body.userId, 'crm:manager-card');
    assert.strictEqual(cardSessionRes.body.username, 'manager-card');
    assert.strictEqual(cardSessionRes.body.displayName, cardDisplayName);
    assert.strictEqual(cardSessionRes.body.role, 'system_manager');
    assert.strictEqual(cardSessionRes.body.authSource, 'crm');
    assert.deepStrictEqual(cardSessionRes.cookies, []);

    const lineLeadsController = new LineLeadsController({
        async getPotentialContactByRow(rowIndex) {
            assert.strictEqual(rowIndex, 'row-1');
            return { rowIndex: 'row-1', lineUserId: 'U-real-line-owner' };
        },
        async updatePotentialContact() {
            throw new Error('system_manager must not update non-owned Card rows');
        }
    }, null, null);
    const updateRes = makeResponse();
    await lineLeadsController.updateLead({
        lineUser: cardLineUser,
        params: { rowIndex: 'row-1' },
        body: { name: 'Changed' }
    }, updateRes);
    assert.strictEqual(updateRes.statusCode, 403);

    const activityService = new ActivityIntelligenceService({
        activityIntelligenceSqlReader: {},
        activityIntelligenceSqlWriter: {},
        rawContactSqlReader: {}
    });
    const managerActor = activityService._actorFromUser({
        username: 'manager-actor',
        displayName: 'Manager Actor',
        role: 'system_manager'
    });
    assert.strictEqual(managerActor.userId, 'manager-actor');
    assert.strictEqual(managerActor.displayName, 'Manager Actor');
    assert.strictEqual(activityService._canEditCanonicalSubmission({ createdByUserId: 'owner' }, managerActor), true);

    const loginSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'core', 'login.js'), 'utf8');
    assert(loginSource.includes("normalizeLoginRole(role) === 'system_manager' ? 'portal.html' : 'dashboard.html'"));
    const formSessionSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'activity-intelligence', 'activity-intelligence-line-session.js'), 'utf8');
    assert(formSessionSource.includes("session.authSource === 'crm' && session.role === 'system_manager'"));
    const leadsSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'scripts', 'leads-view.js'), 'utf8');
    assert(leadsSource.includes("currentUser.authSource === 'crm' && currentUser.role === 'system_manager'"));

    await Promise.resolve();
    assert(touches.includes('session-form'));
    assert(touches.includes('session-card'));
    assert(!touches.includes('session-admin'));

    console.log('System manager contract checks passed.');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
