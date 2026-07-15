const { supabase } = require('../config/supabase');

class RawContactSqlReader {
    constructor() {
        this.tableName = 'raw_contact_captures';
    }

    async getRawContacts() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .order('captured_at', { ascending: false, nullsFirst: false });

            if (error) {
                throw new Error(`[RawContactSqlReader] DB Error: ${error.message}`);
            }

            return (data || []).map(row => this._mapRowToDto(row));
        } catch (error) {
            console.error('[RawContactSqlReader] getRawContacts Error:', error);
            throw error;
        }
    }

    async getRawContactByCardId(cardId) {
        if (!cardId) throw new Error('RawContactSqlReader: cardId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('card_id', cardId)
                .maybeSingle();

            if (error) {
                throw new Error(`[RawContactSqlReader] DB Error: ${error.message}`);
            }

            return data ? this._mapRowToDto(data) : null;
        } catch (error) {
            console.error('[RawContactSqlReader] getRawContactByCardId Error:', error);
            throw error;
        }
    }

    async getRawContactByLegacyRowIndex(rowIndex) {
        const normalizedRowIndex = this._normalizeLookupLegacyRowIndex(rowIndex);
        if (normalizedRowIndex == null) return null;

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('raw_payload->>legacy_row_index', String(normalizedRowIndex))
                .limit(2);

            if (error) {
                throw new Error(`[RawContactSqlReader] DB Error: ${error.message}`);
            }

            const rows = data || [];
            if (rows.length === 0) return null;
            if (rows.length > 1) {
                const err = new Error(`[RawContactSqlReader] Duplicate legacy_row_index: ${normalizedRowIndex}`);
                err.code = 'RAW_LEGACY_ROW_INDEX_DUPLICATE';
                err.legacyRowIndex = normalizedRowIndex;
                throw err;
            }

            return this._mapRowToDto(rows[0]);
        } catch (error) {
            console.error('[RawContactSqlReader] getRawContactByLegacyRowIndex Error:', error);
            throw error;
        }
    }

    _normalizeLookupLegacyRowIndex(value) {
        if (value === null || value === undefined) {
            throw new Error('RawContactSqlReader: invalid legacy rowIndex input');
        }

        if (typeof value === 'number') {
            if (!Number.isInteger(value) || value <= 0) {
                throw new Error('RawContactSqlReader: invalid legacy rowIndex input');
            }
            return value;
        }

        const raw = String(value).trim();
        if (!/^\d+$/.test(raw)) {
            throw new Error('RawContactSqlReader: invalid legacy rowIndex input');
        }

        const numeric = Number(raw);
        if (!Number.isInteger(numeric) || numeric <= 0) {
            throw new Error('RawContactSqlReader: invalid legacy rowIndex input');
        }
        return numeric;
    }

    _normalizeMappedLegacyRowIndex(value) {
        if (value === null || value === undefined || value === '') return null;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }

    _mapRowToDto(row) {
        if (!row) return null;

        const rawPayload = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
        const rowIndex = this._normalizeMappedLegacyRowIndex(rawPayload.legacy_row_index);

        return {
            cardId: row.card_id,
            rowIndex,
            createdTime: row.captured_at,
            name: row.name,
            company: row.company,
            position: row.position,
            jobTitle: row.position,
            department: row.department,
            phone: row.phone,
            mobile: row.mobile,
            fax: row.fax,
            email: row.email,
            website: row.website,
            address: row.address,
            driveFileId: row.drive_file_id,
            driveLink: row.drive_link,
            driveFilename: row.drive_filename,
            sourceFilename: row.source_filename,
            lineUserId: row.line_user_id,
            userNickname: row.user_nickname,
            sourceMessageId: row.source_message_id,
            exhibition_name: row.exhibition_name,
            is_exhibition: row.is_exhibition,
            notes: row.notes,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

module.exports = RawContactSqlReader;
