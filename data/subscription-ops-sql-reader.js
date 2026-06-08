/**
 * data/subscription-ops-sql-reader.js
 * SQL reader for public.subscription_ops.
 */

const { supabase } = require('../config/supabase');

class SubscriptionOpsSqlReader {
    constructor() {
        this.tableName = 'subscription_ops';
    }

    async getSubscriptionOps() {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .order('end_date', { ascending: true })
            .order('updated_at', { ascending: false });

        if (error) {
            throw new Error(`[SubscriptionOpsSqlReader] DB Error: ${error.message}`);
        }

        return (data || []).map(row => this._mapRowToDto(row));
    }

    async getUpcomingRenewalAlerts({ cutoffDate, fetchLimit = 100 } = {}) {
        if (!cutoffDate) throw new Error('SubscriptionOpsSqlReader: cutoffDate is required');

        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('is_archived', false)
            .eq('is_active', true)
            .not('end_date', 'is', null)
            .lte('end_date', cutoffDate)
            .order('end_date', { ascending: true })
            .limit(fetchLimit);

        if (error) {
            throw new Error(`[SubscriptionOpsSqlReader] DB Alert Error: ${error.message}`);
        }

        return (data || []).map(row => this._mapRowToDto(row));
    }

    async getSubscriptionOpById(id) {
        if (!id) throw new Error('SubscriptionOpsSqlReader: id is required');

        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(`[SubscriptionOpsSqlReader] DB Error: ${error.message}`);
        }

        return this._mapRowToDto(data);
    }

    _mapRowToDto(row) {
        if (!row) return null;

        return {
            id: row.id,
            sourceType: row.source_type,
            customerName: row.customer_name,
            subscriptionItemName: row.subscription_item_name,
            companyId: row.company_id,
            companyNameSnapshot: row.company_name_snapshot,
            opportunityId: row.opportunity_id,
            opportunityNameSnapshot: row.opportunity_name_snapshot,
            productId: row.product_id,
            productNameSnapshot: row.product_name_snapshot,
            contractName: row.contract_name,
            subscriptionType: row.subscription_type,
            renewalCycle: row.renewal_cycle,
            customPeriodLabel: row.custom_period_label,
            startDate: row.start_date,
            endDate: row.end_date,
            amount: row.amount,
            currency: row.currency,
            ownerName: row.owner_name,
            status: row.status,
            notes: row.notes,
            reminderStages: row.reminder_stages,
            lastRemindedAt: row.last_reminded_at,
            nextReminderAt: row.next_reminder_at,
            isActive: row.is_active,
            isArchived: row.is_archived,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by
        };
    }
}

module.exports = SubscriptionOpsSqlReader;
