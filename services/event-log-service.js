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