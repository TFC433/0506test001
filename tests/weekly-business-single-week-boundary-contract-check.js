const assert = require('assert');

const WeeklyBusinessService = require('../services/weekly-business-service');

function sqlEntry(overrides = {}) {
    return {
        recordId: 'sql-default',
        entryDate: '2026-09-07',
        weekId: '2026-W37',
        category: 'Sales',
        topic: 'SQL topic',
        participants: 'Alice',
        summaryContent: 'SQL summary',
        todoItems: 'SQL todo',
        createdTime: '2026-09-07T01:00:00.000Z',
        updatedTime: '2026-09-07T02:00:00.000Z',
        createdBy: 'SQL creator',
        ...overrides
    };
}

function sheetEntry(overrides = {}) {
    return {
        rowIndex: 2,
        '日期': '2026-09-07',
        weekId: '2026-W37',
        category: 'Support',
        '主題': 'Sheet topic',
        '參與人員': 'Bob',
        '重點摘要': 'Sheet summary',
        '待辦事項': 'Sheet todo',
        createdTime: '2026-09-07T03:00:00.000Z',
        lastUpdateTime: '2026-09-07T04:00:00.000Z',
        '建立者': 'Sheet creator',
        recordId: 'sheet-default',
        ...overrides
    };
}

function dateHelpers() {
    return {
        getWeekId() {
            return '2026-W37';
        },
        getWeekInfo(weekId) {
            return {
                title: `Week ${weekId}`,
                dateRange: `Range ${weekId}`,
                days: [
                    { date: '2026-09-07' },
                    { date: '2026-09-08' }
                ]
            };
        }
    };
}

function makeService({ sqlReader, sheetReader, calendarService, systemService, config } = {}) {
    return new WeeklyBusinessService({
        weeklyBusinessReader: sheetReader || {
            async getAllEntries() {
                return [];
            },
            async getWeeklySummary() {
                return [];
            }
        },
        weeklyBusinessSqlReader: sqlReader,
        weeklyBusinessSqlWriter: {},
        dateHelpers: dateHelpers(),
        calendarService: calendarService || {},
        systemService: systemService || {},
        opportunityService: {},
        config: config || {
            TIMEZONE: 'Asia/Taipei',
            PERSONAL_CALENDAR_ID: '',
            CALENDAR_ID: ''
        }
    });
}

async function testSqlSuccessUsesOnlyScopedBoundary() {
    const calls = { scoped: [], broad: 0, sheet: 0 };
    const service = makeService({
        sqlReader: {
            async getWeeklyBusinessEntriesByWeekId(weekId) {
                calls.scoped.push(weekId);
                return [
                    sqlEntry({ recordId: 'older', entryDate: '2026-09-07' }),
                    sqlEntry({ recordId: 'newer', entryDate: '2026-09-09' }),
                    sqlEntry({ recordId: 'other-week', weekId: '2026-W36', entryDate: '2026-09-01' })
                ];
            },
            async getWeeklyBusinessEntries() {
                calls.broad += 1;
                throw new Error('single-week path must not read full SQL history');
            }
        },
        sheetReader: {
            async getAllEntries() {
                calls.sheet += 1;
                throw new Error('successful SQL must not fall back to Sheet');
            }
        }
    });

    const entries = await service.getEntriesForWeek('2026-W37');

    assert.deepStrictEqual(calls, { scoped: ['2026-W37'], broad: 0, sheet: 0 });
    assert.deepStrictEqual(entries.map(entry => entry.recordId), ['newer', 'older']);
    assert.deepStrictEqual(entries.map(entry => entry.day), [3, 1]);
    assert.deepStrictEqual(entries.map(entry => entry._view.day), [3, 1]);
    assert.strictEqual(entries[0]['日期'], '2026-09-09');
    assert.strictEqual(entries[0]['主題'], 'SQL topic');
    assert.strictEqual(entries[0]['參與人員'], 'Alice');
    assert.strictEqual(entries[0]['重點摘要'], 'SQL summary');
    assert.strictEqual(entries[0]['待辦事項'], 'SQL todo');
    assert.strictEqual(entries[0].createdTime, '2026-09-07T01:00:00.000Z');
    assert.strictEqual(entries[0].lastUpdateTime, '2026-09-07T02:00:00.000Z');
    assert.strictEqual(entries[0]['建立者'], 'SQL creator');
    assert.strictEqual(entries[0].rowIndex, undefined);
}

async function testSuccessfulEmptyWeekDoesNotFallback() {
    const calls = { scoped: 0, broad: 0, sheet: 0 };
    const service = makeService({
        sqlReader: {
            async getWeeklyBusinessEntriesByWeekId() {
                calls.scoped += 1;
                return [];
            },
            async getWeeklyBusinessEntries() {
                calls.broad += 1;
                return [];
            }
        },
        sheetReader: {
            async getAllEntries() {
                calls.sheet += 1;
                return [sheetEntry()];
            }
        }
    });

    assert.deepStrictEqual(await service.getEntriesForWeek('2026-W50'), []);
    assert.deepStrictEqual(calls, { scoped: 1, broad: 0, sheet: 0 });
}

async function testSqlFailurePreservesSheetFallback() {
    const calls = { scoped: [], broad: 0, sheet: 0 };
    const service = makeService({
        sqlReader: {
            async getWeeklyBusinessEntriesByWeekId(weekId) {
                calls.scoped.push(weekId);
                throw new Error('scoped SQL unavailable');
            },
            async getWeeklyBusinessEntries() {
                calls.broad += 1;
                return [];
            }
        },
        sheetReader: {
            async getAllEntries() {
                calls.sheet += 1;
                return [
                    sheetEntry({ recordId: 'sheet-old', rowIndex: 8, '日期': '2026-09-07' }),
                    sheetEntry({ recordId: 'sheet-new', rowIndex: 9, '日期': '2026-09-10' }),
                    sheetEntry({ recordId: 'sheet-other', rowIndex: 10, weekId: '2026-W36' })
                ];
            }
        }
    });

    const entries = await service.getEntriesForWeek('2026-W37');

    assert.deepStrictEqual(calls, { scoped: ['2026-W37'], broad: 0, sheet: 1 });
    assert.deepStrictEqual(entries.map(entry => entry.recordId), ['sheet-new', 'sheet-old']);
    assert.deepStrictEqual(entries.map(entry => entry.rowIndex), [9, 8]);
    assert.deepStrictEqual(entries.map(entry => entry.day), [4, 1]);
    assert.strictEqual(entries[0]['主題'], 'Sheet topic');
    assert.strictEqual(entries[0]['參與人員'], 'Bob');
    assert.strictEqual(entries[0]['重點摘要'], 'Sheet summary');
    assert.strictEqual(entries[0]['待辦事項'], 'Sheet todo');
    assert.strictEqual(entries[0].lastUpdateTime, '2026-09-07T04:00:00.000Z');
    assert.strictEqual(entries[0]['建立者'], 'Sheet creator');
}

async function testSummaryPathsRemainBroad() {
    const calls = { scoped: 0, broad: 0, sheetSummary: 0 };
    const service = makeService({
        sqlReader: {
            async getWeeklyBusinessEntriesByWeekId() {
                calls.scoped += 1;
                throw new Error('summary must not use a single-week query');
            },
            async getWeeklyBusinessEntries() {
                calls.broad += 1;
                return [
                    sqlEntry({ weekId: '2026-W36', summaryContent: 'A' }),
                    sqlEntry({ weekId: '2026-W36', summaryContent: '' }),
                    sqlEntry({ weekId: '2026-W35', summaryContent: 'B' })
                ];
            }
        },
        sheetReader: {
            async getWeeklySummary() {
                calls.sheetSummary += 1;
                return [];
            }
        }
    });

    const summaries = await service.getWeeklyBusinessSummaryList();

    assert.deepStrictEqual(calls, { scoped: 0, broad: 1, sheetSummary: 0 });
    assert.deepStrictEqual(summaries.map(item => item.id), ['2026-W37', '2026-W36', '2026-W35']);
    assert.strictEqual(summaries.find(item => item.id === '2026-W36').summaryCount, 1);
    assert.strictEqual(summaries.find(item => item.id === '2026-W35').summaryCount, 1);
}

async function testWeeklyDetailsContractKeepsCalendarAndSystemFlow() {
    const calls = { scoped: [], holidays: 0, system: 0, calendarIds: [] };
    const service = makeService({
        sqlReader: {
            async getWeeklyBusinessEntriesByWeekId(weekId) {
                calls.scoped.push(weekId);
                return [sqlEntry({ recordId: 'detail-entry' })];
            }
        },
        calendarService: {
            async getHolidaysForPeriod() {
                calls.holidays += 1;
                return new Map([['2026-09-07', 'Holiday']]);
            },
            async getEventsForPeriod(firstDay, endDay, calendarId) {
                calls.calendarIds.push(calendarId);
                return [];
            }
        },
        systemService: {
            async getSystemConfig() {
                calls.system += 1;
                return { '日曆篩選規則': [] };
            }
        },
        config: {
            TIMEZONE: 'Asia/Taipei',
            PERSONAL_CALENDAR_ID: 'personal-calendar',
            CALENDAR_ID: 'at-calendar'
        }
    });

    const details = await service.getWeeklyDetails('2026-W37');

    assert.deepStrictEqual(calls, {
        scoped: ['2026-W37'],
        holidays: 1,
        system: 1,
        calendarIds: ['personal-calendar', 'at-calendar']
    });
    assert.strictEqual(details.id, '2026-W37');
    assert.strictEqual(details.title, 'Week 2026-W37');
    assert.strictEqual(details.dateRange, 'Range 2026-W37');
    assert.deepStrictEqual(details.entries.map(entry => entry.recordId), ['detail-entry']);
    assert.strictEqual(details.days[0].holidayName, 'Holiday');
    assert.deepStrictEqual(details.days[0].dxCalendarEvents, []);
    assert.deepStrictEqual(details.days[0].atCalendarEvents, []);
}

async function testSqlReaderAppliesExactWeekPredicate() {
    const supabaseModulePath = require.resolve('../config/supabase');
    const readerModulePath = require.resolve('../data/weekly-business-sql-reader');
    const originalSupabaseModule = require.cache[supabaseModulePath];
    const originalReaderModule = require.cache[readerModulePath];
    const calls = { table: null, select: null, eq: [] };

    const fakeSupabase = {
        from(table) {
            calls.table = table;
            return {
                select(columns) {
                    calls.select = columns;
                    return {
                        async eq(column, value) {
                            calls.eq.push([column, value]);
                            return {
                                data: [{
                                    record_id: 'reader-row',
                                    entry_date: '2026-09-07',
                                    week_id: '2026-W37',
                                    category: 'Sales',
                                    topic: 'Reader topic',
                                    participants: 'Reader participant',
                                    summary_content: 'Reader summary',
                                    todo_items: 'Reader todo',
                                    created_time: 'created',
                                    updated_time: 'updated',
                                    created_by: 'Reader creator'
                                }],
                                error: null
                            };
                        }
                    };
                }
            };
        }
    };

    try {
        require.cache[supabaseModulePath] = {
            id: supabaseModulePath,
            filename: supabaseModulePath,
            loaded: true,
            exports: { supabase: fakeSupabase }
        };
        delete require.cache[readerModulePath];
        const WeeklyBusinessSqlReader = require('../data/weekly-business-sql-reader');
        const rows = await new WeeklyBusinessSqlReader().getWeeklyBusinessEntriesByWeekId('2026-W37');

        assert.deepStrictEqual(calls, {
            table: 'weekly_business_entries',
            select: '*',
            eq: [['week_id', '2026-W37']]
        });
        assert.deepStrictEqual(rows, [sqlEntry({
            recordId: 'reader-row',
            topic: 'Reader topic',
            participants: 'Reader participant',
            summaryContent: 'Reader summary',
            todoItems: 'Reader todo',
            createdTime: 'created',
            updatedTime: 'updated',
            createdBy: 'Reader creator'
        })]);
    } finally {
        if (originalSupabaseModule) require.cache[supabaseModulePath] = originalSupabaseModule;
        else delete require.cache[supabaseModulePath];

        if (originalReaderModule) require.cache[readerModulePath] = originalReaderModule;
        else delete require.cache[readerModulePath];
    }
}

async function main() {
    await testSqlSuccessUsesOnlyScopedBoundary();
    await testSuccessfulEmptyWeekDoesNotFallback();
    await testSqlFailurePreservesSheetFallback();
    await testSummaryPathsRemainBroad();
    await testWeeklyDetailsContractKeepsCalendarAndSystemFlow();
    await testSqlReaderAppliesExactWeekPredicate();
    console.log('Weekly Business single-week SQL boundary contract check passed.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
