/**
 * data/product-reader.js
 * 專門負責讀取所有與「市場商品資料」相關資料的類別
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 實作 Strict Mode 依賴注入。
 * 注意：商品資料通常位於獨立的 Sheet，因此這裡的 super 呼叫應確保傳入的是 Product Sheet ID。
 */

const BaseReader = require('./base-reader');
const config = require('../config');

class ProductReader extends BaseReader {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要讀取的 Sheet ID (應為 PRODUCT_ID)
     */
    constructor(sheets, spreadsheetId, googleClientService = null) {
        super(sheets, spreadsheetId, googleClientService);
        this.cacheKey = 'marketProducts';
    }

    /**
     * 讀取所有市場商品資料
     */
    async getAllProducts() {
        // ★★★ 使用注入的 targetSpreadsheetId，不再依賴 global config 的 ID ★★★
        if (!this.targetSpreadsheetId) {
            console.error('❌ [ProductReader] 未設定 Target Spreadsheet ID');
            return [];
        }

        const range = `${config.SHEETS.MARKET_PRODUCTS}!A:V`; 
        const cacheKey = this.cacheKey;
        const now = Date.now();

        // 1. 初始化快取
        if (!this.cache[cacheKey]) {
            this.cache[cacheKey] = { data: null, timestamp: 0 };
        }

        // 2. 讀取快取
        if (this.cache[cacheKey].data && (now - this.cache[cacheKey].timestamp < this.CACHE_DURATION)) {
            return this.cache[cacheKey].data;
        }

        // 3. 請求合併
        if (this._pendingPromises[cacheKey]) {
            return this._pendingPromises[cacheKey];
        }

        console.log(`🔄 [ProductReader] 正在讀取商品資料 (ID: ...${this.targetSpreadsheetId.slice(-6)})...`);

        // 4. 發起請求
        const fetchPromise = (async () => {
            try {
                // 使用 _executeWithRetry 與 this.targetSpreadsheetId
                const rows = this.googleClientService
                    ? await this.googleClientService.getSheetValuesNative(this.targetSpreadsheetId, range)
                    : (await this._executeWithRetry(() =>
                        this.sheets.spreadsheets.values.get({
                            spreadsheetId: this.targetSpreadsheetId,
                            range: range,
                        })
                    )).data.values || [];
                let data = [];

                if (rows.length > 1) {
                    data = rows.slice(1).map((row, index) => {
                        return this._parseRow(row, index);
                    }).filter(item => item !== null);
                }

                this.cache[cacheKey] = { data, timestamp: Date.now() };
                console.log(`✅ [ProductReader] 商品資料更新完成 (${data.length} 筆)`);
                return data;

            } catch (error) {
                console.error(`❌ [ProductReader] 讀取失敗:`, error.message);
                return this.cache[cacheKey].data || [];
            } finally {
                delete this._pendingPromises[cacheKey];
            }
        })();

        this._pendingPromises[cacheKey] = fetchPromise;
        return fetchPromise;
    }

    /**
     * 解析單一列資料
     */
    _parseRow(row, index) {
        const F = config.MARKET_PRODUCT_FIELDS;
        
        if (!row[F.ID] && !row[F.NAME]) return null;

        return {
            rowIndex: index + 2,
            id: row[F.ID] || '',
            name: row[F.NAME] || '',
            category: row[F.CATEGORY] || '',
            group: row[F.GROUP] || '',
            combination: row[F.COMBINATION] || '',
            unit: row[F.UNIT] || '',
            spec: row[F.SPEC] || '',
            
            cost: row[F.COST] || '',
            priceMtb: row[F.PRICE_MTB] || '',
            priceSi: row[F.PRICE_SI] || '',
            priceMtu: row[F.PRICE_MTU] || '',
            
            oppSpecOption: row[F.OPP_SPEC_OPTION] || '',
            oppDisplayCategory: row[F.OPP_DISPLAY_CATEGORY] || '',
            oppDisplayOrder: row[F.OPP_DISPLAY_ORDER] || '',
            oppBehaviorMode: row[F.OPP_BEHAVIOR_MODE] || '',
            aspect: row[F.ASPECT] || '',
            description: row[F.DESCRIPTION] || '',
            
            status: row[F.STATUS] || '上架',
            creator: row[F.CREATOR] || '',
            createTime: row[F.CREATE_TIME] || '',
            lastModifier: row[F.LAST_MODIFIER] || '',
            lastUpdateTime: row[F.LAST_UPDATE_TIME] || ''
        };
    }
}

module.exports = ProductReader;
