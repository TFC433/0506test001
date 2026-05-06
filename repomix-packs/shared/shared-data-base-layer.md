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
- Only files matching these patterns are included: data/base-reader.js, data/base-writer.js, data/index.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
data/base-reader.js
data/base-writer.js
data/index.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

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

<file path="data/index.js">
// data/index.js

// 讀取器 (Readers)
const OpportunityReader = require('./opportunity-reader');
const ContactReader = require('./contact-reader');
const CompanyReader = require('./company-reader');
const InteractionReader = require('./interaction-reader');
const EventLogReader = require('./event-log-reader');
const SystemReader = require('./system-reader');
const WeeklyBusinessReader = require('./weekly-business-reader');
const AnnouncementReader = require('./announcement-reader');

// 寫入器 (Writers)
const CompanyWriter = require('./company-writer');
const ContactWriter = require('./contact-writer');
const OpportunityWriter = require('./opportunity-writer');
const InteractionWriter = require('./interaction-writer');
const EventLogWriter = require('./event-log-writer');
const WeeklyBusinessWriter = require('./weekly-business-writer');
const AnnouncementWriter = require('./announcement-writer');

// ★★★ 1. 新增這行引入 ★★★
const SystemWriter = require('./system-writer'); 

module.exports = {
    OpportunityReader,
    ContactReader,
    CompanyReader,
    InteractionReader,
    EventLogReader,
    SystemReader,
    WeeklyBusinessReader,
    AnnouncementReader,
    
    CompanyWriter,
    ContactWriter,
    OpportunityWriter,
    InteractionWriter,
    EventLogWriter,
    WeeklyBusinessWriter,
    AnnouncementWriter,

    // ★★★ 2. 記得加到這裡匯出 ★★★
    SystemWriter 
};
</file>

</files>
