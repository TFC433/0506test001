/**
 * services/contact-service.js
 * 聯絡人業務邏輯服務層
 * @version 8.17.4
 * @date 2026-05-15
 * @changelog
 * - [PATCH] Expanded sync-from-source RAW lineage normalization for numeric and BC-prefixed sourceId values.
 * - [PATCH] Added preview/confirmed one-way CORE contact sync from linked RAW business card source.
 * - [PATCH] Extended RAW contact search to include position, department, phone, mobile, email, and notes.
 * - [PATCH] Enabled direct RAW notes editing through the configured W column while preserving existing RAW update flow.
 * - [PATCH] Moved CORE contact list search/sort/pagination onto Supabase SQL with exact count and stable contact_id tie-breaker.
 * - [PATCH] Added lazy CORE contact reverse opportunity lookup service for Contact Workspace plumbing.
 * - [PATCH] Restored linked contact driveLink runtime enrichment from RAW sourceId rowIndex without storing driveLink in SQL.
 * - [PHASE 8.16] FEATURE: Integrated dynamic limit handling for CORE pagination to support user-selected page sizes.
 * - [PHASE 8.15] FEATURE: Added dynamic global sorting (ASC/DESC) to CORE contacts search, exposed via `searchOfficialContacts`.
 * - [PHASE 8.14] BUGFIX: Moved CORE contact sorting (updatedTime/createdTime DESC) to happen globally BEFORE pagination slice in `searchOfficialContacts`, ensuring correct cross-page ordering.
 * - [PHASE 8.13] Extracted _applyExhibitionAutoTag helper for shared exhibition logic. Added lazy auto-tag and write-back to getPotentialContacts to ensure unclassified RAW leads get tagged seamlessly during list hydration without breaking tri-state protection.
 * - [PHASE 8.9] Added getPotentialContactByRow helper for secure backend ownership validation.
 * - [PHASE 8.5] Normalized exhibition data display: Auto-tag fallback now explicitly formats the exhibition_name with its date range suffix before saving to the RAW sheet (Column R). This guarantees historical data integrity for past exhibitions.
 * - [PHASE 8.3] Added safe defensive fallback evaluation for is_exhibition logic inside updatePotentialContact. System Service injection is explicitly required in constructor to ensure deterministic config retrieval.
 * - [PHASE 8.2] Added explicit cache invalidation to deletePotentialContact to fix frontend stale data.
 * - [PHASE 8.2] Added deletePotentialContact for physical deletion of RAW Sheet rows.
 * - [PHASE 8.2] Added relation validation block to deleteContact.
 * - [PHASE 8.8] Removed direct CompanySqlReader instantiation and Supabase calls. Fully delegated to ContactSqlReader.
 * - [PHASE 8.7] Refactored getLinkedContacts to use strict Supabase SQL JOIN, dropping all Google Sheet dependencies.
 * - [STRICT WRITE AUTHORITY]
 * - CORE CONTACT ZONE (Official): SQL ONLY for Create/Update/Delete. NO Sheet fallback for writes.
 * - RAW CONTACT ZONE (Potential): SQL ONLY via raw_contact_captures.card_id.
 * - READS: Hybrid (SQL Primary -> Sheet Fallback) maintained for backward compatibility.
 */

const OpportunitySqlWriter = require('../data/opportunity-sql-writer');

class ContactService {
    /**
     * @param {ContactReader} contactRawReader  - bound to IDS.RAW (Potential contacts)
     * @param {ContactReader} contactCoreReader - bound to IDS.CORE (Official list + link table)
     * @param {ContactWriter} contactWriter     - RAW write only (Sheet)
     * @param {CompanyReader} companyReader
     * @param {Object} config
     * @param {ContactSqlReader} [contactSqlReader]
     * @param {ContactSqlWriter} [contactSqlWriter]
     * @param {CompanySqlReader} [companySqlReader] - Optional DI for SQL Company Maps
     * @param {SystemService} systemService         - Required DI to retrieve settings deterministically
     * @param {RawContactSqlReader} [rawContactSqlReader]
     * @param {RawContactSqlWriter} [rawContactSqlWriter]
     * @param {OpportunitySqlWriter} [opportunitySqlWriter]
     */
    constructor(contactRawReader, contactCoreReader, contactWriter, companyReader, config, contactSqlReader, contactSqlWriter, companySqlReader, systemService, rawContactSqlReader = null, rawContactSqlWriter = null, opportunitySqlWriter = null) {
        this.contactRawReader = contactRawReader;
        this.contactCoreReader = contactCoreReader;
        this.contactWriter = contactWriter;
        this.companyReader = companyReader;
        this.config = config || { PAGINATION: { CONTACTS_PER_PAGE: 20 } };
        this.contactSqlReader = contactSqlReader;
        this.contactSqlWriter = contactSqlWriter;
        this.companySqlReader = companySqlReader;
        this.rawContactSqlReader = rawContactSqlReader;
        this.rawContactSqlWriter = rawContactSqlWriter;
        this.opportunitySqlWriter = opportunitySqlWriter || new OpportunitySqlWriter();
        
        // Strict deterministic injection requirement
        if (!systemService) {
            throw new Error('[ContactService] CRITICAL: systemService is required but not provided.');
        }
        this.systemService = systemService;
    }

    // ============================================================
    // INTERNAL HELPERS (READ MAPPING)
    // ============================================================

    // [Minimal Diff Helper] 共用的 Auto-Tag 判定器，確保 Tri-state 安全
    _applyExhibitionAutoTag(target, sysConfig) {
        if (target.is_exhibition != null && target.is_exhibition !== undefined && target.is_exhibition !== '') {
            return false; // 保留明確的 true 或 false
        }
        const exConfig = sysConfig['展會設定'] || [];
        const isEnabled = String((exConfig.find(c => c.value === 'exhibition_enabled') || {}).note).toUpperCase() === 'TRUE';
        if (!isEnabled) return false;

        const startStr = (exConfig.find(c => c.value === 'exhibition_start_date') || {}).note;
        const endStr = (exConfig.find(c => c.value === 'exhibition_end_date') || {}).note;
        const exName = (exConfig.find(c => c.value === 'exhibition_name') || {}).note || '';

        if (startStr && endStr && target.createdTime) {
            const createdDate = new Date(target.createdTime);
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);
            endDate.setHours(23, 59, 59, 999); // Safe bounding inclusion

            if (!isNaN(createdDate.getTime()) && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                if (createdDate >= startDate && createdDate <= endDate) {
                    const startParts = startStr.split('-');
                    const endParts = endStr.split('-');
                    let formattedExName = exName;

                    if (startParts.length === 3 && endParts.length === 3) {
                        const suffix = `（${parseInt(startParts[1], 10)}/${parseInt(startParts[2], 10)}–${parseInt(endParts[1], 10)}/${parseInt(endParts[2], 10)}）`;
                        formattedExName = `${exName}${suffix}`;
                    }

                    target.is_exhibition = true;
                    target.exhibition_name = formattedExName;
                    return true;
                }
            }
        }
        return false;
    }

    _normalizeKey(str = '') {
        return String(str).toLowerCase().trim();
    }

    _resolveRawSourceRowIndex(sourceId) {
        const value = String(sourceId || '').trim();
        if (!value || value === 'MANUAL') return null;
        if (/^\d+$/.test(value)) return value;

        const businessCardMatch = value.match(/^(?:BC|BUSINESS[-_ ]?CARD)[-_ ]?(\d+)$/i);
        return businessCardMatch ? businessCardMatch[1] : null;
    }

    _normalizeRawSourceIdentifier(sourceId) {
        const value = String(sourceId || '').trim();
        if (!value || value.toUpperCase() === 'MANUAL') return null;

        const businessCardMatch = value.match(/^(?:BC|BUSINESS[-_ ]?CARD)[-_ ]?(\d+)$/i);
        return businessCardMatch ? businessCardMatch[1] : value;
    }

    _normalizeRawIdentifier(identifier) {
        if (identifier === null || identifier === undefined) {
            throw new Error('RAW identifier is required');
        }

        const value = String(identifier).trim();
        if (!value) {
            throw new Error('RAW identifier is required');
        }

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(value)) {
            return { identifierType: 'cardId', cardId: value };
        }

        if (/^\d+$/.test(value)) {
            const legacyRowIndex = Number(value);
            if (!Number.isInteger(legacyRowIndex) || legacyRowIndex <= 0) {
                throw new Error(`Invalid RAW legacy row index: ${identifier}`);
            }
            return { identifierType: 'legacyRowIndex', legacyRowIndex };
        }

        if (/^[0-9a-f-]+$/i.test(value)) {
            throw new Error(`Malformed RAW card UUID: ${identifier}`);
        }

        throw new Error(`Unsupported RAW identifier format: ${identifier}`);
    }

    async resolveRawSqlIdentifier(identifier) {
        if (!this.rawContactSqlReader) {
            throw new Error('[ContactService] rawContactSqlReader not configured');
        }

        const normalized = this._normalizeRawIdentifier(identifier);
        let rawContact = null;

        if (normalized.identifierType === 'cardId') {
            rawContact = await this.rawContactSqlReader.getRawContactByCardId(normalized.cardId);
        } else {
            rawContact = await this.rawContactSqlReader.getRawContactByLegacyRowIndex(normalized.legacyRowIndex);
        }

        if (!rawContact) {
            const err = new Error(`RAW contact not found for ${normalized.identifierType}: ${String(identifier).trim()}`);
            err.code = 'RAW_CONTACT_NOT_FOUND';
            err.identifierType = normalized.identifierType;
            throw err;
        }

        return {
            cardId: rawContact.cardId,
            legacyRowIndex: rawContact.rowIndex,
            rawContact,
            identifierType: normalized.identifierType
        };
    }

    async _resolveRawContactFromSourceId(sourceId) {
        const identifier = this._normalizeRawSourceIdentifier(sourceId);
        if (!identifier) return null;
        return (await this.resolveRawSqlIdentifier(identifier)).rawContact;
    }

    _mapSqlContact(contact) {
        return {
            ...contact,
            position: contact.jobTitle || contact.position, // Normalize to internal convention
            jobTitle: contact.jobTitle || contact.position
        };
    }

    _mapOfficialContact(contact, companyNameMap) {
        return {
            ...contact,
            companyName: companyNameMap.get(contact.companyId) || contact.companyId
        };
    }

    async _getCompanyNameMap() {
        const allCompanies = await this.companyReader.getCompanyList();
        return new Map(allCompanies.map(c => [c.companyId, c.companyName]));
    }

    _resolveMatchingCompanyIds(companyNameMap, query) {
        const searchTerm = this._normalizeKey(query);
        if (!searchTerm) return [];

        const matchingCompanyIds = [];
        companyNameMap.forEach((companyName, companyId) => {
            if (this._normalizeKey(companyName).includes(searchTerm)) {
                matchingCompanyIds.push(companyId);
            }
        });
        return matchingCompanyIds;
    }

    // ============================================================
    // READ OPERATIONS (HYBRID: SQL PRIMARY -> SHEET FALLBACK)
    // ============================================================

    async _fetchOfficialContactsWithCompanies(forceSheet = false) {
        let allContacts = null;

        // 1) SQL primary
        if (!forceSheet) {
            if (this.contactSqlReader) {
                try {
                    const sqlContacts = await this.contactSqlReader.getContacts();
                    if (!sqlContacts || sqlContacts.length === 0) {
                        allContacts = sqlContacts.map(c => this._mapSqlContact(c));
                    } else {
                         allContacts = sqlContacts.map(c => this._mapSqlContact(c));
                    }
                } catch (error) {
                    console.warn('[ContactService] SQL Read Error (Fallback to Sheet):', error.message);
                    allContacts = null;
                }
            }
        }

        // 2) Sheet fallback (MUST be CORE reader)
        if (!allContacts) {
            if (!this.contactCoreReader) {
                console.warn('[ContactService] contactCoreReader not configured, returning empty.');
                return [];
            }
            allContacts = await this.contactCoreReader.getContactList();
        }

        // 3) Join companies
        const companyNameMap = await this._getCompanyNameMap();

        return allContacts.map(contact => this._mapOfficialContact(contact, companyNameMap));
    }

    async _resolveContactRowIndex(contactId) {
        if (!this.contactCoreReader) throw new Error('[ContactService] contactCoreReader not configured');
        const allContacts = await this.contactCoreReader.getContactList();
        const target = allContacts.find(c => c.contactId === contactId);

        if (!target) throw new Error(`Contact ID not found: ${contactId}`);
        if (!target.rowIndex) throw new Error(`System Error: Missing rowIndex for Contact ${contactId}`);
        return target.rowIndex;
    }

    async getAllOfficialContacts() {
        try {
            return await this._fetchOfficialContactsWithCompanies();
        } catch (error) {
            console.error('[ContactService] getAllOfficialContacts Failed:', error);
            return [];
        }
    }

    async getDashboardStats() {
        try {
            if (!this.rawContactSqlReader) throw new Error('[ContactService] rawContactSqlReader not configured');
            const contacts = await this.rawContactSqlReader.getRawContacts();
            return {
                total: contacts.length,
                pending: contacts.filter(c => !c.status || c.status === 'Pending').length,
                processed: contacts.filter(c => c.status === 'Processed').length,
                dropped: contacts.filter(c => c.status === 'Dropped').length
            };
        } catch (error) {
            console.error('[ContactService] getDashboardStats Error:', error);
            return { total: 0, pending: 0, processed: 0, dropped: 0 };
        }
    }

    async getPotentialContacts(limit = 2000) {
        if (!this.rawContactSqlReader) throw new Error('[ContactService] rawContactSqlReader not configured');
        let contacts = await this.rawContactSqlReader.getRawContacts();

        contacts = contacts.filter(c => c.name || c.company);

        contacts.sort((a, b) => {
            const dateA = new Date(a.createdTime);
            const dateB = new Date(b.createdTime);
            if (isNaN(dateB.getTime())) return -1;
            if (isNaN(dateA.getTime())) return 1;
            return dateB - dateA;
        });

        if (limit > 0) contacts = contacts.slice(0, limit);

        // =========================================================
        // [LAZY AUTO-TAG & WRITE-BACK]
        // =========================================================
        try {
            const sysConfig = await this.systemService.getSystemConfig();
            let hasUpdates = false;
            for (let c of contacts) {
                if (this._applyExhibitionAutoTag(c, sysConfig)) {
                    if (!this.rawContactSqlWriter) {
                        throw new Error('[ContactService] rawContactSqlWriter not configured');
                    }
                    if (!c.cardId) {
                        throw new Error('[ContactService] RAW SQL cardId missing during auto-tag write');
                    }
                    await this.rawContactSqlWriter.updateRawContactByCardId(c.cardId, c);
                    hasUpdates = true;
                }
            }
        } catch (error) {
            console.warn('[ContactService] Lazy auto-tag failed safely:', error.message);
        }
        // =========================================================

        return contacts;
    }

    async searchContacts(query) {
        try {
            let contacts = await this.getPotentialContacts(9999);
            if (query) {
                const searchTerm = query.toLowerCase();
                contacts = contacts.filter(c => [
                    c.name,
                    c.company,
                    c.position,
                    c.jobTitle,
                    c.department,
                    c.phone,
                    c.mobile,
                    c.email,
                    c.notes
                ].some(value => String(value || '').toLowerCase().includes(searchTerm)));
            }
            return { data: contacts };
        } catch (error) {
            console.error('[ContactService] searchContacts Error:', error);
            throw error;
        }
    }

    async searchOfficialContacts(query, page = 1, sort = 'updatedTime', order = 'desc', limit = null) {
        try {
            const pageSize = limit ? parseInt(limit, 10) : ((this.config && this.config.PAGINATION) ? this.config.PAGINATION.CONTACTS_PER_PAGE : 20);
            const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
            const parsedPage = parseInt(page, 10);
            const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

            if (this.contactSqlReader) {
                try {
                    const companyNameMap = await this._getCompanyNameMap();
                    const matchingCompanyIds = this._resolveMatchingCompanyIds(companyNameMap, query);
                    const result = await this.contactSqlReader.getContacts({
                        query,
                        companyIds: matchingCompanyIds,
                        page: safePage,
                        limit: safePageSize,
                        sort,
                        order,
                        withCount: true
                    });

                    const contacts = (result.data || [])
                        .map(c => this._mapSqlContact(c))
                        .map(contact => this._mapOfficialContact(contact, companyNameMap));
                    const totalItems = result.total || 0;
                    const startIndex = (safePage - 1) * safePageSize;

                    return {
                        data: contacts,
                        pagination: {
                            current: safePage,
                            total: Math.ceil(totalItems / safePageSize),
                            totalItems,
                            hasNext: (startIndex + safePageSize) < totalItems,
                            hasPrev: safePage > 1
                        }
                    };
                } catch (error) {
                    console.warn('[ContactService] SQL contact list read failed. Falling back to legacy in-memory path:', error.message);
                }
            }

            let contacts = await this._fetchOfficialContactsWithCompanies();

            if (query) {
                const searchTerm = query.toLowerCase();
                contacts = contacts.filter(c =>
                    (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                    (c.companyName && c.companyName.toLowerCase().includes(searchTerm))
                );
            }

            // Global sort strictly before slicing to ensure true pagination order
            const isDesc = order.toLowerCase() !== 'asc';
            contacts.sort((a, b) => {
                const timeA = new Date(a.updatedTime || a.lastUpdateTime || a.createdTime || 0).getTime();
                const timeB = new Date(b.updatedTime || b.lastUpdateTime || b.createdTime || 0).getTime();
                return isDesc ? timeB - timeA : timeA - timeB;
            });

            const startIndex = (safePage - 1) * safePageSize;
            const paginated = contacts.slice(startIndex, startIndex + safePageSize);

            return {
                data: paginated,
                pagination: {
                    current: safePage,
                    total: Math.ceil(contacts.length / safePageSize),
                    totalItems: contacts.length,
                    hasNext: (startIndex + safePageSize) < contacts.length,
                    hasPrev: safePage > 1
                }
            };
        } catch (error) {
            console.error('[ContactService] searchOfficialContacts Error:', error);
            throw error;
        }
    }

    async getContactById(contactId) {
        if (this.contactSqlReader) {
            try {
                const sqlContact = await this.contactSqlReader.getContactById(contactId);
                if (sqlContact) {
                    const allCompanies = await this.companyReader.getCompanyList();
                    const companyNameMap = new Map(allCompanies.map(c => [c.companyId, c.companyName]));
                    const mappedContact = this._mapSqlContact(sqlContact);
                    return this._mapOfficialContact(mappedContact, companyNameMap);
                }
                console.warn(`[ContactService] Contact ID ${contactId} not found in SQL. Attempting Fallback.`);
            } catch (error) {
                console.warn('[ContactService] SQL Single Read Error (Fallback):', error.message);
            }
        }

        const contacts = await this._fetchOfficialContactsWithCompanies(true);
        const contact = contacts.find(c => c.contactId === contactId);
        return contact || null;
    }

    /**
     * [ZONE: HYBRID / READ]
     * Retrieves contacts linked to an opportunity.
     * [Phase 8.8] Delegate SQL completely to SqlReader.
     */
    async getLinkedContacts(opportunityId) {
        try {
            if (!this.contactSqlReader) {
                console.warn('[ContactService] contactSqlReader is not injected. Cannot fetch linked contacts.');
                return [];
            }

            // 1. Fetch links & contacts via injected SQL Reader
            const linkedContacts = await this.contactSqlReader.getContactsByOpportunityId(opportunityId);

            if (!linkedContacts || linkedContacts.length === 0) return [];

            // 2. Fetch companies to map companyName (safely fallback to reader if SQL isn't injected)
            const allCompanies = this.companySqlReader 
                ? await this.companySqlReader.getCompanies() 
                : await this.companyReader.getCompanyList();
                
            const companyNameMap = new Map(allCompanies.map(c => [c.companyId, c.companyName]));

            const rawBySourceId = new Map();
            const rawSourceIds = [...new Set(linkedContacts
                .map(contact => contact.sourceId)
                .filter(sourceId => this._normalizeRawSourceIdentifier(sourceId))
            )];

            await Promise.all(rawSourceIds.map(async sourceId => {
                try {
                    const rawContact = await this._resolveRawContactFromSourceId(sourceId);
                    if (rawContact) rawBySourceId.set(String(sourceId), rawContact);
                } catch (error) {
                    console.warn(`[ContactService] RAW driveLink enrichment skipped for sourceId ${sourceId}: ${error.message}`);
                }
            }));

            // 3. Format and return
            return linkedContacts.map(contact => {
                const companyName = companyNameMap.get(contact.companyId) || companyNameMap.get(contact.companyId) || '';
                const rawContact = rawBySourceId.get(String(contact.sourceId));

                return {
                    contactId: contact.contactId,
                    sourceId: contact.sourceId,
                    name: contact.name,
                    companyId: contact.companyId,
                    department: contact.department,
                    position: contact.jobTitle || contact.position,
                    mobile: contact.mobile,
                    phone: contact.phone,
                    email: contact.email,
                    companyName,
                    cardId: rawContact ? rawContact.cardId || '' : '',
                    rowIndex: rawContact ? rawContact.rowIndex || '' : '',
                    driveLink: rawContact ? rawContact.driveLink || '' : ''
                };
            });

        } catch (error) {
            console.error('[ContactService] getLinkedContacts Error:', error);
            return [];
        }
    }

    async getContactOpportunities(contactId) {
        if (!this.contactSqlReader) {
            throw new Error('[ContactService] CRITICAL: ContactSqlReader not configured. Reverse opportunity lookup disallowed.');
        }

        return await this.contactSqlReader.getOpportunitiesByContactId(contactId);
    }

    // ============================================================
    // CORE CONTACT ZONE (PHASE 7: SQL ONLY WRITES)
    // ============================================================
    
    async createContact(contactData, user) {
        if (!this.contactSqlWriter) {
            throw new Error('[ContactService] CRITICAL: ContactSqlWriter not configured. Create disallowed.');
        }

        const result = await this.contactSqlWriter.createContact(contactData, user);

        if (this.contactCoreReader && this.contactCoreReader.invalidateCache) {
            this.contactCoreReader.invalidateCache('contactList');
        }

        return result;
    }

    async updateContact(contactId, updateData, user) {
        if (!this.contactSqlWriter) {
            throw new Error('[ContactService] CRITICAL: ContactSqlWriter not configured. Update disallowed.');
        }

        await this.contactSqlWriter.updateContact(contactId, updateData, user);

        if (this.contactCoreReader && this.contactCoreReader.invalidateCache) {
            this.contactCoreReader.invalidateCache('contactList');
        }

        return { success: true };
    }

    async syncContactFromSource(contactId, options = {}, user = 'System') {
        const coreContact = await this.getContactById(contactId);
        if (!coreContact) throw new Error(`Contact not found: ${contactId}`);

        const sourceId = coreContact.sourceId;
        const rawContact = await this._resolveRawContactFromSourceId(sourceId);
        if (!rawContact) {
            throw new Error('Contact does not have a linked RAW business card source.');
        }

        const fields = [
            { key: 'name', label: '姓名', core: coreContact.name, raw: rawContact.name },
            { key: 'department', label: '部門', core: coreContact.department, raw: rawContact.department },
            { key: 'position', label: '職稱', core: coreContact.position || coreContact.jobTitle, raw: rawContact.position || rawContact.jobTitle },
            { key: 'mobile', label: '手機', core: coreContact.mobile, raw: rawContact.mobile },
            { key: 'phone', label: '電話', core: coreContact.phone, raw: rawContact.phone },
            { key: 'email', label: 'Email', core: coreContact.email, raw: rawContact.email }
        ];

        const updateData = {};
        fields.forEach(field => {
            if (String(field.raw || '').trim()) {
                updateData[field.key] = field.raw;
                if (field.key === 'position') updateData.jobTitle = field.raw;
            }
        });

        if (options.previewOnly) {
            return {
                success: true,
                preview: true,
                contact: coreContact,
                rawContact,
                fields
            };
        }

        if (Object.keys(updateData).length > 0) {
            await this.updateContact(contactId, updateData, user);
        }

        const updatedContact = await this.getContactById(contactId);
        return {
            success: true,
            contact: updatedContact,
            rawContact,
            fields
        };
    }

    async deleteContact(contactId, user) {
        if (!this.contactSqlWriter) {
            throw new Error('[ContactService] CRITICAL: ContactSqlWriter not configured. Delete disallowed.');
        }
        if (!this.contactSqlReader) {
            throw new Error('[ContactService] CRITICAL: ContactSqlReader not configured. Validation disallowed.');
        }
        if (!this.opportunitySqlWriter) {
            throw new Error('[ContactService] CRITICAL: OpportunitySqlWriter not configured. Relationship cleanup disallowed.');
        }

        if (!contactId) {
            throw new Error('[ContactService] Contact ID is required. Delete disallowed.');
        }

        // 1. Remove opportunity relationship rows before deleting the formal contact.
        const unlinkResult = await this.opportunitySqlWriter.unlinkAllOpportunitiesForContact(contactId);
        if (unlinkResult && unlinkResult.success === false) {
            return unlinkResult;
        }

        // 2. Perform Delete
        await this.contactSqlWriter.deleteContact(contactId);

        if (this.contactCoreReader && this.contactCoreReader.invalidateCache) {
            this.contactCoreReader.invalidateCache('contactList');
        }

        return { success: true };
    }

    // ============================================================
    // RAW CONTACT ZONE (POTENTIAL CONTACTS - SQL ONLY)
    // ============================================================

    async getPotentialContactByRow(identifier) {
        return (await this.resolveRawSqlIdentifier(identifier)).rawContact;
    }

    async updatePotentialContact(identifier, updateData, modifier) {
        try {
            if (!this.rawContactSqlWriter) {
                throw new Error('[ContactService] rawContactSqlWriter not configured');
            }
            
            const { cardId, rawContact: target } = await this.resolveRawSqlIdentifier(identifier);
            const mergedData = { ...target, ...updateData };

            // =========================================================
            // [FALLBACK AUTO-TAG LOGIC & NORMALIZATION]
            // STRICT EVALUATION: Only execute when target.is_exhibition lacks a true/false state.
            // Builds the final normalized display string (Name + Date suffix) and commits it to RAW R.
            // =========================================================
            try {
                const sysConfig = await this.systemService.getSystemConfig();
                this._applyExhibitionAutoTag(mergedData, sysConfig);
            } catch (configError) {
                console.warn('[ContactService] Fallback auto-tag skipped safely due to error:', configError.message);
            }
            // =========================================================

            if (mergedData.is_exhibition === false) {
                mergedData.exhibition_name = '';
            }

            const result = await this.rawContactSqlWriter.updateRawContactByCardId(cardId, mergedData);
            if (!result || result.success === false) {
                throw new Error(result && result.error ? result.error : `RAW SQL update failed: ${cardId}`);
            }

            return { success: true };
        } catch (error) {
            console.error('[ContactService] updatePotentialContact Error:', error);
            throw error;
        }
    }

    /**
     * Physically deletes a RAW contact (SQL row)
     * @param {number|string} identifier
     * @param {string} user 
     */
    async deletePotentialContact(identifier, user) {
        try {
            if (!this.rawContactSqlWriter) {
                throw new Error('[ContactService] CRITICAL: RawContactSqlWriter not configured. RAW Delete disallowed.');
            }

            const { cardId } = await this.resolveRawSqlIdentifier(identifier);
            const result = await this.rawContactSqlWriter.deleteRawContactByCardId(cardId);
            if (!result || result.success === false) {
                throw new Error(result && result.error ? result.error : `RAW SQL delete failed: ${cardId}`);
            }
            return { success: true };
        } catch (error) {
            console.error('[ContactService] deletePotentialContact Error:', error);
            throw error;
        }
    }
}

module.exports = ContactService;
