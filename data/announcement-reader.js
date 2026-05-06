/* [v7.0.2] Standard A Refactor */
/**
 * data/announcement-reader.js
 * 專門負責讀取所有與「佈告欄」相關資料的類別
 * * @version 7.0.0 (Standard A Refactor)
 * @date 2026-01-23
 * @description
 * 1. [Strict] 移除所有排序邏輯 (Sorter)。
 * 2. 僅回傳原始資料 (Raw Data Access)。
 */

const BaseReader = require('./base-reader');

class AnnouncementReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得所有公告 (Raw Data)
     * 注意：不包含任何排序或過濾
     * @returns {Promise<Array<object>>}
     */
    async getAnnouncements() {
        const cacheKey = 'announcements';
        const range = `${this.config.SHEETS.ANNOUNCEMENTS}!A:H`;
        const F = this.config.ANNOUNCEMENT_FIELDS;

        const rowParser = (row, index) => ({
            rowIndex: index + 2,
            id: row[F.ID] || '',
            title: row[F.TITLE] || '',
            content: row[F.CONTENT] || '',
            creator: row[F.CREATOR] || '',
            createTime: row[F.CREATE_TIME] || '',
            lastUpdateTime: row[F.LAST_UPDATE_TIME] || '',
            status: row[F.STATUS] || '',
            isPinned: row[F.IS_PINNED] === 'TRUE'
        });

        // [Standard A] 移除 sorter，僅讀取 Raw Data
        const allData = await this._fetchAndCache(cacheKey, range, rowParser);
        
        return allData;
    }
}

module.exports = AnnouncementReader;