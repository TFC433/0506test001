// routes/system.routes.js
/**
 * System Routes
 * @version 5.2.1 (Phase C-2.5)
 * @date 2026-04-24
 * @changelog
 * - Added lazy load endpoint for company activity details.
 * - RAW contacts dashboard stats made non-blocking
 * - dashboard initial render no longer waits for Google Sheet contact stats
 * - Phase 5 - Service Locator Pattern
 * @description 使用 req.app.get('services') 動態獲取 Controller 實例
 */

const express = require('express');
const router = express.Router();

// 輔助函式：動態獲取 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.systemController) {
        throw new Error('SystemController 尚未初始化');
    }
    return services.systemController;
};

// 系統設定
// GET /api/config
router.get('/config', (req, res, next) => {
    getController(req).getSystemConfig(req, res, next);
});

// 清除快取
// POST /api/cache/invalidate
router.post('/cache/invalidate', (req, res, next) => {
    getController(req).invalidateCache(req, res, next);
});

// 系統狀態輪詢
// GET /api/system/status
router.get('/system/status', (req, res, next) => {
    getController(req).getSystemStatus(req, res, next);
});

// --- 儀表板路由 ---

// GET /api/dashboard
router.get('/dashboard', (req, res, next) => {
    getController(req).getDashboardData(req, res, next);
});

// [PHASE C-2.4] GET /api/dashboard/contacts-stats
router.get('/dashboard/contacts-stats', (req, res, next) => {
    getController(req).getDashboardContactStats(req, res, next);
});

// GET /api/dashboard/company-activity-details
router.get('/dashboard/company-activity-details', (req, res, next) => {
    getController(req).getDashboardCompanyActivityDetails(req, res, next);
});

// GET /api/contacts/dashboard
router.get('/contacts/dashboard', (req, res, next) => {
    getController(req).getContactsDashboardData(req, res, next);
});

// GET /api/events/dashboard
router.get('/events/dashboard', (req, res, next) => {
    getController(req).getEventsDashboardData(req, res, next);
});

// GET /api/companies/dashboard
router.get('/companies/dashboard', (req, res, next) => {
    getController(req).getCompaniesDashboardData(req, res, next);
});

module.exports = router;