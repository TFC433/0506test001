/**
 * routes/external.routes.js
 * 外部整合路由 (Google Search, AI, Drive)
 * * @version 6.0.0
 * @date 2026-01-15
 */
const express = require('express');
const router = express.Router();
const externalController = require('../controllers/external.controller');

// GET /api/external/thumbnail
// 新版標準路徑，用於取得 Google Drive 圖片縮圖
router.get('/thumbnail', externalController.getDriveThumbnail);

// POST /api/external/companies/:companyName/profile
// 用於生成公司 AI 簡介
router.post('/companies/:companyName/profile', externalController.generateCompanyProfile);

module.exports = router;