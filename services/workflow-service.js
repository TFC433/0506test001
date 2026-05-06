// tfc433/0223test1/0223test1-584de97d07459a200b448fe0cbaa3539c82ff945/services/workflow-service.js

/**
 * services/workflow-service.js
 * 工作流程服務
 * * @version 5.0.2 (Phase 5 Refactoring - Full Modal Creation Bridge & Naming Fix)
 * @date 2026-03-13
 * @description 負責處理跨模組的複雜業務流程，例如「機會轉訂單」、「聯絡人升級」等。
 * 依賴注入：OpportunityService, InteractionService, ContactService
 */

class WorkflowService {
    /**
     * @param {OpportunityService} opportunityService
     * @param {InteractionService} interactionService
     * @param {ContactService} contactService
     */
    constructor(opportunityService, interactionService, contactService) {
        this.opportunityService = opportunityService;
        this.interactionService = interactionService;
        this.contactService = contactService;
    }

    /**
     * [Phase 8 Bridge] 處理一般機會建立 (支援 Wizard 'old' 與 'new' 路徑)
     * 接收 OpportunityController 的請求並委派給核心 Service
     * @param {Object} opportunityData 
     * @param {string|Object} user 
     */
    async createOpportunity(opportunityData, user) {
        try {
            // Controller (req.user.name) 傳入字串，但核心 Service 預期 { displayName } 物件
            const modifierObj = typeof user === 'string' ? { displayName: user } : (user || { displayName: 'System' });
            
            const result = await this.opportunityService.createOpportunity(opportunityData, modifierObj);
            return result;
        } catch (error) {
            console.error('[WorkflowService] createOpportunity Error:', error);
            throw error;
        }
    }

    /**
     * 執行機會案件結案流程
     * @param {string} opportunityId 
     * @param {string} result - 'Won' | 'Lost'
     * @param {Object} user 
     */
    async closeOpportunity(opportunityId, result, user) {
        try {
            const status = result === 'Won' ? '已成交' : '已結案(失敗)';
            
            // 1. 更新機會狀態
            await this.opportunityService.updateOpportunity(
                opportunityId, 
                { currentStatus: '已完成', currentStage: status }, 
                user
            );

            // 2. 自動建立結案互動紀錄
            await this.interactionService.createInteraction({
                opportunityId: opportunityId,
                eventTitle: `[系統自動] 機會結案 - ${result}`,
                eventType: '系統紀錄',
                contentSummary: `使用者 ${user.displayName} 將此機會標記為 ${result}。`,
                interactionTime: new Date().toISOString()
            }, user);

            return { success: true, message: `機會已結案 (${result})` };
        } catch (error) {
            console.error('[WorkflowService] closeOpportunity Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 8 Bridge] 適配 ContactController.upgradeContact 的呼叫 (Wizard 'card' 路徑)
     * 將潛在客戶升級為正式聯絡人與機會
     * @param {number|string} rowIndex 
     * @param {Object} rawContactData 
     * @param {Object} user 
     */
    async upgradeContactToOpportunity(rowIndex, rawContactData, user) {
        // 將 rowIndex 注入 payload，確保下游 Service (如需要) 能正確更新狀態
        const dataWithRowIndex = { ...rawContactData, rowIndex };
        return await this.upgradeContactAndCreateOpp(dataWithRowIndex, user);
    }

    /**
     * 將潛在客戶升級為正式聯絡人，並自動建立初始機會
     * @param {Object} rawContactData 
     * @param {Object} user 
     */
    async upgradeContactAndCreateOpp(rawContactData, user) {
        try {
            // 1. 建立正式聯絡人
            const contactResult = await this.contactService.createContact(rawContactData, user);
            
            // 2. 如果成功，建立初始機會
            if (contactResult.success && contactResult.id) {
                // [FIX] 解除 Hardcode：優先使用前端 Wizard 傳遞的 opportunityName, type, stage 等資料
                const oppPayload = {
                    ...rawContactData, // 包含 opportunityType, assignee, notes 等
                    opportunityName: rawContactData.opportunityName || `${rawContactData.name} - 初始商機`,
                    mainContact: rawContactData.mainContact || rawContactData.name,
                    customerCompany: rawContactData.customerCompany || rawContactData.company,
                    currentStage: rawContactData.currentStage || '01_初步接觸'
                };

                const oppResult = await this.opportunityService.createOpportunity(oppPayload, user);

                // 3. 建立關聯 (如果 OpportunityService 有提供此 API)
                // await this.opportunityService.linkContact(oppResult.id, contactResult.id);
                
                return { 
                    success: true, 
                    contactId: contactResult.id, 
                    opportunityId: oppResult.id 
                };
            }
            throw new Error('聯絡人建立失敗');
        } catch (error) {
            console.error('[WorkflowService] upgradeContactAndCreateOpp Error:', error);
            throw error;
        }
    }
}

module.exports = WorkflowService;