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