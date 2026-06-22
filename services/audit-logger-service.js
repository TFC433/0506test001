const {
    sanitizeAuditPayload
} = require('../utils/audit-helpers');

class AuditLoggerService {
    constructor(auditLogSqlWriter, auditLogSqlReader = null) {
        this.auditLogSqlWriter = auditLogSqlWriter;
        this.auditLogSqlReader = auditLogSqlReader;
    }

    async startUserSession(user = {}, reqMetadata = {}) {
        const now = new Date().toISOString();

        return this.auditLogSqlWriter.createUserSession({
            username: user.username,
            display_name: user.displayName || user.display_name || user.name || null,
            role: user.role || null,
            login_time: user.loginTime || user.login_time || now,
            last_seen_at: user.lastSeenAt || user.last_seen_at || now,
            ip_address: reqMetadata.ipAddress || reqMetadata.ip_address || null,
            user_agent: reqMetadata.userAgent || reqMetadata.user_agent || null,
            created_at: now,
            updated_at: now
        });
    }

    async endUserSession(sessionId, options = {}) {
        const logoutTime = options.logoutTime || options.logout_time || new Date().toISOString();
        const durationSeconds = this._resolveDurationSeconds(logoutTime, options);

        return this.auditLogSqlWriter.updateUserSession(sessionId, {
            logout_time: logoutTime,
            last_seen_at: options.lastSeenAt || options.last_seen_at || logoutTime,
            logout_reason: options.logoutReason || options.logout_reason || null,
            duration_seconds: durationSeconds,
            updated_at: logoutTime
        });
    }

    async touchUserSession(sessionId, options = {}) {
        const timestamp = options.timestamp || options.lastSeenAt || options.last_seen_at || new Date().toISOString();
        return this.auditLogSqlWriter.touchUserSession(sessionId, timestamp);
    }

    async logMutation(entry = {}) {
        return this.auditLogSqlWriter.createAuditLog({
            actor_username: entry.actor_username || entry.actorUsername,
            actor_name: entry.actor_name || entry.actorName || null,
            actor_role: entry.actor_role || entry.actorRole || null,
            session_id: entry.session_id || entry.sessionId || null,
            module: entry.module,
            action: entry.action,
            target_type: entry.target_type || entry.targetType || null,
            target_id: entry.target_id || entry.targetId,
            target_label: entry.target_label || entry.targetLabel || null,
            event_title: entry.event_title || entry.eventTitle || null,
            event_summary: entry.event_summary || entry.eventSummary || null,
            event_category: entry.event_category || entry.eventCategory || null,
            business_event_type: entry.business_event_type || entry.businessEventType || null,
            changes: sanitizeAuditPayload(entry.changes || {}),
            metadata: sanitizeAuditPayload(entry.metadata || {}),
            ip_address: entry.ip_address || entry.ipAddress || null,
            user_agent: entry.user_agent || entry.userAgent || null,
            created_at: entry.created_at || entry.createdAt || new Date().toISOString()
        });
    }

    async getAuditLogs(filters = {}) {
        if (!this.auditLogSqlReader || typeof this.auditLogSqlReader.getAuditLogs !== 'function') {
            throw new Error('[AuditLoggerService] Audit log reader is not configured.');
        }

        return this.auditLogSqlReader.getAuditLogs(filters);
    }

    async getUserSessions(filters = {}) {
        if (!this.auditLogSqlReader || typeof this.auditLogSqlReader.getUserSessions !== 'function') {
            throw new Error('[AuditLoggerService] User session reader is not configured.');
        }

        return this.auditLogSqlReader.getUserSessions(filters);
    }

    _resolveDurationSeconds(logoutTime, options) {
        const providedDuration = options.durationSeconds !== undefined
            ? options.durationSeconds
            : options.duration_seconds;

        if (providedDuration !== undefined) {
            const normalizedDuration = Number(providedDuration);
            return Number.isFinite(normalizedDuration) && normalizedDuration >= 0
                ? Math.floor(normalizedDuration)
                : null;
        }

        const loginTime = options.loginTime || options.login_time;
        if (!loginTime) return null;

        const loginDate = new Date(loginTime);
        const logoutDate = new Date(logoutTime);
        const durationMs = logoutDate.getTime() - loginDate.getTime();

        if (!Number.isFinite(durationMs) || durationMs < 0) return null;
        return Math.floor(durationMs / 1000);
    }
}

module.exports = AuditLoggerService;
