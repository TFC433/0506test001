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
- Only files matching these patterns are included: routes/opportunity.routes.js, controllers/opportunity.controller.js, services/opportunity-service.js, data/opportunity-writer.js, data/opportunity-sql-writer.js, data/base-writer.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/opportunity.controller.js
data/base-writer.js
data/opportunity-sql-writer.js
data/opportunity-writer.js
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

<file path="data/base-writer.js">
/**
 * data/base-writer.js
 * 資料寫入基底類別
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 所有 Writer 的父類別。
 * 實作 Strict Mode 依賴注入，強制要求傳入目標 Spreadsheet ID，確保讀寫同源。
 */

const config = require('../config');

class BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定寫入目標的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        if (!sheets) {
            throw new Error('BaseWriter 初始化失敗: 需要 Sheets API 實例');
        }
        
        // ★★★ Strict Mode Check ★★★
        if (!spreadsheetId) {
            throw new Error(`[Fatal] BaseWriter 初始化失敗: 未提供 Spreadsheet ID。請檢查 Service Container 的注入設定。`);
        }

        this.sheets = sheets;
        this.targetSpreadsheetId = spreadsheetId; // 綁定目標 ID
        this.config = config;
        this._sheetIdCache = {}; // Sheet Name -> Sheet ID 的快取
    }

    /**
     * 內部輔助：根據工作表名稱取得其數字 ID (Sheet ID)
     * 用於 deleteDimension 等需要數字 ID 的操作
     */
    async _getSheetIdByName(sheetName) {
        if (this._sheetIdCache[sheetName]) {
            return this._sheetIdCache[sheetName];
        }
        try {
            console.log(`🔍 [BaseWriter] 查詢 Sheet ID: ${sheetName} (Spreadsheet: ...${this.targetSpreadsheetId.slice(-6)})`);
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.targetSpreadsheetId, // 使用注入 ID
                fields: 'sheets.properties.title,sheets.properties.sheetId',
            });
            const sheets = response.data.sheets;
            const sheet = sheets.find(s => s.properties.title === sheetName);
            if (sheet) {
                const sheetId = sheet.properties.sheetId;
                this._sheetIdCache[sheetName] = sheetId;
                return sheetId;
            }
            throw new Error(`找不到名稱為 "${sheetName}" 的工作表`);
        } catch (error) {
            console.error(`❌ [BaseWriter] 獲取 Sheet ID 失敗:`, error.message);
            throw error;
        }
    }

    /**
     * 內部輔助：刪除指定工作表的某一行
     * @param {string} sheetName - 工作表名稱
     * @param {number} rowIndex - 要刪除的列索引 (1-based)
     * @param {Object} dataReader - 用於清除快取的 Reader 實例
     */
    async _deleteRow(sheetName, rowIndex, dataReader) {
        if (!dataReader || !dataReader.invalidateCache) {
            throw new Error('_deleteRow 需要一個有效的 dataReader 實例來清除快取');
        }

        const sheetId = await this._getSheetIdByName(sheetName);
        
        console.log(`🗑️ [BaseWriter] 刪除列: ${sheetName} Row ${rowIndex}`);

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.targetSpreadsheetId, // 使用注入 ID
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
        
        // 根據工作表名稱清除對應的快取
        // 注意：這裡的 keys 必須對應 Reader 中定義的 cacheKey
        const cacheKeyMap = {
            [this.config.SHEETS.OPPORTUNITIES]: 'opportunities',
            [this.config.SHEETS.OPPORTUNITY_CONTACT_LINK]: 'oppContactLinks',
            [this.config.SHEETS.WEEKLY_BUSINESS]: 'weeklyBusiness',
            [this.config.SHEETS.COMPANY_LIST]: 'companyList',
            [this.config.SHEETS.CONTACT_LIST]: 'contactList',
            [this.config.SHEETS.ANNOUNCEMENTS]: 'announcements',
            
            // 事件紀錄相關
            [this.config.SHEETS.EVENT_LOGS_GENERAL]: 'eventLogs',
            [this.config.SHEETS.EVENT_LOGS_IOT]: 'eventLogs',
            [this.config.SHEETS.EVENT_LOGS_DT]: 'eventLogs',
            [this.config.SHEETS.EVENT_LOGS_DX]: 'eventLogs',
            '事件紀錄總表': 'eventLogs'
        };

        if (cacheKeyMap[sheetName]) {
            dataReader.invalidateCache(cacheKeyMap[sheetName]);
        }
    }
}

module.exports = BaseWriter;
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
