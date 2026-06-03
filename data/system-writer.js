/**
 * data/system-writer.js
 * 系統設定寫入器
 * * @version 6.0.0 (Refactored for Standard S - Pure Write)
 * @date 2026-01-26
 * @description 移除 Reader 依賴與讀取操作，僅執行座標寫入。
 */

const BaseWriter = require('./base-writer');

class SystemWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * 注意：移除了 systemReader 依賴
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 【內部輔助】取得 User 操作的目標 ID
     */
    _getAuthTargetId() {
        if (this.config.IDS.AUTH && this.config.IDS.AUTH !== this.targetSpreadsheetId) {
            return this.config.IDS.AUTH;
        }
        return this.targetSpreadsheetId;
    }

    /**
     * 更新系統設定 (通用底層方法)
     */
    async updateSystemConfig(configData, modifier) {
        console.log(`⚙️ [SystemWriter] 更新系統設定 [${configData.type}/${configData.value}] by ${modifier}`);
        
        const sheetName = this.config.SHEETS.SYSTEM_CONFIG;
        
        const newRow = [
            configData.type,        // A
            configData.value,       // B
            configData.order || 99, // C
            'TRUE',                 // D
            configData.note || '',  // E
            configData.color || '', // F
            '',                     // G
            '',                     // H
            'System'                // I
        ];

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.targetSpreadsheetId,
                range: `${sheetName}!A:I`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] }
            });

            // Cache Invalidation 移交 Service 負責
            return { success: true };
        } catch (error) {
            console.error('❌ [SystemWriter] updateSystemConfig 失敗:', error);
            throw error;
        }
    }

    /**
     * 更新系統偏好設定
     */
    async updateSystemPref(item, note, modifier = 'System') {
        if (item === 'PRODUCT_CATEGORY_ORDER') {
            const updated = await this._updateLatestSystemPrefNote(item, note);
            if (updated) return { success: true };
        }

        return this.updateSystemConfig({
            type: 'SystemPref',
            value: item,
            note: note,
            order: 0,
            color: ''
        }, modifier);
    }

    async _updateLatestSystemPrefNote(item, note) {
        const sheetName = this.config.SHEETS.SYSTEM_CONFIG;
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${sheetName}!A:I`
        });

        const rows = response.data.values || [];
        let rowIndex = -1;

        rows.forEach((row, index) => {
            if (row[0] === 'SystemPref' && row[1] === item) {
                rowIndex = index + 1;
            }
        });

        if (rowIndex < 1) return false;

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${sheetName}!E${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[note || '']] }
        });

        return true;
    }

    /**
     * 建立新使用者
     */
    async createUser(userData) {
        console.log(`👤 [SystemWriter] 建立新使用者: ${userData.username}`);
        
        const targetId = this._getAuthTargetId();
        const sheetName = '使用者名冊';

        const newRow = [
            userData.username,
            userData.passwordHash,
            userData.displayName,
            userData.role || 'sales'
        ];

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: targetId,
            range: `${sheetName}!A:D`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        return { success: true };
    }

    /**
     * [Standard S] 更新使用者密碼 (By Row Index)
     * 禁止自行 lookup，必須由外部傳入 rowIndex
     */
    async updateUserPasswordByRow(rowIndex, newPasswordHash) {
        console.log(`🔐 [SystemWriter] 更新使用者密碼 (Row: ${rowIndex})`);
        
        const targetId = this._getAuthTargetId();
        const sheetName = '使用者名冊';
        const range = `${sheetName}!B${rowIndex}`;
        
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: targetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newPasswordHash]] }
        });

        return { success: true };
    }

    /**
     * [Standard S] 刪除使用者 (By SheetId & RowIndex)
     * 禁止自行 lookup sheetId 或 rowIndex
     */
    async deleteUserByRow(sheetId, rowIndex) {
        console.log(`🗑️ [SystemWriter] 刪除使用者 (SheetId: ${sheetId}, Row: ${rowIndex})`);
        
        let spreadsheetIdToUse = this._getAuthTargetId();

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetIdToUse,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });

        return { success: true };
    }
}

module.exports = SystemWriter;
