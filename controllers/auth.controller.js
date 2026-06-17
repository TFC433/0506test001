// controllers/auth.controller.js
/**
 * AuthController Class
 * * @version 5.1.0 (Phase 5 - Class Refactoring)
 * @date 2026-01-12
 * @description 適配器層，負責將 HTTP 請求轉發給 AuthService。
 */

const { handleApiError } = require('../middleware/error.middleware');
const { extractRequestMetadata } = require('../utils/audit-helpers');
const jwt = require('jsonwebtoken');
const config = require('../config');

class AuthController {
    /**
     * @param {AuthService} authService 
     */
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/login
     */
    login = async (req, res) => {
        try {
            const { username, password } = req.body;
            const requestMetadata = extractRequestMetadata(req);
            // 呼叫 Service
            const result = await this.authService.login(username, password, requestMetadata);
            
            res.json({ 
                success: true, 
                ...result 
            });
        } catch (error) {
            // 特定錯誤回傳 401
            if (error.message === '帳號或密碼錯誤') {
                return res.status(401).json({ success: false, message: error.message });
            }
            handleApiError(res, error, 'Login');
        }
    };

    /**
     * POST /api/auth/logout
     */
    logout = async (req, res) => {
        const sessionId = this._extractSessionIdFromRequest(req);

        if (sessionId) {
            try {
                await this.authService.logout(sessionId, { logoutReason: 'manual_logout' });
            } catch (error) {
                console.warn('[AuthController] Failed to close logout session:', error.message);
            }
        }

        res.json({ success: true });
    };

    /**
     * GET /api/auth/verify
     * 驗證 Session (Token) 有效性
     */
    verifySession = (req, res) => {
        // 能進入此函式代表已通過 verifyToken middleware
        res.json({ 
            success: true, 
            message: 'Token Valid',
            user: req.user 
        });
    };

    _extractSessionIdFromRequest(req) {
        if (req && req.user && req.user.session_id) {
            return req.user.session_id;
        }

        const authHeader = req && req.headers ? req.headers['authorization'] : null;
        const token = authHeader && authHeader.split(' ')[0] === 'Bearer'
            ? authHeader.split(' ')[1]
            : null;

        if (!token) return null;

        try {
            const decoded = jwt.verify(token, config.AUTH.JWT_SECRET, { ignoreExpiration: true });
            return decoded && decoded.session_id ? decoded.session_id : null;
        } catch (error) {
            console.warn('[AuthController] Logout token decode skipped:', error.message);
            return null;
        }
    }

    /**
     * POST /api/auth/verify-password
     * 驗證舊密碼 (前端檢查用)
     */
    verifyPassword = async (req, res) => {
        try {
            const { password } = req.body;
            const { username } = req.user;

            const isValid = await this.authService.verifyPassword(username, password);
            
            if (!isValid) {
                 // 為了安全性，前端只知道 false，不回傳 404
                 return res.json({ success: true, valid: false });
            }

            res.json({ success: true, valid: true });

        } catch (error) {
            handleApiError(res, error, 'Verify Password');
        }
    };

    /**
     * POST /api/auth/change-password
     * 修改密碼
     */
    changePassword = async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const { username } = req.user;

            await this.authService.changePassword(username, oldPassword, newPassword);

            res.json({ success: true, message: '密碼修改成功' });

        } catch (error) {
            handleApiError(res, error, 'Change Password');
        }
    };
}

module.exports = AuthController;
