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