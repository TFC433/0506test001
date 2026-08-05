/**
 * File: controllers/line-leads.controller.js
 * Version: 7.5.0
 * Date: 2026-08-05
 * Changelog:
 * - [V7.5.0] Switched Line Lead View protected handlers to the first-party req.lineUser session identity.
 * - [V7.4.0] Implemented backend ownership enforcement for updateLead and added deleteLead endpoint.
 * - [V7.3.1] Restored CRM Whitelist authorization gate in getAllLeads and updateLead, and ensured authorization executes before data access.
 * - [V7.3.0] Exposed 4 new exhibition theme config keys via the getAllLeads response payload.
 */

const { handleApiError } = require('../middleware/error.middleware');

class LineLeadsController {
    /**
     * @param {ContactService} contactService
     * @param {AuthService} authService
     * @param {SystemService} systemService
     */
    constructor(contactService, authService, systemService) {
        this.contactService = contactService;
        this.authService = authService;

        if (!systemService) {
            console.warn('[LineLeadsController] systemService not provided. Exhibition config will be skipped.');
        }
        this.systemService = systemService;
    }

    // GET /api/line/leads
    getAllLeads = async (req, res) => {
        try {
            const user = req.lineUser;
            if (!user || !user.userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            let exhibitionConfig = null;
            if (this.systemService) {
                try {
                    const sysConfig = await this.systemService.getSystemConfig();
                    const exConfigRaw = sysConfig['展會設定'] || [];

                    exhibitionConfig = {
                        exhibition_enabled: (exConfigRaw.find(c => c.value === 'exhibition_enabled') || {}).note || 'false',
                        exhibition_name: (exConfigRaw.find(c => c.value === 'exhibition_name') || {}).note || '',
                        exhibition_start_date: (exConfigRaw.find(c => c.value === 'exhibition_start_date') || {}).note || '',
                        exhibition_end_date: (exConfigRaw.find(c => c.value === 'exhibition_end_date') || {}).note || '',
                        exhibition_triangle_color: (exConfigRaw.find(c => c.value === 'exhibition_triangle_color') || {}).note,
                        exhibition_triangle_opacity: (exConfigRaw.find(c => c.value === 'exhibition_triangle_opacity') || {}).note,
                        exhibition_bar_color: (exConfigRaw.find(c => c.value === 'exhibition_bar_color') || {}).note,
                        exhibition_bar_opacity: (exConfigRaw.find(c => c.value === 'exhibition_bar_opacity') || {}).note
                    };
                } catch (configErr) {
                    console.warn('[LineLeadsController] Failed to fetch system config:', configErr.message);
                }
            }

            if (!this.contactService) {
                throw new Error('ContactService not initialized in Controller');
            }

            const leads = await this.contactService.getPotentialContacts(3000);

            res.json({
                success: true,
                data: leads,
                exhibitionConfig
            });
        } catch (error) {
            console.error('Get All Leads Error:', error);
            handleApiError(res, error, 'Get All Leads');
        }
    };

    // PUT /api/line/leads/:rowIndex
    updateLead = async (req, res) => {
        try {
            const user = req.lineUser;
            if (!user || !user.userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const rawIdentifier = req.params.rowIndex;

            if (!user.isLocalDev) {
                const targetLead = await this.contactService.getPotentialContactByRow(rawIdentifier);
                if (!targetLead) {
                    return res.status(404).json({ success: false, message: '找不到該名片資料' });
                }
                if (targetLead.lineUserId !== user.userId) {
                    return res.status(403).json({ success: false, message: '無權限修改他人的名片' });
                }
            }

            const updateData = req.body;
            const modifier = updateData.modifier || 'LineUser';

            await this.contactService.updatePotentialContact(rawIdentifier, updateData, modifier);

            res.json({ success: true, message: '更新成功' });
        } catch (error) {
            handleApiError(res, error, 'Update Lead');
        }
    };

    // DELETE /api/line/leads/:rowIndex
    deleteLead = async (req, res) => {
        try {
            const user = req.lineUser;
            if (!user || !user.userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const rawIdentifier = req.params.rowIndex;
            let modifier = 'LineUser';

            if (!user.isLocalDev) {
                const targetLead = await this.contactService.getPotentialContactByRow(rawIdentifier);
                if (!targetLead) {
                    return res.status(404).json({ success: false, message: '找不到該名片資料' });
                }
                if (targetLead.lineUserId !== user.userId) {
                    return res.status(403).json({ success: false, message: '無權限刪除他人的名片' });
                }

                modifier = user.userId;
            } else {
                modifier = 'TEST_LOCAL_USER';
            }

            await this.contactService.deletePotentialContact(rawIdentifier, modifier);
            res.json({ success: true, message: '刪除成功' });
        } catch (error) {
            handleApiError(res, error, 'Delete Lead');
        }
    };
}

module.exports = LineLeadsController;
