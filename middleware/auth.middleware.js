/**
 * middleware/auth.middleware.js
 * 權限驗證中介軟體
 * * @version 6.1.6 (Fixed: Local Dev Backdoor)
 * @date 2026-01-15
 * @description 負責驗證 JWT Token。包含針對 'TEST_LOCAL_TOKEN' 的特殊放行邏輯，以支援 leads-view.html 的本地開發模式。
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

const SESSION_TOUCH_THROTTLE_MS = 5 * 60 * 1000;
const lastSeenTouchBySession = new Map();

function getAuditLogger(req) {
    try {
        const services = req.app && req.app.get ? req.app.get('services') : null;
        return services && services.auditLoggerService ? services.auditLoggerService : null;
    } catch (error) {
        return null;
    }
}

function shouldTouchSession(sessionId) {
    if (!sessionId) return false;

    const now = Date.now();
    const lastTouch = lastSeenTouchBySession.get(sessionId) || 0;

    if (now - lastTouch < SESSION_TOUCH_THROTTLE_MS) {
        return false;
    }

    lastSeenTouchBySession.set(sessionId, now);
    return true;
}

function touchSessionLastSeen(req) {
    touchSessionLastSeenForUser(req, req && req.user);
}

function touchSessionLastSeenForUser(req, user) {
    const sessionId = user ? user.session_id : null;
    if (!shouldTouchSession(sessionId)) return;

    const auditLoggerService = getAuditLogger(req);
    if (!auditLoggerService || typeof auditLoggerService.touchUserSession !== 'function') return;

    auditLoggerService.touchUserSession(sessionId).catch(error => {
        console.warn('[Auth Middleware] Failed to touch session last_seen_at:', error.message);
    });
}

function getBearerTokenFromRequest(req) {
    const headers = req && req.headers ? req.headers : {};
    const authHeader = headers['authorization'] || headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return null;

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

function localTestUser() {
    return {
        username: 'TEST_LOCAL_USER',
        name: 'Local Developer',
        displayName: 'Local Developer',
        email: 'dev@localhost',
        picture: '',
        role: 'admin', // 給予最高權限以利測試
        session_id: 'dev-local-session'
    };
}

function verifyBearerTokenFromRequest(req, options = {}) {
    const token = getBearerTokenFromRequest(req);
    if (!token) {
        return { ok: false, status: 403, message: '未提供驗證 Token' };
    }

    // ============================================================
    // 🚧 [Dev Mode] 本地開發後門 (Digital Forensics: Restore 0109 Behavior)
    // ============================================================
    // 前端 leads-view.js 在本地環境 (localhost) 會發送此固定 Token。
    // 為了不修改前端代碼，後端必須在此攔截並給予放行。
    if (token === 'TEST_LOCAL_TOKEN' && options.allowLocalTestToken === true) {
        if (options.logFailures !== false) {
            console.warn('🚧 [Auth Middleware] 偵測到本地測試 Token，略過 JWT 驗證並注入模擬身分。');
        }

        const user = localTestUser();
        if (options.attachToRequest === true) req.user = user;
        if (options.touchLastSeen === true) touchSessionLastSeenForUser(req, user);
        return { ok: true, token, user };
    }
    // ============================================================

    // 標準 JWT 驗證流程 (正式環境)
    try {
        const user = jwt.verify(token, config.AUTH.JWT_SECRET);
        if (options.attachToRequest === true) req.user = user; // 將解碼後的用戶資訊附加到 req 物件
        if (options.touchLastSeen === true) touchSessionLastSeenForUser(req, user);
        return { ok: true, token, user };
    } catch (err) {
        if (options.logFailures !== false) {
            console.warn(`[Auth] Token 驗證失敗: ${err.message}`);
        }
        return { ok: false, status: 401, message: 'Token 無效或已過期', error: err };
    }
}

function verifyToken(req, res, next) {
    const result = verifyBearerTokenFromRequest(req, {
        allowLocalTestToken: true,
        attachToRequest: true,
        touchLastSeen: true
    });

    if (!result.ok) {
        return res.status(result.status).json({ success: false, message: result.message });
    }

    return next();
}

module.exports = {
    verifyToken,
    getBearerTokenFromRequest,
    verifyBearerTokenFromRequest,
    touchSessionLastSeen,
    touchSessionLastSeenForUser
};
