/**
 * controllers/contact.controller.js
 * 聯絡人模組控制器
 * * @version 8.3.4
 * * @date 2026-05-21
 * * @description 負責處理聯絡人相關的 HTTP 請求，驗證參數，並呼叫對應的 Service。
 * * [Patch] ContactController Patch: prefer req.user.displayName for contact audit fields.
 * * [Fix] RAW contact search query wiring fix: GET /api/contacts now passes req.query.q to ContactService.searchContacts.
 * * [Feature] Added preview/confirmed CORE contact sync from linked RAW business card source.
 * * [Feature] Added lazy CORE contact reverse opportunity lookup endpoint handler.
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
 * - Routes: GET /list (searchContactList), GET /:contactId/opportunities, PUT /:contactId, DELETE /:contactId.
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
const { extractRequestMetadata } = require('../utils/audit-helpers');

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

    _getAuditUser(req) {
        return req?.user?.displayName || req?.user?.name || req?.user?.username || 'System';
    }

    _buildAuditContext(req) {
        const services = req.app && req.app.get ? req.app.get('services') : {};
        const user = req.user || {};
        const requestMetadata = extractRequestMetadata(req);

        return {
            auditLoggerService: services.auditLoggerService || null,
            actor: {
                username: user.username || user.name || 'unknown',
                name: user.displayName || user.name || user.username || 'System',
                role: user.role || null,
                sessionId: user.session_id || null
            },
            ipAddress: requestMetadata.ipAddress,
            userAgent: requestMetadata.userAgent
        };
    }

    /**
     * [ZONE: RAW / POTENTIAL]
     * GET /api/contacts
     */
    searchContacts = async (req, res) => {
        try {
            const query = req.query.q || '';
            const result = await this.contactService.searchContacts(query);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Search Potential Contacts');
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
     * [ZONE: CORE / OFFICIAL]
     * GET /api/contacts/:contactId/opportunities
     */
    getContactOpportunities = async (req, res) => {
        try {
            const contactId = req.params.contactId;
            const data = await this.contactService.getContactOpportunities(contactId);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Contact Opportunities');
        }
    };

    /**
     * [ZONE: BOUNDARY / HANDOFF]
     * POST /api/contacts/:rowIndex/upgrade
     */
    upgradeContact = async (req, res) => {
        try {
            const rawIdentifier = req.params.rowIndex;
            const user = this._getAuditUser(req);

            if (!this.workflowService) {
                console.error('Critical Error: WorkflowService not initialized in ContactController');
                throw new Error('系統內部錯誤: WorkflowService 未初始化');
            }

            console.log(`[ContactController] Upgrading RAW contact ${rawIdentifier} by ${user}`);

            const result = await this.workflowService.upgradeContactToOpportunity(
                rawIdentifier,
                req.body, 
                user,
                this._buildAuditContext(req)
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
            const user = this._getAuditUser(req);

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

    syncContactFromSource = async (req, res) => {
        try {
            const contactId = req.params.contactId;
            const user = this._getAuditUser(req);

            const result = await this.contactService.syncContactFromSource(
                contactId,
                { previewOnly: req.body && req.body.previewOnly },
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Sync Contact From Source');
        }
    };

    /**
     * [ZONE: CORE / OFFICIAL]
     * DELETE /api/contacts/:contactId
     */
    deleteContact = async (req, res) => {
        try {
            const contactId = req.params.contactId;
            const user = this._getAuditUser(req);

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
            const rawIdentifier = req.params.rowIndex;
            const user = req.body.modifier || this._getAuditUser(req);

            const result = await this.contactService.updatePotentialContact(
                rawIdentifier,
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
            const rawIdentifier = req.params.rowIndex;
            const user = this._getAuditUser(req);

            const result = await this.contactService.deletePotentialContact(rawIdentifier, user);
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
            const user = this._getAuditUser(req);

            if (!businessCardRowIndex) {
                return res.status(400).json({ success: false, error: '缺少 businessCardRowIndex 參數' });
            }
            
            const result = await this.workflowService.linkBusinessCardToContact(
                contactId, 
                businessCardRowIndex,
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Link Card to Contact');
        }
    };

    /**
     * [ZONE: CORE / SOURCE-ONLY REBIND]
     * POST /api/contacts/:contactId/rebind-card-source
     */
    rebindCardSource = async (req, res) => {
        try {
            const { contactId } = req.params;
            const { cardId, expectedSourceId } = req.body || {};
            const user = this._getAuditUser(req);

            const result = await this.workflowService.rebindContactCardSource(
                contactId,
                cardId,
                expectedSourceId,
                user
            );
            res.json(result);
        } catch (error) {
            const statusCode = error.statusCode || 500;
            if (statusCode >= 400 && statusCode < 500) {
                return res.status(statusCode).json({
                    success: false,
                    error: error.message,
                    code: error.code || 'REBIND_CARD_SOURCE_FAILED'
                });
            }
            handleApiError(res, error, 'Rebind Card Source');
        }
    };

    /**
     * [ZONE: RAW / POTENTIAL]
     * POST /api/contacts/:rowIndex/file
     */
    fileContact = async (req, res) => {
        try {
            const rawIdentifier = req.params.rowIndex;
            const user = this._getAuditUser(req);

            const result = await this.workflowService.fileContact(
                rawIdentifier,
                user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'File Contact');
        }
    };
}

module.exports = ContactController;
