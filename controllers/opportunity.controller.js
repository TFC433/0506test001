// controllers/opportunity.controller.js
/**
 * OpportunityController
 * * @version 6.2.2 (Workflow Ownership Migration Phase 1)
 * @date 2026-05-13
 * @changelog 2026-05-13: Complete quick-add manual contact lifecycle by creating MANUAL SQL contact before opportunity linking.
 * @changelog 2026-05-13: Workflow ownership migration phase 1: move RAW lifecycle orchestration into WorkflowService and reduce OpportunityService to relationship semantics only.
 * @description 機會案件控制器，擴展支援獨立的 Metadata API Fetch。
 */

const { handleApiError } = require('../middleware/error.middleware');
const { extractRequestMetadata } = require('../utils/audit-helpers');

class OpportunityController {
    /**
     * @param {OpportunityService} opportunityService
     * @param {WorkflowService} workflowService
     * @param {DashboardService} dashboardService
     * @param {OpportunityReader} opportunityReader - (Deprecated in Controller)
     * @param {OpportunityWriter} opportunityWriter - (Deprecated in Controller)
     */
    constructor(opportunityService, workflowService, dashboardService, opportunityReader, opportunityWriter) {
        this.opportunityService = opportunityService;
        this.workflowService = workflowService;
        this.dashboardService = dashboardService;
        this.opportunityReader = opportunityReader;
        this.opportunityWriter = opportunityWriter;
    }

    // GET /api/opportunities/dashboard
    getDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getOpportunitiesDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Opp Dashboard');
        }
    };

    // GET /api/opportunities/by-county
    getOpportunitiesByCounty = async (req, res) => {
        try {
            const result = await this.opportunityService.getOpportunitiesByCounty(req.query.opportunityType);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Opp By County');
        }
    };

    // GET /api/opportunities/metadata/years
    getOpportunityYears = async (req, res) => {
        try {
            const data = await this.opportunityService.getOpportunityYears();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Opp Years');
        }
    };

    // GET /api/opportunities/ (Search / Table Fetch)
    searchOpportunities = async (req, res) => {
        try {
            // [Phase 8.11] Expanded query parameter extraction for Table decoupling
            const { q, page = 0, limit = 500, sortField, sortDirection, assignee, type, stage, ...otherFilters } = req.query;
            const filters = { assignee, type, stage, ...otherFilters };
            Object.keys(filters).forEach(key => (filters[key] === undefined || filters[key] === '') && delete filters[key]);
            
            const result = await this.opportunityService.searchOpportunities(
                q, 
                parseInt(page), 
                parseInt(limit), 
                sortField, 
                sortDirection, 
                filters
            );
            
            // Legacy contract preservation: If page=0, frontend loadOpportunities expects a raw array for the Chip Wall
            if (parseInt(page) === 0) {
                 return res.json(result.data || result); 
            }

            // Table fetch expects { data, total }
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Search Opps');
        }
    };

    // GET /api/opportunities/:opportunityId/details
    getOpportunityDetails = async (req, res) => {
        try {
            const data = await this.opportunityService.getOpportunityDetails(req.params.opportunityId);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Opp Details');
        }
    };

    // POST /api/opportunities/
    createOpportunity = async (req, res) => {
        try {
            // 使用 WorkflowService 處理建立邏輯 (可能包含發通知等)
            const result = await this.workflowService.createOpportunity(
                req.body,
                req.user,
                this._buildAuditContext(req)
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Opp');
        }
    };

    // PUT /api/opportunities/batch
    batchUpdateOpportunities = async (req, res) => {
        try {
            const result = await this.opportunityService.batchUpdateOpportunities(
                req.body.updates,
                this._buildAuditContext(req)
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Batch Update Opps');
        }
    };

    // PUT /api/opportunities/:opportunityId
    updateOpportunity = async (req, res) => {
        try {
            const result = await this.opportunityService.updateOpportunity(
                req.params.opportunityId, 
                req.body, 
                req.user,
                this._buildAuditContext(req)
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Opp');
        }
    };

    // DELETE /api/opportunities/:opportunityId
    deleteOpportunity = async (req, res) => {
        try {
            const result = await this.opportunityService.deleteOpportunity(
                req.params.opportunityId, 
                req.user,
                this._buildAuditContext(req)
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Opp');
        }
    };

    // POST /api/opportunities/:opportunityId/contacts
    addContactToOpportunity = async (req, res) => {
        try {
            const { opportunityId } = req.params;
            const payload = req.body || {};
            const auditContext = this._buildAuditContext(req);
            const rawIdentifier = payload.rawIdentifier || payload.rowIndex;
            if (rawIdentifier && !payload.rowIndex) payload.rowIndex = rawIdentifier;
            const hasRowIndex = rawIdentifier !== undefined && rawIdentifier !== null && rawIdentifier !== '';
            const hasContactId = Boolean(payload.contactId);

            if (hasRowIndex && !hasContactId) {
                const resolved = await this.workflowService.resolveAndPromoteContact(payload, req.user);
                const result = await this.opportunityService.addContactToOpportunity(
                    opportunityId,
                    { contactId: resolved.contactId, name: resolved.contactName || payload.name },
                    req.user,
                    auditContext
                );
                return res.json(result);
            }

            if (hasRowIndex && hasContactId) {
                await this.workflowService.linkBusinessCardToContact(
                    payload.contactId,
                    rawIdentifier,
                    req.user
                );
                const result = await this.opportunityService.addContactToOpportunity(
                    opportunityId,
                    { contactId: payload.contactId, name: payload.name },
                    req.user,
                    auditContext
                );
                return res.json(result);
            }

            if (!hasRowIndex && !hasContactId && payload.name) {
                const contactResult = await this.workflowService.createManualContact(payload, req.user);
                const result = await this.opportunityService.addContactToOpportunity(
                    opportunityId,
                    { contactId: contactResult.id, name: payload.name },
                    req.user,
                    auditContext
                );
                return res.json(result);
            }

            const result = await this.opportunityService.addContactToOpportunity(
                opportunityId,
                payload,
                req.user,
                auditContext
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Add Contact to Opp');
        }
    };

    // DELETE /api/opportunities/:opportunityId/contacts/:contactId
    deleteContactLink = async (req, res) => {
        try {
            const result = await this.opportunityService.deleteContactLink(
                req.params.opportunityId, 
                req.params.contactId, 
                req.user,
                this._buildAuditContext(req)
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Contact Link');
        }
    };

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
}

module.exports = OpportunityController;
