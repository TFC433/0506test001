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