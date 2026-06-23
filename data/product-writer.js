/**
 * data/product-writer.js
 * 市場商品資料寫入器
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責處理市場商品資料 (Products) 的建立、更新與刪除。
 * 實作 Strict Mode 依賴注入，通常指向 MARKET_PRODUCT_SHEET_ID。
 */

const BaseWriter = require('./base-writer');

class ProductWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID (應為 PRODUCT_ID)
     * @param {Object} productReader - 用於清除快取的 Reader 實例
     */
    constructor(sheets, spreadsheetId, productReader, googleClientService = null) {
        super(sheets, spreadsheetId);
        if (!productReader) {
            throw new Error('ProductWriter 需要 ProductReader 的實例');
        }
        this.productReader = productReader;
        this.googleClientService = googleClientService;
        this.cacheKey = 'marketProducts';
    }

    /**
     * 建立新商品
     */
    async createProduct(data, creator) {
        console.log(`📦 [ProductWriter] 建立新商品: ${data.name} by ${creator}`);
        
        const now = new Date().toISOString();
        const newId = `PROD${Date.now()}`;
        const F = this.config.MARKET_PRODUCT_FIELDS; // 使用 Config 定義的欄位索引

        // 建立一個長度足夠的空陣列 (假設最大索引為 21)
        const newRow = new Array(22).fill('');

        // 填入資料
        newRow[F.ID] = newId;
        newRow[F.NAME] = data.name || '';
        newRow[F.CATEGORY] = data.category || '';
        newRow[F.GROUP] = data.group || '';
        newRow[F.COMBINATION] = data.combination || '';
        newRow[F.UNIT] = data.unit || '';
        newRow[F.SPEC] = data.spec || '';
        
        // 機敏資料
        newRow[F.COST] = data.cost || '';
        newRow[F.PRICE_MTB] = data.priceMtb || '';
        newRow[F.PRICE_SI] = data.priceSi || '';
        newRow[F.PRICE_MTU] = data.priceMtu || '';
        
        newRow[F.OPP_SPEC_OPTION] = data.oppSpecOption || '';
        newRow[F.OPP_DISPLAY_CATEGORY] = data.oppDisplayCategory || '';
        newRow[F.OPP_DISPLAY_ORDER] = data.oppDisplayOrder || '';
        newRow[F.OPP_BEHAVIOR_MODE] = data.oppBehaviorMode || '';
        newRow[F.ASPECT] = data.aspect || '';
        newRow[F.DESCRIPTION] = data.description || '';
        
        newRow[F.STATUS] = data.status || '上架';
        newRow[F.CREATOR] = creator;
        newRow[F.CREATE_TIME] = now;
        newRow[F.LAST_MODIFIER] = creator;
        newRow[F.LAST_UPDATE_TIME] = now;

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        if (!this.googleClientService || !this.googleClientService.appendSheetValuesNative) {
            throw new Error('ProductWriter native GoogleClientService is required for createProduct');
        }

        await this.googleClientService.appendSheetValuesNative(this.targetSpreadsheetId, `${this.config.SHEETS.MARKET_PRODUCTS}!A:V`, [newRow], {
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS'
        });

        this.productReader.invalidateCache(this.cacheKey);
        return { success: true, id: newId };
    }

    /**
     * 更新商品資料
     */
    async updateProduct(rowIndex, data, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`📦 [ProductWriter] 更新商品 Row ${rowIndex} by ${modifier}`);
        
        const now = new Date().toISOString();
        const F = this.config.MARKET_PRODUCT_FIELDS;

        // 1. 讀取舊資料
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const range = `${this.config.SHEETS.MARKET_PRODUCTS}!A${rowIndex}:V${rowIndex}`;
        if (!this.googleClientService || !this.googleClientService.getSheetValuesNative || !this.googleClientService.updateSheetValuesNative) {
            throw new Error('ProductWriter native GoogleClientService is required for updateProduct');
        }

        const values = await this.googleClientService.getSheetValuesNative(this.targetSpreadsheetId, range);
        const currentRow = values ? values[0] : [];
        if (currentRow.length === 0) throw new Error('找不到該筆商品資料');

        // 補齊長度
        while (currentRow.length < 22) currentRow.push('');

        // 2. 更新欄位
        if (data.name !== undefined) currentRow[F.NAME] = data.name;
        if (data.category !== undefined) currentRow[F.CATEGORY] = data.category;
        if (data.group !== undefined) currentRow[F.GROUP] = data.group;
        if (data.combination !== undefined) currentRow[F.COMBINATION] = data.combination;
        if (data.unit !== undefined) currentRow[F.UNIT] = data.unit;
        if (data.spec !== undefined) currentRow[F.SPEC] = data.spec;
        
        if (data.cost !== undefined) currentRow[F.COST] = data.cost;
        if (data.priceMtb !== undefined) currentRow[F.PRICE_MTB] = data.priceMtb;
        if (data.priceSi !== undefined) currentRow[F.PRICE_SI] = data.priceSi;
        if (data.priceMtu !== undefined) currentRow[F.PRICE_MTU] = data.priceMtu;
        
        if (data.oppSpecOption !== undefined) currentRow[F.OPP_SPEC_OPTION] = data.oppSpecOption;
        if (data.oppDisplayCategory !== undefined) currentRow[F.OPP_DISPLAY_CATEGORY] = data.oppDisplayCategory;
        if (data.oppDisplayOrder !== undefined) currentRow[F.OPP_DISPLAY_ORDER] = data.oppDisplayOrder;
        if (data.oppBehaviorMode !== undefined) currentRow[F.OPP_BEHAVIOR_MODE] = data.oppBehaviorMode;
        if (data.aspect !== undefined) currentRow[F.ASPECT] = data.aspect;
        if (data.description !== undefined) currentRow[F.DESCRIPTION] = data.description;
        if (data.status !== undefined) currentRow[F.STATUS] = data.status;

        currentRow[F.LAST_MODIFIER] = modifier;
        currentRow[F.LAST_UPDATE_TIME] = now;

        // 3. 寫回
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.googleClientService.updateSheetValuesNative(this.targetSpreadsheetId, range, [currentRow], {
            valueInputOption: 'USER_ENTERED'
        });

        this.productReader.invalidateCache(this.cacheKey);
        return { success: true };
    }

    /**
     * 刪除商品 (實為標記刪除或物理刪除，此處實作物理刪除以符合 BaseWriter 標準)
     */
    async deleteProduct(rowIndex) {
        console.log(`🗑️ [ProductWriter] 刪除商品 Row ${rowIndex}`);
        
        // 呼叫 BaseWriter 的 _deleteRow
        // 注意：這裡需要手動傳入 cacheKey 支援，或者 BaseWriter 已擴充
        // 由於 BaseWriter 的 cacheKeyMap 可能沒有 'MARKET_PRODUCTS'，我們直接在這裡呼叫 invalidate
        
        try {
            if (!this.googleClientService || !this.googleClientService.batchUpdateSpreadsheetNative) {
                throw new Error('ProductWriter native GoogleClientService is required for deleteProduct');
            }

            const sheetId = await this._getSheetIdByName(this.config.SHEETS.MARKET_PRODUCTS);
            await this.googleClientService.batchUpdateSpreadsheetNative(this.targetSpreadsheetId, [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }]);

            this.productReader.invalidateCache(this.cacheKey);
        } catch (error) {
            // 如果 BaseWriter 沒設定 Product 的 Cache Key，我們手動清
            this.productReader.invalidateCache(this.cacheKey);
            throw error; 
        }
        
        return { success: true };
    }
}

module.exports = ProductWriter;
