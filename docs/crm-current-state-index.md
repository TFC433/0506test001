# CRM Current State Index

Last Updated: 2026-09-02

## 1. Global Rules & Index Usage

* This file is a routing index, not the source of truth.
* Use it before broad docs or repo scans to find the right governance/domain docs.
* Repo evidence and source governance docs override this summary.
* User = product semantics and final PASS / NG.
* ChatGPT = architecture, scope freeze, and CODE PASS / NG judgment.
* Gemini = evidence-only repo/docs forensics.
* Codex = frozen minimal patch executor.

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
* Next: Records server pagination is not implemented. Preserve filter, sort, count, Analytics, and Follow-up semantics; route durable detail and exact status language to the stage archive.

### Opportunity Detail / Activity Hub

* Docs: `docs/architecture-governance.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/non-breaking-cleanup-roadmap.md`, `docs/repo-operational-consolidation-report.md`
* Owners: `public/views/opportunity-detail.html`, `public/scripts/opportunities/opportunity-details.js`, `public/scripts/opportunities/details/*`
* Baseline: Opportunity Detail is the operational workflow / high-density CRM / Activity Hub / relationship context / inline editing baseline. Activity Wall / Event Report timeline time, management-mode live sync, helper hint, and system-record View cleanup governance lives in `docs/architecture-governance.md`; cleanup boundaries are routed through `docs/non-breaking-cleanup-roadmap.md`.

### Event Logs

* Docs: `docs/architecture-governance.md`, `docs/audit-session-log-governance.md`
* Owners: [Evidence Gap - Forensics Required]
* Baseline: `todoItems` / `todo_items` is event-log-only text, not task/follow-up/reminder; ordinary event field additions do not imply timeline or `interactions.js` changes.

### Interactions / Activity Timeline

* Docs: `docs/architecture-governance.md`
* Owners: [Evidence Gap - Forensics Required]
* Baseline: Activity Hub uses governed interaction/timeline record classes; event reports use soft void plus tombstone, not hard delete, and system records stay hidden unless explicitly shown.

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
* Owners: [Evidence Gap - Forensics Required]
* Baseline: `user_sessions` and `system_audit_logs` are backend-only audit/session tables; sensitive long fields, including `todoItems` / `todo_items`, must be redacted from raw `changes`.

### Product Cost

* Docs: `docs/architecture-governance.md`, `docs/repo-operational-consolidation-report.md`, `docs/tfc-crm-ui-style-governance.md`
* Owners: `public/views/product-list.html`, `public/scripts/products/products.js`
* Baseline: Product Cost active UI is a compact flat table with inline global edit mode; `ProductDetailModal` may remain but is not the active table edit path.

## 4. Confirmed Open Issues & Cleanup

* Highcharts / Highmaps retirement is complete. Remaining Highcharts mentions in docs are historical / `DOC_HISTORY_ONLY`, not current dependency evidence.
* `ProductDetailModal` reachability / removal-readiness remains a pending cleanup target requiring separate approval.
* Google Sheet fallback must not be removed broadly; SQL replacement remains domain-by-domain future work.
* Dormant RAW Sheet reader/writer compatibility code and final RAW Sheet retirement/deletion audit remain future cleanup topics; current CRM RAW runtime authority is SQL per `docs/architecture-governance.md`.
