const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ActivityTimelineService = require('../services/activity-timeline-service');
const InteractionService = require('../services/interaction-service');

const TIMELINE_PREF_ITEM = 'activity_timeline_enabled_event_types';

function interaction(overrides = {}) {
    return {
        interactionId: 'interaction-default',
        opportunityId: '',
        companyId: '',
        interactionTime: '2026-09-01T00:00:00.000Z',
        interactionType: 'call',
        eventType: 'call',
        eventTitle: 'Call',
        contentSummary: 'Summary',
        recorder: 'Recorder',
        ...overrides
    };
}

function audit(overrides = {}) {
    return {
        auditId: 'audit-default',
        createdAt: '2026-09-01T00:00:00.000Z',
        eventTitle: 'Audit',
        eventSummary: 'Audit summary',
        actorName: 'Actor',
        actorUsername: 'actor@example.com',
        targetType: 'opportunity',
        targetId: 'opportunity-audit',
        targetLabel: 'Audit Opportunity',
        businessAnchor: 'Audit Opportunity',
        businessEventType: 'opportunity_updated',
        module: 'opportunities',
        ...overrides
    };
}

function configService(enabledEventTypes = []) {
    return {
        async getSystemConfig() {
            return {
                preferences: [{
                    item: TIMELINE_PREF_ITEM,
                    note: JSON.stringify(enabledEventTypes)
                }]
            };
        }
    };
}

function makeNameReader({ names = [], batchMethod, fullMethod, batchCalls, fullCalls }) {
    return {
        async [batchMethod](ids) {
            batchCalls.push([...ids]);
            return new Map(names);
        },
        async [fullMethod]() {
            fullCalls.count += 1;
            throw new Error(`${fullMethod} must not be called by Activity Timeline`);
        }
    };
}

function assertTimelineShape(item) {
    assert.deepStrictEqual(Object.keys(item), [
        'id',
        'source',
        'sourceId',
        'time',
        'title',
        'summary',
        'actorName',
        'actorUsername',
        'targetType',
        'targetId',
        'targetLabel',
        'businessAnchor',
        'businessEventType',
        'interactionType',
        'module',
        'link'
    ]);
}

async function testPostSelectionHydrationAndMultiplePages() {
    const readerCalls = { timeline: 0, general: 0 };
    const interactionReader = {
        async getActivityTimelineInteractions() {
            readerCalls.timeline += 1;
            return [
                interaction({ interactionId: 'i5', opportunityId: 'o5', companyId: 'c5', interactionTime: '2026-09-01T05:00:00.000Z' }),
                interaction({ interactionId: 'i4', opportunityId: 'o4', companyId: 'c4', interactionTime: '2026-09-01T04:00:00.000Z' }),
                interaction({ interactionId: 'i3', companyId: 'c3', interactionTime: '2026-09-01T03:00:00.000Z' }),
                interaction({ interactionId: 'i2', interactionTime: '2026-09-01T02:00:00.000Z' }),
                interaction({ interactionId: 'i1', opportunityId: 'o1', companyId: 'c1', interactionTime: '2026-09-01T01:00:00.000Z' })
            ];
        },
        async getInteractions() {
            readerCalls.general += 1;
            throw new Error('general interaction read must not be called by Activity Timeline');
        }
    };
    const opportunityBatchCalls = [];
    const opportunityFullCalls = { count: 0 };
    const companyBatchCalls = [];
    const companyFullCalls = { count: 0 };
    const opportunityReader = makeNameReader({
        names: [['o5', 'Opportunity 5'], ['o4', 'Opportunity 4'], ['o1', 'Opportunity 1']],
        batchMethod: 'getOpportunityNamesByIds',
        fullMethod: 'getOpportunities',
        batchCalls: opportunityBatchCalls,
        fullCalls: opportunityFullCalls
    });
    const companyReader = makeNameReader({
        names: [['c3', 'Company 3'], ['c1', 'Company 1']],
        batchMethod: 'getCompanyNamesByIds',
        fullMethod: 'getCompanyList',
        batchCalls: companyBatchCalls,
        fullCalls: companyFullCalls
    });
    const interactionService = new InteractionService(interactionReader, {}, opportunityReader, companyReader);
    let forbiddenSearchCalls = 0;
    const originalSearch = interactionService.searchInteractions.bind(interactionService);
    interactionService.searchInteractions = async (...args) => {
        forbiddenSearchCalls += 1;
        return originalSearch(...args);
    };
    const timeline = new ActivityTimelineService({
        interactionService,
        auditLoggerService: {},
        systemService: configService(),
        opportunitySqlReader: opportunityReader,
        companySqlReader: companyReader
    });

    const firstPage = await timeline.getActivityTimeline({ page: 1, limit: 2 });
    assert.deepStrictEqual(firstPage.data.map(item => item.id), ['i5', 'i4']);
    assert.deepStrictEqual(firstPage.data.map(item => item.targetLabel), ['Opportunity 5', 'Opportunity 4']);
    assert.deepStrictEqual(opportunityBatchCalls, [['o5', 'o4']]);
    assert.deepStrictEqual(companyBatchCalls, [], 'resolved opportunities must not trigger unnecessary company fallback hydration');
    assert.deepStrictEqual(firstPage.pagination, {
        current: 1,
        total: 3,
        limit: 2,
        totalItems: 5,
        hasNext: true,
        hasPrev: false
    });
    firstPage.data.forEach(assertTimelineShape);

    opportunityBatchCalls.length = 0;
    companyBatchCalls.length = 0;
    const secondPage = await timeline.getActivityTimeline({ page: 2, limit: 2 });
    assert.deepStrictEqual(secondPage.data.map(item => item.id), ['i3', 'i2']);
    assert.deepStrictEqual(secondPage.data.map(item => item.targetLabel), ['Company 3', '\u672a\u6307\u5b9a']);
    assert.deepStrictEqual(opportunityBatchCalls, []);
    assert.deepStrictEqual(companyBatchCalls, [['c3']]);
    assert.deepStrictEqual(secondPage.pagination, {
        current: 2,
        total: 3,
        limit: 2,
        totalItems: 5,
        hasNext: true,
        hasPrev: true
    });

    assert.strictEqual(readerCalls.timeline, 2);
    assert.strictEqual(readerCalls.general, 0);
    assert.strictEqual(forbiddenSearchCalls, 0);
    assert.strictEqual(opportunityFullCalls.count, 0);
    assert.strictEqual(companyFullCalls.count, 0);
}

async function testMixedTimelineClassificationFiltersAndAuditMerge() {
    const auditCalls = [];
    const opportunityBatchCalls = [];
    const companyBatchCalls = [];
    const timeline = new ActivityTimelineService({
        interactionService: {
            async getActivityTimelineInteractions() {
                return [
                    interaction({ interactionId: 'noise', interactionType: '\u7cfb\u7d71\u4e8b\u4ef6', eventType: '\u7cfb\u7d71\u4e8b\u4ef6', interactionTime: '2026-09-01T12:00:00.000Z' }),
                    interaction({ interactionId: 'legacy', opportunityId: 'o-legacy', companyId: 'c-legacy', eventTitle: '\u66f4\u65b0\u6a5f\u6703\u6848\u4ef6', interactionTime: '2026-09-01T10:00:00.000Z' }),
                    interaction({ interactionId: 'regular', companyId: 'c-regular', interactionTime: '2026-09-01T09:00:00.000Z' })
                ];
            },
            async searchInteractions() {
                throw new Error('general search must not be used');
            }
        },
        auditLoggerService: {
            async getAuditLogs(options) {
                auditCalls.push(options);
                return {
                    data: [audit({ auditId: 'audit', createdAt: '2026-09-01T11:00:00.000Z' })],
                    totalItems: 1
                };
            }
        },
        systemService: configService(['opportunity_updated']),
        opportunitySqlReader: {
            async getOpportunityNamesByIds(ids) {
                opportunityBatchCalls.push([...ids]);
                return new Map([['o-legacy', 'Legacy Opportunity']]);
            }
        },
        companySqlReader: {
            async getCompanyNamesByIds(ids) {
                companyBatchCalls.push([...ids]);
                return new Map([['c-regular', 'Regular Company']]);
            }
        }
    });

    const result = await timeline.getActivityTimeline({ page: 1, limit: 2 });
    assert.deepStrictEqual(result.data.map(item => item.id), ['audit', 'legacy']);
    assert.strictEqual(result.data[1].businessEventType, 'opportunity_updated');
    assert.strictEqual(result.data[1].targetLabel, 'Legacy Opportunity');
    assert.strictEqual(result.pagination.totalItems, 3, 'noise rows must stay excluded while enabled legacy rows participate');
    assert.deepStrictEqual(opportunityBatchCalls, [['o-legacy']], 'only the visible interaction must be hydrated after audit merge');
    assert.deepStrictEqual(companyBatchCalls, []);
    assert.strictEqual(auditCalls.length, 1);
    assert.strictEqual(auditCalls[0].business_event_type, 'opportunity_updated');
    result.data.forEach(assertTimelineShape);

    const filteredAuditCalls = [];
    timeline.auditLoggerService.getAuditLogs = async options => {
        filteredAuditCalls.push(options);
        return { data: [], totalItems: 0 };
    };
    const filtered = await timeline.getActivityTimeline({
        page: 1,
        limit: 20,
        target_type: 'company',
        target_id: 'c-regular'
    });
    assert.deepStrictEqual(filtered.data.map(item => item.id), ['regular']);
    assert.strictEqual(filtered.data[0].targetType, 'company');
    assert.strictEqual(filtered.data[0].targetId, 'c-regular');
    assert.strictEqual(filtered.data[0].targetLabel, 'Regular Company');
    assert.strictEqual(filteredAuditCalls[0].target_type, 'company');
    assert.strictEqual(filteredAuditCalls[0].target_id, 'c-regular');
}

async function testFallbackLabelsEmptyResultAndLimitCap() {
    const opportunityCalls = [];
    const companyCalls = [];
    let rows = [
        interaction({ interactionId: 'opp-known', opportunityId: 'o-known', companyId: 'c-known', interactionTime: '2026-09-01T06:00:00.000Z' }),
        interaction({ interactionId: 'opp-company-fallback', opportunityId: 'o-missing', companyId: 'c-fallback', interactionTime: '2026-09-01T05:00:00.000Z' }),
        interaction({ interactionId: 'opp-unknown', opportunityId: 'o-unknown', companyId: 'c-unknown', interactionTime: '2026-09-01T04:00:00.000Z' }),
        interaction({ interactionId: 'company-known', companyId: 'c-known', interactionTime: '2026-09-01T03:00:00.000Z' }),
        interaction({ interactionId: 'company-unknown', companyId: 'c-unknown', interactionTime: '2026-09-01T02:00:00.000Z' }),
        interaction({ interactionId: 'invalid-date', eventTitle: '', interactionType: 'visit', eventType: 'visit', interactionTime: 'invalid-date' }),
        interaction({ interactionId: 'missing-date', interactionTime: '' })
    ];
    const timeline = new ActivityTimelineService({
        interactionService: {
            async getActivityTimelineInteractions() {
                return rows;
            }
        },
        auditLoggerService: {},
        systemService: configService(),
        opportunitySqlReader: {
            async getOpportunityNamesByIds(ids) {
                opportunityCalls.push([...ids]);
                return new Map([['o-known', 'Known Opportunity']]);
            }
        },
        companySqlReader: {
            async getCompanyNamesByIds(ids) {
                companyCalls.push([...ids]);
                return new Map([['c-known', 'Known Company'], ['c-fallback', 'Fallback Company']]);
            }
        }
    });

    const result = await timeline.getActivityTimeline({ page: 1, limit: 999 });
    assert.deepStrictEqual(result.data.map(item => item.targetLabel), [
        'Known Opportunity',
        'Fallback Company',
        '\u672a\u77e5\u6a5f\u6703',
        'Known Company',
        '\u672a\u77e5\u516c\u53f8',
        '\u672a\u6307\u5b9a',
        '\u672a\u6307\u5b9a'
    ]);
    assert.deepStrictEqual(result.data.slice(-2).map(item => item.id), ['invalid-date', 'missing-date']);
    assert.strictEqual(result.data.find(item => item.id === 'invalid-date').title, 'visit');
    assert.strictEqual(result.data[0].summary, 'Summary');
    assert.strictEqual(result.data[0].actorName, 'Recorder');
    assert.strictEqual(result.data[0].businessAnchor, 'Known Opportunity');
    assert.strictEqual(result.data[1].targetType, 'opportunity', 'company-name fallback must not change opportunity targeting');
    assert.deepStrictEqual(opportunityCalls, [['o-known', 'o-missing', 'o-unknown']]);
    assert.deepStrictEqual(companyCalls, [['c-fallback', 'c-unknown', 'c-known']]);
    assert.strictEqual(result.pagination.limit, 100);
    assert.strictEqual(result.pagination.total, 1);

    rows = [];
    opportunityCalls.length = 0;
    companyCalls.length = 0;
    const empty = await timeline.getActivityTimeline({ page: 4, limit: 25 });
    assert.deepStrictEqual(empty.data, []);
    assert.deepStrictEqual(empty.pagination, {
        current: 4,
        total: 1,
        limit: 25,
        totalItems: 0,
        hasNext: false,
        hasPrev: true
    });
    assert.deepStrictEqual(opportunityCalls, []);
    assert.deepStrictEqual(companyCalls, []);
}

async function testGeneralInteractionSearchCompatibility() {
    const calls = { timeline: 0, general: 0, opportunities: 0, companies: 0 };
    const service = new InteractionService(
        {
            async getActivityTimelineInteractions() {
                calls.timeline += 1;
                return [interaction({ interactionId: 'timeline-only' })];
            },
            async getInteractions() {
                calls.general += 1;
                return [interaction({ interactionId: 'general', opportunityId: 'o1', contentSummary: 'Acme note' })];
            }
        },
        {},
        {
            async getOpportunities() {
                calls.opportunities += 1;
                return [{ opportunityId: 'o1', opportunityName: 'Acme Opportunity' }];
            }
        },
        {
            async getCompanyList() {
                calls.companies += 1;
                return [];
            }
        }
    );

    const result = await service.searchInteractions('acme', 1, true);
    assert.deepStrictEqual(result.data.map(item => [item.interactionId, item.opportunityName]), [
        ['general', 'Acme Opportunity']
    ]);
    assert.deepStrictEqual(result.pagination, {
        current: 1,
        total: 1,
        totalItems: 1,
        hasNext: false,
        hasPrev: false
    });
    assert.deepStrictEqual(calls, { timeline: 0, general: 1, opportunities: 1, companies: 1 });
}

function testStructuralBoundary() {
    const timelineSource = fs.readFileSync(path.join(__dirname, '..', 'services', 'activity-timeline-service.js'), 'utf8');
    const readerSource = fs.readFileSync(path.join(__dirname, '..', 'data', 'interaction-sql-reader.js'), 'utf8');
    const methodStart = readerSource.indexOf('async getActivityTimelineInteractions()');
    const methodEnd = readerSource.indexOf('\n    /**', methodStart);
    const methodSource = readerSource.slice(methodStart, methodEnd);

    assert(methodStart >= 0, 'Timeline-specific SQL reader method must exist');
    assert(!timelineSource.includes("searchInteractions('', 1, true)"), 'Timeline must not regress to general-purpose full enrichment');
    assert(timelineSource.includes('this.interactionService.getActivityTimelineInteractions()'));
    assert(methodSource.includes(".select('interaction_id, opportunity_id, company_id, interaction_time, interaction_type, event_title, content_summary, recorder')"));
    assert(!methodSource.includes(".select('*')"), 'Timeline projection must stay narrow');
}

async function main() {
    await testPostSelectionHydrationAndMultiplePages();
    await testMixedTimelineClassificationFiltersAndAuditMerge();
    await testFallbackLabelsEmptyResultAndLimitCap();
    await testGeneralInteractionSearchCompatibility();
    testStructuralBoundary();
    console.log('Activity Timeline performance contract check passed.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
