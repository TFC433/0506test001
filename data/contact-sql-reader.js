/**
 * data/contact-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: contacts
 * - Schema: Strict adherence to provided JSON schema
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.6.1 (Phase 8.2 Safe Delete Validation)
 * - Date: 2026-03-13
 * - Changelog: 
 * - Added checkContactHasLinks to support conditional delete validation.
 * - Removed Supabase relational join in getContactsByOpportunityId to fix schema cache crash.
 * - Implemented strict 2-step application-level join logic.
 * - Added getContactList adapter to abstract legacy method requirements.
 * - Added getRecentContactsFeed to eliminate full table fetch during dashboard render.
 */

const { supabase } = require('../config/supabase');

class ContactSqlReader {

    constructor() {
        this.tableName = 'contacts';
    }

    /**
     * [Phase 8.2 Safe Delete Validation]
     * Check if a contact is actively linked to any opportunity.
     * @param {string} contactId 
     * @returns {Promise<boolean>} True if relations exist, false otherwise.
     */
    async checkContactHasLinks(contactId) {
        if (!contactId) throw new Error('ContactSqlReader: contactId is required');

        try {
            const { data, error } = await supabase
                .from('opportunity_contact_links')
                .select('link_id')
                .eq('contact_id', contactId)
                .eq('status', 'active')
                .limit(1);

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            return data && data.length > 0;
        } catch (error) {
            console.error('[ContactSqlReader] checkContactHasLinks Error:', error);
            throw error;
        }
    }

    /**
     * [Performance Fix] 
     * Get recent contacts limited by exact number. Used strictly to bypass 
     * full table memory allocation in DashboardService._prepareRecentActivity.
     * @param {number} limit 
     * @returns {Promise<Array<Object>>} Array of Contact DTOs
     */
    async getRecentContactsFeed(limit = 5) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order('created_time', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getRecentContactsFeed Error:', error);
            throw error;
        }
    }

    /**
     * [Compatibility Adapter]
     * Exposes getContactList to safely satisfy legacy CORE reader dependencies
     * without modifying service constructor signatures.
     * @returns {Promise<Array<Object>>}
     */
    async getContactList() {
        return this.getContacts();
    }

    /**
     * Get contact statistics (Total and This Month)
     * Phase 1 SQL Aggregation: Utilizes Supabase exact count avoiding row transmission.
     * @param {Date} startOfMonth 
     * @returns {Promise<{total: number, month: number}>}
     */
    async getContactStats(startOfMonth) {
        if (!startOfMonth) throw new Error('ContactSqlReader: startOfMonth is required');

        try {
            const startIso = startOfMonth.toISOString();

            const [totalRes, monthRes] = await Promise.all([
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }),
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_time', startIso)
            ]);

            if (totalRes.error) throw new Error(`[ContactSqlReader] DB Error (total): ${totalRes.error.message}`);
            if (monthRes.error) throw new Error(`[ContactSqlReader] DB Error (month): ${monthRes.error.message}`);

            return {
                total: totalRes.count || 0,
                month: monthRes.count || 0
            };
        } catch (error) {
            console.error('[ContactSqlReader] getContactStats Error:', error);
            throw error;
        }
    }

    /**
     * Get a single contact by ID
     * @param {string} contactId 
     * @returns {Promise<Object|null>} Contact DTO or null
     */
    async getContactById(contactId) {
        if (!contactId) throw new Error('ContactSqlReader: contactId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('contact_id', contactId)
                .single();

            // Ignore "Row not found" (PGRST116), throw strict on others
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;

            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[ContactSqlReader] getContactById Error:', error);
            throw error;
        }
    }

    /**
     * Get contacts by company ID
     * @param {string} companyId 
     * @returns {Promise<Array<Object>>} Array of Contact DTOs
     */
    async getContactsByCompanyId(companyId) {
        if (!companyId) throw new Error('ContactSqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId);

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getContactsByCompanyId Error:', error);
            throw error;
        }
    }

    /**
     * Get contacts linked to a specific opportunity
     * Performs a STRICT 2-Step Application Level Join to bypass schema cache errors.
     * @param {string} opportunityId 
     * @returns {Promise<Array<Object>>} Array of Contact DTOs with linkId attached
     */
    async getContactsByOpportunityId(opportunityId) {
        if (!opportunityId) throw new Error('ContactSqlReader: opportunityId is required');

        try {
            // STEP A: Query opportunity_contact_links only
            const { data: linkData, error: linkError } = await supabase
                .from('opportunity_contact_links')
                .select('link_id, contact_id, status')
                .eq('opportunity_id', opportunityId)
                .eq('status', 'active');

            if (linkError) {
                throw new Error(`[ContactSqlReader] DB Error (Links): ${linkError.message}`);
            }

            // STEP B: Collect contact_ids
            if (!linkData || linkData.length === 0) {
                return [];
            }

            const contactIds = linkData.map(link => link.contact_id).filter(Boolean);
            if (contactIds.length === 0) {
                return [];
            }

            // STEP C: Query contacts table directly
            const { data: contactsData, error: contactsError } = await supabase
                .from(this.tableName)
                .select('*')
                .in('contact_id', contactIds);

            if (contactsError) {
                throw new Error(`[ContactSqlReader] DB Error (Contacts): ${contactsError.message}`);
            }

            if (!contactsData || contactsData.length === 0) {
                return [];
            }

            // STEP D & E: Map contacts via _mapRowToDto and merge link_id back on
            const contactIdToLinkIdMap = new Map();
            linkData.forEach(link => {
                contactIdToLinkIdMap.set(link.contact_id, link.link_id);
            });

            return contactsData.map(row => {
                const dto = this._mapRowToDto(row);
                // Attach linkId dynamically for UI consumption
                dto.linkId = contactIdToLinkIdMap.get(row.contact_id);
                return dto;
            });

        } catch (error) {
            console.error('[ContactSqlReader] getContactsByOpportunityId Error:', error);
            throw error;
        }
    }

    /**
     * Get all contacts
     * @returns {Promise<Array<Object>>} Array of Contact DTOs
     */
    async getContacts() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            // Map all rows strictly
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getContacts Error:', error);
            throw error;
        }
    }

    /**
     * Maps Raw SQL Row to DTO
     * Strict adherence to provided schema.
     * snake_case -> camelCase
     */
    _mapRowToDto(row) {
        if (!row) return null;

        return {
            // Identity
            contactId: row.contact_id,
            sourceId: row.source_id,

            // Basic Info
            name: row.name,
            companyId: row.company_id,
            department: row.department,
            jobTitle: row.job_title,

            // Contact Info
            mobile: row.mobile,
            phone: row.phone,
            email: row.email,

            // Metadata / Audit
            createdTime: row.created_time,
            updatedTime: row.updated_time,
            createdBy: row.created_by,
            updatedBy: row.updated_by
        };
    }
}

module.exports = ContactSqlReader;