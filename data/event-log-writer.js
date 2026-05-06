/**
 * data/event-log-writer.js
 * 事件紀錄寫入器
 * * @version 5.1.0 (Phase 5 Refactoring - Shared Mapping Patch)
 * @date 2026-01-29
 * @description 負責處理各類型事件 (General, IOT, DT, DX) 的建立、更新與刪除。
 * [Patch] 移除內部 HEADER_TO_KEY_MAP，改用 EventLogReader.HEADER_TO_KEY_MAP 確保一致性。
 */

const BaseWriter = require('./base-writer');
const EventLogReader = require('./event-log-reader'); // [Patch] 引用 Reader 以獲取 Mapping

class EventLogWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} eventLogReader - 用於清除快取的 Reader 實例
     */
    constructor(sheets, spreadsheetId, eventLogReader) {
        super(sheets, spreadsheetId);
        if (!eventLogReader) {
            throw new Error('EventLogWriter 需要 EventLogReader 的實例');
        }
        this.eventLogReader = eventLogReader;
        
        // [Patch] 移除重複定義，統一使用 Reader 的定義
        // this.HEADER_TO_KEY_MAP = { ... }; 
    }

    /**
     * 根據事件類型取得對應的工作表名稱
     */
    _getSheetNameByType(type) {
        switch (type) {
            case 'iot': return this.config.SHEETS.EVENT_LOGS_IOT;
            case 'dt': return this.config.SHEETS.EVENT_LOGS_DT;
            case 'dx': return this.config.SHEETS.EVENT_LOGS_DX;
            case 'general': 
            default: return this.config.SHEETS.EVENT_LOGS_GENERAL;
        }
    }

    /**
     * 根據工作表名稱取得欄位定義
     */
    _getFieldsByType(type) {
        const commonFields = this.config.EVENT_LOG_COMMON_FIELDS;
        if (type === 'iot') return [...commonFields, ...this.config.EVENT_LOG_IOT_FIELDS];
        if (type === 'dt') return [...commonFields, ...this.config.EVENT_LOG_DT_FIELDS];
        // General 與 DX 目前只使用 Common Fields
        return commonFields;
    }

    /**
     * 建立新事件紀錄
     */
    async createEventLog(data, creator) {
        console.log(`📅 [EventLogWriter] 建立新事件: ${data.eventName} (${data.eventType}) by ${creator}`);
        
        const now = new Date().toISOString();
        const eventId = `EVT${Date.now()}`;
        const sheetName = this._getSheetNameByType(data.eventType);
        const headers = this._getFieldsByType(data.eventType);
        
        // [Patch] 使用 Shared Mapping
        const MAPPING = EventLogReader.HEADER_TO_KEY_MAP;

        // 準備寫入資料
        const rowData = headers.map(header => {
            // 反向查找 key
            let key = null;
            // 特殊處理：IOT與DT的設備規模欄位名稱相同但 key 不同
            if (header === '設備規模') {
                if (data.eventType === 'iot') key = 'iot_deviceScale';
                else if (data.eventType === 'dt') key = 'dt_deviceScale';
                else key = MAPPING[header];
            } else {
                key = MAPPING[header];
            }

            if (header === '事件ID') return eventId;
            if (header === '建立者') return creator;
            if (header === '建立時間') return now;
            if (header === '最後修改時間') return now;
            if (header === '修訂版次') return '1';

            return (key && data[key] !== undefined) ? data[key] : '';
        });

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${sheetName}!A:Z`, // 寬鬆範圍，讓 Google 自動判斷
            valueInputOption: 'USER_ENTERED',
            resource: { values: [rowData] }
        });

        this.eventLogReader.invalidateCache('eventLogs');
        return { success: true, id: eventId };
    }

    /**
     * 更新事件紀錄
     */
    async updateEventLog(rowIndex, data, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`📅 [EventLogWriter] 更新事件 Row ${rowIndex} (${data.eventType}) by ${modifier}`);

        const sheetName = this._getSheetNameByType(data.eventType);
        const headers = this._getFieldsByType(data.eventType);
        const now = new Date().toISOString();
        
        // [Patch] 使用 Shared Mapping
        const MAPPING = EventLogReader.HEADER_TO_KEY_MAP;

        // 1. 先讀取舊資料 (為了確保不覆蓋未傳入的欄位，且要計算修訂版次)
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        // 計算欄位總數以決定讀取範圍 (A ~ ?)
        const lastColumnChar = String.fromCharCode(65 + headers.length - 1);
        const range = `${sheetName}!A${rowIndex}:${lastColumnChar}${rowIndex}`;

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: range
        });

        const currentRow = response.data.values ? response.data.values[0] : [];
        if (currentRow.length === 0) throw new Error('找不到該筆事件資料');

        // 確保 row 長度足夠
        while (currentRow.length < headers.length) {
            currentRow.push('');
        }

        // 2. 更新欄位
        headers.forEach((header, index) => {
            let key = null;
            if (header === '設備規模') {
                if (data.eventType === 'iot') key = 'iot_deviceScale';
                else if (data.eventType === 'dt') key = 'dt_deviceScale';
                else key = MAPPING[header];
            } else {
                key = MAPPING[header];
            }

            // 特殊欄位自動處理
            if (header === '最後修改時間') {
                currentRow[index] = now;
            } else if (header === '修訂版次') {
                const currentVer = parseInt(currentRow[index]) || 1;
                currentRow[index] = String(currentVer + 1);
            } else if (key && data[key] !== undefined) {
                // 一般欄位：有傳入才更新
                currentRow[index] = data[key];
            }
        });

        // 3. 寫回
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        this.eventLogReader.invalidateCache('eventLogs');
        return { success: true };
    }

    /**
     * 刪除事件紀錄
     */
    async deleteEventLog(rowIndex, eventType) {
        console.log(`🗑️ [EventLogWriter] 刪除事件 Row ${rowIndex} (${eventType})`);
        const sheetName = this._getSheetNameByType(eventType);
        
        // 呼叫 BaseWriter 的 _deleteRow
        await this._deleteRow(sheetName, rowIndex, this.eventLogReader);
        
        return { success: true };
    }
}

module.exports = EventLogWriter;