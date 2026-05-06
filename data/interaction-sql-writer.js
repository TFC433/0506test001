/*
 * FILE: data/interaction-sql-writer.js
 * VERSION: 7.0.2
 * DATE: 2026-03-18
 * CHANGELOG:
 * - [PATCH] SQL interaction writer is authoritative for interaction persistence.
 * - [PATCH] Added support for eventType as an alias of interactionType to bridge legacy payloads.
 * - [PHASE 7] Migrate Interaction Write Authority to SQL.
 */

const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

class InteractionSqlWriter {
    /**
     * Maps JS Object to Strict DB Schema
     * @param {Object} data 
     * @returns {Object} dbData
     */
    _mapToDb(data) {
        // STRICT SCHEMA MAPPING
        // Forbidden: subject, interaction_date, contact_id, updated_at, created_at, rowIndex
        return {
            interaction_id: data.interactionId,
            opportunity_id: data.opportunityId || null,
            company_id: data.companyId || null,
            interaction_time: data.interactionTime || null,
            interaction_type: data.interactionType || data.eventType || null,
            event_title: data.eventTitle || null,
            content_summary: data.contentSummary || null,
            participants: data.participants || null,
            next_action: data.nextAction || null,
            attachment_link: data.attachmentLink || null,
            calendar_event_id: data.calendarEventId || null,
            recorder: data.recorder || null
        };
    }

    /**
     * Create new interaction
     * @param {Object} data 
     * @param {Object} user 
     * @returns {Promise<string>} newId
     */
    async createInteraction(data, user) {
        try {
            const interactionId = data.interactionId || uuidv4();
            const dbData = this._mapToDb({ ...data, interactionId });
            
            // Set created_time only on create
            dbData.created_time = new Date().toISOString();

            const { error } = await supabase
                .from('interactions')
                .insert([dbData]);

            if (error) throw error;
            
            console.log(`[InteractionSqlWriter] Created interaction ${interactionId}`);
            return interactionId;
        } catch (error) {
            console.error('[InteractionSqlWriter] createInteraction Error:', error);
            throw error;
        }
    }

    /**
     * Update existing interaction
     * @param {string} id 
     * @param {Object} data 
     * @param {Object} user 
     */
    async updateInteraction(id, data, user) {
        try {
            // Ensure ID is consistent
            const dbData = this._mapToDb({ ...data, interactionId: id });
            
            // Remove immutable fields for update
            delete dbData.created_time; 
            delete dbData.interaction_id; // PK should not be in update body if used in eq()

            const { error } = await supabase
                .from('interactions')
                .update(dbData)
                .eq('interaction_id', id);

            if (error) throw error;

            console.log(`[InteractionSqlWriter] Updated interaction ${id}`);
            return { success: true };
        } catch (error) {
            console.error('[InteractionSqlWriter] updateInteraction Error:', error);
            throw error;
        }
    }

    /**
     * Delete interaction
     * @param {string} id 
     * @param {Object} user 
     */
    async deleteInteraction(id, user) {
        try {
            const { error } = await supabase
                .from('interactions')
                .delete()
                .eq('interaction_id', id);

            if (error) throw error;

            console.log(`[InteractionSqlWriter] Deleted interaction ${id}`);
            return { success: true };
        } catch (error) {
            console.error('[InteractionSqlWriter] deleteInteraction Error:', error);
            throw error;
        }
    }
}

module.exports = InteractionSqlWriter;