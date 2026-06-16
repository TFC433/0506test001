/**
 * services/subscription-ops-service.js
 * Backend API service for Subscription Ops.
 */

const ALLOWED_FIELDS = [
    'sourceType',
    'reminderKind',
    'opportunityId',
    'productId',
    'manualCustomerName',
    'manualItemName',
    'subscriptionStartDate',
    'subscriptionEndDate',
    'customSubject',
    'customNote',
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

const OPTIONAL_NULLABLE_FIELDS = [
    'productId',
    'reminderOwnerName',
    'reminderOwnerEmail'
];

const ALERT_FETCH_LIMIT = 1000;
const ALERT_CUTOFF_DATE = '9999-12-31';
const UNSPECIFIED_PRODUCT_LABEL = '\u672a\u6307\u5b9a\u5546\u54c1';
const UNRESOLVED_PRODUCT_LABEL = '\u672a\u89e3\u6790\u5546\u54c1';

class SubscriptionOpsService {
    constructor({ subscriptionOpsSqlReader, subscriptionOpsSqlWriter, opportunitySqlReader, productService }) {
        this.subscriptionOpsSqlReader = subscriptionOpsSqlReader;
        this.subscriptionOpsSqlWriter = subscriptionOpsSqlWriter;
        this.opportunitySqlReader = opportunitySqlReader;
        this.productService = productService;
    }

    async getSubscriptionOps() {
        return this.subscriptionOpsSqlReader.getSubscriptionOps();
    }

    async getWonOpportunityOptions() {
        if (!this.opportunitySqlReader) {
            throw new Error('opportunitySqlReader required');
        }

        const [opportunities, productOptions] = await Promise.all([
            this._fetchWonOpportunities(),
            this._fetchOpportunityProductOptions()
        ]);
        const productOptionMap = new Map(productOptions.map(option => [String(option.id), option]));

        return opportunities.map(opportunity => ({
            opportunityId: opportunity.opportunityId,
            opportunityName: opportunity.opportunityName,
            opportunityType: opportunity.opportunityType,
            customerCompany: opportunity.customerCompany,
            expectedCloseDate: opportunity.expectedCloseDate,
            lastUpdateTime: opportunity.lastUpdateTime,
            assignee: opportunity.assignee,
            currentStage: opportunity.currentStage,
            currentStatus: opportunity.currentStatus,
            products: this._extractSelectedProducts(opportunity.potentialSpecification, productOptionMap)
        }));
    }

    async getUpcomingRenewalAlerts({ limit } = {}) {
        const explicitLimit = this._normalizeAlertLimit(limit, { allowEmpty: true });
        const today = this._getDateOnly(new Date());
        const [records, opportunities, productOptions] = await Promise.all([
            this.subscriptionOpsSqlReader.getUpcomingRenewalAlerts({
                cutoffDate: ALERT_CUTOFF_DATE,
                fetchLimit: explicitLimit ? Math.max(explicitLimit * 3, 30) : ALERT_FETCH_LIMIT
            }),
            this._fetchWonOpportunities(),
            this._fetchOpportunityProductOptions()
        ]);
        const opportunityMap = new Map((opportunities || []).map(opportunity => [String(opportunity.opportunityId), opportunity]));
        const productOptionMap = new Map((productOptions || []).map(option => [String(option.id), option]));

        const alerts = records
            .filter(record => !ALERT_EXCLUDED_STATUSES.includes(record.status))
            .filter(record => !this._isFutureStartRecord(record, today))
            .map(record => this._mapAlertDto(record, today, opportunityMap, productOptionMap))
            .sort((a, b) => {
                const overdueA = a.daysRemaining < 0;
                const overdueB = b.daysRemaining < 0;
                if (overdueA !== overdueB) return overdueA ? -1 : 1;
                if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
                return String(a.id).localeCompare(String(b.id));
            });

        return explicitLimit ? alerts.slice(0, explicitLimit) : alerts;
    }

    _isFutureStartRecord(record, today) {
        const startDate = this._parseDateOnly(record && record.subscriptionStartDate);
        return Boolean(startDate && startDate.getTime() > today.getTime());
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
        if (payload.reminderKind === 'custom') {
            this._validateRequired(payload);
        }
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

    async _fetchWonOpportunities() {
        if (typeof this.opportunitySqlReader.getSalesAnalysisBaseDeals !== 'function') {
            return [];
        }

        const opportunities = await this.opportunitySqlReader.getSalesAnalysisBaseDeals(null, null);
        return (Array.isArray(opportunities) ? opportunities : [])
            .sort((a, b) => {
                const timeA = new Date((a && (a.expectedCloseDate || a.lastUpdateTime)) || 0).getTime();
                const timeB = new Date((b && (b.expectedCloseDate || b.lastUpdateTime)) || 0).getTime();
                return timeB - timeA;
            });
    }

    async _fetchOpportunityProductOptions() {
        if (!this.productService || typeof this.productService.getOpportunitySpecs !== 'function') {
            return [];
        }

        try {
            const options = await this.productService.getOpportunitySpecs();
            return Array.isArray(options) ? options : [];
        } catch (error) {
            console.warn('[SubscriptionOpsService] Product option label mapping skipped:', error.message);
            return [];
        }
    }

    _extractSelectedProducts(rawSpec, productOptionMap) {
        const entries = this._parseSelectedProductEntries(rawSpec);

        return entries.map(([productId, quantity]) => {
            const productKey = String(productId);
            const option = productOptionMap.get(productKey);

            if (!option) {
                return {
                    productId: productKey,
                    productName: productKey,
                    label: productKey,
                    quantity,
                    behaviorMode: '',
                    isResolved: false
                };
            }

            return {
                productId: productKey,
                productName: option.name || option.label || productKey,
                label: option.label || option.name || productKey,
                quantity,
                behaviorMode: option.behaviorMode || '',
                isResolved: true
            };
        });
    }

    _parseSelectedProductEntries(rawSpec) {
        const parsed = this._parsePotentialSpecification(rawSpec);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

        return Object.entries(parsed)
            .map(([key, value]) => [key, this._normalizeSelectedProductQuantity(value)])
            .filter(([key, quantity]) => key && quantity > 0);
    }

    _parsePotentialSpecification(rawSpec) {
        if (!rawSpec) return {};
        if (typeof rawSpec === 'object') return rawSpec;

        if (typeof rawSpec === 'string') {
            const trimmed = rawSpec.trim();
            if (!trimmed) return {};

            try {
                return JSON.parse(trimmed);
            } catch (error) {
                return trimmed.split(',').reduce((acc, item) => {
                    const key = item.trim();
                    if (key) acc[key] = 1;
                    return acc;
                }, {});
            }
        }

        return {};
    }

    _normalizeSelectedProductQuantity(value) {
        if (value === true) return 1;
        if (value === false || value === null || value === undefined) return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

        const normalized = String(value).trim().toLowerCase();
        if (!normalized) return 0;
        if (['true', 'yes', 'y'].includes(normalized)) return 1;

        const numericValue = Number(normalized);
        return Number.isFinite(numericValue) ? numericValue : 0;
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

        const reminderKind = normalized.reminderKind || 'subscription';
        if (options.applyDefaults && normalized.reminderKind === undefined) {
            normalized.reminderKind = 'subscription';
        }

        if (reminderKind === 'custom') {
            normalized.sourceType = normalized.sourceType || 'manual';
            if (normalized.customSubject !== undefined && normalized.manualCustomerName === undefined) {
                normalized.manualCustomerName = normalized.customSubject;
            }
            if (normalized.customSubject !== undefined && normalized.manualItemName === undefined) {
                normalized.manualItemName = normalized.customSubject;
            }
        }

        if (options.applyDefaults && normalized.sourceType === undefined) {
            normalized.sourceType = 'manual';
        }

        OPTIONAL_NULLABLE_FIELDS.forEach(field => {
            if (normalized[field] === '') {
                normalized[field] = null;
            }
        });

        return ALLOWED_FIELDS.reduce((payload, field) => {
            if (normalized[field] !== undefined) {
                payload[field] = normalized[field];
            }
            return payload;
        }, {});
    }

    _validateRequired(payload) {
        if (payload.reminderKind === 'custom') {
            ['customSubject', 'subscriptionEndDate'].forEach(field => {
                if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                    throw new Error(`${field} required`);
                }
            });
            return;
        }

        const sourceType = payload.sourceType || 'manual';
        const required = sourceType === 'opportunity'
            ? ['opportunityId', 'subscriptionEndDate']
            : ['manualCustomerName', 'manualItemName', 'subscriptionEndDate', 'reminderOwnerName'];

        required.forEach(field => {
            if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                throw new Error(`${field} required`);
            }
        });
    }

    _mapAlertDto(record, today, opportunityMap = new Map(), productOptionMap = new Map()) {
        const endDate = this._parseDateOnly(record.subscriptionEndDate);
        const daysRemaining = this._diffDateOnlyDays(today, endDate);
        const opportunity = record.opportunityId ? opportunityMap.get(String(record.opportunityId)) : null;
        const displayOpportunityName = this._resolveAlertOpportunityName(record, opportunity);
        const displayProductName = this._resolveAlertProductName(record, opportunity, productOptionMap);

        return {
            id: record.id,
            sourceType: record.sourceType,
            reminderKind: record.reminderKind || 'subscription',
            opportunityId: record.opportunityId,
            productId: record.productId,
            customSubject: record.customSubject || '',
            customNote: record.customNote || '',
            displayOpportunityName,
            displayProductName,
            subscriptionEndDate: record.subscriptionEndDate,
            daysRemaining,
            urgency: this._getAlertUrgency(daysRemaining),
            customerName: record.manualCustomerName || '',
            subscriptionItemName: record.manualItemName || '',
            endDate: record.subscriptionEndDate,
            status: record.status,
            isActive: record.isActive,
            isArchived: record.isArchived
        };
    }

    _resolveAlertOpportunityName(record, opportunity) {
        if ((record.reminderKind || 'subscription') === 'custom') {
            return record.customSubject || '';
        }

        if (record.sourceType === 'opportunity') {
            return (opportunity && opportunity.opportunityName) || record.manualCustomerName || record.customerName || record.opportunityId || '';
        }

        return record.manualCustomerName || record.customerName || '';
    }

    _resolveAlertProductName(record, opportunity, productOptionMap) {
        if ((record.reminderKind || 'subscription') === 'custom') {
            return record.customNote || ' ';
        }

        if (record.manualItemName) {
            return record.manualItemName;
        }

        if (record.sourceType !== 'opportunity') {
            return record.manualItemName || record.subscriptionItemName || UNSPECIFIED_PRODUCT_LABEL;
        }

        if (!record.productId) {
            return UNSPECIFIED_PRODUCT_LABEL;
        }

        const productKey = String(record.productId);
        if (opportunity) {
            const selectedProduct = this._extractSelectedProducts(opportunity.potentialSpecification, productOptionMap)
                .find(product => String(product.productId) === productKey);
            if (selectedProduct) {
                return selectedProduct.label || selectedProduct.productName || selectedProduct.productId;
            }
        }

        const productOption = productOptionMap.get(productKey);
        if (productOption) {
            return productOption.label || productOption.name || productKey;
        }

        return productKey || UNRESOLVED_PRODUCT_LABEL;
    }

    _getAlertUrgency(daysRemaining) {
        if (daysRemaining < 0) return 'overdue';
        if (daysRemaining === 0) return 'dueToday';
        if (daysRemaining <= 7) return 'within7';
        if (daysRemaining <= 30) return 'within30';
        if (daysRemaining <= 60) return 'within60';
        if (daysRemaining <= 90) return 'within90';
        if (daysRemaining <= 120) return 'within120';
        if (daysRemaining <= 180) return 'within180';
        return 'over180';
    }

    _normalizeAlertLimit(limit, options = {}) {
        if (options.allowEmpty && (limit === undefined || limit === null || limit === '')) return null;
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
