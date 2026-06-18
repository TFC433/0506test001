const { supabase } = require('../config/supabase');

const AUDIT_LOG_COLUMNS = [
    'audit_id',
    'actor_username',
    'actor_name',
    'actor_role',
    'module',
    'action',
    'target_type',
    'target_id',
    'target_label',
    'event_title',
    'event_summary',
    'event_category',
    'business_event_type',
    'changes',
    'metadata',
    'created_at'
].join(', ');

class AuditLogSqlReader {
    constructor() {
        this.tableName = 'system_audit_logs';
    }

    async getAuditLogs(filters = {}) {
        try {
            const page = this._normalizePositiveInt(filters.page, 1);
            const limit = Math.min(this._normalizePositiveInt(filters.limit, 50), 100);
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let query = supabase
                .from(this.tableName)
                .select(AUDIT_LOG_COLUMNS, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            query = this._applyExactFilter(query, 'module', filters.module);
            query = this._applyExactFilter(query, 'action', filters.action);
            query = this._applyExactFilter(query, 'target_type', filters.target_type);
            query = this._applyExactFilter(query, 'target_id', filters.target_id);
            query = this._applyExactFilter(query, 'actor_username', filters.actor_username);

            const businessEventTypes = this._normalizeCsv(filters.business_event_type);
            if (businessEventTypes.length === 1) {
                query = query.eq('business_event_type', businessEventTypes[0]);
            } else if (businessEventTypes.length > 1) {
                query = query.in('business_event_type', businessEventTypes);
            }

            if (this._isValidDate(filters.date_from)) {
                query = query.gte('created_at', filters.date_from);
            }

            if (this._isValidDate(filters.date_to)) {
                query = query.lte('created_at', filters.date_to);
            }

            const { data, error, count } = await query;

            if (error) throw new Error(`[AuditLogSqlReader] DB Error: ${error.message}`);

            return {
                data: (data || []).map(row => this._mapRowToDto(row)),
                totalItems: count || 0,
                page,
                limit
            };
        } catch (error) {
            console.error('[AuditLogSqlReader] getAuditLogs Error:', error);
            throw error;
        }
    }

    _applyExactFilter(query, column, value) {
        const normalizedValue = this._normalizeString(value);
        return normalizedValue ? query.eq(column, normalizedValue) : query;
    }

    _normalizePositiveInt(value, fallback) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    _normalizeString(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    _normalizeCsv(value) {
        return this._normalizeString(value)
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    _isValidDate(value) {
        if (!this._normalizeString(value)) return false;
        return !Number.isNaN(new Date(value).getTime());
    }

    _mapRowToDto(row) {
        return {
            auditId: row.audit_id,
            actorUsername: row.actor_username,
            actorName: row.actor_name,
            actorRole: row.actor_role,
            module: row.module,
            action: row.action,
            targetType: row.target_type,
            targetId: row.target_id,
            targetLabel: row.target_label,
            eventTitle: row.event_title,
            eventSummary: row.event_summary,
            eventCategory: row.event_category,
            businessEventType: row.business_event_type,
            changes: row.changes || {},
            metadata: row.metadata || {},
            createdAt: row.created_at
        };
    }
}

module.exports = AuditLogSqlReader;
