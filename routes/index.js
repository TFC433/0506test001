/**
 * routes/index.js
 * API 總路由入口
 * * @version 6.2.0 (Added Internal Ops Routes)
 * @date 2026-04-20
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// --- Controllers ---
const externalController = require('../controllers/external.controller');

// --- Routes ---
const authRoutes = require('./auth.routes');
const systemRoutes = require('./system.routes');
const announcementRoutes = require('./announcement.routes');
const contactRoutes = require('./contact.routes');
const companyRoutes = require('./company.routes');
const opportunityRoutes = require('./opportunity.routes');
const productRoutes = require('./product.routes');
const weeklyRoutes = require('./weekly.routes');
const salesRoutes = require('./sales.routes');
const interactionRoutes = require('./interaction.routes');
const eventRoutes = require('./event.routes');
const lineLeadsRoutes = require('./line-leads.routes');
const externalRoutes = require('./external.routes');
const calendarRoutes = require('./calendar.routes');
const internalOpsRoutes = require('./internal-ops.routes');
const activityIntelligenceRoutes = require('./activity-intelligence.routes');
const {
    requireLineLeadSession,
    isAllowedLocalDevRequest,
    normalizeLineLeadRole,
    isGuestLineLeadUser
} = require('../middleware/line-lead-session.middleware');

const ACTIVITY_INTELLIGENCE_LOCAL_ROLE_HEADER = 'x-activity-intelligence-local-role';

function bridgeLineUserToActivityIntelligenceUser(req, res, next) {
    const lineUser = req.lineUser || {};
    const guest = isGuestLineLeadUser(lineUser);
    let role = guest ? null : normalizeLineLeadRole(lineUser.role);
    const localRoleOverride = req.get(ACTIVITY_INTELLIGENCE_LOCAL_ROLE_HEADER);

    if (localRoleOverride) {
        const requestedRole = String(localRoleOverride).trim().toLowerCase();
        const normalizedRole = normalizeLineLeadRole(requestedRole);
        const allowedLocalOverride = lineUser.isLocalDev === true && isAllowedLocalDevRequest(req);

        if (!allowedLocalOverride || requestedRole !== normalizedRole) {
            return res.status(403).json({
                success: false,
                error: 'Activity Intelligence local role override is not allowed.',
                code: 'ACTIVITY_INTELLIGENCE_LOCAL_ROLE_FORBIDDEN'
            });
        }

        role = normalizedRole;
    }

    req.user = {
        userId: lineUser.userId,
        displayName: lineUser.displayName || lineUser.userId,
        pictureUrl: lineUser.pictureUrl || null,
        role,
        isLocalDev: lineUser.isLocalDev === true,
        accessClass: guest ? 'guest' : 'member',
        whitelisted: !guest
    };

    return next();
}

// ==========================================
// 1. 公開/特殊驗證路由 (Public / Custom Auth)
// ==========================================
router.use('/auth', authRoutes);

// ★★★ 關鍵修正：LINE 路由必須移出標準 Auth 保護區 ★★★
router.use('/line', lineLeadsRoutes);
router.use(
    '/line/activity-intelligence',
    requireLineLeadSession,
    bridgeLineUserToActivityIntelligenceUser,
    activityIntelligenceRoutes
);

// Legacy: 名片預覽
router.get('/drive/thumbnail', externalController.getDriveThumbnail);

// ==========================================
// 2. 系統標準保護區域 (System Protected)
// ==========================================
router.use(authMiddleware.verifyToken);

router.use('/', systemRoutes);
router.use('/external', externalRoutes);
router.use('/announcements', announcementRoutes);
router.use('/contacts', contactRoutes);
router.use('/contact-list', contactRoutes);
router.use('/companies', companyRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/products', productRoutes);
router.use('/business/weekly', weeklyRoutes);

// ✅ 原本路由
router.use('/sales', salesRoutes);
// ✅ 相容前端用的 alias（不動前端）
router.use('/sales-analysis', salesRoutes);

router.use('/interactions', interactionRoutes);
router.use('/events', eventRoutes);
router.use('/calendar', calendarRoutes);
router.use('/internal-ops', internalOpsRoutes);

// ==========================================
// 3. 404 與 根路徑
// ==========================================
router.get('/', (req, res) => {
    res.json({ status: 'online', message: 'TFC CRM API v6.2.0' });
});

router.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'API Endpoint Not Found' });
});

module.exports = router;
