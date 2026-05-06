// data/contact-sql-writer.js
/**
 * data/contact-sql-writer.js
 * [Phase 7] SQL Writer for Official Contacts
 * @version 8.0.0 (Phase 8: World Model Annotation)
 * @date 2026-02-10
 * @description 
 * - Handles Create/Update/Delete for 'contacts' table.
 * - STRICT SCHEMA: No invention of columns.
 * - Locked Schema: contact_id, source_id, name, company_id, department, job_title, mobile, phone, email, created/updated_time/by.
 * * WORLD MODEL (PERSISTENCE LAYER):
 * 1. Scope:
 * - This writer is EXCLUSIVE to the CORE Contact entity (SQL).
 * - It NEVER writes to Google Sheets.
 * - It NEVER receives 'rowIndex'.
 * * 2. Ownership:
 * - Contacts created here are independent of their RAW source (except for `source_id` audit trail).
 * - Contacts created here do NOT know about Opportunities (No opportunity_id column).
 */

const { supabase } = require('../config/supabase');

class ContactSqlWriter {
    constructor() {
        this.tableName = 'contacts';
    }

    /**
     * Create Contact (SQL Only)
     * @param {Object} data - Contact DTO
     * @param {string} user - Creator name
     * @returns {Promise<Object>} { success: true, id: string }
     */
    async createContact(data, user) {
        // [Contract] Generate ID if missing. Pattern: C + Timestamp
        const contactId = data.contactId || data.id || `C${Date.now()}`;
        const now = new Date().toISOString();

        console.log(`👤 [ContactSqlWriter] Creating contact: ${data.name || 'Unnamed'} (ID: ${contactId})`);

        // STRICT SCHEMA MAPPING
        const payload = {
            contact_id: contactId,
            source_id: data.sourceId || 'MANUAL', // Ref to RAW contact if applicable
            name: data.name,
            company_id: data.companyId || data.company || null,
            department: data.department || '',
            job_title: data.jobTitle || data.position || '',
            mobile: data.mobile || '',
            phone: data.phone || data.tel || '',
            email: data.email || '',
            created_by: user,
            updated_by: user,
            created_time: now,
            updated_time: now
        };

        const { error } = await supabase
            .from(this.tableName)
            .insert([payload]);

        if (error) {
            console.error('[ContactSqlWriter] Create Failed:', error);
            throw new Error(`[ContactSqlWriter] Create Error: ${error.message}`);
        }

        return { success: true, id: contactId };
    }

    /**
     * Update Contact (SQL Only)
     * @param {string} contactId 
     * @param {Object} data - Partial update DTO
     * @param {string} user - Modifier name
     */
    async updateContact(contactId, data, user) {
        console.log(`👤 [ContactSqlWriter] Updating contact ${contactId} by ${user}`);

        const now = new Date().toISOString();
        
        // Base payload
        const payload = {
            updated_time: now,
            updated_by: user
        };

        // Strict field mapping (CamelCase -> snake_case)
        if (data.name !== undefined) payload.name = data.name;
        
        // Company ID
        if (data.companyId !== undefined) payload.company_id = data.companyId;
        else if (data.company !== undefined) payload.company_id = data.company;
        
        if (data.department !== undefined) payload.department = data.department;
        
        // Job Title / Position
        if (data.jobTitle !== undefined) payload.job_title = data.jobTitle;
        else if (data.position !== undefined) payload.job_title = data.position;
        
        if (data.mobile !== undefined) payload.mobile = data.mobile;
        
        // Phone / Tel
        if (data.phone !== undefined) payload.phone = data.phone;
        else if (data.tel !== undefined) payload.phone = data.tel;
        
        if (data.email !== undefined) payload.email = data.email;

        // Execute Update
        const { error } = await supabase
            .from(this.tableName)
            .update(payload)
            .eq('contact_id', contactId);

        if (error) {
            console.error('[ContactSqlWriter] Update Failed:', error);
            throw new Error(`[ContactSqlWriter] Update Error: ${error.message}`);
        }

        return { success: true };
    }

    /**
     * Delete Contact (SQL Only)
     * @param {string} contactId 
     */
    async deleteContact(contactId) {
        console.log(`🗑️ [ContactSqlWriter] Deleting contact ${contactId}`);

        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('contact_id', contactId);

        if (error) {
            console.error('[ContactSqlWriter] Delete Failed:', error);
            throw new Error(`[ContactSqlWriter] Delete Error: ${error.message}`);
        }

        return { success: true };
    }
}

module.exports = ContactSqlWriter;