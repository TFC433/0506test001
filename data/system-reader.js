/**
 * data/system-reader.js
 * 專門負責讀取系統級資料的類別 (系統設定、使用者)
 * * @version 2.0.2
 * @date 2026-03-17
 * @reason Temporary Compatibility Adapter for Legacy Modules
 * @description 恢復 getSystemConfig 介面以支援舊模組 (Dashboard, Product)，但內部轉接至 Raw API。
 * @changelog
 * - [Fix] Synchronized backwards-compatibility adapter to use case-insensitive, value-or-note config item matching.
 */

const BaseReader = require('./base-reader');

class SystemReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
    }

    /**
     * 取得全域最後寫入時間戳 (封裝 Cache 存取)
     * @returns {string|null} ISO String
     */
    getLastWriteTimestamp() {
        return this.cache._globalLastWrite ? this.cache._globalLastWrite.data : null;
    }

    /**
     * [Standard A] 取得系統設定原始資料
     * 僅回傳二維陣列，不處理任何業務規則
     * @returns {Promise<Array<Array<string>>>} Raw rows
     */
    async getSystemConfigRaw() {
        const cacheKey = 'systemConfigRaw';
        const now = Date.now();
        
        if (this.cache[cacheKey] && this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId, 
                range: `${this.config.SHEETS.SYSTEM_CONFIG}!A:I`,
            });
            
            const rows = response.data.values || [];
            this.cache[cacheKey] = { data: rows, timestamp: now };
            return rows;

        } catch (error) {
            console.error('❌ [SystemReader] 讀取系統設定失敗:', error);
            return [];
        }
    }

    /**
     * [HOTFIX / ADAPTER] 向下相容的系統設定讀取方法
     * 目的：防止尚未重構的模組 (如 DashboardService, ProductService) 因呼叫舊 API 而崩潰
     * 實作：呼叫 getSystemConfigRaw() 並於此處套用最小必要的 defaults/sort 邏輯
     * @deprecated 請儘速遷移至 SystemService.getSystemConfig()
     */
    async getSystemConfig() {
        console.warn('⚠️ [Deprecation] SystemReader.getSystemConfig() is deprecated. Call SystemService instead.');
        
        const rows = await this.getSystemConfigRaw();
        
        // 暫時性邏輯：為了滿足舊模組對資料結構的期望，在此處重複 Service 層的處理邏輯
        const settings = {
            '事件類型': [
                { value: 'general', note: '一般', order: 1, color: '#6c757d' },
                { value: 'iot', note: 'IOT', order: 2, color: '#007bff' },
                { value: 'dt', note: 'DT', order: 3, color: '#28a745' },
                { value: 'dx', note: 'DX', order: 4, color: '#ffc107' },
                { value: 'legacy', note: '舊事件', order: 5, color: '#dc3545' }
            ],
            '日曆篩選規則': []
        };
        
        const normalize = (str) => (str || '').toString().trim().toLowerCase();

        if (rows.length > 1) {
            rows.slice(1).forEach(row => {
                const [type, item, order, enabled, note, color, value2, value3, category] = row;
                
                if (type && item) {
                    const normalizedItem = normalize(item);
                    const matchFn = (i) => normalize(i.value) === normalizedItem || normalize(i.note) === normalizedItem;

                    if (enabled === 'TRUE') {
                        if (!settings[type]) settings[type] = [];
                        
                        const exists = settings[type].find(matchFn);
                        if (exists) {
                            exists.note = note || item;
                            exists.order = parseInt(order) || 99;
                        } else {
                            settings[type].push({
                                value: item,
                                note: note || item,
                                order: parseInt(order) || 99,
                                color: color || null,
                                value2: value2 || null, 
                                value3: value3 || null, 
                                category: category || '其他' 
                            });
                        }
                    } else {
                        // 當 enabled !== 'TRUE' 時，若該項目已存在於預設值中，將其移除
                        if (settings[type]) {
                            const index = settings[type].findIndex(matchFn);
                            if (index !== -1) {
                                settings[type].splice(index, 1);
                            }
                        }
                    }
                }
            });
        }
        
        // 排序邏輯
        Object.keys(settings).forEach(type => {
            if (Array.isArray(settings[type])) {
                settings[type].sort((a, b) => a.order - b.order);
            }
        });
        
        return settings;
    }

    /**
     * [Standard A] 取得使用者名冊
     * 允許 Mapping 產生 rowIndex，但不得包含業務篩選邏輯
     */
    async getUsers() {
        const cacheKey = 'users';
        const range = '使用者名冊!A:D';
        const targetSheetId = this.config.IDS.AUTH || this.targetSpreadsheetId;
        const now = Date.now();
        
        if (this.cache[cacheKey] && this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        console.log(`🔐 [Auth] 讀取使用者名冊 (Sheet ID: ...${targetSheetId.slice(-6)})...`);

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: targetSheetId,
                range: range,
            });

            const rows = response.data.values || [];
            
            const allUsers = rows.map((row, index) => {
                const username = row[0] ? row[0].trim() : '';
                const passwordHash = row[1] ? row[1].trim() : '';
                const displayName = row[2] ? row[2].trim() : '';
                const role = row[3] ? row[3].trim().toLowerCase() : 'sales';

                return {
                    rowIndex: index + 1,
                    username,
                    passwordHash,
                    displayName,
                    role
                };
            }).filter(user => user.username && user.passwordHash);

            this.cache[cacheKey] = { data: allUsers, timestamp: now };
            return allUsers;

        } catch (error) {
            console.error('❌ [SystemReader] 讀取使用者名冊失敗:', error.message);
            return [];
        }
    }

    /**
     * [New] 取得指定 Sheet Title 的 SheetId (Integer)
     */
    async getTabId(sheetTitle) {
        let targetSpreadsheetId = this.targetSpreadsheetId;
        // 特例處理：使用者名冊可能在 Auth Sheet
        if (sheetTitle === '使用者名冊' && this.config.IDS.AUTH) {
            targetSpreadsheetId = this.config.IDS.AUTH;
        }

        const cacheKey = `sheetId_${targetSpreadsheetId}_${sheetTitle}`;
        if (this.cache[cacheKey]) return this.cache[cacheKey];

        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: targetSpreadsheetId,
                fields: 'sheets.properties.title,sheets.properties.sheetId',
            });

            const sheet = response.data.sheets.find(s => s.properties.title === sheetTitle);
            if (sheet) {
                this.cache[cacheKey] = sheet.properties.sheetId;
                return sheet.properties.sheetId;
            }
            return null;
        } catch (error) {
            console.error(`❌ [SystemReader] 無法取得 SheetId: ${sheetTitle}`, error);
            return null;
        }
    }
}

module.exports = SystemReader;