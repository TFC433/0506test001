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
- Only files matching these patterns are included: routes/interaction.routes.js, controllers/interaction.controller.js, services/interaction-service.js, data/interaction-*.js, public/scripts/interactions.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/interaction.controller.js
data/interaction-reader.js
data/interaction-sql-reader.js
data/interaction-sql-writer.js
data/interaction-writer.js
public/scripts/interactions.js
routes/interaction.routes.js
services/interaction-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/interaction.controller.js">
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
</file>

<file path="data/interaction-reader.js">
/**
 * data/interaction-reader.js
 * 專門負責讀取所有與「互動紀錄」相關資料的類別
 * * @version 6.0.0 (Phase 5 - Standard A Refactoring)
 * @date 2026-01-23
 * @description [Standard A] 移除 Cross-Reader 依賴與業務邏輯，僅負責 Raw Data Access。
 */

const BaseReader = require('./base-reader');

class InteractionReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得所有互動紀錄 (Raw Data)
     * [Standard A] Removed sorting logic, returning raw rows mapped to objects.
     * @returns {Promise<Array<object>>}
     */
    async getInteractions() {
        const cacheKey = 'interactions';
        const range = `${this.config.SHEETS.INTERACTIONS}!A:M`;

        const rowParser = (row, index) => ({
            rowIndex: index + 2,
            interactionId: row[0] || '',
            opportunityId: row[1] || '',
            interactionTime: row[2] || '',
            eventType: row[3] || '',
            eventTitle: row[4] || '',
            contentSummary: row[5] || '',
            participants: row[6] || '',
            nextAction: row[7] || '',
            attachmentLink: row[8] || '',
            calendarEventId: row[9] || '',
            recorder: row[10] || '',
            createdTime: row[11] || '',
            companyId: row[12] || '' 
        });

        // [Standard A] Sorter removed. Sorting is now handled in Service.
        return this._fetchAndCache(cacheKey, range, rowParser);
    }

    /**
     * [Deprecated] 搜尋邏輯已移至 Service
     * 保留此方法以防止舊程式碼崩潰，但僅回傳空結構與警告。
     */
    async searchAllInteractions(query, page = 1, fetchAll = false) {
        console.warn('⚠️ [Deprecation] InteractionReader.searchAllInteractions is deprecated. Logic moved to Service.');
        return {
            data: [],
            pagination: {
                current: page,
                total: 0,
                totalItems: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }

    /**
     * [Deprecated] 邏輯已移至 Service
     */
    async getRecentInteractions(options) {
        console.warn('⚠️ [Deprecation] InteractionReader.getRecentInteractions is deprecated. Logic moved to Service.');
        return [];
    }

    // [Standard A] Removed getOpportunities/getCompanyList (Cross-Reader Coupling removed)
}

module.exports = InteractionReader;
</file>

<file path="data/interaction-sql-reader.js">
/**
 * data/interaction-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: interactions
 * - Schema: Strict adherence to provided schema list
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.2.0
 * - Date: 2026-04-15
 * - Changelog: 
 * - [PHASE 9-A] Added getInteractionActivities & getRecentInteractionsFeed for SQL-first dashboard optimization.
 * - [PATCH] SQL interaction reader is authoritative for reading interaction records.
 * - [PATCH] DTO now exposes both interactionType and eventType alias to support frontend locking logic.
 * - [PHASE 8.1] Added getInteractionsByCompanyId & getInteractionsByOpportunityIds for Phase 8.1
 */

const { supabase } = require('../config/supabase');

class InteractionSqlReader {

    constructor() {
        this.tableName = 'interactions';
    }

    /**
     * Get a single interaction by ID
     * @param {string} interactionId 
     * @returns {Promise<Object|null>} Interaction DTO or null
     */
    async getInteractionById(interactionId) {
        if (!interactionId) throw new Error('InteractionSqlReader: interactionId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('interaction_id', interactionId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;
            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionById Error:', error);
            throw error;
        }
    }

    /**
     * Get interactions by company ID
     * @param {string} companyId 
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractionsByCompanyId(companyId) {
        if (!companyId) throw new Error('InteractionSqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionsByCompanyId Error:', error);
            throw error;
        }
    }

    /**
     * Get interactions by multiple opportunity IDs
     * @param {Array<string>} opportunityIds 
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractionsByOpportunityIds(opportunityIds) {
        if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .in('opportunity_id', opportunityIds);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionsByOpportunityIds Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 9-A] Get lightweight activity timestamps for MTU/SI and Dashboard tracking
     * Eliminates full-text hydration for metrics aggregation.
     */
    async getInteractionActivities() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('interaction_id, company_id, opportunity_id, interaction_time, created_time');

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);

            return data.map(row => ({
                interactionId: row.interaction_id,
                companyId: row.company_id,
                opportunityId: row.opportunity_id,
                interactionTime: row.interaction_time,
                createdTime: row.created_time
            }));
        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionActivities Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 9-A] Get recent interactions for the dashboard feed
     * Pushes sort and limit directly to SQL.
     */
    async getRecentInteractionsFeed(limit = 5) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order('created_time', { ascending: false })
                .limit(limit);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getRecentInteractionsFeed Error:', error);
            throw error;
        }
    }

    /**
     * Get all interactions
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractions() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractions Error:', error);
            throw error;
        }
    }

    /**
     * Maps Raw SQL Row to DTO
     */
    _mapRowToDto(row) {
        if (!row) return null;

        return {
            interactionId: row.interaction_id,
            opportunityId: row.opportunity_id,
            companyId: row.company_id,
            interactionTime: row.interaction_time,
            interactionType: row.interaction_type,
            eventType: row.interaction_type,
            eventTitle: row.event_title,
            contentSummary: row.content_summary,
            participants: row.participants,
            nextAction: row.next_action,
            attachmentLink: row.attachment_link,
            calendarEventId: row.calendar_event_id,
            recorder: row.recorder,
            createdTime: row.created_time
        };
    }
}

module.exports = InteractionSqlReader;
</file>

<file path="data/interaction-sql-writer.js">
/*
 * FILE: data/interaction-sql-writer.js
 * VERSION: 7.0.2
 * DATE: 2026-03-18
 * CHANGELOG:
 * - [PATCH] SQL interaction writer is authoritative for interaction persistence.
 * - [PATCH] Added support for eventType as an alias of interactionType to bridge legacy payloads.
 * - [PHASE 7] Migrate Interaction Write Authority to SQL.
 */

const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

class InteractionSqlWriter {
    /**
     * Maps JS Object to Strict DB Schema
     * @param {Object} data 
     * @returns {Object} dbData
     */
    _mapToDb(data) {
        // STRICT SCHEMA MAPPING
        // Forbidden: subject, interaction_date, contact_id, updated_at, created_at, rowIndex
        return {
            interaction_id: data.interactionId,
            opportunity_id: data.opportunityId || null,
            company_id: data.companyId || null,
            interaction_time: data.interactionTime || null,
            interaction_type: data.interactionType || data.eventType || null,
            event_title: data.eventTitle || null,
            content_summary: data.contentSummary || null,
            participants: data.participants || null,
            next_action: data.nextAction || null,
            attachment_link: data.attachmentLink || null,
            calendar_event_id: data.calendarEventId || null,
            recorder: data.recorder || null
        };
    }

    /**
     * Create new interaction
     * @param {Object} data 
     * @param {Object} user 
     * @returns {Promise<string>} newId
     */
    async createInteraction(data, user) {
        try {
            const interactionId = data.interactionId || uuidv4();
            const dbData = this._mapToDb({ ...data, interactionId });
            
            // Set created_time only on create
            dbData.created_time = new Date().toISOString();

            const { error } = await supabase
                .from('interactions')
                .insert([dbData]);

            if (error) throw error;
            
            console.log(`[InteractionSqlWriter] Created interaction ${interactionId}`);
            return interactionId;
        } catch (error) {
            console.error('[InteractionSqlWriter] createInteraction Error:', error);
            throw error;
        }
    }

    /**
     * Update existing interaction
     * @param {string} id 
     * @param {Object} data 
     * @param {Object} user 
     */
    async updateInteraction(id, data, user) {
        try {
            // Ensure ID is consistent
            const dbData = this._mapToDb({ ...data, interactionId: id });
            
            // Remove immutable fields for update
            delete dbData.created_time; 
            delete dbData.interaction_id; // PK should not be in update body if used in eq()

            const { error } = await supabase
                .from('interactions')
                .update(dbData)
                .eq('interaction_id', id);

            if (error) throw error;

            console.log(`[InteractionSqlWriter] Updated interaction ${id}`);
            return { success: true };
        } catch (error) {
            console.error('[InteractionSqlWriter] updateInteraction Error:', error);
            throw error;
        }
    }

    /**
     * Delete interaction
     * @param {string} id 
     * @param {Object} user 
     */
    async deleteInteraction(id, user) {
        try {
            const { error } = await supabase
                .from('interactions')
                .delete()
                .eq('interaction_id', id);

            if (error) throw error;

            console.log(`[InteractionSqlWriter] Deleted interaction ${id}`);
            return { success: true };
        } catch (error) {
            console.error('[InteractionSqlWriter] deleteInteraction Error:', error);
            throw error;
        }
    }
}

module.exports = InteractionSqlWriter;
</file>

<file path="data/interaction-writer.js">
/**
 * data/interaction-writer.js
 * 互動紀錄寫入器
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責處理互動紀錄 (Interactions) 的建立、更新與刪除。
 * 實作 Strict Mode 依賴注入。
 */

const BaseWriter = require('./base-writer');

class InteractionWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} interactionReader - 用於清除快取的 Reader 實例
     */
    constructor(sheets, spreadsheetId, interactionReader) {
        super(sheets, spreadsheetId);
        if (!interactionReader) {
            throw new Error('InteractionWriter 需要 InteractionReader 的實例');
        }
        this.interactionReader = interactionReader;
    }

    /**
     * 建立新互動紀錄
     */
    async createInteraction(data, recorder) {
        console.log(`💬 [InteractionWriter] 建立新互動: ${data.eventTitle} by ${recorder}`);
        const now = new Date().toISOString();
        const interactionId = `INT${Date.now()}`;
        
        const newRow = [
            interactionId,
            data.opportunityId || '',
            data.interactionTime || now,
            data.eventType || '',
            data.eventTitle || '',
            data.contentSummary || '',
            data.participants || '',
            data.nextAction || '',
            data.attachmentLink || '',
            data.calendarEventId || '',
            recorder, // 記錄人
            now,      // 建立時間
            data.companyId || '' // 公司ID
        ];

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.config.SHEETS.INTERACTIONS}!A:M`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        this.interactionReader.invalidateCache('interactions');
        return { success: true, id: interactionId };
    }

    /**
     * 更新互動紀錄
     */
    async updateInteraction(id, data, modifier) {
        console.log(`💬 [InteractionWriter] 更新互動紀錄: ${id} by ${modifier}`);
        
        // 1. 查找 Row Index
        // 互動紀錄是核心業務資料，所以 interactionReader 的 ID 應該與 Writer 一致 (Container 保證)
        const rangeSearch = `${this.config.SHEETS.INTERACTIONS}!A:A`;
        const rowObj = await this.interactionReader.findRowByValue(rangeSearch, 0, id);
        
        if (!rowObj) throw new Error(`找不到互動紀錄 ID: ${id}`);
        const rowIndex = rowObj.rowIndex;

        // 2. 讀取完整舊資料
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const rangeData = `${this.config.SHEETS.INTERACTIONS}!A${rowIndex}:M${rowIndex}`;
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: rangeData
        });
        
        const currentRow = response.data.values ? response.data.values[0] : [];
        if (currentRow.length === 0) throw new Error('讀取互動紀錄失敗');

        // 補齊長度
        while(currentRow.length < 13) currentRow.push('');

        // 3. 更新欄位 (依據 INTERACTION_FIELDS 順序)
        // 0:ID, 1:OppID, 2:Time, 3:Type, 4:Title, 5:Summary, 6:Participants, 7:Next, 8:Link, 9:CalID, 10:Recorder, 11:CreateTime, 12:CompanyID
        
        if (data.interactionTime !== undefined) currentRow[2] = data.interactionTime;
        if (data.eventType !== undefined) currentRow[3] = data.eventType;
        if (data.eventTitle !== undefined) currentRow[4] = data.eventTitle;
        if (data.contentSummary !== undefined) currentRow[5] = data.contentSummary;
        if (data.participants !== undefined) currentRow[6] = data.participants;
        if (data.nextAction !== undefined) currentRow[7] = data.nextAction;
        if (data.attachmentLink !== undefined) currentRow[8] = data.attachmentLink;
        // 不允許修改 ID, OpportunityID, CompanyID, Recorder, CreateTime

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: rangeData,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        this.interactionReader.invalidateCache('interactions');
        return { success: true };
    }

    /**
     * 刪除互動紀錄
     */
    async deleteInteraction(id, modifier) {
        console.log(`🗑️ [InteractionWriter] 刪除互動紀錄: ${id} by ${modifier}`);
        
        const rangeSearch = `${this.config.SHEETS.INTERACTIONS}!A:A`;
        const rowObj = await this.interactionReader.findRowByValue(rangeSearch, 0, id);
        
        if (!rowObj) throw new Error(`找不到互動紀錄 ID: ${id}`);
        
        // 呼叫 BaseWriter 的 _deleteRow
        await this._deleteRow(
            this.config.SHEETS.INTERACTIONS, 
            rowObj.rowIndex, 
            this.interactionReader
        );
        
        return { success: true };
    }
}

module.exports = InteractionWriter;
</file>

<file path="public/scripts/interactions.js">
// views/scripts/interactions.js

/**
 * 載入並渲染所有互動紀錄頁面的主函式
 * @param {number} [page=1] - 要載入的頁碼
 * @param {string} [query=''] - 搜尋關鍵字
 */
async function loadAllInteractionsPage(page = 1, query = '') {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    // 步驟 1: 渲染頁面基本骨架
    container.innerHTML = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <h2 class="widget-title">所有互動紀錄</h2>
            </div>
            <div class="search-pagination" style="padding: 0 1.5rem 1rem;">
                <input type="text" class="search-box" id="all-interactions-search" placeholder="搜尋內容、機會名稱、記錄人..." value="${query}">
                <div class="pagination" id="all-interactions-pagination"></div>
            </div>
            <div id="all-interactions-content" class="widget-content">
                <div class="loading show"><div class="spinner"></div><p>載入互動總覽中...</p></div>
            </div>
        </div>
    `;

    // 綁定搜尋事件
    document.getElementById('all-interactions-search').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const newQuery = event.target.value;
            loadAllInteractionsPage(1, newQuery);
        }
    });

    // 步驟 2: 獲取數據並渲染
    try {
        const result = await authedFetch(`/api/interactions/all?page=${page}&q=${encodeURIComponent(query)}`);
        
        document.getElementById('all-interactions-content').innerHTML = renderAllInteractionsTable(result.data || []);
        renderPagination('all-interactions-pagination', result.pagination, 'loadAllInteractionsPage');

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('載入所有互動紀錄失敗:', error);
            document.getElementById('all-interactions-content').innerHTML = `<div class="alert alert-error">載入紀錄失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 【已修改】渲染所有互動紀錄的 *表格* 列表
 * @param {Array<object>} interactions - 互動紀錄資料陣列
 * @returns {string} HTML 表格字串
 */
function renderAllInteractionsTable(interactions) {
    if (!interactions || interactions.length === 0) {
        return '<div class="alert alert-info" style="text-align:center;">找不到符合條件的互動紀錄</div>';
    }

    // --- 替換為表格 Table HTML ---
    let tableHTML = `<table class="data-table">
                        <thead>
                            <tr>
                                <th>互動時間</th>
                                <th>關聯對象</th>
                                <th>事件類型</th>
                                <th>內容摘要</th>
                                <th>記錄人</th>
                            </tr>
                        </thead>
                        <tbody>`;

    interactions.forEach(item => {
        let summaryHTML = item.contentSummary || '';
        // 讓摘要中的報告連結可以點擊
        const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9]+)\)/g; // 修正 Regex
        summaryHTML = summaryHTML.replace(linkRegex, (fullMatch, text, eventId) => {
            const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
        });

        // --- 修正開始：建立可點擊的機會或公司連結 ---
        // (item.opportunityName 已在後端 reader 修正為會包含公司名稱)
        let opportunityLink = item.opportunityName || '未指定'; 
        if (item.opportunityId) {
            // 連結至機會
            opportunityLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${item.opportunityId}' })">
                                   ${item.opportunityName}
                               </a>`;
        } else if (item.companyId && item.opportunityName !== '未指定' && item.opportunityName !== '未知機會' && item.opportunityName !== '未知公司') {
            // 連結至公司 (item.opportunityName 此時是公司名稱)
            const encodedCompanyName = encodeURIComponent(item.opportunityName);
            opportunityLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${encodedCompanyName}' })">
                                   ${item.opportunityName} (公司)
                               </a>`;
        }
        // --- 修正結束 ---

        tableHTML += `
            <tr>
                <td data-label="互動時間">${formatDateTime(item.interactionTime)}</td>
                <td data-label="關聯對象">${opportunityLink}</td>
                <td data-label="事件類型">${item.eventTitle || item.eventType}</td>
                <td data-label="內容摘要" style="white-space: pre-wrap; word-break: break-word;">${summaryHTML}</td>
                <td data-label="記錄人">${item.recorder || '-'}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

// 【修正】向主應用程式註冊此模組的載入函式
if (window.CRM_APP) {
    window.CRM_APP.pageModules.interactions = loadAllInteractionsPage;
}
</file>

<file path="routes/interaction.routes.js">
// routes/interaction.routes.js
/**
 * Interaction Routes
 * * @version 6.0.1 (Fix: Add /all route)
 * @date 2026-01-14
 * @description 互動紀錄路由。補上 /all 路徑以符合前端呼叫習慣。
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');

// 輔助函式：取得 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.interactionController) {
        throw new Error('InteractionController 尚未初始化');
    }
    return services.interactionController;
};

// ==========================================
// 公開/讀取路由 (Public/Read Routes)
// ==========================================

// GET /api/interactions (標準列表)
router.get('/', (req, res, next) => {
    getController(req).getInteractions(req, res, next);
});

// ★ 新增：GET /api/interactions/all (前端 Dashboard 與列表頁面使用此路徑)
router.get('/all', (req, res, next) => {
    getController(req).getInteractions(req, res, next);
});

// GET /api/interactions/opportunity/:id
router.get('/opportunity/:id', (req, res, next) => {
    getController(req).getInteractionsByOpportunity(req, res, next);
});

// GET /api/interactions/company/:id
router.get('/company/:id', (req, res, next) => {
    getController(req).getInteractionsByCompany(req, res, next);
});

// ==========================================
// 保護路由 (Protected Routes) - 需要 Token
// ==========================================

// POST /api/interactions
router.post('/', verifyToken, (req, res, next) => {
    getController(req).createInteraction(req, res, next);
});

// PUT /api/interactions/:id
router.put('/:id', verifyToken, (req, res, next) => {
    getController(req).updateInteraction(req, res, next);
});

// DELETE /api/interactions/:id
router.delete('/:id', verifyToken, (req, res, next) => {
    getController(req).deleteInteraction(req, res, next);
});

module.exports = router;
</file>

<file path="services/interaction-service.js">
/*
 * FILE: services/interaction-service.js
 * VERSION: 8.2.2
 * DATE: 2026-03-19
 * CHANGELOG:
 * - [CLEANUP] Removed temporary debug logs used for runtime forensics
 * - [PATCH] Enforced recorder write authority: override recorder with user.name (displayName) from JWT. No longer trusts frontend payload.
 * - Phase 8.2 Patch: Replaced InteractionReader with InteractionSqlReader completely. Removed Sheet fallback.
 * - Phase 7: Migrate Interaction Write Authority to SQL
 */

class InteractionService {
    /**
     * @param {InteractionSqlReader} interactionSqlReader 
     * @param {InteractionSqlWriter} interactionSqlWriter 
     * @param {OpportunityReader} opportunityReader 
     * @param {CompanyReader} companyReader 
     */
    constructor(interactionSqlReader, interactionSqlWriter, opportunityReader, companyReader) {
        this.interactionSqlReader = interactionSqlReader;
        this.interactionSqlWriter = interactionSqlWriter;
        this.opportunityReader = opportunityReader;
        this.companyReader = companyReader;
    }

    /**
     * 內部私有方法：取得互動紀錄原始資料
     * 策略：SQL Only (Phase 8.2)
     * @returns {Promise<Array>} 原始互動紀錄陣列
     */
    async _fetchInteractions() {
        if (!this.interactionSqlReader) {
            throw new Error('[InteractionService] InteractionSqlReader not configured.');
        }
        
        try {
            const rows = await this.interactionSqlReader.getInteractions();
            return rows || [];
        } catch (error) {
            console.error('[InteractionService] SQL Read Failed:', error);
            return [];
        }
    }

    /**
     * 搜尋互動紀錄 (包含 Join, Filter, Sort, Pagination)
     * [Standard A] Logic moved from Reader to Service
     * @param {string} query 
     * @param {number} page 
     * @param {boolean} fetchAll 
     */
    async searchInteractions(query, page = 1, fetchAll = false) {
        try {
            // 1. Raw Fetch (Strict SQL)
            const [interactions, opportunities, companies] = await Promise.all([
                this._fetchInteractions(), 
                this.opportunityReader.getOpportunities(), // Raw
                this.companyReader.getCompanyList() // Raw
            ]);

            // 2. Prepare Maps for Join
            const oppMap = new Map(opportunities.map(o => [o.opportunityId, o.opportunityName]));
            const compMap = new Map(companies.map(c => [c.companyId, c.companyName]));

            // 3. Clone & Join Logic (Preserving exact logic from old Reader)
            let results = interactions.map(item => {
                const newItem = { ...item }; // Clone to prevent cache pollution
                
                let contextName = '未指定'; 

                if (newItem.opportunityId && oppMap.has(newItem.opportunityId)) {
                    contextName = oppMap.get(newItem.opportunityId); 
                } else if (newItem.companyId && compMap.has(newItem.companyId)) {
                    contextName = compMap.get(newItem.companyId); 
                } else if (newItem.opportunityId) {
                    contextName = '未知機會'; 
                } else if (newItem.companyId) {
                    contextName = '未知公司'; 
                }

                newItem.opportunityName = contextName;
                return newItem;
            });

            // 4. Filter (Query)
            if (query) {
                const searchTerm = query.toLowerCase();
                results = results.filter(i =>
                    (i.contentSummary && i.contentSummary.toLowerCase().includes(searchTerm)) ||
                    (i.eventTitle && i.eventTitle.toLowerCase().includes(searchTerm)) ||
                    (i.opportunityName && i.opportunityName.toLowerCase().includes(searchTerm)) ||
                    (i.recorder && i.recorder.toLowerCase().includes(searchTerm))
                );
            }

            // 5. Sort (Time Descending - Logic from old Reader)
            results.sort((a, b) => {
                const dateA = new Date(a.interactionTime);
                const dateB = new Date(b.interactionTime);
                if (isNaN(dateB)) return -1;
                if (isNaN(dateA)) return 1;
                return dateB - dateA;
            });

            // 6. Pagination
            const pageSize = 20; // Default fallback since config from InteractionReader is removed

            if (fetchAll) {
                return {
                    data: results,
                    pagination: {
                        current: 1,
                        total: 1,
                        totalItems: results.length,
                        hasNext: false,
                        hasPrev: false
                    }
                };
            }

            const startIndex = (page - 1) * pageSize;
            const paginatedData = results.slice(startIndex, startIndex + pageSize);
            
            return {
                data: paginatedData,
                pagination: { 
                    current: page, 
                    total: Math.ceil(results.length / pageSize), 
                    totalItems: results.length, 
                    hasNext: (startIndex + pageSize) < results.length, 
                    hasPrev: page > 1 
                }
            };

        } catch (error) {
            console.error('[InteractionService] searchInteractions Error:', error);
            throw error;
        }
    }

    /**
     * 取得特定機會的互動紀錄
     * @param {string} opportunityId 
     */
    async getInteractionsByOpportunity(opportunityId) {
        try {
            // [Standard A] Use internal search (fetchAll=true) to get joined data, then filter
            const result = await this.searchInteractions('', 1, true); 
            // Return Array as expected by Controller
            return result.data.filter(log => log.opportunityId === opportunityId);
        } catch (error) {
            console.error('[InteractionService] getInteractionsByOpportunity Error:', error);
            return [];
        }
    }

    /**
     * 取得特定公司的互動紀錄
     * @param {string} companyId 
     */
    async getInteractionsByCompany(companyId) {
        try {
            const result = await this.searchInteractions('', 1, true);
            return result.data.filter(log => log.companyId === companyId);
        } catch (error) {
            console.error('[InteractionService] getInteractionsByCompany Error:', error);
            return [];
        }
    }

    /**
     * 新增互動紀錄
     * Phase 7: Direct to SQL
     * @param {Object} data 
     * @param {Object} user 
     */
    async createInteraction(data, user) {
        try {
            const safeUser = user || {};
            
            const finalRecorder = safeUser.name || safeUser.displayName || data.recorder || 'System';
            const secureData = { ...data, recorder: finalRecorder };

            const newId = await this.interactionSqlWriter.createInteraction(secureData, safeUser);
            
            return { success: true, id: newId };
        } catch (error) {
            console.error('[InteractionService] createInteraction Error:', error);
            throw error;
        }
    }

    /**
     * 更新互動紀錄
     * Phase 7: Direct to SQL
     * @param {string} id 
     * @param {Object} data 
     * @param {Object} user 
     */
    async updateInteraction(id, data, user) {
        try {
            const safeUser = user || {};
            await this.interactionSqlWriter.updateInteraction(id, data, safeUser);
            
            return { success: true };
        } catch (error) {
            console.error('[InteractionService] updateInteraction Error:', error);
            throw error;
        }
    }

    /**
     * 刪除互動紀錄
     * Phase 7: Direct to SQL
     * @param {string} id 
     * @param {Object} user 
     */
    async deleteInteraction(id, user) {
        try {
            const safeUser = user || {};
            await this.interactionSqlWriter.deleteInteraction(id, safeUser);
            
            return { success: true };
        } catch (error) {
            console.error('[InteractionService] deleteInteraction Error:', error);
            throw error;
        }
    }
}

module.exports = InteractionService;
</file>

</files>
