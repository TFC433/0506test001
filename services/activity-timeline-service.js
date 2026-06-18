const ACTIVITY_TIMELINE_PREF_ITEM = 'activity_timeline_enabled_event_types';
const NOISE_INTERACTION_EVENT_TYPES = new Set([
    '蝟餌絞鈭辣',
    '蝟餌絞鈭?蝝??',
    '鈭辣?勗?'
]);

class ActivityTimelineService {
    constructor({ interactionService, auditLoggerService, systemService }) {
        this.interactionService = interactionService;
        this.auditLoggerService = auditLoggerService;
        this.systemService = systemService;
    }

    async getActivityTimeline(options = {}) {
        const page = this._normalizePositiveInt(options.page, 1);
        const limit = Math.min(this._normalizePositiveInt(options.limit, 50), 100);
        const targetType = this._normalizeString(options.target_type);
        const targetId = this._normalizeString(options.target_id);

        const [enabledEventTypes, interactionResult] = await Promise.all([
            this._getEnabledAuditEventTypes(),
            this.interactionService.searchInteractions('', 1, true)
        ]);

        let interactionItems = (interactionResult.data || [])
            .filter(item => !NOISE_INTERACTION_EVENT_TYPES.has(item.eventType))
            .map(item => this._mapInteractionToTimelineItem(item))
            .filter(item => this._matchesTargetFilter(item, targetType, targetId));

        let auditItems = [];
        if (enabledEventTypes.length > 0) {
            const auditLogs = await this._fetchEnabledAuditLogs(enabledEventTypes, targetType, targetId, page, limit);
            auditItems = auditLogs.map(item => this._mapAuditToTimelineItem(item));
        }

        const mergedItems = interactionItems
            .concat(auditItems)
            .sort((a, b) => this._getTimeValue(b.time) - this._getTimeValue(a.time));

        const start = (page - 1) * limit;
        const data = mergedItems.slice(start, start + limit);
        const totalItems = mergedItems.length;
        const total = Math.max(Math.ceil(totalItems / limit), 1);

        return {
            data,
            pagination: {
                current: page,
                total,
                totalItems,
                hasNext: page < total,
                hasPrev: page > 1
            }
        };
    }

    async _getEnabledAuditEventTypes() {
        try {
            const config = await this.systemService.getSystemConfig();
            const configGroups = Object.values(config || {}).filter(Array.isArray);

            for (const group of configGroups) {
                const row = group.find(item => {
                    const value = this._normalizeString(item && item.value);
                    const key = this._normalizeString(item && item.item);
                    return value === ACTIVITY_TIMELINE_PREF_ITEM || key === ACTIVITY_TIMELINE_PREF_ITEM;
                });

                if (row && typeof row.note === 'string') {
                    const parsed = JSON.parse(row.note);
                    return Array.isArray(parsed)
                        ? parsed.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
                        : [];
                }
            }
        } catch (error) {
            console.warn('[ActivityTimelineService] Failed to read enabled audit event types:', error.message);
        }

        return [];
    }

    _mapInteractionToTimelineItem(item) {
        const targetType = item.opportunityId ? 'opportunity' : (item.companyId ? 'company' : '');
        const targetId = item.opportunityId || item.companyId || '';

        return {
            id: item.interactionId,
            source: 'interaction',
            sourceId: item.interactionId,
            time: item.interactionTime,
            title: item.eventTitle || item.interactionType || item.eventType || '鈭?蝝??',
            summary: item.contentSummary || '',
            actorName: item.recorder || '',
            actorUsername: '',
            targetType,
            targetId,
            targetLabel: item.opportunityName || item.companyName || '',
            businessEventType: null,
            interactionType: item.interactionType || item.eventType || '',
            module: null,
            link: null
        };
    }

    _mapAuditToTimelineItem(item) {
        return {
            id: item.auditId,
            source: 'audit',
            sourceId: item.auditId,
            time: item.createdAt,
            title: item.eventTitle || item.businessEventType || item.action || '蝟餌絞鈭辣',
            summary: item.eventSummary || '',
            actorName: item.actorName || '',
            actorUsername: item.actorUsername || '',
            targetType: item.targetType || '',
            targetId: item.targetId || '',
            targetLabel: item.targetLabel || '',
            businessEventType: item.businessEventType || '',
            interactionType: null,
            module: item.module || '',
            link: null
        };
    }

    _matchesTargetFilter(item, targetType, targetId) {
        if (targetType && item.targetType !== targetType) return false;
        if (targetId && item.targetId !== targetId) return false;
        return true;
    }

    async _fetchEnabledAuditLogs(enabledEventTypes, targetType, targetId, page, limit) {
        const internalFetchLimit = this._getInternalFetchLimit(page, limit);
        const pageSize = 100;
        const auditLogs = [];
        let auditPage = 1;
        let totalItems = null;

        while (auditLogs.length < internalFetchLimit) {
            const auditResult = await this.auditLoggerService.getAuditLogs({
                page: auditPage,
                limit: pageSize,
                business_event_type: enabledEventTypes.join(','),
                target_type: targetType,
                target_id: targetId
            });

            const rows = auditResult.data || [];
            auditLogs.push(...rows);
            totalItems = auditResult.totalItems;

            if (rows.length < pageSize) break;
            if (Number.isFinite(totalItems) && auditLogs.length >= totalItems) break;

            auditPage += 1;
        }

        return auditLogs.slice(0, internalFetchLimit);
    }

    _getInternalFetchLimit(page, limit) {
        return Math.min(Math.max(page * limit * 2, 200), 1000);
    }

    _getTimeValue(value) {
        const time = new Date(value).getTime();
        return Number.isFinite(time) ? time : 0;
    }

    _normalizePositiveInt(value, fallback) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    _normalizeString(value) {
        return typeof value === 'string' ? value.trim() : '';
    }
}

module.exports = ActivityTimelineService;
