// routes/announcement.routes.js
/**
 * Announcement Routes
 * * @version 6.0.1 (Fix: Add Auth Middleware)
 * @date 2026-01-14
 * @description 修正：加入 verifyToken 中介軟體，確保 req.user 存在。
 */

const express = require('express');
const router = express.Router();
// ★ 引入驗證中介軟體
const { verifyToken } = require('../middleware/auth.middleware');

// 輔助函式：動態獲取 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.announcementController) {
        throw new Error('AnnouncementController 尚未初始化');
    }
    return services.announcementController;
};

// ==========================================
// 公開路由 (Public Routes)
// ==========================================

// GET /api/announcements/ (讀取通常允許所有登入用戶，甚至公開，視需求而定)
// 建議：如果是內部系統，讀取也應該要 verifyToken，但目前先只修復寫入錯誤
router.get('/', (req, res, next) => {
    getController(req).getAnnouncements(req, res, next);
});

// ==========================================
// 保護路由 (Protected Routes) - 需要 Token
// ==========================================

// POST /api/announcements/
router.post('/', verifyToken, (req, res, next) => {
    getController(req).createAnnouncement(req, res, next);
});

// PUT /api/announcements/:id
router.put('/:id', verifyToken, (req, res, next) => {
    getController(req).updateAnnouncement(req, res, next);
});

// DELETE /api/announcements/:id
router.delete('/:id', verifyToken, (req, res, next) => {
    getController(req).deleteAnnouncement(req, res, next);
});

module.exports = router;