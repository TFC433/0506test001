/*
 * FILE: data/event-log-sql-writer.js
 * VERSION: Phase 8.7-SingleTable-Fix
 * DATE: 2026-03-06
 * PURPOSE:
 * - Fix Worldview: Four full event tables (General, IoT, DT, DX).
 * - Single-table existence enforced.
 * - Same-type edit: Update current table.
 * - Type change: Move event (Read -> Merge -> Delete Old -> Clean Target -> Insert New).
 * - Payload normalization to schema columns.
 */

const { supabase } = require('../config/supabase');

class EventLogSqlWriter {
  async createEventLog(payload) {
    try {
      // STEP 1 — Detect Target Table
      const eventType = payload.eventType || payload.event_type || 'general';
      const tableMap = {
        general: 'event_logs_general',
        iot: 'event_logs_iot',
        dt: 'event_logs_dt',
        dx: 'event_logs_dx'
      };
      const targetTable = tableMap[eventType] || 'event_logs_general';

      // STEP 2 — Define Allowed Columns (Schema Enforcement)
      const COMMON_COLS = [
        'event_id',
        'event_name',
        'opportunity_id',
        'company_id',
        'creator',
        'created_time',
        'last_modified_time',
        'our_participants',
        'client_participants',
        'visit_place',
        'event_content',
        'client_questions',
        'client_intelligence',
        'event_notes',
        'edit_count'
      ];

      const IOT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'line_features',
        'production_status',
        'iot_status',
        'pain_category',
        'pain_description',
        'pain_analysis',
        'system_architecture'
      ];

      const DT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'processing_type',
        'industry'
      ];

      const DX_COLS = [...COMMON_COLS];
      const GENERAL_COLS = [...COMMON_COLS];

      const colMap = {
        'event_logs_general': GENERAL_COLS,
        'event_logs_iot': IOT_COLS,
        'event_logs_dt': DT_COLS,
        'event_logs_dx': DX_COLS
      };

      const targetAllowedCols = new Set(colMap[targetTable] || []);

      // STEP 3 — Normalize & Filter Payload
      const insertData = {};
      const keyMap = {
        'iot_deviceScale': 'device_scale',
        'iot_lineFeatures': 'line_features',
        'iot_productionStatus': 'production_status',
        'iot_iotStatus': 'iot_status',
        'iot_painPoints': 'pain_category',
        'iot_painPointDetails': 'pain_description',
        'iot_painPointAnalysis': 'pain_analysis',
        'iot_systemArchitecture': 'system_architecture',
        'dt_deviceScale': 'device_scale',
        'dt_processingType': 'processing_type',
        'dt_industry': 'industry'
      };

      Object.keys(payload).forEach(key => {
        // Remove meta keys
        if (['eventType', 'event_type', 'payload'].includes(key)) return;

        // Normalize key
        const dbKey = keyMap[key] || key;

        // Value normalization
        let val = payload[key];
        if (val === "") val = null;

        // Filter by allowed columns & skip undefined
        if (val !== undefined && targetAllowedCols.has(dbKey)) {
            insertData[dbKey] = val;
        }
      });

      // STEP 4 — Forensic Logs
      console.log(`[EventLogSqlWriter][FORensics][CREATE] targetTable=${targetTable}`);
      console.log(`[EventLogSqlWriter][FORensics][CREATE] normalized keys=${Object.keys(insertData).join(',')}`);

      // STEP 5 — Insert
      const { data, error } = await supabase
        .from(targetTable)
        .insert([insertData])
        .select('event_id')
        .single();

      if (error) throw error;
      return { success: true, id: data.event_id };

    } catch (error) {
      console.error('[EventLogSqlWriter] createEventLog Error:', error);
      throw error;
    }
  }

  async updateEventLog(eventId, payload) {
    try {
      // STEP 1 — Detect Incoming Type & Target Table
      const eventType = payload.eventType || payload.event_type || 'general';
      
      const tableMap = {
        general: 'event_logs_general',
        iot: 'event_logs_iot',
        dt: 'event_logs_dt',
        dx: 'event_logs_dx'
      };
      const targetTable = tableMap[eventType] || 'event_logs_general';

      // STEP 2 — Detect Current Existing Table
      const tables = ['event_logs_general', 'event_logs_iot', 'event_logs_dt', 'event_logs_dx'];
      let currentTable = null;
      let oldRow = null;

      // Search tables in order
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle();
        
        if (data) {
          currentTable = table;
          oldRow = data;
          break; 
        }
      }

      if (!currentTable) {
        throw new Error(`Event ${eventId} not found in any known table.`);
      }

      // STEP 3 — Define Allowed Columns
      const COMMON_COLS = [
        'event_id',
        'event_name',
        'opportunity_id',
        'company_id',
        'creator',
        'created_time',
        'last_modified_time',
        'our_participants',
        'client_participants',
        'visit_place',
        'event_content',
        'client_questions',
        'client_intelligence',
        'event_notes',
        'edit_count'
      ];

      const IOT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'line_features',
        'production_status',
        'iot_status',
        'pain_category',
        'pain_description',
        'pain_analysis',
        'system_architecture'
      ];

      const DT_COLS = [
        ...COMMON_COLS,
        'device_scale',
        'processing_type',
        'industry'
      ];

      const DX_COLS = [...COMMON_COLS];
      const GENERAL_COLS = [...COMMON_COLS];

      const colMap = {
        'event_logs_general': GENERAL_COLS,
        'event_logs_iot': IOT_COLS,
        'event_logs_dt': DT_COLS,
        'event_logs_dx': DX_COLS
      };

      const targetAllowedCols = new Set(colMap[targetTable] || []);

      // STEP 4 — Normalize Incoming Payload Keys
      const normalizedPayload = {};
      const keyMap = {
        'iot_deviceScale': 'device_scale',
        'iot_lineFeatures': 'line_features',
        'iot_productionStatus': 'production_status',
        'iot_iotStatus': 'iot_status',
        'iot_painPoints': 'pain_category',
        'iot_painPointDetails': 'pain_description',
        'iot_painPointAnalysis': 'pain_analysis',
        'iot_systemArchitecture': 'system_architecture',
        'dt_deviceScale': 'device_scale',
        'dt_processingType': 'processing_type',
        'dt_industry': 'industry'
      };

      Object.keys(payload).forEach(key => {
        // Remove meta keys
        if (['eventType', 'event_type', 'payload'].includes(key)) return;

        // Map or keep original
        const dbKey = keyMap[key] || key;
        normalizedPayload[dbKey] = payload[key];
      });

      // STEP 7 — Forensic Logs (Pre-Action)
      const sameType = (currentTable === targetTable);
      
      console.log(`[EventLogSqlWriter][FORensics] currentTable=${currentTable}`);
      console.log(`[EventLogSqlWriter][FORensics] targetTable=${targetTable}`);
      console.log(`[EventLogSqlWriter][FORensics] sameType=${sameType}`);
      console.log(`[EventLogSqlWriter][FORensics] normalized keys=${Object.keys(normalizedPayload).join(',')}`);

      let filteredKeys = [];
      let movedRow = false;

      // STEP 5 & 6 — Execution Logic
      if (sameType) {
        // --- SAME TYPE EDIT ---
        const updateData = {};
        Object.keys(normalizedPayload).forEach(key => {
          if (targetAllowedCols.has(key)) {
            updateData[key] = normalizedPayload[key];
          }
        });
        
        // Remove event_id from update payload (PK)
        delete updateData.event_id;

        filteredKeys = Object.keys(updateData);
        console.log(`[EventLogSqlWriter][FORensics] filtered keys=${filteredKeys.join(',')}`);
        console.log(`[EventLogSqlWriter][FORensics] movedRow=${movedRow}`);

        const { data, error } = await supabase
          .from(currentTable)
          .update(updateData)
          .eq('event_id', eventId)
          .select('event_id');

        if (error) throw error;
        
        if (!data || data.length === 0) {
           return { success: false, message: 'Row not found during update.' };
        }

      } else {
        // --- TYPE CHANGE (MOVE) ---
        movedRow = true;
        
        // 1. Merge (Old Row + New Data)
        const mergedRow = { ...oldRow, ...normalizedPayload };
        mergedRow.event_id = eventId; // Ensure PK is present

        // 2. Filter for Target Table
        const insertData = {};
        Object.keys(mergedRow).forEach(key => {
          if (targetAllowedCols.has(key)) {
            insertData[key] = mergedRow[key];
          }
        });

        filteredKeys = Object.keys(insertData);
        console.log(`[EventLogSqlWriter][FORensics] filtered keys=${filteredKeys.join(',')}`);
        console.log(`[EventLogSqlWriter][FORensics] movedRow=${movedRow}`);

        // 3. Delete from Old Table
        const { error: delError } = await supabase
          .from(currentTable)
          .delete()
          .eq('event_id', eventId);
        
        if (delError) {
          console.error(`[EventLogSqlWriter] Move failed: Delete from ${currentTable} error:`, delError);
          throw delError;
        }
        console.log(`[EventLogSqlWriter] Old row deleted from ${currentTable}`);

        // 4. Clean Target Table (Prevent Unique Constraint Violation)
        // Even though it shouldn't be there, we must ensure it's gone before insert
        const { data: cleanData, error: cleanError } = await supabase
          .from(targetTable)
          .delete()
          .eq('event_id', eventId)
          .select('event_id');

        if (cleanError) {
            console.error(`[EventLogSqlWriter] Move failed: Clean target ${targetTable} error:`, cleanError);
            throw cleanError;
        }
        
        const clearedTargetTableRow = (cleanData && cleanData.length > 0);
        console.log(`[EventLogSqlWriter][FORensics] clearedTargetTableRow=${clearedTargetTableRow}`);

        // 5. Insert into New Table
        const { error: insError } = await supabase
          .from(targetTable)
          .insert([insertData]);

        if (insError) {
          console.error(`[EventLogSqlWriter] Move failed: Insert into ${targetTable} error:`, insError);
          throw insError;
        }
        console.log(`[EventLogSqlWriter] New row inserted into ${targetTable}`);
      }

      return { success: true };

    } catch (error) {
      console.error('[EventLogSqlWriter] updateEventLog Error:', error);
      throw error;
    }
  }

  async deleteEventLog(eventId) {
    try {
      // Search tables in order to find where to delete from
      const tables = ['event_logs_general', 'event_logs_iot', 'event_logs_dt', 'event_logs_dx'];
      let deleted = false;

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq('event_id', eventId)
          .select('event_id');

        if (error) {
             console.warn(`[EventLogSqlWriter] Delete check on ${table} failed:`, error.message);
             continue;
        }

        if (data && data.length > 0) {
            deleted = true;
            // Assuming uniqueness across tables, we can stop, 
            // but for safety in this transition phase, we could check others.
            // For now, let's assume one hit is enough.
            break; 
        }
      }

      if (!deleted) {
        return { success: false, message: 'Event not found' };
      }
      return { success: true };

    } catch (error) {
      console.error('[EventLogSqlWriter] deleteEventLog Error:', error);
      throw error;
    }
  }
}

module.exports = EventLogSqlWriter;