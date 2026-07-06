# 15 Weekend Synthesis

## Executive Conclusion

EVIDENCED: The weekend queue produced a planning-quality repository map from reports `docs/forensics/wknd/results/01-repo-boundary.md` through `docs/forensics/wknd/results/14-evidence-gap-closure-pass.md`. The active app path is a Node / Express backend started by `app.js`, a static dashboard SPA served from `public/dashboard.html`, API routes mounted through `routes/index.js`, runtime DI owned by `services/service-container.js`, and frontend runtime order controlled by `public/scripts/import-bundle.js` and `public/styles/main.css`. Evidence appears across reports 01, 03, 05, 07, 08, 10, and 13, citing `package.json`, `app.js:10`, `app.js:34`, `app.js:37`, `app.js:53`, `routes/index.js:34-65`, `services/service-container.js:92-368`, `public/dashboard.html:10-19`, `public/dashboard.html:430`, `public/scripts/import-bundle.js:13-57`, and `public/styles/main.css:5-21`.

EVIDENCED: The repo is not safe to reason about from names alone. Prior reports repeatedly found mixed runtime ownership: generated snapshots beside source, docs with authority limits, route aliases, controller patterns that differ by domain, SQL plus Sheet/RAW data paths, distributed `window.CRM_APP` mutation, overlapping stale-cache behavior, CSS selector collisions, JS-injected CSS, and split Highcharts/ECharts charting. Evidence appears in reports 01 through 14.

UNKNOWN: The campaign did not execute production traffic, browser navigation, broad tests, live database queries, live Google/LINE API calls, or runtime CSS/chart/map traces. Remaining UNKNOWNs are runtime-validation questions, not evidence for removability.

## Files Inspected

| Classification | File inspected | Evidence role |
| --- | --- | --- |
| REPORT_DOC | `docs/forensics/wknd/results/01-repo-boundary.md` | Repo boundary, generated/vendor/static/docs cautions. |
| REPORT_DOC | `docs/forensics/wknd/results/02-docs-source-map.md` | Docs authority, roadmap/report/schema limits. |
| REPORT_DOC | `docs/forensics/wknd/results/03-backend-route-auth-alias-map.md` | API route mounts, auth boundary, aliases. |
| REPORT_DOC | `docs/forensics/wknd/results/04-controller-service-endpoint-map.md` | Controller/service linkage patterns. |
| REPORT_DOC | `docs/forensics/wknd/results/05-service-container-di-map.md` | Runtime DI, service/data construction. |
| REPORT_DOC | `docs/forensics/wknd/results/06-data-reader-writer-fallback-map.md` | SQL, Sheets, RAW, fallback boundaries. |
| REPORT_DOC | `docs/forensics/wknd/results/07-spa-bootstrap-router-crmapp-map.md` | SPA bootstrap, router, `CRM_APP` mutation. |
| REPORT_DOC | `docs/forensics/wknd/results/08-frontend-api-stale-cache-map.md` | `authedFetch`, stale invalidation, router refresh. |
| REPORT_DOC | `docs/forensics/wknd/results/09-frontend-heavy-module-map.md` | Large frontend module ownership and globals. |
| REPORT_DOC | `docs/forensics/wknd/results/10-css-load-selector-ownership-map.md` | CSS load order and selector ownership. |
| REPORT_DOC | `docs/forensics/wknd/results/11-js-injected-css-common-ui-map.md` | JS-injected CSS and common UI helpers. |
| REPORT_DOC | `docs/forensics/wknd/results/12-charting-map-visualization-boundary.md` | Highcharts/ECharts/map boundary. |
| REPORT_DOC | `docs/forensics/wknd/results/13-cross-domain-llm-trap-review.md` | Cross-domain LLM trap map. |
| REPORT_DOC | `docs/forensics/wknd/results/14-evidence-gap-closure-pass.md` | Targeted closure of ten high-risk UNKNOWNs. |

## Evidence Tables

### Repo-Wide Active Path Map

| Domain | EVIDENCED active path | Key evidence |
| --- | --- | --- |
| App startup | `package.json` starts `node app.js`; `app.js` initializes services and mounts API/static routes. | Reports 01 and 05 cite `package.json`, `app.js:10`, `app.js:34`, `app.js:37`, `app.js:53`. |
| API routing | `app.js` mounts `/api` through `routes/index.js`; three route groups precede the global auth gate, then most domain routes mount after `authMiddleware.verifyToken`. | Report 03 cites `routes/index.js:34`, `routes/index.js:37`, `routes/index.js:40`, `routes/index.js:45-65`. |
| Runtime DI | `services/service-container.js` is the active app DI owner for the inspected startup path. | Report 05 cites `app.js:10`, `app.js:34`, `app.js:37`, `services/service-container.js:92`, `services/service-container.js:368`. |
| Controller access | Controllers use mixed patterns: container-exposed instances, route-factory construction, and `req.app.get('services')` lookups. | Report 04 cites `services/service-container.js:305-344`, `routes/contact.routes.js:18-25`, `routes/line-leads.routes.js:20-26`, `controllers/event.controller.js:19`, `controllers/internal-ops.controller.js:35`. |
| Data layer | Active container imports data classes directly, not through `data/index.js`; runtime data paths mix SQL, RAW Sheet, and operational Sheet readers/writers. | Reports 05 and 06 cite `services/service-container.js:27-56`, `services/service-container.js:104-145`, `data/base-reader.js:149-156`, `data/base-writer.js:43-78`. |
| Frontend entrypoints | `public/dashboard.html` is the dashboard SPA entrypoint; `public/login.html` is a separate login entrypoint. | Report 07 cites `public/dashboard.html:26`, `public/dashboard.html:430`, `public/login.html:94`, `public/login.html:98`. |
| SPA script order | `public/scripts/import-bundle.js` writes the ordered dashboard script list. | Reports 07, 08, 09, and 13 cite `public/scripts/import-bundle.js:13-57`, `public/scripts/import-bundle.js:76-79`. |
| SPA routing/state | Router uses hashes, `[data-page]`, `.page-view` containers, `loaded/stale` flags, detail-page reload rules, and distributed `CRM_APP.pageModules`. | Reports 07 and 08 cite `public/scripts/core/router.js:24-180`, `public/scripts/core/constants.js:47`, `public/scripts/core/main.js:118-125`. |
| Frontend API/cache | `authedFetch` owns auth header handling, request queueing, 429 retry, auth failure redirects, notifications, and write-triggered stale marking. | Report 08 cites `public/scripts/services/api.js:31-35`, `public/scripts/services/api.js:74-78`, `public/scripts/services/api.js:96-107`, `public/scripts/services/api.js:127-152`. |
| CSS cascade | Dashboard loads `main.css`, then `user-profile.css`; `main.css` imports tokens/base/forms/modals/layout/navigation/components/features/responsive in order. | Report 10 cites `public/dashboard.html:10-11`, `public/styles/main.css:5-21`. |
| Common UI helpers | Static CSS, helper-generated markup, and JS-injected CSS jointly own toasts, pagination, modals, notifications, theme transitions, and some route-local styles. | Report 11 cites `public/scripts/services/ui.js:22-27`, `public/scripts/core/utils.js:175-209`, `public/scripts/core/theme-toggle.js:365-383`. |
| Charting/maps | Dashboard loads Highcharts/Highmaps and ECharts; active callers use ECharts for dashboard trend, Sales Analysis, and Taiwan map, while event charts still use Highcharts wrapper paths. | Report 12 cites `public/dashboard.html:13-19`, `public/scripts/services/charting.js:192`, `public/scripts/services/charting.js:304`, `public/scripts/events/event-charts.js:38-171`. |

### Source vs Generated, Vendor, Archive, Docs Boundary

| Area | Classification | EVIDENCED boundary |
| --- | --- | --- |
| `app.js`, `routes/**`, `controllers/**`, `services/**`, `data/**`, `public/scripts/**`, `public/styles/**` | ACTIVE_CONFIRMED / POSSIBLY_ACTIVE by domain | Reports 01, 03-12 trace active ownership through startup, route mounts, DI, dashboard load order, and CSS imports. |
| `repomix-packs/**` | GENERATED_SNAPSHOT | Report 01 cites pack scripts that invoke `repomix` and governance stating generated snapshots are not source. |
| `public/assets/vendor/**` | VENDOR_ASSET | Reports 01 and 12 cite local Highcharts vendor copy/setup evidence and dashboard vendor script loading. |
| `public/assets/maps/taiwan.json` | VENDOR_ASSET / static map data asset | Reports 01 and 12 classify it as a large static map asset referenced by `public/scripts/map-manager.js`. |
| `docs/non-breaking-cleanup-roadmap.md` | ROADMAP_DOC | Report 02 cites its own planning-only authority limit at `docs/non-breaking-cleanup-roadmap.md:3-8`. |
| `docs/repo-operational-consolidation-report.md`, chart audit docs | REPORT_DOC | Reports 02 and 12 treat report/audit docs as context requiring source cross-check. |
| `docs/schema/audit-logs-v1.sql` | ACTIVE_DOC / reference schema doc | Report 02 cites `docs/schema/audit-logs-v1.sql:4-5` as manual reference, not an auto-run migration. |
| Separate archive or handoff directory | UNKNOWN | Report 02 found no separate archive/handoff directory in targeted docs inventory, but does not prove absence elsewhere. |

### Backend/Data-Layer Understanding Summary

| Finding | Classification | Evidence |
| --- | --- | --- |
| Route order is an auth boundary. `/api/auth`, `/api/line`, and `/api/drive/thumbnail` precede global API auth; most later mounts are protected by index-level auth. | EVIDENCED | Report 03 cites `routes/index.js:34-65`. |
| Some pre-global-auth routes still have controller-level token logic. | EVIDENCED | Report 14 closes `/api/auth/logout` and `/api/line/*` static gaps, citing `controllers/auth.controller.js:48-89` and `controllers/line-leads.controller.js:39-200`. |
| Compatibility aliases exist and are not removable conclusions: `/api/contact-list`, `/api/sales-analysis`, thumbnail alternatives, duplicate auth gates, and dashboard/domain route overlaps. | COMPATIBILITY_CANDIDATE | Report 03 cites `routes/index.js:40`, `routes/index.js:50-60`, `routes/system.routes.js:68-93`, `routes/interaction.routes.js:27-32`. |
| Controller ownership is mixed and can cross filenames. | EVIDENCED | Report 04 cites `routes/calendar.routes.js:4`, `routes/company.routes.js:37`, `controllers/event.controller.js:19`, `controllers/external.controller.js:14`. |
| `services/service-container.js` wires SQL readers/writers plus RAW/Sheets readers/writers and controllers. | EVIDENCED | Reports 05 and 06 cite `services/service-container.js:99-145`, `services/service-container.js:147-319`, `services/service-container.js:323-357`. |
| Contacts retain a RAW-to-CORE bridge; weekly business has SQL-first Sheet fallback reads; product/internal-ops/system paths keep Sheet-backed behavior. | EVIDENCED / DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 05 and 06 cite `services/service-container.js:169-187`, `services/contact-service.js:210-226`, `services/weekly-business-service.js:45-68`, `services/product-service.js:33-170`, `services/internal-ops-service.js:311-689`. |
| `DATA_SOURCES` is defined but no targeted runtime reads outside `config.js` were found. | CLOSED_STATIC with intent UNKNOWN | Report 14 cites `config.js:54-63` and targeted search results. |

### Frontend/SPA Understanding Summary

| Finding | Classification | Evidence |
| --- | --- | --- |
| The dashboard SPA is static-script ordered, not module-bundled in a modern import graph. | EVIDENCED | Reports 07-09 cite `public/dashboard.html:430` and `public/scripts/import-bundle.js:13-79`. |
| `window.CRM_APP` is a distributed global namespace. | EVIDENCED | Report 07 cites `public/scripts/core/constants.js:3-47`, `public/scripts/core/main.js:16`, `public/scripts/core/router.js:214`, `public/scripts/core/layout-manager.js:258`, `public/scripts/core/sync-service.js:44`. |
| Router cache and page refresh behavior depends on `loaded`, `stale`, detail-page special cases, and event-editor special handling. | EVIDENCED | Reports 07, 08, and 14 cite `public/scripts/core/router.js:114-180`, `public/scripts/events/event-editor-standalone.js:46`, `public/scripts/events/event-editor-standalone.js:627`, `public/views/event-editor.html:1`. |
| Write invalidation is split between central wrapper behavior and local module refresh behavior. | EVIDENCED | Report 08 cites `public/scripts/services/api.js:127-152`, `public/scripts/dashboard/dashboard.js:40-43`, and detail/local callers in contacts, announcements, weekly, opportunities, and companies. |
| Several large frontend files mix rendering, API calls, local state, inline handlers, global exports, and style injection. | EVIDENCED | Report 09 cites focus files loaded by `public/scripts/import-bundle.js` and examples in contacts, internal ops, dashboard widgets, event reports, opportunity interactions, and sales components. |
| Hidden navigation is not route absence. | EVIDENCED / UNKNOWN intent | Reports 07 and 14 cite hidden `events` nav at `public/dashboard.html:50`, plus route config/container/module evidence at `public/scripts/core/constants.js:16`, `public/dashboard.html:339`, and `public/scripts/events/events.js:83`. |

### CSS/Common UI Understanding Summary

| Finding | Classification | Evidence |
| --- | --- | --- |
| CSS ownership follows loaded cascade and responsive overrides, not filenames alone. | EVIDENCED | Report 10 cites `public/styles/main.css:5-21`, `public/styles/modules/responsive.css` override locations, and `public/styles/user-profile.css` loading after `main.css`. |
| Queue-mentioned `public/styles/modules/forms.css` and `public/styles/modules/modals.css` do not match current root-level imported files. | EVIDENCED | Report 10 cites actual imports at `public/styles/main.css:9-10` and existence checks for root `public/styles/forms.css` and `public/styles/modals.css`. |
| Shared selectors overlap across static CSS files and responsive rules. | EVIDENCED | Report 10 cites `.data-table`, `.submit-btn`, `.form-group`, `.stats-grid`, `.main-content`, `.sidebar`, `.page-header`, table, pagination, and layout overlaps. |
| JS-injected CSS is part of active UI ownership. | EVIDENCED | Reports 09 and 11 cite injected styles in `public/scripts/services/ui.js`, `public/scripts/core/utils.js`, `public/scripts/core/theme-toggle.js`, `public/scripts/events/event-report-manager.js`, `public/scripts/sales/sales-analysis-components.js`, and company modules. |
| `.notification` and `closePanel()` remain compatibility/runtime questions. | UNKNOWN / DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 11 and 14 cite static notification styles at `public/styles/modals.css:251-274`, `showNotification` mapping at `public/scripts/services/ui.js:413`, and unresolved `closePanel()` reference at `public/scripts/core/utils.js:79`. |

### Docs Authority Summary

| Doc area | Classification | Planning-quality rule |
| --- | --- | --- |
| `docs/crm-current-state-index.md` | ACTIVE_DOC caution | Use as a routing index only; report 02 cites its warning that repo evidence and source governance docs override it. |
| Governance/SOP docs | ACTIVE_DOC caution | Read only when relevant; report 02 cites the necessary-docs-only policy in architecture governance and repo scan boundary docs. |
| Roadmap docs | ROADMAP_DOC | Planning context only; not implementation authorization. |
| Operational reports and audits | REPORT_DOC | Evidence context only; cross-check current source owners. |
| Schema SQL docs | ACTIVE_DOC / reference | Reference current schema posture only; not auto-run migration or frontend direct access authority. |

## LLM Confusion Risks

| Trap | Classification | Evidence basis | Safer future prompt constraint |
| --- | --- | --- | --- |
| Inferring active ownership from filename, age, or comments. | UNKNOWN / EVIDENCED caution | Reports 03-12 repeatedly show runtime ownership comes from route order, DI wiring, bundle order, cascade order, and caller linkage. | Ask for the runtime owner path first, then inspect dependent files. |
| Treating generated snapshots as source. | GENERATED_SNAPSHOT | Reports 01 and 13 classify `repomix-packs/**` as generated snapshots. | Use snapshots only as packed references and verify against source. |
| Treating roadmap/report docs as permission to change behavior. | ROADMAP_DOC / REPORT_DOC | Reports 02, 12, and 13 cite authority limits in roadmap and chart audit docs. | Use docs to choose what to inspect, not to authorize changes. |
| Calling compatibility paths removable. | COMPATIBILITY_CANDIDATE | Reports 03, 05, 06, 08, 12, and 14 identify aliases, duplicate auth gates, legacy config aliases, Sheet/RAW paths, sync-service refresh, and chart wrappers. | Preserve compatibility classification unless runtime evidence and human authorization say otherwise. |
| Assuming SQL replaced Sheets/RAW. | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 05, 06, and 14 show mixed SQL, Sheet, RAW, and fallback paths. | Specify the domain and data path; separate static wiring from live fallback frequency. |
| Assuming frontend modules are isolated by page. | EVIDENCED caution | Reports 07-09 show `CRM_APP`, `pageModules`, dashboard stale flags, inline handlers, and shared renderers across page surfaces. | Scope prompts by route, module, global exports, and cache behavior. |
| Assuming CSS lives only in `public/styles/**`. | EVIDENCED caution | Reports 10 and 11 show static CSS plus injected styles and route-local CSS blocks. | Inspect static CSS, JS injection, generated markup, and route timing together. |
| Assuming chart dependency ownership from package names or one migration record. | EVIDENCED caution | Report 12 shows Highcharts and ECharts both loaded/called in active paths. | Ask for a specific chart surface and include `charting.js`, callers, vendor load order, and docs context. |

## No-Touch / Caution Areas

| Area | Classification | Evidence basis |
| --- | --- | --- |
| `repomix-packs/**` | GENERATED_SNAPSHOT | Reports 01 and 13. |
| `public/assets/vendor/**` and `public/assets/maps/taiwan.json` | VENDOR_ASSET / static asset | Reports 01 and 12. |
| Local environment/credential files | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Report 01 top-level boundary. |
| `routes/index.js` mount order | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 03, 13, and 14. |
| `/api/line/*` auth path | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 03 and 14. |
| Auth aliases, local dev token, duplicate auth gates | COMPATIBILITY_CANDIDATE | Report 03. |
| `services/service-container.js` DI order and returned keys | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 05 and 13. |
| RAW contact bridge, weekly fallback, Sheet-backed product/system/internal-ops paths | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 05, 06, 13, and 14. |
| `services/index.js`, `data/index.js`, `DATA_SOURCES`, legacy config aliases | COMPATIBILITY_CANDIDATE | Reports 05, 06, and 14. |
| `public/scripts/import-bundle.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 07-09 and 13. |
| `window.CRM_APP`, `pageModules`, router loaded/stale flags | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 07, 08, and 13. |
| `public/scripts/services/api.js`, `public/scripts/core/router.js`, `public/scripts/core/sync-service.js`, `public/scripts/dashboard/dashboard.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC / COMPATIBILITY_CANDIDATE | Report 08. |
| Heavy frontend modules and inline handler globals | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Report 09. |
| `public/styles/main.css` import order and shared selectors | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Report 10. |
| Toasts, pagination, modal z-index/body overflow, theme transitions, notification compatibility | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 10, 11, and 14. |
| `public/scripts/services/charting.js`, Highcharts/ECharts callers, event charts, Taiwan map manager | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Reports 12 and 14. |

## Evidence Gaps

| Remaining UNKNOWN | Why it remains UNKNOWN | Best future evidence type |
| --- | --- | --- |
| Live frequency of SQL, Sheet, and view-to-table fallback branches. | Reports 05, 06, 13, and 14 are static; no production traffic/log evidence was collected. | Targeted runtime/log forensic prompt. |
| Runtime browser success for all SPA pages, event-editor, injected CSS order, charts, and maps. | Reports 07-12 and 14 did not execute browser navigation. | Browser navigation/render forensic prompt with screenshots/network traces. |
| Actual role/user visibility of hidden or injected routes such as `events` and admin products navigation. | Static route/module evidence exists, but product intent and role policy were not proven. | Role-based runtime/session forensic prompt. |
| Live Google Sheet IDs, Supabase permissions, and database state. | Reports used source/docs/env-name evidence, not live secrets or DB queries. | Credential-safe environment posture review by the human owner or approved runtime audit. |
| Complete caller matrix for every `authedFetch`, inline handler, route-local injected style, and large-module branch. | Reports intentionally targeted high-risk paths, not exhaustive runtime branch coverage. | Narrow domain-specific caller census, not broad cleanup. |
| Current provider for `closePanel()` and current `.notification` creator. | Targeted source search did not prove a provider, but runtime globals were not inspected. | Browser/global-object forensic prompt. |
| Eager Drive client side-effect purpose in `service-container.js`. | Static evidence shows creation without direct returned `drive`; runtime side effects were not measured. | Targeted DI startup instrumentation review, if approved. |

## Future Prompt Design Rules

| Rule | Evidence basis |
| --- | --- |
| Start every source-oriented prompt by naming the runtime owner path: backend startup, route mount, DI container, frontend bundle, CSS cascade, or chart wrapper. | Reports 03, 05, 07, 08, 10, 12, and 13. |
| Ask for EVIDENCED vs UNKNOWN separation and prohibit treating UNKNOWN as a removal signal. | All reports; especially 13 and 14. |
| For backend/API work, include `app.js`, `routes/index.js`, the target route file, controller pattern, and service-container key path. | Reports 03-05 and 14. |
| For data work, require DI evidence plus service method/fallback evidence; do not infer SQL ownership from SQL filenames. | Reports 05-06 and 14. |
| For frontend work, include `public/dashboard.html`, `public/scripts/import-bundle.js`, `CRM_APP` registration, router/stale behavior, and target page module. | Reports 07-09. |
| For CSS/UI work, include static CSS load order, responsive overrides, JS-injected CSS, generated markup, and route-local style injection. | Reports 10-11. |
| For chart/map work, name the surface and include vendor load order, `charting.js`, active callers, and docs authority limits. | Reports 02 and 12. |
| Treat roadmap/report/schema docs as context requiring source cross-check, not as implementation approval. | Report 02. |
| Use compatibility language for aliases, fallback paths, legacy config fields, local dev token behavior, and residual chart wrappers. | Reports 03, 05, 06, 08, 12, and 14. |

## Future Planning Options

| Option | Purpose | Boundary |
| --- | --- | --- |
| Runtime validation pass for SPA routes, injected CSS order, charts, maps, and event-editor. | Convert browser/runtime UNKNOWNs into observed evidence. | Evidence gathering only; no source modifications. |
| Runtime/log review for SQL, Sheet, RAW, and fallback branch frequency. | Understand which fallback paths are actually exercised. | Evidence gathering only; no compatibility conclusions from absence alone. |
| Auth semantics review for pre-global-auth routes and controller-level checks. | Clarify public/protected/custom-auth language for `/api/auth`, `/api/line`, and thumbnail paths. | Documentation-quality evidence only; no route changes. |
| Domain-specific caller census for selected high-risk modules. | Narrow remaining PARTIAL matrices such as `authedFetch`, inline handlers, or injected styles. | One domain at a time; no broad repo scan unless explicitly authorized. |
| Docs authority refresh prompt. | Recheck whether governance/report/roadmap docs still match source evidence. | Do not treat docs as implementation approval. |

## Recommended Next Phase Options

| Next phase option | Recommended question shape |
| --- | --- |
| Browser/runtime forensic | "For the dashboard SPA, run a browser-only evidence pass for route render success, event-editor behavior, injected style order, chart/map rendering, and console/network failures. Write observations only." |
| Data fallback forensic | "For the data layer, inspect runtime logs or approved instrumentation evidence for SQL, Sheets, RAW, and fallback branch frequency by domain. Do not modify source." |
| Auth boundary forensic | "For API auth semantics, map route middleware plus controller-level token/role checks for pre-global-auth and alias routes, separating public, protected, custom-auth, and UNKNOWN." |
| Frontend caller census | "For one named frontend domain, map every write caller, refresh/stale effect, inline handler, and shared global touched by that workflow." |

## Recommended One Next Forensic Question, if applicable

Which browser-runtime evidence should be collected first to validate the highest remaining UNKNOWNs: route render success, event-editor behavior, injected CSS order, chart/map rendering, and role-visible navigation?
