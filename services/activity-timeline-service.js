const ACTIVITY_TIMELINE_PREF_ITEM = 'activity_timeline_enabled_event_types';
const NOISE_INTERACTION_EVENT_TYPES = new Set([
    '\u7cfb\u7d71\u4e8b\u4ef6', // system event
    '\u7cfb\u7d71\u4e92\u52d5\u7d00\u9304', // system interaction record
    '\u4e8b\u4ef6\u5831\u544a' // event report
]);
const LEGACY_INTERACTION_TITLE_EVENT_TYPES = new Map([
    ['\u66f4\u65b0\u6a5f\u6703\u6848\u4ef6', 'opportunity_updated'], // update opportunity
    ['\u5efa\u7acb\u6a5f\u6703\u6848\u4ef6', 'opportunity_created'], // create opportunity
    ['\u522a\u9664\u6a5f\u6703\u6848\u4ef6', 'opportunity_deleted'], // delete opportunity
    ['\u66f4\u65b0\u4e8b\u4ef6\u5831\u544a', 'event_log_updated'], // update event report
    ['\u5efa\u7acb\u4e8b\u4ef6\u5831\u544a', 'event_log_created'], // create event report
    ['\u522a\u9664\u4e8b\u4ef6\u5831\u544a', 'event_log_deleted'], // delete event report
    ['\u4f5c\u5ee2\u4e8b\u4ef6\u5831\u544a', 'event_log_voided'] // void event report
]);

class ActivityTimelineService {
    constructor({ interactionService, auditLoggerService, systemService, opportunitySqlReader = null, companySqlReader = null }) {
        this.interactionService = interactionService;
        this.auditLoggerService = auditLoggerService;
        this.systemService = systemService;
        this.opportunitySqlReader = opportunitySqlReader;
        this.companySqlReader = companySqlReader;
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
            .map(item => this._classifyInteraction(item, enabledEventTypes))
            .filter(result => result.include)
            .map(result => this._mapInteractionToTimelineItem(result.item, result.businessEventType))
            .filter(item => this._matchesTargetFilter(item, targetType, targetId));

        let auditItems = [];
        if (enabledEventTypes.length > 0) {
            const auditLogs = await this._fetchEnabledAuditLogs(enabledEventTypes, targetType, targetId, page, limit);
            const enrichedAuditLogs = await this.enrichBusinessAnchors(auditLogs);
            auditItems = enrichedAuditLogs.map(item => this._mapAuditToTimelineItem(item));
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
                limit,
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

    _mapInteractionToTimelineItem(item, businessEventType = null) {
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
            businessAnchor: item.opportunityName || item.companyName || '',
            businessEventType,
            interactionType: item.interactionType || item.eventType || '',
            module: null,
            link: null
        };
    }

    _classifyInteraction(item = {}, enabledEventTypes = []) {
        const mappedBusinessEventType = this._getLegacyMappedBusinessEventType(item);

        if (mappedBusinessEventType) {
            return {
                include: enabledEventTypes.includes(mappedBusinessEventType),
                item,
                businessEventType: mappedBusinessEventType
            };
        }

        if (this._hasNoiseInteractionType(item)) {
            return { include: false, item, businessEventType: null };
        }

        return { include: true, item, businessEventType: null };
    }

    _getLegacyMappedBusinessEventType(item = {}) {
        const candidateTitles = [
            item.eventTitle,
            item.title
        ].map(value => this._normalizeString(value));

        for (const title of candidateTitles) {
            if (LEGACY_INTERACTION_TITLE_EVENT_TYPES.has(title)) {
                return LEGACY_INTERACTION_TITLE_EVENT_TYPES.get(title);
            }
        }

        return null;
    }

    _hasNoiseInteractionType(item = {}) {
        const candidateTypes = [
            item.eventType,
            item.interactionType
        ].map(value => this._normalizeString(value));

        return candidateTypes.some(value => NOISE_INTERACTION_EVENT_TYPES.has(value));
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
            businessAnchor: item.businessAnchor || '',
            businessEventType: item.businessEventType || '',
            interactionType: null,
            module: item.module || '',
            link: null
        };
    }

    async enrichBusinessAnchors(items = [], options = {}) {
        if (!Array.isArray(items) || items.length === 0) return items;

        const enrichableItems = items.filter(item => this._isBusinessAnchorEnrichableAuditItem(item, options));
        if (enrichableItems.length === 0) return items;

        const opportunityIds = enrichableItems
            .map(item => this._getRelatedOpportunityId(item))
            .filter(Boolean);
        const companyIds = enrichableItems
            .map(item => this._getRelatedCompanyId(item))
            .filter(Boolean);

        const [opportunityNames, companyNames] = await Promise.all([
            this._fetchOpportunityNameMap(opportunityIds),
            this._fetchCompanyNameMap(companyIds)
        ]);

        return items.map(item => {
            if (!this._isBusinessAnchorEnrichableAuditItem(item, options)) return item;

            const opportunityId = this._getRelatedOpportunityId(item);
            const companyId = this._getRelatedCompanyId(item);
            const businessAnchor = opportunityNames.get(opportunityId)
                || companyNames.get(companyId)
                || '';

            return businessAnchor ? { ...item, businessAnchor } : item;
        });
    }

    _isBusinessAnchorEnrichableAuditItem(item = {}, options = {}) {
        return this._isEventLogDerivedAuditItem(item)
            || (options.includeInteractionAuditRows === true && this._isInteractionAuditItem(item));
    }

    _isEventLogDerivedAuditItem(item = {}) {
        const businessEventType = this._normalizeString(item.businessEventType);
        return item.module === 'event_logs'
            || item.targetType === 'event_log'
            || businessEventType.startsWith('event_log_');
    }

    _isInteractionAuditItem(item = {}) {
        const businessEventType = this._normalizeString(item.businessEventType);
        return item.module === 'interactions'
            || item.targetType === 'interaction'
            || businessEventType.startsWith('interaction_');
    }

    _getRelatedOpportunityId(item = {}) {
        const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
        return this._normalizeString(metadata.related_opportunity_id || item.opportunityId || item.opportunity_id);
    }

    _getRelatedCompanyId(item = {}) {
        const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
        return this._normalizeString(metadata.related_company_id || item.companyId || item.company_id);
    }

    async _fetchOpportunityNameMap(opportunityIds = []) {
        const ids = Array.from(new Set(opportunityIds.filter(Boolean)));
        if (ids.length === 0 || !this.opportunitySqlReader) return new Map();

        if (typeof this.opportunitySqlReader.getOpportunityNamesByIds === 'function') {
            return this.opportunitySqlReader.getOpportunityNamesByIds(ids);
        }

        return new Map();
    }

    async _fetchCompanyNameMap(companyIds = []) {
        const ids = Array.from(new Set(companyIds.filter(Boolean)));
        if (ids.length === 0 || !this.companySqlReader) return new Map();

        if (typeof this.companySqlReader.getCompanyNamesByIds === 'function') {
            return this.companySqlReader.getCompanyNamesByIds(ids);
        }

        return new Map();
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
        return String(value || '').trim();
    }
}

module.exports = ActivityTimelineService;
