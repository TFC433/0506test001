/**
 * data/contact-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: contacts
 * - Schema: Strict adherence to provided JSON schema
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.8.2 (CORE Contact Company Grouped View Ordering)
 * - Date: 2026-05-21
 * - Changelog: 
 * - Switched CORE contact list reads to contacts_company_grouped_view with stable company-centric ordering.
 * - Hotfixed CORE list SQL search to include direct contact fields and safer company_id OR filters; added created_time ordering fallback for updated_time ties/null groups.
 * - Added SQL-native search, ordering, stable tie-breaker, range pagination, and exact count support for CORE contact list reads.
 * - Added notes DTO mapping and lazy reverse opportunity lookup by contactId.
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
        this.companyGroupedViewName = 'contacts_company_grouped_view';
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
     * Get opportunities linked to a specific contact.
     * Performs a STRICT 2-Step Application Level Join through opportunity_contact_links.
     * @param {string} contactId
     * @returns {Promise<Array<Object>>} Lightweight Opportunity DTOs
     */
    async getOpportunitiesByContactId(contactId) {
        if (!contactId) throw new Error('ContactSqlReader: contactId is required');

        try {
            const { data: linkData, error: linkError } = await supabase
                .from('opportunity_contact_links')
                .select('opportunity_id')
                .eq('contact_id', contactId)
                .eq('status', 'active');

            if (linkError) {
                throw new Error(`[ContactSqlReader] DB Error (Links): ${linkError.message}`);
            }

            if (!linkData || linkData.length === 0) {
                return [];
            }

            const opportunityIds = [...new Set(linkData.map(link => link.opportunity_id).filter(Boolean))];
            if (opportunityIds.length === 0) {
                return [];
            }

            const { data: opportunitiesData, error: opportunitiesError } = await supabase
                .from('opportunities')
                .select('opportunity_id, opportunity_name, customer_company, current_status, current_stage, opportunity_value, updated_time, created_time')
                .in('opportunity_id', opportunityIds);

            if (opportunitiesError) {
                throw new Error(`[ContactSqlReader] DB Error (Opportunities): ${opportunitiesError.message}`);
            }

            return (opportunitiesData || []).map(row => this._mapOpportunityRowToLightDto(row));

        } catch (error) {
            console.error('[ContactSqlReader] getOpportunitiesByContactId Error:', error);
            throw error;
        }
    }

    _getContactSortColumn(sortField = 'updatedTime') {
        const sortMap = {
            contactId: 'contact_id',
            name: 'name',
            companyId: 'company_id',
            position: 'job_title',
            jobTitle: 'job_title',
            mobile: 'mobile',
            phone: 'phone',
            email: 'email',
            createdTime: 'created_time',
            createTime: 'created_time',
            updatedTime: 'updated_time',
            lastUpdateTime: 'updated_time'
        };
        return sortMap[sortField] || 'updated_time';
    }

    _sanitizePostgrestSearchTerm(value) {
        return String(value || '')
            .trim()
            .replace(/[(),]/g, ' ')
            .replace(/\s+/g, ' ');
    }

    _sanitizePostgrestListValue(value) {
        return String(value || '').replace(/[(),]/g, '');
    }

    _buildContactSearchFilter(searchTerm, companyIds = []) {
        const normalizedTerm = this._sanitizePostgrestSearchTerm(searchTerm);
        const filters = [];

        if (normalizedTerm) {
            const pattern = `*${normalizedTerm}*`;
            filters.push(`name.ilike.${pattern}`);
            filters.push(`email.ilike.${pattern}`);
            filters.push(`phone.ilike.${pattern}`);
            filters.push(`mobile.ilike.${pattern}`);
        }

        const normalizedCompanyIds = [...new Set((companyIds || []).filter(Boolean))];
        if (normalizedCompanyIds.length > 0) {
            const idList = normalizedCompanyIds
                .map(id => this._sanitizePostgrestListValue(id))
                .filter(Boolean)
                .join(',');
            if (idList) {
                filters.push(`company_id.in.(${idList})`);
            }
        }

        return filters.join(',');
    }

    /**
     * Get contacts.
     * No-arg calls preserve the legacy full-array contract. Option calls can
     * push search/order/range/count into Supabase for list endpoints.
     * @param {Object} [options]
     * @returns {Promise<Array<Object>|{data: Array<Object>, total: number}>}
     */
    async getContacts(options = {}) {
        try {
            const {
                query = '',
                companyIds = [],
                sort = 'updatedTime',
                order = 'desc',
                page = null,
                limit = null,
                range = null,
                withCount = false
            } = options || {};

            const shouldReturnCount = Boolean(withCount);
            let dbQuery = supabase.from(this.companyGroupedViewName);
            dbQuery = shouldReturnCount
                ? dbQuery.select('*', { count: 'exact' })
                : dbQuery.select('*');

            const searchFilter = this._buildContactSearchFilter(query, companyIds);
            if (searchFilter) {
                dbQuery = dbQuery.or(searchFilter);
            }

            dbQuery = dbQuery
                .order('company_latest_update', { ascending: false, nullsFirst: false })
                .order('company_group_name', { ascending: true })
                .order('updated_time', { ascending: false, nullsFirst: false })
                .order('created_time', { ascending: false, nullsFirst: false })
                .order('contact_id', { ascending: true });

            if (range && Number.isInteger(range.from) && Number.isInteger(range.to)) {
                dbQuery = dbQuery.range(range.from, range.to);
            } else {
                const pageNumber = parseInt(page, 10);
                const pageSize = parseInt(limit, 10);
                if (Number.isInteger(pageNumber) && pageNumber > 0 && Number.isInteger(pageSize) && pageSize > 0) {
                    const from = (pageNumber - 1) * pageSize;
                    dbQuery = dbQuery.range(from, from + pageSize - 1);
                }
            }

            const { data, error, count } = await dbQuery;

            if (error) {
                throw new Error(`[ContactSqlReader] DB Error: ${error.message}`);
            }

            const mapped = (data || []).map(row => this._mapRowToDto(row));
            if (shouldReturnCount) {
                return {
                    data: mapped,
                    total: count || 0
                };
            }

            return mapped;

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
            notes: row.notes,

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

    _mapOpportunityRowToLightDto(row) {
        if (!row) return null;

        return {
            opportunityId: row.opportunity_id,
            opportunityName: row.opportunity_name,
            name: row.opportunity_name,
            customerCompany: row.customer_company,
            status: row.current_status,
            phase: row.current_stage,
            currentStatus: row.current_status,
            currentStage: row.current_stage,
            value: row.opportunity_value,
            opportunityValue: row.opportunity_value,
            updatedTime: row.updated_time,
            createTime: row.created_time,
            createdTime: row.created_time
        };
    }
}

module.exports = ContactSqlReader;
