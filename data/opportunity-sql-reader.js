/**
 * data/opportunity-sql-reader.js
 * [Strict Digital Forensics Mode]
 * - Type: SQL Reader (Read-Only)
 * - Target: PostgreSQL (Supabase)
 * - Table: opportunities
 * - Version: 2.4.0 (Phase 5-A - Base Dataset SQL Pushdown for Sales Analysis)
 * - Date: 2026-04-21
 * - Changelog: 
 * - [PHASE 5-A] Added getSalesAnalysisBaseDeals() to push stage filtering to DB, reducing JS memory footprint.
 * - [PHASE 10] Added getAllOpportunityCompanyNames() for lightweight cross-module counting without FKs.
 * - [PHASE 9-D] Fixed post-pagination JS filtering. Migrated probability to native SQL.
 */

const { supabase } = require('../config/supabase');

class OpportunitySqlReader {

    constructor() {
        this.tableName = 'opportunities';
        this.viewName = 'v_opportunities_summary'; 
    }

    /**
     * [Phase 5-A] 專供 Sales Analysis 模組使用之基礎過濾資料
     * @description 將 stage 條件下推至 SQL 減少傳輸負載，並在 Node 端嚴格套用業務時間過濾規則。
     */
    async getSalesAnalysisBaseDeals(startDateISO, endDateISO) {
        try {
            // Push base filter (stage) to SQL directly to cut payload significantly
            const { data, error } = await supabase.from(this.viewName).select('*')
                .eq('current_stage', '受注');

            if (error) {
                // Fallback to table if view is missing
                if (error.code !== '42P01') throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
                const fallbackRes = await supabase.from(this.tableName).select('*').eq('current_stage', '受注');
                if (fallbackRes.error) throw new Error(`[OpportunitySqlReader] DB Error: ${fallbackRes.error.message}`);
                return this._applySalesAnalysisTimeFilter(fallbackRes.data, startDateISO, endDateISO);
            }

            return this._applySalesAnalysisTimeFilter(data, startDateISO, endDateISO);
        } catch (error) {
            console.error('[OpportunitySqlReader] getSalesAnalysisBaseDeals Error:', error);
            throw error;
        }
    }

    _applySalesAnalysisTimeFilter(data, startDateISO, endDateISO) {
        const start = startDateISO ? new Date(startDateISO) : new Date(0);
        const end = endDateISO ? new Date(endDateISO) : new Date();

        const filtered = (data || []).filter(row => {
            const dateStr = row.expected_close_date || row.updated_time;
            if (!dateStr) return false;
            const dealDate = new Date(dateStr);
            return dealDate >= start && dealDate <= end;
        });

        return filtered.map(row => this._mapRowToDto(row));
    }

    async getOpportunityYears() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('created_time');

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);

            const yearSet = new Set();
            (data || []).forEach(row => {
                if (row.created_time) {
                    const year = new Date(row.created_time).getFullYear();
                    if (!isNaN(year)) yearSet.add(year);
                }
            });

            return Array.from(yearSet).sort((a, b) => b - a);
        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunityYears Error:', error);
            throw error;
        }
    }

    async getAllOpportunityCompanyNames() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('customer_company');

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            return data || [];
        } catch (error) {
            console.error('[OpportunitySqlReader] getAllOpportunityCompanyNames Error:', error);
            throw error;
        }
    }

    async getOpportunityStats(startOfMonth) {
        if (!startOfMonth) throw new Error('OpportunitySqlReader: startOfMonth is required');

        try {
            const startIso = startOfMonth.toISOString();

            const [totalRes, monthRes] = await Promise.all([
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }),
                supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_time', startIso)
            ]);

            if (totalRes.error) throw new Error(`[OpportunitySqlReader] DB Error (total): ${totalRes.error.message}`);
            if (monthRes.error) throw new Error(`[OpportunitySqlReader] DB Error (month): ${monthRes.error.message}`);

            return {
                total: totalRes.count || 0,
                month: monthRes.count || 0
            };
        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunityStats Error:', error);
            throw error;
        }
    }

    async getOpportunityById(opportunityId) {
        if (!opportunityId) throw new Error('OpportunitySqlReader: opportunityId is required');

        try {
            const viewRes = await supabase.from(this.viewName).select('*').eq('opportunity_id', opportunityId).single();
            if (!viewRes.error && viewRes.data) {
                return this._mapRowToDto(viewRes.data);
            }

            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('opportunity_id', opportunityId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            }

            if (!data) return null;
            return this._mapRowToDto(data);

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunityById Error:', error);
            throw error;
        }
    }

    async getOpportunitiesByParentId(parentId) {
        if (!parentId) throw new Error('OpportunitySqlReader: parentId is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .eq('parent_opportunity_id', parentId);

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunitiesByParentId Error:', error);
            throw error;
        }
    }

    async getOpportunitiesByCompanyName(companyName) {
        if (!companyName) throw new Error('OpportunitySqlReader: companyName is required');

        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('*')
                .ilike('customer_company', `%${companyName}%`);

            if (error) throw new Error(`[OpportunitySqlReader] DB Error: ${error.message}`);
            return data.map(row => this._mapRowToDto(row));

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunitiesByCompanyName Error:', error);
            throw error;
        }
    }

    async getOpportunities() {
        try {
            const viewRes = await supabase.from(this.viewName).select('*');
            if (!viewRes.error && viewRes.data) {
                return viewRes.data.map(row => this._mapRowToDto(row));
            }

            const oppsPromise = supabase.from(this.tableName).select('*');
            const intsPromise = supabase.from('interactions').select('opportunity_id, interaction_time, created_time');

            const [oppsRes, intsRes] = await Promise.all([oppsPromise, intsPromise]);

            if (oppsRes.error) throw new Error(`[OpportunitySqlReader] DB Error: ${oppsRes.error.message}`);

            const latestIntMap = new Map();
            let interactionsFailed = false;

            if (intsRes.error) {
                console.warn('[OpportunitySqlReader] Degrade Mode Active: Interactions subquery failed.', intsRes.error.message);
                interactionsFailed = true;
            } else if (intsRes.data) {
                intsRes.data.forEach(int => {
                    const id = int.opportunity_id;
                    const time = new Date(int.interaction_time || int.created_time).getTime();
                    if (time && (!latestIntMap.has(id) || time > latestIntMap.get(id))) {
                        latestIntMap.set(id, time);
                    }
                });
            }

            return oppsRes.data.map(row => {
                const dto = this._mapRowToDto(row);
                if (!interactionsFailed) {
                    const lastInt = latestIntMap.get(dto.opportunityId) || 0;
                    if (lastInt > dto.effectiveLastActivity) {
                        dto.effectiveLastActivity = lastInt;
                    }
                }
                return dto;
            });

        } catch (error) {
            console.error('[OpportunitySqlReader] getOpportunities Error:', error);
            throw error;
        }
    }

    async searchOpportunitiesTable({ q, filters = {}, sortField, sortDirection, limit, offset }) {
        try {
            try {
                let dbQuery = supabase.from(this.viewName).select('*', { count: 'exact' });
                
                if (filters.type && filters.type !== 'all') dbQuery = dbQuery.eq('opportunity_type', filters.type);
                if (filters.source && filters.source !== 'all') dbQuery = dbQuery.eq('source', filters.source);
                if (filters.stage && filters.stage !== 'all') dbQuery = dbQuery.eq('current_stage', filters.stage);
                if (filters.channel && filters.channel !== 'all') dbQuery = dbQuery.eq('sales_channel', filters.channel);
                if (filters.scale && filters.scale !== 'all') dbQuery = dbQuery.eq('equipment_scale', filters.scale);
                
                if (filters.status && filters.status !== 'all') {
                    dbQuery = dbQuery.eq('current_status', filters.status);
                } else {
                    dbQuery = dbQuery.neq('current_status', '已封存');
                }
                
                if (filters.year && filters.year !== 'all') {
                    const y = parseInt(filters.year);
                    dbQuery = dbQuery.gte('created_time', `${y}-01-01T00:00:00Z`).lt('created_time', `${y + 1}-01-01T00:00:00Z`);
                }

                if (filters.probability && filters.probability !== 'all') {
                    dbQuery = dbQuery.gte('win_probability', Number(filters.probability));
                }

                if (q) {
                    dbQuery = dbQuery.or(`opportunity_name.ilike.%${q}%,customer_company.ilike.%${q}%`);
                }

                if (filters.time && filters.time !== 'all') {
                    const timeMap = { '7': 7, '30': 30, '90': 90 };
                    const days = timeMap[filters.time];
                    if (days) {
                        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                        dbQuery = dbQuery.gte('effective_last_activity', threshold);
                    }
                }

                const sortMap = {
                    effectiveLastActivity: 'effective_last_activity',
                    opportunityName: 'opportunity_name',
                    customerCompany: 'customer_company',
                    opportunityValue: 'opportunity_value',
                    createdTime: 'created_time',
                    lastUpdateTime: 'updated_time',
                    opportunityType: 'opportunity_type',
                    opportunitySource: 'source',
                    assignee: 'owner',
                    mainContact: 'main_contact',
                    salesModel: 'sales_model',
                    salesChannel: 'sales_channel',
                    currentStage: 'current_stage',
                    currentStatus: 'current_status',
                    expectedCloseDate: 'expected_close_date',
                    deviceScale: 'equipment_scale'
                };

                const dbColumn = sortMap[sortField] || 'effective_last_activity';
                
                dbQuery = dbQuery.order(dbColumn, { ascending: sortDirection === 'asc', nullsFirst: false });

                const requiresJsPostFilter = filters.potentialSpecification && filters.potentialSpecification !== 'all';

                if (!requiresJsPostFilter && limit && limit > 0) {
                    dbQuery = dbQuery.range(offset, offset + limit - 1);
                }

                const { data: viewData, count: viewCount, error: viewError } = await dbQuery;

                if (!viewError) {
                    let results = (viewData || []).map(row => this._mapRowToDto(row));
                    
                    if (requiresJsPostFilter) {
                        const val = filters.potentialSpecification;
                        results = results.filter(opp => {
                            const specData = opp.potentialSpecification;
                            if (!specData) return false;
                            try {
                                const parsedJson = JSON.parse(specData);
                                return typeof parsedJson === 'object' && parsedJson[val] > 0;
                            } catch (e) {
                                return typeof specData === 'string' && specData.includes(val);
                            }
                        });

                        const total = results.length;
                        if (limit && limit > 0) {
                            results = results.slice(offset, offset + limit);
                        }
                        return { data: results, total };
                    }

                    return { data: results, total: viewCount || results.length };
                }

                if (viewError && viewError.code !== '42P01') {
                    throw viewError; 
                }
            } catch (err) {
                if (err.code !== '42P01') {
                    console.error('[OpportunitySqlReader] View query failed:', err);
                }
            }

            console.warn('[OpportunitySqlReader] View v_opportunities_summary not found. Falling back to JS aggregation.');

            const isNativeSort = sortField && sortField !== 'effectiveLastActivity';
            
            const hasJsFilters = 
                (filters.time && filters.time !== 'all') ||
                (filters.potentialSpecification && filters.potentialSpecification !== 'all');

            const useFastPath = isNativeSort && !hasJsFilters;

            let query = useFastPath 
                ? supabase.from(this.tableName).select('*', { count: 'exact' })
                : supabase.from(this.tableName).select('*');

            if (filters.type && filters.type !== 'all') query = query.eq('opportunity_type', filters.type);
            if (filters.source && filters.source !== 'all') query = query.eq('source', filters.source);
            if (filters.stage && filters.stage !== 'all') query = query.eq('current_stage', filters.stage);
            if (filters.channel && filters.channel !== 'all') query = query.eq('sales_channel', filters.channel);
            if (filters.scale && filters.scale !== 'all') query = query.eq('equipment_scale', filters.scale);
            
            if (filters.probability && filters.probability !== 'all') {
                query = query.gte('win_probability', Number(filters.probability));
            }

            if (filters.status && filters.status !== 'all') {
                query = query.eq('current_status', filters.status);
            } else {
                query = query.neq('current_status', '已封存');
            }
            
            if (filters.year && filters.year !== 'all') {
                const y = parseInt(filters.year);
                query = query.gte('created_time', `${y}-01-01T00:00:00Z`).lt('created_time', `${y + 1}-01-01T00:00:00Z`);
            }

            if (q) {
                query = query.or(`opportunity_name.ilike.%${q}%,customer_company.ilike.%${q}%`);
            }

            if (useFastPath) {
                const sortMap = {
                    opportunityName: 'opportunity_name',
                    customerCompany: 'customer_company',
                    opportunityValue: 'opportunity_value',
                    createdTime: 'created_time',
                    lastUpdateTime: 'updated_time',
                    opportunityType: 'opportunity_type',
                    opportunitySource: 'source',
                    assignee: 'owner',
                    mainContact: 'main_contact',
                    salesModel: 'sales_model',
                    salesChannel: 'sales_channel',
                    currentStage: 'current_stage',
                    currentStatus: 'current_status',
                    expectedCloseDate: 'expected_close_date',
                    deviceScale: 'equipment_scale'
                };

                const dbColumn = sortMap[sortField] || 'updated_time';
                
                query = query.order(dbColumn, { ascending: sortDirection === 'asc', nullsFirst: false });

                if (limit && limit > 0) {
                    query = query.range(offset, offset + limit - 1);
                }

                const { data, count, error } = await query;
                if (error) throw new Error(`[OpportunitySqlReader] DB Error (Fast-Path): ${error.message}`);

                return { 
                    data: (data || []).map(row => this._mapRowToDto(row)), 
                    total: count || 0 
                };
            }

            const oppsRes = await query;
            if (oppsRes.error) throw new Error(`[OpportunitySqlReader] DB Error: ${oppsRes.error.message}`);
            
            const oppIds = oppsRes.data.map(o => o.opportunity_id);
            let latestIntMap = new Map();
            
            if (oppIds.length > 0) {
                const intsRes = await supabase.from('interactions')
                    .select('opportunity_id, interaction_time, created_time')
                    .in('opportunity_id', oppIds);
                    
                if (!intsRes.error && intsRes.data) {
                    intsRes.data.forEach(int => {
                        const id = int.opportunity_id;
                        const time = new Date(int.interaction_time || int.created_time).getTime();
                        if (time && (!latestIntMap.has(id) || time > latestIntMap.get(id))) {
                            latestIntMap.set(id, time);
                        }
                    });
                }
            }

            let results = oppsRes.data.map(row => {
                const dto = this._mapRowToDto(row);
                const lastInt = latestIntMap.get(dto.opportunityId) || 0;
                if (lastInt > dto.effectiveLastActivity) {
                    dto.effectiveLastActivity = lastInt;
                }
                return dto;
            });

            if (filters.potentialSpecification && filters.potentialSpecification !== 'all') {
                const val = filters.potentialSpecification;
                results = results.filter(opp => {
                    const specData = opp.potentialSpecification;
                    if (!specData) return false;
                    try {
                        const parsedJson = JSON.parse(specData);
                        return typeof parsedJson === 'object' && parsedJson[val] > 0;
                    } catch (e) {
                        return typeof specData === 'string' && specData.includes(val);
                    }
                });
            }
            
            if (filters.time && filters.time !== 'all') {
                const timeMap = { '7': 7, '30': 30, '90': 90 };
                const days = timeMap[filters.time];
                if (days) {
                    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
                    results = results.filter(opp => opp.effectiveLastActivity >= threshold);
                }
            }

            if (sortField) {
                 results.sort((a, b) => {
                     let valA = a[sortField];
                     let valB = b[sortField];
                     if (valA === undefined || valA === null) valA = '';
                     if (valB === undefined || valB === null) valB = '';
                     
                     if (typeof valA === 'number' && typeof valB === 'number') {
                         return sortDirection === 'asc' ? valA - valB : valB - valA;
                     }
                     return sortDirection === 'asc' 
                         ? String(valA).localeCompare(String(valB), 'zh-Hant') 
                         : String(valB).localeCompare(String(valA), 'zh-Hant');
                 });
            } else {
                 results.sort((a, b) => b.effectiveLastActivity - a.effectiveLastActivity);
            }

            const total = results.length;
            if (limit && limit > 0) {
                results = results.slice(offset, offset + limit);
            }

            return { data: results, total };

        } catch (error) {
            console.error('[OpportunitySqlReader] searchOpportunitiesTable Error:', error);
            throw error;
        }
    }

    _mapRowToDto(row) {
        if (!row) return null;

        const dto = {
            opportunityId: row.opportunity_id,
            parentOpportunityId: row.parent_opportunity_id,
            opportunityName: row.opportunity_name,
            opportunityType: row.opportunity_type,
            opportunitySource: row.source, 
            assignee: row.owner, 
            customerCompany: row.customer_company,
            mainContact: row.main_contact,
            endCustomerContact: row.end_customer_contact,
            channelContact: row.channel_contact,
            salesModel: row.sales_model,
            salesChannel: row.sales_channel,
            channelDetails: row.sales_channel, 
            currentStage: row.current_stage,
            currentStatus: row.current_status,
            expectedCloseDate: row.expected_close_date,
            orderProbability: row.win_probability, 
            opportunityValue: row.opportunity_value,
            valueCalcMode: row.value_calc_mode,
            opportunityValueType: row.value_calc_mode, 
            deviceScale: row.equipment_scale, 
            potentialSpecification: row.product_details, 
            notes: row.notes,
            driveFolderLink: row.drive_link, 
            stageHistory: row.stage_history,
            createdTime: row.created_time,
            lastUpdateTime: row.updated_time, 
            updatedBy: row.updated_by
        };

        if (row.effective_last_activity) {
            dto.effectiveLastActivity = new Date(row.effective_last_activity).getTime();
        } else {
            dto.effectiveLastActivity = new Date(dto.lastUpdateTime || dto.createdTime || 0).getTime();
        }

        return dto;
    }
}

module.exports = OpportunitySqlReader;