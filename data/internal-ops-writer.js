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
    constructor(sheets, spreadsheetId, reader = null, googleClientService = null) {
        this.sheets = sheets;
        this.targetSpreadsheetId = config.IDS.INTERNAL_OPS || spreadsheetId;
        this.reader = reader;
        this.googleClientService = googleClientService;
    }

    async appendRow(sheetName, values) {
        if (!this.googleClientService || !this.googleClientService.appendSheetValuesNative) {
            throw new Error('InternalOpsWriter native GoogleClientService is required for appendRow');
        }

        await this.googleClientService.appendSheetValuesNative(this.targetSpreadsheetId, `${sheetName}!A:Z`, [values], {
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS'
        });
    }

    async updateRow(sheetName, rowIndex, values, endCol = 'Z') {
        if (!this.googleClientService || !this.googleClientService.updateSheetValuesNative) {
            throw new Error('InternalOpsWriter native GoogleClientService is required for updateRow');
        }

        const range = `${sheetName}!A${rowIndex}:${endCol}${rowIndex}`;
        await this.googleClientService.updateSheetValuesNative(this.targetSpreadsheetId, range, [values], {
            valueInputOption: 'USER_ENTERED'
        });
    }
}

module.exports = InternalOpsWriter;
