// tfc433/0223test1/0223test1-584de97d07459a200b448fe0cbaa3539c82ff945/services/workflow-service.js
const { supabase } = require('../config/supabase');

/**
 * services/workflow-service.js
 * 撌乩?瘚???
 * * @version 5.0.8 (Workflow Ownership Migration Phase 1)
 * @date 2026-05-13
 * @description 鞎痊??頝冽芋蝯?銴?璆剖?瘚?嚗?憒???閮?蝯∩犖??????
 * 靘陷瘜典嚗pportunityService, InteractionService, ContactService
 * @changelog 2026-05-13: Complete verified RAW business-card field mapping for opportunity upgrade CORE contact creation.
 * @changelog 2026-05-13: Normalize RAW business-card upgrade contact name from verified mainContact payload field before CORE contact creation.
 * @changelog 2026-05-13: Hotfix RAW business-card opportunity relationship creation to use existing addContactToOpportunity service API.
 * @changelog 2026-05-13: Restored RAW business-card opportunity contact relationship creation after formal contact promotion.
 * @changelog 2026-05-13: Workflow ownership migration phase 1: move RAW lifecycle orchestration into WorkflowService and reduce OpportunityService to relationship semantics only.
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

    _resolveModifier(user) {
        if (!user) return 'System';
        if (typeof user === 'string') return user;
        return user.name || user.displayName || user.username || 'System';
    }

    _normalizeText(value) {
        return String(value || '').toLowerCase().trim();
    }

    _normalizePhone(value) {
        return String(value || '').replace(/\D+/g, '');
    }

    _normalizeCompanyName(name) {
        if (!name) return '';
        return String(name)
            .toLowerCase()
            .trim()
            .replace(/股份有限公司|有限公司|公司|\(.*?\)|（.*?）/g, '')
            .replace(/\s+/g, '')
            .trim();
    }

    async _updateRawStatus(rowIndex, status) {
        const writer = this.contactService && this.contactService.contactWriter;
        if (!writer || !writer.sheets || !writer.config || !writer.SHEET_POTENTIAL) return;

        const statusIndex = writer.config.CONTACT_FIELDS && writer.config.CONTACT_FIELDS.STATUS;
        const parsedRowIndex = parseInt(rowIndex, 10);
        if (statusIndex === undefined || isNaN(parsedRowIndex) || parsedRowIndex <= 1) return;

        const columnLetter = String.fromCharCode(65 + statusIndex);
        await writer.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: writer.targetSpreadsheetId,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: [
                    {
                        range: `${writer.SHEET_POTENTIAL}!${columnLetter}${parsedRowIndex}`,
                        values: [[status]]
                    }
                ]
            }
        });

        if (this.contactService.contactRawReader && this.contactService.contactRawReader.invalidateCache) {
            this.contactService.contactRawReader.invalidateCache('contacts');
        }
    }

    async _updateContactSourceId(contactId, sourceId, user) {
        const modifier = this._resolveModifier(user);
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('contacts')
            .update({
                source_id: String(sourceId),
                updated_by: modifier,
                updated_time: now
            })
            .eq('contact_id', contactId);

        if (error) {
            throw new Error(`[WorkflowService] Update Contact Source Error: ${error.message}`);
        }
    }

    async _findExistingOfficialContact(rawContactData) {
        const allOfficialContacts = await this.contactService.getAllOfficialContacts();
        const rawName = this._normalizeText(rawContactData.name);
        const rawCompany = this._normalizeCompanyName(rawContactData.customerCompany || rawContactData.company);
        const rawEmail = this._normalizeText(rawContactData.email);
        const rawPhones = [this._normalizePhone(rawContactData.mobile), this._normalizePhone(rawContactData.phone)].filter(Boolean);

        const exactMatches = (allOfficialContacts || []).filter(contact => {
            const contactName = this._normalizeText(contact.name);
            const contactCompany = this._normalizeCompanyName(contact.companyName || contact.company);
            return rawName && rawCompany && contactName === rawName && contactCompany === rawCompany;
        });

        if (exactMatches.length <= 1) {
            return exactMatches[0] || null;
        }

        const emailMatch = rawEmail
            ? exactMatches.find(contact => this._normalizeText(contact.email) === rawEmail)
            : null;
        if (emailMatch) return emailMatch;

        if (rawPhones.length > 0) {
            return exactMatches.find(contact => {
                const contactPhones = [this._normalizePhone(contact.mobile), this._normalizePhone(contact.phone)].filter(Boolean);
                return contactPhones.some(phone => rawPhones.includes(phone));
            }) || null;
        }

        return exactMatches[0] || null;
    }

    async fileContact(rowIndex, user) {
        const rawContact = await this.contactService.getPotentialContactByRow(rowIndex);
        if (!rawContact) {
            throw new Error(`Cannot file RAW contact: row ${rowIndex} not found.`);
        }

        const contactResult = await this.contactService.createContact({
            sourceId: String(rowIndex),
            name: rawContact.name,
            company: rawContact.company,
            companyName: rawContact.company,
            department: rawContact.department || '',
            jobTitle: rawContact.position || '',
            position: rawContact.position || '',
            mobile: rawContact.mobile || '',
            phone: rawContact.phone || '',
            email: rawContact.email || ''
        }, user);

        await this._updateRawStatus(rowIndex, '已建檔');

        return {
            success: true,
            contactId: contactResult.id,
            contactName: rawContact.name,
            data: { contactId: contactResult.id }
        };
    }

    async linkBusinessCardToContact(contactId, rowIndex, user) {
        const contact = await this.contactService.getContactById(contactId);
        if (!contact) {
            throw new Error(`Cannot link RAW business card: contact ${contactId} not found.`);
        }

        if (!contact.sourceId || contact.sourceId === 'MANUAL') {
            await this._updateContactSourceId(contactId, rowIndex, user);
        }

        await this._updateRawStatus(rowIndex, '已歸檔');

        return {
            success: true,
            contactId,
            contactName: contact.name,
            data: { contactId }
        };
    }

    async resolveAndPromoteContact(contactPayload, user) {
        const rowIndex = contactPayload && contactPayload.rowIndex;
        if (rowIndex === undefined || rowIndex === null || rowIndex === '') {
            throw new Error('Cannot resolve RAW contact: missing rowIndex.');
        }

        const rawContact = await this.contactService.getPotentialContactByRow(rowIndex);
        if (!rawContact) {
            throw new Error(`Cannot resolve RAW contact: row ${rowIndex} not found.`);
        }

        const mergedRawContact = { ...rawContact, ...contactPayload };
        const existingContact = await this._findExistingOfficialContact(mergedRawContact);

        if (existingContact) {
            await this.linkBusinessCardToContact(existingContact.contactId, rowIndex, user);
            return {
                success: true,
                contactId: existingContact.contactId,
                contactName: existingContact.name
            };
        }

        return await this.fileContact(rowIndex, user);
    }

    /**
     * [Phase 8 Bridge] ??銝?祆??遣蝡?(?舀 Wizard 'old' ??'new' 頝臬?)
     * ?交 OpportunityController ??瘙蒂憪晷蝯行敹?Service
     * @param {Object} opportunityData 
     * @param {string|Object} user 
     */
    async createOpportunity(opportunityData, user) {
        try {
            // Controller (req.user.name) ?喳摮葡嚗??詨? Service ?? { displayName } ?拐辣
            const modifierObj = typeof user === 'string' ? { displayName: user } : (user || { displayName: 'System' });
            
            const result = await this.opportunityService.createOpportunity(opportunityData, modifierObj);
            return result;
        } catch (error) {
            console.error('[WorkflowService] createOpportunity Error:', error);
            throw error;
        }
    }

    /**
     * ?瑁?璈?獢辣蝯?瘚?
     * @param {string} opportunityId 
     * @param {string} result - 'Won' | 'Lost'
     * @param {Object} user 
     */
    async closeOpportunity(opportunityId, result, user) {
        try {
            const status = result === 'Won' ? '已成交' : '已失敗(已失去)';
            
            // 1. ?湔璈????
            await this.opportunityService.updateOpportunity(
                opportunityId, 
                { currentStatus: '已結案', currentStage: status },
                user
            );

            // 2. ?芸?撱箇?蝯?鈭?蝝??
            await this.interactionService.createInteraction({
                opportunityId: opportunityId,
                eventTitle: `[蝟餌絞?芸?] 璈?蝯? - ${result}`,
                eventType: '系統互動紀錄',
                contentSummary: `由 ${user.displayName} 將機會案件關閉為 ${result}。`,
                interactionTime: new Date().toISOString()
            }, user);

            return { success: true, message: `璈?撌脩?獢?(${result})` };
        } catch (error) {
            console.error('[WorkflowService] closeOpportunity Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 8 Bridge] ?拚? ContactController.upgradeContact ???(Wizard 'card' 頝臬?)
     * 撠??典恥?嗅?蝝甇???舐窗鈭箄?璈?
     * @param {number|string} rowIndex 
     * @param {Object} rawContactData 
     * @param {Object} user 
     */
    async upgradeContactToOpportunity(rowIndex, rawContactData, user) {
        // 撠?rowIndex 瘜典 payload嚗Ⅱ靽?皜?Service (憒?閬? ?賣迤蝣箸?啁???
        const dataWithRowIndex = { ...rawContactData, rowIndex };
        return await this.upgradeContactAndCreateOpp(dataWithRowIndex, user);
    }

    /**
     * 撠??典恥?嗅?蝝甇???舐窗鈭綽?銝西?遣蝡?憪???
     * @param {Object} rawContactData 
     * @param {Object} user 
     */
    async upgradeContactAndCreateOpp(rawContactData, user) {
        try {
            // 1. 撱箇?甇???舐窗鈭?
            const rawContact = rawContactData.rowIndex
                ? await this.contactService.getPotentialContactByRow(rawContactData.rowIndex)
                : null;
            const hasValue = (value) => String(value || '').trim() !== '';
            const contactPayload = {
                ...rawContactData,
                sourceId: hasValue(rawContactData.sourceId) ? rawContactData.sourceId : String(rawContactData.rowIndex || ''),
                name: hasValue(rawContactData.name) ? rawContactData.name : (rawContactData.mainContact || (rawContact && rawContact.name)),
                company: hasValue(rawContactData.company) ? rawContactData.company : ((rawContact && rawContact.company) || rawContactData.customerCompany),
                department: hasValue(rawContactData.department) ? rawContactData.department : ((rawContact && rawContact.department) || ''),
                jobTitle: hasValue(rawContactData.jobTitle) ? rawContactData.jobTitle : ((rawContact && rawContact.position) || rawContactData.position),
                position: hasValue(rawContactData.position) ? rawContactData.position : ((rawContact && rawContact.position) || rawContactData.jobTitle),
                mobile: hasValue(rawContactData.mobile) ? rawContactData.mobile : ((rawContact && rawContact.mobile) || ''),
                phone: hasValue(rawContactData.phone) ? rawContactData.phone : ((rawContact && rawContact.phone) || rawContactData.contactPhone),
                email: hasValue(rawContactData.email) ? rawContactData.email : ((rawContact && rawContact.email) || '')
            };
            const contactResult = await this.contactService.createContact(contactPayload, user);
            
            // 2. 憒???嚗遣蝡?憪???
            if (contactResult.success && contactResult.id) {
                // [FIX] 閫? Hardcode嚗?蝙?典?蝡?Wizard ?喲???opportunityName, type, stage 蝑???
                const oppPayload = {
                    ...rawContactData, // ? opportunityType, assignee, notes 蝑?
                    opportunityName: rawContactData.opportunityName || `${rawContactData.name} - ????`,
                    mainContact: rawContactData.mainContact || rawContactData.name,
                    customerCompany: rawContactData.customerCompany || rawContactData.company,
                    currentStage: rawContactData.currentStage
                };

                const oppResult = await this.opportunityService.createOpportunity(oppPayload, user);

                // 3. 撱箇?? (憒? OpportunityService ??靘迨 API)
                await this.opportunityService.addContactToOpportunity(oppResult.id, { contactId: contactResult.id }, user);
                
                return { 
                    success: true, 
                    contactId: contactResult.id, 
                    opportunityId: oppResult.id 
                };
            }
            throw new Error('聯絡人建檔失敗');
        } catch (error) {
            console.error('[WorkflowService] upgradeContactAndCreateOpp Error:', error);
            throw error;
        }
    }
}

module.exports = WorkflowService;
