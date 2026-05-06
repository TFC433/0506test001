/**
 * data/interaction-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: interactions
 * - Schema: Strict adherence to provided schema list
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.2.0
 * - Date: 2026-04-15
 * - Changelog: 
 * - [PHASE 9-A] Added getInteractionActivities & getRecentInteractionsFeed for SQL-first dashboard optimization.
 * - [PATCH] SQL interaction reader is authoritative for reading interaction records.
 * - [PATCH] DTO now exposes both interactionType and eventType alias to support frontend locking logic.
 * - [PHASE 8.1] Added getInteractionsByCompanyId & getInteractionsByOpportunityIds for Phase 8.1
 */

const { supabase } = require('../config/supabase');

class InteractionSqlReader {

    constructor() {
        this.tableName = 'interactions';
    }

    /**
     * Get a single interaction by ID
     * @param {string} interactionId 
     * @returns {Promise<Object|null>} Interaction DTO or null
     */
    async getInteractionById(interactionId) {
        if (!interactionId) throw new Error('InteractionSqlReader: interactionId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('interaction_id', interactionId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;
            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionById Error:', error);
            throw error;
        }
    }

    /**
     * Get interactions by company ID
     * @param {string} companyId 
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractionsByCompanyId(companyId) {
        if (!companyId) throw new Error('InteractionSqlReader: companyId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('company_id', companyId);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionsByCompanyId Error:', error);
            throw error;
        }
    }

    /**
     * Get interactions by multiple opportunity IDs
     * @param {Array<string>} opportunityIds 
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractionsByOpportunityIds(opportunityIds) {
        if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .in('opportunity_id', opportunityIds);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionsByOpportunityIds Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 9-A] Get lightweight activity timestamps for MTU/SI and Dashboard tracking
     * Eliminates full-text hydration for metrics aggregation.
     */
    async getInteractionActivities() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('interaction_id, company_id, opportunity_id, interaction_time, created_time');

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);

            return data.map(row => ({
                interactionId: row.interaction_id,
                companyId: row.company_id,
                opportunityId: row.opportunity_id,
                interactionTime: row.interaction_time,
                createdTime: row.created_time
            }));
        } catch (error) {
            console.error('[InteractionSqlReader] getInteractionActivities Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 9-A] Get recent interactions for the dashboard feed
     * Pushes sort and limit directly to SQL.
     */
    async getRecentInteractionsFeed(limit = 5) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order('created_time', { ascending: false })
                .limit(limit);

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getRecentInteractionsFeed Error:', error);
            throw error;
        }
    }

    /**
     * Get all interactions
     * @returns {Promise<Array<Object>>} Array of Interaction DTOs
     */
    async getInteractions() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) throw new Error(`[InteractionSqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[InteractionSqlReader] getInteractions Error:', error);
            throw error;
        }
    }

    /**
     * Maps Raw SQL Row to DTO
     */
    _mapRowToDto(row) {
        if (!row) return null;

        return {
            interactionId: row.interaction_id,
            opportunityId: row.opportunity_id,
            companyId: row.company_id,
            interactionTime: row.interaction_time,
            interactionType: row.interaction_type,
            eventType: row.interaction_type,
            eventTitle: row.event_title,
            contentSummary: row.content_summary,
            participants: row.participants,
            nextAction: row.next_action,
            attachmentLink: row.attachment_link,
            calendarEventId: row.calendar_event_id,
            recorder: row.recorder,
            createdTime: row.created_time
        };
    }
}

module.exports = InteractionSqlReader;