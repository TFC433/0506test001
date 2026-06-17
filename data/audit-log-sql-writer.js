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
            .insert([this._mapAuditLogRow(entry)])
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

    _mapAuditLogRow(entry = {}) {
        return {
            actor_username: this._firstDefined(entry.actor_username, entry.actorUsername),
            actor_name: this._firstDefined(entry.actor_name, entry.actorName, null),
            actor_role: this._firstDefined(entry.actor_role, entry.actorRole, null),
            session_id: this._firstDefined(entry.session_id, entry.sessionId, null),
            module: entry.module,
            action: entry.action,
            target_type: this._firstDefined(entry.target_type, entry.targetType, null),
            target_id: this._firstDefined(entry.target_id, entry.targetId),
            target_label: this._firstDefined(entry.target_label, entry.targetLabel, null),
            event_title: this._firstDefined(entry.event_title, entry.eventTitle, null),
            event_summary: this._firstDefined(entry.event_summary, entry.eventSummary, null),
            event_category: this._firstDefined(entry.event_category, entry.eventCategory, null),
            business_event_type: this._firstDefined(entry.business_event_type, entry.businessEventType, null),
            changes: this._firstDefined(entry.changes, {}),
            metadata: this._firstDefined(entry.metadata, {}),
            ip_address: this._firstDefined(entry.ip_address, entry.ipAddress, null),
            user_agent: this._firstDefined(entry.user_agent, entry.userAgent, null),
            created_at: this._firstDefined(entry.created_at, entry.createdAt)
        };
    }

    _firstDefined(...values) {
        return values.find(value => value !== undefined);
    }
}

module.exports = AuditLogSqlWriter;
