/**
 * data/company-sql-writer.js
 * Company SQL Writer (Native Implementation)
 * * @version 1.0.0
 * * @date 2026-02-05
 * * @description
 * * 1. [Phase 7] Write Authority Migration (SQL Only).
 * * 2. [Strict] No RowIndex, No UUID generation (ID provided by Service).
 * * 3. [Schema] Matches Supabase schema strictly.
 */

const { supabase } = require('../config/supabase');

class CompanySqlWriter {

    constructor() {
        this.tableName = 'companies';
    }

    /**
     * 建立新公司
     * @param {Object} companyData 完整公司資料 (含 companyId)
     * @param {string} creator 建立者
     * @returns {Object} Result object
     */
    async createCompany(companyData, creator) {
        if (!companyData.companyId) {
            throw new Error('[CompanySqlWriter] companyId is required for creation.');
        }

        const now = new Date().toISOString();

        // Map DTO to SQL Columns (Snake Case)
        const payload = {
            company_id: companyData.companyId,
            company_name: companyData.companyName,
            phone: companyData.phone || '',
            address: companyData.address || '',
            city: companyData.county || '', // Mapping: county -> city
            description: companyData.introduction || '', // Mapping: introduction -> description
            
            // Business Fields
            company_type: companyData.companyType || '',
            customer_stage: companyData.customerStage || 'New',
            interaction_rating: companyData.engagementRating || 'C', // Mapping: engagementRating -> interactionRating

            // Audit
            created_by: creator,
            updated_by: creator,
            created_time: now,
            updated_time: now
        };

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                data: {
                    companyId: data.company_id,
                    companyName: data.company_name
                }
            };
        } catch (error) {
            console.error('[CompanySqlWriter] Create Error:', error);
            throw error;
        }
    }

    /**
     * 更新公司
     * @param {string} companyId 公司 ID
     * @param {Object} updateData 更新資料
     * @param {string} modifier 修改者
     */
    async updateCompany(companyId, updateData, modifier) {
        if (!companyId) throw new Error('[CompanySqlWriter] companyId is required for update.');

        const now = new Date().toISOString();
        const payload = {
            updated_by: modifier,
            updated_time: now
        };

        // Map updates (Only include fields that are present)
        if (updateData.companyName !== undefined) payload.company_name = updateData.companyName;
        if (updateData.phone !== undefined) payload.phone = updateData.phone;
        if (updateData.address !== undefined) payload.address = updateData.address;
        if (updateData.county !== undefined) payload.city = updateData.county;
        if (updateData.introduction !== undefined) payload.description = updateData.introduction;
        
        // Business Fields
        if (updateData.companyType !== undefined) payload.company_type = updateData.companyType;
        if (updateData.customerStage !== undefined) payload.customer_stage = updateData.customerStage;
        if (updateData.engagementRating !== undefined) payload.interaction_rating = updateData.engagementRating;

        try {
            const { error } = await supabase
                .from(this.tableName)
                .update(payload)
                .eq('company_id', companyId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('[CompanySqlWriter] Update Error:', error);
            throw error;
        }
    }

    /**
     * 刪除公司
     * @param {string} companyId 公司 ID
     */
    async deleteCompany(companyId) {
        if (!companyId) throw new Error('[CompanySqlWriter] companyId is required for deletion.');

        try {
            const { error } = await supabase
                .from(this.tableName)
                .delete()
                .eq('company_id', companyId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('[CompanySqlWriter] Delete Error:', error);
            throw error;
        }
    }
}

module.exports = CompanySqlWriter;