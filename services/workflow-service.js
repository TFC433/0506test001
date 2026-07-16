// tfc433/0223test1/0223test1-584de97d07459a200b448fe0cbaa3539c82ff945/services/workflow-service.js
const { supabase } = require('../config/supabase');

/**
 * services/workflow-service.js
 * 撌乩?瘚???
 * * @version 5.0.11 (Audit User Normalization Patch)
 * @date 2026-05-21
 * @description 鞎痊??頝冽芋蝯?銴?璆剖?瘚?嚗?憒???閮?蝯∩犖??????
 * 靘陷瘜典嚗pportunityService, InteractionService, ContactService
 * @changelog 2026-05-21: WorkflowService Patch: normalize audit user in fileContact promotion flow.
 * @changelog 2026-05-13: Hydrate SQL contact fields from RAW card during business-card archive/retro-link before marking RAW archived.
 * @changelog 2026-05-13: Complete manual opportunity and quick-add SQL contact lifecycle with MANUAL sourceId and relationship linking.
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
     * @param {GoogleClientService} googleClientService
     */
    constructor(opportunityService, interactionService, contactService, googleClientService) {
        this.opportunityService = opportunityService;
        this.interactionService = interactionService;
        this.contactService = contactService;
        this.googleClientService = googleClientService;
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

    _isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
    }

    _isLegacyBusinessCardSource(value) {
        const source = String(value || '').trim();
        return /^(?:BC-\d+|\d+)$/i.test(source);
    }

    _workflowError(message, statusCode = 400, code = 'WORKFLOW_VALIDATION_ERROR') {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.code = code;
        return error;
    }

    async _updateRawStatus(identifier, status) {
        const writer = this.contactService && this.contactService.rawContactSqlWriter;
        if (!writer) throw new Error('[WorkflowService] rawContactSqlWriter not configured');

        const { cardId } = await this.contactService.resolveRawSqlIdentifier(identifier);
        const result = await writer.updateRawContactStatusByCardId(cardId, status);
        if (!result || result.success === false) {
            throw new Error(result && result.error ? result.error : `RAW SQL status update failed: ${cardId}`);
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

    async _updateContactSourceIdGuarded(contactId, sourceId, expectedSourceId, user) {
        const modifier = this._resolveModifier(user);
        const now = new Date().toISOString();
        const { error, count } = await supabase
            .from('contacts')
            .update({
                source_id: String(sourceId),
                updated_by: modifier,
                updated_time: now
            }, { count: 'exact' })
            .eq('contact_id', contactId)
            .eq('source_id', expectedSourceId);

        if (error) {
            throw new Error(`[WorkflowService] Guarded Contact Source Update Error: ${error.message}`);
        }

        return count || 0;
    }

    async _findContactBySourceId(sourceId) {
        const { data, error } = await supabase
            .from('contacts')
            .select('contact_id, source_id, name')
            .eq('source_id', sourceId)
            .limit(2);

        if (error) {
            throw new Error(`[WorkflowService] Contact Source Collision Check Error: ${error.message}`);
        }

        return data || [];
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

    async fileContact(rawIdentifier, user) {
        const rawContact = await this.contactService.getPotentialContactByRow(rawIdentifier);
        if (!rawContact) {
            throw new Error(`Cannot file RAW contact: identifier ${rawIdentifier} not found.`);
        }
        const modifier = this._resolveModifier(user);
        const sourceId = rawContact.cardId || String(rawIdentifier);

        const contactResult = await this.contactService.createContact({
            sourceId,
            name: rawContact.name,
            company: rawContact.company,
            companyName: rawContact.company,
            department: rawContact.department || '',
            jobTitle: rawContact.position || '',
            position: rawContact.position || '',
            mobile: rawContact.mobile || '',
            phone: rawContact.phone || '',
            email: rawContact.email || ''
        }, modifier);

        await this._updateRawStatus(sourceId, '已建檔');

        return {
            success: true,
            contactId: contactResult.id,
            contactName: rawContact.name,
            data: { contactId: contactResult.id }
        };
    }

    async linkBusinessCardToContact(contactId, rawIdentifier, user) {
        const contact = await this.contactService.getContactById(contactId);
        if (!contact) {
            throw new Error(`Cannot link RAW business card: contact ${contactId} not found.`);
        }

        const rawContact = await this.contactService.getPotentialContactByRow(rawIdentifier);
        if (!rawContact) {
            throw new Error(`Cannot link RAW business card: identifier ${rawIdentifier} not found.`);
        }
        const sourceId = rawContact.cardId || String(rawIdentifier);

        const updateData = {};
        const setIfPresent = (target, value) => {
            if (String(value || '').trim()) updateData[target] = value;
        };

        setIfPresent('name', rawContact.name);
        setIfPresent('company', rawContact.company);
        setIfPresent('department', rawContact.department);
        setIfPresent('jobTitle', rawContact.position);
        setIfPresent('position', rawContact.position);
        setIfPresent('mobile', rawContact.mobile);
        setIfPresent('phone', rawContact.phone);
        setIfPresent('email', rawContact.email);

        if (Object.keys(updateData).length > 0) {
            await this.contactService.updateContact(contactId, updateData, this._resolveModifier(user));
        }

        await this._updateContactSourceId(contactId, sourceId, user);
        await this._updateRawStatus(sourceId, '已歸檔');

        return {
            success: true,
            contactId,
            contactName: contact.name,
            data: { contactId }
        };
    }

    async rebindContactCardSource(contactId, cardId, expectedSourceId, user) {
        if (!contactId) {
            throw this._workflowError('Missing contactId.', 400, 'CONTACT_ID_REQUIRED');
        }

        const selectedCardId = String(cardId || '').trim();
        if (!selectedCardId || !this._isUuid(selectedCardId)) {
            throw this._workflowError('Selected cardId must be a valid RAW UUID.', 400, 'INVALID_CARD_ID');
        }

        const expectedSource = String(expectedSourceId || '').trim();
        if (!expectedSource || !this._isLegacyBusinessCardSource(expectedSource)) {
            throw this._workflowError('Expected sourceId must be a Legacy business-card source.', 400, 'INVALID_EXPECTED_SOURCE');
        }

        const contact = await this.contactService.getContactById(contactId);
        if (!contact) {
            throw this._workflowError(`Contact not found: ${contactId}`, 404, 'CONTACT_NOT_FOUND');
        }

        const currentSource = String(contact.sourceId || '').trim();
        if (currentSource !== expectedSource) {
            throw this._workflowError('Contact source changed. Refresh and retry.', 409, 'SOURCE_STALE');
        }
        if (!this._isLegacyBusinessCardSource(currentSource)) {
            throw this._workflowError('Contact is not in a Legacy source state.', 409, 'SOURCE_NOT_LEGACY');
        }

        let rawResult = null;
        try {
            rawResult = await this.contactService.resolveRawSqlIdentifier(selectedCardId);
        } catch (error) {
            if (error.code === 'RAW_CONTACT_NOT_FOUND') {
                throw this._workflowError('Selected RAW business card was not found.', 404, 'RAW_CARD_NOT_FOUND');
            }
            throw error;
        }
        const rawContact = rawResult && rawResult.rawContact;
        if (!rawContact || rawResult.cardId !== selectedCardId) {
            throw this._workflowError('Selected RAW business card was not found.', 404, 'RAW_CARD_NOT_FOUND');
        }

        const driveLink = String(rawContact.driveLink || '').trim();
        if (!driveLink) {
            throw this._workflowError('Selected RAW business card has no Drive link.', 400, 'RAW_CARD_MISSING_DRIVE_LINK');
        }

        const collisions = await this._findContactBySourceId(selectedCardId);
        const otherCollision = collisions.find(row => String(row.contact_id) !== String(contactId));
        if (otherCollision) {
            throw this._workflowError('Selected RAW business card is already linked to another contact.', 409, 'RAW_CARD_ALREADY_LINKED');
        }

        const updatedCount = await this._updateContactSourceIdGuarded(contactId, selectedCardId, expectedSource, user);
        if (updatedCount !== 1) {
            throw this._workflowError('Contact source changed before the update completed. Refresh and retry.', 409, 'SOURCE_STALE');
        }

        return {
            success: true,
            contactId,
            sourceId: selectedCardId,
            cardId: selectedCardId,
            driveLink
        };
    }

    async resolveAndPromoteContact(contactPayload, user) {
        const rawIdentifier = contactPayload && (contactPayload.rawIdentifier || contactPayload.rowIndex);
        if (rawIdentifier === undefined || rawIdentifier === null || rawIdentifier === '') {
            throw new Error('Cannot resolve RAW contact: missing RAW identifier.');
        }

        const rawContact = await this.contactService.getPotentialContactByRow(rawIdentifier);
        if (!rawContact) {
            throw new Error(`Cannot resolve RAW contact: identifier ${rawIdentifier} not found.`);
        }

        const mergedRawContact = { ...rawContact, ...contactPayload };
        const existingContact = await this._findExistingOfficialContact(mergedRawContact);

        if (existingContact) {
            await this.linkBusinessCardToContact(existingContact.contactId, rawContact.cardId || rawIdentifier, user);
            return {
                success: true,
                contactId: existingContact.contactId,
                contactName: existingContact.name
            };
        }

        return await this.fileContact(rawContact.cardId || rawIdentifier, user);
    }

    async createManualContact(contactData, user) {
        const hasValue = (value) => String(value || '').trim() !== '';
        const contactName = hasValue(contactData.name) ? contactData.name : contactData.mainContact;

        if (!hasValue(contactName)) {
            throw new Error('Cannot create manual contact: missing name.');
        }

        return await this.contactService.createContact({
            ...contactData,
            sourceId: 'MANUAL',
            name: contactName,
            company: hasValue(contactData.company) ? contactData.company : (contactData.customerCompany || contactData.companyName),
            phone: hasValue(contactData.phone) ? contactData.phone : contactData.contactPhone
        }, this._resolveModifier(user));
    }

    /**
     * [Phase 8 Bridge] ??銝?祆??遣蝡?(?舀 Wizard 'old' ??'new' 頝臬?)
     * ?交 OpportunityController ??瘙蒂憪晷蝯行敹?Service
     * @param {Object} opportunityData 
     * @param {string|Object} user 
     */
    async createOpportunity(opportunityData, user, auditContext = {}) {
        try {
            // Controller (req.user.name) ?喳摮葡嚗??詨? Service ?? { displayName } ?拐辣
            const modifierObj = typeof user === 'string' ? { displayName: user } : (user || { displayName: 'System' });
            
            const result = await this.opportunityService.createOpportunity(opportunityData, modifierObj, auditContext);
            const hasRowIndex = opportunityData.rowIndex !== undefined && opportunityData.rowIndex !== null && opportunityData.rowIndex !== '';
            const hasContactId = Boolean(opportunityData.contactId);
            const hasMainContact = String(opportunityData.mainContact || '').trim() !== '';

            if (!hasRowIndex && result && result.id && hasContactId) {
                await this.opportunityService.addContactToOpportunity(result.id, {
                    contactId: opportunityData.contactId,
                    name: opportunityData.mainContact || opportunityData.name
                }, modifierObj);
            } else if (!hasRowIndex && result && result.id && hasMainContact) {
                const contactResult = await this.createManualContact(opportunityData, modifierObj);
                await this.opportunityService.addContactToOpportunity(result.id, {
                    contactId: contactResult.id,
                    name: opportunityData.mainContact
                }, modifierObj);
            }
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
    async upgradeContactToOpportunity(rawIdentifier, rawContactData, user, auditContext = {}) {
        // 撠?rowIndex 瘜典 payload嚗Ⅱ靽?皜?Service (憒?閬? ?賣迤蝣箸?啁???
        const dataWithRowIndex = { ...rawContactData, rowIndex: rawIdentifier, rawIdentifier };
        return await this.upgradeContactAndCreateOpp(dataWithRowIndex, user, auditContext);
    }

    /**
     * 撠??典恥?嗅?蝝甇???舐窗鈭綽?銝西?遣蝡?憪???
     * @param {Object} rawContactData 
     * @param {Object} user 
     */
    async upgradeContactAndCreateOpp(rawContactData, user, auditContext = {}) {
        try {
            const upgradeAuditContext = auditContext.auditLoggerService
                ? {
                    ...auditContext,
                    createSource: 'raw_contact_upgrade',
                    linkSource: 'raw_contact_upgrade',
                    detectedEvent: 'upgraded_from_raw_contact',
                    sourceRowIndex: rawContactData.rowIndex || rawContactData.sourceId || null
                }
                : auditContext;

            // 1. 撱箇?甇???舐窗鈭?
            const rawIdentifier = rawContactData.rawIdentifier || rawContactData.rowIndex || rawContactData.sourceId;
            const rawContact = rawIdentifier
                ? await this.contactService.getPotentialContactByRow(rawIdentifier)
                : null;
            const hasValue = (value) => String(value || '').trim() !== '';
            const contactPayload = {
                ...rawContactData,
                sourceId: hasValue(rawContactData.sourceId) ? rawContactData.sourceId : (rawContact && rawContact.cardId ? rawContact.cardId : String(rawIdentifier || '')),
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

                const oppResult = await this.opportunityService.createOpportunity(oppPayload, user, upgradeAuditContext);

                // 3. 撱箇?? (憒? OpportunityService ??靘迨 API)
                await this.opportunityService.addContactToOpportunity(oppResult.id, { contactId: contactResult.id }, user, upgradeAuditContext);
                
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
