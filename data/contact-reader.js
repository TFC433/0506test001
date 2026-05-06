/**
 * data/contact-reader.js
 * 專門負責讀取所有與「聯絡人」相關資料的類別
 * @version 7.1.0
 * @date 2026-03-21
 * @description 
 * [SQL-Ready Refactor]
 * 1. 移除所有業務邏輯 (Filter, Sort, Pagination, Join)。
 * 2. 移除 Cross-Reader Coupling (不再 require company-reader)。
 * 3. 確保回傳 rowIndex，供 Service 傳遞給 Writer 進行 Update。
 * 4. 僅保留 Raw Data Access 方法。
 * * Changelog:
 * - [V7.1.0] Updated rowParser to explicitly extract EXHIBITION_NAME and IS_EXHIBITION from repurposed indexes 17 and 18.
 * This enables safe verification of existing tags for the Fallback Auto-Tag mechanism.
 */

const BaseReader = require('./base-reader');

class ContactReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得原始名片資料 (潛在客戶) - Raw Data Only
     * @returns {Promise<Array<object>>}
     */
    async getContacts() {
        const cacheKey = 'contacts';
        const range = `${this.config.SHEETS.CONTACTS}!A:Y`;

        const rowParser = (row, index) => {
            const driveLink = row[this.config.CONTACT_FIELDS.DRIVE_LINK] || '';
            
            return {
                // [Critical] 用於 Service -> Writer 的定位
                rowIndex: index + 2,
                
                // 基礎資料欄位
                createdTime: row[this.config.CONTACT_FIELDS.TIME] || '',
                name: row[this.config.CONTACT_FIELDS.NAME] || '',
                company: row[this.config.CONTACT_FIELDS.COMPANY] || '',
                position: row[this.config.CONTACT_FIELDS.POSITION] || '',
                department: row[this.config.CONTACT_FIELDS.DEPARTMENT] || '',
                phone: row[this.config.CONTACT_FIELDS.PHONE] || '',
                mobile: row[this.config.CONTACT_FIELDS.MOBILE] || '',
                email: row[this.config.CONTACT_FIELDS.EMAIL] || '',
                website: row[this.config.CONTACT_FIELDS.WEBSITE] || '',
                address: row[this.config.CONTACT_FIELDS.ADDRESS] || '',
                confidence: row[this.config.CONTACT_FIELDS.CONFIDENCE] || '',
                status: row[this.config.CONTACT_FIELDS.STATUS] || '',
                notes: row[this.config.CONTACT_FIELDS.NOTES] || '', 
                
                // [Fallback Auto-Tag] Safely read the repurposed fields
                exhibition_name: row[this.config.CONTACT_FIELDS.EXHIBITION_NAME] || '',
                is_exhibition: row[this.config.CONTACT_FIELDS.IS_EXHIBITION] || '',

                // 圖片連結
                driveLink: driveLink,
                cardImage: driveLink,
                
                // LINE 整合資訊
                lineUserId: row[this.config.CONTACT_FIELDS.LINE_USER_ID] || '',
                userNickname: row[this.config.CONTACT_FIELDS.USER_NICKNAME] || ''
            };
        };
        
        // 移除所有 sorter 與 slice
        return this._fetchAndCache(cacheKey, range, rowParser);
    }

    /**
     * 取得聯絡人總表 (已建檔正式聯絡人) - Raw Data Only
     * @returns {Promise<Array<object>>}
     */
    async getContactList() {
        const cacheKey = 'contactList';
        const range = `${this.config.SHEETS.CONTACT_LIST}!A:M`;

        const rowParser = (row, index) => ({
            // [Critical] 用於 Service -> Writer 的定位 (假設 Header 為 1 行，數據從第 2 行開始)
            rowIndex: index + 2,
            
            contactId: row[0] || '',
            sourceId: row[1] || '',
            name: row[2] || '',
            companyId: row[3] || '',
            department: row[4] || '',
            position: row[5] || '',
            mobile: row[6] || '',
            phone: row[7] || '',
            email: row[8] || '',
            createdTime: row[9] || '',
            lastUpdateTime: row[10] || '',
            creator: row[11] || '',
            lastModifier: row[12] || ''
        });

        // 移除 Join CompanyName 邏輯
        return this._fetchAndCache(cacheKey, range, rowParser);
    }
    
    /**
     * 讀取並快取所有的「機會-聯絡人」關聯
     * @returns {Promise<Array<object>>}
     */
    async getAllOppContactLinks() {
        const cacheKey = 'oppContactLinks';
        const range = `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`;

        const rowParser = (row) => ({
            linkId: row[this.config.OPP_CONTACT_LINK_FIELDS.LINK_ID] || '',
            opportunityId: row[this.config.OPP_CONTACT_LINK_FIELDS.OPPORTUNITY_ID] || '',
            contactId: row[this.config.OPP_CONTACT_LINK_FIELDS.CONTACT_ID] || '',
            createTime: row[this.config.OPP_CONTACT_LINK_FIELDS.CREATE_TIME] || '',
            status: row[this.config.OPP_CONTACT_LINK_FIELDS.STATUS] || '',
            creator: row[this.config.OPP_CONTACT_LINK_FIELDS.CREATOR] || '',
        });

        return this._fetchAndCache(cacheKey, range, rowParser);
    }
}

module.exports = ContactReader;