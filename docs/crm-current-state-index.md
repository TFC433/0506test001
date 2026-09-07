# CRM Current State Index

Last Updated: 2026-09-07

## 1. Global Rules & Index Usage

* This file is a routing index, not the source of truth.
* Use it before broad docs or repo scans to find the right governance/domain docs.
* Repo evidence and source governance docs override this summary.
* User = product semantics and final PASS / NG.
* ChatGPT = architecture, scope freeze, and CODE PASS / NG judgment.
* Gemini = evidence-only repo/docs forensics.
* Codex = frozen minimal patch executor.

## CURRENT WORKSTREAM / Performance Routing

* Completed state: Activity Intelligence shared-v1 is implemented with `RECORDS_PERFORMANCE_CODE_PASS` and `TARGETED_LOCAL_RUNTIME_SMOKE_PASS`. Exact implementation, fixture evidence, observed bytes, and incomplete smoke coverage are owned by [the Activity Intelligence stage archive](activity-intelligence-stage-closure-2026-08.md#records-shared-runtime-snapshots-2026-09-07).
* A — CURRENT_REPO_VERIFIED: **Interactions / CRM Activity Timeline Performance V1** now uses a Timeline-specific lightweight interaction read plus opportunity/company name enrichment after final-page selection. Targeted static/unit validation establishes code-level structural and contract evidence only; it is not a Runtime Product or Production Performance PASS.
* A — CURRENT_REPO_VERIFIED: **Weekly Business Single-Week SQL Boundary V1** now passes the requested `weekId` to a week-scoped SQL read while preserving the broad Sheet read as `COMPATIBILITY_REQUIRED` failure fallback. It is the second implemented performance slice but remains engineering candidate #3; Google Calendar remains `ACTIVE_OR_PROTECTED`. Validation is static/unit only, not a runtime performance acceptance.
* The original five-candidate engineering ranking, risks, confidence, execution-path evidence, and Sheet classifications are owned by [roadmap §4.6](non-breaking-cleanup-roadmap.md#46-crm-wide-performance-engineering-ranking-2026-09-07). Ranking is repository-based priority, not runtime telemetry or a separately chosen implementation sequence.
* Unless explicitly reopened, current scope excludes broad Activity Intelligence optimization, Analytics data boundary, Follow-up projection, management-module modularization, broad Google Sheet/dead-code cleanup, and company fuzzy reconciliation.
* Evidence labels A–D follow [architecture governance](architecture-governance.md#evidence-classification-and-durable-ownership). Historical acceptance and runtime observations do not imply full Product or Production Performance PASS.

## 2. Protected Boundaries

* ZERO ASSUMPTION: verify DB schema, owner functions, selectors, DOM ownership, and current repo state before patching.
* Do not hardcode dynamic business labels, settings, or invented mappings.
* Do not use broad refactors for small field additions.
* Use native Node `https` for Google API reads; legacy `googleapis` write behavior must not be casually changed.
* Verify exact Chinese UI labels and encoding to avoid mojibake.
* Do not touch timeline/interactions or task/follow-up/reminder systems unless explicitly scoped and evidenced.

## 3. Feature Domain Routing Map

### Dashboard & Analytics

* Docs: `docs/tfc-crm-ui-style-governance.md`, `docs/repo-operational-consolidation-report.md`, `docs/architecture-governance.md`
* Owners: `public/dashboard.html`, `public/scripts/dashboard/*`, `public/scripts/map-manager.js`
* Baseline: Dashboard is the analytics / KPI / chart / filter tab / widget control baseline. Dashboard trend uses ECharts. Highcharts / Highmaps are not current runtime dependencies. Dashboard RAW contact stats start concurrently with `/api/dashboard` and remain failure-isolated from the main Dashboard render.

### RAW Contacts / Business Cards

* Docs: `docs/architecture-governance.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/non-breaking-cleanup-roadmap.md`, `docs/repo-operational-consolidation-report.md`
* Owners: `data/raw-contact-sql-reader.js`, `data/raw-contact-sql-writer.js`, `services/contact-service.js`, `services/workflow-service.js`, `controllers/contact.controller.js`, `controllers/line-leads.controller.js`, `public/scripts/contacts/contacts.js`, `public/scripts/leads-view.js`, `public/scripts/opportunities/*`
* Baseline: CRM RAW Contact SQL migration is closed with UI/Product PASS on 2026-07-15. `public.raw_contact_captures` is the CRM runtime authority for RAW business-card records; `cardId` is canonical, with positive legacy `rowIndex` compatibility through `raw_payload.legacy_row_index`.
* Boundary: This closes the CRM-side RAW SQL workstream only. It does not declare the OCR repository closed and does not declare the entire CRM Google-Sheet-free.

### Sales Analysis / 受注分析

* Docs: `docs/architecture-governance.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/repo-operational-consolidation-report.md`, `docs/non-breaking-cleanup-roadmap.md`
* Owners: `public/scripts/sales/sales-analysis.js`, `public/scripts/sales/sales-analysis-components.js`, `public/scripts/sales/sales-analysis-helper.js`
* Baseline: Sales Analysis patch series is Function PASS, UI/Product PASS, final closure audit PASS, and governance cleanup PASS. Full behavior governance lives in `docs/architecture-governance.md`.
* Current behavior summary: Sales Analysis charts use ECharts; chart metric toggles are frontend count / backend amount; monthly trend uses `{ label, count, amount }`; opportunity-type quick tabs are list-only and do not mutate `displayedDeals`.
* Boundary: KPI cards, charts, monthly trend, and CSV remain based on full `displayedDeals`; list-only tabs affect only visible table rows, table count, pagination, and page slicing.

### Charting / Maps

* Docs: `docs/architecture-governance.md`, `docs/repo-operational-consolidation-report.md`
* Owners: `public/dashboard.html`, `public/scripts/services/charting.js`, `public/scripts/dashboard/dashboard_widgets.js`, `public/scripts/sales/sales-analysis-components.js`, `public/scripts/map-manager.js`
* Baseline: Active chart stack is ECharts. Dashboard trend and Sales Analysis charts use ECharts. Taiwan map uses ECharts plus `public/assets/maps/taiwan.json`, which remains active and must be preserved.
* Highcharts status: Highcharts / Highmaps full retirement completed on 2026-07-06 with UI/Product PASS. Event charts legacy module was removed because it was loaded but UI-unreachable. Highcharts / Highmaps are not current runtime, package, vendor, setup, or `node_modules` dependencies.

### Activity Intelligence / FANUC Forms

* Docs: `docs/activity-intelligence-stage-closure-2026-08.md`, `docs/architecture-governance.md`, `docs/non-breaking-cleanup-roadmap.md`
* Frontend owners: `public/scripts/activity-intelligence/activity-intelligence-management.js`, `public/scripts/activity-intelligence/activity-intelligence-api.js`, `public/styles/activity-intelligence/activity-intelligence-management.css`, `public/views/activity-intelligence.html`
* Backend owners: `routes/activity-intelligence.routes.js`, `controllers/activity-intelligence.controller.js`, `services/activity-intelligence-service.js`, `services/activity-intelligence-perf.js`, `data/activity-intelligence-sql-reader.js`, `data/activity-intelligence-sql-writer.js`
* Contract checks: `tests/activity-intelligence-contract-check.js`
* Baseline: reusable Form Designer → Schema / Settings → Normalized Runtime Field → Form Engine → Canonical Answer Model → consumer architecture. Person / Company Assist and Generic Other single/multiple are Runtime Product PASS. Records Projection and projection-owned counts are accepted; Answer Hydration V1 is an overall partial performance pass.
* Scoped rendering: Scoped Tab Render V1 is CODE PASS and NETWORK RUNTIME PASS only. The `.aim-main` desktop same-activity warm-navigation boundary is opt-in; global `render()` and mobile remain fallbacks.
* Deferred: Records server pagination is not implemented and is CRM-wide candidate #5, not the automatic next CRM-wide workstream. Preserve filter, search, sort, count, Analytics, and Follow-up semantics.
* Records transport: shared-v1 is completed at the CODE PASS and targeted local smoke levels stated above. Legacy compatibility and full-dataset ownership remain protected; the stage archive owns the wire contract and acceptance limits.

### Opportunity Detail / Activity Hub

* Docs: `docs/architecture-governance.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/non-breaking-cleanup-roadmap.md`, `docs/repo-operational-consolidation-report.md`
* Owners: `public/views/opportunity-detail.html`, `public/scripts/opportunities/opportunity-details.js`, `public/scripts/opportunities/details/*`
* Baseline: Opportunity Detail is the operational workflow / high-density CRM / Activity Hub / relationship context / inline editing baseline. Activity Wall / Event Report timeline time, management-mode live sync, helper hint, and system-record View cleanup governance lives in `docs/architecture-governance.md`; cleanup boundaries are routed through `docs/non-breaking-cleanup-roadmap.md`.

### Event Logs

* Docs: `docs/architecture-governance.md`, `docs/audit-session-log-governance.md`
* Owners: [Evidence Gap - Forensics Required]
* Baseline: `todoItems` / `todo_items` is event-log-only text, not task/follow-up/reminder; ordinary event field additions do not imply timeline or `interactions.js` changes.

### Interactions / Activity Timeline

* Docs: `docs/architecture-governance.md`, `docs/non-breaking-cleanup-roadmap.md`
* A — CURRENT_REPO_VERIFIED owners: `public/scripts/interactions.js`, `routes/system.routes.js`, `controllers/system.controller.js`, `services/activity-timeline-service.js`, `services/interaction-service.js`, `data/interaction-sql-reader.js`.
* Current CRM Activity Timeline entry: `/api/activity-timeline` → `getActivityTimeline()` → `getActivityTimelineInteractions()`. The Timeline reads a narrow interaction projection, preserves merged-source pagination ownership, and batch-hydrates opportunity/company labels only for final-page interaction rows. General `searchInteractions()` behavior remains available to its existing callers. This overview is distinct from the Opportunity Detail Activity Hub.
* Boundary: preserve record classification, time/order rules, audit visibility, filtering, counts and pagination. Opportunity Activity Hub soft-void/tombstone rules remain governed separately.

### Opportunity List

* Docs: `docs/repo-operational-consolidation-report.md`, `docs/architecture-governance.md`
* Owners: [Evidence Gap - Forensics Required]
* Baseline: Group sort uses `lineageGroupLatestActivity`; row display uses `rowActivityTime` fallback `effectiveLastActivity`; `audit_logs` are not a business sorting source.

### Internal Ops

* Docs: `docs/architecture-governance.md`
* Owners: [Evidence Gap - Forensics Required]
* Baseline: Internal Ops / Dev Projects is an accepted Sheet-backed operational module with case-oriented and member-oriented views governed by the current accepted baseline.

### Subscription Ops

* Docs: `docs/architecture-governance.md`
* Owners: [Evidence Gap - Forensics Required]
* Baseline: Subscription Ops accepted semantics split `custom_subject`, `custom_note`, and true expanded `notes`; archived records render in a read-only archived section.

### Audit / User Session Log

* Docs: `docs/audit-session-log-governance.md`
* Owners: `public/scripts/interactions.js`, `routes/system.routes.js`; detailed logging ownership remains in audit governance.
* Baseline: `user_sessions` and `system_audit_logs` have backend-owned access, with current frontend read views through protected Express routes. Sensitive long fields, including `todoItems` / `todo_items`, must be redacted from raw `changes`; audit records are not business sorting sources.

### Product Cost

* Docs: `docs/architecture-governance.md`, `docs/repo-operational-consolidation-report.md`, `docs/tfc-crm-ui-style-governance.md`
* Owners: `public/views/product-list.html`, `public/scripts/products/products.js`
* Baseline: Product Cost active UI is a compact flat table with inline global edit mode; `ProductDetailModal` may remain but is not the active table edit path.

## 4. Confirmed Open Issues & Cleanup

* Highcharts / Highmaps retirement is complete. Remaining Highcharts mentions in docs are historical / `DOC_HISTORY_ONLY`, not current dependency evidence.
* `ProductDetailModal` reachability / removal-readiness remains a pending cleanup target requiring separate approval.
* Google Sheet fallback must not be removed broadly; SQL replacement remains domain-by-domain future work.
* Dormant RAW Sheet reader/writer compatibility code and final RAW Sheet retirement/deletion audit remain future cleanup topics; current CRM RAW runtime authority is SQL per `docs/architecture-governance.md`.
