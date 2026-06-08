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
            .order('subscription_end_date', { ascending: true })
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
            .not('subscription_end_date', 'is', null)
            .lte('subscription_end_date', cutoffDate)
            .order('subscription_end_date', { ascending: true })
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
            opportunityId: row.opportunity_id,
            productId: row.product_id,
            manualCustomerName: row.manual_customer_name,
            manualItemName: row.manual_item_name,
            subscriptionStartDate: row.subscription_start_date,
            subscriptionEndDate: row.subscription_end_date,
            reminderOwnerName: row.reminder_owner_name,
            reminderOwnerEmail: row.reminder_owner_email,
            reminderStages: row.reminder_stages,
            status: row.status,
            notes: row.notes,
            isActive: row.is_active,
            isArchived: row.is_archived,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,

            // Compatibility aliases for existing Phase 1A frontend and Dashboard consumers.
            customerName: row.manual_customer_name,
            subscriptionItemName: row.manual_item_name,
            endDate: row.subscription_end_date,
            ownerName: row.reminder_owner_name
        };
    }
}

module.exports = SubscriptionOpsSqlReader;
