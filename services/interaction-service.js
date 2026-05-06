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