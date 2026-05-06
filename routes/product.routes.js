/**
 * routes/product.routes.js
 * 商品模組路由
 * * @version 5.1.0 (Phase 4 Refactoring)
 * @date 2026-01-13
 * @author Gemini (System Architect)
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Helper: 取得 Controller 實例
const getController = (req) => req.app.get('services').productController;

// Middleware: 全域驗證
router.use(authMiddleware.verifyToken);

// GET /api/products
router.get('/', (req, res) => getController(req).getProducts(req, res));

// POST /api/products/refresh
router.post('/refresh', (req, res) => getController(req).refresh(req, res));

// POST /api/products/batch
router.post('/batch', (req, res) => getController(req).batchUpdate(req, res));

// GET /api/products/category-order
router.get('/category-order', (req, res) => getController(req).getCategoryOrder(req, res));

// POST /api/products/category-order
router.post('/category-order', (req, res) => getController(req).saveCategoryOrder(req, res));

module.exports = router;