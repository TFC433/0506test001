const { supabase } = require('../config/supabase');

class ActivityIntelligenceSqlWriter {
    constructor() {
        this.activitiesTable = 'activity_intelligence_activities';
        this.submissionsTable = 'activity_intelligence_submissions';
    }

    async createActivity(payload) {
        return this._rpc('activity_intelligence_create_activity', payload);
    }

    async duplicateActivity(payload) {
        return this._rpc('activity_intelligence_duplicate_activity', payload);
    }

    async saveDraft(payload) {
        return this._rpc('activity_intelligence_save_draft', payload);
    }

    async discardDraft(payload) {
        return this._rpc('activity_intelligence_discard_draft', payload);
    }

    async publishDraft(payload) {
        return this._rpc('activity_intelligence_publish_draft', payload);
    }

    async createSubmission(payload) {
        return this._rpc('activity_intelligence_create_submission', payload);
    }

    async updateSubmission(payload) {
        return this._rpc('activity_intelligence_update_submission', payload);
    }

    async hardDeleteSubmission(payload) {
        return this._rpc('activity_intelligence_hard_delete_submission', payload);
    }

    async hardDeleteActivity(payload) {
        return this._rpc('activity_intelligence_hard_delete_activity', payload);
    }

    async updateActivity(activityId, updates) {
        const { data, error } = await supabase
            .from(this.activitiesTable)
            .update(updates)
            .eq('activity_id', activityId)
            .select('*')
            .maybeSingle();

        if (error) throw new Error(`[ActivityIntelligenceSqlWriter] updateActivity DB Error: ${error.message}`);
        return data;
    }

    async updateSubmissionStatus(submissionId, status, actorRow) {
        const { data, error } = await supabase
            .from(this.submissionsTable)
            .update({
                status,
                updated_by_user_id: actorRow.updated_by_user_id,
                updated_by_display_name: actorRow.updated_by_display_name,
                updated_at: new Date().toISOString()
            })
            .eq('submission_id', submissionId)
            .select('*')
            .maybeSingle();

        if (error) throw new Error(`[ActivityIntelligenceSqlWriter] updateSubmissionStatus DB Error: ${error.message}`);
        return data;
    }

    async _rpc(functionName, payload) {
        const { data, error } = await supabase.rpc(functionName, payload);
        if (error) {
            const err = new Error(`[ActivityIntelligenceSqlWriter] ${functionName} RPC Error: ${error.message}`);
            err.dbCode = error.code;
            err.dbDetails = error.details;
            err.dbHint = error.hint;
            throw err;
        }
        return data;
    }
}

module.exports = ActivityIntelligenceSqlWriter;
