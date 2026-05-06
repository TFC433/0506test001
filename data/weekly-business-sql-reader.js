/**
 * data/weekly-business-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: weekly_business_entries
 * - Schema: Strict adherence to provided schema list
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.0.0
 * - Date: 2026-01-29
 */

const { supabase } = require('../config/supabase');

class WeeklyBusinessSqlReader {

    constructor() {
        this.tableName = 'weekly_business_entries';
    }

    /**
     * Get a single weekly business entry by ID
     * @param {string} recordId 
     * @returns {Promise<Object|null>} Weekly Business DTO or null
     */
    async getWeeklyBusinessById(recordId) {
        if (!recordId) throw new Error('WeeklyBusinessSqlReader: recordId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('record_id', recordId)
                .single();

            // Ignore "Row not found" (PGRST116), throw strict on others
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[WeeklyBusinessSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;

            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[WeeklyBusinessSqlReader] getWeeklyBusinessById Error:', error);
            throw error;
        }
    }

    /**
     * Get all weekly business entries
     * @returns {Promise<Array<Object>>} Array of Weekly Business DTOs
     */
    async getWeeklyBusinessEntries() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) {
                throw new Error(`[WeeklyBusinessSqlReader] DB Error: ${error.message}`);
            }

            // Map all rows strictly
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[WeeklyBusinessSqlReader] getWeeklyBusinessEntries Error:', error);
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
            recordId: row.record_id,

            // Scheduling
            entryDate: row.entry_date,
            weekId: row.week_id,

            // Content
            category: row.category,
            topic: row.topic,
            participants: row.participants,
            summaryContent: row.summary_content,
            todoItems: row.todo_items,

            // Metadata / Audit
            createdTime: row.created_time,
            updatedTime: row.updated_time,
            createdBy: row.created_by
        };
    }
}

module.exports = WeeklyBusinessSqlReader;