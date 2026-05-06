/**
 * data/company-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: companies
 * - Schema: Strict adherence to provided JSON schema
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.3.0 (Phase 11 - Company List DB-First lastActivity)
 * - Date: 2026-04-15
 * - Changelog: 
 * - [PHASE 11] Added View-first read path ('v_companies_summary') with graceful fallback to table.
 * - [PHASE 10] Migrated opportunityCount to backend.
 */

const { supabase } = require('../config/supabase');

class CompanySqlReader {

    constructor() {
        this.tableName = 'companies';
        this.viewName = 'v_companies_summary'; // Phase 11 DB-First Target
    }

    /**
     * [Compatibility Adapter]
     * Exposes getCompanyList to safely satisfy legacy CORE reader dependencies
     * without modifying service constructor signatures or internal logic.
     * Resolves TypeError: this.companyReader.getCompanyList is not a function
     * @returns {Promise<Array<Object>>}
     */
    async getCompanyList() {
        return this.getCompanies();
    }

    /**
     * Get a single company by ID
     * @param {string} companyId 
     * @returns {Promise<Object|null>} Company DTO or null
     */
    async getCompanyById(companyId) {
        if (!companyId) throw new Error('CompanySqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId)
                .single();

            // Ignore "Row not found" (PGRST116), throw strict on others
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[CompanySqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;

            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[CompanySqlReader] getCompanyById Error:', error);
            throw error;
        }
    }

    /**
     * Get all companies
     * @returns {Promise<Array<Object>>} Array of Company DTOs
     */
    async getCompanies() {
        try {
            // --- STAGE 1: DB-First View Path ---
            const viewRes = await supabase.from(this.viewName).select('*');
            if (!viewRes.error && viewRes.data) {
                return viewRes.data.map(row => this._mapRowToDto(row));
            }

            if (viewRes.error && viewRes.error.code !== '42P01') {
                 console.warn('[CompanySqlReader] View query failed with non-42P01 error:', viewRes.error);
            } else if (viewRes.error) {
                 console.warn('[CompanySqlReader] View v_companies_summary not found. Falling back to base table.');
            }

            // --- STAGE 2: Legacy Fallback ---
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) {
                throw new Error(`[CompanySqlReader] DB Error: ${error.message}`);
            }

            // Map all rows strictly
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[CompanySqlReader] getCompanies Error:', error);
            throw error;
        }
    }

    /**
     * [Performance Optimization]
     * Cross-domain projection: Fetches ONLY minimal activity timestamps from event_logs
     * for specifically requested company IDs. Eliminates massive memory hydration in Dashboard.
     * Avoids needing new RPC/views by utilizing standard PostgREST filtering and chunking.
     * @param {Array<string>} companyIds 
     * @returns {Promise<Array<Object>>} Array of raw DB rows: { company_id, created_time }
     */
    async getTargetCompanyEventActivities(companyIds) {
        if (!companyIds || companyIds.length === 0) return [];
        
        try {
            const chunkSize = 200; // Safe chunk size for PostgREST URL length limits
            let allData = [];

            for (let i = 0; i < companyIds.length; i += chunkSize) {
                const chunk = companyIds.slice(i, i + chunkSize);
                const { data, error } = await supabase
                    .from('event_logs')
                    .select('company_id, created_time')
                    .in('company_id', chunk);

                if (error) {
                    throw new Error(`[CompanySqlReader] DB Error fetching event activities: ${error.message}`);
                }
                if (data) {
                    allData = allData.concat(data);
                }
            }

            return allData;

        } catch (error) {
            console.error('[CompanySqlReader] getTargetCompanyEventActivities Error:', error);
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

        const dto = {
            // Identity
            companyId: row.company_id,
            companyName: row.company_name,

            // Contact Info
            phone: row.phone,
            address: row.address,
            city: row.city,

            // Business Info
            description: row.description,
            companyType: row.company_type,
            customerStage: row.customer_stage,
            interactionRating: row.interaction_rating,

            // Metadata / Audit
            createdTime: row.created_time,
            updatedTime: row.updated_time,
            createdBy: row.created_by,
            updatedBy: row.updated_by
        };

        // Phase 11: Safely map DB-First lastActivity if view is active
        if (row.last_activity) {
            dto.lastActivity = new Date(row.last_activity).toISOString();
            dto._hasNativeActivity = true;
        }

        return dto;
    }
}

module.exports = CompanySqlReader;