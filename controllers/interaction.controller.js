/*
 * FILE: controllers/interaction.controller.js
 * VERSION: 6.0.2
 * DATE: 2026-03-19
 * CHANGELOG:
 * - [CLEANUP] Removed temporary debug logs used for runtime forensics
 * - [Fix] Query Params Compatibility
 */

const { handleApiError } = require('../middleware/error.middleware');

class InteractionController {
    /**
     * @param {InteractionService} interactionService 
     */
    constructor(interactionService) {
        if (!interactionService) throw new Error('InteractionController 需要 InteractionService');
        this.interactionService = interactionService;
    }

    // GET /api/interactions (or /api/interactions/all)
    getInteractions = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            
            // ★ 相容性修正：前端使用 'q' 作為搜尋關鍵字，'fetchAll' 作為全取旗標
            const search = req.query.search || req.query.q || ''; 
            const fetchAll = req.query.all === 'true' || req.query.fetchAll === 'true';

            const result = await this.interactionService.searchInteractions(search, page, fetchAll);
            res.json({ success: true, ...result });
        } catch (error) {
            handleApiError(res, error, 'Get Interactions');
        }
    };

    // GET /api/interactions/opportunity/:id
    getInteractionsByOpportunity = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.interactionService.getInteractionsByOpportunity(id);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Opportunity Interactions');
        }
    };

    // GET /api/interactions/company/:id
    getInteractionsByCompany = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.interactionService.getInteractionsByCompany(id);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Company Interactions');
        }
    };

    // POST /api/interactions
    createInteraction = async (req, res) => {
        try {
            const user = req.user || {}; 
            const result = await this.interactionService.createInteraction(req.body, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Interaction');
        }
    };

    // PUT /api/interactions/:id
    updateInteraction = async (req, res) => {
        try {
            const user = req.user || {};
            const result = await this.interactionService.updateInteraction(req.params.id, req.body, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Interaction');
        }
    };

    // DELETE /api/interactions/:id
    deleteInteraction = async (req, res) => {
        try {
            const user = req.user || {};
            const result = await this.interactionService.deleteInteraction(req.params.id, user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Interaction');
        }
    };
}

module.exports = InteractionController;