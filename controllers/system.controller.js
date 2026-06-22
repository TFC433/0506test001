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

const ACTIVITY_TIMELINE_EVENT_TYPES_PREF = 'activity_timeline_enabled_event_types';
const MAX_ACTIVITY_TIMELINE_PREF_NOTE_LENGTH = 10000;
const USER_SESSION_ALLOWED_PERIOD_DAYS = new Set([7, 30, 90]);
const AUDIT_LOG_FILTER_KEYS = [
    'module',
    'action',
    'business_event_type',
    'target_type',
    'target_id',
    'actor_username',
    'date_from',
    'date_to'
];

class SystemController {
    /**
     * @param {SystemService|SystemReader} arg1 - SystemService 或 SystemReader (Legacy)
     * @param {DashboardService|SystemWriter} arg2 - DashboardService 或 SystemWriter (Legacy)
     * @param {DashboardService|AuditLoggerService} [arg3] - AuditLoggerService (Service) or DashboardService (Legacy)
     * @param {AuditLoggerService|ActivityTimelineService} [arg4] - ActivityTimelineService (Service) or AuditLoggerService (Legacy)
     * @param {ActivityTimelineService} [arg5] - ActivityTimelineService (Legacy only)
     */
    constructor(arg1, arg2, arg3, arg4, arg5) {
        // Duck Typing: 若第一個參數具有 getSystemConfig 方法，判定為 SystemService
        const isService = arg1 && typeof arg1.getSystemConfig === 'function';

        if (isService) {
            // 新式注入: (systemService, dashboardService)
            this.systemService = arg1;
            this.dashboardService = arg2;
            this.auditLoggerService = arg3;
            this.activityTimelineService = arg4;
        } else {
            // 舊式注入相容: (systemReader, systemWriter, dashboardService)
            // 內部自行組裝 Service
            this.systemService = new SystemService(arg1, arg2);
            this.dashboardService = arg3;
            this.auditLoggerService = arg4;
            this.activityTimelineService = arg5;
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

    // 處理 PUT /api/config/pref
    updateSystemPref = async (req, res) => {
        try {
            const { item, note } = req.body || {};

            if (item !== ACTIVITY_TIMELINE_EVENT_TYPES_PREF) {
                return res.status(400).json({ success: false, message: 'Invalid preference item.' });
            }

            if (typeof note !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid preference note.' });
            }

            if (note.length > MAX_ACTIVITY_TIMELINE_PREF_NOTE_LENGTH) {
                return res.status(400).json({ success: false, message: 'Preference note is too long.' });
            }

            const modifier = req.user?.displayName || req.user?.username || req.user?.name || 'System';
            await this.systemService.updateSystemPref(item, note, modifier);

            res.json({
                success: true,
                message: 'System preference updated.',
                data: { item }
            });
        } catch (error) {
            handleApiError(res, error, 'Update System Pref');
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

    // ?? GET /api/audit-logs
    getAuditLogs = async (req, res) => {
        try {
            const page = this._normalizePositiveInt(req.query.page, 1);
            const limit = Math.min(this._normalizePositiveInt(req.query.limit, 50), 300);
            const filters = { page, limit };

            AUDIT_LOG_FILTER_KEYS.forEach(key => {
                if (typeof req.query[key] === 'string' && req.query[key].trim()) {
                    filters[key] = req.query[key].trim();
                }
            });

            const result = await this.auditLoggerService.getAuditLogs(filters);
            const totalItems = result.totalItems || 0;
            const total = Math.max(Math.ceil(totalItems / limit), 1);

            res.json({
                success: true,
                data: result.data || [],
                pagination: {
                    current: page,
                    total,
                    totalItems,
                    hasNext: page < total,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            handleApiError(res, error, 'Get Audit Logs');
        }
    };

    // ?? GET /api/activity-timeline
    getUserSessions = async (req, res) => {
        try {
            const page = this._normalizePositiveInt(req.query.page, 1);
            const limit = Math.min(this._normalizePositiveInt(req.query.limit, 50), 300);
            const periodDays = this._normalizeUserSessionPeriodDays(req.query.period_days);
            const filters = { page, limit, periodDays };

            const result = await this.auditLoggerService.getUserSessions(filters);
            const totalItems = result.totalItems || 0;
            const total = Math.max(Math.ceil(totalItems / limit), 1);

            res.json({
                success: true,
                data: result.data || [],
                pagination: {
                    current: page,
                    total,
                    totalItems,
                    hasNext: page < total,
                    hasPrev: page > 1
                },
                period: result.period || null
            });
        } catch (error) {
            handleApiError(res, error, 'Get User Sessions');
        }
    };

    getActivityTimeline = async (req, res) => {
        try {
            const filters = {
                page: this._normalizePositiveInt(req.query.page, 1),
                limit: Math.min(this._normalizePositiveInt(req.query.limit, 50), 300)
            };

            if (typeof req.query.target_type === 'string' && req.query.target_type.trim()) {
                filters.target_type = req.query.target_type.trim();
            }

            if (typeof req.query.target_id === 'string' && req.query.target_id.trim()) {
                filters.target_id = req.query.target_id.trim();
            }

            const result = await this.activityTimelineService.getActivityTimeline(filters);

            res.json({
                success: true,
                data: result.data || [],
                pagination: result.pagination || {
                    current: filters.page,
                    total: 1,
                    totalItems: 0,
                    hasNext: false,
                    hasPrev: false
                }
            });
        } catch (error) {
            handleApiError(res, error, 'Get Activity Timeline');
        }
    };

    _normalizePositiveInt(value, fallback) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    _normalizeUserSessionPeriodDays(value) {
        const parsed = this._normalizePositiveInt(value, 30);
        return USER_SESSION_ALLOWED_PERIOD_DAYS.has(parsed) ? parsed : 30;
    }

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
