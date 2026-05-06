// routes/interaction.routes.js
/**
 * Interaction Routes
 * * @version 6.0.1 (Fix: Add /all route)
 * @date 2026-01-14
 * @description 互動紀錄路由。補上 /all 路徑以符合前端呼叫習慣。
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');

// 輔助函式：取得 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.interactionController) {
        throw new Error('InteractionController 尚未初始化');
    }
    return services.interactionController;
};

// ==========================================
// 公開/讀取路由 (Public/Read Routes)
// ==========================================

// GET /api/interactions (標準列表)
router.get('/', (req, res, next) => {
    getController(req).getInteractions(req, res, next);
});

// ★ 新增：GET /api/interactions/all (前端 Dashboard 與列表頁面使用此路徑)
router.get('/all', (req, res, next) => {
    getController(req).getInteractions(req, res, next);
});

// GET /api/interactions/opportunity/:id
router.get('/opportunity/:id', (req, res, next) => {
    getController(req).getInteractionsByOpportunity(req, res, next);
});

// GET /api/interactions/company/:id
router.get('/company/:id', (req, res, next) => {
    getController(req).getInteractionsByCompany(req, res, next);
});

// ==========================================
// 保護路由 (Protected Routes) - 需要 Token
// ==========================================

// POST /api/interactions
router.post('/', verifyToken, (req, res, next) => {
    getController(req).createInteraction(req, res, next);
});

// PUT /api/interactions/:id
router.put('/:id', verifyToken, (req, res, next) => {
    getController(req).updateInteraction(req, res, next);
});

// DELETE /api/interactions/:id
router.delete('/:id', verifyToken, (req, res, next) => {
    getController(req).deleteInteraction(req, res, next);
});

module.exports = router;