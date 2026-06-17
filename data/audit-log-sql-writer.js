const { supabase } = require('../config/supabase');

const SESSION_UPDATE_FIELDS = new Set([
    'logout_time',
    'last_seen_at',
    'logout_reason',
    'duration_seconds',
    'updated_at'
]);

class AuditLogSqlWriter {
    constructor() {
        this.userSessionsTable = 'user_sessions';
        this.systemAuditLogsTable = 'system_audit_logs';
    }

    async createUserSession(session) {
        const { data, error } = await supabase
            .from(this.userSessionsTable)
            .insert([this._compactRow(session)])
            .select('*')
            .single();

        if (error) {
            throw new Error(`[AuditLogSqlWriter] DB User Session Insert Error: ${error.message}`);
        }

        return data;
    }

    async updateUserSession(sessionId, updates) {
        if (!sessionId) throw new Error('[AuditLogSqlWriter] sessionId is required for update.');

        const boundedUpdates = this._pickSessionUpdates(updates);

        const { data, error } = await supabase
            .from(this.userSessionsTable)
            .update(boundedUpdates)
            .eq('session_id', sessionId)
            .select('*')
            .single();

        if (error) {
            throw new Error(`[AuditLogSqlWriter] DB User Session Update Error: ${error.message}`);
        }

        return data;
    }

    async touchUserSession(sessionId, timestamp) {
        const touchedAt = timestamp || new Date().toISOString();

        return this.updateUserSession(sessionId, {
            last_seen_at: touchedAt,
            updated_at: touchedAt
        });
    }

    async createAuditLog(entry) {
        const { data, error } = await supabase
            .from(this.systemAuditLogsTable)
            .insert([this._compactRow(entry)])
            .select('*')
            .single();

        if (error) {
            throw new Error(`[AuditLogSqlWriter] DB Audit Log Insert Error: ${error.message}`);
        }

        return data;
    }

    _pickSessionUpdates(updates) {
        const row = {};
        Object.keys(updates || {}).forEach(key => {
            if (SESSION_UPDATE_FIELDS.has(key) && updates[key] !== undefined) {
                row[key] = updates[key];
            }
        });

        if (!row.updated_at) {
            row.updated_at = new Date().toISOString();
        }

        return row;
    }

    _compactRow(payload) {
        const row = {};
        Object.keys(payload || {}).forEach(key => {
            if (payload[key] !== undefined) {
                row[key] = payload[key];
            }
        });
        return row;
    }
}

module.exports = AuditLogSqlWriter;

