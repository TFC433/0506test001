/**
 * routes/line-leads.routes.js
 * @version 1.3.0
 * @date 2026-03-22
 * @description Line-Leads L1→L2：改由 services 容器注入 authService。新增 systemService 注入以支援展會設定讀取。
 * @changelog 
 * - [V1.3.0] Added DELETE /leads/:rowIndex endpoint for physical card deletion.
 * - [V1.2.0] Passed systemService into LineLeadsController constructor.
 */

const express = require('express');
const router = express.Router();
const LineLeadsController = require('../controllers/line-leads.controller');

// 依賴注入：從 app 中獲取 services
const getController = (req) => {
    const app = req.app;
    const services = app.get('services');

    const { contactService, authService, systemService } = services;

    if (!authService) {
        throw new Error("authService is not available in app.get('services'). Make sure services/index.js includes authService.");
    }

    return new LineLeadsController(contactService, authService, systemService);
};

// GET /api/line/leads - 取得所有名片資料
router.get('/leads', (req, res) => getController(req).getAllLeads(req, res));

// PUT /api/line/leads/:rowIndex - 更新特定名片狀態/資料
router.put('/leads/:rowIndex', (req, res) => getController(req).updateLead(req, res));

// DELETE /api/line/leads/:rowIndex - 刪除特定名片 (物理刪除)
router.delete('/leads/:rowIndex', (req, res) => getController(req).deleteLead(req, res));

module.exports = router;