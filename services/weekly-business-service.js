// ============================================================================
// File: services/weekly-business-service.js
// ============================================================================
/* [v7.8.1] Weekly Service Phase 7-4 */
/**
 * services/weekly-business-service.js
 * 週間業務邏輯服務 (Service Layer)
 * * @version 7.8.1 (Phase 7-4: SystemService Routing Fix)
 * @description 
 * [Phase 7-3 Refactor]
 * 1. Removed WeeklyBusinessWriter dependency entirely.
 * 2. Create/Update/Delete -> Strict SQL Only.
 * 3. Read -> SQL First + Sheet Fallback (Read-Only).
 * [Phase 7-4 Fix]
 * - Replaced deprecated systemReader with systemService for config loading.
 */

class WeeklyBusinessService {
    constructor({ 
        weeklyBusinessReader, 
        weeklyBusinessSqlReader, 
        // weeklyBusinessWriter, // [Removed Phase 7-3]
        weeklyBusinessSqlWriter,
        dateHelpers, 
        calendarService, 
        systemService, // [Phase 7-4] Changed from systemReader
        opportunityService, 
        config 
    }) {
        this.weeklyBusinessReader = weeklyBusinessReader;
        this.weeklyBusinessSqlReader = weeklyBusinessSqlReader;
        // this.weeklyBusinessWriter = weeklyBusinessWriter; // [Removed Phase 7-3]
        this.weeklyBusinessSqlWriter = weeklyBusinessSqlWriter;
        this.dateHelpers = dateHelpers;
        this.calendarService = calendarService;
        this.systemService = systemService; // [Phase 7-4] Changed from systemReader
        this.opportunityService = opportunityService;
        this.config = config;
    }

    // ============================================================
    //  Internal Accessor (Read Convergence & View Normalization)
    // ============================================================

    async _fetchInternal(mode) {
        try {
            if (this.weeklyBusinessSqlReader) {
                if (mode === 'SUMMARY' || mode === 'ENTRIES') {
                     const sqlEntries = await this.weeklyBusinessSqlReader.getWeeklyBusinessEntries();
                     console.log(`[WeeklyService] Read source=SQL (mode=${mode})`);
                     
                     if (mode === 'SUMMARY') {
                         return sqlEntries;
                     }
                     return sqlEntries.map(entry => this._normalizeEntry(entry));
                }
            }
        } catch (error) {
            console.warn(`[WeeklyService] SQL read failed, fallback source=Sheet, Sheet ID=CORE, reason=${error.message}`);
        }

        if (mode === 'SUMMARY') {
            return this.weeklyBusinessReader.getWeeklySummary();
        }

        if (mode === 'ENTRIES') {
            const rawEntries = await this.weeklyBusinessReader.getAllEntries();
            return rawEntries.map(entry => this._normalizeEntry(entry));
        }

        return [];
    }

    _normalizeEntry(raw) {
        const isSheet = raw['日期'] !== undefined;
        
        const date = isSheet ? raw['日期'] : raw.entryDate;
        const weekId = raw.weekId;
        const recordId = raw.recordId;
        const rowIndex = isSheet ? raw.rowIndex : undefined;

        let viewContract = {};
        if (isSheet) {
            viewContract = { ...raw };
        } else {
            viewContract = {
                ...raw,
                '日期': raw.entryDate || '',
                'weekId': raw.weekId || '',
                'category': raw.category || '',
                '主題': raw.topic || '',
                '參與人員': raw.participants || '',
                '重點摘要': raw.summaryContent || '',
                '待辦事項': raw.todoItems || '',
                'createdTime': raw.createdTime || '',
                'lastUpdateTime': raw.updatedTime || '',
                '建立者': raw.createdBy || '',
                'recordId': raw.recordId || ''
            };
        }

        return {
            ...viewContract,
            date: date,
            weekId: weekId,
            recordId: recordId,
            rowIndex: rowIndex
        };
    }

    // ============================================================
    //  Public Methods
    // ============================================================

    async getEntriesForWeek(weekId) {
        try {
            const allEntries = await this._fetchInternal('ENTRIES');
            let entries = allEntries.filter(entry => entry.weekId === weekId);
            entries.sort((a, b) => new Date(b.date) - new Date(a.date));

            entries = entries.map(entry => {
                let dayValue = -1;
                try {
                    const dateString = entry.date;
                    if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                        const [year, month, day] = dateString.split('-').map(Number);
                        const entryDateUTC = new Date(Date.UTC(year, month - 1, day));
                        if (!isNaN(entryDateUTC.getTime())) {
                            dayValue = entryDateUTC.getUTCDay();
                        }
                    }
                } catch (e) {
                    dayValue = -1;
                }

                return {
                    ...entry,
                    day: dayValue,
                    _view: { day: dayValue }
                };
            });

            return entries || [];
        } catch (error) {
            console.error(`[WeeklyService] getEntriesForWeek Error (${weekId}):`, error);
            return [];
        }
    }

    async getWeeklyBusinessSummaryList() {
        try {
            const rawData = await this._fetchInternal('SUMMARY');
            
            const weekSummaryMap = new Map();
            rawData.forEach(item => {
                const { weekId } = item;
                const content = item.summaryContent || item['重點摘要'];

                if (weekId && /^\d{4}-W\d{2}$/.test(weekId)) {
                    if (!weekSummaryMap.has(weekId)) {
                        weekSummaryMap.set(weekId, { weekId: weekId, summaryCount: 0 });
                    }
                    if (content && content.trim() !== '') {
                        weekSummaryMap.get(weekId).summaryCount++;
                    }
                }
            });
            const summaryData = Array.from(weekSummaryMap.values());
            
            const weeksList = summaryData.map(item => {
                const weekId = item.weekId;
                const weekInfo = this.dateHelpers.getWeekInfo(weekId);
                
                return {
                    id: weekId,
                    title: weekInfo.title,
                    dateRange: weekInfo.dateRange,
                    summaryCount: item.summaryCount
                };
            });

            const today = new Date();
            const currentWeekId = this.dateHelpers.getWeekId(today);
            const currentWeekInfo = this.dateHelpers.getWeekInfo(currentWeekId);
            const hasCurrentWeek = weeksList.some(w => w.title === currentWeekInfo.title);

            if (!hasCurrentWeek) {
                 weeksList.unshift({
                     id: currentWeekId, 
                     title: currentWeekInfo.title,
                     dateRange: currentWeekInfo.dateRange,
                     summaryCount: 0
                 });
            }

            return weeksList.sort((a, b) => b.id.localeCompare(a.id));

        } catch (error) {
            console.error('[WeeklyService] getWeeklyBusinessSummaryList Error:', error);
            throw error;
        }
    }

    async getWeeklyDetails(weekId, userId = null) {
        const weekInfo = this.dateHelpers.getWeekInfo(weekId);
        
        let entriesForWeek = await this.getEntriesForWeek(weekId);
        
        const firstDay = new Date(weekInfo.days[0].date + 'T00:00:00'); 
        const lastDay = new Date(weekInfo.days[weekInfo.days.length - 1].date + 'T00:00:00'); 
        const endQueryDate = new Date(lastDay.getTime() + 24 * 60 * 60 * 1000); 

        const queries = [
            this.calendarService.getHolidaysForPeriod(firstDay, endQueryDate), 
            this.systemService.getSystemConfig() // [Phase 7-4] Routing via SystemService
        ];

        if (this.config.PERSONAL_CALENDAR_ID) {
            queries.push(
                this.calendarService.getEventsForPeriod(firstDay, endQueryDate, this.config.PERSONAL_CALENDAR_ID)
            );
        } else {
            queries.push(Promise.resolve([]));
        }

        if (this.config.CALENDAR_ID) {
            queries.push(
                this.calendarService.getEventsForPeriod(firstDay, endQueryDate, this.config.CALENDAR_ID)
            );
        } else {
            queries.push(Promise.resolve([]));
        }

        const results = await Promise.all(queries);
        const holidays = results[0];
        const systemConfig = results[1] || {};
        const rawDxEvents = results[2] || []; 
        const rawAtEvents = results[3] || [];

        const rules = systemConfig['日曆篩選規則'] || [];
        const dxBlockRule = rules.find(r => r.value === 'DX_屏蔽關鍵字');
        const dxBlockKeywords = (dxBlockRule ? dxBlockRule.note : '').split(',').map(s => s.trim()).filter(Boolean);

        const atTransferRule = rules.find(r => r.value === 'AT_轉移關鍵字');
        const atTransferKeywords = (atTransferRule ? atTransferRule.note : '').split(',').map(s => s.trim()).filter(Boolean);

        const finalDxList = [];
        const finalAtList = [];

        rawDxEvents.forEach(evt => {
            const summary = evt.summary || '';
            const shouldBlock = dxBlockKeywords.some(kw => summary.includes(kw));
            if (!shouldBlock) finalDxList.push(evt);
        });

        rawAtEvents.forEach(evt => {
            const summary = evt.summary || '';
            const shouldTransfer = atTransferKeywords.some(kw => summary.includes(kw));
            if (shouldTransfer) finalDxList.push(evt);
            else finalAtList.push(evt);
        });

        const organizeEventsByDay = (events) => {
            const map = {};
            events.forEach(event => {
                const startVal = event.start.dateTime || event.start.date;
                if (!startVal) return;

                const eventDate = new Date(startVal);
                const dateKey = eventDate.toLocaleDateString('en-CA', { timeZone: this.config.TIMEZONE });

                if (!map[dateKey]) map[dateKey] = [];
                
                const isAllDay = !!event.start.date;
                const timeStr = isAllDay ? '全天' : eventDate.toLocaleTimeString('zh-TW', { timeZone: this.config.TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });

                map[dateKey].push({
                    summary: event.summary,
                    isAllDay: isAllDay,
                    time: timeStr,
                    htmlLink: event.htmlLink,
                    location: event.location,
                    description: event.description
                });
            });
            return map;
        };

        const dxEventsByDay = organizeEventsByDay(finalDxList);
        const atEventsByDay = organizeEventsByDay(finalAtList);

        weekInfo.days.forEach(day => {
            if (holidays.has(day.date)) day.holidayName = holidays.get(day.date);
            day.dxCalendarEvents = dxEventsByDay[day.date] || [];
            day.atCalendarEvents = atEventsByDay[day.date] || [];
        });

        return {
            id: weekId,
            ...weekInfo, 
            entries: entriesForWeek 
        };
    }

    async getWeekOptions() {
        const today = new Date();
        const prevWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const summaryData = await this._fetchInternal('SUMMARY');
        const existingWeekIds = new Set(summaryData.map(w => w.weekId));

        const options = [
            { id: this.dateHelpers.getWeekId(prevWeek), label: '上一週' },
            { id: this.dateHelpers.getWeekId(today),    label: '本週' },
            { id: this.dateHelpers.getWeekId(nextWeek), label: '下一週' }
        ];

        options.forEach(opt => {
            opt.disabled = existingWeekIds.has(opt.id);
        });

        return options;
    }

    /**
     * [Phase 7-3] Create -> SQL Only (Strict)
     * Removed Sheet Writer fallback.
     */
    async createWeeklyBusinessEntry(data) {
        const entryDate = new Date(data.date || new Date());
        const weekId = this.dateHelpers.getWeekId(entryDate);
        
        const fullData = { 
            ...data, 
            weekId: weekId
        };
        
        const creator = data.creator || 'System';

        if (!this.weeklyBusinessSqlWriter) {
            throw new Error('[WeeklyService] WeeklyBusinessSqlWriter not configured. Create failed.');
        }

        return this.weeklyBusinessSqlWriter.createEntry(fullData, creator);
    }

    /**
     * [Phase 7-3] Update -> SQL Only (Strict)
     */
    async updateWeeklyBusinessEntry(recordId, data) {
        try {
            const modifier = data.creator || 'System';
            
            if (!this.weeklyBusinessSqlWriter) {
                throw new Error('[WeeklyService] WeeklyBusinessSqlWriter not configured. Update failed.');
            }

            // Direct SQL Update without prior Sheet lookup
            return await this.weeklyBusinessSqlWriter.updateEntry(recordId, data, modifier);
        } catch (error) {
            console.error('[WeeklyService] updateWeeklyBusinessEntry Error:', error);
            throw error;
        }
    }

    /**
     * [Phase 7-3] Delete -> SQL Only (Strict)
     */
    async deleteWeeklyBusinessEntry(recordId) {
        try {
            if (!this.weeklyBusinessSqlWriter) {
                throw new Error('[WeeklyService] WeeklyBusinessSqlWriter not configured. Delete failed.');
            }

            // Direct SQL Delete without prior Sheet lookup
            return await this.weeklyBusinessSqlWriter.deleteEntry(recordId);
        } catch (error) {
            console.error('[WeeklyService] deleteWeeklyBusinessEntry Error:', error);
            throw error;
        }
    }
}

module.exports = WeeklyBusinessService;