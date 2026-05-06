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
- Only files matching these patterns are included: routes/system.routes.js, controllers/system.controller.js, services/system-service.js, data/system-*.js, public/components/modals/system-modals.html
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/system.controller.js
data/system-reader.js
data/system-writer.js
public/components/modals/system-modals.html
routes/system.routes.js
services/system-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/system.controller.js">
// ============================================================================
// File: controllers/system.controller.js
// ============================================================================
/**
 * controllers/system.controller.js
 * @version 2.8.2 Phase C-2.5 (Patch: Tooltip Lazy Load)
 * @date 2026-04-24
 * @changelog
 * - Added getDashboardCompanyActivityDetails for lazy fetching MTU/SI activity details.
 * - Added hook to invalidate DashboardService RAW contact cache on force refresh.
 * - [PHASE D-2] backend dashboard range support added for safe analytical sections
 * - [PHASE D-2] operational dashboard sections intentionally left unfiltered
 * - [PHASE C-2.4] RAW contacts dashboard stats made non-blocking
 * - [PHASE C-2.4] dashboard initial render no longer waits for Google Sheet contact stats
 * - Removed SystemController dashboard debug logs
 * * [Forensics Fix / Phase 8.3 Task] Added temporary debug logs for /api/dashboard handler.
 */
const { handleApiError } = require('../middleware/error.middleware');
// [New] 引入 SystemService 以支援向後相容的內部實例化
const SystemService = require('../services/system-service');

class SystemController {
    /**
     * @param {SystemService|SystemReader} arg1 - SystemService 或 SystemReader (Legacy)
     * @param {DashboardService|SystemWriter} arg2 - DashboardService 或 SystemWriter (Legacy)
     * @param {DashboardService} [arg3] - DashboardService (Legacy only)
     */
    constructor(arg1, arg2, arg3) {
        // Duck Typing: 若第一個參數具有 getSystemConfig 方法，判定為 SystemService
        const isService = arg1 && typeof arg1.getSystemConfig === 'function';

        if (isService) {
            // 新式注入: (systemService, dashboardService)
            this.systemService = arg1;
            this.dashboardService = arg2;
        } else {
            // 舊式注入相容: (systemReader, systemWriter, dashboardService)
            // 內部自行組裝 Service
            this.systemService = new SystemService(arg1, arg2);
            this.dashboardService = arg3;
        }
    }

    // 處理 GET /api/config
    getSystemConfig = async (req, res) => {
        try {
            const config = await this.systemService.getSystemConfig();
            res.json(config);
        } catch (error) {
            handleApiError(res, error, 'Get Config');
        }
    };

    // 處理 POST /api/cache/invalidate
    invalidateCache = async (req, res) => {
        try {
            const result = await this.systemService.invalidateCache();
            
            // [PHASE C-2.4 PATCH] Invalidate Dashboard RAW cache on global force refresh
            if (this.dashboardService && typeof this.dashboardService.invalidateRawContactStatsCache === 'function') {
                this.dashboardService.invalidateRawContactStatsCache();
            }

            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Invalidate Cache');
        }
    };

    // 處理 GET /api/system/status
    getSystemStatus = async (req, res) => {
        try {
            const result = await this.systemService.getSystemStatus();
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Get System Status');
        }
    };

    // --- Dashboard 聚合方法 (維持使用 DashboardService) ---

    // 處理 GET /api/dashboard
    getDashboardData = async (req, res) => {
        try {
            // [PHASE D-2] Extract range parameters for safe analytical sections
            const options = {
                range: req.query.range,
                start: req.query.start,
                end: req.query.end
            };

            const data = await this.dashboardService.getDashboardData(options);
            
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Dashboard');
        }
    };

    // [PHASE C-2.4] 處理 GET /api/dashboard/contacts-stats
    getDashboardContactStats = async (req, res) => {
        try {
            const data = await this.dashboardService.getRawContactStats();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Dashboard Contact Stats');
        }
    };

    // 處理 GET /api/dashboard/company-activity-details
    getDashboardCompanyActivityDetails = async (req, res) => {
        try {
            const { type } = req.query;
            if (type !== 'mtu' && type !== 'si') {
                return res.status(400).json({ success: false, message: 'Invalid type' });
            }
            const data = await this.dashboardService.getCompanyActivityDetails(type);
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Company Activity Details');
        }
    };

    // 處理 GET /api/contacts/dashboard
    getContactsDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getContactsDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Contacts Dashboard');
        }
    };

    // 處理 GET /api/events/dashboard
    getEventsDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getEventsDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Events Dashboard');
        }
    };

    // 處理 GET /api/companies/dashboard
    getCompaniesDashboardData = async (req, res) => {
        try {
            const data = await this.dashboardService.getCompaniesDashboardData();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Companies Dashboard');
        }
    };
}

module.exports = SystemController;
</file>

<file path="data/system-reader.js">
/**
 * data/system-reader.js
 * 專門負責讀取系統級資料的類別 (系統設定、使用者)
 * * @version 2.0.2
 * @date 2026-03-17
 * @reason Temporary Compatibility Adapter for Legacy Modules
 * @description 恢復 getSystemConfig 介面以支援舊模組 (Dashboard, Product)，但內部轉接至 Raw API。
 * @changelog
 * - [Fix] Synchronized backwards-compatibility adapter to use case-insensitive, value-or-note config item matching.
 */

const BaseReader = require('./base-reader');

class SystemReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得全域最後寫入時間戳 (封裝 Cache 存取)
     * @returns {string|null} ISO String
     */
    getLastWriteTimestamp() {
        return this.cache._globalLastWrite ? this.cache._globalLastWrite.data : null;
    }

    /**
     * [Standard A] 取得系統設定原始資料
     * 僅回傳二維陣列，不處理任何業務規則
     * @returns {Promise<Array<Array<string>>>} Raw rows
     */
    async getSystemConfigRaw() {
        const cacheKey = 'systemConfigRaw';
        const now = Date.now();
        
        if (this.cache[cacheKey] && this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId, 
                range: `${this.config.SHEETS.SYSTEM_CONFIG}!A:I`,
            });
            
            const rows = response.data.values || [];
            this.cache[cacheKey] = { data: rows, timestamp: now };
            return rows;

        } catch (error) {
            console.error('❌ [SystemReader] 讀取系統設定失敗:', error);
            return [];
        }
    }

    /**
     * [HOTFIX / ADAPTER] 向下相容的系統設定讀取方法
     * 目的：防止尚未重構的模組 (如 DashboardService, ProductService) 因呼叫舊 API 而崩潰
     * 實作：呼叫 getSystemConfigRaw() 並於此處套用最小必要的 defaults/sort 邏輯
     * @deprecated 請儘速遷移至 SystemService.getSystemConfig()
     */
    async getSystemConfig() {
        console.warn('⚠️ [Deprecation] SystemReader.getSystemConfig() is deprecated. Call SystemService instead.');
        
        const rows = await this.getSystemConfigRaw();
        
        // 暫時性邏輯：為了滿足舊模組對資料結構的期望，在此處重複 Service 層的處理邏輯
        const settings = {
            '事件類型': [
                { value: 'general', note: '一般', order: 1, color: '#6c757d' },
                { value: 'iot', note: 'IOT', order: 2, color: '#007bff' },
                { value: 'dt', note: 'DT', order: 3, color: '#28a745' },
                { value: 'dx', note: 'DX', order: 4, color: '#ffc107' },
                { value: 'legacy', note: '舊事件', order: 5, color: '#dc3545' }
            ],
            '日曆篩選規則': []
        };
        
        const normalize = (str) => (str || '').toString().trim().toLowerCase();

        if (rows.length > 1) {
            rows.slice(1).forEach(row => {
                const [type, item, order, enabled, note, color, value2, value3, category] = row;
                
                if (type && item) {
                    const normalizedItem = normalize(item);
                    const matchFn = (i) => normalize(i.value) === normalizedItem || normalize(i.note) === normalizedItem;

                    if (enabled === 'TRUE') {
                        if (!settings[type]) settings[type] = [];
                        
                        const exists = settings[type].find(matchFn);
                        if (exists) {
                            exists.note = note || item;
                            exists.order = parseInt(order) || 99;
                        } else {
                            settings[type].push({
                                value: item,
                                note: note || item,
                                order: parseInt(order) || 99,
                                color: color || null,
                                value2: value2 || null, 
                                value3: value3 || null, 
                                category: category || '其他' 
                            });
                        }
                    } else {
                        // 當 enabled !== 'TRUE' 時，若該項目已存在於預設值中，將其移除
                        if (settings[type]) {
                            const index = settings[type].findIndex(matchFn);
                            if (index !== -1) {
                                settings[type].splice(index, 1);
                            }
                        }
                    }
                }
            });
        }
        
        // 排序邏輯
        Object.keys(settings).forEach(type => {
            if (Array.isArray(settings[type])) {
                settings[type].sort((a, b) => a.order - b.order);
            }
        });
        
        return settings;
    }

    /**
     * [Standard A] 取得使用者名冊
     * 允許 Mapping 產生 rowIndex，但不得包含業務篩選邏輯
     */
    async getUsers() {
        const cacheKey = 'users';
        const range = '使用者名冊!A:D';
        const targetSheetId = this.config.IDS.AUTH || this.targetSpreadsheetId;
        const now = Date.now();
        
        if (this.cache[cacheKey] && this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        console.log(`🔐 [Auth] 讀取使用者名冊 (Sheet ID: ...${targetSheetId.slice(-6)})...`);

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: targetSheetId,
                range: range,
            });

            const rows = response.data.values || [];
            
            const allUsers = rows.map((row, index) => {
                const username = row[0] ? row[0].trim() : '';
                const passwordHash = row[1] ? row[1].trim() : '';
                const displayName = row[2] ? row[2].trim() : '';
                const role = row[3] ? row[3].trim().toLowerCase() : 'sales';

                return {
                    rowIndex: index + 1,
                    username,
                    passwordHash,
                    displayName,
                    role
                };
            }).filter(user => user.username && user.passwordHash);

            this.cache[cacheKey] = { data: allUsers, timestamp: now };
            return allUsers;

        } catch (error) {
            console.error('❌ [SystemReader] 讀取使用者名冊失敗:', error.message);
            return [];
        }
    }

    /**
     * [New] 取得指定 Sheet Title 的 SheetId (Integer)
     */
    async getTabId(sheetTitle) {
        let targetSpreadsheetId = this.targetSpreadsheetId;
        // 特例處理：使用者名冊可能在 Auth Sheet
        if (sheetTitle === '使用者名冊' && this.config.IDS.AUTH) {
            targetSpreadsheetId = this.config.IDS.AUTH;
        }

        const cacheKey = `sheetId_${targetSpreadsheetId}_${sheetTitle}`;
        if (this.cache[cacheKey]) return this.cache[cacheKey];

        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: targetSpreadsheetId,
                fields: 'sheets.properties.title,sheets.properties.sheetId',
            });

            const sheet = response.data.sheets.find(s => s.properties.title === sheetTitle);
            if (sheet) {
                this.cache[cacheKey] = sheet.properties.sheetId;
                return sheet.properties.sheetId;
            }
            return null;
        } catch (error) {
            console.error(`❌ [SystemReader] 無法取得 SheetId: ${sheetTitle}`, error);
            return null;
        }
    }
}

module.exports = SystemReader;
</file>

<file path="data/system-writer.js">
/**
 * data/system-writer.js
 * 系統設定寫入器
 * * @version 6.0.0 (Refactored for Standard S - Pure Write)
 * @date 2026-01-26
 * @description 移除 Reader 依賴與讀取操作，僅執行座標寫入。
 */

const BaseWriter = require('./base-writer');

class SystemWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * 注意：移除了 systemReader 依賴
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 【內部輔助】取得 User 操作的目標 ID
     */
    _getAuthTargetId() {
        if (this.config.IDS.AUTH && this.config.IDS.AUTH !== this.targetSpreadsheetId) {
            return this.config.IDS.AUTH;
        }
        return this.targetSpreadsheetId;
    }

    /**
     * 更新系統設定 (通用底層方法)
     */
    async updateSystemConfig(configData, modifier) {
        console.log(`⚙️ [SystemWriter] 更新系統設定 [${configData.type}/${configData.value}] by ${modifier}`);
        
        const sheetName = this.config.SHEETS.SYSTEM_CONFIG;
        
        const newRow = [
            configData.type,        // A
            configData.value,       // B
            configData.order || 99, // C
            'TRUE',                 // D
            configData.note || '',  // E
            configData.color || '', // F
            '',                     // G
            '',                     // H
            'System'                // I
        ];

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.targetSpreadsheetId,
                range: `${sheetName}!A:I`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] }
            });

            // Cache Invalidation 移交 Service 負責
            return { success: true };
        } catch (error) {
            console.error('❌ [SystemWriter] updateSystemConfig 失敗:', error);
            throw error;
        }
    }

    /**
     * 更新系統偏好設定
     */
    async updateSystemPref(item, note, modifier = 'System') {
        return this.updateSystemConfig({
            type: 'SystemPref',
            value: item,
            note: note,
            order: 0,
            color: ''
        }, modifier);
    }

    /**
     * 建立新使用者
     */
    async createUser(userData) {
        console.log(`👤 [SystemWriter] 建立新使用者: ${userData.username}`);
        
        const targetId = this._getAuthTargetId();
        const sheetName = '使用者名冊';

        const newRow = [
            userData.username,
            userData.passwordHash,
            userData.displayName,
            userData.role || 'sales'
        ];

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: targetId,
            range: `${sheetName}!A:D`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        return { success: true };
    }

    /**
     * [Standard S] 更新使用者密碼 (By Row Index)
     * 禁止自行 lookup，必須由外部傳入 rowIndex
     */
    async updateUserPasswordByRow(rowIndex, newPasswordHash) {
        console.log(`🔐 [SystemWriter] 更新使用者密碼 (Row: ${rowIndex})`);
        
        const targetId = this._getAuthTargetId();
        const sheetName = '使用者名冊';
        const range = `${sheetName}!B${rowIndex}`;
        
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: targetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newPasswordHash]] }
        });

        return { success: true };
    }

    /**
     * [Standard S] 刪除使用者 (By SheetId & RowIndex)
     * 禁止自行 lookup sheetId 或 rowIndex
     */
    async deleteUserByRow(sheetId, rowIndex) {
        console.log(`🗑️ [SystemWriter] 刪除使用者 (SheetId: ${sheetId}, Row: ${rowIndex})`);
        
        let spreadsheetIdToUse = this._getAuthTargetId();

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetIdToUse,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });

        return { success: true };
    }
}

module.exports = SystemWriter;
</file>

<file path="public/components/modals/system-modals.html">
<div id="system-status-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">🔍 系統狀態檢查</h2>
            <button class="close-btn" onclick="closeModal('system-status-modal')">&times;</button>
        </div>
        <div id="system-status-content">
            <div class="loading show">
                <div class="spinner"></div>
                <p>檢查系統狀態中...</p>
            </div>
        </div>
    </div>
</div>

<div id="confirm-dialog" class="modal">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h2 class="modal-title">確認操作</h2>
            <button class="close-btn" onclick="closeModal('confirm-dialog')">&times;</button>
        </div>
        <div id="confirm-message" style="margin-bottom: 20px; padding: 20px; text-align: center;">
            </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="action-btn" style="background: #6c757d;" onclick="closeModal('confirm-dialog')">取消</button>
            <button class="action-btn" id="confirm-action-btn" onclick="executeConfirmAction()">確認</button>
        </div>
    </div>
</div>

<div id="loading-overlay" class="loading-overlay" style="display: none;">
    <div class="loading-content">
        <div class="spinner"></div>
        <p id="loading-message">處理中...</p>
    </div>
</div>

<template id="notification-template">
    <div class="notification">
        <div class="notification-content">
            <span class="notification-icon"></span>
            <span class="notification-message"></span>
        </div>
        <button class="notification-close">&times;</button>
    </div>
</template>

<div id="business-card-preview-modal" class="modal">
    <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
        <div class="modal-header">
            <h2 class="modal-title">名片預覽</h2>
            <button class="close-btn" onclick="closeBusinessCardPreview()">&times;</button>
        </div>
        <div id="business-card-preview-content" style="text-align: center; padding: var(--spacing-4);">
            <div class="loading show"><div class="spinner"></div></div>
        </div>
    </div>
</div>
</file>

<file path="routes/system.routes.js">
// routes/system.routes.js
/**
 * System Routes
 * @version 5.2.1 (Phase C-2.5)
 * @date 2026-04-24
 * @changelog
 * - Added lazy load endpoint for company activity details.
 * - RAW contacts dashboard stats made non-blocking
 * - dashboard initial render no longer waits for Google Sheet contact stats
 * - Phase 5 - Service Locator Pattern
 * @description 使用 req.app.get('services') 動態獲取 Controller 實例
 */

const express = require('express');
const router = express.Router();

// 輔助函式：動態獲取 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.systemController) {
        throw new Error('SystemController 尚未初始化');
    }
    return services.systemController;
};

// 系統設定
// GET /api/config
router.get('/config', (req, res, next) => {
    getController(req).getSystemConfig(req, res, next);
});

// 清除快取
// POST /api/cache/invalidate
router.post('/cache/invalidate', (req, res, next) => {
    getController(req).invalidateCache(req, res, next);
});

// 系統狀態輪詢
// GET /api/system/status
router.get('/system/status', (req, res, next) => {
    getController(req).getSystemStatus(req, res, next);
});

// --- 儀表板路由 ---

// GET /api/dashboard
router.get('/dashboard', (req, res, next) => {
    getController(req).getDashboardData(req, res, next);
});

// [PHASE C-2.4] GET /api/dashboard/contacts-stats
router.get('/dashboard/contacts-stats', (req, res, next) => {
    getController(req).getDashboardContactStats(req, res, next);
});

// GET /api/dashboard/company-activity-details
router.get('/dashboard/company-activity-details', (req, res, next) => {
    getController(req).getDashboardCompanyActivityDetails(req, res, next);
});

// GET /api/contacts/dashboard
router.get('/contacts/dashboard', (req, res, next) => {
    getController(req).getContactsDashboardData(req, res, next);
});

// GET /api/events/dashboard
router.get('/events/dashboard', (req, res, next) => {
    getController(req).getEventsDashboardData(req, res, next);
});

// GET /api/companies/dashboard
router.get('/companies/dashboard', (req, res, next) => {
    getController(req).getCompaniesDashboardData(req, res, next);
});

module.exports = router;
</file>

<file path="services/system-service.js">
// tfc433/0223test1/0223test1-414989b3734fe392e53bab71f508b8df0df17bf6/services/system-service.js
/**
 * services/system-service.js
 * 系統服務模組
 * @version 2.1.1
 * @date 2026-04-20
 * @description 接管所有業務邏輯 (Defaults/Filter/Sort) 與 User 操作流程控制。
 * * Changelog:
 * - [V2.1.0] Appended exact '展會設定' keys to DEFAULT_SETTINGS to support safe fallback configuration.
 * - [Fix] Implemented case-insensitive, value-or-note matching for config merge to prevent duplicate pre-seeded defaults (e.g., Event Types).
 * - [V2.1.1] Fixed missing `style` mapping for newly created System Config items (ensures column F color is applied to all config groups, not only default-seeded ones)
 * - [Cleanup] Removed temporary forensic debug logging for System Config raw inspection
 */

class SystemService {
    /**
     * @param {SystemReader} systemReader 
     * @param {SystemWriter} systemWriter 
     */
    constructor(systemReader, systemWriter) {
        this.systemReader = systemReader;
        this.systemWriter = systemWriter;

        // 定義預設設定 (Moved from Reader)
        this.DEFAULT_SETTINGS = {
            '事件類型': [
                { value: 'general', note: '一般', order: 1, color: '#6c757d' },
                { value: 'iot', note: 'IOT', order: 2, color: '#007bff' },
                { value: 'dt', note: 'DT', order: 3, color: '#28a745' },
                { value: 'dx', note: 'DX', order: 4, color: '#ffc107' },
                { value: 'legacy', note: '舊事件', order: 5, color: '#dc3545' }
            ],
            '日曆篩選規則': [],
            // [Fallback Auto-Tag] Default Exhibition Config Injection (Strict key structure)
            '展會設定': [
                { value: 'exhibition_enabled', note: 'false', order: 1, category: '設定' },
                { value: 'exhibition_name', note: '預設展會', order: 2, category: '設定' },
                { value: 'exhibition_start_date', note: '1970-01-01', order: 3, category: '設定' },
                { value: 'exhibition_end_date', note: '1970-01-01', order: 4, category: '設定' }
            ]
        };
    }

    /**
     * 取得系統全域設定
     * 包含: Raw Data 讀取 -> 預設值注入 -> Filter -> Merge -> Sort
     */
    async getSystemConfig() {
        // 1. 取得原始資料
        const rows = await this.systemReader.getSystemConfigRaw();
        const settings = JSON.parse(JSON.stringify(this.DEFAULT_SETTINGS)); // Deep copy
        
        const normalize = (str) => (str || '').toString().trim().toLowerCase();
        
        // 2. 處理資料 (Business Logic)
        if (rows.length > 1) {
            rows.slice(1).forEach(row => {
                const [type, item, order, enabled, note, color, value2, value3, category] = row;
                
                if (type && item) {
                    const normalizedItem = normalize(item);
                    const matchFn = (i) => normalize(i.value) === normalizedItem || normalize(i.note) === normalizedItem;

                    if (enabled === 'TRUE') {
                        if (!settings[type]) settings[type] = [];
                        
                        const exists = settings[type].find(matchFn);
                        if (exists) {
                            exists.note = note || item;
                            exists.order = parseInt(order) || 99;
                        } else {
                            settings[type].push({
                                value: item,
                                note: note || item,
                                order: parseInt(order) || 99,
                                color: color || null,
                                style: color || null,
                                value2: value2 || null, 
                                value3: value3 || null, 
                                category: category || '其他' 
                            });
                        }
                    } else {
                        // 當 enabled !== 'TRUE' 時，若該項目已存在於預設值中，將其移除
                        if (settings[type]) {
                            const index = settings[type].findIndex(matchFn);
                            if (index !== -1) {
                                settings[type].splice(index, 1);
                            }
                        }
                    }
                }
            });
        }
        
        // 3. 排序 (Sorting Logic)
        Object.keys(settings).forEach(type => {
            if (Array.isArray(settings[type])) {
                settings[type].sort((a, b) => a.order - b.order);
            }
        });
        
        return settings;
    }

    /**
     * 清除後端快取
     */
    async invalidateCache() {
        this.systemReader.invalidateCache(null);
        return { success: true, message: '後端所有快取已清除' };
    }

    /**
     * 取得系統最後寫入狀態
     */
    async getSystemStatus() {
        const lastWrite = this.systemReader.getLastWriteTimestamp();
        return { success: true, lastWriteTimestamp: lastWrite };
    }

    /**
     * 更新系統偏好 (含 Cache Clear)
     */
    async updateSystemPref(item, note, modifier) {
        await this.systemWriter.updateSystemPref(item, note, modifier);
        this.systemReader.invalidateCache('systemConfigRaw');
        return { success: true };
    }

    /**
     * 建立使用者 (含 Cache Clear)
     */
    async createUser(userData) {
        await this.systemWriter.createUser(userData);
        this.systemReader.invalidateCache('users');
        return { success: true };
    }

    /**
     * 更新使用者密碼
     * Flow: Lookup(Reader) -> Write(Writer) -> Invalidate
     */
    async updateUserPassword(username, newPasswordHash) {
        // 1. Lookup
        const users = await this.systemReader.getUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) throw new Error('找不到該使用者');
        
        // 2. Write by Row Index
        await this.systemWriter.updateUserPasswordByRow(user.rowIndex, newPasswordHash);

        // 3. Invalidate
        this.systemReader.invalidateCache('users');
        return { success: true };
    }

    /**
     * 刪除使用者
     * Flow: Lookup(Reader) -> Get SheetId(Reader) -> Write(Writer) -> Invalidate
     */
    async deleteUser(username) {
        // 1. Lookup User
        const users = await this.systemReader.getUsers();
        const user = users.find(u => u.username === username);
        if (!user) throw new Error('找不到該使用者');

        // 2. Get Sheet ID (Integer)
        const sheetId = await this.systemReader.getTabId('使用者名冊');
        if (sheetId === null) throw new Error('無法取得使用者名冊的 Sheet ID');

        // 3. Write (Delete Row)
        await this.systemWriter.deleteUserByRow(sheetId, user.rowIndex);

        // 4. Invalidate
        this.systemReader.invalidateCache('users');
        return { success: true };
    }
}

module.exports = SystemService;
</file>

</files>
