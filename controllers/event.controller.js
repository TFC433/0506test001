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
const { buildChangedFieldsDiff, extractRequestMetadata } = require('../utils/audit-helpers');

// 輔助函式：從 req.app 獲取服務
const getServices = (req) => req.app.get('services');

const EVENT_LOG_FIELD_LABELS = {
  eventName: '事件名稱',
  name: '事件名稱',
  eventType: '事件類型',
  visitPlace: '拜訪地點',
  content: '內容',
  eventContent: '內容',
  notes: '備註',
  eventNotes: '備註',
  todoItems: '待辦事項',
  participants: '參與人員',
  ourParticipants: '我方參與人員',
  clientParticipants: '客戶參與人員',
  opportunityId: '關聯機會',
  companyId: '關聯公司',
  eventDate: '事件日期',
  startTime: '開始時間',
  endTime: '結束時間',
  status: '狀態'
};

const EVENT_LOG_REDACTED_VALUE = '[REDACTED]';

function buildEventAuditContext(req) {
  const services = getServices(req) || {};
  const user = req.user || {};
  const requestMetadata = extractRequestMetadata(req);

  return {
    auditLoggerService: services.auditLoggerService || null,
    actor: {
      username: user.username || user.name || 'unknown',
      name: user.displayName || user.name || user.username || 'System',
      role: user.role || null,
      sessionId: user.session_id || null
    },
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent
  };
}

function getEventAuditLabel(eventData = {}) {
  return eventData.eventName || eventData.eventTitle || eventData.name || eventData.title || '未命名事件報告';
}

function isLongOrSensitiveEventField(key) {
  const normalized = String(key || '').toLowerCase();
  return normalized.includes('content') ||
    normalized.includes('notes') ||
    normalized.includes('todoitems') ||
    normalized.includes('todo_items') ||
    normalized.includes('participant') ||
    normalized.includes('detail') ||
    normalized.includes('spec') ||
    normalized.includes('attachment') ||
    normalized.includes('link') ||
    normalized.includes('drive') ||
    normalized.includes('calendar');
}

function sanitizeEventLogAuditData(data = {}) {
  return Object.keys(data || {}).reduce((sanitized, key) => {
    sanitized[key] = isLongOrSensitiveEventField(key) ? EVENT_LOG_REDACTED_VALUE : data[key];
    return sanitized;
  }, {});
}

function getChangedFieldLabels(fields) {
  return fields.map(field => EVENT_LOG_FIELD_LABELS[field] || field);
}

function buildEventLogAuditMetadata(eventData = {}, changedFields = [], detectedEvent) {
  return {
    changed_fields: changedFields,
    changed_field_labels: getChangedFieldLabels(changedFields),
    source: 'event_logs',
    audit_version: 'v1',
    related_opportunity_id: eventData.opportunityId || eventData.opportunity_id || null,
    related_company_id: eventData.companyId || eventData.company_id || null,
    event_type: eventData.eventType || eventData.event_type || null,
    event_status: eventData.status || eventData.eventStatus || eventData.event_status || null,
    detected_events: [detectedEvent]
  };
}

async function logEventLogAudit(req, event) {
  const auditContext = buildEventAuditContext(req);
  const auditLoggerService = auditContext.auditLoggerService;
  if (!auditLoggerService || typeof auditLoggerService.logMutation !== 'function') return;

  try {
    await auditLoggerService.logMutation({
      actor_username: auditContext.actor.username,
      actor_name: auditContext.actor.name,
      actor_role: auditContext.actor.role,
      session_id: auditContext.actor.sessionId,
      module: 'event_logs',
      action: event.action,
      target_type: 'event_log',
      target_id: event.targetId,
      target_label: event.targetLabel || null,
      event_title: event.eventTitle,
      event_summary: event.eventSummary,
      event_category: event.eventCategory,
      business_event_type: event.businessEventType,
      changes: event.changes || {},
      metadata: event.metadata || {},
      ip_address: auditContext.ipAddress || null,
      user_agent: auditContext.userAgent || null
    });
  } catch (auditError) {
    console.warn('[EventController] System Audit Log Error:', auditError.message);
  }
}

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
            const summary = `已建立事件報告: "${eventName}" [event_ref](event_log_id=${eventId})`;

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

      if (eventId) {
        const afterData = { ...(req.body || {}), eventId };
        const changes = buildChangedFieldsDiff({}, sanitizeEventLogAuditData(afterData));
        const changedFields = Object.keys(changes);
        const eventName = getEventAuditLabel(afterData);
        const auditContext = buildEventAuditContext(req);

        await logEventLogAudit(req, {
          action: 'create',
          targetId: eventId,
          targetLabel: eventName,
          eventTitle: '建立事件報告',
          eventSummary: `${auditContext.actor.name} 建立事件報告「${eventName}」`,
          eventCategory: 'business_event',
          businessEventType: 'event_log_created',
          changes,
          metadata: buildEventLogAuditMetadata(afterData, changedFields, 'created')
        });
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

    if (result && result.success && existingEvent) {
      const afterData = { ...existingEvent, ...(req.body || {}), eventId: req.params.eventId };
      const changes = buildChangedFieldsDiff(
        sanitizeEventLogAuditData(existingEvent),
        sanitizeEventLogAuditData(afterData)
      );
      const changedFields = Object.keys(changes);
      const eventName = getEventAuditLabel(afterData);
      const auditContext = buildEventAuditContext(req);

      await logEventLogAudit(req, {
        action: 'update',
        targetId: req.params.eventId,
        targetLabel: eventName,
        eventTitle: '編輯事件報告',
        eventSummary: `${auditContext.actor.name} 編輯事件報告「${eventName}」`,
        eventCategory: 'business_event',
        businessEventType: 'event_log_updated',
        changes,
        metadata: buildEventLogAuditMetadata(afterData, changedFields, 'updated')
      });
    }

    res.json(result);
  } catch (error) {
    handleApiError(res, error, 'Update Event Log');
  }
};

// POST /api/events/:eventId/void
exports.voidEventLog = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const interactionId = req.body && req.body.interactionId;
    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }
    if (!interactionId) {
      return res.status(400).json({ success: false, error: 'interactionId is required' });
    }

    const services = getServices(req);
    const existingEvent = await services.eventLogService.getEventById(eventId);
    const result = await services.eventLogService.voidEventLog(eventId, {
      interactionId,
      voidReason: req.body ? req.body.voidReason : null,
      user: req.user || {},
      interactionService: services.interactionService
    });

    if (result && result.success && existingEvent) {
      const afterData = {
        ...existingEvent,
        eventId,
        status: 'voided',
        voidReason: req.body ? req.body.voidReason : null
      };
      const changes = buildChangedFieldsDiff(
        sanitizeEventLogAuditData(existingEvent),
        sanitizeEventLogAuditData(afterData)
      );
      const changedFields = Object.keys(changes);
      const eventName = getEventAuditLabel(existingEvent);
      const auditContext = buildEventAuditContext(req);

      await logEventLogAudit(req, {
        action: 'void',
        targetId: eventId,
        targetLabel: eventName,
        eventTitle: '作廢事件報告',
        eventSummary: `${auditContext.actor.name} 作廢事件報告「${eventName}」`,
        eventCategory: 'delete',
        businessEventType: 'event_log_voided',
        changes,
        metadata: buildEventLogAuditMetadata(afterData, changedFields, 'voided')
      });
    }

    res.json(result);
  } catch (error) {
    handleApiError(res, error, 'Void Event Log');
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

    if (result && result.success && existingEvent) {
      const eventId = req.params.eventId;
      const eventName = getEventAuditLabel(existingEvent);
      const auditContext = buildEventAuditContext(req);
      const changes = {
        deleted: {
          before: false,
          after: true
        }
      };
      const changedFields = Object.keys(changes);

      await logEventLogAudit(req, {
        action: 'delete',
        targetId: eventId,
        targetLabel: eventName,
        eventTitle: '刪除事件報告',
        eventSummary: `${auditContext.actor.name} 刪除事件報告「${eventName}」`,
        eventCategory: 'delete',
        businessEventType: 'event_log_deleted',
        changes,
        metadata: buildEventLogAuditMetadata(existingEvent, changedFields, 'deleted')
      });
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
