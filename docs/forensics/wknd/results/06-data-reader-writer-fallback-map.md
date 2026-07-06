# 06 Data Reader / Writer Fallback Map

Run time: 2026-07-04 07:08 +08:00

## Executive Conclusion

EVIDENCED: Runtime wiring is not owned by `data/index.js`. The active service container imports data classes directly and instantiates a mixed set of SQL, RAW Sheet, and operational Sheet readers/writers in `services/service-container.js:27-56` and `services/service-container.js:104-145`.

EVIDENCED: CORE CRM domains are mostly SQL-primary at service level, but not uniformly SQL-only. Contacts retain a deliberate RAW Google Sheets bridge through `contactRawReader` and `contactWriter` in `services/service-container.js:169-187`, while weekly business reads are SQL-first with Sheet fallback in `services/weekly-business-service.js:45-68`.

EVIDENCED: Google Sheets remains active for RAW contacts, system/product/internal-ops style operational data, and weekly-business fallback reads. `data/base-reader.js:149-156` and `data/base-writer.js:43-78` show the shared Sheet access primitives used by Sheet subclasses.

UNKNOWN: This targeted pass did not execute runtime traffic, inspect production environment settings, or prove which fallback branches are hit in live operation. UNKNOWN remains unresolved evidence, not a removal signal.

## Files Inspected

| File | Purpose in this pass |
| --- | --- |
| `data/index.js` | Barrel export check; not runtime owner evidence. |
| `services/service-container.js` | Runtime DI owner and active reader/writer instantiation evidence. |
| `data/base-reader.js` | Shared Google Sheets reader dependency and cache behavior evidence. |
| `data/base-writer.js` | Shared Google Sheets writer dependency evidence. |
| `data/contact-reader.js` | RAW contact Sheet reader field mapping evidence. |
| `data/contact-writer.js` | RAW contact Sheet write and fallback auto-tag write evidence. |
| `data/company-sql-reader.js` | SQL reader with DB view/table fallback evidence. |
| `data/opportunity-sql-reader.js` | SQL reader with view/table and JS aggregation fallback evidence. |
| `data/weekly-business-reader.js` | Weekly business Sheet fallback reader evidence. |
| `services/contact-service.js` | Contact SQL/RAW boundary and fallback behavior evidence. |
| `services/company-service.js` | Company SQL-first read and fallback behavior evidence. |
| `services/opportunity-service.js` | Opportunity SQL-primary behavior and compatibility fallback references. |
| `services/weekly-business-service.js` | Weekly business SQL-first read, Sheet fallback, SQL-only writes evidence. |
| `services/event-log-service.js` | Event log SQL-only service behavior evidence. |
| `services/announcement-service.js` | Announcement SQL-only service behavior evidence. |
| `services/product-service.js` | Product Sheet reader/writer behavior evidence. |
| `services/internal-ops-service.js` | Internal ops Sheet reader/writer behavior evidence. |
| `services/subscription-ops-service.js` | Subscription ops SQL reader/writer behavior evidence. |
| `services/interaction-service.js` | Interaction SQL reader/writer plus SQL context readers evidence. |

## Evidence Tables

### Data File Inventory

| Family | Files | Classification | Evidence |
| --- | --- | --- | --- |
| Shared Sheet base | `data/base-reader.js`, `data/base-writer.js` | ACTIVE_LEGACY_PRIMARY / compatibility substrate | `BaseReader` requires `sheets` and `spreadsheetId`, stores `targetSpreadsheetId`, and reads via `googleClientService.getSheetValuesNative` or `sheets.spreadsheets.values.get` in `data/base-reader.js:47-58` and `data/base-reader.js:149-156`; `BaseWriter` writes against `sheets.spreadsheets` in `data/base-writer.js:17-29` and `data/base-writer.js:43-78`. |
| Legacy/Sheet readers | `announcement-reader.js`, `company-reader.js`, `contact-reader.js`, `event-log-reader.js`, `interaction-reader.js`, `opportunity-reader.js`, `product-reader.js`, `system-reader.js`, `weekly-business-reader.js`, `internal-ops-reader.js` | ACTIVE_MIXED / COMPATIBILITY_CANDIDATE by domain | `data/index.js:4-12` exports several legacy readers, but runtime instantiation is narrower in `services/service-container.js:104-125`; `ContactReader` is explicitly RAW in `services/service-container.js:28` and `services/service-container.js:105-107`. |
| Legacy/Sheet writers | `announcement-writer.js`, `company-writer.js`, `contact-writer.js`, `event-log-writer.js`, `interaction-writer.js`, `opportunity-writer.js`, `product-writer.js`, `system-writer.js`, `weekly-business-writer.js`, `internal-ops-writer.js` | ACTIVE_MIXED / COMPATIBILITY_CANDIDATE by domain | `data/index.js:15-22` exports legacy writers, but service-container instantiates only `ContactWriter`, `SystemWriter`, `ProductWriter`, and `InternalOpsWriter` from that family in `services/service-container.js:127-145`. |
| SQL readers | `announcement-sql-reader.js`, `audit-log-sql-reader.js`, `company-sql-reader.js`, `contact-sql-reader.js`, `event-log-sql-reader.js`, `interaction-sql-reader.js`, `opportunity-sql-reader.js`, `subscription-ops-sql-reader.js`, `weekly-business-sql-reader.js` | ACTIVE_SQL_PRIMARY | Service-container imports and instantiates SQL readers in `services/service-container.js:29-41` and `services/service-container.js:110-125`. |
| SQL writers | `announcement-sql-writer.js`, `audit-log-sql-writer.js`, `company-sql-writer.js`, `contact-sql-writer.js`, `event-log-sql-writer.js`, `interaction-sql-writer.js`, `opportunity-sql-writer.js`, `subscription-ops-sql-writer.js`, `weekly-business-sql-writer.js` | ACTIVE_SQL_PRIMARY | Service-container imports and instantiates SQL writers in `services/service-container.js:45-56` and `services/service-container.js:132-145`. |
| Barrel file | `data/index.js` | COMPATIBILITY_CANDIDATE | The barrel exports legacy classes in `data/index.js:4-35`; service-container does not import from `data/index.js`, instead importing concrete modules directly in `services/service-container.js:27-56`. |

### Runtime Export / Caller Table

| Data object | Runtime caller / injection | Classification | Evidence |
| --- | --- | --- | --- |
| `ContactReader` as `contactRawReader` | `ContactService`, `ContactWriter`, exposed services | RAW_DATA_DEPENDENCY | Instantiated with `config.IDS.RAW` in `services/service-container.js:105-107`; injected into `ContactService` as explicit RAW in `services/service-container.js:177-184`; `ContactService` reads RAW contacts in `services/contact-service.js:224-226`. |
| `ContactWriter` | `ContactService`, `OpportunityService`, `CompanyService`, controller construction | RAW_DATA_DEPENDENCY / ACTIVE_LEGACY_PRIMARY | Instantiated with `config.IDS.RAW` in `services/service-container.js:127-129`; `ContactService.updatePotentialContact` writes RAW rows through `contactWriter.writePotentialContactRow` in `services/contact-service.js:581-608`. |
| `ContactSqlReader` / `ContactSqlWriter` | Contact official CORE, opportunity/company relationships | ACTIVE_SQL_PRIMARY | `ContactService` stores SQL reader/writer in `services/contact-service.js:44-52`; official contact writes call `contactSqlWriter` in `services/contact-service.js:464-489` and `services/contact-service.js:545-565`. |
| `CompanySqlReader` / `CompanySqlWriter` | Company service and opportunity company scaffolding | ACTIVE_SQL_PRIMARY / ACTIVE_FALLBACK | Company service uses `companySqlReader.getCompanies()` first and falls back if unavailable in `services/company-service.js:104-127`; creation calls `companySqlWriter.createCompany` in `services/company-service.js:282-284`. |
| `OpportunitySqlReader` / `OpportunitySqlWriter` | Opportunity service | ACTIVE_SQL_PRIMARY | Opportunity reads require `OpportunitySqlReader` in `services/opportunity-service.js:138-143`; writes call `opportunitySqlWriter.createOpportunity` and link/unlink methods in `services/opportunity-service.js:459` and `services/opportunity-service.js:848-890`. |
| `InteractionSqlReader` / `InteractionSqlWriter` | Interaction service | ACTIVE_SQL_PRIMARY | Interaction service reads via `interactionSqlReader.getInteractions` in `services/interaction-service.js:31-42` and writes via `interactionSqlWriter` in `services/interaction-service.js:177-230`. |
| `EventLogSqlReader` / `EventLogSqlWriter` | Event log service | ACTIVE_SQL_PRIMARY | Event log service labels SQL as authoritative in `services/event-log-service.js:22-40`; reads and writes require SQL injection in `services/event-log-service.js:239-266` and `services/event-log-service.js:314-337`. |
| `WeeklyBusinessSqlReader` / `WeeklyBusinessReader` | Weekly business service | ACTIVE_FALLBACK | `_fetchInternal` tries SQL first, logs Sheet fallback on SQL read failure, then reads `weeklyBusinessReader` in `services/weekly-business-service.js:45-68`. |
| `WeeklyBusinessSqlWriter` | Weekly business service | ACTIVE_SQL_PRIMARY | Create/update/delete require `weeklyBusinessSqlWriter` in `services/weekly-business-service.js:327-377`. |
| `AnnouncementSqlReader` / `AnnouncementSqlWriter` | Announcement service | ACTIVE_SQL_PRIMARY | Announcement service constructor only accepts SQL dependencies in `services/announcement-service.js:14-23`; reads and writes use SQL reader/writer in `services/announcement-service.js:33-36` and `services/announcement-service.js:82-122`. |
| `ProductReader` / `ProductWriter` | Product service | ACTIVE_LEGACY_PRIMARY | Product service reads through `productReader.getAllProducts` and writes through `productWriter` in `services/product-service.js:33-58`, `services/product-service.js:120-128`, and `services/product-service.js:136-170`. |
| `InternalOpsReader` / `InternalOpsWriter` | Internal ops service | ACTIVE_LEGACY_PRIMARY | Service-container injects Sheet-based internal ops objects in `services/service-container.js:121-123` and `services/service-container.js:142-143`; internal ops service uses `this.reader`/`this.writer` for team, dev-project, and subscription operations in `services/internal-ops-service.js:311-689`. |
| `SubscriptionOpsSqlReader` / `SubscriptionOpsSqlWriter` | Subscription ops service | ACTIVE_SQL_PRIMARY | Constructor stores SQL reader/writer in `services/subscription-ops-service.js:81-86`; CRUD reads/writes call SQL dependencies in `services/subscription-ops-service.js:198-199` and `services/subscription-ops-service.js:261-371`. |
| `SystemReader` / `SystemWriter` | Auth/system/product category settings | ACTIVE_LEGACY_PRIMARY | Service-container instantiates `SystemReader` and `SystemWriter` with `config.IDS.SYSTEM` in `services/service-container.js:116-145`; product category order uses `systemWriter.updateSystemPref` and system cache clearing in `services/product-service.js:312-323`. |

### SQL vs Sheets vs RAW Dependency Table

| Domain | Read source classification | Write source classification | Evidence |
| --- | --- | --- | --- |
| Contacts: official CORE | ACTIVE_SQL_PRIMARY with compatibility naming | ACTIVE_SQL_PRIMARY | ContactService states CORE writes are SQL only in `services/contact-service.js:26-29`; official create/update/delete call `contactSqlWriter` in `services/contact-service.js:464-489` and `services/contact-service.js:545-565`. |
| Contacts: RAW potential contacts | RAW_DATA_DEPENDENCY | RAW_DATA_DEPENDENCY | RAW reader/writer are injected with `config.IDS.RAW` in `services/service-container.js:105-129`; potential contacts read and write through `contactRawReader`/`contactWriter` in `services/contact-service.js:224-256` and `services/contact-service.js:581-645`. |
| Companies | ACTIVE_FALLBACK | ACTIVE_SQL_PRIMARY | Company read first uses `companySqlReader.getCompanies()` and then a fallback branch in `services/company-service.js:104-127`; create uses `companySqlWriter.createCompany` in `services/company-service.js:282-284`. |
| Opportunities | ACTIVE_SQL_PRIMARY with compatibility fallback branches | ACTIVE_SQL_PRIMARY | `_fetchOpportunities` requires SQL in `services/opportunity-service.js:138-143`; detail path has SQL reader preference with legacy fallbacks for interactions/events/contact in `services/opportunity-service.js:494-512`; writes call SQL writer in `services/opportunity-service.js:459` and `services/opportunity-service.js:848-890`. |
| Interactions | ACTIVE_SQL_PRIMARY | ACTIVE_SQL_PRIMARY | Interaction service says Sheet fallback was removed in comments and code reads/writes SQL objects in `services/interaction-service.js:1-24`, `services/interaction-service.js:31-42`, and `services/interaction-service.js:177-230`. |
| Event logs | ACTIVE_SQL_PRIMARY | ACTIVE_SQL_PRIMARY | EventLogService stores deprecated `eventReader` only for cache invalidation while SQL reader/writer are authoritative in `services/event-log-service.js:22-50`; read/write methods enforce SQL injection in `services/event-log-service.js:239-266` and `services/event-log-service.js:418-466`. |
| Weekly business | ACTIVE_FALLBACK | ACTIVE_SQL_PRIMARY | Reads are SQL-first with Sheet fallback in `services/weekly-business-service.js:45-68`; writes require SQL writer in `services/weekly-business-service.js:327-377`. |
| Announcements | ACTIVE_SQL_PRIMARY | ACTIVE_SQL_PRIMARY | AnnouncementService accepts only SQL dependencies and uses SQL reader/writer in `services/announcement-service.js:14-23`, `services/announcement-service.js:33-36`, and `services/announcement-service.js:82-122`. |
| Products | ACTIVE_LEGACY_PRIMARY | ACTIVE_LEGACY_PRIMARY | ProductService reads `productReader.getAllProducts` and writes `productWriter` in `services/product-service.js:33-58`, `services/product-service.js:120-170`; service-container wires these with `config.IDS.PRODUCT` in `services/service-container.js:121-143`. |
| Internal ops | ACTIVE_LEGACY_PRIMARY | ACTIVE_LEGACY_PRIMARY | InternalOpsService uses injected Sheet reader/writer for workloads, dev projects, and subscriptions in `services/internal-ops-service.js:311-689`; service-container wires `InternalOpsReader/Writer` in `services/service-container.js:121-143`. |
| Subscription ops | ACTIVE_SQL_PRIMARY | ACTIVE_SQL_PRIMARY | SubscriptionOpsService stores SQL dependencies in `services/subscription-ops-service.js:81-86` and uses them in `services/subscription-ops-service.js:198-199` and `services/subscription-ops-service.js:261-371`. |
| System/auth configuration | ACTIVE_LEGACY_PRIMARY | ACTIVE_LEGACY_PRIMARY | SystemReader/SystemWriter are Sheet-backed via `config.IDS.SYSTEM` in `services/service-container.js:120-145`; SystemService and ProductService use system reader/writer paths in `services/product-service.js:287-323`. |

### Fallback Behavior Ledger

| Area | Fallback / compatibility behavior | Classification | Evidence |
| --- | --- | --- | --- |
| `CompanyService._getAllCompanies` | Attempts SQL reader first; on failure or no data, attempts legacy reader if present, otherwise SQL reader again. | ACTIVE_FALLBACK | `services/company-service.js:104-127`. |
| `CompanySqlReader.getCompanies` | Attempts `v_companies_summary`, then base `companies` table if the view is missing or unusable. | ACTIVE_FALLBACK | `data/company-sql-reader.js:73-100`. |
| `OpportunitySqlReader.getSalesAnalysisBaseDeals` | Attempts summary view, then base `opportunities` table if the view is missing. | ACTIVE_FALLBACK | `data/opportunity-sql-reader.js:31-42`. |
| `OpportunitySqlReader.searchOpportunitiesTable` | Attempts `lineageGroupedViewName`; if unavailable, falls back to table/JS aggregation path. | ACTIVE_FALLBACK | `data/opportunity-sql-reader.js:272-390`. |
| `OpportunityService.getOpportunityDetails` | Prefers SQL interaction/event/contact readers, but retains fallback branches to legacy readers when SQL readers are absent. | COMPATIBILITY_CANDIDATE / ACTIVE_FALLBACK | `services/opportunity-service.js:488-515`. |
| `OpportunityService` RAW enrichment | Uses `contactWriter.contactReader` to read RAW contacts for linked-contact enrichment and potential-contact merge. | RAW_DATA_DEPENDENCY | `services/opportunity-service.js:664-722`. |
| `WeeklyBusinessService._fetchInternal` | Uses SQL reader for summary/entries; catches SQL failure and reads from Sheet reader. | ACTIVE_FALLBACK | `services/weekly-business-service.js:45-68`. |
| `ContactService.getPotentialContacts` | Reads RAW contacts, applies lazy auto-tag, writes missing tag values back to RAW Sheet, and invalidates RAW cache. | RAW_DATA_DEPENDENCY / ACTIVE_FALLBACK | `services/contact-service.js:224-256`; `data/contact-writer.js:78-122`. |
| `ContactService.updatePotentialContact` | Merges RAW row data, evaluates fallback auto-tag safely, writes to RAW Sheet, and invalidates RAW cache. | RAW_DATA_DEPENDENCY / ACTIVE_FALLBACK | `services/contact-service.js:581-645`. |
| `EventLogService` legacy reader | Stores `eventReader` only for legacy cache invalidation safety while enforcing SQL-only read/write methods. | COMPATIBILITY_CANDIDATE | `services/event-log-service.js:22-50` and `services/event-log-service.js:239-266`. |
| `BaseReader` Sheet calls | Uses native Google client if available, otherwise Google Sheets API client. | ACTIVE_FALLBACK | `data/base-reader.js:149-156` and `data/base-reader.js:196-205`. |

### Domain-Level Source Classification

| Domain | Classification | Evidence |
| --- | --- | --- |
| Official contacts | ACTIVE_SQL_PRIMARY | `services/contact-service.js:461-489`, `services/contact-service.js:545-565`. |
| RAW potential contacts | RAW_DATA_DEPENDENCY | `services/service-container.js:105-129`, `services/contact-service.js:224-256`, `services/contact-service.js:581-645`. |
| Companies | ACTIVE_FALLBACK | `services/company-service.js:104-127`, `services/company-service.js:282-284`. |
| Opportunities | ACTIVE_SQL_PRIMARY with ACTIVE_FALLBACK read helpers | `services/opportunity-service.js:138-143`, `services/opportunity-service.js:488-515`, `data/opportunity-sql-reader.js:272-390`. |
| Interactions | ACTIVE_SQL_PRIMARY | `services/interaction-service.js:31-42`, `services/interaction-service.js:177-230`. |
| Event logs | ACTIVE_SQL_PRIMARY | `services/event-log-service.js:239-266`, `services/event-log-service.js:418-466`. |
| Weekly business | ACTIVE_FALLBACK for reads; ACTIVE_SQL_PRIMARY for writes | `services/weekly-business-service.js:45-68`, `services/weekly-business-service.js:327-377`. |
| Announcements | ACTIVE_SQL_PRIMARY | `services/announcement-service.js:14-23`, `services/announcement-service.js:33-36`, `services/announcement-service.js:82-122`. |
| Products | ACTIVE_LEGACY_PRIMARY | `services/product-service.js:33-58`, `services/product-service.js:120-170`. |
| Internal ops | ACTIVE_LEGACY_PRIMARY | `services/internal-ops-service.js:311-689`. |
| Subscription ops | ACTIVE_SQL_PRIMARY | `services/subscription-ops-service.js:81-86`, `services/subscription-ops-service.js:198-199`, `services/subscription-ops-service.js:261-371`. |
| System/auth settings | ACTIVE_LEGACY_PRIMARY | `services/service-container.js:120-145`, `services/product-service.js:287-323`. |
| `data/index.js` barrel | COMPATIBILITY_CANDIDATE | `data/index.js:4-35`; direct concrete imports in `services/service-container.js:27-56`. |

## LLM Confusion Risks

| Risk | Why it can confuse future work | Evidence |
| --- | --- | --- |
| Treating `data/index.js` as runtime truth | The barrel exports many legacy classes, but active DI imports concrete data modules directly. | `data/index.js:4-35`; `services/service-container.js:27-56`. |
| Treating all `*-reader.js` files as inactive because SQL variants exist | RAW contacts, products, internal ops, system settings, and weekly fallback still use Sheet-backed readers. | `services/service-container.js:105-145`; `services/product-service.js:33-58`; `services/internal-ops-service.js:311-689`; `services/weekly-business-service.js:45-68`. |
| Treating RAW as official CORE contact storage | `ContactReader` is explicitly instantiated as RAW and injected into ContactService as RAW, while official contacts use SQL reader/writer. | `services/service-container.js:105-129`; `services/contact-service.js:26-29`; `services/contact-service.js:464-489`. |
| Treating SQL reader fallbacks as removable | SQL readers contain view-to-table fallback paths and services contain compatibility branches. | `data/company-sql-reader.js:73-100`; `data/opportunity-sql-reader.js:31-42`; `data/opportunity-sql-reader.js:272-390`. |
| Treating delete/archive method names as cleanup authorization | These are application operations over user data, not repo cleanup instructions. | `services/contact-service.js:621-645`; `services/internal-ops-service.js:555-689`; `services/subscription-ops-service.js:360-371`. |
| Assuming Sheet writes are legacy-only | Product, internal ops, system settings, and RAW contact paths still write to Sheet-backed stores. | `services/product-service.js:120-170`; `services/internal-ops-service.js:311-689`; `services/product-service.js:312-323`; `data/contact-writer.js:78-122`. |

## No-Touch / Caution Areas

| Area | Caution classification | Evidence |
| --- | --- | --- |
| RAW contact reader/writer bridge | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Service-container governance comment says ContactService bridges RAW Google Sheets intake and CORE SQL entities, and explicitly cautions RAW reader/writer removal without lifecycle verification in `services/service-container.js:169-187`. |
| Sheet base classes | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Multiple active readers/writers inherit or depend on `BaseReader`/`BaseWriter`; evidence in `data/base-reader.js:47-58`, `data/base-reader.js:149-156`, and `data/base-writer.js:17-29`. |
| SQL reader view/table fallback logic | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Company and opportunity SQL readers rely on view-to-table fallback behavior in `data/company-sql-reader.js:73-100` and `data/opportunity-sql-reader.js:31-42`. |
| Weekly business fallback reads | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Weekly business has explicit SQL-first Sheet fallback reads in `services/weekly-business-service.js:45-68`. |
| Product/internal-ops/system Sheet paths | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Active services still route reads/writes through Sheet-backed reader/writer classes in `services/product-service.js:33-170`, `services/internal-ops-service.js:311-689`, and `services/product-service.js:287-323`. |

## Evidence Gaps

| Gap | Status | Notes |
| --- | --- | --- |
| Live frequency of SQL fallback branches | UNKNOWN | Static code proves fallback branches exist, but this pass did not inspect logs or run traffic. |
| Whether all legacy exports in `data/index.js` have external callers outside service-container | PARTIAL | Service-container does not use the barrel, but a repo-wide caller scan was intentionally narrowed after vendor/minified output appeared. |
| Exact Google Sheet IDs behind `config.IDS.*` in current environment | UNKNOWN | `config.IDS.RAW`, `CORE`, `SYSTEM`, `PRODUCT`, and `INTERNAL_OPS` are referenced, but environment resolution was not inspected in this task. |
| Whether opportunity detail legacy fallback branches are reachable in the active container | PARTIAL | Container injects SQL readers, but fallback branches remain in source; no runtime dependency fault scenario was executed. |
| Full method coverage for every SQL reader/writer class | NOT_INSPECTED | Task focused on caller and fallback boundaries, not every method body. |

## Recommended One Next Forensic Question

Which runtime logs or production-safe diagnostics can confirm how often SQL view-to-table fallback and weekly Sheet fallback branches are actually exercised, without modifying source behavior?
