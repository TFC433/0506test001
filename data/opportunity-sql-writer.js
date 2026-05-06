// data/opportunity-sql-writer.js
/**
 * OpportunitySqlWriter
 * * @version 1.1.0 (Phase 7 - Contact Linking SQL)
 * @date 2026-02-06
 * @description 負責將機會案件寫入 Supabase 'opportunities' 資料表。
 * - [PATCH] Normalize empty date strings to null for PostgreSQL compatibility.
 * - [PATCH] Added missing mapping for drive_link in updateOpportunity.
 * - [FEAT] Added linkContact and unlinkContact methods for SQL-based linking.
 */

const { supabase } = require('../config/supabase');

class OpportunitySqlWriter {
    
    constructor() {
        this.tableName = 'opportunities';
    }

    /**
     * 建立新機會案件
     * @param {Object} data - 機會資料 DTO
     * @param {string} creator - 建立者名稱
     * @returns {Object} { success: true, id: string }
     */
    async createOpportunity(data, creator) {
        console.log(`💼 [OpportunitySqlWriter] Create: ${data.opportunityName} by ${creator}`);

        const now = new Date().toISOString();
        const newId = `OPP${Date.now()}`;

        // [Date Normalization]
        // PostgreSQL rejects "" for date types. Convert "" to null.
        const expectedCloseDate = (data.expectedCloseDate === "") ? null : data.expectedCloseDate;

        // Map DTO to DB Columns
        const dbPayload = {
            opportunity_id: newId,
            opportunity_name: data.opportunityName,
            customer_company: data.customerCompany,
            
            // Sales & Channel
            sales_model: data.salesModel,
            sales_channel: data.salesChannel || data.channelDetails, // Map fallback
            channel_contact: data.channelContact,
            
            // Contacts
            main_contact: data.mainContact,
            owner: data.assignee, // Map assignee -> owner
            
            // Classification
            opportunity_type: data.opportunityType,
            source: data.opportunitySource,
            
            // Status
            current_stage: data.currentStage,
            current_status: '進行中', // Default active
            
            // Metrics
            expected_close_date: expectedCloseDate,
            opportunity_value: data.opportunityValue,
            win_probability: data.orderProbability, // Map orderProbability -> win_probability
            
            // Details
            equipment_scale: data.deviceScale,
            product_details: data.potentialSpecification, // Map potentialSpecification -> product_details
            notes: data.notes,
            drive_link: data.driveFolderLink,
            
            // History
            stage_history: data.stageHistory ? data.stageHistory : JSON.stringify([]),
            
            // Metadata
            created_time: now,
            updated_time: now,
            updated_by: creator,
            
            // Hierarchy
            parent_opportunity_id: data.parentOpportunityId
        };

        const { error } = await supabase
            .from(this.tableName)
            .insert([dbPayload]);

        if (error) {
            console.error('[OpportunitySqlWriter] Create Error:', error);
            throw new Error(`DB Insert Error: ${error.message}`);
        }

        return { success: true, id: newId };
    }

    /**
     * 更新機會案件
     * @param {string} opportunityId
     * @param {Object} updateData
     * @param {string} modifier
     */
    async updateOpportunity(opportunityId, updateData, modifier) {
        console.log(`📝 [OpportunitySqlWriter] Update: ${opportunityId} by ${modifier}`);

        const now = new Date().toISOString();
        
        // Build Dynamic Payload
        const dbPayload = {
            updated_time: now,
            updated_by: modifier
        };

        // Map fields if present
        if (updateData.opportunityName !== undefined) dbPayload.opportunity_name = updateData.opportunityName;
        if (updateData.customerCompany !== undefined) dbPayload.customer_company = updateData.customerCompany;
        if (updateData.salesModel !== undefined) dbPayload.sales_model = updateData.salesModel;
        
        if (updateData.salesChannel !== undefined) dbPayload.sales_channel = updateData.salesChannel;
        else if (updateData.channelDetails !== undefined) dbPayload.sales_channel = updateData.channelDetails;

        if (updateData.channelContact !== undefined) dbPayload.channel_contact = updateData.channelContact;
        if (updateData.mainContact !== undefined) dbPayload.main_contact = updateData.mainContact;
        if (updateData.assignee !== undefined) dbPayload.owner = updateData.assignee;
        
        if (updateData.opportunityType !== undefined) dbPayload.opportunity_type = updateData.opportunityType;
        if (updateData.opportunitySource !== undefined) dbPayload.source = updateData.opportunitySource;
        
        if (updateData.currentStage !== undefined) dbPayload.current_stage = updateData.currentStage;
        if (updateData.currentStatus !== undefined) dbPayload.current_status = updateData.currentStatus;
        
        // [Date Normalization]
        if (updateData.expectedCloseDate !== undefined) {
            dbPayload.expected_close_date = (updateData.expectedCloseDate === "") ? null : updateData.expectedCloseDate;
        }

        if (updateData.opportunityValue !== undefined) dbPayload.opportunity_value = updateData.opportunityValue;
        if (updateData.orderProbability !== undefined) dbPayload.win_probability = updateData.orderProbability;
        
        if (updateData.deviceScale !== undefined) dbPayload.equipment_scale = updateData.deviceScale;
        if (updateData.potentialSpecification !== undefined) dbPayload.product_details = updateData.potentialSpecification;
        
        if (updateData.notes !== undefined) dbPayload.notes = updateData.notes;
        if (updateData.driveFolderLink !== undefined) dbPayload.drive_link = updateData.driveFolderLink;
        if (updateData.stageHistory !== undefined) dbPayload.stage_history = updateData.stageHistory;
        if (updateData.parentOpportunityId !== undefined) dbPayload.parent_opportunity_id = updateData.parentOpportunityId;

        const { error } = await supabase
            .from(this.tableName)
            .update(dbPayload)
            .eq('opportunity_id', opportunityId);

        if (error) {
            console.error('[OpportunitySqlWriter] Update Error:', error);
            throw new Error(`DB Update Error: ${error.message}`);
        }

        return { success: true, id: opportunityId };
    }

    /**
     * 刪除機會案件
     * @param {string} opportunityId 
     * @param {string} modifier 
     */
    async deleteOpportunity(opportunityId, modifier) {
        console.log(`🗑️ [OpportunitySqlWriter] Delete: ${opportunityId} by ${modifier}`);

        // SQL Hard Delete
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('opportunity_id', opportunityId);

        if (error) {
            console.error('[OpportunitySqlWriter] Delete Error:', error);
            throw new Error(`DB Delete Error: ${error.message}`);
        }

        return { success: true };
    }

    /**
     * 關聯聯絡人至機會 (SQL)
     * @param {string} opportunityId
     * @param {string} contactId
     * @param {string} modifier
     */
    async linkContact(opportunityId, contactId, modifier) {
        console.log(`🔗 [OpportunitySqlWriter] Link: ${opportunityId} <-> ${contactId}`);
        const now = new Date().toISOString();
        
        // Upsert to link table (assuming 'opportunity_contact_links')
        // Using upsert to handle re-linking smoothly
        const { error } = await supabase
            .from('opportunity_contact_links')
            .upsert({
                opportunity_id: opportunityId,
                contact_id: contactId,
                link_status: 'active',
                updated_time: now,
                updated_by: modifier
            }, { onConflict: 'opportunity_id, contact_id' });

        if (error) {
            console.error('[OpportunitySqlWriter] Link Error:', error);
            throw new Error(`Link Error: ${error.message}`);
        }
        return { success: true };
    }

    /**
     * 解除聯絡人關聯 (SQL)
     * @param {string} opportunityId
     * @param {string} contactId
     */
    async unlinkContact(opportunityId, contactId) {
         console.log(`🔗 [OpportunitySqlWriter] Unlink: ${opportunityId} <-> ${contactId}`);
         
         // Physical delete (Unlink)
         const { error } = await supabase
            .from('opportunity_contact_links')
            .delete()
            .eq('opportunity_id', opportunityId)
            .eq('contact_id', contactId);
            
         if (error) {
             console.error('[OpportunitySqlWriter] Unlink Error:', error);
             throw new Error(`Unlink Error: ${error.message}`);
         }
         return { success: true };
    }
}

module.exports = OpportunitySqlWriter;