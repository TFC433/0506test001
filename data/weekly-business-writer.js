/* [v7.0.3] Weekly Standard A + S Refactor */
/**
 * data/weekly-business-writer.js
 * 週間業務寫入器
 * * @version 7.0.0 (Standard A + S Refactor)
 * @date 2026-01-23
 * @description 
 * [SQL-Ready Refactor]
 * 1. 移除 values.get (No Read-Modify-Write)。
 * 2. 移除 findEntryByRecordId (No Lookup)。
 * 3. 實作 Pure Write Methods (RowIndex + BatchUpdate)。
 */

const BaseWriter = require('./base-writer');

class WeeklyBusinessWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} weeklyReader - 用於清除快取 Reader 實例
     */
    constructor(sheets, spreadsheetId, weeklyReader) {
        super(sheets, spreadsheetId);
        if (!weeklyReader) {
            throw new Error('WeeklyBusinessWriter 需要 WeeklyBusinessReader 的實例');
        }
        this.weeklyReader = weeklyReader;
        this.SHEET_NAME = this.config.SHEETS.WEEKLY_BUSINESS;
    }

    /**
     * 建立新業務紀錄 (Append)
     */
    async createEntry(data, creator) {
        console.log(`📅 [WeeklyWriter] 建立新紀錄: ${data.theme} by ${creator}`);

        const now = new Date().toISOString();
        const recordId = `WK${Date.now()}`;

        // 欄位順序: 日期, WeekID, 分類, 主題, 參與人員, 重點摘要, 待辦事項, CreateTime, LastUpdateTime, Creator, RecordID
        const newRow = [
            data.date || now.split('T')[0],
            data.weekId || '',
            data.category || '一般',
            data.theme || '',
            data.participants || '',
            data.summary || '',
            data.todo || '',
            now, // Create
            now, // Update
            creator,
            recordId
        ];

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.SHEET_NAME}!A:K`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        this.weeklyReader.invalidateCache();
        return { success: true, id: recordId };
    }

    /**
     * [Pure Write] 更新業務紀錄
     * 接收 rowIndex 與 data，使用 batchUpdate 寫入指定 Cell。
     * @param {number} rowIndex 
     * @param {Object} data 
     * @param {string} modifier 
     */
    async updateEntryRow(rowIndex, data, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}`);
        }

        console.log(`📅 [WeeklyWriter] 更新紀錄 Row ${rowIndex} by ${modifier}`);

        const updates = [];
        
        // Helper: Push update
        const push = (colChar, val) => {
            if (val !== undefined) {
                updates.push({
                    range: `${this.SHEET_NAME}!${colChar}${rowIndex}`,
                    values: [[val]]
                });
            }
        };

        // Mapping (A:K) -> A=0, B=1, ...
        // 日期:A, weekId:B, category:C, 主題:D, 參與人員:E, 摘要:F, 待辦:G, LastUpdate:I
        push('A', data.date);
        push('B', data.weekId);
        push('C', data.category);
        push('D', data.theme);
        push('E', data.participants);
        push('F', data.summary);
        push('G', data.todo);
        
        // Always update LastUpdateTime
        push('I', new Date().toISOString());

        if (updates.length > 0) {
            await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }

        this.weeklyReader.invalidateCache();
        return { success: true };
    }

    /**
     * [Pure Write] 刪除業務紀錄
     * @param {number} rowIndex 
     */
    async deleteEntryRow(rowIndex) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}`);
        }

        console.log(`🗑️ [WeeklyWriter] 刪除紀錄 Row ${rowIndex}`);

        await this._deleteRow(
            this.SHEET_NAME,
            rowIndex,
            this.weeklyReader
        );

        return { success: true };
    }

    /**
     * @deprecated Removed in v7. Use updateEntryRow.
     */
    async updateEntry() {
        throw new Error('Deprecation: Use updateEntryRow(rowIndex, data, modifier). Service must provide rowIndex.');
    }

    /**
     * @deprecated Removed in v7. Use deleteEntryRow.
     */
    async deleteEntry() {
        throw new Error('Deprecation: Use deleteEntryRow(rowIndex). Service must provide rowIndex.');
    }
}

module.exports = WeeklyBusinessWriter;