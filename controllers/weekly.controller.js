// ============================================================================
// File: controllers/weekly.controller.js
// ============================================================================
/**
 * controllers/weekly.controller.js
 * 週間業務控制器 (Controller Layer)
 * * @version 6.0.2 (Refactored to Class & DI & Service Method Fix)
 * @date 2026-01-14
 * @description 負責接收 HTTP 請求，驗證參數，並呼叫 WeeklyBusinessService。
 * 已移除業務邏輯，僅保留路由轉發。
 */

const { handleApiError } = require('../middleware/error.middleware');

class WeeklyController {
    /**
     * @param {WeeklyBusinessService} weeklyBusinessService - 注入的業務服務
     */
    constructor(weeklyBusinessService) {
        this.weeklyBusinessService = weeklyBusinessService;
    }

    /**
     * GET /api/business/weekly/summary
     * 獲取週報列表摘要
     */
    getSummaryList = async (req, res) => {
        try {
            const data = await this.weeklyBusinessService.getWeeklyBusinessSummaryList();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Weekly Summary');
        }
    };

    /**
     * GET /api/business/weekly/week-options
     * 獲取週次選項 (下拉選單用)
     */
    getWeekOptions = async (req, res) => {
        try {
            const data = await this.weeklyBusinessService.getWeekOptions();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Week Options');
        }
    };

    /**
     * GET /api/business/weekly/details/:weekId
     * 獲取單週詳細資料
     */
    getWeeklyDetails = async (req, res) => {
        try {
            const { weekId } = req.params;
            // 支援 User 過濾 (若有需要可從 req.user.userId 傳入，目前維持 null 撈全部或依 Service 邏輯)
            const data = await this.weeklyBusinessService.getWeeklyDetails(weekId);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Weekly Details');
        }
    };

    /**
     * POST /api/business/weekly
     * 建立週報
     */
    createEntry = async (req, res) => {
        try {
            const data = { 
                ...req.body, 
                userId: req.user.userId, // 確保寫入 User ID
                creator: req.user.name 
            };
            const result = await this.weeklyBusinessService.createWeeklyBusinessEntry(data);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Weekly Entry');
        }
    };

    /**
     * PUT /api/business/weekly/:recordId
     * 更新週報
     */
    updateEntry = async (req, res) => {
        try {
            const { recordId } = req.params;
            const data = { 
                ...req.body, 
                creator: req.user.name 
            };
            const result = await this.weeklyBusinessService.updateWeeklyBusinessEntry(recordId, data);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Weekly Entry');
        }
    };

    /**
     * DELETE /api/business/weekly/:recordId
     * 刪除週報
     */
    deleteEntry = async (req, res) => {
        try {
            const { recordId } = req.params;
            
            // 修正：現在直接呼叫 Service 方法，不再穿透到 Writer
            const result = await this.weeklyBusinessService.deleteWeeklyBusinessEntry(recordId);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Weekly Entry');
        }
    };
}

module.exports = WeeklyController;