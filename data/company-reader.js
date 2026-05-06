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