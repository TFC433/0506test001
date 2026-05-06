// ============================================================================
// File: services/opportunity-service.js
// ============================================================================
/**
 * services/opportunity-service.js
 * 機會案件業務邏輯層 (Service Layer)
 * @version 8.12.2 (Phase A - Identity & Empty Contact Patch)
 * @date 2026-04-17
 * @description 
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
            .replace(/股份有限公司|有限公司|公司/g, '')
            .replace(/\(.*\)/g, '')
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
            console.warn(`[OpportunityService] 寫入機會日誌失敗 (OppID: ${opportunityId}): ${logError.message}`);
        }
    }

    async createOpportunity(opportunityData, user) {
        try {
            const modifier = this._resolveModifier(user);

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

                const safeMainContact = (opportunityData.mainContact || '').trim();
                if (safeMainContact) {
                    const normalizedContact = safeMainContact.toLowerCase();
                    const allContacts = await this.contactSqlReader.getContacts();
                    const existingContact = allContacts.find(c => 
                        (c.name || '').toLowerCase().trim() === normalizedContact && 
                        c.companyId === targetCompanyId
                    );

                    if (!existingContact) {
                        await this.contactSqlWriter.createContact({
                            name: safeMainContact,
                            companyId: targetCompanyId,
                            phone: opportunityData.contactPhone || ''
                        }, modifier);
                    }
                }
            }

            const result = await this.opportunitySqlWriter.createOpportunity(opportunityData, modifier);
            
            // [Phase A Patch] Create Interaction Log for New Opportunity
            if (result && result.success) {
                const oppName = opportunityData.opportunityName || '未命名機會';
                const owner = opportunityData.assignee || modifier || '未指定';
                await this._logOpportunityInteraction(
                    result.id,
                    '建立機會',
                    `建立機會：「${oppName}」（負責人：${owner}）`,
                    modifier
                );
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
                throw new Error(`找不到機會ID為 ${opportunityId} 的案件`);
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

            const linkedContacts = (linkedContactsFromCache || []).map(contact => ({
                ...contact,
                position: contact.jobTitle || contact.position 
            }));
            
            const interactions = (scopedInteractions || [])
                .sort((a, b) => new Date(b.interactionTime || b.createdTime) - new Date(a.interactionTime || a.createdTime));

            const eventLogs = (scopedEventLogs || [])
                .sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));

            const normalizedOppCompany = this._normalizeCompanyName(opportunityInfo.customerCompany);
            
            const matchedCompany = (allCompanies || []).find(c => this._normalizeCompanyName(c.companyName) === normalizedOppCompany);
            
            let potentialContacts = [];
            if (matchedCompany && this.contactSqlReader) {
                const companyContacts = await this.contactSqlReader.getContactsByCompanyId(matchedCompany.companyId);
                potentialContacts = companyContacts.map(c => ({
                    ...c,
                    company: matchedCompany.companyName,
                    position: c.jobTitle || c.position
                }));
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

    async updateOpportunity(opportunityId, updateData, user) {
        try {
            const modifier = this._resolveModifier(user);
            
            const originalOpportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            
            if (!originalOpportunity) {
                throw new Error(`找不到要更新的機會 (ID: ${opportunityId})`);
            }
            
            const oldStage = originalOpportunity.currentStage;

            const systemConfig = await this.systemService.getSystemConfig();
            const getNote = (configKey, value) => (systemConfig[configKey] || []).find(i => i.value === value)?.note || value || 'N/A';
            const stageMapping = new Map((systemConfig['機會階段'] || []).map(item => [item.value, item.note]));
            
            const logs = [];

            const newStage = updateData.currentStage;
            if (newStage && oldStage && newStage !== oldStage) {
                const oldStageName = stageMapping.get(oldStage) || oldStage;
                const newStageName = stageMapping.get(newStage) || newStage;
                logs.push(`階段從【${oldStageName}】更新為【${newStageName}】`);
            }
            
            if (updateData.opportunityValue !== undefined && updateData.opportunityValue !== originalOpportunity.opportunityValue) {
                logs.push(`機會價值從 [${originalOpportunity.opportunityValue || '未設定'}] 更新為 [${updateData.opportunityValue || '未設定'}]`);
            }

            const oldAssignee = originalOpportunity.assignee || originalOpportunity.owner;
            if (updateData.assignee !== undefined && updateData.assignee !== oldAssignee) {
                logs.push(`負責業務從 [${getNote('團隊成員', oldAssignee)}] 變更為 [${getNote('團隊成員', updateData.assignee)}]`);
            }
            
            if (updateData.expectedCloseDate !== undefined && updateData.expectedCloseDate !== originalOpportunity.expectedCloseDate) {
                logs.push(`預計結案日從 [${originalOpportunity.expectedCloseDate || '未設定'}] 更新為 [${updateData.expectedCloseDate || '未設定'}]`);
            }

            const updateResult = await this.opportunitySqlWriter.updateOpportunity(opportunityId, updateData, modifier);
            
            if (logs.length > 0) {
                await this._logOpportunityInteraction(
                    opportunityId,
                    '機會資料更新',
                    logs.join('； '),
                    modifier
                );
            }
            
            return updateResult;
        } catch (error) {
            console.error('[OpportunityService] updateOpportunity Error:', error);
            throw error;
        }
    }
    
    async addContactToOpportunity(opportunityId, contactData, user) {
        try {
            const modifier = this._resolveModifier(user);
            let contactToLink;
            let logTitle = '關聯聯絡人';

            if (contactData.contactId) {
                contactToLink = { id: contactData.contactId, name: contactData.name };
            } 
            else {
                if (!contactData.company) throw new Error("無法關聯聯絡人：缺少公司名稱。");
                
                logTitle = '建立並關聯新聯絡人';
                const normalizedComp = this._normalizeCompanyName(contactData.company);
                const allCompanies = await this.companySqlReader.getCompanies();
                const existingCompany = allCompanies.find(c => this._normalizeCompanyName(c.companyName) === normalizedComp);
                let targetCompanyId;

                if (existingCompany) {
                    targetCompanyId = existingCompany.companyId;
                } else {
                    targetCompanyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await this.companyWriter.createCompany({
                        companyId: targetCompanyId,
                        companyName: contactData.company,
                        county: contactData.county || ''
                    }, modifier);
                }

                const normalizedContactName = (contactData.name || '').toLowerCase().trim();
                const allContacts = await this.contactSqlReader.getContacts();
                const existingContact = allContacts.find(c => 
                    (c.name || '').toLowerCase().trim() === normalizedContactName && 
                    c.companyId === targetCompanyId
                );

                if (existingContact) {
                    logTitle = '關聯現有聯絡人';
                    contactToLink = { id: existingContact.contactId, name: existingContact.name };
                } else {
                    const targetContactId = `CONT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await this.contactSqlWriter.createContact({
                        contactId: targetContactId,
                        name: contactData.name,
                        companyId: targetCompanyId,
                        phone: contactData.phone || contactData.mobile || '',
                        email: contactData.email || '',
                        jobTitle: contactData.position || contactData.jobTitle || '',
                        department: contactData.department || ''
                    }, modifier);
                    
                    contactToLink = { id: targetContactId, name: contactData.name };
                }
            }

            const linkResult = await this.opportunitySqlWriter.linkContact(opportunityId, contactToLink.id, modifier);
            
            await this._logOpportunityInteraction(
                opportunityId,
                logTitle,
                `將聯絡人 "${contactToLink.name}" 關聯至此機會。`,
                modifier
            );

            return { success: true, message: '聯絡人關聯成功', data: { contact: contactToLink, link: linkResult } };
        } catch (error) {
            console.error('[OpportunityService] addContactToOpportunity Error:', error);
            throw error;
        }
    }

    async deleteContactLink(opportunityId, contactId, user) {
        try {
            const modifier = this._resolveModifier(user);
            
            const contact = this.contactSqlReader 
                ? await this.contactSqlReader.getContactById(contactId)
                : (await this.contactReader.getContactList()).find(c => c.contactId === contactId);
                
            const contactName = contact ? contact.name : `ID ${contactId}`;

            const deleteResult = await this.opportunitySqlWriter.unlinkContact(opportunityId, contactId);

            if (deleteResult.success) {
                await this._logOpportunityInteraction(
                    opportunityId,
                    '解除聯絡人關聯',
                    `將聯絡人 "${contactName}" 從此機會移除。`,
                    modifier
                );
            }

            return deleteResult;
        } catch (error) {
            console.error('[OpportunityService] deleteContactLink Error:', error);
            throw error;
        }
    }

    async deleteOpportunity(opportunityId, user) {
        try {
            const modifier = this._resolveModifier(user);
            
            const opportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            
            if (!opportunity) {
                throw new Error(`找不到要刪除的機會 (ID: ${opportunityId})`);
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
                            eventType: '系統事件',
                            eventTitle: '刪除機會案件',
                            contentSummary: `機會案件 "${opportunity.opportunityName}" (ID: ${opportunity.opportunityId}) 已被 ${modifier} 刪除。`,
                            recorder: modifier,
                            interactionTime: new Date().toISOString()
                        }, user);
                    }
                } catch (logError) {
                     console.warn(`[OpportunityService] 寫入公司日誌失敗 (刪除機會時): ${logError.message}`);
                }
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
            console.error('❌ [OpportunityService] getOpportunitiesByCounty 錯誤:', error);
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
            const stages = systemConfig['機會階段'] || [];
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
            console.error('❌ [OpportunityService] getOpportunitiesByStage 錯誤:', error);
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
             console.error('❌ [OpportunityService] searchOpportunities 錯誤:', error);
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