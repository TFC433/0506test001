const assert = require('assert');

const OpportunityService = require('../services/opportunity-service');

const IDS = {
    rawAlice: '11111111-1111-4111-8111-111111111111',
    rawBob: '22222222-2222-4222-8222-222222222222',
    rawCarol: '33333333-3333-4333-8333-333333333333',
    rawExternal: '44444444-4444-4444-8444-444444444444',
    rawMissing: '55555555-5555-4555-8555-555555555555',
    rawNoCore: '66666666-6666-4666-8666-666666666666'
};

function rawContact(overrides = {}) {
    return {
        cardId: IDS.rawAlice,
        rowIndex: 11,
        name: 'Alice',
        company: 'Acme\u6709\u9650\u516c\u53f8',
        position: 'Manager',
        jobTitle: 'Manager',
        department: 'Sales',
        phone: '02-1111-2222',
        mobile: '0911-111-111',
        email: 'alice@example.com',
        website: 'https://acme.example',
        address: 'Taipei',
        driveLink: 'https://drive.example/alice',
        status: 'active',
        ...overrides
    };
}

function makeService({ opportunityInfo, linkedContacts = [], companyContacts = [], companies = [], rawReader, calls }) {
    return new OpportunityService({
        config: {},
        opportunityWriter: {},
        contactReader: {},
        contactWriter: {},
        companyWriter: {},
        interactionReader: {},
        interactionService: {},
        eventLogReader: {},
        systemService: {},
        opportunitySqlReader: {
            async getOpportunityById(opportunityId) {
                calls.opportunityById.push(opportunityId);
                return opportunityInfo;
            },
            async getOpportunitiesByParentId(opportunityId) {
                calls.children.push(opportunityId);
                return [{ opportunityId: 'child-1' }];
            }
        },
        opportunitySqlWriter: {},
        eventLogSqlReader: {
            async getEventLogsByOpportunityId(opportunityId) {
                calls.events.push(opportunityId);
                return [{ eventId: 'event-1', createdTime: '2026-09-07T10:00:00.000Z' }];
            }
        },
        companySqlReader: {
            async getCompanies() {
                calls.companies += 1;
                return companies;
            }
        },
        interactionSqlReader: {
            async getInteractionsByOpportunityIds(opportunityIds) {
                calls.interactions.push([...opportunityIds]);
                return [{
                    interactionId: 'interaction-1',
                    interactionTime: '2026-09-07T11:00:00.000Z',
                    contentSummary: 'event_log_id=event-1'
                }];
            }
        },
        contactSqlReader: {
            async getContactsByOpportunityId(opportunityId) {
                calls.linked.push(opportunityId);
                return linkedContacts;
            },
            async getContactsByCompanyId(companyId) {
                calls.companyContacts.push(companyId);
                return companyContacts;
            }
        },
        contactSqlWriter: {},
        rawContactSqlReader: rawReader
    });
}

function makeCalls() {
    return {
        opportunityById: [],
        children: [],
        events: [],
        interactions: [],
        linked: [],
        companyContacts: [],
        companies: 0,
        rawIdentity: 0,
        rawBroad: 0,
        rawBatch: []
    };
}

async function testSelectiveRawHydrationParity() {
    const calls = makeCalls();
    const irrelevantIdentities = Array.from({ length: 100 }, (_, index) => ({
        cardId: `irrelevant-${index}`,
        name: `Irrelevant ${index}`,
        company: `Other ${index}`
    }));
    const rawIdentityIndex = [
        { cardId: IDS.rawAlice, name: 'Alice', company: 'Acme\u6709\u9650\u516c\u53f8' },
        { cardId: IDS.rawBob, name: 'Bob', company: ' ACME (Taipei) \u516c\u53f8 ' },
        { cardId: IDS.rawCarol, name: 'Carol', company: 'ACME   \u516c\u53f8' },
        ...irrelevantIdentities,
        { cardId: IDS.rawExternal, name: 'External', company: 'Beta \u516c\u53f8' },
        { cardId: 'blank-name', name: '   ', company: 'Acme \u516c\u53f8' }
    ];
    const hydrated = new Map([
        [IDS.rawAlice, rawContact()],
        [IDS.rawBob, rawContact({
            cardId: IDS.rawBob,
            rowIndex: 12,
            name: 'Bob',
            company: ' ACME (Taipei) \u516c\u53f8 ',
            position: 'Engineer',
            jobTitle: 'Engineer',
            email: 'bob@example.com',
            phone: '',
            mobile: '',
            driveLink: 'https://drive.example/bob'
        })],
        [IDS.rawCarol, rawContact({
            cardId: IDS.rawCarol,
            rowIndex: 13,
            name: 'Carol',
            company: 'ACME \u516c\u53f8',
            position: 'Director',
            jobTitle: 'Director',
            email: 'carol@example.com',
            driveLink: 'https://drive.example/carol'
        })],
        [IDS.rawExternal, rawContact({
            cardId: IDS.rawExternal,
            rowIndex: 14,
            name: 'External',
            company: 'Beta \u516c\u53f8',
            email: 'external@example.com',
            driveLink: 'https://drive.example/external'
        })]
    ]);
    const rawReader = {
        async getRawContacts() {
            calls.rawBroad += 1;
            throw new Error('Opportunity Detail must not hydrate the complete RAW pool');
        },
        async getRawContactIdentityIndex() {
            calls.rawIdentity += 1;
            return rawIdentityIndex;
        },
        async getRawContactsByCardIds(cardIds) {
            calls.rawBatch.push([...cardIds]);
            return hydrated;
        },
        async getRawContactByCardId() {
            throw new Error('N+1 RAW lookup must not be used');
        }
    };
    const linkedContacts = [
        {
            contactId: 'linked-carol',
            name: 'Carol',
            companyId: 'company-acme',
            jobTitle: 'Director',
            email: 'carol@example.com',
            sourceId: IDS.rawCarol
        },
        {
            contactId: 'linked-external',
            name: 'External',
            companyId: 'company-beta',
            jobTitle: 'Buyer',
            email: 'external@example.com',
            source_id: IDS.rawExternal
        },
        {
            contactId: 'linked-manual',
            name: 'Manual',
            companyId: 'company-acme',
            sourceId: 'MANUAL'
        },
        {
            contactId: 'linked-invalid',
            name: 'Invalid',
            companyId: 'company-acme',
            sourceId: '12345'
        },
        {
            contactId: 'linked-missing',
            name: 'Missing',
            companyId: 'company-acme',
            sourceId: IDS.rawMissing
        }
    ];
    const companyContacts = [{
        contactId: 'core-alice',
        name: 'Alice',
        jobTitle: 'Manager',
        email: 'alice@example.com',
        phone: '02-1111-2222',
        mobile: '0911-111-111'
    }];
    const opportunityInfo = {
        opportunityId: 'opportunity-1',
        opportunityName: 'Opportunity 1',
        customerCompany: ' ACME \u80a1\u4efd\u6709\u9650\u516c\u53f8\uff08Taipei\uff09 ',
        mainContact: 'Alice',
        parentOpportunityId: ''
    };
    const service = makeService({
        opportunityInfo,
        linkedContacts,
        companyContacts,
        companies: [
            { companyId: 'company-acme', companyName: 'Acme \u6709\u9650\u516c\u53f8' },
            { companyId: 'company-beta', companyName: 'Beta \u516c\u53f8' }
        ],
        rawReader,
        calls
    });

    const result = await service.getOpportunityDetails('opportunity-1');

    assert.strictEqual(rawIdentityIndex.length, 105, 'fixture must represent a large mostly irrelevant RAW identity set');
    assert.strictEqual(calls.rawBroad, 0);
    assert.strictEqual(calls.rawIdentity, 1);
    assert.deepStrictEqual(calls.rawBatch, [[
        IDS.rawAlice,
        IDS.rawBob,
        IDS.rawCarol,
        IDS.rawExternal,
        IDS.rawMissing
    ]], 'same-company and linked source IDs must be unioned and deduplicated in one batch');
    assert.strictEqual(hydrated.size, 4, 'only four relevant full RAW records are hydrated from 105 identities');

    assert.deepStrictEqual(calls.opportunityById, ['opportunity-1']);
    assert.deepStrictEqual(calls.children, ['opportunity-1']);
    assert.deepStrictEqual(calls.interactions, [['opportunity-1']]);
    assert.deepStrictEqual(calls.events, ['opportunity-1']);
    assert.deepStrictEqual(calls.linked, ['opportunity-1']);
    assert.deepStrictEqual(calls.companyContacts, ['company-acme']);
    assert.strictEqual(calls.companies, 1, 'broad company lookup is intentionally retained in V1');

    assert.deepStrictEqual(Object.keys(result), [
        'opportunityInfo',
        'interactions',
        'eventLogs',
        'linkedContacts',
        'potentialContacts',
        'parentOpportunity',
        'childOpportunities'
    ]);
    assert.strictEqual(result.interactions[0].EventLogs[0].eventId, 'event-1');
    assert.deepStrictEqual(result.childOpportunities, [{ opportunityId: 'child-1' }]);
    assert.strictEqual(result.parentOpportunity, null);

    const linkedCarol = result.linkedContacts.find(contact => contact.contactId === 'linked-carol');
    assert.strictEqual(linkedCarol.companyName, 'Acme \u6709\u9650\u516c\u53f8');
    assert.strictEqual(linkedCarol.driveLink, 'https://drive.example/carol');
    assert.strictEqual(linkedCarol.cardId, IDS.rawCarol);
    assert.strictEqual(linkedCarol.rowIndex, 13);

    const linkedExternal = result.linkedContacts.find(contact => contact.contactId === 'linked-external');
    assert.strictEqual(linkedExternal.companyName, 'Beta \u516c\u53f8');
    assert.strictEqual(linkedExternal.driveLink, 'https://drive.example/external');
    assert.strictEqual(linkedExternal.cardId, IDS.rawExternal);
    assert.strictEqual(linkedExternal.rowIndex, 14);

    const linkedManual = result.linkedContacts.find(contact => contact.contactId === 'linked-manual');
    const linkedInvalid = result.linkedContacts.find(contact => contact.contactId === 'linked-invalid');
    const linkedMissing = result.linkedContacts.find(contact => contact.contactId === 'linked-missing');
    assert.strictEqual(linkedManual.cardId, undefined);
    assert.strictEqual(linkedInvalid.cardId, undefined);
    assert.strictEqual(linkedMissing.cardId, undefined);

    assert.deepStrictEqual(result.potentialContacts.map(contact => contact.name), ['Alice', 'Bob']);
    const coreAlice = result.potentialContacts[0];
    assert.strictEqual(coreAlice.driveLink, 'https://drive.example/alice');
    assert.strictEqual(coreAlice.cardId, IDS.rawAlice);
    assert.strictEqual(coreAlice.rowIndex, 11);
    assert.strictEqual(coreAlice.company, 'Acme \u6709\u9650\u516c\u53f8');

    const rawBob = result.potentialContacts[1];
    assert.strictEqual(rawBob.source, 'RAW');
    assert.strictEqual(rawBob.driveLink, 'https://drive.example/bob');
    assert.strictEqual(rawBob.cardId, IDS.rawBob);
    assert.strictEqual(rawBob.rowIndex, 12);
    assert.strictEqual(result.potentialContacts.some(contact => contact.name === 'Carol'), false, 'RAW candidate already represented by a linked contact must stay suppressed');
    assert.strictEqual(result.opportunityInfo.mainContactJobTitle, 'Manager');
}

async function testMissingCustomerCompanyAvoidsUnneededRawReads() {
    const calls = makeCalls();
    const service = makeService({
        opportunityInfo: {
            opportunityId: 'opportunity-empty',
            customerCompany: '',
            mainContact: '',
            parentOpportunityId: ''
        },
        linkedContacts: [],
        companyContacts: [],
        companies: [],
        rawReader: {
            async getRawContacts() {
                calls.rawBroad += 1;
                throw new Error('broad RAW read must not be used');
            },
            async getRawContactIdentityIndex() {
                calls.rawIdentity += 1;
                return [];
            },
            async getRawContactsByCardIds(cardIds) {
                calls.rawBatch.push([...cardIds]);
                return new Map();
            }
        },
        calls
    });

    const result = await service.getOpportunityDetails('opportunity-empty');

    assert.deepStrictEqual(result.linkedContacts, []);
    assert.deepStrictEqual(result.potentialContacts, []);
    assert.strictEqual(calls.rawBroad, 0);
    assert.strictEqual(calls.rawIdentity, 0);
    assert.deepStrictEqual(calls.rawBatch, []);
    assert.deepStrictEqual(calls.companyContacts, []);
}

async function testRawCandidatesRemainAvailableWithoutCoreCompanyMatch() {
    const calls = makeCalls();
    const raw = rawContact({
        cardId: IDS.rawNoCore,
        rowIndex: 21,
        name: 'No Core Contact',
        company: 'NoCo \u516c\u53f8',
        email: 'nocore@example.com'
    });
    const service = makeService({
        opportunityInfo: {
            opportunityId: 'opportunity-no-core',
            customerCompany: 'NoCo \u6709\u9650\u516c\u53f8',
            mainContact: '',
            parentOpportunityId: ''
        },
        linkedContacts: [],
        companyContacts: [],
        companies: [],
        rawReader: {
            async getRawContacts() {
                calls.rawBroad += 1;
                throw new Error('broad RAW read must not be used');
            },
            async getRawContactIdentityIndex() {
                calls.rawIdentity += 1;
                return [{ cardId: IDS.rawNoCore, name: raw.name, company: raw.company }];
            },
            async getRawContactsByCardIds(cardIds) {
                calls.rawBatch.push([...cardIds]);
                return new Map([[IDS.rawNoCore, raw]]);
            }
        },
        calls
    });

    const result = await service.getOpportunityDetails('opportunity-no-core');

    assert.deepStrictEqual(calls.companyContacts, []);
    assert.deepStrictEqual(calls.rawBatch, [[IDS.rawNoCore]]);
    assert.deepStrictEqual(result.potentialContacts.map(contact => contact.name), ['No Core Contact']);
}

async function testIdentityReaderProjectionAndOrdering() {
    const supabaseModulePath = require.resolve('../config/supabase');
    const readerModulePath = require.resolve('../data/raw-contact-sql-reader');
    const originalSupabaseModule = require.cache[supabaseModulePath];
    const originalReaderModule = require.cache[readerModulePath];
    const calls = { table: null, select: null, order: null };
    const fakeSupabase = {
        from(table) {
            calls.table = table;
            return {
                select(columns) {
                    calls.select = columns;
                    return {
                        async order(column, options) {
                            calls.order = [column, options];
                            return {
                                data: [{
                                    card_id: IDS.rawAlice,
                                    name: 'Alice',
                                    company: 'Acme',
                                    captured_at: '2026-09-07T00:00:00.000Z',
                                    drive_link: 'must-not-be-returned'
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
        const RawContactSqlReader = require('../data/raw-contact-sql-reader');
        const rows = await new RawContactSqlReader().getRawContactIdentityIndex();

        assert.deepStrictEqual(calls, {
            table: 'raw_contact_captures',
            select: 'card_id, name, company, captured_at',
            order: ['captured_at', { ascending: false, nullsFirst: false }]
        });
        assert.deepStrictEqual(rows, [{ cardId: IDS.rawAlice, name: 'Alice', company: 'Acme' }]);
    } finally {
        if (originalSupabaseModule) require.cache[supabaseModulePath] = originalSupabaseModule;
        else delete require.cache[supabaseModulePath];

        if (originalReaderModule) require.cache[readerModulePath] = originalReaderModule;
        else delete require.cache[readerModulePath];
    }
}

async function main() {
    await testSelectiveRawHydrationParity();
    await testMissingCustomerCompanyAvoidsUnneededRawReads();
    await testRawCandidatesRemainAvailableWithoutCoreCompanyMatch();
    await testIdentityReaderProjectionAndOrdering();
    console.log('Opportunity Detail selective RAW hydration contract check passed.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
