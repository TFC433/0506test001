/**
 * controllers/product.controller.js
 * 商品模組控制器
 * * @version 5.1.0 (Phase 4 Refactoring)
 * @date 2026-01-13
 * @author Gemini (System Architect)
 * @description
 * 採用 Class-based 架構。
 * 透過 ServiceContainer 進行依賴注入，不再使用 require。
 */

const config = require('../config');

class ProductController {
    /**
     * @param {ProductService} productService - 注入的服務實例
     */
    constructor(productService) {
        this.productService = productService;
    }

    /**
     * 獲取商品列表
     * GET /api/products
     */
    async getProducts(req, res) {
        try {
            // 權限檢查 (Controller 職責)
            if (req.user.role !== 'admin') {
                return res.status(403).json({ success: false, error: config.ERROR_MESSAGES.ADMIN_ONLY });
            }

            const { q } = req.query;
            const filters = q ? { search: q } : {};
            
            const data = await this.productService.getAllProducts(filters);
            res.json({ success: true, data: data, count: data.length });
        } catch (error) {
            console.error('[ProductController] getProducts Error:', error);
            res.status(500).json({ success: false, error: config.ERROR_MESSAGES.NETWORK_ERROR });
        }
    }

    /**
     * 強制重新整理快取
     * POST /api/products/refresh
     */
    async refresh(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }
            await this.productService.refreshCache();
            res.json({ success: true, message: '商品資料已重新同步' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * 批次更新商品
     * POST /api/products/batch
     */
    async batchUpdate(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ success: false, error: '權限不足' });
            }
            const { products } = req.body;
            
            const result = await this.productService.batchUpdate(products, req.user);
            res.json({ success: true, message: `處理完成 (更新: ${result.updated}, 新增: ${result.appended})`, result });
        } catch (error) {
            console.error('[ProductController] batchUpdate Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * 獲取分類排序
     * GET /api/products/category-order
     */
    async getCategoryOrder(req, res) {
        try {
            const order = await this.productService.getCategoryOrder();
            res.json({ success: true, order });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * 儲存分類排序
     * POST /api/products/category-order
     */
    async saveCategoryOrder(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: '權限不足' });
            
            const { order } = req.body;
            await this.productService.saveCategoryOrder(order, req.user);
            res.json({ success: true, message: '分類排序已更新' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = ProductController;