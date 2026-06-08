/**
 * services/subscription-ops-service.js
 * Backend API service for Subscription Ops.
 */

const ALLOWED_FIELDS = [
    'sourceType',
    'opportunityId',
    'productId',
    'manualCustomerName',
    'manualItemName',
    'subscriptionStartDate',
    'subscriptionEndDate',
    'reminderOwnerName',
    'reminderOwnerEmail',
    'reminderStages',
    'status',
    'notes',
    'isActive',
    'isArchived'
];

const ALERT_EXCLUDED_STATUSES = [
    '\u5df2\u53d6\u6d88',
    '\u5df2\u7d42\u6b62',
    '\u5df2\u5c01\u5b58'
];

class SubscriptionOpsService {
    constructor({ subscriptionOpsSqlReader, subscriptionOpsSqlWriter }) {
        this.subscriptionOpsSqlReader = subscriptionOpsSqlReader;
        this.subscriptionOpsSqlWriter = subscriptionOpsSqlWriter;
    }

    async getSubscriptionOps() {
        return this.subscriptionOpsSqlReader.getSubscriptionOps();
    }

    async getUpcomingRenewalAlerts({ limit = 10 } = {}) {
        const normalizedLimit = this._normalizeAlertLimit(limit);
        const today = this._getDateOnly(new Date());
        const cutoff = this._addDays(today, 90);
        const records = await this.subscriptionOpsSqlReader.getUpcomingRenewalAlerts({
            cutoffDate: this._formatDateOnly(cutoff),
            fetchLimit: Math.max(normalizedLimit * 3, 30)
        });

        return records
            .filter(record => !ALERT_EXCLUDED_STATUSES.includes(record.status))
            .map(record => this._mapAlertDto(record, today))
            .sort((a, b) => {
                const overdueA = a.daysRemaining < 0;
                const overdueB = b.daysRemaining < 0;
                if (overdueA !== overdueB) return overdueA ? -1 : 1;
                if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
                return String(a.id).localeCompare(String(b.id));
            })
            .slice(0, normalizedLimit);
    }

    async createSubscriptionOp(data) {
        const payload = this._sanitizePayload(data, { applyDefaults: true });
        this._validateRequired(payload);

        const created = await this.subscriptionOpsSqlWriter.createSubscriptionOp({
            sourceType: 'manual',
            status: '\u9032\u884c\u4e2d',
            reminderStages: '180,90,30',
            isActive: true,
            isArchived: false,
            ...payload
        });

        return {
            success: true,
            id: created.id,
            data: this.subscriptionOpsSqlReader._mapRowToDto(created)
        };
    }

    async updateSubscriptionOp(id, data) {
        if (!id) throw new Error('id required');

        const payload = this._sanitizePayload(data);
        const updated = await this.subscriptionOpsSqlWriter.updateSubscriptionOp(id, payload);

        return {
            success: true,
            id: updated.id,
            data: this.subscriptionOpsSqlReader._mapRowToDto(updated)
        };
    }

    async archiveSubscriptionOp(id) {
        if (!id) throw new Error('id required');

        const archived = await this.subscriptionOpsSqlWriter.archiveSubscriptionOp(id);

        return {
            success: true,
            id: archived.id,
            data: this.subscriptionOpsSqlReader._mapRowToDto(archived)
        };
    }

    _sanitizePayload(data = {}, options = {}) {
        const normalized = {
            ...data
        };

        // Compatibility input aliases for existing Phase 1A frontend clients.
        if (normalized.manualCustomerName === undefined && normalized.customerName !== undefined) {
            normalized.manualCustomerName = normalized.customerName;
        }
        if (normalized.manualItemName === undefined && normalized.subscriptionItemName !== undefined) {
            normalized.manualItemName = normalized.subscriptionItemName;
        }
        if (normalized.subscriptionEndDate === undefined && normalized.endDate !== undefined) {
            normalized.subscriptionEndDate = normalized.endDate;
        }
        if (normalized.reminderOwnerName === undefined && normalized.ownerName !== undefined) {
            normalized.reminderOwnerName = normalized.ownerName;
        }

        if (options.applyDefaults && normalized.sourceType === undefined) {
            normalized.sourceType = 'manual';
        }

        return ALLOWED_FIELDS.reduce((payload, field) => {
            if (normalized[field] !== undefined) {
                payload[field] = normalized[field];
            }
            return payload;
        }, {});
    }

    _validateRequired(payload) {
        const sourceType = payload.sourceType || 'manual';
        const required = sourceType === 'opportunity'
            ? ['opportunityId', 'productId', 'subscriptionEndDate', 'reminderOwnerName']
            : ['manualCustomerName', 'manualItemName', 'subscriptionEndDate', 'reminderOwnerName'];

        required.forEach(field => {
            if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                throw new Error(`${field} required`);
            }
        });
    }

    _mapAlertDto(record, today) {
        const endDate = this._parseDateOnly(record.subscriptionEndDate);
        const daysRemaining = this._diffDateOnlyDays(today, endDate);

        return {
            id: record.id,
            customerName: record.manualCustomerName || '',
            subscriptionItemName: record.manualItemName || '',
            endDate: record.subscriptionEndDate,
            status: record.status,
            ownerName: record.reminderOwnerName,
            sourceType: record.sourceType,
            isActive: record.isActive,
            isArchived: record.isArchived,
            daysRemaining,
            urgency: this._getAlertUrgency(daysRemaining)
        };
    }

    _getAlertUrgency(daysRemaining) {
        if (daysRemaining < 0) return 'overdue';
        if (daysRemaining <= 30) return 'within30';
        return 'within90';
    }

    _normalizeAlertLimit(limit) {
        const parsed = parseInt(limit, 10);
        if (isNaN(parsed) || parsed <= 0) return 10;
        return Math.min(parsed, 50);
    }

    _getDateOnly(date) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    }

    _parseDateOnly(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }

    _addDays(date, days) {
        const result = new Date(date.getTime());
        result.setUTCDate(result.getUTCDate() + days);
        return result;
    }

    _formatDateOnly(date) {
        return date.toISOString().slice(0, 10);
    }

    _diffDateOnlyDays(startDate, endDate) {
        if (!endDate) return 0;
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
    }
}

module.exports = SubscriptionOpsService;
