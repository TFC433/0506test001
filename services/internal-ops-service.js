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

    async createDevProject(data) {
        if (!data.productName) throw new Error('productName required');
        if (!data.projectName) throw new Error('projectName required');

        const allData = await this.reader.getDevProjects();
        const newId = this._generateId('DEV', allData, 'devId');
        const now = new Date().toISOString();
        
        const newRow = [
            newId, data.productCode || '', data.productName || '', data.projectName || '',
            data.featureName || '', data.assigneeCode || '', data.assigneeName || '',
            data.collaborators || '', data.devStage || '', data.status || '',
            data.progress || '', data.priority || '', data.startDate || '',
            data.estCompletionDate || '', data.actualCompletionDate || '',
            data.dependencies || '', data.notes || '', now, 'TRUE', data.sortOrder || 999
        ];
        
        await this.writer.appendRow(this.config.SHEETS.DEV_PROJECTS, newRow);
        this.reader.invalidateCache('devProjects');
        return { success: true, id: newId };
    }

    async updateDevProject(devId, data) {
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
            data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder
        ];

        await this.writer.updateRow(this.config.SHEETS.DEV_PROJECTS, existing.rowIndex, updatedRow, 'T');
        this.reader.invalidateCache('devProjects');
        return { success: true };
    }

    async deleteDevProject(devId) {
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
            existing.dependencies, existing.notes, now, 'FALSE', existing.sortOrder
        ];

        await this.writer.updateRow(this.config.SHEETS.DEV_PROJECTS, existing.rowIndex, updatedRow, 'T');
        this.reader.invalidateCache('devProjects');
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