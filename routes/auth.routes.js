// routes/auth.routes.js
/**
 * Auth Routes
 * * @version 5.1.0 (Phase 5 - Service Locator Pattern)
 * @date 2026-01-12
 * @description 使用 req.app.get('services') 動態獲取 Controller 實例，
 * 避免直接 require 檔案導致的循環依賴或未初始化問題。
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');

// 輔助函式：動態獲取 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.authController) {
        throw new Error('AuthController尚未初始化');
    }
    return services.authController;
};

// 1. 登入 (公開)
router.post('/login', (req, res, next) => {
    getController(req).login(req, res, next);
});

// 2. 檢查 Token 有效性 (需登入)
router.get('/verify', verifyToken, (req, res, next) => {
    getController(req).verifySession(req, res, next);
});

// 3. 驗證舊密碼 (需登入)
router.post('/verify-password', verifyToken, (req, res, next) => {
    getController(req).verifyPassword(req, res, next);
});

// 4. 修改密碼 (需登入)
router.post('/change-password', verifyToken, (req, res, next) => {
    getController(req).changePassword(req, res, next);
});

module.exports = router;