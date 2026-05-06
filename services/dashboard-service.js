// services/dashboard-service.js
/*
Forensics Checklist:
- [x] 目標檔案確認：services/dashboard-service.js
- [x] 邏輯對齊目標：Dashboard KPI "成交件數 / 本月成交件數" 與 Trend / Sales Analysis 邏輯完全一致。
- [x] 變更點 1：wonCountPromise 改為 `.eq('current_stage', '受注')`。
- [x] 變更點 2：wonMonthPromise 改為包含 expected_close_date 與 updated_time 的 fallback `.or(...)` 查詢。
- [x] 變更點 3：保留 Trend Widget 已完成的 lightweightWonPromise 與時間迴圈修改。
- [x] 副作用檢查：不更動 trendData、revenue、其他 KPI 及 DI 邏輯。

Constructor / DI 順序驗證:
constructor(config, contactService, eventLogSqlReader, systemReader, weeklyBusinessService, calendarService, contactSqlReader, interactionSqlReader, companySqlReader, opportunitySqlReader, systemService)
- 結果：DI 順序與原代碼完全一致，未順手增刪。

原始碼證明 (修改前):
// 原 wonCountPromise
const wonCountPromise = supabase.from('opportunities')
    .select('opportunity_id', { count: 'exact', head: true })
    .or('current_stage.in.(受注,已成交),current_status.eq.已完成');
    
// 原 wonMonthPromise
const wonMonthPromise = supabase.from('opportunities')
    .select('opportunity_id', { count: 'exact', head: true })
    .or('current_stage.in.(受注,已成交),current_status.eq.已完成')
    .gte('updated_time', startOfMonthIso);
*/
// ============================================================================
// File: services/dashboard-service.js
// ============================================================================
/**
 * services/dashboard-service.js
 * 儀表板業務邏輯層 (Dashboard Aggregator)
 * @version 2.8.10
 * @date 2026-04-29
 * @changelog
 * - [HOTFIX] Align Dashboard KPI Won Count logic with Trend & Sales Analysis
 * - total count now strictly uses current_stage = '受注'
 * - monthly count uses expected_close_date with updated_time fallback
 * - ensures KPI, Trend, and Sales Analysis are fully consistent
 * - [HOTFIX] Align Dashboard Trend Won/Revenue logic EXACTLY with Sales Analysis by using expected_close_date and strictly filtering stage '受注'.
 * - [PHASE T3-Revenue] Dashboard Phase T3-Revenue - Add 成交金額 column series aligned with KPI won cohort.
 * - [HOTFIX] Fixed ReferenceError: Cannot access 'wonCountRes' before initialization in batch3 Promise.all.
 * - [PHASE T3-Won] Dashboard Phase T3-Won - Add 成交案件 trend series aligned with KPI won logic.
 * - [PHASE T2.1] Dashboard Phase T2.1 Trend Widget final semantics alignment.
 * - [PHASE T2] Official release of Dashboard Trend Widget with Cumulative view.
 * - [PHASE T1/T1.1] Added trendData (opportunities and event logs) to getDashboardData payload.
 * - Implemented MTU/SI details lazy loading logic (getCompanyActivityDetails).
 * - Removed activeNames/inactiveNames array construction from main dashboard payload to reduce bloat.
 * - Added in-memory TTL cache for RAW contact stats to prevent O(N) hydration loop on every load.
 * - Added invalidateRawContactStatsCache() hook for global cache invalidation.
 * - [PHASE D-2] backend dashboard range support added for safe analytical sections
 * - [PHASE D-2] operational dashboard sections intentionally left unfiltered
 * - [PHASE C-2.4] RAW contacts dashboard stats made non-blocking
 * - [PHASE C-2.4] dashboard initial render no longer waits for Google Sheet contact stats
 * - [PHASE C-2.3] followUpCount moved toward SQL-first counting
 * - [PHASE C-2.3] reduced in-memory follow-up aggregation load with JS fallback
 * - [PHASE C-2.2] Align SI KPI with has_activity-based logic
 * - [PHASE C-2.2] Remove first_activity as primary SI activity condition
 * - [PHASE C-2.1-E] MTU KPI switched to has_activity-based visited logic
 * - [PHASE C-2.1-E] first_activity no longer used as the primary visited-MTU condition
 * - [PHASE C-2.1-D] MTU / SI activity aggregation moved to one SQL-first flow
 * - [PHASE C-2.1-D] Node-side dashboard aggregation further reduced
 * - [PHASE C-2.1-C] MTU / SI activity aggregation moved to SQL
 * - [PHASE C-2.1-C] Node-side dashboard aggregation reduced
 * - [PHASE C-2.1-B] moved MTU / SI activity aggregation toward SQL
 * - [PHASE C-2.1] Moved KPI aggregation (Won Counts) to direct SQL COUNT.
 * - [PHASE C-2.1] Reduced full-table hydration for opportunities and companies using SQL projection.
 * - [PHASE C-2.1] Pushed down Kanban/Follow-up filters to SQL to eliminate in-memory array bloat.
 */

const { supabase } = require('../config/supabase');

class DashboardService {
    constructor(
        config,
        contactService,
        eventLogSqlReader, 
        systemReader,
        weeklyBusinessService,
        calendarService,
        contactSqlReader,
        interactionSqlReader,
        companySqlReader,
        opportunitySqlReader,
        systemService
    ) {
        if (!contactService || !config || !eventLogSqlReader) {
            throw new Error('[DashboardService] 初始化失敗：缺少必要的 Reader/Service 或 Config');
        }

        this.config = config;
        this.contactService = contactService;
        this.eventLogSqlReader = eventLogSqlReader;
        this.systemReader = systemReader;
        this.weeklyBusinessService = weeklyBusinessService;
        this.calendarService = calendarService;
        this.contactSqlReader = contactSqlReader;
        this.interactionSqlReader = interactionSqlReader;
        this.companySqlReader = companySqlReader;
        this.opportunitySqlReader = opportunitySqlReader;
        this.systemService = systemService;

        // [PHASE C-2.4 PATCH] In-memory TTL Cache for RAW Contact Stats
        this._rawContactStatsCache = null;
        this._rawContactStatsCacheTime = 0;
        this._RAW_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    invalidateRawContactStatsCache() {
        this._rawContactStatsCache = null;
        this._rawContactStatsCacheTime = 0;
    }

    _getWeekId(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    // [PHASE D-2] Helper to resolve global date range
    _resolveDateRange(options) {
        let start = null;
        let end = null;
        const now = new Date();

        if (options.start) {
            start = new Date(options.start);
        }
        if (options.end) {
            end = new Date(options.end);
            end.setHours(23, 59, 59, 999);
        }

        if (options.range) {
            switch (options.range) {
                case 'ytd':
                    start = new Date(now.getFullYear(), 0, 1);
                    end = null; // up to now
                    break;
                case '30d':
                    start = new Date(now);
                    start.setDate(start.getDate() - 30);
                    end = null;
                    break;
                case 'all':
                    start = null;
                    end = null;
                    break;
            }
        }
        return { start, end };
    }

    async getDashboardData(options = {}) {
        console.log('📊 [DashboardService] 執行主儀表板資料整合 (Phase C-2.1 SQL-First Mode)...');

        // [PHASE D-2] Resolve global range filters for SAFE analytical metrics
        const { start: rangeStart, end: rangeEnd } = this._resolveDateRange(options);

        const today = new Date();
        const thisWeekId = this._getWeekId(today);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const companyPromise = this.companySqlReader ? this.companySqlReader.getCompanies() : Promise.resolve([]);

        // =================================================================
        // Parallel Data Fetch Groups
        // =================================================================

        // --- Batch 1: Core Business Data ---
        const batch1Promise = (async () => {
            // [PHASE C-2.1] Pushdown filters to SQL: Fetch only active deals for UI
            const activeOppsPromise = this.opportunitySqlReader.searchOpportunitiesTable
                ? this.opportunitySqlReader.searchOpportunitiesTable({ filters: { status: '進行中' }, limit: 1000, offset: 0 }).then(res => res.data || [])
                : this.opportunitySqlReader.getOpportunities().then(all => all.filter(o => o.currentStatus === '進行中'));

            // [PHASE C-2.1] Lightweight cross-domain projection for stats and names
            const lightweightOppsPromise = supabase.from('opportunities')
                .select('opportunity_id, opportunity_name, customer_company, created_time');
            
            // Lightweight fetch for event dates for trend widget across 5 partitioned tables
            const lightweightEventsPromise = Promise.all(
                ['event_logs_general', 'event_logs_iot', 'event_logs_dt', 'event_logs_dx', 'event_logs_summary']
                .map(t => supabase.from(t).select('created_time').then(res => res.data || []).catch(() => []))
            ).then(results => ({ data: results.flat() }));

            const lightweightWonPromise = supabase.from('opportunities')
                .select('updated_time, expected_close_date, opportunity_value')
                .eq('current_stage', '受注');
            
            // [PHASE 9-A] Targeted SQL reads instead of full table hydration
            const intActivityPromise = typeof this.interactionSqlReader.getInteractionActivities === 'function'
                ? this.interactionSqlReader.getInteractionActivities()
                : this.interactionSqlReader.getInteractions(); // Fallback
                
            const recentIntPromise = typeof this.interactionSqlReader.getRecentInteractionsFeed === 'function'
                ? this.interactionSqlReader.getRecentInteractionsFeed(5)
                : Promise.resolve([]);

            return await Promise.all([activeOppsPromise, lightweightOppsPromise, intActivityPromise, recentIntPromise, lightweightEventsPromise, lightweightWonPromise]);
        })();

        // --- Batch 2: Secondary / Reference Data ---
        const batch2Promise = (async () => {
            const calendarPromise = this.calendarService ? this.calendarService.getThisWeekEvents() : Promise.resolve({ todayEvents: [], todayCount: 0, weekCount: 0 });
            const systemPromise = this.systemService ? this.systemService.getSystemConfig() : Promise.resolve({});
            
            const recentContactsPromise = typeof this.contactSqlReader.getRecentContactsFeed === 'function' 
                ? this.contactSqlReader.getRecentContactsFeed(5)
                : Promise.resolve([]);

            return await Promise.all([
                calendarPromise,
                systemPromise,
                companyPromise,
                recentContactsPromise
            ]);
        })();

        // --- Batch 3: SQL Aggregation Stats & RAW Contacts ---
        const batch3Promise = (async () => {
            const opportunityStatsPromise = this.opportunitySqlReader.getOpportunityStats(startOfMonth);
            const eventStatsPromise = this.eventLogSqlReader.getEventLogStats(startOfMonth);

            const companies = await companyPromise;
            
            const normalize = (name) => (name || '').trim().toLowerCase();
            const isStrictMTU = (type) => normalize(type) === 'mtu';
            const isSI = (type) => /SI|系統整合|System Integrator/i.test(type || '');

            const targetCompanyIds = companies
                .filter(c => isStrictMTU(c.companyType) || isSI(c.companyType))
                .map(c => c.companyId)
                .filter(Boolean);

            const eventActivityPromise = typeof this.companySqlReader.getTargetCompanyEventActivities === 'function' && targetCompanyIds.length > 0
                ? this.companySqlReader.getTargetCompanyEventActivities(targetCompanyIds)
                : Promise.resolve([]);

            // [PHASE C-2.1] SQL KPI Aggregation (Replacing in-memory fetch and filter)
            const wonCountPromise = supabase.from('opportunities')
                .select('opportunity_id', { count: 'exact', head: true })
                .eq('current_stage', '受注');
                
            const startOfMonthIso = startOfMonth.toISOString();
            const wonMonthPromise = supabase.from('opportunities')
                .select('opportunity_id', { count: 'exact', head: true })
                .or(`and(current_stage.eq.受注,expected_close_date.gte.${startOfMonthIso}),and(current_stage.eq.受注,expected_close_date.is.null,updated_time.gte.${startOfMonthIso})`);

            // [PHASE C-2.3] SQL-first Follow-up Count
            const daysThreshold = (this.config.FOLLOW_UP && this.config.FOLLOW_UP.DAYS_THRESHOLD) || 7;
            const activeStages = (this.config.FOLLOW_UP && this.config.FOLLOW_UP.ACTIVE_STAGES) || ['01_初步接觸', '02_需求確認', '03_提案報價', '04_談判修正'];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - daysThreshold);
            const thresholdIso = sevenDaysAgo.toISOString();

            const followUpCountPromise = supabase.from('opportunities')
                .select('opportunity_id', { count: 'exact', head: true })
                .eq('current_status', '進行中')
                .in('current_stage', activeStages)
                .or(`effective_last_activity.lt.${thresholdIso},and(effective_last_activity.is.null,created_time.lt.${thresholdIso})`);

            // [PHASE D-2] Safe Analytical Metrics Explicit Range Overrides
            let rangeOppsPromise = Promise.resolve(null);
            let rangeEventsPromise = Promise.resolve(null);

            if (rangeStart || rangeEnd) {
                let oppsQuery = supabase.from('opportunities').select('*', { count: 'exact', head: true });
                let eventsQuery = supabase.from('event_logs').select('*', { count: 'exact', head: true });

                if (rangeStart) {
                    const startIso = rangeStart.toISOString();
                    oppsQuery = oppsQuery.gte('created_time', startIso);
                    eventsQuery = eventsQuery.gte('created_time', startIso);
                }
                if (rangeEnd) {
                    const endIso = rangeEnd.toISOString();
                    oppsQuery = oppsQuery.lte('created_time', endIso);
                    eventsQuery = eventsQuery.lte('created_time', endIso);
                }
                
                rangeOppsPromise = oppsQuery;
                rangeEventsPromise = eventsQuery;
            }

            const [
                opportunityStats, 
                eventStats, 
                eventActivities, 
                wonCountRes, 
                wonMonthRes, 
                followUpCountRes, 
                rangeOppsRes, 
                rangeEventsRes
            ] = await Promise.all([
                opportunityStatsPromise,
                eventStatsPromise,
                eventActivityPromise,
                wonCountPromise,
                wonMonthPromise,
                followUpCountPromise,
                rangeOppsPromise,
                rangeEventsPromise
            ]);

            // [PHASE C-2.4] RAW Contacts moved to non-blocking endpoint
            const contactStats = { total: '...', month: 0 };

            return [
                contactStats,
                opportunityStats,
                eventStats,
                eventActivities,
                wonCountRes,
                wonMonthRes,
                followUpCountRes,
                rangeOppsRes,
                rangeEventsRes
            ];
        })();

        // --- Weekly Details: Weekly Business Data Integration ---
        const weeklyPromise = (async () => {
            let thisWeeksEntries = [];
            let thisWeekDetails = { title: '載入中...', days: [] };

            if (this.weeklyBusinessService) {
                try {
                    const fullDetails = await this.weeklyBusinessService.getWeeklyDetails(thisWeekId);
                    if (fullDetails) {
                        thisWeekDetails = fullDetails;
                        thisWeeksEntries = fullDetails.entries || [];
                    }
                } catch (error) {
                    console.error(`[DashboardService] 週間業務載入失敗 (${thisWeekId}):`, error.message);
                    thisWeekDetails = {
                        title: `Week ${thisWeekId} (載入失敗)`,
                        days: [],
                        month: today.getMonth() + 1,
                        weekOfMonth: '?',
                        shortDateRange: ''
                    };
                }
            }
            return { thisWeeksEntries, thisWeekDetails };
        })();

        // =================================================================
        // Resolve All Parallel Groups
        // =================================================================
        const [batch1Result, batch2Result, batch3Result, weeklyResult] = await Promise.all([
            batch1Promise,
            batch2Promise,
            batch3Promise,
            weeklyPromise
        ]);

        // =================================================================
        // 資料處理與統計邏輯 (Post-Fetch Aggregation)
        // =================================================================
        
        const [activeOpportunitiesRaw, lightweightOppsRes, interactionActivities, recentInteractions, lightweightEventsRes, lightweightWonRes] = batch1Result;
        
        const [calendarData, systemConfig, companies, recentContactsRaw] = batch2Result;
        const [
            contactStats, 
            opportunityStats, 
            eventStats, 
            eventActivities, 
            wonCountRes, 
            wonMonthRes, 
            followUpCountRes,
            rangeOppsRes,
            rangeEventsRes
        ] = batch3Result;
        const { thisWeeksEntries, thisWeekDetails } = weeklyResult;

        const normalize = (name) => (name || '').trim().toLowerCase();
        const isStrictMTU = (type) => normalize(type) === 'mtu';
        const isSI = (type) => /SI|系統整合|System Integrator/i.test(type || '');

        const activeOpportunities = activeOpportunitiesRaw.sort((a, b) => b.effectiveLastActivity - a.effectiveLastActivity);
        const lightweightOpps = lightweightOppsRes.data || [];

        // =================================================================
        // PHASE C-2.1-D/E SQL-FIRST AGGREGATION: MTU / SI Activity
        // =================================================================
        let mtuCount = 0;
        let mtuNewMonth = 0;
        let inactiveMtuCount = 0;
        let totalMtu = 0;

        let siCount = 0;
        let siNewMonth = 0;
        let inactiveSiCount = 0;
        let totalSi = 0;

        try {
            // 1. ONE SQL-First flow returning aggregated per-company activity.
            // Assumes DB provides v_company_activity_summary with UNION ALL & MIN() logic.
            const { data: targetCompanies, error } = await supabase
                .from('v_company_activity_summary')
                .select('company_id, company_name, company_type, first_activity, has_activity')
                .or('company_type.ilike.%mtu%,company_type.ilike.%si%,company_type.ilike.%系統整合%,company_type.ilike.%system integrator%');

            if (error) {
                console.error('[DashboardService] MTU/SI SQL View Error:', error);
            }

            const safeTargets = targetCompanies || [];

            // 2. Node.js only formats the final stats from the aggregated company rows
            safeTargets.forEach(comp => {
                const isMtu = isStrictMTU(comp.company_type);
                const isSi = isSI(comp.company_type);
                
                // Visited logic is now driven by has_activity
                const isActive = comp.has_activity === true;

                // first_activity is provided directly by SQL aggregation for month tracking
                const firstTime = comp.first_activity ? new Date(comp.first_activity).getTime() : Infinity;
                const isNewThisMonth = isActive && firstTime !== Infinity && !isNaN(firstTime) && (firstTime >= startOfMonth.getTime());

                if (isMtu) {
                    totalMtu++;
                    if (isActive) {
                        mtuCount++;
                        if (isNewThisMonth) mtuNewMonth++;
                    } else {
                        inactiveMtuCount++;
                    }
                }

                if (isSi) {
                    totalSi++;
                    if (isActive) {
                        siCount++;
                        if (isNewThisMonth) siNewMonth++;
                    } else {
                        inactiveSiCount++;
                    }
                }
            });
        } catch (error) {
            console.error('[DashboardService] SQL-First MTU/SI aggregation failed:', error);
        }

        // [PHASE C-2.1] SQL-based KPI aggregation replaces JS filtering
        const wonCount = wonCountRes ? (wonCountRes.count || 0) : 0;
        const wonCountMonth = wonMonthRes ? (wonMonthRes.count || 0) : 0;

        // Passed directly to rely on SQL-computed metric fallback
        const followUps = this._getFollowUpOpportunities(activeOpportunities);

        // [PHASE C-2.3] SQL-first Follow-Up Count with JS Fallback
        let followUpCount = 0;
        if (followUpCountRes && followUpCountRes.error) {
            console.warn('[DashboardService] SQL FollowUp count failed, falling back to JS:', followUpCountRes.error.message);
            followUpCount = followUps.length;
        } else if (followUpCountRes) {
            followUpCount = followUpCountRes.count || 0;
        }

        // [PHASE D-2] Resolve final count metrics
        let finalOppsCount = opportunityStats.total;
        if (rangeOppsRes && !rangeOppsRes.error) {
            finalOppsCount = rangeOppsRes.count;
        }

        let finalEventsCount = eventStats.total;
        if (rangeEventsRes && !rangeEventsRes.error) {
            finalEventsCount = rangeEventsRes.count;
        }

        const stats = {
            contactsCount: contactStats.total,
            opportunitiesCount: finalOppsCount,
            eventLogsCount: finalEventsCount,
            wonCount: wonCount,
            wonCountMonth: wonCountMonth,
            mtuCount: mtuCount,
            mtuCountMonth: mtuNewMonth,
            siCount: siCount,
            siCountMonth: siNewMonth,
            mtuDetails: {
                totalMtu: totalMtu,
                activeCount: mtuCount,
                inactiveCount: inactiveMtuCount
            },
            siDetails: {
                totalSi: totalSi,
                activeCount: siCount,
                inactiveCount: inactiveSiCount
            },
            todayEventsCount: calendarData.todayCount || 0,
            weekEventsCount: calendarData.weekCount || 0,
            followUpCount: followUpCount,
            contactsCountMonth: contactStats.month,
            opportunitiesCountMonth: opportunityStats.month,
            eventLogsCountMonth: eventStats.month,
        };

        const kanbanData = this._prepareKanbanData(activeOpportunities, systemConfig);
        
        // Relies on surgical recent SQL fetch + [PHASE D-2] chronological JS boundary
        const recentActivity = this._prepareRecentActivity(
            recentInteractions, 
            recentContactsRaw, 
            lightweightOpps, 
            companies, 
            5,
            rangeStart,
            rangeEnd
        );
        
        const thisWeekInfoForDashboard = {
            weekId: thisWeekId,
            title: thisWeekDetails.title || `Week ${thisWeekId}`,
            days: thisWeekDetails.days || [] 
        };

        // KPI Trend Data Aggregation
        const trendData = {
            opportunities: {},
            events: {},
            won: {},
            revenue: {},
            currentYear: today.getFullYear(),
            currentMonth: today.getMonth() + 1
        };

        (lightweightOppsRes.data || []).forEach(opp => {
            if (opp.created_time) {
                const d = new Date(opp.created_time);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    trendData.opportunities[key] = (trendData.opportunities[key] || 0) + 1;
                }
            }
        });

        (lightweightEventsRes.data || []).forEach(ev => {
            if (ev.created_time) {
                const d = new Date(ev.created_time);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    trendData.events[key] = (trendData.events[key] || 0) + 1;
                }
            }
        });

        (lightweightWonRes.data || []).forEach(opp => {
            const dateStr = opp.expected_close_date || opp.updated_time;
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    trendData.won[key] = (trendData.won[key] || 0) + 1;

                    const raw = opp.opportunity_value;
                    const amount = raw ? parseFloat(String(raw).replace(/,/g, '')) || 0 : 0;
                    trendData.revenue[key] = (trendData.revenue[key] || 0) + amount;
                }
            }
        });

        return {
            stats,
            kanbanData,
            followUpList: followUps.slice(0, 5),
            todaysAgenda: calendarData.todayEvents || [],
            recentActivity,
            weeklyBusiness: thisWeeksEntries,
            thisWeekInfo: thisWeekInfoForDashboard,
            trendData
        };
    }

    // [PHASE C-2.4] Non-blocking raw contact stats fetch
    async getRawContactStats() {
        const now = Date.now();
        if (this._rawContactStatsCache && (now - this._rawContactStatsCacheTime) < this._RAW_CACHE_TTL) {
            return this._rawContactStatsCache;
        }

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const rawContacts = (this.contactService && this.contactService.contactRawReader)
            ? await this.contactService.contactRawReader.getContacts()
            : [];
            
        let rawTotal = 0;
        let rawMonth = 0;
        rawContacts.forEach(c => {
            if (c.name || c.company) {
                rawTotal++;
                const ts = new Date(c.createdTime).getTime();
                if (!isNaN(ts) && ts >= startOfMonth.getTime()) {
                    rawMonth++;
                }
            }
        });
        
        this._rawContactStatsCache = { total: rawTotal, month: rawMonth };
        this._rawContactStatsCacheTime = now;
        
        return this._rawContactStatsCache;
    }

    async getCompaniesDashboardData() {
        // [PHASE C-2.1] SQL-First: Fetch only required columns for chart aggregation
        const { data } = await supabase.from('companies').select('created_time, company_type, customer_stage, interaction_rating');
        const companies = (data || []).map(row => ({
            createdTime: row.created_time,
            companyType: row.company_type,
            customerStage: row.customer_stage,
            engagementRating: row.interaction_rating
        }));

        return {
            chartData: {
                trend: this._prepareTrendData(companies),
                type: this._prepareCompanyTypeData(companies),
                stage: this._prepareCustomerStageData(companies),
                rating: this._prepareEngagementRatingData(companies),
            }
        };
    }

    async getEventsDashboardData() {
        const eventLogs = await this.eventLogSqlReader.getEventLogs();
        
        // [PHASE C-2.1] SQL-First: Avoid full table hydration for cross-domain naming
        const [oppsRes, compsRes] = await Promise.all([
            supabase.from('opportunities').select('opportunity_id, opportunity_name, opportunity_type'),
            supabase.from('companies').select('company_id, company_name')
        ]);

        const opportunityMap = new Map((oppsRes.data || []).map(opp => [opp.opportunity_id, { opportunityName: opp.opportunity_name, opportunityType: opp.opportunity_type }]));
        const companyMap = new Map((compsRes.data || []).map(comp => [comp.company_id, { companyName: comp.company_name }]));

        const eventList = eventLogs.map(log => {
            const relatedOpp = opportunityMap.get(log.opportunityId);
            const relatedComp = companyMap.get(log.companyId);

            return {
                ...log,
                opportunityName: relatedOpp ? relatedOpp.opportunityName : (relatedComp ? relatedComp.companyName : null),
                companyName: relatedComp ? relatedComp.companyName : null,
                opportunityType: relatedOpp ? relatedOpp.opportunityType : null
            };
        });

        eventList.sort((a, b) => {
            const timeA = new Date(a.lastModifiedTime || a.createdTime).getTime();
            const timeB = new Date(b.lastModifiedTime || b.createdTime).getTime();
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            return timeB - timeA;
        });

        return {
            eventList,
            chartData: {
                trend: this._prepareTrendData(eventLogs),
                eventType: this._prepareEventTypeData(eventLogs),
                size: this._prepareSizeData(eventLogs),
            }
        };
    }

    async getOpportunitiesDashboardData() {
        // [PHASE C-2.1] SQL-First: Projection to avoid full JSON body hydration
        const [opportunitiesRes, systemConfig] = await Promise.all([
            supabase.from('opportunities').select('source, opportunity_type, current_stage, win_probability, product_details, sales_channel, equipment_scale, created_time'),
            this.systemService.getSystemConfig(),
        ]);
        
        const opportunities = (opportunitiesRes.data || []).map(row => ({
            opportunitySource: row.source,
            opportunityType: row.opportunity_type,
            currentStage: row.current_stage,
            orderProbability: row.win_probability,
            potentialSpecification: row.product_details,
            salesChannel: row.sales_channel,
            deviceScale: row.equipment_scale,
            createdTime: row.created_time
        }));

        return {
            chartData: {
                trend: this._prepareTrendData(opportunities),
                source: this._prepareCategoricalData(opportunities, 'opportunitySource', '機會來源', systemConfig),
                type: this._prepareCategoricalData(opportunities, 'opportunityType', '機會種類', systemConfig),
                stage: this._prepareOpportunityStageData(opportunities, systemConfig),
                probability: this._prepareCategoricalData(opportunities, 'orderProbability', '下單機率', systemConfig),
                specification: this._prepareSpecificationData(opportunities, '可能下單規格', systemConfig),
                channel: this._prepareCategoricalData(opportunities, 'salesChannel', '可能銷售管道', systemConfig),
                scale: this._prepareCategoricalData(opportunities, 'deviceScale', '設備規模', systemConfig),
            }
        };
    }

    async getContactsDashboardData() {
        const contacts = await this.contactSqlReader.getContacts();
        return {
            chartData: {
                trend: this._prepareTrendData(contacts),
            }
        };
    }

    // [PHASE C-2.5 PATCH] Lazy load endpoint for MTU/SI tooltips
    async getCompanyActivityDetails(type) {
        if (type !== 'mtu' && type !== 'si') {
            throw new Error('Invalid company activity type');
        }

        const { data: targetCompanies, error } = await supabase
            .from('v_company_activity_summary')
            .select('company_name, company_type, has_activity')
            .or('company_type.ilike.%mtu%,company_type.ilike.%si%,company_type.ilike.%系統整合%,company_type.ilike.%system integrator%');

        if (error) throw new Error('[DashboardService] MTU/SI details fetch error: ' + error.message);

        const normalize = (name) => (name || '').trim().toLowerCase();
        const isStrictMTU = (t) => normalize(t) === 'mtu';
        const isSI = (t) => /SI|系統整合|System Integrator/i.test(t || '');

        let totalCount = 0, activeCount = 0, inactiveCount = 0;
        const activeNames = [], inactiveNames = [];

        (targetCompanies || []).forEach(comp => {
            const isMtu = isStrictMTU(comp.company_type);
            const isSi = isSI(comp.company_type);
            if ((type === 'mtu' && isMtu) || (type === 'si' && isSi)) {
                totalCount++;
                if (comp.has_activity === true) {
                    activeCount++; activeNames.push(comp.company_name);
                } else {
                    inactiveCount++; inactiveNames.push(comp.company_name);
                }
            }
        });

        return { totalCount, activeCount, inactiveCount, activeNames, inactiveNames };
    }

    // --- 內部資料處理函式 ---

    // [Phase 9-A] Signature simplified: completely relies on the reader's native SQL computed value.
    _getFollowUpOpportunities(opportunities) {
        const daysThreshold = (this.config.FOLLOW_UP && this.config.FOLLOW_UP.DAYS_THRESHOLD) || 7;
        const activeStages = (this.config.FOLLOW_UP && this.config.FOLLOW_UP.ACTIVE_STAGES) || ['01_初步接觸', '02_需求確認', '03_提案報價', '04_談判修正'];
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - daysThreshold);
        const thresholdTime = sevenDaysAgo.getTime();

        return opportunities.filter(opp => {
            if (opp.currentStatus !== '進行中' || !activeStages.includes(opp.currentStage)) {
                return false;
            }
            
            if (!opp.effectiveLastActivity) {
                const createdDate = new Date(opp.createdTime);
                return createdDate.getTime() < thresholdTime;
            }
            
            return opp.effectiveLastActivity < thresholdTime;
        });
    }

    _prepareKanbanData(opportunities, systemConfig) {
        const stages = systemConfig['機會階段'] || [];
        const stageGroups = {};
        
        stages.forEach(stage => { 
            stageGroups[stage.value] = { name: stage.note || stage.value, opportunities: [], count: 0 }; 
        });
        
        opportunities.forEach(opp => {
            if (opp.currentStatus === '進行中') {
                const stageKey = opp.currentStage;
                if (stageGroups[stageKey]) {
                    stageGroups[stageKey].opportunities.push(opp);
                    stageGroups[stageKey].count++;
                }
            }
        });
        return stageGroups;
    }

    _prepareRecentActivity(recentInteractions, contactsLimitArray, opportunities, companies, limit, rangeStart, rangeEnd) {
        const contactFeed = contactsLimitArray.map(item => {
            const ts = new Date(item.createdTime);
            return { type: 'new_contact', timestamp: isNaN(ts.getTime()) ? 0 : ts.getTime(), data: item };
        });
        
        const interactionFeed = recentInteractions.map(item => {
            const ts = new Date(item.interactionTime || item.createdTime);
            return { type: 'interaction', timestamp: isNaN(ts.getTime()) ? 0 : ts.getTime(), data: item };
        });

        let combinedFeed = [...interactionFeed, ...contactFeed];

        // [PHASE D-2] Apply chronological boundary if explicit range exists
        if (rangeStart) {
            combinedFeed = combinedFeed.filter(item => item.timestamp >= rangeStart.getTime());
        }
        if (rangeEnd) {
            combinedFeed = combinedFeed.filter(item => item.timestamp <= rangeEnd.getTime());
        }

        combinedFeed = combinedFeed.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

        // Account for both camelCase and snake_case based on caller hydration
        const opportunityMap = new Map(opportunities.map(opp => [opp.opportunityId || opp.opportunity_id, opp.opportunityName || opp.opportunity_name]));
        const companyMap = new Map(companies.map(comp => [comp.companyId || comp.company_id, comp.companyName || comp.company_name]));

        return combinedFeed.map(item => {
            if (item.type === 'interaction') {
                let contextName = opportunityMap.get(item.data.opportunityId);
                if (!contextName && item.data.companyId) {
                    contextName = companyMap.get(item.data.companyId);
                }

                return {
                    ...item,
                    data: {
                        ...item.data,
                        contextName: contextName || '系統活動'
                    }
                };
            }
            return item;
        });
    }

    _prepareTrendData(data, days = 30) {
        const trend = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            trend[date.toISOString().split('T')[0]] = 0;
        }

        data.forEach(item => {
            if (item.createdTime) {
                try {
                    const itemDate = new Date(item.createdTime);
                    const dateString = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).toISOString().split('T')[0];
                    if (trend.hasOwnProperty(dateString)) trend[dateString]++;
                } catch(e) { /* ignore */ }
            }
        });
        return Object.entries(trend).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));
    }

    _prepareEventTypeData(eventLogs) {
        const counts = eventLogs.reduce((acc, log) => {
            const key = log.eventType || 'general';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, y]) => ({ name, y }));
    }

    _prepareSizeData(eventLogs) {
        const counts = eventLogs.reduce((acc, log) => {
            const key = log.companySize || log.iot_deviceScale || '未填寫';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
    }

    _prepareCategoricalData(data, fieldKey, configKey, systemConfig) {
        const nameMap = new Map((systemConfig[configKey] || []).map(item => [item.value, item.note]));
        const counts = data.reduce((acc, item) => {
            const value = item[fieldKey];
            const key = nameMap.get(value) || value || '未分類';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, y]) => ({ name, y }));
    }

    _prepareSpecificationData(opportunities, configKey, systemConfig) {
        const nameMap = new Map((systemConfig[configKey] || []).map(item => [item.value, item.note]));
        const counts = {};

        opportunities.forEach(item => {
            const value = item.potentialSpecification;
            if (!value) return;

            let keys = [];
            
            try {
                const parsedJson = JSON.parse(value);
                if (parsedJson && typeof parsedJson === 'object') {
                    keys = Object.keys(parsedJson).filter(k => parsedJson[k] > 0);
                } else {
                    if (typeof value === 'string') {
                        keys = value.split(',').map(s => s.trim()).filter(Boolean);
                    }
                }
            } catch (e) {
                if (typeof value === 'string') {
                    keys = value.split(',').map(s => s.trim()).filter(Boolean);
                }
            }
            
            keys.forEach(key => {
                const displayName = nameMap.get(key) || key;
                counts[displayName] = (counts[displayName] || 0) + 1;
            });
        });

        return Object.entries(counts).map(([name, y]) => ({ name, y }));
    }

    _prepareOpportunityStageData(opportunities, systemConfig) {
        const stageMapping = new Map((systemConfig['機會階段'] || []).map(item => [item.value, item.note]));
        const counts = opportunities.reduce((acc, opp) => {
            if (opp.currentStatus === '進行中') {
                const key = stageMapping.get(opp.currentStage) || opp.currentStage || '未分類';
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {});
        return Object.entries(counts);
    }

    _prepareCompanyTypeData(companies) {
        const counts = companies.reduce((acc, company) => {
            const key = company.companyType || '未分類';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, y]) => ({ name, y }));
    }

    _prepareCustomerStageData(companies) {
        const counts = companies.reduce((acc, company) => {
            const key = company.customerStage || '未分類';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, y]) => ({ name, y }));
    }

    _prepareEngagementRatingData(companies) {
        const counts = companies.reduce((acc, company) => {
            const key = company.engagementRating || '未評級';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, y]) => ({ name, y }));
    }
}

module.exports = DashboardService;