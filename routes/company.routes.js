// routes/company.routes.js
/**
 * Company Routes
 * * @version 8.0.0 (Phase 8: Switch to ID-based Routes)
 * @date 2026-02-10
 */

const express = require('express');
const router = express.Router();

// 輔助函式
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.companyController) {
        throw new Error('CompanyController 尚未初始化');
    }
    return services.companyController;
};

// 取得 ExternalController (可能尚未重構，維持 require 或從 services 嘗試取得)
// 這裡保留 require 以確保 Phase 5 之前的相容性
const externalController = require('../controllers/external.controller');

// GET /api/companies/
router.get('/', (req, res, next) => {
    getController(req).getCompanies(req, res, next);
});

// POST /api/companies/
router.post('/', (req, res, next) => {
    getController(req).createCompany(req, res, next);
});

// --- AI 路由 (External Controller) ---
// POST /api/companies/:companyId/generate-profile
// [Contract Fix] Changed param to :companyId
router.post('/:companyId/generate-profile', externalController.generateCompanyProfile);

// --- 公司路由 ---

// GET /api/companies/:companyId/details
// [Contract Fix] Changed param to :companyId
router.get('/:companyId/details', (req, res, next) => {
    getController(req).getCompanyDetails(req, res, next);
});

// PUT /api/companies/:companyId
// [Contract Fix] Changed param to :companyId
router.put('/:companyId', (req, res, next) => {
    getController(req).updateCompany(req, res, next);
});

// DELETE /api/companies/:companyId
// [Contract Fix] Changed param to :companyId
router.delete('/:companyId', (req, res, next) => {
    getController(req).deleteCompany(req, res, next);
});

module.exports = router;