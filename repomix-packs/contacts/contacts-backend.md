This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: routes/contact.routes.js, controllers/contact.controller.js, services/contact-service.js, data/contact-reader.js, data/contact-writer.js, data/contact-sql-reader.js, data/contact-sql-writer.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/contact.controller.js
data/contact-reader.js
data/contact-sql-reader.js
data/contact-sql-writer.js
data/contact-writer.js
routes/contact.routes.js
services/contact-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/contact.controller.js">
/**
 * controllers/contact.controller.js
 * 聯絡人模組控制器
 * * @version 8.3.0
 * * @date 2026-04-19
 * * @description 負責處理聯絡人相關的 HTTP 請求，驗證參數，並呼叫對應的 Service。
 * * [Feature] Handled `limit` parameter for searchContactList to enable dynamic CORE pagination sizing.
 * * [Feature] Handled `sort` and `order` parameters for searchContactList to enable dynamic CORE sorting.
 * * [Feature] Added deleteRawContact for physical Google Sheet row deletion.
 *
 * ============================================================================
 * WORLD MODEL (CONTROLLER LAYER):
 *
 * 1. RAW ZONE (Potential Contacts)
 * - Source: Google Sheets (via ContactService -> ContactReader).
 * - Identity: rowIndex (Volatile, Sheet-based).
 * - Routes: GET / (searchContacts), GET /dashboard, POST /:rowIndex/file, PUT /:rowIndex/raw, DELETE /:rowIndex/raw.
 * - Purpose: OCR intake, high-volume, unverified data.
 * - Writes: Sheet-level Field Edits and Physical Row Deletions.
 *
 * 2. CORE ZONE (Official Contacts)
 * - Source: SQL (Primary) via ContactService -> ContactSqlReader/Writer.
 * - Identity: contactId (Stable, UUID/C-prefixed).
 * - Routes: GET /list (searchContactList), PUT /:contactId, DELETE /:contactId.
 * - Purpose: Clean, curated CRM entities linked to Companies/Opportunities.
 * - Writes: SQL ONLY (Strict Authority). Safe Delete logic active.
 *
 * 3. THE HANDOFF (Upgrade Flow)
 * - Route: POST /:rowIndex/upgrade.
 * - Action: Delegates to WorkflowService to promote RAW -> CORE.
 * - Note: This controller acts only as a router; it does NOT perform promotion logic.
 * ============================================================================
 */

const { handleApiError } = require('../middleware/error.middleware');

class ContactController {
    /**
     * @param {ContactService} contactService - 核心業務服務
     * @param {WorkflowService} workflowService - 跨模組工作流服務 (用於升級、歸檔)
     * @param {ContactWriter} contactWriter - (Legacy) 部分舊邏輯可能需要的寫入器
     */
    constructor(contactService, workflowService, contactWriter) {
        this.contactService = contactService;
        this.workflowService = workflowService;
        this.contactWriter = contactWriter;
    }

    /**
     * [ZONE: RAW / POTENTIAL]
     * GET /api/contacts
     */
    searchContacts = async (req, res) => {
        try {
            const result = await this.contactService.getPotentialContacts();
            res.json({ data: result });
        } catch (error) {
            handleApiError(res, error, 'Get Potential Contacts');
        }
    };

    /**
     * [ZONE: RAW / POTENTIAL]
     * GET /api/contacts/dashboard
     */
    getDashboardStats = async (req, res) => {
        try {
            const stats = await this.contactService.getDashboardStats();
            res.json(stats);
        } catch (error) {
            handleApiError(res, error, 'Get Contact Dashboard Stats');
        }
    };

    /**
     * [ZONE: CORE / OFFICIAL]
     * GET /api/contacts/list
     */
    searchContactList = async (req, res) => {
        try {
            const query = req.query.q || '';
            const page = parseInt(req.query.page || 1);
            const sort = req.query.sort || 'updatedTime';
            const order = req.query.order || 'desc';
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
            
            const result = await this.contactService.searchOfficialContacts(query, page, sort, order, limit);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Search Contact List');
        }
    };

    /**
     * [ZONE: BOUNDARY / HANDOFF]
     * POST /api/contacts/:rowIndex/upgrade
     */
    upgradeContact = async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            const user = req.user ? req.user.name : 'System';

            if (!this.workflowService) {
                console.error('Critical Error: WorkflowService not initialized in ContactController');
                throw new Error('系統內部錯誤: WorkflowService 未初始化');
            }

            console.log(`[ContactController] Upgrading contact at row ${rowIndex} by ${user}`);

            const result = await this.workflowService.upgradeContactToOpportunity(
                rowIndex, 
                req.body, 
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Upgrade Contact');
        }
    };

    /**
     * [ZONE: CORE / OFFICIAL]
     * PUT /api/contacts/:contactId
     */
    updateContact = async (req, res) => {
        try {
            const contactId = req.params.contactId;
            const user = req.user ? req.user.name : 'System';

            const result = await this.contactService.updateContact(
                contactId, 
                req.body, 
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Contact');
        }
    };

    /**
     * [ZONE: CORE / OFFICIAL]
     * DELETE /api/contacts/:contactId
     */
    deleteContact = async (req, res) => {
        try {
            const contactId = req.params.contactId;
            const user = req.user ? req.user.name : 'System';

            const result = await this.contactService.deleteContact(contactId, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Contact');
        }
    };

    /**
     * [ZONE: RAW / POTENTIAL]
     * PUT /api/contacts/:rowIndex/raw
     */
    updateRawContact = async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            const user = req.body.modifier || (req.user ? req.user.name : 'System');

            const result = await this.contactService.updatePotentialContact(
                rowIndex,
                req.body,
                user
            );
            
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Raw Contact');
        }
    };

    /**
     * [ZONE: RAW / POTENTIAL]
     * DELETE /api/contacts/:rowIndex/raw
     * 刪除潛在客戶資料 (RAW Data - Physical Delete)
     * Identity: rowIndex
     * Target: Google Sheets (Row Deletion)
     * Contract: Physically deletes a RAW OCR contact row from the Sheet.
     */
    deleteRawContact = async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            const user = req.user ? req.user.name : 'System';

            const result = await this.contactService.deletePotentialContact(rowIndex, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Raw Contact');
        }
    };

    /**
     * [ZONE: HYBRID / WORKFLOW]
     * POST /api/contacts/:contactId/link-card
     */
    linkCardToContact = async (req, res) => {
        try {
            const { contactId } = req.params;
            const { businessCardRowIndex } = req.body;
            const user = req.user ? req.user.name : 'System';

            if (!businessCardRowIndex) {
                return res.status(400).json({ success: false, error: '缺少 businessCardRowIndex 參數' });
            }
            
            const result = await this.workflowService.linkBusinessCardToContact(
                contactId, 
                parseInt(businessCardRowIndex), 
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Link Card to Contact');
        }
    };

    /**
     * [ZONE: RAW / POTENTIAL]
     * POST /api/contacts/:rowIndex/file
     */
    fileContact = async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            const user = req.user ? req.user.name : 'System';

            const result = await this.workflowService.fileContact(
                rowIndex, 
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'File Contact');
        }
    };
}

module.exports = ContactController;
</file>

<file path="data/contact-reader.js">
/**
 * data/contact-reader.js
 * 專門負責讀取所有與「聯絡人」相關資料的類別
 * @version 7.1.0
 * @date 2026-03-21
 * @description 
 * [SQL-Ready Refactor]
 * 1. 移除所有業務邏輯 (Filter, Sort, Pagination, Join)。
 * 2. 移除 Cross-Reader Coupling (不再 require company-reader)。
 * 3. 確保回傳 rowIndex，供 Service 傳遞給 Writer 進行 Update。
 * 4. 僅保留 Raw Data Access 方法。
 * * Changelog:
 * - [V7.1.0] Updated rowParser to explicitly extract EXHIBITION_NAME and IS_EXHIBITION from repurposed indexes 17 and 18.
 * This enables safe verification of existing tags for the Fallback Auto-Tag mechanism.
 */

const BaseReader = require('./base-reader');

class ContactReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得原始名片資料 (潛在客戶) - Raw Data Only
     * @returns {Promise<Array<object>>}
     */
    async getContacts() {
        const cacheKey = 'contacts';
        const range = `${this.config.SHEETS.CONTACTS}!A:Y`;

        const rowParser = (row, index) => {
            const driveLink = row[this.config.CONTACT_FIELDS.DRIVE_LINK] || '';
            
            return {
                // [Critical] 用於 Service -> Writer 的定位
                rowIndex: index + 2,
                
                // 基礎資料欄位
                createdTime: row[this.config.CONTACT_FIELDS.TIME] || '',
                name: row[this.config.CONTACT_FIELDS.NAME] || '',
                company: row[this.config.CONTACT_FIELDS.COMPANY] || '',
                position: row[this.config.CONTACT_FIELDS.POSITION] || '',
                department: row[this.config.CONTACT_FIELDS.DEPARTMENT] || '',
                phone: row[this.config.CONTACT_FIELDS.PHONE] || '',
                mobile: row[this.config.CONTACT_FIELDS.MOBILE] || '',
                email: row[this.config.CONTACT_FIELDS.EMAIL] || '',
                website: row[this.config.CONTACT_FIELDS.WEBSITE] || '',
                address: row[this.config.CONTACT_FIELDS.ADDRESS] || '',
                confidence: row[this.config.CONTACT_FIELDS.CONFIDENCE] || '',
                status: row[this.config.CONTACT_FIELDS.STATUS] || '',
                notes: row[this.config.CONTACT_FIELDS.NOTES] || '', 
                
                // [Fallback Auto-Tag] Safely read the repurposed fields
                exhibition_name: row[this.config.CONTACT_FIELDS.EXHIBITION_NAME] || '',
                is_exhibition: row[this.config.CONTACT_FIELDS.IS_EXHIBITION] || '',

                // 圖片連結
                driveLink: driveLink,
                cardImage: driveLink,
                
                // LINE 整合資訊
                lineUserId: row[this.config.CONTACT_FIELDS.LINE_USER_ID] || '',
                userNickname: row[this.config.CONTACT_FIELDS.USER_NICKNAME] || ''
            };
        };
        
        // 移除所有 sorter 與 slice
        return this._fetchAndCache(cacheKey, range, rowParser);
    }

    /**
     * 取得聯絡人總表 (已建檔正式聯絡人) - Raw Data Only
     * @returns {Promise<Array<object>>}
     */
    async getContactList() {
        const cacheKey = 'contactList';
        const range = `${this.config.SHEETS.CONTACT_LIST}!A:M`;

        const rowParser = (row, index) => ({
            // [Critical] 用於 Service -> Writer 的定位 (假設 Header 為 1 行，數據從第 2 行開始)
            rowIndex: index + 2,
            
            contactId: row[0] || '',
            sourceId: row[1] || '',
            name: row[2] || '',
            companyId: row[3] || '',
            department: row[4] || '',
            position: row[5] || '',
            mobile: row[6] || '',
            phone: row[7] || '',
            email: row[8] || '',
            createdTime: row[9] || '',
            lastUpdateTime: row[10] || '',
            creator: row[11] || '',
            lastModifier: row[12] || ''
        });

        // 移除 Join CompanyName 邏輯
        return this._fetchAndCache(cacheKey, range, rowParser);
    }
    
    /**
     * 讀取並快取所有的「機會-聯絡人」關聯
     * @returns {Promise<Array<object>>}
     */
    async getAllOppContactLinks() {
        const cacheKey = 'oppContactLinks';
        const range = `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`;

        const rowParser = (row) => ({
            linkId: row[this.config.OPP_CONTACT_LINK_FIELDS.LINK_ID] || '',
            opportunityId: row[this.config.OPP_CONTACT_LINK_FIELDS.OPPORTUNITY_ID] || '',
            contactId: row[this.config.OPP_CONTACT_LINK_FIELDS.CONTACT_ID] || '',
            createTime: row[this.config.OPP_CONTACT_LINK_FIELDS.CREATE_TIME] || '',
            status: row[this.config.OPP_CONTACT_LINK_FIELDS.STATUS] || '',
            creator: row[this.config.OPP_CONTACT_LINK_FIELDS.CREATOR] || '',
        });

        return this._fetchAndCache(cacheKey, range, rowParser);
    }
}

module.exports = ContactReader;
</file>

<file path="data/contact-sql-reader.js">
/**
 * data/contact-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: contacts
 * - Schema: Strict adherence to provided JSON schema
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.6.1 (Phase 8.2 Safe Delete Validation)
 * - Date: 2026-03-13
 * - Changelog: 
 * - Added checkContactHasLinks to support conditional delete validation.
 * - Removed Supabase relational join in getContactsByOpportunityId to fix schema cache crash.
 * - Implemented strict 2-step application-level join logic.
 * - Added getContactList adapter to abstract legacy method requirements.
 * - Added getRecentContactsFeed to eliminate full table fetch during dashboard render.
 */

const { supabase } = require('../config/supabase');

class ContactSqlReader {

    constructor() {
        this.tableName = 'contacts';
    }

    /**
     * [Phase 8.2 Safe Delete Validation]
     * Check if a contact is actively linked to any opportunity.
     * @param {string} contactId 
     * @returns {Promise<boolean>} True if relations exist, false otherwise.
     */
    async checkContactHasLinks(contactId) {
        if (!contactId) throw new Error('ContactSqlReader: contactId is required');

        try {
            const { data, error } = await supabase
                .from('opportunity_contact_links')
                .select('link_id')
                .eq('contact_id', contactId)
                .eq('status', 'active')
                .limit(1);

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            return data && data.length > 0;
        } catch (error) {
            console.error('[ContactSqlReader] checkContactHasLinks Error:', error);
            throw error;
        }
    }

    /**
     * [Performance Fix] 
     * Get recent contacts limited by exact number. Used strictly to bypass 
     * full table memory allocation in DashboardService._prepareRecentActivity.
     * @param {number} limit 
     * @returns {Promise<Array<Object>>} Array of Contact DTOs
     */
    async getRecentContactsFeed(limit = 5) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order('created_time', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getRecentContactsFeed Error:', error);
            throw error;
        }
    }

    /**
     * [Compatibility Adapter]
     * Exposes getContactList to safely satisfy legacy CORE reader dependencies
     * without modifying service constructor signatures.
     * @returns {Promise<Array<Object>>}
     */
    async getContactList() {
        return this.getContacts();
    }

    /**
     * Get contact statistics (Total and This Month)
     * Phase 1 SQL Aggregation: Utilizes Supabase exact count avoiding row transmission.
     * @param {Date} startOfMonth 
     * @returns {Promise<{total: number, month: number}>}
     */
    async getContactStats(startOfMonth) {
        if (!startOfMonth) throw new Error('ContactSqlReader: startOfMonth is required');

        try {
            const startIso = startOfMonth.toISOString();

            const [totalRes, monthRes] = await Promise.all([
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }),
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_time', startIso)
            ]);

            if (totalRes.error) throw new Error(`[ContactSqlReader] DB Error (total): ${totalRes.error.message}`);
            if (monthRes.error) throw new Error(`[ContactSqlReader] DB Error (month): ${monthRes.error.message}`);

            return {
                total: totalRes.count || 0,
                month: monthRes.count || 0
            };
        } catch (error) {
            console.error('[ContactSqlReader] getContactStats Error:', error);
            throw error;
        }
    }

    /**
     * Get a single contact by ID
     * @param {string} contactId 
     * @returns {Promise<Object|null>} Contact DTO or null
     */
    async getContactById(contactId) {
        if (!contactId) throw new Error('ContactSqlReader: contactId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('contact_id', contactId)
                .single();

            // Ignore "Row not found" (PGRST116), throw strict on others
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;

            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[ContactSqlReader] getContactById Error:', error);
            throw error;
        }
    }

    /**
     * Get contacts by company ID
     * @param {string} companyId 
     * @returns {Promise<Array<Object>>} Array of Contact DTOs
     */
    async getContactsByCompanyId(companyId) {
        if (!companyId) throw new Error('ContactSqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId);

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getContactsByCompanyId Error:', error);
            throw error;
        }
    }

    /**
     * Get contacts linked to a specific opportunity
     * Performs a STRICT 2-Step Application Level Join to bypass schema cache errors.
     * @param {string} opportunityId 
     * @returns {Promise<Array<Object>>} Array of Contact DTOs with linkId attached
     */
    async getContactsByOpportunityId(opportunityId) {
        if (!opportunityId) throw new Error('ContactSqlReader: opportunityId is required');

        try {
            // STEP A: Query opportunity_contact_links only
            const { data: linkData, error: linkError } = await supabase
                .from('opportunity_contact_links')
                .select('link_id, contact_id, status')
                .eq('opportunity_id', opportunityId)
                .eq('status', 'active');

            if (linkError) {
                throw new Error(`[ContactSqlReader] DB Error (Links): ${linkError.message}`);
            }

            // STEP B: Collect contact_ids
            if (!linkData || linkData.length === 0) {
                return [];
            }

            const contactIds = linkData.map(link => link.contact_id).filter(Boolean);
            if (contactIds.length === 0) {
                return [];
            }

            // STEP C: Query contacts table directly
            const { data: contactsData, error: contactsError } = await supabase
                .from(this.tableName)
                .select('*')
                .in('contact_id', contactIds);

            if (contactsError) {
                throw new Error(`[ContactSqlReader] DB Error (Contacts): ${contactsError.message}`);
            }

            if (!contactsData || contactsData.length === 0) {
                return [];
            }

            // STEP D & E: Map contacts via _mapRowToDto and merge link_id back on
            const contactIdToLinkIdMap = new Map();
            linkData.forEach(link => {
                contactIdToLinkIdMap.set(link.contact_id, link.link_id);
            });

            return contactsData.map(row => {
                const dto = this._mapRowToDto(row);
                // Attach linkId dynamically for UI consumption
                dto.linkId = contactIdToLinkIdMap.get(row.contact_id);
                return dto;
            });

        } catch (error) {
            console.error('[ContactSqlReader] getContactsByOpportunityId Error:', error);
            throw error;
        }
    }

    /**
     * Get all contacts
     * @returns {Promise<Array<Object>>} Array of Contact DTOs
     */
    async getContacts() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            // Map all rows strictly
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getContacts Error:', error);
            throw error;
        }
    }

    /**
     * Maps Raw SQL Row to DTO
     * Strict adherence to provided schema.
     * snake_case -> camelCase
     */
    _mapRowToDto(row) {
        if (!row) return null;

        return {
            // Identity
            contactId: row.contact_id,
            sourceId: row.source_id,

            // Basic Info
            name: row.name,
            companyId: row.company_id,
            department: row.department,
            jobTitle: row.job_title,

            // Contact Info
            mobile: row.mobile,
            phone: row.phone,
            email: row.email,

            // Metadata / Audit
            createdTime: row.created_time,
            updatedTime: row.updated_time,
            createdBy: row.created_by,
            updatedBy: row.updated_by
        };
    }
}

module.exports = ContactSqlReader;
</file>

<file path="data/contact-sql-writer.js">
// data/contact-sql-writer.js
/**
 * data/contact-sql-writer.js
 * [Phase 7] SQL Writer for Official Contacts
 * @version 8.0.0 (Phase 8: World Model Annotation)
 * @date 2026-02-10
 * @description 
 * - Handles Create/Update/Delete for 'contacts' table.
 * - STRICT SCHEMA: No invention of columns.
 * - Locked Schema: contact_id, source_id, name, company_id, department, job_title, mobile, phone, email, created/updated_time/by.
 * * WORLD MODEL (PERSISTENCE LAYER):
 * 1. Scope:
 * - This writer is EXCLUSIVE to the CORE Contact entity (SQL).
 * - It NEVER writes to Google Sheets.
 * - It NEVER receives 'rowIndex'.
 * * 2. Ownership:
 * - Contacts created here are independent of their RAW source (except for `source_id` audit trail).
 * - Contacts created here do NOT know about Opportunities (No opportunity_id column).
 */

const { supabase } = require('../config/supabase');

class ContactSqlWriter {
    constructor() {
        this.tableName = 'contacts';
    }

    /**
     * Create Contact (SQL Only)
     * @param {Object} data - Contact DTO
     * @param {string} user - Creator name
     * @returns {Promise<Object>} { success: true, id: string }
     */
    async createContact(data, user) {
        // [Contract] Generate ID if missing. Pattern: C + Timestamp
        const contactId = data.contactId || data.id || `C${Date.now()}`;
        const now = new Date().toISOString();

        console.log(`👤 [ContactSqlWriter] Creating contact: ${data.name || 'Unnamed'} (ID: ${contactId})`);

        // STRICT SCHEMA MAPPING
        const payload = {
            contact_id: contactId,
            source_id: data.sourceId || 'MANUAL', // Ref to RAW contact if applicable
            name: data.name,
            company_id: data.companyId || data.company || null,
            department: data.department || '',
            job_title: data.jobTitle || data.position || '',
            mobile: data.mobile || '',
            phone: data.phone || data.tel || '',
            email: data.email || '',
            created_by: user,
            updated_by: user,
            created_time: now,
            updated_time: now
        };

        const { error } = await supabase
            .from(this.tableName)
            .insert([payload]);

        if (error) {
            console.error('[ContactSqlWriter] Create Failed:', error);
            throw new Error(`[ContactSqlWriter] Create Error: ${error.message}`);
        }

        return { success: true, id: contactId };
    }

    /**
     * Update Contact (SQL Only)
     * @param {string} contactId 
     * @param {Object} data - Partial update DTO
     * @param {string} user - Modifier name
     */
    async updateContact(contactId, data, user) {
        console.log(`👤 [ContactSqlWriter] Updating contact ${contactId} by ${user}`);

        const now = new Date().toISOString();
        
        // Base payload
        const payload = {
            updated_time: now,
            updated_by: user
        };

        // Strict field mapping (CamelCase -> snake_case)
        if (data.name !== undefined) payload.name = data.name;
        
        // Company ID
        if (data.companyId !== undefined) payload.company_id = data.companyId;
        else if (data.company !== undefined) payload.company_id = data.company;
        
        if (data.department !== undefined) payload.department = data.department;
        
        // Job Title / Position
        if (data.jobTitle !== undefined) payload.job_title = data.jobTitle;
        else if (data.position !== undefined) payload.job_title = data.position;
        
        if (data.mobile !== undefined) payload.mobile = data.mobile;
        
        // Phone / Tel
        if (data.phone !== undefined) payload.phone = data.phone;
        else if (data.tel !== undefined) payload.phone = data.tel;
        
        if (data.email !== undefined) payload.email = data.email;

        // Execute Update
        const { error } = await supabase
            .from(this.tableName)
            .update(payload)
            .eq('contact_id', contactId);

        if (error) {
            console.error('[ContactSqlWriter] Update Failed:', error);
            throw new Error(`[ContactSqlWriter] Update Error: ${error.message}`);
        }

        return { success: true };
    }

    /**
     * Delete Contact (SQL Only)
     * @param {string} contactId 
     */
    async deleteContact(contactId) {
        console.log(`🗑️ [ContactSqlWriter] Deleting contact ${contactId}`);

        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('contact_id', contactId);

        if (error) {
            console.error('[ContactSqlWriter] Delete Failed:', error);
            throw new Error(`[ContactSqlWriter] Delete Error: ${error.message}`);
        }

        return { success: true };
    }
}

module.exports = ContactSqlWriter;
</file>

<file path="data/contact-writer.js">
/**
 * data/contact-writer.js
 * 聯絡人資料寫入器
 * @version 7.2.0 (Phase 8.3 Exhibition Auto-Tag Support)
 * @date 2026-03-21
 * @description 
 * [SQL-Ready Refactor]
 * 1. 嚴格禁止呼叫 values.get (No Read)。
 * 2. 僅提供基於 rowIndex 的 Pure Write 方法。
 * 3. 使用 batchUpdate 實現精確的欄位更新。
 * 4. [Feature] 支援 deletePotentialContactRow 實現物理列刪除。
 * * Changelog:
 * - [V7.2.0] Safely appended pushUpdate checks for repurposed EXHIBITION_NAME and IS_EXHIBITION 
 * within writePotentialContactRow. Core column logic strictly unmodified.
 */
const BaseWriter = require('./base-writer');

class ContactWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - 目標 Spreadsheet ID
     * @param {Object} contactReader - 用於清除快取 (Optional)
     */
    constructor(sheets, spreadsheetId, contactReader) {
        super(sheets, spreadsheetId);
        this.contactReader = contactReader;
        
        this.SHEET_OFFICIAL = this.config.SHEETS.CONTACT_LIST || 'Contact_List';
        this.SHEET_POTENTIAL = this.config.SHEETS.CONTACTS || 'Raw_Data'; 
    }

    /**
     * 建立新聯絡人 (正式) - Append Only
     */
    async createContact(contactData) {
        try {
            const newRow = [
                contactData.id || contactData.contactId, 
                contactData.sourceId || 'MANUAL',
                contactData.name,
                contactData.company || contactData.companyId,
                contactData.department || '', 
                contactData.jobTitle || contactData.position || '',
                contactData.phone || '', 
                contactData.tel || '', 
                contactData.email || '',
                new Date().toISOString(),
                new Date().toISOString(),
                contactData.creator || 'System',
                contactData.modifier || 'System'
            ];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.targetSpreadsheetId,
                range: this.SHEET_OFFICIAL,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] }
            });

            console.log(`✅ [ContactWriter] Created contact: ${contactData.name}`);
            if (this.contactReader) this.contactReader.invalidateCache('contactList');
            return contactData.id;

        } catch (error) {
            console.error('❌ [ContactWriter] Create Failed:', error);
            throw error;
        }
    }

    /**
     * [Pure Write] 更新潛在客戶
     * 接收完整/部分資料，使用 batchUpdate 寫入指定欄位。
     * @param {number} rowIndex 
     * @param {Object} data - 包含要更新的欄位 (已由 Service 處理完畢)
     */
    async writePotentialContactRow(rowIndex, data) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}`);
        }

        const F = this.config.CONTACT_FIELDS;
        const updates = [];
        
        // Helper: Push update if field exists
        // Strictly Unmodified core logic: respects 0-25 indexing constraint securely.
        const pushUpdate = (colIndex, val) => {
            if (val !== undefined) {
                const colLetter = String.fromCharCode(65 + colIndex);
                updates.push({
                    range: `${this.SHEET_POTENTIAL}!${colLetter}${rowIndex}`,
                    values: [[val]]
                });
            }
        };

        pushUpdate(F.NAME, data.name);
        pushUpdate(F.COMPANY, data.company);
        pushUpdate(F.POSITION, data.position);
        pushUpdate(F.MOBILE, data.mobile);
        pushUpdate(F.EMAIL, data.email);
        
        if (F.NOTES !== undefined) {
            pushUpdate(F.NOTES, data.notes);
        }

        // [Fallback Auto-Tag] Add non-breaking write support for repurposed columns
        if (F.EXHIBITION_NAME !== undefined) {
            pushUpdate(F.EXHIBITION_NAME, data.exhibition_name);
        }

        if (F.IS_EXHIBITION !== undefined) {
            pushUpdate(F.IS_EXHIBITION, data.is_exhibition);
        }

        if (updates.length > 0) {
             await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }
        
        console.log(`✅ [ContactWriter] Wrote potential contact row ${rowIndex}`);
        return true;
    }

    /**
     * [Pure Write] 刪除潛在客戶 (物理刪除 Row)
     * 利用 BaseWriter 提供的 _deleteRow 進行整列刪除
     * @param {number} rowIndex
     */
    async deletePotentialContactRow(rowIndex) {
        const parsedRow = parseInt(rowIndex, 10);
        
        if (isNaN(parsedRow) || parsedRow <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}，禁止刪除標題列或無效列`);
        }

        console.log(`🗑️ [ContactWriter] Physically deleting RAW contact at Row ${parsedRow}`);
        
        // Calls the _deleteRow helper inherited from BaseWriter
        await this._deleteRow(this.SHEET_POTENTIAL, parsedRow, this.contactReader);
        
        return true;
    }

    /**
     * [Pure Write] 更新正式聯絡人
     * 接收 rowIndex，完全不進行 Read 或 Lookup。
     * @param {number} rowIndex - 由 Service 查詢後提供
     * @param {Object} data 
     * @param {string} modifier 
     */
    async updateContactRow(rowIndex, data, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}`);
        }

        console.log(`📝 [ContactWriter] Update Contact Row ${rowIndex} by ${modifier}`);
        
        const updates = [];
        // 欄位映射 (Hardcoded for Official List structure A-M)
        // A:ID, B:Source, C:Name, D:CompanyID, E:Dept, F:Title, G:Mobile, H:Phone, I:Email, J:Created, K:Updated, L:Creator, M:Modifier
        
        if (data.name !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!C${rowIndex}`, values: [[data.name]] });
        if (data.company !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!D${rowIndex}`, values: [[data.company]] }); // Assuming Service passes ID if changed
        if (data.department !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!E${rowIndex}`, values: [[data.department]] });
        if (data.jobTitle !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!F${rowIndex}`, values: [[data.jobTitle]] });
        if (data.phone !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!G${rowIndex}`, values: [[data.phone]] }); // Mobile
        if (data.tel !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!H${rowIndex}`, values: [[data.tel]] });
        if (data.email !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!I${rowIndex}`, values: [[data.email]] });
        
        // Update Metadata
        updates.push({ range: `${this.SHEET_OFFICIAL}!K${rowIndex}`, values: [[new Date().toISOString()]] });
        updates.push({ range: `${this.SHEET_OFFICIAL}!M${rowIndex}`, values: [[modifier]] });

        if (updates.length > 0) {
             await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: { valueInputOption: 'USER_ENTERED', data: updates }
            });
        }
        
        return true;
    }

    /**
     * @deprecated Removed in v7. Use updateContactRow instead.
     */
    async updateContact() {
        throw new Error('Deprecation: Use updateContactRow(rowIndex, data, modifier). Service must provide rowIndex.');
    }

    /**
     * @deprecated Removed in v7. Use writePotentialContactRow instead.
     */
    async updatePotentialContact() {
        throw new Error('Deprecation: Use writePotentialContactRow(rowIndex, data). Service must provide merged data.');
    }
}

module.exports = ContactWriter;
</file>

<file path="routes/contact.routes.js">
/**
 * routes/contact.routes.js
 * 聯絡人/潛在客戶模組路由
 * * @version 6.2.0 (Phase 8.2 RAW Physical Delete)
 * @date 2026-03-16
 */
const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/contact.controller');

// =======================================================
// 🏭 Controller Factory
// =======================================================
const getController = (req) => {
    const services = req.app.get('services');
    if (!services.contactService || !services.workflowService) {
        throw new Error('System Service Error: Contact or Workflow service not available.');
    }
    return new ContactController(
        services.contactService,
        services.workflowService,
        services.contactWriter
    );
};

// =======================================================
// 🛣️ Route Definitions
// =======================================================

// GET /api/contacts/dashboard (新增：統計資料路由)
// ★★★ 必須放在 '/' 或 '/:id' 之前，否則會被攔截 ★★★
router.get('/dashboard', async (req, res, next) => {
    try {
        await getController(req).getDashboardStats(req, res);
    } catch (e) { next(e); }
});

// GET /api/contacts (列表搜尋)
router.get('/', async (req, res, next) => {
    try {
        await getController(req).searchContacts(req, res);
    } catch (e) { next(e); }
});

// GET /api/contacts/list (正式名單)
router.get('/list', async (req, res, next) => {
    try {
        await getController(req).searchContactList(req, res);
    } catch (e) { next(e); }
});

// POST /api/contacts/:rowIndex/upgrade (升級)
router.post('/:rowIndex/upgrade', async (req, res, next) => {
    try {
        await getController(req).upgradeContact(req, res);
    } catch (e) { next(e); }
});

// PUT /api/contacts/:contactId (更新)
router.put('/:contactId', async (req, res, next) => {
    try {
        await getController(req).updateContact(req, res);
    } catch (e) { next(e); }
});

// DELETE /api/contacts/:contactId (刪除 - Safe conditional logic inside Service)
router.delete('/:contactId', async (req, res, next) => {
    try {
        await getController(req).deleteContact(req, res);
    } catch (e) { next(e); }
});

// PUT /api/contacts/:rowIndex/raw (更新 RAW 聯絡人)
router.put('/:rowIndex/raw', async (req, res, next) => {
    try {
        await getController(req).updateRawContact(req, res);
    } catch (e) { next(e); }
});

// DELETE /api/contacts/:rowIndex/raw (刪除 RAW 聯絡人 - Physical Sheet Delete)
router.delete('/:rowIndex/raw', async (req, res, next) => {
    try {
        await getController(req).deleteRawContact(req, res);
    } catch (e) { next(e); }
});

// POST /api/contacts/:contactId/link-card (連結名片)
router.post('/:contactId/link-card', async (req, res, next) => {
    try {
        await getController(req).linkCardToContact(req, res);
    } catch (e) { next(e); }
});

// POST /api/contacts/:rowIndex/file (歸檔)
router.post('/:rowIndex/file', async (req, res, next) => {
    try {
        await getController(req).fileContact(req, res);
    } catch (e) { next(e); }
});

module.exports = router;
</file>

<file path="services/contact-service.js">
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
</file>

</files>
