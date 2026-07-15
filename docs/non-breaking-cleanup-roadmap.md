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
- Highcharts / Highmaps retirement is completed. ECharts and `public/assets/maps/taiwan.json` remain active and must not be removed as part of Highcharts cleanup.
- CRM RAW Contact SQL authority workstream is closed with UI/Product PASS on 2026-07-15. `public.raw_contact_captures` is the CRM RAW runtime authority; dormant RAW Sheet compatibility code is protected until a separate retirement audit.
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

- Highcharts/Highmaps retirement is completed. Former script loading, vendor assets, package metadata, shared chart helpers, event chart dependency, and local `@highcharts` residue were removed through the completed patch series.
- Product Cost still contains a product detail modal path beside the accepted compact inline-edit table.
- Opportunity Detail contains legacy and fallback paths, including event-report legacy render blocks and possible-spec fallbacks.
- `systemConfig`, RAW/Sheet readers and writers, and compatibility adapters still support SQL-first migration and legacy data visibility.
- Debug and forensics logs remain in active event and backend flows.
- `repomix-packs/**` was generated AI context output. It is not source-of-truth, not runtime source, and should not be version-controlled. Regenerate it locally through `scripts/**/pack-*.ps1` only when needed.

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
- `services/index.js` retired factory audit.
- `data/index.js` legacy export audit.
- Google Sheet fallback domain-by-domain SQL replacement roadmap.

No-touch reminders:

- Do not remove Google Sheet fallback broadly.
- Product Cost Sheet remains active.
- Dormant RAW Sheet reader/writer compatibility code remains protected; current CRM RAW runtime authority is SQL.
- LINE leads route compatibility remains protected while accepted RAW mutations resolve through SQL.
- System Config / Auth still depends on Sheet-backed system config and users.
- Weekly Business read fallback remains protected.
- Internal Ops remains Sheet-backed.
- Do not remove ECharts or `public/assets/maps/taiwan.json` as part of completed Highcharts cleanup.
- `ProductDetailModal` must not be deleted until separately approved.
- `repomix-packs/**` is generated local AI context output and must not be restored as tracked source. Generator scripts remain intentionally kept for now.

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

## 4.3 2026-07 Sales Analysis Compatibility Cleanup Note

Sales Analysis removed the Sales Model filter UI by product decision, but backend/API `salesModel` parameter support remains intentionally untouched.

Current compatibility state:

- `currentSalesModelFilter = 'all'` remains as a safe dormant/default frontend state.
- Sales Analysis frontend fetches/defaults to all sales models.
- Backend/API support for `salesModel` is not cleanup-approved for removal.

Future cleanup may revisit this only after separate forensics confirms no callers require the parameter or compatibility state. This is not required immediate cleanup.

Protected boundaries:

- Do not reintroduce Sales Model filter UI without a new product decision.
- Do not remove backend/API `salesModel` support as part of frontend UI cleanup.
- Do not convert the completed Sales Analysis frontend patch series into backend/API/DB work.

## 4.4 2026-07 Weekend Forensics Planning Baseline Caution

Weekend Forensics is planning-quality evidence only.

It does not approve:

- cleanup
- deletion
- refactor
- migration
- patching

Cleanup candidates still require targeted evidence, explicit scope, and human approval before any future patch.

Consult `docs/forensics/wknd/results/17-weekend-planning-baseline.md` before using Weekend Forensics-derived planning.

## 4.5 2026-07 RAW Contact SQL Authority Cleanup Boundary

The CRM-side RAW Contact SQL migration is closed. This roadmap records remaining cleanup candidates only; it does not authorize deletion, migration, refactor, or automatic retirement.

Current accepted state:

* `public.raw_contact_captures` is the CRM RAW runtime authority.
* `cardId` is canonical.
* positive legacy `rowIndex` remains compatibility identity through `raw_payload.legacy_row_index`.
* numeric, UUID, and `MANUAL` `contacts.source_id` values remain supported by runtime compatibility rules.
* Dashboard RAW stats are SQL-backed and failure-isolated from the main Dashboard render.

Future cleanup candidates, all non-blocking:

* dormant legacy RAW Sheet reader/writer DI or classes;
* duplicated frontend `getRawContactIdentifier` helper logic;
* Dashboard RAW stats full-record hydration versus future SQL aggregation/count;
* potential later `contacts.source_id` governance or migration;
* external OCR repository end-to-end validation;
* final RAW Sheet retirement/deletion audit.

Protected boundaries:

* do not delete Sheet classes or the RAW Sheet merely because SQL runtime authority is closed;
* do not restore CRM RAW Sheet fallback;
* do not fabricate `rowIndex` for SQL-only records;
* do not copy `cardId` into `rowIndex`;
* do not bulk-migrate `contacts.source_id` without separate approval;
* do not merge OCR validation into the completed CRM workstream.

## 5. Candidate Classification Rules

| Classification | Meaning |
| --- | --- |
| Safe documentation-only item | Can be documented, inventoried, or marked for future review. No code deletion is recommended. |
| Low-risk future cleanup candidate | No obvious static runtime dependency, or likely console/comment-only cleanup. Still requires explicit approval before patch. |
| Medium-risk candidate | Appears historical or inactive, but dynamic references, fallback usage, or rollback value are possible. Needs focused forensic before patch. |
| High-risk / do-not-touch | Connected to active UI, API, schema, fallback logic, globals, inline handlers, accepted baselines, or rollback paths. |
| Keep intentionally | Known compatibility or generation tooling that should remain unless project policy changes. |

## 6. Candidate Inventory

| ID | Area | File/path | Classification | Reason | Recommended action |
| --- | --- | --- | --- | --- | --- |
| C01 | Highcharts script loading | `public/dashboard.html` | Completed / retired | Dashboard Highcharts/Highmaps loader scripts were removed after callers were eliminated. | Historical record only; do not treat as pending cleanup. |
| C02 | Highcharts vendor/package dependencies | `public/assets/vendor/highcharts/*`, `package.json`, `package-lock.json` | Completed / retired | Highcharts vendor assets and npm dependencies were removed. ECharts remains active. | Historical record only; do not remove ECharts or `public/assets/maps/taiwan.json`. |
| C03 | Event charts Highcharts usage | `public/scripts/events/event-charts.js` | Completed / retired | Event charts legacy module was loaded but UI-unreachable and was removed. | Historical record only. |
| C04 | Shared chart helper | `public/scripts/services/charting.js` | Completed / retired | Highcharts-only helper/theme code and `createThemedChart()` were removed. ECharts helper remains active. | Historical record only. |
| C05 | Dashboard Highcharts fallback | `public/scripts/dashboard/dashboard_widgets.js` | Completed / retired | Unreachable Highcharts fallback block was removed. Dashboard trend uses ECharts. | Historical record only. |
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
| C16 | Generated repomix snapshots | `repomix-packs/**` | Removed generated output | Generated AI context output is not source-of-truth, not runtime source, and should not be version-controlled. | Keep `scripts/**/pack-*.ps1`; regenerate packs locally only when needed. |

## 7. Safe Next Tasks

- Product Cost modal reachability audit, no patch.
- Debug-log inventory and gating policy, no patch.
- `systemConfig` dependency map, no patch.
- `repomix-packs/**` generated-output removal is complete; keep generator scripts for local regeneration only.

## 8. Explicit Do-Not-Touch List

Do not delete or modify these without separate approval:

- Reintroducing Highcharts vendor/package/script loading without explicit new product/architecture approval.
- Removing ECharts or `public/assets/maps/taiwan.json` as part of historical Highcharts cleanup.
- `ProductDetailModal`.
- Product Cost modal markup in `public/views/product-list.html`.
- Opportunity specs fallback logic.
- `systemConfig` adapters.
- RAW/Sheet compatibility readers and writers.
- Legacy event reader paths that preserve historical event visibility.
- Restoring `repomix-packs/**` as tracked source. Local regeneration is allowed through `scripts/**/pack-*.ps1` when explicit context packs are needed.

This generated-output deletion does not authorize runtime source cleanup, docs archive deletion, fallback removal, charting cleanup, CSS cleanup, route cleanup, SQL-only migration, or removal of other generated/vendor/archive areas.

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
