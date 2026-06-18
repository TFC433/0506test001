/**
 * services/internal-ops-service.js
 * 內部運營與進度追蹤 Service
 * @version 1.0.1
 * @date 2026-04-20
 * @changelog
 * - [1.0.1] Added validation checks for creation methods
 * - [1.0.1] Added race condition warning for ID generation
 * @description 提供進度追蹤的業務邏輯處理，不處理任何發信與排程
 */

const { buildChangedFieldsDiff } = require('../utils/audit-helpers');

const DEV_PROJECT_FIELD_LABELS = {
    productName: '開發案名稱',
    caseName: '開發案名稱',
    status: '狀態',
    caseStatus: '狀態',
    progress: '進度',
    productCode: '開發案分類',
    caseCategory: '開發案分類',
    assigneeName: '主要負責人',
    ownerName: '主要負責人',
    collaborators: '協作者',
    devStage: '開發階段',
    caseStage: '開發階段',
    featureName: '關聯功能',
    relatedFeature: '關聯功能',
    startDate: '開始日期',
    estCompletionDate: '預計完成日',
    actualCompletionDate: '實際完成日',
    dependencies: '父層關聯',
    parentDevId: '父層關聯',
    projectName: '關聯機會',
    opportunityName: '關聯機會',
    assigneeCode: '關聯機會 ID',
    opportunityId: '關聯機會 ID',
    caseRelationType: '關聯類型',
    priority: '優先級',
    notes: '備註',
    isActive: '啟用狀態'
};

const DEV_PROJECT_REDACTED_VALUE = '[REDACTED]';
const DEV_PROJECT_AUDIT_FIELDS = [
    'productCode',
    'productName',
    'projectName',
    'featureName',
    'assigneeCode',
    'assigneeName',
    'collaborators',
    'devStage',
    'status',
    'progress',
    'priority',
    'startDate',
    'estCompletionDate',
    'actualCompletionDate',
    'dependencies',
    'notes',
    'isActive',
    'caseRelationType'
];

class InternalOpsService {
    constructor(reader, writer, config) {
        this.reader = reader;
        this.writer = writer;
        this.config = config;
    }

    // NOTE:
    // This ID generation method may have race conditions under concurrent writes.
    // Acceptable for Phase 1 (internal ops usage).
    // Future improvement: switch to timestamp-based or UUID strategy.
    _generateId(prefix, existingData, idField) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const targetPrefix = `${prefix}_${dateStr}_`;
        const todaysItems = existingData.filter(item => item[idField] && item[idField].startsWith(targetPrefix));
        
        let maxCount = 0;
        todaysItems.forEach(item => {
            const parts = item[idField].split('_');
            if (parts.length === 3) {
                const count = parseInt(parts[2], 10);
                if (!isNaN(count) && count > maxCount) {
                    maxCount = count;
                }
            }
        });
        const nextCount = String(maxCount + 1).padStart(3, '0');
        return `${targetPrefix}${nextCount}`;
    }

    _sortData(data) {
        return data.filter(d => d.isActive).sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return new Date(b.updateTime) - new Date(a.updateTime);
        });
    }

    _getAuditActorName(auditContext = {}) {
        return (auditContext.actor && auditContext.actor.name) || 'System';
    }

    _buildDevProjectTargetLabel(data = {}) {
        return data.productName || data.caseName || data.featureName || data.relatedFeature ||
            data.projectName || data.opportunityName || data.devId || '內部開發案';
    }

    _sanitizeDevProjectAuditData(data = {}) {
        return Object.keys(data || {}).reduce((sanitized, key) => {
            const normalized = String(key || '').toLowerCase();
            const value = data[key];
            const stringValue = typeof value === 'string' ? value : '';
            const isSensitive = normalized.includes('notes') ||
                normalized.includes('description') ||
                normalized.includes('detail') ||
                normalized.includes('comment') ||
                normalized.includes('email') ||
                normalized.includes('phone') ||
                normalized.includes('url') ||
                normalized.includes('token') ||
                normalized.includes('raw') ||
                (normalized === 'collaborators' && (stringValue.includes('@') || /\d{8,}/.test(stringValue)));
            sanitized[key] = isSensitive ? DEV_PROJECT_REDACTED_VALUE : value;
            return sanitized;
        }, {});
    }

    _getDevProjectFieldLabels(fields = []) {
        return fields.map(field => DEV_PROJECT_FIELD_LABELS[field] || field);
    }

    _isArchivedStatus(status) {
        const normalized = String(status || '').toLowerCase();
        return normalized.includes('archive') || normalized.includes('封存') || normalized.includes('撠');
    }

    _isCompletedStatus(status, progress) {
        const normalizedStatus = String(status || '').toLowerCase();
        const normalizedProgress = String(progress || '').trim();
        return normalizedProgress === '100%' ||
            normalizedProgress === '100' ||
            normalizedStatus.includes('complete') ||
            normalizedStatus.includes('完成') ||
            normalizedStatus.includes('撌脣');
    }

    _detectDevProjectEvents(beforeData = {}, afterData = {}) {
        const detectedEvents = [];
        const changed = field => beforeData[field] !== afterData[field];
        const wasArchived = this._isArchivedStatus(beforeData.status);
        const isArchived = this._isArchivedStatus(afterData.status);
        const wasCompleted = this._isCompletedStatus(beforeData.status, beforeData.progress);
        const isCompleted = this._isCompletedStatus(afterData.status, afterData.progress);

        if (!wasArchived && isArchived) detectedEvents.push('archived');
        if (wasArchived && !isArchived) detectedEvents.push('unarchived');
        if (!wasCompleted && isCompleted) detectedEvents.push('completed');
        if (changed('status')) detectedEvents.push('status_changed');
        if (changed('progress')) detectedEvents.push('progress_changed');
        if (changed('assigneeName') || changed('ownerName')) detectedEvents.push('owner_changed');
        if (changed('collaborators')) detectedEvents.push('collaborators_changed');
        if (changed('startDate') || changed('estCompletionDate') || changed('actualCompletionDate')) detectedEvents.push('dates_changed');
        if (changed('productCode') || changed('caseCategory')) detectedEvents.push('category_changed');
        if (changed('priority')) detectedEvents.push('priority_changed');
        if (changed('dependencies') || changed('parentDevId')) detectedEvents.push('parent_changed');
        if (changed('assigneeCode') || changed('opportunityId') || changed('projectName') || changed('opportunityName')) {
            detectedEvents.push('opportunity_link_changed');
        }
        if (changed('notes')) detectedEvents.push('notes_changed');

        return detectedEvents.length > 0 ? detectedEvents : ['updated'];
    }

    _selectDevProjectPrimaryAuditEvent(detectedEvents = [], actorName, targetLabel) {
        const mappings = [
            ['archived', {
                action: 'archive',
                businessEventType: 'dev_project_archived',
                eventTitle: '封存內部開發案',
                eventSummary: `${actorName} 封存內部開發案「${targetLabel}」`,
                eventCategory: 'archive'
            }],
            ['unarchived', {
                action: 'unarchive',
                businessEventType: 'dev_project_unarchived',
                eventTitle: '解除封存內部開發案',
                eventSummary: `${actorName} 解除封存內部開發案「${targetLabel}」`,
                eventCategory: 'archive'
            }],
            ['completed', {
                action: 'complete',
                businessEventType: 'dev_project_completed',
                eventTitle: '完成內部開發案',
                eventSummary: `${actorName} 完成內部開發案「${targetLabel}」`,
                eventCategory: 'status_change'
            }],
            ['status_changed', {
                action: 'update',
                businessEventType: 'dev_project_status_changed',
                eventTitle: '更新內部開發案狀態',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」狀態`,
                eventCategory: 'status_change'
            }],
            ['progress_changed', {
                action: 'update',
                businessEventType: 'dev_project_progress_changed',
                eventTitle: '更新內部開發案進度',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」進度`,
                eventCategory: 'progress_change'
            }],
            ['owner_changed', {
                action: 'update',
                businessEventType: 'dev_project_owner_changed',
                eventTitle: '更新內部開發案負責人',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」負責人`,
                eventCategory: 'assignment_change'
            }],
            ['collaborators_changed', {
                action: 'update',
                businessEventType: 'dev_project_collaborators_changed',
                eventTitle: '更新內部開發案協作者',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」協作者`,
                eventCategory: 'assignment_change'
            }],
            ['dates_changed', {
                action: 'update',
                businessEventType: 'dev_project_dates_changed',
                eventTitle: '更新內部開發案日期',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」日期`,
                eventCategory: 'schedule_change'
            }],
            ['opportunity_link_changed', {
                action: 'update',
                businessEventType: 'dev_project_opportunity_link_changed',
                eventTitle: '更新內部開發案關聯機會',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」關聯機會`,
                eventCategory: 'relationship_change'
            }],
            ['parent_changed', {
                action: 'update',
                businessEventType: 'dev_project_parent_changed',
                eventTitle: '更新內部開發案父層關聯',
                eventSummary: `${actorName} 更新內部開發案「${targetLabel}」父層關聯`,
                eventCategory: 'relationship_change'
            }]
        ];

        const selected = mappings.find(([eventName]) => detectedEvents.includes(eventName));
        return selected ? selected[1] : {
            action: 'update',
            businessEventType: 'dev_project_updated',
            eventTitle: '編輯內部開發案',
            eventSummary: `${actorName} 編輯內部開發案「${targetLabel}」`,
            eventCategory: 'business_event'
        };
    }

    _buildDevProjectAuditMetadata(data = {}, changedFields = [], detectedEvents = [], extra = {}) {
        return {
            source: 'internal_ops_dev_projects',
            audit_version: 'v1',
            detected_events: detectedEvents,
            changed_fields: changedFields,
            changed_field_labels: this._getDevProjectFieldLabels(changedFields),
            related_opportunity_id: data.opportunityId || data.assigneeCode || null,
            related_opportunity_label: data.opportunityName || data.projectName || null,
            parent_dev_project_id: data.parentDevId || data.dependencies || null,
            case_category: data.caseCategory || data.productCode || null,
            case_stage: data.caseStage || data.devStage || null,
            owner_name: data.ownerName || data.assigneeName || null,
            ...extra
        };
    }

    async _logDevProjectAudit(event, auditContext = {}) {
        try {
            const auditLoggerService = auditContext.auditLoggerService;
            if (!auditLoggerService || typeof auditLoggerService.logMutation !== 'function') return;

            await auditLoggerService.logMutation({
                actor_username: auditContext.actor && auditContext.actor.username,
                actor_name: auditContext.actor && auditContext.actor.name,
                actor_role: auditContext.actor && auditContext.actor.role,
                session_id: auditContext.actor && auditContext.actor.sessionId,
                module: 'internal_ops',
                action: event.action,
                target_type: 'dev_project',
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
            console.warn(`[InternalOpsService] DevProject Audit Log Error: ${auditError.message}`);
        }
    }

    // ==========================================
    // 團隊成員負荷 (Team Workload)
    // ==========================================
    async getTeamWorkloads() {
        const data = await this.reader.getTeamWorkloads();
        return this._sortData(data);
    }

    async createTeamWorkload(data) {
        if (!data.memberName) throw new Error('memberName required');
        if (!data.taskTitle) throw new Error('taskTitle required');

        const allData = await this.reader.getTeamWorkloads();
        const newId = this._generateId('WORK', allData, 'workId');
        const now = new Date().toISOString();
        
        const newRow = [
            newId, data.memberCode || '', data.memberName || '', data.team || '',
            data.taskTitle || '', data.taskType || '', data.relatedOpp || '',
            data.priority || '', data.status || '', data.progress || '',
            data.startDate || '', data.dueDate || '', data.notes || '',
            now, 'TRUE', data.sortOrder || 999
        ];
        
        await this.writer.appendRow(this.config.SHEETS.TEAM_WORKLOAD, newRow);
        this.reader.invalidateCache('teamWorkload');
        return { success: true, id: newId };
    }

    async updateTeamWorkload(workId, data) {
        const allData = await this.reader.getTeamWorkloads();
        const existing = allData.find(d => d.workId === workId);
        if (!existing) throw new Error('找不到指定的資料');
        
        const now = new Date().toISOString();
        const updatedRow = [
            existing.workId,
            data.memberCode !== undefined ? data.memberCode : existing.memberCode,
            data.memberName !== undefined ? data.memberName : existing.memberName,
            data.team !== undefined ? data.team : existing.team,
            data.taskTitle !== undefined ? data.taskTitle : existing.taskTitle,
            data.taskType !== undefined ? data.taskType : existing.taskType,
            data.relatedOpp !== undefined ? data.relatedOpp : existing.relatedOpp,
            data.priority !== undefined ? data.priority : existing.priority,
            data.status !== undefined ? data.status : existing.status,
            data.progress !== undefined ? data.progress : existing.progress,
            data.startDate !== undefined ? data.startDate : existing.startDate,
            data.dueDate !== undefined ? data.dueDate : existing.dueDate,
            data.notes !== undefined ? data.notes : existing.notes,
            now,
            existing.isActive ? 'TRUE' : 'FALSE',
            data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder
        ];

        await this.writer.updateRow(this.config.SHEETS.TEAM_WORKLOAD, existing.rowIndex, updatedRow, 'P');
        this.reader.invalidateCache('teamWorkload');
        return { success: true };
    }

    async deleteTeamWorkload(workId) {
        const allData = await this.reader.getTeamWorkloads();
        const existing = allData.find(d => d.workId === workId);
        if (!existing) throw new Error('找不到指定的資料');
        
        const now = new Date().toISOString();
        const updatedRow = [
            existing.workId, existing.memberCode, existing.memberName, existing.team,
            existing.taskTitle, existing.taskType, existing.relatedOpp, existing.priority,
            existing.status, existing.progress, existing.startDate, existing.dueDate,
            existing.notes, now, 'FALSE', existing.sortOrder
        ];

        await this.writer.updateRow(this.config.SHEETS.TEAM_WORKLOAD, existing.rowIndex, updatedRow, 'P');
        this.reader.invalidateCache('teamWorkload');
        return { success: true };
    }

    // ==========================================
    // 開發案件追蹤 (Dev Projects)
    // ==========================================
    async getDevProjects() {
        const data = await this.reader.getDevProjects();
        return this._sortData(data);
    }

    async createDevProject(data, auditContext = {}) {
        if (!data.productName) throw new Error('productName required');

        const allData = await this.reader.getDevProjects();
        const newId = this._generateId('DEV', allData, 'devId');
        const now = new Date().toISOString();
        
        const newRow = [
            newId, data.productCode || '', data.productName || '', data.projectName || '',
            data.featureName || '', data.assigneeCode || '', data.assigneeName || '',
            data.collaborators || '', data.devStage || '', data.status || '',
            data.progress || '', data.priority || '', data.startDate || '',
            data.estCompletionDate || '', data.actualCompletionDate || '',
            data.dependencies || '', data.notes || '', now, 'TRUE', data.sortOrder || 999,
            data.caseRelationType || ''
        ];
        
        await this.writer.appendRow(this.config.SHEETS.DEV_PROJECTS, newRow);
        this.reader.invalidateCache('devProjects');
        const afterData = {
            devId: newId,
            productCode: data.productCode || '',
            caseCategory: data.productCode || '',
            productName: data.productName || '',
            caseName: data.productName || '',
            projectName: data.projectName || '',
            opportunityName: data.projectName || '',
            featureName: data.featureName || '',
            relatedFeature: data.featureName || '',
            assigneeCode: data.assigneeCode || '',
            opportunityId: data.assigneeCode || '',
            assigneeName: data.assigneeName || '',
            ownerName: data.assigneeName || '',
            collaborators: data.collaborators || '',
            devStage: data.devStage || '',
            caseStage: data.devStage || '',
            status: data.status || '',
            caseStatus: data.status || '',
            progress: data.progress || '',
            priority: data.priority || '',
            startDate: data.startDate || '',
            estCompletionDate: data.estCompletionDate || '',
            actualCompletionDate: data.actualCompletionDate || '',
            dependencies: data.dependencies || '',
            parentDevId: data.dependencies || '',
            notes: data.notes || '',
            updateTime: now,
            isActive: true,
            sortOrder: data.sortOrder || 999,
            caseRelationType: data.caseRelationType || ''
        };
        const changes = buildChangedFieldsDiff({}, this._sanitizeDevProjectAuditData(afterData), {
            fields: DEV_PROJECT_AUDIT_FIELDS
        });
        const changedFields = Object.keys(changes);
        const targetLabel = this._buildDevProjectTargetLabel(afterData);
        const actorName = this._getAuditActorName(auditContext);

        await this._logDevProjectAudit({
            action: 'create',
            targetId: newId,
            targetLabel,
            eventTitle: '建立內部開發案',
            eventSummary: `${actorName} 建立內部開發案「${targetLabel}」`,
            eventCategory: 'business_event',
            businessEventType: 'dev_project_created',
            changes,
            metadata: this._buildDevProjectAuditMetadata(afterData, changedFields, ['created'])
        }, auditContext);

        return { success: true, id: newId };
    }

    async updateDevProject(devId, data, auditContext = {}) {
        const allData = await this.reader.getDevProjects();
        const existing = allData.find(d => d.devId === devId);
        if (!existing) throw new Error('找不到指定的資料');
        
        const now = new Date().toISOString();
        const updatedRow = [
            existing.devId,
            data.productCode !== undefined ? data.productCode : existing.productCode,
            data.productName !== undefined ? data.productName : existing.productName,
            data.projectName !== undefined ? data.projectName : existing.projectName,
            data.featureName !== undefined ? data.featureName : existing.featureName,
            data.assigneeCode !== undefined ? data.assigneeCode : existing.assigneeCode,
            data.assigneeName !== undefined ? data.assigneeName : existing.assigneeName,
            data.collaborators !== undefined ? data.collaborators : existing.collaborators,
            data.devStage !== undefined ? data.devStage : existing.devStage,
            data.status !== undefined ? data.status : existing.status,
            data.progress !== undefined ? data.progress : existing.progress,
            data.priority !== undefined ? data.priority : existing.priority,
            data.startDate !== undefined ? data.startDate : existing.startDate,
            data.estCompletionDate !== undefined ? data.estCompletionDate : existing.estCompletionDate,
            data.actualCompletionDate !== undefined ? data.actualCompletionDate : existing.actualCompletionDate,
            data.dependencies !== undefined ? data.dependencies : existing.dependencies,
            data.notes !== undefined ? data.notes : existing.notes,
            now,
            existing.isActive ? 'TRUE' : 'FALSE',
            data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder,
            data.caseRelationType !== undefined ? data.caseRelationType : existing.caseRelationType
        ];

        await this.writer.updateRow(this.config.SHEETS.DEV_PROJECTS, existing.rowIndex, updatedRow, 'U');
        this.reader.invalidateCache('devProjects');
        const afterData = {
            ...existing,
            productCode: data.productCode !== undefined ? data.productCode : existing.productCode,
            caseCategory: data.productCode !== undefined ? data.productCode : existing.caseCategory,
            productName: data.productName !== undefined ? data.productName : existing.productName,
            caseName: data.productName !== undefined ? data.productName : existing.caseName,
            projectName: data.projectName !== undefined ? data.projectName : existing.projectName,
            opportunityName: data.projectName !== undefined ? data.projectName : existing.opportunityName,
            featureName: data.featureName !== undefined ? data.featureName : existing.featureName,
            relatedFeature: data.featureName !== undefined ? data.featureName : existing.relatedFeature,
            assigneeCode: data.assigneeCode !== undefined ? data.assigneeCode : existing.assigneeCode,
            opportunityId: data.assigneeCode !== undefined ? data.assigneeCode : existing.opportunityId,
            assigneeName: data.assigneeName !== undefined ? data.assigneeName : existing.assigneeName,
            ownerName: data.assigneeName !== undefined ? data.assigneeName : existing.ownerName,
            collaborators: data.collaborators !== undefined ? data.collaborators : existing.collaborators,
            devStage: data.devStage !== undefined ? data.devStage : existing.devStage,
            caseStage: data.devStage !== undefined ? data.devStage : existing.caseStage,
            status: data.status !== undefined ? data.status : existing.status,
            caseStatus: data.status !== undefined ? data.status : existing.caseStatus,
            progress: data.progress !== undefined ? data.progress : existing.progress,
            priority: data.priority !== undefined ? data.priority : existing.priority,
            startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
            estCompletionDate: data.estCompletionDate !== undefined ? data.estCompletionDate : existing.estCompletionDate,
            actualCompletionDate: data.actualCompletionDate !== undefined ? data.actualCompletionDate : existing.actualCompletionDate,
            dependencies: data.dependencies !== undefined ? data.dependencies : existing.dependencies,
            parentDevId: data.dependencies !== undefined ? data.dependencies : existing.parentDevId,
            notes: data.notes !== undefined ? data.notes : existing.notes,
            updateTime: now,
            isActive: existing.isActive,
            sortOrder: data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder,
            caseRelationType: data.caseRelationType !== undefined ? data.caseRelationType : existing.caseRelationType
        };
        const changes = buildChangedFieldsDiff(
            this._sanitizeDevProjectAuditData(existing),
            this._sanitizeDevProjectAuditData(afterData),
            { fields: DEV_PROJECT_AUDIT_FIELDS }
        );
        const changedFields = Object.keys(changes);

        if (changedFields.length > 0) {
            const detectedEvents = this._detectDevProjectEvents(existing, afterData);
            const targetLabel = this._buildDevProjectTargetLabel(afterData);
            const actorName = this._getAuditActorName(auditContext);
            const primaryEvent = this._selectDevProjectPrimaryAuditEvent(detectedEvents, actorName, targetLabel);

            await this._logDevProjectAudit({
                ...primaryEvent,
                targetId: devId,
                targetLabel,
                changes,
                metadata: this._buildDevProjectAuditMetadata(afterData, changedFields, detectedEvents)
            }, auditContext);
        }

        return { success: true };
    }

    async deleteDevProject(devId, auditContext = {}) {
        const allData = await this.reader.getDevProjects();
        const existing = allData.find(d => d.devId === devId);
        if (!existing) throw new Error('找不到指定的資料');
        
        const now = new Date().toISOString();
        const updatedRow = [
            existing.devId, existing.productCode, existing.productName, existing.projectName,
            existing.featureName, existing.assigneeCode, existing.assigneeName,
            existing.collaborators, existing.devStage, existing.status,
            existing.progress, existing.priority, existing.startDate,
            existing.estCompletionDate, existing.actualCompletionDate,
            existing.dependencies, existing.notes, now, 'FALSE', existing.sortOrder,
            existing.caseRelationType
        ];

        await this.writer.updateRow(this.config.SHEETS.DEV_PROJECTS, existing.rowIndex, updatedRow, 'U');
        this.reader.invalidateCache('devProjects');
        const afterData = {
            ...existing,
            updateTime: now,
            isActive: false
        };
        const changes = buildChangedFieldsDiff(
            { isActive: existing.isActive },
            { isActive: false }
        );
        const changedFields = Object.keys(changes);
        const targetLabel = this._buildDevProjectTargetLabel(existing);
        const actorName = this._getAuditActorName(auditContext);

        await this._logDevProjectAudit({
            action: 'delete',
            targetId: devId,
            targetLabel,
            eventTitle: '刪除內部開發案',
            eventSummary: `${actorName} 刪除內部開發案「${targetLabel}」`,
            eventCategory: 'delete',
            businessEventType: 'dev_project_deleted',
            changes: {
                ...changes,
                soft_deleted: {
                    before: false,
                    after: true
                }
            },
            metadata: this._buildDevProjectAuditMetadata(afterData, [...changedFields, 'soft_deleted'], ['deleted'], {
                delete_type: 'soft_delete'
            })
        }, auditContext);

        return { success: true };
    }

    // ==========================================
    // 訂閱制管理 (Subscription Ops)
    // ==========================================
    async getSubscriptions() {
        const data = await this.reader.getSubscriptions();
        return this._sortData(data);
    }

    async createSubscription(data) {
        if (!data.customerName) throw new Error('customerName required');
        if (!data.productName) throw new Error('productName required');

        const allData = await this.reader.getSubscriptions();
        const newId = this._generateId('SUB', allData, 'subId');
        const now = new Date().toISOString();
        
        const newRow = [
            newId, data.customerName || '', data.companyName || '', data.productName || '',
            data.planName || '', data.assigneeCode || '', data.assigneeName || '',
            data.subStatus || '', data.startDate || '', data.renewalDate || '',
            data.nextActionDate || '', data.msgStage || '', data.msgStatus || '',
            data.emailStatus || '', data.lastContactDate || '', data.nextActionNotes || '',
            data.internalNotes || '', now, 'TRUE', data.sortOrder || 999
        ];
        
        await this.writer.appendRow(this.config.SHEETS.SUBSCRIPTION_OPS, newRow);
        this.reader.invalidateCache('subscriptionOps');
        return { success: true, id: newId };
    }

    async updateSubscription(subId, data) {
        const allData = await this.reader.getSubscriptions();
        const existing = allData.find(d => d.subId === subId);
        if (!existing) throw new Error('找不到指定的資料');
        
        const now = new Date().toISOString();
        const updatedRow = [
            existing.subId,
            data.customerName !== undefined ? data.customerName : existing.customerName,
            data.companyName !== undefined ? data.companyName : existing.companyName,
            data.productName !== undefined ? data.productName : existing.productName,
            data.planName !== undefined ? data.planName : existing.planName,
            data.assigneeCode !== undefined ? data.assigneeCode : existing.assigneeCode,
            data.assigneeName !== undefined ? data.assigneeName : existing.assigneeName,
            data.subStatus !== undefined ? data.subStatus : existing.subStatus,
            data.startDate !== undefined ? data.startDate : existing.startDate,
            data.renewalDate !== undefined ? data.renewalDate : existing.renewalDate,
            data.nextActionDate !== undefined ? data.nextActionDate : existing.nextActionDate,
            data.msgStage !== undefined ? data.msgStage : existing.msgStage,
            data.msgStatus !== undefined ? data.msgStatus : existing.msgStatus,
            data.emailStatus !== undefined ? data.emailStatus : existing.emailStatus,
            data.lastContactDate !== undefined ? data.lastContactDate : existing.lastContactDate,
            data.nextActionNotes !== undefined ? data.nextActionNotes : existing.nextActionNotes,
            data.internalNotes !== undefined ? data.internalNotes : existing.internalNotes,
            now,
            existing.isActive ? 'TRUE' : 'FALSE',
            data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder
        ];

        await this.writer.updateRow(this.config.SHEETS.SUBSCRIPTION_OPS, existing.rowIndex, updatedRow, 'T');
        this.reader.invalidateCache('subscriptionOps');
        return { success: true };
    }

    async deleteSubscription(subId) {
        const allData = await this.reader.getSubscriptions();
        const existing = allData.find(d => d.subId === subId);
        if (!existing) throw new Error('找不到指定的資料');
        
        const now = new Date().toISOString();
        const updatedRow = [
            existing.subId, existing.customerName, existing.companyName, existing.productName,
            existing.planName, existing.assigneeCode, existing.assigneeName,
            existing.subStatus, existing.startDate, existing.renewalDate,
            existing.nextActionDate, existing.msgStage, existing.msgStatus,
            existing.emailStatus, existing.lastContactDate, existing.nextActionNotes,
            existing.internalNotes, now, 'FALSE', existing.sortOrder
        ];

        await this.writer.updateRow(this.config.SHEETS.SUBSCRIPTION_OPS, existing.rowIndex, updatedRow, 'T');
        this.reader.invalidateCache('subscriptionOps');
        return { success: true };
    }
}

module.exports = InternalOpsService;
