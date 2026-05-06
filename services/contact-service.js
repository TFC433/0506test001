/**
 * services/contact-service.js
 * 聯絡人業務邏輯服務層
 * @version 8.16.0
 * @date 2026-04-19
 * @changelog
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
 * - RAW CONTACT ZONE (Potential): Sheet ONLY via rowIndex.
 * - READS: Hybrid (SQL Primary -> Sheet Fallback) maintained for backward compatibility.
 */

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
     */
    constructor(contactRawReader, contactCoreReader, contactWriter, companyReader, config, contactSqlReader, contactSqlWriter, companySqlReader, systemService) {
        this.contactRawReader = contactRawReader;
        this.contactCoreReader = contactCoreReader;
        this.contactWriter = contactWriter;
        this.companyReader = companyReader;
        this.config = config || { PAGINATION: { CONTACTS_PER_PAGE: 20 } };
        this.contactSqlReader = contactSqlReader;
        this.contactSqlWriter = contactSqlWriter;
        this.companySqlReader = companySqlReader;
        
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
        const allCompanies = await this.companyReader.getCompanyList();
        const companyNameMap = new Map(allCompanies.map(c => [c.companyId, c.companyName]));

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
            if (!this.contactRawReader) throw new Error('[ContactService] contactRawReader not configured');
            const contacts = await this.contactRawReader.getContacts();
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
        if (!this.contactRawReader) throw new Error('[ContactService] contactRawReader not configured');
        let contacts = await this.contactRawReader.getContacts();

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
                    await this.contactWriter.writePotentialContactRow(c.rowIndex, c);
                    hasUpdates = true;
                }
            }
            if (hasUpdates && this.contactRawReader.invalidateCache) {
                this.contactRawReader.invalidateCache('contacts');
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
                contacts = contacts.filter(c =>
                    (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                    (c.company && c.company.toLowerCase().includes(searchTerm))
                );
            }
            return { data: contacts };
        } catch (error) {
            console.error('[ContactService] searchContacts Error:', error);
            throw error;
        }
    }

    async searchOfficialContacts(query, page = 1, sort = 'updatedTime', order = 'desc', limit = null) {
        try {
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

            const pageSize = limit ? parseInt(limit, 10) : ((this.config && this.config.PAGINATION) ? this.config.PAGINATION.CONTACTS_PER_PAGE : 20);
            const startIndex = (page - 1) * pageSize;
            const paginated = contacts.slice(startIndex, startIndex + pageSize);

            return {
                data: paginated,
                pagination: {
                    current: page,
                    total: Math.ceil(contacts.length / pageSize),
                    totalItems: contacts.length,
                    hasNext: (startIndex + pageSize) < contacts.length,
                    hasPrev: page > 1
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

            // 3. Format and return
            return linkedContacts.map(contact => {
                const companyName = companyNameMap.get(contact.companyId) || companyNameMap.get(contact.companyId) || '';

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
                    driveLink: '' // [Forensics] RAW Sheet fetch removed completely
                };
            });

        } catch (error) {
            console.error('[ContactService] getLinkedContacts Error:', error);
            return [];
        }
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

    async deleteContact(contactId, user) {
        if (!this.contactSqlWriter) {
            throw new Error('[ContactService] CRITICAL: ContactSqlWriter not configured. Delete disallowed.');
        }
        if (!this.contactSqlReader) {
            throw new Error('[ContactService] CRITICAL: ContactSqlReader not configured. Validation disallowed.');
        }

        // 1. Authoritative Validation: Check for relations
        const hasLinks = await this.contactSqlReader.checkContactHasLinks(contactId);
        
        if (hasLinks) {
            // Safe Block: Return error response payload instead of throwing a raw exception
            return { success: false, error: '無法刪除：該聯絡人已關聯至機會案件' };
        }

        // 2. Perform Delete
        await this.contactSqlWriter.deleteContact(contactId);

        if (this.contactCoreReader && this.contactCoreReader.invalidateCache) {
            this.contactCoreReader.invalidateCache('contactList');
        }

        return { success: true };
    }

    // ============================================================
    // RAW CONTACT ZONE (POTENTIAL CONTACTS - SHEET ONLY)
    // ============================================================

    async getPotentialContactByRow(rowIndex) {
        if (!this.contactRawReader) throw new Error('[ContactService] contactRawReader not configured');
        const allContacts = await this.contactRawReader.getContacts();
        return allContacts.find(c => c.rowIndex === parseInt(rowIndex, 10)) || null;
    }

    async updatePotentialContact(rowIndex, updateData, modifier) {
        try {
            if (!this.contactRawReader) throw new Error('[ContactService] contactRawReader not configured');
            
            const allContacts = await this.contactRawReader.getContacts();
            const target = allContacts.find(c => c.rowIndex === parseInt(rowIndex));
            if (!target) throw new Error(`找不到潛在客戶 Row: ${rowIndex}`);

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

            if (updateData.notes) {
                const oldNotes = target.notes || '';
                const newNoteEntry = `[${modifier} ${new Date().toLocaleDateString()}] ${updateData.notes}`;
                mergedData.notes = oldNotes ? `${oldNotes}\n${newNoteEntry}` : newNoteEntry;
            }

            await this.contactWriter.writePotentialContactRow(rowIndex, mergedData);

            if (this.contactRawReader.invalidateCache) {
                this.contactRawReader.invalidateCache('contacts');
            }

            return { success: true };
        } catch (error) {
            console.error('[ContactService] updatePotentialContact Error:', error);
            throw error;
        }
    }

    /**
     * Physically deletes a RAW contact (Sheet Row)
     * @param {number|string} rowIndex 
     * @param {string} user 
     */
    async deletePotentialContact(rowIndex, user) {
        try {
            if (!this.contactWriter) {
                throw new Error('[ContactService] CRITICAL: ContactWriter not configured. RAW Delete disallowed.');
            }

            const parsedRow = parseInt(rowIndex, 10);
            
            // Strict guardrail: Prevent deleting header or invalid rows
            if (isNaN(parsedRow) || parsedRow <= 1) {
                return { success: false, error: '無效的資料列索引，禁止刪除標題列或不存在的列' };
            }

            await this.contactWriter.deletePotentialContactRow(parsedRow);
            
            // [Bugfix] Explicitly invalidate the RAW reader cache so frontend gets fresh data
            if (this.contactRawReader && this.contactRawReader.invalidateCache) {
                this.contactRawReader.invalidateCache('contacts');
            }
            
            return { success: true };
        } catch (error) {
            console.error('[ContactService] deletePotentialContact Error:', error);
            throw error;
        }
    }
}

module.exports = ContactService;