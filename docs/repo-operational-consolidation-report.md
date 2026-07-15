# Repo Operational Consolidation Report

## 1. Current project architecture summary

TFC CRM is a Node / Express backed operational CRM workspace. The frontend is served from `public/` and communicates with backend `/api` routes. The backend organizes route, controller, service, and data-access ownership across modules such as companies, contacts, opportunities, events, interactions, sales analysis, products, weekly business, and system/dashboard.

The governance direction is an operational SaaS workspace: restrained, dense, workflow-oriented, and governed by small scoped patches.

## 2. Major frontend areas

Dashboard:

* `public/dashboard.html`
* `public/scripts/dashboard/*`
* `public/scripts/map-manager.js`
* Dashboard is the analytics / KPI / chart / filter tab / widget control baseline.

Opportunity Detail:

* `public/views/opportunity-detail.html`
* `public/scripts/opportunities/opportunity-details.js`
* `public/scripts/opportunities/details/*`
* Opportunity Detail is the operational workflow / high-density CRM / Activity Hub / relationship context / inline editing baseline.

Sales Analysis:

* `public/scripts/sales/sales-analysis.js`
* `public/scripts/sales/sales-analysis-components.js`
* `public/scripts/sales/sales-analysis-helper.js`
* Backend route/controller/service path includes `routes/sales.routes.js`, `controllers/sales.controller.js`, and `services/sales-analysis-service.js`.
* Sales Analysis / 受注分析 patch series is closed with Function PASS, UI/Product PASS, final closure audit PASS, and governance cleanup PASS.
* Patch series was frontend-only; backend/API/DB were insulated and no backend/controller/routes/DB changes are claimed.
* Accepted state includes chart metric toggles, monthly trend combo chart, list-only opportunity-type tabs, Sales Model filter UI removal, direct-sales main-channel suppression through shared helper, CSV alignment for table source column, and mojibake fallback cleanup.
* Primary governance reference: `docs/architecture-governance.md`.

Company / Contact / Opportunity list areas:

* `public/scripts/companies/*`
* `public/scripts/contacts/*`
* `public/scripts/opportunities/opportunities.js`
* `public/scripts/opportunities/opportunity-modals.js`
* Related routes and controllers exist under `routes/` and `controllers/`.

Product Cost:

* `public/views/product-list.html`
* `public/scripts/products/products.js`
* active UI is a compact flat table with inline global edit mode
* `ProductDetailModal` may remain in the repo but is not the active Product Cost table edit path
* category chip wall / category-order drag UI is legacy / inactive for the current table ordering model

## 3. Backend access summary

The backend uses an Express API layer. Controllers expose `/api` endpoints, services hold business logic, and data readers/writers access Supabase-backed storage.

Supabase access follows the server-side service role pattern:

* `config/supabase.js` creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY`.
* Frontend code uses Express `/api` routes rather than direct frontend Supabase table access.

## 4. Current governance docs list

Current governance docs:

* `docs/architecture-governance.md`
* `docs/tfc-crm-ui-style-governance.md`
* `docs/supabase-access-sop.md`
* `docs/non-breaking-cleanup-roadmap.md`

## 5. Current UI baseline docs list

Current UI baseline documentation:

* `docs/tfc-crm-ui-style-governance.md`
* `docs/echarts-migration-record.md`
* `docs/non-breaking-cleanup-roadmap.md`

## 6. Current chart migration status

Sales Analysis, Dashboard trend, and Taiwan map have accepted ECharts baselines. ECharts local vendor asset exists under `public/assets/vendor/echarts/echarts.min.js`.

Sales Analysis `成交類型` uses the accepted standard donut style: no rounded slice corners, no thick artificial transparent gaps, and subtle separation through `padAngle: 1`. Do not describe it as fully gapless and do not revert Sales Analysis to Highcharts.

Highcharts / Highmaps full retirement completed on 2026-07-06 with UI/Product PASS. Patch-series closure:

* Event charts dormant module removal completed after the module was confirmed loaded but UI-unreachable.
* Source-level Highcharts cleanup completed.
* Highcharts module removal completed.
* Residual `@highcharts` cleanup completed.
* Browser smoke reached UI/Product PASS.
* ECharts and `public/assets/maps/taiwan.json` are preserved and active.
* Remaining Highcharts references in docs are historical / `DOC_HISTORY_ONLY`.

## 7. Current security / Supabase posture

Current posture is backend-owned CRM data access through Express and Supabase `service_role`. Task-context DB audit evidence says existing public CRM tables do not grant `anon` / `authenticated`, RLS is false on existing CRM tables, and no policies were returned by `pg_policies`.

The current decision is no immediate DB permission change and no broad grants to `anon` / `authenticated`.

## 8. Known caution areas

Known caution areas:

* UI style governance exists but is not fully rolled out everywhere.
* Future module UI migrations should be module-by-module.
* Global CSS extraction is not yet authorized.
* Product Cost visual ordering is frontend-only and must not be confused with Sheet row order or persistent category-order settings.
* Opportunity Detail product-backed spec pricing must not use cost or `systemConfig` value2.
* Opportunity Detail Activity Wall / Event Report detailed lifecycle, timeline timestamp, management-mode, helper hint, and system-record cleanup rules are governed by `docs/architecture-governance.md`.
* Non-breaking cleanup planning is governed by `docs/non-breaking-cleanup-roadmap.md`.
* `repomix-packs/**` files are generated snapshots and must not be hand-edited.

## 8.1 Audit / Session Log backend foundation

The Audit / Session Log backend foundation is complete for the current chapter.

Backend infrastructure now includes:

* `AuditLoggerService` as the standard backend audit/session service entry point.
* `AuditLogSqlWriter` for backend writes to audit/session infrastructure tables.
* `public.user_sessions` for login/logout/last-seen session lifecycle.
* `public.system_audit_logs` for structured business audit events.
* Auth token propagation of `session_id` for downstream audit context.

Covered audit domains include Companies, Opportunities, Event Logs, Interactions, SubscriptionOps, and InternalOps / DevProjects. Opportunity batch update and raw contact upgrade reuse existing per-record audit events with source metadata rather than adding separate summary rows.

Canonical governance reference:

* `docs/audit-session-log-governance.md`

## 8.1.1 Phase 8C/8D Opportunity List Sorting Consolidation

Status: PASS

Completed behavior:

* `public.opportunities_lineage_grouped_view` now provides a per-row `row_activity_time` that aggregates direct opportunity-related business activity.
* The view keeps `lineage_group_latest_activity` as the parent-child group sorting timestamp.
* Parent-child group order remains intact; groups are not flattened.
* Backend DTO exposes `rowActivityTime` and `lineageGroupLatestActivity` while preserving `effectiveLastActivity`.
* Opportunity List frontend displays `rowActivityTime || effectiveLastActivity` for the `?敺暑??` column.
* The list sorting can use group latest activity while each row still displays its own activity timestamp.

Protected anti-patterns:

* Do not direct-join activity tables into the view without pre-aggregation.
* Do not use `audit_logs` as the sorting source.
* Do not overwrite `effectiveLastActivity` globally.
* Do not display `lineageGroupLatestActivity` as every row's visible `?敺暑??` value.

## 8.2 Google API Native Transport Governance

Render production experienced `ERR_STREAM_PREMATURE_CLOSE` / `Premature close` failures when Google APIs were accessed through the `googleapis` / `gaxios` / `node-fetch` request path.

Verified recovery path:

* Node built-in `https` restored OAuth token refresh.
* Node built-in `https` restored Google Sheets `values.get` reads.
* Node built-in `https` restored Google Calendar `events.list` reads.

Production read standards:

* OAuth refresh must use the `GoogleClientService` native HTTPS refresh path.
* Google Sheets `values.get` reads must use `GoogleClientService.getSheetValuesNative()`.
* Google Calendar `events.list` reads must use `GoogleClientService.getCalendarEventsNative()`.
* Do not add new direct `googleapis` / `gaxios` Google API read paths for Sheets `values.get` or Calendar `events.list` in Render production flows.

Google Sheet remains part of the long-term architecture. Google Sheet and Supabase are intended to coexist long term; this governance does not remove Google Sheet usage, but standardizes Google API access through the native Google transport layer.

Write-path boundary:

* Google API write paths, such as Calendar `events.insert` and Google Sheets append/update, remain on legacy `googleapis` unless separately scoped and approved.
* Do not convert write paths as part of read-transport cleanup.

Render smoke-test checklist after deployment:

* OAuth native refresh success log.
* Native Sheets read success for key ranges.
* Native Calendar `events.list` success.
* No `GaxiosError` / `node-fetch` / `ERR_STREAM_PREMATURE_CLOSE` for active read paths.

## 8.3 Opportunity Detail Activity Wall / Event Report Consolidation

Status: PASS

Completed behavior:

* Event Report timeline time alignment is complete: Event Report rows use child Event Report `createdTime`, while normal interaction rows use parent `interactionTime || createdTime`.
* Activity Wall local row sorting by timeline time is complete.
* Header time, expanded detail time, date grouping, and sorting are aligned to the same timeline-time source.
* Inline Event Report create/update write-normalizes datetime-local values to UTC ISO.
* Management mode live sync is complete for open Event Report edit forms, including the `?潛???` readonly/editable toggle.
* Activity Wall helper hint placement is complete inside `.activity-hub-header-actions` before `?啣?鈭?`.
* System-record generic locked-row `View` cleanup is complete at render level.

No backend, DB, schema, migration, route, controller, service, data-access, package, generated snapshot, shared modal, or endpoint change is claimed by this consolidation entry.

Detailed rules live in `docs/architecture-governance.md`.

## 8.4 Weekend Forensics Planning Evidence Archive (2026-07-06)

Weekend Forensics completed and its reports are archived under `docs/forensics/wknd/results/`.

Decision:

```text
ACCEPT_FOR_PLANNING_WITH_CAUTION
```

This evidence may guide future planning, but it does not authorize source changes, cleanup, deletion, refactor, migration, patching, or PR creation.

Future Weekend Forensics-derived planning must consult `docs/forensics/wknd/results/17-weekend-planning-baseline.md`.

## 8.5 RAW Contact SQL Authority Closure Archive (2026-07-15)

This is a governance archive, not a new runtime patch.

Closed CRM-side workstream:

```text
RAW Contact SQL Authority Cutover
UI / Product PASS
```

Patch-series closure:

* Phase A RAW SQL adapter and identifier resolver foundation.
* Phase A identifier contract fix.
* Phase B RAW SQL runtime authority cutover.
* Frontend / LIFF / route static alignment audits.
* Dashboard RAW stats concurrent-fetch cleanup.
* UI/Product PASS on 2026-07-15.

Final CRM-side state:

* `public.raw_contact_captures` is the CRM RAW runtime authority.
* `cardId` is canonical, with positive legacy `rowIndex` compatibility through `raw_payload.legacy_row_index`.
* active CRM RAW list/read/edit/delete/status/workflow paths resolve through SQL.
* numeric, UUID, and `MANUAL` `contacts.source_id` compatibility remains.
* Dashboard RAW contact stats are SQL-backed, start concurrently with `/api/dashboard`, and remain failure-isolated from main Dashboard rendering.

Scope and non-goals:

* no backend runtime patch is introduced by this archive;
* no HTML/CSS/UI redesign is claimed;
* no API URL-shape change is claimed;
* no direct SQL COUNT optimization is claimed for Dashboard RAW stats;
* no bulk `contacts.source_id` migration is claimed;
* OCR-side ingestion and cross-repository end-to-end closure remain separate pending validation unless independently evidenced;
* the entire CRM is not declared Google-Sheet-free.

## 9. Recommended next actions ranked by safety

1. Documentation review.
2. Read-only audits.
3. Small scoped patches with exact file and symbol targets.
4. Avoid broad refactor.

## 10. What should not be done while user is away

Do not:

* run browser testing
* perform UI visual patching
* perform large refactors
* make DB permission changes
* install packages
* start or restart local servers
* occupy localhost ports

## 11. Current Product Cost / Opportunity Spec baseline

Product Cost opportunity-spec mapping:

```text
L = oppSpecOption
M = oppDisplayCategory
N = oppDisplayOrder
O = oppBehaviorMode
P/Q/R/S/T/U/V continue as aspect / description / status / creator / createTime / lastModifier / lastUpdateTime
```

Opportunity Detail possible spec options come from:

```text
GET /api/products/opportunity-specs
```

Endpoint and pricing rules:

* endpoint is lightweight and does not return cost
* endpoint filters active products with truthy `oppSpecOption`
* product-id specs store product id keys in `potentialSpecification`
* legacy raw keys remain display-safe and are not automatically migrated
* product-id spec pricing uses sales-model price, falls back to `priceMtu`, then `0`
* cost is never used
* `systemConfig` value2 is not used for product-id spec price calculation

Product Cost table behavior:

* visible table is flat and compact
* inline edit fields are `name`, `spec`, `priceMtb`, `priceSi`, `priceMtu`, `oppDisplayCategory`, and `status`
* `oppDisplayCategory` syncs hidden `category`
* status syncs hidden `oppSpecOption`
* new rows default active and use `oppDisplayOrder = max valid oppDisplayOrder + 1`
* existing rows preserve hidden `oppDisplayOrder`
* `saveAll`, dirty-check, and payload shape remain the existing batch path

Product Cost display ordering:

* unsaved `_isNew` rows render first
* saved rows visually group by `oppDisplayCategory`
* group order follows each group's minimum valid numeric `oppDisplayOrder`
* rows inside the group sort by their own numeric `oppDisplayOrder` ascending
* missing/non-numeric order sorts after numeric order within the group
* display sorting does not mutate `this.allProducts`, product objects, Sheet row order, or `oppDisplayOrder`

## 12. 2026-06 Cleanup Checkpoint

Completed non-breaking cleanup:

* Service container unused Sheet DI cleanup completed in `services/service-container.js`.
  Removed unused active DI imports / objects for announcement Sheet reader/writer and weekly Sheet writer, including the `weeklyBusinessWriter` export.
* Follow-up orphan SPA page module cleanup completed in `public/scripts/opportunities/opportunities.js`.
  Removed unreachable `loadFollowUpPage()` and the orphan `follow-up` page module registration.
* Product Cost hidden chip-wall frontend cleanup completed in `public/scripts/products/products.js` and `public/views/product-list.html`.
  Removed the hidden chip-wall container and unreachable drag/reorder helpers.
* Product Cost `wallArea is not defined` hotfix completed in `ProductManager.renderTable(query = '')`.
  The unsafe implicit `wallArea` reference was replaced with a safe local `.chip-wall-container` DOM query. Product Cost formulas, data shape, sorting, backend behavior, and `ProductDetailModal` behavior were not changed.

Protection notes:

* No data adapter files were deleted during the DI cleanup.
* No backend routes, controllers, services, Product Cost backend category-order route, or `SystemPref` compatibility paths were removed.
* Product Cost flat table rendering, inline edit, `addNewRow()`, `saveAll()`, Sheet L/M/N/O mapping, and `/api/products/opportunity-specs` remain the accepted baseline.
* `ProductDetailModal`, `openDetailModal()`, `loadCategoryOrder()`, and `this.categoryOrder` remain intentionally protected pending separate approval.
* Dashboard follow-up logic, `/api/dashboard`, `followUpList`, `followUpCount`, `DashboardService._getFollowUpOpportunities`, `config.FOLLOW_UP`, Opportunity List, Opportunity Detail, Activity Hub, and backend were not touched by the follow-up cleanup.

Remaining cleanup targets are pending forensic and approval:

* `ProductDetailModal` reachability / removal-readiness.
* Final Product Cost `loadCategoryOrder()` / `categoryOrder` / `openDetailModal()` dependency review.
* Backend `/api/products/category-order` cleanup only after frontend no longer calls it.
* Meeting / Calendar hidden workflow ownership decision.
* LINE leads standalone page ownership decision.
* System status modal / API trigger audit.
* `services/index.js` retired factory audit.
* `data/index.js` legacy export audit.
* Google Sheet fallback domain-by-domain SQL replacement roadmap.

Explicit no-touch reminders:

* Do not remove Google Sheet fallback broadly.
* Product Cost Sheet remains active.
* Dormant RAW Sheet reader/writer compatibility code remains protected; current CRM RAW runtime authority is SQL.
* LINE leads route compatibility remains protected while accepted RAW mutations resolve through SQL.
* System Config / Auth still depends on Sheet-backed system config and users.
* Weekly Business read fallback remains protected.
* Internal Ops remains Sheet-backed.
* Do not remove ECharts or `public/assets/maps/taiwan.json` as part of any historical Highcharts cleanup follow-up.
* `ProductDetailModal` must not be deleted until separately approved.
* `repomix-packs/**` are generated and must not be hand-edited.

Internal Ops Dev Projects remains Sheet-backed. The accepted Dev Projects sheet range is `A:U`, with `U = 案件關係`. Existing legacy keys are intentionally preserved for compatibility, while semantic aliases support current UI/product language. The accepted Dev Projects views are `案件導向` and `人員導向`.

Current Dev Projects state:

* `案件導向` grouping is display-only, applies only to the case-oriented view, and must not filter or mutate rows.
* `人員導向` integrates workload summary and detail rows, defaults to expanded, and uses one global `明細` toggle only.
* the old standalone lower `團隊成員工作負荷` block is retired from the page layout; `public/scripts/internal-ops/internal-ops-team-workload.js` remains historical/reference logic.
* `已完成` remains in the normal list, while `封存` is a separate manual lifecycle state that moves cases to the bottom `封存案件` group.
* this module is not part of Supabase migration scope unless separately planned.

## 13. Mobile Dashboard V1 Consolidation

Mobile Dashboard V1 is sealed after regression QA PASS.

Completed implementation summary:

* M2 added mobile-only Dashboard slots before the main Dashboard grid.
* M3 and M6A formalized the mobile reminder panel in the existing mobile reminder slot.
* F1 repaired the Dashboard `stats-grid` outer grid span on mobile.
* F2 repaired mobile shell width containment and page-level horizontal overflow.
* M4 compacted KPI cards for the accepted 2-column mobile layout.
* M5 made chart / widget controls mobile-safe, including trend controls.
* M6B-1 added the mobile header overflow guard.
* M6B-2 header visual polish is deferred / backlog and is not part of the sealed V1 scope.

Implementation files:

* `public/dashboard.html`
* `public/scripts/dashboard/dashboard_widgets.js`
* `public/styles/modules/responsive.css`

Validation summary:

* `git diff --check` passed during implementation phases.
* `node --check public/scripts/dashboard/dashboard_widgets.js` passed for JavaScript-touching phases.
* Mobile QA confirmed no page-level horizontal overflow.
* Dashboard `stats-grid` spans full width on mobile while KPI remains 2-column at normal phone widths.
* Mobile reminder panel expand / collapse works against the current alerts array.
* Mobile header marquee is hidden.
* Desktop header marquee remains unchanged.
* Desktop zero-regression visual QA passed.

Lessons learned:

* Do not scale the desktop Dashboard directly into mobile.
* Fix responsive foundation before component polish.
* `stats-grid` has a dual role: outer Dashboard grid item and inner KPI grid.
* Desktop zero-regression is mandatory for mobile Dashboard work.
* Mobile header marquee is deprecated; the mobile reminder panel is the official mobile reminder entry.
* Scoped `!important` is allowed only when overriding inline styles or JS-injected important rules, and only inside mobile-scoped selectors.
* App shell header scope and Dashboard content scope must stay separate.
* Console computed style checks are critical for responsive foundation diagnosis.
* Every mobile patch must verify no horizontal overflow.
