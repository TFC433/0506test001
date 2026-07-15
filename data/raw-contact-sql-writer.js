const { supabase } = require('../config/supabase');

class RawContactSqlWriter {
    constructor() {
        this.tableName = 'raw_contact_captures';
    }

    async updateRawContactByCardId(cardId, updateData = {}) {
        if (!cardId) throw new Error('RawContactSqlWriter: cardId is required');

        const payload = this._buildUpdatePayload(updateData);
        if (Object.keys(payload).length === 0) {
            throw new Error('RawContactSqlWriter: no allowed update fields provided');
        }

        const { error, count } = await supabase
            .from(this.tableName)
            .update(payload, { count: 'exact' })
            .eq('card_id', cardId);

        if (error) {
            console.error('[RawContactSqlWriter] Update Failed:', error);
            throw new Error(`[RawContactSqlWriter] Update Error: ${error.message}`);
        }

        if (count === 0) {
            return { success: false, notFound: true, message: `RAW contact not found: ${cardId}` };
        }

        return { success: true };
    }

    async deleteRawContactByCardId(cardId) {
        if (!cardId) throw new Error('RawContactSqlWriter: cardId is required');

        const { error, count } = await supabase
            .from(this.tableName)
            .delete({ count: 'exact' })
            .eq('card_id', cardId);

        if (error) {
            console.error('[RawContactSqlWriter] Delete Failed:', error);
            throw new Error(`[RawContactSqlWriter] Delete Error: ${error.message}`);
        }

        if (count === 0) {
            return { success: false, notFound: true, message: `RAW contact not found: ${cardId}` };
        }

        return { success: true };
    }

    async updateRawContactStatusByCardId(cardId, status) {
        if (status === undefined) throw new Error('RawContactSqlWriter: status is required');
        return this.updateRawContactByCardId(cardId, { status });
    }

    _buildUpdatePayload(updateData = {}) {
        const payload = {};

        if (updateData.name !== undefined) payload.name = updateData.name;
        if (updateData.company !== undefined) payload.company = updateData.company;
        if (updateData.position !== undefined) payload.position = updateData.position;
        else if (updateData.jobTitle !== undefined) payload.position = updateData.jobTitle;
        if (updateData.department !== undefined) payload.department = updateData.department;
        if (updateData.phone !== undefined) payload.phone = updateData.phone;
        if (updateData.mobile !== undefined) payload.mobile = updateData.mobile;
        if (updateData.fax !== undefined) payload.fax = updateData.fax;
        if (updateData.email !== undefined) payload.email = updateData.email;
        if (updateData.website !== undefined) payload.website = updateData.website;
        if (updateData.address !== undefined) payload.address = updateData.address;
        if (updateData.notes !== undefined) payload.notes = updateData.notes;
        if (updateData.status !== undefined) payload.status = updateData.status;
        if (updateData.exhibition_name !== undefined) payload.exhibition_name = updateData.exhibition_name;
        if (updateData.is_exhibition !== undefined) payload.is_exhibition = updateData.is_exhibition;
        if (updateData.lineUserId !== undefined) payload.line_user_id = updateData.lineUserId;
        if (updateData.userNickname !== undefined) payload.user_nickname = updateData.userNickname;
        const hasWritableField = Object.keys(payload).length > 0;
        if (updateData.updatedAt !== undefined) {
            payload.updated_at = updateData.updatedAt;
        } else if (hasWritableField) {
            payload.updated_at = new Date().toISOString();
        }

        return payload;
    }
}

module.exports = RawContactSqlWriter;
