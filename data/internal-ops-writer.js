/**
 * data/internal-ops-writer.js
 * 內部運營與進度追蹤 Writer
 * @version 1.0.1
 * @date 2026-04-20
 * @changelog
 * - [1.0.1] Fixed writer to use config.IDS.INTERNAL_OPS and targetSpreadsheetId pattern
 * @description 負責將內部運營資料寫入 Google Sheets
 */

const config = require('../config');

class InternalOpsWriter {
    constructor(sheets, spreadsheetId, reader = null) {
        this.sheets = sheets;
        this.targetSpreadsheetId = config.IDS.INTERNAL_OPS || spreadsheetId;
        this.reader = reader;
    }

    async appendRow(sheetName, values) {
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] }
        });
    }

    async updateRow(sheetName, rowIndex, values, endCol = 'Z') {
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${sheetName}!A${rowIndex}:${endCol}${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] }
        });
    }
}

module.exports = InternalOpsWriter;