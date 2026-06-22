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

const USER_SESSION_COLUMNS = [
    'session_id',
    'username',
    'display_name',
    'role',
    'login_time',
    'logout_time',
    'last_seen_at',
    'logout_reason',
    'duration_seconds',
    'ip_address',
    'user_agent',
    'created_at',
    'updated_at'
].join(', ');

const USER_SESSION_TIMEOUT_HOURS = 8;

class AuditLogSqlReader {
    constructor() {
        this.tableName = 'system_audit_logs';
        this.userSessionsTableName = 'user_sessions';
    }

    async getAuditLogs(filters = {}) {
        try {
            const page = this._normalizePositiveInt(filters.page, 1);
            const limit = Math.min(this._normalizePositiveInt(filters.limit, 50), 300);
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

    async getUserSessions(filters = {}) {
        try {
            const page = this._normalizePositiveInt(filters.page, 1);
            const limit = Math.min(this._normalizePositiveInt(filters.limit, 50), 300);
            const periodDays = this._normalizePositiveInt(filters.periodDays || filters.period_days, 30);
            const now = new Date();
            const fromDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error, count } = await supabase
                .from(this.userSessionsTableName)
                .select(USER_SESSION_COLUMNS, { count: 'exact' })
                .gte('login_time', fromDate.toISOString())
                .order('login_time', { ascending: false })
                .range(from, to);

            if (error) throw new Error(`[AuditLogSqlReader] User session DB Error: ${error.message}`);

            return {
                data: (data || []).map(row => this._mapUserSessionRowToDto(row, now)),
                totalItems: count || 0,
                page,
                limit,
                period: {
                    days: periodDays,
                    from: fromDate.toISOString(),
                    to: now.toISOString()
                }
            };
        } catch (error) {
            console.error('[AuditLogSqlReader] getUserSessions Error:', error);
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

    _mapUserSessionRowToDto(row, now = new Date()) {
        const status = this._inferUserSessionStatus(row, now);

        return {
            sessionId: row.session_id,
            username: row.username,
            displayName: row.display_name,
            role: row.role,
            loginTime: row.login_time,
            logoutTime: row.logout_time,
            lastSeenAt: row.last_seen_at,
            logoutReason: row.logout_reason,
            durationSeconds: row.duration_seconds,
            status: status.value,
            statusLabel: status.label,
            ipAddress: row.ip_address,
            userAgent: row.user_agent
        };
    }

    _inferUserSessionStatus(row, now = new Date()) {
        if (row.logout_time) {
            return { value: 'logged_out', label: '\u5df2\u767b\u51fa' };
        }

        const lastSeenAt = row.last_seen_at ? new Date(row.last_seen_at) : null;
        const lastSeenMs = lastSeenAt ? lastSeenAt.getTime() : NaN;
        const nowMs = now.getTime();

        if (!Number.isFinite(lastSeenMs) || !Number.isFinite(nowMs)) {
            return { value: 'unknown', label: '\u672a\u77e5' };
        }

        const timeoutMs = USER_SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;
        if (nowMs - lastSeenMs <= timeoutMs) {
            return { value: 'active', label: '\u9032\u884c\u4e2d' };
        }

        return { value: 'timeout', label: '\u903e\u6642 / \u672a\u6b63\u5e38\u767b\u51fa' };
    }
}

module.exports = AuditLogSqlReader;
