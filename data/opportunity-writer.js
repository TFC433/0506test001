/**
 * data/opportunity-writer.js
 * 機會案件寫入器
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責處理與「機會案件」及「關聯」相關的寫入/更新操作。
 * 支援動態標題對映 (Dynamic Header Mapping)。
 * 實作 Strict Mode 依賴注入。
 */

const BaseWriter = require('./base-writer');

class OpportunityWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - [Required] 指定要寫入的 Sheet ID
     * @param {Object} opportunityReader - 用於清除快取的 Reader
     * @param {Object} contactReader - 用於清除關聯表快取的 Reader
     */
    constructor(sheets, spreadsheetId, opportunityReader, contactReader) {
        super(sheets, spreadsheetId);
        if (!opportunityReader || !contactReader) {
            throw new Error('OpportunityWriter 需要 OpportunityReader 和 ContactReader 的實例');
        }
        this.opportunityReader = opportunityReader;
        this.contactReader = contactReader;
    }

    /**
     * 內部輔助：取得標題對映表與當前列資料
     * ★★★ 關鍵修正：使用 this.targetSpreadsheetId ★★★
     */
    async _getHeaderMapAndRow(rowIndex) {
        const headerRange = `${this.config.SHEETS.OPPORTUNITIES}!A1:ZZ1`;
        const dataRange = `${this.config.SHEETS.OPPORTUNITIES}!A${rowIndex}:ZZ${rowIndex}`;
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const response = await this.sheets.spreadsheets.values.batchGet({
            spreadsheetId: this.targetSpreadsheetId, 
            ranges: [headerRange, dataRange]
        });

        const headerValues = response.data.valueRanges[0].values ? response.data.valueRanges[0].values[0] : [];
        const rowValues = response.data.valueRanges[1].values ? response.data.valueRanges[1].values[0] : [];

        if (headerValues.length === 0) throw new Error('找不到標題列');
        
        const map = {};
        headerValues.forEach((title, index) => {
            if(title) map[title.trim()] = index;
        });

        return { map, currentRow: rowValues, headerLength: headerValues.length };
    }

    /**
     * 建立新機會案件
     * (補齊原檔可能缺失的 create 方法，若原檔邏輯在 Service 層處理寫入，此處仍需提供底層支援)
     * 假設是 append 邏輯，但由於機會案件欄位複雜，通常建議先由 Service 整理好陣列或物件
     * 這裡實作一個基於動態標題的 append 方法
     */
    async createOpportunity(opportunityData, creator) {
        console.log(`💼 [OpportunityWriter] 建立新機會案件: ${opportunityData.opportunityName} by ${creator}`);
        
        // 1. 讀取標題列以確定欄位順序
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const headerRange = `${this.config.SHEETS.OPPORTUNITIES}!A1:ZZ1`;
        const headerResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: headerRange
        });
        const headers = headerResponse.data.values ? headerResponse.data.values[0] : [];
        if (headers.length === 0) throw new Error('找不到標題列，無法建立機會');

        const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;
        const now = new Date().toISOString();
        const newId = `OPP${Date.now()}`;

        // 2. 組裝資料列
        const newRow = headers.map(header => {
            const h = header.trim();
            if (h === FIELD_NAMES.ID) return newId;
            if (h === FIELD_NAMES.NAME) return opportunityData.opportunityName;
            if (h === FIELD_NAMES.CUSTOMER) return opportunityData.customerCompany;
            if (h === FIELD_NAMES.SALES_MODEL) return opportunityData.salesModel;
            // Channel 欄位可能對應 salesChannel 或 channelDetails
            if (h === FIELD_NAMES.CHANNEL) return opportunityData.salesChannel || opportunityData.channelDetails;
            if (h === FIELD_NAMES.CHANNEL_CONTACT) return opportunityData.channelContact;
            if (h === FIELD_NAMES.CONTACT) return opportunityData.mainContact;
            if (h === FIELD_NAMES.ASSIGNEE) return opportunityData.assignee;
            if (h === FIELD_NAMES.TYPE) return opportunityData.opportunityType;
            if (h === FIELD_NAMES.SOURCE) return opportunityData.opportunitySource;
            if (h === FIELD_NAMES.STAGE) return opportunityData.currentStage;
            if (h === FIELD_NAMES.CLOSE_DATE) return opportunityData.expectedCloseDate;
            if (h === FIELD_NAMES.PROBABILITY) return opportunityData.orderProbability;
            if (h === FIELD_NAMES.VALUE) return opportunityData.opportunityValue;
            if (h === FIELD_NAMES.VALUE_TYPE) return opportunityData.opportunityValueType;
            if (h === FIELD_NAMES.PRODUCT_SPEC) return opportunityData.potentialSpecification;
            if (h === FIELD_NAMES.DEVICE_SCALE) return opportunityData.deviceScale;
            if (h === FIELD_NAMES.NOTES) return opportunityData.notes;
            if (h === FIELD_NAMES.DRIVE_LINK) return opportunityData.driveFolderLink;
            if (h === FIELD_NAMES.STATUS) return '進行中';
            if (h === FIELD_NAMES.HISTORY) return opportunityData.stageHistory || JSON.stringify([]);
            if (h === FIELD_NAMES.CREATED_TIME) return now;
            if (h === FIELD_NAMES.LAST_UPDATE_TIME) return now;
            if (h === FIELD_NAMES.LAST_MODIFIER) return creator;
            if (h === FIELD_NAMES.PARENT_ID) return opportunityData.parentOpportunityId;
            
            return '';
        });

        // 3. 寫入
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.config.SHEETS.OPPORTUNITIES}!A:A`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        this.opportunityReader.invalidateCache('opportunities');
        return { success: true, id: newId };
    }

    async updateOpportunity(rowIndex, updateData, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`📝 [OpportunityWriter] 更新機會案件 (動態欄位) - Row: ${rowIndex} by ${modifier}`);
        
        const now = new Date().toISOString();
        const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;

        // 取得標題對映與當前資料
        const { map, currentRow, headerLength } = await this._getHeaderMapAndRow(rowIndex);
        if (currentRow.length === 0) throw new Error(`在 ${rowIndex} 列找不到資料`);

        while (currentRow.length < headerLength) {
            currentRow.push('');
        }

        const setValue = (fieldName, value) => {
            const index = map[fieldName];
            if (index !== undefined && index >= 0) {
                currentRow[index] = value;
            } else {
                console.warn(`⚠️ [OpportunityWriter] 警告: 找不到欄位標題 "${fieldName}"，更新略過。`);
            }
        };

        // 逐一更新欄位
        if(updateData.opportunityName !== undefined) setValue(FIELD_NAMES.NAME, updateData.opportunityName);
        if(updateData.customerCompany !== undefined) setValue(FIELD_NAMES.CUSTOMER, updateData.customerCompany);
        if(updateData.mainContact !== undefined) setValue(FIELD_NAMES.CONTACT, updateData.mainContact);
        
        if(updateData.assignee !== undefined) setValue(FIELD_NAMES.ASSIGNEE, updateData.assignee);
        if(updateData.opportunityType !== undefined) setValue(FIELD_NAMES.TYPE, updateData.opportunityType);
        if(updateData.opportunitySource !== undefined) setValue(FIELD_NAMES.SOURCE, updateData.opportunitySource);
        if(updateData.currentStage !== undefined) setValue(FIELD_NAMES.STAGE, updateData.currentStage);
        if(updateData.expectedCloseDate !== undefined) setValue(FIELD_NAMES.CLOSE_DATE, updateData.expectedCloseDate);
        if(updateData.opportunityValue !== undefined) setValue(FIELD_NAMES.VALUE, updateData.opportunityValue);
        if(updateData.currentStatus !== undefined) setValue(FIELD_NAMES.STATUS, updateData.currentStatus);
        if(updateData.notes !== undefined) setValue(FIELD_NAMES.NOTES, updateData.notes);
        
        if(updateData.stageHistory !== undefined) setValue(FIELD_NAMES.HISTORY, updateData.stageHistory);
        if(updateData.parentOpportunityId !== undefined) setValue(FIELD_NAMES.PARENT_ID, updateData.parentOpportunityId);
        
        if(updateData.orderProbability !== undefined) setValue(FIELD_NAMES.PROBABILITY, updateData.orderProbability);
        if(updateData.potentialSpecification !== undefined) setValue(FIELD_NAMES.PRODUCT_SPEC, updateData.potentialSpecification); 
        
        if(updateData.salesChannel !== undefined) setValue(FIELD_NAMES.CHANNEL, updateData.salesChannel);
        
        if(updateData.deviceScale !== undefined) setValue(FIELD_NAMES.DEVICE_SCALE, updateData.deviceScale);
        if(updateData.opportunityValueType !== undefined) setValue(FIELD_NAMES.VALUE_TYPE, updateData.opportunityValueType);

        if(updateData.salesModel !== undefined) setValue(FIELD_NAMES.SALES_MODEL, updateData.salesModel);
        if(updateData.channelDetails !== undefined) setValue(FIELD_NAMES.CHANNEL, updateData.channelDetails);
        if(updateData.channelContact !== undefined) setValue(FIELD_NAMES.CHANNEL_CONTACT, updateData.channelContact);

        if(updateData.createdTime !== undefined) setValue(FIELD_NAMES.CREATED_TIME, updateData.createdTime);

        setValue(FIELD_NAMES.LAST_UPDATE_TIME, now);
        setValue(FIELD_NAMES.LAST_MODIFIER, modifier);
        
        const range = `${this.config.SHEETS.OPPORTUNITIES}!A${rowIndex}:ZZ${rowIndex}`;
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.targetSpreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [currentRow] }
        });

        this.opportunityReader.invalidateCache('opportunities');
        console.log('✅ [OpportunityWriter] 機會案件更新成功');

        return { success: true, data: { rowIndex, ...updateData } };
    }

    async batchUpdateOpportunities(updates) {
        console.log('📝 [OpportunityWriter] 執行高效批量更新機會案件...');
        const FIELD_NAMES = this.config.OPPORTUNITY_FIELD_NAMES;
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const headerRange = `${this.config.SHEETS.OPPORTUNITIES}!A1:ZZ1`;
        const headerResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId, 
            range: headerRange
        });
        const headerValues = headerResponse.data.values ? headerResponse.data.values[0] : [];
        const map = {};
        headerValues.forEach((title, index) => { if(title) map[title.trim()] = index; });

        const now = new Date().toISOString();

        const data = await Promise.all(updates.map(async (update) => {
            const range = `${this.config.SHEETS.OPPORTUNITIES}!A${update.rowIndex}:ZZ${update.rowIndex}`;
            
            // ★★★ 使用 this.targetSpreadsheetId ★★★
            const response = await this.sheets.spreadsheets.values.get({ 
                spreadsheetId: this.targetSpreadsheetId, 
                range 
            });
            const currentRow = response.data.values ? response.data.values[0] : [];
            
            if (currentRow.length === 0) return null;
            while (currentRow.length < headerValues.length) currentRow.push('');

            const { data: updateData, modifier } = update;
            
            const setVal = (key, val) => {
                const idx = map[key];
                if (idx !== undefined && idx >= 0) currentRow[idx] = val;
            };

            if (updateData.currentStage !== undefined) setVal(FIELD_NAMES.STAGE, updateData.currentStage);
            if (updateData.stageHistory !== undefined) setVal(FIELD_NAMES.HISTORY, updateData.stageHistory);
            if (updateData.customerCompany !== undefined) setVal(FIELD_NAMES.CUSTOMER, updateData.customerCompany);

            setVal(FIELD_NAMES.LAST_UPDATE_TIME, now);
            setVal(FIELD_NAMES.LAST_MODIFIER, modifier);
            
            return { range, values: [currentRow] };
        }));

        const validData = data.filter(d => d !== null);
        if (validData.length === 0) {
            return { success: true, successCount: 0, failCount: updates.length };
        }

        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.targetSpreadsheetId,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: validData
            }
        });

        this.opportunityReader.invalidateCache('opportunities');
        console.log(`✅ [OpportunityWriter] 批量更新完成`);
        return { success: true, successCount: validData.length, failCount: updates.length - validData.length };
    }
    
    async deleteOpportunity(rowIndex, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) throw new Error(`無效的 rowIndex: ${rowIndex}`);
        console.log(`🗑️ [OpportunityWriter] 刪除機會案件 - Row: ${rowIndex} by ${modifier}`);
        
        // 呼叫 BaseWriter 的 _deleteRow
        await this._deleteRow(this.config.SHEETS.OPPORTUNITIES, rowIndex, this.opportunityReader);
        
        console.log('✅ [OpportunityWriter] 機會案件刪除成功');
        return { success: true };
    }

    async linkContactToOpportunity(opportunityId, contactId, modifier) {
        console.log(`🔗 [OpportunityWriter] 建立關聯: 機會 ${opportunityId} <-> 聯絡人 ${contactId}`);
        const now = new Date().toISOString();
        const linkId = `LNK${Date.now()}`;
        
        const rowData = [linkId, opportunityId, contactId, now, 'active', modifier];
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.targetSpreadsheetId,
            range: `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [rowData] }
        });
        
        this.contactReader.invalidateCache('oppContactLinks');
        return { success: true, linkId: linkId };
    }

    async deleteContactLink(opportunityId, contactId) {
        console.log(`🗑️ [OpportunityWriter] 永久刪除關聯: 機會 ${opportunityId} <-> 聯絡人 ${contactId}`);
        const range = `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`;
        
        const allLinks = await this.contactReader.getAllOppContactLinks();
        
        // ★★★ 使用 this.targetSpreadsheetId ★★★
        const linkRowsResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.targetSpreadsheetId,
            range: range,
        });

        const rows = linkRowsResponse.data.values || [];
        for (let i = 1; i < rows.length; i++) { 
            const rowOppId = rows[i][this.config.OPP_CONTACT_LINK_FIELDS.OPPORTUNITY_ID];
            const rowContactId = rows[i][this.config.OPP_CONTACT_LINK_FIELDS.CONTACT_ID];
            
            if (rowOppId === opportunityId && rowContactId === contactId) {
                const rowIndexToDelete = i + 1;
                // 呼叫 BaseWriter 的 _deleteRow
                await this._deleteRow(this.config.SHEETS.OPPORTUNITY_CONTACT_LINK, rowIndexToDelete, this.contactReader);
                return { success: true, rowIndex: rowIndexToDelete };
            }
        }
        throw new Error('找不到對應的關聯紀錄');
    }
}

module.exports = OpportunityWriter;