/**
 * services/subscription-ops-service.js
 * Backend API service for Subscription Ops.
 */

const REQUIRED_FIELDS = [
    'customerName',
    'subscriptionItemName',
    'endDate',
    'status',
    'ownerName'
];

const ALLOWED_FIELDS = [
    'sourceType',
    'customerName',
    'subscriptionItemName',
    'companyId',
    'companyNameSnapshot',
    'opportunityId',
    'opportunityNameSnapshot',
    'productId',
    'productNameSnapshot',
    'contractName',
    'subscriptionType',
    'renewalCycle',
    'customPeriodLabel',
    'startDate',
    'endDate',
    'amount',
    'currency',
    'ownerName',
    'status',
    'notes',
    'reminderStages',
    'lastRemindedAt',
    'nextReminderAt',
    'isActive',
    'isArchived'
];

class SubscriptionOpsService {
    constructor({ subscriptionOpsSqlReader, subscriptionOpsSqlWriter }) {
        this.subscriptionOpsSqlReader = subscriptionOpsSqlReader;
        this.subscriptionOpsSqlWriter = subscriptionOpsSqlWriter;
    }

    async getSubscriptionOps() {
        return this.subscriptionOpsSqlReader.getSubscriptionOps();
    }

    async createSubscriptionOp(data) {
        const payload = this._sanitizePayload(data);
        this._validateRequired(payload);

        const created = await this.subscriptionOpsSqlWriter.createSubscriptionOp({
            sourceType: 'manual',
            currency: 'TWD',
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

    _sanitizePayload(data = {}) {
        return ALLOWED_FIELDS.reduce((payload, field) => {
            if (data[field] !== undefined) {
                payload[field] = data[field];
            }
            return payload;
        }, {});
    }

    _validateRequired(payload) {
        REQUIRED_FIELDS.forEach(field => {
            if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                throw new Error(`${field} required`);
            }
        });
    }
}

module.exports = SubscriptionOpsService;
