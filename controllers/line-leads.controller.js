/**
 * File: controllers/line-leads.controller.js
 * Version: 7.4.0
 * Date: 2026-03-22
 * Changelog: 
 * - [V7.4.0] Implemented backend ownership enforcement for updateLead and added deleteLead endpoint.
 * - [V7.3.1] Restored CRM Whitelist authorization gate in getAllLeads and updateLead, and ensured authorization executes before data access.
 * - [V7.3.0] Exposed 4 new exhibition theme config keys (triangle color/opacity, bar color/opacity) to the frontend via the getAllLeads response payload.
 * - [V7.2.0] Added minimal injection of SystemService into the Controller to expose Exhibition Configuration to the frontend.
 * - [V7.1.4] Fix localhost bypass logic in getAllLeads to prevent 401 fallthrough.
 * LINE LIFF 潛在客戶控制器
 * @description Line-Leads L1→L2：移除 Controller 內 Token 驗證實作與 Writer 直接依賴，改由 AuthService + ContactService 承擔。
 * @contract 遵守契約 v1.0：DOM/API/localStorage 不變。
 */

const { handleApiError } = require('../middleware/error.middleware');

class LineLeadsController {
    /**
     * @param {ContactService} contactService 
     * @param {AuthService} authService 
     * @param {SystemService} systemService - Injected to fetch Exhibition Config deterministically
     */
    constructor(contactService, authService, systemService) {
        this.contactService = contactService;
        this.authService = authService;
        
        // Ensure deterministic access for config exposure
        if (!systemService) {
            console.warn('[LineLeadsController] systemService not provided. Exhibition config will be skipped.');
        }
        this.systemService = systemService;
    }

    // GET /api/line/leads
    getAllLeads = async (req, res) => {
        try {
            // 1. 手動提取 Token (因為我們移出了 authMiddleware)
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ success: false, message: '未提供 Token' });
            }

            // 2. 驗證（L2：驗證細節移入 AuthService）
            let user = null;

            if (token === 'TEST_LOCAL_TOKEN') {
                // 🚧 本地開發模式：維持原日誌行為
                console.log('🚧 [Dev] 本地模式：跳過 LINE 驗證');
                user = {
                    userId: 'dev-user',
                    displayName: 'Local Dev User'
                };
            } else {
                user = await this.authService.verifyLineIdToken(token);
                if (!user) {
                    return res.status(401).json({ success: false, message: 'LINE Token 驗證失敗' });
                }
            }

            // 3. Extract and expose Exhibition Config & Whitelist Authorization Gate
            let exhibitionConfig = null;
            if (this.systemService) {
                try {
                    const sysConfig = await this.systemService.getSystemConfig();

                    // --- Whitelist Authorization Gate ---
                    if (token !== 'TEST_LOCAL_TOKEN') {
                        const whitelist = sysConfig['LINE白名單'] || [];
                        const isAllowed = whitelist.some(w => w.value && w.value.trim() === user.sub);
                        if (!isAllowed) {
                            return res.status(403).json({ success: false, message: '未授權的帳號', yourUserId: user.sub });
                        }
                    }

                    const exConfigRaw = sysConfig['展會設定'] || [];
                    
                    // Reconstruct into a flat object for easy frontend consumption.
                    // If keys are missing in the sheet, they safely default to undefined/empty.
                    exhibitionConfig = {
                        // Core behavior and data rules
                        exhibition_enabled: (exConfigRaw.find(c => c.value === 'exhibition_enabled') || {}).note || 'false',
                        exhibition_name: (exConfigRaw.find(c => c.value === 'exhibition_name') || {}).note || '',
                        exhibition_start_date: (exConfigRaw.find(c => c.value === 'exhibition_start_date') || {}).note || '',
                        exhibition_end_date: (exConfigRaw.find(c => c.value === 'exhibition_end_date') || {}).note || '',
                        
                        // Dynamic UI Theming keys
                        exhibition_triangle_color: (exConfigRaw.find(c => c.value === 'exhibition_triangle_color') || {}).note,
                        exhibition_triangle_opacity: (exConfigRaw.find(c => c.value === 'exhibition_triangle_opacity') || {}).note,
                        exhibition_bar_color: (exConfigRaw.find(c => c.value === 'exhibition_bar_color') || {}).note,
                        exhibition_bar_opacity: (exConfigRaw.find(c => c.value === 'exhibition_bar_opacity') || {}).note
                    };
                } catch (configErr) {
                    console.warn('[LineLeadsController] Failed to fetch system config:', configErr.message);
                }
            }

            // 4. 執行業務邏輯
            if (!this.contactService) {
                throw new Error('ContactService not initialized in Controller');
            }

            const leads = await this.contactService.getPotentialContacts(3000);

            // 包裹回傳格式以符合前端 result.success 檢查
            res.json({
                success: true,
                data: leads,
                exhibitionConfig // Safely pass config to UI layer
            });

        } catch (error) {
            console.error('⚠ Get All Leads Error:', error);
            handleApiError(res, error, 'Get All Leads');
        }
    };

    // PUT /api/line/leads/:rowIndex
    updateLead = async (req, res) => {
        try {
            // 1. 驗證 (同上)
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const rowIndex = parseInt(req.params.rowIndex);

            if (token !== 'TEST_LOCAL_TOKEN') {
                const user = await this.authService.verifyLineIdToken(token);
                if (!user) return res.status(401).json({ success: false, message: 'Invalid Token' });

                // --- Whitelist Authorization Gate ---
                if (this.systemService) {
                    const sysConfig = await this.systemService.getSystemConfig();
                    const whitelist = sysConfig['LINE白名單'] || [];
                    const isAllowed = whitelist.some(w => w.value && w.value.trim() === user.sub);
                    if (!isAllowed) {
                        return res.status(403).json({ success: false, message: '未授權的帳號', yourUserId: user.sub });
                    }
                }

                // --- Ownership Authorization Gate ---
                const targetLead = await this.contactService.getPotentialContactByRow(rowIndex);
                if (!targetLead) {
                    return res.status(404).json({ success: false, message: '找不到該名片資料' });
                }
                if (targetLead.lineUserId !== user.sub) {
                    return res.status(403).json({ success: false, message: '無權限修改他人的名片' });
                }
            }

            // 2. 執行更新
            const updateData = req.body;

            // ★ 行為等價：保持原本 modifier 規則（只看 body，否則 LineUser）
            const modifier = updateData.modifier || 'LineUser';

            // L2：寫入統一委派至 ContactService（移除 Writer 直接依賴）
            await this.contactService.updatePotentialContact(rowIndex, updateData, modifier);

            res.json({ success: true, message: '更新成功' });

        } catch (error) {
            handleApiError(res, error, 'Update Lead');
        }
    };

    // DELETE /api/line/leads/:rowIndex
    deleteLead = async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const rowIndex = parseInt(req.params.rowIndex);
            let modifier = 'LineUser';

            if (token !== 'TEST_LOCAL_TOKEN') {
                const user = await this.authService.verifyLineIdToken(token);
                if (!user) return res.status(401).json({ success: false, message: 'Invalid Token' });

                // --- Whitelist Authorization Gate ---
                if (this.systemService) {
                    const sysConfig = await this.systemService.getSystemConfig();
                    const whitelist = sysConfig['LINE白名單'] || [];
                    const isAllowed = whitelist.some(w => w.value && w.value.trim() === user.sub);
                    if (!isAllowed) {
                        return res.status(403).json({ success: false, message: '未授權的帳號', yourUserId: user.sub });
                    }
                }

                // --- Ownership Authorization Gate ---
                const targetLead = await this.contactService.getPotentialContactByRow(rowIndex);
                if (!targetLead) {
                    return res.status(404).json({ success: false, message: '找不到該名片資料' });
                }
                if (targetLead.lineUserId !== user.sub) {
                    return res.status(403).json({ success: false, message: '無權限刪除他人的名片' });
                }
                
                modifier = user.sub;
            } else {
                modifier = 'TEST_LOCAL_USER';
            }

            await this.contactService.deletePotentialContact(rowIndex, modifier);
            res.json({ success: true, message: '刪除成功' });

        } catch (error) {
            handleApiError(res, error, 'Delete Lead');
        }
    };
}

module.exports = LineLeadsController;