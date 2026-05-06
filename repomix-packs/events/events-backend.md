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
- Only files matching these patterns are included: routes/event.routes.js, controllers/event.controller.js, services/event-service.js, services/event-log-service.js, data/event-log-*.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/event.controller.js
data/event-log-reader.js
data/event-log-sql-reader.js
data/event-log-sql-writer.js
data/event-log-writer.js
routes/event.routes.js
services/event-log-service.js
services/event-service.js
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

</files>
