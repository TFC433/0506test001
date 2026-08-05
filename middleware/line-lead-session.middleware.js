const jwt = require('jsonwebtoken');
const config = require('../config');

const lineLeadConfig = config.LINE_LEAD;

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;

    cookieHeader.split(';').forEach(part => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex <= 0) return;

        const key = part.slice(0, separatorIndex).trim();
        const rawValue = part.slice(separatorIndex + 1).trim();
        if (!key) return;

        try {
            cookies[key] = decodeURIComponent(rawValue);
        } catch (_) {
            cookies[key] = rawValue;
        }
    });

    return cookies;
}

function isLocalhostRequest(req) {
    const hostname = String(req && req.hostname ? req.hostname : '').toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isAllowedLocalDevRequest(req) {
    return process.env.NODE_ENV !== 'production' && isLocalhostRequest(req);
}

function getCookieOptions(req, maxAge) {
    const options = {
        httpOnly: true,
        secure: !isLocalhostRequest(req),
        sameSite: 'lax',
        path: '/api/line'
    };

    if (Number.isFinite(maxAge)) {
        options.maxAge = maxAge;
    }

    return options;
}

function clearLineLeadSessionCookie(req, res) {
    res.clearCookie(lineLeadConfig.COOKIE_NAME, getCookieOptions(req));
}

function resolveLineLeadSessionDays(systemConfig) {
    const fallbackDays = lineLeadConfig.DEFAULT_SESSION_DAYS;
    const rows = systemConfig && Array.isArray(systemConfig[lineLeadConfig.SESSION_CONFIG_CATEGORY])
        ? systemConfig[lineLeadConfig.SESSION_CONFIG_CATEGORY]
        : [];
    const row = rows.find(item => item && item.value === lineLeadConfig.SESSION_DAYS_CONFIG_VALUE);

    if (!row || row.note === null || row.note === undefined) return fallbackDays;

    const rawNote = String(row.note).trim();
    if (!/^\d+$/.test(rawNote)) return fallbackDays;

    const parsed = Number(rawNote);
    if (!Number.isFinite(parsed)) return fallbackDays;
    if (!Number.isInteger(parsed)) return fallbackDays;
    if (parsed < lineLeadConfig.MIN_SESSION_DAYS || parsed > lineLeadConfig.MAX_SESSION_DAYS) {
        return fallbackDays;
    }

    return parsed;
}

function getServices(req) {
    return req && req.app && typeof req.app.get === 'function'
        ? req.app.get('services')
        : null;
}

async function getSystemConfig(req) {
    const services = getServices(req);
    const systemService = services && services.systemService;

    if (!systemService || typeof systemService.getSystemConfig !== 'function') {
        return null;
    }

    return systemService.getSystemConfig();
}

function normalizeLineLeadRole(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ['super_admin', 'admin', 'recorder'].includes(normalized) ? normalized : 'recorder';
}

function findLineUserWhitelistEntry(systemConfig, lineUserId) {
    if (!systemConfig) return false;

    const whitelist = systemConfig[lineLeadConfig.WHITELIST_CONFIG_CATEGORY] || [];
    return whitelist.find(item => item && item.value && item.value.trim() === lineUserId) || null;
}

function resolveLineLeadRoleFromWhitelistEntry(entry) {
    return normalizeLineLeadRole(entry && entry.style);
}

function resolveLineLeadRoleFromSystemConfig(systemConfig, lineUserId) {
    return resolveLineLeadRoleFromWhitelistEntry(findLineUserWhitelistEntry(systemConfig, lineUserId));
}

async function getLineUserWhitelistEntry(req, lineUserId, systemConfigOverride) {
    let systemConfig = systemConfigOverride;
    if (!systemConfig) {
        try {
            systemConfig = await getSystemConfig(req);
        } catch (_) {
            systemConfig = null;
        }
    }

    return findLineUserWhitelistEntry(systemConfig, lineUserId);
}

async function isLineUserWhitelisted(req, lineUserId, systemConfigOverride) {
    return Boolean(await getLineUserWhitelistEntry(req, lineUserId, systemConfigOverride));
}

function getLineLeadSessionSecret() {
    return lineLeadConfig.SESSION_SECRET;
}

function getBearerToken(req) {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return null;

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

function normalizeVerifiedLineUser(user) {
    const userId = user && typeof user.sub === 'string' ? user.sub.trim() : '';
    if (!userId) return null;

    return {
        userId,
        displayName: typeof user.name === 'string'
            ? user.name
            : (typeof user.displayName === 'string' ? user.displayName : undefined),
        pictureUrl: typeof user.picture === 'string'
            ? user.picture
            : (typeof user.pictureUrl === 'string' ? user.pictureUrl : undefined),
        isLocalDev: false
    };
}

function createLocalDevLineUser() {
    return {
        userId: 'TEST_LOCAL_USER',
        displayName: 'Local Dev User',
        pictureUrl: null,
        isLocalDev: true
    };
}

function buildSessionPayload(lineUser) {
    const payload = {
        scope: lineLeadConfig.SCOPE
    };

    if (typeof lineUser.displayName === 'string' && lineUser.displayName) {
        payload.displayName = lineUser.displayName;
    }
    if (typeof lineUser.pictureUrl === 'string' && lineUser.pictureUrl) {
        payload.pictureUrl = lineUser.pictureUrl;
    }
    if (lineUser.isLocalDev === true) {
        payload.isLocalDev = true;
    }

    return payload;
}

function issueLineLeadSessionJwt(lineUser, sessionSeconds) {
    const secret = getLineLeadSessionSecret();
    if (!secret) return null;

    return jwt.sign(
        buildSessionPayload(lineUser),
        secret,
        {
            algorithm: 'HS256',
            issuer: lineLeadConfig.ISSUER,
            audience: lineLeadConfig.AUDIENCE,
            subject: lineUser.userId,
            expiresIn: sessionSeconds
        }
    );
}

function verifyLineLeadSessionJwt(token) {
    const secret = getLineLeadSessionSecret();
    if (!secret) {
        const error = new Error('Line Lead session secret is unavailable.');
        error.code = 'LINE_LEAD_SESSION_SECRET_MISSING';
        throw error;
    }

    const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: lineLeadConfig.ISSUER,
        audience: lineLeadConfig.AUDIENCE
    });

    const userId = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    if (!userId || payload.scope !== lineLeadConfig.SCOPE) {
        const error = new Error('Invalid Line Lead session claims.');
        error.code = 'LINE_LEAD_SESSION_CLAIMS_INVALID';
        throw error;
    }

    return {
        userId,
        displayName: typeof payload.displayName === 'string' ? payload.displayName : undefined,
        pictureUrl: typeof payload.pictureUrl === 'string' ? payload.pictureUrl : undefined,
        isLocalDev: payload.isLocalDev === true
    };
}

function sendSafeSecretError(res) {
    return res.status(503).json({
        success: false,
        message: 'Line Lead session service is unavailable.'
    });
}

function sendUnauthorized(res) {
    return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Unauthorized'
    });
}

function sendForbidden(req, res, userId) {
    clearLineLeadSessionCookie(req, res);
    return res.status(403).json({
        success: false,
        authenticated: false,
        message: '未授權的帳號',
        yourUserId: userId
    });
}

async function establishSessionForUser(req, res, lineUser, systemConfig) {
    const sessionDays = resolveLineLeadSessionDays(systemConfig);
    const sessionSeconds = sessionDays * 24 * 60 * 60;
    const token = issueLineLeadSessionJwt(lineUser, sessionSeconds);
    const role = normalizeLineLeadRole(lineUser.role || resolveLineLeadRoleFromSystemConfig(systemConfig, lineUser.userId));

    if (!token) {
        return sendSafeSecretError(res);
    }

    res.cookie(
        lineLeadConfig.COOKIE_NAME,
        token,
        getCookieOptions(req, sessionSeconds * 1000)
    );

    return res.json({
        success: true,
        authenticated: true,
        userId: lineUser.userId,
        displayName: lineUser.displayName,
        pictureUrl: lineUser.pictureUrl,
        role,
        sessionDays
    });
}

async function getLineLeadSession(req, res) {
    const cookies = parseCookies(req.headers && req.headers.cookie);
    const token = cookies[lineLeadConfig.COOKIE_NAME];

    if (!token) {
        return sendUnauthorized(res);
    }

    if (!getLineLeadSessionSecret()) {
        return sendSafeSecretError(res);
    }

    let lineUser;
    try {
        lineUser = verifyLineLeadSessionJwt(token);
    } catch (_) {
        clearLineLeadSessionCookie(req, res);
        return sendUnauthorized(res);
    }

    if (lineUser.isLocalDev) {
        if (!isAllowedLocalDevRequest(req)) {
            clearLineLeadSessionCookie(req, res);
            return sendUnauthorized(res);
        }
        lineUser.role = 'recorder';
    } else {
        let systemConfig;
        try {
            systemConfig = await getSystemConfig(req);
        } catch (_) {
            systemConfig = null;
        }
        const whitelistEntry = await getLineUserWhitelistEntry(req, lineUser.userId, systemConfig);
        if (!whitelistEntry) {
            return sendForbidden(req, res, lineUser.userId);
        }
        lineUser.role = resolveLineLeadRoleFromWhitelistEntry(whitelistEntry);
    }

    req.lineUser = lineUser;
    return res.json({
        success: true,
        authenticated: true,
        userId: lineUser.userId,
        displayName: lineUser.displayName,
        pictureUrl: lineUser.pictureUrl,
        role: normalizeLineLeadRole(lineUser.role)
    });
}

async function createLineLeadSession(req, res) {
    if (!getLineLeadSessionSecret()) {
        return sendSafeSecretError(res);
    }

    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
        return sendUnauthorized(res);
    }

    if (bearerToken === 'TEST_LOCAL_TOKEN') {
        if (!isAllowedLocalDevRequest(req)) {
            return sendUnauthorized(res);
        }

        const lineUser = createLocalDevLineUser();
        lineUser.role = 'recorder';
        let systemConfig = null;
        try {
            systemConfig = await getSystemConfig(req);
        } catch (_) {
            systemConfig = null;
        }
        return establishSessionForUser(req, res, lineUser, systemConfig);
    }

    const services = getServices(req);
    const authService = services && services.authService;
    if (!authService || typeof authService.verifyLineIdToken !== 'function') {
        return sendUnauthorized(res);
    }

    const verifiedLineUser = await authService.verifyLineIdToken(bearerToken);
    const lineUser = normalizeVerifiedLineUser(verifiedLineUser);
    if (!lineUser) {
        return sendUnauthorized(res);
    }

    let systemConfig;
    try {
        systemConfig = await getSystemConfig(req);
    } catch (_) {
        systemConfig = null;
    }

    const whitelistEntry = await getLineUserWhitelistEntry(req, lineUser.userId, systemConfig);
    if (!whitelistEntry) {
        return res.status(403).json({
            success: false,
            authenticated: false,
            message: '未授權的帳號',
            yourUserId: lineUser.userId
        });
    }

    lineUser.role = resolveLineLeadRoleFromWhitelistEntry(whitelistEntry);
    return establishSessionForUser(req, res, lineUser, systemConfig);
}

function deleteLineLeadSession(req, res) {
    clearLineLeadSessionCookie(req, res);
    return res.json({ success: true });
}

async function requireLineLeadSession(req, res, next) {
    const cookies = parseCookies(req.headers && req.headers.cookie);
    const token = cookies[lineLeadConfig.COOKIE_NAME];

    if (!token) {
        return sendUnauthorized(res);
    }

    if (!getLineLeadSessionSecret()) {
        return sendSafeSecretError(res);
    }

    let lineUser;
    try {
        lineUser = verifyLineLeadSessionJwt(token);
    } catch (_) {
        clearLineLeadSessionCookie(req, res);
        return sendUnauthorized(res);
    }

    if (lineUser.isLocalDev) {
        if (!isAllowedLocalDevRequest(req)) {
            clearLineLeadSessionCookie(req, res);
            return sendUnauthorized(res);
        }
        lineUser.role = 'recorder';
    } else {
        let systemConfig;
        try {
            systemConfig = await getSystemConfig(req);
        } catch (_) {
            systemConfig = null;
        }
        const whitelistEntry = await getLineUserWhitelistEntry(req, lineUser.userId, systemConfig);
        if (!whitelistEntry) {
            return sendForbidden(req, res, lineUser.userId);
        }
        lineUser.role = resolveLineLeadRoleFromWhitelistEntry(whitelistEntry);
    }

    req.lineUser = lineUser;
    return next();
}

module.exports = {
    getLineLeadSession,
    createLineLeadSession,
    deleteLineLeadSession,
    requireLineLeadSession,
    parseCookies,
    isLocalhostRequest,
    isAllowedLocalDevRequest,
    getCookieOptions,
    clearLineLeadSessionCookie,
    resolveLineLeadSessionDays,
    normalizeLineLeadRole,
    findLineUserWhitelistEntry,
    resolveLineLeadRoleFromWhitelistEntry,
    resolveLineLeadRoleFromSystemConfig,
    getLineUserWhitelistEntry,
    isLineUserWhitelisted,
    issueLineLeadSessionJwt,
    verifyLineLeadSessionJwt
};
