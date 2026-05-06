/**
 * data/weekly-business-sql-writer.js
 * [Phase 7-2] SQL Writer for Weekly Business
 * Purpose: Handle Create/Update/Delete operations directly to SQL.
 */

const { supabase } = require('../config/supabase');

class WeeklyBusinessSqlWriter {
    constructor() {
        this.tableName = 'weekly_business_entries';
    }

    /**
     * Create a new entry in SQL
     */
    async createEntry(data, creator) {
        console.log(`📅 [WeeklySqlWriter] Creating entry in SQL: ${data.theme || 'Untitled'} by ${creator}`);

        const now = new Date().toISOString();
        const recordId = `WK${Date.now()}`;

        const dbPayload = {
            record_id: recordId,
            entry_date: data.date,
            week_id: data.weekId,
            category: data.category || '一般',
            topic: data.theme || '',           
            participants: data.participants || '',
            summary_content: data.summary || '', 
            todo_items: data.todo || '',         
            created_by: creator,
            created_time: now,
            updated_time: now
        };

        const { error } = await supabase
            .from(this.tableName)
            .insert([dbPayload]);

        if (error) {
            console.error('[WeeklySqlWriter] Create Failed:', error);
            throw new Error(`SQL Create Error: ${error.message}`);
        }

        return { success: true, id: recordId };
    }

    /**
     * Update an entry in SQL
     * [New] Phase 7-2
     */
    async updateEntry(recordId, data, modifier) {
        console.log(`📅 [WeeklySqlWriter] Updating entry ${recordId} in SQL by ${modifier}`);

        const now = new Date().toISOString();
        const dbPayload = {
            updated_time: now
        };

        // Map Service fields to SQL columns
        if (data.date !== undefined) dbPayload.entry_date = data.date;
        if (data.weekId !== undefined) dbPayload.week_id = data.weekId;
        if (data.category !== undefined) dbPayload.category = data.category;
        if (data.theme !== undefined) dbPayload.topic = data.theme;
        if (data.participants !== undefined) dbPayload.participants = data.participants;
        if (data.summary !== undefined) dbPayload.summary_content = data.summary;
        if (data.todo !== undefined) dbPayload.todo_items = data.todo;

        const { error } = await supabase
            .from(this.tableName)
            .update(dbPayload)
            .eq('record_id', recordId);

        if (error) {
            console.error('[WeeklySqlWriter] Update Failed:', error);
            throw new Error(`SQL Update Error: ${error.message}`);
        }

        return { success: true };
    }

    /**
     * Delete an entry in SQL
     * [New] Phase 7-2
     */
    async deleteEntry(recordId) {
        console.log(`🗑️ [WeeklySqlWriter] Deleting entry ${recordId} from SQL`);

        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('record_id', recordId);

        if (error) {
            console.error('[WeeklySqlWriter] Delete Failed:', error);
            throw new Error(`SQL Delete Error: ${error.message}`);
        }

        return { success: true };
    }
}

module.exports = WeeklyBusinessSqlWriter;