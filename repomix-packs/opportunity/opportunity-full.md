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
- Only files matching these patterns are included: routes/opportunity.routes.js, controllers/opportunity.controller.js, services/opportunity-service.js, data/opportunity-*.js, public/views/opportunity-detail.html, public/components/modals/opportunity-modals.html, public/components/modals/link-opportunity-modal.html, public/scripts/opportunities/**/*.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/opportunity.controller.js
data/opportunity-reader.js
data/opportunity-sql-reader.js
data/opportunity-sql-writer.js
data/opportunity-writer.js
public/components/modals/link-opportunity-modal.html
public/components/modals/opportunity-modals.html
public/scripts/opportunities/details/opportunity-associated-contacts.js
public/scripts/opportunities/details/opportunity-details-components.js
public/scripts/opportunities/details/opportunity-event-reports.js
public/scripts/opportunities/details/opportunity-info-view.js
public/scripts/opportunities/details/opportunity-interactions.js
public/scripts/opportunities/details/opportunity-stepper.js
public/scripts/opportunities/opportunities.js
public/scripts/opportunities/opportunity-details-events.js
public/scripts/opportunities/opportunity-details.js
public/scripts/opportunities/opportunity-modals.js
public/views/opportunity-detail.html
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

<file path="data/opportunity-sql-writer.js">
// data/opportunity-sql-writer.js
/**
 * OpportunitySqlWriter
 * * @version 1.1.0 (Phase 7 - Contact Linking SQL)
 * @date 2026-02-06
 * @description 負責將機會案件寫入 Supabase 'opportunities' 資料表。
 * - [PATCH] Normalize empty date strings to null for PostgreSQL compatibility.
 * - [PATCH] Added missing mapping for drive_link in updateOpportunity.
 * - [FEAT] Added linkContact and unlinkContact methods for SQL-based linking.
 */

const { supabase } = require('../config/supabase');

class OpportunitySqlWriter {
    
    constructor() {
        this.tableName = 'opportunities';
    }

    /**
     * 建立新機會案件
     * @param {Object} data - 機會資料 DTO
     * @param {string} creator - 建立者名稱
     * @returns {Object} { success: true, id: string }
     */
    async createOpportunity(data, creator) {
        console.log(`💼 [OpportunitySqlWriter] Create: ${data.opportunityName} by ${creator}`);

        const now = new Date().toISOString();
        const newId = `OPP${Date.now()}`;

        // [Date Normalization]
        // PostgreSQL rejects "" for date types. Convert "" to null.
        const expectedCloseDate = (data.expectedCloseDate === "") ? null : data.expectedCloseDate;

        // Map DTO to DB Columns
        const dbPayload = {
            opportunity_id: newId,
            opportunity_name: data.opportunityName,
            customer_company: data.customerCompany,
            
            // Sales & Channel
            sales_model: data.salesModel,
            sales_channel: data.salesChannel || data.channelDetails, // Map fallback
            channel_contact: data.channelContact,
            
            // Contacts
            main_contact: data.mainContact,
            owner: data.assignee, // Map assignee -> owner
            
            // Classification
            opportunity_type: data.opportunityType,
            source: data.opportunitySource,
            
            // Status
            current_stage: data.currentStage,
            current_status: '進行中', // Default active
            
            // Metrics
            expected_close_date: expectedCloseDate,
            opportunity_value: data.opportunityValue,
            win_probability: data.orderProbability, // Map orderProbability -> win_probability
            
            // Details
            equipment_scale: data.deviceScale,
            product_details: data.potentialSpecification, // Map potentialSpecification -> product_details
            notes: data.notes,
            drive_link: data.driveFolderLink,
            
            // History
            stage_history: data.stageHistory ? data.stageHistory : JSON.stringify([]),
            
            // Metadata
            created_time: now,
            updated_time: now,
            updated_by: creator,
            
            // Hierarchy
            parent_opportunity_id: data.parentOpportunityId
        };

        const { error } = await supabase
            .from(this.tableName)
            .insert([dbPayload]);

        if (error) {
            console.error('[OpportunitySqlWriter] Create Error:', error);
            throw new Error(`DB Insert Error: ${error.message}`);
        }

        return { success: true, id: newId };
    }

    /**
     * 更新機會案件
     * @param {string} opportunityId
     * @param {Object} updateData
     * @param {string} modifier
     */
    async updateOpportunity(opportunityId, updateData, modifier) {
        console.log(`📝 [OpportunitySqlWriter] Update: ${opportunityId} by ${modifier}`);

        const now = new Date().toISOString();
        
        // Build Dynamic Payload
        const dbPayload = {
            updated_time: now,
            updated_by: modifier
        };

        // Map fields if present
        if (updateData.opportunityName !== undefined) dbPayload.opportunity_name = updateData.opportunityName;
        if (updateData.customerCompany !== undefined) dbPayload.customer_company = updateData.customerCompany;
        if (updateData.salesModel !== undefined) dbPayload.sales_model = updateData.salesModel;
        
        if (updateData.salesChannel !== undefined) dbPayload.sales_channel = updateData.salesChannel;
        else if (updateData.channelDetails !== undefined) dbPayload.sales_channel = updateData.channelDetails;

        if (updateData.channelContact !== undefined) dbPayload.channel_contact = updateData.channelContact;
        if (updateData.mainContact !== undefined) dbPayload.main_contact = updateData.mainContact;
        if (updateData.assignee !== undefined) dbPayload.owner = updateData.assignee;
        
        if (updateData.opportunityType !== undefined) dbPayload.opportunity_type = updateData.opportunityType;
        if (updateData.opportunitySource !== undefined) dbPayload.source = updateData.opportunitySource;
        
        if (updateData.currentStage !== undefined) dbPayload.current_stage = updateData.currentStage;
        if (updateData.currentStatus !== undefined) dbPayload.current_status = updateData.currentStatus;
        
        // [Date Normalization]
        if (updateData.expectedCloseDate !== undefined) {
            dbPayload.expected_close_date = (updateData.expectedCloseDate === "") ? null : updateData.expectedCloseDate;
        }

        if (updateData.opportunityValue !== undefined) dbPayload.opportunity_value = updateData.opportunityValue;
        if (updateData.orderProbability !== undefined) dbPayload.win_probability = updateData.orderProbability;
        
        if (updateData.deviceScale !== undefined) dbPayload.equipment_scale = updateData.deviceScale;
        if (updateData.potentialSpecification !== undefined) dbPayload.product_details = updateData.potentialSpecification;
        
        if (updateData.notes !== undefined) dbPayload.notes = updateData.notes;
        if (updateData.driveFolderLink !== undefined) dbPayload.drive_link = updateData.driveFolderLink;
        if (updateData.stageHistory !== undefined) dbPayload.stage_history = updateData.stageHistory;
        if (updateData.parentOpportunityId !== undefined) dbPayload.parent_opportunity_id = updateData.parentOpportunityId;

        const { error } = await supabase
            .from(this.tableName)
            .update(dbPayload)
            .eq('opportunity_id', opportunityId);

        if (error) {
            console.error('[OpportunitySqlWriter] Update Error:', error);
            throw new Error(`DB Update Error: ${error.message}`);
        }

        return { success: true, id: opportunityId };
    }

    /**
     * 刪除機會案件
     * @param {string} opportunityId 
     * @param {string} modifier 
     */
    async deleteOpportunity(opportunityId, modifier) {
        console.log(`🗑️ [OpportunitySqlWriter] Delete: ${opportunityId} by ${modifier}`);

        // SQL Hard Delete
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('opportunity_id', opportunityId);

        if (error) {
            console.error('[OpportunitySqlWriter] Delete Error:', error);
            throw new Error(`DB Delete Error: ${error.message}`);
        }

        return { success: true };
    }

    /**
     * 關聯聯絡人至機會 (SQL)
     * @param {string} opportunityId
     * @param {string} contactId
     * @param {string} modifier
     */
    async linkContact(opportunityId, contactId, modifier) {
        console.log(`🔗 [OpportunitySqlWriter] Link: ${opportunityId} <-> ${contactId}`);
        const now = new Date().toISOString();
        
        // Upsert to link table (assuming 'opportunity_contact_links')
        // Using upsert to handle re-linking smoothly
        const { error } = await supabase
            .from('opportunity_contact_links')
            .upsert({
                opportunity_id: opportunityId,
                contact_id: contactId,
                link_status: 'active',
                updated_time: now,
                updated_by: modifier
            }, { onConflict: 'opportunity_id, contact_id' });

        if (error) {
            console.error('[OpportunitySqlWriter] Link Error:', error);
            throw new Error(`Link Error: ${error.message}`);
        }
        return { success: true };
    }

    /**
     * 解除聯絡人關聯 (SQL)
     * @param {string} opportunityId
     * @param {string} contactId
     */
    async unlinkContact(opportunityId, contactId) {
         console.log(`🔗 [OpportunitySqlWriter] Unlink: ${opportunityId} <-> ${contactId}`);
         
         // Physical delete (Unlink)
         const { error } = await supabase
            .from('opportunity_contact_links')
            .delete()
            .eq('opportunity_id', opportunityId)
            .eq('contact_id', contactId);
            
         if (error) {
             console.error('[OpportunitySqlWriter] Unlink Error:', error);
             throw new Error(`Unlink Error: ${error.message}`);
         }
         return { success: true };
    }
}

module.exports = OpportunitySqlWriter;
</file>

<file path="data/opportunity-writer.js">
/**
 * data/opportunity-writer.js
 * 機會案件寫入器
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責處理與「機會案件」及「關聯」相關的寫入/更新操作。
 * 支援動態標題對映 (Dynamic Header Mapping)。
 * 實作 Strict Mode 依賴注入。
 */

const BaseWriter = require('./base-writer');

class OpportunityWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} opportunityReader - 用於清除快取的 Reader
     * @param {Object} contactReader - 用於清除關聯表快取的 Reader
     */
    constructor(sheets, spreadsheetId, opportunityReader, contactReader) {
        super(sheets, spreadsheetId);
        if (!opportunityReader || !contactReader) {
            throw new Error('OpportunityWriter 需要 OpportunityReader 和 ContactReader 的實例');
        }
        this.opportunityReader = opportunityReader;
        this.contactReader = contactReader;
    }

    /**
     * 內部輔助：取得標題對映表與當前列資料
     * ★★★ 關鍵修正：使用 this.targetSpreadsheetId ★★★
     */
    async _getHeaderMapAndRow(rowIndex) {
        const headerRange = `${this.config.SHEETS.OPPORTUNITIES}!A1:ZZ1`;
        const dataRange = `${this.config.SHEETS.OPPORTUNITIES}!A${rowIndex}:ZZ${rowIndex}`;
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const response = await this.sheets.spreadsheets.values.batchGet({
            spreadsheetId: this.targetSpreadsheetId, 
            ranges: [headerRange, dataRange]
        });

        const headerValues = response.data.valueRanges[0].values ? response.data.valueRanges[0].values[0] : [];
        const rowValues = response.data.valueRanges[1].values ? response.data.valueRanges[1].values[0] : [];

        if (headerValues.length === 0) throw new Error('找不到標題列');
        
        const map = {};
        headerValues.forEach((title, index) => {
            if(title) map[title.trim()] = index;
        });

        return { map, currentRow: rowValues, headerLength: headerValues.length };
    }

    /**
     * 建立新機會案件
     * (補齊原檔可能缺失的 create 方法，若原檔邏輯在 Service 層處理寫入，此處仍需提供底層支援)
     * 假設是 append 邏輯，但由於機會案件欄位複雜，通常建議先由 Service 整理好陣列或物件
     * 這裡實作一個基於動態標題的 append 方法
     */
    async createOpportunity(opportunityData, creator) {
        console.log(`💼 [OpportunityWriter] 建立新機會案件: ${opportunityData.opportunityName} by ${creator}`);
        
        // 1. 讀取標題列以確定欄位順序
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const headerRange = `${this.config.SHEETS.OPPORTUNITIES}!A1:ZZ1`;
        const headerResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: headerRange
        });
        const headers = headerResponse.data.values ? headerResponse.data.values[0] : [];
        if (headers.length === 0) throw new Error('找不到標題列，無法建立機會');

        const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;
        const now = new Date().toISOString();
        const newId = `OPP${Date.now()}`;

        // 2. 組裝資料列
        const newRow = headers.map(header => {
            const h = header.trim();
            if (h === FIELD_NAMES.ID) return newId;
            if (h === FIELD_NAMES.NAME) return opportunityData.opportunityName;
            if (h === FIELD_NAMES.CUSTOMER) return opportunityData.customerCompany;
            if (h === FIELD_NAMES.SALES_MODEL) return opportunityData.salesModel;
            // Channel 欄位可能對應 salesChannel 或 channelDetails
            if (h === FIELD_NAMES.CHANNEL) return opportunityData.salesChannel || opportunityData.channelDetails;
            if (h === FIELD_NAMES.CHANNEL_CONTACT) return opportunityData.channelContact;
            if (h === FIELD_NAMES.CONTACT) return opportunityData.mainContact;
            if (h === FIELD_NAMES.ASSIGNEE) return opportunityData.assignee;
            if (h === FIELD_NAMES.TYPE) return opportunityData.opportunityType;
            if (h === FIELD_NAMES.SOURCE) return opportunityData.opportunitySource;
            if (h === FIELD_NAMES.STAGE) return opportunityData.currentStage;
            if (h === FIELD_NAMES.CLOSE_DATE) return opportunityData.expectedCloseDate;
            if (h === FIELD_NAMES.PROBABILITY) return opportunityData.orderProbability;
            if (h === FIELD_NAMES.VALUE) return opportunityData.opportunityValue;
            if (h === FIELD_NAMES.VALUE_TYPE) return opportunityData.opportunityValueType;
            if (h === FIELD_NAMES.PRODUCT_SPEC) return opportunityData.potentialSpecification;
            if (h === FIELD_NAMES.DEVICE_SCALE) return opportunityData.deviceScale;
            if (h === FIELD_NAMES.NOTES) return opportunityData.notes;
            if (h === FIELD_NAMES.DRIVE_LINK) return opportunityData.driveFolderLink;
            if (h === FIELD_NAMES.STATUS) return '進行中';
            if (h === FIELD_NAMES.HISTORY) return opportunityData.stageHistory || JSON.stringify([]);
            if (h === FIELD_NAMES.CREATED_TIME) return now;
            if (h === FIELD_NAMES.LAST_UPDATE_TIME) return now;
            if (h === FIELD_NAMES.LAST_MODIFIER) return creator;
            if (h === FIELD_NAMES.PARENT_ID) return opportunityData.parentOpportunityId;
            
            return '';
        });

        // 3. 寫入
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.config.SHEETS.OPPORTUNITIES}!A:A`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        this.opportunityReader.invalidateCache('opportunities');
        return { success: true, id: newId };
    }

    async updateOpportunity(rowIndex, updateData, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`📝 [OpportunityWriter] 更新機會案件 (動態欄位) - Row: ${rowIndex} by ${modifier}`);
        
        const now = new Date().toISOString();
        const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;

        // 取得標題對映與當前資料
        const { map, currentRow, headerLength } = await this._getHeaderMapAndRow(rowIndex);
        if (currentRow.length === 0) throw new Error(`在 ${rowIndex} 列找不到資料`);

        while (currentRow.length < headerLength) {
            currentRow.push('');
        }

        const setValue = (fieldName, value) => {
            const index = map[fieldName];
            if (index !== undefined && index >= 0) {
                currentRow[index] = value;
            } else {
                console.warn(`⚠️ [OpportunityWriter] 警告: 找不到欄位標題 "${fieldName}"，更新略過。`);
            }
        };

        // 逐一更新欄位
        if(updateData.opportunityName !== undefined) setValue(FIELD_NAMES.NAME, updateData.opportunityName);
        if(updateData.customerCompany !== undefined) setValue(FIELD_NAMES.CUSTOMER, updateData.customerCompany);
        if(updateData.mainContact !== undefined) setValue(FIELD_NAMES.CONTACT, updateData.mainContact);
        
        if(updateData.assignee !== undefined) setValue(FIELD_NAMES.ASSIGNEE, updateData.assignee);
        if(updateData.opportunityType !== undefined) setValue(FIELD_NAMES.TYPE, updateData.opportunityType);
        if(updateData.opportunitySource !== undefined) setValue(FIELD_NAMES.SOURCE, updateData.opportunitySource);
        if(updateData.currentStage !== undefined) setValue(FIELD_NAMES.STAGE, updateData.currentStage);
        if(updateData.expectedCloseDate !== undefined) setValue(FIELD_NAMES.CLOSE_DATE, updateData.expectedCloseDate);
        if(updateData.opportunityValue !== undefined) setValue(FIELD_NAMES.VALUE, updateData.opportunityValue);
        if(updateData.currentStatus !== undefined) setValue(FIELD_NAMES.STATUS, updateData.currentStatus);
        if(updateData.notes !== undefined) setValue(FIELD_NAMES.NOTES, updateData.notes);
        
        if(updateData.stageHistory !== undefined) setValue(FIELD_NAMES.HISTORY, updateData.stageHistory);
        if(updateData.parentOpportunityId !== undefined) setValue(FIELD_NAMES.PARENT_ID, updateData.parentOpportunityId);
        
        if(updateData.orderProbability !== undefined) setValue(FIELD_NAMES.PROBABILITY, updateData.orderProbability);
        if(updateData.potentialSpecification !== undefined) setValue(FIELD_NAMES.PRODUCT_SPEC, updateData.potentialSpecification); 
        
        if(updateData.salesChannel !== undefined) setValue(FIELD_NAMES.CHANNEL, updateData.salesChannel);
        
        if(updateData.deviceScale !== undefined) setValue(FIELD_NAMES.DEVICE_SCALE, updateData.deviceScale);
        if(updateData.opportunityValueType !== undefined) setValue(FIELD_NAMES.VALUE_TYPE, updateData.opportunityValueType);

        if(updateData.salesModel !== undefined) setValue(FIELD_NAMES.SALES_MODEL, updateData.salesModel);
        if(updateData.channelDetails !== undefined) setValue(FIELD_NAMES.CHANNEL, updateData.channelDetails);
        if(updateData.channelContact !== undefined) setValue(FIELD_NAMES.CHANNEL_CONTACT, updateData.channelContact);

        if(updateData.createdTime !== undefined) setValue(FIELD_NAMES.CREATED_TIME, updateData.createdTime);

        setValue(FIELD_NAMES.LAST_UPDATE_TIME, now);
        setValue(FIELD_NAMES.LAST_MODIFIER, modifier);
        
        const range = `${this.config.SHEETS.OPPORTUNITIES}!A${rowIndex}:ZZ${rowIndex}`;
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        this.opportunityReader.invalidateCache('opportunities');
        console.log('✅ [OpportunityWriter] 機會案件更新成功');

        return { success: true, data: { rowIndex, ...updateData } };
    }

    async batchUpdateOpportunities(updates) {
        console.log('📝 [OpportunityWriter] 執行高效批量更新機會案件...');
        const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const headerRange = `${this.config.SHEETS.OPPORTUNITIES}!A1:ZZ1`;
        const headerResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId, 
            range: headerRange
        });
        const headerValues = headerResponse.data.values ? headerResponse.data.values[0] : [];
        const map = {};
        headerValues.forEach((title, index) => { if(title) map[title.trim()] = index; });

        const now = new Date().toISOString();

        const data = await Promise.all(updates.map(async (update) => {
            const range = `${this.config.SHEETS.OPPORTUNITIES}!A${update.rowIndex}:ZZ${update.rowIndex}`;
            
            // ★★★ 使用 this.targetSpreadsheetId ★★★
            const response = await this.sheets.spreadsheets.values.get({ 
                spreadsheetId: this.targetSpreadsheetId, 
                range 
            });
            const currentRow = response.data.values ? response.data.values[0] : [];
            
            if (currentRow.length === 0) return null;
            while (currentRow.length < headerValues.length) currentRow.push('');

            const { data: updateData, modifier } = update;
            
            const setVal = (key, val) => {
                const idx = map[key];
                if (idx !== undefined && idx >= 0) currentRow[idx] = val;
            };

            if (updateData.currentStage !== undefined) setVal(FIELD_NAMES.STAGE, updateData.currentStage);
            if (updateData.stageHistory !== undefined) setVal(FIELD_NAMES.HISTORY, updateData.stageHistory);
            if (updateData.customerCompany !== undefined) setVal(FIELD_NAMES.CUSTOMER, updateData.customerCompany);

            setVal(FIELD_NAMES.LAST_UPDATE_TIME, now);
            setVal(FIELD_NAMES.LAST_MODIFIER, modifier);
            
            return { range, values: [currentRow] };
        }));

        const validData = data.filter(d => d !== null);
        if (validData.length === 0) {
            return { success: true, successCount: 0, failCount: updates.length };
        }

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.targetSpreadsheetId,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: validData
            }
        });

        this.opportunityReader.invalidateCache('opportunities');
        console.log(`✅ [OpportunityWriter] 批量更新完成`);
        return { success: true, successCount: validData.length, failCount: updates.length - validData.length };
    }
    
    async deleteOpportunity(rowIndex, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`🗑️ [OpportunityWriter] 刪除機會案件 - Row: ${rowIndex} by ${modifier}`);
        
        // 呼叫 BaseWriter 的 _deleteRow
        await this._deleteRow(this.config.SHEETS.OPPORTUNITIES, rowIndex, this.opportunityReader);
        
        console.log('✅ [OpportunityWriter] 機會案件刪除成功');
        return { success: true };
    }

    async linkContactToOpportunity(opportunityId, contactId, modifier) {
        console.log(`🔗 [OpportunityWriter] 建立關聯: 機會 ${opportunityId} <-> 聯絡人 ${contactId}`);
        const now = new Date().toISOString();
        const linkId = `LNK${Date.now()}`;
        
        const rowData = [linkId, opportunityId, contactId, now, 'active', modifier];
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [rowData] }
        });
        
        this.contactReader.invalidateCache('oppContactLinks');
        return { success: true, linkId: linkId };
    }

    async deleteContactLink(opportunityId, contactId) {
        console.log(`🗑️ [OpportunityWriter] 永久刪除關聯: 機會 ${opportunityId} <-> 聯絡人 ${contactId}`);
        const range = `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`;
        
        const allLinks = await this.contactReader.getAllOppContactLinks();
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const linkRowsResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: range,
        });

        const rows = linkRowsResponse.data.values || [];
        for (let i = 1; i < rows.length; i++) { 
            const rowOppId = rows[i][this.config.OPP_CONTACT_LINK_FIELDS.OPPORTUNITY_ID];
            const rowContactId = rows[i][this.config.OPP_CONTACT_LINK_FIELDS.CONTACT_ID];
            
            if (rowOppId === opportunityId && rowContactId === contactId) {
                const rowIndexToDelete = i + 1;
                // 呼叫 BaseWriter 的 _deleteRow
                await this._deleteRow(this.config.SHEETS.OPPORTUNITY_CONTACT_LINK, rowIndexToDelete, this.contactReader);
                return { success: true, rowIndex: rowIndexToDelete };
            }
        }
        throw new Error('找不到對應的關聯紀錄');
    }
}

module.exports = OpportunityWriter;
</file>

<file path="public/components/modals/link-opportunity-modal.html">
<div id="link-opportunity-modal" class="modal">
    <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
            <h2 class="modal-title" id="link-opportunity-modal-title">關聯至母機會</h2>
            <button class="close-btn" onclick="closeModal('link-opportunity-modal')">&times;</button>
        </div>
        <div class="form-group">
            <label class="form-label">搜尋機會案件</label>
            <input type="text" class="form-input" id="search-opportunity-to-link-input" placeholder="輸入機會名稱或公司進行搜尋...">
        </div>
        <div id="opportunity-to-link-results" class="search-result-list">
            </div>
    </div>
</div>
</file>

<file path="public/components/modals/opportunity-modals.html">
<div id="new-opportunity-modal" class="modal">
    <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
            <h2 class="modal-title">🎯 新增機會案件</h2>
            <button class="close-btn" onclick="closeModal('new-opportunity-modal')">&times;</button>
        </div>

        <div class="wizard-steps">
            <div class="step-item active" data-step="1">
                <div class="step-circle">1</div>
                <div class="step-label">鎖定對象</div>
            </div>
            <div class="step-line"></div>
            <div class="step-item" data-step="2">
                <div class="step-circle">2</div>
                <div class="step-label">機會內容</div>
            </div>
            <div class="step-line"></div>
            <div class="step-item" data-step="3">
                <div class="step-circle">3</div>
                <div class="step-label">歸屬設定</div>
            </div>
        </div>

        <form id="new-opportunity-wizard-form">
            <input type="hidden" id="wiz-path" value="">
            <input type="hidden" id="wiz-company-county" value="">
            <input type="hidden" id="wiz-contact-source-id" value="">

            <div class="wizard-step-content" data-step="1">
                <h3 class="step-instruction">請問您要建立哪種類型的機會？</h3>
                
                <div class="entry-options-grid" id="wiz-entry-options">
                    <div class="entry-option-card" onclick="NewOppWizard.selectPath('card')">
                        <div class="entry-icon">📇</div>
                        <div class="entry-title">新名片轉入</div>
                        <div class="entry-desc">已掃描名片，<br>從「潛在客戶」 轉入</div>
                    </div>
                    <div class="entry-option-card" onclick="NewOppWizard.selectPath('old')">
                        <div class="entry-icon">🏢</div>
                        <div class="entry-title">經營老客戶</div>
                        <div class="entry-desc">公司曾建過機會，<br>新增「新的機會案件」</div>
                    </div>
                    <div class="entry-option-card" onclick="NewOppWizard.selectPath('new')">
                        <div class="entry-icon">✨</div>
                        <div class="entry-title">全新開發</div>
                        <div class="entry-desc">系統無相關資料，<br>手動建立「公司與聯絡人」</div>
                    </div>
                </div>

                <div id="wiz-path-card" class="wiz-path-section" style="display: none;">
                    <div class="form-group">
                        <label class="form-label">搜尋名片 / 選擇最近新增</label>
                        <input type="text" class="form-input" id="wiz-card-search" placeholder="輸入姓名或公司搜尋..." onkeyup="NewOppWizard.searchCards(this.value)">
                    </div>
                    <div id="wiz-card-list" class="search-result-list" style="display: block; max-height: 250px; position: static;">
                        </div>
                </div>

                <div id="wiz-path-old" class="wiz-path-section" style="display: none;">
                    <div class="form-group">
                        <label class="form-label">搜尋已建檔公司</label>
                        <div class="search-input-wrapper">
                            <input type="text" class="form-input" id="wiz-company-search" placeholder="輸入公司名稱 (例如: 台積電)..." onkeyup="NewOppWizard.searchCompanies(this.value)">
                        </div>
                        <div id="wiz-company-results" class="search-result-list"></div>
                    </div>
                    
                    <div id="wiz-old-contact-area" style="display: none; margin-top: 15px; padding: 15px; background: var(--glass-bg); border-radius: 8px;">
                        <p style="margin-bottom: 10px;"><strong>已選定公司：</strong><span id="wiz-selected-company-name"></span></p>
                        <div class="form-group">
                            <label class="form-label">選擇聯絡人</label>
                            <div class="select-wrapper">
                                <select class="form-select" id="wiz-old-contact-select" onchange="NewOppWizard.handleContactSelect(this)">
                                    </select>
                            </div>
                        </div>
                        <div id="wiz-new-contact-inputs" style="display: none; margin-top: 10px;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">姓名 *</label>
                                    <input type="text" class="form-input" id="wiz-new-contact-name">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">電話/手機</label>
                                    <input type="text" class="form-input" id="wiz-new-contact-phone">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="wiz-path-new" class="wiz-path-section" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">客戶公司 *</label>
                            <input type="text" class="form-input" id="wiz-manual-company">
                        </div>
                        <div class="form-group">
                            <label class="form-label">地區 (縣市)</label>
                            <div class="select-wrapper">
                                <select class="form-select" id="wiz-manual-county">
                                    </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">聯絡人姓名 *</label>
                            <input type="text" class="form-input" id="wiz-manual-contact">
                        </div>
                        <div class="form-group">
                            <label class="form-label">電話/手機</label>
                            <input type="text" class="form-input" id="wiz-manual-phone">
                        </div>
                    </div>
                </div>
            </div>

            <div class="wizard-step-content" data-step="2" style="display: none;">
                <div class="alert alert-info" id="wiz-step2-summary" style="margin-bottom: 20px;">
                    </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">機會種類 *</label>
                        <div class="select-wrapper">
                            <select class="form-select" id="wiz-opp-type" onchange="NewOppWizard.autoGenerateName()">
                                </select>
                        </div>
                    </div>
                     <div class="form-group">
                        <label class="form-label">機會名稱 *</label>
                        <input type="text" class="form-input" id="wiz-opp-name" placeholder="系統將自動生成，可修改">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">機會來源</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="wiz-opp-source">
                            </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">預計結案日</label>
                        <input type="date" class="form-input" id="wiz-close-date">
                    </div>
                    <div class="form-group">
                        <label class="form-label">預計金額</label>
                        <input type="text" class="form-input" id="wiz-value" placeholder="選填">
                    </div>
                </div>
            </div>

            <div class="wizard-step-content" data-step="3" style="display: none;">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">負責業務</label>
                        <div class="select-wrapper">
                            <select class="form-select" id="wiz-assignee">
                                </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">目前階段</label>
                        <div class="select-wrapper">
                            <select class="form-select" id="wiz-stage">
                                </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">備註</label>
                    <textarea class="form-textarea" id="wiz-notes" rows="3"></textarea>
                </div>

                <div class="summary-card" style="margin-top: 20px; background: var(--glass-bg); border: 1px solid var(--accent-blue);">
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 5px;">即將建立</div>
                    <div style="text-align: center; font-weight: 700; font-size: 1.1rem; color: var(--text-primary);" id="wiz-final-preview">
                        </div>
                </div>
            </div>

            <div class="wizard-footer">
                <button type="button" class="action-btn secondary" id="wiz-btn-prev" onclick="NewOppWizard.prevStep()" style="display: none;">&lt; 上一步</button>
                <span id="wiz-btn-spacer" style="flex-grow: 1;"></span> 
                
                <button type="button" class="action-btn primary" id="wiz-btn-next" onclick="NewOppWizard.nextStep()">下一步 &gt;</button>
                <button type="submit" class="action-btn primary" id="wiz-btn-submit" style="display: none;">✅ 建立機會</button>
            </div>
        </form>
    </div>
</div>

<div id="edit-opportunity-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">✏️ 編輯機會案件</h2>
            <button class="close-btn" onclick="closeModal('edit-opportunity-modal')">&times;</button>
        </div>
        <form id="edit-opportunity-form">
            <input type="hidden" id="edit-opportunity-rowIndex">

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">機會名稱 *</label>
                    <input type="text" class="form-input" id="edit-opportunity-name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">機會種類</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-opportunity-type">
                            <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">客戶公司</label>
                    <input type="text" class="form-input" id="edit-customer-company" disabled>
                </div>
                <div class="form-group">
                    <label class="form-label">公司所在縣市</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-company-county">
                            <option value="">讀取中...</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">主要聯絡人</label>
                    <input type="text" class="form-input" id="edit-main-contact" disabled>
                </div>
                 <div class="form-group">
                    <label class="form-label">機會來源</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-opportunity-source">
                            <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">目前階段</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-current-stage">
                           <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">負責業務</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-assignee">
                            <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">結案日期</label> 
                    <input type="date" class="form-input" id="edit-expected-close-date">
                </div>
                <div class="form-group">
                    <label class="form-label">機會價值</label>
                    <input type="text" class="form-input" id="edit-opportunity-value" placeholder="如: 1,000,000">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">備註</label>
                <textarea class="form-textarea" id="edit-opportunity-notes"></textarea>
            </div>

            <button type="submit" class="submit-btn" style="background: #ffc107; color: #212529;">💾 儲存編輯</button>
        </form>
    </div>
</div>

<div id="kanban-expand-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="kanban-expand-title"></h2>
            <button class="close-btn" onclick="closeModal('kanban-expand-modal')">&times;</button>
        </div>
        <div id="kanban-expand-content" class="widget-content">
            <div class="loading show"><div class="spinner"></div></div>
        </div>
    </div>
</div>
</file>

<file path="public/scripts/opportunities/details/opportunity-associated-contacts.js">
// views/scripts/opportunity-details/associated-contacts.js
/**
 * ============================================================================
 * File: public/scripts/opportunities/details/opportunity-associated-contacts.js
 * Version: v8.0.3 (Phase 8 UI Annotation)
 * Date: 2026-02-10
 * Author: Gemini (Assisted)
 *
 * Change Log:
 * - [Phase 8] Comment-only semantic clarification.
 * - [Phase 8] Added World Model Annotation for Relationship Ownership.
 * - Confirmed no rowIndex usage in Linkage logic.
 *
 * * WORLD MODEL (RELATIONSHIP LAYER):
 * 1. Opportunity-Contact Linkage:
 * - Owned by Opportunity.
 * - Stored in Link Table (SQL).
 * - Contact Table does NOT store opportunityId.
 * * 2. Contact Types:
 * - CORE Contact: The entity actually being linked via `contactId`.
 * - RAW Data (Card): Used only as visual reference or source for upgrading.
 * * 3. Actions:
 * - Link: Creates entry in opportunity_contact_links.
 * - Unlink: Deletes entry from opportunity_contact_links.
 * - Set Main: Updates `main_contact` field on Opportunity Table.
 *
 * * WARNING (API USAGE):
 * - This module uses `/api/contacts` which returns RAW / Potential contacts.
 * - Be careful not to treat RAW results as CORE contacts for linking.
 * - Linking requires a valid `contactId`, which RAW contacts may lack.
 * ============================================================================
 */
// 職責：專門管理「關聯聯絡人」區塊的所有 UI 與功能

const OpportunityContacts = (() => {
    // 模組私有變數
    let _opportunityInfo = null;
    let _linkedContacts = [];

    // 處理儲存編輯後的聯絡人資料
    async function _handleSaveContact(event) {
        event.preventDefault();
        const contactId = document.getElementById('edit-contact-id').value;
        const updateData = {
            department: document.getElementById('edit-contact-department').value,
            position: document.getElementById('edit-contact-position').value,
            mobile: document.getElementById('edit-contact-mobile').value,
            phone: document.getElementById('edit-contact-phone').value,
            email: document.getElementById('edit-contact-email').value,
        };

        showLoading('正在儲存聯絡人資料...');
        try {
            const result = await authedFetch(`/api/contacts/${contactId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            if (result.success) {
                // 【*** 移除衝突 ***】
                // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                // showNotification('聯絡人資料更新成功！', 'success');
                document.getElementById('edit-contact-modal-container').remove();
                // await loadOpportunityDetailPage(_opportunityInfo.opportunityId); // 重新載入主頁面
                // 【*** 移除結束 ***】
            } else {
                throw new Error(result.error || '儲存失敗');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`儲存失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 【新增】處理最終的名片連結 API 呼叫
    async function _handleLinkBusinessCard(contactId, businessCard) {
        const confirmMsg = `您確定要將 ${businessCard.name} (${businessCard.company}) 的名片資料，歸檔至這位聯絡人嗎？\n\n現有聯絡人的資料將會被名片上的資訊補充或覆蓋。`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在歸檔與連結名片...');
            try {
                const result = await authedFetch(`/api/contacts/${contactId}/link-card`, {
                    method: 'POST',
                    body: JSON.stringify({ businessCardRowIndex: businessCard.rowIndex })
                });

                if (result.success) {
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('名片歸檔成功！', 'success');
                    closeModal('link-business-card-modal'); // 確保關閉的是歸檔 modal
                    // await loadOpportunityDetailPage(_opportunityInfo.opportunityId);
                    // 【*** 移除結束 ***】
                } else {
                    throw new Error(result.error || '歸檔失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`歸檔失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }

    // 【新增】處理關聯現有聯絡人 (Phase 8 Repair)
    async function _handleLinkExistingContact(opportunityId, contact) {
        const confirmMsg = `確定要將「${contact.name}」(${contact.company || '無公司'}) 關聯至此機會嗎？`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在關聯聯絡人...');
            try {
                // 使用純 contactId 進行關聯，不依賴 rowIndex
                const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts`, {
                    method: 'POST',
                    body: JSON.stringify({ contactId: contact.contactId })
                });

                if (result.success) {
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('聯絡人關聯成功！', 'success');
                    closeModal('link-contact-modal');
                    // await loadOpportunityDetailPage(opportunityId);
                    // 【*** 移除結束 ***】
                } else {
                    throw new Error(result.error || '關聯失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }


    // 渲染主列表
    function _render() {
        const container = document.getElementById('associated-contacts-list');
        if (!_linkedContacts || _linkedContacts.length === 0) {
            container.innerHTML = '<div class="alert alert-info">此機會尚無關聯聯絡人。</div>';
            return;
        }

        let tableHTML = `<table class="data-table"><thead><tr><th>姓名</th><th>公司</th><th>職位</th><th>聯絡方式</th><th>角色/來源</th><th>操作</th></tr></thead><tbody>`;
        _linkedContacts.forEach(contact => {
            const isMainContact = (contact.name === _opportunityInfo.mainContact);
            const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;");
            
            let actionButtons = `<button class="action-btn small warn" onclick='OpportunityContacts.showEditModal(${contactJsonString})'>✏️ 編輯</button>`;
            
            const isManual = !contact.sourceId || contact.sourceId === 'MANUAL';
            if (isManual) {
                actionButtons += `<button class="action-btn small info" onclick="OpportunityContacts.showLinkBusinessCardModal('${contact.contactId}')" title="將掃描的名片資料歸檔至此聯絡人">🔗 名片歸檔</button>`;
            } else if (contact.driveLink) {
                // 【修改】將 a href 連結改為 onclick 按鈕
                const safeDriveLink = contact.driveLink.replace(/'/g, "\\'");
                actionButtons += `<button class="action-btn small info" title="預覽名片" onclick="showBusinessCardPreview('${safeDriveLink}')">💳 名片</button>`;
                // 【修改結束】
            }

            if (!isMainContact) {
                const newMainContactName = contact.name.replace(/'/g, "\\'");
                // [Phase 8] Update: Removed rowIndex from parameters, only use opportunityId
                actionButtons += `<button class="action-btn small primary" style="background: var(--accent-green);" onclick="OpportunityContacts.setAsMain('${_opportunityInfo.opportunityId}', '${newMainContactName}')">👑 設為主要</button>`;
                
                // 【修改】將「刪除關聯」按鈕改為只有垃圾桶圖示
                actionButtons += `<button class="action-btn small danger" onclick="OpportunityContacts.unlink('${_opportunityInfo.opportunityId}', '${contact.contactId}', '${contact.name}')" title="刪除關聯">🗑️</button>`;
            }

            const roleAndSource = isMainContact 
                ? '<span class="card-tag assignee">主要聯絡人</span>' 
                : '一般聯絡人';
            
            const sourceText = isManual 
                ? '<span style="font-size: 0.75rem; color: var(--text-muted); display: block;">(手動建立)</span>' 
                : '<span style="font-size: 0.75rem; color: var(--text-muted); display: block;">(來自名片)</span>';

            tableHTML += `
                <tr>
                    <td data-label="姓名"><strong>${contact.name}</strong></td>
                    <td data-label="公司">${contact.companyName || '-'}</td>
                    <td data-label="職位">${contact.position || '-'}</td>
                    <td data-label="聯絡方式">${contact.mobile || contact.phone || '-'}</td>
                    <td data-label="角色/來源">${roleAndSource}${sourceText}</td>
                    <td data-label="操作">
                        <div class="action-buttons-container">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    }

    // --- 公開方法 ---

    // 【新增】顯示連結聯絡人的 Modal (Phase 8 Repair)
    function showLinkContactModal(opportunityId) {
        const existingModal = document.getElementById('link-contact-modal');
        if (existingModal) existingModal.remove();

        // 動態建立 Modal HTML
        const modalHTML = `
            <div id="link-contact-modal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🔗 關聯現有聯絡人</h2>
                        <button class="close-btn" onclick="closeModal('link-contact-modal')">&times;</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">搜尋聯絡人</label>
                        <input type="text" class="form-input" id="search-link-contact-input" placeholder="輸入姓名或公司進行搜尋...">
                    </div>
                    <div id="link-contact-results" class="search-result-list" style="max-height: 350px; overflow-y: auto;">
                        <div class="alert alert-info">請輸入關鍵字開始搜尋</div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-container').insertAdjacentHTML('beforeend', modalHTML);

        const searchInput = document.getElementById('search-link-contact-input');
        const resultsContainer = document.getElementById('link-contact-results');
        
        const performSearch = async (query) => {
            if (!query) {
                resultsContainer.innerHTML = '<div class="alert alert-info">請輸入關鍵字</div>';
                return;
            }
            resultsContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            try {
                // 呼叫現有 API 搜尋聯絡人
                // [WARNING: RAW / POTENTIAL API]
                // This call hits `/api/contacts` which returns RAW / Potential contacts (Sheet-based).
                // RAW contacts usually lack a stable `contactId`.
                // If you intend to link CORE contacts, use `/api/contacts/list`.
                // Results from here MUST NOT be treated as CORE unless validated.
                const result = await authedFetch(`/api/contacts?q=${encodeURIComponent(query)}`);
                const contacts = result.data || [];

                if (contacts.length > 0) {
                    resultsContainer.innerHTML = contacts.map(contact => {
                        const contactJson = JSON.stringify(contact).replace(/'/g, "&apos;");
                        // 排除已升級或歸檔的檢查視需求而定，此處僅列出所有搜尋結果
                        return `
                            <div class="kanban-card" style="cursor: pointer;" onclick='OpportunityContacts._handleLinkExistingContact("${opportunityId}", ${contactJson})'>
                                <div class="card-title">${contact.name}</div>
                                <div class="card-company">${contact.company || '無公司'} - ${contact.position || '職位未知'}</div>
                            </div>`;
                    }).join('');
                } else {
                    resultsContainer.innerHTML = '<div class="alert alert-info">找不到符合的聯絡人</div>';
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') resultsContainer.innerHTML = `<div class="alert alert-error">搜尋失敗: ${error.message}</div>`;
            }
        };

        searchInput.addEventListener('keyup', (e) => handleSearch(() => performSearch(e.target.value)));
        searchInput.focus();
    }

    // 【新增】顯示連結名片的 Modal
    function showLinkBusinessCardModal(contactId) {
        const existingModal = document.getElementById('link-business-card-modal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="link-business-card-modal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🔗 連結名片歸檔</h2>
                        <button class="close-btn" onclick="closeModal('link-business-card-modal')">&times;</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">搜尋待處理的名片</label>
                        <input type="text" class="form-input" id="search-business-card-input" placeholder="輸入姓名或公司進行搜尋...">
                    </div>
                    <div id="business-card-results" class="search-result-list" style="max-height: 350px; overflow-y: auto;">
                        <div class="loading show"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-container').insertAdjacentHTML('beforeend', modalHTML);

        const searchInput = document.getElementById('search-business-card-input');
        const resultsContainer = document.getElementById('business-card-results');
        
        const performSearch = async (query) => {
            resultsContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            try {
                // [INFO: RAW / POTENTIAL API]
                // This search targets the RAW / Potential pool.
                // This is INTENTIONAL here, as we are looking for a RAW Card (image source)
                // to link to an existing CORE Contact.
                const result = await authedFetch(`/api/contacts?q=${encodeURIComponent(query)}`);
                const pendingCards = (result.data || []).filter(c => c.status !== '已升級' && c.status !== '已歸檔');

                if (pendingCards.length > 0) {
                    resultsContainer.innerHTML = pendingCards.map(card => {
                        const cardJson = JSON.stringify(card).replace(/'/g, "&apos;");
                        return `
                            <div class="kanban-card" style="cursor: pointer;" onclick='OpportunityContacts._handleLinkBusinessCard("${contactId}", ${cardJson})'>
                                <div class="card-title">${card.name}</div>
                                <div class="card-company">${card.company} - ${card.position || '職位未知'}</div>
                            </div>`;
                    }).join('');
                } else {
                    resultsContainer.innerHTML = '<div class="alert alert-info">找不到待處理的名片</div>';
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') resultsContainer.innerHTML = '<div class="alert alert-error">搜尋失敗</div>';
            }
        };

        searchInput.addEventListener('keyup', (e) => handleSearch(() => performSearch(e.target.value)));
        performSearch(''); // 初始載入所有待處理名片
    }

    // 顯示編輯聯絡人的彈出視窗
    function showEditModal(contact) {
        const oldModal = document.getElementById('edit-contact-modal-container');
        if (oldModal) oldModal.remove();

        const modalContainer = document.createElement('div');
        modalContainer.id = 'edit-contact-modal-container';
        
        modalContainer.innerHTML = `
            <div id="edit-contact-modal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">編輯聯絡人: ${contact.name}</h2>
                        <button class="close-btn" onclick="document.getElementById('edit-contact-modal-container').remove()">&times;</button>
                    </div>
                    <form id="edit-opp-contact-form">
                        <input type="hidden" id="edit-contact-id" value="${contact.contactId}">
                        <div class="form-row">
                            <div class="form-group"><label class="form-label">部門</label><input type="text" class="form-input" id="edit-contact-department" value="${contact.department || ''}"></div>
                            <div classs="form-group"><label class="form-label">職位</label><input type="text" class="form-input" id="edit-contact-position" value="${contact.position || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label class="form-label">手機</label><input type="tel" class="form-input" id="edit-contact-mobile" value="${contact.mobile || ''}"></div>
                            <div class="form-group"><label class="form-label">公司電話</label><input type="tel" class="form-input" id="edit-contact-phone" value="${contact.phone || ''}"></div>
                        </div>
                        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="edit-contact-email" value="${contact.email || ''}"></div>
                        <div class="form-actions">
                            <button type="button" class="action-btn secondary" onclick="document.getElementById('edit-contact-modal-container').remove()">取消</button>
                            <button type="submit" class="action-btn primary">💾 儲存變更</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalContainer);
        document.getElementById('edit-opp-contact-form').addEventListener('submit', _handleSaveContact);
    }

    // 設定為主要聯絡人
    // [Phase 8] Update: Removed rowIndex, using opportunityId for update
    async function setAsMain(opportunityId, newMainContactName) {
        const confirmMsg = `確定要將「${newMainContactName}」設定為這個機會的主要聯絡人嗎？`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在更新主要聯絡人...');
            try {
                // [Phase 8] Fix: Use opportunityId in URL, not rowIndex
                const result = await authedFetch(`/api/opportunities/${opportunityId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ mainContact: newMainContactName })
                });
                if (result.success) {
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('主要聯絡人已更新', 'success');
                    // await loadOpportunityDetailPage(opportunityId);
                    // 【*** 移除結束 ***】
                } else {
                    throw new Error(result.error || '更新失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    showNotification(`更新失敗: ${error.message}`, 'error');
                }
            } finally {
                hideLoading();
            }
        });
    }

    // 解除關聯
    function unlink(opportunityId, contactId, contactName) {
        const message = `您確定要將聯絡人 "${contactName}" 從這個機會案件中移除關聯嗎？\n\n(注意：此操作將永久刪除這條關聯紀錄，但不會刪除聯絡人本身的檔案)`;
        showConfirmDialog(message, async () => {
            showLoading('正在刪除關聯...');
            try {
                const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts/${contactId}`, {
                    method: 'DELETE'
                });
                if (result.success) {
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('聯絡人關聯已刪除', 'success');
                    // await loadOpportunityDetailPage(opportunityId);
                    // 【*** 移除結束 ***】
                } else {
                    throw new Error(result.error || '刪除關聯失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    showNotification(`刪除關聯失敗: ${error.message}`, 'error');
                }
            } finally {
                hideLoading();
            }
        });
    }

    // 初始化模組
    function init(opportunityInfo, linkedContacts) {
        _opportunityInfo = opportunityInfo;
        _linkedContacts = linkedContacts;
        _render();
        
        // 綁定「+ 關聯聯絡人」按鈕的點擊事件
        const addBtn = document.getElementById('add-associated-contact-btn');
        if (addBtn) {
            addBtn.onclick = () => showLinkContactModal(_opportunityInfo.opportunityId);
        }
    }

    // 返回公開的 API
    return {
        init,
        showEditModal,
        setAsMain,
        unlink,
        showLinkBusinessCardModal, 
        _handleLinkBusinessCard,
        showLinkContactModal,    // 新增公開
        _handleLinkExistingContact // 新增公開，供 onclick 使用
    };
})();

//Verification: setAsMain uses opportunityId only.
//No rowIndex usage remains in this file.
</file>

<file path="public/scripts/opportunities/details/opportunity-details-components.js">
// ============================================================================
// File: public/scripts/opportunities/details/opportunity-details-components.js
// ============================================================================
// public/scripts/opportunity-details/opportunity-details-components.js
// 職責：整合機會詳細頁面組件，處理編輯邏輯與資料存取
// * @version 1.1.2 (Phase 8.6A Perf Patch)
// * @date 2026-03-11
// (依賴 OpportunityInfoView 進行顯示模式渲染)

function _injectStylesForOppInfoCard() {
    const styleId = 'opportunity-info-card-container-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 容器基礎樣式 */
        .opportunity-info-card {
            background-color: var(--secondary-bg);
            padding: var(--spacing-6);
            border-radius: var(--rounded-xl);
            border: 1px solid var(--border-color);
            margin-bottom: var(--spacing-6);
            transition: all 0.3s ease;
        }
        /* 編輯模式專用樣式 (保留原本邏輯) */
        .info-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .editing .info-card-header {
            padding-bottom: var(--spacing-4);
            margin-bottom: var(--spacing-4);
            border-bottom: 1px solid var(--border-color);
        }
        .edit-form-columns { display: flex; gap: var(--spacing-8); align-items: flex-start; }
        .form-col { flex: 1; display: flex; flex-direction: column; gap: var(--spacing-5); min-width: 0; }
        @media (max-width: 900px) { .edit-form-columns { flex-direction: column; gap: var(--spacing-6); } }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 500; }
        .form-input, .form-select, .form-textarea {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: var(--rounded-md);
            background: var(--primary-bg);
            color: var(--text-primary);
            font-size: var(--font-size-base);
        }
        .form-input:read-only, .form-select:disabled, .form-input:disabled { 
            background-color: var(--secondary-bg); 
            cursor: not-allowed; 
            opacity: 0.7; 
            color: var(--text-muted); 
            border-color: var(--border-color);
        }
        .pills-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .info-option-pill {
            padding: 6px 14px; border-radius: var(--rounded-full); font-size: 0.85rem; border: 1px solid var(--border-color);
            cursor: pointer; background: var(--primary-bg); color: var(--text-muted); transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 6px; user-select: none;
        }
        .info-option-pill:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
        .info-option-pill.selected {
            background: color-mix(in srgb, var(--accent-blue) 15%, transparent); color: var(--accent-blue);
            border-color: var(--accent-blue); font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .pill-quantity { display: inline-block; padding: 0px 6px; font-size: 0.75rem; font-weight: 700; background-color: var(--accent-blue); color: white; border-radius: var(--rounded-md); }
        .spec-category-group { margin-bottom: 8px; }
        .spec-category-title { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }
        .spec-pills-wrapper { display: flex; flex-wrap: wrap; gap: 8px; }
        .manual-override-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; margin-top: 4px; }
        .notes-section { margin-top: var(--spacing-6); padding-top: var(--spacing-4); border-top: 1px solid var(--border-color); }
    `;
    document.head.appendChild(style);
}

const OpportunityInfoCard = (() => {
    let _currentOpp = null;
    let _isCascadingInitialized = false; // [Phase 8.6A] Lazy Load Tracker

    async function _getCompanyList() {
        if (window.CRM_APP && window.CRM_APP.companyList && window.CRM_APP.companyList.length > 0) return window.CRM_APP.companyList;
        try {
            const response = await authedFetch('/api/companies');
            if (response.success) {
                if (window.CRM_APP) window.CRM_APP.companyList = response.data;
                return response.data;
            }
        } catch (e) { console.error('獲取公司列表失敗', e); }
        return [];
    }

    function render(opp) {
        _currentOpp = opp;
        _isCascadingInitialized = false; // Reset on re-render

        _injectStylesForOppInfoCard();
        const container = document.getElementById('opportunity-info-card-container');
        if (!container) return;

        // 【修改點】直接呼叫 OpportunityInfoView 來產生顯示模式 HTML
        const displayModeHtml = OpportunityInfoView 
            ? OpportunityInfoView.render(opp) 
            : '<div class="alert alert-error">View Module Missing</div>';

        container.innerHTML = `
            <div id="opportunity-info-display-mode">
                ${displayModeHtml}
            </div>
            <div id="opportunity-info-edit-mode" style="display: none;">
                </div>
        `;

        // 預先生成編輯表單，以便切換時使用
        _generateEditFormHTML(opp).then(html => {
            const editContainer = document.getElementById('opportunity-info-edit-mode');
            if (editContainer) {
                editContainer.innerHTML = html;
                // [Phase 8.6A PERF] Removed eager _initCascadingLogic(opp) to prevent duplicate companyList fetch.
            }
        });
    }

    // [Phase 8.6A PERF] Lazy Initialization Entry Point
    async function ensureCascadingLogic(opp) {
        if (_isCascadingInitialized) return;
        await _initCascadingLogic(opp);
        _isCascadingInitialized = true;
    }

    // ================== 以下為編輯模式邏輯 ==================

    function _renderPillsGroup(configKey, currentValue, fieldId) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const options = systemConfig[configKey] || [];
        
        let pillsHtml = '';
        options.forEach(opt => {
            const isSelected = opt.value === currentValue;
            pillsHtml += `
                <span class="info-option-pill single-select ${isSelected ? 'selected' : ''}" 
                      data-value="${opt.value}" 
                      data-field-target="${fieldId}"
                      onclick="OpportunityInfoCardEvents.handleSingleSelectClick(this)">
                    ${opt.note || opt.value}
                </span>
            `;
        });
        
        return `
            <div class="pills-container single-select-container">
                ${pillsHtml}
                <input type="hidden" id="edit-${fieldId}" value="${currentValue || ''}">
            </div>
        `;
    }

    function _renderCustomPillsGroup(options, currentValue, fieldId, clickHandler) {
        let pillsHtml = '';
        options.forEach(opt => {
            const isSelected = opt === currentValue;
            pillsHtml += `
                <span class="info-option-pill single-select ${isSelected ? 'selected' : ''}" 
                      data-value="${opt}" 
                      data-field-target="${fieldId}"
                      onclick="${clickHandler}(this)">
                    ${opt}
                </span>
            `;
        });
        
        return `
            <div class="pills-container single-select-container">
                ${pillsHtml}
                <input type="hidden" id="edit-${fieldId}" value="${currentValue || ''}">
            </div>
        `;
    }

    function _renderSpecsGroup(opp) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const specsConfig = systemConfig['可能下單規格'] || [];
        
        let specQuantities = new Map();
        try {
            const parsed = JSON.parse(opp.potentialSpecification);
            if (parsed && typeof parsed === 'object') specQuantities = new Map(Object.entries(parsed));
        } catch (e) {}

        const groups = new Map();
        specsConfig.forEach(spec => {
            const cat = spec.category || '其他';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(spec);
        });

        let html = '<div id="spec-pills-container" class="form-group">';
        groups.forEach((items, category) => {
            let pillsHtml = '';
            items.forEach(spec => {
                const quantity = specQuantities.get(spec.value) || 0;
                const isSelected = specQuantities.has(spec.value);
                let qtyHtml = '';
                if (isSelected && spec.value3 === 'allow_quantity' && quantity > 0) {
                    qtyHtml = `<span class="pill-quantity" data-spec-id="${spec.value}">(x${quantity})</span>`;
                }
                pillsHtml += `
                    <span class="info-option-pill ${isSelected ? 'selected' : ''}" 
                          data-spec-id="${spec.value}" 
                          title="${spec.note}">
                        ${spec.note || spec.value}
                        ${qtyHtml}
                    </span>
                `;
            });
            html += `
                <div class="spec-category-group">
                    <div class="spec-category-title">▼ ${category}</div>
                    <div class="spec-pills-wrapper">${pillsHtml}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    async function _generateEditFormHTML(opp) {
        const salesModel = opp.salesModel || '直接販售';
        const isManualValue = opp.opportunityValueType === 'manual';
        
        const rawValue = opp.opportunityValue;
        const formattedValue = String(rawValue !== null && rawValue !== undefined ? rawValue : '0').replace(/,/g, '');
        
        const salesModelOptions = ['直接販售', '經由SI販售', '經由MTB販售'];
        
        const createdDate = opp.createdTime ? opp.createdTime.split('T')[0] : '';
        const expectedDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '';

        const initSalesChannel = opp.salesChannel || opp.channelDetails || '';

        return `
            <div class="info-card-header">
                <h2 class="widget-title" style="margin: 0;">編輯核心資訊</h2>
                <div style="display: flex; gap: 8px;">
                    <button class="action-btn small secondary" onclick="OpportunityInfoCardEvents.toggleEditMode(false)">取消</button>
                    <button class="action-btn small primary" onclick="OpportunityInfoCardEvents.save()">💾 儲存</button>
                </div>
            </div>

            <div class="edit-form-columns">
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">機會名稱</label>
                        <input type="text" id="edit-opportunity-name" class="form-input" value="${opp.opportunityName || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">銷售模式</label>
                        ${_renderCustomPillsGroup(salesModelOptions, salesModel, 'sales-model', 'OpportunityInfoCardEvents.handleSalesModelPillClick')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">終端客戶 (客戶公司)</label>
                        <select id="edit-customer-company" class="form-select" onchange="OpportunityInfoCardEvents.handleCustomerChange(this.value)">
                            <option value="">載入中...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">終端窗口 (聯絡人)</label>
                        <select id="edit-main-contact" class="form-select">
                            <option value="">載入中...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">主要通路/下單方 (公司選擇)</label>
                        <select id="edit-channel-details" class="form-select" onchange="OpportunityInfoCardEvents.handleChannelChange(this.value)">
                            <option value="">載入中...</option>
                        </select>
                        <input type="hidden" id="edit-sales-channel" value="${initSalesChannel}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">通路窗口 (聯絡人)</label>
                        <select id="edit-channel-contact" class="form-select">
                            <option value="">-- 請先選擇通路公司 --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會價值</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="text" id="edit-opportunity-value" class="form-input" 
                                   value="${formattedValue}" ${isManualValue ? '' : 'disabled'} style="flex:1;">
                        </div>
                        <label class="manual-override-label">
                            <input type="checkbox" id="value-manual-override-checkbox" 
                                   onchange="OpportunityInfoCardEvents.handleManualOverride(this)"
                                   ${isManualValue ? 'checked' : ''}>
                            手動覆蓋自動計算
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="form-label">負責業務</label>
                        ${_renderPillsGroup('團隊成員', opp.assignee, 'assignee')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會種類</label>
                        ${_renderPillsGroup('機會種類', opp.opportunityType, 'opportunity-type')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">設備規模</label>
                        ${_renderPillsGroup('設備規模', opp.deviceScale, 'device-scale')}
                    </div>
                </div>

                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">下單機率</label>
                        ${_renderPillsGroup('下單機率', opp.orderProbability, 'order-probability')}
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">建立機會日期</label>
                        <input type="date" id="edit-created-time" class="form-input" 
                               value="${createdDate}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">預計結案日</label>
                        <input type="date" id="edit-expected-close-date" class="form-input" 
                               value="${expectedDate}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">目前階段</label>
                        ${_renderPillsGroup('機會階段', opp.currentStage, 'current-stage')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會來源</label>
                        ${_renderPillsGroup('機會來源', opp.opportunitySource, 'opportunity-source')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">可能下單規格 (複選)</label>
                        ${_renderSpecsGroup(opp)}
                    </div>
                </div>
            </div>

            <div class="notes-section">
                <div class="form-group">
                    <label class="form-label">備註</label>
                    <textarea id="edit-notes" class="form-textarea" rows="3">${opp.notes || ''}</textarea>
                </div>
            </div>
        `;
    }

    async function _initCascadingLogic(opp) {
        const companies = await _getCompanyList();
        
        // 1. 初始化「終端客戶」下拉選單
        const customerSelect = document.getElementById('edit-customer-company');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">-- 請選擇 --</option>';
            companies.forEach(c => {
                const option = document.createElement('option');
                option.value = c.companyName;
                option.text = c.companyName;
                if (c.companyName === opp.customerCompany) option.selected = true;
                customerSelect.add(option);
            });
        }

        // 3. 連動邏輯 (銷售模式 -> 通路列表)
        await handleSalesModelChange(opp.salesModel || '直接販售', false);
    }

    async function handleSalesModelChange(modelValue, resetValue = true) {
        const channelSelect = document.getElementById('edit-channel-details');
        const channelContactSelect = document.getElementById('edit-channel-contact');
        const customerSelect = document.getElementById('edit-customer-company');
        
        if (!channelSelect || !customerSelect) return;

        const currentCustomer = customerSelect.value;
        const savedChannelDetails = _currentOpp ? (_currentOpp.channelDetails || '') : '';
        const companies = await _getCompanyList();
        
        channelSelect.innerHTML = '';
        
        if (modelValue === '直接販售') {
            const option = document.createElement('option');
            option.value = currentCustomer;
            option.text = currentCustomer ? `${currentCustomer} (直販)` : '-- 同終端客戶 --';
            option.selected = true;
            channelSelect.add(option);
            
            channelSelect.disabled = true; 

            if (channelContactSelect) {
                channelContactSelect.innerHTML = '<option value="">-- 不適用 --</option>';
                channelContactSelect.disabled = true;
            }

        } else {
            channelSelect.disabled = false;

            const typeKeyword = modelValue.includes('SI') ? 'SI' : (modelValue.includes('MTB') ? 'MTB' : '');
            let filteredCompanies = companies.filter(c => {
                const type = (c.companyType || c.type || '').toUpperCase();
                return type.includes(typeKeyword);
            });
            if (filteredCompanies.length === 0 && companies.length > 0) filteredCompanies = companies;

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.text = "-- 請選擇合作夥伴 --";
            channelSelect.add(defaultOption);

            filteredCompanies.forEach(c => {
                const option = document.createElement('option');
                option.value = c.companyName;
                option.text = c.companyName;
                
                if (!resetValue && c.companyName === savedChannelDetails) {
                    option.selected = true;
                }
                channelSelect.add(option);
            });
            
            if (!resetValue && savedChannelDetails && !filteredCompanies.some(c => c.companyName === savedChannelDetails)) {
                 const option = document.createElement('option');
                 option.value = savedChannelDetails;
                 option.text = savedChannelDetails + ' (非清單)';
                 option.selected = true;
                 channelSelect.add(option);
            }
            
            if (channelContactSelect && resetValue) {
                channelContactSelect.innerHTML = '<option value="">-- 請先選擇通路公司 --</option>';
                channelContactSelect.disabled = true; 
            }
        }
    }

    return { render, handleSalesModelChange, ensureCascadingLogic };
})();

// OpportunityAssociatedOpps 保持不變
const OpportunityAssociatedOpps = (() => {
    async function _handleRemoveParentLink(opportunityId, rowIndex) {
        showConfirmDialog('您確定要移除此母機會關聯嗎？', async () => {
            showLoading('正在移除關聯...');
            try {
                const result = await authedFetch(`/api/opportunities/${opportunityInfo.opportunityId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ parentOpportunityId: '', modifier: getCurrentUser() })
                });
                if (!result.success) throw new Error(result.error || '移除失敗');
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`移除關聯失敗: ${error.message}`, 'error');
            } finally { hideLoading(); }
        });
    }

    function render(details) {
        const container = document.getElementById('associated-opportunities-list');
        const addButton = document.getElementById('add-associated-opportunity-btn');
        if (!container || !addButton) return;
        const { opportunityInfo, parentOpportunity, childOpportunities } = details;
        let html = '';
        addButton.style.display = 'flex'; 
        addButton.onclick = () => showLinkOpportunityModal(opportunityInfo.opportunityId, opportunityInfo.rowIndex);
        if (parentOpportunity) {
            html += `<div class="summary-item" style="margin-bottom: 1rem;"><span class="summary-label">母機會</span><div style="display: flex; align-items: center; gap: 10px;"><span class="summary-value" style="font-size: 1rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${parentOpportunity.opportunityId}' })">${parentOpportunity.opportunityName}</a></span><button class="action-btn small danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="OpportunityAssociatedOpps._handleRemoveParentLink('${opportunityInfo.opportunityId}', ${opportunityInfo.rowIndex})" title="移除母機會關聯">移除</button></div></div>`;
            addButton.textContent = '✏️ 變更母機會';
        } else { addButton.textContent = '+ 設定母機會'; }
        if (childOpportunities && childOpportunities.length > 0) {
            html += `<div class="summary-item"><span class="summary-label">子機會 (${childOpportunities.length})</span></div><ul style="list-style: none; padding-left: 1rem; margin-top: 0.5rem;">`;
            childOpportunities.forEach(child => { html += `<li style="margin-bottom: 0.5rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${child.opportunityId}' })">${child.opportunityName}</a></li>`; });
            html += `</ul>`;
        }
        if (!parentOpportunity && (!childOpportunities || childOpportunities.length === 0)) html = '<div class="alert alert-info">尚無關聯機會。</div>';
        container.innerHTML = html;
    }
    return { render, _handleRemoveParentLink };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-event-reports.js">
// File: public/scripts/opportunities/details/opportunity-event-reports.js
// views/scripts/opportunity-details/event-reports.js
// 職責：專門管理「事件報告」頁籤的 UI 與功能，包含總覽模式與列表模式
// (V6 - 最終修復版：補回公開方法並整合全域樣式)

const OpportunityEvents = (() => {
    // 模組私有變數
    let _eventLogs = [];
    let _context = {}; // 儲存機會或公司的上下文資訊
    let _cachedContacts = []; // 儲存初始化時傳入的聯絡人資料，用於職稱補完

    /**
     * 【核心修正】：動態注入樣式。
     * 將原先位於 event-log-list.html 的 CSS 移至此處，
     * 解決「總覽模式」首次開啟時樣式走板的問題。
     */
    function _injectStyles() {
        const styleId = 'event-reports-unified-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- 總覽模式外層容器 --- */
            #event-logs-overview-view, [id^="event-logs-overview-view-"] {
                display: flex;
                flex-direction: column;
                gap: 20px;
                width: 100%;
            }

            /* --- 報告卡片核心結構 --- */
            .report-view { 
                background-color: var(--primary-bg);
                border-radius: var(--rounded-xl);
                overflow: hidden;
            }

            .report-header {
                --header-color: var(--accent-purple); 
                background: color-mix(in srgb, var(--header-color) 15%, var(--primary-bg));
                border: 1px solid color-mix(in srgb, var(--header-color) 30%, var(--border-color));
                padding: 20px 25px;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .report-title {
                font-size: 1.6rem; font-weight: 700; color: var(--text-primary);
                line-height: 1.3; margin-bottom: 15px; display: flex; align-items: center; gap: 12px;
            }

            .header-meta-info {
                display: flex; justify-content: space-between; font-size: 0.95rem;
                color: var(--text-secondary); padding-top: 12px;
                border-top: 1px solid color-mix(in srgb, var(--header-color) 20%, var(--border-color));
            }

            /* --- 內容區塊排版 --- */
            .report-container { display: flex; flex-direction: column; gap: 20px; }
            /* 保持您要求的左側 10% 內縮排版 */
            [id^="event-logs-overview-view-"] .report-container { padding-left: 10% !important; }

            .report-section {
                background: var(--card-bg); border: 1px solid var(--border-color);
                border-radius: 12px; padding: 24px; box-shadow: var(--shadow-sm);
            }

            .section-title {
                font-size: 1.2rem; font-weight: 700; color: var(--text-primary);
                margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);
                display: flex; align-items: center; gap: 8px;
            }

            /* --- 資訊欄位 Grid 佈局 --- */
            .info-item {
                display: grid; grid-template-columns: 140px 1fr; gap: 16px; padding: 12px 0; align-items: start; 
            }

            .info-label {
                font-weight: 600; color: var(--text-muted); font-size: 0.95rem;
                padding-top: 10px; text-align: right;
            }

            .info-value-box {
                background-color: var(--primary-bg); border: 1px solid var(--border-color);
                padding: 10px 12px; border-radius: 8px; min-height: 42px;
                color: var(--text-primary); font-size: 1rem; line-height: 1.6;
                white-space: pre-wrap; word-break: break-word;
            }

            /* --- 人員膠囊樣式 --- */
            .participants-wrapper { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
            .participant-pill {
                display: inline-flex; align-items: center; padding: 4px 12px;
                border-radius: 20px; font-size: 0.9rem; font-weight: 500;
                background-color: var(--secondary-bg); border: 1px solid var(--border-color);
            }
            .participant-pill.our-side {
                background-color: color-mix(in srgb, var(--accent-blue) 10%, var(--secondary-bg));
                color: var(--accent-blue);
            }
            .participant-pill.client-side {
                background-color: color-mix(in srgb, var(--accent-green) 10%, var(--secondary-bg));
                color: var(--accent-green);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 渲染初始視圖（列表模式）
     */
    function _render() {
        const container = _context.opportunityId 
            ? document.getElementById('tab-content-events') 
            : document.getElementById('tab-content-company-events');

        if (!container) return;

        const headerHtml = `
            <div class="widget-header">
                <h2 class="widget-title">相關事件報告</h2>
                <div style="display: flex; gap: 10px;">
                    ${(_eventLogs && _eventLogs.length > 0) ? `
                    <button id="toggle-overview-btn-${_context.id}" class="action-btn small secondary" 
                            onclick="OpportunityEvents.toggleOverview(true, '${_context.id}')">
                        總覽模式
                    </button>` : ''}
                    <button class="action-btn small primary" onclick="OpportunityEvents.showAddEventModal()">
                        📝 新增事件
                    </button>
                </div>
            </div>
        `;
        
        let listHtml = '';
        if (!_eventLogs || _eventLogs.length === 0) {
            listHtml = '<div class="alert alert-info">此處尚無相關的事件報告</div>';
        } else {
            listHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>建立時間</th>
                            <th>事件名稱</th>
                            <th>建立者</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>`;
            _eventLogs.forEach(log => {
                listHtml += `
                    <tr>
                        <td data-label="建立時間">${formatDateTime(log.createdTime)}</td>
                        <td data-label="事件名稱">${log.eventName || '(未命名)'}</td>
                        <td data-label="建立者">${log.creator || 'N/A'}</td>
                        <td data-label="操作">
                            <button class="action-btn small info" onclick="showEventLogReport('${log.eventId}')">
                                📄 查看報告
                            </button>
                        </td>
                    </tr>
                `;
            });
            listHtml += '</tbody></table>';
        }

        container.innerHTML = `
            <div class="dashboard-widget">
                ${headerHtml}
                <div class="widget-content">
                    <div id="event-logs-list-view-${_context.id}">${listHtml}</div>
                    <div id="event-logs-overview-view-${_context.id}" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    // --- 公開方法 (API) ---

    /**
     * 開啟新增事件 Modal
     */
    function showAddEventModal() {
        if (_context.opportunityId) {
            // [Refactor] Direct call to modal manager to pass full context (including customerCompany)
            // Bypassing events.js helper to respect module boundaries and ensure proper defaults
            if (typeof showEventLogFormModal === 'function') {
                showEventLogFormModal({ 
                    opportunityId: _context.opportunityId, 
                    opportunityName: _context.opportunityName || '',
                    customerCompany: _context.customerCompany || '' 
                });
            } else {
                console.error("showEventLogFormModal is not defined");
            }
        } else if (_context.companyId) {
            if (typeof showEventLogFormModal === 'function') {
                showEventLogFormModal({ companyId: _context.companyId, companyName: _context.companyName });
            }
        }
    }

    /**
     * 切換列表模式與總覽模式
     */
    async function toggleOverview(showOverview, contextId) {
        const listView = document.getElementById(`event-logs-list-view-${contextId}`);
        const overviewView = document.getElementById(`event-logs-overview-view-${contextId}`);
        const toggleBtn = document.getElementById(`toggle-overview-btn-${contextId}`);

        if (!listView || !overviewView) return;

        if (showOverview) {
            listView.style.display = 'none';
            overviewView.style.display = 'flex';
            overviewView.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入報告總覽中...</p></div>';
            
            toggleBtn.textContent = '返回列表';
            toggleBtn.setAttribute('onclick', `OpportunityEvents.toggleOverview(false, '${contextId}')`);

            // 使用 setTimeout 確保 DOM 狀態穩定並應用新注入的樣式
            setTimeout(() => {
                if (typeof renderEventLogReportHTML === 'function') {
                    if (_eventLogs && _eventLogs.length > 0) {
                        const allReportsHtml = _eventLogs.map(log => {
                            const logData = { ...log };
                            // 補上上下文名稱
                            if (_context.opportunityId) {
                                logData.opportunityName = logData.opportunityName || _context.opportunityName;
                            }
                            // 傳入已有的聯絡人資料，確保總覽中的職稱能正確顯示
                            return renderEventLogReportHTML(logData, _cachedContacts);
                        }).join('');
                        
                        overviewView.innerHTML = allReportsHtml;
                    } else {
                        overviewView.innerHTML = '<div class="alert alert-info">此處尚無相關的事件報告</div>';
                    }
                } else {
                    overviewView.innerHTML = '<div class="alert alert-error">報告渲染引擎載入失敗，請重新整理頁面。</div>';
                }
            }, 50);

        } else {
            listView.style.display = 'block';
            overviewView.style.display = 'none';
            toggleBtn.textContent = '總覽模式';
            toggleBtn.setAttribute('onclick', `OpportunityEvents.toggleOverview(true, '${contextId}')`);
        }
    }

    /**
     * 模組初始化
     * @param {Array} eventLogs - 事件日誌陣列
     * @param {Object} context - 上下文 (包含 opportunityId 或 companyId)
     */
    function init(eventLogs, context) {
        _eventLogs = eventLogs || [];
        _context = { 
            ...context, 
            id: context.opportunityId || context.companyId 
        };
        // 重要：儲存從詳細頁傳入的聯絡人資訊 (包含各員之職稱)
        _cachedContacts = context.linkedContacts || []; 

        _injectStyles();
        _render();
    }

    // 回傳公開介面
    return {
        init: init,
        toggleOverview: toggleOverview,
        showAddEventModal: showAddEventModal // 修復點：公開此函式以供 onclick 使用
    };
})();

// [Fix] Explicitly expose to window so inline onclick handlers (e.g., in _render) can access it
window.OpportunityEvents = OpportunityEvents;
</file>

<file path="public/scripts/opportunities/details/opportunity-info-view.js">
// public/scripts/opportunities/details/opportunity-info-view.js
// -------------------------------------------------------------------------
// 檔案職責：專門負責「機會核心資訊」的純顯示模式 (Read-Only UI)
// UI 風格：Final Polish + Bento Grid Optimization
// 修改紀錄：[2026-03-02] Phase 8 Patch: 
// 1. Safe JSON parsing for specifications to prevent console warnings
// 2. Support both Object and String formats for potentialSpecification
// -------------------------------------------------------------------------

const OpportunityInfoView = (() => {

    function _injectStyles() {
        const styleId = 'opportunity-info-view-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- 基礎容器 --- */
            .opp-view-container {
                display: flex;
                flex-direction: column;
                gap: 16px; /* 統一主要間距 */
                width: 100%;
                box-sizing: border-box;
                position: relative;
            }

            /* --- 全域區塊標題 --- */
            .main-section-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-muted);
                margin-bottom: -8px;
                margin-left: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            /* 中間插入的標題間距 */
            .mid-section-title {
                margin-top: 4px;
                margin-bottom: -8px;
            }

            /* --- 通用卡片基底 (應用 Bento 圓角與互動) --- */
            .layer-card {
                background-color: var(--primary-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 2px 4px rgba(0,0,0,0.04); /* 柔和初始陰影 */
                padding: 20px;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            
            /* ★ Bento Style: 懸停浮起效果 */
            .layer-card:hover {
                transform: translateY(-3px); 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
            }
            
            /* 針對沒有 Padding 的 split card 移除 hover 效果，避免衝突 */
            .card-split-royal-blue:hover {
                transform: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            }

            /* 統一標題樣式 (預設灰色) */
            .unified-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1.2;
            }

            /* 內部卡片標題 (預設灰色) */
            .inner-card-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* ==========================================================================
               Row 1: 頂部資訊列
               ========================================================================== */
            .header-separate-row {
                display: flex;
                gap: 16px; /* 統一間距 */
                align-items: stretch;
                width: 100%;
            }
            .header-card-name {
                flex: 70; 
                justify-content: center;
                align-items: flex-start;
                gap: 6px;
                padding: 20px 24px;
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
            }
            .header-card-name:hover {
                transform: translateY(-3px); /* 跟隨 Bento 效果 */
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .name-title {
                font-size: 1.8rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.2;
                margin: 0;
            }
            .header-card-mini {
                flex: 10;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 12px 4px;
                gap: 4px;
                min-width: 0;
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
            }
            .header-card-mini:hover {
                transform: translateY(-3px); /* 跟隨 Bento 效果 */
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .header-card-action-btn {
                flex: 10;
                align-items: center;
                justify-content: center;
                padding: 0;
                /* 保持橘色風格，但圓角加大 */
                background: linear-gradient(135deg, #f97316, #ea580c);
                border: 1px solid #c2410c;
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
                display: flex;
                flex-direction: column;
                gap: 6px;
                cursor: pointer;
                transition: transform 0.1s, box-shadow 0.2s;
                text-align: center;
                color: white;
                font-weight: 700;
                text-decoration: none;
            }
            .header-card-action-btn:hover {
                transform: translateY(-4px); /* 加大浮動距離，更像按鈕 */
                box-shadow: 0 8px 15px rgba(249, 115, 22, 0.4);
                background: linear-gradient(135deg, #fb923c, #f97316);
            }
            .header-card-action-btn:active { transform: translateY(0); }
            .edit-btn-content {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 0.85rem;
                letter-spacing: 1px;
            }
            .edit-icon-svg { width: 14px; height: 14px; stroke-width: 3; }
            .mini-header-value {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.3;
                word-break: break-word; 
            }

            /* ==========================================================================
               Row 2: 關鍵指標
               ========================================================================== */
            .stats-grid-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px; /* 統一間距 */
                width: 100%;
            }
            .big-stat-card {
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                padding: 24px 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: flex-start;
                align-items: flex-start;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            /* ★ Bento Style: 懸停浮起效果 */
            .big-stat-card:hover {
                transform: translateY(-3px); 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
            }

            /* 特殊樣式：翡翠綠金幣卡 (Saturated Emerald) */
            .card-style-green {
                background-color: #059669; /* Emerald 600 */
                border: 1px solid #047857; /* Emerald 700 */
                color: white; /* 全白文字 */
            }
            .card-style-green .unified-label {
                color: rgba(255, 255, 255, 0.9); 
                border-bottom-color: rgba(255, 255, 255, 0.3);
            }
            .card-style-green .stat-value {
                color: #ffffff;
            }
            
            .stat-value {
                font-size: 1.4rem;
                font-weight: 700;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .stat-value.val-money { 
                font-size: 2rem; 
                font-family: 'Roboto Mono', monospace; 
                letter-spacing: -1px; 
            }

            /* ==========================================================================
               Row 3: 三欄並列
               ========================================================================== */
            .triple-col-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 16px; /* 統一間距 */
                align-items: stretch;
                width: 100%;
            }
            .triple-col-row .layer-card { height: 100%; }

            /* ★ 商流卡片：寶藍色分層設計 (Royal Blue Split Card) */
            .card-split-royal-blue {
                padding: 0 !important; 
                border: 1px solid #1d4ed8; /* Blue 700 Border */
                overflow: hidden;
                background-color: white;
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
            }
            
            /* 上半部：寶藍色標頭 */
            .split-card-header {
                background-color: #1d4ed8; /* Blue 700 (Royal Blue) */
                color: white;
                padding: 16px;
                text-align: center;
                border-bottom: 1px solid #1e40af;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                flex: 0 0 auto;
                min-height: 50px;
            }
            .split-header-text {
                font-size: 1.2rem;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            /* 下半部：白底內容 (Body) */
            .split-card-body {
                background-color: white;
                padding: 16px 20px;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 12px;
            }

            .split-target-name {
                font-size: 1.3rem; 
                font-weight: 700;
                color: var(--text-primary);
                text-align: center;
                line-height: 1.2;
            }
            
            .split-contact-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 0.95rem;
                color: var(--text-primary);
                flex-wrap: wrap;
                width: 100%;
                padding-top: 8px;
                border-top: 1px dashed var(--border-color);
            }
            
            .contact-prefix {
                color: var(--text-muted);
                font-weight: 500;
            }

            /* 職稱 Badge (淡藍膠囊) */
            .job-title-badge {
                display: inline-block;
                background-color: #eff6ff; 
                color: #1e40af; 
                font-size: 0.75rem;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 600;
                border: 1px solid #dbeafe;
                margin-left: 4px;
            }

            /* Col 2: 規格 (Blue Active Style) */
            .specs-tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-content: flex-start;
            }
            .spec-tag {
                display: inline-flex;
                align-items: center;
                color: var(--accent-blue, #2563eb);
                border: 1px solid var(--accent-blue, #2563eb);
                background-color: color-mix(in srgb, var(--accent-blue, #2563eb) 10%, transparent);
                padding: 4px 10px;
                border-radius: 6px; 
                font-size: 0.9rem;
                font-weight: 700;
                line-height: 1.4;
            }
            .spec-qty-text {
                margin-left: 4px;
                opacity: 0.9;
                font-family: monospace; 
                font-weight: 700;
            }

            /* Col 3: 關鍵日期 */
            .dates-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
                height: 100%;
                justify-content: flex-start; 
            }
            .date-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 8px;
                border-bottom: 1px dashed var(--border-color);
            }
            .date-row:last-child { border-bottom: none; padding-bottom: 0; }
            .date-key { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
            .date-val { font-size: 0.95rem; color: var(--text-primary); font-weight: 600; font-family: monospace; }

            /* Row 4: 備註 */
            .notes-text-clean {
                font-size: 1rem;
                color: var(--text-primary);
                line-height: 1.6;
                white-space: pre-wrap;
                padding: 0;
            }

            /* RWD */
            @media (max-width: 900px) {
                .header-separate-row { flex-direction: column; gap: 16px; } /* 統一間距 */
                .header-card-name, .header-card-mini, .header-card-action-btn { flex: auto; width: 100%; padding: 16px; align-items: flex-start; justify-content: flex-start; text-align: left; }
                .header-card-action-btn { align-items: center; justify-content: center; background: var(--accent-orange); } 
                .stats-grid-row { grid-template-columns: repeat(2, 1fr); gap: 16px; } /* 統一間距 */
                .triple-col-row { grid-template-columns: 1fr; gap: 16px; } /* 統一間距 */
            }
        `;
        document.head.appendChild(style);
    }

    // 輔助：查找規格設定
    function _getSpecConfig(specName) {
        if (!window.CRM_APP || !window.CRM_APP.systemConfig) return null;
        const config = window.CRM_APP.systemConfig;
        for (const key in config) {
            if (Array.isArray(config[key])) {
                const found = config[key].find(item => item.value === specName);
                if (found) return found;
            }
        }
        return null;
    }

    function render(opp) {
        _injectStyles();

        // Phase 8 Compatibility Helper: read first available key (new DTO vs legacy UI)
        const getFirst = (obj, keys, fallback = '') => {
            const source = obj || {};
            for (const k of keys || []) {
                const v = source[k];
                if (v === null || v === undefined) continue;
                if (typeof v === 'string') {
                    const t = v.trim();
                    if (t !== '') return t;
                    continue;
                }
                return v;
            }
            return fallback;
        };

        // 1. 商流邏輯
        const salesModel = getFirst(opp, ['salesModel'], '直接販售') || '直接販售';
        const isDirect = salesModel === '直接販售';
        
        const customerCompany = getFirst(opp, ['customerCompany'], '');
        const channelDetails = getFirst(opp, ['channelDetails'], '');
        const salesChannel = getFirst(opp, ['salesChannel'], '');

        const targetName = isDirect
            ? (customerCompany || '未指定客戶')
            : (channelDetails || salesChannel || '未指定通路');

        const mainContact = getFirst(opp, ['mainContact'], '');
        const channelContact = getFirst(opp, ['channelContact'], '');
        const targetContactName = isDirect ? mainContact : channelContact;

        // 【修改】直接從 opp 物件中獲取職稱，無需前端複雜查找
        const targetTitle = getFirst(opp, ['mainContactJobTitle'], '');
        const titleHtml = targetTitle ? `<span class="job-title-badge">${targetTitle}</span>` : '';

        // 2. 規格 Tags 生成
        let specsContent = '<span style="color:var(--text-muted); font-style:italic; padding:4px;">(尚未指定規格)</span>';
        
        let parsed = {};
        const rawSpec = opp.potentialSpecification;

        // [Forensics Fix] Robust Type Check & Parse for Specs
        // Rule: Object -> use; String -> parse; Error/Empty -> {}
        if (rawSpec) {
            if (typeof rawSpec === 'object') {
                parsed = rawSpec;
            } else if (typeof rawSpec === 'string') {
                const trimmed = rawSpec.trim();
                if (trimmed) {
                    try {
                        parsed = JSON.parse(trimmed);
                    } catch (e) {
                        // Silent failure for invalid JSON to prevent console spam
                    }
                }
            }
        }

        if (parsed && typeof parsed === 'object') {
            const entries = Object.entries(parsed);
            if (entries.length > 0) {
                specsContent = entries.map(([name, qty]) => {
                    const configItem = _getSpecConfig(name);
                    const isCountable = configItem && configItem.value3 === 'allow_quantity';
                    
                    let displayHtml = name;
                    if (isCountable && qty && qty > 0) {
                        displayHtml += `<span class="spec-qty-text">(${qty})</span>`;
                    }
                    
                    return `<div class="spec-tag">${displayHtml}</div>`;
                }).join('');
            }
        }

        // 3. 數值與日期
        // [Phase 7 SQL Type Safety Fix] Ensure value is string before replace, use Number()
        const rawValue = opp.opportunityValue;
        const cleanVal = (rawValue !== null && rawValue !== undefined) ? String(rawValue).replace(/,/g, '') : '0';
        const numVal = Number(cleanVal);
        const valueStr = isNaN(numVal) ? '0' : numVal.toLocaleString();
        
        const createdDate = opp.createdTime ? opp.createdTime.split('T')[0] : '-';
        const closeDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '-';
        
        const notesContent = opp.notes || '<span style="color:var(--text-muted);">(無備註內容)</span>';

        // [PATCH] Support multiple field names for Probability (SQL vs Sheet)
        const displayProbability = getFirst(opp, ['orderProbability', 'winProbability', 'win_probability'], '-') || '-';

        // Compatibility mappings (new DTO vs legacy UI)
        const displayAssignee = getFirst(opp, ['assignee', 'owner'], '-') || '-';
        const displaySource = getFirst(opp, ['opportunitySource', 'source'], '-') || '-';

        return `
            <div class="opp-view-container">

                <div class="main-section-title">機會核心資訊</div>

                <div class="header-separate-row">
                    <div class="header-card-name">
                        <span class="unified-label">機會名稱</span>
                        <h1 class="name-title">${opp.opportunityName || '未命名機會'}</h1>
                    </div>
                    
                    <div class="header-card-mini">
                        <span class="unified-label">負責業務</span>
                        <span class="mini-header-value">${displayAssignee}</span>
                    </div>

                    <div class="header-card-mini">
                        <span class="unified-label">機會來源</span>
                        <span class="mini-header-value">${displaySource}</span>
                    </div>

                    <div class="header-card-action-btn" onclick="OpportunityInfoCardEvents.toggleEditMode(true)" title="編輯機會資訊">
                        <div class="edit-btn-content">
                            <span>編輯</span>
                            <svg class="edit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="stats-grid-row">
                    <div class="big-stat-card">
                        <span class="unified-label">終端客戶</span>
                        <span class="stat-value" title="${customerCompany}">${customerCompany || '-'}</span>
                    </div>
                    <div class="big-stat-card">
                        <span class="unified-label">機會種類</span>
                        <span class="stat-value">${opp.opportunityType || '-'}</span>
                    </div>
                    <div class="big-stat-card card-style-green">
                        <span class="unified-label">機會價值</span>
                        <span class="stat-value val-money">$${valueStr}</span>
                    </div>
                    <div class="big-stat-card">
                        <span class="unified-label">下單機率</span>
                        <span class="stat-value" style="color: var(--text-primary);">${displayProbability}</span>
                    </div>
                </div>

                <div class="main-section-title mid-section-title">販售商流</div>

                <div class="triple-col-row">
                    
                    <div class="layer-card card-split-royal-blue">
                        <div class="split-card-header">
                            <span class="split-header-text">${salesModel}</span>
                        </div>
                        
                        <div class="split-card-body">
                            <div class="split-target-name">${targetName}</div>
                            
                            ${targetContactName ? `
                                <div class="split-contact-row">
                                    <span class="contact-prefix">窗口：</span>
                                    <span>${targetContactName}</span>
                                    ${titleHtml}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="layer-card">
                        <div class="inner-card-title">可能下單規格</div>
                        <div class="specs-tags-container">
                            ${specsContent}
                        </div>
                    </div>

                    <div class="layer-card">
                        <div class="inner-card-title">關鍵日期</div>
                        <div class="dates-content">
                            <div class="date-row">
                                <span class="date-key">建立日期</span>
                                <span class="date-val">${createdDate}</span>
                            </div>
                            <div class="date-row">
                                <span class="date-key">預計結案</span>
                                <span class="date-val">${closeDate}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="layer-card">
                    <div class="inner-card-title">備註</div>
                    <div class="notes-text-clean">${notesContent}</div>
                </div>

            </div>
        `;
    }

    return { render };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-interactions.js">
/*
 * Project: TFC CRM
 * File: public/scripts/opportunities/details/opportunity-interactions.js
 * Version: v8.0.22 (Phase 8.10.18 - Timeline Stabilization & CSS Polish)
 * Date: 2026-04-14
 * Changelog: 
 * - Phase 8 Interaction UI: operation-key rowIndex -> interactionId for edit/delete
 * - Phase 8.10.2 Fix: Relaxed strict result.success check to prevent unreachable markStale on 204/raw responses
 * - Phase 8.10.3 Fix: Appended 'Z' to naive UTC ISO strings during showForEditing to prevent 8-hour offset loss.
 * - Phase 8.10.4 Patch: Restore legacy clickable event report links inside contentSummary.
 * - Phase 8.10.5 Fix: Restored mandatory timeline-card structure (crm-timeline-item) and left/right layout.
 * - Phase 8.10.6 Fix: Aligned left/right with eventType (not index), fixed Event Report placement.
 * - Phase 8.10.7 Patch: Fixed timeline geometry (absolute marker on center line), dynamic config-driven left/right logic, and adjusted card information hierarchy.
 * - Phase 8.10.8 Fix: Migrated left/right layout to strictly use '時間軸佈局' config source, solidified geometry and information hierarchy.
 * - Phase 8.10.9 Polish: Converted timeline to fixed-height scrollable workspace, styled right form as a contained panel, refined typography, and removed expand/collapse.
 * - Phase 8.10.10 Patch: Micro fix to ensure timeline vertical line always spans the full dynamic height of rendered items.
 * - Phase 8.10.11 Patch: Micro fix to wrap all timeline items in .interaction-timeline to ensure vertical line anchoring.
 * - Phase 8.10.12 Patch: Micro fix to restore correct render targets (#discussion-timeline, #activity-log-timeline).
 * - Phase 8.10.13 Patch: Reverted wrapper injection and moved ::before line logic directly to #discussion-timeline and #activity-log-timeline to fix double line issue.
 * - Phase 8.10.15 Patch: Critical structural visual fix. Forced height: auto !important on timeline containers to override external height locks.
 * - Phase 8.10.16 Patch: Final structural ownership fix. Introduced .crm-timeline-content wrapper to guarantee vertical line accurately follows true rendered item height without viewport clamping.
 * - Phase 8.10.17 Patch: Precision fix to remove stale SPA CSS injections and guarantee only one consistent timeline center line exists.
 * - Phase 8.10.18 Polish: Stabilized box-sizing, content overflow wrapping, and added strict SPA bleed protection for timeline line ownership.
 */
// public/scripts/opportunities/details/opportunity-interactions.js
// 職責：專門管理「互動與新增」頁籤的所有 UI 與功能

const OpportunityInteractions = (() => {
    // 模組私有變數
    let _interactions = [];
    let _context = {}; // { opportunityId, companyId }
    let _container = null;

    // ✅ [Fix] 系統自動產生類型：必須與鎖定證據一致
    // Evidence: const isLockedRecord = ['系統事件', '事件報告'].includes(item.eventType);
    const SYSTEM_GENERATED_TYPES = ['系統事件', '事件報告'];

    // 子頁籤點擊事件
    function _handleTabClick(event) {
        if (!event.target.classList.contains('sub-tab-link')) return;

        const tab = event.target;
        const tabName = tab.dataset.tab;

        _container.querySelectorAll('.sub-tab-link').forEach(t => t.classList.remove('active'));
        _container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const contentPane = _container.querySelector(`#${tabName}-pane`);
        if (contentPane) contentPane.classList.add('active');
    }

    /**
     * 【鑑識修補】HTML 轉義 (XSS 防護)
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 【鑑識修補】動態取得 Left/Right 排版屬性
     * Source: window.CRM_APP.systemConfig['時間軸佈局']
     * Rule: 設定項目 (value) === eventType -> Extract 備註 (note)
     */
    function getTimelineSide(eventType) {
        if (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['時間軸佈局']) {
            const layoutConfigs = window.CRM_APP.systemConfig['時間軸佈局'];
            
            // Exact match: 設定項目 (config.value) === eventType
            const config = layoutConfigs.find(c => c.value === eventType);
            if (config && config.note) {
                const side = config.note.trim().toLowerCase();
                if (side === 'left' || side === 'right') {
                    return side;
                }
            }
        }
        
        // Strict fallback only if config missing or invalid
        return 'right';
    }

    /**
     * 【鑑識修補】渲染單一互動項目
     * 遵守 timeline-card UI doctrine (crm-timeline-item, crm-timeline-card, left/right layout)
     * 並維持 Strategy A：rowIndex 非有效數字則不渲染刪除按鈕
     */
    function renderSingleInteractionItem(interaction) {
        if (!interaction) return '';

        const rawTime = interaction.interactionTime || interaction.createdTime || '';
        const timeStr = (typeof formatDateTime === 'function')
            ? formatDateTime(rawTime)
            : rawTime;

        const typeStr = escapeHtml(interaction.eventTitle || interaction.eventType || '未分類');
        const recorder = escapeHtml(interaction.recorder || '系統');

        const rawSummary = interaction.contentSummary || '(無內容)';
        let summaryHtml = escapeHtml(rawSummary).replace(/\n/g, '<br>');

        // [Phase 8 Patch] Restore legacy clickable event report links inside contentSummary
        const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9_-]+)\)/g;
        summaryHtml = summaryHtml.replace(linkRegex, (fullMatch, text, eventId) => {
            const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
        });

        const rowId = interaction.interactionId;
        const rowIndex = interaction.rowIndex;

        // 鎖定邏輯（必須與 showForEditing 證據一致）
        const isLocked = ['系統事件', '事件報告'].includes(interaction.eventType);

        let buttonsHtml = '';
        if (rowId) {
            buttonsHtml += `
                <button type="button" class="action-btn small secondary" onclick="OpportunityInteractions.showForEditing('${rowId}')">
                    ${isLocked ? '檢視' : '編輯'}
                </button>
            `;

            // Strategy A: 僅當非鎖定且 rowIndex 可被安全轉為數字才渲染刪除
            const rowIndexNum = Number(rowIndex);
            if (!isLocked && Number.isFinite(rowIndexNum)) {
                buttonsHtml += `
                    &nbsp;
                    <button type="button" class="action-btn small secondary" onclick="OpportunityInteractions.confirmDelete('${rowId}', ${rowIndexNum})">
                        刪除
                    </button>
                `;
            }
        }

        // Configuration driven layout from '時間軸佈局'
        const alignClass = getTimelineSide(interaction.eventType);

        // Corrected Information Hierarchy
        return `
            <div class="crm-timeline-item ${alignClass}">
                <div class="crm-timeline-marker"></div>
                <div class="crm-timeline-card">
                    <div class="card-header">
                        <strong>${typeStr}</strong>
                        <span class="feed-time">${escapeHtml(timeStr)}</span>
                    </div>
                    <div class="card-body">
                        ${summaryHtml}
                    </div>
                    <div class="card-footer">
                        <div class="footer-meta">紀錄: ${recorder}</div>
                        <div class="footer-actions">
                            ${buttonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染一個時間軸列表
     * @param {string} containerSelector - e.g. '#discussion-timeline'
     * @param {Array<object>} interactions
     */
    function _renderTimelineList(containerSelector, interactions) {
        const historyList = _container.querySelector(containerSelector);
        if (!historyList) {
            console.error(`[Interactions] 找不到時間軸容器: ${containerSelector}`);
            return;
        }

        const allInteractions = Array.isArray(interactions) ? interactions : [];
        if (allInteractions.length === 0) {
            historyList.innerHTML = `
                <div class="alert alert-info">
                    ${containerSelector.includes('discussion') ? '尚無動態' : '尚無系統活動'}
                </div>
            `;
            return;
        }

        // [Polish] Removed limit and expand/collapse. Render entire list in scrollable workspace.
        let listHtml = allInteractions.map(renderSingleInteractionItem).join('');

        // Structural visual fix: Bind the center line dynamically to the true rendered content
        historyList.innerHTML = `
            <div class="crm-timeline-content">
                ${listHtml}
            </div>
        `;
    }

    /**
     * 更新時間軸視圖：分離討論 vs 系統活動
     */
    function _updateTimelineView() {
        if (!_container) return;

        const discussionInteractions = [];
        const activityLogInteractions = [];

        _interactions.forEach(interaction => {
            // [Fix] Placement Rule: Only pure '系統事件' remains in activity-log. 
            // '事件報告' (Event Reports) are explicitly treated as discussions.
            if (interaction.eventType === '系統事件') {
                activityLogInteractions.push(interaction);
            } else {
                discussionInteractions.push(interaction);
            }
        });

        // 可選：確保排序（若後端已排序可刪）
        // discussionInteractions.sort((a, b) => new Date(b.interactionTime || b.createdTime || 0) - new Date(a.interactionTime || a.createdTime || 0));
        // activityLogInteractions.sort((a, b) => new Date(b.interactionTime || b.createdTime || 0) - new Date(a.interactionTime || a.createdTime || 0));

        _renderTimelineList('#discussion-timeline', discussionInteractions);
        _renderTimelineList('#activity-log-timeline', activityLogInteractions);
    }

    /**
     * 表單提交：新增/編輯
     */
    async function _handleSubmit(event) {
        event.preventDefault();
        if (!_container) return;

        const form = _container.querySelector('#new-interaction-form');
        
        // #interaction-edit-rowIndex carries interactionId since Phase 8; legacy name kept for minimal diff.
        const interactionId = form.querySelector('#interaction-edit-rowIndex').value;
        const isEditMode = !!interactionId;

        showLoading(isEditMode ? '正在更新互動紀錄...' : '正在新增互動紀錄...');
        try {
            const interactionTimeInput = form.querySelector('#interaction-time').value;
            const interactionTimeISO = interactionTimeInput
                ? new Date(interactionTimeInput).toISOString()
                : new Date().toISOString();

            const interactionData = {
                interactionTime: interactionTimeISO,
                eventType: form.querySelector('#interaction-event-type').value,
                contentSummary: form.querySelector('#interaction-summary').value,
                nextAction: form.querySelector('#interaction-next-action').value,
                modifier: getCurrentUser()
            };

            if (_context.opportunityId) interactionData.opportunityId = _context.opportunityId;
            if (_context.companyId) interactionData.companyId = _context.companyId;

            const url = isEditMode ? `/api/interactions/${interactionId}` : '/api/interactions';
            const method = isEditMode ? 'PUT' : 'POST';

            if (!isEditMode) interactionData.recorder = getCurrentUser();

            const result = await authedFetch(url, { method, body: JSON.stringify(interactionData) });

            // [Phase 8.10.2 Fix] Production rule: treat explicit success:false as failure.
            // Bypasses false-positive throws on 204 No Content (null) or raw object returns.
            if (result && result.success === false) {
                throw new Error(result.details || '操作失敗');
            }
            
            // [Phase 8.10 Dashboard Refresh Fix] Interaction alters followUp list and recentActivity feed
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }
            
            // 成功後 authedFetch 可能刷新/通知（維持既有行為）
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`操作失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 動態注入樣式（保留既有行為並補齊精確的時間軸幾何與 CSS）
    function _injectStyles() {
        const styleId = 'interactions-dynamic-styles';
        
        // [Fix] Remove existing style block to prevent SPA duplicate/stale CSS issues
        const existing = document.getElementById(styleId);
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- Fixed Height Workspace (Scrollable Panes) --- */
            #discussion-pane, #activity-pane {
                height: 500px;
                overflow-y: auto;
                padding-right: 12px;
                scrollbar-width: thin;
                scrollbar-color: var(--border-color, #cbd5e1) transparent;
            }
            #discussion-pane::-webkit-scrollbar, #activity-pane::-webkit-scrollbar {
                width: 6px;
            }
            #discussion-pane::-webkit-scrollbar-thumb, #activity-pane::-webkit-scrollbar-thumb {
                background-color: var(--border-color, #cbd5e1);
                border-radius: 4px;
            }

            /* --- Timeline Exact Geometry Implementation --- */
            .crm-timeline-content {
                position: relative;
                padding: 20px 0;
                width: 100%;
                box-sizing: border-box;
            }

            /* --- STRICT SPA BLEED PROTECTION: Double Line Prevention --- */
            #discussion-timeline::before,
            #activity-log-timeline::before,
            .interaction-timeline::before {
                content: none !important;
                display: none !important;
                width: 0 !important;
                background: transparent !important;
            }
            .crm-timeline-content,
            .interaction-timeline,
            #discussion-timeline,
            #activity-log-timeline {
                border-left: none !important;
                border-right: none !important;
                background-image: none !important;
            }
            
            /* The Anchor: Vertical Center Line (SINGLE OWNER) */
            .crm-timeline-content::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: 50%;
                width: 2px;
                background: var(--border-color, #e2e8f0);
                transform: translateX(-50%);
                z-index: 1;
            }

            /* The Item Layout Shell */
            .crm-timeline-item {
                position: relative;
                width: 100%;
                margin-bottom: 24px;
                display: flex;
                box-sizing: border-box;
            }
            .crm-timeline-item.left {
                justify-content: flex-start;
            }
            .crm-timeline-item.right {
                justify-content: flex-end;
            }

            /* The Anchor Point: Exactly centered Marker */
            .crm-timeline-marker {
                box-sizing: border-box;
                position: absolute;
                left: 50%;
                top: 20px;
                transform: translateX(-50%);
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary-color, #4f46e5);
                border: 3px solid var(--bg-color, #ffffff);
                box-shadow: 0 0 0 2px var(--border-color, #cbd5e1);
                z-index: 2;
            }

            /* The Card: Geometrically spaced from center */
            .crm-timeline-card {
                box-sizing: border-box;
                position: relative;
                width: calc(50% - 32px); /* Leaves exactly 32px gap from center line */
                background: var(--card-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 10px;
                padding: 16px 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                z-index: 2;
            }

            /* The Connectors: Visual attachment arrows pointing to the marker */
            .crm-timeline-card::before {
                content: '';
                position: absolute;
                top: 21px;
                width: 0;
                height: 0;
                border-style: solid;
            }
            .crm-timeline-card::after {
                content: '';
                position: absolute;
                top: 22px;
                width: 0;
                height: 0;
                border-style: solid;
            }

            /* Left Card Arrow */
            .crm-timeline-item.left .crm-timeline-card::before {
                right: -9px;
                border-width: 7px 0 7px 9px;
                border-color: transparent transparent transparent var(--border-color, #e2e8f0);
            }
            .crm-timeline-item.left .crm-timeline-card::after {
                right: -7px;
                border-width: 6px 0 6px 8px;
                border-color: transparent transparent transparent var(--card-bg, #ffffff);
            }

            /* Right Card Arrow */
            .crm-timeline-item.right .crm-timeline-card::before {
                left: -9px;
                border-width: 7px 9px 7px 0;
                border-color: transparent var(--border-color, #e2e8f0) transparent transparent;
            }
            .crm-timeline-item.right .crm-timeline-card::after {
                left: -7px;
                border-width: 6px 8px 6px 0;
                border-color: transparent var(--card-bg, #ffffff) transparent transparent;
            }

            /* --- Readability & Typography (Timeline) --- */
            .crm-timeline-card .card-header {
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-color, #1e293b);
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .crm-timeline-card .feed-time {
                font-size: 0.75rem;
                color: var(--text-muted, #94a3b8);
                font-weight: 400;
            }
            .crm-timeline-card .card-body {
                font-size: 0.9rem;
                line-height: 1.6;
                color: var(--text-secondary, #475569);
                margin-bottom: 12px;
                word-break: break-word;
                overflow-wrap: anywhere; /* Safety: strict overflow containment */
            }
            .crm-timeline-card .card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px dashed var(--border-color, #e2e8f0);
                padding-top: 10px;
                font-size: 0.8rem;
            }
            .crm-timeline-card .footer-meta {
                color: var(--text-muted, #64748b);
            }
            .crm-timeline-card .footer-actions {
                display: flex;
                gap: 8px;
            }

            /* --- Right Panel Structure & Typography --- */
            .interaction-form-section {
                background-color: var(--secondary-bg, #f8fafc);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 24px;
                height: fit-content;
            }
            
            .interaction-form-section h3 {
                font-size: 1.1rem;
                margin-bottom: 1.2rem !important;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                padding-bottom: 12px;
            }

            .interaction-form-section .form-label {
                font-size: 0.85rem;
                color: var(--text-secondary);
                margin-bottom: 6px;
            }

            .interaction-form-section .form-input,
            .interaction-form-section .form-select,
            .interaction-form-section .form-textarea {
                font-size: 0.9rem;
                padding: 8px 10px;
                box-sizing: border-box;
            }

            .interaction-form-section .form-group {
                margin-bottom: 16px;
            }

            .interaction-form-section .submit-btn {
                margin-top: 8px;
                width: 100%;
            }

            /* Mobile Responsive Fallback */
            @media (max-width: 768px) {
                .crm-timeline-content::before {
                    left: 20px;
                }
                .crm-timeline-item.left, .crm-timeline-item.right {
                    justify-content: flex-end;
                }
                .crm-timeline-card {
                    width: calc(100% - 52px); /* Accommodate offset line */
                }
                .crm-timeline-marker {
                    left: 20px !important;
                }
                .crm-timeline-item.left .crm-timeline-card::before,
                .crm-timeline-item.right .crm-timeline-card::before {
                    left: -9px;
                    right: auto;
                    border-width: 7px 9px 7px 0;
                    border-color: transparent var(--border-color, #e2e8f0) transparent transparent;
                }
                .crm-timeline-item.left .crm-timeline-card::after,
                .crm-timeline-item.right .crm-timeline-card::after {
                    left: -7px;
                    right: auto;
                    border-width: 6px 8px 6px 0;
                    border-color: transparent var(--card-bg, #ffffff) transparent transparent;
                }
                #discussion-pane, #activity-pane {
                    height: auto;
                    max-height: 500px;
                }
                .interaction-form-section {
                    margin-top: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 公開：顯示表單供編輯
     */
    function showForEditing(interactionId) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        if (!item) {
            showNotification('找不到該筆互動紀錄資料', 'error');
            return;
        }

        const form = _container.querySelector('#new-interaction-form');
        if (!form) return;

        // #interaction-edit-rowIndex carries interactionId since Phase 8; legacy name kept for minimal diff.
        form.querySelector('#interaction-edit-rowIndex').value = item.interactionId;

        // [Strict Digital Forensics Patch] Ensure UTC parsing for naive DB strings before offset calculation
        let rawInteractionTime = item.interactionTime || item.createdTime;
        if (typeof rawInteractionTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(rawInteractionTime)) {
            rawInteractionTime += 'Z';
        }
        const interactionTime = new Date(rawInteractionTime || new Date().toISOString());
        
        interactionTime.setMinutes(interactionTime.getMinutes() - interactionTime.getTimezoneOffset());
        form.querySelector('#interaction-time').value = interactionTime.toISOString().slice(0, 16);

        form.querySelector('#interaction-event-type').value = item.eventType;
        form.querySelector('#interaction-summary').value = item.contentSummary;
        form.querySelector('#interaction-next-action').value = item.nextAction;

        const eventTypeSelect = form.querySelector('#interaction-event-type');
        const summaryTextarea = form.querySelector('#interaction-summary');
        const nextActionInput = form.querySelector('#interaction-next-action');
        const submitBtn = form.querySelector('#interaction-submit-btn');

        // Evidence: 鎖定判斷固定兩類
        const isLockedRecord = ['系統事件', '事件報告'].includes(item.eventType);

        if (isLockedRecord) {
            eventTypeSelect.disabled = true;
            summaryTextarea.readOnly = true;
            nextActionInput.readOnly = true;
            submitBtn.textContent = '💾 僅儲存時間變更';
        } else {
            eventTypeSelect.disabled = false;
            summaryTextarea.readOnly = false;
            nextActionInput.readOnly = false;
            submitBtn.textContent = '💾 儲存變更';
        }

        form.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 公開：刪除確認
     */
    function confirmDelete(interactionId, rowIndex) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        const summary = item ? (item.contentSummary || '此紀錄').substring(0, 30) + '...' : '此筆紀錄';

        const message = `您確定要永久刪除這筆互動紀錄嗎？\n\n"${summary}"\n\n此操作無法復原。`;

        showConfirmDialog(message, async () => {
            showLoading('正在刪除紀錄...');
            try {
                await authedFetch(`/api/interactions/${interactionId}`, { method: 'DELETE' });
                
                // [Phase 8.10 Dashboard Refresh Fix] 
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    console.error('刪除互動紀錄失敗:', error);
                }
            } finally {
                hideLoading();
            }
        });
    }

    /**
     * 公開：初始化
     */
    function init(containerElement, context, interactions) {
        _container = containerElement;
        _context = context || {};
        _interactions = Array.isArray(interactions) ? interactions : [];

        if (!_container) {
            console.error('[Interactions] 初始化失敗：未提供有效的容器元素。');
            return;
        }

        const form = _container.querySelector('#new-interaction-form');
        if (!form) {
            console.error('[Interactions] 初始化失敗：在指定的容器中找不到 #new-interaction-form。');
            return;
        }

        // 填入下拉選單（保留既有邏輯，僅避免把系統類型放進去）
        const eventTypeSelect = form.querySelector('#interaction-event-type');
        if (eventTypeSelect && window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['互動類型']) {
            const interactionTypes = window.CRM_APP.systemConfig['互動類型'];
            eventTypeSelect.innerHTML = '<option value="">請選擇類型...</option>';

            interactionTypes.forEach(type => {
                const note = type.note || type.value;
                // 不提供系統自動類型（避免前端手動建立系統事件）
                if (!SYSTEM_GENERATED_TYPES.includes(note) && !SYSTEM_GENERATED_TYPES.includes(type.value)) {
                    eventTypeSelect.innerHTML += `<option value="${type.value}">${note}</option>`;
                }
            });

            if (eventTypeSelect.options.length === 2) eventTypeSelect.selectedIndex = 1;
        }

        // 重置表單
        form.reset();
        form.querySelector('#interaction-edit-rowIndex').value = '';
        form.querySelector('#interaction-submit-btn').textContent = '💾 新增紀錄';

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        form.querySelector('#interaction-time').value = now.toISOString().slice(0, 16);

        form.removeEventListener('submit', _handleSubmit);
        form.addEventListener('submit', _handleSubmit);

        const tabContainer = _container.querySelector('.sub-tabs');
        if (tabContainer) {
            tabContainer.removeEventListener('click', _handleTabClick);
            tabContainer.addEventListener('click', _handleTabClick);
        }

        _injectStyles();
        _updateTimelineView();
    }

    return {
        init,
        showForEditing,
        confirmDelete
    };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-stepper.js">
// public/scripts/opportunities/details/opportunity-stepper.js
// 職責：專門管理「機會進程」區塊的所有 UI 渲染與互動邏輯
// * @version 2.2.1 (Phase 8.10 Stale Refresh Fix)
// * @date 2026-03-12
// (V2.2 - 修正：_saveChanges 使用正確的 opportunityId 取代 rowIndex)

const OpportunityStepper = (() => {
    // 模組內的私有變數
    let _opportunityInfo = null;

    // 處理圓圈點擊（三態循環）
    function _handleCircleClick(step) {
        const iconEl = step.querySelector('.step-circle');
        const allSteps = Array.from(step.parentElement.children);
        const index = allSteps.indexOf(step);
        
        switch (step.dataset.status) {
            case 'pending':
                step.dataset.status = 'completed';
                step.classList.add('completed');
                step.classList.remove('skipped');
                iconEl.innerHTML = '✓';
                break;
            case 'completed':
                step.dataset.status = 'skipped';
                step.classList.remove('completed');
                step.classList.add('skipped');
                iconEl.innerHTML = '✕';
                break;
            case 'skipped':
                step.dataset.status = 'pending';
                step.classList.remove('skipped');
                iconEl.innerHTML = index + 1;
                break;
        }
    }

    // 處理階段名稱點擊（設定為目前）
    function _handleNameClick(step) {
        document.querySelectorAll('.stage-stepper-container .stage-step').forEach(s => s.classList.remove('current'));
        step.classList.add('current');
    }

    // 儲存變更
    async function _saveChanges() {
        const stepperContainer = document.querySelector('.stage-stepper-container');
        if (!stepperContainer) return;

        // [FIX] 優先序：Global Data -> Global ID -> Local Prop
        const targetId = (window.currentOpportunityData && window.currentOpportunityData.opportunityId) 
                      || window.currentDetailOpportunityId 
                      || (_opportunityInfo && _opportunityInfo.opportunityId);

        // [FIX] Guard Clause: 絕對防止打出 undefined
        if (!targetId) {
            console.error('[OpportunityStepper] Critical: No opportunityId found for save.');
            showNotification('無法儲存：找不到機會 ID (System Error)', 'error');
            return;
        }

        const historyItems = [];
        stepperContainer.querySelectorAll('.stage-step').forEach(step => {
            const status = step.dataset.status;
            const stageId = step.dataset.stageId;
            if (status === 'completed') {
                historyItems.push(`C:${stageId}`);
            } else if (status === 'skipped') {
                historyItems.push(`X:${stageId}`);
            }
        });

        const currentStep = stepperContainer.querySelector('.stage-step.current');
        const newCurrentStage = currentStep ? currentStep.dataset.stageId : _opportunityInfo.currentStage;
        
        // --- 確保儲存時，目前階段一定在歷程中 ---
        const historySet = new Set(historyItems.filter(item => item.startsWith('C:')));
        historyItems.filter(item => item.startsWith('X:')).forEach(item => historySet.add(item));
        
        historySet.add(`C:${newCurrentStage}`);
        historySet.delete(`X:${newCurrentStage}`);
        
        const newStageHistory = Array.from(historySet).join(',');

        showLoading('正在儲存階段歷程...');
        try {
            // [FIX] 使用鑑識出的 targetId，不再使用 rowIndex
            const result = await authedFetch(`/api/opportunities/${targetId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    currentStage: newCurrentStage,
                    stageHistory: newStageHistory,
                    modifier: getCurrentUser()
                })
            });

            if (result.success) {
                // [Phase 8.10 Dashboard Refresh Fix] Kanban Data heavily relies on Stage
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
                // authedFetch 會處理整頁刷新和通知
            } else {
                throw new Error(result.error || '儲存失敗');
            }

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                showNotification(`儲存失敗: ${error.message}`, 'error');
            }
        } finally {
            hideLoading();
        }
    }
    
    // 渲染檢視模式
    function _renderViewMode() {
        // 安全檢查，避免 DOM 未就緒
        const wrapper = document.getElementById('opportunity-stage-stepper-container');
        if (!wrapper) return;

        const container = document.getElementById('opportunity-stage-stepper');
        const header = wrapper.querySelector('.widget-header');
        const allStages = (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['機會階段']) || [];

        header.innerHTML = `
            <h2 class="widget-title">機會進程</h2>
            <button class="action-btn small secondary" id="edit-stepper-btn">✏️ 編輯歷程</button>
        `;
        
        header.querySelector('#edit-stepper-btn').addEventListener('click', () => _renderEditMode());

        const stageStatusMap = new Map();
        if (_opportunityInfo && _opportunityInfo.stageHistory) {
            const historyList = Array.isArray(_opportunityInfo.stageHistory) 
                ? _opportunityInfo.stageHistory 
                : String(_opportunityInfo.stageHistory).split(',');

            historyList.forEach(item => {
                if (!item) return;
                if(item.includes(':')) {
                    const [status, stageId] = item.split(':');
                    stageStatusMap.set(stageId, status);
                } else {
                    stageStatusMap.set(item, 'C'); 
                }
            });
        }

        const currentStageVal = _opportunityInfo ? _opportunityInfo.currentStage : '';

        let stepsHtml = allStages.map((stage, index) => {
            let statusClass = 'pending';
            let icon = index + 1;
            
            const status = stageStatusMap.get(stage.value);
            const isCurrent = (stage.value === currentStageVal);

            if (status === 'C' || isCurrent) {
                statusClass = 'completed';
                icon = '✓';
            } else if (status === 'X') {
                statusClass = 'skipped';
                icon = '✕';
            }
            
            if (isCurrent) {
                statusClass += ' current';
            }

            return `
                <div class="stage-step ${statusClass.trim()}" data-stage-id="${stage.value}" title="${stage.note || stage.value}">
                    <div class="step-circle">${icon}</div>
                    <div class="step-name">${stage.note || stage.value}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="stage-stepper-container">${stepsHtml}</div>`;
    }

    // 渲染編輯模式
    function _renderEditMode() {
        const container = document.getElementById('opportunity-stage-stepper');
        const header = document.querySelector('#opportunity-stage-stepper-container .widget-header');
        const stepperContainer = container.querySelector('.stage-stepper-container');

        if (!stepperContainer) return;
        
        let hintContainer = document.getElementById('stepper-edit-hint');
        if (!hintContainer) {
            hintContainer = document.createElement('div');
            hintContainer.id = 'stepper-edit-hint';
            hintContainer.className = 'stepper-edit-hint';
            hintContainer.innerHTML = `ℹ️ <strong>操作提示</strong>：點擊 [圓圈] 可在 ( ✓ / ✕ / 無 ) 三種狀態間切換，點擊 [階段名稱] 可設定為目前階段。`;
            container.before(hintContainer);
        }
        hintContainer.style.display = 'block';

        header.innerHTML = `
            <h2 class="widget-title">機會進程 (編輯模式)</h2>
            <div>
                <button class="action-btn small" style="background: #6c757d;" id="cancel-stepper-btn">取消</button>
                <button class="action-btn small primary" id="save-stepper-btn">💾 儲存</button>
            </div>
        `;
        header.querySelector('#cancel-stepper-btn').addEventListener('click', () => {
            hintContainer.style.display = 'none';
            _renderViewMode();
        });
        header.querySelector('#save-stepper-btn').addEventListener('click', _saveChanges);

        stepperContainer.classList.add('edit-mode');
        
        stepperContainer.removeEventListener('click', _handleStepperClick);
        stepperContainer.addEventListener('click', _handleStepperClick);

        stepperContainer.querySelectorAll('.stage-step').forEach(step => {
            let status = 'pending';
            if (step.classList.contains('current') || step.classList.contains('completed')) {
                status = 'completed';
            }
            if (step.classList.contains('skipped')) {
                status = 'skipped';
            }
            step.dataset.status = status;
        });
    }

    function _handleStepperClick(e) {
        const circle = e.target.closest('.step-circle');
        const name = e.target.closest('.step-name');
        
        if (circle) {
            const step = circle.closest('.stage-step');
            if (step) _handleCircleClick(step);
        } else if (name) {
            const step = name.closest('.stage-step');
            if (step) _handleNameClick(step);
        }
    }

    function _injectStyles() {
        const styleId = 'stepper-dynamic-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .stepper-edit-hint {
                background-color: color-mix(in srgb, var(--accent-blue) 15%, var(--primary-bg));
                border: 1px solid var(--accent-blue); color: var(--text-secondary);
                padding: var(--spacing-3) var(--spacing-4); border-radius: var(--rounded-lg);
                margin-bottom: var(--spacing-5); font-size: var(--font-size-sm);
            }
            .stage-step.skipped .step-circle {
                background-color: var(--accent-red); border-color: var(--accent-red); color: white;
            }
            .stage-stepper-container.edit-mode .step-circle {
                cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .stage-stepper-container.edit-mode .step-circle:hover {
                transform: scale(1.15);
            }
            .stage-stepper-container.edit-mode .step-name {
                cursor: pointer; padding: 2px 5px; border-radius: var(--rounded-sm);
                transition: background-color 0.2s ease;
            }
            .stage-stepper-container.edit-mode .step-name:hover {
                background-color: var(--glass-bg);
            }
            .stage-step.current .step-circle {
                box-shadow: 0 0 0 4px var(--accent-blue);
            }
        `;
        document.head.appendChild(style);
    }
    
    function init(opportunityInfo) {
        _opportunityInfo = opportunityInfo || {};
        const container = document.getElementById('opportunity-stage-stepper-container');
        if (!container) return;
        
        _injectStyles();
        _renderViewMode();
    }

    return {
        init: init
    };
})();
</file>

<file path="public/scripts/opportunities/opportunities.js">
// public/scripts/opportunities/opportunities.js
/**
 * 職責：管理「機會案件列表頁」的篩選、列表渲染與操作
 * @version 8.5.0 (Phase 9 - Metadata Decoupling)
 * @date 2026-04-15
 * @description 
 * - [PHASE 9] Replaced expensive `page=0` full-dataset fetch with dedicated lightweight `metadata/years` endpoint.
 * - [PHASE 9-C] Implemented Incremental Append Pagination (limit 50) to drastically reduce first-load payload and DOM render cost.
 * - [Hierarchy Fix Patch] Reordered top controls to strictly follow: Tabs -> Dropdowns -> Search -> Status/Count -> Table.
 */

// ==================== 全域變數 (此頁面專用) ====================
let opportunitiesData = []; // Maintained strictly as an empty default wrapper to prevent undefined variable crashes

// 篩選與排序狀態
let opportunitiesListFilters = { 
    year: 'all', 
    type: 'all', 
    source: 'all', 
    time: 'all', 
    stage: 'all'
};
let currentOppSort = { field: 'effectiveLastActivity', direction: 'desc' };

// [Phase 9-C] Pagination State
let currentOppPage = 1;
const OPP_PAGE_LIMIT = 50;

// ==================== 主要功能函式 ====================

/**
 * 載入並渲染所有機會案件頁面
 * @param {string} [query=''] - 搜尋關鍵字
 */
async function loadOpportunities(query = '') {
    const container = document.getElementById('page-opportunities');
    if (!container) return;

    // 1. 渲染頁面骨架 
    container.innerHTML = `
        <div id="opportunities-list-root">
            <div class="dashboard-widget">
                
                <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                    <div style="display: flex; align-items: baseline; gap: 15px;">
                        <h2 class="widget-title" style="margin: 0;">機會總覽</h2>
                    </div>
                    <div id="opportunity-type-tabs" class="opportunity-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px; overflow-x: auto;">
                        <button class="tab-btn active" data-action="switch-type-tab" data-value="all" style="background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s; white-space: nowrap;">全部</button>
                    </div>
                </div>

                <div id="opportunity-action-bar" style="padding: 1.5rem 1.5rem 0.5rem;">
                    
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <div id="opportunity-list-filters" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <select id="opp-year-filter" class="form-select-sm" data-filter="year"><option value="all">所有年份</option></select>
                            <select id="opp-source-filter" class="form-select-sm" data-filter="source"><option value="all">所有來源</option></select>
                            <select id="opp-time-filter" class="form-select-sm" data-filter="time">
                                <option value="all">活動日期 (全部)</option>
                                <option value="7">近 7 天</option>
                                <option value="30">近 30 天</option>
                                <option value="90">近 90 天</option>
                            </select>
                            <select id="opp-stage-filter" class="form-select-sm" data-filter="stage"><option value="all">所有階段</option></select>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 1rem; flex-wrap: wrap;">
                        <div style="flex: 1; max-width: 400px;">
                            <input type="text" class="search-box" id="opportunities-list-search" placeholder="搜尋機會名稱或客戶公司..." style="width: 100%;" value="${query}">
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem; min-height: 24px;">
                        <div id="opportunities-filter-status" style="display: none; align-items: center; gap: 8px;">
                            <span id="opportunities-filter-text" style="font-size: 0.85rem; font-weight: 600; color: var(--accent-blue);"></span>
                            <button class="action-btn small danger" data-action="clear-filters" style="padding: 2px 8px;">清除</button>
                        </div>
                        
                        <div id="opportunities-count-display" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500; margin-left: auto;">共 0 筆</div>
                    </div>
                </div>

                <div id="opportunities-page-content" class="widget-content" style="padding: 0;">
                    <div class="loading show"><div class="spinner"></div><p>載入機會資料中...</p></div>
                </div>
            </div>
        </div>
    `;

    // 2. 綁定事件委派
    container.removeEventListener('click', handleOpportunitiesClick);
    container.addEventListener('click', handleOpportunitiesClick);
    
    // 綁定搜尋事件
    const searchInput = document.getElementById('opportunities-list-search');
    if (searchInput) {
        searchInput.removeEventListener('keyup', handleOpportunitiesSearch);
        searchInput.addEventListener('keyup', handleOpportunitiesSearch);
    }

    try {
        // [Phase 9 Note] Replaced expensive page=0 payload with dedicated lightweight metadata call
        const [yearsResult, systemConfigResult] = await Promise.all([
            authedFetch(`/api/opportunities/metadata/years`), 
            authedFetch(`/api/config`)
        ]);

        if (systemConfigResult) {
            window.CRM_APP = window.CRM_APP || {};
            window.CRM_APP.systemConfig = systemConfigResult;
            
            renderOpportunityTypeTabs(systemConfigResult['機會種類'] || []);
            populateOppFilterOptions('opp-source-filter', systemConfigResult['機會來源'], '所有來源');
            populateOppFilterOptions('opp-stage-filter', systemConfigResult['機會階段'], '所有階段');
            
            document.querySelectorAll('#opportunity-list-filters select').forEach(select => {
                select.addEventListener('change', handleOppFilterDropdownChange);
            });
        }

        const yearFilter = document.getElementById('opp-year-filter');
        if (yearFilter && yearsResult && yearsResult.success && Array.isArray(yearsResult.data)) {
            const sortedYears = yearsResult.data;
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `${y} 年`;
                yearFilter.appendChild(opt);
            });
            yearFilter.value = opportunitiesListFilters.year;
        }

        opportunitiesData = []; // Clear old dataset entirely from DOM memory.

        // Reset page and execute initial render
        currentOppPage = 1;
        fetchAndRenderOpportunitiesTable(false);

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('❌ 載入機會案件頁面失敗:', error);
            const contentEl = document.getElementById('opportunities-page-content');
            if (contentEl) contentEl.innerHTML = `<div class="alert alert-error">載入資料失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 統一事件處理器 (Centralized Event Handler)
 */
function handleOpportunitiesClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const payload = btn.dataset;

    switch (action) {
        case 'switch-type-tab':
            opportunitiesListFilters.type = payload.value;
            renderOpportunityTypeTabs(window.CRM_APP?.systemConfig?.['機會種類'] || []);
            currentOppPage = 1;
            fetchAndRenderOpportunitiesTable(false);
            break;
        case 'sort':
            handleOppSort(payload.field);
            break;
        case 'delete-opp':
            confirmDeleteOpportunity(payload.oppId, payload.name);
            break;
        case 'clear-filters':
            clearAllOppFilters();
            break;
        case 'load-more-opps':
            currentOppPage++;
            fetchAndRenderOpportunitiesTable(true);
            break;
        case 'navigate':
            e.preventDefault();
            let params = {};
            if (payload.params) {
                try {
                    params = JSON.parse(payload.params);
                } catch (err) {
                    console.error('解析導航參數失敗', err);
                }
            }
            CRM_APP.navigateTo(payload.page, params);
            break;
    }
}

function renderOpportunityTypeTabs(options = []) {
    const tabsContainer = document.getElementById('opportunity-type-tabs');
    if (!tabsContainer) return;
    
    const tabs = [{ value: 'all', label: '全部' }];
    options.forEach(opt => tabs.push({ value: opt.value, label: opt.note || opt.value }));
    
    let html = '';
    tabs.forEach(t => {
        const isActive = opportunitiesListFilters.type === t.value;
        const style = isActive 
            ? `background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s; white-space: nowrap;` 
            : `background: transparent; border: none; padding: 8px 16px; font-weight: 500; color: var(--text-muted); border-radius: 6px; box-shadow: none; cursor: pointer; transition: all 0.2s; white-space: nowrap;`;
        
        html += `<button class="tab-btn ${isActive ? 'active' : ''}" data-action="switch-type-tab" data-value="${t.value}" style="${style}">${t.label}</button>`;
    });
    
    tabsContainer.innerHTML = html;
}

function populateOppFilterOptions(selectId, options, defaultText) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="all">${defaultText}</option>` + 
        (options || []).map(opt => `<option value="${opt.value}">${opt.note || opt.value}</option>`).join('');
}

function handleOppFilterDropdownChange(e) {
    const filterKey = e.target.dataset.filter;
    opportunitiesListFilters[filterKey] = e.target.value;
    currentOppPage = 1;
    fetchAndRenderOpportunitiesTable(false); 
}

function clearAllOppFilters() {
    opportunitiesListFilters = { 
        year: 'all', type: 'all', source: 'all', time: 'all', stage: 'all' 
    };
    
    document.querySelectorAll('#opportunity-list-filters select').forEach(select => {
        select.value = 'all';
    });

    renderOpportunityTypeTabs(window.CRM_APP?.systemConfig?.['機會種類'] || []);

    currentOppPage = 1;
    fetchAndRenderOpportunitiesTable(false);
}

/**
 * [Phase 9-C] Incremental Append Table Fetching
 */
async function fetchAndRenderOpportunitiesTable(isAppend = false) {
    const listContent = document.getElementById('opportunities-page-content');
    const filterStatus = document.getElementById('opportunities-filter-status');
    const filterText = document.getElementById('opportunities-filter-text');
    const countDisplay = document.getElementById('opportunities-count-display');
    const query = document.getElementById('opportunities-list-search')?.value.trim() || '';

    if (!listContent) return;

    const activeFiltersCount = Object.entries(opportunitiesListFilters).filter(([k, v]) => k !== 'type' && v !== 'all' && v !== undefined).length;
    if (activeFiltersCount > 0) {
        if (filterStatus) filterStatus.style.display = 'flex';
        if (filterText) filterText.textContent = `已套用 ${activeFiltersCount} 個篩選`;
    } else {
        if (filterStatus) filterStatus.style.display = 'none';
    }

    if (!isAppend) {
        currentOppPage = 1;
        listContent.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入機會資料中...</p></div>';
    } else {
        const btn = document.getElementById('btn-load-more-opps');
        if (btn) {
            btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:var(--accent-blue);margin-right:8px;display:inline-block;vertical-align:middle;"></div>載入中...';
            btn.disabled = true;
        }
    }

    try {
        const params = new URLSearchParams();
        params.append('page', currentOppPage);
        params.append('limit', OPP_PAGE_LIMIT); 
        if (query) params.append('q', query);
        
        if (currentOppSort.field) {
            params.append('sortField', currentOppSort.field);
            params.append('sortDirection', currentOppSort.direction);
        }

        const keyMapping = { 'type': 'type', 'source': 'source', 'stage': 'stage' };

        for (const [key, value] of Object.entries(opportunitiesListFilters)) {
            if (value !== 'all' && value !== undefined) {
                const apiParam = keyMapping[key] || key;
                params.append(apiParam, value);
            }
        }

        const result = await authedFetch(`/api/opportunities?${params.toString()}`);
        
        const tableData = result.data || result || [];
        const totalCount = result.total !== undefined ? result.total : tableData.length;

        if (countDisplay) countDisplay.innerHTML = `共 ${totalCount} 筆`;

        if (!isAppend) {
            listContent.innerHTML = renderOpportunitiesTable(tableData);
        } else {
            const tbody = listContent.querySelector('.opp-list-table tbody');
            if (tbody) {
                tbody.insertAdjacentHTML('beforeend', renderOpportunityRows(tableData));
            }
            const oldBtnContainer = document.getElementById('opp-load-more-container');
            if (oldBtnContainer) oldBtnContainer.remove();
        }

        // Render Load More button if there's more data
        if (currentOppPage * OPP_PAGE_LIMIT < totalCount) {
            listContent.insertAdjacentHTML('beforeend', `
                <div id="opp-load-more-container" style="text-align: center; padding: 20px;">
                    <button id="btn-load-more-opps" class="action-btn secondary" data-action="load-more-opps" style="padding: 8px 24px; border-radius: 20px; font-weight: 600;">
                        載入更多 (${Math.min(currentOppPage * OPP_PAGE_LIMIT, totalCount)} / ${totalCount})
                    </button>
                </div>
            `);
        }

    } catch (error) {
        console.error('Fetch table data failed:', error);
        if (!isAppend) {
            listContent.innerHTML = `<div class="alert alert-error">載入表格失敗: ${error.message}</div>`;
        } else {
            const btn = document.getElementById('btn-load-more-opps');
            if (btn) {
                btn.innerHTML = '載入失敗，請重試';
                btn.disabled = false;
            }
        }
    }
}

function handleOpportunitiesSearch(event) {
    handleSearch(() => {
        currentOppPage = 1;
        fetchAndRenderOpportunitiesTable(false);
    });
}

function handleOppSort(field) {
    if (currentOppSort.field === field) {
        currentOppSort.direction = currentOppSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentOppSort.field = field;
        currentOppSort.direction = 'desc'; 
    }
    currentOppPage = 1;
    fetchAndRenderOpportunitiesTable(false);
}

function renderOpportunitiesTable(opportunities) {
    const styleId = 'opportunity-list-upgraded-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .opp-list-container { width: 100%; overflow-x: auto; background: var(--card-bg, #fff); }
            .opp-list-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
            .opp-list-table th { padding: 12px 16px; text-align: left; background: var(--glass-bg); color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
            .opp-list-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); vertical-align: middle; font-size: 0.95rem; color: var(--text-main); }
            .opp-list-table tr:not(.locked):hover { background-color: var(--glass-bg); }
            
            .opp-list-table tr.locked { background-color: var(--bg-locked); color: var(--text-locked); }
            .opp-list-table tr.locked td { color: var(--text-locked); }

            .opp-type-chip { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; color: white; white-space: nowrap; font-weight: 500; }
            .opp-sales-chip { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 0.8rem; color: white; white-space: nowrap; font-weight: 500; }
            .opp-channel-chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid #e5e7eb; background-color: #f9fafb; color: #374151; white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
            .opp-status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #f3f4f6; color: #4b5563; }
            
            .opp-list-table th.sortable { cursor: pointer; transition: color 0.2s; }
            .opp-list-table th.sortable:hover { color: var(--accent-blue); }
            .opp-sort-icon { margin-left: 4px; font-size: 0.8em; opacity: 0.5; }

            .col-idx { width: 60px; text-align: center !important; color: var(--text-muted); font-weight: 600; }
            .col-actions { width: 80px; text-align: center !important; }
            .btn-mini-delete { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; }
            .btn-mini-delete:hover { color: #ef4444; background: #fee2e2; }
        `;
        document.head.appendChild(style);
    }

    if (!opportunities || opportunities.length === 0) {
        return '<div class="alert alert-info" style="margin:2rem; text-align:center;">暫無符合條件的機會案件資料</div>';
    }

    const renderSortHeader = (field, label) => {
        let icon = '↕';
        if (currentOppSort.field === field) icon = currentOppSort.direction === 'asc' ? '↑' : '↓';
        return `<th class="sortable" data-action="sort" data-field="${field}">${label} <span class="opp-sort-icon">${icon}</span></th>`;
    };

    let html = `<div class="opp-list-container"><table class="opp-list-table"><thead><tr>
                    <th class="col-idx">項次</th>
                    ${renderSortHeader('effectiveLastActivity', '最後活動')}
                    <th>機會種類</th>
                    ${renderSortHeader('opportunityName', '機會名稱')}
                    ${renderSortHeader('customerCompany', '客戶公司')}
                    <th>銷售模式</th>
                    <th>主要通路</th>
                    <th>階段</th>
                    <th class="col-actions">操作</th>
                </tr></thead><tbody>`;

    html += renderOpportunityRows(opportunities);
    
    return html + '</tbody></table></div>';
}

function renderOpportunityRows(opportunities) {
    let html = '';
    const systemConfig = window.CRM_APP?.systemConfig || {};
    const stageNotes = new Map((systemConfig['機會階段'] || []).map(s => [s.value, s.note || s.value]));
    const typeColors = new Map((systemConfig['機會種類'] || []).map(t => [t.value, t.color]));
    const modelColors = new Map((systemConfig['銷售模式'] || []).map(m => [m.value, m.color]));

    opportunities.forEach((opp, index) => {
        const stageName = stageNotes.get(opp.currentStage) || opp.currentStage || '-';
        const typeColor = typeColors.get(opp.opportunityType) || '#9ca3af';
        const modelColor = modelColors.get(opp.salesModel) || '#6b7280';
        
        const channelText = opp.salesChannel || '-';
        const lastActivityDate = opp.effectiveLastActivity ? new Date(opp.effectiveLastActivity).toLocaleDateString('zh-TW') : '-';

        const oppParams = JSON.stringify({ opportunityId: opp.opportunityId }).replace(/"/g, '&quot;');
        const safeOppName = (opp.opportunityName || '').replace(/"/g, '&quot;');

        // Calculate absolute row index spanning across pages
        const absoluteIdx = (currentOppPage - 1) * OPP_PAGE_LIMIT + index + 1;

        html += `
            <tr>
                <td class="col-idx">${absoluteIdx}</td>
                <td style="white-space:nowrap;">${lastActivityDate}</td>
                <td><span class="opp-type-chip" style="background:${typeColor}">${opp.opportunityType || '未分類'}</span></td>
                <td style="min-width:180px;">
                    <a href="#" class="text-link" 
                       data-action="navigate" 
                       data-page="opportunity-details" 
                       data-params="${oppParams}">
                        <strong>${opp.opportunityName || '(未命名)'}</strong>
                    </a>
                </td>
                <td style="min-width:150px;">
                    <span style="color:var(--text-secondary);">${opp.customerCompany || '-'}</span>
                </td>
                <td><span class="opp-sales-chip" style="background:${modelColor}">${opp.salesModel || '-'}</span></td>
                <td><span class="opp-channel-chip" title="${channelText}">${channelText}</span></td>
                <td><span class="opp-status-badge">${stageName}</span></td>
                <td class="col-actions">
                    <button class="btn-mini-delete" title="刪除案件" 
                            data-action="delete-opp" 
                            data-opp-id="${opp.opportunityId}" 
                            data-name="${safeOppName}">
                        <svg style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>
                    </button>
                </td>
            </tr>`;
    });

    return html;
}

async function confirmDeleteOpportunity(oppId, opportunityName) {
    if (!oppId) { showNotification('無法刪除：缺少必要的紀錄 ID。', 'error'); return; }
    const message = `您確定要"永久刪除"\n機會案件 "${opportunityName || '(未命名)'}" 嗎？\n此操作無法復原！`;
    showConfirmDialog(message, async () => {
        showLoading('正在刪除...');
        try {
            const result = await authedFetch(`/api/opportunities/${oppId}`, { method: 'DELETE' });
            if (result.success) {
                currentOppPage = 1;
                fetchAndRenderOpportunitiesTable(false);
            } else { throw new Error(result.details || '刪除操作失敗'); }
        } catch (error) { if (error.message !== 'Unauthorized') console.error('刪除失敗:', error); }
        finally { hideLoading(); }
    });
}

async function loadFollowUpPage() {
    const container = document.getElementById('page-follow-up');
    if (!container) return;
    
    container.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入待追蹤清單中...</p></div>';
    
    container.removeEventListener('click', handleOpportunitiesClick);
    container.addEventListener('click', handleOpportunitiesClick);

    try {
        const result = await authedFetch('/api/dashboard');
        if (!result.success || !result.data) throw new Error(result.error || '無法獲取資料');
        const followUpFullList = (result.data.followUpList || []).sort((a, b) => (a.effectiveLastActivity || 0) - (b.effectiveLastActivity || 0));
        if (followUpFullList.length === 0) {
            container.innerHTML = '<div class="alert alert-success" style="padding: 2rem; text-align: center;">🎉 太棒了！目前沒有需要追蹤的機會案件。</div>';
        } else {
            const thresholdDays = window.CRM_APP?.systemConfig?.FOLLOW_UP?.DAYS_THRESHOLD || 7;
            container.innerHTML = `<div class="dashboard-widget"><div class="widget-header"><h2 class="widget-title">待追蹤案件 (${followUpFullList.length})</h2></div><div class="widget-content"><div class="alert alert-warning">⚠️ 已超過 ${thresholdDays} 天未有新活動。</div>${renderOpportunitiesTable(followUpFullList)}</div></div>`;
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') container.innerHTML = '<div class="alert alert-error">載入待追蹤清單失敗。</div>';
    }
}

if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules.opportunities = loadOpportunities;
    window.CRM_APP.pageModules['follow-up'] = loadFollowUpPage;
}
</file>

<file path="public/scripts/opportunities/opportunity-details-events.js">
// ============================================================================
// File: public/scripts/opportunities/opportunity-details-events.js
// ============================================================================
/**
 * Project: TFC CRM
 * File: public/scripts/opportunities/opportunity-details-events.js
 * Version: 8.1.4
 * Date: 2026-03-13
 * Changelog:
 * - [FIX] _getCompanyContacts now correctly resolves companyId from companyList before fetching company details, fixing ID-based routing.
 * - [FIX] Added window.dashboardManager.markStale() to save() success branch to force dashboard refresh upon return.
 * - [FIX] _initSpecQuantities: Robust handling for JSON string, CSV string, or Object to prevent .split() crash.
 * - [FIX] salesChannel/channelDetails conflict in save() payload.
 * - [FIX] Ensure potentialSpecification reads from normalized data.
 * - [PERF] Made toggleEditMode async to support Lazy Loading of the Edit Mode cascading logic.
 */

// public/scripts/opportunity-details-events.js
// 職責：處理「機會資訊卡」的使用者互動事件 (編輯切換、資料驗證、儲存)
// (V-Layout: 包含建立日期儲存)

const OpportunityInfoCardEvents = (() => {
    let _currentOppForEditing = null;
    let _specQuantities = new Map();

    function init(opportunityData) {
        _currentOppForEditing = opportunityData;
        _initSpecQuantities();
    }

    function _initSpecQuantities() {
        _specQuantities.clear();
        if (!_currentOppForEditing) return;

        const raw = _currentOppForEditing.potentialSpecification;

        // 3) 其他情況 (null, undefined, false...) -> 視為空 (Map已清空)
        if (!raw) return;

        if (typeof raw === 'string') {
            // 1) 若為字串
            let parsed = null;
            let isJsonSuccess = false;

            try {
                // 先嘗試 JSON.parse
                parsed = JSON.parse(raw);
                // 確保解析出來是物件 (且非 null)
                if (parsed && typeof parsed === 'object') {
                    _specQuantities = new Map(Object.entries(parsed));
                    isJsonSuccess = true;
                }
            } catch (e) {
                // JSON parse 失敗，準備進入 split 回退機制
                isJsonSuccess = false;
            }

            // 若 parse 失敗 (或是 JSON 但不是我們期望的 map 物件)，則用 split(',')
            if (!isJsonSuccess) {
                raw.split(',').forEach(s => {
                    const t = s.trim();
                    if (t) _specQuantities.set(t, 1);
                });
            }

        } else if (typeof raw === 'object') {
            // 2) 若為物件
            try {
                _specQuantities = new Map(Object.entries(raw));
            } catch (e) {
                console.error('[OpportunityEvents] Failed to convert object to map:', e);
            }
        }
    }

    async function toggleEditMode(isEditing) {
        const displayMode = document.getElementById('opportunity-info-display-mode');
        const editMode = document.getElementById('opportunity-info-edit-mode');
        if (!displayMode || !editMode) return;

        if (isEditing) {
            if (!_currentOppForEditing) return showNotification('資料未就緒', 'error');

            // [Phase 8.6A Perf] Lazy load the company lists only when User actually enters Edit Mode
            if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.ensureCascadingLogic === 'function') {
                showLoading('準備編輯環境...');
                try {
                    await OpportunityInfoCard.ensureCascadingLogic(_currentOppForEditing);
                } catch (e) {
                    console.error('[OpportunityEvents] Error loading cascading logic:', e);
                }
                hideLoading();
            }

            displayMode.style.display = 'none';
            editMode.style.display = 'block';
            _bindSpecEvents();
            _initSpecQuantities();

            if (_currentOppForEditing.customerCompany) {
                await handleCustomerChange(_currentOppForEditing.customerCompany, _currentOppForEditing.mainContact);
            }
            if (_currentOppForEditing.salesModel !== '直接販售' && _currentOppForEditing.channelDetails) {
                await handleChannelChange(_currentOppForEditing.channelDetails, _currentOppForEditing.channelContact);
            }
        } else {
            editMode.style.display = 'none';
            displayMode.style.display = 'block';
        }
    }

    function handleSingleSelectClick(element) {
        const container = element.closest('.single-select-container');
        const targetId = element.dataset.fieldTarget;
        const value = element.dataset.value;

        container.querySelectorAll('.info-option-pill').forEach(pill => pill.classList.remove('selected'));
        element.classList.add('selected');

        const hiddenInput = document.getElementById('edit-' + targetId);
        if (hiddenInput) hiddenInput.value = value;
    }

    async function handleSalesModelPillClick(element) {
        handleSingleSelectClick(element);
        const value = element.dataset.value;
        await OpportunityInfoCard.handleSalesModelChange(value, true);
    }

    async function _getCompanyContacts(companyName) {
        if (!companyName) return [];
        try {
            let companies = window.CRM_APP && window.CRM_APP.companyList ? window.CRM_APP.companyList : [];
            if (companies.length === 0) {
                const compRes = await authedFetch('/api/companies');
                if (compRes.success) {
                    companies = compRes.data;
                    if (window.CRM_APP) window.CRM_APP.companyList = companies;
                }
            }
            
            const company = companies.find(c => c.companyName === companyName);
            if (!company || !company.companyId) return [];

            const res = await authedFetch(`/api/companies/${encodeURIComponent(company.companyId)}/details`);
            if (res.success && res.data && Array.isArray(res.data.contacts)) {
                return res.data.contacts;
            }
        } catch (e) {
            console.error(`無法取得 ${companyName} 的聯絡人:`, e);
        }
        return [];
    }

    function _generateContactOptions(contacts, defaultContact) {
        let html = '<option value="">-- 請選擇 --</option>';
        if (contacts.length === 0) {
            html += '<option value="" disabled>無已建檔聯絡人</option>';
        } else {
            contacts.forEach(c => {
                const label = c.position ? `${c.name} (${c.position})` : c.name;
                const isSelected = defaultContact === c.name;
                html += `<option value="${c.name}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            });
        }
        if (defaultContact && !contacts.some(c => c.name === defaultContact)) {
            html += `<option value="${defaultContact}" selected>${defaultContact} (未知/自填)</option>`;
        }
        return html;
    }

    async function handleCustomerChange(customerName, defaultContact = null) {
        const contactSelect = document.getElementById('edit-main-contact');
        if (!contactSelect) return;

        contactSelect.innerHTML = '<option value="">載入中...</option>';
        contactSelect.disabled = true;

        const contacts = await _getCompanyContacts(customerName);

        contactSelect.innerHTML = _generateContactOptions(contacts, defaultContact);
        contactSelect.disabled = false;

        const salesModelInput = document.getElementById('edit-sales-model');
        const channelSelect = document.getElementById('edit-channel-details');

        if (salesModelInput && salesModelInput.value === '直接販售' && channelSelect) {
            channelSelect.innerHTML = `<option value="${customerName}" selected>${customerName} (直販)</option>`;
            channelSelect.disabled = true;

            const channelContactSelect = document.getElementById('edit-channel-contact');
            if (channelContactSelect) {
                channelContactSelect.innerHTML = '<option value="">-- 不適用 --</option>';
                channelContactSelect.disabled = true;
            }
        }
    }

    async function handleChannelChange(companyName, defaultContact = null) {
        const contactSelect = document.getElementById('edit-channel-contact');
        if (!contactSelect) return;

        if (!companyName) {
            contactSelect.innerHTML = '<option value="">-- 請先選擇通路公司 --</option>';
            contactSelect.disabled = true;
            return;
        }

        contactSelect.innerHTML = '<option value="">載入中...</option>';
        contactSelect.disabled = true;

        const contacts = await _getCompanyContacts(companyName);

        contactSelect.innerHTML = _generateContactOptions(contacts, defaultContact);
        contactSelect.disabled = false;
    }

    function handleManualOverride(checkbox) {
        const input = document.getElementById('edit-opportunity-value');
        if (!input) return;
        if (checkbox.checked) {
            input.disabled = false;
        } else {
            input.disabled = true;
            _calculateTotalValue();
        }
    }

    function _bindSpecEvents() {
        const container = document.getElementById('spec-pills-container');
        if (!container) return;

        container.onclick = null;

        container.onclick = (e) => {
            const pill = e.target.closest('.info-option-pill');
            const qtySpan = e.target.closest('.pill-quantity');

            if (qtySpan) {
                e.stopPropagation();
                _handleQuantityChange(qtySpan);
            } else if (pill) {
                _handleSpecAccumulate(pill);
            }
        };
    }

    function _handleSpecAccumulate(pill) {
        const specId = pill.dataset.specId;
        const systemConfig = (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['可能下單規格']) || [];
        const config = systemConfig.find(s => s.value === specId);
        const allowQuantity = config && config.value3 === 'allow_quantity';

        if (_specQuantities.has(specId)) {
            if (allowQuantity) {
                const current = _specQuantities.get(specId);
                _specQuantities.set(specId, current + 1);
                _updatePillUI(pill, current + 1);
            } else {
                _specQuantities.delete(specId);
                pill.classList.remove('selected');
            }
        } else {
            _specQuantities.set(specId, 1);
            pill.classList.add('selected');
            if (allowQuantity) _addQuantityBadge(pill, 1, specId);
        }
        _calculateTotalValue();
    }

    function _handleQuantityChange(span) {
        const specId = span.dataset.specId;
        const current = _specQuantities.get(specId) || 1;
        const input = prompt('請輸入數量 (輸入 0 可移除):', current);
        if (input !== null) {
            const num = parseInt(input);
            const pill = span.closest('.info-option-pill');
            if (!isNaN(num) && num > 0) {
                _specQuantities.set(specId, num);
                span.innerText = `(x${num})`;
            } else {
                _specQuantities.delete(specId);
                pill.classList.remove('selected');
                span.remove();
            }
            _calculateTotalValue();
        }
    }

    function _addQuantityBadge(pill, qty, specId) {
        let span = pill.querySelector('.pill-quantity');
        if (!span) {
            span = document.createElement('span');
            span.className = 'pill-quantity';
            span.dataset.specId = specId;
            pill.appendChild(span);
        }
        span.innerText = `(x${qty})`;
    }

    function _updatePillUI(pill, qty) {
        let span = pill.querySelector('.pill-quantity');
        if (span) span.innerText = `(x${qty})`;
    }

    function _calculateTotalValue() {
        const manualCheck = document.getElementById('value-manual-override-checkbox');
        if (manualCheck && manualCheck.checked) return;

        const input = document.getElementById('edit-opportunity-value');
        if (!input) return;

        const systemConfig = (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['可能下單規格']) || [];
        let total = 0;
        _specQuantities.forEach((qty, specId) => {
            const config = systemConfig.find(s => s.value === specId);
            if (config && config.value2) total += (parseFloat(config.value2) || 0) * qty;
        });

        // NOTE: keep raw number (no commas) if your backend expects numeric string
        input.value = String(Math.round(total));
    }

    // ======= 핵심修補：避免「沒改的欄位」被空字串覆蓋 =======
    async function save() {
        if (!_currentOppForEditing) return;

        // Return undefined if element doesn't exist (do NOT return '')
        const getValueMaybe = (id) => {
            const el = document.getElementById(id);
            if (!el) return undefined;
            const v = (el.value ?? '').toString().trim();
            return v;
        };

        const oppName = getValueMaybe('edit-opportunity-name');
        const finalOppName = (oppName !== undefined) ? oppName : (_currentOppForEditing.opportunityName || '');
        if (!finalOppName) return showNotification('機會名稱必填', 'error');

        const specData = {};
        _specQuantities.forEach((v, k) => specData[k] = v);

        const manualEl = document.getElementById('value-manual-override-checkbox');
        const isManual = manualEl ? !!manualEl.checked : ((_currentOppForEditing.opportunityValueType || _currentOppForEditing.valueCalcMode) === 'manual');

        const salesModel = getValueMaybe('edit-sales-model');
        const finalSalesModel = (salesModel !== undefined) ? salesModel : (_currentOppForEditing.salesModel || '');

        let channelDetails = getValueMaybe('edit-channel-details');
        let channelContact = getValueMaybe('edit-channel-contact');

        // If direct sale, channelDetails should follow customerCompany
        const customerCompany = getValueMaybe('edit-customer-company');
        const finalCustomerCompany = (customerCompany !== undefined) ? customerCompany : (_currentOppForEditing.customerCompany || '');

        if (finalSalesModel === '直接販售') {
            channelDetails = finalCustomerCompany;
            channelContact = '';
        }

        // For each field: if DOM missing -> keep existing value
        const pick = (maybe, existingKeys, fallback = '') => {
            if (maybe !== undefined) return maybe;
            for (const k of existingKeys) {
                const v = _currentOppForEditing[k];
                if (v !== undefined && v !== null) return (typeof v === 'string') ? v : String(v);
            }
            return fallback;
        };

        const finalChannelDetails = pick(channelDetails, ['channelDetails', 'salesChannel'], '');
        const finalMainContact = pick(getValueMaybe('edit-main-contact'), ['mainContact'], '');
        const finalChannelContact = pick(channelContact, ['channelContact'], '');

        const finalExpectedCloseDate = pick(getValueMaybe('edit-expected-close-date'), ['expectedCloseDate'], '');
        const finalCreatedTime = pick(getValueMaybe('edit-created-time'), ['createdTime'], '');

        // These are the legacy keys your frontend uses; backend may map them
        const finalAssignee = pick(getValueMaybe('edit-assignee'), ['assignee', 'owner'], '');
        const finalOppSource = pick(getValueMaybe('edit-opportunity-source'), ['opportunitySource', 'source'], '');
        const finalOppType = pick(getValueMaybe('edit-opportunity-type'), ['opportunityType'], '');
        const finalStage = pick(getValueMaybe('edit-current-stage'), ['currentStage'], '');
        const finalProb = pick(getValueMaybe('edit-order-probability'), ['orderProbability', 'winProbability'], '');
        
        // [FORENSICS FIX] Ignore the hidden 'edit-sales-channel' input which may be stale.
        // In the writer logic, salesChannel is prioritized. We MUST sync it with channelDetails.
        const finalSalesChannel = finalChannelDetails;

        const finalDeviceScale = pick(getValueMaybe('edit-device-scale'), ['deviceScale', 'equipmentScale'], '');
        const finalNotes = pick(getValueMaybe('edit-notes'), ['notes'], '');

        // Value
        const rawValMaybe = getValueMaybe('edit-opportunity-value');
        const finalValue = (rawValMaybe !== undefined)
            ? (rawValMaybe.replace(/,/g, '') || '0')
            : (String(_currentOppForEditing.opportunityValue ?? '0').replace(/,/g, '') || '0');

        const updateData = {
            opportunityName: finalOppName,
            customerCompany: finalCustomerCompany,
            channelDetails: finalChannelDetails,
            mainContact: finalMainContact,
            channelContact: finalChannelContact,
            expectedCloseDate: finalExpectedCloseDate,

            // Created date
            createdTime: finalCreatedTime,

            salesModel: finalSalesModel,

            // Legacy UI keys (compatible with current frontend)
            assignee: finalAssignee,
            opportunitySource: finalOppSource,
            opportunityType: finalOppType,
            currentStage: finalStage,
            orderProbability: finalProb,
            
            // [FORENSICS FIX] Send synced salesChannel to satisfy SQL Writer priority
            salesChannel: finalSalesChannel,
            
            deviceScale: finalDeviceScale,

            opportunityValue: finalValue,
            opportunityValueType: isManual ? 'manual' : 'auto',
            potentialSpecification: JSON.stringify(specData),

            // Keep as-is if you don't use drive link in UI yet
            driveFolderLink: pick(undefined, ['driveFolderLink', 'driveLink'], ''),

            notes: finalNotes
        };

        showLoading('正在儲存...');
        try {
            const result = await authedFetch(`/api/opportunities/${_currentOppForEditing.opportunityId}`, {
                method: 'PUT',
                // IMPORTANT: avoid authedFetch "smart refresh" interfering; we handle UI ourselves
                skipRefresh: true,
                body: JSON.stringify({ ...updateData, modifier: getCurrentUser() })
            });

            if (result && result.success) {
                showNotification('儲存成功', 'success');

                // Update local state without wiping
                const updatedOpp = { ..._currentOppForEditing, ...updateData };
                _currentOppForEditing = updatedOpp;
                window.currentOpportunityData = updatedOpp;

                // Re-render info card (display wrappers + view)
                if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.render === 'function') {
                    OpportunityInfoCard.render(updatedOpp);
                }

                // Re-init state
                init(updatedOpp);

                toggleEditMode(false);

                // [Phase 8.11 Patch] Flag dashboard as stale to force refresh on back navigation
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } else {
                throw new Error((result && result.error) || '儲存失敗');
            }
        } catch (e) {
            showNotification(e.message, 'error');
        } finally {
            hideLoading();
        }
    }

    return {
        init,
        toggleEditMode,
        save,
        handleSingleSelectClick,
        handleSalesModelPillClick,
        handleCustomerChange,
        handleChannelChange,
        handleManualOverride
    };
})();
</file>

<file path="public/scripts/opportunities/opportunity-details.js">
// ============================================================================
// File: public/scripts/opportunities/opportunity-details.js
// ============================================================================
/**
 * Project: TFC CRM
 * File: public/scripts/opportunities/opportunity-details.js
 * Version: 8.1.2 (Phase 8.6A - Perf Patch)
 * Date: 2026-03-11
 * Changelog:
 * - [FIX] Explicitly map SQL 'productDetails' to UI 'potentialSpecification' to fix edit mode data loss.
 * - [FIX] Sync 'salesChannel' and 'channelDetails' to prevent writer conflicts.
 * - [PERF] Removed redundant CRM_APP.updateAllDropdowns() to eliminate duplicate companyList fetches.
 */

window.currentDetailOpportunityId = null;
window.currentOpportunityData = null;

/**
 * Phase 8: normalize DTO (SQL) keys <-> legacy UI keys
 * Ensures BOTH display view and edit form can read values after hard refresh.
 */
function normalizeOppForUi(opp) {
    const o = opp || {};

    const pick = (keys, fallback = '') => {
        for (const k of keys) {
            const v = o[k];
            if (v === null || v === undefined) continue;
            if (typeof v === 'string') {
                const t = v.trim();
                if (t !== '') return t;
                continue;
            }
            return v;
        }
        return fallback;
    };

    // Canonical DTO keys (from SQL reader) + legacy keys (used by UI/edit form)
    const normalized = { ...o };

    // Identity & Core
    normalized.opportunityId = o.opportunityId; // Ensure ID exists

    // owner <-> assignee
    normalized.owner = pick(['owner', 'assignee'], normalized.owner);
    normalized.assignee = pick(['assignee', 'owner'], normalized.assignee);

    // source <-> opportunitySource
    normalized.source = pick(['source', 'opportunitySource'], normalized.source);
    normalized.opportunitySource = pick(['opportunitySource', 'source'], normalized.opportunitySource);

    // equipmentScale <-> deviceScale
    normalized.equipmentScale = pick(['equipmentScale', 'deviceScale'], normalized.equipmentScale);
    normalized.deviceScale = pick(['deviceScale', 'equipmentScale'], normalized.deviceScale);

    // winProbability <-> orderProbability
    normalized.winProbability = pick(['winProbability', 'orderProbability'], normalized.winProbability);
    normalized.orderProbability = pick(['orderProbability', 'winProbability'], normalized.orderProbability);

    // valueCalcMode <-> opportunityValueType
    normalized.valueCalcMode = pick(['valueCalcMode', 'opportunityValueType'], normalized.valueCalcMode);
    normalized.opportunityValueType = pick(['opportunityValueType', 'valueCalcMode'], normalized.opportunityValueType);

    // driveLink <-> driveFolderLink
    normalized.driveLink = pick(['driveLink', 'driveFolderLink'], normalized.driveLink);
    normalized.driveFolderLink = pick(['driveFolderLink', 'driveLink'], normalized.driveFolderLink);

    // [FORENSICS FIX] productDetails (SQL) <-> potentialSpecification (UI)
    // SQL Reader gives 'productDetails'. UI expects 'potentialSpecification'.
    normalized.productDetails = pick(['productDetails', 'potentialSpecification'], normalized.productDetails);
    normalized.potentialSpecification = pick(['potentialSpecification', 'productDetails'], normalized.potentialSpecification);

    // [FORENSICS FIX] salesChannel (SQL) <-> channelDetails (UI)
    // SQL Writer creates conflict if these differ. We sync them here.
    normalized.salesChannel = pick(['salesChannel', 'channelDetails'], normalized.salesChannel);
    normalized.channelDetails = pick(['channelDetails', 'salesChannel'], normalized.channelDetails);

    // notes (ensure string-ish)
    if (normalized.notes === null || normalized.notes === undefined) normalized.notes = '';

    return normalized;
}

/**
 * 載入並渲染機會詳細頁面的主函式
 * @param {string} opportunityId - 機會ID
 */
async function loadOpportunityDetailPage(opportunityId) {
    window.currentDetailOpportunityId = opportunityId;

    const container = document.getElementById('page-opportunity-details');
    if (!container) return;

    container.innerHTML = `
        <div class="loading show" style="padding-top: 50px;">
            <div class="spinner"></div>
            <p>正在載入機會詳細資料...</p>
        </div>
    `;

    try {
        const opportunityDetailPageTemplate = await fetch('/views/opportunity-detail.html').then(res => res.text());
        const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
        if (!result.success) throw new Error(result.error);

        const {
            opportunityInfo,
            interactions,
            eventLogs,
            linkedContacts,
            potentialContacts,
            parentOpportunity,
            childOpportunities
        } = result.data;

        // ✅ Phase 8: normalize DTO->UI keys so edit mode can show SQL data after refresh
        const normalizedOpp = normalizeOppForUi(opportunityInfo);

        window.currentOpportunityData = normalizedOpp;

        // 1. 注入主模板
        container.innerHTML = opportunityDetailPageTemplate;
        document.getElementById('page-title').textContent = '機會案件管理 - 機會詳細';
        document.getElementById('page-subtitle').textContent = '機會詳細資料與關聯活動';

        // 2. 注入資訊卡
        const infoCardContainer = document.getElementById('opportunity-info-card-container');
        if (infoCardContainer) {
            if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.render === 'function') {
                OpportunityInfoCard.render(normalizedOpp);
            } else if (typeof OpportunityInfoView !== 'undefined' && typeof OpportunityInfoView.render === 'function') {
                infoCardContainer.innerHTML = `
                    <div class="dashboard-widget">
                        <div class="widget-content">
                            ${OpportunityInfoView.render(normalizedOpp)}
                        </div>
                    </div>
                `;
            }
        }

        // 3. 初始化資訊卡事件（用 normalizedOpp，讓 state 也帶雙 key）
        if (typeof OpportunityInfoCardEvents !== 'undefined' && typeof OpportunityInfoCardEvents.init === 'function') {
            OpportunityInfoCardEvents.init(normalizedOpp);
        }

        // 4. 其他模組初始化（順序不變）
        const Stepper = window.OpportunityStepper || (typeof OpportunityStepper !== 'undefined' ? OpportunityStepper : null);
        if (Stepper && typeof Stepper.init === 'function') {
            Stepper.init(normalizedOpp);
        }

        const Events = window.OpportunityEvents || (typeof OpportunityEvents !== 'undefined' ? OpportunityEvents : null);
        if (Events && typeof Events.init === 'function') {
            Events.init(eventLogs || [], {
                opportunityId: normalizedOpp.opportunityId,
                opportunityName: normalizedOpp.opportunityName,
                linkedContacts: linkedContacts || []
            });
        }

        const interactionContainer = document.getElementById('tab-content-interactions');
        if (interactionContainer) {
            const Interactions = window.OpportunityInteractions || (typeof OpportunityInteractions !== 'undefined' ? OpportunityInteractions : null);
            if (Interactions && typeof Interactions.init === 'function') {
                Interactions.init(
                    interactionContainer,
                    { opportunityId: normalizedOpp.opportunityId },
                    interactions || []
                );
            }
        }

        const Contacts = window.OpportunityContacts || (typeof OpportunityContacts !== 'undefined' ? OpportunityContacts : null);
        if (Contacts && typeof Contacts.init === 'function') {
            Contacts.init(normalizedOpp, linkedContacts || []);
        }

        const AssocOpps = window.OpportunityAssociatedOpps || (typeof OpportunityAssociatedOpps !== 'undefined' ? OpportunityAssociatedOpps : null);
        if (AssocOpps && typeof AssocOpps.render === 'function') {
            AssocOpps.render({
                opportunityInfo: normalizedOpp,
                parentOpportunity,
                childOpportunities
            });
        }

        if (window.PotentialContactsManager) {
            PotentialContactsManager.render({
                containerSelector: '#opp-potential-contacts-container',
                potentialContacts: potentialContacts || [],
                comparisonList: linkedContacts || [],
                comparisonKey: 'name',
                context: 'opportunity',
                opportunityId: normalizedOpp.opportunityId
            });
        }

        // [Phase 8.6A PERF] Removed global CRM_APP.updateAllDropdowns() to prevent redundant companyList fetch.
        
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('[OpportunityDetails] 載入失敗:', error);
            container.innerHTML = `
                <div class="alert alert-error">
                    載入機會詳細資料失敗: ${error.message}
                </div>
            `;
        }
    }
}

// 向主應用程式註冊此模組管理的頁面載入函式
window.loadOpportunityDetailPage = loadOpportunityDetailPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules['opportunity-details'] = loadOpportunityDetailPage;
}
</file>

<file path="public/scripts/opportunities/opportunity-modals.js">
/**
 * public/scripts/opportunities/opportunity-modals.js
 * @version v5.0.10
 * @date 2026-04-17
 * @changelog
 * - Fix empty contact creation by trimming mainContact in payload
 * - Fix wizard card search residual input state
 * - Add success notification after opportunity creation
 * - Auto navigate to created opportunity detail page
 */

// 職責：管理所有與「機會」相關的彈出視窗 (新增Wizard、編輯、關聯)

// ==================== 全域變數 ====================
let allSearchedContacts = [];
let companySearchTimeout;
let linkOppSearchTimeout;

// ==================== Wizard 核心邏輯 (新增機會專用) ====================
const NewOppWizard = {
    state: {
        step: 1,
        path: null, // 'card', 'old', 'new'
        data: {
            companyName: '',
            mainContact: '',
            contactPhone: '',
            county: '',
            sourceId: null, // 用於名片轉入 (Contact rowIndex)
            lastGeneratedName: ''
        }
    },

    // 初始化與顯示
    show: function() {
        this.reset();
        showModal('new-opportunity-modal');
        
        // 調整 UI (隱藏欄位、加星號、置中)
        this._adjustUI();

        // 嘗試預先填入地區選單
        if (typeof populateCountyDropdown === 'function') {
            populateCountyDropdown('wiz-manual-county');
        }
        
        // 載入下拉選單
        if(window.CRM_APP && window.CRM_APP.systemConfig) {
            if (typeof populateSelect === 'function') {
                populateSelect('wiz-opp-type', window.CRM_APP.systemConfig['機會種類']);
                populateSelect('wiz-opp-source', window.CRM_APP.systemConfig['機會來源']);
                
                // 預設選取第一個階段
                const stages = window.CRM_APP.systemConfig['機會階段'] || [];
                const defaultStage = stages.length > 0 ? stages[0].value : '01_初步接觸';
                populateSelect('wiz-stage', stages, defaultStage);
                
                populateSelect('wiz-assignee', window.CRM_APP.systemConfig['團隊成員'], getCurrentUser());
            }
        }
        
        this.renderStep();
    },

    // 【新增】從聯絡人列表直接啟動 Wizard 並帶入資料
    startWithContact: function(contact) {
        // 1. 先顯示並重置 Wizard
        this.show();
        
        // 2. 設定路徑狀態為 'card' (名片轉入模式)
        this.state.path = 'card';
        
        // 3. 直接呼叫 selectCard 邏輯來填入資料並跳轉
        // 這會自動設定 companyName, mainContact, sourceId 等，並執行 nextStep()
        this.selectCard(contact);
    },

    // 內部 UI 調整函式
    _adjustUI: function() {
        // 1. 隱藏預計結案日與機會價值
        const dateInput = document.getElementById('wiz-close-date');
        const valueInput = document.getElementById('wiz-value');
        if (dateInput) dateInput.closest('.form-group').style.display = 'none';
        if (valueInput) valueInput.closest('.form-group').style.display = 'none';

        // 2. 必填欄位加註米字號
        const addStar = (id) => {
            const el = document.getElementById(id);
            if (el) {
                const label = el.closest('.form-group')?.querySelector('label');
                if (label && !label.innerHTML.includes('*')) {
                    label.innerHTML += ' <span style="color:var(--accent-red)">*</span>';
                }
            }
        };
        ['wiz-opp-type', 'wiz-opp-name', 'wiz-assignee', 'wiz-stage'].forEach(addStar);

        // 3. 即將建立卡片置中
        const summaryCard = document.querySelector('#new-opportunity-wizard-form .summary-card');
        if (summaryCard) {
            summaryCard.style.margin = '20px auto';
            summaryCard.style.textAlign = 'center';
            summaryCard.style.maxWidth = '400px';
        }

        // 4. 綁定聯絡人搜尋框 (Client-side filter)
        const cardSearch = document.getElementById('wiz-card-search');
        if (cardSearch && !cardSearch.dataset.eventsBound) {
            cardSearch.removeAttribute('onkeyup');
            cardSearch.setAttribute('autocomplete', 'off');
            cardSearch.addEventListener('focus', (e) => this.searchCards(e.target.value));
            cardSearch.addEventListener('input', (e) => this.searchCards(e.target.value));
            cardSearch.dataset.eventsBound = 'true';
        }
    },

    // 重置狀態
    reset: function() {
        this.state = {
            step: 1,
            path: null,
            data: { companyName: '', mainContact: '', contactPhone: '', county: '', sourceId: null, lastGeneratedName: '' }
        };
        
        const form = document.getElementById('new-opportunity-wizard-form');
        if (form) form.reset();
        
        const cardSearch = document.getElementById('wiz-card-search');
        if (cardSearch) cardSearch.value = '';
        
        // 重置 UI 顯示狀態
        const entryOptions = document.getElementById('wiz-entry-options');
        if (entryOptions) entryOptions.style.display = 'grid';
        
        document.querySelectorAll('.wiz-path-section').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.entry-option-card').forEach(el => el.classList.remove('selected'));
        
        const oldContactArea = document.getElementById('wiz-old-contact-area');
        if (oldContactArea) oldContactArea.style.display = 'none';
        
        const newContactInputs = document.getElementById('wiz-new-contact-inputs');
        if (newContactInputs) newContactInputs.style.display = 'none';
        
        // 重置按鈕狀態
        const btnPrev = document.getElementById('wiz-btn-prev');
        if (btnPrev) btnPrev.style.display = 'none';
        const btnNext = document.getElementById('wiz-btn-next');
        if (btnNext) btnNext.style.display = 'none';
        const btnSubmit = document.getElementById('wiz-btn-submit');
        if (btnSubmit) btnSubmit.style.display = 'none';
    },

    // 選擇路徑 (Step 1)
    selectPath: function(path) {
        this.state.path = path;
        
        // UI 更新
        document.querySelectorAll('.entry-option-card').forEach(el => el.classList.remove('selected'));
        
        // 隱藏入口選項，顯示對應路徑的內容
        document.getElementById('wiz-entry-options').style.display = 'none';
        document.querySelectorAll('.wiz-path-section').forEach(el => el.style.display = 'none');

        const targetSection = document.getElementById(`wiz-path-${path}`);
        if (targetSection) targetSection.style.display = 'block';
        
        // 顯示「上一步」按鈕
        document.getElementById('wiz-btn-prev').style.display = 'block';
        
        // 路徑初始化邏輯
        if(path === 'card') {
            this.loadRecentCards();
        } else if(path === 'new') {
             document.getElementById('wiz-btn-next').style.display = 'block';
        } else if(path === 'old') {
             document.getElementById('wiz-btn-next').style.display = 'block'; 
             setTimeout(() => {
                 const input = document.getElementById('wiz-company-search');
                 if (input) input.focus();
             }, 100);
        }
    },

    // [路徑 A] 載入最近名片
    loadRecentCards: async function() {
        const list = document.getElementById('wiz-card-list');
        if (!list) return;
        
        try {
            if (allSearchedContacts.length === 0) {
                list.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
                const result = await authedFetch(`/api/contacts`);
                allSearchedContacts = result.data || [];
            }
            this.renderCardList(allSearchedContacts.slice(0, 5));
        } catch(e) {
            console.error(e);
            list.innerHTML = '<div class="alert alert-error">載入名片失敗</div>';
        }
    },

    searchCards: function(query) {
        const list = document.getElementById('wiz-card-list');
        if (!list) return;
        
        if(!query || !query.trim()) { 
            this.renderCardList(allSearchedContacts.slice(0, 5)); 
            return; 
        }
        
        const q = query.toLowerCase().trim();
        const filtered = allSearchedContacts.filter(c => {
            return (c.name && c.name.toLowerCase().includes(q)) || 
                   (c.company && c.company.toLowerCase().includes(q));
        });
        
        this.renderCardList(filtered);
    },

    renderCardList: function(cards) {
        const list = document.getElementById('wiz-card-list');
        if (!list) return;
        
        if(cards.length === 0) {
            list.innerHTML = '<div class="search-result-item" style="cursor:default; color:var(--text-muted);">無符合資料</div>';
            return;
        }
        
        list.innerHTML = cards.map(c => {
            const safeJson = JSON.stringify(c).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
            const companyDisplay = c.company || '未知公司';
            const titleDisplay = c.position || c.jobTitle || '未知職位';
            return `
            <div class="search-result-item" onclick='NewOppWizard.selectCard(${safeJson})'>
                ${c.name} ｜ ${companyDisplay} ｜ ${titleDisplay}
            </div>
        `}).join('');
    },

    // 選定名片後的動作
    selectCard: function(card) {
        this.state.data.companyName = card.company;
        this.state.data.mainContact = card.name;
        this.state.data.contactPhone = card.mobile || card.phone;
        this.state.data.sourceId = card.rowIndex;
        
        if(card.address && typeof detectCountyFromAddress === 'function') {
            const detected = detectCountyFromAddress(card.address);
            if(detected) this.state.data.county = detected;
        }

        // 清空名稱以觸發自動命名
        const nameInput = document.getElementById('wiz-opp-name');
        if (nameInput) nameInput.value = '';

        // 自動跳到下一步
        this.nextStep();
    },

    // [路徑 B] 搜尋公司 (僅搜尋公司總表)
    searchCompanies: function(query) {
        handleSearch(async () => {
            const list = document.getElementById('wiz-company-results');
            if (!list) return;
            
            if(!query) { list.innerHTML = ''; list.style.display = 'none'; return; }
            
            list.style.display = 'block';
            list.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
            
            try {
                const compRes = await authedFetch('/api/companies');
                const companies = (compRes.data || []).filter(c => c.companyName.toLowerCase().includes(query.toLowerCase()));

                let html = '';
                if (companies.length > 0) {
                    companies.forEach(c => {
                        const safeJson = JSON.stringify(c).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
                        html += `<div class="search-result-item" onclick='NewOppWizard.selectOldCompany(${safeJson})'>
                            <strong>🏢 ${c.companyName}</strong>
                        </div>`;
                    });
                } else {
                    html = `<div class="search-result-item" style="color: var(--text-muted); cursor: default;">
                                找不到符合的公司。<br>
                                若為新客戶，請改用 <a href="#" onclick="NewOppWizard.switchToNewPath('${query.replace(/'/g, "\\'")}')" class="text-link">【全新開發】</a> 路徑。
                            </div>`;
                }
                list.innerHTML = html;
            } catch(e) { 
                console.error(e); 
                list.innerHTML = '<div class="search-result-item">搜尋發生錯誤</div>';
            }
        });
    },

    // 選定已建檔公司
    selectOldCompany: async function(company) {
        this.state.data.companyName = company.companyName;
        this.state.data.county = company.county;
        
        // 清空名稱以觸發自動命名
        const nameInput = document.getElementById('wiz-opp-name');
        if (nameInput) nameInput.value = '';
        
        document.getElementById('wiz-company-search').value = company.companyName;
        document.getElementById('wiz-company-results').style.display = 'none';
        
        document.getElementById('wiz-old-contact-area').style.display = 'block';
        document.getElementById('wiz-selected-company-name').textContent = company.companyName;

        // 載入該公司的聯絡人
        const select = document.getElementById('wiz-old-contact-select');
        select.innerHTML = '<option>載入中...</option>';
        
        try {
            const detail = await authedFetch(`/api/companies/${encodeURIComponent(company.companyName)}/details`);
            const contacts = detail.data.contacts || [];
            
            let opts = '<option value="">請選擇聯絡人...</option>';
            contacts.forEach(c => {
                const val = JSON.stringify({name: c.name, phone: c.mobile || c.phone}).replace(/"/g, "&quot;");
                opts += `<option value="${val}">${c.name}</option>`;
            });
            opts += '<option value="NEW_CONTACT">➕ 新增聯絡人</option>';
            select.innerHTML = opts;
        } catch(e) {
            console.error(e);
            select.innerHTML = '<option value="NEW_CONTACT">載入失敗，直接新增</option>';
        }
    },

    handleContactSelect: function(select) {
        const val = select.value;
        const newContactArea = document.getElementById('wiz-new-contact-inputs');
        
        if(val === 'NEW_CONTACT') {
            newContactArea.style.display = 'block';
            this.state.data.mainContact = ''; 
            this.state.data.contactPhone = '';
            setTimeout(() => document.getElementById('wiz-new-contact-name').focus(), 100);
        } else if(val) {
            newContactArea.style.display = 'none';
            const c = JSON.parse(val);
            this.state.data.mainContact = c.name;
            this.state.data.contactPhone = c.phone;
        } else {
            newContactArea.style.display = 'none';
            this.state.data.mainContact = '';
        }
    },

    // 切換到全新開發路徑 (並帶入已輸入的公司名稱)
    switchToNewPath: function(name) {
        this.selectPath('new');
        setTimeout(() => {
            document.getElementById('wiz-manual-company').value = name;
            const nameInput = document.getElementById('wiz-opp-name');
            if (nameInput) nameInput.value = ''; 
        }, 50);
    },

    // ==================== 導航與驗證邏輯 ====================
    nextStep: function() {
        // Step 1 驗證
        if(this.state.step === 1) {
            if(this.state.path === 'new') {
                const comp = document.getElementById('wiz-manual-company').value.trim();
                const name = document.getElementById('wiz-manual-contact').value.trim();
                const phone = document.getElementById('wiz-manual-phone').value.trim();
                const county = document.getElementById('wiz-manual-county').value;
                
                if(!comp || !name) { showNotification('公司名稱與聯絡人姓名為必填', 'error'); return; }
                
                this.state.data.companyName = comp;
                this.state.data.mainContact = name;
                this.state.data.contactPhone = phone;
                this.state.data.county = county;
                
            } else if (this.state.path === 'old') {
                const select = document.getElementById('wiz-old-contact-select');
                
                if(select.value === 'NEW_CONTACT') {
                    const name = document.getElementById('wiz-new-contact-name').value.trim();
                    const phone = document.getElementById('wiz-new-contact-phone').value.trim();
                    if(!name) { showNotification('請輸入新聯絡人姓名', 'error'); return; }
                    this.state.data.mainContact = name;
                    this.state.data.contactPhone = phone;
                } else if (!select.value) {
                    if (!this.state.data.companyName) {
                        showNotification('請先選擇公司', 'warning'); return;
                    }
                    showNotification('請選擇一位聯絡人，或選擇新增', 'warning'); 
                    return;
                }
            }
        }

        // Step 2 驗證
        if(this.state.step === 2) {
            const type = document.getElementById('wiz-opp-type').value;
            const name = document.getElementById('wiz-opp-name').value.trim();
            
            if (!type) { showNotification('請選擇機會種類', 'error'); return; }
            if (!name) { showNotification('請輸入機會名稱', 'error'); return; }
        }

        // 前進下一步
        this.state.step++;
        this.renderStep();
    },

    prevStep: function() {
        if(this.state.step === 1) {
            this.state.path = null;
            document.getElementById('wiz-entry-options').style.display = 'grid';
            document.querySelectorAll('.wiz-path-section').forEach(el => el.style.display = 'none');
            document.getElementById('wiz-btn-prev').style.display = 'none';
            document.getElementById('wiz-btn-next').style.display = 'none';
        } else {
            this.state.step--;
            this.renderStep();
        }
    },

    renderStep: function() {
        const step = this.state.step;
        
        document.querySelectorAll('.step-item').forEach(el => {
            const s = parseInt(el.dataset.step);
            if(s === step) el.className = 'step-item active';
            else if(s < step) el.className = 'step-item completed'; 
            else el.className = 'step-item';
        });

        document.querySelectorAll('.wizard-step-content').forEach(el => el.style.display = 'none');
        const targetContent = document.querySelector(`.wizard-step-content[data-step="${step}"]`);
        if(targetContent) targetContent.style.display = 'block';

        const btnNext = document.getElementById('wiz-btn-next');
        const btnSubmit = document.getElementById('wiz-btn-submit');
        const btnPrev = document.getElementById('wiz-btn-prev');
        const spacer = document.getElementById('wiz-btn-spacer');

        if(step === 1) {
            btnNext.style.display = (this.state.path === 'new' || this.state.path === 'old') ? 'block' : 'none'; 
            btnSubmit.style.display = 'none';
            btnPrev.style.display = this.state.path ? 'block' : 'none';
            if(!this.state.path) spacer.style.display = 'block';
            
        } else if (step === 2) {
            btnNext.style.display = 'block';
            btnSubmit.style.display = 'none';
            btnPrev.style.display = 'block';
            spacer.style.display = 'none';
            
            const summaryEl = document.getElementById('wiz-step2-summary');
            if(summaryEl) {
                summaryEl.innerHTML = `
                    <strong>客戶：</strong>${this.state.data.companyName || '-'} <br>
                    <strong>窗口：</strong>${this.state.data.mainContact || '-'} 
                    <span style="color:var(--text-muted); font-size:0.85em;">(${this.state.data.contactPhone || '無電話'})</span>
                `;
            }
            this.autoGenerateName();
            
        } else if (step === 3) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'block';
            btnPrev.style.display = 'block';
            spacer.style.display = 'none';
            
            const type = document.getElementById('wiz-opp-type').value;
            const name = document.getElementById('wiz-opp-name').value;
            const previewEl = document.getElementById('wiz-final-preview');
            if(previewEl) {
                previewEl.textContent = `${name} (${this.state.data.mainContact})`;
            }
        }
    },

    autoGenerateName: function() {
        const typeSelect = document.getElementById('wiz-opp-type');
        const nameInput = document.getElementById('wiz-opp-name');
        if (!typeSelect || !nameInput) return;

        const typeText = typeSelect.options[typeSelect.selectedIndex]?.text || typeSelect.value || '';
        const company = this.state.data.companyName;
        
        if (!company || !typeText) return;

        const currentName = nameInput.value.trim();
        
        // 解析機會種類簡稱 (擷取空白、半形或全形括號前的文字)
        const abbreviation = typeText.split(/[\s(（]+/)[0].trim();
        const expectedName = `${abbreviation} - ${company}`;
        
        // 只有當「輸入框為空」、「符合系統前次自動生成的結果」或「與舊版邏輯相符(向下相容)」時，才執行覆寫
        if(!currentName || currentName === this.state.data.lastGeneratedName || currentName === `${typeText} - ${company}`) {
            nameInput.value = expectedName;
            this.state.data.lastGeneratedName = expectedName;
        }
    }
};

// ==================== 全域函式綁定 ====================

// 1. 覆蓋舊的 showNewOpportunityModal
window.showNewOpportunityModal = function() {
    NewOppWizard.show();
};

// 2. 編輯機會 Modal
async function editOpportunity(opportunityId) {
    if (!opportunityId) { showNotification('無效的機會ID', 'error'); return; }
    showLoading('正在獲取最新資料...');
    try {
        const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
        if (!result.success) throw new Error('無法從後端獲取機會資料');
        const opportunity = result.data.opportunityInfo;

        showModal('edit-opportunity-modal');
        // [Modified] Use opportunityId (hidden input or dataset) instead of rowIndex
        const form = document.getElementById('edit-opportunity-form');
        form.dataset.currentOppId = opportunity.opportunityId;
        
        // Also try to set hidden input if it exists, for robustness
        const idInput = document.getElementById('edit-opportunity-id');
        if(idInput) idInput.value = opportunity.opportunityId;

        document.getElementById('edit-opportunity-name').value = opportunity.opportunityName;
        document.getElementById('edit-customer-company').value = opportunity.customerCompany;
        document.getElementById('edit-main-contact').value = opportunity.mainContact;
        document.getElementById('edit-expected-close-date').value = opportunity.expectedCloseDate;
        document.getElementById('edit-opportunity-value').value = opportunity.opportunityValue;
        document.getElementById('edit-opportunity-notes').value = opportunity.notes;
        
        if(window.CRM_APP.systemConfig) {
            populateSelect('edit-opportunity-type', window.CRM_APP.systemConfig['機會種類'], opportunity.opportunityType);
            populateSelect('edit-opportunity-source', window.CRM_APP.systemConfig['機會來源'], opportunity.opportunitySource);
            populateSelect('edit-current-stage', window.CRM_APP.systemConfig['機會階段'], opportunity.currentStage);
            populateSelect('edit-assignee', window.CRM_APP.systemConfig['團隊成員'], opportunity.assignee);
        }
        if (typeof populateCountyDropdown === 'function') {
            populateCountyDropdown('edit-company-county');
        }
        const companyResult = await authedFetch(`/api/companies/${encodeURIComponent(opportunity.customerCompany)}/details`);
        if (companyResult.success && companyResult.data.companyInfo && companyResult.data.companyInfo.county) {
            document.getElementById('edit-company-county').value = companyResult.data.companyInfo.county;
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification('找不到該筆機會的資料', 'error');
    } finally {
        hideLoading();
    }
}

// 3. 關聯聯絡人 Modal
function showLinkContactModal(opportunityId) {
    showModal('link-contact-modal');
    const container = document.getElementById('link-contact-content-container');
    const tabs = document.querySelectorAll('.link-contact-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[0].classList.add('active');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLinkContactTabContent(tab.dataset.tab, container);
        };
    });
    renderLinkContactTabContent('from-potential', container);
}

function renderLinkContactTabContent(tabName, container) {
    let html = '';
    if (tabName === 'from-potential') {
        html = `
            <div class="form-group">
                <label class="form-label">搜尋名片 (潛在客戶)</label>
                <input type="text" class="form-input" id="search-potential-contact-input" placeholder="輸入姓名或公司...">
            </div>
            <div id="potential-contact-results" class="search-result-list"></div>
        `;
        container.innerHTML = html;
        document.getElementById('search-potential-contact-input').addEventListener('keyup', (e) => handleSearch(() => searchAndRenderContacts('potential', e.target.value)));
        searchAndRenderContacts('potential', '');
    } else if (tabName === 'from-existing') {
        html = `
            <div class="form-group">
                <label class="form-label">搜尋已建檔聯絡人</label>
                <input type="text" class="form-input" id="search-existing-contact-input" placeholder="輸入姓名或公司...">
            </div>
            <div id="existing-contact-results" class="search-result-list"></div>
        `;
        container.innerHTML = html;
        document.getElementById('search-existing-contact-input').addEventListener('keyup', (e) => handleSearch(() => searchAndRenderContacts('existing', e.target.value)));
        searchAndRenderContacts('existing', '');
    } else if (tabName === 'create-new') {
        const companyName = window.currentOpportunityData ? window.currentOpportunityData.customerCompany : '';
        html = `
            <form id="create-and-link-contact-form">
                <div class="form-group">
                    <label class="form-label">公司名稱 *</label>
                    <input type="text" class="form-input" name="company" value="${companyName}" required>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">姓名 *</label><input type="text" class="form-input" name="name" required></div>
                    <div class="form-group"><label class="form-label">職位</label><input type="text" class="form-input" name="position"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">手機</label><input type="text" class="form-input" name="mobile"></div>
                    <div class="form-group"><label class="form-label">公司電話</label><input type="text" class="form-input" name="phone"></div>
                </div>
                <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email"></div>
                <button type="submit" class="submit-btn">建立並關聯</button>
            </form>
        `;
        container.innerHTML = html;
        document.getElementById('create-and-link-contact-form').addEventListener('submit', handleCreateAndLinkContact);
    }
}

async function searchAndRenderContacts(type, query) {
    const containerId = type === 'potential' ? 'potential-contact-results' : 'existing-contact-results';
    const resultsContainer = document.getElementById(containerId);
    if (!resultsContainer) return;

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
    
    const apiUrl = type === 'existing' 
        ? `/api/contact-list?q=${encodeURIComponent(query || '')}` 
        : `/api/contacts?q=${encodeURIComponent(query || '')}`;
    
    try {
        const result = await authedFetch(apiUrl);
        if (result.data && result.data.length > 0) {
            resultsContainer.innerHTML = result.data.map(contact => {
                const companyDisplay = contact.companyName || contact.company || '公司未知';
                const safeJson = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
                return `
                    <div class="kanban-card" style="cursor: pointer; margin-bottom:8px;" onclick='handleLinkContact(${safeJson}, "${type}")'>
                        <div class="card-title">${contact.name}</div>
                        <div class="card-company">${companyDisplay} - ${contact.position || '職位未知'}</div>
                    </div>
                `;
            }).join('');
        } else {
            resultsContainer.innerHTML = '<div class="alert alert-info">找不到符合的聯絡人</div>';
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') resultsContainer.innerHTML = '<div class="alert alert-error">搜尋失敗</div>';
    }
}

async function handleLinkContact(contactData, type) {
    showLoading('正在關聯...');
    const payload = {
        name: contactData.name,
        position: contactData.position,
        mobile: contactData.mobile,
        phone: contactData.phone,
        email: contactData.email,
        rowIndex: contactData.rowIndex, 
        company: contactData.companyName || contactData.company,
        contactId: contactData.contactId
    };

    try {
        if (!window.currentDetailOpportunityId) throw new Error('無法識別當前機會 ID');
        const result = await authedFetch(`/api/opportunities/${window.currentDetailOpportunityId}/contacts`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (result.success) closeModal('link-contact-modal');
        else throw new Error(result.error);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleCreateAndLinkContact(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contactData = Object.fromEntries(formData.entries());
    await handleLinkContact(contactData, 'new');
}

// 4. 關聯母機會 Modal
// [Modified] Use currentOppId only
function showLinkOpportunityModal(currentOppId) {
    showModal('link-opportunity-modal');
    const searchInput = document.getElementById('search-opportunity-to-link-input');
    const resultsContainer = document.getElementById('opportunity-to-link-results');
    
    const performSearch = async (query) => {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
        try {
            const result = await authedFetch(`/api/opportunities?q=${encodeURIComponent(query)}&page=0`);
            const opportunities = Array.isArray(result) ? result : (result.data || []);
            const filtered = opportunities.filter(opp => opp.opportunityId !== currentOppId);

            if (filtered.length > 0) {
                // [Modified] Pass currentOppId to handleLinkOpportunity
                resultsContainer.innerHTML = filtered.map(opp => `
                    <div class="kanban-card" style="cursor: pointer; margin-bottom:8px;" onclick='handleLinkOpportunity("${currentOppId}", "${opp.opportunityId}")'>
                        <div class="card-title">${opp.opportunityName}</div>
                        <div class="card-company">${opp.customerCompany}</div>
                    </div>
                `).join('');
            } else {
                resultsContainer.innerHTML = `<div class="alert alert-warning">找不到符合的機會</div>`;
            }
        } catch(error) {
            if(error.message !== 'Unauthorized') resultsContainer.innerHTML = `<div class="alert alert-error">搜尋失敗</div>`;
        }
    };
    performSearch('');
    searchInput.onkeyup = (e) => {
        clearTimeout(linkOppSearchTimeout);
        linkOppSearchTimeout = setTimeout(() => performSearch(e.target.value.trim()), 400); 
    };
}

async function handleLinkOpportunity(currentOppId, parentOppId) {
    showLoading('正在建立關聯...');
    try {
        // [Modified] PUT by ID
        const result = await authedFetch(`/api/opportunities/${currentOppId}`, {
            method: 'PUT',
            body: JSON.stringify({ parentOpportunityId: parentOppId })
        });
        if (result.success) closeModal('link-opportunity-modal');
        else throw new Error(result.error);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== 表單提交事件監聽 ====================

document.addEventListener('submit', async function(e) {
    // 1. 新增機會 Wizard 表單提交
    if(e.target.id === 'new-opportunity-wizard-form') {
        e.preventDefault();
        const stateData = NewOppWizard.state.data;
        
        const payload = {
            customerCompany: stateData.companyName,
            mainContact: (stateData.mainContact || '').trim(),
            contactPhone: stateData.contactPhone,
            county: stateData.county,
            
            opportunityName: document.getElementById('wiz-opp-name').value,
            opportunityType: document.getElementById('wiz-opp-type').value,
            opportunitySource: document.getElementById('wiz-opp-source').value,
            
            assignee: document.getElementById('wiz-assignee').value,
            currentStage: document.getElementById('wiz-stage').value,
            notes: document.getElementById('wiz-notes').value,
            
            // sourceId from wizard is usually Contact rowIndex for "upgrade".
            rowIndex: stateData.sourceId 
        };

        showLoading('正在建立機會案件...');
        try {
            let url = '/api/opportunities';
            if (payload.rowIndex) {
                // Keep this path if it's for contact upgrade (Legacy RAW)
                url = `/api/contacts/${payload.rowIndex}/upgrade`;
            }
            const result = await authedFetch(url, { method: 'POST', body: JSON.stringify(payload) });

            if (result.success) {
                // [Phase 8.10 Dashboard Refresh Fix]
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
                closeModal('new-opportunity-modal');
                
                showNotification('機會建立成功', 'success');

                const targetOppId = result.opportunityId || result.id;

                if (targetOppId && window.CRM_APP && typeof window.CRM_APP.navigateTo === 'function') {
                    window.CRM_APP.navigateTo('opportunity-details', { opportunityId: targetOppId });
                }
            } else {
                throw new Error(result.details || result.error || '建立失敗');
            }
        } catch (error) {
            if(error.message !== 'Unauthorized') showNotification(`建立失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 2. 編輯機會表單提交
    if (e.target.id === 'edit-opportunity-form') {
        e.preventDefault();
        showLoading('正在儲存編輯...');
        try {
            // [Modified] Retrieve opportunityId from dataset or hidden input
            const form = document.getElementById('edit-opportunity-form');
            const opportunityId = form.dataset.currentOppId || document.getElementById('edit-opportunity-id')?.value;
            
            if (!opportunityId) throw new Error("無法識別機會 ID");

            const modifier = getCurrentUser();
            const companyName = document.getElementById('edit-customer-company').value;
            const newCounty = document.getElementById('edit-company-county').value;
            
            const updateOpportunityData = {
                opportunityName: document.getElementById('edit-opportunity-name').value,
                opportunityType: document.getElementById('edit-opportunity-type').value,
                opportunitySource: document.getElementById('edit-opportunity-source').value,
                currentStage: document.getElementById('edit-current-stage').value,
                assignee: document.getElementById('edit-assignee').value,
                expectedCloseDate: document.getElementById('edit-expected-close-date').value,
                opportunityValue: document.getElementById('edit-opportunity-value').value,
                notes: document.getElementById('edit-opportunity-notes').value,
                modifier: modifier
            };
            
            const promises = [
                // [Modified] PUT by ID
                authedFetch(`/api/opportunities/${opportunityId}`, { method: 'PUT', body: JSON.stringify(updateOpportunityData) })
            ];
            if (newCounty) {
                const encodedCompanyName = encodeURIComponent(companyName);
                promises.push(authedFetch(`/api/companies/${encodedCompanyName}`, { method: 'PUT', body: JSON.stringify({ county: newCounty }) }));
            }
            await Promise.all(promises);

            // [Phase 8.10 Dashboard Refresh Fix]
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }
            closeModal('edit-opportunity-modal');
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`更新失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
});
</file>

<file path="public/views/opportunity-detail.html">
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>機會詳情</title>
    <link rel="stylesheet" href="/styles/main.css">
    <link rel="stylesheet" href="/styles/modules/variables.css">
    <link rel="stylesheet" href="/styles/modules/components.css">
    <link rel="stylesheet" href="/styles/modals.css">

    <style>
        /* 【最終修正】強制確保 widget-content 及其內容可見 */
        #opp-potential-contacts-container.widget-content {
            display: block !important;
            flex-grow: initial !important;
            min-height: 50px; /* 給予一個最小高度以確保容器不會塌陷 */
        }

        /* 新增的子頁籤樣式 */
        .sub-tabs {
            display: flex;
            border-bottom: 2px solid var(--border-color);
            margin-bottom: var(--spacing-5);
        }
        .sub-tab-link {
            padding: var(--spacing-3) var(--spacing-4);
            cursor: pointer;
            color: var(--text-muted);
            border: none;
            background: none;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px; /* 讓 active 的 border 蓋過底線 */
            transition: all 0.2s ease;
            
            font-size: var(--font-size-base); /* 1rem */
            font-weight: 700; /* 加粗 */
        }
        
        .sub-tab-link.active {
            color: var(--accent-blue);
            border-bottom-color: var(--accent-blue);
            /* 使用 color-mix 產生 20% 透明度的 accent-blue */
            background-color: color-mix(in srgb, var(--accent-blue) 20%, transparent); 
            border-radius: var(--rounded-md) var(--rounded-md) 0 0; /* 頂部圓角 */
        }

        .sub-tab-link:hover {
            color: var(--text-primary);
            /* Hover 使用 15% 透明度，比 active 略淡 */
            background-color: color-mix(in srgb, var(--accent-blue) 15%, transparent); 
            border-radius: var(--rounded-md) var(--rounded-md) 0 0; /* 同樣追加圓角 */
            border-bottom-color: var(--border-color); /* 給 hover 一個底線 */
        }
        
        .sub-tab-content {
            display: none;
        }
        .sub-tab-content.active {
            display: block;
        }
    </style>
</head>
<body>

    <div id="opportunity-detail-container" style="padding: 20px;">

        <div id="opportunity-info-card-container" class="opportunity-info-card" style="margin-bottom: var(--spacing-6);">
            </div>

        <div id="opportunity-stage-stepper-container" class="dashboard-widget" style="margin-bottom: var(--spacing-6);">
            <div class="widget-header" style="margin-bottom: 0;">
                <h2 class="widget-title">機會進程</h2>
            </div>
            <div id="opportunity-stage-stepper" class="widget-content">
                </div>
        </div>

        <div id="tab-content-events" class="tab-content active" style="margin-bottom: var(--spacing-6);">
             </div>

        <div id="tab-content-interactions" class="tab-content active" style="margin-bottom: var(--spacing-6);">
            <div class="interaction-layout">
                
                <div class="interaction-history-section">
        
                    <div class="sub-tabs">
                        <button class="sub-tab-link active" data-tab="discussion">動態牆</button>
                        <button class="sub-tab-link" data-tab="activity">系統活動紀錄</button>
                    </div>
                
                    <div id="discussion-pane" class="sub-tab-content active">
                        <div id="discussion-timeline" class="interaction-timeline">
                            </div>
                    </div>
                    <div id="activity-pane" class="sub-tab-content">
                        <div id="activity-log-timeline" class="interaction-timeline">
                            </div>
                    </div>
                
                </div>

                <div class="interaction-form-section">
                    <h3 style="margin-bottom: 1.5rem;">新增/編輯互動</h3>
                    <form id="new-interaction-form">
                        <input type="hidden" id="interaction-opportunity-id">
                        <input type="hidden" id="interaction-edit-rowIndex">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">互動類型</label>
                                <div class="select-wrapper">
                                    <select class="form-select" id="interaction-event-type" required></select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">互動時間</label>
                                <input type="datetime-local" class="form-input" id="interaction-time" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">內容摘要 *</label>
                            <textarea class="form-textarea" id="interaction-summary" placeholder="記錄互動重點..." required></textarea>
                        </div>
                         <div class="form-group">
                            <label class="form-label">下次行動</label>
                            <input type="text" class="form-input" id="interaction-next-action" placeholder="準備報價單並於下週三前寄出..."></input>
                        </div>
                        <button type="submit" class="submit-btn" id="interaction-submit-btn">💾 新增紀錄</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="dashboard-widget" style="margin-top: var(--spacing-6);">
            <div class="widget-header">
                <h2 class="widget-title">關聯聯絡人</h2>
                <button class="action-btn primary" id="add-associated-contact-btn">+ 關聯聯絡人</button>
            </div>
            <div id="associated-contacts-list" class="widget-content">
                </div>
        </div>

        <div class="dashboard-widget" style="margin-top: var(--spacing-6);">
            <div class="widget-header">
                <h2 class="widget-title">關聯機會</h2>
                <button class="action-btn primary" id="add-associated-opportunity-btn">+ 關聯機會</button>
            </div>
            <div id="associated-opportunities-list" class="widget-content">
                </div>
        </div>

        <div class="dashboard-widget" style="margin-top: var(--spacing-6);">
            <div class="widget-header">
                <h2 class="widget-title">同公司潛在聯絡人</h2>
            </div>
            <div id="opp-potential-contacts-container" class="widget-content">
                </div>
        </div>

    </div>

    <div id="modal-container"></div>

    <script src="/scripts/core/theme-toggle.js"></script>
    <script src="/scripts/core/utils.js"></script>
    
    <script src="/scripts/services/api.js"></script>
    <script src="/scripts/services/ui.js"></script>
    
    <script src="/scripts/components/chip-wall.js"></script>

    <script src="/scripts/opportunities/details/opportunity-stepper.js"></script>
    <script src="/scripts/opportunities/details/opportunity-interactions.js"></script>
    <script src="/scripts/opportunities/details/opportunity-associated-contacts.js"></script>
    <script src="/scripts/opportunities/details/opportunity-event-reports.js"></script>
    <script src="/scripts/opportunities/details/opportunity-info-view.js"></script>
    <script src="/scripts/opportunities/details/opportunity-details-components.js"></script>
    
    <script src="/scripts/opportunities/opportunity-details-events.js"></script>
    <script src="/scripts/opportunities/opportunity-details.js"></script>
    <script src="/scripts/opportunities/opportunity-modals.js"></script>

    <script src="/scripts/events/event-modal-manager.js"></script>
    <script src="/scripts/events/event-editor-standalone.js"></script>

</body>
</html>
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
