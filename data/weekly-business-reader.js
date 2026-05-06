/* [v7.0.3] Weekly Standard A + S Refactor */
/**
 * data/weekly-business-reader.js
 * 專門負責讀取所有與「週間業務」相關資料的類別
 * * @version 7.0.0 (Standard A + S Refactor)
 * @date 2026-01-23
 * @description
 * [SQL-Ready Refactor]
 * 1. 嚴格遵守 Raw Data Access Only 原則。
 * 2. 移除 sorter、日期解析、day 計算邏輯。
 * 3. 移除 findEntryByRecordId 等查找方法。
 * 4. 僅回傳包含 rowIndex 的原始資料陣列。
 */

const BaseReader = require('./base-reader');

class WeeklyBusinessReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得所有週間業務紀錄的摘要資訊 (Raw Data)
     * @returns {Promise<Array<object>>} - 包含 { weekId, summaryContent } 的陣列
     */
    async getWeeklySummary() {
        try {
            const range = `${this.config.SHEETS.WEEKLY_BUSINESS}!B:F`;
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range: range,
            });

            const rows = response.data.values || [];
            if (rows.length <= 1) return [];

            return rows.slice(1).map(row => ({
                weekId: row[0] || '',
                summaryContent: row[4] || ''
            }));
        } catch (error) {
            console.error(`❌ [WeeklyBusinessReader] 讀取 weeklyBusinessSummary 失敗:`, error);
            return [];
        }
    }

    /**
     * 取得所有週間業務紀錄 (Raw Data)
     * [Standard A] 移除 sorter 與 day 計算，僅回傳原始資料
     * @returns {Promise<Array<object>>}
     */
    async getAllEntries() {
        const cacheKey = 'weeklyBusiness';
        const range = `${this.config.SHEETS.WEEKLY_BUSINESS}!A:K`;

        // 定義欄位映射 (依據 Sheet 物理順序)
        // A:日期, B:weekId, C:category, D:主題, E:參與人員, F:重點摘要, G:待辦事項, H:Create, I:Update, J:Creator, K:RecordID
        const rowParser = (row, index) => ({
            // [Critical] 用於 Service -> Writer 的定位
            rowIndex: index + 2,
            
            '日期': row[0] || '',
            'weekId': row[1] || '',
            'category': row[2] || '',
            '主題': row[3] || '',
            '參與人員': row[4] || '',
            '重點摘要': row[5] || '',
            '待辦事項': row[6] || '',
            'createdTime': row[7] || '',
            'lastUpdateTime': row[8] || '',
            '建立者': row[9] || '',
            'recordId': row[10] || ''
        });

        // 移除 sorter，回傳原始順序
        return this._fetchAndCache(cacheKey, range, rowParser);
    }
    
    /**
     * 清除快取
     */
    invalidateCache() {
        super.invalidateCache('weeklyBusiness');
        console.log('✅ [Cache] 週間業務摘要與完整資料快取已失效');
    }
}

module.exports = WeeklyBusinessReader;