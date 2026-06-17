// ============================================================================
// File: services/opportunity-service.js
// ============================================================================
/**
 * services/opportunity-service.js
 * 璈?獢辣璆剖??摩撅?(Service Layer)
 * @version 8.12.15 (Opportunity Interaction Literal Cleanup)
 * @date 2026-05-13
 * @description 
 * - [HOTFIX] Replaced remaining mojibake opportunity interaction title/delimiter literals with valid UTF-8 Chinese.
 * - [HOTFIX] Standardized system-generated opportunity interaction type to `系統事件`.
 * - [PATCH] Removed createOpportunity contact scaffolding so WorkflowService remains sole RAW-to-CORE promotion owner.
 * - [PATCH] Workflow ownership migration phase 1: move RAW lifecycle orchestration into WorkflowService and reduce OpportunityService to relationship semantics only.
 * - [PATCH] Opportunity Detail linked contact enrichment: use global RAW business-card pool for linked-contact driveLink enrichment and unify contact typography.
 * - [PATCH] Opportunity Detail contact refinement: normalize clickable contact name weight and allow archived RAW business cards to enrich linked contacts without displaying archived rows as candidates.
 * - [PATCH] Opportunity Detail contact interaction polish: move business-card preview to contact names, enrich linked contacts with RAW drive links, and add confirmation before potential-contact linking.
 * - [PATCH] Opportunity Detail potential contacts RAW mapping fix: support Chinese Google Sheet contact fields for same-company discovery.
 * - [PATCH] Opportunity Detail potential contacts aggregation: include RAW same-company contacts alongside CORE contacts using normalized company matching.
 * - [PATCH] Opportunity Detail company normalization alignment: unify same-company matching normalization for relationship discovery preparation.
 * - [PATCH] Opportunity workflow initialization normalization phase 2: centralize create-time stage initialization authority and remove remaining hardcoded workflow fallback.
 * - [PHASE B] Added companyName projection to linkedContacts mapping using existing allCompanies cache.
 * - [PATCH] Prevent empty/whitespace contact creation during scaffolding.
 * - [PATCH] Fixed modifier extraction to correctly resolve string identities and req.user.name for create and modify flows.
 * - [PATCH] Added system interaction logging for Create Opportunity (Phase A).
 * - [PATCH] Unified interaction logging entry point: replaced direct interactionWriter calls with interactionService. No behavior change.
 * - [PHASE 8.14] Refactored addContactToOpportunity to pure SQL. Removed legacy RAW sheet writers (getOrCreateCompany, getOrCreateContact, updateContactStatus). Reused existing SQL contacts by name and companyId.
 * - [PHASE 8.13] Implemented SQL-only scaffolding for company and contact within createOpportunity. Injected contactSqlWriter.
 * - [PHASE 8.13] Added strict null-safe check for contact name matching during scaffold.
 * - [PHASE 8.12] Migrated systemReader.getSystemConfig to systemService.
 * - [PHASE 8.11] Overhauled searchOpportunities to delegate native filters to OpportunitySqlReader.
 * - [PHASE 8.8] Removed direct Supabase calls and inline SqlReader instantiations. Fully migrated to injected ContactSqlReader.
 * - [PHASE 8.7] Removed ContactReader from getOpportunityDetails and deleteContactLink. Fully replaced with Supabase SQL joins.
 * - [PHASE 8.6C] Removed full-table Opportunity and EventLog fetches in getOpportunityDetails, utilizing scoped SQL reader methods.
 * - [PHASE 8.6B] Migrated interactions read in getOpportunityDetails to scoped InteractionSqlReader.
 * - [PHASE 8.5] Removed dead dependency OpportunityReader.
 * - [PHASE 8.5] Replaced companyReader with companySqlReader in deleteOpportunity.
 * - [FIX-1] Locked _fetchOpportunities to SQL Reader only (No Sheet fallback).
 * - [FIX-2] Enforced hard contract on batchUpdateOpportunities (Throw on missing ID).
 * - [PHASE 7] Migrated Contact Linking (Add/Delete) to SQL Writer.
 */

const { buildChangedFieldsDiff } = require('../utils/audit-helpers');

const OPPORTUNITY_FIELD_LABELS = {
    opportunityName: '機會名稱',
    name: '機會名稱',
    currentStage: '機會階段',
    currentStatus: '機會狀態',
    opportunityValue: '機會金額',
    assignee: '負責人',
    expectedCloseDate: '預計結案日',
    deleted: '刪除狀態',
    customerName: '客戶',
    companyName: '公司',
    companyId: '關聯公司',
    opportunityId: '關聯機會',
    contactId: '關聯聯絡人',
    contactName: '聯絡人',
    relationship: '關聯關係',
    notes: '備註',
    potentialSpecification: '規格/需求',
    product_details: '產品資訊',
    driveFolderLink: '雲端資料夾連結',
    drive_link: '雲端連結'
};

const OPPORTUNITY_REDACTED_FIELDS = new Set([
    'notes',
    'potentialSpecification',
    'product_details',
    'driveFolderLink',
    'drive_link'
]);

const WON_STAGE = '撌脫?鈭?';
const WON_STATUS = '撌脩?獢?';
const LOST_STAGE = '撌脣仃??撌脣仃??';
const LOST_STATUS = '撌脩?獢?';
const REDACTED_VALUE = '[REDACTED]';

class OpportunityService {
    constructor({
        config,
        opportunityWriter,
        contactReader,
        contactWriter,
        companyWriter,
        interactionReader,
        interactionService,
        eventLogReader,
        systemService,
        opportunitySqlReader,
        opportunitySqlWriter,
        eventLogSqlReader, 
        companySqlReader,  
        interactionSqlReader, 
        contactSqlReader,
        contactSqlWriter 
    }) {
        this.config = config;
        
        // Readers
        this.interactionReader = interactionReader;
        this.eventLogReader = eventLogReader;
        this.contactReader = contactReader;
        this.systemService = systemService;
        this.opportunitySqlReader = opportunitySqlReader;
        this.eventLogSqlReader = eventLogSqlReader; 
        this.companySqlReader = companySqlReader;   
        this.interactionSqlReader = interactionSqlReader; 
        this.contactSqlReader = contactSqlReader; 

        // Writers
        this.opportunityWriter = opportunityWriter;
        this.contactWriter = contactWriter;
        this.companyWriter = companyWriter;
        this.interactionService = interactionService;
        this.opportunitySqlWriter = opportunitySqlWriter;
        this.contactSqlWriter = contactSqlWriter;
    }

    _normalizeCompanyName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .trim()
            .replace(/股份有限公司|有限公司|公司|\(.*?\)|（.*?）/g, '')
            .replace(/\s+/g, '')
            .trim();
    }

    _resolveModifier(user) {
        if (!user) return 'System';
        if (typeof user === 'string') return user;
        return user.name || user.displayName || user.username || 'System';
    }

    async _fetchOpportunities() {
        if (!this.opportunitySqlReader) {
            throw new Error("[Phase7 Boundary Violation] OpportunitySqlReader is required");
        }
        console.log('[OpportunityService] Read source=SQL');
        return await this.opportunitySqlReader.getOpportunities();
    }

    async _logOpportunityInteraction(opportunityId, title, summary, modifier) {
        try {
            await this.interactionService.createInteraction({
                opportunityId: opportunityId,
                eventType: '系統事件',
                eventTitle: title,
                contentSummary: summary,
                recorder: modifier,
                interactionTime: new Date().toISOString()
            }, { displayName: modifier });
        } catch (logError) {
            console.warn(`[OpportunityService] 撖怠璈??亥?憭望? (OppID: ${opportunityId}): ${logError.message}`);
        }
    }

    async _logOpportunityAudit(event, auditContext = {}) {
        try {
            const auditLoggerService = auditContext.auditLoggerService;
            if (!auditLoggerService || typeof auditLoggerService.logMutation !== 'function') return;

            await auditLoggerService.logMutation({
                actor_username: auditContext.actor && auditContext.actor.username,
                actor_name: auditContext.actor && auditContext.actor.name,
                actor_role: auditContext.actor && auditContext.actor.role,
                session_id: auditContext.actor && auditContext.actor.sessionId,
                module: 'opportunities',
                action: event.action || 'update',
                target_type: event.targetType || 'opportunity',
                target_id: event.targetId,
                target_label: event.targetLabel || null,
                event_title: event.eventTitle,
                event_summary: event.eventSummary,
                event_category: event.eventCategory,
                business_event_type: event.businessEventType,
                changes: event.changes || {},
                metadata: {
                    changed_fields: event.changedFields || [],
                    changed_field_labels: this._getOpportunityFieldLabels(event.changedFields || []),
                    detected_events: event.detectedEvents || [],
                    source: 'opportunities',
                    audit_version: 'v1',
                    ...(event.metadata || {})
                },
                ip_address: auditContext.ipAddress || null,
                user_agent: auditContext.userAgent || null
            });
        } catch (auditError) {
            console.warn(`[OpportunityService] System Audit Log Error: ${auditError.message}`);
        }
    }

    _getAuditActorName(auditContext, fallback) {
        return (auditContext.actor && auditContext.actor.name) || fallback || 'System';
    }

    _getOpportunityFieldLabels(fields) {
        return fields.map(field => OPPORTUNITY_FIELD_LABELS[field] || field);
    }

    _sanitizeOpportunityAuditData(data = {}) {
        return Object.keys(data || {}).reduce((sanitized, key) => {
            sanitized[key] = OPPORTUNITY_REDACTED_FIELDS.has(key) ? REDACTED_VALUE : data[key];
            return sanitized;
        }, {});
    }

    _detectOpportunityEvents(beforeData, afterData) {
        const detectedEvents = [];

        if (beforeData.currentStage !== afterData.currentStage) detectedEvents.push('stage_changed');
        if (beforeData.currentStatus !== afterData.currentStatus) detectedEvents.push('status_changed');
        if (beforeData.opportunityValue !== afterData.opportunityValue) detectedEvents.push('value_changed');
        if ((beforeData.assignee || beforeData.owner) !== (afterData.assignee || afterData.owner)) detectedEvents.push('assignee_changed');
        if (beforeData.expectedCloseDate !== afterData.expectedCloseDate) detectedEvents.push('expected_close_date_changed');
        if (afterData.currentStage === LOST_STAGE) {
            detectedEvents.push('lost');
        } else if (afterData.currentStage === WON_STAGE || afterData.currentStatus === WON_STATUS) {
            detectedEvents.push('won');
        }

        return detectedEvents;
    }

    _buildOpportunityAuditEvent(beforeData, afterData, auditContext, modifier) {
        const sanitizedBefore = this._sanitizeOpportunityAuditData(beforeData);
        const sanitizedAfter = this._sanitizeOpportunityAuditData(afterData);
        const changes = buildChangedFieldsDiff(sanitizedBefore, sanitizedAfter);
        const changedFields = Object.keys(changes);
        const detectedEvents = this._detectOpportunityEvents(beforeData, afterData);
        const actorName = this._getAuditActorName(auditContext, modifier);
        const opportunityName = afterData.opportunityName || afterData.name || beforeData.opportunityName || beforeData.name || afterData.opportunityId;
        const stageChanged = detectedEvents.includes('stage_changed');
        const statusChanged = detectedEvents.includes('status_changed');

        if (detectedEvents.includes('won')) {
            return {
                businessEventType: 'opportunity_won',
                eventTitle: '機會成交',
                eventSummary: `${actorName} 將機會「${opportunityName}」更新為成交`,
                eventCategory: 'status_change',
                changes,
                changedFields,
                detectedEvents
            };
        }

        if (detectedEvents.includes('lost')) {
            return {
                businessEventType: 'opportunity_lost',
                eventTitle: '機會失敗',
                eventSummary: `${actorName} 將機會「${opportunityName}」更新為失敗`,
                eventCategory: 'status_change',
                changes,
                changedFields,
                detectedEvents
            };
        }

        if (stageChanged) {
            return {
                businessEventType: 'opportunity_stage_changed',
                eventTitle: '更新機會階段',
                eventSummary: `${actorName} 將機會「${opportunityName}」階段由「${beforeData.currentStage || '未填寫'}」更新為「${afterData.currentStage || '未填寫'}」`,
                eventCategory: 'status_change',
                changes,
                changedFields,
                detectedEvents
            };
        }

        if (statusChanged) {
            return {
                businessEventType: 'opportunity_status_changed',
                eventTitle: '更新機會狀態',
                eventSummary: `${actorName} 將機會「${opportunityName}」狀態由「${beforeData.currentStatus || '未填寫'}」更新為「${afterData.currentStatus || '未填寫'}」`,
                eventCategory: 'status_change',
                changes,
                changedFields,
                detectedEvents
            };
        }

        if (detectedEvents.includes('assignee_changed')) {
            return {
                businessEventType: 'opportunity_assignee_changed',
                eventTitle: '更新機會負責人',
                eventSummary: `${actorName} 更新機會「${opportunityName}」的負責人`,
                eventCategory: 'assignment_change',
                changes,
                changedFields,
                detectedEvents
            };
        }

        if (detectedEvents.includes('value_changed')) {
            return {
                businessEventType: 'opportunity_value_changed',
                eventTitle: '更新機會金額',
                eventSummary: `${actorName} 更新機會「${opportunityName}」的金額`,
                eventCategory: 'data_change',
                changes,
                changedFields,
                detectedEvents
            };
        }

        return {
            businessEventType: 'opportunity_updated',
            eventTitle: '更新機會',
            eventSummary: `${actorName} 更新機會「${opportunityName}」的資料`,
            eventCategory: 'data_change',
            changes,
            changedFields,
            detectedEvents
        };
    }

    _buildOpportunityCreateAuditEvent(afterData, auditContext, modifier) {
        const sanitizedAfter = this._sanitizeOpportunityAuditData(afterData);
        const changes = buildChangedFieldsDiff({}, sanitizedAfter);
        const changedFields = Object.keys(changes);
        const actorName = this._getAuditActorName(auditContext, modifier);
        const opportunityName = afterData.opportunityName || afterData.name || afterData.opportunityId || afterData.id || '未命名機會';

        return {
            action: 'create',
            businessEventType: 'opportunity_created',
            eventTitle: '建立機會',
            eventSummary: `${actorName} 建立機會「${opportunityName}」`,
            eventCategory: 'data_change',
            changes,
            changedFields,
            detectedEvents: ['created'],
            metadata: {
                create_source: 'standard_opportunity_create'
            }
        };
    }

    _getOpportunityName(opportunity = {}, fallback = null) {
        return opportunity.opportunityName || opportunity.name || opportunity.title || fallback || opportunity.opportunityId || opportunity.id || '未命名機會';
    }

    _getContactName(contact = {}, fallback = null) {
        return contact.name || contact.contactName || fallback || contact.contactId || contact.id || '未命名聯絡人';
    }

    _buildOpportunityDeleteAuditEvent(opportunity, auditContext, modifier) {
        const actorName = this._getAuditActorName(auditContext, modifier);
        const opportunityName = this._getOpportunityName(opportunity);
        const changes = {
            deleted: {
                before: false,
                after: true
            }
        };
        const changedFields = Object.keys(changes);

        return {
            action: 'delete',
            businessEventType: 'opportunity_deleted',
            eventTitle: '刪除機會',
            eventSummary: `${actorName} 刪除機會「${opportunityName}」`,
            eventCategory: 'delete',
            changes,
            changedFields,
            detectedEvents: ['deleted'],
            metadata: {
                related_opportunity_id: opportunity.opportunityId || opportunity.id || null,
                related_company_id: opportunity.companyId || opportunity.company_id || null,
                related_contact_id: opportunity.contactId || opportunity.contact_id || opportunity.mainContactId || null,
                opportunity_stage: opportunity.currentStage || null,
                opportunity_status: opportunity.currentStatus || null
            }
        };
    }

    _buildOpportunityContactAuditEvent({ action, opportunity, contact, opportunityId, contactId, auditContext, modifier }) {
        const actorName = this._getAuditActorName(auditContext, modifier);
        const opportunityName = this._getOpportunityName(opportunity, opportunityId);
        const contactName = this._getContactName(contact, contactId);
        const companyId = (contact && (contact.companyId || contact.company_id)) ||
            (opportunity && (opportunity.companyId || opportunity.company_id)) ||
            null;
        const isLink = action === 'link';
        const changes = {
            relationship: {
                before: isLink ? null : { opportunityId, contactId, contactName, companyId },
                after: isLink ? { opportunityId, contactId, contactName, companyId } : null
            }
        };
        const changedFields = Object.keys(changes);

        return {
            action,
            targetType: 'opportunity_contact',
            targetId: `${opportunityId}:${contactId}`,
            targetLabel: `${opportunityName} / ${contactName}`,
            businessEventType: isLink ? 'opportunity_contact_linked' : 'opportunity_contact_unlinked',
            eventTitle: isLink ? '關聯聯絡人' : '解除聯絡人關聯',
            eventSummary: isLink
                ? `${actorName} 將聯絡人「${contactName}」關聯至機會「${opportunityName}」`
                : `${actorName} 將聯絡人「${contactName}」自機會「${opportunityName}」解除關聯`,
            eventCategory: 'relationship_change',
            changes,
            changedFields,
            detectedEvents: [isLink ? 'contact_linked' : 'contact_unlinked'],
            metadata: {
                related_opportunity_id: opportunityId,
                related_company_id: companyId,
                related_contact_id: contactId,
                relationship_type: 'opportunity_contact'
            }
        };
    }

    async createOpportunity(opportunityData, user, auditContext = {}) {
        try {
            const modifier = this._resolveModifier(user);

            if (!opportunityData.currentStage) {
                const systemConfig = await this.systemService.getSystemConfig();
                const initialStage = (systemConfig['璈??挾'] || [])[0];
                if (!initialStage || !initialStage.value) {
                    throw new Error('Cannot create opportunity: missing configured initial opportunity stage.');
                }
                opportunityData = { ...opportunityData, currentStage: initialStage.value };
            }

            if (opportunityData.customerCompany) {
                const normalizedComp = this._normalizeCompanyName(opportunityData.customerCompany);
                const allCompanies = await this.companySqlReader.getCompanies();
                const existingCompany = allCompanies.find(c => this._normalizeCompanyName(c.companyName) === normalizedComp);
                let targetCompanyId;

                if (existingCompany) {
                    targetCompanyId = existingCompany.companyId;
                } else {
                    targetCompanyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await this.companyWriter.createCompany({
                        companyId: targetCompanyId,
                        companyName: opportunityData.customerCompany,
                        county: opportunityData.county || ''
                    }, modifier);
                }

            }

            const result = await this.opportunitySqlWriter.createOpportunity(opportunityData, modifier);
            
            // [Phase A Patch] Create Interaction Log for New Opportunity
            if (result && result.success) {
                const oppName = opportunityData.opportunityName || '未命名機會';
                const owner = opportunityData.assignee || modifier || '未指派';
                await this._logOpportunityInteraction(
                    result.id,
                    '建立機會案件',
                    `建立機會案件「${oppName}」，指派給 ${owner}。`,
                    modifier
                );

                if (auditContext.auditLoggerService) {
                    const afterData = {
                        ...opportunityData,
                        opportunityId: result.id,
                        id: result.id
                    };
                    const auditEvent = this._buildOpportunityCreateAuditEvent(afterData, auditContext, modifier);
                    await this._logOpportunityAudit({
                        targetId: result.id,
                        targetLabel: afterData.opportunityName || afterData.name || oppName,
                        ...auditEvent
                    }, auditContext);
                }
            }
            
            return result;
        } catch (error) {
            console.error('[OpportunityService] createOpportunity Error:', error);
            throw error;
        }
    }

    async getOpportunityDetails(opportunityId) {
        try {
            console.log(`[OpportunityService] Read source=SQL (OppID: ${opportunityId})`);
            const opportunityInfo = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            if (!opportunityInfo) {
                throw new Error(`找不到機會案件 ID: ${opportunityId}`);
            }

            const eventReader = this.eventLogSqlReader || this.eventLogReader;

            const interactionPromise = this.interactionSqlReader 
                ? this.interactionSqlReader.getInteractionsByOpportunityIds([opportunityId])
                : this.interactionReader.getInteractions().then(all => all.filter(i => i.opportunityId === opportunityId));

            const parentPromise = opportunityInfo.parentOpportunityId 
                ? this.opportunitySqlReader.getOpportunityById(opportunityInfo.parentOpportunityId)
                : Promise.resolve(null);
            
            const childPromise = this.opportunitySqlReader.getOpportunitiesByParentId(opportunityId);
            
            const eventPromise = this.eventLogSqlReader
                ? this.eventLogSqlReader.getEventLogsByOpportunityId(opportunityId)
                : eventReader.getEventLogs().then(all => all.filter(e => e.opportunityId === opportunityId));

            const linksPromise = this.contactSqlReader 
                ? this.contactSqlReader.getContactsByOpportunityId(opportunityId)
                : Promise.resolve([]);
                
            const allCompaniesPromise = this.companySqlReader.getCompanies();

            const [
                parentOpportunity,
                childOpportunities,
                scopedInteractions, 
                scopedEventLogs, 
                linkedContactsFromCache,
                allCompanies
            ] = await Promise.all([
                parentPromise,
                childPromise,
                interactionPromise, 
                eventPromise, 
                linksPromise,
                allCompaniesPromise
            ]);

            // [Phase B Patch] Appended companyName projection using allCompanies
            const linkedContacts = (linkedContactsFromCache || []).map(contact => {
                const comp = (allCompanies || []).find(c => c.companyId === contact.companyId);
                return {
                    ...contact,
                    position: contact.jobTitle || contact.position,
                    companyName: comp ? comp.companyName : null
                };
            });
            
            const eventLogs = (scopedEventLogs || [])
                .sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));
            const eventLogsById = new Map();
            eventLogs.forEach(eventLog => {
                const eventId = eventLog && (eventLog.eventId || eventLog.id || eventLog.event_log_id);
                if (eventId) eventLogsById.set(String(eventId), eventLog);
            });
            const extractLegacyEventId = (summary) => {
                const match = String(summary || '').match(/event_log_id=([a-zA-Z0-9_-]+)/);
                return match ? match[1] : '';
            };
            const interactions = (scopedInteractions || [])
                .map(interaction => {
                    const eventId = interaction && (
                        interaction.eventId
                        || interaction.eventLogId
                        || extractLegacyEventId(interaction.contentSummary)
                    );
                    const matchedEventLog = eventId ? eventLogsById.get(String(eventId)) : null;
                    return Object.assign({}, interaction, {
                        EventLogs: matchedEventLog ? [matchedEventLog] : []
                    });
                })
                .sort((a, b) => new Date(b.interactionTime || b.createdTime) - new Date(a.interactionTime || a.createdTime));

            const normalizedOppCompany = this._normalizeCompanyName(opportunityInfo.customerCompany);
            
            const matchedCompany = (allCompanies || []).find(c => this._normalizeCompanyName(c.companyName) === normalizedOppCompany);
            
            const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
            const normalizePhone = (value) => (value || '').toString().replace(/\D+/g, '');
            const getNormalizedPhones = (contact) => [normalizePhone(contact.mobile), normalizePhone(contact.phone)].filter(Boolean);
            const isLikelySamePerson = (left, right) => {
                if (!left || !right) return false;
                if (left.contactId && right.contactId && left.contactId === right.contactId) return true;
                if (left.rowIndex && right.rowIndex && left.rowIndex === right.rowIndex) return true;

                const leftName = normalizeText(left.name);
                const rightName = normalizeText(right.name);
                const leftCompany = this._normalizeCompanyName(left.companyName || left.company || left.organization);
                const rightCompany = this._normalizeCompanyName(right.companyName || right.company || right.organization);
                if (!leftName || !rightName || !leftCompany || !rightCompany) return false;
                if (leftName !== rightName || leftCompany !== rightCompany) return false;

                const leftEmail = normalizeText(left.email);
                const rightEmail = normalizeText(right.email);
                if (leftEmail && rightEmail) return leftEmail === rightEmail;

                const leftPhones = getNormalizedPhones(left);
                const rightPhones = getNormalizedPhones(right);
                if (leftPhones.length > 0 && rightPhones.length > 0) {
                    return leftPhones.some(phone => rightPhones.includes(phone));
                }

                return true;
            };
            const findGlobalRawMatchForLinkedContact = (linkedContact, rawPool) => {
                if (!linkedContact || !Array.isArray(rawPool) || rawPool.length === 0) return null;

                const linkedName = normalizeText(linkedContact.name);
                if (!linkedName) return null;

                const candidates = rawPool.filter(rawContact => normalizeText(rawContact.name) === linkedName);
                if (candidates.length === 0) return null;

                const linkedEmail = normalizeText(linkedContact.email);
                const linkedPhones = getNormalizedPhones(linkedContact);

                const emailMatches = linkedEmail
                    ? candidates.filter(rawContact => normalizeText(rawContact.email) === linkedEmail)
                    : [];
                if (emailMatches.length === 1) return emailMatches[0];

                const phoneMatches = linkedPhones.length > 0
                    ? candidates.filter(rawContact => {
                        const rawPhones = getNormalizedPhones(rawContact);
                        return rawPhones.length > 0 && rawPhones.some(phone => linkedPhones.includes(phone));
                    })
                    : [];
                if (phoneMatches.length === 1) return phoneMatches[0];

                const linkedHasSignals = Boolean(linkedEmail) || linkedPhones.length > 0;
                if (!linkedHasSignals && candidates.length === 1) {
                    const onlyCandidate = candidates[0];
                    const candidateHasSignals = Boolean(normalizeText(onlyCandidate.email)) || getNormalizedPhones(onlyCandidate).length > 0;
                    if (!candidateHasSignals) return onlyCandidate;
                }

                return null;
            };

            let potentialContacts = [];
            if (matchedCompany && this.contactSqlReader) {
                const companyContacts = await this.contactSqlReader.getContactsByCompanyId(matchedCompany.companyId);
                potentialContacts = companyContacts.map(c => ({
                    ...c,
                    company: matchedCompany.companyName,
                    position: c.jobTitle || c.position
                }));
            }

            const rawReader = this.contactWriter && this.contactWriter.contactReader;
            if (rawReader && typeof rawReader.getContacts === 'function') {
                const rawContacts = await rawReader.getContacts();
                const mapRawContact = (raw) => ({
                    name: raw.name || raw['姓名'] || '',
                    company: raw.company || raw.companyName || raw.organization || raw['公司'] || '',
                    companyName: raw.companyName || raw.company || raw.organization || raw['公司'] || '',
                    jobTitle: raw.jobTitle || raw.position || raw['職位'] || '',
                    position: raw.position || raw.jobTitle || raw['職位'] || '',
                    department: raw.department || raw['部門'] || '',
                    phone: raw.phone || raw['電話'] || '',
                    mobile: raw.mobile || raw['手機'] || '',
                    email: raw.email || raw['電子郵件'] || '',
                    website: raw.website || raw['網址'] || '',
                    address: raw.address || raw['地址'] || '',
                    driveLink: raw.driveLink || raw.driveUrl || raw['Drive連結'] || '',
                    rowIndex: raw.rowIndex || raw.rawId || raw['原始ID'] || '',
                    status: raw.status || raw['狀態'] || '',
                    source: raw.source || 'RAW'
                });
                const mappedRawContacts = (rawContacts || [])
                    .map(mapRawContact)
                    .filter(contact => Boolean((contact.name || '').toString().trim()));

                const rawSameCompanyContacts = normalizedOppCompany
                    ? mappedRawContacts.filter(contact => {
                        const normalizedCompany = this._normalizeCompanyName(contact.companyName || contact.company);
                        return Boolean(
                            normalizedCompany &&
                            normalizedCompany === normalizedOppCompany
                        );
                    })
                    : [];

                const rawPotentialContacts = rawSameCompanyContacts;

                linkedContacts.forEach(linkedContact => {
                    const matchedRaw = findGlobalRawMatchForLinkedContact(linkedContact, mappedRawContacts);
                    if (matchedRaw) {
                        if (!linkedContact.driveLink && matchedRaw.driveLink) linkedContact.driveLink = matchedRaw.driveLink;
                        if (!linkedContact.rowIndex && matchedRaw.rowIndex) linkedContact.rowIndex = matchedRaw.rowIndex;
                    }
                });

                potentialContacts.forEach(coreContact => {
                    const matchedRaw = rawSameCompanyContacts.find(rawContact => isLikelySamePerson(coreContact, rawContact));
                    if (matchedRaw) {
                        if (!coreContact.driveLink && matchedRaw.driveLink) coreContact.driveLink = matchedRaw.driveLink;
                        if (!coreContact.rowIndex && matchedRaw.rowIndex) coreContact.rowIndex = matchedRaw.rowIndex;
                    }
                });

                const mergedPotentialContacts = [...potentialContacts];
                rawPotentialContacts.forEach(rawContact => {
                    const isDuplicate = mergedPotentialContacts.some(existing => isLikelySamePerson(existing, rawContact))
                        || linkedContacts.some(existing => isLikelySamePerson(existing, rawContact));
                    if (!isDuplicate) {
                        mergedPotentialContacts.push(rawContact);
                    }
                });
                potentialContacts = mergedPotentialContacts;
            }

            let mainContactJobTitle = '';
            const targetName = (opportunityInfo.mainContact || '').trim();
            
            if (targetName) {
                const linkedMatch = linkedContacts.find(c => c.name === targetName);
                if (linkedMatch && linkedMatch.position) {
                    mainContactJobTitle = linkedMatch.position;
                } 
                else {
                    const potentialMatch = potentialContacts.find(pc => pc.name === targetName); 
                    if (potentialMatch && potentialMatch.position) {
                        mainContactJobTitle = potentialMatch.position;
                    } 
                }
            }
            opportunityInfo.mainContactJobTitle = mainContactJobTitle;

            return {
                opportunityInfo,
                interactions,
                eventLogs,
                linkedContacts,
                potentialContacts,
                parentOpportunity,
                childOpportunities
            };
        } catch (error) {
            console.error(`[OpportunityService] getOpportunityDetails Error (${opportunityId}):`, error);
            throw error;
        }
    }

    async updateOpportunity(opportunityId, updateData, user, auditContext = {}) {
        try {
            const modifier = this._resolveModifier(user);
            
            const originalOpportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            
            if (!originalOpportunity) {
                throw new Error(`?曆??啗??湔????(ID: ${opportunityId})`);
            }
            
            const oldStage = originalOpportunity.currentStage;

            const systemConfig = await this.systemService.getSystemConfig();
            const getNote = (configKey, value) => (systemConfig[configKey] || []).find(i => i.value === value)?.note || value || 'N/A';
            const stageMapping = new Map((systemConfig['璈??挾'] || []).map(item => [item.value, item.note]));
            
            const logs = [];

            const newStage = updateData.currentStage;
            if (newStage && oldStage && newStage !== oldStage) {
                const oldStageName = stageMapping.get(oldStage) || oldStage;
                const newStageName = stageMapping.get(newStage) || newStage;
                logs.push(`階段由 [${oldStageName}] 變更為 [${newStageName}]`);
            }
            
            if (updateData.opportunityValue !== undefined && updateData.opportunityValue !== originalOpportunity.opportunityValue) {
                logs.push(`機會金額由 [${originalOpportunity.opportunityValue || '未填寫'}] 變更為 [${updateData.opportunityValue || '未填寫'}]`);
            }

            const oldAssignee = originalOpportunity.assignee || originalOpportunity.owner;
            if (updateData.assignee !== undefined && updateData.assignee !== oldAssignee) {
                logs.push(`負責人由 [${getNote('指派業務', oldAssignee)}] 變更為 [${getNote('指派業務', updateData.assignee)}]`);
            }
            
            if (updateData.expectedCloseDate !== undefined && updateData.expectedCloseDate !== originalOpportunity.expectedCloseDate) {
                logs.push(`預計結案日由 [${originalOpportunity.expectedCloseDate || '未填寫'}] 變更為 [${updateData.expectedCloseDate || '未填寫'}]`);
            }

            const updateResult = await this.opportunitySqlWriter.updateOpportunity(opportunityId, updateData, modifier);
            
            if (logs.length > 0) {
                await this._logOpportunityInteraction(
                    opportunityId,
                    '更新機會案件',
                    logs.join('；'),
                    modifier
                );
            }

            if (updateResult && updateResult.success && auditContext.auditLoggerService) {
                const afterData = {
                    ...originalOpportunity,
                    ...updateData
                };
                const auditEvent = this._buildOpportunityAuditEvent(originalOpportunity, afterData, auditContext, modifier);
                await this._logOpportunityAudit({
                    targetId: opportunityId,
                    targetLabel: afterData.opportunityName || afterData.name || originalOpportunity.opportunityName || originalOpportunity.name,
                    ...auditEvent
                }, auditContext);
            }
            
            return updateResult;
        } catch (error) {
            console.error('[OpportunityService] updateOpportunity Error:', error);
            throw error;
        }
    }
    
    async addContactToOpportunity(opportunityId, contactData, user, auditContext = {}) {
        try {
            const modifier = this._resolveModifier(user);
            if (!contactData.contactId) {
                throw new Error('無法關聯聯絡人：缺少 contactId。');
            }

            const existingContact = this.contactSqlReader
                ? await this.contactSqlReader.getContactById(contactData.contactId)
                : null;
            const contactToLink = {
                id: contactData.contactId,
                name: (existingContact && existingContact.name) || contactData.name || `ID ${contactData.contactId}`
            };
            let opportunity = null;

            if (auditContext.auditLoggerService) {
                try {
                    opportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
                } catch (auditReadError) {
                    console.warn(`[OpportunityService] Audit opportunity read failed before contact link: ${auditReadError.message}`);
                }
            }

            const linkResult = await this.opportunitySqlWriter.linkContact(opportunityId, contactToLink.id, modifier);
            
            await this._logOpportunityInteraction(
                opportunityId,
                '關聯聯絡人',
                `將聯絡人 "${contactToLink.name}" 關聯至此機會。`,
                modifier
            );

            if (linkResult && linkResult.success && auditContext.auditLoggerService) {
                const auditEvent = this._buildOpportunityContactAuditEvent({
                    action: 'link',
                    opportunity,
                    contact: existingContact || contactToLink,
                    opportunityId,
                    contactId: contactToLink.id,
                    auditContext,
                    modifier
                });

                await this._logOpportunityAudit(auditEvent, auditContext);
            }

            return { success: true, message: '聯絡人關聯成功', data: { contact: contactToLink, link: linkResult } };
        } catch (error) {
            console.error('[OpportunityService] addContactToOpportunity Error:', error);
            throw error;
        }
    }

    async deleteContactLink(opportunityId, contactId, user, auditContext = {}) {
        try {
            const modifier = this._resolveModifier(user);
            let opportunity = null;
            
            const contact = this.contactSqlReader 
                ? await this.contactSqlReader.getContactById(contactId)
                : (await this.contactReader.getContactList()).find(c => c.contactId === contactId);
                
            const contactName = contact ? contact.name : `ID ${contactId}`;

            if (auditContext.auditLoggerService) {
                try {
                    opportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
                } catch (auditReadError) {
                    console.warn(`[OpportunityService] Audit opportunity read failed before contact unlink: ${auditReadError.message}`);
                }
            }

            const deleteResult = await this.opportunitySqlWriter.unlinkContact(opportunityId, contactId);

            if (deleteResult.success) {
                await this._logOpportunityInteraction(
                    opportunityId,
                    '解除聯絡人關聯',
                    `將聯絡人 "${contactName}" 從此機會移除。`,
                    modifier
                );
            }

            if (deleteResult && deleteResult.success && auditContext.auditLoggerService) {
                const auditEvent = this._buildOpportunityContactAuditEvent({
                    action: 'unlink',
                    opportunity,
                    contact: contact || { contactId, name: contactName },
                    opportunityId,
                    contactId,
                    auditContext,
                    modifier
                });

                await this._logOpportunityAudit(auditEvent, auditContext);
            }

            return deleteResult;
        } catch (error) {
            console.error('[OpportunityService] deleteContactLink Error:', error);
            throw error;
        }
    }

    async deleteOpportunity(opportunityId, user, auditContext = {}) {
        try {
            const modifier = this._resolveModifier(user);
            
            const opportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            
            if (!opportunity) {
                throw new Error(`?曆??啗??芷????(ID: ${opportunityId})`);
            }

            const deleteResult = await this.opportunitySqlWriter.deleteOpportunity(opportunityId, modifier);
            
            if (deleteResult.success && opportunity.customerCompany) {
                try {
                    const allCompanies = await this.companySqlReader.getCompanies();
                    const company = allCompanies.find(c => 
                        c.companyName.toLowerCase().trim() === opportunity.customerCompany.toLowerCase().trim()
                    );
                    
                    if (company) {
                        await this.interactionService.createInteraction({
                            companyId: company.companyId,
                            eventType: '系統互動紀錄',
                            eventTitle: '刪除機會案件',
                            contentSummary: `機會案件 "${opportunity.opportunityName}" (ID: ${opportunity.opportunityId}) 由 ${modifier} 刪除。`,
                            recorder: modifier,
                            interactionTime: new Date().toISOString()
                        }, user);
                    }
                } catch (logError) {
                     console.warn(`[OpportunityService] 公司互動記錄寫入失敗 (刪除機會案件): ${logError.message}`);
                }
            }

            if (deleteResult && deleteResult.success && auditContext.auditLoggerService) {
                const auditEvent = this._buildOpportunityDeleteAuditEvent(opportunity, auditContext, modifier);
                await this._logOpportunityAudit({
                    targetId: opportunityId,
                    targetLabel: this._getOpportunityName(opportunity, opportunityId),
                    ...auditEvent
                }, auditContext);
            }
            
            return deleteResult;
        } catch (error) {
            console.error('[OpportunityService] deleteOpportunity Error:', error);
            throw error;
        }
    }

    async getOpportunityYears() {
        if (!this.opportunitySqlReader) return [];
        try {
            return await this.opportunitySqlReader.getOpportunityYears();
        } catch (error) {
            console.error('[OpportunityService] getOpportunityYears Error:', error);
            throw error;
        }
    }

    async getOpportunitiesByDateRange(startDate, endDate, dateField = 'createdTime') {
        try {
            const allOpportunities = await this._fetchOpportunities();
            
            return allOpportunities.filter(opp => {
                const dateVal = opp[dateField];
                if (!dateVal) return false;
                
                const oppDate = new Date(dateVal);
                if (isNaN(oppDate.getTime())) return false; 

                return oppDate.getTime() >= startDate.getTime() && oppDate.getTime() <= endDate.getTime();
            });
        } catch (error) {
            console.error('[OpportunityService] getOpportunitiesByDateRange Error:', error);
            return [];
        }
    }

    async getOpportunitiesByCounty(opportunityType = null) {
        try {
            const [allOpportunities, companies] = await Promise.all([
                this._fetchOpportunities(),
                this.companySqlReader.getCompanies()
            ]);

            const activeOpportunities = allOpportunities.filter(opp => 
                opp.currentStatus !== this.config.CONSTANTS.OPPORTUNITY_STATUS.ARCHIVED
            );

            let filteredOpportunities = opportunityType
                ? activeOpportunities.filter(opp => opp.opportunityType === opportunityType)
                : activeOpportunities;
            
            const normalize = (name) => name ? name.toLowerCase().trim() : '';
            const companyToCountyMap = new Map();
            
            (companies || []).forEach(c => {
                if (c.companyName) {
                    companyToCountyMap.set(normalize(c.companyName), c.county || c.city);
                }
            });

            const countyCounts = {};
            filteredOpportunities.forEach(opp => {
                const county = companyToCountyMap.get(normalize(opp.customerCompany));
                if (county) {
                    countyCounts[county] = (countyCounts[county] || 0) + 1;
                }
            });

            return Object.entries(countyCounts).map(([county, count]) => ({ county, count }));

        } catch (error) {
            console.error('??[OpportunityService] getOpportunitiesByCounty ?航炊:', error);
            return [];
        }
    }

    async getOpportunitiesByStage() {
        try {
            const [opportunities, systemConfig] = await Promise.all([
                this._fetchOpportunities(),
                this.systemService.getSystemConfig()
            ]);
            
            const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
            const stages = systemConfig['璈??挾'] || [];
            const stageGroups = {};

            stages.forEach(stage => {
                stageGroups[stage.value] = { name: stage.note || stage.value, opportunities: [], count: 0 };
            });

            safeOpportunities.forEach(opp => {
                if (opp.currentStatus === '進行中') {
                    const stageKey = opp.currentStage;
                    if (stageGroups[stageKey]) {
                        stageGroups[stageKey].opportunities.push(opp);
                        stageGroups[stageKey].count++;
                    }
                }
            });
            return stageGroups;
        } catch (error) {
            console.error('??[OpportunityService] getOpportunitiesByStage ?航炊:', error);
            return {};
        }
    }

    // [Phase 8.11] Expanded parameter signature to support direct SQL delegation for Table Data
    async searchOpportunities(query, page = 0, limit = 500, sortField = null, sortDirection = null, filters = {}) {
        try {
            // New SQL-Delegated Path for Table
            if (this.opportunitySqlReader && typeof this.opportunitySqlReader.searchOpportunitiesTable === 'function') {
                const offset = (page > 0) ? (page - 1) * limit : 0;
                
                const result = await this.opportunitySqlReader.searchOpportunitiesTable({
                    q: query,
                    filters: filters || {},
                    sortField,
                    sortDirection,
                    limit: page > 0 ? limit : null,
                    offset
                });
                
                // Return raw array if page == 0 to maintain legacy compatibility for Chip Wall
                if (page === 0) return result.data;
                
                return result; // Table expects { data, total }
            }

            // Fallback (legacy JS handling)
            let items = await this._fetchOpportunities();

            if (!filters || !filters.includeArchived) {
                items = items.filter(o => o.currentStatus !== this.config.CONSTANTS.OPPORTUNITY_STATUS.ARCHIVED);
            }

            if (query) {
                const q = query.toLowerCase().trim();
                items = items.filter(o => 
                    (o.opportunityName && o.opportunityName.toLowerCase().includes(q)) ||
                    (o.customerCompany && o.customerCompany.toLowerCase().includes(q))
                );
            }

            if (filters) {
                if (filters.stage && filters.stage !== 'all') {
                    items = items.filter(o => o.currentStage === filters.stage);
                }
                if (filters.assignee && filters.assignee !== 'all') {
                    items = items.filter(o => (o.assignee || o.owner) === filters.assignee);
                }
                if (filters.status && filters.status !== 'all') {
                    items = items.filter(o => o.currentStatus === filters.status);
                }
                if (filters.minProb) {
                    items = items.filter(o => Number(o.probability || o.winProbability || 0) >= Number(filters.minProb));
                }
            }

            items.sort((a, b) => {
                const dateA = new Date(a.lastUpdateTime || a.updatedTime || 0).getTime();
                const dateB = new Date(b.lastUpdateTime || b.updatedTime || 0).getTime();
                return dateB - dateA;
            });

            return page === 0 ? items : { data: items, total: items.length };

        } catch (error) {
             console.error('??[OpportunityService] searchOpportunities ?航炊:', error);
             throw error;
        }
    }

    async batchUpdateOpportunities(updates) {
        let successCount = 0;
        
        for (const update of updates) {
            if (!update.opportunityId) {
                throw new Error("[Phase7 Contract Violation] batchUpdateOpportunities requires opportunityId");
            }

            try {
                await this.updateOpportunity(update.opportunityId, update.data, { displayName: update.modifier });
                successCount++;
            } catch (error) {
                console.error(`[OpportunityService] Batch Update Error (ID: ${update.opportunityId}):`, error);
                throw error;
            }
        }
        return { success: true, successCount };
    }
}

module.exports = OpportunityService;
