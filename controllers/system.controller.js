// ============================================================================
// File: controllers/system.controller.js
// ============================================================================
/**
 * controllers/system.controller.js
 * @version 2.8.2 Phase C-2.5 (Patch: Tooltip Lazy Load)
 * @date 2026-04-24
 * @changelog
 * - Added getDashboardCompanyActivityDetails for lazy fetching MTU/SI activity details.
 * - Added hook to invalidate DashboardService RAW contact cache on force refresh.
 * - [PHASE D-2] backend dashboard range support added for safe analytical sections
 * - [PHASE D-2] operational dashboard sections intentionally left unfiltered
 * - [PHASE C-2.4] RAW contacts dashboard stats made non-blocking
 * - [PHASE C-2.4] dashboard initial render no longer waits for Google Sheet contact stats
 * - Removed SystemController dashboard debug logs
 * * [Forensics Fix / Phase 8.3 Task] Added temporary debug logs for /api/dashboard handler.
 */
const { handleApiError } = require('../middleware/error.middleware');
// [New] 引入 SystemService 以支援向後相容的內部實例化
const SystemService = require('../services/system-service');

class SystemController {
    /**
     * @param {SystemService|SystemReader} arg1 - SystemService 或 SystemReader (Legacy)
     * @param {DashboardService|SystemWriter} arg2 - DashboardService 或 SystemWriter (Legacy)
     * @param {DashboardService} [arg3] - DashboardService (Legacy only)
     */
    constructor(arg1, arg2, arg3) {
        // Duck Typing: 若第一個參數具有 getSystemConfig 方法，判定為 SystemService
        const isService = arg1 && typeof arg1.getSystemConfig === 'function';

        if (isService) {
            // 新式注入: (systemService, dashboardService)
            this.systemService = arg1;
            this.dashboardService = arg2;
        } else {
            // 舊式注入相容: (systemReader, systemWriter, dashboardService)
            // 內部自行組裝 Service
            this.systemService = new SystemService(arg1, arg2);
            this.dashboardService = arg3;
        }
    }

    // 處理 GET /api/config
    getSystemConfig = async (req, res) => {
        try {
            const config = await this.systemService.getSystemConfig();
            res.json(config);
        } catch (error) {
            handleApiError(res, error, 'Get Config');
        }
    };

    // 處理 POST /api/cache/invalidate
    invalidateCache = async (req, res) => {
        try {
            const result = await this.systemService.invalidateCache();
            
            // [PHASE C-2.4 PATCH] Invalidate Dashboard RAW cache on global force refresh
            if (this.dashboardService && typeof this.dashboardService.invalidateRawContactStatsCache === 'function') {
                this.dashboardService.invalidateRawContactStatsCache();
            }

            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Invalidate Cache');
        }
    };

    // 處理 GET /api/system/status
    getSystemStatus = async (req, res) => {
        try {
            const result = await this.systemService.getSystemStatus();
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Get System Status');
        }
    };

    // --- Dashboard 聚合方法 (維持使用 DashboardService) ---

    // 處理 GET /api/dashboard
    getDashboardData = async (req, res) => {
        try {
            // [PHASE D-2] Extract range parameters for safe analytical sections
            const options = {
                range: req.query.range,
                start: req.query.start,
                end: req.query.end
            };

            const data = await this.dashboardService.getDashboardData(options);
            
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Dashboard');
        }
    };

    // [PHASE C-2.4] 處理 GET /api/dashboard/contacts-stats
    getDashboardContactStats = async (req, res) => {
        try {
            const data = await this.dashboardService.getRawContactStats();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Dashboard Contact Stats');
        }
    };

    // 處理 GET /api/dashboard/company-activity-details
    getDashboardCompanyActivityDetails = async (req, res) => {
        try {
            const { type } = req.query;
            if (type !== 'mtu' && type !== 'si') {
                return res.status(400).json({ success: false, message: 'Invalid type' });
            }
            const data = await this.dashboardService.getCompanyActivityDetails(type);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Company Activity Details');
        }
    };

    // 處理 GET /api/contacts/dashboard
    getContactsDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getContactsDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Contacts Dashboard');
        }
    };

    // 處理 GET /api/events/dashboard
    getEventsDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getEventsDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Events Dashboard');
        }
    };

    // 處理 GET /api/companies/dashboard
    getCompaniesDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getCompaniesDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Companies Dashboard');
        }
    };
}

module.exports = SystemController;