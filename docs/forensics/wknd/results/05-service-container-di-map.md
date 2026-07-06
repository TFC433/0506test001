# 05 Service Container DI Map

Run time: 2026-07-04 04:55 +08:00

## Executive Conclusion

EVIDENCED: The active app startup path imports `services/service-container.js`, awaits `initializeServices()`, and stores the returned object on `app.set('services', services)`, making `services/service-container.js` the evidenced runtime DI owner for the inspected app path. Evidence: `app.js:10`, `app.js:34`, `app.js:37`, `services/service-container.js:92`, `services/service-container.js:368`.

EVIDENCED: The runtime container instantiates a mixed dependency graph: Google clients first, RAW/Sheets readers and writers for selected domains, SQL readers and writers for core operational domains, then services and controllers. Evidence: `services/service-container.js:99-145`, `services/service-container.js:147-319`, `services/service-container.js:323-357`.

EVIDENCED: The code comments and constructor wiring identify `ContactService` as a RAW-to-CORE bridge, not a purely SQL service. Evidence: `services/service-container.js:169-187`, `services/contact-service.js:34-52`, `services/contact-service.js:210-226`, `services/contact-service.js:465-486`.

UNKNOWN: This task did not verify every method body in every service or data class. Method-level fallback behavior belongs to task 06 unless directly needed for DI evidence.

## Files Inspected

| File | Inspection purpose | Classification | Evidence |
| --- | --- | --- | --- |
| `app.js` | Active startup and service container attachment | ACTIVE_CONFIRMED | Imports `./services/service-container`, calls `initializeServices()`, then `app.set('services', services)` at `app.js:10`, `app.js:34`, `app.js:37`. |
| `services/service-container.js` | Runtime DI owner | ACTIVE_CONFIRMED | Defines `initializeServices()` and exports it at `services/service-container.js:92`, `services/service-container.js:368`. |
| `config.js` | ID routing, data-source declarations, RAW field contract | ACTIVE_CONFIRMED | Defines `IDS`, `DATA_SOURCES`, legacy IDs, and RAW contact fields at `config.js:25`, `config.js:54`, `config.js:66`, `config.js:171-175`. |
| `config/supabase.js` | Supabase client factory | ACTIVE_CONFIRMED | Creates and exports `supabase` from env-backed client at `config/supabase.js:6-21`. |
| `services/google-client-service.js` | Google Sheets/Drive/Calendar and native Sheets helpers | ACTIVE_CONFIRMED | Exposes native sheet helpers and Google API clients at `services/google-client-service.js:189`, `services/google-client-service.js:287`, `services/google-client-service.js:505`, `services/google-client-service.js:595`, `services/google-client-service.js:1144-1154`. |
| `data/index.js` | Data barrel comparison only | COMPATIBILITY_CANDIDATE | Exports non-SQL readers/writers but is not the file imported by `app.js`; evidence at `data/index.js:25-45`, `app.js:10`. |
| `services/index.js` | Older service factory comparison only | COMPATIBILITY_CANDIDATE | Exports `initializeBusinessServices`, while `app.js` comments it out and imports `service-container`; evidence at `services/index.js:70`, `services/index.js:162`, `app.js:10-13`. |
| `data/*sql*.js`, `data/audit-log-sql*.js`, `data/subscription-ops-sql*.js` | SQL dependency table | ACTIVE_CONFIRMED / POSSIBLY_ACTIVE by container injection | SQL readers/writers import `../config/supabase`; examples at `data/contact-sql-reader.js:23`, `data/company-sql-reader.js:16`, `data/opportunity-sql-reader.js:17`, `data/subscription-ops-sql-reader.js:6`, `data/audit-log-sql-reader.js:1`. |
| Selected service files | Constructor injection confirmation | ACTIVE_CONFIRMED / POSSIBLY_ACTIVE | Constructor assignments inspected in `services/contact-service.js:44-52`, `services/company-service.js:49-77`, `services/opportunity-service.js:82-119`, `services/interaction-service.js:19-23`, `services/dashboard-service.js:74-100`. |

## Evidence Tables

### Service Instantiation Table

| Runtime object | Instantiated in container | Key injected dependencies | Classification | Evidence |
| --- | --- | --- | --- | --- |
| `googleClientService` | `new GoogleClientService()` | none in container | ACTIVE_CONFIRMED | `services/service-container.js:99`. |
| `sheets`, `drive`, `calendar` | via `googleClientService` | Google client service | ACTIVE_CONFIRMED | `services/service-container.js:100-102`; helper methods at `services/google-client-service.js:1144-1154`. |
| `authService` | `new AuthService(...)` | `systemReader`, `systemWriter`, `auditLoggerService` | ACTIVE_CONFIRMED | `services/service-container.js:149-150`. |
| `announcementService` | `new AnnouncementService({...})` | `announcementSqlReader`, `announcementSqlWriter` | ACTIVE_CONFIRMED | `services/service-container.js:152-155`. |
| `systemService` | `new SystemService(...)` | `systemReader`, `systemWriter` | ACTIVE_CONFIRMED | `services/service-container.js:157`. |
| `interactionService` | `new InteractionService(...)` | `interactionSqlReader`, `interactionSqlWriter`, `opportunitySqlReader`, `companySqlReader` | ACTIVE_CONFIRMED | `services/service-container.js:162-167`; constructor stores these at `services/interaction-service.js:19-23`. |
| `contactService` | `new ContactService(...)` | `contactRawReader`, `contactSqlReader`, `contactWriter`, `companySqlReader`, `config`, `contactSqlWriter`, `systemService` | ACTIVE_CONFIRMED | `services/service-container.js:177-187`; constructor stores these at `services/contact-service.js:44-52`. |
| `companyService` | `new CompanyService(...)` | SQL readers/writers plus `contactWriter`, `contactService`, `systemReader` | ACTIVE_CONFIRMED | `services/service-container.js:189-207`; constructor storage at `services/company-service.js:49-77`. |
| `opportunityService` | `new OpportunityService({...})` | SQL opportunity/company/contact/interaction/event dependencies, `contactWriter`, `interactionService`, `systemService`, `config` | ACTIVE_CONFIRMED | `services/service-container.js:209-227`; constructor storage at `services/opportunity-service.js:82-119`. |
| `eventLogService` | `new EventLogService(...)` | `eventLogSqlReader`, `opportunitySqlReader`, `companySqlReader`, `systemService`, `calendarService`, `eventLogSqlWriter` | ACTIVE_CONFIRMED | `services/service-container.js:229-237`. |
| `weeklyBusinessService` | `new WeeklyBusinessService({...})` | `weeklyReader`, `weeklySqlReader`, `weeklySqlWriter`, `dateHelpers`, `calendarService`, `systemService`, `opportunityService`, `config` | ACTIVE_CONFIRMED | `services/service-container.js:239-248`; constructor at `services/weekly-business-service.js:19`. |
| `salesAnalysisService` | `new SalesAnalysisService(...)` | `opportunitySqlReader`, `systemService`, `config` | ACTIVE_CONFIRMED | `services/service-container.js:250-254`; constructor at `services/sales-analysis-service.js:20`. |
| `productService` | `new ProductService(...)` | `productReader`, `productWriter`, `systemReader`, `systemWriter`, `systemService` | ACTIVE_CONFIRMED | `services/service-container.js:256-257`; constructor at `services/product-service.js:21-26`. |
| `dashboardService` | `new DashboardService(...)` | `contactService`, `eventLogSqlReader`, `systemReader`, `weeklyBusinessService`, `calendarService`, SQL readers, `systemService` | ACTIVE_CONFIRMED | `services/service-container.js:259-271`; constructor storage at `services/dashboard-service.js:74-100`. |
| `workflowService` | `new WorkflowService(...)` | `opportunityService`, `interactionService`, `contactService`, `googleClientService` | ACTIVE_CONFIRMED | `services/service-container.js:273-278`; constructor at `services/workflow-service.js:28`. |
| `eventService` | `new EventService(...)` | `calendarService`, `interactionService`, `weeklyBusinessService`, `opportunityService`, `config`, `dateHelpers` | ACTIVE_CONFIRMED | `services/service-container.js:280-287`; constructor at `services/event-service.js:19`. |
| `internalOpsService` | `new InternalOpsService(...)` | `internalOpsReader`, `internalOpsWriter`, `config` | ACTIVE_CONFIRMED | `services/service-container.js:289`; constructor at `services/internal-ops-service.js:67`. |
| `subscriptionOpsService` | `new SubscriptionOpsService({...})` | `subscriptionOpsSqlReader`, `subscriptionOpsSqlWriter`, `opportunitySqlReader`, `productService` | ACTIVE_CONFIRMED | `services/service-container.js:290-295`; constructor at `services/subscription-ops-service.js:82`. |
| `auditLoggerService` | `new AuditLoggerService(...)` | `auditLogSqlWriter`, `auditLogSqlReader` | ACTIVE_CONFIRMED | `services/service-container.js:149`; constructor at `services/audit-logger-service.js:6-8`. |
| `activityTimelineService` | `new ActivityTimelineService({...})` | `interactionService`, `auditLoggerService`, `systemService`, `opportunitySqlReader`, `companySqlReader` | ACTIVE_CONFIRMED | `services/service-container.js:296-302`; constructor at `services/activity-timeline-service.js:18`. |

### Reader / Writer Instantiation Table

| Instance | Class | Runtime dependency shape | Classification | Evidence |
| --- | --- | --- | --- | --- |
| `contactRawReader` | `ContactReader` | Google Sheets client + `config.IDS.RAW`; `googleClientService` assigned after construction | ACTIVE_CONFIRMED | `services/service-container.js:105-107`; `ContactReader` constructor at `data/contact-reader.js:24`. |
| `contactSqlReader` | `ContactSqlReader` | no constructor args; Supabase module import in data class | ACTIVE_CONFIRMED | `services/service-container.js:110`; `data/contact-sql-reader.js:23-28`. |
| `companySqlReader` | `CompanySqlReader` | no constructor args; table/view configured internally | ACTIVE_CONFIRMED | `services/service-container.js:111`; `data/company-sql-reader.js:16-22`. |
| `opportunitySqlReader` | `OpportunitySqlReader` | no constructor args; table and views configured internally | ACTIVE_CONFIRMED | `services/service-container.js:112`; `data/opportunity-sql-reader.js:17-24`. |
| `interactionSqlReader` | `InteractionSqlReader` | no constructor args; table configured internally | ACTIVE_CONFIRMED | `services/service-container.js:113`; `data/interaction-sql-reader.js:18-23`. |
| `eventLogSqlReader` | `EventLogSqlReader` | no constructor args; Supabase-backed SQL reader | ACTIVE_CONFIRMED | `services/service-container.js:114`; `data/event-log-sql-reader.js:8-10`. |
| `weeklyReader` | `WeeklyBusinessReader` | Sheets client + `config.IDS.CORE` + `googleClientService` | ACTIVE_CONFIRMED | `services/service-container.js:117`; `data/weekly-business-reader.js:22-35`. |
| `weeklySqlReader` / `weeklySqlWriter` | SQL weekly classes | Supabase-backed `weekly_business_entries` table | ACTIVE_CONFIRMED | `services/service-container.js:118`, `services/service-container.js:139`; `data/weekly-business-sql-reader.js:13-18`, `data/weekly-business-sql-writer.js:7-11`. |
| `announcementSqlReader` / `announcementSqlWriter` | SQL announcement classes | Supabase-backed `announcements` table | ACTIVE_CONFIRMED | `services/service-container.js:119`, `services/service-container.js:140`; `data/announcement-sql-reader.js:13-18`, `data/announcement-sql-writer.js:12-17`. |
| `systemReader` / `systemWriter` | Sheets system classes | Sheets client + `config.IDS.SYSTEM`; reader also receives `googleClientService` | ACTIVE_CONFIRMED | `services/service-container.js:120`, `services/service-container.js:141`; `data/system-reader.js:19`, `data/system-writer.js:17`. |
| `productReader` / `productWriter` | Sheets product classes | Sheets client + `config.IDS.PRODUCT` + product reader + `googleClientService` | ACTIVE_CONFIRMED | `services/service-container.js:121`, `services/service-container.js:142`; `data/product-reader.js:18`, `data/product-writer.js:18`. |
| `internalOpsReader` / `internalOpsWriter` | Sheets internal ops classes | Sheets client + `config.IDS.INTERNAL_OPS`; writer uses native Google helper methods | ACTIVE_CONFIRMED | `services/service-container.js:122-123`, `services/service-container.js:143`; `data/internal-ops-reader.js:38`, `data/internal-ops-writer.js:14-38`. |
| `subscriptionOpsSqlReader` / `subscriptionOpsSqlWriter` | SQL subscription ops classes | Supabase-backed `subscription_ops` table | ACTIVE_CONFIRMED | `services/service-container.js:124`, `services/service-container.js:144`; `data/subscription-ops-sql-reader.js:6-10`, `data/subscription-ops-sql-writer.js:6-32`. |
| `auditLogSqlReader` / `auditLogSqlWriter` | SQL audit log classes | Supabase-backed audit/session data | ACTIVE_CONFIRMED | `services/service-container.js:125`, `services/service-container.js:145`; `data/audit-log-sql-reader.js:1-42`, `data/audit-log-sql-writer.js:1-12`. |

### SQL Dependency Table

| SQL dependency | Supabase evidence | Container evidence | Notes |
| --- | --- | --- | --- |
| Shared Supabase client | `config/supabase.js` imports `@supabase/supabase-js`, requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, creates client with `persistSession: false`, and exports `{ supabase }` at `config/supabase.js:6-21`. | SQL readers/writers are instantiated without passing a client at `services/service-container.js:110-145`. | EVIDENCED: SQL classes depend on module-level Supabase imports rather than injected client instances. |
| Contacts | `data/contact-sql-reader.js:23-28`, `data/contact-sql-writer.js:22-26`. | `contactSqlReader` and `contactSqlWriter` at `services/service-container.js:110`, `services/service-container.js:132`; injected into `ContactService` at `services/service-container.js:177-187`. | ACTIVE_CONFIRMED. |
| Companies | `data/company-sql-reader.js:16-22`, `data/company-sql-writer.js:12-17`. | `companySqlReader` and `companySqlWriter` at `services/service-container.js:111`, `services/service-container.js:133`; injected into `CompanyService` at `services/service-container.js:189-207`. | ACTIVE_CONFIRMED. |
| Opportunities | `data/opportunity-sql-reader.js:17-24`, `data/opportunity-sql-writer.js:20-25`. | `opportunitySqlReader` and `opportunitySqlWriter` at `services/service-container.js:112`, `services/service-container.js:134`; injected into `OpportunityService` at `services/service-container.js:209-227`. | ACTIVE_CONFIRMED. |
| Interactions | `data/interaction-sql-reader.js:18-23`, `data/interaction-sql-writer.js:11-14`. | `interactionSqlReader` and `interactionSqlWriter` at `services/service-container.js:113`, `services/service-container.js:135`; injected into `InteractionService` at `services/service-container.js:162-167`. | ACTIVE_CONFIRMED. |
| Event logs | `data/event-log-sql-reader.js:8-10`, `data/event-log-sql-writer.js:13-15`. | `eventLogSqlReader` and `eventLogSqlWriter` at `services/service-container.js:114`, `services/service-container.js:136`; injected into `EventLogService` at `services/service-container.js:229-237`. | ACTIVE_CONFIRMED. |
| Weekly business | `data/weekly-business-sql-reader.js:13-18`, `data/weekly-business-sql-writer.js:7-11`. | `weeklySqlReader` and `weeklySqlWriter` at `services/service-container.js:118`, `services/service-container.js:139`; injected into `WeeklyBusinessService` at `services/service-container.js:239-248`. | ACTIVE_CONFIRMED, alongside a Sheets weekly reader. |
| Announcements | `data/announcement-sql-reader.js:13-18`, `data/announcement-sql-writer.js:12-17`. | `announcementSqlReader` and `announcementSqlWriter` at `services/service-container.js:119`, `services/service-container.js:140`; injected into `AnnouncementService` at `services/service-container.js:152-155`. | ACTIVE_CONFIRMED. |
| Subscription ops | `data/subscription-ops-sql-reader.js:6-10`, `data/subscription-ops-sql-writer.js:6-32`. | Injected into `SubscriptionOpsService` at `services/service-container.js:290-295`. | ACTIVE_CONFIRMED. |
| Audit logs | `data/audit-log-sql-reader.js:1-42`, `data/audit-log-sql-writer.js:1-12`. | Injected into `AuditLoggerService` at `services/service-container.js:149`. | ACTIVE_CONFIRMED. |
| Direct service-level Supabase calls | `services/dashboard-service.js:71`, `services/workflow-service.js:2`. | `dashboardService` and `workflowService` are instantiated by the container at `services/service-container.js:259-278`. | EVIDENCED cross-boundary SQL usage outside `data/`; method-level purpose not fully inspected in this task. |

### RAW / Sheets / Legacy Dependency Table

| Dependency | Wiring evidence | Runtime role evidence | Classification |
| --- | --- | --- | --- |
| Google API client fan-out | Container creates `GoogleClientService`, then obtains Sheets, Drive, and Calendar clients at `services/service-container.js:99-102`. | Google client exposes native sheet read/update/append/batch helpers and client getters at `services/google-client-service.js:189`, `services/google-client-service.js:287`, `services/google-client-service.js:505`, `services/google-client-service.js:595`, `services/google-client-service.js:1144-1154`. | ACTIVE_CONFIRMED. |
| RAW contact intake | `contactRawReader = new ContactReader(sheets, config.IDS.RAW)` and `contactWriter = new ContactWriter(sheets, config.IDS.RAW, contactRawReader, googleClientService)` at `services/service-container.js:105-107`, `services/service-container.js:127-129`. | `ContactService` stores `contactRawReader` and calls `getContacts()` for potential contacts at `services/contact-service.js:210-226`, `services/contact-service.js:576-585`. | ACTIVE_CONFIRMED / DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| RAW field index contract | `config.js` defines `IDS.RAW` and documents fixed RAW contact field indices at `config.js:25-31`, `config.js:171-175`. | `ContactWriter` reads `this.config.CONTACT_FIELDS` at `data/contact-writer.js:83`. | ACTIVE_CONFIRMED / DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| System settings Sheets path | `systemReader` and `systemWriter` are constructed with `config.IDS.SYSTEM` at `services/service-container.js:120`, `services/service-container.js:141`. | `SystemReader` and `SystemWriter` constructors accept Sheets/spreadsheet IDs at `data/system-reader.js:19`, `data/system-writer.js:17`. | ACTIVE_CONFIRMED. |
| Product Sheets path | `productReader` and `productWriter` use `config.IDS.PRODUCT` and `googleClientService` at `services/service-container.js:121`, `services/service-container.js:142`. | Product writer requires native helper methods for create/update/delete flows at `data/product-writer.js:70-157`. | ACTIVE_CONFIRMED. |
| Internal ops Sheets path | `internalOpsReader` and `internalOpsWriter` use `config.IDS.INTERNAL_OPS` at `services/service-container.js:122-123`, `services/service-container.js:143`. | Internal ops writer uses native append/update helpers at `data/internal-ops-writer.js:22-38`. | ACTIVE_CONFIRMED. |
| Weekly business split path | Container injects both `weeklyReader` and SQL weekly reader/writer into `WeeklyBusinessService` at `services/service-container.js:117-118`, `services/service-container.js:139`, `services/service-container.js:239-248`. | `WeeklyBusinessReader` reads Sheets via `googleClientService` or `sheets.spreadsheets.values.get` at `data/weekly-business-reader.js:22-35`; SQL weekly classes use Supabase at `data/weekly-business-sql-reader.js:13-18`, `data/weekly-business-sql-writer.js:7-11`. | ACTIVE_CONFIRMED mixed dependency. |
| Legacy configuration exports | `config.js` keeps `SPREADSHEET_ID`, `AUTH_SPREADSHEET_ID`, and `MARKET_PRODUCT_SHEET_ID` after `DATA_SOURCES` at `config.js:54-68`. | Runtime usage of these legacy properties was not exhaustively traced in this task. | COMPATIBILITY_CANDIDATE / UNKNOWN. |

### Cross-Domain Dependency Table

| Cross-domain link | Evidence | Risk classification |
| --- | --- | --- |
| `ContactService` bridges RAW contact intake and SQL contact/company core. | `services/service-container.js:169-187`; `services/contact-service.js:44-52`, `services/contact-service.js:210-226`, `services/contact-service.js:465-486`. | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| `CompanyService` receives SQL readers/writers plus `contactWriter` and `contactService`, enabling company logic to consult RAW potential contacts through contact service. | `services/service-container.js:189-207`; `services/company-service.js:70`, `services/company-service.js:439-449`. | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| `OpportunityService` receives SQL primary dependencies plus `contactWriter`, `interactionService`, and `systemService`. | `services/service-container.js:209-227`; `services/opportunity-service.js:82-119`. | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| `DashboardService` uses injected SQL readers and also imports Supabase directly. | `services/service-container.js:259-271`; `services/dashboard-service.js:71`, `services/dashboard-service.js:167-200`, `services/dashboard-service.js:592-593`. | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| `WorkflowService` uses service dependencies and imports Supabase directly. | `services/service-container.js:273-278`; `services/workflow-service.js:2`, `services/workflow-service.js:28`, `services/workflow-service.js:87`. | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC. |
| Controllers are instantiated inside the container and also some route/controller paths dynamically read `req.app.get('services')`. | Container controller construction at `services/service-container.js:304-319`; app attachment at `app.js:37`; examples of dynamic reads at `controllers/sales.controller.js:5`, `routes/system.routes.js:20`, `routes/contact.routes.js:18`. | ACTIVE_CONFIRMED. |

## LLM Confusion Risks

| Risk | Evidence | Safer interpretation |
| --- | --- | --- |
| Mistaking `data/index.js` for runtime data ownership. | `data/index.js` exports non-SQL readers/writers at `data/index.js:25-45`, but `app.js` imports `services/service-container.js` at `app.js:10` and calls it at `app.js:34`. | Treat `data/index.js` as a barrel/compatibility candidate unless a current caller is evidenced. |
| Mistaking `services/index.js` for active app DI. | `services/index.js` exports `initializeBusinessServices` at `services/index.js:162`, but `app.js` comments that import and imports `service-container` at `app.js:10-13`. | Use `services/service-container.js` as active DI evidence for the inspected app startup path. |
| Assuming SQL names mean Sheets paths are unused. | The container still creates `contactRawReader`, `contactWriter`, `weeklyReader`, `systemReader`, `systemWriter`, `productReader`, `productWriter`, `internalOpsReader`, and `internalOpsWriter` at `services/service-container.js:105-143`. | Treat mixed SQL/Sheets wiring as intentional until task-specific evidence proves otherwise. |
| Treating RAW contact reader/writer as removable because contact SQL classes exist. | `ContactService` is explicitly documented as a RAW-to-CORE bridge at `services/service-container.js:169-187`; `ContactService` calls `contactRawReader.getContacts()` at `services/contact-service.js:210-226`. | RAW contact dependencies are no-touch without deeper forensic review. |
| Assuming all Supabase access is isolated in `data/`. | `services/dashboard-service.js:71` and `services/workflow-service.js:2` import Supabase directly. | Future SQL work should search both `data/` and `services/` for Supabase usage. |
| Trusting `config.DATA_SOURCES` as actual DI routing. | `config.js` defines `DATA_SOURCES` at `config.js:54`, but the container hard-wires specific SQL and Sheets classes at `services/service-container.js:105-145`. | Treat runtime constructor wiring as stronger evidence than config toggles alone. |

## No-Touch / Caution Areas

| Area | Why it needs caution | Evidence |
| --- | --- | --- |
| `services/service-container.js` DI order and exported service names | Controllers, routes, and health checks read the object stored on `app.get('services')`; changing keys could affect runtime lookup. | `app.js:37`, `app.js:44`, `services/service-container.js:323-357`, `routes/product.routes.js:14`, `routes/weekly.routes.js:14`. |
| RAW contact intake bridge | It connects RAW Google Sheets intake with SQL contact lifecycle. | `services/service-container.js:169-187`, `services/contact-service.js:210-226`, `services/contact-service.js:493-533`. |
| `config.CONTACT_FIELDS` indices | Comments identify fixed RAW Sheet column indices. | `config.js:171-175`; writer field usage at `data/contact-writer.js:83`. |
| Product and internal-ops Google native writer paths | Writers require `googleClientService` native helpers for writes. | `data/product-writer.js:70-157`, `data/internal-ops-writer.js:22-38`; container injection at `services/service-container.js:142-143`. |
| Dashboard and workflow direct Supabase access | These service files bypass a strict data-layer-only access pattern. | `services/dashboard-service.js:71`, `services/workflow-service.js:2`. |
| `services/index.js` and `data/index.js` | They are not evidenced as the active app startup DI path, but may be compatibility surfaces. | `services/index.js:70-162`, `data/index.js:25-45`, `app.js:10-13`. |

## Evidence Gaps

| Gap | Status | Evidence / reason |
| --- | --- | --- |
| Exact method-level fallback behavior for mixed SQL/Sheets services | UNKNOWN | This task inspected DI and targeted constructor/use evidence only; task 06 is scoped for reader/writer fallback behavior. |
| Whether any non-app entrypoint still uses `services/index.js` | UNKNOWN | `app.js` does not use it (`app.js:10-13`), but this task did not broadly inspect every script entrypoint. |
| Whether all `config.DATA_SOURCES` values are stale declarations or read by runtime methods | UNKNOWN | `config.js:54` defines them; container wiring is hard-coded at `services/service-container.js:105-145`; exhaustive usage tracing was not part of this task. |
| Exact table coverage for `EventLogSqlReader`, `EventLogSqlWriter`, `InteractionSqlWriter`, and audit session methods | UNKNOWN | Supabase imports and container wiring are evidenced, but this task did not fully map every table/method in those classes. |
| Whether `drive` client created in the container is used by downstream services | UNKNOWN | `drive` is created at `services/service-container.js:101`; no downstream injection was identified in the inspected constructor table. |

## Recommended One Next Forensic Question

For task 06: Which services actually fall back between SQL, Sheets, RAW, and direct Supabase calls at method level, and which fallback branches are active versus only compatibility candidates?
