/**
 * data/subscription-ops-sql-writer.js
 * SQL writer for public.subscription_ops.
 */

const { supabase } = require('../config/supabase');

const FIELD_TO_COLUMN = {
    sourceType: 'source_type',
    customerName: 'customer_name',
    subscriptionItemName: 'subscription_item_name',
    companyId: 'company_id',
    companyNameSnapshot: 'company_name_snapshot',
    opportunityId: 'opportunity_id',
    opportunityNameSnapshot: 'opportunity_name_snapshot',
    productId: 'product_id',
    productNameSnapshot: 'product_name_snapshot',
    contractName: 'contract_name',
    subscriptionType: 'subscription_type',
    renewalCycle: 'renewal_cycle',
    customPeriodLabel: 'custom_period_label',
    startDate: 'start_date',
    endDate: 'end_date',
    amount: 'amount',
    currency: 'currency',
    ownerName: 'owner_name',
    status: 'status',
    notes: 'notes',
    reminderStages: 'reminder_stages',
    lastRemindedAt: 'last_reminded_at',
    nextReminderAt: 'next_reminder_at',
    isActive: 'is_active',
    isArchived: 'is_archived',
    createdBy: 'created_by',
    updatedBy: 'updated_by'
};

class SubscriptionOpsSqlWriter {
    constructor() {
        this.tableName = 'subscription_ops';
    }

    async createSubscriptionOp(payload) {
        const row = this._mapDtoToRow(payload);

        const { data, error } = await supabase
            .from(this.tableName)
            .insert([row])
            .select('*')
            .single();

        if (error) {
            throw new Error(`[SubscriptionOpsSqlWriter] DB Insert Error: ${error.message}`);
        }

        return data;
    }

    async updateSubscriptionOp(id, payload) {
        if (!id) throw new Error('SubscriptionOpsSqlWriter: id is required');

        const updates = this._mapDtoToRow(payload);

        const { data, error } = await supabase
            .from(this.tableName)
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw new Error(`[SubscriptionOpsSqlWriter] DB Update Error: ${error.message}`);
        }

        return data;
    }

    async archiveSubscriptionOp(id) {
        if (!id) throw new Error('SubscriptionOpsSqlWriter: id is required');

        const { data, error } = await supabase
            .from(this.tableName)
            .update({
                is_archived: true,
                is_active: false
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw new Error(`[SubscriptionOpsSqlWriter] DB Archive Error: ${error.message}`);
        }

        return data;
    }

    _mapDtoToRow(payload) {
        const row = {};

        Object.keys(FIELD_TO_COLUMN).forEach(field => {
            if (payload[field] !== undefined) {
                row[FIELD_TO_COLUMN[field]] = payload[field];
            }
        });

        return row;
    }
}

module.exports = SubscriptionOpsSqlWriter;
