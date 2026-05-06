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
- Only files matching these patterns are included: routes/company.routes.js, controllers/company.controller.js, services/company-service.js, data/company-sql-reader.js, data/company-sql-writer.js, data/company-reader.js, data/company-writer.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/company.controller.js
data/company-reader.js
data/company-sql-reader.js
data/company-sql-writer.js
data/company-writer.js
routes/company.routes.js
services/company-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/company.controller.js">
/**
 * controllers/company.controller.js
 * 公司模組控制器
 * * @version 8.0.0 (Phase 8: ID-based Operations)
 * * @date 2026-02-10
 * * @description
 * * 1. [Contract] getCompanyDetails, updateCompany, deleteCompany 改為接收 companyId。
 * * 2. [Refactor] 移除 decodeURIComponent (ID 不需解碼)。
 */

const { handleApiError } = require('../middleware/error.middleware');

class CompanyController {
    /**
     * 建構子：透過依賴注入取得 CompanyService
     * @param {CompanyService} companyService 
     */
    constructor(companyService) {
        this.companyService = companyService;
    }

    /**
     * 取得公司列表 (支援搜尋與篩選)
     * GET /api/companies?q=...&type=...&stage=...
     */
    getCompanies = async (req, res) => {
        try {
            // [Fix] 從 req.query 提取過濾條件
            // 這些參數將傳遞給 Service 進行記憶體內過濾
            const filters = {
                q: req.query.q || req.query.search || '',
                type: req.query.type,
                stage: req.query.stage,
                rating: req.query.rating
            };

            // 呼叫 Service 的列表方法 (已包含 Activity 排序邏輯)
            const sortedCompanies = await this.companyService.getCompanyListWithActivity(filters);
            
            res.json({ success: true, data: sortedCompanies });
        } catch (error) {
            handleApiError(res, error, 'Get Companies');
        }
    };

    /**
     * 建立新公司
     * POST /api/companies
     */
    createCompany = async (req, res) => {
        try {
            const { companyName } = req.body;
            if (!companyName) {
                return res.status(400).json({ success: false, error: 'Company name is required' });
            }
            
            // 傳入 req.body 作為完整資料 (包含 type, phone 等)，確保一次寫入
            const result = await this.companyService.createCompany(companyName, req.body, req.user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Company');
        }
    };

    /**
     * 取得公司詳細資料 (含關聯資料)
     * GET /api/companies/:companyId/details
     */
    getCompanyDetails = async (req, res) => {
        try {
            // [Contract Fix] 使用 companyId
            const companyId = req.params.companyId;
            
            // [Note] Service 必須支援 ID 查詢 (Phase 7+ default)
            const result = await this.companyService.getCompanyDetails(companyId);
            res.json({ success: true, data: result });
        } catch (error) {
            handleApiError(res, error, 'Get Company Details');
        }
    };

    /**
     * 更新公司資料
     * PUT /api/companies/:companyId
     */
    updateCompany = async (req, res) => {
        try {
            const companyId = req.params.companyId;
            
            // 呼叫 Service 更新邏輯
            const result = await this.companyService.updateCompany(
                companyId, 
                req.body, 
                req.user
            );
            
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Company');
        }
    };

    /**
     * 刪除公司
     * DELETE /api/companies/:companyId
     */
    deleteCompany = async (req, res) => {
        try {
            const companyId = req.params.companyId;
            
            const result = await this.companyService.deleteCompany(companyId, req.user);
            res.json(result);
        } catch (error) {
            // 特別處理「有關聯資料無法刪除」的邏輯錯誤，回傳 400 讓前端顯示 Toast
            if (error.message && error.message.startsWith('無法刪除')) {
                return res.status(400).json({ success: false, error: error.message });
            }
            handleApiError(res, error, 'Delete Company');
        }
    };
}

module.exports = CompanyController;
</file>

<file path="data/company-reader.js">
/**
 * data/company-reader.js
 * 專門負責讀取所有與「公司總表」相關資料的類別
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 實作 Strict Mode 依賴注入。
 */

const BaseReader = require('./base-reader');

class CompanyReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得公司總表列表
     * @returns {Promise<Array<object>>}
     */
    async getCompanyList() {
        const cacheKey = 'companyList';
        const range = `${this.config.SHEETS.COMPANY_LIST}!A:M`;

        const rowParser = (row) => ({
            companyId: row[0] || '',
            companyName: row[1] || '',
            phone: row[2] || '',
            address: row[3] || '',
            createdTime: row[4] || '',
            lastUpdateTime: row[5] || '',
            county: row[6] || '',
            creator: row[7] || '',
            lastModifier: row[8] || '',
            introduction: row[9] || '',
            companyType: row[10] || '',     // 新增：公司類型
            customerStage: row[11] || '',   // 新增：客戶階段
            engagementRating: row[12] || '' // 新增：互動評級
        });

        return this._fetchAndCache(cacheKey, range, rowParser);
    }
}

module.exports = CompanyReader;
</file>

<file path="data/company-sql-reader.js">
/**
 * data/company-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: companies
 * - Schema: Strict adherence to provided JSON schema
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.3.0 (Phase 11 - Company List DB-First lastActivity)
 * - Date: 2026-04-15
 * - Changelog: 
 * - [PHASE 11] Added View-first read path ('v_companies_summary') with graceful fallback to table.
 * - [PHASE 10] Migrated opportunityCount to backend.
 */

const { supabase } = require('../config/supabase');

class CompanySqlReader {

    constructor() {
        this.tableName = 'companies';
        this.viewName = 'v_companies_summary'; // Phase 11 DB-First Target
    }

    /**
     * [Compatibility Adapter]
     * Exposes getCompanyList to safely satisfy legacy CORE reader dependencies
     * without modifying service constructor signatures or internal logic.
     * Resolves TypeError: this.companyReader.getCompanyList is not a function
     * @returns {Promise<Array<Object>>}
     */
    async getCompanyList() {
        return this.getCompanies();
    }

    /**
     * Get a single company by ID
     * @param {string} companyId 
     * @returns {Promise<Object|null>} Company DTO or null
     */
    async getCompanyById(companyId) {
        if (!companyId) throw new Error('CompanySqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId)
                .single();

            // Ignore "Row not found" (PGRST116), throw strict on others
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[CompanySqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;

            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[CompanySqlReader] getCompanyById Error:', error);
            throw error;
        }
    }

    /**
     * Get all companies
     * @returns {Promise<Array<Object>>} Array of Company DTOs
     */
    async getCompanies() {
        try {
            // --- STAGE 1: DB-First View Path ---
            const viewRes = await supabase.from(this.viewName).select('*');
            if (!viewRes.error && viewRes.data) {
                return viewRes.data.map(row => this._mapRowToDto(row));
            }

            if (viewRes.error && viewRes.error.code !== '42P01') {
                 console.warn('[CompanySqlReader] View query failed with non-42P01 error:', viewRes.error);
            } else if (viewRes.error) {
                 console.warn('[CompanySqlReader] View v_companies_summary not found. Falling back to base table.');
            }

            // --- STAGE 2: Legacy Fallback ---
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) {
                throw new Error(`[CompanySqlReader] DB Error: ${error.message}`);
            }

            // Map all rows strictly
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[CompanySqlReader] getCompanies Error:', error);
            throw error;
        }
    }

    /**
     * [Performance Optimization]
     * Cross-domain projection: Fetches ONLY minimal activity timestamps from event_logs
     * for specifically requested company IDs. Eliminates massive memory hydration in Dashboard.
     * Avoids needing new RPC/views by utilizing standard PostgREST filtering and chunking.
     * @param {Array<string>} companyIds 
     * @returns {Promise<Array<Object>>} Array of raw DB rows: { company_id, created_time }
     */
    async getTargetCompanyEventActivities(companyIds) {
        if (!companyIds || companyIds.length === 0) return [];
        
        try {
            const chunkSize = 200; // Safe chunk size for PostgREST URL length limits
            let allData = [];

            for (let i = 0; i < companyIds.length; i += chunkSize) {
                const chunk = companyIds.slice(i, i + chunkSize);
                const { data, error } = await supabase
                    .from('event_logs')
                    .select('company_id, created_time')
                    .in('company_id', chunk);

                if (error) {
                    throw new Error(`[CompanySqlReader] DB Error fetching event activities: ${error.message}`);
                }
                if (data) {
                    allData = allData.concat(data);
                }
            }

            return allData;

        } catch (error) {
            console.error('[CompanySqlReader] getTargetCompanyEventActivities Error:', error);
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

        const dto = {
            // Identity
            companyId: row.company_id,
            companyName: row.company_name,

            // Contact Info
            phone: row.phone,
            address: row.address,
            city: row.city,

            // Business Info
            description: row.description,
            companyType: row.company_type,
            customerStage: row.customer_stage,
            interactionRating: row.interaction_rating,

            // Metadata / Audit
            createdTime: row.created_time,
            updatedTime: row.updated_time,
            createdBy: row.created_by,
            updatedBy: row.updated_by
        };

        // Phase 11: Safely map DB-First lastActivity if view is active
        if (row.last_activity) {
            dto.lastActivity = new Date(row.last_activity).toISOString();
            dto._hasNativeActivity = true;
        }

        return dto;
    }
}

module.exports = CompanySqlReader;
</file>

<file path="data/company-sql-writer.js">
/**
 * data/company-sql-writer.js
 * Company SQL Writer (Native Implementation)
 * * @version 1.0.0
 * * @date 2026-02-05
 * * @description
 * * 1. [Phase 7] Write Authority Migration (SQL Only).
 * * 2. [Strict] No RowIndex, No UUID generation (ID provided by Service).
 * * 3. [Schema] Matches Supabase schema strictly.
 */

const { supabase } = require('../config/supabase');

class CompanySqlWriter {

    constructor() {
        this.tableName = 'companies';
    }

    /**
     * 建立新公司
     * @param {Object} companyData 完整公司資料 (含 companyId)
     * @param {string} creator 建立者
     * @returns {Object} Result object
     */
    async createCompany(companyData, creator) {
        if (!companyData.companyId) {
            throw new Error('[CompanySqlWriter] companyId is required for creation.');
        }

        const now = new Date().toISOString();

        // Map DTO to SQL Columns (Snake Case)
        const payload = {
            company_id: companyData.companyId,
            company_name: companyData.companyName,
            phone: companyData.phone || '',
            address: companyData.address || '',
            city: companyData.county || '', // Mapping: county -> city
            description: companyData.introduction || '', // Mapping: introduction -> description
            
            // Business Fields
            company_type: companyData.companyType || '',
            customer_stage: companyData.customerStage || 'New',
            interaction_rating: companyData.engagementRating || 'C', // Mapping: engagementRating -> interactionRating

            // Audit
            created_by: creator,
            updated_by: creator,
            created_time: now,
            updated_time: now
        };

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                data: {
                    companyId: data.company_id,
                    companyName: data.company_name
                }
            };
        } catch (error) {
            console.error('[CompanySqlWriter] Create Error:', error);
            throw error;
        }
    }

    /**
     * 更新公司
     * @param {string} companyId 公司 ID
     * @param {Object} updateData 更新資料
     * @param {string} modifier 修改者
     */
    async updateCompany(companyId, updateData, modifier) {
        if (!companyId) throw new Error('[CompanySqlWriter] companyId is required for update.');

        const now = new Date().toISOString();
        const payload = {
            updated_by: modifier,
            updated_time: now
        };

        // Map updates (Only include fields that are present)
        if (updateData.companyName !== undefined) payload.company_name = updateData.companyName;
        if (updateData.phone !== undefined) payload.phone = updateData.phone;
        if (updateData.address !== undefined) payload.address = updateData.address;
        if (updateData.county !== undefined) payload.city = updateData.county;
        if (updateData.introduction !== undefined) payload.description = updateData.introduction;
        
        // Business Fields
        if (updateData.companyType !== undefined) payload.company_type = updateData.companyType;
        if (updateData.customerStage !== undefined) payload.customer_stage = updateData.customerStage;
        if (updateData.engagementRating !== undefined) payload.interaction_rating = updateData.engagementRating;

        try {
            const { error } = await supabase
                .from(this.tableName)
                .update(payload)
                .eq('company_id', companyId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('[CompanySqlWriter] Update Error:', error);
            throw error;
        }
    }

    /**
     * 刪除公司
     * @param {string} companyId 公司 ID
     */
    async deleteCompany(companyId) {
        if (!companyId) throw new Error('[CompanySqlWriter] companyId is required for deletion.');

        try {
            const { error } = await supabase
                .from(this.tableName)
                .delete()
                .eq('company_id', companyId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('[CompanySqlWriter] Delete Error:', error);
            throw error;
        }
    }
}

module.exports = CompanySqlWriter;
</file>

<file path="data/company-writer.js">
/**
 * data/company-writer.js
 * 公司寫入器 (Native Implementation)
 * * @version 7.5.0 (Final Fix: Full Field Mapping & Native API)
 * * @date 2026-01-16
 * * @description 
 * * 1. [Fix] 補齊欄位對映：確保 Type(10), Stage(11), Rating(12) 正確寫入。
 * * 2. [Fix] 修復 createCompany 錯誤：改用 Native API (values.append)。
 * * 3. [Strict] 嚴格定義 0-12 欄位索引，防止資料錯位。
 */

const BaseWriter = require('./base-writer');

class CompanyWriter extends BaseWriter {
    /**
     * @param {Object} sheets Google Sheets API Instance
     * @param {string} spreadsheetId Target Spreadsheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
        // Zero Assumption: 禁止注入 Reader，避免循環依賴
    }

    /**
     * 建立新公司
     * @param {Object} companyData 前端傳入的物件 (含 companyName, companyType 等)
     * @param {string} creator 建立者名稱
     */
    async createCompany(companyData, creator) {
        const sheetName = this.config.SHEETS.COMPANY_LIST;
        const now = new Date().toISOString();
        
        // 1. 產生 ID
        const companyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // 2. 準備資料列 (Strict Mapping: Index 0-12)
        // 必須與 0109 規格完全一致，不可省略任何一個 null
        const newRow = [
            companyId,                              // 0: ID
            companyData.companyName || '',          // 1: 公司名稱
            companyData.phone || '',                // 2: 電話
            companyData.address || '',              // 3: 地址
            now,                                    // 4: 建立時間
            now,                                    // 5: 更新時間
            companyData.county || '',               // 6: 縣市
            creator,                                // 7: 建立者
            creator,                                // 8: 最後修改者
            companyData.introduction || '',         // 9: 公司簡介
            companyData.companyType || '',          // 10: 公司類型 (修復斷點)
            companyData.customerStage || 'New',     // 11: 客戶階段 (修復斷點)
            companyData.engagementRating || 'C'     // 12: 互動評級 (修復斷點)
        ];

        console.log(`📝 [CompanyWriter] 正在建立公司: ${companyData.companyName} (Native Append)`);

        try {
            // 3. 執行原生寫入 (Fix: this.appendRow -> sheets.values.append)
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.targetSpreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [newRow]
                }
            });

            return { 
                success: true, 
                data: { 
                    companyId, 
                    companyName: companyData.companyName 
                } 
            };
        } catch (error) {
            console.error('❌ [CompanyWriter] Create Error:', error);
            throw new Error(`建立公司失敗: ${error.message}`);
        }
    }

    /**
     * 更新公司資料 (原子操作：先讀後寫)
     * @param {number} rowIndex 資料行號 (1-based)
     * @param {Object} updateData 更新內容
     * @param {string} modifier 修改者
     */
    async updateCompany(rowIndex, updateData, modifier) {
        const sheetName = this.config.SHEETS.COMPANY_LIST;
        // 擴大讀取範圍至 M 欄 (Index 12)，確保能讀寫到最後一個欄位
        const range = `${sheetName}!A${rowIndex}:M${rowIndex}`;

        try {
            // 1. 先讀取舊資料 (Native Get)
            const getRes = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range: range
            });

            const rows = getRes.data.values;
            if (!rows || rows.length === 0) {
                throw new Error(`Row ${rowIndex} 不存在或無資料`);
            }

            let currentRow = rows[0];
            
            // 確保陣列長度足夠 (補滿至 Index 12)
            while (currentRow.length <= 12) {
                currentRow.push('');
            }

            // 2. 更新欄位 (Strict Mapping)
            // 僅更新 updateData 中存在的欄位，其餘保持原樣
            if (updateData.companyName !== undefined) currentRow[1] = updateData.companyName;
            if (updateData.phone !== undefined) currentRow[2] = updateData.phone;
            if (updateData.address !== undefined) currentRow[3] = updateData.address;
            
            currentRow[5] = new Date().toISOString(); // LastUpdate (Index 5)
            
            if (updateData.county !== undefined) currentRow[6] = updateData.county;
            currentRow[8] = modifier; // Modifier (Index 8)
            
            if (updateData.introduction !== undefined) currentRow[9] = updateData.introduction;
            
            // ★★★ 關鍵修復區域：寫入業務欄位 ★★★
            // 這些欄位必須與前端 HTML form 的 name 屬性完全對應
            if (updateData.companyType !== undefined) currentRow[10] = updateData.companyType;
            if (updateData.customerStage !== undefined) currentRow[11] = updateData.customerStage;
            if (updateData.engagementRating !== undefined) currentRow[12] = updateData.engagementRating;

            // 3. 寫回 Google Sheets (Native Update)
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.targetSpreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [currentRow] }
            });

            console.log(`✅ [CompanyWriter] 公司資料更新成功 (Row: ${rowIndex})`);
            return { success: true };

        } catch (error) {
            console.error(`❌ [CompanyWriter] Update Error (Row ${rowIndex}):`, error);
            throw error;
        }
    }

    /**
     * 刪除公司 (Native Implementation)
     * @param {number} rowIndex 
     */
    async deleteCompany(rowIndex) {
        const sheetName = this.config.SHEETS.COMPANY_LIST;
        
        try {
            // 1. 取得 Sheet ID (使用 BaseWriter 提供的 Helper)
            const sheetId = await this._getSheetIdByName(sheetName);
            
            console.log(`🗑️ [CompanyWriter] 執行原生刪除 Row ${rowIndex} (SheetId: ${sheetId})`);

            // 2. 執行原生 batchUpdate (deleteDimension)
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex - 1, // 0-based index
                                endIndex: rowIndex
                            }
                        }
                    }]
                }
            });
            
            console.log(`✅ [CompanyWriter] 刪除成功 (Row: ${rowIndex})`);
            return { success: true };
        } catch (error) {
            console.error(`❌ [CompanyWriter] Delete Error (Row ${rowIndex}):`, error);
            throw error;
        }
    }
}

module.exports = CompanyWriter;
</file>

<file path="routes/company.routes.js">
// routes/company.routes.js
/**
 * Company Routes
 * * @version 8.0.0 (Phase 8: Switch to ID-based Routes)
 * @date 2026-02-10
 */

const express = require('express');
const router = express.Router();

// 輔助函式
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.companyController) {
        throw new Error('CompanyController 尚未初始化');
    }
    return services.companyController;
};

// 取得 ExternalController (可能尚未重構，維持 require 或從 services 嘗試取得)
// 這裡保留 require 以確保 Phase 5 之前的相容性
const externalController = require('../controllers/external.controller');

// GET /api/companies/
router.get('/', (req, res, next) => {
    getController(req).getCompanies(req, res, next);
});

// POST /api/companies/
router.post('/', (req, res, next) => {
    getController(req).createCompany(req, res, next);
});

// --- AI 路由 (External Controller) ---
// POST /api/companies/:companyId/generate-profile
// [Contract Fix] Changed param to :companyId
router.post('/:companyId/generate-profile', externalController.generateCompanyProfile);

// --- 公司路由 ---

// GET /api/companies/:companyId/details
// [Contract Fix] Changed param to :companyId
router.get('/:companyId/details', (req, res, next) => {
    getController(req).getCompanyDetails(req, res, next);
});

// PUT /api/companies/:companyId
// [Contract Fix] Changed param to :companyId
router.put('/:companyId', (req, res, next) => {
    getController(req).updateCompany(req, res, next);
});

// DELETE /api/companies/:companyId
// [Contract Fix] Changed param to :companyId
router.delete('/:companyId', (req, res, next) => {
    getController(req).deleteCompany(req, res, next);
});

module.exports = router;
</file>

<file path="services/company-service.js">
/**
 * services/company-service.js
 * 公司業務邏輯層
 * @version 8.6.0 (Phase A - Interaction Logging Patch)
 * @date 2026-04-16
 * @changelog 
 * - [PATCH] Added system interaction logging for Create Company (Phase A).
 * - [PATCH PHASE 11] Added graceful DB-First bypass for full interactions/eventLogs tables using _hasNativeActivity.
 * - [PATCH PHASE 10] Added lightweight opportunity counting. Removed frontend dependency on page=0.
 * - [PATCH] Unified interaction logging entry point: replaced interactionWriter with interactionService. No behavior change.
 */

class CompanyService {
    constructor(
        companyReader, companyWriter, contactReader, contactWriter,
        opportunityReader, opportunityWriter, interactionReader, interactionService,
        eventLogReader, systemReader, companySqlReader, contactService,
        companySqlWriter, // Inject SQL Writer (Phase 7 Requirement)
        eventLogSqlReader, // Inject SQL Reader (Phase 8 Requirement)
        contactSqlReader,       // [Phase 8.1 Requirement]
        opportunitySqlReader,   // [Phase 8.1 Requirement]
        interactionSqlReader    // [Phase 8.1 Requirement]
    ) {
        this.companyReader = companyReader;
        this.companyWriter = companyWriter;
        this.contactReader = contactReader;
        this.contactWriter = contactWriter;
        this.opportunityReader = opportunityReader;
        this.opportunityWriter = opportunityWriter;
        this.interactionReader = interactionReader;
        this.interactionService = interactionService;
        this.eventLogReader = eventLogReader;
        this.systemReader = systemReader;
        this.companySqlReader = companySqlReader;
        this.contactService = contactService; // Enabler for RAW logic routing
        this.companySqlWriter = companySqlWriter; 
        this.eventLogSqlReader = eventLogSqlReader; 
        
        // [Phase 8.1] New SQL Readers for fast detail lookup
        this.contactSqlReader = contactSqlReader;
        this.opportunitySqlReader = opportunitySqlReader;
        this.interactionSqlReader = interactionSqlReader;
    }

    // --- DTO Mapping (SQL-ready) ---

    _toServiceDTO(raw) {
        if (!raw) return null;

        return {
            companyId: raw.companyId || raw.company_id || '',
            companyName: raw.companyName || raw.company_name || '',
            phone: raw.phone || '',
            address: raw.address || '',
            county: raw.county || raw.city || '', 
            introduction: raw.introduction || raw.description || '', 
            companyType: raw.companyType || raw.company_type || '',
            customerStage: raw.customerStage || raw.customer_stage || '',
            engagementRating: raw.engagementRating || raw.interactionRating || '', 
            createdTime: raw.createdTime || raw.created_time || '',
            lastUpdateTime: raw.lastUpdateTime || raw.updatedTime || raw.updated_time || '',
            creator: raw.creator || raw.createdBy || raw.created_by || '',
            lastModifier: raw.lastModifier || raw.updatedBy || raw.updated_by || '',
            rowIndex: raw.rowIndex,
            lastActivity: raw.lastActivity || null,
            _hasNativeActivity: raw._hasNativeActivity || false
        };
    }

    async _getAllCompanies() {
        let companies = null;

        if (this.companySqlReader) {
            try {
                const sqlRaw = await this.companySqlReader.getCompanies();
                if (sqlRaw && Array.isArray(sqlRaw) && sqlRaw.length > 0) {
                    companies = sqlRaw.map(item => this._toServiceDTO(item));
                }
            } catch (error) {
                console.warn(`[CompanyService] SQL Read Failed, falling back: ${error.message}`);
            }
        }

        if (!companies) {
            try {
                // Safeguard: use SQL Reader if Legacy Reader is missing from Container
                const sheetRaw = this.companyReader ? await this.companyReader.getCompanyList() : await this.companySqlReader.getCompanies();
                companies = sheetRaw.map(item => this._toServiceDTO(item));
            } catch (sheetError) {
                console.error('[CompanyService] Sheet Read Failed:', sheetError);
                throw sheetError;
            }
        }

        return companies;
    }

    async _getCompanyById(companyId) {
        if (!companyId) return null;
        const companies = await this._getAllCompanies();
        return companies.find(c => c.companyId === companyId) || null;
    }

    async _getCompanyByName(companyName) {
        if (!companyName) return null;
        
        const companies = await this._getAllCompanies();
        const normalizedTarget = this._normalizeCompanyName(companyName);
        
        return companies.find(c => 
            this._normalizeCompanyName(c.companyName) === normalizedTarget
        ) || null;
    }

    _normalizeCompanyName(name) {
        if (!name) return '';
        return name.toLowerCase().trim()
            .replace(/股份有限公司|有限公司|公司/g, '')
            .replace(/\(.*\)/g, '')
            .trim();
    }

    async _logCompanyInteraction(companyId, title, summary, modifier) {
        try {
            if (this.interactionService && typeof this.interactionService.createInteraction === 'function') {
                await this.interactionService.createInteraction({
                    companyId: companyId,
                    eventType: '系統事件',
                    eventTitle: title,
                    contentSummary: summary,
                    recorder: modifier,
                    interactionTime: new Date().toISOString()
                }, { displayName: modifier });
            }
        } catch (logError) {
            console.warn(`[CompanyService] Log Interaction Error: ${logError.message}`);
        }
    }

    async createCompany(companyName, companyData, user) {
        try {
            const modifier = user.displayName || user.username || user || 'System';
            
            const existing = await this._getCompanyByName(companyName);
            if (existing) {
                return { 
                    success: true, 
                    id: existing.companyId, 
                    companyId: existing.companyId, 
                    companyName: existing.companyName, 
                    message: '公司已存在', 
                    existed: true,
                    data: existing
                };
            }

            const companyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            const dataToWrite = { 
                companyId: companyId,
                companyName: companyName, 
                ...companyData 
            };
            
            if (!this.companySqlWriter) throw new Error('CompanySqlWriter not injected');
            
            const result = await this.companySqlWriter.createCompany(dataToWrite, modifier);
            
            // [Phase A Patch] Create Interaction Log for New Company
            if (result && result.success) {
                await this._logCompanyInteraction(
                    companyId,
                    '建立公司',
                    `建立公司：「${companyName}」`,
                    modifier
                );
            }
            
            if (this.companyReader && this.companyReader.invalidateCache) {
                this.companyReader.invalidateCache('companyList');
            }
            
            return {
                ...result,
                companyId: companyId,
                companyName: companyName
            };
        } catch (error) {
            console.error('[CompanyService] Create Error:', error);
            throw error;
        }
    }

    async getCompanyListWithActivity(filters = {}) {
        try {
            let companies = await this._getAllCompanies();

            if (filters.q) {
                const q = filters.q.toLowerCase().trim();
                companies = companies.filter(c => 
                    (c.companyName || '').toLowerCase().includes(q) ||
                    (c.phone || '').includes(q) ||
                    (c.address || '').toLowerCase().includes(q) ||
                    (c.county || '').toLowerCase().includes(q) ||
                    (c.introduction || '').toLowerCase().includes(q)
                );
            }

            if (filters.type && filters.type !== 'all') {
                companies = companies.filter(c => c.companyType === filters.type);
            }
            if (filters.stage && filters.stage !== 'all') {
                companies = companies.filter(c => c.customerStage === filters.stage);
            }
            if (filters.rating && filters.rating !== 'all') {
                companies = companies.filter(c => c.engagementRating === filters.rating);
            }

            // Detect if the reader successfully used the v_companies_summary View
            const hasNativeActivity = companies.length > 0 && companies[0]._hasNativeActivity;

            // [PATCH Phase 11] Condition interactions/event_logs full fetch upon lack of Native Activity
            const [interactions, eventLogs, oppCompanyData] = await Promise.all([
                hasNativeActivity ? Promise.resolve([]) : this.interactionSqlReader.getInteractions(),
                hasNativeActivity ? Promise.resolve([]) : (this.eventLogSqlReader ? this.eventLogSqlReader.getEventLogs() : this.eventLogReader.getEventLogs()),
                this.opportunitySqlReader && typeof this.opportunitySqlReader.getAllOpportunityCompanyNames === 'function' 
                    ? this.opportunitySqlReader.getAllOpportunityCompanyNames() 
                    : Promise.resolve([])
            ]);

            const lastActivityMap = new Map();
            
            if (!hasNativeActivity) {
                const updateActivity = (companyId, dateStr) => {
                    if (!companyId || !dateStr) return;
                    const ts = new Date(dateStr).getTime();
                    if (isNaN(ts)) return;
                    const current = lastActivityMap.get(companyId) || 0;
                    if (ts > current) lastActivityMap.set(companyId, ts);
                };

                interactions.forEach(item => updateActivity(item.companyId, item.interactionTime || item.date));
                eventLogs.forEach(item => updateActivity(item.companyId, item.createdTime));
            }

            // Aggregate Opportunity Counts safely in Node.js memory
            const oppCountMap = new Map();
            (oppCompanyData || []).forEach(row => {
                if (row.customer_company) {
                    const normalized = this._normalizeCompanyName(row.customer_company);
                    oppCountMap.set(normalized, (oppCountMap.get(normalized) || 0) + 1);
                }
            });

            const result = companies.map(comp => {
                let lastTs = null;
                
                if (comp._hasNativeActivity && comp.lastActivity) {
                    lastTs = new Date(comp.lastActivity).getTime();
                } else {
                    lastTs = lastActivityMap.get(comp.companyId);
                    if (!lastTs && comp.createdTime) {
                        const createdTs = new Date(comp.createdTime).getTime();
                        if (!isNaN(createdTs)) lastTs = createdTs;
                    }
                }

                const normalizedCompName = this._normalizeCompanyName(comp.companyName);

                return {
                    ...comp,
                    opportunityCount: oppCountMap.get(normalizedCompName) || 0,
                    lastActivity: lastTs ? new Date(lastTs).toISOString() : null,
                    _sortTs: lastTs || 0
                };
            });

            result.sort((a, b) => b._sortTs - a._sortTs);
            
            // Clean up temporary internal flags before sending to controller/frontend
            return result.map(({ _sortTs, _hasNativeActivity, ...rest }) => rest);

        } catch (error) {
            console.error('[CompanyService] List Error:', error);
            try {
                const sheetRaw = this.companyReader ? await this.companyReader.getCompanyList() : await this.companySqlReader.getCompanies();
                return sheetRaw.map(item => this._toServiceDTO(item));
            } catch (fallbackError) {
                return [];
            }
        }
    }

    async getCompanyDetails(companyId) {
        try {
            const companyInfo = await this._getCompanyById(companyId);

            if (!companyInfo) {
                return { 
                    companyInfo: null, 
                    contacts: [], 
                    opportunities: [], 
                    potentialContacts: [],
                    interactions: [], 
                    eventLogs: [] 
                };
            }

            const companyName = companyInfo.companyName;
            const normalizedTarget = this._normalizeCompanyName(companyName);

            let sqlSuccess = false;
            let contacts = [], opportunities = [], interactions = [], eventLogs = [], potentialContacts = [];

            if (this.contactSqlReader && this.opportunitySqlReader && this.interactionSqlReader && this.eventLogSqlReader) {
                try {
                    const baseNormalized = companyName.replace(/股份有限公司|有限公司|公司/g, '').replace(/\(.*\)/g, '').trim();

                    const [sqlContacts, sqlOppsRaw, sqlInteractionsComp, sqlEventLogs, allPotentialContacts] = await Promise.all([
                        this.contactSqlReader.getContactsByCompanyId(companyId),
                        this.opportunitySqlReader.getOpportunitiesByCompanyName(baseNormalized),
                        this.interactionSqlReader.getInteractionsByCompanyId(companyId),
                        this.eventLogSqlReader.getEventLogs(), 
                        this.contactService.getPotentialContacts(3000) // [PHASE 9.3] Semantic Fix: Explicitly explicitly route to RAW reader logic
                    ]);

                    opportunities = sqlOppsRaw.filter(o => 
                        this._normalizeCompanyName(o.customerCompany) === normalizedTarget
                    );
                    const relatedOppIds = new Set(opportunities.map(o => o.opportunityId));
                    const oppIdsArray = Array.from(relatedOppIds);
                    
                    const sqlInteractionsOpps = await this.interactionSqlReader.getInteractionsByOpportunityIds(oppIdsArray);

                    const interactionMap = new Map();
                    sqlInteractionsComp.forEach(i => interactionMap.set(i.interactionId, i));
                    sqlInteractionsOpps.forEach(i => interactionMap.set(i.interactionId, i));
                    interactions = Array.from(interactionMap.values())
                        .sort((a, b) => new Date(b.interactionTime || 0) - new Date(a.interactionTime || 0));

                    eventLogs = sqlEventLogs.filter(e => 
                        e.companyId === companyId
                    ).sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));

                    contacts = sqlContacts;
                    
                    potentialContacts = allPotentialContacts.filter(pc => 
                        this._normalizeCompanyName(pc.company) === normalizedTarget
                    );

                    sqlSuccess = true;
                } catch (sqlError) {
                    console.warn(`[CompanyService] SQL-first execution failed, triggering fallback: ${sqlError.message}`);
                    sqlSuccess = false;
                }
            }

            if (!sqlSuccess) {
                const [allContacts, allOpportunities, allInteractions, allEventLogs, allPotentialContacts] = await Promise.all([
                    this.contactSqlReader ? this.contactSqlReader.getContacts() : this.contactReader.getContactList(), // Safe generic extraction
                    this.opportunitySqlReader ? this.opportunitySqlReader.getOpportunities() : this.opportunityReader.getOpportunities(),
                    this.interactionSqlReader.getInteractions(),
                    this.eventLogSqlReader ? this.eventLogSqlReader.getEventLogs() : this.eventLogReader.getEventLogs(), 
                    this.contactService.getPotentialContacts(3000) // [PHASE 9.3] Semantic Fix
                ]);

                contacts = allContacts.filter(c => c.companyId === companyId);
                
                opportunities = allOpportunities.filter(o => 
                    this._normalizeCompanyName(o.customerCompany) === normalizedTarget
                );
                const relatedOppIds = new Set(opportunities.map(o => o.opportunityId));
                
                interactions = allInteractions.filter(i => 
                    i.companyId === companyId || (i.opportunityId && relatedOppIds.has(i.opportunityId))
                ).sort((a, b) => new Date(b.interactionTime || 0) - new Date(a.interactionTime || 0));

                eventLogs = allEventLogs.filter(e => 
                    e.companyId === companyId
                ).sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));

                potentialContacts = allPotentialContacts.filter(pc => 
                    this._normalizeCompanyName(pc.company) === normalizedTarget
                );
            }

            return { companyInfo, contacts, opportunities, potentialContacts, interactions, eventLogs };

        } catch (error) {
            console.error(`[CompanyService] Details Error (${companyId}):`, error);
            throw error;
        }
    }

    async updateCompany(companyId, updateData, user) {
        try {
            const modifier = user.displayName || user.username || 'System';
            
            const companyInfo = await this._getCompanyById(companyId);
            if (!companyInfo) throw new Error(`找不到公司 ID: ${companyId}`);

            const result = await this.companySqlWriter.updateCompany(companyInfo.companyId, updateData, modifier);
            
            await this._logCompanyInteraction(companyInfo.companyId, '資料更新', `公司資料已更新。`, modifier);
            
            if (this.companyReader && this.companyReader.invalidateCache) {
                this.companyReader.invalidateCache('companyList');
            }

            return result;
        } catch (error) {
            console.error('[CompanyService] Update Error:', error);
            throw error;
        }
    }

    async deleteCompany(companyId, user) {
        try {
            const companyInfo = await this._getCompanyById(companyId);
            if (!companyInfo) throw new Error(`找不到公司 ID: ${companyId}`);

            const companyName = companyInfo.companyName;
            
            // Safe fallback
            const opps = this.opportunitySqlReader ? await this.opportunitySqlReader.getOpportunities() : await this.opportunityReader.getOpportunities();
            const relatedOpps = opps.filter(o => 
                this._normalizeCompanyName(o.customerCompany) === this._normalizeCompanyName(companyName)
            );
            
            if (relatedOpps.length > 0) {
                throw new Error(`無法刪除：尚有 ${relatedOpps.length} 個關聯機會案件 (例如: ${relatedOpps[0].opportunityName})。請先移除關聯案件。`);
            }

            const result = await this.companySqlWriter.deleteCompany(companyInfo.companyId);
            
            if (this.companyReader && this.companyReader.invalidateCache) {
                this.companyReader.invalidateCache('companyList');
            }

            return result;
        } catch (error) {
            console.error('[CompanyService] Delete Error:', error);
            throw error;
        }
    }
}

module.exports = CompanyService;
</file>

</files>
