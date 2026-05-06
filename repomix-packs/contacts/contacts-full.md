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
- Only files matching these patterns are included: routes/contact.routes.js, controllers/contact.controller.js, services/contact-service.js, data/contact-*.js, public/scripts/contacts/*.js, public/components/modals/contact-modals.html, public/components/modals/link-contact-modal.html
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
public/components/modals/contact-modals.html
public/components/modals/link-contact-modal.html
public/scripts/contacts/contact-potential-manager.js
public/scripts/contacts/contacts.js
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

<file path="public/components/modals/contact-modals.html">
<div id="interactions-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">📋 互動紀錄</h2>
            <button class="close-btn" onclick="closeModal('interactions-modal')">&times;</button>
        </div>
        <div class="search-pagination">
            <input type="text" class="search-box" id="interactions-search" placeholder="搜尋互動紀錄..." onkeyup="searchInteractions()">
            <div class="pagination" id="interactions-pagination"></div>
        </div>
        <div id="interactions-content">
            <div class="loading show">
                <div class="spinner"></div>
                <p>載入互動紀錄中...</p>
            </div>
        </div>
    </div>
</div>
</file>

<file path="public/components/modals/link-contact-modal.html">
<style>
    /* Modal 內部頁籤樣式 */
    .link-contact-tabs {
        display: flex;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: var(--spacing-5);
    }
    .link-contact-tab {
        padding: var(--spacing-3) var(--spacing-5);
        cursor: pointer;
        font-weight: 600;
        color: var(--text-muted);
        border-bottom: 3px solid transparent;
        margin-bottom: -1px;
    }
    .link-contact-tab.active {
        color: var(--accent-blue);
        border-bottom-color: var(--accent-blue);
    }
    .link-contact-tab-content {
        display: none;
    }
    .link-contact-tab-content.active {
        display: block;
    }
    .search-result-list .kanban-card {
        margin-bottom: var(--spacing-3);
    }
</style>

<div id="link-contact-modal" class="modal">
    <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
            <h2 class="modal-title">關聯聯絡人</h2>
            <button class="close-btn" onclick="closeModal('link-contact-modal')">&times;</button>
        </div>

        <nav class="link-contact-tabs">
            <div class="link-contact-tab active" data-tab="from-potential">從名片新增</div>
            <div class="link-contact-tab" data-tab="from-existing">連結現有聯絡人</div>
            <div class="link-contact-tab" data-tab="create-new">快速建立新聯絡人</div>
        </nav>

        <div id="link-contact-content-container">
            </div>
    </div>
</div>
</file>

<file path="public/scripts/contacts/contact-potential-manager.js">
// views/scripts/components/potential-contacts-manager.js
/**
 * ============================================================================
 * File: public/scripts/contacts/contact-potential-manager.js
 * Version: v8.0.0 (Phase 8 UI Annotation)
 * Date: 2026-02-10
 * Author: Gemini (Assisted)
 *
 * Change Log:
 * - [Phase 8] Added World Model & Semantic Identity annotations.
 * - Comments only, no behavior change.
 *
 * WORLD MODEL (UI LAYER):
 * 1. Bridge / Status Manager:
 * - Connects RAW Contacts (Sheet/Potential Pool) with CORE Contacts (SQL/Official).
 * 2. Data Ownership:
 * - Does NOT own RAW data (Source: contacts.js / Sheet).
 * - Does NOT own CORE data (Source: contact-service.js / SQL).
 * 3. Responsibility:
 * - Visual Reconciliation: Compares RAW vs CORE to determine status (e.g., "已建檔", "已關聯").
 * - Action Trigger: Initiates file/link actions, but logic resides in API/Service.
 * ============================================================================
 */

/**
 * SEMANTIC IDENTITY (IMPORTANT):
 *
 * This module is SEMANTICALLY:
 * 👉 STATUS RECONCILIATION & ACTION BRIDGE
 *
 * Purpose:
 * - To visually distinguish which RAW contacts have already been promoted to CORE.
 * - To provide context-aware actions (File vs Link) based on that status.
 *
 * Non-Responsibilities:
 * - NOT a CRUD Manager for CORE contacts.
 * - NOT a CRUD Manager for RAW contacts.
 * - Does NOT perform the actual database writes (delegates to API).
 *
 * Rationale:
 * - Essential for the "Potential Pool" view to know what has already been processed.
 * - Maintains UI continuity during the transition from Sheet-based to SQL-based CRM.
 */

// 職責：共用的潛在聯絡人管理模組，處理顯示、建檔與關聯邏輯

const PotentialContactsManager = (() => {

    /**
     * 渲染潛在聯絡人列表的核心函式
     * @param {object} options - 設定物件
     * @param {string} options.containerSelector - 渲染目標容器的 CSS 選擇器
     * @param {Array<object>} options.potentialContacts - 潛在聯絡人資料陣列 (RAW Data Source)
     * @param {Array<object>} options.comparisonList - 用於比對狀態的聯絡人陣列 (CORE Data Source: 已建檔或已關聯)
     * @param {string} options.comparisonKey - 用於比對的鍵名 (例如 'name')
     * @param {string} options.context - 當前情境 ('company' 或 'opportunity')
     * @param {string} [options.opportunityId] - (可選) 在 'opportunity' 情境下需要提供
     */
    function render(options) {
        const {
            containerSelector,
            potentialContacts,
            comparisonList = [],
            comparisonKey = 'name',
            context,
            opportunityId
        } = options;

        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`[PotentialContactsManager] 找不到容器: ${containerSelector}`);
            return;
        }

        if (!potentialContacts || potentialContacts.length === 0) {
            container.innerHTML = '<div class="alert alert-info" style="text-align:center;">在潛在客戶池中沒有找到該公司的聯絡人</div>';
            return;
        }

        // [WORLD MODEL] Comparison Logic: Preparing the CORE list for efficient lookup
        // Comparison only; no write authority here.
        const comparisonSet = new Set(comparisonList.map(item => item[comparisonKey]));

        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>姓名</th>
                        <th>公司</th>
                        <th>職位</th>
                        <th>聯絡方式</th>
                        <th>狀態</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>`;
        
        potentialContacts.forEach(contact => {
            const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;");
            
            // [STATUS INFERENCE] Determines if RAW contact exists in CORE based on comparisonKey.
            const isAlreadyHandled = comparisonSet.has(contact[comparisonKey]);
            
            let statusBadge = '';
            let actionButton = '';

            if (isAlreadyHandled) {
                // [VISUAL STATUS] Render "Already Processed" state (No actions allowed)
                const statusText = context === 'company' ? '已建檔' : '已關聯';
                statusBadge = `<span class="contact-card-status upgraded">${statusText}</span>`;
                actionButton = ''; // 已處理，不顯示按鈕
            } else {
                // [VISUAL STATUS] Render "Pending" state (Actions allowed)
                statusBadge = `<span class="contact-card-status pending">待處理</span>`;
                if (context === 'company') {
                    // [ACTION TRIGGER] File: Promote RAW to CORE (New Contact)
                    actionButton = `<button class="action-btn small primary" onclick='PotentialContactsManager.handleFileContact(${contactJsonString})'>📋 建檔</button>`;
                } else if (context === 'opportunity') {
                    // [ACTION TRIGGER] Link: Associate RAW to Opportunity (Link + Potential Promotion)
                    actionButton = `<button class="action-btn small primary" onclick='PotentialContactsManager.handleLinkContact(${contactJsonString}, "${opportunityId}")'>🔗 關聯</button>`;
                }
            }

            // 【修改】將 a href 連結改為 onclick 按鈕
            const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
            const driveLinkBtn = contact.driveLink
                ? `<button class="action-btn small info" title="預覽名片" onclick="showBusinessCardPreview('${safeDriveLink}')">💳 名片</button>`
                : '';
            // 【修改結束】

            tableHTML += `
                <tr>
                    <td data-label="姓名"><strong>${contact.name || '-'}</strong></td>
                    <td data-label="公司">${contact.company || '-'}</td>
                    <td data-label="職位">${contact.position || '-'}</td>
                    <td data-label="聯絡方式">${contact.mobile ? `<div>📱 ${contact.mobile}</div>` : ''}${contact.phone ? `<div>📞 ${contact.phone}</div>` : ''}</td>
                    <td data-label="狀態">${statusBadge}</td>
                    <td data-label="操作">
                        <div class="action-buttons-container">
                            ${actionButton}
                            ${driveLinkBtn}
                        </div>
                    </td>
                </tr>`;
        });

        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    }

    /**
     * 處理「建檔」按鈕點擊事件
     * [ACTION TRIGGER] Initiates "Raw -> Core" promotion via API.
     * @param {object} contactData - 潛在聯絡人的資料 (RAW)
     */
    async function handleFileContact(contactData) {
        const confirmMsg = `您確定要將潛在聯絡人「${contactData.name}」建立正式檔案嗎？`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在建立聯絡人檔案...');
            try {
                // [API HANDOFF] POST to backend to perform the actual SQL write.
                const result = await authedFetch(`/api/contacts/${contactData.rowIndex}/file`, {
                    method: 'POST'
                });
                
                if (result.success) {
                    showNotification('聯絡人建檔成功！', 'success');
                    // 重新載入當前頁面以刷新狀態
                    const companyName = document.querySelector('#page-title').textContent;
                    if (companyName) {
                       await CRM_APP.navigateTo('company-details', { companyName: encodeURIComponent(companyName) });
                    }
                } else {
                    throw new Error(result.error || '建檔失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`建檔失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }

    /**
     * 處理「關聯」按鈕點擊事件
     * [ACTION TRIGGER] Initiates "Raw -> Opportunity" linkage via API.
     * @param {object} contactData - 潛在聯絡人的資料 (RAW)
     * @param {string} opportunityId - 要關聯到的機會 ID
     */
    async function handleLinkContact(contactData, opportunityId) {
        showLoading('正在關聯聯絡人...');

        const payload = {
            name: contactData.name,
            position: contactData.position,
            mobile: contactData.mobile,
            phone: contactData.phone,
            email: contactData.email,
            rowIndex: contactData.rowIndex, // RAW identity passed for processing
            company: contactData.company,
        };

        try {
            // [API HANDOFF] POST to backend. Backend handles Logic (Upgrade? Link?).
            const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!result.success) throw new Error(result.error || '後端處理失敗');
            
            showNotification('聯絡人關聯成功！', 'success');
            await loadOpportunityDetailPage(opportunityId); // 重新載入機會詳細頁面
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 返回公開的 API
    return {
        render,
        handleFileContact,
        handleLinkContact
    };
})();

// 將模組掛載到全域 window 物件，以便 HTML 中的 onclick 可以呼叫
window.PotentialContactsManager = PotentialContactsManager;
</file>

<file path="public/scripts/contacts/contacts.js">
// views/scripts/contacts.js
/**
 * ============================================================================
 * File: public/scripts/contacts/contacts.js
 * Version: v8.9.0 (Phase 8.9 CORE Top Info Bar Two-Line Layout Refactor)
 * Date: 2026-04-21
 * Author: Gemini
 *
 * Change Log:
 * - [UX Polish] Refactored CORE tab top info bar into a clean two-line layout.
 * - [UX Polish] Removed redundant sorting text description from the info bar.
 * - [Feature] Refactored CORE page size selector into pill-style buttons in the top info bar.
 * - [Feature] Added `currentCorePageSize` state and UI control for dynamic CORE pagination sizing (50/100/500/1000).
 * - [Bugfix] Fixed CORE row numbering to use continuous global index based on `currentCorePageSize` instead of hardcoded 100.
 * - [Feature] Added `currentCoreSortOrder` state and UI toggle for ASC/DESC global sorting of CORE contacts.
 * - [Feature] BUGFIX: Removed redundant post-pagination sort from CORE tab rendering, as global sorting is now handled correctly by the backend before slicing.
 * - [Feature] Added explicit page state tracking (`currentCorePage`) and UI controls for CORE contacts.
 * - [Feature] Supported search-triggered page resets and post-delete empty-page auto-correction for CORE list.
 * - [Performance] Removed fetchAllCoreContacts bypass loop.
 * - [Refactor] Migrated CORE tab to use strict page-by-page API fetching instead of in-memory dataset mapping.
 * - [UX Polish] Aligned all internal comments to strictly match the UI tab order.
 * - [UX Polish] Maintained Operation Mode exclusively in Tab 2 (RAW table) and Tab 3 (CORE table).
 * - [Feature] Implemented real handleDeleteRawContact flow wired to expected backend sheet deletion route.
 * ============================================================================
 */

// ==================== 全域變數 ====================
let allContactsData = []; 
let coreContactsData = [];
let coreContactsTotal = 0; 
let currentCorePage = 1; // [Patch] CORE Page State
let corePaginationState = { hasNext: false, hasPrev: false, totalPages: 1 }; // [Patch] CORE Pagination Metadata
let currentContactsTab = 'list'; // 'list' | 'cards' | 'core'
let currentEditRowIndex = null;
let currentCoreEditContactId = null;
let contactsOperationMode = false;
let currentCoreSortOrder = 'desc'; // [Patch] Core sorting state
let currentCorePageSize = 100; // [Patch] Core dynamic pagination limit

// ==================== 主要功能函式 ====================

async function loadContacts(query = '') {
    const container = document.getElementById('page-contacts');
    if (!container) return;

    // Type Guard: Ensure query is a string (Router may pass a params object)
    const searchQuery = typeof query === 'string' ? query : '';

    // Determine active tab state
    const isListActive = currentContactsTab === 'list';
    const isCardsActive = currentContactsTab === 'cards';
    const isCoreActive = currentContactsTab === 'core';

    // Base styles for RAW tabs
    const listBtnStyle = `background: ${isListActive ? 'white' : 'transparent'}; border: none; padding: 8px 16px; font-weight: ${isListActive ? '600' : '500'}; color: ${isListActive ? 'var(--accent-blue)' : 'var(--text-muted)'}; border-radius: 6px; box-shadow: ${isListActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; cursor: pointer; transition: all 0.2s;`;
    const cardsBtnStyle = `background: ${isCardsActive ? 'white' : 'transparent'}; border: none; padding: 8px 16px; font-weight: ${isCardsActive ? '600' : '500'}; color: ${isCardsActive ? 'var(--accent-blue)' : 'var(--text-muted)'}; border-radius: 6px; box-shadow: ${isCardsActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; cursor: pointer; transition: all 0.2s;`;
    
    // RED emphasis style for CORE tab
    const coreBtnStyle = `background: ${isCoreActive ? '#ef4444' : '#fef2f2'}; border: 1px solid ${isCoreActive ? '#dc2626' : '#fecaca'}; padding: 8px 16px; font-weight: ${isCoreActive ? '600' : '500'}; color: ${isCoreActive ? 'white' : '#ef4444'}; border-radius: 6px; box-shadow: ${isCoreActive ? '0 2px 4px rgba(239,68,68,0.3)' : 'none'}; cursor: pointer; transition: all 0.2s;`;

    // 1. 初始化容器與事件監聽 (加入頁籤 UI)
    container.innerHTML = `
        <div class="dashboard-widget">
            <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <div style="display: flex; align-items: baseline; gap: 15px;">
                    <h2 class="widget-title" style="margin: 0;">潛在客戶</h2>
                </div>
                <div class="contacts-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px;">
                    <button class="tab-btn ${isListActive ? 'active' : ''}" data-action="switch-tab" data-tab="list" style="${listBtnStyle}">名片總覽</button>
                    <button class="tab-btn ${isCardsActive ? 'active' : ''}" data-action="switch-tab" data-tab="cards" style="${cardsBtnStyle}">聯絡人列表</button>
                    <button class="tab-btn ${isCoreActive ? 'active' : ''}" data-action="switch-tab" data-tab="core" style="${coreBtnStyle}">正式聯絡人</button>
                </div>
            </div>
            
            <div id="contacts-action-bar" style="padding: 1.5rem 1.5rem 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 15px;">
                    <div class="search-pagination" style="flex: 1;">
                        <input type="text" class="search-box" id="contacts-page-search" placeholder="搜尋姓名 / 公司" value="${searchQuery}" style="width: 100%; max-width: 400px;">
                    </div>
                    <div id="contacts-count-display" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;"></div>
                </div>
            </div>

            <div id="contacts-page-content" style="padding: 0 1.5rem 1.5rem;">
                <div class="loading show"><div class="spinner"></div><p>載入客戶資料中...</p></div>
            </div>
        </div>
    `;

    // 移除舊監聽器並綁定新的 (事件委派核心)
    container.removeEventListener('click', handleContactListClick);
    container.addEventListener('click', handleContactListClick);
    
    container.removeEventListener('change', handleContactListChange);
    container.addEventListener('change', handleContactListChange);

    // 綁定搜尋輸入
    const searchInputEl = document.getElementById('contacts-page-search');
    if (searchInputEl) {
        searchInputEl.addEventListener('keyup', searchContactsEvent);
    }

    try {
        if (allContactsData.length === 0) {
            console.log('[Contacts] 首次載入，正在獲取潛在客戶資料...');
            const listResult = await authedFetch(`/api/contacts?q=`);
            allContactsData = (listResult && listResult.data) ? listResult.data : [];
        }
        
        await filterAndRenderContacts(searchQuery);

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            const listContent = document.getElementById('contacts-page-content');
            if(listContent) listContent.innerHTML = `<div class="alert alert-error">載入資料失敗: ${error.message}</div>`;
        }
    }
}

// --- 事件處理中心 (Central Handler) ---

function toggleContactsOperationMode() {
    contactsOperationMode = !contactsOperationMode;
    const currentQuery = document.getElementById('contacts-page-search')?.value || '';
    filterAndRenderContacts(currentQuery);
}

function handleContactListChange(e) {
    if (e.target.dataset.action === 'change-core-limit') {
        currentCorePageSize = parseInt(e.target.value, 10) || 100;
        currentCorePage = 1;
        filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
    }
}

function handleContactListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    e.preventDefault();

    const action = btn.dataset.action;
    const payload = btn.dataset;

    switch (action) {
        case 'toggle-operations':
            toggleContactsOperationMode();
            break;

        case 'view-card':
            if (window.showBusinessCardPreview) {
                window.showBusinessCardPreview(payload.link);
            } else {
                console.warn('showBusinessCardPreview function not found');
            }
            break;
            
        case 'switch-tab':
            const tabName = payload.tab;
            if (currentContactsTab === tabName) return; 
            
            currentContactsTab = tabName;
            
            document.querySelectorAll('.contacts-tabs .tab-btn').forEach(t => {
                const isCoreBtn = t.dataset.tab === 'core';
                const isActive = t.dataset.tab === currentContactsTab;
                
                if (isCoreBtn) {
                    t.style.background = isActive ? '#ef4444' : '#fef2f2';
                    t.style.border = isActive ? '1px solid #dc2626' : '1px solid #fecaca';
                    t.style.color = isActive ? 'white' : '#ef4444';
                    t.style.boxShadow = isActive ? '0 2px 4px rgba(239,68,68,0.3)' : 'none';
                    t.style.fontWeight = isActive ? '600' : '500';
                } else {
                    t.style.background = isActive ? 'white' : 'transparent';
                    t.style.border = 'none';
                    t.style.color = isActive ? 'var(--accent-blue)' : 'var(--text-muted)';
                    t.style.boxShadow = isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
                    t.style.fontWeight = isActive ? '600' : '500';
                }
                
                if (isActive) t.classList.add('active');
                else t.classList.remove('active');
            });
            
            const currentQuery = document.getElementById('contacts-page-search')?.value || '';
            filterAndRenderContacts(currentQuery);
            break;

        // [Patch] CORE Pagination Controls
        case 'core-prev':
            if (currentCorePage > 1) {
                currentCorePage--;
                filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            }
            break;
            
        case 'core-next':
            if (corePaginationState.hasNext) {
                currentCorePage++;
                filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            }
            break;

        // [Patch] CORE Sort Toggle
        case 'toggle-core-sort':
            currentCoreSortOrder = currentCoreSortOrder === 'desc' ? 'asc' : 'desc';
            currentCorePage = 1; // Reset to page 1 on sort change
            filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            break;

        // [Patch] CORE Page Size Pills Toggle
        case 'set-core-limit':
            const newSize = parseInt(payload.size, 10);
            if (!newSize || newSize === currentCorePageSize) return;

            currentCorePageSize = newSize;
            currentCorePage = 1;

            filterAndRenderContacts(
                document.getElementById('contacts-page-search')?.value || ''
            );
            break;

        case 'edit-card':
            try {
                const contactData = JSON.parse(payload.contact);
                renderEditCardMode(contactData);
            } catch (err) {
                console.error('無法解析聯絡人資料進行編輯', err);
            }
            break;

        case 'delete-raw':
            handleDeleteRawContact(payload.index, payload.name);
            break;

        case 'cancel-edit':
            const rawQuery = document.getElementById('contacts-page-search')?.value || '';
            filterAndRenderContacts(rawQuery);
            break;
            
        case 'save-edit':
            handleSaveCardEdit();
            break;

        case 'edit-core':
            try {
                const coreData = JSON.parse(payload.contact);
                renderCoreEditMode(coreData);
            } catch (err) {
                console.error('無法解析正式聯絡人資料進行編輯', err);
            }
            break;

        case 'delete-core':
            handleDeleteCoreContact(payload.id, payload.name);
            break;

        case 'cancel-core-edit':
            const coreQuery = document.getElementById('contacts-page-search')?.value || '';
            filterAndRenderContacts(coreQuery);
            break;

        case 'save-core-edit':
            handleSaveCoreEdit();
            break;
    }
}

function searchContactsEvent(event) {
    const query = event.target.value;
    
    // [Patch] Reset page to 1 strictly on CORE search modifications
    if (currentContactsTab === 'core') {
        currentCorePage = 1;
    }
    
    handleSearch(() => filterAndRenderContacts(query));
}

async function filterAndRenderContacts(query = '') {
    const listContent = document.getElementById('contacts-page-content');
    const actionBar = document.getElementById('contacts-action-bar');
    const countDisplay = document.getElementById('contacts-count-display');
    if (!listContent) return;

    if (actionBar) actionBar.style.display = 'block';
    
    currentEditRowIndex = null; 
    currentCoreEditContactId = null;

    let filteredData = [];
    const safeQuery = typeof query === 'string' ? query : '';
    const searchTerm = safeQuery.toLowerCase();

    if (currentContactsTab === 'core') {
        // [API-Driven] Show loading during live fetch
        listContent.innerHTML = `<div class="loading show"><div class="spinner"></div><p>載入正式聯絡人資料中...</p></div>`;
        
        try {
            // [Patch] Execute search strictly via API bound to current page state, limit, and sort order
            const res = await authedFetch(`/api/contacts/list?page=${currentCorePage}&limit=${currentCorePageSize}&q=${encodeURIComponent(safeQuery)}&order=${currentCoreSortOrder}`);
            coreContactsData = (res && res.data) ? res.data : [];
            
            // Extract pagination metadata
            if (res && res.pagination) {
                coreContactsTotal = res.pagination.totalItems !== undefined ? res.pagination.totalItems : coreContactsData.length;
                corePaginationState.hasNext = !!res.pagination.hasNext;
                corePaginationState.hasPrev = !!res.pagination.hasPrev;
                corePaginationState.totalPages = res.pagination.total || Math.ceil(coreContactsTotal / currentCorePageSize) || 1;
                
                // [Patch] Delete boundary auto-correction: if current page vanishes, step back
                if (coreContactsData.length === 0 && currentCorePage > 1) {
                    currentCorePage--;
                    return filterAndRenderContacts(query);
                }
            } else {
                coreContactsTotal = coreContactsData.length;
                corePaginationState.hasNext = false;
                corePaginationState.hasPrev = false;
                corePaginationState.totalPages = 1;
            }
        } catch (e) {
            console.error('Failed to fetch CORE contacts:', e);
            coreContactsData = [];
            coreContactsTotal = 0;
            corePaginationState = { hasNext: false, hasPrev: false, totalPages: 1 };
        }

        filteredData = [...coreContactsData];
        // [Bugfix] Local sort removed: Global sorting is now properly enforced at the service layer before slicing.

    } else {
        // [In-Memory] RAW Data slice
        filteredData = [...allContactsData];
        if (searchTerm) {
            filteredData = filteredData.filter(c =>
                (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                (c.company && c.company.toLowerCase().includes(searchTerm))
            );
        }
    }
    
    if (countDisplay) {
        const label = currentContactsTab === 'core' ? '正式聯絡人' : '潛在客戶';
        const displayCount = currentContactsTab === 'core' ? coreContactsTotal : filteredData.length;
        
        if (currentContactsTab === 'core') {
            // [Patch] Add page size pills to top info bar (Line 1)
            const sizes = [50, 100, 500, 1000];
            let pillsHtml = sizes.map(size => {
                const isActive = size === currentCorePageSize;
                const style = isActive
                    ? 'background: var(--accent-blue, #3b82f6); color: white; border: 1px solid var(--accent-blue, #3b82f6); font-weight: 600;'
                    : 'background: white; color: var(--text-secondary); border: 1px solid var(--border-color); font-weight: 500;';
                return `<button data-action="set-core-limit" data-size="${size}" style="padding: 2px 8px; font-size: 0.85em; border-radius: 4px; cursor: pointer; transition: all 0.2s; margin-left: 4px; ${style}">${size}</button>`;
            }).join('');

            countDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                    <div style="font-size: 0.9em; color: var(--text-secondary); display: flex; align-items: center;">
                        每頁顯示: ${pillsHtml}
                    </div>
                    <div>共 ${displayCount} 筆${label}</div>
                </div>
            `;
        } else {
            countDisplay.innerHTML = `共 ${displayCount} 筆${label}`;
        }
    }

    if (currentContactsTab === 'list') {
        listContent.innerHTML = renderContactsTable(filteredData);
    } else if (currentContactsTab === 'cards') {
        listContent.innerHTML = renderBusinessCardList(filteredData);
    } else if (currentContactsTab === 'core') {
        listContent.innerHTML = renderCoreContactsTable(filteredData);
        // [Patch] Append minimal CORE pagination controls
        if (coreContactsTotal > 0) {
            listContent.innerHTML += renderCorePagination();
        }
    }
}

// ==================== 專用渲染函式 ====================

// --- [Patch] CORE Pagination Helper ---
function renderCorePagination() {
    return `
        <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="action-btn" data-action="core-prev" ${!corePaginationState.hasPrev ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : 'style="background: white;"'}>上一頁</button>
                <span style="color: var(--text-secondary); font-weight: 500;">第 ${currentCorePage} / ${corePaginationState.totalPages} 頁</span>
                <button class="action-btn" data-action="core-next" ${!corePaginationState.hasNext ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : 'style="background: white;"'}>下一頁</button>
            </div>
        </div>
    `;
}

// --- Tab 1: 名片總覽 (RAW) ---
function renderContactsTable(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info" style="text-align:center; margin-top: 20px;">沒有找到名片資料</div>';
    }

    let listHTML = `
        <style>
            .contact-card-name-full {
                font-weight: 600;
                font-size: 1.1rem;
                color: var(--text-main);
                white-space: normal;
                word-break: break-all;
                display: block;
                line-height: 1.4;
            }
        </style>
        <div class="contact-card-list">
    `;

    data.forEach(contact => {
        const isUpgraded = contact.status === '已升級';
        const isArchived = contact.status === '已歸檔';
        const isFiled = contact.status === '已建檔';

        const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';

        const driveLinkBtn = contact.driveLink
            ? `<button class="action-btn small info" title="預覽名片" data-action="view-card" data-link="${safeDriveLink}">💳 名片</button>`
            : '';

        let statusBadge = '';
        if (isUpgraded) {
            statusBadge = `<span class="contact-card-status upgraded">已升級</span>`;
        } else if (isArchived) {
            statusBadge = `<span class="contact-card-status archived">已歸檔</span>`;
        } else if (isFiled) {
            statusBadge = `<span class="contact-card-status filed">已建檔</span>`;
        } else { 
            statusBadge = `<span class="contact-card-status pending">待處理</span>`;
        }

        listHTML += `
            <div class="contact-card">
                <div class="contact-card-main">
                    <div class="contact-card-header" style="align-items: flex-start; margin-bottom: 8px;">
                        <span class="contact-card-name-full">${contact.name || '(無姓名)'}</span>
                        <div style="margin-left: 10px; flex-shrink: 0;">${statusBadge}</div>
                    </div>
                    <div class="contact-card-company">${contact.company || '(無公司)'}</div>
                    <div class="contact-card-position">${contact.position || '(無職位)'}</div>
                </div>
                <div class="contact-card-actions">
                    ${driveLinkBtn}
                </div>
            </div>
        `;
    });
    listHTML += '</div>';
    return listHTML;
}

// --- Tab 2: 聯絡人列表 (RAW) ---
function renderBusinessCardList(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info" style="text-align:center; margin-top: 20px;">沒有找到聯絡人資料</div>';
    }

    const toggleBtnStyle = contactsOperationMode 
        ? 'background: var(--accent-blue, #3b82f6); color: white; border-color: var(--accent-blue, #3b82f6);' 
        : 'background: white; color: var(--text-main); border-color: var(--border-color);';

    let listHTML = `
        <style>
            .bc-list-table { width: 100%; border-collapse: collapse; min-width: 800px; }
            .bc-list-table th, .bc-list-table td { padding: 12px; border-bottom: 1px solid var(--border-color); text-align: left; vertical-align: middle; }
            .bc-list-table th { background-color: var(--glass-bg); color: var(--text-secondary); font-weight: 600; }
            .bc-list-table tr:hover { background-color: var(--bg-hover, #f8fafc); }
            .bc-name-cell { font-weight: 600; color: var(--text-main); white-space: normal; word-break: break-all; }
        </style>
        <div style="overflow-x: auto;">
            <table class="bc-list-table">
                <thead>
                    <tr>
                        <th style="width: 60px; text-align: center;">項次</th>
                        <th>姓名</th>
                        <th>公司</th>
                        <th>職位</th>
                        <th>手機</th>
                        <th>Email</th>
                        <th style="text-align: right; white-space: nowrap;">
                            操作
                            <button class="action-btn small" data-action="toggle-operations" style="margin-left: 6px; padding: 2px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid; cursor: pointer; transition: all 0.2s; ${toggleBtnStyle}">
                                ${contactsOperationMode ? '完成' : '＋'}
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach((contact, index) => {
        const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
        const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
        
        const previewBtn = contact.driveLink 
            ? `<button class="action-btn small info" title="預覽名片" data-action="view-card" data-link="${safeDriveLink}" style="margin-right: 8px;">💳</button>`
            : '';

        let deleteBtn = '';
        if (contactsOperationMode) {
            deleteBtn = `<button class="action-btn small danger" data-action="delete-raw" data-index="${contact.rowIndex}" data-name="${contact.name || ''}" style="margin-left: 4px; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5;">🗑️ 刪除</button>`;
        }

        listHTML += `
            <tr>
                <td style="text-align: center; color: var(--text-muted); font-weight: 500;">${index + 1}</td>
                <td class="bc-name-cell">${contact.name || '-'}</td>
                <td>${contact.company || '-'}</td>
                <td>${contact.position || '-'}</td>
                <td>${contact.mobile || '-'}</td>
                <td>${contact.email || '-'}</td>
                <td style="text-align: right; white-space: nowrap;">
                    ${previewBtn}
                    <button class="action-btn small primary" data-action="edit-card" data-contact='${contactJsonString}'>✏️ 編輯</button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });

    listHTML += `
                </tbody>
            </table>
        </div>
    `;
    return listHTML;
}

// --- Tab 3: 正式聯絡人 (CORE) ---
function renderCoreContactsTable(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info" style="text-align:center; margin-top: 20px;">沒有找到正式聯絡人資料</div>';
    }

    const toggleBtnStyle = contactsOperationMode 
        ? 'background: var(--accent-blue, #3b82f6); color: white; border-color: var(--accent-blue, #3b82f6);' 
        : 'background: white; color: var(--text-main); border-color: var(--border-color);';

    let listHTML = `
        <style>
            .core-list-table { width: 100%; border-collapse: collapse; min-width: 900px; }
            .core-list-table th, .core-list-table td { padding: 12px; border-bottom: 1px solid var(--border-color); text-align: left; vertical-align: middle; }
            .core-list-table th { background-color: var(--glass-bg); color: var(--text-secondary); font-weight: 600; }
            .core-list-table tr:hover { background-color: var(--bg-hover, #f8fafc); }
            .core-name-cell { font-weight: 600; color: var(--text-main); white-space: normal; word-break: break-all; }
        </style>
        <div style="overflow-x: auto;">
            <table class="core-list-table">
                <thead>
                    <tr>
                        <th style="width: 60px; text-align: center;">項次</th>
                        <th>姓名</th>
                        <th>公司</th>
                        <th>職位</th>
                        <th>手機</th>
                        <th>Email</th>
                        <th>最後更新 <button class="action-btn small" data-action="toggle-core-sort" style="margin-left:4px; padding: 0 4px; background: transparent; border: none; cursor: pointer;">${currentCoreSortOrder === 'desc' ? '⬇️' : '⬆️'}</button></th>
                        <th style="text-align: right; white-space: nowrap;">
                            操作
                            <button class="action-btn small" data-action="toggle-operations" style="margin-left: 6px; padding: 2px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid; cursor: pointer; transition: all 0.2s; ${toggleBtnStyle}">
                                ${contactsOperationMode ? '完成' : '＋'}
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Calculate absolute index to maintain visual consistency across pages based on dynamic limit
    const indexOffset = (currentCorePage - 1) * currentCorePageSize;

    data.forEach((contact, index) => {
        let updateTimeStr = '-';
        const rawTime = contact.lastUpdateTime || contact.createdTime;
        if (rawTime) {
            const d = new Date(rawTime);
            if (!isNaN(d.getTime())) {
                updateTimeStr = d.toLocaleDateString('zh-TW');
            }
        }

        const safeName = (contact.name || '').replace(/"/g, '&quot;');
        const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');

        let deleteBtn = '';
        if (contactsOperationMode) {
            deleteBtn = `<button class="action-btn small danger" data-action="delete-core" data-id="${contact.contactId}" data-name="${safeName}" style="margin-left: 4px; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5;">🗑️ 刪除</button>`;
        }

        listHTML += `
            <tr>
                <td style="text-align: center; color: var(--text-muted); font-weight: 500;">${indexOffset + index + 1}</td>
                <td class="core-name-cell">${contact.name || '-'}</td>
                <td>${contact.companyName || '-'}</td>
                <td>${contact.position || '-'}</td>
                <td>${contact.mobile || '-'}</td>
                <td>${contact.email || '-'}</td>
                <td style="color: var(--text-muted); font-size: 0.9em;">${updateTimeStr}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="action-btn small primary" data-action="edit-core" data-contact='${contactJsonString}'>✏️ 編輯</button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });

    listHTML += `
                </tbody>
            </table>
        </div>
    `;
    return listHTML;
}

// ==================== 編輯模式渲染函式 ====================

// --- RAW Contacts Edit Mode ---
function renderEditCardMode(contact) {
    const listContent = document.getElementById('contacts-page-content');
    const actionBar = document.getElementById('contacts-action-bar');
    if (!listContent) return;

    if (actionBar) actionBar.style.display = 'none';
    currentEditRowIndex = contact.rowIndex;

    let imagePreviewHtml = '';
    if (contact.driveLink) {
        const proxyUrl = `/api/drive/thumbnail?link=${encodeURIComponent(contact.driveLink)}`;
        imagePreviewHtml = `
            <a href="${contact.driveLink}" target="_blank" title="點擊開啟原始檔案 (Google Drive)" style="display: block; text-align: center; cursor: zoom-in;">
                <img src="${proxyUrl}" alt="名片預覽" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid var(--border-color);" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'alert alert-warning\\'>預覽載入失敗，可點擊查看原檔</div>';">
            </a>
            <div style="text-align: center; margin-top: 8px;"><small style="color: var(--text-muted);">點擊圖片可開啟原檔</small></div>
        `;
    } else {
        imagePreviewHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 300px; background-color: var(--glass-bg); border-radius: 8px; border: 1px dashed var(--border-color); color: var(--text-muted);">
                <span style="font-size: 3rem; margin-bottom: 1rem;">📇</span>
                <p>無名片圖檔</p>
            </div>
        `;
    }

    const safeName = (contact.name || '').replace(/"/g, '&quot;');
    const safeCompany = (contact.company || '').replace(/"/g, '&quot;');
    const safePosition = (contact.position || '').replace(/"/g, '&quot;');
    const safeMobile = (contact.mobile || '').replace(/"/g, '&quot;');
    const safeEmail = (contact.email || '').replace(/"/g, '&quot;');

    listContent.innerHTML = `
        <div class="edit-card-container" style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap;">
            
            <div class="edit-card-preview" style="flex: 1; min-width: 300px;">
                <h3 style="margin-bottom: 1rem; font-size: 1.1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">名片預覽</h3>
                ${imagePreviewHtml}
            </div>

            <div class="edit-card-form" style="flex: 1; min-width: 300px; background: var(--card-bg, #fff); padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <h3 style="font-size: 1.1rem; margin: 0;">編輯聯絡人資訊</h3>
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">姓名</label>
                    <input type="text" id="raw-edit-name" class="form-input" value="${safeName}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">公司名稱</label>
                    <input type="text" id="raw-edit-company" class="form-input" value="${safeCompany}" style="width: 100%;">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">職稱 (Position)</label>
                    <input type="text" id="raw-edit-position" class="form-input" value="${safePosition}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">手機 (Mobile)</label>
                    <input type="tel" id="raw-edit-mobile" class="form-input" value="${safeMobile}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">信箱 (Email)</label>
                    <input type="email" id="raw-edit-email" class="form-input" value="${safeEmail}" style="width: 100%;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="action-btn" data-action="cancel-edit" style="background: var(--glass-bg); color: var(--text-main); border: 1px solid var(--border-color);">取消</button>
                    <button class="action-btn primary" data-action="save-edit" id="btn-save-raw-edit">儲存變更</button>
                </div>
            </div>

        </div>
    `;
}

// --- CORE Contacts Edit Mode ---
function renderCoreEditMode(contact) {
    const listContent = document.getElementById('contacts-page-content');
    const actionBar = document.getElementById('contacts-action-bar');
    if (!listContent) return;

    if (actionBar) actionBar.style.display = 'none';
    currentCoreEditContactId = contact.contactId;

    const safeName = (contact.name || '').replace(/"/g, '&quot;');
    const safePosition = (contact.position || '').replace(/"/g, '&quot;');
    const safeMobile = (contact.mobile || '').replace(/"/g, '&quot;');
    const safePhone = (contact.phone || '').replace(/"/g, '&quot;');
    const safeEmail = (contact.email || '').replace(/"/g, '&quot;');
    const displayCompany = contact.companyName || '-';

    listContent.innerHTML = `
        <div class="edit-core-container" style="display: flex; justify-content: center;">
            <div class="edit-card-form" style="width: 100%; max-width: 600px; background: var(--card-bg, #fff); padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <h3 style="font-size: 1.1rem; margin: 0;">編輯正式聯絡人</h3>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem; background: var(--bg-hover, #f8fafc); padding: 10px; border-radius: 6px;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">公司名稱 (不可編輯)</label>
                    <div style="font-weight: 600; color: var(--text-main);">${displayCompany}</div>
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">姓名</label>
                    <input type="text" id="core-edit-name" class="form-input" value="${safeName}" style="width: 100%;">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">職稱 (Position)</label>
                    <input type="text" id="core-edit-position" class="form-input" value="${safePosition}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">手機 (Mobile)</label>
                    <input type="tel" id="core-edit-mobile" class="form-input" value="${safeMobile}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">電話 (Phone)</label>
                    <input type="tel" id="core-edit-phone" class="form-input" value="${safePhone}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">信箱 (Email)</label>
                    <input type="email" id="core-edit-email" class="form-input" value="${safeEmail}" style="width: 100%;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="action-btn" data-action="cancel-core-edit" style="background: var(--glass-bg); color: var(--text-main); border: 1px solid var(--border-color);">取消</button>
                    <button class="action-btn primary" data-action="save-core-edit" id="btn-save-core-edit">儲存變更</button>
                </div>
            </div>
        </div>
    `;
}

// ==================== 儲存與刪除處理函式 ====================

// --- Save Action: RAW ---
async function handleSaveCardEdit() {
    if (!currentEditRowIndex) {
        console.error('Missing rowIndex for save.');
        if (typeof showNotification === 'function') showNotification('無法儲存：缺少資料識別碼', 'error');
        return;
    }

    const btn = document.getElementById('btn-save-raw-edit');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '儲存中...';
    }

    const payload = {
        name: document.getElementById('raw-edit-name')?.value.trim() || '',
        company: document.getElementById('raw-edit-company')?.value.trim() || '',
        position: document.getElementById('raw-edit-position')?.value.trim() || '',
        mobile: document.getElementById('raw-edit-mobile')?.value.trim() || '',
        email: document.getElementById('raw-edit-email')?.value.trim() || ''
    };

    try {
        const response = await authedFetch(`/api/contacts/${currentEditRowIndex}/raw`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            skipRefresh: true
        });

        if (response && response.success) {
            if (typeof showNotification === 'function') showNotification('資料已更新成功', 'success');
            
            const listResult = await authedFetch(`/api/contacts?q=`);
            if (listResult && listResult.data) {
                allContactsData = listResult.data;
            }
            
            currentEditRowIndex = null;
            const safeQuery = document.getElementById('contacts-page-search')?.value || '';
            await filterAndRenderContacts(safeQuery);
            
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

        } else {
            throw new Error(response.error || '更新失敗');
        }
    } catch (error) {
        console.error('Save raw contact failed:', error);
        if (typeof showNotification === 'function') {
            showNotification(`儲存失敗: ${error.message}`, 'error');
        } else {
            alert(`儲存失敗: ${error.message}`);
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = '儲存變更';
        }
    }
}

// --- Delete Action: RAW ---
async function handleDeleteRawContact(rowIndex, contactName) {
    const msg = `您確定要永久刪除潛客戶「${contactName}」嗎？\n\n⚠️ 警告：此操作將會從 Google 試算表中永久移除該筆實體資料，且無法復原。`;
    
    const executeDelete = async () => {
        try {
            const response = await authedFetch(`/api/contacts/${rowIndex}/raw`, {
                method: 'DELETE',
                skipRefresh: true 
            });

            if (response && response.success) {
                if (typeof showNotification === 'function') {
                    showNotification('刪除成功：潛在客戶已從試算表中移除', 'success');
                } else {
                    alert('刪除成功：潛在客戶已從試算表中移除');
                }
                
                const listResult = await authedFetch(`/api/contacts?q=`);
                if (listResult && listResult.data) {
                    allContactsData = listResult.data;
                }
                
                const safeQuery = document.getElementById('contacts-page-search')?.value || '';
                await filterAndRenderContacts(safeQuery);
                
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } else {
                const backendMsg = (response && (response.error || response.message)) || '無法刪除：後端發生錯誤或尚未實作該路由';
                
                if (typeof showNotification === 'function') {
                    showNotification(backendMsg, 'info'); 
                } else {
                    alert(backendMsg);
                }
            }
        } catch (error) {
            console.error('Delete raw contact failed:', error);
            if (typeof showNotification === 'function') {
                showNotification('刪除失敗：系統錯誤或後端 API 尚未實作此功能', 'error');
            } else {
                alert('刪除失敗：系統錯誤或後端 API 尚未實作此功能');
            }
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(msg, executeDelete);
    } else {
        if (confirm(msg)) {
            executeDelete();
        }
    }
}

// --- Save Action: CORE ---
async function handleSaveCoreEdit() {
    if (!currentCoreEditContactId) {
        console.error('Missing contactId for save.');
        if (typeof showNotification === 'function') showNotification('無法儲存：缺少資料識別碼', 'error');
        return;
    }

    const btn = document.getElementById('btn-save-core-edit');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '儲存中...';
    }

    const payload = {
        name: document.getElementById('core-edit-name')?.value.trim() || '',
        position: document.getElementById('core-edit-position')?.value.trim() || '',
        mobile: document.getElementById('core-edit-mobile')?.value.trim() || '',
        phone: document.getElementById('core-edit-phone')?.value.trim() || '',
        email: document.getElementById('core-edit-email')?.value.trim() || ''
    };

    try {
        const response = await authedFetch(`/api/contacts/${currentCoreEditContactId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            skipRefresh: true
        });

        if (response && response.success) {
            if (typeof showNotification === 'function') showNotification('正式聯絡人已更新成功', 'success');
            
            currentCoreEditContactId = null;
            const safeQuery = document.getElementById('contacts-page-search')?.value || '';
            // [Patch] Will naturally respect currentCorePage
            await filterAndRenderContacts(safeQuery);
            
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

        } else {
            throw new Error(response.error || '更新失敗');
        }
    } catch (error) {
        console.error('Save core contact failed:', error);
        if (typeof showNotification === 'function') {
            showNotification(`儲存失敗: ${error.message}`, 'error');
        } else {
            alert(`儲存失敗: ${error.message}`);
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = '儲存變更';
        }
    }
}

// --- Delete Action: CORE ---
async function handleDeleteCoreContact(contactId, contactName) {
    const msg = `您確定要永久刪除正式聯絡人「${contactName}」嗎？\n\n系統將進行關聯檢查，若該聯絡人已綁定任何機會案件，將無法刪除。`;
    
    const executeDelete = async () => {
        try {
            const response = await authedFetch(`/api/contacts/${contactId}`, {
                method: 'DELETE',
                skipRefresh: true 
            });

            if (response && response.success) {
                if (typeof showNotification === 'function') {
                    showNotification('刪除成功：正式聯絡人已移除', 'success');
                } else {
                    alert('刪除成功：正式聯絡人已移除');
                }
                
                const safeQuery = document.getElementById('contacts-page-search')?.value || '';
                // [Patch] Bound safely to auto-correcting pagination logic
                await filterAndRenderContacts(safeQuery);
                
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } else {
                const backendMsg = (response && (response.error || response.message)) || '無法刪除：該聯絡人已有關聯資料';
                
                if (typeof showNotification === 'function') {
                    showNotification(backendMsg, 'info');
                } else {
                    alert(backendMsg);
                }
            }
        } catch (error) {
            console.error('Delete core contact failed:', error);
            if (typeof showNotification === 'function') {
                showNotification('刪除失敗：系統錯誤，請稍後再試', 'error');
            } else {
                alert('刪除失敗：系統錯誤，請稍後再試');
            }
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(msg, executeDelete);
    } else {
        if (confirm(msg)) {
            executeDelete();
        }
    }
}

if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules.contacts = loadContacts;
}
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
