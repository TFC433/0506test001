This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: routes/event.routes.js, routes/interaction.routes.js, controllers/event.controller.js, controllers/interaction.controller.js, services/event-service.js, services/event-log-service.js, services/interaction-service.js, data/event-log-*.js, data/interaction-*.js, public/scripts/events/*.js, public/scripts/interactions.js, public/views/event-*.html, public/components/forms/event-form-*.html, public/components/modals/event-log-modal.html
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/event.controller.js
controllers/interaction.controller.js
data/event-log-reader.js
data/event-log-sql-reader.js
data/event-log-sql-writer.js
data/event-log-writer.js
data/interaction-reader.js
data/interaction-sql-reader.js
data/interaction-sql-writer.js
data/interaction-writer.js
public/components/forms/event-form-dt.html
public/components/forms/event-form-dx.html
public/components/forms/event-form-general.html
public/components/forms/event-form-iot.html
public/components/modals/event-log-modal.html
public/scripts/events/event-charts.js
public/scripts/events/event-editor-standalone.js
public/scripts/events/event-list.js
public/scripts/events/event-modal-manager.js
public/scripts/events/event-report-manager.js
public/scripts/events/event-wizard.js
public/scripts/events/events.js
public/scripts/interactions.js
public/views/event-editor.html
public/views/event-log-list.html
routes/event.routes.js
routes/interaction.routes.js
services/event-log-service.js
services/event-service.js
services/interaction-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/event.controller.js">
/**
 * controllers/event.controller.js
 * @version Phase 8.3f (Phase A - Interaction Logging Patch)
 * @date 2026-04-16
 * @description
 * [Phase A Patch]
 * - Added system interaction logging for Update and Delete Event Log.
 * - Safely buffers existing event context prior to execution to maintain data integrity.
 * [Phase 8 SQL-Only Fix]
 * - Added getDashboardData to serve events dashboard via SQL
 * - Added forensics logging for PUT updates (iot/dt fields) under DEBUG_EVENTLOG_WRITE=1
 * - [Patch] Automatically create an interaction record during Event Report creation to populate the opportunity timeline.
 */

const { handleApiError } = require('../middleware/error.middleware');

// 輔助函式：從 req.app 獲取服務
const getServices = (req) => req.app.get('services');

// ==========================================
// Part 1: 事件紀錄 (Event Log) 相關功能
// ==========================================

// GET /api/events/dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const { dashboardService } = getServices(req);
    const data = await dashboardService.getEventsDashboardData();

    const safeData = {
      eventList: Array.isArray(data.eventList) ? data.eventList : [],
      chartData: data.chartData || {}
    };

    res.json({ success: true, data: safeData });
  } catch (error) {
    handleApiError(res, error, 'Get Events Dashboard');
  }
};

// POST /api/events
exports.createEventLog = async (req, res) => {
  try {
    if (process.env.DEBUG_EVENTLOG_WRITE === '1') {
      console.log('[DEBUG][EventController] CREATE Payload Keys:', Object.keys(req.body || {}));
    }

    const services = getServices(req);
    const result = await services.eventLogService.createEvent(req.body, { displayName: req.user.name });

    // [Patch] Automatically create an interaction record so the Event Report appears in the timeline.
    if (result && result.success) {
      const eventId = result.id || result.eventId;
      if (eventId && services.interactionService) {
        const oppId = req.body.opportunityId;
        const compId = req.body.companyId;

        // Only create an interaction if there is a target context to link it to
        if (oppId || compId) {
          try {
            const eventName = req.body.eventName || req.body.eventTitle || '未命名報告';
            // Maintain legacy regex pattern: [Text](event_log_id=ID) to ensure frontend clickability
            const summary = `[查看事件報告詳情](event_log_id=${eventId})`;

            await services.interactionService.createInteraction({
              opportunityId: oppId,
              companyId: compId,
              interactionTime: req.body.createdTime || new Date().toISOString(),
              eventType: '事件報告',
              eventTitle: eventName,
              contentSummary: summary,
              recorder: req.user.name
            }, { displayName: req.user.name });
          } catch (intErr) {
            console.warn('[EventController] Warning: Failed to create linked interaction for Event Report:', intErr.message);
          }
        }
      }
    }

    res.json(result);
  } catch (error) {
    handleApiError(res, error, 'Create Event Log');
  }
};

// GET /api/events/:eventId
exports.getEventLogById = async (req, res) => {
  try {
    const { eventLogService } = getServices(req);
    const data = await eventLogService.getEventById(req.params.eventId);
    res.json({ success: !!data, data });
  } catch (error) {
    handleApiError(res, error, 'Get Event Log By Id');
  }
};

// PUT /api/events/:eventId
exports.updateEventLog = async (req, res) => {
  try {
    if (process.env.DEBUG_EVENTLOG_WRITE === '1') {
      console.log(`\n[DEBUG][EventController] UPDATE ${req.params.eventId}`);
      console.log('[DEBUG][EventController] Content-Type:', req.get('Content-Type'));
      console.log('[DEBUG][EventController] Body Keys:', Object.keys(req.body || {}));

      const checkKeys = [
        'eventName', 'visitPlace', 'eventType',
        'iot_deviceScale', 'iot_iotStatus', 'iot_painPoints', 'iot_lineFeatures',
        'iot_productionStatus', 'iot_systemArchitecture', 'iot_painPointDetails', 'iot_painPointAnalysis',
        'dt_deviceScale', 'dt_processingType', 'dt_industry'
      ];

      const found = {};
      for (const k of checkKeys) {
        if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) {
          found[k] = req.body[k];
        }
      }
      console.log('[DEBUG][EventController] Key Presence Sample:', found);
    }

    const services = getServices(req);
    const { eventLogService, interactionService } = services;

    // [Phase A Patch] Safely fetch existing event context before update
    const existingEvent = await eventLogService.getEventById(req.params.eventId);

    const result = await eventLogService.updateEventLog(
      req.params.eventId,
      req.body,
      req.user.name
    );

    if (result && result.success && existingEvent && interactionService) {
      const oppId = existingEvent.opportunityId;
      const compId = existingEvent.companyId;

      if (oppId || compId) {
        const eventName = req.body.eventName || req.body.eventTitle || existingEvent.eventName || '未命名報告';
        const summary = `更新事件報告：「${eventName}」。 [點此查看報告](event_log_id=${req.params.eventId})`;
        try {
          await interactionService.createInteraction({
            opportunityId: oppId,
            companyId: compId,
            interactionTime: new Date().toISOString(),
            eventType: '系統事件',
            eventTitle: '更新事件報告',
            contentSummary: summary,
            recorder: req.user.name
          }, { displayName: req.user.name });
        } catch (intErr) {
          console.warn('[EventController] Warning: Failed to create interaction for Update Event Log:', intErr.message);
        }
      }
    }

    res.json(result);
  } catch (error) {
    handleApiError(res, error, 'Update Event Log');
  }
};

// DELETE /api/events/:eventId
exports.deleteEventLog = async (req, res) => {
  try {
    const services = getServices(req);
    const { eventLogService, interactionService } = services;

    // [Phase A Patch] Safely fetch existing event context before deletion
    const existingEvent = await eventLogService.getEventById(req.params.eventId);

    const result = await eventLogService.deleteEventLog(req.params.eventId, req.user.name);

    if (result && result.success && existingEvent && interactionService) {
      const oppId = existingEvent.opportunityId;
      const compId = existingEvent.companyId;

      if (oppId || compId) {
        const eventName = existingEvent.eventName || '未命名報告';
        const summary = `刪除事件報告：「${eventName}」`;
        try {
          await interactionService.createInteraction({
            opportunityId: oppId,
            companyId: compId,
            interactionTime: new Date().toISOString(),
            eventType: '系統事件',
            eventTitle: '刪除事件報告',
            contentSummary: summary,
            recorder: req.user.name
          }, { displayName: req.user.name });
        } catch (intErr) {
          console.warn('[EventController] Warning: Failed to create interaction for Delete Event Log:', intErr.message);
        }
      }
    }

    res.json(result);
  } catch (error) {
    handleApiError(res, error, 'Delete Event Log');
  }
};

// ==========================================
// Part 2: 日曆 (Calendar) 與 自動同步功能
// ==========================================

exports.createCalendarEvent = async (req, res) => {
  try {
    const { eventService } = getServices(req);
    const result = await eventService.createCalendarEventAndSync(req.body, req.user);
    res.json(result);
  } catch (error) {
    handleApiError(res, error, 'Create Calendar Event & Sync');
  }
};

exports.getThisWeekEvents = async (req, res) => {
  try {
    const { eventService } = getServices(req);
    res.json(await eventService.getThisWeekEvents());
  } catch (error) {
    handleApiError(res, error, 'Get Week Events');
  }
};
</file>

<file path="controllers/interaction.controller.js">
/*
 * FILE: controllers/interaction.controller.js
 * VERSION: 6.0.2
 * DATE: 2026-03-19
 * CHANGELOG:
 * - [CLEANUP] Removed temporary debug logs used for runtime forensics
 * - [Fix] Query Params Compatibility
 */

const { handleApiError } = require('../middleware/error.middleware');

class InteractionController {
    /**
     * @param {InteractionService} interactionService 
     */
    constructor(interactionService) {
        if (!interactionService) throw new Error('InteractionController 需要 InteractionService');
        this.interactionService = interactionService;
    }

    // GET /api/interactions (or /api/interactions/all)
    getInteractions = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            
            // ★ 相容性修正：前端使用 'q' 作為搜尋關鍵字，'fetchAll' 作為全取旗標
            const search = req.query.search || req.query.q || ''; 
            const fetchAll = req.query.all === 'true' || req.query.fetchAll === 'true';

            const result = await this.interactionService.searchInteractions(search, page, fetchAll);
            res.json({ success: true, ...result });
        } catch (error) {
            handleApiError(res, error, 'Get Interactions');
        }
    };

    // GET /api/interactions/opportunity/:id
    getInteractionsByOpportunity = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.interactionService.getInteractionsByOpportunity(id);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Opportunity Interactions');
        }
    };

    // GET /api/interactions/company/:id
    getInteractionsByCompany = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.interactionService.getInteractionsByCompany(id);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Company Interactions');
        }
    };

    // POST /api/interactions
    createInteraction = async (req, res) => {
        try {
            const user = req.user || {}; 
            const result = await this.interactionService.createInteraction(req.body, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Interaction');
        }
    };

    // PUT /api/interactions/:id
    updateInteraction = async (req, res) => {
        try {
            const user = req.user || {};
            const result = await this.interactionService.updateInteraction(req.params.id, req.body, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Interaction');
        }
    };

    // DELETE /api/interactions/:id
    deleteInteraction = async (req, res) => {
        try {
            const user = req.user || {};
            const result = await this.interactionService.deleteInteraction(req.params.id, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Interaction');
        }
    };
}

module.exports = InteractionController;
</file>

<file path="data/event-log-reader.js">
/**
 * data/event-log-reader.js
 * 專門負責讀取所有與「事件紀錄 (Event Logs)」相關資料的類別
 * @version 5.1.1 (Phase 5 - Standard A Refactoring - Shared Mapping Patch)
 * @date 2026-01-29
 * @description [Standard A] 移除 Cross-Reader 依賴與業務邏輯，僅負責 Raw Data Access。
 * [Patch] 公開 HEADER_TO_KEY_MAP 供 Writer 共用，確保 Single Source of Truth。
 */

const BaseReader = require('./base-reader');

// 欄位映射表 (保持不變)
const HEADER_TO_KEY_MAP = {
    // Common Fields
    '事件ID': 'eventId',
    '事件名稱': 'eventName',
    '關聯機會ID': 'opportunityId',
    '關聯公司ID': 'companyId',
    '建立者': 'creator',
    '建立時間': 'createdTime',
    '最後修改時間': 'lastModifiedTime',
    '我方與會人員': 'ourParticipants',
    '客戶與會人員': 'clientParticipants',
    '會議地點': 'visitPlace',
    '會議內容': 'eventContent',
    '客戶提問': 'clientQuestions',
    '客戶情報': 'clientIntelligence',
    '備註': 'eventNotes',
    '修訂版次': 'editCount',

    // IOT Specific
    '設備規模': 'iot_deviceScale',
    '生產線特徵': 'iot_lineFeatures',
    '生產現況': 'iot_productionStatus',
    'IoT現況': 'iot_iotStatus',
    '痛點分類': 'iot_painPoints',
    '客戶痛點說明': 'iot_painPointDetails',
    '痛點分析與對策': 'iot_painPointAnalysis',
    '系統架構': 'iot_systemArchitecture',

    // DT Specific
    '加工類型': 'dt_processingType',
    '加工產業別': 'dt_industry',

    // Legacy Fields Mapping
    '下單機率': 'orderProbability',
    '可能下單數量': 'potentialQuantity',
    '銷售管道': 'salesChannel',
    '拜訪對象': 'clientParticipants',
    '公司規模': 'companySize',
    '生產現況紀錄': 'iot_productionStatus',
    'IoT現況紀錄': 'iot_iotStatus',
    '需求摘要註解': 'eventContent',
    '痛點詳細說明': 'iot_painPointDetails',
    '系統架構描述': 'iot_systemArchitecture',
    '外部系統串接': 'externalSystems',
    '硬體規模': 'hardwareScale',
    '客戶對FANUC期望': 'fanucExpectation',
    '痛點補充說明': 'eventNotes'
};

class EventLogReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
        // [Standard A] 禁止在 Reader 內 require/new 其他 Reader
    }

    async _fetchLegacyEventData() {
        try {
            const range = `事件紀錄總表!A:Y`;
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range
            });

            const rows = response.data.values || [];
            if (rows.length <= 1) return [];

            const legacyHeadersInOrder = [
                '事件ID', '事件名稱', '關聯機會ID', '建立者', '建立時間', '下單機率', '可能下單數量',
                '銷售管道', '我方與會人員', '拜訪對象', '公司規模', '拜訪地點', '生產線特徵',
                '生產現況紀錄', 'IoT現況紀錄', '需求摘要註解', '痛點分類', '痛點詳細說明',
                '系統架構描述', '外部系統串接', '硬體規模', '客戶對FANUC期望', '痛點補充說明', '關聯公司ID'
            ];

            return rows.slice(1).map((row, index) => {
                const log = { rowIndex: index + 2, eventType: 'legacy', editCount: 1 };

                legacyHeadersInOrder.forEach((header, i) => {
                    const key = HEADER_TO_KEY_MAP[header];
                    if (key) log[key] = row[i] || '';
                });

                const lastUpdateTime = row[24];
                log.lastModifiedTime = lastUpdateTime || log.createdTime;
                log.iot_deviceScale = log.potentialQuantity || log.hardwareScale;

                return log;
            });
        } catch (error) {
            if (error.code === 400 && String(error.message || '').includes('Unable to parse range')) return [];
            console.warn(`⚠️ 讀取舊版事件工作表失敗: ${error.message}`);
            return [];
        }
    }

    async _fetchEventData(eventType, sheetName, specificFields = []) {
        const commonFields = this.config.EVENT_LOG_COMMON_FIELDS;
        const allHeaders = [...commonFields, ...specificFields];
        const lastColumn = String.fromCharCode(65 + allHeaders.length - 1);
        const range = `${sheetName}!A:${lastColumn}`;

        const rowParser = (row, index) => {
            const log = { rowIndex: index + 2, eventType };

            allHeaders.forEach((header, i) => {
                let key;
                if (header === '設備規模' && (eventType === 'iot' || eventType === 'dt')) {
                    key = `${eventType}_deviceScale`;
                } else {
                    key = HEADER_TO_KEY_MAP[header];
                }

                if (key) log[key] = row[i] || '';
            });

            return log;
        };

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range
            });

            const rows = response.data.values || [];
            if (rows.length <= 1) return [];
            return rows.slice(1).map(rowParser);
        } catch (error) {
            if (error.code !== 400 || !String(error.message || '').includes('Unable to parse range')) {
                console.warn(`⚠️ 讀取事件工作表 "${sheetName}" 失敗: ${error.message}`);
            }
            return [];
        }
    }

    async getEventLogs() {
        const cacheKey = 'eventLogs';
        const now = Date.now();

        if (
            this.cache[cacheKey] &&
            this.cache[cacheKey].data &&
            (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)
        ) {
            console.log(`✅ [Cache] 從快取讀取 ${cacheKey}...`);
            return this.cache[cacheKey].data;
        }

        console.log(`🔄 [API] 正在從所有新舊事件工作表讀取資料...`);

        const S = this.config.SHEETS;
        const F = this.config;

        const [legacyLogs, generalLogs, iotLogs, dtLogs, dxLogs] = await Promise.all([
            this._fetchLegacyEventData(),
            this._fetchEventData('general', S.EVENT_LOGS_GENERAL),
            this._fetchEventData('iot', S.EVENT_LOGS_IOT, F.EVENT_LOG_IOT_FIELDS),
            this._fetchEventData('dt', S.EVENT_LOGS_DT, F.EVENT_LOG_DT_FIELDS),
            this._fetchEventData('dx', S.EVENT_LOGS_DX)
        ]);

        const allLogs = [...legacyLogs, ...generalLogs, ...iotLogs, ...dtLogs, ...dxLogs];

        this.cache[cacheKey] = { data: allLogs, timestamp: now };
        return allLogs;
    }

    /**
     * [Standard A] Raw only：只查找 eventId，不做 Join
     */
    async getEventLogById(eventId) {
        const allLogs = await this.getEventLogs();
        return allLogs.find(log => log.eventId === eventId) || null;
    }
}

// [Patch] 公開映射表供 Writer 使用，確保單一真相
EventLogReader.HEADER_TO_KEY_MAP = HEADER_TO_KEY_MAP;

module.exports = EventLogReader;
</file>

<file path="data/event-log-sql-reader.js">
/**
 * data/event-log-sql-reader.js
 * @version Phase 8.6
 * @date 2026-03-11
 * @purpose Phase 8.4 Fix: Add frontend-prefixed aliases to DTO for Editor compatibility. Phase 8.5: Add getEventLogsByOpportunityId for scoped queries. Phase 1 SQL Aggregation: Added getEventLogStats cross-partition counts.
 */

const { supabase } = require('../config/supabase');

class EventLogSqlReader {

    constructor() {
        // 定義表名與對應的 eventType (Hard Rule)
        this.tables = {
            general: 'event_logs_general',
            iot: 'event_logs_iot',
            dt: 'event_logs_dt',
            dx: 'event_logs_dx',
            summary: 'event_logs_summary'
        };
    }

    /**
     * Get event log statistics (Total and This Month) across all partitioned tables
     * Phase 1 SQL Aggregation: Combines parallel head exact counts to bypass full table download.
     * @param {Date} startOfMonth 
     * @returns {Promise<{total: number, month: number}>}
     */
    async getEventLogStats(startOfMonth) {
        if (!startOfMonth) throw new Error('EventLogSqlReader: startOfMonth is required');

        try {
            const startIso = startOfMonth.toISOString();
            let total = 0;
            let month = 0;

            const queries = Object.values(this.tables).map(async (tableName) => {
                const [totalRes, monthRes] = await Promise.all([
                    supabase.from(tableName).select('*', { count: 'exact', head: true }),
                    supabase.from(tableName).select('*', { count: 'exact', head: true }).gte('created_time', startIso)
                ]);

                if (totalRes.error) throw new Error(`[EventLogSqlReader] DB Error in ${tableName} (total): ${totalRes.error.message}`);
                if (monthRes.error) throw new Error(`[EventLogSqlReader] DB Error in ${tableName} (month): ${monthRes.error.message}`);

                total += (totalRes.count || 0);
                month += (monthRes.count || 0);
            });

            await Promise.all(queries);

            return { total, month };

        } catch (error) {
            console.error('[EventLogSqlReader] getEventLogStats Error:', error);
            throw error;
        }
    }

    /**
     * Get a single event by ID
     * Scans all 5 tables. Throws error on DB failure.
     * @param {string} eventId 
     * @returns {Promise<Object|null>} Event DTO or null
     */
    async getEventLogById(eventId) {
        if (!eventId) throw new Error('EventLogSqlReader: eventId is required');

        try {
            // 並行查詢所有分表
            const queries = Object.entries(this.tables).map(async ([type, tableName]) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('event_id', eventId)
                    .maybeSingle(); // [Phase 8.2a] Use maybeSingle to avoid throw on not-found

                // Strict error handling: throw on actual DB errors, ignore not-found (data is null)
                if (error) { 
                    throw new Error(`[EventLogSqlReader] DB Error in ${tableName}: ${error.message}`);
                }
                return data ? { type, data } : null;
            });

            const results = await Promise.all(queries);
            const found = results.find(res => res !== null);

            if (!found) return null;

            return this._mapRowToDto(found.data, found.type);

        } catch (error) {
            console.error('[EventLogSqlReader] getEventLogById Error:', error);
            throw error; // Strict re-throw
        }
    }

    /**
     * Get all events for a specific opportunity
     * Unions data from all 5 tables filtered by opportunity_id.
     * @param {string} opportunityId 
     * @returns {Promise<Array<Object>>} Array of Event DTOs
     */
    async getEventLogsByOpportunityId(opportunityId) {
        if (!opportunityId) throw new Error('EventLogSqlReader: opportunityId is required');

        try {
            const queries = Object.entries(this.tables).map(async ([type, tableName]) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('opportunity_id', opportunityId);

                if (error) {
                    throw new Error(`[EventLogSqlReader] DB Error in ${tableName}: ${error.message}`);
                }
                
                return data.map(row => this._mapRowToDto(row, type));
            });

            const results = await Promise.all(queries);
            
            // Flatten results from all tables
            return results.flat();

        } catch (error) {
            console.error('[EventLogSqlReader] getEventLogsByOpportunityId Error:', error);
            throw error; // Strict re-throw
        }
    }

    /**
     * Get all events
     * Unions data from all 5 tables.
     * @returns {Promise<Array<Object>>} Array of Event DTOs
     */
    async getEventLogs() {
        try {
            const queries = Object.entries(this.tables).map(async ([type, tableName]) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*');

                if (error) {
                    throw new Error(`[EventLogSqlReader] DB Error in ${tableName}: ${error.message}`);
                }
                
                return data.map(row => this._mapRowToDto(row, type));
            });

            const results = await Promise.all(queries);
            
            // Flatten results from all tables
            return results.flat();

        } catch (error) {
            console.error('[EventLogSqlReader] getEventLogs Error:', error);
            throw error; // Strict re-throw
        }
    }

    /**
     * Maps Raw SQL Row to DTO
     * Strict camelCase conversion based on provided schema.
     * No fallback logic. No column guessing.
     */
    _mapRowToDto(row, type) {
        if (!row) return null;

        // [Phase 8.2 Fix] Payload Parsing & Override Helper
        // 確保優先讀取 payload 中的新值，解決 DB column 未更新導致 UI 顯示舊值的問題
        let payloadObj = {};
        try {
            if (row.payload && typeof row.payload === 'object') {
                payloadObj = row.payload;
            } else if (typeof row.payload === 'string') {
                payloadObj = JSON.parse(row.payload);
            }
        } catch (e) {
            payloadObj = {};
        }

        // Helper: 若 payload 有該 key (即使是空字串)，則強制覆蓋 DB column 值
        // [Phase 8.2b Fix] Changed to hasOwnProperty check to allow clearing values ('')
        const getVal = (payloadKey, colVal) => {
            if (Object.prototype.hasOwnProperty.call(payloadObj, payloadKey)) {
                return payloadObj[payloadKey];
            }
            return colVal;
        };

        // Common Base Fields (Available in most schemas)
        const baseDto = {
            // Hard Rules
            rowIndex: null, 
            eventType: type,

            // Identity & Metadata
            eventId: row.event_id,
            creator: row.creator,
            companyId: row.company_id,
            editCount: row.edit_count,
            createdTime: row.created_time,
            lastModifiedTime: row.last_modified_time,
            
            // Core Content
            eventName: row.event_name,
            opportunityId: row.opportunity_id,
            visitPlace: row.visit_place,
            eventContent: row.event_content,
            eventNotes: row.event_notes,
            ourParticipants: row.our_participants,
            clientParticipants: row.client_participants,
            clientQuestions: row.client_questions,
            clientIntelligence: row.client_intelligence
        };

        // Type Specific Mapping (Strict Schema Adherence)
        switch (type) {
            case 'general':
                return baseDto;

            case 'iot': {
                // Resolve values once
                const iotStatus = getVal('iot_iotStatus', row.iot_status);
                const deviceScale = getVal('iot_deviceScale', row.device_scale);
                const lineFeatures = getVal('iot_lineFeatures', row.line_features);
                const painCategory = getVal('iot_painPoints', row.pain_category); // Frontend sends iot_painPoints
                const painAnalysis = getVal('iot_painPointAnalysis', row.pain_analysis);
                const painDescription = getVal('iot_painPointDetails', row.pain_description);
                const productionStatus = getVal('iot_productionStatus', row.production_status);
                const systemArchitecture = getVal('iot_systemArchitecture', row.system_architecture);

                return {
                    ...baseDto,
                    // Standard keys (Backend logic preferred)
                    iotStatus,
                    deviceScale,
                    lineFeatures,
                    painCategory,
                    painAnalysis,
                    painDescription,
                    productionStatus,
                    systemArchitecture,

                    // [Phase 8.4 Fix] Frontend-prefixed aliases for Editor compatibility
                    // The frontend editor expects keys like 'iot_deviceScale' to populate fields correctly.
                    iot_iotStatus: iotStatus,
                    iot_deviceScale: deviceScale,
                    iot_lineFeatures: lineFeatures,
                    iot_painPoints: painCategory,
                    iot_painPointAnalysis: painAnalysis,
                    iot_painPointDetails: painDescription,
                    iot_productionStatus: productionStatus,
                    iot_systemArchitecture: systemArchitecture
                };
            }

            case 'dt': {
                // Resolve values once
                const industry = getVal('dt_industry', row.industry);
                const deviceScale = getVal('dt_deviceScale', row.device_scale);
                const processingType = getVal('dt_processingType', row.processing_type);

                return {
                    ...baseDto,
                    // Standard keys
                    industry,
                    deviceScale,
                    processingType,

                    // [Phase 8.4 Fix] Frontend-prefixed aliases for Editor compatibility
                    dt_industry: industry,
                    dt_deviceScale: deviceScale,
                    dt_processingType: processingType
                };
            }

            case 'dx':
                return baseDto;

            case 'summary':
                // Note: Summary table has different column set in provided schema
                return {
                    // Base fields present in summary schema
                    rowIndex: null,
                    eventType: type,
                    eventId: row.event_id,
                    creator: row.creator,
                    companyId: row.company_id,
                    createdTime: row.created_time,
                    opportunityId: row.opportunity_id,
                    visitPlace: row.visit_place,
                    
                    // Summary Specific fields
                    // [Phase 8.2 Fix] Apply overrides to summary as well
                    iotStatus: getVal('iot_iotStatus', row.iot_status),
                    
                    // [Phase 8.2a Fix] Strict precedence: IoT > DT > Row
                    // Note: If iot_deviceScale exists (even empty), it overrides everything below it.
                    deviceScale: getVal('iot_deviceScale', getVal('dt_deviceScale', row.device_scale)),

                    participants: row.participants, // Note: Not 'our/client_participants' in schema
                    visitTarget: row.visit_target,
                    companyScale: row.company_scale,
                    lineFeatures: getVal('iot_lineFeatures', row.line_features),
                    painCategory: getVal('iot_painPoints', row.pain_category),
                    salesChannel: row.sales_channel,
                    demandSummary: row.demand_summary,
                    painExtraNote: row.pain_extra_note,
                    winProbability: row.win_probability,
                    opportunityName: row.opportunity_name,
                    painDescription: getVal('iot_painPointDetails', row.pain_description),
                    expectedQuantity: row.expected_quantity,
                    fanucExpectation: row.fanuc_expectation,
                    productionStatus: getVal('iot_productionStatus', row.production_status),
                    systemArchitecture: getVal('iot_systemArchitecture', row.system_architecture),
                    externalIntegration: row.external_integration
                };

            default:
                return baseDto;
        }
    }
}

module.exports = EventLogSqlReader;
</file>

<file path="data/event-log-sql-writer.js">
/*
 * FILE: data/event-log-sql-writer.js
 * VERSION: Phase 8.7-SingleTable-Fix
 * DATE: 2026-03-06
 * PURPOSE:
 * - Fix Worldview: Four full event tables (General, IoT, DT, DX).
 * - Single-table existence enforced.
 * - Same-type edit: Update current table.
 * - Type change: Move event (Read -> Merge -> Delete Old -> Clean Target -> Insert New).
 * - Payload normalization to schema columns.
 */

const { supabase } = require('../config/supabase');

class EventLogSqlWriter {
  async createEventLog(payload) {
    try {
      // STEP 1 — Detect Target Table
      const eventType = payload.eventType || payload.event_type || 'general';
      const tableMap = {
        general: 'event_logs_general',
        iot: 'event_logs_iot',
        dt: 'event_logs_dt',
        dx: 'event_logs_dx'
      };
      const targetTable = tableMap[eventType] || 'event_logs_general';

      // STEP 2 — Define Allowed Columns (Schema Enforcement)
      const COMMON_COLS = [
        'event_id',
        'event_name',
        'opportunity_id',
        'company_id',
        'creator',
        'created_time',
        'last_modified_time',
        'our_participants',
        'client_participants',
        'visit_place',
        'event_content',
        'client_questions',
        'client_intelligence',
        'event_notes',
        'edit_count'
      ];

      const IOT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'line_features',
        'production_status',
        'iot_status',
        'pain_category',
        'pain_description',
        'pain_analysis',
        'system_architecture'
      ];

      const DT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'processing_type',
        'industry'
      ];

      const DX_COLS = [...COMMON_COLS];
      const GENERAL_COLS = [...COMMON_COLS];

      const colMap = {
        'event_logs_general': GENERAL_COLS,
        'event_logs_iot': IOT_COLS,
        'event_logs_dt': DT_COLS,
        'event_logs_dx': DX_COLS
      };

      const targetAllowedCols = new Set(colMap[targetTable] || []);

      // STEP 3 — Normalize & Filter Payload
      const insertData = {};
      const keyMap = {
        'iot_deviceScale': 'device_scale',
        'iot_lineFeatures': 'line_features',
        'iot_productionStatus': 'production_status',
        'iot_iotStatus': 'iot_status',
        'iot_painPoints': 'pain_category',
        'iot_painPointDetails': 'pain_description',
        'iot_painPointAnalysis': 'pain_analysis',
        'iot_systemArchitecture': 'system_architecture',
        'dt_deviceScale': 'device_scale',
        'dt_processingType': 'processing_type',
        'dt_industry': 'industry'
      };

      Object.keys(payload).forEach(key => {
        // Remove meta keys
        if (['eventType', 'event_type', 'payload'].includes(key)) return;

        // Normalize key
        const dbKey = keyMap[key] || key;

        // Value normalization
        let val = payload[key];
        if (val === "") val = null;

        // Filter by allowed columns & skip undefined
        if (val !== undefined && targetAllowedCols.has(dbKey)) {
            insertData[dbKey] = val;
        }
      });

      // STEP 4 — Forensic Logs
      console.log(`[EventLogSqlWriter][FORensics][CREATE] targetTable=${targetTable}`);
      console.log(`[EventLogSqlWriter][FORensics][CREATE] normalized keys=${Object.keys(insertData).join(',')}`);

      // STEP 5 — Insert
      const { data, error } = await supabase
        .from(targetTable)
        .insert([insertData])
        .select('event_id')
        .single();

      if (error) throw error;
      return { success: true, id: data.event_id };

    } catch (error) {
      console.error('[EventLogSqlWriter] createEventLog Error:', error);
      throw error;
    }
  }

  async updateEventLog(eventId, payload) {
    try {
      // STEP 1 — Detect Incoming Type & Target Table
      const eventType = payload.eventType || payload.event_type || 'general';
      
      const tableMap = {
        general: 'event_logs_general',
        iot: 'event_logs_iot',
        dt: 'event_logs_dt',
        dx: 'event_logs_dx'
      };
      const targetTable = tableMap[eventType] || 'event_logs_general';

      // STEP 2 — Detect Current Existing Table
      const tables = ['event_logs_general', 'event_logs_iot', 'event_logs_dt', 'event_logs_dx'];
      let currentTable = null;
      let oldRow = null;

      // Search tables in order
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle();
        
        if (data) {
          currentTable = table;
          oldRow = data;
          break; 
        }
      }

      if (!currentTable) {
        throw new Error(`Event ${eventId} not found in any known table.`);
      }

      // STEP 3 — Define Allowed Columns
      const COMMON_COLS = [
        'event_id',
        'event_name',
        'opportunity_id',
        'company_id',
        'creator',
        'created_time',
        'last_modified_time',
        'our_participants',
        'client_participants',
        'visit_place',
        'event_content',
        'client_questions',
        'client_intelligence',
        'event_notes',
        'edit_count'
      ];

      const IOT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'line_features',
        'production_status',
        'iot_status',
        'pain_category',
        'pain_description',
        'pain_analysis',
        'system_architecture'
      ];

      const DT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'processing_type',
        'industry'
      ];

      const DX_COLS = [...COMMON_COLS];
      const GENERAL_COLS = [...COMMON_COLS];

      const colMap = {
        'event_logs_general': GENERAL_COLS,
        'event_logs_iot': IOT_COLS,
        'event_logs_dt': DT_COLS,
        'event_logs_dx': DX_COLS
      };

      const targetAllowedCols = new Set(colMap[targetTable] || []);

      // STEP 4 — Normalize Incoming Payload Keys
      const normalizedPayload = {};
      const keyMap = {
        'iot_deviceScale': 'device_scale',
        'iot_lineFeatures': 'line_features',
        'iot_productionStatus': 'production_status',
        'iot_iotStatus': 'iot_status',
        'iot_painPoints': 'pain_category',
        'iot_painPointDetails': 'pain_description',
        'iot_painPointAnalysis': 'pain_analysis',
        'iot_systemArchitecture': 'system_architecture',
        'dt_deviceScale': 'device_scale',
        'dt_processingType': 'processing_type',
        'dt_industry': 'industry'
      };

      Object.keys(payload).forEach(key => {
        // Remove meta keys
        if (['eventType', 'event_type', 'payload'].includes(key)) return;

        // Map or keep original
        const dbKey = keyMap[key] || key;
        normalizedPayload[dbKey] = payload[key];
      });

      // STEP 7 — Forensic Logs (Pre-Action)
      const sameType = (currentTable === targetTable);
      
      console.log(`[EventLogSqlWriter][FORensics] currentTable=${currentTable}`);
      console.log(`[EventLogSqlWriter][FORensics] targetTable=${targetTable}`);
      console.log(`[EventLogSqlWriter][FORensics] sameType=${sameType}`);
      console.log(`[EventLogSqlWriter][FORensics] normalized keys=${Object.keys(normalizedPayload).join(',')}`);

      let filteredKeys = [];
      let movedRow = false;

      // STEP 5 & 6 — Execution Logic
      if (sameType) {
        // --- SAME TYPE EDIT ---
        const updateData = {};
        Object.keys(normalizedPayload).forEach(key => {
          if (targetAllowedCols.has(key)) {
            updateData[key] = normalizedPayload[key];
          }
        });
        
        // Remove event_id from update payload (PK)
        delete updateData.event_id;

        filteredKeys = Object.keys(updateData);
        console.log(`[EventLogSqlWriter][FORensics] filtered keys=${filteredKeys.join(',')}`);
        console.log(`[EventLogSqlWriter][FORensics] movedRow=${movedRow}`);

        const { data, error } = await supabase
          .from(currentTable)
          .update(updateData)
          .eq('event_id', eventId)
          .select('event_id');

        if (error) throw error;
        
        if (!data || data.length === 0) {
           return { success: false, message: 'Row not found during update.' };
        }

      } else {
        // --- TYPE CHANGE (MOVE) ---
        movedRow = true;
        
        // 1. Merge (Old Row + New Data)
        const mergedRow = { ...oldRow, ...normalizedPayload };
        mergedRow.event_id = eventId; // Ensure PK is present

        // 2. Filter for Target Table
        const insertData = {};
        Object.keys(mergedRow).forEach(key => {
          if (targetAllowedCols.has(key)) {
            insertData[key] = mergedRow[key];
          }
        });

        filteredKeys = Object.keys(insertData);
        console.log(`[EventLogSqlWriter][FORensics] filtered keys=${filteredKeys.join(',')}`);
        console.log(`[EventLogSqlWriter][FORensics] movedRow=${movedRow}`);

        // 3. Delete from Old Table
        const { error: delError } = await supabase
          .from(currentTable)
          .delete()
          .eq('event_id', eventId);
        
        if (delError) {
          console.error(`[EventLogSqlWriter] Move failed: Delete from ${currentTable} error:`, delError);
          throw delError;
        }
        console.log(`[EventLogSqlWriter] Old row deleted from ${currentTable}`);

        // 4. Clean Target Table (Prevent Unique Constraint Violation)
        // Even though it shouldn't be there, we must ensure it's gone before insert
        const { data: cleanData, error: cleanError } = await supabase
          .from(targetTable)
          .delete()
          .eq('event_id', eventId)
          .select('event_id');

        if (cleanError) {
            console.error(`[EventLogSqlWriter] Move failed: Clean target ${targetTable} error:`, cleanError);
            throw cleanError;
        }
        
        const clearedTargetTableRow = (cleanData && cleanData.length > 0);
        console.log(`[EventLogSqlWriter][FORensics] clearedTargetTableRow=${clearedTargetTableRow}`);

        // 5. Insert into New Table
        const { error: insError } = await supabase
          .from(targetTable)
          .insert([insertData]);

        if (insError) {
          console.error(`[EventLogSqlWriter] Move failed: Insert into ${targetTable} error:`, insError);
          throw insError;
        }
        console.log(`[EventLogSqlWriter] New row inserted into ${targetTable}`);
      }

      return { success: true };

    } catch (error) {
      console.error('[EventLogSqlWriter] updateEventLog Error:', error);
      throw error;
    }
  }

  async deleteEventLog(eventId) {
    try {
      // Search tables in order to find where to delete from
      const tables = ['event_logs_general', 'event_logs_iot', 'event_logs_dt', 'event_logs_dx'];
      let deleted = false;

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq('event_id', eventId)
          .select('event_id');

        if (error) {
             console.warn(`[EventLogSqlWriter] Delete check on ${table} failed:`, error.message);
             continue;
        }

        if (data && data.length > 0) {
            deleted = true;
            // Assuming uniqueness across tables, we can stop, 
            // but for safety in this transition phase, we could check others.
            // For now, let's assume one hit is enough.
            break; 
        }
      }

      if (!deleted) {
        return { success: false, message: 'Event not found' };
      }
      return { success: true };

    } catch (error) {
      console.error('[EventLogSqlWriter] deleteEventLog Error:', error);
      throw error;
    }
  }
}

module.exports = EventLogSqlWriter;
</file>

<file path="data/event-log-writer.js">
/**
 * data/event-log-writer.js
 * 事件紀錄寫入器
 * * @version 5.1.0 (Phase 5 Refactoring - Shared Mapping Patch)
 * @date 2026-01-29
 * @description 負責處理各類型事件 (General, IOT, DT, DX) 的建立、更新與刪除。
 * [Patch] 移除內部 HEADER_TO_KEY_MAP，改用 EventLogReader.HEADER_TO_KEY_MAP 確保一致性。
 */

const BaseWriter = require('./base-writer');
const EventLogReader = require('./event-log-reader'); // [Patch] 引用 Reader 以獲取 Mapping

class EventLogWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} eventLogReader - 用於清除快取的 Reader 實例
     */
    constructor(sheets, spreadsheetId, eventLogReader) {
        super(sheets, spreadsheetId);
        if (!eventLogReader) {
            throw new Error('EventLogWriter 需要 EventLogReader 的實例');
        }
        this.eventLogReader = eventLogReader;
        
        // [Patch] 移除重複定義，統一使用 Reader 的定義
        // this.HEADER_TO_KEY_MAP = { ... }; 
    }

    /**
     * 根據事件類型取得對應的工作表名稱
     */
    _getSheetNameByType(type) {
        switch (type) {
            case 'iot': return this.config.SHEETS.EVENT_LOGS_IOT;
            case 'dt': return this.config.SHEETS.EVENT_LOGS_DT;
            case 'dx': return this.config.SHEETS.EVENT_LOGS_DX;
            case 'general': 
            default: return this.config.SHEETS.EVENT_LOGS_GENERAL;
        }
    }

    /**
     * 根據工作表名稱取得欄位定義
     */
    _getFieldsByType(type) {
        const commonFields = this.config.EVENT_LOG_COMMON_FIELDS;
        if (type === 'iot') return [...commonFields, ...this.config.EVENT_LOG_IOT_FIELDS];
        if (type === 'dt') return [...commonFields, ...this.config.EVENT_LOG_DT_FIELDS];
        // General 與 DX 目前只使用 Common Fields
        return commonFields;
    }

    /**
     * 建立新事件紀錄
     */
    async createEventLog(data, creator) {
        console.log(`📅 [EventLogWriter] 建立新事件: ${data.eventName} (${data.eventType}) by ${creator}`);
        
        const now = new Date().toISOString();
        const eventId = `EVT${Date.now()}`;
        const sheetName = this._getSheetNameByType(data.eventType);
        const headers = this._getFieldsByType(data.eventType);
        
        // [Patch] 使用 Shared Mapping
        const MAPPING = EventLogReader.HEADER_TO_KEY_MAP;

        // 準備寫入資料
        const rowData = headers.map(header => {
            // 反向查找 key
            let key = null;
            // 特殊處理：IOT與DT的設備規模欄位名稱相同但 key 不同
            if (header === '設備規模') {
                if (data.eventType === 'iot') key = 'iot_deviceScale';
                else if (data.eventType === 'dt') key = 'dt_deviceScale';
                else key = MAPPING[header];
            } else {
                key = MAPPING[header];
            }

            if (header === '事件ID') return eventId;
            if (header === '建立者') return creator;
            if (header === '建立時間') return now;
            if (header === '最後修改時間') return now;
            if (header === '修訂版次') return '1';

            return (key && data[key] !== undefined) ? data[key] : '';
        });

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${sheetName}!A:Z`, // 寬鬆範圍，讓 Google 自動判斷
            valueInputOption: 'USER_ENTERED',
            resource: { values: [rowData] }
        });

        this.eventLogReader.invalidateCache('eventLogs');
        return { success: true, id: eventId };
    }

    /**
     * 更新事件紀錄
     */
    async updateEventLog(rowIndex, data, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`📅 [EventLogWriter] 更新事件 Row ${rowIndex} (${data.eventType}) by ${modifier}`);

        const sheetName = this._getSheetNameByType(data.eventType);
        const headers = this._getFieldsByType(data.eventType);
        const now = new Date().toISOString();
        
        // [Patch] 使用 Shared Mapping
        const MAPPING = EventLogReader.HEADER_TO_KEY_MAP;

        // 1. 先讀取舊資料 (為了確保不覆蓋未傳入的欄位，且要計算修訂版次)
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        // 計算欄位總數以決定讀取範圍 (A ~ ?)
        const lastColumnChar = String.fromCharCode(65 + headers.length - 1);
        const range = `${sheetName}!A${rowIndex}:${lastColumnChar}${rowIndex}`;

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: range
        });

        const currentRow = response.data.values ? response.data.values[0] : [];
        if (currentRow.length === 0) throw new Error('找不到該筆事件資料');

        // 確保 row 長度足夠
        while (currentRow.length < headers.length) {
            currentRow.push('');
        }

        // 2. 更新欄位
        headers.forEach((header, index) => {
            let key = null;
            if (header === '設備規模') {
                if (data.eventType === 'iot') key = 'iot_deviceScale';
                else if (data.eventType === 'dt') key = 'dt_deviceScale';
                else key = MAPPING[header];
            } else {
                key = MAPPING[header];
            }

            // 特殊欄位自動處理
            if (header === '最後修改時間') {
                currentRow[index] = now;
            } else if (header === '修訂版次') {
                const currentVer = parseInt(currentRow[index]) || 1;
                currentRow[index] = String(currentVer + 1);
            } else if (key && data[key] !== undefined) {
                // 一般欄位：有傳入才更新
                currentRow[index] = data[key];
            }
        });

        // 3. 寫回
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        this.eventLogReader.invalidateCache('eventLogs');
        return { success: true };
    }

    /**
     * 刪除事件紀錄
     */
    async deleteEventLog(rowIndex, eventType) {
        console.log(`🗑️ [EventLogWriter] 刪除事件 Row ${rowIndex} (${eventType})`);
        const sheetName = this._getSheetNameByType(eventType);
        
        // 呼叫 BaseWriter 的 _deleteRow
        await this._deleteRow(sheetName, rowIndex, this.eventLogReader);
        
        return { success: true };
    }
}

module.exports = EventLogWriter;
</file>

<file path="data/interaction-reader.js">
/**
 * data/interaction-reader.js
 * 專門負責讀取所有與「互動紀錄」相關資料的類別
 * * @version 6.0.0 (Phase 5 - Standard A Refactoring)
 * @date 2026-01-23
 * @description [Standard A] 移除 Cross-Reader 依賴與業務邏輯，僅負責 Raw Data Access。
 */

const BaseReader = require('./base-reader');

class InteractionReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得所有互動紀錄 (Raw Data)
     * [Standard A] Removed sorting logic, returning raw rows mapped to objects.
     * @returns {Promise<Array<object>>}
     */
    async getInteractions() {
        const cacheKey = 'interactions';
        const range = `${this.config.SHEETS.INTERACTIONS}!A:M`;

        const rowParser = (row, index) => ({
            rowIndex: index + 2,
            interactionId: row[0] || '',
            opportunityId: row[1] || '',
            interactionTime: row[2] || '',
            eventType: row[3] || '',
            eventTitle: row[4] || '',
            contentSummary: row[5] || '',
            participants: row[6] || '',
            nextAction: row[7] || '',
            attachmentLink: row[8] || '',
            calendarEventId: row[9] || '',
            recorder: row[10] || '',
            createdTime: row[11] || '',
            companyId: row[12] || '' 
        });

        // [Standard A] Sorter removed. Sorting is now handled in Service.
        return this._fetchAndCache(cacheKey, range, rowParser);
    }

    /**
     * [Deprecated] 搜尋邏輯已移至 Service
     * 保留此方法以防止舊程式碼崩潰，但僅回傳空結構與警告。
     */
    async searchAllInteractions(query, page = 1, fetchAll = false) {
        console.warn('⚠️ [Deprecation] InteractionReader.searchAllInteractions is deprecated. Logic moved to Service.');
        return {
            data: [],
            pagination: {
                current: page,
                total: 0,
                totalItems: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }

    /**
     * [Deprecated] 邏輯已移至 Service
     */
    async getRecentInteractions(options) {
        console.warn('⚠️ [Deprecation] InteractionReader.getRecentInteractions is deprecated. Logic moved to Service.');
        return [];
    }

    // [Standard A] Removed getOpportunities/getCompanyList (Cross-Reader Coupling removed)
}

module.exports = InteractionReader;
</file>

<file path="data/interaction-sql-reader.js">
/**
 * data/interaction-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: interactions
 * - Schema: Strict adherence to provided schema list
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.2.0
 * - Date: 2026-04-15
 * - Changelog: 
 * - [PHASE 9-A] Added getInteractionActivities & getRecentInteractionsFeed for SQL-first dashboard optimization.
 * - [PATCH] SQL interaction reader is authoritative for reading interaction records.
 * - [PATCH] DTO now exposes both interactionType and eventType alias to support frontend locking logic.
 * - [PHASE 8.1] Added getInteractionsByCompanyId & getInteractionsByOpportunityIds for Phase 8.1
 */

const { supabase } = require('../config/supabase');

class InteractionSqlReader {

    constructor() {
        this.tableName = 'interactions';
    }

    /**
     * Get a single interaction by ID
     * @param {string} interactionId 
     * @returns {Promise<Object|null>} Interaction DTO or null
     */
    async getInteractionById(interactionId) {
        if (!interactionId) throw new Error('InteractionSqlReader: interactionId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('interaction_id', interactionId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;
            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionById Error:', error);
            throw error;
        }
    }

    /**
     * Get interactions by company ID
     * @param {string} companyId 
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractionsByCompanyId(companyId) {
        if (!companyId) throw new Error('InteractionSqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionsByCompanyId Error:', error);
            throw error;
        }
    }

    /**
     * Get interactions by multiple opportunity IDs
     * @param {Array<string>} opportunityIds 
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractionsByOpportunityIds(opportunityIds) {
        if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .in('opportunity_id', opportunityIds);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionsByOpportunityIds Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 9-A] Get lightweight activity timestamps for MTU/SI and Dashboard tracking
     * Eliminates full-text hydration for metrics aggregation.
     */
    async getInteractionActivities() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('interaction_id, company_id, opportunity_id, interaction_time, created_time');

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);

            return data.map(row => ({
                interactionId: row.interaction_id,
                companyId: row.company_id,
                opportunityId: row.opportunity_id,
                interactionTime: row.interaction_time,
                createdTime: row.created_time
            }));
        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionActivities Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 9-A] Get recent interactions for the dashboard feed
     * Pushes sort and limit directly to SQL.
     */
    async getRecentInteractionsFeed(limit = 5) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order('created_time', { ascending: false })
                .limit(limit);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getRecentInteractionsFeed Error:', error);
            throw error;
        }
    }

    /**
     * Get all interactions
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractions() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractions Error:', error);
            throw error;
        }
    }

    /**
     * Maps Raw SQL Row to DTO
     */
    _mapRowToDto(row) {
        if (!row) return null;

        return {
            interactionId: row.interaction_id,
            opportunityId: row.opportunity_id,
            companyId: row.company_id,
            interactionTime: row.interaction_time,
            interactionType: row.interaction_type,
            eventType: row.interaction_type,
            eventTitle: row.event_title,
            contentSummary: row.content_summary,
            participants: row.participants,
            nextAction: row.next_action,
            attachmentLink: row.attachment_link,
            calendarEventId: row.calendar_event_id,
            recorder: row.recorder,
            createdTime: row.created_time
        };
    }
}

module.exports = InteractionSqlReader;
</file>

<file path="data/interaction-sql-writer.js">
/*
 * FILE: data/interaction-sql-writer.js
 * VERSION: 7.0.2
 * DATE: 2026-03-18
 * CHANGELOG:
 * - [PATCH] SQL interaction writer is authoritative for interaction persistence.
 * - [PATCH] Added support for eventType as an alias of interactionType to bridge legacy payloads.
 * - [PHASE 7] Migrate Interaction Write Authority to SQL.
 */

const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

class InteractionSqlWriter {
    /**
     * Maps JS Object to Strict DB Schema
     * @param {Object} data 
     * @returns {Object} dbData
     */
    _mapToDb(data) {
        // STRICT SCHEMA MAPPING
        // Forbidden: subject, interaction_date, contact_id, updated_at, created_at, rowIndex
        return {
            interaction_id: data.interactionId,
            opportunity_id: data.opportunityId || null,
            company_id: data.companyId || null,
            interaction_time: data.interactionTime || null,
            interaction_type: data.interactionType || data.eventType || null,
            event_title: data.eventTitle || null,
            content_summary: data.contentSummary || null,
            participants: data.participants || null,
            next_action: data.nextAction || null,
            attachment_link: data.attachmentLink || null,
            calendar_event_id: data.calendarEventId || null,
            recorder: data.recorder || null
        };
    }

    /**
     * Create new interaction
     * @param {Object} data 
     * @param {Object} user 
     * @returns {Promise<string>} newId
     */
    async createInteraction(data, user) {
        try {
            const interactionId = data.interactionId || uuidv4();
            const dbData = this._mapToDb({ ...data, interactionId });
            
            // Set created_time only on create
            dbData.created_time = new Date().toISOString();

            const { error } = await supabase
                .from('interactions')
                .insert([dbData]);

            if (error) throw error;
            
            console.log(`[InteractionSqlWriter] Created interaction ${interactionId}`);
            return interactionId;
        } catch (error) {
            console.error('[InteractionSqlWriter] createInteraction Error:', error);
            throw error;
        }
    }

    /**
     * Update existing interaction
     * @param {string} id 
     * @param {Object} data 
     * @param {Object} user 
     */
    async updateInteraction(id, data, user) {
        try {
            // Ensure ID is consistent
            const dbData = this._mapToDb({ ...data, interactionId: id });
            
            // Remove immutable fields for update
            delete dbData.created_time; 
            delete dbData.interaction_id; // PK should not be in update body if used in eq()

            const { error } = await supabase
                .from('interactions')
                .update(dbData)
                .eq('interaction_id', id);

            if (error) throw error;

            console.log(`[InteractionSqlWriter] Updated interaction ${id}`);
            return { success: true };
        } catch (error) {
            console.error('[InteractionSqlWriter] updateInteraction Error:', error);
            throw error;
        }
    }

    /**
     * Delete interaction
     * @param {string} id 
     * @param {Object} user 
     */
    async deleteInteraction(id, user) {
        try {
            const { error } = await supabase
                .from('interactions')
                .delete()
                .eq('interaction_id', id);

            if (error) throw error;

            console.log(`[InteractionSqlWriter] Deleted interaction ${id}`);
            return { success: true };
        } catch (error) {
            console.error('[InteractionSqlWriter] deleteInteraction Error:', error);
            throw error;
        }
    }
}

module.exports = InteractionSqlWriter;
</file>

<file path="data/interaction-writer.js">
/**
 * data/interaction-writer.js
 * 互動紀錄寫入器
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責處理互動紀錄 (Interactions) 的建立、更新與刪除。
 * 實作 Strict Mode 依賴注入。
 */

const BaseWriter = require('./base-writer');

class InteractionWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} interactionReader - 用於清除快取的 Reader 實例
     */
    constructor(sheets, spreadsheetId, interactionReader) {
        super(sheets, spreadsheetId);
        if (!interactionReader) {
            throw new Error('InteractionWriter 需要 InteractionReader 的實例');
        }
        this.interactionReader = interactionReader;
    }

    /**
     * 建立新互動紀錄
     */
    async createInteraction(data, recorder) {
        console.log(`💬 [InteractionWriter] 建立新互動: ${data.eventTitle} by ${recorder}`);
        const now = new Date().toISOString();
        const interactionId = `INT${Date.now()}`;
        
        const newRow = [
            interactionId,
            data.opportunityId || '',
            data.interactionTime || now,
            data.eventType || '',
            data.eventTitle || '',
            data.contentSummary || '',
            data.participants || '',
            data.nextAction || '',
            data.attachmentLink || '',
            data.calendarEventId || '',
            recorder, // 記錄人
            now,      // 建立時間
            data.companyId || '' // 公司ID
        ];

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.config.SHEETS.INTERACTIONS}!A:M`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        this.interactionReader.invalidateCache('interactions');
        return { success: true, id: interactionId };
    }

    /**
     * 更新互動紀錄
     */
    async updateInteraction(id, data, modifier) {
        console.log(`💬 [InteractionWriter] 更新互動紀錄: ${id} by ${modifier}`);
        
        // 1. 查找 Row Index
        // 互動紀錄是核心業務資料，所以 interactionReader 的 ID 應該與 Writer 一致 (Container 保證)
        const rangeSearch = `${this.config.SHEETS.INTERACTIONS}!A:A`;
        const rowObj = await this.interactionReader.findRowByValue(rangeSearch, 0, id);
        
        if (!rowObj) throw new Error(`找不到互動紀錄 ID: ${id}`);
        const rowIndex = rowObj.rowIndex;

        // 2. 讀取完整舊資料
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const rangeData = `${this.config.SHEETS.INTERACTIONS}!A${rowIndex}:M${rowIndex}`;
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: rangeData
        });
        
        const currentRow = response.data.values ? response.data.values[0] : [];
        if (currentRow.length === 0) throw new Error('讀取互動紀錄失敗');

        // 補齊長度
        while(currentRow.length < 13) currentRow.push('');

        // 3. 更新欄位 (依據 INTERACTION_FIELDS 順序)
        // 0:ID, 1:OppID, 2:Time, 3:Type, 4:Title, 5:Summary, 6:Participants, 7:Next, 8:Link, 9:CalID, 10:Recorder, 11:CreateTime, 12:CompanyID
        
        if (data.interactionTime !== undefined) currentRow[2] = data.interactionTime;
        if (data.eventType !== undefined) currentRow[3] = data.eventType;
        if (data.eventTitle !== undefined) currentRow[4] = data.eventTitle;
        if (data.contentSummary !== undefined) currentRow[5] = data.contentSummary;
        if (data.participants !== undefined) currentRow[6] = data.participants;
        if (data.nextAction !== undefined) currentRow[7] = data.nextAction;
        if (data.attachmentLink !== undefined) currentRow[8] = data.attachmentLink;
        // 不允許修改 ID, OpportunityID, CompanyID, Recorder, CreateTime

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: rangeData,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        this.interactionReader.invalidateCache('interactions');
        return { success: true };
    }

    /**
     * 刪除互動紀錄
     */
    async deleteInteraction(id, modifier) {
        console.log(`🗑️ [InteractionWriter] 刪除互動紀錄: ${id} by ${modifier}`);
        
        const rangeSearch = `${this.config.SHEETS.INTERACTIONS}!A:A`;
        const rowObj = await this.interactionReader.findRowByValue(rangeSearch, 0, id);
        
        if (!rowObj) throw new Error(`找不到互動紀錄 ID: ${id}`);
        
        // 呼叫 BaseWriter 的 _deleteRow
        await this._deleteRow(
            this.config.SHEETS.INTERACTIONS, 
            rowObj.rowIndex, 
            this.interactionReader
        );
        
        return { success: true };
    }
}

module.exports = InteractionWriter;
</file>

<file path="public/components/forms/event-form-dt.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-name" class="form-label">事件名稱 *</label>
        <input type="text" class="form-input" id="event-name" name="eventName" required>
    </div>

    <div class="form-group">
        <label class="form-label">我方與會人員</label>
        <div class="participants-checkbox-group" id="our-participants-container">
            <p style="color: var(--text-muted);">載入中...</p>
        </div>
    </div>
    
    <div class="form-group">
        <label for="client-participants" class="form-label">客戶與會人員</label>
        <div id="client-participants-container">
            <input type="text" class="form-input" id="client-participants" name="clientParticipants" placeholder="請先選擇關聯對象以載入聯絡人...">
        </div>
    </div>

    <div class="form-group">
        <label for="visit-place" class="form-label">會議地點</label>
        <input type="text" class="form-input" id="visit-place" name="visitPlace">
    </div>
    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2"></textarea>
    </div>
</fieldset>

<fieldset>
    <legend>DT 專屬資訊</legend>
    <div class="form-group">
        <label for="dt-device-scale" class="form-label">設備規模</label>
        <input type="text" class="form-input" id="dt-device-scale" name="dt_deviceScale">
    </div>
    <div class="form-group">
        <label for="dt-processing-type" class="form-label">加工類型</label>
        <input type="text" class="form-input" id="dt-processing-type" name="dt_processingType">
    </div>
    <div class="form-group">
        <label for="dt-industry" class="form-label">加工產業別</label>
        <input type="text" class="form-input" id="dt-industry" name="dt_industry">
    </div>
</fieldset>
</file>

<file path="public/components/forms/event-form-dx.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-name" class="form-label">事件名稱 *</label>
        <input type="text" class="form-input" id="event-name" name="eventName" required>
    </div>

    <div class="form-group">
        <label class="form-label">我方與會人員</label>
        <div class="participants-checkbox-group" id="our-participants-container">
            <p style="color: var(--text-muted);">載入中...</p>
        </div>
    </div>
    
    <div class="form-group">
        <label for="client-participants" class="form-label">客戶與會人員</label>
        <div id="client-participants-container">
            <input type="text" class="form-input" id="client-participants" name="clientParticipants" placeholder="請先選擇關聯對象以載入聯絡人...">
        </div>
    </div>
    
    <div class="form-group">
        <label for="visit-place" class="form-label">會議地點</label>
        <input type="text" class="form-input" id="visit-place" name="visitPlace">
    </div>
    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2"></textarea>
    </div>
</fieldset>
</file>

<file path="public/components/forms/event-form-general.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-name" class="form-label">事件名稱 *</label>
        <input type="text" class="form-input" id="event-name" name="eventName" required>
    </div>

    <div class="form-group">
        <label class="form-label">我方與會人員</label>
        <div class="participants-checkbox-group" id="our-participants-container">
            <p style="color: var(--text-muted);">載入中...</p>
        </div>
    </div>
    
    <div class="form-group">
        <label for="client-participants" class="form-label">客戶與會人員</label>
        <div id="client-participants-container">
            <input type="text" class="form-input" id="client-participants" name="clientParticipants" placeholder="請先選擇關聯對象以載入聯絡人...">
        </div>
    </div>
    
    <div class="form-group">
        <label for="visit-place" class="form-label">會議地點</label>
        <input type="text" class="form-input" id="visit-place" name="visitPlace">
    </div>

    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2" style="resize: vertical;"></textarea>
    </div>
</fieldset>
</file>

<file path="public/components/forms/event-form-iot.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2" style="resize: vertical;"></textarea>
    </div>
</fieldset>

<fieldset>
    <legend>IOT 專屬資訊</legend>
    
    <div class="form-group">
        <label for="iot-device-scale" class="form-label">設備規模</label>
        <textarea class="form-textarea" id="iot-device-scale" name="iot_deviceScale" rows="1" placeholder="例: 機台數量、PLC 數量" style="resize: vertical;"></textarea>
    </div>

    <div class="form-group">
        <label class="form-label">生產線特徵 (可多選)</label>
        <div class="participants-checkbox-group" id="iot-line-features">
            <label><input type="checkbox" name="iot_lineFeatures" value="工具機"> <span>工具機</span></label>
            <label><input type="checkbox" name="iot_lineFeatures" value="ROBOT"> <span>ROBOT</span></label>
            <label><input type="checkbox" name="iot_lineFeatures" value="傳產機"> <span>傳產機</span></label>
            <label><input type="checkbox" name="iot_lineFeatures" value="PLC"> <span>PLC</span></label>
        </div>
    </div>
    
    <div class="form-group">
        <label for="iot-production-status" class="form-label">生產現況</label>
        <textarea class="form-textarea" id="iot-production-status" name="iot_productionStatus" rows="3" placeholder="客戶目前生產情況" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="iot-status" class="form-label">IoT現況</label>
        <textarea class="form-textarea" id="iot-status" name="iot_iotStatus" rows="3" placeholder="客戶 IoT 導入情況" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label class="form-label">痛點分類 (可多選)</label>
        <div class="participants-checkbox-group" id="iot-pain-points">
            <label><input type="checkbox" name="iot_painPoints" value="Monitoring"> <span>Monitoring</span></label>
            <label><input type="checkbox" name="iot_painPoints" value="Improve OEE"> <span>Improve OEE</span></label>
            <label><input type="checkbox" name="iot_painPoints" value="Reduce Man-hours"> <span>Reduce Man-hours</span></label>
            <label><input type="checkbox" name="iot_painPoints" value="Others"> <span>Others</span></label>
        </div>
    </div>
    <div class="form-group">
        <label for="iot-pain-point-details" class="form-label">客戶痛點說明</label>
        <textarea class="form-textarea" id="iot-pain-point-details" name="iot_painPointDetails" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="iot-pain-point-analysis" class="form-label">痛點分析與對策</label>
        <textarea class="form-textarea" id="iot-pain-point-analysis" name="iot_painPointAnalysis" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="iot-system-architecture" class="form-label">系統架構</label>
        <textarea class="form-textarea" id="iot-system-architecture" name="iot_systemArchitecture" rows="3" placeholder="系統架構簡圖或文字描述" style="resize: vertical;"></textarea>
    </div>
</fieldset>
</file>

<file path="public/components/modals/event-log-modal.html">
<style>
    /* ==================== 事件紀錄編輯 Modal (類報告風格 V5) ==================== */

    #event-log-modal .modal-content {
        max-width: 1100px; /* 適度寬度 */
    }
    
    #event-log-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: var(--spacing-4);
        margin-bottom: var(--spacing-6);
    }

    /* --- 區塊共用樣式 --- */
    .edit-section-block {
        margin-bottom: var(--spacing-6);
        padding-bottom: var(--spacing-6);
        border-bottom: 1px solid var(--border-color);
    }
    .edit-section-block:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }
    
    .section-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: var(--spacing-5);
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--glass-bg);
        padding: 8px 12px;
        border-radius: 6px;
    }

    /* --- 報告式表單佈局 (核心 CSS) --- */
    /* 將 form-group 改造成 Grid，模仿報告的 .info-item */
    .report-like-form .form-group {
        display: grid;
        grid-template-columns: 120px 1fr; /* 左標題固定寬 | 右內容自適應 */
        gap: 16px;
        align-items: center; /* 垂直置中 */
        margin-bottom: 12px;
    }
    
    .report-like-form .form-label {
        text-align: right;
        margin-bottom: 0; /* 抵消原本的 margin */
        color: var(--text-muted);
        font-size: 0.95rem;
        font-weight: 600;
        padding-top: 0;
    }

    /* 輸入框樣式微調：模仿報告的 .info-value-box */
    .report-like-form .form-input,
    .report-like-form .form-textarea {
        background-color: var(--primary-bg); /* 使用較深的背景色 */
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 1rem;
        color: var(--text-primary);
        transition: all 0.2s ease;
        box-shadow: none; /* 移除原本較重的陰影 */
    }

    .report-like-form .form-input:focus,
    .report-like-form .form-textarea:focus {
        background-color: var(--secondary-bg);
        border-color: var(--accent-blue);
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15); /* 柔和光暈 */
    }
    
    /* --- 第一區塊：類型選擇 (4欄卡片) --- */
    .type-select-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: var(--spacing-5);
    }
    .type-select-card {
        background: var(--secondary-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
    }
    .type-select-card:hover {
        background: var(--glass-bg);
        border-color: var(--accent-blue);
        transform: translateY(-2px);
    }
    .type-select-card.selected {
        background: color-mix(in srgb, var(--accent-blue) 10%, var(--secondary-bg));
        border-color: var(--accent-blue);
        box-shadow: 0 0 0 1px var(--accent-blue);
    }
    .type-select-icon { font-size: 1.5rem; }
    .type-select-title { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }

    /* --- 第二區塊：雙欄佈局 --- */
    .split-layout-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px; /* 增加欄間距 */
        align-items: start;
    }
    
    /* 右欄：參與人員 (膠囊樣式) */
    .tags-input-container {
        background: var(--primary-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px;
        min-height: 42px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .participant-pill-tag {
        padding: 4px 12px;
        border: 1px solid var(--border-color);
        border-radius: 20px;
        background-color: var(--secondary-bg);
        color: var(--text-secondary);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
    }
    .participant-pill-tag:hover { border-color: var(--accent-blue); color: var(--text-primary); }
    .participant-pill-tag.selected {
        background-color: var(--accent-blue);
        color: white;
        border-color: var(--accent-blue);
    }
    
    /* 紅色警示框樣式 (修正歷史時間) */
    .warning-input {
        border-color: var(--accent-red) !important;
        background-color: color-mix(in srgb, var(--accent-red) 5%, var(--primary-bg)) !important;
    }
    .warning-hint {
        color: var(--accent-red);
        font-size: 0.8rem;
        margin-top: 4px;
        display: block;
        text-align: right; /* 靠右對齊輸入框 */
    }
    
    /* 針對動態載入的表單內容，也套用報告樣式 */
    #event-form-container .form-group {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 16px;
        align-items: start; /* 多行文字框需要靠上對齊 */
        margin-bottom: 12px;
    }
    #event-form-container .form-label {
        text-align: right;
        margin-bottom: 0;
        color: var(--text-muted);
        font-size: 0.95rem;
        font-weight: 600;
        padding-top: 10px; /* 與 input 文字基線對齊 */
    }

    /* 響應式調整 */
    @media (max-width: 768px) {
        .report-like-form .form-group, 
        #event-form-container .form-group {
            grid-template-columns: 1fr; /* 手機上恢復垂直堆疊 */
            gap: 6px;
        }
        .report-like-form .form-label,
        #event-form-container .form-label {
            text-align: left;
            padding-top: 0;
        }
        .split-layout-container {
            grid-template-columns: 1fr;
            gap: var(--spacing-6);
        }
        .type-select-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    /* --- 保留 Wizard 樣式 (勿刪) --- */
    .wizard-steps { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 0 20px; }
    .step-item { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; color: var(--text-muted); font-weight: 500; opacity: 0.6; transition: all 0.3s ease; }
    .step-item.active { color: var(--accent-blue); opacity: 1; }
    .step-circle { width: 36px; height: 36px; border-radius: 50%; background-color: var(--card-bg); border: 2px solid var(--text-muted); display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 8px; transition: all 0.3s ease; }
    .step-item.active .step-circle { border-color: var(--accent-blue); background-color: var(--accent-blue); color: white; box-shadow: 0 0 10px rgba(96, 165, 250, 0.4); }
    .step-line { flex-grow: 1; height: 2px; background-color: var(--border-color); margin: 0 15px; margin-bottom: 20px; }
    .event-entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
    .event-entry-card { background: var(--card-bg); border: 2px solid var(--border-color); border-radius: var(--rounded-lg); padding: 30px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .event-entry-card:hover { border-color: var(--accent-blue); background: var(--glass-bg); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .event-entry-card.selected { border-color: var(--accent-blue); background: color-mix(in srgb, var(--accent-blue) 10%, var(--card-bg)); }
    .type-entry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .type-card { background: var(--secondary-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px 10px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; height: 100%; }
    .type-card:hover { background: var(--glass-bg); border-color: var(--accent-blue); transform: translateY(-2px); }
    .type-card.selected { background: color-mix(in srgb, var(--accent-blue) 10%, var(--secondary-bg)); border-color: var(--accent-blue); box-shadow: 0 0 0 1px var(--accent-blue); }
    .type-icon { font-size: 1.5rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--primary-bg); border-radius: 50%; flex-shrink: 0; margin-bottom: 5px; }
    .tag-selection-area { background: var(--glass-bg); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .tag-group-label { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin-bottom: 10px; display: block; }
    .tags-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .wiz-tag { padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 20px; background-color: var(--secondary-bg); color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; cursor: pointer; user-select: none; transition: all 0.2s ease; }
    .wiz-tag:hover { border-color: var(--accent-blue); }
    .wiz-tag.selected { background-color: var(--accent-blue); color: white; border-color: var(--accent-blue); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
</style>

<div id="event-log-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="event-log-modal-title">✏️ 編輯事件紀錄</h2>
            <div class="action-buttons">
                <button class="close-btn" onclick="closeModal('event-log-modal')">&times;</button>
            </div>
        </div>
        
        <form id="event-log-form" class="report-like-form">
            <input type="hidden" id="event-log-eventId" name="eventId">
            <input type="hidden" id="event-log-opportunityId" name="opportunityId">
            <input type="hidden" id="event-log-companyId" name="companyId">
            <input type="hidden" id="event-log-type" name="eventType">

            <div id="event-link-section" style="display: none;"></div>

            <div class="edit-section-block">
                <div class="section-title">1. 事件定義</div>
                
                <div class="type-select-grid">
                    <div class="type-select-card" data-type="general" onclick="selectEventTypeForEdit('general', this)">
                        <div class="type-select-icon">📝</div>
                        <div class="type-select-title">一般紀錄</div>
                    </div>
                    <div class="type-select-card" data-type="iot" onclick="selectEventTypeForEdit('iot', this)">
                        <div class="type-select-icon">🏭</div>
                        <div class="type-select-title">IoT (物聯網)</div>
                    </div>
                    <div class="type-select-card" data-type="dt" onclick="selectEventTypeForEdit('dt', this)">
                        <div class="type-select-icon">📊</div>
                        <div class="type-select-title">DT (數位雙生)</div>
                    </div>
                    <div class="type-select-card" data-type="dx" onclick="selectEventTypeForEdit('dx', this)">
                        <div class="type-select-icon">🚀</div>
                        <div class="type-select-title">DX (開發案件)</div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="event-log-name" class="form-label">事件名稱 *</label>
                    <input type="text" class="form-input" id="event-log-name" name="eventName" required placeholder="例如：需求訪談、產品簡報...">
                </div>
            </div>

            <div class="edit-section-block">
                <div class="split-layout-container">
                    <div class="left-col">
                        <div class="section-title">2. 時空資訊</div>
                        
                        <div class="form-group">
                            <label for="event-log-createdTime" class="form-label" style="color:var(--accent-red);">發生時間</label>
                            <div>
                                <input type="datetime-local" class="form-input warning-input" id="event-log-createdTime" name="createdTime">
                                <small class="warning-hint">⚠️ 修改此欄位將變更歷史排序</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="event-log-location" class="form-label">會議地點</label>
                            <input type="text" class="form-input" id="event-log-location" name="visitPlace" placeholder="例如：客戶會議室、線上...">
                        </div>
                    </div>

                    <div class="right-col">
                        <div class="section-title">3. 與會人員</div>
                        
                        <div class="form-group">
                            <label class="form-label">我方人員</label>
                            <div id="edit-our-participants-container" class="tags-input-container">
                                <span style="color: var(--text-muted); font-size: 0.9rem;">載入中...</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">客戶人員</label>
                            <div style="width: 100%;">
                                <div id="edit-client-participants-container" class="tags-input-container" style="margin-bottom: 8px;">
                                    <span style="color: var(--text-muted); font-size: 0.9rem;">載入中...</span>
                                </div>
                                <input type="text" class="form-input" id="edit-manual-participants" placeholder="其他人員 (逗號分隔)..." style="font-size: 0.9rem;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="edit-section-block" style="border-bottom: none;">
                <div class="section-title">4. 詳細內容</div>
                <div id="event-form-container"></div>
            </div>

            <div class="btn-group" style="margin-top: 0; padding-top: 0; border-top: none;">
                <button type="button" class="action-btn danger" id="event-log-delete-btn" style="display: none; margin-right: auto;">🗑️ 刪除事件</button>
                <button type="submit" class="action-btn primary" id="event-log-submit-btn">💾 儲存變更</button>
            </div>
        </form>
    </div>
</div>

<div id="new-event-wizard-modal" class="modal">
    <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
            <h2 class="modal-title">📝 新增事件紀錄</h2>
            <button class="close-btn" onclick="closeModal('new-event-wizard-modal')">&times;</button>
        </div>
        <div class="wizard-steps">
            <div class="step-item active" data-wiz-step="1"><div class="step-circle">1</div><div class="step-label">鎖定對象</div></div>
            <div class="step-line"></div>
            <div class="step-item" data-wiz-step="2"><div class="step-circle">2</div><div class="step-label">定義事件</div></div>
            <div class="step-line"></div>
            <div class="step-item" data-wiz-step="3"><div class="step-circle">3</div><div class="step-label">與會人員</div></div>
        </div>
        <form id="event-wizard-form" onsubmit="return false;">
            <div class="wizard-step-content" data-wiz-content="1">
                <h3 class="step-instruction">請問這個事件的關聯對象是？</h3>
                <div class="event-entry-grid">
                    <div class="event-entry-card" onclick="EventWizard.selectTargetType('opportunity', this)">
                        <div class="entry-icon" style="width: 60px; height: 60px; font-size: 2.5rem; display: flex; align-items: center; justify-content: center;">🎯</div>
                        <div class="entry-title">機會案件</div>
                        <div class="entry-desc">代表特定的合作或訂單，<br>如MTU，機會導向的事件紀錄。</div>
                    </div>
                    <div class="event-entry-card" onclick="EventWizard.selectTargetType('company', this)">
                        <div class="entry-icon" style="width: 60px; height: 60px; font-size: 2.5rem; display: flex; align-items: center; justify-content: center;">🏢</div>
                        <div class="entry-title">公司總覽</div>
                        <div class="entry-desc">互動中沒有特定的機會背景，<br>如SI、代理商、MTB的商談紀錄</div>
                    </div>
                </div>
                <div id="wiz-target-search-area" style="margin-top: 20px; display: none;">
                     <div class="form-group"><label class="form-label" id="wiz-search-label">搜尋名稱</label><div class="search-input-wrapper"><input type="text" class="form-input" id="wiz-target-search" placeholder="點擊輸入搜尋，或直接從下方選擇..." onkeyup="EventWizard.searchTargets(this.value)" onclick="EventWizard.searchTargets(this.value)"></div><div id="wiz-target-results" class="search-result-list"></div></div>
                </div>
            </div>
            <div class="wizard-step-content" data-wiz-content="2" style="display: none;">
                <div class="type-entry-grid">
                    <div class="type-card selected" onclick="EventWizard.selectEventType('general', this)"><div class="type-icon">📝</div><div class="type-info"><div class="type-title">一般紀錄</div><div class="type-desc"></div></div></div>
                    <div class="type-card" onclick="EventWizard.selectEventType('iot', this)"><div class="type-icon">🏭</div><div class="type-info"><div class="type-title">IoT</div><div class="type-desc"></div></div></div>
                    <div class="type-card" onclick="EventWizard.selectEventType('dt', this)"><div class="type-icon">📊</div><div class="type-info"><div class="type-title">DT</div><div class="type-desc"></div></div></div>
                    <div class="type-card" onclick="EventWizard.selectEventType('dx', this)"><div class="type-icon">🚀</div><div class="type-info"><div class="type-title">DX</div><div class="type-desc"></div></div></div>
                </div>
                <div class="form-row"><div class="form-group"><label class="form-label">事件名稱 *</label><input type="text" class="form-input" id="wiz-event-name" placeholder="例如：需求訪談、產品簡報..."></div><div class="form-group"><label class="form-label">發生時間 *</label><input type="datetime-local" class="form-input" id="wiz-event-time"></div></div>
                <div class="form-group"><label class="form-label">會議地點</label><input type="text" class="form-input" id="wiz-event-location" placeholder="例如：客戶會議室、Teams線上..."></div>
            </div>
            <div class="wizard-step-content" data-wiz-content="3" style="display: none;">
                <h3 class="step-instruction">請問有哪些人參與？</h3>
                <div class="tag-selection-area"><span class="tag-group-label">我方人員 (點擊選取)</span><div class="tags-container" id="wiz-our-participants"><span style="color: var(--text-muted);">載入中...</span></div></div>
                <div class="tag-selection-area"><span class="tag-group-label">客戶人員 (點擊選取)</span><div class="tags-container" id="wiz-client-participants"><span style="color: var(--text-muted);">請先鎖定對象以載入聯絡人</span></div></div>
                <div class="form-group"><input type="text" class="form-input" id="wiz-manual-participants" placeholder="手動輸入其他與會者 (用逗號分隔)"></div>
            </div>
            <div class="wizard-footer">
                <button type="button" class="action-btn secondary" id="wiz-prev-btn" onclick="EventWizard.prevStep()" style="display: none;">&lt; 上一步</button>
                <span style="flex-grow: 1;"></span>
                <button type="button" class="action-btn primary" id="wiz-next-btn" onclick="EventWizard.nextStep()">下一步 &gt;</button>
                <button type="button" class="action-btn primary" id="wiz-create-btn" onclick="EventWizard.create()" style="display: none;">✅ 建立並編輯詳情</button>
            </div>
        </form>
    </div>
</div>
</file>

<file path="public/scripts/events/event-charts.js">
// views/scripts/event-charts.js
// 職責：專門負責渲染「事件紀錄」頁面的儀表板圖表
// (已修改為使用 createThemedChart)

/**
 * 渲染儀表板區塊的主函式
 * @param {HTMLElement} container - 要渲染圖表的容器元素
 * @param {object} chartData - 從 API 獲取的圖表數據
 */
function renderEventsDashboardCharts(container, chartData) {
    if (!container) return;

    // 檢查 chartData 是否存在且有效
    if (!chartData) {
        console.warn('[Event Charts] 圖表渲染被跳過，因為 chartData 為空。');
        container.innerHTML = `<div class="alert alert-warning" style="grid-column: span 12; text-align: center;">無圖表資料可顯示</div>`;
        return;
    }

    container.className = 'dashboard-grid-flexible';
    container.innerHTML = `
        <div class="dashboard-widget grid-col-4">
            <div class="widget-header"><h2 class="widget-title">事件趨勢 (近30天)</h2></div>
            <div id="event-trend-chart" class="widget-content" style="height: 300px;"></div>
        </div>
        <div class="dashboard-widget grid-col-4">
            <div class="widget-header"><h2 class="widget-title">事件類型分佈</h2></div>
            <div id="event-type-chart" class="widget-content" style="height: 300px;"></div>
        </div>
        <div class="dashboard-widget grid-col-4">
            <div class="widget-header"><h2 class="widget-title">客戶規模分佈</h2></div>
            <div id="event-size-chart" class="widget-content" style="height: 300px;"></div>
        </div>
    `;

    // 使用 setTimeout 確保 DOM 元素已渲染完成且 Highcharts 函式庫已載入
    setTimeout(() => {
        if (typeof Highcharts !== 'undefined' && typeof createThemedChart === 'function') {
            renderEventsTrendChart(chartData.trend);
            renderEventsTypeChart(chartData.eventType);
            renderEventsSizeChart(chartData.size);
        } else if (typeof Highcharts === 'undefined') {
             console.error('[Event Charts] Highcharts 函式庫未載入。');
             // 可以在此處為每個圖表容器顯示錯誤訊息
             ['event-trend-chart', 'event-type-chart', 'event-size-chart'].forEach(id => {
                 const chartContainer = document.getElementById(id);
                 if (chartContainer) chartContainer.innerHTML = '<div class="alert alert-error" style="text-align: center; padding: 10px;">圖表函式庫載入失敗</div>';
             });
        } else if (typeof createThemedChart !== 'function') {
             console.error('[Event Charts] createThemedChart 函式未定義。');
              ['event-trend-chart', 'event-type-chart', 'event-size-chart'].forEach(id => {
                 const chartContainer = document.getElementById(id);
                 if (chartContainer) chartContainer.innerHTML = '<div class="alert alert-error" style="text-align: center; padding: 10px;">圖表渲染功能異常</div>';
             });
        }
    }, 0);
}

/**
 * 渲染事件趨勢圖 (折線圖) - 已修改
 * @param {Array} data - 圖表數據
 */
function renderEventsTrendChart(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('[Event Charts] 事件趨勢圖渲染失敗：無效的 data。', data);
        const container = document.getElementById('event-trend-chart');
        if (container) container.innerHTML = '<div class="alert alert-warning" style="text-align: center; padding: 10px;">無趨勢資料</div>';
        return;
    }

    const specificOptions = {
        chart: { type: 'line' },
        title: { text: '' },
        xAxis: {
            categories: data.map(d => d[0] ? d[0].substring(5) : '') // 增加保護
        },
        yAxis: {
            title: { text: '數量' },
            allowDecimals: false
        },
        legend: { enabled: false },
        series: [{
            name: '事件數',
            data: data.map(d => d[1] || 0) // 增加保護
            // 顏色會自動從主題繼承
        }]
    };
    createThemedChart('event-trend-chart', specificOptions);
}

/**
 * 渲染事件類型分佈圖 (圓餅圖) - 已修改
 * @param {Array} data - 圖表數據
 */
function renderEventsTypeChart(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('[Event Charts] 事件類型圖渲染失敗：無效的 data。', data);
        const container = document.getElementById('event-type-chart');
        if (container) container.innerHTML = '<div class="alert alert-warning" style="text-align: center; padding: 10px;">無類型資料</div>';
        return;
    }

    // 從系統設定中讀取事件類型的中文名稱和顏色
    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig?.['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));

    const chartData = data.map(d => {
        // 使用 name (value) 來查找設定
        const config = eventTypeConfig.get(d.name) || { note: (d.name || '未知').toUpperCase(), color: undefined };
        return {
            name: config.note, // 使用中文名稱 (note)
            y: d.y || 0,       // 確保 y 值存在
            color: config.color // 使用設定的顏色 (如果未設定，Highcharts 會自動選擇)
        };
    });

    const specificOptions = {
        chart: { type: 'pie' },
        title: { text: '' },
        tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y} 件)' },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    distance: 20,
                    // style 和 connectorColor 會從主題繼承
                },
                showInLegend: false
            }
        },
        // 注意：因為這裡指定了 color，所以不會使用 themeOptions.colors 的預設系列
        series: [{ name: '佔比', data: chartData }]
    };
    createThemedChart('event-type-chart', specificOptions);
}


/**
 * 渲染客戶規模分佈圖 (長條圖) - 已修改
 * @param {Array} data - 圖表數據
 */
function renderEventsSizeChart(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('[Event Charts] 客戶規模圖渲染失敗：無效的 data。', data);
        const container = document.getElementById('event-size-chart');
        if (container) container.innerHTML = '<div class="alert alert-warning" style="text-align: center; padding: 10px;">無規模資料</div>';
        return;
    }

     const specificOptions = {
        chart: { type: 'bar' },
        title: { text: '' },
        xAxis: {
            categories: data.map(d => d[0] || '未分類'), // 增加保護
             title: { text: null } // 確保不顯示 X 軸標題
        },
        yAxis: {
            min: 0,
            title: { text: '事件數量', align: 'high' }, // 確保 Y 軸標題文字正確
            allowDecimals: false
        },
        legend: { enabled: false },
        series: [{
            name: '數量',
            data: data.map(d => d[1] || 0) // 增加保護
            // 顏色會自動從主題繼承 (通常是第二個顏色)
        }]
    };
    createThemedChart('event-size-chart', specificOptions);
}
</file>

<file path="public/scripts/events/event-editor-standalone.js">
// public/scripts/events/event-editor-standalone.js
/**
 * @version Phase 8.11 Final Stable
 * @date 2026-04-15
 * @purpose Phase 8.11 Production：修正外部關閉 (ESC/Backdrop) 導致的 Scroll Lock 凍結問題
 * @description [Bugfix Patch] Added MutationObserver to guarantee _unlockScroll fires when modal is hidden externally.
 */

// 職責：獨立的事件編輯器控制器 (含 DT Placeholders)
// (Refactored: Fix Zero-Dimension Trap via ResizeObserver - Loop Safe)

// [Forensics Probe] Debug Counter
console.log('%c[EventEditorStandalone] LOADED Phase 8.11 Final Stable Production (Patched)', 'color:#22c55e;font-weight:bold;');

window._DEBUG_EDITOR_OPEN_COUNT ||= 0;

const EventEditorStandalone = (() => {
    let _modal, _form, _inputs = {};
    
    let _data = {
        ourParticipants: new Set(),
        clientParticipants: new Set()
    };
    
    let _isInitialized = false;
    let _resizeObserver = null;
    let _modalObserver = null; // [Fix] Observer for external close detection
    
    // [Fix] State flags for scroll lock and re-entry guard
    let _isOpening = false;
    let _originalOverflow = { body: '' }; // Removed html overflow state to prevent divergent lock freeze

    // [Fix] Prevent double-submit
    let _isSaving = false;

    const DEFAULT_OPTIONS = {
        lineFeatures: ['工具機', 'ROBOT', '傳產機', 'PLC'],
        painPoints: ['Monitoring', 'Improve OEE', 'Reduce Man-hours', 'Others']
    };

    // 【新增】確保模板已載入
    async function _ensureTemplateLoaded() {
        if (document.getElementById('standalone-event-modal')) return;
        
        try {
            const response = await fetch('/views/event-editor.html');
            if (!response.ok) throw new Error('無法下載編輯器模板');
            let html = await response.text();
            
            // 移除 HTML 中的 script 標籤，避免重複執行初始化
            html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            
            const container = document.getElementById('modal-container') || document.body;
            container.insertAdjacentHTML('beforeend', html);
        } catch (e) {
            console.error('載入 Event Editor Template 失敗:', e);
            throw e;
        }
    }

    function _init() {
        if (_isInitialized && document.getElementById('standalone-event-modal')) return;
        
        _modal = document.getElementById('standalone-event-modal');
        if (!_modal) return; 
        
        _form = document.getElementById('standalone-event-form');
        
        _inputs = {
            id: document.getElementById('standalone-eventId'),
            oppId: document.getElementById('standalone-opportunityId'),
            compId: document.getElementById('standalone-companyId'),
            type: document.getElementById('standalone-type'),
            name: document.getElementById('standalone-name'),
            time: document.getElementById('standalone-createdTime'),
            location: document.getElementById('standalone-location'),
            
            content: document.getElementById('standalone-content'),
            questions: document.getElementById('standalone-questions'),
            intelligence: document.getElementById('standalone-intelligence'),
            notes: document.getElementById('standalone-notes'),

            ourContainer: document.getElementById('standalone-our-participants-container'),
            manualOur: document.getElementById('standalone-manual-our-participants'),
            clientContainer: document.getElementById('standalone-client-participants-container'),
            manualClient: document.getElementById('standalone-manual-participants'),
            
            specificWrapper: document.getElementById('standalone-specific-wrapper'),
            specificCard: document.getElementById('specific-info-card'),
            specificTitle: document.getElementById('specific-card-title'),
            specificContainer: document.getElementById('standalone-specific-container'),
            workspaceGrid: document.getElementById('workspace-container'),

            submitBtn: document.getElementById('standalone-submit-btn'),
            deleteBtn: document.getElementById('standalone-delete-btn'),
            closeBtn: document.getElementById('standalone-close-btn')
        };

        if (_inputs.closeBtn) _inputs.closeBtn.onclick = _close;
        if (_form) {
            _form.onsubmit = _handleSubmit;
            _form.addEventListener('input', (e) => {
                if (e.target.tagName.toLowerCase() === 'textarea') {
                    _autoResize(e.target);
                }
            });
        }
        
        // Initialize ResizeObserver to handle initial layout visibility (Zero-Dimension Fix)
        if (!_resizeObserver) {
            _resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // Only resize if the element is visible
                    if (entry.target.offsetParent !== null) {
                        _autoResize(entry.target);
                        // Stop observing immediately to prevent Loop Limit Exceeded errors.
                        // We only needed this to catch the transition from hidden -> visible.
                        _resizeObserver.unobserve(entry.target);
                    }
                }
            });
        }

        // [Fix] Initialize MutationObserver to catch external close (ESC / backdrop click)
        if (!_modalObserver && _modal) {
            _modalObserver = new MutationObserver(() => {
                if (_modal.style.display === 'none' || window.getComputedStyle(_modal).display === 'none') {
                    _unlockScroll();
                    if (_resizeObserver) _resizeObserver.disconnect();
                }
            });
            _modalObserver.observe(_modal, { attributes: true, attributeFilter: ['style', 'class'] });
        }

        _isInitialized = true;
    }

    function _autoResize(element) {
        if (!element) return;
        
        // Zero-Dimension Trap Guard: Check visibility
        if (element.offsetParent === null) {
            // Element is hidden, observe it to resize when it becomes visible
            if (_resizeObserver) _resizeObserver.observe(element);
            return;
        }

        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }

    // [Fix] Scroll locking helpers (Aligned with global ui.js to prevent freeze)
    function _lockScroll() {
        _originalOverflow.body = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }

    function _unlockScroll() {
        document.body.style.overflow = _originalOverflow.body;
    }

    async function open(eventId) {
        // [Fix] Anti-reentry guard
        if (_isOpening) return;
        _isOpening = true;

        // [Forensics Probe] Trace call
        window._DEBUG_EDITOR_OPEN_COUNT++;
        console.log(`[Forensics] EventEditorStandalone.open called (Count: ${window._DEBUG_EDITOR_OPEN_COUNT})`, { eventId });
        console.trace('[Forensics] EventEditorStandalone.open trace');

        try {
            await _ensureTemplateLoaded();
            _init();
            
            if (!_modal || !_form) {
                console.error('無法初始化編輯器 DOM');
                showNotification('編輯器初始化失敗', 'error');
                return;
            }

            _resetForm();
            _modal.style.display = 'block';
            _lockScroll(); // [Fix] Lock scroll on open
            
            // ★★★ [Fix] 判斷是編輯還是新增 ★★★
            if (eventId) {
                _setLoading(true, '載入中...');

                // 1. Main Event Data Fetch
                // If this fails, we MUST close because we have nothing to edit.
                let eventData = null;
                try {
                    const result = await authedFetch(`/api/events/${eventId}`);
                    if (result.success) {
                        eventData = result.data;
                    } else {
                        throw new Error(result.error || 'Unknown Error');
                    }
                } catch (fetchError) {
                    console.error('Main event fetch failed:', fetchError);
                    showNotification('無法載入事件: ' + fetchError.message, 'error');
                    _close();
                    return; // Critical failure, stop here.
                }

                // 2. Setup Delete Button (UI)
                if (_inputs.deleteBtn) {
                    _inputs.deleteBtn.style.display = 'block';
                    _inputs.deleteBtn.onclick = () => _confirmDelete(eventData.eventId, eventData.eventName);
                }

                // 3. Populate Form with Robust Error Handling
                // [Fix] If populate fails (e.g. linked opportunity 500), catch it and keep editor open.
                try {
                    await _populateForm(eventData);
                } catch (populateError) {
                    console.error('[EventEditor] Partial population failure:', populateError);
                    showNotification('關聯資料載入異常，但您仍可編輯主要內容', 'warning');
                }
                
                _setLoading(false);

            } else {
                // 新增模式：隱藏刪除按鈕，初始化類型
                if (_inputs.deleteBtn) _inputs.deleteBtn.style.display = 'none';
                _applyTypeSwitch('general', {});
                // 設為一般狀態，不顯示 Loading
                _setLoading(false);
            }

        } catch (e) {
            console.error(e);
            showNotification('發生未預期錯誤', 'error');
            _close();
            _setLoading(false);
        } finally {
            _isOpening = false; // [Fix] Release guard
        }
    }

    async function _populateForm(eventData) {
        _inputs.id.value = eventData.eventId;
        _inputs.oppId.value = eventData.opportunityId || '';
        _inputs.compId.value = eventData.companyId || '';
        _inputs.name.value = eventData.eventName || '';
        _inputs.location.value = eventData.visitPlace || '';
        
        _inputs.content.value = eventData.eventContent || '';
        _inputs.questions.value = eventData.clientQuestions || '';
        _inputs.intelligence.value = eventData.clientIntelligence || '';
        _inputs.notes.value = eventData.eventNotes || '';

        // Trigger resize. If hidden, observer will catch it later.
        [_inputs.content, _inputs.questions, _inputs.intelligence, _inputs.notes].forEach(el => {
            if (el) _autoResize(el);
        });

        if (eventData.createdTime) {
            const date = new Date(eventData.createdTime);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            _inputs.time.value = date.toISOString().slice(0, 16);
        }

        const eventType = eventData.eventType || 'general';
        const typeToSelect = eventType === 'legacy' ? 'iot' : eventType;
        
        await _applyTypeSwitch(typeToSelect, eventData);

        _data.ourParticipants.clear();
        const ourManualList = [];
        const teamMembers = window.CRM_APP.systemConfig['團隊成員'] || [];
        const teamNames = new Set(teamMembers.map(m => m.note));

        (eventData.ourParticipants || '').split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
            if (teamNames.has(p)) _data.ourParticipants.add(p);
            else ourManualList.push(p);
        });
        _renderPillSelector('our', _inputs.ourContainer, teamMembers, _data.ourParticipants);
        _inputs.manualOur.value = ourManualList.join(', ');

        _data.clientParticipants.clear();
        const clientList = (eventData.clientParticipants || '').split(',').map(p => p.trim()).filter(Boolean);
        await _fetchAndPopulateClientParticipants(eventData.opportunityId, eventData.companyId, clientList);
    }

    function selectType(newType, cardElement) {
        const currentType = _inputs.type.value;
        if (currentType === newType) return;

        const container = _inputs.specificContainer;
        let hasData = false;
        let mergedData = '';

        if (container) {
            container.querySelectorAll('input[type="text"], textarea').forEach(el => {
                if (el.value && el.value.trim()) {
                    hasData = true;
                    const label = el.closest('.form-group')?.querySelector('label')?.textContent || el.name;
                    mergedData += `● ${label}：\n${el.value}\n\n`;
                }
            });
            container.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked').forEach(el => {
                hasData = true;
                let label = el.name; 
                const groupLabel = el.closest('.form-group')?.querySelector('.iso-label');
                if (groupLabel) label = groupLabel.textContent;
                mergedData += `● ${label}：${el.value}\n\n`;
            });
        }

        if (hasData) {
            showConfirmDialog(`切換類型將移除目前專屬欄位資料，是否繼續？\n(舊資料將自動備份至備註)`, () => {
                const currentNotes = _inputs.notes.value;
                const nowStr = new Date().toLocaleString();
                const backupBlock = `\n----------------------------------------\n【系統自動備份】 (${nowStr})\n原類型：${currentType}\n\n${mergedData}----------------------------------------\n`;
                
                _inputs.notes.value = currentNotes + backupBlock;
                _autoResize(_inputs.notes);

                _applyTypeSwitch(newType, {});
            });
        } else {
            _applyTypeSwitch(newType, {});
        }
    }

    async function _applyTypeSwitch(newType, eventData) {
        const grid = document.querySelector('#standalone-event-modal .type-select-grid');
        if (grid) {
            grid.querySelectorAll('.type-select-card').forEach(el => el.classList.remove('selected'));
            const target = grid.querySelector(`.type-select-card[data-type="${newType}"]`);
            if(target) target.classList.add('selected');
        }
        _inputs.type.value = newType;

        _updateSpecificCardColor(newType);
        _inputs.specificContainer.innerHTML = '';
        
        if (newType === 'general') {
            _inputs.specificWrapper.style.display = 'none';
            _inputs.workspaceGrid.classList.remove('has-sidebar');
        } else {
            _inputs.specificWrapper.style.display = 'block';
            _inputs.workspaceGrid.classList.add('has-sidebar');
            
            if (newType === 'iot') {
                _renderIoTFields(eventData);
            } else if (newType === 'dt') {
                _renderSimpleFields(eventData, 
                    ['dt_deviceScale', 'dt_processingType', 'dt_industry'], 
                    ['設備規模', '加工類型', '加工產業別'],
                    ['例：預計導入機台數、場域大小...', '例：CNC、射出成型、組裝...', '例：航太、半導體、車用...']
                );
            } else {
                _inputs.specificContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">無專屬欄位設定</p>';
            }
            
            // Trigger resize for new fields
            _inputs.specificContainer.querySelectorAll('textarea').forEach(el => {
                _autoResize(el);
            });
        }
    }

    function _updateSpecificCardColor(type) {
        const config = window.CRM_APP?.systemConfig?.['事件類型'] || [];
        const typeConfig = config.find(t => t.value === type);
        const baseColor = typeConfig?.color || '#64748b';
        
        _inputs.specificCard.style.backgroundColor = `color-mix(in srgb, ${baseColor} 5%, white)`;
        _inputs.specificCard.style.borderColor = `color-mix(in srgb, ${baseColor} 20%, white)`;
        _inputs.specificTitle.style.color = baseColor;
        _inputs.specificTitle.style.borderBottomColor = `color-mix(in srgb, ${baseColor} 20%, white)`;
    }

    function _renderIoTFields(data) {
        const container = _inputs.specificContainer;

        // ✅ v1.0.6：避免 UX 退化 — 設備規模改回 textarea（承襲你 v1.0.3 的修正）
        container.innerHTML += _createTextareaHTML('iot_deviceScale', '設備規模', data.iot_deviceScale, '例：機台數量 50 台、PLC 型號...');

        const lineFeaturesVal = (data.iot_lineFeatures || '').split(',').map(s=>s.trim());
        container.innerHTML += _createCheckboxGroupHTML('iot_lineFeatures', '生產線特徵(可多選)', DEFAULT_OPTIONS.lineFeatures, lineFeaturesVal);

        container.innerHTML += _createTextareaHTML('iot_productionStatus', '生產現況', data.iot_productionStatus, '請描述客戶目前的生產流程、稼動率或遇到的瓶頸...');
        container.innerHTML += _createTextareaHTML('iot_iotStatus', 'IoT現況', data.iot_iotStatus, '客戶是否已導入 MES、ERP 或其他聯網系統？');
        
        const painPointsVal = (data.iot_painPoints || '').split(',').map(s=>s.trim());
        container.innerHTML += _createCheckboxGroupHTML('iot_painPoints', '痛點分類(可多選)', DEFAULT_OPTIONS.painPoints, painPointsVal);

        container.innerHTML += _createTextareaHTML('iot_painPointDetails', '客戶痛點說明', data.iot_painPointDetails, '請詳細描述客戶提出的具體困難點...');
        container.innerHTML += _createTextareaHTML('iot_painPointAnalysis', '痛點分析與對策', data.iot_painPointAnalysis, '針對上述痛點，我方提出的分析觀點或初步對策...');
        container.innerHTML += _createTextareaHTML('iot_systemArchitecture', '系統架構', data.iot_systemArchitecture, '請描述預計導入的架構、硬體配置或軟體模組...');
    }

    function _renderSimpleFields(data, keys, labels, placeholders = []) {
        let html = '';
        keys.forEach((key, idx) => {
            html += _createInputHTML(key, labels[idx], data[key], placeholders[idx] || '');
        });
        _inputs.specificContainer.innerHTML = html;
    }

    function _createInputHTML(name, label, value, placeholder = '') {
        const safeValue = (value === null || value === undefined) ? '' : value;
        return `<div class="form-group"><label class="iso-label">${label}</label><input type="text" class="iso-input" name="${name}" value="${safeValue}" placeholder="${placeholder}"></div>`;
    }
    
    // 這裡會產生 <textarea class="form-textarea">，搭配 CSS 的 resize: vertical 即可調整
    function _createTextareaHTML(name, label, value, placeholder = '') {
        const safeValue = (value === null || value === undefined) ? '' : value;
        return `<div class="form-group"><label class="iso-label">${label}</label><textarea class="form-textarea" name="${name}" rows="1" placeholder="${placeholder}">${safeValue}</textarea></div>`;
    }
    
    function _createCheckboxGroupHTML(name, label, options, selectedValues) {
        let checks = options.map(opt => {
            const checked = selectedValues.includes(opt) ? 'checked' : '';
            return `<label><input type="checkbox" name="${name}" value="${opt}" ${checked}> ${opt}</label>`;
        }).join('');
        return `<div class="form-group"><label class="iso-label">${label}</label><div class="checkbox-group">${checks}</div></div>`;
    }

    function _renderPillSelector(type, container, optionsList, selectedSet) {
        if (!container) return;
        const allItems = new Map();
        optionsList.forEach(opt => {
            const val = opt.value || opt.name || opt.note;
            const label = opt.note || opt.name || val;
            allItems.set(val, label);
        });

        let html = '';
        allItems.forEach((label, val) => {
            const isSelected = selectedSet.has(val) ? 'selected' : '';
            html += `<span class="participant-pill-tag ${isSelected}" onclick="EventEditorStandalone.toggleItem('${type}', '${val}', this)">${label}</span>`;
        });
        container.innerHTML = html;
    }

    function toggleItem(dataSetKey, val, el) {
        let targetSet = (dataSetKey === 'our') ? _data.ourParticipants : _data.clientParticipants;
        if (targetSet.has(val)) {
            targetSet.delete(val);
            el.classList.remove('selected');
        } else {
            targetSet.add(val);
            el.classList.add('selected');
        }
    }

    async function _fetchAndPopulateClientParticipants(oppId, compId, currentList) {
        let contacts = [];
        try {
            if (oppId) {
                const res = await authedFetch(`/api/opportunities/${oppId}/details`);
                if (res.success) contacts = res.data.linkedContacts || [];
            } else if (compId) {
                const all = await authedFetch(`/api/companies`).then(r => r.data || []);
                const comp = all.find(c => c.companyId === compId);
                if (comp) {
                    const res = await authedFetch(`/api/companies/${encodeURIComponent(comp.companyName)}/details`);
                    if (res.success) contacts = res.data.contacts || [];
                }
            }
        } catch (e) { console.error(e); }

        const manualList = [];
        const knownNames = new Set(contacts.map(c => c.name));
        currentList.forEach(p => {
            if (knownNames.has(p)) _data.clientParticipants.add(p);
            else manualList.push(p);
        });
        _renderPillSelector('client', _inputs.clientContainer, contacts, _data.clientParticipants);
        _inputs.manualClient.value = manualList.join(', ');
    }

    async function _handleSubmit(e) {
        e.preventDefault();

        if (_isSaving) return;
        _isSaving = true;

        const id = _inputs.id.value;
        
        // Phase 8.2 Fix: include dynamic fields outside <form>
        const formData = new FormData(_form);

        // 手動補抓 IoT / DT 動態欄位（可能不在 form 內）
        document.querySelectorAll(
            '#standalone-specific-container input[name], #standalone-specific-container textarea[name]'
        ).forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) formData.append(el.name, el.value);
            } else {
                formData.append(el.name, el.value);
            }
        });

        const data = {};
        
        // 注意：FormData 可能包含重複 key（checkbox / 動態欄位補抓），這裡先收單值，multi 會在下方重算
        for (let [k, v] of formData.entries()) {
            if (!data[k]) data[k] = v;
        }

        const mergePillsAndInput = (set, inputEl) => {
            const manuals = (inputEl?.value || '').split(',').map(s => s.trim()).filter(Boolean);
            return [...Array.from(set), ...manuals].join(', ');
        };
        data.ourParticipants = mergePillsAndInput(_data.ourParticipants, _inputs.manualOur);
        data.clientParticipants = mergePillsAndInput(_data.clientParticipants, _inputs.manualClient);

        if (_inputs.time.value) data.createdTime = new Date(_inputs.time.value).toISOString();

        const checkboxes = _form.querySelectorAll('input[type="checkbox"][name]:checked');
        const multi = {};
        checkboxes.forEach(cb => {
            if(!multi[cb.name]) multi[cb.name] = [];
            multi[cb.name].push(cb.value);
        });
        for (let k in multi) data[k] = multi[k].join(', ');

        data.eventType = _inputs.type.value;

        _setLoading(true, '儲存中...');
        try {
            // [Phase 8 Fix] Distinguish Create (POST) vs Update (PUT)
            let res;
            if (id) {
                res = await authedFetch(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            } else {
                res = await authedFetch(`/api/events`, { method: 'POST', body: JSON.stringify(data) });
            }

            // Production rule: treat explicit success:false as failure; everything else is success.
            if (res && res.success === false) {
                throw new Error(res.error || res.message || 'Unknown Error');
            }

            // ✅ Success UX
            showNotification('事件已儲存', 'success');

            // [Phase 8.10 Stale-Refresh Fix] 標記 Dashboard 資料過期
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            // Close first for best UX (avoid modal lingering if router refresh triggers)
            _close();

            // Phase 8: If we are on standalone route, normalize back to #events to prevent router re-entry loop.
            // Do NOT force refreshCurrentView here; dashboard behind modal will refresh via its own logic if needed.
            if (typeof window.location?.hash === 'string' && window.location.hash.includes('event-editor')) {
                window.location.hash = '#events';
            }

        } catch (e) {
            console.error('[EventEditorStandalone] save failed:', e);
            showNotification('儲存失敗: ' + (e.message || String(e)), 'error');
        } finally {
            _setLoading(false);
            _isSaving = false;
        }
    }

    function _confirmDelete(id, name) {
        showConfirmDialog(`確定刪除事件 "${name}"？`, async () => {
            showLoading('刪除中...');
            try {
                await authedFetch(`/api/events/${id}`, { method: 'DELETE' });
                
                // [Phase 8.10 Stale-Refresh Fix] 標記 Dashboard 資料過期
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
                
                _close();
                closeModal('event-log-report-modal');
                
                // 即時更新當前列表 (如果是停留在 Event List)
                if (window.CRM_APP && window.CRM_APP.refreshCurrentView) {
                     window.CRM_APP.refreshCurrentView();
                }
            } catch (e) { console.error(e); } finally { hideLoading(); }
        });
    }

    function _close() { 
        if (_modal) _modal.style.display = 'none'; 
        if (_resizeObserver) _resizeObserver.disconnect();
        _unlockScroll(); // [Fix] Restore scroll on close
    }
    
    function _resetForm() {
        if (!_form) return;
        _form.reset();
        _data.ourParticipants.clear();
        _data.clientParticipants.clear();
        _setLoading(false);
        
        _inputs.specificContainer.innerHTML = '';
        _inputs.specificWrapper.style.display = 'none';
        _inputs.workspaceGrid.classList.remove('has-sidebar');
    }

    function _setLoading(isLoading, text) {
        if (!_inputs.submitBtn) return;
        _inputs.submitBtn.disabled = isLoading;
        _inputs.submitBtn.textContent = isLoading ? text : '儲存';
    }

    return {
        open: open,
        close: _close,
        selectType: selectType,
        toggleItem: toggleItem
    };
})();

window.EventEditorStandalone = EventEditorStandalone;

// ★★★ [Fix] 註冊 Router 模組 (相容性修正) ★★★
if (window.CRM_APP) {
    window.CRM_APP.pageModules['event-editor'] = async (params) => {
        // [Hotfix] 參數相容性處理：
        // 1. 若 params 為物件 (Router 修改後傳入)，取 params.eventId
        // 2. 若 params 為字串 (相容舊有 detail 呼叫習慣或手動呼叫)，直接當 id
        // 3. 若無參數 (params == null/undefined)，id 為 null (開啟新增模式)
        
        let id = null;
        if (params && typeof params === 'object') {
            id = params.eventId;
        } else if (typeof params === 'string') {
            id = params;
        }
        
        await EventEditorStandalone.open(id);
    };
}
</file>

<file path="public/scripts/events/event-list.js">
// public/scripts/events/event-list.js
// 職責：渲染並管理「事件紀錄」頁面的主列表 (含搜尋、篩選、統計、圖示化操作)
// (Systematic Refactor: Event Delegation - 統一事件處理機制)
/**
 * @version 1.0.15
 * @date 2026-04-14
 * @description [Interaction Alignment Patch] Switched Event Name click action from edit-event to view-report to enforce observation-first flow.
 */

// 模組內部狀態
let _fullEventData = [];
let _eventFilters = { type: 'all', time: 'all', creator: 'all' };
let _eventSearchQuery = '';

// [Forensics Probe] Debug Counters
window._DEBUG_EVENT_LIST_BIND_COUNT ||= 0;
window._DEBUG_EVENT_LIST_CLICK_COUNT ||= 0;

/**
 * 初始化並渲染事件紀錄列表介面
 * @param {HTMLElement} container - 容器
 * @param {Array<object>} eventList - 資料來源
 */
function renderEventLogList(container, eventList) {
    if (!container) return;

    // 1. 儲存原始資料
    _fullEventData = eventList || [];

    // 2. 注入 CSS 樣式
    _injectEventListStyles();

    // 3. 渲染介面骨架 (包裹 root class 以便委派，恢復穩定 dashboard-widget 結構)
    container.innerHTML = `
        <div class="event-list-root dashboard-widget">
            
            <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <div style="display: flex; align-items: baseline; gap: 15px;">
                    <h2 class="widget-title" style="margin: 0;">事件總覽</h2>
                </div>
                <div id="event-type-tabs" class="event-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px; overflow-x: auto;">
                </div>
            </div>

            <div id="event-filter-bar" style="padding: 1.25rem 1.5rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <select id="event-filter-time" class="form-select-sm" data-filter="time">
                    <option value="all">所有時間</option>
                    <option value="7">近 7 天</option>
                    <option value="30">近 30 天</option>
                    <option value="90">近 90 天</option>
                </select>
                <select id="event-filter-creator" class="form-select-sm" data-filter="creator">
                    <option value="all">所有建立者</option>
                </select>
            </div>

            <div id="event-action-bar" style="padding: 1rem 1.5rem 0.5rem;">
                
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 1rem; flex-wrap: wrap;">
                    <div style="flex: 1; max-width: 400px;">
                        <input type="text" class="search-box" id="event-list-search" placeholder="搜尋事件、對象或建立者..." style="width: 100%;">
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem; min-height: 24px;">
                    <div id="event-filter-status" style="display: none; align-items: center; gap: 8px;">
                        <span id="event-filter-text" style="font-size: 0.85rem; font-weight: 600; color: var(--accent-blue);"></span>
                        <button class="action-btn small danger" data-action="clear-filters" style="padding: 2px 8px;">清除</button>
                    </div>
                    
                    <div id="event-list-count-container" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500; margin-left: auto;">
                        共 0 筆
                    </div>
                </div>

            </div>

            <div class="widget-content" style="padding: 0;">
                <div id="event-list-table-container" class="event-list-container">
                    <div class="loading show"><div class="spinner"></div></div>
                </div>
            </div>

        </div>
    `;

    // 4. 綁定事件委派
    const widgetRoot = container.querySelector('.event-list-root');
    if (widgetRoot) {
        window._DEBUG_EVENT_LIST_BIND_COUNT++;
        widgetRoot.removeEventListener('click', handleEventListClick);
        widgetRoot.addEventListener('click', handleEventListClick);
    }

    // 5. 初始化篩選選項 (包含產生 Tabs)
    _populateEventFilterOptions();

    // 6. 綁定輸入與 Select 事件
    const searchInput = document.getElementById('event-list-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            _eventSearchQuery = e.target.value.toLowerCase().trim();
            _filterAndRenderEvents();
        });
    }
    
    ['time', 'creator'].forEach(key => {
        const el = document.getElementById(`event-filter-${key}`);
        if (el) {
            el.addEventListener('change', (e) => {
                _eventFilters[key] = e.target.value;
                _filterAndRenderEvents();
            });
        }
    });

    // 7. 初始渲染表格
    _filterAndRenderEvents();
}

/**
 * 事件處理中心 (Delegation Hub)
 */
function handleEventListClick(e) {
    window._DEBUG_EVENT_LIST_CLICK_COUNT++;
    const btn = e.target.closest('[data-action]');

    if (!btn) return;

    const action = btn.dataset.action;
    const payload = btn.dataset;

    // 對於非導航類的按鈕，阻止預設行為
    if (action !== 'navigate') {
        e.preventDefault();
    }

    switch (action) {
        case 'filter-type':
            // 處理 Tab 切換，呼叫 renderEventTypeTabs 動態更新 inline style
            _eventFilters.type = payload.value;
            renderEventTypeTabs(window.CRM_APP?.systemConfig?.['事件類型'] || []);
            _filterAndRenderEvents();
            break;

        case 'create-event':
            if (typeof window.showEventLogForCreation === 'function') {
                window.showEventLogForCreation();
            } else {
                console.warn('showEventLogForCreation function not found');
            }
            break;

        case 'view-report':
            if (typeof window.showEventLogReport === 'function') {
                window.showEventLogReport(payload.id);
            } else {
                console.warn('showEventLogReport function not found');
            }
            break;
            
        case 'edit-event':
             if (window.EventEditorStandalone && window.EventEditorStandalone.open) {
                window.EventEditorStandalone.open(payload.id);
            } else {
                console.warn('EventEditorStandalone module not found');
            }
            break;
            
        case 'delete-event':
            if (typeof showConfirmDialog === 'function') {
                const safeName = payload.name || '此事件';
                const message = `您確定要永久刪除事件 "${safeName}" 嗎？\n\n此操作無法復原，但系統會留下一筆刪除互動紀錄。`;
                showConfirmDialog(message, async () => {
                    if (typeof showLoading === 'function') showLoading('正在刪除...');
                    try {
                        const result = await authedFetch(`/api/events/${payload.id}`, { method: 'DELETE' });
                        if (result && result.success !== false) {
                            // 刪除成功後重新載入列表
                            if (window.CRM_APP && window.CRM_APP.pageModules.events) {
                                window.CRM_APP.pageModules.events();
                            }
                        } else {
                            throw new Error(result.details || '刪除操作失敗');
                        }
                    } catch (error) {
                        if (error.message !== 'Unauthorized') console.error('刪除失敗:', error);
                        if (typeof showNotification === 'function') showNotification('刪除失敗', 'error');
                    } finally {
                        if (typeof hideLoading === 'function') hideLoading();
                    }
                });
            } else {
                console.warn('showConfirmDialog is not defined');
            }
            break;

        case 'navigate':
            // 處理 SPA 導航
            if (payload.page) {
                e.preventDefault();
                const params = payload.params ? JSON.parse(payload.params) : {};
                if (window.CRM_APP && window.CRM_APP.navigateTo) {
                    window.CRM_APP.navigateTo(payload.page, params);
                }
            }
            break;
    }
}

/**
 * 核心邏輯：篩選資料並重新渲染表格
 */
function _filterAndRenderEvents() {
    const tableContainer = document.getElementById('event-list-table-container');
    const countDisplay = document.getElementById('event-list-count-container');
    if (!tableContainer) return;

    // --- 篩選邏輯 ---
    const now = Date.now();
    const timeMap = { '7': 7, '30': 30, '90': 90 };
    
    let filtered = _fullEventData.filter(evt => {
        // 1. 搜尋
        if (_eventSearchQuery) {
            const searchContent = `${evt.eventName} ${evt.opportunityName||''} ${evt.companyName||''} ${evt.creator}`.toLowerCase();
            if (!searchContent.includes(_eventSearchQuery)) return false;
        }

        // 2. 類型篩選 (Tabs)
        if (_eventFilters.type !== 'all' && evt.eventType !== _eventFilters.type) return false;

        // 3. 時間篩選
        if (_eventFilters.time !== 'all') {
            const days = timeMap[_eventFilters.time];
            const evtTime = new Date(evt.lastModifiedTime || evt.createdTime).getTime();
            if ((now - evtTime) > (days * 24 * 60 * 60 * 1000)) return false;
        }

        // 4. 建立者篩選
        if (_eventFilters.creator !== 'all' && evt.creator !== _eventFilters.creator) return false;

        return true;
    });

    // 更新統計 (單一區塊文字)
    if (countDisplay) countDisplay.textContent = `共 ${filtered.length} 筆`;

    // --- 渲染表格 ---
    if (filtered.length === 0) {
        tableContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">沒有符合條件的事件紀錄</div>';
        return;
    }

    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig?.['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));

    let html = `
        <table class="event-list-table">
            <thead>
                <tr>
                    <th class="col-idx">項次</th>
                    <th class="col-date">最後更新</th>
                    <th class="col-type">事件類型</th>
                    <th class="col-name">事件名稱</th>
                    <th class="col-obj-tag">關聯對象</th>
                    <th class="col-obj-name">對象名稱</th>
                    <th class="col-user">建立者</th>
                    <th class="col-actions">操作</th>
                </tr>
            </thead>
            <tbody>`;

    filtered.forEach((event, index) => {
        const typeInfo = eventTypeConfig.get(event.eventType) || { note: (event.eventType || 'unknown').toUpperCase(), color: '#9ca3af' };
        const typeHtml = `<span class="common-chip" style="background-color: ${typeInfo.color};">${typeInfo.note}</span>`;

        const displayTime = event.lastModifiedTime || event.createdTime;
        const dateStr = displayTime ? new Date(displayTime).toLocaleDateString('zh-TW') : '-';

        let objTagHtml = '<span style="color:#d1d5db;">-</span>';
        let objNameHtml = '<span style="color:#d1d5db;">-</span>';

        if (event.opportunityId) {
            objTagHtml = `<span class="common-chip" style="background-color: #3b82f6;">機會</span>`;
            objNameHtml = `<span class="text-truncate" title="${event.opportunityName || event.opportunityId}" style="color:var(--text-secondary);">
                            ${event.opportunityName || '(未命名)'}
                           </span>`;
        } else if (event.companyName || event.companyId) {
            const cName = event.companyName || event.companyId;
            objTagHtml = `<span class="common-chip" style="background-color: #6b7280;">公司</span>`;
            objNameHtml = `<span class="text-truncate" title="${cName}" style="color:var(--text-secondary);">
                            ${cName}
                           </span>`;
        }
        
        const safeEvtName = (event.eventName || '').replace(/"/g, '&quot;');

        html += `
            <tr>
                <td class="col-idx">${index + 1}</td>
                <td class="col-date">${dateStr}</td>
                <td class="col-type">${typeHtml}</td>
                <td class="col-name">
                    <a href="#" class="text-link text-truncate" title="${safeEvtName}" 
                       data-action="view-report" 
                       data-id="${event.eventId}">
                        <strong>${event.eventName || '(未命名)'}</strong>
                    </a>
                </td>
                <td class="col-obj-tag">${objTagHtml}</td>
                <td class="col-obj-name">${objNameHtml}</td>
                <td class="col-user" title="${event.creator}">${event.creator}</td>
                <td class="col-actions">
                    <div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
                        <button class="btn-mini-delete" title="刪除事件" 
                                data-action="delete-event" 
                                data-id="${event.eventId}"
                                data-name="${safeEvtName}">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

/**
 * 輔助：動態渲染事件類型 Tabs (對齊 Reference inline style pattern)
 */
function renderEventTypeTabs(options = []) {
    const tabsContainer = document.getElementById('event-type-tabs');
    if (!tabsContainer) return;
    
    const tabs = [{ value: 'all', label: '全部' }];
    options.forEach(opt => tabs.push({ value: opt.value, label: opt.note || opt.value }));
    
    let html = '';
    tabs.forEach(t => {
        const isActive = _eventFilters.type === t.value;
        const style = isActive 
            ? `background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s; white-space: nowrap;` 
            : `background: transparent; border: none; padding: 8px 16px; font-weight: 500; color: var(--text-muted); border-radius: 6px; box-shadow: none; cursor: pointer; transition: all 0.2s; white-space: nowrap;`;
        
        html += `<button class="tab-btn ${isActive ? 'active' : ''}" data-action="filter-type" data-value="${t.value}" style="${style}">${t.label}</button>`;
    });
    
    tabsContainer.innerHTML = html;
}

/**
 * 輔助：填入篩選選單與建立 Tabs
 */
function _populateEventFilterOptions() {
    const creatorSelect = document.getElementById('event-filter-creator');
    
    // 1. 類型 Tabs (從 System Config)
    renderEventTypeTabs(window.CRM_APP?.systemConfig?.['事件類型'] || []);

    // 2. 建立者 (從資料中提取唯一值)
    if (creatorSelect) {
        creatorSelect.innerHTML = '<option value="all">所有建立者</option>';
        const creators = new Set(_fullEventData.map(e => e.creator).filter(Boolean));
        [...creators].sort().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            creatorSelect.appendChild(opt);
        });
    }
}

/**
 * 輔助：注入 CSS
 */
function _injectEventListStyles() {
    const styleId = 'event-list-table-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 列表容器 */
        .event-list-container { width: 100%; overflow-x: auto; background: var(--card-bg, #fff); min-height: 200px; }
        .event-list-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        
        .event-list-table th { 
            padding: 12px 16px; 
            text-align: left; 
            background: var(--glass-bg); 
            color: var(--text-secondary); 
            font-weight: 600; 
            font-size: 0.9rem; 
            border-bottom: 1px solid var(--border-color); 
            white-space: nowrap; 
        }
        
        .event-list-table td { 
            padding: 12px 16px; /* Aligned with opportunities.js 12px padding */
            border-bottom: 1px solid var(--border-color); 
            vertical-align: middle; 
            font-size: 0.95rem; 
            color: var(--text-main); 
        }
        
        .event-list-table tr:not(.locked):hover { background-color: var(--glass-bg); }
        
        .event-list-table tr.locked { background-color: var(--bg-locked); color: var(--text-locked); }
        .event-list-table tr.locked td { color: var(--text-locked); }

        /* 欄位寬度與樣式 */
        .col-idx { width: 60px; text-align: center !important; color: var(--text-muted); font-weight: 600; }
        .col-date { width: 110px; white-space: nowrap; }
        .col-type { width: 110px; }
        .col-name { min-width: 200px; max-width: 300px; font-weight: 600; }
        .col-obj-tag { width: 90px; text-align: center; }
        .col-obj-name { min-width: 180px; max-width: 250px; }
        .col-user { width: 120px; white-space: nowrap; }
        .col-actions { width: 90px; text-align: center !important; } /* Widened to safely fit two flex buttons */

        /* Tag 標籤樣式 (統一風格) */
        .common-chip { 
            display: inline-block; 
            padding: 3px 10px; 
            border-radius: 4px; 
            font-size: 0.8rem; 
            color: white; 
            white-space: nowrap; 
            font-weight: 500; 
        }
        
        /* 文字處理 */
        .text-truncate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .text-link { color: var(--accent-blue); text-decoration: none; transition: color 0.2s; }
        .text-link:hover { text-decoration: underline; color: var(--primary-color); }

        /* 圖示按鈕樣式 */
        .btn-mini-view {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 6px;
            border-radius: 4px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .btn-mini-view:hover {
            color: var(--accent-blue);
            background: #e0f2fe; 
        }

        /* 刪除按鈕樣式 */
        .btn-mini-delete { 
            background: none; 
            border: none; 
            color: #9ca3af; 
            cursor: pointer; 
            padding: 6px; 
            border-radius: 4px; 
            transition: all 0.2s; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
        }
        .btn-mini-delete:hover { 
            color: #ef4444; 
            background: #fee2e2; 
        }
    `;
    document.head.appendChild(style);
}
</file>

<file path="public/scripts/events/event-modal-manager.js">
// views/scripts/event-modal-manager.js
// 職責：管理所有與「新增/編輯事件」彈出視窗相關的複雜邏輯
// (版本 V5: 類報告式介面 + DOM清理 + 資料防呆)

let eventOppSearchTimeout;
let eventCompanySearchTimeout;

// 用於編輯視窗的人員選擇狀態
let selectedEditOurParticipants = new Set();
let selectedEditClientParticipants = new Set();

// 入口函式
async function showEventLogFormModal(options = {}) {
    // 分流：若無 eventId 則開啟精靈
    if (!options.eventId) {
        if (window.EventWizard) {
            EventWizard.show(options);
        } else {
            console.error("EventWizard module not loaded!");
            showNotification("無法開啟新增精靈，請重新整理頁面。", "error");
        }
        return; 
    }

    if (!document.getElementById('event-log-modal')) {
        console.error('Event log modal HTML not loaded!');
        showNotification('無法開啟事件紀錄視窗，元件遺失。', 'error');
        return;
    }
    
    const form = document.getElementById('event-log-form');
    form.reset();
    
    // 重置人員選擇 Set
    selectedEditOurParticipants.clear();
    selectedEditClientParticipants.clear();
    
    showModal('event-log-modal');

    const title = document.getElementById('event-log-modal-title');
    const submitBtn = document.getElementById('event-log-submit-btn');
    const deleteBtn = document.getElementById('event-log-delete-btn');

    title.textContent = '✏️ 編輯事件紀錄';
    submitBtn.textContent = '💾 儲存變更';

    try {
        const result = await authedFetch(`/api/events/${options.eventId}`);
        if (!result.success) throw new Error('無法載入事件資料');
        const eventData = result.data;
        
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => confirmDeleteEvent(eventData.eventId, eventData.eventName);

        await populateEventLogForm(eventData);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`載入資料失敗: ${error.message}`, 'error');
        closeModal('event-log-modal');
    }
}

// 刪除事件
async function confirmDeleteEvent(eventId, eventName) {
    const safeEventName = eventName || '此事件';
    const message = `您確定要永久刪除事件 "${safeEventName}" 嗎？\n\n此操作無法復原，但系統會留下一筆刪除互動紀錄。`;

    showConfirmDialog(message, async () => {
        showLoading('正在刪除事件...');
        try {
            await authedFetch(`/api/events/${eventId}`, { method: 'DELETE' });
        } catch (error) {
            if (error.message !== 'Unauthorized') console.error('刪除事件失敗:', error);
        } finally {
            hideLoading();
            closeModal('event-log-modal');
            closeModal('event-log-report-modal');
        }
    });
}

// [核心功能] 切換事件類型 (含防呆與合併邏輯)
function selectEventTypeForEdit(newType, cardElement) {
    const currentTypeInput = document.getElementById('event-log-type');
    const currentType = currentTypeInput.value;

    if (currentType === newType) return; // 沒變則不做事

    // 1. 檢查當前【下層容器】是否有填寫專屬資料
    const formContainer = document.getElementById('event-form-container');
    const inputs = formContainer.querySelectorAll('input, textarea, select');
    
    let hasData = false;
    let mergedDataString = '';

    inputs.forEach(input => {
        // 排除 hidden, submit, button
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return;
        // 排除共通欄位 (如果意外殘留的話)
        if (['eventName', 'visitPlace', 'eventNotes', 'ourParticipants', 'clientParticipants'].includes(input.name)) return;

        // 檢查值
        if (input.value && input.value.trim() !== '') {
            hasData = true;
            // 取得欄位名稱 Label (往上找)
            let label = input.name;
            const labelEl = input.closest('.form-group')?.querySelector('.form-label') || input.closest('.form-group')?.querySelector('label');
            if (labelEl) label = labelEl.innerText.replace('*', '').trim();
            
            mergedDataString += `[${label}]: ${input.value}\n`;
        }
    });

    if (hasData) {
        const message = `您即將從 ${currentType} 切換為 ${newType}。\n\n⚠️ 警告：這將移除目前的專屬欄位資料 (如設備規模等)！\n\n系統會自動將舊資料備份到「備註」欄位。\n確定要繼續嗎？`;
        
        showConfirmDialog(message, () => {
            // 使用者確認 -> 執行切換並合併
            _applyTypeSwitch(newType, cardElement, mergedDataString);
        });
    } else {
        // 無資料 -> 直接切換
        _applyTypeSwitch(newType, cardElement, '');
    }
}

// 執行切換動作
function _applyTypeSwitch(newType, cardElement, dataToMerge) {
    // 1. 更新 UI (亮燈)
    document.querySelectorAll('.type-select-card').forEach(el => el.classList.remove('selected'));
    if (cardElement) cardElement.classList.add('selected');
    else {
        const targetCard = document.querySelector(`.type-select-card[data-type="${newType}"]`);
        if(targetCard) targetCard.classList.add('selected');
    }

    // 2. 更新隱藏欄位
    document.getElementById('event-log-type').value = newType;

    // 3. 載入新表單 (傳入 dataToMerge)
    loadEventTypeForm(newType, dataToMerge);
}


// 動態載入表單範本 (含 DOM 清理與備註合併)
async function loadEventTypeForm(eventType, dataToMerge = '') {
    const formContainer = document.getElementById('event-form-container');
    if (!formContainer) return;

    let formName = eventType === 'dx' ? 'general' : eventType;
    
    // 顯示載入中
    formContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';

    let templateHtml = window.CRM_APP.formTemplates[formName];
    if (!templateHtml) {
        try {
            // 【修改】路徑修正：加上 /components/forms/
            const response = await fetch(`/components/forms/event-form-${formName}.html`);
            
            if (!response.ok) throw new Error(`找不到 ${formName} 的表單範本`);
            templateHtml = await response.text();
            window.CRM_APP.formTemplates[formName] = templateHtml; // 快取
        } catch (error) {
            formContainer.innerHTML = `<div class="alert alert-error">無法載入 ${eventType} 表單。</div>`;
            return;
        }
    }
    
    // 渲染 HTML
    formContainer.innerHTML = templateHtml;

    // --- 【關鍵修改：DOM 清理】移除下層重複的共通欄位 ---
    // 因為 eventName, visitPlace, participants 已經移到上層了
    // 我們透過 Name 或 ID 來查找並移除它們的父容器 (.form-group)
    const fieldsToRemove = ['eventName', 'visitPlace', 'ourParticipants', 'clientParticipants', 'clientParticipants-checkbox'];
    
    fieldsToRemove.forEach(name => {
        // 嘗試找 input[name="..."]
        const els = formContainer.querySelectorAll(`[name="${name}"], [id="event-name"], [id="visit-place"]`);
        els.forEach(el => {
            const group = el.closest('.form-group');
            if (group) group.remove();
        });
    });
    
    // 移除可能殘留的 fieldset legend (如果變成空的)
    const fieldsets = formContainer.querySelectorAll('fieldset');
    fieldsets.forEach(fs => {
        // 檢查是否只剩下 legend
        if (fs.children.length <= 1) fs.remove();
        // 或者如果 legend 寫著 "會議共通資訊"，直接移除該 legend 或整塊
        const legend = fs.querySelector('legend');
        if (legend && legend.textContent.includes('會議共通資訊')) {
            // 移除整個 fieldset，因為共通資訊都在上面了 (除非備註還在裡面)
            // 檢查備註是否在裡面
            if (!fs.querySelector('[name="eventNotes"]')) {
                fs.remove();
            } else {
                // 如果備註還在，只移除 legend
                legend.remove();
            }
        }
    });

    // --- 【關鍵修改：資料合併】 ---
    if (dataToMerge) {
        const notesInput = document.getElementById('event-notes'); // 備註欄位 (ID 通常是 event-notes)
        if (notesInput) {
            const existingNotes = notesInput.value;
            const header = `\n\n【系統自動備份 - 原資料】\n`;
            notesInput.value = existingNotes + header + dataToMerge;
        }
    }
}

// 填充表單資料 (編輯模式核心)
async function populateEventLogForm(eventData) {
    // 1. 填入隱藏與基本欄位 (上層與中層)
    document.getElementById('event-log-eventId').value = eventData.eventId;
    document.getElementById('event-log-opportunityId').value = eventData.opportunityId || '';
    document.getElementById('event-log-companyId').value = eventData.companyId || '';
    
    // 這些欄位現在位於上層/中層
    document.getElementById('event-log-name').value = eventData.eventName || '';
    document.getElementById('event-log-location').value = eventData.visitPlace || '';

    // 2. 處理時間 (轉換為 local datetime string)
    if (eventData.createdTime) {
        try {
            const date = new Date(eventData.createdTime);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            document.getElementById('event-log-createdTime').value = date.toISOString().slice(0, 16);
        } catch (e) { console.warn("時間格式錯誤", e); }
    }

    // 3. 設定類型與載入下層表單
    const eventType = eventData.eventType || 'general';
    const typeToSelect = eventType === 'legacy' ? 'iot' : eventType;
    
    document.getElementById('event-log-type').value = typeToSelect;
    // 呼叫切換 (傳入 null 表示不需要合併資料，因為這是初始載入)
    _applyTypeSwitch(typeToSelect, null, null);

    // 4. 處理參與人員 (渲染膠囊)
    const ourList = (eventData.ourParticipants || '').split(',').map(p => p.trim()).filter(Boolean);
    ourList.forEach(p => selectedEditOurParticipants.add(p));
    _renderEditParticipants('our', 'edit-our-participants-container', window.CRM_APP.systemConfig['團隊成員'] || [], selectedEditOurParticipants);

    const clientList = (eventData.clientParticipants || '').split(',').map(p => p.trim()).filter(Boolean);
    await _fetchAndPopulateClientParticipantsForEdit(eventData.opportunityId, eventData.companyId, clientList);

    // 5. 填入下層詳細欄位 (等待表單載入後)
    setTimeout(() => {
        const form = document.getElementById('event-log-form');
        for (const key in eventData) {
            // 跳過已在上層處理過的欄位
            if (['eventId', 'opportunityId', 'companyId', 'eventName', 'visitPlace', 'createdTime', 'ourParticipants', 'clientParticipants', 'eventType'].includes(key)) continue;

            // 尋找對應的輸入框
            const element = form.querySelector(`[name="${key}"], [name="iot_${key}"], [name="dt_${key}"]`);
            if (element) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    const values = String(eventData[key]).split(',').map(s => s.trim());
                    if (values.includes(element.value)) element.checked = true;
                } else {
                    element.value = eventData[key] || '';
                }
            }
        }
    }, 300); // 稍微延遲確保 DOM 載入與清理完畢
}

// 獲取並渲染客戶人員 (編輯用)
async function _fetchAndPopulateClientParticipantsForEdit(opportunityId, companyId, currentList = []) {
    let contacts = [];
    try {
        if (opportunityId) {
            const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
            contacts = result.success ? result.data.linkedContacts : [];
        } else if (companyId) {
            const allCompanies = await authedFetch(`/api/companies`).then(res => res.data || []);
            const company = allCompanies.find(c => c.companyId === companyId);
            if (company) {
                 const result = await authedFetch(`/api/companies/${encodeURIComponent(company.companyName)}/details`);
                 contacts = result.success ? result.data.contacts : [];
            }
        }
    } catch (error) { console.error(error); }

    // 分離手動輸入
    const contactNames = new Set(contacts.map(c => c.name));
    const contactDisplayNames = new Set(contacts.map(c => c.position ? `${c.name} (${c.position})` : c.name));
    
    const manualList = [];
    currentList.forEach(p => {
        if (contactDisplayNames.has(p) || contactNames.has(p)) {
            selectedEditClientParticipants.add(p);
        } else {
            manualList.push(p);
        }
    });

    _renderEditParticipants('client', 'edit-client-participants-container', contacts, selectedEditClientParticipants);
    document.getElementById('edit-manual-participants').value = manualList.join(', ');
}

// 渲染人員膠囊標籤
function _renderEditParticipants(type, containerId, list, selectedSet) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted)">無資料</span>';
        return;
    }

    container.innerHTML = list.map(item => {
        let value, label;
        if (typeof item === 'string') {
            value = label = item;
        } else if (item.note) { // 團隊成員
            value = label = item.note;
        } else { // 聯絡人
            value = item.position ? `${item.name} (${item.position})` : item.name;
            label = value;
        }
        
        const isSelected = selectedSet.has(value);
        return `<span class="participant-pill-tag ${isSelected ? 'selected' : ''}" 
                      onclick="toggleEditParticipant('${type}', '${value}', this)">
                      ${label}
                </span>`;
    }).join('');
}

// 切換人員選取狀態
function toggleEditParticipant(type, value, el) {
    const set = type === 'our' ? selectedEditOurParticipants : selectedEditClientParticipants;
    if (set.has(value)) {
        set.delete(value);
        el.classList.remove('selected');
    } else {
        set.add(value);
        el.classList.add('selected');
    }
}

// 表單提交
async function handleEventFormSubmit(e) {
    e.preventDefault();
    const eventId = document.getElementById('event-log-eventId').value;
    const form = e.target;
    
    showLoading('正在更新...');

    try {
        const formData = new FormData(form);
        const eventData = {};
        
        for (let [key, value] of formData.entries()) {
            if (!eventData[key]) eventData[key] = value;
        }
        
        // 處理人員
        eventData.ourParticipants = Array.from(selectedEditOurParticipants).join(', ');
        const manualClient = document.getElementById('edit-manual-participants').value.trim();
        const clientList = Array.from(selectedEditClientParticipants);
        if (manualClient) clientList.push(...manualClient.split(',').map(s => s.trim()));
        eventData.clientParticipants = clientList.filter(Boolean).join(', ');

        // 處理時間
        if (form.createdTime && form.createdTime.value) {
            eventData.createdTime = new Date(form.createdTime.value).toISOString();
        }

        // 處理 Checkbox (多選)
        const checkboxes = form.querySelectorAll('input[type="checkbox"][name]:checked');
        const multiVal = {};
        checkboxes.forEach(cb => {
            if(!multiVal[cb.name]) multiVal[cb.name] = [];
            multiVal[cb.name].push(cb.value);
        });
        for (let k in multiVal) {
            eventData[k] = multiVal[k].join(', ');
        }
        
        const result = await authedFetch(`/api/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });

        if (result.success) {
            closeModal('event-log-modal');
        } else {
            throw new Error(result.details || '更新失敗');
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`更新失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 綁定
document.addEventListener('submit', function(e) {
    if (e.target.id === 'event-log-form') {
        handleEventFormSubmit(e);
    }
});
</file>

<file path="public/scripts/events/event-report-manager.js">
// public/scripts/events/event-report-manager.js
// 職責：專門負責「查看報告」彈窗的顯示、渲染與匯出功能
// (V6 - 包含智慧職稱關聯、動態標頭色、膠囊顯示)
/**
 * @version 1.0.11
 * @date 2026-04-14
 * @description [Forensics Probe] Changed company name enrichment assignment to conditional block to prevent empty string fallback issues.
 */

// [Forensics Probe] Debug Counter
window._DEBUG_SHOW_EVENT_REPORT_COUNT ||= 0;

/**
 * 顯示單筆事件的詳細報告彈出視窗
 * @param {string} eventId - 要顯示報告的事件 ID
 */
async function showEventLogReport(eventId) {
    // [Forensics Probe] Trace call
    window._DEBUG_SHOW_EVENT_REPORT_COUNT++;
    console.log(`[Forensics] showEventLogReport called (Count: ${window._DEBUG_SHOW_EVENT_REPORT_COUNT})`, { eventId });
    console.trace('[Forensics] showEventLogReport trace');

    let modalContent = document.getElementById('event-log-report-content');
    
    // 確保 Modal 結構存在
    if (!modalContent) {
        const modalContainer = document.getElementById('modal-container');
        try {
            // 【修改】路徑修正：指向 /views/event-log-list.html (保留原始路徑)
            const modalViewsHtml = await fetch('/views/event-log-list.html').then(res => res.text());
            modalContainer.insertAdjacentHTML('beforeend', modalViewsHtml);
            modalContent = document.getElementById('event-log-report-content');
        } catch (error) {
            console.error('載入 event-log-list.html 失敗:', error);
            showNotification('無法開啟報告視窗', 'error');
            return;
        }
    }
    
    modalContent.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入報告中...</p></div>';
    showModal('event-log-report-modal');

    try {
        // 1. 獲取事件本身資料
        const result = await authedFetch(`/api/events/${eventId}`);
        if (!result.success || !result.data) throw new Error(result.error || '找不到該筆紀錄');
        
        const eventData = result.data;

        // 2. 【智慧關聯】嘗試獲取關聯的聯絡人清單以補完職稱
        let contextContacts = [];
        try {
            if (eventData.opportunityId) {
                // 如果關聯機會，抓取該機會的詳細資料 (包含 linkedContacts)
                const oppResult = await authedFetch(`/api/opportunities/${eventData.opportunityId}/details`);
                if (oppResult.success && oppResult.data) {
                    contextContacts = oppResult.data.linkedContacts || [];
                    
                    const oppInfo = oppResult.data.opportunityInfo || {};
                    // [Forensics Probe] 從機會明細 (opportunityInfo) 中提取並補完 eventData 的名稱欄位，確保 UI 能正確顯示
                    eventData.opportunityName = oppInfo.opportunityName || eventData.opportunityName || '';
                    if (oppInfo.customerCompany) {
                        eventData.companyName = oppInfo.customerCompany;
                    }
                }
            } else if (eventData.companyId) { // 如果沒有機會ID但有公司ID，嘗試抓公司聯絡人
                const compResult = await authedFetch(`/api/companies/${eventData.companyId}/details`);
                if (compResult.success && compResult.data) {
                    contextContacts = compResult.data.contacts || [];
                    const companyInfo = compResult.data.companyInfo || {};
                    if (companyInfo.companyName || companyInfo.customerCompany) {
                        eventData.companyName = 
                            companyInfo.companyName || 
                            companyInfo.customerCompany;
                    }
                }
            }
        } catch (e) {
            console.warn("[EventReport] 無法獲取關聯聯絡人或關聯資訊進行比對", e);
            // 失敗不影響報告顯示，只是無法自動補齊名稱或職稱
        }
        
        // 3. 渲染報告 (傳入 contextContacts)
        const reportHTML = renderEventLogReportHTML(eventData, contextContacts);
        modalContent.innerHTML = reportHTML;
        
        // 4. 綁定按鈕事件
        document.getElementById('edit-event-log-btn').onclick = () => {
            closeModal('event-log-report-modal');
            
            // 切換至新的獨立編輯器
            if (window.EventEditorStandalone) {
                EventEditorStandalone.open(eventId); 
            } else {
                console.error("EventEditorStandalone module not loaded");
            }
        };
        document.getElementById('report-delete-event-btn').onclick = () => {
            if (typeof confirmDeleteEvent === 'function') {
                confirmDeleteEvent(eventData.eventId, eventData.eventName);
            } else {
                console.error('confirmDeleteEvent 函式未定義');
            }
        };

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            modalContent.innerHTML = `<div class="alert alert-error">讀取事件報告失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 輔助函式：將人員字串轉換為膠囊 HTML (含智慧職稱補完)
 * @param {string} participantsStr - 原始字串
 * @param {string} typeClass - 樣式類別 ('our-side' 或 'client-side')
 * @param {Array} contextContacts - 用於比對的聯絡人清單
 */
function _renderParticipantsPills(participantsStr, typeClass, contextContacts = []) {
    if (!participantsStr) return '-';

    // 切割：只認逗號
    const names = participantsStr.split(/[,，、;]+/)
        .map(s => s.trim())
        .filter(Boolean);

    if (names.length === 0) return '-';

    return `<div class="participants-wrapper">` + 
           names.map(name => {
               let displayName = name;

               // 【智慧補完邏輯】只針對客戶端人員，且當名字內沒有括號時才嘗試補完
               if (typeClass === 'client-side' && !name.includes('(') && contextContacts.length > 0) {
                   // 嘗試在聯絡人清單中尋找同名的人
                   const matchedContact = contextContacts.find(c => c.name === name);
                   if (matchedContact && matchedContact.position) {
                       displayName = `${name} (${matchedContact.position})`;
                   }
               }

               return `<span class="participant-pill ${typeClass}">${displayName}</span>`;
           }).join('') + 
           `</div>`;
}

/**
 * 渲染事件報告 HTML
 * @param {object} event - 事件物件
 * @param {Array} contextContacts - 關聯聯絡人清單 (用於補完職稱)
 * @returns {string} HTML 字串
 */
function renderEventLogReportHTML(event, contextContacts = []) {
    
    const createItemHTML = (label, contentHTML) => {
        const finalContent = (contentHTML && contentHTML !== '') ? contentHTML : '-';
        return `
            <div class="info-item">
                <div class="info-label">${label}</div>
                <div class="info-value-box">${finalContent}</div>
            </div>`;
    };
    
    const formatTextValue = (value) => {
        if (!value) return '';
        return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    const linkedEntityType = event.opportunityId ? '關聯機會' : '關聯公司';
    const linkedEntityName = event.opportunityId 
        ? (event.opportunityName || '-') 
        : (event.companyName || (event.companyId ? '-' : '未指定'));
        
    // 取得系統設定顏色
    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));
    const typeInfo = eventTypeConfig.get(event.eventType) || { note: (event.eventType || 'unknown').toUpperCase(), color: '#6c757d' };
    
    const eventTypeLabel = typeInfo.note;
    const headerColor = typeInfo.color || '#6c757d';

    const fieldMapping = {
        common: {
            title: "會議共通資訊",
            fields: [
                { key: 'visitPlace', label: '會議地點', type: 'text' },
                { key: 'ourParticipants', label: '我方與會', type: 'pill-our' },
                { key: 'clientParticipants', label: '客戶與會', type: 'pill-client' },
                { key: 'eventContent', label: '會議內容', type: 'text' },
                { key: 'clientQuestions', label: '客戶提問', type: 'text' },
                { key: 'clientIntelligence', label: '客戶情報', type: 'text' },
                { key: 'eventNotes', label: '備註', type: 'text' }
            ]
        },
        iot: {
            title: "IOT 專屬資訊",
            fields: [
                { key: 'iot_deviceScale', label: '設備規模', type: 'text' },
                { key: 'iot_lineFeatures', label: '生產線特徵', type: 'text' },
                { key: 'iot_productionStatus', label: '生產現況', type: 'text' },
                { key: 'iot_iotStatus', label: 'IoT現況', type: 'text' },
                { key: 'iot_painPoints', label: '痛點分類', type: 'text' },
                { key: 'iot_painPointDetails', label: '客戶痛點說明', type: 'text' },
                { key: 'iot_painPointAnalysis', label: '痛點分析與對策', type: 'text' },
                { key: 'iot_systemArchitecture', label: '系統架構', type: 'text' }
            ]
        },
        dt: {
            title: "DT 專屬資訊",
            fields: [
                { key: 'dt_deviceScale', label: '設備規模', type: 'text' },
                { key: 'dt_processingType', label: '加工類型', type: 'text' },
                { key: 'dt_industry', label: '加工產業別', type: 'text' }
            ]
        },
        dx: {
            title: "DX 專屬資訊",
            fields: [] 
        }
    };
    
    let sectionsHTML = '';
    
    // (A) 共通區塊
    const commonSection = fieldMapping.common;
    let commonContent = '';
    commonSection.fields.forEach(field => {
        const rawValue = event[field.key];
        let displayHTML = '';
        
        if (field.type === 'pill-our') {
            displayHTML = _renderParticipantsPills(rawValue, 'our-side'); // 我方不需要補完職稱
        } else if (field.type === 'pill-client') {
            // 【傳入 contextContacts 進行補完】
            displayHTML = _renderParticipantsPills(rawValue, 'client-side', contextContacts);
        } else {
            displayHTML = formatTextValue(rawValue);
        }
        
        if (rawValue || field.type.includes('pill')) {
             commonContent += createItemHTML(field.label, displayHTML);
        }
    });
    if (commonContent) {
        sectionsHTML += `<div class="report-section"><h3 class="section-title">${commonSection.title}</h3>${commonContent}</div>`;
    }

    // (B) 專屬區塊
    const typeKey = event.eventType;
    if (fieldMapping[typeKey]) {
        const typeSection = fieldMapping[typeKey];
        let typeContent = '';
        typeSection.fields.forEach(field => {
            const rawValue = event[field.key] || event[field.key.replace(/^(iot|dt)_/, '')];
            if (rawValue) {
                typeContent += createItemHTML(field.label, formatTextValue(rawValue));
            }
        });
        
        if (typeContent) {
            sectionsHTML += `<div class="report-section"><h3 class="section-title">${typeSection.title}</h3>${typeContent}</div>`;
        }
    }

    return `<div class="report-view">
        <div class="report-header" style="--header-color: ${headerColor};">
             <h2 class="report-title">
                ${event.eventName || '未命名事件'} 
                <span class="card-tag" style="background-color: ${headerColor}; color: white; font-size: 0.8rem; padding: 2px 8px; border-radius: 12px; vertical-align: middle;">${eventTypeLabel}</span>
             </h2>
             <div class="header-meta-info">
                <span><strong>${linkedEntityType}:</strong> ${linkedEntityName}</span>
                <span><strong>建立者:</strong> ${event.creator || 'N/A'}</span>
                <span><strong>時間:</strong> ${formatDateTime(event.createdTime)}</span>
            </div>
        </div>
        
        <div class="report-container">
            ${sectionsHTML || '<div class="alert alert-info">此事件沒有額外的詳細記錄。</div>'}
        </div>
    </div>`;
}

// Ensure global accessibility
window.showEventLogReport = showEventLogReport;
</file>

<file path="public/scripts/events/event-wizard.js">
// public/scripts/events/event-wizard.js
// 職責：管理「新增事件精靈」的完整流程 (Step 1 -> 2 -> 3 -> Create)
// 修改歷程：加入機會自動跳轉、公司防呆、完成後連結至獨立編輯器、新增我方人員手動輸入、Dashboard Stale Integration
/**
 * @version 1.1.2
 * @date 2026-03-17
 * @description [UX Patch] Opted into HTML rendering and persistent display for the create success notification, and corrected the manual dismiss selector to target `.toast`.
 */

const EventWizard = (() => {
    // 狀態儲存
    let state = {
        step: 1,
        targetType: null, // 'opportunity' | 'company'
        targetId: null,
        targetName: '',
        targetCompany: '', // 輔助資訊
        
        // Step 2 Data
        eventType: 'general',
        eventName: '',
        eventTime: '',
        eventLocation: '',
        
        // Step 3 Data
        selectedOurParticipants: new Set(),
        selectedClientParticipants: new Set()
    };

    let searchTimeout;

    // --- 初始化與顯示 ---
    function show(defaults = {}) {
        // 1. 強制重置狀態 (Clean Slate)
        resetState();

        // 2. 根據傳入的預設值設定狀態與起始步驟
        if (defaults.opportunityId) {
            // 情境 A：從機會詳細頁進入
            selectTargetType('opportunity');
            _setTarget({
                id: defaults.opportunityId,
                name: defaults.opportunityName,
                company: defaults.customerCompany
            });
            // 機會直接進入 Step 2 (定義事件)
            setStep(2); 
        } else if (defaults.companyId) {
            // 情境 B：從公司詳細頁進入
            selectTargetType('company');
            _setTarget({
                id: defaults.companyId,
                name: defaults.companyName,
                company: defaults.companyName 
            });
            // 公司停留在 Step 1，以便觸發防呆
            setStep(1);
        } else {
            // 情境 C：一般入口 (儀表板/列表)，停在 Step 1
            setStep(1);
        }
        
        // 設定預設時間為現在
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const timeInput = document.getElementById('wiz-event-time');
        if (timeInput) timeInput.value = now.toISOString().slice(0, 16);

        showModal('new-event-wizard-modal');
    }

    function resetState() {
        state = {
            step: 1,
            targetType: null,
            targetId: null,
            targetName: '',
            targetCompany: '',
            eventType: 'general',
            eventName: '',
            eventTime: '',
            eventLocation: '',
            selectedOurParticipants: new Set(),
            selectedClientParticipants: new Set()
        };

        // 重置 UI
        document.querySelectorAll('.event-entry-card').forEach(el => el.classList.remove('selected'));
        const searchArea = document.getElementById('wiz-target-search-area');
        if(searchArea) searchArea.style.display = 'none';
        
        const searchInput = document.getElementById('wiz-target-search');
        if(searchInput) searchInput.value = '';
        
        const results = document.getElementById('wiz-target-results');
        if(results) results.style.display = 'none';
        
        const nameInput = document.getElementById('wiz-event-name');
        if(nameInput) nameInput.value = '';
        
        const locInput = document.getElementById('wiz-event-location');
        if(locInput) locInput.value = '';
        
        // 重置 Step 2 類型卡片
        document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
        // 預設選中 General
        const generalCard = document.querySelector('.type-card[onclick*="general"]');
        if(generalCard) generalCard.classList.add('selected');
        
        // 重置手動輸入框
        const manualClient = document.getElementById('wiz-manual-participants');
        if(manualClient) manualClient.value = '';

        // 【新增】重置我方手動輸入框
        const manualOur = document.getElementById('wiz-manual-our-participants');
        if(manualOur) manualOur.value = '';
    }

    // --- 步驟控制 ---
    function setStep(step) {
        state.step = step;
        
        // UI 更新：隱藏所有內容，顯示當前步驟
        document.querySelectorAll('.wizard-step-content').forEach(el => el.style.display = 'none');
        const targetContent = document.querySelector(`.wizard-step-content[data-wiz-content="${step}"]`);
        if (targetContent) targetContent.style.display = 'block';

        // 導航條更新
        document.querySelectorAll('.step-item').forEach(el => {
            const s = parseInt(el.dataset.wizStep);
            el.classList.remove('active');
            if (s === step) el.classList.add('active');
        });

        // 按鈕顯示控制
        const prevBtn = document.getElementById('wiz-prev-btn');
        const nextBtn = document.getElementById('wiz-next-btn');
        const createBtn = document.getElementById('wiz-create-btn');

        if (prevBtn && nextBtn && createBtn) {
            if (step === 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'block';
                createBtn.style.display = 'none';
            } else if (step === 2) {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'block';
                createBtn.style.display = 'none';
            } else if (step === 3) {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'none';
                createBtn.style.display = 'block';
                _renderParticipantsStep(); 
            }
        }
    }

    function nextStep() {
        // --- Step 1 驗證與防呆 ---
        if (state.step === 1) {
            if (!state.targetId) {
                showNotification('請先選擇關聯對象', 'warning');
                return;
            }

            // 公司事件防呆機制
            if (state.targetType === 'company') {
                const message = `請確認您是在跟公司互動？\n\n此操作只會紀錄於「公司總覽」，\n(通常用於 SI、代理商或 MTB 的一般拜訪)，\n並「不會」存檔在任何機會案件中。\n\n確定要繼續嗎？`;
                
                showConfirmDialog(message, () => {
                    setStep(2);
                });
                return; // 阻斷，等待確認
            }
        } 
        
        // --- Step 2 驗證 ---
        if (state.step === 2) {
            const nameInput = document.getElementById('wiz-event-name');
            const timeInput = document.getElementById('wiz-event-time');
            const locInput = document.getElementById('wiz-event-location');

            const name = nameInput ? nameInput.value.trim() : '';
            const time = timeInput ? timeInput.value : '';
            
            if (!name || !time) {
                showNotification('事件名稱與發生時間為必填', 'warning');
                return;
            }
            // 暫存 DOM 資料回 State
            state.eventName = name;
            state.eventTime = time;
            state.eventLocation = locInput ? locInput.value.trim() : '';
        }
        
        // 正常跳轉
        setStep(state.step + 1);
    }

    function prevStep() {
        if (state.step > 1) setStep(state.step - 1);
    }

    // --- Step 1: 鎖定對象 ---
    function selectTargetType(type, cardElement) {
        state.targetType = type;
        
        // UI Highlight
        document.querySelectorAll('.event-entry-card').forEach(el => el.classList.remove('selected'));
        if (cardElement) {
            cardElement.classList.add('selected');
        } else {
            // 若是程式呼叫，手手動 highlight
            const index = type === 'opportunity' ? 0 : 1;
            const cards = document.querySelectorAll('.event-entry-card');
            if(cards[index]) cards[index].classList.add('selected');
        }

        // Show search area
        const searchArea = document.getElementById('wiz-target-search-area');
        if(searchArea) searchArea.style.display = 'block';
        
        const searchInput = document.getElementById('wiz-target-search');
        if(searchInput) {
            searchInput.value = '';
            searchInput.placeholder = type === 'opportunity' ? '搜尋機會名稱...' : '搜尋公司名稱...';
            searchInput.focus();
        }
        
        const label = document.getElementById('wiz-search-label');
        if(label) label.textContent = type === 'opportunity' ? '搜尋機會' : '搜尋公司';
        
        // 自動載入預設列表
        searchTargets('');
    }

    function searchTargets(query) {
        const resultsContainer = document.getElementById('wiz-target-results');
        if(!resultsContainer) return;

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading show" style="padding:10px;"><div class="spinner" style="width:20px;height:20px"></div></div>';

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                let apiUrl;
                if (state.targetType === 'opportunity') {
                    apiUrl = `/api/opportunities?q=${encodeURIComponent(query)}&page=0`; 
                } else {
                    apiUrl = `/api/companies`; 
                }

                const result = await authedFetch(apiUrl);
                let items = Array.isArray(result) ? result : (result.data || []);

                if (query) {
                    const lowerQ = query.toLowerCase();
                    if (state.targetType === 'opportunity') {
                        items = items.filter(i => i.opportunityName.toLowerCase().includes(lowerQ));
                    } else {
                        items = items.filter(i => i.companyName.toLowerCase().includes(lowerQ));
                    }
                }
                
                const displayItems = items.slice(0, 5);

                if (displayItems.length === 0) {
                    resultsContainer.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">無符合資料</div>';
                    return;
                }

                resultsContainer.innerHTML = displayItems.map(item => {
                    const data = state.targetType === 'opportunity' 
                        ? { id: item.opportunityId, name: item.opportunityName, company: item.customerCompany }
                        : { id: item.companyId, name: item.companyName, company: item.companyName };
                    
                    const safeJson = JSON.stringify(data).replace(/'/g, "&apos;");
                    
                    let subText = '';
                    if (state.targetType === 'opportunity') {
                        subText = `<small style="color:var(--text-muted)">${data.company}</small>`;
                    }

                    return `
                        <div class="search-result-item" onclick='EventWizard._setTarget(${safeJson})'>
                            <strong>${data.name}</strong>
                            ${subText}
                        </div>
                    `;
                }).join('');

            } catch (e) {
                console.error(e);
                resultsContainer.innerHTML = '<div class="search-result-item">搜尋失敗</div>';
            }
        }, 300);
    }

    function _setTarget(data) {
        state.targetId = data.id;
        state.targetName = data.name;
        state.targetCompany = data.company;

        const input = document.getElementById('wiz-target-search');
        if(input) input.value = data.name;
        
        const results = document.getElementById('wiz-target-results');
        if(results) results.style.display = 'none';
    }
    window.EventWizard_setTarget = _setTarget; 

    // --- Step 2: 定義事件 ---
    function selectEventType(type, cardElement) {
        state.eventType = type;
        document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
        if (cardElement) {
            cardElement.classList.add('selected');
        }
    }

    // --- Step 3: 與會人員 ---
    async function _renderParticipantsStep() {
        // 1. 渲染我方人員
        const myContainer = document.getElementById('wiz-our-participants');
        if (myContainer) {
            const members = window.CRM_APP?.systemConfig?.['團隊成員'] || [];
            
            if (members.length === 0) {
                myContainer.innerHTML = '<span>未設定團隊成員</span>';
            } else {
                myContainer.innerHTML = members.map(m => {
                    const isSelected = state.selectedOurParticipants.has(m.note) ? 'selected' : '';
                    return `<span class="wiz-tag ${isSelected}" onclick="EventWizard.toggleParticipant('our', '${m.note}', this)">${m.note}</span>`;
                }).join('');
            }

            // 【新增】動態注入我方人員手動輸入框 (如果還沒有的話)
            if (!document.getElementById('wiz-manual-our-participants')) {
                const manualInput = document.createElement('input');
                manualInput.type = 'text';
                manualInput.id = 'wiz-manual-our-participants';
                manualInput.className = 'form-input'; // 使用標準樣式
                manualInput.placeholder = '+ 手動輸入 (逗號分隔)';
                manualInput.style.marginTop = '8px';
                manualInput.style.fontSize = '0.9rem';
                // 插入到容器之後
                myContainer.parentNode.insertBefore(manualInput, myContainer.nextSibling);
            }
        }

        // 2. 渲染客戶人員
        const clientContainer = document.getElementById('wiz-client-participants');
        if (clientContainer) {
            clientContainer.innerHTML = '<span>載入中...</span>';

            if (!state.targetCompany) {
                clientContainer.innerHTML = '<span>無法識別公司，請手動輸入</span>';
                return;
            }

            try {
                const encodedName = encodeURIComponent(state.targetCompany);
                const result = await authedFetch(`/api/companies/${encodedName}/details`);
                
                if (result.success && result.data && result.data.contacts) {
                    const contacts = result.data.contacts;
                    if (contacts.length === 0) {
                        clientContainer.innerHTML = '<span>此公司尚無聯絡人資料</span>';
                    } else {
                        clientContainer.innerHTML = contacts.map(c => {
                            const label = `${c.name}`;
                            const isSelected = state.selectedClientParticipants.has(c.name) ? 'selected' : '';
                            return `<span class="wiz-tag ${isSelected}" onclick="EventWizard.toggleParticipant('client', '${c.name}', this)">${label}</span>`;
                        }).join('');
                    }
                } else {
                    clientContainer.innerHTML = '<span>載入失敗</span>';
                }
            } catch (e) {
                console.error(e);
                clientContainer.innerHTML = '<span>載入錯誤</span>';
            }
        }
    }

    function toggleParticipant(type, value, el) {
        const set = type === 'our' ? state.selectedOurParticipants : state.selectedClientParticipants;
        if (set.has(value)) {
            set.delete(value);
            el.classList.remove('selected');
        } else {
            set.add(value);
            el.classList.add('selected');
        }
    }

    // --- 建立 (Create) ---
    async function create() {
        const createBtn = document.getElementById('wiz-create-btn');
        if(createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = '建立中...';
        }

        try {
            // 收集資料
            const manualClientInput = document.getElementById('wiz-manual-participants');
            const manualOurInput = document.getElementById('wiz-manual-our-participants'); // 【新增】

            const payload = {
                eventType: state.eventType,
                eventName: state.eventName,
                createdTime: new Date(state.eventTime).toISOString(),
                visitPlace: state.eventLocation,
                
                opportunityId: state.targetType === 'opportunity' ? state.targetId : '',
                companyId: state.targetType === 'company' ? state.targetId : '',
                
                // 【修改】合併我方人員 (膠囊 + 手動)
                ourParticipants: [
                    ...Array.from(state.selectedOurParticipants),
                    manualOurInput ? manualOurInput.value.trim() : ''
                ].filter(Boolean).join(', '),

                // 合併客戶人員 (膠囊 + 手動)
                clientParticipants: [
                    ...Array.from(state.selectedClientParticipants),
                    manualClientInput ? manualClientInput.value.trim() : ''
                ].filter(Boolean).join(', '),
                
                creator: getCurrentUser()
            };

            const result = await authedFetch('/api/events', { 
                method: 'POST', 
                body: JSON.stringify(payload),
                skipRefresh: true 
            });

            if (result.success) {
                const newEventId = result.eventId || result.id; // [Bugfix] Support both DTO keys
                
                // 1. 關閉 Wizard
                closeModal('new-event-wizard-modal');
                
                // 2. 組合訊息，連結指向新的獨立編輯器
                const messageHtml = `已建立事件紀錄：<strong>${state.eventName}</strong><br>` +
                                    `<a href="#" style="color: var(--accent-blue); text-decoration: underline; font-weight: bold; margin-left: 0; display: inline-block; margin-top: 5px;" ` +
                                    `onclick="EventEditorStandalone.open('${newEventId}'); this.closest('.toast').remove(); return false;">` +
                                    `👉 點此補充詳細內容</a>`;

                // 3. 顯示永久通知 (明確要求支援 HTML 且不會自動關閉)
                showNotification(messageHtml, 'success', 0, { allowHtml: true, persistent: true }); 
                
                // [Phase 8.10 Stale-Refresh Fix] 標記 Dashboard 資料過期
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }

                // 4. 觸發背景資料刷新
                if (window.CRM_APP && window.CRM_APP.refreshCurrentView) {
                     window.CRM_APP.refreshCurrentView('資料同步中...');
                }

            } else {
                throw new Error(result.error || '建立失敗');
            }

        } catch (e) {
            console.error(e);
            showNotification('建立失敗: ' + e.message, 'error');
        } finally {
            if(createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = '✅ 建立並編輯詳情';
            }
        }
    }

    return {
        show,
        setStep,
        nextStep,
        prevStep,
        selectTargetType,
        searchTargets,
        _setTarget,
        selectEventType,
        toggleParticipant,
        create
    };
})();

// 掛載到 window
window.EventWizard = EventWizard;
</file>

<file path="public/scripts/events/events.js">
// File: public/scripts/events/events.js
// views/scripts/events.js (重構後的主控制器)

/**
 * @version 1.0.6
 * @date 2026-03-17
 * @purpose [UI Alignment Patch] Hide empty dashboard container to remove ghost margin-bottom and fix excessive vertical gap.
 */

// 全域變數，用於跨模組共享數據
let eventLogPageData = {
    eventList: [],
    chartData: {} // 保留結構以符合後端合約
};

/**
 * 載入並渲染事件紀錄頁面的主函式
 * 這是此頁面的唯一入口點
 */
async function loadEventLogsPage() {
    const dashboardContainer = document.getElementById('event-log-dashboard-container');
    const listContainer = document.getElementById('event-log-list-container');
    
    // 清除/隱藏儀表板區塊，並顯示列表載入畫面
    if(dashboardContainer) {
        dashboardContainer.innerHTML = '';
        dashboardContainer.style.display = 'none';
    }
    
    if(listContainer) listContainer.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入紀錄中...</p></div>';
    
    try {
        // 一次性獲取所有頁面需要的資料 (維持 API Contract 不變)
        const result = await authedFetch('/api/events/dashboard');
        if (!result.success) throw new Error(result.details || '讀取資料失敗');
        
        // [Phase 8 Fix] Robust Data Normalization
        const rawData = result.data || {};
        
        eventLogPageData = {
            eventList: Array.isArray(rawData) ? rawData : (Array.isArray(rawData.eventList) ? rawData.eventList : []),
            chartData: rawData.chartData || {}
        };

        // 僅渲染列表 (圖表渲染已移除)
        if (typeof renderEventLogList === 'function') {
            renderEventLogList(listContainer, eventLogPageData.eventList);
        } else if (listContainer) {
            listContainer.innerHTML = '<div class="alert alert-error">列表渲染元件遺失</div>';
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('❌ 載入事件紀錄頁面失敗:', error);
            if(listContainer) listContainer.innerHTML = `<div class="alert alert-error">讀取事件列表失敗: ${error.message}</div>`;
        }
    }
}

// ==================== 快捷方式與模組註冊 ====================

// 為了讓系統中其他地方的按鈕（如頁首）可以呼叫，保留全域函式
function showEventLogForCreation() {
    // 呼叫彈窗管理模組的函式
    if (typeof showEventLogFormModal === 'function') {
        showEventLogFormModal();
    } else {
        console.warn('showEventLogFormModal is not defined');
    }
}

// 輔助函式：供其他模組呼叫
function showEventLogModalByOpp(opportunityId, opportunityName) {
    if (typeof showEventLogFormModal === 'function') {
        showEventLogFormModal({ opportunityId, opportunityName });
    } else {
        console.warn('showEventLogFormModal is not defined');
    }
}

// 向主應用程式註冊此模組
if (window.CRM_APP) {
    window.CRM_APP.pageModules.events = loadEventLogsPage;
}
</file>

<file path="public/scripts/interactions.js">
// views/scripts/interactions.js

/**
 * 載入並渲染所有互動紀錄頁面的主函式
 * @param {number} [page=1] - 要載入的頁碼
 * @param {string} [query=''] - 搜尋關鍵字
 */
async function loadAllInteractionsPage(page = 1, query = '') {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    // 步驟 1: 渲染頁面基本骨架
    container.innerHTML = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <h2 class="widget-title">所有互動紀錄</h2>
            </div>
            <div class="search-pagination" style="padding: 0 1.5rem 1rem;">
                <input type="text" class="search-box" id="all-interactions-search" placeholder="搜尋內容、機會名稱、記錄人..." value="${query}">
                <div class="pagination" id="all-interactions-pagination"></div>
            </div>
            <div id="all-interactions-content" class="widget-content">
                <div class="loading show"><div class="spinner"></div><p>載入互動總覽中...</p></div>
            </div>
        </div>
    `;

    // 綁定搜尋事件
    document.getElementById('all-interactions-search').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const newQuery = event.target.value;
            loadAllInteractionsPage(1, newQuery);
        }
    });

    // 步驟 2: 獲取數據並渲染
    try {
        const result = await authedFetch(`/api/interactions/all?page=${page}&q=${encodeURIComponent(query)}`);
        
        document.getElementById('all-interactions-content').innerHTML = renderAllInteractionsTable(result.data || []);
        renderPagination('all-interactions-pagination', result.pagination, 'loadAllInteractionsPage');

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('載入所有互動紀錄失敗:', error);
            document.getElementById('all-interactions-content').innerHTML = `<div class="alert alert-error">載入紀錄失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 【已修改】渲染所有互動紀錄的 *表格* 列表
 * @param {Array<object>} interactions - 互動紀錄資料陣列
 * @returns {string} HTML 表格字串
 */
function renderAllInteractionsTable(interactions) {
    if (!interactions || interactions.length === 0) {
        return '<div class="alert alert-info" style="text-align:center;">找不到符合條件的互動紀錄</div>';
    }

    // --- 替換為表格 Table HTML ---
    let tableHTML = `<table class="data-table">
                        <thead>
                            <tr>
                                <th>互動時間</th>
                                <th>關聯對象</th>
                                <th>事件類型</th>
                                <th>內容摘要</th>
                                <th>記錄人</th>
                            </tr>
                        </thead>
                        <tbody>`;

    interactions.forEach(item => {
        let summaryHTML = item.contentSummary || '';
        // 讓摘要中的報告連結可以點擊
        const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9]+)\)/g; // 修正 Regex
        summaryHTML = summaryHTML.replace(linkRegex, (fullMatch, text, eventId) => {
            const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
        });

        // --- 修正開始：建立可點擊的機會或公司連結 ---
        // (item.opportunityName 已在後端 reader 修正為會包含公司名稱)
        let opportunityLink = item.opportunityName || '未指定'; 
        if (item.opportunityId) {
            // 連結至機會
            opportunityLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${item.opportunityId}' })">
                                   ${item.opportunityName}
                               </a>`;
        } else if (item.companyId && item.opportunityName !== '未指定' && item.opportunityName !== '未知機會' && item.opportunityName !== '未知公司') {
            // 連結至公司 (item.opportunityName 此時是公司名稱)
            const encodedCompanyName = encodeURIComponent(item.opportunityName);
            opportunityLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${encodedCompanyName}' })">
                                   ${item.opportunityName} (公司)
                               </a>`;
        }
        // --- 修正結束 ---

        tableHTML += `
            <tr>
                <td data-label="互動時間">${formatDateTime(item.interactionTime)}</td>
                <td data-label="關聯對象">${opportunityLink}</td>
                <td data-label="事件類型">${item.eventTitle || item.eventType}</td>
                <td data-label="內容摘要" style="white-space: pre-wrap; word-break: break-word;">${summaryHTML}</td>
                <td data-label="記錄人">${item.recorder || '-'}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

// 【修正】向主應用程式註冊此模組的載入函式
if (window.CRM_APP) {
    window.CRM_APP.pageModules.interactions = loadAllInteractionsPage;
}
</file>

<file path="public/views/event-editor.html">
<div id="standalone-event-modal" class="modal" style="display: none; z-index: 2000;">
    <div class="modal-content" style="width: 95%; max-width: 1400px; height: 92vh; max-height: 92vh; padding: 0; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: none;">
        
        <div class="modal-header" style="flex-shrink: 0; background: #ffffff; padding: 16px 32px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: var(--accent-blue); width: 4px; height: 24px; border-radius: 2px;"></div>
                <div>
                    <h2 class="modal-title" id="standalone-modal-title" style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); line-height: 1.2;">編輯事件</h2>
                </div>
            </div>
            <button class="close-btn" id="standalone-close-btn" style="background: transparent; border: none; font-size: 1.8rem; line-height: 1; cursor: pointer; color: var(--text-secondary); transition: transform 0.2s;">&times;</button>
        </div>
        
        <div class="modal-body" style="flex-grow: 1; overflow-y: auto; padding: 24px 40px; background-color: #f8fafc;">
            
            <form id="standalone-event-form">
                <input type="hidden" id="standalone-eventId" name="eventId">
                <input type="hidden" id="standalone-opportunityId" name="opportunityId">
                <input type="hidden" id="standalone-companyId" name="companyId">
                <input type="hidden" id="standalone-type" name="eventType">

                <div id="standalone-event-link-section" style="display: none;"></div>

                <div class="iso-card" style="padding: 16px 24px; margin-bottom: 24px;">
                    <label class="section-label" style="margin-bottom: 10px;">請選擇事件種類</label>
                    <div class="type-select-grid">
                        <div class="type-select-card" data-type="general" onclick="EventEditorStandalone.selectType('general', this)">
                            <div class="type-icon">📝</div>
                            <div class="type-text">一般紀錄</div>
                        </div>
                        <div class="type-select-card" data-type="iot" onclick="EventEditorStandalone.selectType('iot', this)">
                            <div class="type-icon">🏭</div>
                            <div class="type-text">IoT 物聯網</div>
                        </div>
                        <div class="type-select-card" data-type="dt" onclick="EventEditorStandalone.selectType('dt', this)">
                            <div class="type-icon">📊</div>
                            <div class="type-text">DT 數位雙生</div>
                        </div>
                        <div class="type-select-card" data-type="dx" onclick="EventEditorStandalone.selectType('dx', this)">
                            <div class="type-icon">🚀</div>
                            <div class="type-text">DX 開發案件</div>
                        </div>
                    </div>
                </div>

                <div class="iso-card">
                    <div class="form-group" style="margin-bottom: 24px;">
                        <label for="standalone-name" class="iso-label">事件名稱 <span style="color: var(--accent-red)">*</span></label>
                        <input type="text" class="iso-input large-input" id="standalone-name" name="eventName" required placeholder="例如：需求訪談、產品簡報...">
                    </div>

                    <div class="split-layout">
                        <div class="layout-col">
                            <h4 class="col-title">時空資訊</h4>
                            <div class="form-group">
                                <label for="standalone-createdTime" class="iso-label">發生時間</label>
                                <input type="datetime-local" class="iso-input" id="standalone-createdTime" name="createdTime">
                            </div>
                            <div class="form-group">
                                <label for="standalone-location" class="iso-label">地點</label>
                                <input type="text" class="iso-input" id="standalone-location" name="visitPlace" placeholder="輸入地點...">
                            </div>
                        </div>

                        <div class="layout-col">
                            <h4 class="col-title">參與人員</h4>
                            
                            <div class="form-group">
                                <label class="iso-label">我方人員 <span class="hint-text">(點擊選取)</span></label>
                                <div id="standalone-our-participants-container" class="tags-input-container">
                                    <span style="color: var(--text-muted); font-size: 0.9rem;">載入中...</span>
                                </div>
                                <label class="sub-label">手動追加成員</label>
                                <input type="text" class="iso-input" id="standalone-manual-our-participants" placeholder="輸入姓名 (逗號分隔)...">
                            </div>

                            <div class="form-group">
                                <label class="iso-label">客戶人員 <span class="hint-text">(點擊選取)</span></label>
                                <div id="standalone-client-participants-container" class="tags-input-container client-tags">
                                    <span style="color: var(--text-muted); font-size: 0.9rem;">載入中...</span>
                                </div>
                                <label class="sub-label">手動追加成員</label>
                                <input type="text" class="iso-input" id="standalone-manual-participants" placeholder="輸入姓名 (逗號分隔)...">
                            </div>
                        </div>
                    </div>
                </div>

                <div id="workspace-container" class="workspace-grid">
                    
                    <div class="main-column">
                        <div class="iso-card full-height flex-column-card">
                            <h3 class="card-title">詳細內容</h3>
                            
                            <div class="form-group flex-grow-group">
                                <label class="iso-label">會議內容</label>
                                <textarea class="form-textarea flex-grow-input" id="standalone-content" name="eventContent" placeholder="請輸入會議紀錄..."></textarea>
                            </div>

                            <div class="form-group flex-grow-group">
                                <label class="iso-label">客戶提問</label>
                                <textarea class="form-textarea flex-grow-input" id="standalone-questions" name="clientQuestions" placeholder="客戶提出的問題..."></textarea>
                            </div>
                            
                            <div class="form-group flex-grow-group">
                                <label class="iso-label">客戶情報</label>
                                <textarea class="form-textarea flex-grow-input" id="standalone-intelligence" name="clientIntelligence" placeholder="收集到的情報..."></textarea>
                            </div>

                            <div class="form-group flex-grow-group">
                                <label class="iso-label">備註</label>
                                <textarea class="form-textarea flex-grow-input" id="standalone-notes" name="eventNotes" placeholder="其他備註事項..."></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="side-column" id="standalone-specific-wrapper" style="display: none;">
                        <div class="iso-card full-height" id="specific-info-card" style="transition: background-color 0.3s ease, border-color 0.3s ease;">
                            <h3 class="card-title" id="specific-card-title" style="transition: color 0.3s ease; border-bottom-color: inherit;">專屬資訊</h3>
                            <div id="standalone-specific-container" class="dynamic-form-content"></div>
                        </div>
                    </div>

                </div>

            </form>
        </div>

        <div class="modal-footer" style="flex-shrink: 0; background: #ffffff; padding: 16px 32px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="action-btn danger ghost" id="standalone-delete-btn" style="display: none;">🗑️ 刪除事件</button>
            <div style="margin-left: auto; display: flex; gap: 12px;">
                <button type="button" class="action-btn secondary" onclick="EventEditorStandalone.close()" style="min-width: 100px;">取消</button>
                <button type="button" class="action-btn primary" id="standalone-submit-btn" onclick="document.getElementById('standalone-event-form').dispatchEvent(new Event('submit', {cancelable: true}))" style="min-width: 120px; box-shadow: 0 4px 6px rgba(79, 141, 247, 0.2);">儲存</button>
            </div>
        </div>
    </div>

    <style>
        #standalone-event-modal {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --card-radius: 12px;
            --input-radius: 8px;
        }

        /* 卡片容器 */
        .iso-card {
            background: #ffffff; border-radius: var(--card-radius); padding: 24px; margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border: 1px solid rgba(226, 232, 240, 0.8);
            height: 100%;
        }
        
        .flex-column-card { display: flex; flex-direction: column; }
        .flex-grow-group { display: flex; flex-direction: column; flex-grow: 1; margin-bottom: 20px; }
        .flex-grow-group:last-child { margin-bottom: 0; }
        .flex-grow-input { flex-grow: 1; height: 100%; min-height: 120px; overflow: hidden; resize: none; }

        .card-title {
            font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;
            flex-shrink: 0;
        }
        .col-title {
            font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;
        }
        .section-label {
            font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: block;
        }
        .hint-text {
            font-weight: normal; color: var(--text-muted); font-size: 0.8em; margin-left: 6px;
        }
        
        /* 【新增】手動輸入小標題樣式 */
        .sub-label {
            display: block;
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 12px; /* 與上方膠囊區拉開距離 */
            margin-bottom: 6px; /* 與下方輸入框保持適當距離 */
            font-weight: 500;
        }

        /* 排版 */
        .workspace-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .workspace-grid.has-sidebar { grid-template-columns: 6fr 4fr; align-items: stretch; }
        .split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        @media (max-width: 992px) {
            .workspace-grid.has-sidebar { grid-template-columns: 1fr; } 
            .split-layout { grid-template-columns: 1fr; gap: 24px; }
        }

        /* 輸入框 (標準樣式) */
        .iso-input, .form-input, .form-textarea, textarea {
            width: 100%; padding: 10px 14px; border-radius: var(--input-radius);
            border: 1px solid #cbd5e1; background-color: #fff; color: var(--text-primary);
            font-size: 0.95rem; line-height: 1.5; transition: all 0.2s ease;
        }
        .iso-input:focus, .form-input:focus, textarea:focus {
            border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15); outline: none;
        }
        .large-input { font-size: 1.1rem; padding: 12px; font-weight: 500; }
        
        /* 移除 Ghost Input 樣式，改用標準樣式 */
        /* .ghost-input { ... } */

        /* 類型選擇 */
        .type-select-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .type-select-card {
            background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--input-radius);
            padding: 12px; cursor: pointer; transition: all 0.2s ease; text-align: center;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            opacity: 0.7; filter: grayscale(100%);
        }
        .type-select-card:hover { 
            border-color: var(--accent-blue); transform: translateY(-1px); opacity: 1; filter: grayscale(0%);
        }
        .type-select-card.selected {
            background-color: #eff6ff; border-color: var(--accent-blue); box-shadow: 0 0 0 1px var(--accent-blue);
            opacity: 1; filter: grayscale(0%); font-weight: 700;
        }
        .type-icon { font-size: 1.4rem; }
        .type-text { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }

        /* 人員標籤 */
        .tags-input-container {
            min-height: 44px; padding: 6px; border: 1px solid #cbd5e1; border-radius: var(--input-radius);
            background-color: #fff; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
        }
        .participant-pill-tag {
            padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; user-select: none;
            background: #f1f5f9; color: #64748b; transition: all 0.2s ease; border: 1px solid transparent; font-weight: 500;
        }
        .tags-input-container:not(.client-tags) .participant-pill-tag.selected {
            background-color: var(--accent-blue); color: white;
        }
        .client-tags .participant-pill-tag.selected {
            background-color: var(--accent-green); color: white;
        }

        /* Checkbox Group */
        .checkbox-group {
            display: flex; flex-wrap: wrap; gap: 16px; padding: 8px 0;
        }
        .checkbox-group label {
            display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.95rem; color: var(--text-primary);
        }
        .checkbox-group input[type="checkbox"] {
            width: 18px; height: 18px; accent-color: var(--accent-blue); cursor: pointer; margin: 0;
        }

        #standalone-specific-container .form-group { margin-bottom: 16px; }
        #standalone-specific-container textarea { min-height: 80px; overflow: hidden; resize: none; }
        
        .iso-label, .form-label { display: block; margin-bottom: 6px; font-weight: 600; color: var(--text-secondary); font-size: 0.9rem; }
        
        #standalone-event-modal .action-btn { border-radius: 8px; font-weight: 600; }
        #standalone-event-modal .action-btn.ghost { background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 16px; font-size: 0.9rem; }
        #standalone-event-modal .action-btn.ghost:hover { background: var(--accent-red); color: white; }
    </style>
    
    <script src="/scripts/core/theme-toggle.js"></script>
    <script src="/scripts/core/utils.js"></script>
    <script src="/scripts/services/api.js"></script>
    <script src="/scripts/services/ui.js"></script>
    
    <script src="/scripts/events/event-editor-standalone.js"></script>
</div>
</file>

<file path="public/views/event-log-list.html">
<div id="event-log-report-modal" class="modal">
    <div class="modal-content large">
        <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 20px;">
                <h2 class="modal-title">📄 事件紀錄報告</h2>
                <button class="action-btn danger" id="report-delete-event-btn" style="padding: 6px 14px; font-size: 0.9rem; opacity: 0.9;">🗑️ 刪除</button>
            </div>

            <div class="action-buttons">
                <button class="action-btn warn" id="edit-event-log-btn">✏️ 編輯</button>
                <button class="close-btn" onclick="closeModal('event-log-report-modal')">&times;</button>
            </div>
        </div>
        <div id="event-log-report-content" class="report-view">
             </div>
    </div>
</div>

<style>
.modal-content.large {
    max-width: 1200px;
}
.report-view { 
    padding: 10px; 
    background-color: var(--primary-bg);
}

/* --- 1. 標頭區 (動態色 + 不換行按鈕) --- */
.report-header {
    /* 預設背景 */
    --header-color: var(--accent-purple); 
    background: color-mix(in srgb, var(--header-color) 15%, var(--primary-bg));
    border: 1px solid color-mix(in srgb, var(--header-color) 30%, var(--border-color));
    padding: 20px 25px;
    border-radius: 12px;
    margin-bottom: 20px;
    transition: all 0.3s ease;
}

.report-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.report-header .card-tag {
    font-size: 0.9rem;
    padding: 4px 10px;
    border-radius: 20px;
    vertical-align: middle;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-meta-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    color: var(--text-secondary);
    border-top: 1px solid color-mix(in srgb, var(--header-color) 20%, var(--border-color));
    padding-top: 12px;
}

/* 強制按鈕不換行 */
#event-log-report-modal .modal-header .action-buttons {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: nowrap; 
    overflow-x: auto; 
    padding-bottom: 4px; 
}

#event-log-report-modal .modal-header .action-buttons .action-btn {
    white-space: nowrap; 
    flex-shrink: 0; 
}


/* --- 2. 資訊區塊 (垂直卡片佈局 - 統一底色) --- */
.report-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.report-section {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow-sm);
}

.section-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 8px;
}

/* --- 3. 欄位內容 (左標題 + 右模擬輸入框) --- */
.info-item {
    display: grid;
    grid-template-columns: 140px 1fr; 
    gap: 16px;
    padding: 12px 0;
    align-items: start; 
}

.info-label {
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.95rem;
    padding-top: 10px; 
    text-align: right;
}

/* 模擬輸入框樣式 */
.info-value-box {
    background-color: var(--primary-bg);
    border: 1px solid var(--border-color);
    padding: 10px 12px;
    border-radius: 8px;
    min-height: 42px; 
    height: auto; 
    display: flex;
    align-items: center;
    flex-wrap: wrap; 
    gap: 8px;
    color: var(--text-primary);
    font-size: 1rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
}

/* --- 4. 人員膠囊 (Pills) --- */
.participants-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
}

.participant-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    background-color: var(--secondary-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: all 0.2s ease;
}

/* 我方人員膠囊 */
.participant-pill.our-side {
    background-color: color-mix(in srgb, var(--accent-blue) 10%, var(--secondary-bg));
    border-color: color-mix(in srgb, var(--accent-blue) 30%, var(--border-color));
    color: var(--accent-blue);
}
/* 客戶人員膠囊 (淡綠底) */
.participant-pill.client-side {
    background-color: color-mix(in srgb, var(--accent-green) 10%, var(--secondary-bg));
    border-color: color-mix(in srgb, var(--accent-green) 30%, var(--border-color));
    color: var(--accent-green);
}


/* --- PDF 列印優化 --- */
@media print {
    .report-header, .report-section, .info-value-box {
        box-shadow: none;
        border: 1px solid #ccc !important;
        background-color: #fff !important;
        color: #000 !important;
    }
    .participant-pill {
        border: 1px solid #999;
        background: none !important;
        color: #000 !important;
    }
    .modal-header .action-buttons, #report-delete-event-btn {
        display: none !important;
    }
}
</style>
</file>

<file path="routes/event.routes.js">
// routes/event.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/event.controller');

// --- Event Log Routes ---
// ( /api/events/* )

// [Phase 8 Fix] Dashboard route MUST come before :eventId to avoid capture
router.get('/dashboard', controller.getDashboardData);

router.post('/', controller.createEventLog);
router.get('/:eventId', controller.getEventLogById);
router.put('/:eventId', controller.updateEventLog);
router.delete('/:eventId', controller.deleteEventLog);

module.exports = router;
</file>

<file path="routes/interaction.routes.js">
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
</file>

<file path="services/event-log-service.js">
/*
 * FILE: services/event-log-service.js
 * VERSION: 8.4.2-SystemServiceMigration
 * DATE: 2026-03-12
 * CHANGELOG:
 * - Phase 8.4.2: Migrated getSystemConfig from deprecated SystemReader to SystemService.
 * - Phase 8.4.1: Fix Backup logic to use snake_case keys + correct labels.
 * - Phase 8.4: Implemented Type-Change Backup to Notes (Business Logic).
 * - Phase 8.3d: Robust SQL-only write mapping for IoT/DT fields.
 */

class EventLogService {
  /**
   * @param {EventLogReader} eventReader (Deprecated)
   * @param {OpportunityReader} oppReader (Deprecated)
   * @param {CompanyReader} companyReader (Deprecated)
   * @param {SystemService} systemService
   * @param {CalendarService} calendarService
   * @param {EventLogSqlReader} eventLogSqlReader
   * @param {EventLogSqlWriter} eventLogSqlWriter
   */
  constructor(
    eventReader,
    oppReader,
    companyReader,
    systemService,
    calendarService,
    eventLogSqlReader,
    eventLogSqlWriter
  ) {
    // Deprecated (kept only for legacy cache invalidation safety)
    this.eventReader = eventReader;

    this.systemService = systemService; // [Patch 2026-03-12]
    this.calendarService = calendarService;

    // SQL (authoritative for Event Logs)
    this.eventLogSqlReader = eventLogSqlReader;
    this.eventLogSqlWriter = eventLogSqlWriter;
  }

  // -----------------------------
  // Internal helpers
  // -----------------------------

  _invalidateEventCacheSafe() {
    try {
      if (this.eventReader && typeof this.eventReader.invalidateCache === 'function') {
        this.eventReader.invalidateCache('eventLogs');
      } else if (this.eventReader && this.eventReader.cache) {
        this.eventReader.cache = {};
      }
    } catch (e) {
      // do nothing
    }
  }

  _isRowIndexLike(idOrRowIndex) {
    return (
      typeof idOrRowIndex === 'number' ||
      (typeof idOrRowIndex === 'string' && idOrRowIndex.trim() !== '' && !isNaN(Number(idOrRowIndex)))
    );
  }

  _normalizeIsoOrNow(value) {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }

  /**
   * Extract type-specific fields into payload jsonb.
   */
  _extractDynamicPayload(data) {
    const payload = {};

    if (!data || typeof data !== 'object') return payload;

    const SKIP_KEYS = new Set([
      // core/common fields (exist as real columns)
      'eventId', 'id',
      'eventName', 'eventTitle',
      'opportunityId',
      'companyId',
      'creator',
      'createdTime',
      'lastModifiedTime',
      'ourParticipants',
      'clientParticipants',
      'visitPlace',
      'eventContent',
      'clientQuestions',
      'clientIntelligence',
      'eventNotes',
      'editCount',
      'eventType',
      // misc flags
      'syncToCalendar'
    ]);

    for (const [k, v] of Object.entries(data)) {
      if (SKIP_KEYS.has(k)) continue;
      if (v === undefined) continue;
      payload[k] = v;
    }

    return payload;
  }

  /**
   * [Fix Phase 8.3d] Map Specialized Keys to Physical SQL Columns.
   * These columns MUST be written for the SQL Reader to see them in Views.
   */
  _mapSpecializedColumns(data) {
    const sql = {};
    const mapIf = (val, col) => { if (val !== undefined) sql[col] = val; };

    // Device Scale (IoT or DT)
    if (data.iot_deviceScale !== undefined) sql.device_scale = data.iot_deviceScale;
    else if (data.dt_deviceScale !== undefined) sql.device_scale = data.dt_deviceScale;

    // IoT Specific
    mapIf(data.iot_iotStatus, 'iot_status');
    mapIf(data.iot_lineFeatures, 'line_features');
    mapIf(data.iot_productionStatus, 'production_status');
    mapIf(data.iot_systemArchitecture, 'system_architecture');
    mapIf(data.iot_painPoints, 'pain_category'); // Frontend sends checkbox group string here
    mapIf(data.iot_painPointDetails, 'pain_description');
    mapIf(data.iot_painPointAnalysis, 'pain_analysis');

    // DT Specific
    mapIf(data.dt_industry, 'industry');
    mapIf(data.dt_processingType, 'processing_type');

    // Summary / Extra (If supported by schema)
    mapIf(data.winProbability, 'win_probability');
    mapIf(data.expectedQuantity, 'expected_quantity');

    return sql;
  }

  /**
   * Map incoming camelCase to SQL column names for event_logs table.
   */
  _mapToSqlColumnsForUpsert(data, { creator, createdTime, lastModifiedTime, editCount, payload }) {
    // 1. Core Fields
    const sql = {
      // Required identity
      event_id: data.eventId || data.id,

      // Core columns
      event_name: data.eventName || data.eventTitle || null,
      opportunity_id: data.opportunityId || null,
      company_id: data.companyId || null,
      creator: creator || data.creator || null,

      created_time: createdTime,
      last_modified_time: lastModifiedTime,

      our_participants: data.ourParticipants ?? null,
      client_participants: data.clientParticipants ?? null,
      visit_place: data.visitPlace ?? null,

      event_content: data.eventContent ?? null,
      client_questions: data.clientQuestions ?? null,
      client_intelligence: data.clientIntelligence ?? null,
      event_notes: data.eventNotes ?? null,

      edit_count: editCount,
      event_type: data.eventType ?? null,

      payload: payload || {}
    };

    // 2. [Fix] Merge Specialized Columns (Physical Columns)
    const specialized = this._mapSpecializedColumns(data);
    Object.assign(sql, specialized);

    return sql;
  }

  /**
   * [Phase 8.4.1] Generate backup block for type changes.
   * Reads current values using snake_case keys (Real DB columns) with camelCase fallback.
   */
  _generateTypeChangeBackup(existing, oldType) {
    const IOT_FIELDS = [
      { key: 'device_scale', alt: 'deviceScale', label: '設備規模' },
      { key: 'line_features', alt: 'lineFeatures', label: '生產線特徵' },
      { key: 'production_status', alt: 'productionStatus', label: '生產現況' },
      { key: 'iot_status', alt: 'iotStatus', label: 'IoT現況' },
      { key: 'pain_category', alt: 'painCategory', label: '痛點分類' },
      { key: 'pain_description', alt: 'painDescription', label: '客戶痛點說明' },
      { key: 'pain_analysis', alt: 'painAnalysis', label: '痛點分析與對策' },
      { key: 'system_architecture', alt: 'systemArchitecture', label: '系統架構' }
    ];

    const DT_FIELDS = [
      { key: 'device_scale', alt: 'deviceScale', label: '設備規模' },
      { key: 'processing_type', alt: 'processingType', label: '加工類型' },
      { key: 'industry', alt: 'industry', label: '加工產業別' }
    ];

    let targetFields = [];
    if (oldType === 'iot') targetFields = IOT_FIELDS;
    else if (oldType === 'dt') targetFields = DT_FIELDS;
    else return null;

    const lines = [];
    for (const field of targetFields) {
      // Try snake_case first (DB column), then camelCase (Reader DTO)
      const val = existing[field.key] !== undefined ? existing[field.key] : existing[field.alt];
      
      if (val !== undefined && val !== null && val !== '') {
        const valStr = (typeof val === 'string') ? val.trim() : String(val);
        if (valStr) {
           lines.push(`● ${field.label}：${valStr}`);
        }
      }
    }

    if (lines.length === 0) return null;

    const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
    
    // Exact format required
    return `
----------------------------------------
【系統自動備份】 (${timeStr})
原類型：${oldType}

${lines.join('\n')}

----------------------------------------`;
  }

  // -----------------------------
  // Reads (SQL-only)
  // -----------------------------

  async getAllEvents() {
    if (!this.eventLogSqlReader) {
      throw new Error('[Phase 8] EventLogSqlReader not injected (SQL-only required)');
    }
    const events = await this.eventLogSqlReader.getEventLogs();
    return Array.isArray(events) ? events : [];
  }

  async getEventById(eventId) {
    if (!this.eventLogSqlReader) {
      throw new Error('[Phase 8] EventLogSqlReader not injected (SQL-only required)');
    }
    const data = await this.eventLogSqlReader.getEventLogById(eventId);
    return data || null;
  }

  // -----------------------------
  // Writes (SQL-only)
  // -----------------------------

  async createEvent(data, user) {
    if (!this.eventLogSqlWriter) {
      throw new Error('[Phase 8] EventLogSqlWriter not injected (SQL-only required)');
    }

    const creator = user?.displayName || user?.username || user?.name || 'System';

    // Validate or Generate ID
    const eventId = data?.eventId || data?.id || `EVT${Date.now()}`;

    const created = this._normalizeIsoOrNow(data?.createdTime);
    const payload = this._extractDynamicPayload(data);

    const sqlPayload = this._mapToSqlColumnsForUpsert(
      { ...(data || {}), eventId },
      {
        creator,
        createdTime: created,
        lastModifiedTime: created,
        editCount: 1,
        payload
      }
    );

    const result = await this.eventLogSqlWriter.createEventLog(sqlPayload);
    this._invalidateEventCacheSafe();

    // Optional calendar side effect
    if (result?.success && data?.syncToCalendar === 'true') {
      try {
        const startIso = new Date(sqlPayload.created_time).toISOString();
        const endIso = new Date(Date.now() + 3600000).toISOString();

        const calendarEvent = {
          summary: `[${sqlPayload.event_type || 'event'}] ${sqlPayload.event_name || ''}`,
          description: sqlPayload.event_content || '',
          start: { dateTime: startIso },
          end: { dateTime: endIso }
        };

        if (this.calendarService?.createEvent) {
          await this.calendarService.createEvent(calendarEvent);
        }
      } catch (calError) {
        console.warn('[EventLogService] Calendar sync failed:', calError);
      }
    }

    return result;
  }

  async updateEventLog(idOrRowIndex, data, modifier) {
    if (!this.eventLogSqlWriter) {
      throw new Error('[Phase 8] EventLogSqlWriter not injected (SQL-only required)');
    }
    if (!this.eventLogSqlReader) {
      throw new Error('[Phase 8] EventLogSqlReader not injected (SQL-only required)');
    }

    // Phase 7 rule: forbid rowIndex
    if (this._isRowIndexLike(idOrRowIndex)) {
      throw new Error('[Phase 7] RowIndex is strictly prohibited. Use Event ID.');
    }

    const eventId = idOrRowIndex;
    const editor = modifier?.displayName || modifier?.username || modifier?.name || modifier || 'System';

    // Load existing to ensure edit_count increments + payload merge
    const existing = await this.eventLogSqlReader.getEventLogById(eventId);
    if (!existing) {
      return { success: false, message: `Event not found (event_id=${eventId})` };
    }

    // [Phase 8.4] Type Change Logic & Backup
    const oldType = existing.eventType || existing.event_type || 'general';
    const newType = data.eventType || data.event_type || oldType;

    if (oldType !== newType) {
        // Generate Backup Block
        const backupBlock = this._generateTypeChangeBackup(existing, oldType);
        
        if (backupBlock) {
            console.log(`[EventLogService][FORensics] backupGenerated=true oldType=${oldType} newType=${newType}`);

            // Append to existing notes or incoming notes
            // If data.eventNotes is present, user is editing notes. Append backup.
            // If data.eventNotes is undefined, preserve existing notes + backup.
            const baseNotes = data.eventNotes !== undefined ? data.eventNotes : (existing.eventNotes || '');
            const separator = baseNotes ? '\n' : '';
            
            // Mutate data.eventNotes so _mapToSqlColumnsForUpsert picks it up
            data.eventNotes = baseNotes + separator + backupBlock;
        }
    }

    const lastModified = new Date(); 
    const nextEditCount = Number(existing.editCount ?? existing.edit_count ?? 0) + 1;

    // Merge payload
    const existingPayload = existing.payload && typeof existing.payload === 'object' ? existing.payload : {};
    const incomingDynamic = this._extractDynamicPayload(data);
    const mergedPayload = { ...existingPayload, ...incomingDynamic, lastEditor: editor };

    // Build update payload
    // 1. Map Core Fields
    const updateSql = {
      ...(data?.eventName !== undefined || data?.eventTitle !== undefined
        ? { event_name: data.eventName ?? data.eventTitle ?? null }
        : {}),

      ...(data?.opportunityId !== undefined ? { opportunity_id: data.opportunityId } : {}),
      ...(data?.companyId !== undefined ? { company_id: data.companyId } : {}),
      ...(data?.eventType !== undefined ? { event_type: data.eventType } : {}),

      ...(data?.ourParticipants !== undefined ? { our_participants: data.ourParticipants } : {}),
      ...(data?.clientParticipants !== undefined ? { client_participants: data.clientParticipants } : {}),
      ...(data?.visitPlace !== undefined ? { visit_place: data.visitPlace } : {}),

      ...(data?.eventContent !== undefined ? { event_content: data.eventContent } : {}),
      ...(data?.clientQuestions !== undefined ? { client_questions: data.clientQuestions } : {}),
      ...(data?.clientIntelligence !== undefined ? { client_intelligence: data.clientIntelligence } : {}),
      ...(data?.eventNotes !== undefined ? { event_notes: data.eventNotes } : {}),

      // ALWAYS bump these
      last_modified_time: lastModified,
      edit_count: nextEditCount,

      // payload merge
      payload: mergedPayload
    };

    // 2. [Fix] Map Specialized Columns (Physical Columns)
    const specializedSql = this._mapSpecializedColumns(data);
    Object.assign(updateSql, specializedSql);

    // [Forensics] Debug Log
    if (process.env.DEBUG_EVENTLOG_WRITE === '1') {
        console.log(`[EventLogService] Final SQL Update Payload for ${eventId}:`, Object.keys(updateSql));
        if (specializedSql.device_scale || specializedSql.iot_status) {
             console.log(' -> Including Specialized Cols:', specializedSql);
        }
    }

    const result = await this.eventLogSqlWriter.updateEventLog(eventId, updateSql);
    this._invalidateEventCacheSafe();

    return result;
  }

  async deleteEventLog(eventId, user) {
    if (!this.eventLogSqlWriter) {
      throw new Error('[Phase 8] EventLogSqlWriter not injected (SQL-only required)');
    }
    const modifier = user?.displayName || user?.username || user?.name || user || 'System';
    const result = await this.eventLogSqlWriter.deleteEventLog(eventId, modifier);
    this._invalidateEventCacheSafe();
    return result;
  }

  async getEventTypes() {
    try {
      // [Patch 2026-03-12] Migrated to SystemService
      const config = await this.systemService.getSystemConfig();
      return config['事件類型'] || [];
    } catch (error) {
      console.error('[EventLogService] getEventTypes Error:', error);
      return [];
    }
  }
}

module.exports = EventLogService;
</file>

<file path="services/event-service.js">
/**
 * services/event-service.js
 * 會議排程與同步服務
 * * @version 1.0.1 (Phase A - Final Dependency Fix)
 * @date 2026-01-22
 * @description 專責處理 Google Calendar 排程，並同步寫入 Interaction 與 Weekly Business。
 * [Fix] 改為依賴 Service 層，不再直接呼叫 Writer。
 */

class EventService {
    /**
     * @param {CalendarService} calendarService
     * @param {InteractionService} interactionService
     * @param {WeeklyBusinessService} weeklyBusinessService
     * @param {OpportunityService} opportunityService
     * @param {Object} config - 系統設定
     * @param {Object} dateHelpers - 日期輔助工具
     */
    constructor(calendarService, interactionService, weeklyBusinessService, opportunityService, config, dateHelpers) {
        this.calendarService = calendarService;
        this.interactionService = interactionService;
        this.weeklyBusinessService = weeklyBusinessService;
        this.opportunityService = opportunityService;
        this.config = config;
        this.dateHelpers = dateHelpers;
    }

    /**
     * 建立日曆事件並執行多方同步
     * @param {Object} eventData - 來自 req.body 的資料
     * @param {Object} user - 來自 req.user 的使用者物件
     */
    async createCalendarEventAndSync(eventData, user) {
        const { 
            title, startTime, duration, location, description, 
            opportunityId, participants, createInteraction, showTimeInTitle
        } = eventData;

        // 1. 獲取機會詳細資料 (保留原始 try-catch 與 fallback 邏輯)
        let opportunityInfo = null;
        let category = 'DT'; 
        let customerName = '客戶'; // Fallback A: 預設值

        if (opportunityId) {
            try {
                const oppResult = await this.opportunityService.getOpportunityDetails(opportunityId);
                opportunityInfo = oppResult.opportunityInfo;
                
                // 保留原始分類邏輯 (字串包含)
                const type = (opportunityInfo.opportunityType || '').toLowerCase();
                if (type.includes('iot') || type.includes('智慧') || type.includes('連網')) {
                    category = 'IoT';
                } else {
                    category = 'DT';
                }
                
                // Fallback B: 若欄位為空則顯示 '未知客戶'
                customerName = opportunityInfo.customerCompany || '未知客戶';
            } catch (e) {
                console.warn('無法獲取機會詳細資料，將使用預設值:', e.message);
                // 發生錯誤時 customerName 維持 '客戶'
            }
        }

        // 2. 準備資料 payload (保留原始時區設定)
        const start = new Date(startTime);
        
        // 格式化時間 HH:MM (zh-TW, config.TIMEZONE)
        const timeString = start.toLocaleTimeString('zh-TW', { 
            timeZone: this.config.TIMEZONE, 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        // 格式化日期 YYYY-MM-DD (en-CA, config.TIMEZONE)
        const dateString = start.toLocaleDateString('en-CA', { 
            timeZone: this.config.TIMEZONE 
        });

        // 組合 Google Calendar 標題 (保留 showTimeInTitle 邏輯)
        let calendarTitle = title;
        if (showTimeInTitle) {
             calendarTitle = `${title} (${timeString})`;
        }
        
        const companyNote = `關聯公司: ${customerName}`;

        // 組合 Google Calendar 描述 (保留原始 Template)
        const fullDescription = `
【會議詳情】
時間: ${dateString} ${timeString}
地點: ${location || '未指定'}
參與: ${participants || '無'}

【備註內容】
${description || '無'}

【關聯資訊】
${companyNote}
        `.trim();

        // 準備三個寫入動作的 Promise (保留原始架構)
        const actions = [];

        // Action A: 寫入 Google Calendar (保留強制 isAllDay: true)
        actions.push(this.calendarService.createCalendarEvent({
            title: calendarTitle,
            description: fullDescription,
            location: location,
            startTime: startTime, 
            isAllDay: true 
        }));

        const userName = user.name || user.displayName || 'System';

        // Action B: 寫入互動紀錄 (如果勾選)
        if (createInteraction && opportunityId) {
            const interactionData = {
                opportunityId: opportunityId,
                interactionTime: startTime, 
                eventType: '會議討論',
                eventTitle: title, 
                contentSummary: `[參與人員]: ${participants || '無'}\n[地點]: ${location || '無'}\n\n${description || ''}\n(${companyNote})`,
                recorder: userName,
                participants: participants
            };
            // [Fix] 改為呼叫 Service
            actions.push(this.interactionService.createInteraction(interactionData, user));
        }

        // Action C: 寫入週間業務 (如果勾選)
        if (createInteraction && opportunityId) {
            // 使用 dateHelpers 計算 WeekID
            const weekId = this.dateHelpers.getWeekId(start);
            
            const weeklyData = {
                date: dateString, // 使用修正時區後的日期
                weekId: weekId, 
                category: category, 
                topic: title, 
                participants: participants,
                summary: `${description || '(預排行程)'}\n\n(${companyNote})`, 
                actionItems: '',
                creator: userName,
                userId: user.userId 
            };
            
            // [Fix] 改為呼叫 Service
            actions.push(this.weeklyBusinessService.createWeeklyBusinessEntry(weeklyData));
        }

        // 3. 並行執行所有寫入 (保留 Promise.allSettled 策略)
        const results = await Promise.allSettled(actions);
        
        // 檢查 Calendar 結果 (Calendar 成功才算 API 成功)
        const calendarResult = results[0].status === 'fulfilled' ? results[0].value : null;
        const calendarError = results[0].status === 'rejected' ? results[0].reason : null;

        if (calendarResult && calendarResult.success) {
            return calendarResult;
        } else {
            throw calendarError || new Error('建立 Google Calendar 事件失敗');
        }
    }
    
    /**
     * 獲取本週事件 (透傳 CalendarService)
     */
    async getThisWeekEvents() {
        return await this.calendarService.getThisWeekEvents();
    }
}

module.exports = EventService;
</file>

<file path="services/interaction-service.js">
/*
 * FILE: services/interaction-service.js
 * VERSION: 8.2.2
 * DATE: 2026-03-19
 * CHANGELOG:
 * - [CLEANUP] Removed temporary debug logs used for runtime forensics
 * - [PATCH] Enforced recorder write authority: override recorder with user.name (displayName) from JWT. No longer trusts frontend payload.
 * - Phase 8.2 Patch: Replaced InteractionReader with InteractionSqlReader completely. Removed Sheet fallback.
 * - Phase 7: Migrate Interaction Write Authority to SQL
 */

class InteractionService {
    /**
     * @param {InteractionSqlReader} interactionSqlReader 
     * @param {InteractionSqlWriter} interactionSqlWriter 
     * @param {OpportunityReader} opportunityReader 
     * @param {CompanyReader} companyReader 
     */
    constructor(interactionSqlReader, interactionSqlWriter, opportunityReader, companyReader) {
        this.interactionSqlReader = interactionSqlReader;
        this.interactionSqlWriter = interactionSqlWriter;
        this.opportunityReader = opportunityReader;
        this.companyReader = companyReader;
    }

    /**
     * 內部私有方法：取得互動紀錄原始資料
     * 策略：SQL Only (Phase 8.2)
     * @returns {Promise<Array>} 原始互動紀錄陣列
     */
    async _fetchInteractions() {
        if (!this.interactionSqlReader) {
            throw new Error('[InteractionService] InteractionSqlReader not configured.');
        }
        
        try {
            const rows = await this.interactionSqlReader.getInteractions();
            return rows || [];
        } catch (error) {
            console.error('[InteractionService] SQL Read Failed:', error);
            return [];
        }
    }

    /**
     * 搜尋互動紀錄 (包含 Join, Filter, Sort, Pagination)
     * [Standard A] Logic moved from Reader to Service
     * @param {string} query 
     * @param {number} page 
     * @param {boolean} fetchAll 
     */
    async searchInteractions(query, page = 1, fetchAll = false) {
        try {
            // 1. Raw Fetch (Strict SQL)
            const [interactions, opportunities, companies] = await Promise.all([
                this._fetchInteractions(), 
                this.opportunityReader.getOpportunities(), // Raw
                this.companyReader.getCompanyList() // Raw
            ]);

            // 2. Prepare Maps for Join
            const oppMap = new Map(opportunities.map(o => [o.opportunityId, o.opportunityName]));
            const compMap = new Map(companies.map(c => [c.companyId, c.companyName]));

            // 3. Clone & Join Logic (Preserving exact logic from old Reader)
            let results = interactions.map(item => {
                const newItem = { ...item }; // Clone to prevent cache pollution
                
                let contextName = '未指定'; 

                if (newItem.opportunityId && oppMap.has(newItem.opportunityId)) {
                    contextName = oppMap.get(newItem.opportunityId); 
                } else if (newItem.companyId && compMap.has(newItem.companyId)) {
                    contextName = compMap.get(newItem.companyId); 
                } else if (newItem.opportunityId) {
                    contextName = '未知機會'; 
                } else if (newItem.companyId) {
                    contextName = '未知公司'; 
                }

                newItem.opportunityName = contextName;
                return newItem;
            });

            // 4. Filter (Query)
            if (query) {
                const searchTerm = query.toLowerCase();
                results = results.filter(i =>
                    (i.contentSummary && i.contentSummary.toLowerCase().includes(searchTerm)) ||
                    (i.eventTitle && i.eventTitle.toLowerCase().includes(searchTerm)) ||
                    (i.opportunityName && i.opportunityName.toLowerCase().includes(searchTerm)) ||
                    (i.recorder && i.recorder.toLowerCase().includes(searchTerm))
                );
            }

            // 5. Sort (Time Descending - Logic from old Reader)
            results.sort((a, b) => {
                const dateA = new Date(a.interactionTime);
                const dateB = new Date(b.interactionTime);
                if (isNaN(dateB)) return -1;
                if (isNaN(dateA)) return 1;
                return dateB - dateA;
            });

            // 6. Pagination
            const pageSize = 20; // Default fallback since config from InteractionReader is removed

            if (fetchAll) {
                return {
                    data: results,
                    pagination: {
                        current: 1,
                        total: 1,
                        totalItems: results.length,
                        hasNext: false,
                        hasPrev: false
                    }
                };
            }

            const startIndex = (page - 1) * pageSize;
            const paginatedData = results.slice(startIndex, startIndex + pageSize);
            
            return {
                data: paginatedData,
                pagination: { 
                    current: page, 
                    total: Math.ceil(results.length / pageSize), 
                    totalItems: results.length, 
                    hasNext: (startIndex + pageSize) < results.length, 
                    hasPrev: page > 1 
                }
            };

        } catch (error) {
            console.error('[InteractionService] searchInteractions Error:', error);
            throw error;
        }
    }

    /**
     * 取得特定機會的互動紀錄
     * @param {string} opportunityId 
     */
    async getInteractionsByOpportunity(opportunityId) {
        try {
            // [Standard A] Use internal search (fetchAll=true) to get joined data, then filter
            const result = await this.searchInteractions('', 1, true); 
            // Return Array as expected by Controller
            return result.data.filter(log => log.opportunityId === opportunityId);
        } catch (error) {
            console.error('[InteractionService] getInteractionsByOpportunity Error:', error);
            return [];
        }
    }

    /**
     * 取得特定公司的互動紀錄
     * @param {string} companyId 
     */
    async getInteractionsByCompany(companyId) {
        try {
            const result = await this.searchInteractions('', 1, true);
            return result.data.filter(log => log.companyId === companyId);
        } catch (error) {
            console.error('[InteractionService] getInteractionsByCompany Error:', error);
            return [];
        }
    }

    /**
     * 新增互動紀錄
     * Phase 7: Direct to SQL
     * @param {Object} data 
     * @param {Object} user 
     */
    async createInteraction(data, user) {
        try {
            const safeUser = user || {};
            
            const finalRecorder = safeUser.name || safeUser.displayName || data.recorder || 'System';
            const secureData = { ...data, recorder: finalRecorder };

            const newId = await this.interactionSqlWriter.createInteraction(secureData, safeUser);
            
            return { success: true, id: newId };
        } catch (error) {
            console.error('[InteractionService] createInteraction Error:', error);
            throw error;
        }
    }

    /**
     * 更新互動紀錄
     * Phase 7: Direct to SQL
     * @param {string} id 
     * @param {Object} data 
     * @param {Object} user 
     */
    async updateInteraction(id, data, user) {
        try {
            const safeUser = user || {};
            await this.interactionSqlWriter.updateInteraction(id, data, safeUser);
            
            return { success: true };
        } catch (error) {
            console.error('[InteractionService] updateInteraction Error:', error);
            throw error;
        }
    }

    /**
     * 刪除互動紀錄
     * Phase 7: Direct to SQL
     * @param {string} id 
     * @param {Object} user 
     */
    async deleteInteraction(id, user) {
        try {
            const safeUser = user || {};
            await this.interactionSqlWriter.deleteInteraction(id, safeUser);
            
            return { success: true };
        } catch (error) {
            console.error('[InteractionService] deleteInteraction Error:', error);
            throw error;
        }
    }
}

module.exports = InteractionService;
</file>

</files>
