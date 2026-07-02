# CRM Current State Index

Last Updated: 2026-07-01

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

* Docs: `docs/tfc-crm-ui-style-governance.md`, `docs/repo-operational-consolidation-report.md`, `docs/echarts-migration-record.md`
* Owners: `public/dashboard.html`, `public/scripts/dashboard/*`, `public/scripts/map-manager.js`
* Baseline: Dashboard is the analytics / KPI / chart / filter tab / widget control baseline; accepted chart work uses ECharts for Dashboard trend, Sales Analysis, and Taiwan map while Highcharts cleanup remains separate.

### Sales Analysis / 受注分析

* Docs: `docs/architecture-governance.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/repo-operational-consolidation-report.md`, `docs/non-breaking-cleanup-roadmap.md`
* Owners: `public/scripts/sales/sales-analysis.js`, `public/scripts/sales/sales-analysis-components.js`, `public/scripts/sales/sales-analysis-helper.js`
* Baseline: Sales Analysis patch series is Function PASS, UI/Product PASS, final closure audit PASS, and governance cleanup PASS. Full behavior governance lives in `docs/architecture-governance.md`.
* Current behavior summary: chart metric toggles are frontend count / backend amount; monthly trend uses `{ label, count, amount }`; opportunity-type quick tabs are list-only and do not mutate `displayedDeals`.
* Boundary: KPI cards, charts, monthly trend, and CSV remain based on full `displayedDeals`; list-only tabs affect only visible table rows, table count, pagination, and page slicing.

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

* Highcharts / Highmaps cleanup is not complete; event charts still require scoped migration forensics before removal.
* `ProductDetailModal` reachability / removal-readiness remains a pending cleanup target requiring separate approval.
* Google Sheet fallback must not be removed broadly; SQL replacement remains domain-by-domain future work.
