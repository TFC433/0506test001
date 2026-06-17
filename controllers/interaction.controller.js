/*
 * FILE: controllers/interaction.controller.js
 * VERSION: 6.0.2
 * DATE: 2026-03-19
 * CHANGELOG:
 * - [CLEANUP] Removed temporary debug logs used for runtime forensics
 * - [Fix] Query Params Compatibility
 */

const { handleApiError } = require('../middleware/error.middleware');
const { buildChangedFieldsDiff, extractRequestMetadata } = require('../utils/audit-helpers');

const INTERACTION_FIELD_LABELS = {
    content: '內容',
    contentSummary: '摘要',
    description: '描述',
    notes: '備註',
    comment: '備註',
    comments: '備註',
    message: '訊息',
    details: '詳細內容',
    eventType: '事件類型',
    interactionType: '互動類型',
    type: '類型',
    companyId: '關聯公司',
    opportunityId: '關聯機會',
    contactId: '關聯聯絡人',
    eventDate: '日期',
    interactionTime: '互動時間',
    createdAt: '建立時間',
    updatedAt: '更新時間',
    title: '標題',
    eventTitle: '標題',
    summary: '摘要'
};

const INTERACTION_REDACTED_VALUE = '[REDACTED]';
const MAX_SHORT_AUDIT_TEXT_LENGTH = 120;

function getServices(req) {
    return req && req.app && typeof req.app.get === 'function'
        ? req.app.get('services') || {}
        : {};
}

function buildInteractionAuditContext(req) {
    const services = getServices(req);
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

function isLongOrSensitiveInteractionField(key) {
    const normalized = String(key || '').toLowerCase();
    return normalized.includes('content') ||
        normalized.includes('description') ||
        normalized.includes('notes') ||
        normalized.includes('comment') ||
        normalized.includes('message') ||
        normalized.includes('detail') ||
        normalized.includes('attachment') ||
        normalized.includes('link') ||
        normalized.includes('drive') ||
        normalized.includes('calendar');
}

function isShortLabelField(key) {
    return ['title', 'eventTitle', 'summary', 'contentSummary'].includes(key);
}

function sanitizeShortTextValue(value) {
    if (typeof value !== 'string') return value;
    return value.length > MAX_SHORT_AUDIT_TEXT_LENGTH ? INTERACTION_REDACTED_VALUE : value;
}

function sanitizeInteractionAuditData(data = {}) {
    return Object.keys(data || {}).reduce((sanitized, key) => {
        if (isShortLabelField(key)) {
            sanitized[key] = sanitizeShortTextValue(data[key]);
        } else {
            sanitized[key] = isLongOrSensitiveInteractionField(key) ? INTERACTION_REDACTED_VALUE : data[key];
        }
        return sanitized;
    }, {});
}

function getInteractionAuditLabel(data = {}) {
    const label = data.eventTitle || data.title || data.summary || data.contentSummary ||
        data.interactionType || data.eventType || data.interactionId || data.id;

    if (!label) return '互動紀錄';
    const stringLabel = String(label);
    return stringLabel.length > MAX_SHORT_AUDIT_TEXT_LENGTH
        ? `${stringLabel.slice(0, MAX_SHORT_AUDIT_TEXT_LENGTH)}...`
        : stringLabel;
}

function getChangedFieldLabels(fields) {
    return fields.map(field => INTERACTION_FIELD_LABELS[field] || field);
}

function buildInteractionAuditMetadata(data = {}, changedFields = [], detectedEvent) {
    return {
        changed_fields: changedFields,
        changed_field_labels: getChangedFieldLabels(changedFields),
        source: 'interactions',
        audit_version: 'v1',
        related_opportunity_id: data.opportunityId || data.opportunity_id || null,
        related_company_id: data.companyId || data.company_id || null,
        related_contact_id: data.contactId || data.contact_id || null,
        interaction_type: data.interactionType || data.interaction_type || data.type || null,
        event_type: data.eventType || data.event_type || null,
        detected_events: [detectedEvent],
        origin: 'manual_controller_crud'
    };
}

async function logInteractionAudit(req, event) {
    const auditContext = buildInteractionAuditContext(req);
    const auditLoggerService = auditContext.auditLoggerService;
    if (!auditLoggerService || typeof auditLoggerService.logMutation !== 'function') return;

    try {
        await auditLoggerService.logMutation({
            actor_username: auditContext.actor.username,
            actor_name: auditContext.actor.name,
            actor_role: auditContext.actor.role,
            session_id: auditContext.actor.sessionId,
            module: 'interactions',
            action: event.action,
            target_type: 'interaction',
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
        console.warn('[InteractionController] System Audit Log Error:', auditError.message);
    }
}

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

            if (result && result.success && result.id) {
                const afterData = {
                    ...(req.body || {}),
                    interactionId: result.id,
                    id: result.id
                };
                const changes = buildChangedFieldsDiff({}, sanitizeInteractionAuditData(afterData));
                const changedFields = Object.keys(changes);
                const auditContext = buildInteractionAuditContext(req);

                await logInteractionAudit(req, {
                    action: 'create',
                    targetId: result.id,
                    targetLabel: getInteractionAuditLabel(afterData),
                    eventTitle: '新增互動紀錄',
                    eventSummary: `${auditContext.actor.name} 新增一筆互動紀錄`,
                    eventCategory: 'business_event',
                    businessEventType: 'interaction_created',
                    changes,
                    metadata: buildInteractionAuditMetadata(afterData, changedFields, 'created')
                });
            }

            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Interaction');
        }
    };

    // PUT /api/interactions/:id
    updateInteraction = async (req, res) => {
        try {
            const user = req.user || {};
            let beforeData = null;

            try {
                beforeData = await this.interactionService.getInteractionById(req.params.id);
            } catch (auditReadError) {
                console.warn('[InteractionController] Warning: Failed to read interaction before audit:', auditReadError.message);
            }

            const result = await this.interactionService.updateInteraction(req.params.id, req.body, user);

            if (result && result.success && beforeData) {
                const afterData = {
                    ...beforeData,
                    ...(req.body || {}),
                    interactionId: beforeData.interactionId || req.params.id,
                    id: beforeData.id || req.params.id
                };
                const changes = buildChangedFieldsDiff(
                    sanitizeInteractionAuditData(beforeData),
                    sanitizeInteractionAuditData(afterData)
                );
                const changedFields = Object.keys(changes);
                const auditContext = buildInteractionAuditContext(req);

                await logInteractionAudit(req, {
                    action: 'update',
                    targetId: req.params.id,
                    targetLabel: getInteractionAuditLabel(afterData),
                    eventTitle: '編輯互動紀錄',
                    eventSummary: `${auditContext.actor.name} 編輯一筆互動紀錄`,
                    eventCategory: 'business_event',
                    businessEventType: 'interaction_updated',
                    changes,
                    metadata: buildInteractionAuditMetadata(afterData, changedFields, 'updated')
                });
            }

            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Interaction');
        }
    };

    // DELETE /api/interactions/:id
    deleteInteraction = async (req, res) => {
        try {
            const user = req.user || {};
            let beforeData = null;

            try {
                beforeData = await this.interactionService.getInteractionById(req.params.id);
            } catch (auditReadError) {
                console.warn('[InteractionController] Warning: Failed to read interaction before audit:', auditReadError.message);
            }

            const result = await this.interactionService.deleteInteraction(req.params.id, user);

            if (result && result.success && beforeData) {
                const changes = {
                    deleted: {
                        before: false,
                        after: true
                    }
                };
                const changedFields = Object.keys(changes);
                const auditContext = buildInteractionAuditContext(req);

                await logInteractionAudit(req, {
                    action: 'delete',
                    targetId: req.params.id,
                    targetLabel: getInteractionAuditLabel(beforeData),
                    eventTitle: '刪除互動紀錄',
                    eventSummary: `${auditContext.actor.name} 刪除一筆互動紀錄`,
                    eventCategory: 'delete',
                    businessEventType: 'interaction_deleted',
                    changes,
                    metadata: buildInteractionAuditMetadata(beforeData, changedFields, 'deleted')
                });
            }

            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Interaction');
        }
    };
}

module.exports = InteractionController;
