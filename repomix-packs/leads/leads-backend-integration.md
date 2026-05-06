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
- Only files matching these patterns are included: routes/line-leads.routes.js, controllers/line-leads.controller.js, services/external-service.js, routes/external.routes.js, controllers/external.controller.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/external.controller.js
controllers/line-leads.controller.js
routes/external.routes.js
routes/line-leads.routes.js
services/external-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/external.controller.js">
/**
 * controllers/external.controller.js
 * 外部服務控制器
 * * @version 7.0.0 (L2 Refactor: Logic Moved to Service)
 * @date 2026-01-26
 * @description 僅負責路由參數轉發與回應串流處理，所有 AI 與 Drive 邏輯移至 ExternalService。
 */

const { handleApiError } = require('../middleware/error.middleware');
const ExternalService = require('../services/external-service');

// 輔助：取得 Service 實例 (支援依賴注入)
const getExternalService = (req) => {
    const services = req.app.get('services');
    // 若 Service Container 已註冊則使用，否則即時實例化 (相容性)
    return services.externalService || new ExternalService(services.googleClientService);
};

// POST /api/external/companies/:companyName/profile
exports.generateCompanyProfile = async (req, res) => {
    const { companyName } = req.params;

    if (!companyName) {
        return res.status(400).json({ success: false, error: '缺少公司名稱' });
    }

    try {
        const service = getExternalService(req);
        const aiResponse = await service.generateCompanyProfile(companyName);
        
        res.json({ 
            success: true, 
            profile: aiResponse,
            source: 'Gemini AI'
        });

    } catch (error) {
        handleApiError(res, error, 'Generate Company Profile');
    }
};

// GET /api/external/thumbnail
exports.getDriveThumbnail = async (req, res) => {
    const { fileId, link } = req.query;

    try {
        const service = getExternalService(req);
        
        // 呼叫 Service 取得串流與標頭
        const { data: stream, headers } = await service.getDriveFileStream(fileId, link);

        // 設定回應標頭 (Controller 職責: HTTP Protocol)
        if (headers['content-type']) {
            res.setHeader('Content-Type', headers['content-type']);
        }
        if (headers['content-length']) {
            res.setHeader('Content-Length', headers['content-length']);
        }

        // Pipe 串流
        stream.pipe(res);

        // 錯誤監聽
        stream.on('error', (streamErr) => {
            console.error('[Controller] Stream Error:', streamErr);
            if (!res.headersSent) res.status(500).send('Image Stream Error');
        });

    } catch (error) {
        // 針對 Service 拋出的特定錯誤轉換為 HTTP 狀態
        if (error.message === 'Invalid File ID') {
            return res.status(400).send('Invalid File ID');
        }
        if (error.code === 404 || error.message.includes('File not found')) {
            return res.status(404).send('Image Not Found');
        }
        
        console.error('[Controller] Get Thumbnail Error:', error.message);
        if (!res.headersSent) res.status(500).send('Internal Server Error');
    }
};
</file>

<file path="controllers/line-leads.controller.js">
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
</file>

<file path="routes/external.routes.js">
/**
 * routes/external.routes.js
 * 外部整合路由 (Google Search, AI, Drive)
 * * @version 6.0.0
 * @date 2026-01-15
 */
const express = require('express');
const router = express.Router();
const externalController = require('../controllers/external.controller');

// GET /api/external/thumbnail
// 新版標準路徑，用於取得 Google Drive 圖片縮圖
router.get('/thumbnail', externalController.getDriveThumbnail);

// POST /api/external/companies/:companyName/profile
// 用於生成公司 AI 簡介
router.post('/companies/:companyName/profile', externalController.generateCompanyProfile);

module.exports = router;
</file>

<file path="routes/line-leads.routes.js">
/**
 * routes/line-leads.routes.js
 * @version 1.3.0
 * @date 2026-03-22
 * @description Line-Leads L1→L2：改由 services 容器注入 authService。新增 systemService 注入以支援展會設定讀取。
 * @changelog 
 * - [V1.3.0] Added DELETE /leads/:rowIndex endpoint for physical card deletion.
 * - [V1.2.0] Passed systemService into LineLeadsController constructor.
 */

const express = require('express');
const router = express.Router();
const LineLeadsController = require('../controllers/line-leads.controller');

// 依賴注入：從 app 中獲取 services
const getController = (req) => {
    const app = req.app;
    const services = app.get('services');

    const { contactService, authService, systemService } = services;

    if (!authService) {
        throw new Error("authService is not available in app.get('services'). Make sure services/index.js includes authService.");
    }

    return new LineLeadsController(contactService, authService, systemService);
};

// GET /api/line/leads - 取得所有名片資料
router.get('/leads', (req, res) => getController(req).getAllLeads(req, res));

// PUT /api/line/leads/:rowIndex - 更新特定名片狀態/資料
router.put('/leads/:rowIndex', (req, res) => getController(req).updateLead(req, res));

// DELETE /api/line/leads/:rowIndex - 刪除特定名片 (物理刪除)
router.delete('/leads/:rowIndex', (req, res) => getController(req).deleteLead(req, res));

module.exports = router;
</file>

<file path="services/external-service.js">
/**
 * services/external-service.js
 * 外部服務整合層 (AI & Google Drive)
 * * @version 1.0.0 (Phase 1 Refactor - L2 Upgrade)
 * @date 2026-01-26
 * @description 封裝 Gemini AI 策略、Prompt 建構與 Google Drive 串流邏輯。
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class ExternalService {
    /**
     * @param {GoogleClientService} googleClientService - 用於獲取 Drive Client
     */
    constructor(googleClientService) {
        this.googleClientService = googleClientService;
        
        // AI Configuration
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.MODEL_CONFIG = {
            primary: "gemini-2.5-flash-lite",
            fallbacks: ["gemini-1.5-flash", "gemini-pro"]
        };
    }

    /**
     * [Internal] 初始化 AI 模型
     */
    _initializeModel(modelName) {
        try {
            return this.genAI.getGenerativeModel({ model: modelName });
        } catch (error) {
            console.warn(`[AI] 模型 ${modelName} 初始化失敗:`, error.message);
            return null;
        }
    }

    /**
     * [Internal] 執行帶有備援機制的 AI 生成
     */
    async _generateWithFallback(prompt) {
        const modelsToTry = [this.MODEL_CONFIG.primary, ...this.MODEL_CONFIG.fallbacks];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 [AI] 嘗試使用模型: ${modelName}`);
                const model = this._initializeModel(modelName);
                if (!model) continue;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                console.warn(`⚠️ [AI] 模型 ${modelName} 生成失敗:`, error.message);
                lastError = error;
            }
        }
        throw lastError || new Error('所有 AI 模型皆無法回應');
    }

    /**
     * 生成公司簡介
     * @param {string} companyName 
     * @returns {Promise<string>} 生成的文字內容
     */
    async generateCompanyProfile(companyName) {
        const prompt = `
            請為一家名為「${companyName}」的公司撰寫一段簡短的專業簡介（約 150 字）。
            重點包含：
            1. 預測其可能的主營業務（基於名稱推測，若不確定請語帶保留）。
            2. 市場定位。
            3. 語氣專業且正面。
            請直接輸出內容，不要包含 Markdown 格式或額外說明。
        `;
        return await this._generateWithFallback(prompt);
    }

    /**
     * [Internal] 解析 Drive File ID
     */
    _parseFileId(fileId, link) {
        if (fileId) return fileId;
        if (!link) return null;
        
        try {
            const match = link.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || link.match(/id=([a-zA-Z0-9_-]{25,})/);
            return match && match[1] ? match[1] : null;
        } catch (e) {
            console.warn(`[Drive Service] ID 解析失敗: ${link}`, e);
            return null;
        }
    }

    /**
     * 取得 Drive 檔案串流與標頭資訊
     * @param {string} fileId 
     * @param {string} link 
     * @returns {Promise<{data: Stream, headers: Object}>}
     */
    async getDriveFileStream(fileId, link) {
        const targetFileId = this._parseFileId(fileId, link);
        if (!targetFileId) {
            throw new Error('Invalid File ID'); // Service 層拋出業務錯誤
        }

        if (!this.googleClientService) {
            throw new Error('GoogleClientService not initialized');
        }

        const drive = await this.googleClientService.getDriveClient();

        try {
            const response = await drive.files.get(
                { fileId: targetFileId, alt: 'media' },
                { responseType: 'stream' }
            );
            
            return {
                data: response.data,
                headers: response.headers
            };
        } catch (error) {
            console.error(`[Drive Service] 讀取失敗 (ID: ${targetFileId}):`, error.message);
            throw error; // 拋出給 Controller 處理 HTTP 狀態
        }
    }
}

module.exports = ExternalService;
</file>

</files>
