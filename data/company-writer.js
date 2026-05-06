/**
 * data/company-writer.js
 * 公司寫入器 (Native Implementation)
 * * @version 7.5.0 (Final Fix: Full Field Mapping & Native API)
 * * @date 2026-01-16
 * * @description 
 * * 1. [Fix] 補齊欄位對映：確保 Type(10), Stage(11), Rating(12) 正確寫入。
 * * 2. [Fix] 修復 createCompany 錯誤：改用 Native API (values.append)。
 * * 3. [Strict] 嚴格定義 0-12 欄位索引，防止資料錯位。
 */

const BaseWriter = require('./base-writer');

class CompanyWriter extends BaseWriter {
    /**
     * @param {Object} sheets Google Sheets API Instance
     * @param {string} spreadsheetId Target Spreadsheet ID
     */
    constructor(sheets, spreadsheetId) {
        super(sheets, spreadsheetId);
        // Zero Assumption: 禁止注入 Reader，避免循環依賴
    }

    /**
     * 建立新公司
     * @param {Object} companyData 前端傳入的物件 (含 companyName, companyType 等)
     * @param {string} creator 建立者名稱
     */
    async createCompany(companyData, creator) {
        const sheetName = this.config.SHEETS.COMPANY_LIST;
        const now = new Date().toISOString();
        
        // 1. 產生 ID
        const companyId = `COMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // 2. 準備資料列 (Strict Mapping: Index 0-12)
        // 必須與 0109 規格完全一致，不可省略任何一個 null
        const newRow = [
            companyId,                              // 0: ID
            companyData.companyName || '',          // 1: 公司名稱
            companyData.phone || '',                // 2: 電話
            companyData.address || '',              // 3: 地址
            now,                                    // 4: 建立時間
            now,                                    // 5: 更新時間
            companyData.county || '',               // 6: 縣市
            creator,                                // 7: 建立者
            creator,                                // 8: 最後修改者
            companyData.introduction || '',         // 9: 公司簡介
            companyData.companyType || '',          // 10: 公司類型 (修復斷點)
            companyData.customerStage || 'New',     // 11: 客戶階段 (修復斷點)
            companyData.engagementRating || 'C'     // 12: 互動評級 (修復斷點)
        ];

        console.log(`📝 [CompanyWriter] 正在建立公司: ${companyData.companyName} (Native Append)`);

        try {
            // 3. 執行原生寫入 (Fix: this.appendRow -> sheets.values.append)
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.targetSpreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [newRow]
                }
            });

            return { 
                success: true, 
                data: { 
                    companyId, 
                    companyName: companyData.companyName 
                } 
            };
        } catch (error) {
            console.error('❌ [CompanyWriter] Create Error:', error);
            throw new Error(`建立公司失敗: ${error.message}`);
        }
    }

    /**
     * 更新公司資料 (原子操作：先讀後寫)
     * @param {number} rowIndex 資料行號 (1-based)
     * @param {Object} updateData 更新內容
     * @param {string} modifier 修改者
     */
    async updateCompany(rowIndex, updateData, modifier) {
        const sheetName = this.config.SHEETS.COMPANY_LIST;
        // 擴大讀取範圍至 M 欄 (Index 12)，確保能讀寫到最後一個欄位
        const range = `${sheetName}!A${rowIndex}:M${rowIndex}`;

        try {
            // 1. 先讀取舊資料 (Native Get)
            const getRes = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.targetSpreadsheetId,
                range: range
            });

            const rows = getRes.data.values;
            if (!rows || rows.length === 0) {
                throw new Error(`Row ${rowIndex} 不存在或無資料`);
            }

            let currentRow = rows[0];
            
            // 確保陣列長度足夠 (補滿至 Index 12)
            while (currentRow.length <= 12) {
                currentRow.push('');
            }

            // 2. 更新欄位 (Strict Mapping)
            // 僅更新 updateData 中存在的欄位，其餘保持原樣
            if (updateData.companyName !== undefined) currentRow[1] = updateData.companyName;
            if (updateData.phone !== undefined) currentRow[2] = updateData.phone;
            if (updateData.address !== undefined) currentRow[3] = updateData.address;
            
            currentRow[5] = new Date().toISOString(); // LastUpdate (Index 5)
            
            if (updateData.county !== undefined) currentRow[6] = updateData.county;
            currentRow[8] = modifier; // Modifier (Index 8)
            
            if (updateData.introduction !== undefined) currentRow[9] = updateData.introduction;
            
            // ★★★ 關鍵修復區域：寫入業務欄位 ★★★
            // 這些欄位必須與前端 HTML form 的 name 屬性完全對應
            if (updateData.companyType !== undefined) currentRow[10] = updateData.companyType;
            if (updateData.customerStage !== undefined) currentRow[11] = updateData.customerStage;
            if (updateData.engagementRating !== undefined) currentRow[12] = updateData.engagementRating;

            // 3. 寫回 Google Sheets (Native Update)
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.targetSpreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [currentRow] }
            });

            console.log(`✅ [CompanyWriter] 公司資料更新成功 (Row: ${rowIndex})`);
            return { success: true };

        } catch (error) {
            console.error(`❌ [CompanyWriter] Update Error (Row ${rowIndex}):`, error);
            throw error;
        }
    }

    /**
     * 刪除公司 (Native Implementation)
     * @param {number} rowIndex 
     */
    async deleteCompany(rowIndex) {
        const sheetName = this.config.SHEETS.COMPANY_LIST;
        
        try {
            // 1. 取得 Sheet ID (使用 BaseWriter 提供的 Helper)
            const sheetId = await this._getSheetIdByName(sheetName);
            
            console.log(`🗑️ [CompanyWriter] 執行原生刪除 Row ${rowIndex} (SheetId: ${sheetId})`);

            // 2. 執行原生 batchUpdate (deleteDimension)
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex - 1, // 0-based index
                                endIndex: rowIndex
                            }
                        }
                    }]
                }
            });
            
            console.log(`✅ [CompanyWriter] 刪除成功 (Row: ${rowIndex})`);
            return { success: true };
        } catch (error) {
            console.error(`❌ [CompanyWriter] Delete Error (Row ${rowIndex}):`, error);
            throw error;
        }
    }
}

module.exports = CompanyWriter;