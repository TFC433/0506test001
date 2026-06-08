/**
 * data/subscription-ops-sql-writer.js
 * SQL writer for public.subscription_ops.
 */

const { supabase } = require('../config/supabase');

const FIELD_TO_COLUMN = {
    sourceType: 'source_type',
    opportunityId: 'opportunity_id',
    productId: 'product_id',
    manualCustomerName: 'manual_customer_name',
    manualItemName: 'manual_item_name',
    subscriptionStartDate: 'subscription_start_date',
    subscriptionEndDate: 'subscription_end_date',
    reminderOwnerName: 'reminder_owner_name',
    reminderOwnerEmail: 'reminder_owner_email',
    reminderStages: 'reminder_stages',
    status: 'status',
    notes: 'notes',
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
