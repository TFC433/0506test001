/**
 * File: data/base-reader.js
 * 資料讀取基底類別
 * @version 5.0.1
 * @date 2026-04-23
 * @purpose Increase cache TTL from 30s to 300s
 * @description 所有資料 Reader 的父類別。
 * 實作了依賴注入 (DI) 機制，強制要求子類別傳入明確的 Spreadsheet ID。
 * 包含快取機制與自動重試邏輯。
 * @changelog
 * - Increased cache TTL from 30s to 300s (minimal diff performance patch).
 */

const config = require('../config');

// 集中管理所有資料的快取狀態
const cache = {
    opportunities: { data: null, timestamp: 0 },
    contacts: { data: null, timestamp: 0 },
    interactions: { data: null, timestamp: 0 },
    eventLogs: { data: null, timestamp: 0 },
    systemConfig: { data: null, timestamp: 0 },
    companyList: { data: null, timestamp: 0 },
    contactList: { data: null, timestamp: 0 },
    users: { data: null, timestamp: 0 },
    weeklyBusiness: { data: null, timestamp: 0 },
    weeklyBusinessSummary: { data: null, timestamp: 0 },
    oppContactLinks: { data: null, timestamp: 0 },
    announcements: { data: null, timestamp: 0 },
    products: { data: null, timestamp: 0 }, // 新增商品快取
    
    _globalLastWrite: { data: Date.now(), timestamp: 0 }
};

const CACHE_DURATION = 300 * 1000; 

/**
 * 所有 Reader 的基礎類別
 * 【Phase 5 暴力重構】：實作 Strict Mode 依賴注入
 */
class BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID。嚴格模式下不可為空。
     * @throws {Error} 若未提供 spreadsheetId 則拋出致命錯誤
     */
    constructor(sheets, spreadsheetId) {
        if (!sheets) throw new Error('BaseReader 初始化失敗: 需要 Sheets API 實例');
        
        // ★★★ Strict Mode Check ★★★
        // 拒絕隱性依賴，強制要求明確的 ID
        if (!spreadsheetId) {
            throw new Error(`[Fatal] BaseReader 初始化失敗: 未提供 Spreadsheet ID。請檢查 Service Container 的注入設定。`);
        }

        this.sheets = sheets;
        this.targetSpreadsheetId = spreadsheetId; // 綁定目標 ID
        this.config = config;
        this.cache = cache;
        this.CACHE_DURATION = CACHE_DURATION;
        
        // 請求去重用的 Promise 儲存區
        this._pendingPromises = {}; 
    }

    invalidateCache(key = null) {
        if (key && this.cache[key]) {
            this.cache[key].timestamp = 0;
            console.log(`✅ [Cache] 快取已失效: ${key}`);
        } else if (key === null) {
            Object.keys(this.cache).forEach(k => {
                if (this.cache[k]) this.cache[k].timestamp = 0;
            });
            console.log('✅ [Cache] 所有快取已失效');
        }
        this.cache._globalLastWrite.data = Date.now();
    }

    /**
     * 核心重試邏輯 (Auto Retry with Backoff)
     * 當遇到 429 (Too Many Requests) 或 5xx (Server Error) 時自動重試
     * @param {Function} apiCallFn - 要執行的 API 呼叫函式
     * @param {number} maxRetries - 最大重試次數 (預設 3 次)
     */
    async _executeWithRetry(apiCallFn, maxRetries = 3) {
        let attempt = 0;
        
        while (true) {
            try {
                return await apiCallFn();
            } catch (error) {
                attempt++;
                
                // 判斷是否為可重試的錯誤
                const isRateLimit = error.code === 429 || 
                                   (error.message && (
                                       error.message.includes('Quota exceeded') || 
                                       error.message.includes('Too Many Requests')
                                   ));
                const isServerError = error.code >= 500 && error.code < 600;

                if ((isRateLimit || isServerError) && attempt <= maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
                    
                    console.warn(`⚠️ [API] 觸發自動重試機制 (${attempt}/${maxRetries}) - 等待 ${Math.round(delay)}ms...`);
                    console.warn(`   原因: ${error.message}`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; 
                }
                
                throw error;
            }
        }
    }

    /**
     * 通用讀取與快取方法
     * @param {string} cacheKey - 快取鍵值
     * @param {string} range - Sheet 範圍 (例如 'Contacts!A:Z')
     * @param {Function} rowParser - 資料解析函式
     * @param {Function} sorter - 排序函式 (選填)
     */
    async _fetchAndCache(cacheKey, range, rowParser, sorter = null) {
        const now = Date.now();

        // 1. 初始化
        if (!this.cache[cacheKey]) {
            this.cache[cacheKey] = { data: null, timestamp: 0 };
        }

        // 2. 讀快取
        if (this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        // 3. 請求合併
        if (this._pendingPromises[cacheKey]) {
            console.log(`⏳ [API] 併發請求合併: ${cacheKey}`);
            return this._pendingPromises[cacheKey];
        }

        console.log(`🔄 [API] 準備讀取: ${cacheKey} (${range}) [ID: ${this.targetSpreadsheetId.substring(0,6)}...]`);

        // 4. 發起請求
        const fetchPromise = (async () => {
            try {
                const response = await this._executeWithRetry(() => 
                    this.sheets.spreadsheets.values.get({
                        // ★★★ 使用注入的 targetSpreadsheetId ★★★
                        spreadsheetId: this.targetSpreadsheetId,
                        range: range,
                    })
                );

                const rows = response.data.values || [];
                let data = [];
                
                if (rows.length > 1) {
                    data = rows.slice(1).map((row, index) => {
                        const parsedRow = rowParser(row, index);
                        if (parsedRow && typeof parsedRow.rowIndex === 'undefined') {
                           parsedRow.rowIndex = index + 2;
                        }
                        return parsedRow;
                    }).filter(item => item !== null && item !== undefined);
                }

                if (sorter) data.sort(sorter);

                this.cache[cacheKey] = { data, timestamp: Date.now() };
                console.log(`[Cache] ${cacheKey} 更新完成 (${data.length} 筆)`);
                return data;

            } catch (error) {
                console.error(`❌ [DataReader] 讀取 ${range} 最終失敗:`, error.message);

                if (error.code === 400 && error.message.includes('Unable to parse range')) {
                     this.cache[cacheKey] = { data: [], timestamp: Date.now() };
                     return [];
                }

                return this.cache[cacheKey].data || [];
            } finally {
                delete this._pendingPromises[cacheKey];
            }
        })();

        this._pendingPromises[cacheKey] = fetchPromise;
        return fetchPromise;
    }

    /**
     * 依據欄位值查找單一列
     */
    async findRowByValue(range, columnIndex, value) {
        try {
            const response = await this._executeWithRetry(() => 
                this.sheets.spreadsheets.values.get({
                    // ★★★ 使用注入的 targetSpreadsheetId ★★★
                    spreadsheetId: this.targetSpreadsheetId,
                    range: range,
                })
            );

            const rows = response.data.values || [];
            if (rows.length > 0 && columnIndex >= rows[0].length) return null;
            
            for (let i = 1; i < rows.length; i++) { 
                if (rows[i] && rows[i][columnIndex] !== undefined && rows[i][columnIndex] !== null) {
                   if (String(rows[i][columnIndex]).toLowerCase() === String(value).toLowerCase()) {
                        return { rowData: rows[i], rowIndex: i + 1 }; 
                   }
                }
            }
            return null;
        } catch (error) {
            console.error(`❌ [DataReader] 查找值失敗:`, error.message);
            if (error.code === 400) return null;
            throw error; 
        }
    }
}

module.exports = BaseReader;