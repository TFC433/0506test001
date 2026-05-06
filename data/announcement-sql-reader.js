/**
 * data/announcement-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: announcements
 * - Schema: Strict adherence to provided schema list
 * - Constraints: No rowIndex, No guessing, No update/delete
 * - Version: 1.0.0
 * - Date: 2026-01-29
 */

const { supabase } = require('../config/supabase');

class AnnouncementSqlReader {

    constructor() {
        this.tableName = 'announcements';
    }

    /**
     * Get a single announcement by ID
     * @param {string} id 
     * @returns {Promise<Object|null>} Announcement DTO or null
     */
    async getAnnouncementById(id) {
        if (!id) throw new Error('AnnouncementSqlReader: id is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .single();

            // Ignore "Row not found" (PGRST116), throw strict on others
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`[AnnouncementSqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;

            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[AnnouncementSqlReader] getAnnouncementById Error:', error);
            throw error;
        }
    }

    /**
     * Get all announcements
     * @returns {Promise<Array<Object>>} Array of Announcement DTOs
     */
    async getAnnouncements() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*');

            if (error) {
                throw new Error(`[AnnouncementSqlReader] DB Error: ${error.message}`);
            }

            // Map all rows strictly
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[AnnouncementSqlReader] getAnnouncements Error:', error);
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
            id: row.id,

            // Content
            title: row.title,
            content: row.content,
            
            // Metadata
            creator: row.creator,
            status: row.status,
            isPinned: row.is_pinned,

            // Timestamps
            createTime: row.create_time,
            lastUpdateTime: row.last_update_time
        };
    }
}

module.exports = AnnouncementSqlReader;