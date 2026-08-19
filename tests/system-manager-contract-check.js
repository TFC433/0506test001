const assert = require('assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'system-manager-contract-secret';
process.env.LINE_LEAD_SESSION_SECRET = process.env.LINE_LEAD_SESSION_SECRET || 'line-lead-contract-secret';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AuthService = require('../services/auth-service');
const ActivityIntelligenceService = require('../services/activity-intelligence-service');
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
    resolveCrmSystemManagerLineUser
} = require('../middleware/line-lead-session.middleware');

function makeCrmToken(payload) {
    return jwt.sign(payload, config.AUTH.JWT_SECRET, { expiresIn: config.AUTH.JWT_EXPIRES_IN });
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

async function main() {
    assert.strictEqual(config.AUTH.JWT_EXPIRES_IN, '8h');

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

    const cardToken = makeCrmToken({
        username: 'manager-card',
        displayName: 'Card Manager',
        role: 'system_manager',
        session_id: 'session-card'
    });
    const cardLineUser = resolveCrmSystemManagerLineUser(makeRequest({ token: cardToken, services }));
    assert.strictEqual(cardLineUser.userId, 'crm:manager-card');
    assert.strictEqual(cardLineUser.username, 'manager-card');

    const adminToken = makeCrmToken({
        username: 'admin001',
        displayName: 'Admin One',
        role: 'admin',
        session_id: 'session-admin'
    });
    assert.strictEqual(resolveCrmSystemManagerLineUser(makeRequest({ token: adminToken, services })), null);
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
    const fallbackRes = makeResponse();
    await getLineLeadSession(makeRequest({
        token: 'not-a-jwt',
        headers: { cookie: `${config.LINE_LEAD.COOKIE_NAME}=${encodeURIComponent(lineJwt)}` },
        services: fallbackServices
    }), fallbackRes);
    assert.strictEqual(fallbackRes.statusCode, 200);
    assert.strictEqual(fallbackRes.body.userId, 'line-user');
    assert.strictEqual(fallbackRes.body.role, 'recorder');

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
