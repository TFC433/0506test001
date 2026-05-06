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
- Only files matching these patterns are included: routes/company.routes.js, controllers/company.controller.js, services/company-service.js, data/company-*.js, public/scripts/companies/*.js
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
public/scripts/companies/companies.js
public/scripts/companies/company-details-events.js
public/scripts/companies/company-details-ui.js
public/scripts/companies/company-list.js
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

<file path="public/scripts/companies/companies.js">
/**
 * public/scripts/companies/companies.js
 * 職責：載入公司詳細資料頁的數據，並協調UI渲染與事件綁定模組
 * * @version 7.6.2 (Phase 8: ID Guard & Layout Fix)
 * * @date 2026-02-10
 * * @description 
 * * 1. [Fix] Added null check for companyInfo.
 * * 2. [Layout] Wrapped Event section in dashboard-widget grid-col-12.
 * * 3. [Contract] Enforced ID-based API calls.
 */

/**
 * 載入並渲染公司詳細資料頁面的主函式
 * @param {string} companyId - 公司 ID (UUID)
 */
async function loadCompanyDetailsPage(companyId) {
    const container = document.getElementById('page-company-details');
    // ID 通常不需要解碼，但保留以防萬一
    const safeId = decodeURIComponent(companyId);
    
    // 若找不到專屬容器，嘗試尋找通用容器 (v7.0 相容)
    const targetContainer = container || document.getElementById('page-content') || document.body;

    targetContainer.innerHTML = `<div class="loading show" style="padding-top: 100px;"><div class="spinner"></div><p>正在載入公司資料...</p></div>`;

    try {
        // [Contract Fix] 使用 ID 呼叫 API
        const result = await authedFetch(`/api/companies/${safeId}/details`);
        if (!result.success) throw new Error(result.error || '無法載入公司資料');

        // 從解構賦值中移除 interactions (依照 0109 邏輯)
        const { companyInfo, contacts = [], opportunities = [], potentialContacts = [], eventLogs = [] } = result.data;
        
        // [Guard] 檢查 companyInfo 是否存在
        if (!companyInfo) {
            console.error('[CompanyDetails] companyInfo is null for ID:', safeId);
            targetContainer.innerHTML = `<div class="alert alert-error" style="margin: 20px;">
                <strong>資料錯誤</strong>：找不到 ID 為「${safeId}」的公司資料，可能已被刪除。
            </div>`;
            return;
        }

        // 1. 設定頁面標題
        const titleEl = document.getElementById('page-title');
        const subtitleEl = document.getElementById('page-subtitle');
        if (titleEl) titleEl.textContent = companyInfo.companyName;
        if (subtitleEl) subtitleEl.textContent = '公司詳細資料與關聯活動';

        // 2. 渲染頁面骨架 (垂直瀑布流 - 0109 結構)
        // [UI Fix] 將 Event 區塊包裹在 dashboard-widget grid-col-12 中以對齊 Grid
        targetContainer.innerHTML = `
            ${typeof renderCompanyInfoCard === 'function' ? renderCompanyInfoCard(companyInfo) : '<div class="alert alert-error">UI渲染函式缺失</div>'}

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div id="tab-content-company-events" class="tab-content active"></div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">相關機會案件 (${opportunities.length})</h2></div>
                <div class="widget-content">${typeof renderCompanyOpportunitiesTable === 'function' ? renderCompanyOpportunitiesTable(opportunities) : ''}</div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">已建檔聯絡人 (${contacts.length})</h2></div>
                <div class="widget-content">${typeof renderCompanyContactsTable === 'function' ? renderCompanyContactsTable(contacts) : ''}</div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">潛在聯絡人 (${potentialContacts.length})</h2></div>
                <div id="potential-contacts-container" class="widget-content"></div>
            </div>
        `;
        
        // 3. 初始化並渲染各個模組
        // 若 OpportunityEvents 存在則初始化
        const OE = window.OpportunityEvents || (typeof OpportunityEvents !== 'undefined' ? OpportunityEvents : null);
        if (OE) {
            OE.init(eventLogs, { companyId: companyInfo.companyId, companyName: companyInfo.companyName });
        }
        
        if (window.PotentialContactsManager) {
            PotentialContactsManager.render({
                containerSelector: '#potential-contacts-container',
                potentialContacts: potentialContacts, 
                comparisonList: contacts, 
                comparisonKey: 'name',
                context: 'company'
            });
        }

        // 4. 綁定所有互動事件 (0109 邏輯)
        if (typeof initializeCompanyEventListeners === 'function') {
            initializeCompanyEventListeners(companyInfo);
        }
        
        // 5. 更新下拉選單 (若 CRM_APP 存在)
        if (window.CRM_APP && typeof CRM_APP.updateAllDropdowns === 'function') {
            CRM_APP.updateAllDropdowns();
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('載入公司詳細資料失敗:', error);
            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.textContent = '錯誤';
            targetContainer.innerHTML = `<div class="alert alert-error">載入公司資料失敗: ${error.message}</div>`;
        }
    }
}

// 向主應用程式註冊此模組管理的頁面載入函式 (v7.0 Router 整合)
window.loadCompanyDetailsPage = loadCompanyDetailsPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    // 註冊兩個可能的名稱以防萬一
    window.CRM_APP.pageModules['company-details'] = loadCompanyDetailsPage;
}
</file>

<file path="public/scripts/companies/company-details-events.js">
/**
 * public/scripts/companies/company-details-events.js
 * 職責：處理「公司詳細資料頁」的所有使用者互動事件
 * * @version 7.9.0 (Phase 8: Switch to ID-based Operations)
 * * @description 
 * * 1. [Contract] Save, Delete, Generate AI 改為使用 companyId。
 * * 2. [UX] 支援 ID 基礎的頁面導航與刷新。
 */

let _currentCompanyInfo = null;
let _detailsContainer = null;

// =============================================
// 初始化與事件委派
// =============================================

function initializeCompanyEventListeners(companyInfo) {
    _currentCompanyInfo = companyInfo;
    
    // 尋找主容器 (相容舊版 ID 與新版佈局)
    _detailsContainer = document.getElementById('page-company-details') || document.body;

    // 清除舊監聽並綁定新監聽 (防止重複綁定)
    _detailsContainer.removeEventListener('click', handleCompanyDetailsAction);
    _detailsContainer.removeEventListener('submit', handleCompanyDetailsSubmit);
    
    _detailsContainer.addEventListener('click', handleCompanyDetailsAction);
    _detailsContainer.addEventListener('submit', handleCompanyDetailsSubmit);
    
    // console.log('✅ [CompanyEvents] Events Initialized');
}

function handleCompanyDetailsAction(e) {
    // 尋找最近的帶有 data-action 的按鈕
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const payload = btn.dataset;

    // 防止事件冒泡影響其他元件
    // e.stopPropagation(); 

    switch (action) {
        // --- 編輯與 UI ---
        case 'edit-mode':
            toggleCompanyEditMode(payload.enabled === 'true');
            break;
        case 'generate-profile':
            generateCompanyProfile();
            break;
        
        // --- 刪除操作 ---
        case 'delete-company':
            confirmDeleteCompany();
            break;
        case 'delete-opp': 
            confirmDeleteOppInDetails(payload.rowIndex, payload.name);
            break;
        
        // --- 聯絡人操作 ---
        case 'edit-contact':
            try {
                // 安全解析 JSON
                const contact = JSON.parse(payload.contact);
                showEditContactModal(contact);
            } catch (err) { 
                console.error('解析聯絡人資料失敗', err); 
                if(window.showNotification) showNotification('資料錯誤，無法編輯', 'error');
            }
            break;
        
        // --- 導航 (v7 Router 相容) ---
        case 'navigate':
             e.preventDefault();
             if (window.CRM_APP && payload.page) {
                 const params = payload.params ? JSON.parse(payload.params) : {};
                 if (window.CRM_APP.navigateTo) {
                     window.CRM_APP.navigateTo(payload.page, params);
                 }
             }
             break;
    }
}

function handleCompanyDetailsSubmit(e) {
    // 攔截表單提交，改用 AJAX 處理
    if (e.target.id === 'company-edit-form') {
        saveCompanyInfo(e);
    } else if (e.target.id === 'edit-contact-form') {
        handleSaveContact(e);
    }
}

// =============================================
// 核心邏輯實作
// =============================================

/**
 * 切換 檢視/編輯 模式
 * @param {boolean} isEditing 
 * @param {object|null} aiData - AI 生成的暫存資料
 */
function toggleCompanyEditMode(isEditing, aiData = null) {
    const container = document.getElementById('company-info-card-container');
    if (!container) return;

    // 合併資料 (若有 AI 生成內容)
    let dataToRender = aiData ? { ..._currentCompanyInfo, ...aiData } : _currentCompanyInfo;

    if (typeof renderCompanyInfoCard === 'function') {
        // 重新渲染卡片區域
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderCompanyInfoCard(dataToRender, isEditing);
        container.replaceWith(tempDiv.firstElementChild);
    } else {
        console.error('❌ 找不到 renderCompanyInfoCard 函式');
    }
}

/**
 * 儲存公司資料 (PUT)
 * 使用 skipRefresh: true 以保持在當前頁面並手動更新 DOM
 */
async function saveCompanyInfo(event) {
    event.preventDefault();
    const form = document.getElementById('company-edit-form');
    if (!form) return;

    const formData = new FormData(form);
    const updateData = Object.fromEntries(formData.entries());
    // [Contract Fix] 使用 companyId 更新
    const companyId = _currentCompanyInfo.companyId; 
    
    if (!updateData.companyName || updateData.companyName.trim() === '') {
        if(window.showNotification) showNotification('公司名稱為必填項目', 'warning');
        return;
    }

    // UI Loading State
    const saveBtn = form.querySelector('.btn-save');
    const originalBtnContent = saveBtn ? saveBtn.innerHTML : '💾 儲存';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>儲存中...</span>';
    }

    try {
        // [Contract Fix] skipRefresh: true -> 我們自己處理 UI 更新，不讓 api.js 刷新頁面
        const result = await authedFetch(`/api/companies/${companyId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
            headers: { 'Content-Type': 'application/json' },
            skipRefresh: true 
        });

        if (result.success) {
            // 1. 顯示成功通知 (依賴 company-details-ui.js 修復的容器)
            if(window.showNotification) showNotification('公司資料已更新', 'success');
            else alert('公司資料已更新');
            
            // 2. 更新本地快取
            _currentCompanyInfo = { ..._currentCompanyInfo, ...updateData };

            // 3. 判斷是否改名 (保持 SPA 體驗)
            // 雖然現在用 ID，但為了 URL 美觀，若 Router 支援仍可更新 URL
            if (updateData.companyName !== _currentCompanyInfo.companyName) {
                // do nothing strictly for ID routing unless we want to update displayed URL
            }

            toggleCompanyEditMode(false);

        } else {
            throw new Error(result.error || '儲存失敗');
        }
    } catch (error) {
        console.error('儲存失敗:', error);
        if(window.showNotification) showNotification('儲存失敗: ' + error.message, 'error');
        else alert('儲存失敗: ' + error.message);
    } finally {
        // 還原按鈕狀態
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnContent;
        }
    }
}

/**
 * AI 生成簡介
 */
async function generateCompanyProfile() {
    const input = document.getElementById('company-keywords-input');
    const keywords = input ? input.value : '';
    
    // 暫存當前使用者已輸入的表單資料
    const form = document.getElementById('company-edit-form');
    let currentInputData = {};
    if (form) {
        const currentFormData = new FormData(form);
        currentInputData = Object.fromEntries(currentFormData.entries());
    }

    if(typeof showLoading === 'function') showLoading('AI 正在撰寫簡介並查找資料...');
    
    try {
        // [Contract Fix] 使用 companyId 呼叫
        const companyId = _currentCompanyInfo.companyId;
        
        // [Critical] AI 生成是中間狀態，絕對不能刷新頁面
        const result = await authedFetch(`/api/companies/${companyId}/generate-profile`, {
            method: 'POST',
            body: JSON.stringify({ userKeywords: keywords }),
            skipRefresh: true 
        });

        if (result.success && result.data) {
            // 準備 AI 更新的欄位
            const aiUpdates = {};
            if (result.data.introduction) aiUpdates.introduction = result.data.introduction;
            if (result.data.phone) aiUpdates.phone = result.data.phone;
            if (result.data.address) aiUpdates.address = result.data.address;
            if (result.data.county) aiUpdates.county = result.data.county;

            // 合併：原資料 + 使用者手動輸入 + AI 新生成
            const mergedData = { ..._currentCompanyInfo, ...currentInputData, ...aiUpdates };
            
            // 重新渲染編輯模式並填入資料
            toggleCompanyEditMode(true, mergedData);
            
            if(window.showNotification) showNotification('AI 簡介與聯絡資訊已生成！', 'success');
        } else {
            throw new Error(result.message || '生成失敗');
        }
    } catch (error) {
        if(window.showNotification) showNotification('AI 生成失敗: ' + error.message, 'error');
    } finally {
        if(typeof hideLoading === 'function') hideLoading();
    }
}

/**
 * 刪除公司
 */
async function confirmDeleteCompany() {
    if (!_currentCompanyInfo) return;
    const name = _currentCompanyInfo.companyName;
    const companyId = _currentCompanyInfo.companyId;

    const message = `確定要刪除「${name}」嗎？此操作無法復原。`;
    
    const performDelete = async () => {
        if(typeof showLoading === 'function') showLoading('刪除中...');
        try {
            // [Contract Fix] 使用 companyId 刪除
            const result = await authedFetch(`/api/companies/${companyId}`, { 
                method: 'DELETE',
                skipRefresh: true
            });
            
            if (result.success) {
                if(window.showNotification) showNotification('公司已刪除', 'success');
                
                // 延遲跳轉，讓使用者看到通知
                setTimeout(() => {
                    if (window.router) window.router.push('/companies');
                    else if (window.CRM_APP && window.CRM_APP.navigateTo) window.CRM_APP.navigateTo('companies');
                    else window.location.hash = '#/companies';
                }, 1000);
            } else {
                if(window.showNotification) showNotification('刪除失敗: ' + (result.error || '未知錯誤'), 'error');
            }
        } catch (e) {
            if(window.showNotification) showNotification('刪除請求失敗', 'error');
        } finally {
            if(typeof hideLoading === 'function') hideLoading();
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(message, performDelete);
    } else if (confirm(message)) {
        performDelete();
    }
}

/**
 * 刪除機會案件 (在詳細頁中)
 */
async function confirmDeleteOppInDetails(rowIndex, oppName) {
    if (!rowIndex) return;
    const message = `確定要刪除機會「${oppName || '(未命名)'}」嗎？`;

    const doDelete = async () => {
        if(typeof showLoading === 'function') showLoading('正在刪除機會...');
        try {
            const result = await authedFetch(`/api/opportunities/${rowIndex}`, { 
                method: 'DELETE',
                skipRefresh: true
            });

            if (result.success) {
                if(window.showNotification) showNotification('刪除成功', 'success');
                
                // 刷新頁面以更新列表
                setTimeout(() => {
                    if (window.loadCompanyDetailsPage) {
                        // [Contract Fix] 傳遞 ID
                        window.loadCompanyDetailsPage(_currentCompanyInfo.companyId);
                    } else {
                        window.location.reload();
                    }
                }, 500);
            } else {
                if(window.showNotification) showNotification('刪除失敗: ' + (result.error || '未知錯誤'), 'error');
            }
        } catch (e) {
            if(window.showNotification) showNotification('刪除請求失敗', 'error');
        } finally {
            if(typeof hideLoading === 'function') hideLoading();
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(message, doDelete);
    } else if (confirm(message)) {
        doDelete();
    }
}

// =============================================
// 聯絡人編輯 Modal 相關
// =============================================

function showEditContactModal(contact) {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'edit-contact-modal-container';
    modalContainer.innerHTML = `
        <div id="edit-contact-modal" class="modal" style="display: block; z-index: 3050;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 class="modal-title">編輯聯絡人: ${contact.name}</h2>
                    <button class="close-btn" id="btn-close-contact-modal">&times;</button>
                </div>
                <form id="edit-contact-form">
                    <input type="hidden" id="edit-contact-id" value="${contact.contactId}">
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">部門</label><input type="text" class="form-input" id="edit-contact-department" value="${contact.department || ''}"></div>
                        <div class="form-group"><label class="form-label">職位</label><input type="text" class="form-input" id="edit-contact-position" value="${contact.position || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">手機</label><input type="tel" class="form-input" id="edit-contact-mobile" value="${contact.mobile || ''}"></div>
                        <div class="form-group"><label class="form-label">公司電話</label><input type="tel" class="form-input" id="edit-contact-phone" value="${contact.phone || ''}"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="edit-contact-email" value="${contact.email || ''}"></div>
                    <button type="submit" class="submit-btn">💾 儲存變更</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modalContainer);

    // 綁定關閉按鈕
    document.getElementById('btn-close-contact-modal').addEventListener('click', closeEditContactModal);
}

function closeEditContactModal() {
    const el = document.getElementById('edit-contact-modal-container');
    if (el) el.remove();
}

async function handleSaveContact(e) {
    e.preventDefault();
    const id = document.getElementById('edit-contact-id').value;
    const data = {
        department: document.getElementById('edit-contact-department').value,
        position: document.getElementById('edit-contact-position').value,
        mobile: document.getElementById('edit-contact-mobile').value,
        phone: document.getElementById('edit-contact-phone').value,
        email: document.getElementById('edit-contact-email').value,
    };
    
    if(typeof showLoading === 'function') showLoading('更新中...');
    
    try {
        await authedFetch(`/api/contacts/${id}`, { 
            method: 'PUT', 
            body: JSON.stringify(data),
            skipRefresh: true 
        });
        
        if(window.showNotification) showNotification('聯絡人已更新', 'success');
        closeEditContactModal();
        
        // 重新載入頁面 (聯絡人更新較複雜，建議重整)
        setTimeout(() => {
            if (window.loadCompanyDetailsPage) {
                window.loadCompanyDetailsPage(_currentCompanyInfo.companyId);
            } else {
                window.location.reload();
            }
        }, 500);
    } catch(e) { 
        console.error(e); 
        if(window.showNotification) showNotification('更新失敗', 'error');
    } finally {
        if(typeof hideLoading === 'function') hideLoading();
    }
}

// Export
window.initializeCompanyEventListeners = initializeCompanyEventListeners;
</file>

<file path="public/scripts/companies/company-details-ui.js">
/**
 * public/scripts/companies/company-details-ui.js
 * 職責：渲染「公司詳細資料頁」的所有UI元件
 * * @version 7.8.0 (Final: Restore Container & Styles)
 * * @description 
 * * 1. 自動檢測並修復缺失的 #toast-container。
 * * 2. 注入 Toast CSS 樣式，確保通知可見。
 * * 3. 鎖定表單 name 屬性 (companyType, customerStage) 對接後端 Writer。
 * * 4. 完美還原 0109 Bento Grid 視覺設計。
 */

/**
 * 為新的公司資訊卡片注入專屬樣式 (含 Toast 通知樣式與容器檢查)
 */
function _injectStylesForInfoCard() {
    // --- [Critical Fix] 確保 Toast 容器存在 ---
    // 這一步是讓 ui.js 的 showNotification 能找到家的關鍵
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        // console.log('✅ [UI] Restored missing #toast-container');
    }

    const styleId = 'company-info-card-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* --- 0109 Bento Grid Styles --- */
        .company-info-wrapper { background-color: var(--secondary-bg, #f8fafc); border: 1px solid var(--border-color); border-radius: 24px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .main-section-title { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; margin-left: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .company-bento-grid { display: flex; flex-direction: column; gap: 16px; }
        .header-row { display: flex; gap: 16px; align-items: stretch; }
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .info-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .bento-card { background-color: var(--primary-bg, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; transition: all 0.2s ease-in-out; box-shadow: 0 1px 2px rgba(0,0,0,0.03); position: relative; }
        .bento-card.read-mode:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .bento-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .bento-value { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.4; word-break: break-word; font-family: inherit; }
        .name-card { flex: 1; padding: 24px 32px; justify-content: center; }
        .company-title-text { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2; }
        .bento-card-solid { border: none; color: white; }
        .bento-card-solid .bento-label { color: rgba(255, 255, 255, 0.85); }
        .bento-card-solid .bento-value { font-size: 1.4rem; font-weight: 700; color: white; }
        .bg-royal-blue { background-color: #1d4ed8; }
        .bg-violet { background-color: #7c3aed; }
        .bg-emerald { background-color: #059669; }
        .header-btn-container { flex: 0 0 140px; display: flex; flex-direction: column; gap: 8px; }
        .action-btn-base { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 100%; border-radius: 16px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; border: 1px solid transparent; }
        .btn-edit { background: linear-gradient(135deg, #f97316, #ea580c); border-color: #c2410c; color: white; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3); }
        .btn-edit:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(249, 115, 22, 0.4); }
        .btn-save { background: linear-gradient(135deg, #10b981, #059669); border-color: #047857; color: white; flex: 2; }
        .btn-save:hover { background: linear-gradient(135deg, #34d399, #10b981); }
        .btn-cancel { background: white; border-color: var(--border-color); color: var(--text-secondary); flex: 1; font-size: 0.9rem; }
        .btn-cancel:hover { background: var(--secondary-bg); color: var(--text-primary); }
        .input-title-edit { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); width: 100%; border: none; border-bottom: 2px solid var(--accent-orange); background: transparent; padding: 4px 0; outline: none; transition: border-color 0.2s; }
        .input-title-edit:focus { border-bottom-color: #c2410c; }
        .input-card-edit { width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 12px; font-size: 0.95rem; background-color: var(--secondary-bg); color: var(--text-primary); outline: none; margin-top: 4px; box-sizing: border-box; }
        .input-card-edit:focus { border-color: var(--accent-blue); background-color: white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .bento-card-solid .input-card-edit { background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: white; }
        .bento-card-solid .input-card-edit option { color: black; }
        .bento-card-solid .input-card-edit:focus { background-color: rgba(255, 255, 255, 1); color: var(--text-primary); }
        @media (max-width: 900px) { .header-row { flex-direction: column; } .header-btn-container { width: 100%; flex-direction: row; height: 50px; } .stats-row, .info-row { grid-template-columns: 1fr; } }

        /* --- [CRITICAL FIX] Toast Notification Styles --- */
        /* 確保通知能顯示在最上層，且有正確的視覺樣式 */
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999 !important; /* 強制覆蓋所有 Modal (z-index ~3000) */
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none; /* 讓點擊穿透 */
        }
        .toast {
            min-width: 250px;
            padding: 12px 20px;
            background: #fff;
            color: #333;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            border-left: 4px solid #3b82f6;
            pointer-events: auto; /* 恢復 Toast 可互動性 */
        }
        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        .toast-success { border-left-color: #22c55e; }
        .toast-error { border-left-color: #ef4444; }
        .toast-warning { border-left-color: #f59e0b; }
        .toast-info { border-left-color: #3b82f6; }
    `;
    document.head.appendChild(style);
}

function renderCompanyInfoCard(companyInfo, isEditing = false) {
    _injectStylesForInfoCard(); // 每次渲染時確保樣式與容器存在

    if (!companyInfo) return `<div class="alert alert-warning">找不到公司基本資料</div>`;
    if (companyInfo.isPotential) return _renderPotentialCard();

    if (isEditing) {
        return _renderEditMode(companyInfo);
    } else {
        return _renderViewMode(companyInfo);
    }
}

function _renderPotentialCard() {
    return `
    <div class="company-info-wrapper" id="company-info-card-container">
         <div class="main-section-title">公司基本資料 (潛在)</div>
         <div class="alert alert-info" style="margin:0;">此公司來自潛在客戶名單，尚未建立正式檔案。</div>
    </div>`;
}

function _renderViewMode(info) {
    const type = info.companyType || '-';
    const stage = info.customerStage || '-';
    const rating = info.engagementRating || '-';
    const phone = info.phone || '-';
    const county = info.county || '-';
    const address = info.address || '-';
    const intro = info.introduction || '(尚無公司簡介)';

    return `
        <div class="company-info-wrapper" id="company-info-card-container">
            <div class="main-section-title">公司核心資訊</div>
            
            <div class="company-bento-grid">
                <div class="header-row">
                    <div class="bento-card read-mode name-card">
                        <div class="bento-label">公司名稱</div>
                        <h1 class="company-title-text">${info.companyName}</h1>
                    </div>
                    <div class="header-btn-container">
                        <div class="action-btn-base btn-edit" data-action="edit-mode" data-enabled="true" title="編輯公司資訊">
                            <span>編輯</span>
                            <svg style="width:18px;height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="bento-card bento-card-solid bg-royal-blue read-mode">
                        <div class="bento-label">公司類型</div>
                        <div class="bento-value">${type}</div>
                    </div>
                    <div class="bento-card bento-card-solid bg-violet read-mode">
                        <div class="bento-label">客戶階段</div>
                        <div class="bento-value">${stage}</div>
                    </div>
                    <div class="bento-card bento-card-solid bg-emerald read-mode">
                        <div class="bento-label">互動評級</div>
                        <div class="bento-value">${rating}</div>
                    </div>
                </div>

                <div class="info-row">
                    <div class="bento-card read-mode">
                        <div class="bento-label">電話</div>
                        <div class="bento-value">${phone}</div>
                    </div>
                    <div class="bento-card read-mode">
                        <div class="bento-label">縣市</div>
                        <div class="bento-value">${county}</div>
                    </div>
                    <div class="bento-card read-mode">
                        <div class="bento-label">地址</div>
                        <div class="bento-value">${address}</div>
                    </div>
                </div>

                <div class="bento-card read-mode">
                    <div class="bento-label">業務簡介</div>
                    <div class="bento-value" style="white-space: pre-wrap; font-weight: 500;">${intro}</div>
                </div>
            </div>
        </div>
    `;
}

function _renderEditMode(info) {
    const getOptions = (key, selectedValue) => {
        if (!window.CRM_APP?.systemConfig?.[key]) return '<option value="">無選項</option>';
        return window.CRM_APP.systemConfig[key].map(opt => 
            `<option value="${opt.value}" ${opt.value === selectedValue ? 'selected' : ''}>${opt.note || opt.value}</option>`
        ).join('');
    };

    const cities = ["臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣"];
    const cityOptions = cities.map(c => `<option value="${c}" ${c === info.county ? 'selected' : ''}>${c}</option>`).join('');

    return `
        <div class="company-info-wrapper" id="company-info-card-container" style="border-color: var(--accent-orange); box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);">
            <div class="main-section-title" style="color: var(--accent-orange);">公司資料編輯中...</div>
            
            <form id="company-edit-form" class="company-bento-grid">
                
                <div class="header-row">
                    <div class="bento-card name-card">
                        <div class="bento-label">公司名稱 *</div>
                        <input type="text" name="companyName" class="input-title-edit" value="${info.companyName}" required>
                    </div>
                    
                    <div class="header-btn-container">
                        <button type="submit" class="action-btn-base btn-save" data-action="save-company">
                            <span>💾 儲存</span>
                        </button>
                        <button type="button" class="action-btn-base btn-cancel" data-action="edit-mode" data-enabled="false">
                            <span>取消</span>
                        </button>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="bento-card bento-card-solid bg-royal-blue">
                        <div class="bento-label">公司類型</div>
                        <select name="companyType" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${getOptions('公司類型', info.companyType)}
                        </select>
                    </div>
                    <div class="bento-card bento-card-solid bg-violet">
                        <div class="bento-label">客戶階段</div>
                        <select name="customerStage" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${getOptions('客戶階段', info.customerStage)}
                        </select>
                    </div>
                    <div class="bento-card bento-card-solid bg-emerald">
                        <div class="bento-label">互動評級</div>
                        <select name="engagementRating" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${getOptions('互動評級', info.engagementRating)}
                        </select>
                    </div>
                </div>

                <div class="info-row">
                    <div class="bento-card">
                        <div class="bento-label">電話</div>
                        <input type="text" name="phone" class="input-card-edit" value="${info.phone || ''}">
                    </div>
                    <div class="bento-card">
                        <div class="bento-label">縣市</div>
                        <select name="county" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${cityOptions}
                        </select>
                    </div>
                    <div class="bento-card">
                        <div class="bento-label">地址</div>
                        <input type="text" name="address" class="input-card-edit" value="${info.address || ''}">
                    </div>
                </div>

                <div class="bento-card">
                    <div class="bento-label">業務簡介</div>
                    <textarea name="introduction" class="input-card-edit" rows="5" placeholder="輸入業務簡介...">${info.introduction || ''}</textarea>
                    
                    <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="company-keywords-input" class="input-card-edit" style="margin:0; flex:1;" placeholder="輸入關鍵字由 AI 自動撰寫...">
                        <button type="button" class="action-btn-base btn-edit" style="width: auto; padding: 0 16px; height: 38px; font-size: 0.9rem;" data-action="generate-profile">
                            ✨ AI 生成
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                     <button type="button" class="action-btn danger small" data-action="delete-company">🗑️ 刪除此公司</button>
                </div>

            </form>
        </div>
    `;
}

function renderCompanyContactsTable(contacts) {
    if (!contacts || contacts.length === 0) return '<div class="alert alert-info" style="text-align:center;">該公司尚無已建檔的聯絡人</div>';
    
    let tableHTML = `<table class="data-table"><thead><tr><th>姓名</th><th>職位</th><th>部門</th><th>手機</th><th>公司電話</th><th>Email</th><th>操作</th></tr></thead><tbody>`;
    contacts.forEach(contact => {
        // 安全處理 JSON 字串，避免引號破壞 HTML
        const contactJson = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        tableHTML += `<tr>
            <td data-label="姓名"><strong>${contact.name || '-'}</strong></td>
            <td data-label="職位">${contact.position || '-'}</td>
            <td data-label="部門">${contact.department || '-'}</td>
            <td data-label="手機">${contact.mobile || '-'}</td>
            <td data-label="公司電話">${contact.phone || '-'}</td>
            <td data-label="Email">${contact.email || '-'}</td>
            <td data-label="操作">
                <button class="action-btn small warn" data-action="edit-contact" data-contact='${contactJson}'>✏️ 編輯</button>
            </td>
        </tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

function renderCompanyOpportunitiesTable(opportunities) {
    if (!opportunities || opportunities.length === 0) return '<div class="alert alert-info" style="text-align:center;">該公司尚無相關機會案件</div>';
    
    // 如果有全域渲染函式，優先使用
    if (typeof renderOpportunitiesTable === 'function') return renderOpportunitiesTable(opportunities);
    
    return '<div class="alert alert-warning">表格渲染函式不可用</div>';
}

function renderCompanyInteractionsTab(interactions, companyInfo) {
    // 預留介面，目前不需要回傳內容，避免覆蓋既有邏輯
}

function renderCompanyFullDetails(companyInfo) {
    return ''; // 預留介面
}

// Export functions to global scope
window.renderCompanyInfoCard = renderCompanyInfoCard;
window.renderCompanyContactsTable = renderCompanyContactsTable;
window.renderCompanyOpportunitiesTable = renderCompanyOpportunitiesTable;
</file>

<file path="public/scripts/companies/company-list.js">
/**
 * public/scripts/companies/company-list.js
 * 職責：管理「公司總覽列表頁」
 * * @version 7.7.0 (Phase 10: Backend Opportunity Counting)
 * * @date 2026-04-15
 * * @description 
 * * 1. [PATCH] Removed heavy frontend dependency on /api/opportunities?page=0 payload.
 * * 2. [PATCH] Consumes backend-provided opportunityCount natively.
 * * 3. [Fix] handleCompanyListClick: Navigation payload must use companyId.
 * * 4. [Fix] submitQuickCreateCompany: Navigation after create uses companyId.
 * * 5. [Contract] All operations (delete, navigate) use companyId exclusively.
 * * 6. [Patch] Added dashboardManager.markStale() on successful mutations (create, delete).
 */

// ==================== 全域變數 ====================
let allCompaniesData = [];
let companyListFilters = { type: 'all' };
let currentSort = { field: 'lastActivity', direction: 'desc' };

// ==================== 1. 動態樣式注入 ====================
function _injectCompanyListStyles() {
    if (document.getElementById('company-list-upgraded-styles')) return;

    const style = document.createElement('style');
    style.id = 'company-list-upgraded-styles';
    style.innerHTML = `
        /* Table Styles */
        .comp-list-container { width: 100%; overflow-x: auto; background: var(--card-bg, #fff); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .comp-list-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .comp-list-table th { padding: 12px 16px; text-align: left; background: var(--glass-bg, #f8fafc); color: var(--text-secondary, #64748b); font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid var(--border-color, #e2e8f0); white-space: nowrap; }
        .comp-list-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; font-size: 0.95rem; color: var(--text-main, #334155); }
        .comp-list-table tr:hover { background-color: var(--glass-bg, #f8fafc); }
        
        /* Badges & Chips */
        .comp-type-chip { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; color: white; font-weight: 500; }
        .comp-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: white; }
        .comp-opp-count { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #f3f4f6; color: #1f2937; font-weight: 700; font-size: 0.85rem; }
        
        /* Sortable Header */
        .comp-list-table th.sortable { cursor: pointer; user-select: none; transition: color 0.2s; }
        .comp-list-table th.sortable:hover { color: var(--accent-blue, #2563eb); }
        
        /* Buttons */
        .btn-mini-delete { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; }
        .btn-mini-delete:hover { color: #ef4444; background: #fee2e2; }
        
        /* Links */
        .text-link { color: var(--accent-blue, #2563eb); text-decoration: none; font-weight: 500; }
        .text-link:hover { text-decoration: underline; }

        /* Toast Notification Styles */
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            min-width: 250px;
            padding: 12px 20px;
            background: #fff;
            color: #333;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            border-left: 4px solid #3b82f6;
        }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast-success { border-left-color: #22c55e; }
        .toast-error { border-left-color: #ef4444; }
        .toast-warning { border-left-color: #f59e0b; }
        .toast-info { border-left-color: #3b82f6; }
    `;
    document.head.appendChild(style);
}

// ==================== 2. 核心功能：刪除邏輯 ====================
async function executeDeleteCompany(companyId, companyName) {
    if (!companyId) return;
    const name = companyName || '此公司';
    
    const confirmFunc = window.showConfirmDialog || window.confirmAction || window.confirm;
    
    const doDelete = async () => {
        await performDeleteAPI(companyId);
    };

    if (typeof confirmFunc === 'function' && window.showConfirmDialog) {
        showConfirmDialog(`確定要永久刪除公司「${name}」及其所有關聯資料嗎？`, doDelete);
    } else {
        if (confirm(`(系統提示) 確定要刪除「${name}」嗎？此操作無法復原。`)) {
             doDelete();
        }
    }
}

async function performDeleteAPI(companyId) {
    if (typeof showLoading === 'function') showLoading('正在刪除...');
    
    try {
        const res = await authedFetch(`/api/companies/${companyId}`, { method: 'DELETE' });
        
        const toastFunc = window.showNotification || window.showToast;

        if (res.success) {
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }
            
            if(toastFunc) toastFunc('刪除成功', 'success');
            else alert('刪除成功');
            await loadCompaniesListPage(); 
        } else {
            throw new Error(res.error || '刪除失敗');
        }
    } catch (e) {
        console.error('[Delete Error]', e);
        const toastFunc = window.showNotification || window.showToast;
        if (e.message !== 'Unauthorized') {
            const msg = `刪除失敗: ${e.message}`;
            if(toastFunc) toastFunc(msg, 'error');
            else alert(msg);
        }
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// ==================== 3. 主頁面載入 ====================
async function loadCompaniesListPage() {
    const container = document.getElementById('page-companies');
    if (!container) return;

    _injectCompanyListStyles();

    container.onclick = handleCompanyListClick;
    container.onkeydown = handleCompanyListKeydown;

    container.innerHTML = `
        <div id="company-list-root">
            <div class="dashboard-widget">
                
                <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                    <div style="display: flex; align-items: baseline; gap: 15px;">
                        <h2 class="widget-title" style="margin: 0;">公司總覽</h2>
                    </div>
                    <div id="company-type-tabs" class="companies-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px;">
                        <button class="tab-btn active" data-action="switch-type-tab" data-value="all" style="background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s;">全部</button>
                    </div>
                </div>
                
                <div id="company-action-bar" style="padding: 1.5rem 1.5rem 0.5rem;">
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 1rem; flex-wrap: wrap;">
                        <div style="flex: 1; max-width: 400px;">
                            <input type="text" class="search-box" id="company-list-search" placeholder="搜尋公司名稱..." style="width: 100%;">
                        </div>
                        <button class="action-btn primary" data-action="toggle-quick-create" data-show="true" id="btn-toggle-create" style="font-size: 0.95rem; padding: 8px 18px; flex-shrink: 0; white-space: nowrap; font-weight: 600; display: inline-flex; justify-content: center; align-items: center;">
                            + 快速新增公司
                        </button>
                    </div>

                    <div style="margin-bottom: 0.5rem;display: flex; justify-content: flex-end;">
                        <div id="companies-count-display" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">共 0 筆</div>
                    </div>

                </div>

                <div id="company-quick-create-card" style="display: none; margin: 0 1.5rem 1.5rem; padding: 1.25rem; background-color: var(--secondary-bg); border: 2px solid var(--accent-blue); border-radius: var(--rounded-lg); box-shadow: 0 4px 12px rgba(0,0,0,0.1); animation: slideDown 0.3s ease-out;">
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <div style="font-weight: 700; color: var(--accent-blue); display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;">
                            <span style="font-size: 1.2rem;">🏢</span> 新增公司
                        </div>
                        <input type="text" id="quick-create-name-input" class="form-input" placeholder="請輸入完整公司名稱" style="flex-grow: 1; min-width: 250px; background: var(--primary-bg);">
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="action-btn secondary small" data-action="toggle-quick-create" data-show="false">取消</button>
                            <button class="action-btn primary small" data-action="submit-quick-create">🚀 建立並前往</button>
                        </div>
                    </div>
                </div>

                <div id="companies-list-content" class="widget-content" style="padding: 0;">
                    <div class="loading show"><div class="spinner"></div><p>載入公司列表中...</p></div>
                </div>
            </div>
        </div>
    `;

    try {
        // [PATCH Phase 10] Removed explicit opportunity fetch. opportunityCount is now baked into the /api/companies payload.
        const [listResult, systemConfigResult] = await Promise.all([
            authedFetch(`/api/companies`), 
            authedFetch(`/api/config`) 
        ]);

        if (systemConfigResult) {
            window.CRM_APP = window.CRM_APP || {};
            window.CRM_APP.systemConfig = systemConfigResult;
            
            renderCompanyTypeTabs(systemConfigResult['公司類型'] || []);
        }

        if (listResult.success) {
            // Mapping loop removed. Straight assignment of fully formed backend DTO.
            allCompaniesData = listResult.data || [];
            
            filterAndRenderCompanyList();

            const searchInput = document.getElementById('company-list-search');
            if (searchInput) searchInput.addEventListener('keyup', handleCompanyListSearch);
        } else {
             throw new Error(listResult.error || '無法獲取公司列表');
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            const contentDiv = document.getElementById('companies-list-content');
            if (contentDiv) contentDiv.innerHTML = `<div class="alert alert-error">載入公司列表失敗: ${error.message}</div>`;
        }
    }
}

// ==================== 4. 事件處理與輔助函式 ====================

function handleCompanyListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const payload = btn.dataset;
    e.stopPropagation();

    switch (action) {
        case 'switch-type-tab': 
            companyListFilters.type = payload.value;
            document.querySelectorAll('#company-type-tabs .tab-btn').forEach(tBtn => {
                const isActive = tBtn.dataset.value === companyListFilters.type;
                tBtn.style.background = isActive ? 'white' : 'transparent';
                tBtn.style.fontWeight = isActive ? '600' : '500';
                tBtn.style.color = isActive ? 'var(--accent-blue)' : 'var(--text-muted)';
                tBtn.style.boxShadow = isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
                if (isActive) tBtn.classList.add('active');
                else tBtn.classList.remove('active');
            });
            filterAndRenderCompanyList(); 
            break;
        case 'sort': handleCompanySort(payload.field); break;
        case 'toggle-quick-create': toggleQuickCreateCard(payload.show === 'true'); break;
        case 'submit-quick-create': submitQuickCreateCompany(); break;
        case 'delete-company': executeDeleteCompany(payload.id, payload.name).catch(console.error); break;
        case 'navigate':
            e.preventDefault();
            let params = {};
            if (payload.params) {
                try { params = JSON.parse(payload.params); } catch (err) { }
            }
            
            const targetId = params.companyId || payload.id;
            
            if (window.CRM_APP && window.CRM_APP.navigateTo && targetId) {
                CRM_APP.navigateTo(payload.page, { companyId: targetId });
            } else if (window.router && targetId) {
                window.router.push(`/companies/${encodeURIComponent(targetId)}/details`);
            } else {
                console.error('[Navigation] Missing companyId for company details');
            }
            break;
    }
}

function handleCompanyListKeydown(e) {
    if (e.target.id === 'quick-create-name-input' && e.key === 'Enter') submitQuickCreateCompany();
}

function filterAndRenderCompanyList() {
    const query = document.getElementById('company-list-search')?.value.toLowerCase() || '';
    const { type } = companyListFilters;
    const countDisplay = document.getElementById('companies-count-display');

    let filtered = allCompaniesData.filter(c => {
        const nameMatch = query ? (c.companyName || '').toLowerCase().includes(query) : true;
        const typeMatch = type === 'all' ? true : c.companyType === type;
        return nameMatch && typeMatch;
    });

    filtered.sort((a, b) => {
        let valA = a[currentSort.field];
        let valB = b[currentSort.field];
        const valAStr = String(valA || '');
        const valBStr = String(valB || '');
        
        if (currentSort.field === 'lastActivity') {
             const tA = new Date(valA || 0).getTime();
             const tB = new Date(valB || 0).getTime();
             return currentSort.direction === 'asc' ? tA - tB : tB - tA;
        }
        
        return currentSort.direction === 'asc' 
            ? valAStr.localeCompare(valBStr, 'zh-Hant') 
            : valBStr.localeCompare(valAStr, 'zh-Hant');
    });

    if (countDisplay) countDisplay.innerHTML = `共 ${filtered.length} 筆`;
    const listContent = document.getElementById('companies-list-content');
    if (listContent) listContent.innerHTML = renderCompaniesTable(filtered);
}

function renderCompaniesTable(companies) {
    if (!companies.length) return '<div class="alert alert-info" style="margin:2rem; text-align:center;">找不到符合條件的公司資料</div>';

    const systemConfig = window.CRM_APP?.systemConfig || {};
    const typeColors = new Map((systemConfig['公司類型'] || []).map(t => [t.value, t.color]));
    const stageColors = new Map((systemConfig['客戶階段'] || []).map(t => [t.value, t.color]));
    const ratingColors = new Map((systemConfig['互動評級'] || []).map(t => [t.value, t.color]));

    const renderSortHeader = (field, label) => {
        let icon = '↕';
        if (currentSort.field === field) icon = currentSort.direction === 'asc' ? '↑' : '↓';
        return `<th class="sortable" data-action="sort" data-field="${field}">${label} <span>${icon}</span></th>`;
    };

    let html = `<div class="comp-list-container"><table class="comp-list-table"><thead><tr>
                    <th style="width:60px;text-align:center;">項次</th>
                    ${renderSortHeader('lastActivity', '最後活動')}
                    <th>公司類型</th>
                    ${renderSortHeader('companyName', '公司名稱')}
                    ${renderSortHeader('opportunityCount', '機會數')}
                    <th>客戶階段</th>
                    <th>互動評級</th>
                    <th style="width:80px;text-align:center;">操作</th>
                </tr></thead><tbody>`;

    companies.forEach((c, i) => {
        const typeColor = typeColors.get(c.companyType) || '#9ca3af';
        const stageColor = stageColors.get(c.customerStage) || '#6b7280';
        const ratingColor = ratingColors.get(c.engagementRating) || '#6b7280';
        
        const navParams = JSON.stringify({ 
            companyId: c.companyId
        }).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
        
        const safeName = (c.companyName || '').replace(/"/g, '&quot;');

        html += `
            <tr>
                <td style="text-align:center;color:var(--text-muted);">${i + 1}</td>
                <td style="white-space:nowrap;">${c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '-'}</td>
                <td><span class="comp-type-chip" style="background:${typeColor}">${c.companyType || '未分類'}</span></td>
                <td>
                    <a href="#" class="text-link" data-action="navigate" data-page="company-details" data-params="${navParams}" data-id="${c.companyId}">
                        <strong>${c.companyName || '-'}</strong>
                    </a>
                </td>
                <td style="text-align:center;"><span class="comp-opp-count">${c.opportunityCount || 0}</span></td>
                <td><span class="comp-status-badge" style="background:${stageColor}">${c.customerStage || '-'}</span></td>
                <td><span class="comp-status-badge" style="background:${ratingColor}">${c.engagementRating || '-'}</span></td>
                <td style="text-align:center;">
                    <button class="btn-mini-delete" title="刪除公司" data-action="delete-company" data-id="${c.companyId}" data-name="${safeName}">
                        🗑️
                    </button>
                </td>
            </tr>`;
    });
    return html + '</tbody></table></div>';
}

function toggleQuickCreateCard(show) {
    const card = document.getElementById('company-quick-create-card');
    const input = document.getElementById('quick-create-name-input');
    const btn = document.getElementById('btn-toggle-create');
    if (!card) return;
    if (show) {
        card.style.display = 'block';
        if(btn) btn.style.display = 'none';
        if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
    } else {
        card.style.display = 'none';
        if(btn) btn.style.display = 'flex';
    }
}

async function submitQuickCreateCompany() {
    const input = document.getElementById('quick-create-name-input');
    const name = input?.value.trim();
    const toastFunc = window.showNotification || window.showToast;
    
    if (!name) { 
        if(toastFunc) toastFunc('請輸入公司名稱', 'warning'); 
        else alert('請輸入公司名稱');
        if(input) input.focus(); 
        return; 
    }
    
    if (typeof showLoading === 'function') showLoading('建立中...');
    try {
        const res = await authedFetch('/api/companies', { method: 'POST', body: JSON.stringify({ companyName: name }) });
        if (typeof hideLoading === 'function') hideLoading();
        
        if (res.success) {
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            if(toastFunc) toastFunc('建立成功！', 'success');
            else alert('建立成功！');
            
            toggleQuickCreateCard(false);
            if (window.CRM_APP && window.CRM_APP.navigateTo) {
                CRM_APP.navigateTo('company-details', { 
                    companyId: res.data.companyId 
                });
            } else if (window.router) {
                window.router.push(`/companies/${encodeURIComponent(res.data.companyId)}/details`);
            }
        } else if (res.reason === 'EXISTS') {
            if(confirm(`公司「${name}」已存在，是否直接前往查看？`)) {
                if (window.CRM_APP && window.CRM_APP.navigateTo && res.data.companyId) {
                    CRM_APP.navigateTo('company-details', { 
                        companyId: res.data.companyId 
                    });
                }
            }
        } else { 
            if(toastFunc) toastFunc(res.error || '建立失敗', 'error'); 
            else alert(res.error || '建立失敗');
        }
    } catch (e) { 
        if (typeof hideLoading === 'function') hideLoading();
        if (e.message !== 'Unauthorized') {
            const msg = '建立失敗: ' + e.message;
            if(toastFunc) toastFunc(msg, 'error'); 
            else alert(msg);
        }
    }
}

function renderCompanyTypeTabs(options = []) {
    const tabsContainer = document.getElementById('company-type-tabs');
    if (!tabsContainer) return;
    
    const tabs = [{ value: 'all', label: '全部' }];
    options.forEach(opt => tabs.push({ value: opt.value, label: opt.note || opt.value }));
    
    let html = '';
    tabs.forEach(t => {
        const isActive = companyListFilters.type === t.value;
        const style = isActive 
            ? `background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s;` 
            : `background: transparent; border: none; padding: 8px 16px; font-weight: 500; color: var(--text-muted); border-radius: 6px; box-shadow: none; cursor: pointer; transition: all 0.2s;`;
        
        html += `<button class="tab-btn ${isActive ? 'active' : ''}" data-action="switch-type-tab" data-value="${t.value}" style="${style}">${t.label}</button>`;
    });
    
    tabsContainer.innerHTML = html;
}

function handleCompanyListSearch() { 
    if (typeof handleSearch === 'function') handleSearch(() => filterAndRenderCompanyList()); 
    else filterAndRenderCompanyList();
}
function handleCompanySort(f) { if (currentSort.field === f) { currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc'; } else { currentSort.field = f; currentSort.direction = 'desc'; } filterAndRenderCompanyList(); }

// Router Registration
window.loadCompaniesPage = loadCompaniesListPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules.companies = loadCompaniesListPage;
    console.log('✅ [CompanyList] Module registered');
}
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
