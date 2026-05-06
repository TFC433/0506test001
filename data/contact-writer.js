/**
 * data/contact-writer.js
 * 聯絡人資料寫入器
 * @version 7.2.0 (Phase 8.3 Exhibition Auto-Tag Support)
 * @date 2026-03-21
 * @description 
 * [SQL-Ready Refactor]
 * 1. 嚴格禁止呼叫 values.get (No Read)。
 * 2. 僅提供基於 rowIndex 的 Pure Write 方法。
 * 3. 使用 batchUpdate 實現精確的欄位更新。
 * 4. [Feature] 支援 deletePotentialContactRow 實現物理列刪除。
 * * Changelog:
 * - [V7.2.0] Safely appended pushUpdate checks for repurposed EXHIBITION_NAME and IS_EXHIBITION 
 * within writePotentialContactRow. Core column logic strictly unmodified.
 */
const BaseWriter = require('./base-writer');

class ContactWriter extends BaseWriter {
    /**
     * @param {Object} sheets - Google Sheets API Client
     * @param {string} spreadsheetId - 目標 Spreadsheet ID
     * @param {Object} contactReader - 用於清除快取 (Optional)
     */
    constructor(sheets, spreadsheetId, contactReader) {
        super(sheets, spreadsheetId);
        this.contactReader = contactReader;
        
        this.SHEET_OFFICIAL = this.config.SHEETS.CONTACT_LIST || 'Contact_List';
        this.SHEET_POTENTIAL = this.config.SHEETS.CONTACTS || 'Raw_Data'; 
    }

    /**
     * 建立新聯絡人 (正式) - Append Only
     */
    async createContact(contactData) {
        try {
            const newRow = [
                contactData.id || contactData.contactId, 
                contactData.sourceId || 'MANUAL',
                contactData.name,
                contactData.company || contactData.companyId,
                contactData.department || '', 
                contactData.jobTitle || contactData.position || '',
                contactData.phone || '', 
                contactData.tel || '', 
                contactData.email || '',
                new Date().toISOString(),
                new Date().toISOString(),
                contactData.creator || 'System',
                contactData.modifier || 'System'
            ];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.targetSpreadsheetId,
                range: this.SHEET_OFFICIAL,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] }
            });

            console.log(`✅ [ContactWriter] Created contact: ${contactData.name}`);
            if (this.contactReader) this.contactReader.invalidateCache('contactList');
            return contactData.id;

        } catch (error) {
            console.error('❌ [ContactWriter] Create Failed:', error);
            throw error;
        }
    }

    /**
     * [Pure Write] 更新潛在客戶
     * 接收完整/部分資料，使用 batchUpdate 寫入指定欄位。
     * @param {number} rowIndex 
     * @param {Object} data - 包含要更新的欄位 (已由 Service 處理完畢)
     */
    async writePotentialContactRow(rowIndex, data) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}`);
        }

        const F = this.config.CONTACT_FIELDS;
        const updates = [];
        
        // Helper: Push update if field exists
        // Strictly Unmodified core logic: respects 0-25 indexing constraint securely.
        const pushUpdate = (colIndex, val) => {
            if (val !== undefined) {
                const colLetter = String.fromCharCode(65 + colIndex);
                updates.push({
                    range: `${this.SHEET_POTENTIAL}!${colLetter}${rowIndex}`,
                    values: [[val]]
                });
            }
        };

        pushUpdate(F.NAME, data.name);
        pushUpdate(F.COMPANY, data.company);
        pushUpdate(F.POSITION, data.position);
        pushUpdate(F.MOBILE, data.mobile);
        pushUpdate(F.EMAIL, data.email);
        
        if (F.NOTES !== undefined) {
            pushUpdate(F.NOTES, data.notes);
        }

        // [Fallback Auto-Tag] Add non-breaking write support for repurposed columns
        if (F.EXHIBITION_NAME !== undefined) {
            pushUpdate(F.EXHIBITION_NAME, data.exhibition_name);
        }

        if (F.IS_EXHIBITION !== undefined) {
            pushUpdate(F.IS_EXHIBITION, data.is_exhibition);
        }

        if (updates.length > 0) {
             await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }
        
        console.log(`✅ [ContactWriter] Wrote potential contact row ${rowIndex}`);
        return true;
    }

    /**
     * [Pure Write] 刪除潛在客戶 (物理刪除 Row)
     * 利用 BaseWriter 提供的 _deleteRow 進行整列刪除
     * @param {number} rowIndex
     */
    async deletePotentialContactRow(rowIndex) {
        const parsedRow = parseInt(rowIndex, 10);
        
        if (isNaN(parsedRow) || parsedRow <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}，禁止刪除標題列或無效列`);
        }

        console.log(`🗑️ [ContactWriter] Physically deleting RAW contact at Row ${parsedRow}`);
        
        // Calls the _deleteRow helper inherited from BaseWriter
        await this._deleteRow(this.SHEET_POTENTIAL, parsedRow, this.contactReader);
        
        return true;
    }

    /**
     * [Pure Write] 更新正式聯絡人
     * 接收 rowIndex，完全不進行 Read 或 Lookup。
     * @param {number} rowIndex - 由 Service 查詢後提供
     * @param {Object} data 
     * @param {string} modifier 
     */
    async updateContactRow(rowIndex, data, modifier) {
        if (isNaN(parseInt(rowIndex)) || rowIndex <= 1) {
            throw new Error(`無效的 rowIndex: ${rowIndex}`);
        }

        console.log(`📝 [ContactWriter] Update Contact Row ${rowIndex} by ${modifier}`);
        
        const updates = [];
        // 欄位映射 (Hardcoded for Official List structure A-M)
        // A:ID, B:Source, C:Name, D:CompanyID, E:Dept, F:Title, G:Mobile, H:Phone, I:Email, J:Created, K:Updated, L:Creator, M:Modifier
        
        if (data.name !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!C${rowIndex}`, values: [[data.name]] });
        if (data.company !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!D${rowIndex}`, values: [[data.company]] }); // Assuming Service passes ID if changed
        if (data.department !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!E${rowIndex}`, values: [[data.department]] });
        if (data.jobTitle !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!F${rowIndex}`, values: [[data.jobTitle]] });
        if (data.phone !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!G${rowIndex}`, values: [[data.phone]] }); // Mobile
        if (data.tel !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!H${rowIndex}`, values: [[data.tel]] });
        if (data.email !== undefined) updates.push({ range: `${this.SHEET_OFFICIAL}!I${rowIndex}`, values: [[data.email]] });
        
        // Update Metadata
        updates.push({ range: `${this.SHEET_OFFICIAL}!K${rowIndex}`, values: [[new Date().toISOString()]] });
        updates.push({ range: `${this.SHEET_OFFICIAL}!M${rowIndex}`, values: [[modifier]] });

        if (updates.length > 0) {
             await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.targetSpreadsheetId,
                resource: { valueInputOption: 'USER_ENTERED', data: updates }
            });
        }
        
        return true;
    }

    /**
     * @deprecated Removed in v7. Use updateContactRow instead.
     */
    async updateContact() {
        throw new Error('Deprecation: Use updateContactRow(rowIndex, data, modifier). Service must provide rowIndex.');
    }

    /**
     * @deprecated Removed in v7. Use writePotentialContactRow instead.
     */
    async updatePotentialContact() {
        throw new Error('Deprecation: Use writePotentialContactRow(rowIndex, data). Service must provide merged data.');
    }
}

module.exports = ContactWriter;