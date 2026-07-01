# Non-Breaking Cleanup Roadmap

## 1. Purpose

This roadmap is for non-breaking cleanup planning only. It records historical residue, compatibility paths, and future cleanup candidates found during static forensics so the repo can improve maintainability without changing current CRM behavior.

This document does not authorize deletion or runtime changes by itself. Any future cleanup patch must be separately approved and validated.

## 2. Cleanup Principles

- Existing functionality must not be affected.
- No deletion without evidence.
- Run read-only forensic before any cleanup patch.
- Fallback and rollback paths must be preserved unless explicitly approved.
- Runtime behavior is more important than file count reduction.
- Generated files must not be hand-edited.
- When uncertain, classify the item as risky and keep it.

## 3. Current Accepted Baselines To Protect

- Product Cost compact flat table and inline edit path.
- Product Cost frontend-only M-group display ordering.
- Product Cost M group order is the minimum valid N / `oppDisplayOrder` inside that M / `oppDisplayCategory` group.
- Products in the same M group sort by each product's own N / `oppDisplayOrder` ascending.
- Product Cost ordering does not reorder Sheet rows, shift N values, or persist pending display-order state.
- Product Cost Sheet L/M/N/O mapping: L = `oppSpecOption`, M = `oppDisplayCategory`, N = `oppDisplayOrder`, O = `oppBehaviorMode`.
- Product Cost to `/api/products/opportunity-specs` to Opportunity Detail possible specs integration.
- Opportunity Detail possible specs must not use Product Cost cost.
- Product-id possible-spec pricing uses sales-model price, then `priceMtu`, then `0`.
- Product-id possible-spec pricing must not fall back to `systemConfig` value2.
- Opportunity Detail Activity Hub and event report flow.
- Opportunity Detail Activity Wall timeline sorting must preserve Event Report child `createdTime` and normal interaction `interactionTime || createdTime` governance.
- Activity Wall system-record rows must remain readable audit rows without the generic locked-row `View` action; this is render-level cleanup, not CSS hiding.
- Opportunity Detail current stepper UI.
- Opportunity list sorting baseline: parent-child groups must remain grouped; group order is driven by `lineageGroupLatestActivity` / `lineage_group_latest_activity`.
- Opportunity list row display baseline: the `?敺暑??` column displays each row's own `rowActivityTime` / `row_activity_time`, falling back to `effectiveLastActivity`.
- Do not replace row display time with group latest time. Parent rows must not display child activity time unless the parent itself has that activity time.
- Do not flatten opportunity parent-child groups during cleanup.
- Do not overwrite `effectiveLastActivity` globally to implement group sorting.
- Sales Analysis ECharts direction.
- Sales Analysis `成交類型` donut chart is a standard professional donut with no rounded slice corners, no thick transparent border gaps, and subtle `padAngle: 1` separation.
- Sales Analysis `成交類型` donut must not be documented as fully gapless.
- Current governance docs:
  - `docs/architecture-governance.md`
  - `docs/tfc-crm-ui-style-governance.md`
  - `docs/repo-operational-consolidation-report.md`
  - `docs/echarts-migration-record.md`
  - `docs/highcharts-highmaps-remaining-references-audit.md`
  - `docs/supabase-access-sop.md`

## 4. Audit Summary

The repo has cleanup opportunities, but most of the obvious historical residue is still connected to runtime behavior through script loading, globals, inline handlers, fallback logic, or backend compatibility adapters.

Major residue areas:

- Highcharts/Highmaps leftovers remain in script loading, vendor assets, package metadata, shared chart helpers, and event chart rendering.
- Product Cost still contains a product detail modal path beside the accepted compact inline-edit table.
- Opportunity Detail contains legacy and fallback paths, including event-report legacy render blocks and possible-spec fallbacks.
- `systemConfig`, RAW/Sheet readers and writers, and compatibility adapters still support SQL-first migration and legacy data visibility.
- Debug and forensics logs remain in active event and backend flows.
- `repomix-packs/**` are generated snapshots and may contain historical references that should not be hand-edited.

## 4.1 2026-06 Cleanup Checkpoint

Completed cleanup items:

- Service container unused Sheet DI cleanup completed in `services/service-container.js`.
  - Removed active DI imports / objects for `AnnouncementReader`, `AnnouncementWriter`, `WeeklyBusinessWriter`, `announcementReader`, `announcementWriter`, `weeklyWriter`, and `weeklyBusinessWriter`.
  - No data adapter files were deleted.
  - No routes, controllers, downstream services, compatibility aliases, or active Sheet-backed domains were modified.
- Follow-up orphan SPA page module cleanup completed in `public/scripts/opportunities/opportunities.js`.
  - Removed unreachable `loadFollowUpPage()` and orphan `window.CRM_APP.pageModules['follow-up']` registration.
  - Dashboard follow-up logic, `/api/dashboard`, `followUpList`, `followUpCount`, `DashboardService._getFollowUpOpportunities`, `config.FOLLOW_UP`, Opportunity List, Opportunity Detail, Activity Hub, and backend were not touched.
- Product Cost hidden chip-wall frontend cleanup completed in `public/scripts/products/products.js` and `public/views/product-list.html`.
  - Removed hidden `#chip-wall-area`, `#category-chip-list`, `#order-save-status`, `initChipWall()`, `getDragAfterElement()`, `checkAndSaveOrder()`, and `saveCategoryOrder()`.
  - The unsafe implicit `wallArea` reference in `ProductManager.renderTable(query = '')` was replaced with a safe local `.chip-wall-container` DOM query.
  - No Product Cost formulas, sorting, data shape, backend behavior, or `ProductDetailModal` behavior changed.
  - Product Cost flat table rendering, inline edit, `addNewRow()`, `saveAll()`, Product Cost Sheet L/M/N/O mapping, `/api/products/opportunity-specs`, `ProductDetailModal`, `openDetailModal()`, `loadCategoryOrder()`, `this.categoryOrder`, backend `/api/products/category-order`, and `SystemPref` remain protected.

Pending cleanup targets that are not approved for deletion:

- `ProductDetailModal` reachability / removal-readiness.
- `loadCategoryOrder()` / `categoryOrder` / `openDetailModal()` final dependency.
- Backend `/api/products/category-order` route cleanup only after frontend no longer calls it.
- Meeting / Calendar hidden workflow ownership decision.
- LINE leads standalone page ownership decision.
- System status modal / API trigger audit.
- Event charts Highcharts to ECharts migration forensic.
- `services/index.js` retired factory audit.
- `data/index.js` legacy export audit.
- Google Sheet fallback domain-by-domain SQL replacement roadmap.

No-touch reminders:

- Do not remove Google Sheet fallback broadly.
- Product Cost Sheet remains active.
- RAW contacts and LINE leads still depend on Sheet-backed RAW flow.
- System Config / Auth still depends on Sheet-backed system config and users.
- Weekly Business read fallback remains protected.
- Internal Ops remains Sheet-backed.
- Highcharts remnants must not be deleted until event charts are migrated.
- `ProductDetailModal` must not be deleted until separately approved.
- `repomix-packs/**` are generated snapshots and must not be hand-edited.

Google API native transport stabilization:

- Completed stabilization covers OAuth refresh, Google Sheets `values.get`, and Google Calendar `events.list`.
- Remaining legacy `googleapis` paths are intentionally unchanged:
  - Calendar write paths such as `events.insert`.
  - Google Sheets write paths such as append/update.
  - Metadata reads such as `spreadsheets.get` / `getTabId`.
  - Diagnostic-only connection tests.
- Future phases may evaluate native transport for Google API write paths and metadata reads, but only with separate scope because writes have side effects.
- Do not treat these remnants as emergency bugs unless Render logs show active production failures.

## 4.2 2026-07 Activity Wall Governance Cleanup Checkpoint

Completed cleanup:

- Activity Wall system-record `View` action was removed at render level.
- System-record content, time, and recorder remain visible.
- Event Report inline `撅?` remains.
- Normal interaction edit behavior remains.
- `showForEditing()` was not globally removed or changed.
- `showEventLogReport()`, shared modal code, backend endpoints, routes, controllers, services, data access, DB schema, and migrations were not touched.

Protected boundaries:

- Do not use CSS hiding for this cleanup pattern.
- Do not remove shared modal code or Event Report backend endpoints as part of Activity Wall cleanup.
- Do not globally remove `showForEditing()`.
- Do not treat system-record View removal as authorization to delete audit records, tombstones, or backend compatibility paths.
- Do not add DB views, parent `interactionTime` synchronization, backend DTO enrichment, or migration/backfill to preserve the completed Activity Wall timeline policy.

Remaining deferred cleanup requiring separate product decision:

- Opportunity Detail Event Reports rail / old modal duplicate behavior remains a separate cleanup topic and is not approved for deletion by this checkpoint.

## 5. Candidate Classification Rules

| Classification | Meaning |
| --- | --- |
| Safe documentation-only item | Can be documented, inventoried, or marked for future review. No code deletion is recommended. |
| Low-risk future cleanup candidate | No obvious static runtime dependency, or likely console/comment-only cleanup. Still requires explicit approval before patch. |
| Medium-risk candidate | Appears historical or inactive, but dynamic references, fallback usage, or rollback value are possible. Needs focused forensic before patch. |
| High-risk / do-not-touch | Connected to active UI, API, schema, fallback logic, globals, inline handlers, accepted baselines, or rollback paths. |
| Keep intentionally | Known compatibility or generated artifact that should remain unless project policy changes. |

## 6. Candidate Inventory

| ID | Area | File/path | Classification | Reason | Recommended action |
| --- | --- | --- | --- | --- | --- |
| C01 | Highcharts script loading | `public/dashboard.html` | High-risk / do-not-touch | Dashboard still loads Highcharts/Highmaps vendor scripts before ECharts. Active event charts still depend on Highcharts. | Keep until event charts are migrated and all callers are removed. |
| C02 | Highcharts vendor/package dependencies | `public/assets/vendor/highcharts/*`, `package.json`, `package-lock.json` | High-risk / do-not-touch | Vendor files and dependencies remain required while active Highcharts callers exist. | Do not remove without complete Highcharts caller audit and approval. |
| C03 | Event charts Highcharts usage | `public/scripts/events/event-charts.js` | High-risk / do-not-touch | Event trend/type/size charts still call the Highcharts wrapper. | Schedule separate ECharts migration forensic before any patch. |
| C04 | Shared chart helper | `public/scripts/services/charting.js` | High-risk / do-not-touch | Contains both Highcharts and ECharts helpers; active event charts call `createThemedChart`. | Keep until Highcharts runtime dependency is fully eliminated. |
| C05 | Dashboard Highcharts fallback | `public/scripts/dashboard/dashboard_widgets.js` | Medium-risk candidate | A Highcharts block appears after the current ECharts trend path returns. It may be unreachable, but may also be rollback residue. | Document only; verify reachability before removal. |
| C06 | Product Cost detail modal class | `public/scripts/products/product-detail-modal.js` | High-risk / do-not-touch | Looks historical beside inline edit, but `products.js` still instantiates `ProductDetailModal`. | Do not delete without separate Product Cost modal reachability approval. |
| C07 | Product Cost modal markup/styles | `public/views/product-list.html` | High-risk / do-not-touch | `#product-detail-modal` markup and modal selectors are still queried by the modal class. | Preserve unless a focused forensic proves it is unreachable and user approves. |
| C08 | Opportunity event reports legacy render block | `public/scripts/opportunities/details/opportunity-event-reports.js` | Medium-risk candidate | Current rail render path returns before older tab/table render code, but Activity Hub/event report flow is active. | Do not touch without Opportunity Detail event-report forensic. |
| C09 | Opportunity specs legacy fallback | `public/scripts/opportunities/details/opportunity-details-components.js` | High-risk / do-not-touch | Product specs API path falls back to `systemConfig` options when unavailable. | Preserve fallback unless explicitly approved after API reliability audit. |
| C10 | Opportunity specs label hydration fallback | `public/scripts/opportunities/details/opportunity-info-view.js` | High-risk / do-not-touch | Hydrates possible-spec labels from `/api/products/opportunity-specs` with safe fallback behavior. | Preserve because it protects accepted Opportunity Detail specs display. |
| C11 | Deprecated system config adapter | `data/system-reader.js` | High-risk / do-not-touch | `getSystemConfig()` is deprecated but kept as a compatibility adapter for legacy modules. | Keep until a dependency map proves no callers or fallback need it. |
| C12 | Opportunity service legacy fallback | `services/opportunity-service.js` | High-risk / do-not-touch | SQL-first service still preserves legacy array contracts and fallback behavior. | Keep; backend/API impact requires deeper forensic. |
| C13 | Legacy event reader | `data/event-log-reader.js` | High-risk / do-not-touch | Reads legacy event data and merges it with newer event tables. | Keep to preserve historical event visibility. |
| C14 | Event debug/forensics logs | `public/scripts/events/event-report-manager.js`, `public/scripts/events/event-editor-standalone.js`, `controllers/event.controller.js` | Low-risk future cleanup candidate | Console and trace logs appear cleanup-friendly, but they sit in active flows. | Inventory first; later gate or remove with approval. |
| C15 | Internal Ops TODO placeholders | `public/scripts/internal-ops/internal-ops-subscriptions.js`, `public/scripts/internal-ops/internal-ops.js` | Medium-risk candidate | Placeholder buttons and TODO alerts may be visible product stubs. | Confirm product status before changing. |
| C16 | Generated repomix snapshots | `repomix-packs/**` | Keep intentionally | Generated packed snapshots may contain historical references and should not be hand-edited. | Regenerate through governed scripts only. |

## 7. Safe Next Tasks

- Event charts ECharts migration forensic, no patch.
- Product Cost modal reachability audit, no patch.
- Debug-log inventory and gating policy, no patch.
- `systemConfig` dependency map, no patch.
- `repomix-packs/**` generated-file policy note.

## 8. Explicit Do-Not-Touch List

Do not delete or modify these without separate approval:

- Highcharts vendor/package/script loading.
- `ProductDetailModal`.
- Product Cost modal markup in `public/views/product-list.html`.
- Opportunity specs fallback logic.
- `systemConfig` adapters.
- RAW/Sheet compatibility readers and writers.
- Legacy event reader paths that preserve historical event visibility.
- `repomix-packs/**` by hand.

Internal Ops Dev Projects compatibility is protected during cleanup:

- Do not treat Dev Projects legacy keys as dead code.
- Do not remove legacy popup/modal code paths unless separately audited and approved.
- Do not remove Sheet-backed `A:U` compatibility.
- Do not rename payload keys for semantic cleanliness.
- Do not collapse accepted `案件導向` or `人員導向` behaviors during cleanup.
- Do not remove notes support.

## 9. Approval Gates For Future Cleanup Patches

Every future cleanup patch must include:

- Exact files to be changed.
- Exact symbols, functions, selectors, routes, or assets affected.
- Reference evidence proving the item is unused or safe to change.
- Rollback risk and fallback impact.
- Validation commands.
- PASS/NG review by ChatGPT/user before merge.

Recommended minimum validation for docs-only cleanup:

- `git diff --check`
- `git diff --name-only`

Recommended minimum validation for runtime cleanup:

- Static reference search for each changed symbol or selector.
- Page/module-specific smoke validation approved by the user.
- Explicit confirmation that accepted baselines remain unchanged.
