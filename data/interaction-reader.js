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