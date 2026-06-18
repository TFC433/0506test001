/**
 * services/company-service.js
 * 公司業務邏輯層
 * @version 8.6.1 (Company Details Contact Compatibility Patch)
 * @date 2026-05-21
 * @changelog 
 * - Company details compatibility: include legacy company-name keyed contacts in company details response.
 * - [PATCH] Added system interaction logging for Create Company (Phase A).
 * - [PATCH PHASE 11] Added graceful DB-First bypass for full interactions/eventLogs tables using _hasNativeActivity.
 * - [PATCH PHASE 10] Added lightweight opportunity counting. Removed frontend dependency on page=0.
 * - [PATCH] Unified interaction logging entry point: replaced interactionWriter with interactionService. No behavior change.
 */

const { buildChangedFieldsDiff } = require('../utils/audit-helpers');

const COMPANY_FIELD_LABELS = {
    companyName: '公司名稱',
    name: '公司名稱',
    phone: '電話',
    address: '地址',
    taxId: '統一編號',
    industry: '產業',
    notes: '備註'
};

const COMPANY_AUDIT_REDACTED_VALUE = '[REDACTED]';
const COMPANY_AUDIT_MAX_STRING_LENGTH = 200;
const COMPANY_AUDIT_SENSITIVE_PATTERNS = [
    'notes',
    'note',
    'description',
    'comment',
    'detail',
    'address',
    'email',
    'phone',
    'mobile',
    'tel',
    'line',
    'url',
    'link',
    'token',
    'secret',
    'raw',
    'payload'
];

class CompanyService {
    constructor(
        companyReader, companyWriter, contactReader, contactWriter,
        opportunityReader, opportunityWriter, interactionReader, interactionService,
        eventLogReader, systemReader, companySqlReader, contactService,
        companySqlWriter, // Inject SQL Writer (Phase 7 Requirement)
        eventLogSqlReader, // Inject SQL Reader (Phase 8 Requirement)
        contactSqlReader,       // [Phase 8.1 Requirement]
        opportunitySqlReader,   // [Phase 8.1 Requirement]
        interactionSqlReader    // [Phase 8.1 Requirement]
    ) {
        this.companyReader = companyReader;
        this.companyWriter = companyWriter;
        this.contactReader = contactReader;
        this.contactWriter = contactWriter;
        this.opportunityReader = opportunityReader;
        this.opportunityWriter = opportunityWriter;
        this.interactionReader = interactionReader;
        this.interactionService = interactionService;
        this.eventLogReader = eventLogReader;
        this.systemReader = systemReader;
        this.companySqlReader = companySqlReader;
        this.contactService = contactService; // Enabler for RAW logic routing
        this.companySqlWriter = companySqlWriter; 
        this.eventLogSqlReader = eventLogSqlReader; 
        
        // [Phase 8.1] New SQL Readers for fast detail lookup
        this.contactSqlReader = contactSqlReader;
        this.opportunitySqlReader = opportunitySqlReader;
        this.interactionSqlReader = interactionSqlReader;
    }

    // --- DTO Mapping (SQL-ready) ---

    _toServiceDTO(raw) {
        if (!raw) return null;

        return {
            companyId: raw.companyId || raw.company_id || '',
            companyName: raw.companyName || raw.company_name || '',
            phone: raw.phone || '',
            address: raw.address || '',
            county: raw.county || raw.city || '', 
            introduction: raw.introduction || raw.description || '', 
            companyType: raw.companyType || raw.company_type || '',
            customerStage: raw.customerStage || raw.customer_stage || '',
            engagementRating: raw.engagementRating || raw.interactionRating || '', 
            createdTime: raw.createdTime || raw.created_time || '',
            lastUpdateTime: raw.lastUpdateTime || raw.updatedTime || raw.updated_time || '',
            creator: raw.creator || raw.createdBy || raw.created_by || '',
            lastModifier: raw.lastModifier || raw.updatedBy || raw.updated_by || '',
            rowIndex: raw.rowIndex,
            lastActivity: raw.lastActivity || null,
            _hasNativeActivity: raw._hasNativeActivity || false
        };
    }

    async _getAllCompanies() {
        let companies = null;

        if (this.companySqlReader) {
            try {
                const sqlRaw = await this.companySqlReader.getCompanies();
                if (sqlRaw && Array.isArray(sqlRaw) && sqlRaw.length > 0) {
                    companies = sqlRaw.map(item => this._toServiceDTO(item));
                }
            } catch (error) {
                console.warn(`[CompanyService] SQL Read Failed, falling back: ${error.message}`);
            }
        }

        if (!companies) {
            try {
                // Safeguard: use SQL Reader if Legacy Reader is missing from Container
                const sheetRaw = this.companyReader ? await this.companyReader.getCompanyList() : await this.companySqlReader.getCompanies();
                companies = sheetRaw.map(item => this._toServiceDTO(item));
            } catch (sheetError) {
                console.error('[CompanyService] Sheet Read Failed:', sheetError);
                throw sheetError;
            }
        }

        return companies;
    }

    async _getCompanyById(companyId) {
        if (!companyId) return null;
        const companies = await this._getAllCompanies();
        return companies.find(c => c.companyId === companyId) || null;
    }

    async _getCompanyByName(companyName) {
        if (!companyName) return null;
        
        const companies = await this._getAllCompanies();
        const normalizedTarget = this._normalizeCompanyName(companyName);
        
        return companies.find(c => 
            this._normalizeCompanyName(c.companyName) === normalizedTarget
        ) || null;
    }

    _normalizeCompanyName(name) {
        if (!name) return '';
        return name.toLowerCase().trim()
            .replace(/股份有限公司|有限公司|公司/g, '')
            .replace(/\(.*\)/g, '')
            .trim();
    }

    _mergeCompanyContacts(...contactLists) {
        const map = new Map();
        contactLists.flat().filter(Boolean).forEach(contact => {
            map.set(contact.contactId || contact.contact_id || `${contact.name}-${contact.companyId}`, contact);
        });
        return Array.from(map.values()).sort((a, b) => {
            const timeB = new Date(b.updatedTime || b.updated_time || b.createdTime || b.created_time || 0).getTime();
            const timeA = new Date(a.updatedTime || a.updated_time || a.createdTime || a.created_time || 0).getTime();
            return timeB - timeA;
        });
    }

    async _logCompanyInteraction(companyId, title, summary, modifier) {
        try {
            if (this.interactionService && typeof this.interactionService.createInteraction === 'function') {
                await this.interactionService.createInteraction({
                    companyId: companyId,
                    eventType: '系統事件',
                    eventTitle: title,
                    contentSummary: summary,
                    recorder: modifier,
                    interactionTime: new Date().toISOString()
                }, { displayName: modifier });
            }
        } catch (logError) {
            console.warn(`[CompanyService] Log Interaction Error: ${logError.message}`);
        }
    }

    async _logCompanyAudit(event, auditContext = {}) {
        try {
            const auditLoggerService = auditContext.auditLoggerService;
            if (!auditLoggerService || typeof auditLoggerService.logMutation !== 'function') return;

            await auditLoggerService.logMutation({
                actor_username: auditContext.actor && auditContext.actor.username,
                actor_name: auditContext.actor && auditContext.actor.name,
                actor_role: auditContext.actor && auditContext.actor.role,
                session_id: auditContext.actor && auditContext.actor.sessionId,
                module: 'companies',
                action: event.action,
                target_type: 'company',
                target_id: event.targetId,
                target_label: event.targetLabel || null,
                event_title: event.eventTitle,
                event_summary: event.eventSummary,
                event_category: event.eventCategory,
                business_event_type: event.businessEventType,
                changes: event.changes || {},
                metadata: {
                    changed_fields: event.changedFields || [],
                    changed_field_labels: this._getChangedFieldLabels(event.changedFields || []),
                    source: 'companies',
                    audit_version: 'v1',
                    ...(event.metadata || {})
                },
                ip_address: auditContext.ipAddress || null,
                user_agent: auditContext.userAgent || null
            });
        } catch (auditError) {
            console.warn(`[CompanyService] System Audit Log Error: ${auditError.message}`);
        }
    }

    _getActorName(auditContext, fallback) {
        return (auditContext.actor && auditContext.actor.name) || fallback || 'System';
    }

    _getChangedFieldLabels(fields) {
        return fields.map(field => COMPANY_FIELD_LABELS[field] || field);
    }

    _getChangedFields(changes) {
        return Object.keys(changes || {});
    }

    _sanitizeCompanyAuditData(data = {}) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

        return Object.keys(data).reduce((sanitized, key) => {
            const value = data[key];
            const normalizedKey = String(key || '').toLowerCase();
            const isSensitiveField = COMPANY_AUDIT_SENSITIVE_PATTERNS.some(pattern => normalizedKey.includes(pattern));
            const isLongString = typeof value === 'string' && value.length > COMPANY_AUDIT_MAX_STRING_LENGTH;

            sanitized[key] = isSensitiveField || isLongString
                ? COMPANY_AUDIT_REDACTED_VALUE
                : value;

            return sanitized;
        }, {});
    }

    _buildCompanyAfterData(beforeData, updateData) {
        return {
            ...beforeData,
            ...updateData
        };
    }

    async createCompany(companyName, companyData, user, auditContext = {}) {
        try {
            const modifier = user.displayName || user.username || user || 'System';
            
            const existing = await this._getCompanyByName(companyName);
            if (existing) {
                return { 
                    success: true, 
                    id: existing.companyId, 
                    companyId: existing.companyId, 
                    companyName: existing.companyName, 
                    message: '公司已存在', 
                    existed: true,
                    data: existing
                };
            }

            const companyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            const dataToWrite = { 
                companyId: companyId,
                companyName: companyName, 
                ...companyData 
            };
            
            if (!this.companySqlWriter) throw new Error('CompanySqlWriter not injected');
            
            const result = await this.companySqlWriter.createCompany(dataToWrite, modifier);
            
            // [Phase A Patch] Create Interaction Log for New Company
            if (result && result.success) {
                await this._logCompanyInteraction(
                    companyId,
                    '建立公司',
                    `建立公司：「${companyName}」`,
                    modifier
                );
            }
            
            if (result && result.success) {
                const changes = buildChangedFieldsDiff({}, this._sanitizeCompanyAuditData(dataToWrite));
                const changedFields = this._getChangedFields(changes);
                await this._logCompanyAudit({
                    action: 'create',
                    targetId: companyId,
                    targetLabel: companyName,
                    eventTitle: '建立公司',
                    eventSummary: `${this._getActorName(auditContext, modifier)} 建立公司「${companyName}」`,
                    eventCategory: 'data_change',
                    businessEventType: 'company_created',
                    changes,
                    changedFields
                }, auditContext);
            }

            if (this.companyReader && this.companyReader.invalidateCache) {
                this.companyReader.invalidateCache('companyList');
            }
            
            return {
                ...result,
                companyId: companyId,
                companyName: companyName
            };
        } catch (error) {
            console.error('[CompanyService] Create Error:', error);
            throw error;
        }
    }

    async getCompanyListWithActivity(filters = {}) {
        try {
            let companies = await this._getAllCompanies();

            if (filters.q) {
                const q = filters.q.toLowerCase().trim();
                companies = companies.filter(c => 
                    (c.companyName || '').toLowerCase().includes(q) ||
                    (c.phone || '').includes(q) ||
                    (c.address || '').toLowerCase().includes(q) ||
                    (c.county || '').toLowerCase().includes(q) ||
                    (c.introduction || '').toLowerCase().includes(q)
                );
            }

            if (filters.type && filters.type !== 'all') {
                companies = companies.filter(c => c.companyType === filters.type);
            }
            if (filters.stage && filters.stage !== 'all') {
                companies = companies.filter(c => c.customerStage === filters.stage);
            }
            if (filters.rating && filters.rating !== 'all') {
                companies = companies.filter(c => c.engagementRating === filters.rating);
            }

            // Detect if the reader successfully used the v_companies_summary View
            const hasNativeActivity = companies.length > 0 && companies[0]._hasNativeActivity;

            // [PATCH Phase 11] Condition interactions/event_logs full fetch upon lack of Native Activity
            const [interactions, eventLogs, oppCompanyData] = await Promise.all([
                hasNativeActivity ? Promise.resolve([]) : this.interactionSqlReader.getInteractions(),
                hasNativeActivity ? Promise.resolve([]) : (this.eventLogSqlReader ? this.eventLogSqlReader.getEventLogs() : this.eventLogReader.getEventLogs()),
                this.opportunitySqlReader && typeof this.opportunitySqlReader.getAllOpportunityCompanyNames === 'function' 
                    ? this.opportunitySqlReader.getAllOpportunityCompanyNames() 
                    : Promise.resolve([])
            ]);

            const lastActivityMap = new Map();
            
            if (!hasNativeActivity) {
                const updateActivity = (companyId, dateStr) => {
                    if (!companyId || !dateStr) return;
                    const ts = new Date(dateStr).getTime();
                    if (isNaN(ts)) return;
                    const current = lastActivityMap.get(companyId) || 0;
                    if (ts > current) lastActivityMap.set(companyId, ts);
                };

                interactions.forEach(item => updateActivity(item.companyId, item.interactionTime || item.date));
                eventLogs.forEach(item => updateActivity(item.companyId, item.createdTime));
            }

            // Aggregate Opportunity Counts safely in Node.js memory
            const oppCountMap = new Map();
            (oppCompanyData || []).forEach(row => {
                if (row.customer_company) {
                    const normalized = this._normalizeCompanyName(row.customer_company);
                    oppCountMap.set(normalized, (oppCountMap.get(normalized) || 0) + 1);
                }
            });

            const result = companies.map(comp => {
                let lastTs = null;
                
                if (comp._hasNativeActivity && comp.lastActivity) {
                    lastTs = new Date(comp.lastActivity).getTime();
                } else {
                    lastTs = lastActivityMap.get(comp.companyId);
                    if (!lastTs && comp.createdTime) {
                        const createdTs = new Date(comp.createdTime).getTime();
                        if (!isNaN(createdTs)) lastTs = createdTs;
                    }
                }

                const normalizedCompName = this._normalizeCompanyName(comp.companyName);

                return {
                    ...comp,
                    opportunityCount: oppCountMap.get(normalizedCompName) || 0,
                    lastActivity: lastTs ? new Date(lastTs).toISOString() : null,
                    _sortTs: lastTs || 0
                };
            });

            result.sort((a, b) => b._sortTs - a._sortTs);
            
            // Clean up temporary internal flags before sending to controller/frontend
            return result.map(({ _sortTs, _hasNativeActivity, ...rest }) => rest);

        } catch (error) {
            console.error('[CompanyService] List Error:', error);
            try {
                const sheetRaw = this.companyReader ? await this.companyReader.getCompanyList() : await this.companySqlReader.getCompanies();
                return sheetRaw.map(item => this._toServiceDTO(item));
            } catch (fallbackError) {
                return [];
            }
        }
    }

    async getCompanyDetails(companyId) {
        try {
            const companyInfo = await this._getCompanyById(companyId);

            if (!companyInfo) {
                return { 
                    companyInfo: null, 
                    contacts: [], 
                    opportunities: [], 
                    potentialContacts: [],
                    interactions: [], 
                    eventLogs: [] 
                };
            }

            const companyName = companyInfo.companyName;
            const normalizedTarget = this._normalizeCompanyName(companyName);

            let sqlSuccess = false;
            let contacts = [], opportunities = [], interactions = [], eventLogs = [], potentialContacts = [];

            if (this.contactSqlReader && this.opportunitySqlReader && this.interactionSqlReader && this.eventLogSqlReader) {
                try {
                    const baseNormalized = companyName.replace(/股份有限公司|有限公司|公司/g, '').replace(/\(.*\)/g, '').trim();

                    const [sqlContacts, legacyNameContacts, sqlOppsRaw, sqlInteractionsComp, sqlEventLogs, allPotentialContacts] = await Promise.all([
                        this.contactSqlReader.getContactsByCompanyId(companyId),
                        companyName ? this.contactSqlReader.getContactsByCompanyId(companyName) : Promise.resolve([]),
                        this.opportunitySqlReader.getOpportunitiesByCompanyName(baseNormalized),
                        this.interactionSqlReader.getInteractionsByCompanyId(companyId),
                        this.eventLogSqlReader.getEventLogs(), 
                        this.contactService.getPotentialContacts(3000) // [PHASE 9.3] Semantic Fix: Explicitly explicitly route to RAW reader logic
                    ]);

                    opportunities = sqlOppsRaw.filter(o => 
                        this._normalizeCompanyName(o.customerCompany) === normalizedTarget
                    );
                    const relatedOppIds = new Set(opportunities.map(o => o.opportunityId));
                    const oppIdsArray = Array.from(relatedOppIds);
                    
                    const sqlInteractionsOpps = await this.interactionSqlReader.getInteractionsByOpportunityIds(oppIdsArray);

                    const interactionMap = new Map();
                    sqlInteractionsComp.forEach(i => interactionMap.set(i.interactionId, i));
                    sqlInteractionsOpps.forEach(i => interactionMap.set(i.interactionId, i));
                    interactions = Array.from(interactionMap.values())
                        .sort((a, b) => new Date(b.interactionTime || 0) - new Date(a.interactionTime || 0));

                    eventLogs = sqlEventLogs.filter(e => 
                        e.companyId === companyId
                    ).sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));

                    contacts = this._mergeCompanyContacts(sqlContacts, legacyNameContacts);
                    
                    potentialContacts = allPotentialContacts.filter(pc => 
                        this._normalizeCompanyName(pc.company) === normalizedTarget
                    );

                    sqlSuccess = true;
                } catch (sqlError) {
                    console.warn(`[CompanyService] SQL-first execution failed, triggering fallback: ${sqlError.message}`);
                    sqlSuccess = false;
                }
            }

            if (!sqlSuccess) {
                const [allContacts, allOpportunities, allInteractions, allEventLogs, allPotentialContacts] = await Promise.all([
                    this.contactSqlReader ? this.contactSqlReader.getContacts() : this.contactReader.getContactList(), // Safe generic extraction
                    this.opportunitySqlReader ? this.opportunitySqlReader.getOpportunities() : this.opportunityReader.getOpportunities(),
                    this.interactionSqlReader.getInteractions(),
                    this.eventLogSqlReader ? this.eventLogSqlReader.getEventLogs() : this.eventLogReader.getEventLogs(), 
                    this.contactService.getPotentialContacts(3000) // [PHASE 9.3] Semantic Fix
                ]);

                contacts = this._mergeCompanyContacts(allContacts.filter(c => c.companyId === companyId || c.companyId === companyName));
                
                opportunities = allOpportunities.filter(o => 
                    this._normalizeCompanyName(o.customerCompany) === normalizedTarget
                );
                const relatedOppIds = new Set(opportunities.map(o => o.opportunityId));
                
                interactions = allInteractions.filter(i => 
                    i.companyId === companyId || (i.opportunityId && relatedOppIds.has(i.opportunityId))
                ).sort((a, b) => new Date(b.interactionTime || 0) - new Date(a.interactionTime || 0));

                eventLogs = allEventLogs.filter(e => 
                    e.companyId === companyId
                ).sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));

                potentialContacts = allPotentialContacts.filter(pc => 
                    this._normalizeCompanyName(pc.company) === normalizedTarget
                );
            }

            return { companyInfo, contacts, opportunities, potentialContacts, interactions, eventLogs };

        } catch (error) {
            console.error(`[CompanyService] Details Error (${companyId}):`, error);
            throw error;
        }
    }

    async updateCompany(companyId, updateData, user, auditContext = {}) {
        try {
            const modifier = user.displayName || user.username || 'System';
            
            const companyInfo = await this._getCompanyById(companyId);
            if (!companyInfo) throw new Error(`找不到公司 ID: ${companyId}`);

            const result = await this.companySqlWriter.updateCompany(companyInfo.companyId, updateData, modifier);

            if (result && result.success) {
                const afterData = this._buildCompanyAfterData(companyInfo, updateData);
                const changes = buildChangedFieldsDiff(
                    this._sanitizeCompanyAuditData(companyInfo),
                    this._sanitizeCompanyAuditData(afterData)
                );
                const changedFields = this._getChangedFields(changes);
                await this._logCompanyAudit({
                    action: 'update',
                    targetId: companyInfo.companyId,
                    targetLabel: afterData.companyName || companyInfo.companyName,
                    eventTitle: '更新公司資料',
                    eventSummary: `${this._getActorName(auditContext, modifier)} 更新公司「${afterData.companyName || companyInfo.companyName}」的資料`,
                    eventCategory: 'data_change',
                    businessEventType: 'company_updated',
                    changes,
                    changedFields
                }, auditContext);
            }
            
            await this._logCompanyInteraction(companyInfo.companyId, '資料更新', `公司資料已更新。`, modifier);
            
            if (this.companyReader && this.companyReader.invalidateCache) {
                this.companyReader.invalidateCache('companyList');
            }

            return result;
        } catch (error) {
            console.error('[CompanyService] Update Error:', error);
            throw error;
        }
    }

    async deleteCompany(companyId, user, auditContext = {}) {
        try {
            const companyInfo = await this._getCompanyById(companyId);
            if (!companyInfo) throw new Error(`找不到公司 ID: ${companyId}`);

            const companyName = companyInfo.companyName;
            
            // Safe fallback
            const opps = this.opportunitySqlReader ? await this.opportunitySqlReader.getOpportunities() : await this.opportunityReader.getOpportunities();
            const relatedOpps = opps.filter(o => 
                this._normalizeCompanyName(o.customerCompany) === this._normalizeCompanyName(companyName)
            );
            
            if (relatedOpps.length > 0) {
                throw new Error(`無法刪除：尚有 ${relatedOpps.length} 個關聯機會案件 (例如: ${relatedOpps[0].opportunityName})。請先移除關聯案件。`);
            }

            const result = await this.companySqlWriter.deleteCompany(companyInfo.companyId);

            if (result && result.success) {
                await this._logCompanyAudit({
                    action: 'delete',
                    targetId: companyInfo.companyId,
                    targetLabel: companyName,
                    eventTitle: '刪除公司',
                    eventSummary: `${this._getActorName(auditContext, user && (user.displayName || user.username))} 刪除公司「${companyName}」`,
                    eventCategory: 'delete',
                    businessEventType: 'company_deleted',
                    changes: {
                        deleted: {
                            before: false,
                            after: true
                        }
                    },
                    changedFields: ['deleted']
                }, auditContext);
            }
            
            if (this.companyReader && this.companyReader.invalidateCache) {
                this.companyReader.invalidateCache('companyList');
            }

            return result;
        } catch (error) {
            console.error('[CompanyService] Delete Error:', error);
            throw error;
        }
    }
}

module.exports = CompanyService;
