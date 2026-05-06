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
- Only files matching these patterns are included: routes/opportunity.routes.js, controllers/opportunity.controller.js, services/opportunity-service.js, data/opportunity-reader.js, data/opportunity-sql-reader.js, data/base-reader.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/opportunity.controller.js
data/base-reader.js
data/opportunity-reader.js
data/opportunity-sql-reader.js
routes/opportunity.routes.js
services/opportunity-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/opportunity.controller.js">
// controllers/opportunity.controller.js
/**
 * OpportunityController
 * * @version 6.2.0 (Phase 9 - Metadata Decoupling)
 * @date 2026-04-15
 * @description 機會案件控制器，擴展支援獨立的 Metadata API Fetch。
 */

const { handleApiError } = require('../middleware/error.middleware');

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
            const result = await this.workflowService.createOpportunity(req.body, req.user.name);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Opp');
        }
    };

    // PUT /api/opportunities/batch
    batchUpdateOpportunities = async (req, res) => {
        try {
            const result = await this.opportunityService.batchUpdateOpportunities(req.body.updates);
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
                req.user
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
                req.user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Opp');
        }
    };

    // POST /api/opportunities/:opportunityId/contacts
    addContactToOpportunity = async (req, res) => {
        try {
            const result = await this.opportunityService.addContactToOpportunity(
                req.params.opportunityId, 
                req.body, 
                req.user
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
                req.user
            );
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Contact Link');
        }
    };
}

module.exports = OpportunityController;
</file>

<file path="data/base-reader.js">
/**
 * File: data/base-reader.js
 * 資料讀取基底類別
 * @version 5.0.1
 * @date 2026-04-23
 * @purpose Increase cache TTL from 30s to 300s
 * @description 所有資料 Reader 的父類別。
 * 實作了依賴注入 (DI) 機制，強制要求子類別傳入明確的 Spreadsheet ID。
 * 包含快取機制與自動重試邏輯。
 * @changelog
 * - Increased cache TTL from 30s to 300s (minimal diff performance patch).
 */

const config = require('../config');

// 集中管理所有資料的快取狀態
const cache = {
    opportunities: { data: null, timestamp: 0 },
    contacts: { data: null, timestamp: 0 },
    interactions: { data: null, timestamp: 0 },
    eventLogs: { data: null, timestamp: 0 },
    systemConfig: { data: null, timestamp: 0 },
    companyList: { data: null, timestamp: 0 },
    contactList: { data: null, timestamp: 0 },
    users: { data: null, timestamp: 0 },
    weeklyBusiness: { data: null, timestamp: 0 },
    weeklyBusinessSummary: { data: null, timestamp: 0 },
    oppContactLinks: { data: null, timestamp: 0 },
    announcements: { data: null, timestamp: 0 },
    products: { data: null, timestamp: 0 }, // 新增商品快取
    
    _globalLastWrite: { data: Date.now(), timestamp: 0 }
};

const CACHE_DURATION = 300 * 1000; 

/**
 * 所有 Reader 的基礎類別
 * 【Phase 5 暴力重構】：實作 Strict Mode 依賴注入
 */
class BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID。嚴格模式下不可為空。
     * @throws {Error} 若未提供 spreadsheetId 則拋出致命錯誤
     */
    constructor(sheets, spreadsheetId) {
        if (!sheets) throw new Error('BaseReader 初始化失敗: 需要 Sheets API 實例');
        
        // ★★★ Strict Mode Check ★★★
        // 拒絕隱性依賴，強制要求明確的 ID
        if (!spreadsheetId) {
            throw new Error(`[Fatal] BaseReader 初始化失敗: 未提供 Spreadsheet ID。請檢查 Service Container 的注入設定。`);
        }

        this.sheets = sheets;
        this.targetSpreadsheetId = spreadsheetId; // 綁定目標 ID
        this.config = config;
        this.cache = cache;
        this.CACHE_DURATION = CACHE_DURATION;
        
        // 請求去重用的 Promise 儲存區
        this._pendingPromises = {}; 
    }

    invalidateCache(key = null) {
        if (key && this.cache[key]) {
            this.cache[key].timestamp = 0;
            console.log(`✅ [Cache] 快取已失效: ${key}`);
        } else if (key === null) {
            Object.keys(this.cache).forEach(k => {
                if (this.cache[k]) this.cache[k].timestamp = 0;
            });
            console.log('✅ [Cache] 所有快取已失效');
        }
        this.cache._globalLastWrite.data = Date.now();
    }

    /**
     * 核心重試邏輯 (Auto Retry with Backoff)
     * 當遇到 429 (Too Many Requests) 或 5xx (Server Error) 時自動重試
     * @param {Function} apiCallFn - 要執行的 API 呼叫函式
     * @param {number} maxRetries - 最大重試次數 (預設 3 次)
     */
    async _executeWithRetry(apiCallFn, maxRetries = 3) {
        let attempt = 0;
        
        while (true) {
            try {
                return await apiCallFn();
            } catch (error) {
                attempt++;
                
                // 判斷是否為可重試的錯誤
                const isRateLimit = error.code === 429 || 
                                   (error.message && (
                                       error.message.includes('Quota exceeded') || 
                                       error.message.includes('Too Many Requests')
                                   ));
                const isServerError = error.code >= 500 && error.code < 600;

                if ((isRateLimit || isServerError) && attempt <= maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
                    
                    console.warn(`⚠️ [API] 觸發自動重試機制 (${attempt}/${maxRetries}) - 等待 ${Math.round(delay)}ms...`);
                    console.warn(`   原因: ${error.message}`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; 
                }
                
                throw error;
            }
        }
    }

    /**
     * 通用讀取與快取方法
     * @param {string} cacheKey - 快取鍵值
     * @param {string} range - Sheet 範圍 (例如 'Contacts!A:Z')
     * @param {Function} rowParser - 資料解析函式
     * @param {Function} sorter - 排序函式 (選填)
     */
    async _fetchAndCache(cacheKey, range, rowParser, sorter = null) {
        const now = Date.now();

        // 1. 初始化
        if (!this.cache[cacheKey]) {
            this.cache[cacheKey] = { data: null, timestamp: 0 };
        }

        // 2. 讀快取
        if (this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        // 3. 請求合併
        if (this._pendingPromises[cacheKey]) {
            console.log(`⏳ [API] 併發請求合併: ${cacheKey}`);
            return this._pendingPromises[cacheKey];
        }

        console.log(`🔄 [API] 準備讀取: ${cacheKey} (${range}) [ID: ${this.targetSpreadsheetId.substring(0,6)}...]`);

        // 4. 發起請求
        const fetchPromise = (async () => {
            try {
                const response = await this._executeWithRetry(() => 
                    this.sheets.spreadsheets.values.get({
                        // ★★★ 使用注入的 targetSpreadsheetId ★★★
                        spreadsheetId: this.targetSpreadsheetId,
                        range: range,
                    })
                );

                const rows = response.data.values || [];
                let data = [];
                
                if (rows.length > 1) {
                    data = rows.slice(1).map((row, index) => {
                        const parsedRow = rowParser(row, index);
                        if (parsedRow && typeof parsedRow.rowIndex === 'undefined') {
                           parsedRow.rowIndex = index + 2;
                        }
                        return parsedRow;
                    }).filter(item => item !== null && item !== undefined);
                }

                if (sorter) data.sort(sorter);

                this.cache[cacheKey] = { data, timestamp: Date.now() };
                console.log(`[Cache] ${cacheKey} 更新完成 (${data.length} 筆)`);
                return data;

            } catch (error) {
                console.error(`❌ [DataReader] 讀取 ${range} 最終失敗:`, error.message);

                if (error.code === 400 && error.message.includes('Unable to parse range')) {
                     this.cache[cacheKey] = { data: [], timestamp: Date.now() };
                     return [];
                }

                return this.cache[cacheKey].data || [];
            } finally {
                delete this._pendingPromises[cacheKey];
            }
        })();

        this._pendingPromises[cacheKey] = fetchPromise;
        return fetchPromise;
    }

    /**
     * 依據欄位值查找單一列
     */
    async findRowByValue(range, columnIndex, value) {
        try {
            const response = await this._executeWithRetry(() => 
                this.sheets.spreadsheets.values.get({
                    // ★★★ 使用注入的 targetSpreadsheetId ★★★
                    spreadsheetId: this.targetSpreadsheetId,
                    range: range,
                })
            );

            const rows = response.data.values || [];
            if (rows.length > 0 && columnIndex >= rows[0].length) return null;
            
            for (let i = 1; i < rows.length; i++) { 
                if (rows[i] && rows[i][columnIndex] !== undefined && rows[i][columnIndex] !== null) {
                   if (String(rows[i][columnIndex]).toLowerCase() === String(value).toLowerCase()) {
                        return { rowData: rows[i], rowIndex: i + 1 }; 
                   }
                }
            }
            return null;
        } catch (error) {
            console.error(`❌ [DataReader] 查找值失敗:`, error.message);
            if (error.code === 400) return null;
            throw error; 
        }
    }
}

module.exports = BaseReader;
</file>

<file path="data/opportunity-reader.js">
/**
 * data/opportunity-reader.js
 * 專門負責讀取所有與「機會案件」相關資料的類別
 * * @version 6.2.0 (Phase 5-A - Interface Alignment for Sales Analysis)
 * @date 2026-04-21
 * @description 實作 Strict Mode，移除內部 require 與聚合邏輯，並同步 Phase 5-A 之資料集抽取介面。
 */

const BaseReader = require('./base-reader');

class OpportunityReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 內部輔助：建立標題與索引的對照表
     */
    _buildHeaderMap(headerRow) {
        const map = {};
        if (!headerRow || !Array.isArray(headerRow) || headerRow.length === 0) return map;
        
        headerRow.forEach((title, index) => {
            if (title) {
                map[title.trim()] = index;
            }
        });
        return map;
    }

    /**
     * 內部輔助：安全地根據標題獲取值
     */
    _getValue(row, map, fieldName) {
        const index = map[fieldName];
        if (index === undefined || index < 0) return ''; 
        return row[index] || '';
    }

    /**
     * [Phase 5-A] 專供 Sales Analysis 模組使用之基礎過濾資料
     * 確保與 SQL Reader 的介面隔離與對齊，維持依賴注入穩定性。
     */
    async getSalesAnalysisBaseDeals(startDateISO, endDateISO) {
        const allOpportunities = await this.getOpportunities();
        const start = startDateISO ? new Date(startDateISO) : new Date(0);
        const end = endDateISO ? new Date(endDateISO) : new Date();

        return allOpportunities.filter(opp => {
            if (opp.currentStage !== '受注') return false;
            
            const dateStr = opp.expectedCloseDate || opp.lastUpdateTime;
            if (!dateStr) return false;
            
            const dealDate = new Date(dateStr);
            return dealDate >= start && dealDate <= end;
        });
    }

    /**
     * 取得所有機會案件 (核心函式)
     * @returns {Promise<Array<object>>} - 保證回傳陣列
     */
    async getOpportunities() {
        const cacheKey = 'opportunities';
        const range = `${this.config.SHEETS.OPPORTUNITIES}!A:ZZ`;

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId, 
                range: range,
            });

            const rows = response.data.values;
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
                console.warn('[OpportunityReader] Google Sheet 回傳空資料');
                return []; 
            }

            const headerRow = rows[0];
            const headerMap = this._buildHeaderMap(headerRow);
            const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;

            if (headerMap[FIELD_NAMES.ID] === undefined) {
                console.warn(`⚠️ [OpportunityReader] 警告：找不到核心標題 "${FIELD_NAMES.ID}"`);
            }

            const opportunities = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const opp = {
                    rowIndex: i + 1,
                    opportunityId: this._getValue(row, headerMap, FIELD_NAMES.ID),
                    opportunityName: this._getValue(row, headerMap, FIELD_NAMES.NAME),
                    customerCompany: this._getValue(row, headerMap, FIELD_NAMES.CUSTOMER),
                    
                    salesModel: this._getValue(row, headerMap, FIELD_NAMES.SALES_MODEL),
                    
                    channelDetails: this._getValue(row, headerMap, FIELD_NAMES.CHANNEL),
                    salesChannel: this._getValue(row, headerMap, FIELD_NAMES.CHANNEL),

                    channelContact: this._getValue(row, headerMap, FIELD_NAMES.CHANNEL_CONTACT),
                    mainContact: this._getValue(row, headerMap, FIELD_NAMES.CONTACT),
                    assignee: this._getValue(row, headerMap, FIELD_NAMES.ASSIGNEE),
                    opportunityType: this._getValue(row, headerMap, FIELD_NAMES.TYPE),
                    opportunitySource: this._getValue(row, headerMap, FIELD_NAMES.SOURCE),
                    currentStage: this._getValue(row, headerMap, FIELD_NAMES.STAGE),
                    expectedCloseDate: this._getValue(row, headerMap, FIELD_NAMES.CLOSE_DATE),
                    opportunityValue: this._getValue(row, headerMap, FIELD_NAMES.VALUE),
                    opportunityValueType: this._getValue(row, headerMap, FIELD_NAMES.VALUE_TYPE),
                    orderProbability: this._getValue(row, headerMap, FIELD_NAMES.PROBABILITY),
                    
                    potentialSpecification: this._getValue(row, headerMap, FIELD_NAMES.PRODUCT_SPEC),
                    deviceScale: this._getValue(row, headerMap, FIELD_NAMES.DEVICE_SCALE),
                    
                    notes: this._getValue(row, headerMap, FIELD_NAMES.NOTES),
                    driveFolderLink: this._getValue(row, headerMap, FIELD_NAMES.DRIVE_LINK),
                    currentStatus: this._getValue(row, headerMap, FIELD_NAMES.STATUS),
                    
                    stageHistory: this._getValue(row, headerMap, FIELD_NAMES.HISTORY),
                    
                    createdTime: this._getValue(row, headerMap, FIELD_NAMES.CREATED_TIME),
                    lastUpdateTime: this._getValue(row, headerMap, FIELD_NAMES.LAST_UPDATE_TIME),
                    lastModifier: this._getValue(row, headerMap, FIELD_NAMES.LAST_MODIFIER),
                    
                    parentOpportunityId: this._getValue(row, headerMap, FIELD_NAMES.PARENT_ID)
                };
                
                if (opp.currentStatus !== this.config.CONSTANTS.OPPORTUNITY_STATUS.ARCHIVED) {
                    opportunities.push(opp);
                }
            }

            opportunities.sort((a, b) => {
                const timeA = a.lastUpdateTime || a.createdTime;
                const timeB = b.lastUpdateTime || b.createdTime;
                return new Date(timeB) - new Date(timeA);
            });

            if (this.cache) {
                this.cache[cacheKey] = opportunities;
            }

            return opportunities;

        } catch (error) {
            console.error('❌ [OpportunityReader] 讀取失敗:', error);
            return []; 
        }
    }

    async searchOpportunities(query, page = 1, filters = {}, sortOptions = null) {
        let opportunities = await this.getOpportunities();
        if (!Array.isArray(opportunities)) opportunities = [];

        if (query) {
            const searchTerm = query.toLowerCase();
            opportunities = opportunities.filter(o => {
                if (searchTerm.startsWith('opp') && o.opportunityId && o.opportunityId.toLowerCase() === searchTerm) {
                    return true;
                }
                return (o.opportunityName && o.opportunityName.toLowerCase().includes(searchTerm)) ||
                       (o.customerCompany && o.customerCompany.toLowerCase().includes(searchTerm));
            });
        }

        if (filters.assignee) opportunities = opportunities.filter(o => o.assignee === filters.assignee);
        if (filters.type) opportunities = opportunities.filter(o => o.opportunityType === filters.type);
        if (filters.stage) opportunities = opportunities.filter(o => o.currentStage === filters.stage);
        
        if (sortOptions && sortOptions.field) {
            const field = sortOptions.field;
            const dir = sortOptions.direction === 'asc' ? 1 : -1;
            
            opportunities.sort((a, b) => {
                let valA, valB;
                if (field === 'lastUpdateTime') {
                    valA = new Date(a.lastUpdateTime || a.createdTime).getTime();
                    valB = new Date(b.lastUpdateTime || b.createdTime).getTime();
                } else {
                    valA = a[field];
                    valB = b[field];
                }
                
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                return 0;
            });
        }

        if (!page || page <= 0) {
            return opportunities;
        }

        const pageSize = this.config.PAGINATION.OPPORTUNITIES_PER_PAGE;
        const startIndex = (page - 1) * pageSize;
        const paginated = opportunities.slice(startIndex, startIndex + pageSize);
        return {
            data: paginated,
            pagination: { 
                current: page, 
                total: Math.ceil(opportunities.length / pageSize), 
                totalItems: opportunities.length, 
                hasNext: (startIndex + pageSize) < opportunities.length, 
                hasPrev: page > 1 
            }
        };
    }
}

module.exports = OpportunityReader;
</file>

<file path="data/opportunity-sql-reader.js">
/**
 * data/opportunity-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: opportunities
 * - Version: 2.4.0 (Phase 5-A - Base Dataset SQL Pushdown for Sales Analysis)
 * - Date: 2026-04-21
 * - Changelog: 
 * - [PHASE 5-A] Added getSalesAnalysisBaseDeals() to push stage filtering to DB, reducing JS memory footprint.
 * - [PHASE 10] Added getAllOpportunityCompanyNames() for lightweight cross-module counting without FKs.
 * - [PHASE 9-D] Fixed post-pagination JS filtering. Migrated probability to native SQL.
 */

const { supabase } = require('../config/supabase');

class OpportunitySqlReader {

    constructor() {
        this.tableName = 'opportunities';
        this.viewName = 'v_opportunities_summary'; 
    }

    /**
     * [Phase 5-A] 專供 Sales Analysis 模組使用之基礎過濾資料
     * @description 將 stage 條件下推至 SQL 減少傳輸負載，並在 Node 端嚴格套用業務時間過濾規則。
     */
    async getSalesAnalysisBaseDeals(startDateISO, endDateISO) {
        try {
            // Push base filter (stage) to SQL directly to cut payload significantly
            const { data, error } = await supabase.from(this.viewName).select('*')
                .eq('current_stage', '受注');

            if (error) {
                // Fallback to table if view is missing
                if (error.code !== '42P01') throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
                const fallbackRes = await supabase.from(this.tableName).select('*').eq('current_stage', '受注');
                if (fallbackRes.error) throw new Error(`[OpportunitySqlReader] DB Error: ${fallbackRes.error.message}`);
                return this._applySalesAnalysisTimeFilter(fallbackRes.data, startDateISO, endDateISO);
            }

            return this._applySalesAnalysisTimeFilter(data, startDateISO, endDateISO);
        } catch (error) {
            console.error('[OpportunitySqlReader] getSalesAnalysisBaseDeals Error:', error);
            throw error;
        }
    }

    _applySalesAnalysisTimeFilter(data, startDateISO, endDateISO) {
        const start = startDateISO ? new Date(startDateISO) : new Date(0);
        const end = endDateISO ? new Date(endDateISO) : new Date();

        const filtered = (data || []).filter(row => {
            const dateStr = row.expected_close_date || row.updated_time;
            if (!dateStr) return false;
            const dealDate = new Date(dateStr);
            return dealDate >= start && dealDate <= end;
        });

        return filtered.map(row => this._mapRowToDto(row));
    }

    async getOpportunityYears() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('created_time');

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);

            const yearSet = new Set();
            (data || []).forEach(row => {
                if (row.created_time) {
                    const year = new Date(row.created_time).getFullYear();
                    if (!isNaN(year)) yearSet.add(year);
                }
            });

            return Array.from(yearSet).sort((a, b) => b - a);
        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunityYears Error:', error);
            throw error;
        }
    }

    async getAllOpportunityCompanyNames() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('customer_company');

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            return data || [];
        } catch (error) {
            console.error('[OpportunitySqlReader] getAllOpportunityCompanyNames Error:', error);
            throw error;
        }
    }

    async getOpportunityStats(startOfMonth) {
        if (!startOfMonth) throw new Error('OpportunitySqlReader: startOfMonth is required');

        try {
            const startIso = startOfMonth.toISOString();

            const [totalRes, monthRes] = await Promise.all([
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }),
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_time', startIso)
            ]);

            if (totalRes.error) throw new Error(`[OpportunitySqlReader] DB Error (total): ${totalRes.error.message}`);
            if (monthRes.error) throw new Error(`[OpportunitySqlReader] DB Error (month): ${monthRes.error.message}`);

            return {
                total: totalRes.count || 0,
                month: monthRes.count || 0
            };
        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunityStats Error:', error);
            throw error;
        }
    }

    async getOpportunityById(opportunityId) {
        if (!opportunityId) throw new Error('OpportunitySqlReader: opportunityId is required');

        try {
            const viewRes = await supabase.from(this.viewName).select('*').eq('opportunity_id', opportunityId).single();
            if (!viewRes.error && viewRes.data) {
                return this._mapRowToDto(viewRes.data);
            }

            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('opportunity_id', opportunityId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;
            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunityById Error:', error);
            throw error;
        }
    }

    async getOpportunitiesByParentId(parentId) {
        if (!parentId) throw new Error('OpportunitySqlReader: parentId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('parent_opportunity_id', parentId);

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunitiesByParentId Error:', error);
            throw error;
        }
    }

    async getOpportunitiesByCompanyName(companyName) {
        if (!companyName) throw new Error('OpportunitySqlReader: companyName is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .ilike('customer_company', `%${companyName}%`);

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunitiesByCompanyName Error:', error);
            throw error;
        }
    }

    async getOpportunities() {
        try {
            const viewRes = await supabase.from(this.viewName).select('*');
            if (!viewRes.error && viewRes.data) {
                return viewRes.data.map(row => this._mapRowToDto(row));
            }

            const oppsPromise = supabase.from(this.tableName).select('*');
            const intsPromise = supabase.from('interactions').select('opportunity_id, interaction_time, created_time');

            const [oppsRes, intsRes] = await Promise.all([oppsPromise, intsPromise]);

            if (oppsRes.error) throw new Error(`[OpportunitySqlReader] DB Error: ${oppsRes.error.message}`);

            const latestIntMap = new Map();
            let interactionsFailed = false;

            if (intsRes.error) {
                console.warn('[OpportunitySqlReader] Degrade Mode Active: Interactions subquery failed.', intsRes.error.message);
                interactionsFailed = true;
            } else if (intsRes.data) {
                intsRes.data.forEach(int => {
                    const id = int.opportunity_id;
                    const time = new Date(int.interaction_time || int.created_time).getTime();
                    if (time && (!latestIntMap.has(id) || time > latestIntMap.get(id))) {
                        latestIntMap.set(id, time);
                    }
                });
            }

            return oppsRes.data.map(row => {
                const dto = this._mapRowToDto(row);
                if (!interactionsFailed) {
                    const lastInt = latestIntMap.get(dto.opportunityId) || 0;
                    if (lastInt > dto.effectiveLastActivity) {
                        dto.effectiveLastActivity = lastInt;
                    }
                }
                return dto;
            });

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunities Error:', error);
            throw error;
        }
    }

    async searchOpportunitiesTable({ q, filters = {}, sortField, sortDirection, limit, offset }) {
        try {
            try {
                let dbQuery = supabase.from(this.viewName).select('*', { count: 'exact' });
                
                if (filters.type && filters.type !== 'all') dbQuery = dbQuery.eq('opportunity_type', filters.type);
                if (filters.source && filters.source !== 'all') dbQuery = dbQuery.eq('source', filters.source);
                if (filters.stage && filters.stage !== 'all') dbQuery = dbQuery.eq('current_stage', filters.stage);
                if (filters.channel && filters.channel !== 'all') dbQuery = dbQuery.eq('sales_channel', filters.channel);
                if (filters.scale && filters.scale !== 'all') dbQuery = dbQuery.eq('equipment_scale', filters.scale);
                
                if (filters.status && filters.status !== 'all') {
                    dbQuery = dbQuery.eq('current_status', filters.status);
                } else {
                    dbQuery = dbQuery.neq('current_status', '已封存');
                }
                
                if (filters.year && filters.year !== 'all') {
                    const y = parseInt(filters.year);
                    dbQuery = dbQuery.gte('created_time', `${y}-01-01T00:00:00Z`).lt('created_time', `${y + 1}-01-01T00:00:00Z`);
                }

                if (filters.probability && filters.probability !== 'all') {
                    dbQuery = dbQuery.gte('win_probability', Number(filters.probability));
                }

                if (q) {
                    dbQuery = dbQuery.or(`opportunity_name.ilike.%${q}%,customer_company.ilike.%${q}%`);
                }

                if (filters.time && filters.time !== 'all') {
                    const timeMap = { '7': 7, '30': 30, '90': 90 };
                    const days = timeMap[filters.time];
                    if (days) {
                        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                        dbQuery = dbQuery.gte('effective_last_activity', threshold);
                    }
                }

                const sortMap = {
                    effectiveLastActivity: 'effective_last_activity',
                    opportunityName: 'opportunity_name',
                    customerCompany: 'customer_company',
                    opportunityValue: 'opportunity_value',
                    createdTime: 'created_time',
                    lastUpdateTime: 'updated_time',
                    opportunityType: 'opportunity_type',
                    opportunitySource: 'source',
                    assignee: 'owner',
                    mainContact: 'main_contact',
                    salesModel: 'sales_model',
                    salesChannel: 'sales_channel',
                    currentStage: 'current_stage',
                    currentStatus: 'current_status',
                    expectedCloseDate: 'expected_close_date',
                    deviceScale: 'equipment_scale'
                };

                const dbColumn = sortMap[sortField] || 'effective_last_activity';
                
                dbQuery = dbQuery.order(dbColumn, { ascending: sortDirection === 'asc', nullsFirst: false });

                const requiresJsPostFilter = filters.potentialSpecification && filters.potentialSpecification !== 'all';

                if (!requiresJsPostFilter && limit && limit > 0) {
                    dbQuery = dbQuery.range(offset, offset + limit - 1);
                }

                const { data: viewData, count: viewCount, error: viewError } = await dbQuery;

                if (!viewError) {
                    let results = (viewData || []).map(row => this._mapRowToDto(row));
                    
                    if (requiresJsPostFilter) {
                        const val = filters.potentialSpecification;
                        results = results.filter(opp => {
                            const specData = opp.potentialSpecification;
                            if (!specData) return false;
                            try {
                                const parsedJson = JSON.parse(specData);
                                return typeof parsedJson === 'object' && parsedJson[val] > 0;
                            } catch (e) {
                                return typeof specData === 'string' && specData.includes(val);
                            }
                        });

                        const total = results.length;
                        if (limit && limit > 0) {
                            results = results.slice(offset, offset + limit);
                        }
                        return { data: results, total };
                    }

                    return { data: results, total: viewCount || results.length };
                }

                if (viewError && viewError.code !== '42P01') {
                    throw viewError; 
                }
            } catch (err) {
                if (err.code !== '42P01') {
                    console.error('[OpportunitySqlReader] View query failed:', err);
                }
            }

            console.warn('[OpportunitySqlReader] View v_opportunities_summary not found. Falling back to JS aggregation.');

            const isNativeSort = sortField && sortField !== 'effectiveLastActivity';
            
            const hasJsFilters = 
                (filters.time && filters.time !== 'all') ||
                (filters.potentialSpecification && filters.potentialSpecification !== 'all');

            const useFastPath = isNativeSort && !hasJsFilters;

            let query = useFastPath 
                ? supabase.from(this.tableName).select('*', { count: 'exact' })
                : supabase.from(this.tableName).select('*');

            if (filters.type && filters.type !== 'all') query = query.eq('opportunity_type', filters.type);
            if (filters.source && filters.source !== 'all') query = query.eq('source', filters.source);
            if (filters.stage && filters.stage !== 'all') query = query.eq('current_stage', filters.stage);
            if (filters.channel && filters.channel !== 'all') query = query.eq('sales_channel', filters.channel);
            if (filters.scale && filters.scale !== 'all') query = query.eq('equipment_scale', filters.scale);
            
            if (filters.probability && filters.probability !== 'all') {
                query = query.gte('win_probability', Number(filters.probability));
            }

            if (filters.status && filters.status !== 'all') {
                query = query.eq('current_status', filters.status);
            } else {
                query = query.neq('current_status', '已封存');
            }
            
            if (filters.year && filters.year !== 'all') {
                const y = parseInt(filters.year);
                query = query.gte('created_time', `${y}-01-01T00:00:00Z`).lt('created_time', `${y + 1}-01-01T00:00:00Z`);
            }

            if (q) {
                query = query.or(`opportunity_name.ilike.%${q}%,customer_company.ilike.%${q}%`);
            }

            if (useFastPath) {
                const sortMap = {
                    opportunityName: 'opportunity_name',
                    customerCompany: 'customer_company',
                    opportunityValue: 'opportunity_value',
                    createdTime: 'created_time',
                    lastUpdateTime: 'updated_time',
                    opportunityType: 'opportunity_type',
                    opportunitySource: 'source',
                    assignee: 'owner',
                    mainContact: 'main_contact',
                    salesModel: 'sales_model',
                    salesChannel: 'sales_channel',
                    currentStage: 'current_stage',
                    currentStatus: 'current_status',
                    expectedCloseDate: 'expected_close_date',
                    deviceScale: 'equipment_scale'
                };

                const dbColumn = sortMap[sortField] || 'updated_time';
                
                query = query.order(dbColumn, { ascending: sortDirection === 'asc', nullsFirst: false });

                if (limit && limit > 0) {
                    query = query.range(offset, offset + limit - 1);
                }

                const { data, count, error } = await query;
                if (error) throw new Error(`[OpportunitySqlReader] DB Error (Fast-Path): ${error.message}`);

                return { 
                    data: (data || []).map(row => this._mapRowToDto(row)), 
                    total: count || 0 
                };
            }

            const oppsRes = await query;
            if (oppsRes.error) throw new Error(`[OpportunitySqlReader] DB Error: ${oppsRes.error.message}`);
            
            const oppIds = oppsRes.data.map(o => o.opportunity_id);
            let latestIntMap = new Map();
            
            if (oppIds.length > 0) {
                const intsRes = await supabase.from('interactions')
                    .select('opportunity_id, interaction_time, created_time')
                    .in('opportunity_id', oppIds);
                    
                if (!intsRes.error && intsRes.data) {
                    intsRes.data.forEach(int => {
                        const id = int.opportunity_id;
                        const time = new Date(int.interaction_time || int.created_time).getTime();
                        if (time && (!latestIntMap.has(id) || time > latestIntMap.get(id))) {
                            latestIntMap.set(id, time);
                        }
                    });
                }
            }

            let results = oppsRes.data.map(row => {
                const dto = this._mapRowToDto(row);
                const lastInt = latestIntMap.get(dto.opportunityId) || 0;
                if (lastInt > dto.effectiveLastActivity) {
                    dto.effectiveLastActivity = lastInt;
                }
                return dto;
            });

            if (filters.potentialSpecification && filters.potentialSpecification !== 'all') {
                const val = filters.potentialSpecification;
                results = results.filter(opp => {
                    const specData = opp.potentialSpecification;
                    if (!specData) return false;
                    try {
                        const parsedJson = JSON.parse(specData);
                        return typeof parsedJson === 'object' && parsedJson[val] > 0;
                    } catch (e) {
                        return typeof specData === 'string' && specData.includes(val);
                    }
                });
            }
            
            if (filters.time && filters.time !== 'all') {
                const timeMap = { '7': 7, '30': 30, '90': 90 };
                const days = timeMap[filters.time];
                if (days) {
                    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
                    results = results.filter(opp => opp.effectiveLastActivity >= threshold);
                }
            }

            if (sortField) {
                 results.sort((a, b) => {
                     let valA = a[sortField];
                     let valB = b[sortField];
                     if (valA === undefined || valA === null) valA = '';
                     if (valB === undefined || valB === null) valB = '';
                     
                     if (typeof valA === 'number' && typeof valB === 'number') {
                         return sortDirection === 'asc' ? valA - valB : valB - valA;
                     }
                     return sortDirection === 'asc' 
                         ? String(valA).localeCompare(String(valB), 'zh-Hant') 
                         : String(valB).localeCompare(String(valA), 'zh-Hant');
                 });
            } else {
                 results.sort((a, b) => b.effectiveLastActivity - a.effectiveLastActivity);
            }

            const total = results.length;
            if (limit && limit > 0) {
                results = results.slice(offset, offset + limit);
            }

            return { data: results, total };

        } catch (error) {
            console.error('[OpportunitySqlReader] searchOpportunitiesTable Error:', error);
            throw error;
        }
    }

    _mapRowToDto(row) {
        if (!row) return null;

        const dto = {
            opportunityId: row.opportunity_id,
            parentOpportunityId: row.parent_opportunity_id,
            opportunityName: row.opportunity_name,
            opportunityType: row.opportunity_type,
            opportunitySource: row.source, 
            assignee: row.owner, 
            customerCompany: row.customer_company,
            mainContact: row.main_contact,
            endCustomerContact: row.end_customer_contact,
            channelContact: row.channel_contact,
            salesModel: row.sales_model,
            salesChannel: row.sales_channel,
            channelDetails: row.sales_channel, 
            currentStage: row.current_stage,
            currentStatus: row.current_status,
            expectedCloseDate: row.expected_close_date,
            orderProbability: row.win_probability, 
            opportunityValue: row.opportunity_value,
            valueCalcMode: row.value_calc_mode,
            opportunityValueType: row.value_calc_mode, 
            deviceScale: row.equipment_scale, 
            potentialSpecification: row.product_details, 
            notes: row.notes,
            driveFolderLink: row.drive_link, 
            stageHistory: row.stage_history,
            createdTime: row.created_time,
            lastUpdateTime: row.updated_time, 
            updatedBy: row.updated_by
        };

        if (row.effective_last_activity) {
            dto.effectiveLastActivity = new Date(row.effective_last_activity).getTime();
        } else {
            dto.effectiveLastActivity = new Date(dto.lastUpdateTime || dto.createdTime || 0).getTime();
        }

        return dto;
    }
}

module.exports = OpportunitySqlReader;
</file>

<file path="routes/opportunity.routes.js">
// routes/opportunity.routes.js
/**
 * Opportunity Routes
 * * @version 6.1.0 (Phase 9 - Metadata Decoupling)
 * @date 2026-04-15
 */

const express = require('express');
const router = express.Router();

// 輔助函式
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.opportunityController) {
        throw new Error('OpportunityController 尚未初始化');
    }
    return services.opportunityController;
};

// GET /api/opportunities/dashboard
router.get('/dashboard', (req, res, next) => {
    getController(req).getDashboardData(req, res, next);
});

// GET /api/opportunities/by-county
router.get('/by-county', (req, res, next) => {
    getController(req).getOpportunitiesByCounty(req, res, next);
});

// GET /api/opportunities/metadata/years
router.get('/metadata/years', (req, res, next) => {
    getController(req).getOpportunityYears(req, res, next);
});

// GET /api/opportunities/
router.get('/', (req, res, next) => {
    getController(req).searchOpportunities(req, res, next);
});

// GET /api/opportunities/:opportunityId/details
router.get('/:opportunityId/details', (req, res, next) => {
    getController(req).getOpportunityDetails(req, res, next);
});

// POST /api/opportunities/
router.post('/', (req, res, next) => {
    getController(req).createOpportunity(req, res, next);
});

// PUT /api/opportunities/batch
router.put('/batch', (req, res, next) => {
    getController(req).batchUpdateOpportunities(req, res, next);
});

// PUT /api/opportunities/:opportunityId
router.put('/:opportunityId', (req, res, next) => {
    getController(req).updateOpportunity(req, res, next);
});

// DELETE /api/opportunities/:opportunityId
router.delete('/:opportunityId', (req, res, next) => {
    getController(req).deleteOpportunity(req, res, next);
});

// POST /api/opportunities/:opportunityId/contacts
router.post('/:opportunityId/contacts', (req, res, next) => {
    getController(req).addContactToOpportunity(req, res, next);
});

// DELETE /api/opportunities/:opportunityId/contacts/:contactId
router.delete('/:opportunityId/contacts/:contactId', (req, res, next) => {
    getController(req).deleteContactLink(req, res, next);
});

module.exports = router;
</file>

<file path="services/opportunity-service.js">
// ============================================================================
// File: services/opportunity-service.js
// ============================================================================
/**
 * services/opportunity-service.js
 * 機會案件業務邏輯層 (Service Layer)
 * @version 8.12.2 (Phase A - Identity & Empty Contact Patch)
 * @date 2026-04-17
 * @description 
 * - [PATCH] Prevent empty/whitespace contact creation during scaffolding.
 * - [PATCH] Fixed modifier extraction to correctly resolve string identities and req.user.name for create and modify flows.
 * - [PATCH] Added system interaction logging for Create Opportunity (Phase A).
 * - [PATCH] Unified interaction logging entry point: replaced direct interactionWriter calls with interactionService. No behavior change.
 * - [PHASE 8.14] Refactored addContactToOpportunity to pure SQL. Removed legacy RAW sheet writers (getOrCreateCompany, getOrCreateContact, updateContactStatus). Reused existing SQL contacts by name and companyId.
 * - [PHASE 8.13] Implemented SQL-only scaffolding for company and contact within createOpportunity. Injected contactSqlWriter.
 * - [PHASE 8.13] Added strict null-safe check for contact name matching during scaffold.
 * - [PHASE 8.12] Migrated systemReader.getSystemConfig to systemService.
 * - [PHASE 8.11] Overhauled searchOpportunities to delegate native filters to OpportunitySqlReader.
 * - [PHASE 8.8] Removed direct Supabase calls and inline SqlReader instantiations. Fully migrated to injected ContactSqlReader.
 * - [PHASE 8.7] Removed ContactReader from getOpportunityDetails and deleteContactLink. Fully replaced with Supabase SQL joins.
 * - [PHASE 8.6C] Removed full-table Opportunity and EventLog fetches in getOpportunityDetails, utilizing scoped SQL reader methods.
 * - [PHASE 8.6B] Migrated interactions read in getOpportunityDetails to scoped InteractionSqlReader.
 * - [PHASE 8.5] Removed dead dependency OpportunityReader.
 * - [PHASE 8.5] Replaced companyReader with companySqlReader in deleteOpportunity.
 * - [FIX-1] Locked _fetchOpportunities to SQL Reader only (No Sheet fallback).
 * - [FIX-2] Enforced hard contract on batchUpdateOpportunities (Throw on missing ID).
 * - [PHASE 7] Migrated Contact Linking (Add/Delete) to SQL Writer.
 */

class OpportunityService {
    constructor({
        config,
        opportunityWriter,
        contactReader,
        contactWriter,
        companyWriter,
        interactionReader,
        interactionService,
        eventLogReader,
        systemService,
        opportunitySqlReader,
        opportunitySqlWriter,
        eventLogSqlReader, 
        companySqlReader,  
        interactionSqlReader, 
        contactSqlReader,
        contactSqlWriter 
    }) {
        this.config = config;
        
        // Readers
        this.interactionReader = interactionReader;
        this.eventLogReader = eventLogReader;
        this.contactReader = contactReader;
        this.systemService = systemService;
        this.opportunitySqlReader = opportunitySqlReader;
        this.eventLogSqlReader = eventLogSqlReader; 
        this.companySqlReader = companySqlReader;   
        this.interactionSqlReader = interactionSqlReader; 
        this.contactSqlReader = contactSqlReader; 

        // Writers
        this.opportunityWriter = opportunityWriter;
        this.contactWriter = contactWriter;
        this.companyWriter = companyWriter;
        this.interactionService = interactionService;
        this.opportunitySqlWriter = opportunitySqlWriter;
        this.contactSqlWriter = contactSqlWriter;
    }

    _normalizeCompanyName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .trim()
            .replace(/股份有限公司|有限公司|公司/g, '')
            .replace(/\(.*\)/g, '')
            .trim();
    }

    _resolveModifier(user) {
        if (!user) return 'System';
        if (typeof user === 'string') return user;
        return user.name || user.displayName || user.username || 'System';
    }

    async _fetchOpportunities() {
        if (!this.opportunitySqlReader) {
            throw new Error("[Phase7 Boundary Violation] OpportunitySqlReader is required");
        }
        console.log('[OpportunityService] Read source=SQL');
        return await this.opportunitySqlReader.getOpportunities();
    }

    async _logOpportunityInteraction(opportunityId, title, summary, modifier) {
        try {
            await this.interactionService.createInteraction({
                opportunityId: opportunityId,
                eventType: '系統事件',
                eventTitle: title,
                contentSummary: summary,
                recorder: modifier,
                interactionTime: new Date().toISOString()
            }, { displayName: modifier });
        } catch (logError) {
            console.warn(`[OpportunityService] 寫入機會日誌失敗 (OppID: ${opportunityId}): ${logError.message}`);
        }
    }

    async createOpportunity(opportunityData, user) {
        try {
            const modifier = this._resolveModifier(user);

            if (opportunityData.customerCompany) {
                const normalizedComp = this._normalizeCompanyName(opportunityData.customerCompany);
                const allCompanies = await this.companySqlReader.getCompanies();
                const existingCompany = allCompanies.find(c => this._normalizeCompanyName(c.companyName) === normalizedComp);
                let targetCompanyId;

                if (existingCompany) {
                    targetCompanyId = existingCompany.companyId;
                } else {
                    targetCompanyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await this.companyWriter.createCompany({
                        companyId: targetCompanyId,
                        companyName: opportunityData.customerCompany,
                        county: opportunityData.county || ''
                    }, modifier);
                }

                const safeMainContact = (opportunityData.mainContact || '').trim();
                if (safeMainContact) {
                    const normalizedContact = safeMainContact.toLowerCase();
                    const allContacts = await this.contactSqlReader.getContacts();
                    const existingContact = allContacts.find(c => 
                        (c.name || '').toLowerCase().trim() === normalizedContact && 
                        c.companyId === targetCompanyId
                    );

                    if (!existingContact) {
                        await this.contactSqlWriter.createContact({
                            name: safeMainContact,
                            companyId: targetCompanyId,
                            phone: opportunityData.contactPhone || ''
                        }, modifier);
                    }
                }
            }

            const result = await this.opportunitySqlWriter.createOpportunity(opportunityData, modifier);
            
            // [Phase A Patch] Create Interaction Log for New Opportunity
            if (result && result.success) {
                const oppName = opportunityData.opportunityName || '未命名機會';
                const owner = opportunityData.assignee || modifier || '未指定';
                await this._logOpportunityInteraction(
                    result.id,
                    '建立機會',
                    `建立機會：「${oppName}」（負責人：${owner}）`,
                    modifier
                );
            }
            
            return result;
        } catch (error) {
            console.error('[OpportunityService] createOpportunity Error:', error);
            throw error;
        }
    }

    async getOpportunityDetails(opportunityId) {
        try {
            console.log(`[OpportunityService] Read source=SQL (OppID: ${opportunityId})`);
            const opportunityInfo = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            if (!opportunityInfo) {
                throw new Error(`找不到機會ID為 ${opportunityId} 的案件`);
            }

            const eventReader = this.eventLogSqlReader || this.eventLogReader;

            const interactionPromise = this.interactionSqlReader 
                ? this.interactionSqlReader.getInteractionsByOpportunityIds([opportunityId])
                : this.interactionReader.getInteractions().then(all => all.filter(i => i.opportunityId === opportunityId));

            const parentPromise = opportunityInfo.parentOpportunityId 
                ? this.opportunitySqlReader.getOpportunityById(opportunityInfo.parentOpportunityId)
                : Promise.resolve(null);
            
            const childPromise = this.opportunitySqlReader.getOpportunitiesByParentId(opportunityId);
            
            const eventPromise = this.eventLogSqlReader
                ? this.eventLogSqlReader.getEventLogsByOpportunityId(opportunityId)
                : eventReader.getEventLogs().then(all => all.filter(e => e.opportunityId === opportunityId));

            const linksPromise = this.contactSqlReader 
                ? this.contactSqlReader.getContactsByOpportunityId(opportunityId)
                : Promise.resolve([]);
                
            const allCompaniesPromise = this.companySqlReader.getCompanies();

            const [
                parentOpportunity,
                childOpportunities,
                scopedInteractions, 
                scopedEventLogs, 
                linkedContactsFromCache,
                allCompanies
            ] = await Promise.all([
                parentPromise,
                childPromise,
                interactionPromise, 
                eventPromise, 
                linksPromise,
                allCompaniesPromise
            ]);

            const linkedContacts = (linkedContactsFromCache || []).map(contact => ({
                ...contact,
                position: contact.jobTitle || contact.position 
            }));
            
            const interactions = (scopedInteractions || [])
                .sort((a, b) => new Date(b.interactionTime || b.createdTime) - new Date(a.interactionTime || a.createdTime));

            const eventLogs = (scopedEventLogs || [])
                .sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));

            const normalizedOppCompany = this._normalizeCompanyName(opportunityInfo.customerCompany);
            
            const matchedCompany = (allCompanies || []).find(c => this._normalizeCompanyName(c.companyName) === normalizedOppCompany);
            
            let potentialContacts = [];
            if (matchedCompany && this.contactSqlReader) {
                const companyContacts = await this.contactSqlReader.getContactsByCompanyId(matchedCompany.companyId);
                potentialContacts = companyContacts.map(c => ({
                    ...c,
                    company: matchedCompany.companyName,
                    position: c.jobTitle || c.position
                }));
            }

            let mainContactJobTitle = '';
            const targetName = (opportunityInfo.mainContact || '').trim();
            
            if (targetName) {
                const linkedMatch = linkedContacts.find(c => c.name === targetName);
                if (linkedMatch && linkedMatch.position) {
                    mainContactJobTitle = linkedMatch.position;
                } 
                else {
                    const potentialMatch = potentialContacts.find(pc => pc.name === targetName); 
                    if (potentialMatch && potentialMatch.position) {
                        mainContactJobTitle = potentialMatch.position;
                    } 
                }
            }
            opportunityInfo.mainContactJobTitle = mainContactJobTitle;

            return {
                opportunityInfo,
                interactions,
                eventLogs,
                linkedContacts,
                potentialContacts,
                parentOpportunity,
                childOpportunities
            };
        } catch (error) {
            console.error(`[OpportunityService] getOpportunityDetails Error (${opportunityId}):`, error);
            throw error;
        }
    }

    async updateOpportunity(opportunityId, updateData, user) {
        try {
            const modifier = this._resolveModifier(user);
            
            const originalOpportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            
            if (!originalOpportunity) {
                throw new Error(`找不到要更新的機會 (ID: ${opportunityId})`);
            }
            
            const oldStage = originalOpportunity.currentStage;

            const systemConfig = await this.systemService.getSystemConfig();
            const getNote = (configKey, value) => (systemConfig[configKey] || []).find(i => i.value === value)?.note || value || 'N/A';
            const stageMapping = new Map((systemConfig['機會階段'] || []).map(item => [item.value, item.note]));
            
            const logs = [];

            const newStage = updateData.currentStage;
            if (newStage && oldStage && newStage !== oldStage) {
                const oldStageName = stageMapping.get(oldStage) || oldStage;
                const newStageName = stageMapping.get(newStage) || newStage;
                logs.push(`階段從【${oldStageName}】更新為【${newStageName}】`);
            }
            
            if (updateData.opportunityValue !== undefined && updateData.opportunityValue !== originalOpportunity.opportunityValue) {
                logs.push(`機會價值從 [${originalOpportunity.opportunityValue || '未設定'}] 更新為 [${updateData.opportunityValue || '未設定'}]`);
            }

            const oldAssignee = originalOpportunity.assignee || originalOpportunity.owner;
            if (updateData.assignee !== undefined && updateData.assignee !== oldAssignee) {
                logs.push(`負責業務從 [${getNote('團隊成員', oldAssignee)}] 變更為 [${getNote('團隊成員', updateData.assignee)}]`);
            }
            
            if (updateData.expectedCloseDate !== undefined && updateData.expectedCloseDate !== originalOpportunity.expectedCloseDate) {
                logs.push(`預計結案日從 [${originalOpportunity.expectedCloseDate || '未設定'}] 更新為 [${updateData.expectedCloseDate || '未設定'}]`);
            }

            const updateResult = await this.opportunitySqlWriter.updateOpportunity(opportunityId, updateData, modifier);
            
            if (logs.length > 0) {
                await this._logOpportunityInteraction(
                    opportunityId,
                    '機會資料更新',
                    logs.join('； '),
                    modifier
                );
            }
            
            return updateResult;
        } catch (error) {
            console.error('[OpportunityService] updateOpportunity Error:', error);
            throw error;
        }
    }
    
    async addContactToOpportunity(opportunityId, contactData, user) {
        try {
            const modifier = this._resolveModifier(user);
            let contactToLink;
            let logTitle = '關聯聯絡人';

            if (contactData.contactId) {
                contactToLink = { id: contactData.contactId, name: contactData.name };
            } 
            else {
                if (!contactData.company) throw new Error("無法關聯聯絡人：缺少公司名稱。");
                
                logTitle = '建立並關聯新聯絡人';
                const normalizedComp = this._normalizeCompanyName(contactData.company);
                const allCompanies = await this.companySqlReader.getCompanies();
                const existingCompany = allCompanies.find(c => this._normalizeCompanyName(c.companyName) === normalizedComp);
                let targetCompanyId;

                if (existingCompany) {
                    targetCompanyId = existingCompany.companyId;
                } else {
                    targetCompanyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await this.companyWriter.createCompany({
                        companyId: targetCompanyId,
                        companyName: contactData.company,
                        county: contactData.county || ''
                    }, modifier);
                }

                const normalizedContactName = (contactData.name || '').toLowerCase().trim();
                const allContacts = await this.contactSqlReader.getContacts();
                const existingContact = allContacts.find(c => 
                    (c.name || '').toLowerCase().trim() === normalizedContactName && 
                    c.companyId === targetCompanyId
                );

                if (existingContact) {
                    logTitle = '關聯現有聯絡人';
                    contactToLink = { id: existingContact.contactId, name: existingContact.name };
                } else {
                    const targetContactId = `CONT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await this.contactSqlWriter.createContact({
                        contactId: targetContactId,
                        name: contactData.name,
                        companyId: targetCompanyId,
                        phone: contactData.phone || contactData.mobile || '',
                        email: contactData.email || '',
                        jobTitle: contactData.position || contactData.jobTitle || '',
                        department: contactData.department || ''
                    }, modifier);
                    
                    contactToLink = { id: targetContactId, name: contactData.name };
                }
            }

            const linkResult = await this.opportunitySqlWriter.linkContact(opportunityId, contactToLink.id, modifier);
            
            await this._logOpportunityInteraction(
                opportunityId,
                logTitle,
                `將聯絡人 "${contactToLink.name}" 關聯至此機會。`,
                modifier
            );

            return { success: true, message: '聯絡人關聯成功', data: { contact: contactToLink, link: linkResult } };
        } catch (error) {
            console.error('[OpportunityService] addContactToOpportunity Error:', error);
            throw error;
        }
    }

    async deleteContactLink(opportunityId, contactId, user) {
        try {
            const modifier = this._resolveModifier(user);
            
            const contact = this.contactSqlReader 
                ? await this.contactSqlReader.getContactById(contactId)
                : (await this.contactReader.getContactList()).find(c => c.contactId === contactId);
                
            const contactName = contact ? contact.name : `ID ${contactId}`;

            const deleteResult = await this.opportunitySqlWriter.unlinkContact(opportunityId, contactId);

            if (deleteResult.success) {
                await this._logOpportunityInteraction(
                    opportunityId,
                    '解除聯絡人關聯',
                    `將聯絡人 "${contactName}" 從此機會移除。`,
                    modifier
                );
            }

            return deleteResult;
        } catch (error) {
            console.error('[OpportunityService] deleteContactLink Error:', error);
            throw error;
        }
    }

    async deleteOpportunity(opportunityId, user) {
        try {
            const modifier = this._resolveModifier(user);
            
            const opportunity = await this.opportunitySqlReader.getOpportunityById(opportunityId);
            
            if (!opportunity) {
                throw new Error(`找不到要刪除的機會 (ID: ${opportunityId})`);
            }

            const deleteResult = await this.opportunitySqlWriter.deleteOpportunity(opportunityId, modifier);
            
            if (deleteResult.success && opportunity.customerCompany) {
                try {
                    const allCompanies = await this.companySqlReader.getCompanies();
                    const company = allCompanies.find(c => 
                        c.companyName.toLowerCase().trim() === opportunity.customerCompany.toLowerCase().trim()
                    );
                    
                    if (company) {
                        await this.interactionService.createInteraction({
                            companyId: company.companyId,
                            eventType: '系統事件',
                            eventTitle: '刪除機會案件',
                            contentSummary: `機會案件 "${opportunity.opportunityName}" (ID: ${opportunity.opportunityId}) 已被 ${modifier} 刪除。`,
                            recorder: modifier,
                            interactionTime: new Date().toISOString()
                        }, user);
                    }
                } catch (logError) {
                     console.warn(`[OpportunityService] 寫入公司日誌失敗 (刪除機會時): ${logError.message}`);
                }
            }
            
            return deleteResult;
        } catch (error) {
            console.error('[OpportunityService] deleteOpportunity Error:', error);
            throw error;
        }
    }

    async getOpportunityYears() {
        if (!this.opportunitySqlReader) return [];
        try {
            return await this.opportunitySqlReader.getOpportunityYears();
        } catch (error) {
            console.error('[OpportunityService] getOpportunityYears Error:', error);
            throw error;
        }
    }

    async getOpportunitiesByDateRange(startDate, endDate, dateField = 'createdTime') {
        try {
            const allOpportunities = await this._fetchOpportunities();
            
            return allOpportunities.filter(opp => {
                const dateVal = opp[dateField];
                if (!dateVal) return false;
                
                const oppDate = new Date(dateVal);
                if (isNaN(oppDate.getTime())) return false; 

                return oppDate.getTime() >= startDate.getTime() && oppDate.getTime() <= endDate.getTime();
            });
        } catch (error) {
            console.error('[OpportunityService] getOpportunitiesByDateRange Error:', error);
            return [];
        }
    }

    async getOpportunitiesByCounty(opportunityType = null) {
        try {
            const [allOpportunities, companies] = await Promise.all([
                this._fetchOpportunities(),
                this.companySqlReader.getCompanies()
            ]);

            const activeOpportunities = allOpportunities.filter(opp => 
                opp.currentStatus !== this.config.CONSTANTS.OPPORTUNITY_STATUS.ARCHIVED
            );

            let filteredOpportunities = opportunityType
                ? activeOpportunities.filter(opp => opp.opportunityType === opportunityType)
                : activeOpportunities;
            
            const normalize = (name) => name ? name.toLowerCase().trim() : '';
            const companyToCountyMap = new Map();
            
            (companies || []).forEach(c => {
                if (c.companyName) {
                    companyToCountyMap.set(normalize(c.companyName), c.county || c.city);
                }
            });

            const countyCounts = {};
            filteredOpportunities.forEach(opp => {
                const county = companyToCountyMap.get(normalize(opp.customerCompany));
                if (county) {
                    countyCounts[county] = (countyCounts[county] || 0) + 1;
                }
            });

            return Object.entries(countyCounts).map(([county, count]) => ({ county, count }));

        } catch (error) {
            console.error('❌ [OpportunityService] getOpportunitiesByCounty 錯誤:', error);
            return [];
        }
    }

    async getOpportunitiesByStage() {
        try {
            const [opportunities, systemConfig] = await Promise.all([
                this._fetchOpportunities(),
                this.systemService.getSystemConfig()
            ]);
            
            const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
            const stages = systemConfig['機會階段'] || [];
            const stageGroups = {};

            stages.forEach(stage => {
                stageGroups[stage.value] = { name: stage.note || stage.value, opportunities: [], count: 0 };
            });

            safeOpportunities.forEach(opp => {
                if (opp.currentStatus === '進行中') {
                    const stageKey = opp.currentStage;
                    if (stageGroups[stageKey]) {
                        stageGroups[stageKey].opportunities.push(opp);
                        stageGroups[stageKey].count++;
                    }
                }
            });
            return stageGroups;
        } catch (error) {
            console.error('❌ [OpportunityService] getOpportunitiesByStage 錯誤:', error);
            return {};
        }
    }

    // [Phase 8.11] Expanded parameter signature to support direct SQL delegation for Table Data
    async searchOpportunities(query, page = 0, limit = 500, sortField = null, sortDirection = null, filters = {}) {
        try {
            // New SQL-Delegated Path for Table
            if (this.opportunitySqlReader && typeof this.opportunitySqlReader.searchOpportunitiesTable === 'function') {
                const offset = (page > 0) ? (page - 1) * limit : 0;
                
                const result = await this.opportunitySqlReader.searchOpportunitiesTable({
                    q: query,
                    filters: filters || {},
                    sortField,
                    sortDirection,
                    limit: page > 0 ? limit : null,
                    offset
                });
                
                // Return raw array if page == 0 to maintain legacy compatibility for Chip Wall
                if (page === 0) return result.data;
                
                return result; // Table expects { data, total }
            }

            // Fallback (legacy JS handling)
            let items = await this._fetchOpportunities();

            if (!filters || !filters.includeArchived) {
                items = items.filter(o => o.currentStatus !== this.config.CONSTANTS.OPPORTUNITY_STATUS.ARCHIVED);
            }

            if (query) {
                const q = query.toLowerCase().trim();
                items = items.filter(o => 
                    (o.opportunityName && o.opportunityName.toLowerCase().includes(q)) ||
                    (o.customerCompany && o.customerCompany.toLowerCase().includes(q))
                );
            }

            if (filters) {
                if (filters.stage && filters.stage !== 'all') {
                    items = items.filter(o => o.currentStage === filters.stage);
                }
                if (filters.assignee && filters.assignee !== 'all') {
                    items = items.filter(o => (o.assignee || o.owner) === filters.assignee);
                }
                if (filters.status && filters.status !== 'all') {
                    items = items.filter(o => o.currentStatus === filters.status);
                }
                if (filters.minProb) {
                    items = items.filter(o => Number(o.probability || o.winProbability || 0) >= Number(filters.minProb));
                }
            }

            items.sort((a, b) => {
                const dateA = new Date(a.lastUpdateTime || a.updatedTime || 0).getTime();
                const dateB = new Date(b.lastUpdateTime || b.updatedTime || 0).getTime();
                return dateB - dateA;
            });

            return page === 0 ? items : { data: items, total: items.length };

        } catch (error) {
             console.error('❌ [OpportunityService] searchOpportunities 錯誤:', error);
             throw error;
        }
    }

    async batchUpdateOpportunities(updates) {
        let successCount = 0;
        
        for (const update of updates) {
            if (!update.opportunityId) {
                throw new Error("[Phase7 Contract Violation] batchUpdateOpportunities requires opportunityId");
            }

            try {
                await this.updateOpportunity(update.opportunityId, update.data, { displayName: update.modifier });
                successCount++;
            } catch (error) {
                console.error(`[OpportunityService] Batch Update Error (ID: ${update.opportunityId}):`, error);
                throw error;
            }
        }
        return { success: true, successCount };
    }
}

module.exports = OpportunityService;
</file>

</files>
