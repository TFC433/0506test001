/**
 * data/event-log-reader.js
 * 專門負責讀取所有與「事件紀錄 (Event Logs)」相關資料的類別
 * @version 5.1.1 (Phase 5 - Standard A Refactoring - Shared Mapping Patch)
 * @date 2026-01-29
 * @description [Standard A] 移除 Cross-Reader 依賴與業務邏輯，僅負責 Raw Data Access。
 * [Patch] 公開 HEADER_TO_KEY_MAP 供 Writer 共用，確保 Single Source of Truth。
 */

const BaseReader = require('./base-reader');

// 欄位映射表 (保持不變)
const HEADER_TO_KEY_MAP = {
    // Common Fields
    '事件ID': 'eventId',
    '事件名稱': 'eventName',
    '關聯機會ID': 'opportunityId',
    '關聯公司ID': 'companyId',
    '建立者': 'creator',
    '建立時間': 'createdTime',
    '最後修改時間': 'lastModifiedTime',
    '我方與會人員': 'ourParticipants',
    '客戶與會人員': 'clientParticipants',
    '會議地點': 'visitPlace',
    '會議內容': 'eventContent',
    '客戶提問': 'clientQuestions',
    '客戶情報': 'clientIntelligence',
    '備註': 'eventNotes',
    '修訂版次': 'editCount',

    // IOT Specific
    '設備規模': 'iot_deviceScale',
    '生產線特徵': 'iot_lineFeatures',
    '生產現況': 'iot_productionStatus',
    'IoT現況': 'iot_iotStatus',
    '痛點分類': 'iot_painPoints',
    '客戶痛點說明': 'iot_painPointDetails',
    '痛點分析與對策': 'iot_painPointAnalysis',
    '系統架構': 'iot_systemArchitecture',

    // DT Specific
    '加工類型': 'dt_processingType',
    '加工產業別': 'dt_industry',

    // Legacy Fields Mapping
    '下單機率': 'orderProbability',
    '可能下單數量': 'potentialQuantity',
    '銷售管道': 'salesChannel',
    '拜訪對象': 'clientParticipants',
    '公司規模': 'companySize',
    '生產現況紀錄': 'iot_productionStatus',
    'IoT現況紀錄': 'iot_iotStatus',
    '需求摘要註解': 'eventContent',
    '痛點詳細說明': 'iot_painPointDetails',
    '系統架構描述': 'iot_systemArchitecture',
    '外部系統串接': 'externalSystems',
    '硬體規模': 'hardwareScale',
    '客戶對FANUC期望': 'fanucExpectation',
    '痛點補充說明': 'eventNotes'
};

class EventLogReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
        // [Standard A] 禁止在 Reader 內 require/new 其他 Reader
    }

    async _fetchLegacyEventData() {
        try {
            const range = `事件紀錄總表!A:Y`;
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range
            });

            const rows = response.data.values || [];
            if (rows.length <= 1) return [];

            const legacyHeadersInOrder = [
                '事件ID', '事件名稱', '關聯機會ID', '建立者', '建立時間', '下單機率', '可能下單數量',
                '銷售管道', '我方與會人員', '拜訪對象', '公司規模', '拜訪地點', '生產線特徵',
                '生產現況紀錄', 'IoT現況紀錄', '需求摘要註解', '痛點分類', '痛點詳細說明',
                '系統架構描述', '外部系統串接', '硬體規模', '客戶對FANUC期望', '痛點補充說明', '關聯公司ID'
            ];

            return rows.slice(1).map((row, index) => {
                const log = { rowIndex: index + 2, eventType: 'legacy', editCount: 1 };

                legacyHeadersInOrder.forEach((header, i) => {
                    const key = HEADER_TO_KEY_MAP[header];
                    if (key) log[key] = row[i] || '';
                });

                const lastUpdateTime = row[24];
                log.lastModifiedTime = lastUpdateTime || log.createdTime;
                log.iot_deviceScale = log.potentialQuantity || log.hardwareScale;

                return log;
            });
        } catch (error) {
            if (error.code === 400 && String(error.message || '').includes('Unable to parse range')) return [];
            console.warn(`⚠️ 讀取舊版事件工作表失敗: ${error.message}`);
            return [];
        }
    }

    async _fetchEventData(eventType, sheetName, specificFields = []) {
        const commonFields = this.config.EVENT_LOG_COMMON_FIELDS;
        const allHeaders = [...commonFields, ...specificFields];
        const lastColumn = String.fromCharCode(65 + allHeaders.length - 1);
        const range = `${sheetName}!A:${lastColumn}`;

        const rowParser = (row, index) => {
            const log = { rowIndex: index + 2, eventType };

            allHeaders.forEach((header, i) => {
                let key;
                if (header === '設備規模' && (eventType === 'iot' || eventType === 'dt')) {
                    key = `${eventType}_deviceScale`;
                } else {
                    key = HEADER_TO_KEY_MAP[header];
                }

                if (key) log[key] = row[i] || '';
            });

            return log;
        };

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range
            });

            const rows = response.data.values || [];
            if (rows.length <= 1) return [];
            return rows.slice(1).map(rowParser);
        } catch (error) {
            if (error.code !== 400 || !String(error.message || '').includes('Unable to parse range')) {
                console.warn(`⚠️ 讀取事件工作表 "${sheetName}" 失敗: ${error.message}`);
            }
            return [];
        }
    }

    async getEventLogs() {
        const cacheKey = 'eventLogs';
        const now = Date.now();

        if (
            this.cache[cacheKey] &&
            this.cache[cacheKey].data &&
            (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)
        ) {
            console.log(`✅ [Cache] 從快取讀取 ${cacheKey}...`);
            return this.cache[cacheKey].data;
        }

        console.log(`🔄 [API] 正在從所有新舊事件工作表讀取資料...`);

        const S = this.config.SHEETS;
        const F = this.config;

        const [legacyLogs, generalLogs, iotLogs, dtLogs, dxLogs] = await Promise.all([
            this._fetchLegacyEventData(),
            this._fetchEventData('general', S.EVENT_LOGS_GENERAL),
            this._fetchEventData('iot', S.EVENT_LOGS_IOT, F.EVENT_LOG_IOT_FIELDS),
            this._fetchEventData('dt', S.EVENT_LOGS_DT, F.EVENT_LOG_DT_FIELDS),
            this._fetchEventData('dx', S.EVENT_LOGS_DX)
        ]);

        const allLogs = [...legacyLogs, ...generalLogs, ...iotLogs, ...dtLogs, ...dxLogs];

        this.cache[cacheKey] = { data: allLogs, timestamp: now };
        return allLogs;
    }

    /**
     * [Standard A] Raw only：只查找 eventId，不做 Join
     */
    async getEventLogById(eventId) {
        const allLogs = await this.getEventLogs();
        return allLogs.find(log => log.eventId === eventId) || null;
    }
}

// [Patch] 公開映射表供 Writer 使用，確保單一真相
EventLogReader.HEADER_TO_KEY_MAP = HEADER_TO_KEY_MAP;

module.exports = EventLogReader;