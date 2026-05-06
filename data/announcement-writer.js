/**
 * data/announcement-writer.js
 * 佈告欄寫入器
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責佈告欄的發布、更新與刪除。實作依賴注入。
 */

const BaseWriter = require('./base-writer');

class AnnouncementWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API
     * @param {string} spreadsheetId - [Required] Target Sheet ID
     * @param {Object} announcementReader - 用於清除快取
     */
    constructor(sheets, spreadsheetId, announcementReader) {
        super(sheets, spreadsheetId);
        if (!announcementReader) throw new Error('AnnouncementWriter 需要 AnnouncementReader 實例');
        this.announcementReader = announcementReader;
    }

    /**
     * 建立新公告
     */
    async createAnnouncement(data, creator) {
        console.log(`📢 [AnnouncementWriter] 建立公告: ${data.title} by ${creator}`);
        
        const now = new Date().toISOString();
        const newId = `ANC${Date.now()}`;
        
        // 欄位順序: ID, Title, Content, Creator, CreateTime, LastUpdateTime, Status, IsPinned
        const row = [
            newId,
            data.title,
            data.content,
            creator,
            now,
            now,
            data.status || '已發布',
            data.isPinned ? 'TRUE' : 'FALSE'
        ];

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId, // 使用注入 ID
            range: `${this.config.SHEETS.ANNOUNCEMENTS}!A:H`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });

        this.announcementReader.invalidateCache('announcements');
        return { success: true, id: newId };
    }

    /**
     * 更新公告
     */
    async updateAnnouncement(rowIndex, data, modifier) {
        console.log(`📢 [AnnouncementWriter] 更新公告 Row ${rowIndex} by ${modifier}`);
        
        const now = new Date().toISOString();
        const range = `${this.config.SHEETS.ANNOUNCEMENTS}!B${rowIndex}:H${rowIndex}`; // 從標題(B)開始更新
        
        // 先讀取舊資料以避免覆蓋未修改欄位 (雖不完全原子操作，但在 Sheet 場景可接受)
        // 這裡簡化為直接更新傳入的欄位，若需精確控制建議先 Read 後 Write，或依賴前端傳入完整資料
        // 在此範例，我們假設 Controller 會處理好資料合併，或者我們只更新特定 Cell
        
        // 但為了通用性，我們讀取該列
        const readRes = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: range
        });
        
        const currentVals = readRes.data.values ? readRes.data.values[0] : ['', '', '', '', '', '', ''];
        // B:Title, C:Content, D:Creator, E:CreateTime, F:LastUpdate, G:Status, H:Pinned
        // Index: 0      1         2          3            4             5         6
        
        if (data.title !== undefined) currentVals[0] = data.title;
        if (data.content !== undefined) currentVals[1] = data.content;
        // Creator 不變
        // CreateTime 不變
        currentVals[4] = now; // LastUpdate
        if (data.status !== undefined) currentVals[5] = data.status;
        if (data.isPinned !== undefined) currentVals[6] = data.isPinned ? 'TRUE' : 'FALSE';

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId, // 使用注入 ID
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentVals] }
        });

        this.announcementReader.invalidateCache('announcements');
        return { success: true };
    }

    /**
     * 刪除公告
     */
    async deleteAnnouncement(rowIndex) {
        await this._deleteRow(this.config.SHEETS.ANNOUNCEMENTS, rowIndex, this.announcementReader);
        console.log(`✅ [AnnouncementWriter] 公告刪除成功 (Row: ${rowIndex})`);
        return { success: true };
    }
}

module.exports = AnnouncementWriter;