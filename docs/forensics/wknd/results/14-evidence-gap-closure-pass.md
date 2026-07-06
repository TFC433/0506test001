# 14 Evidence Gap Closure Pass

## Executive Conclusion

EVIDENCED: This pass selected ten high-risk UNKNOWNs from reports 01 through 13 and performed targeted static inspection only. Six gaps are CLOSED_STATIC, three are PARTIAL_STATIC, and one remains STILL_UNKNOWN because it requires live runtime/browser evidence. No source files were modified.

EVIDENCED: The most useful closures are: `/api/line/*` has controller-level LINE token, whitelist, and ownership checks; `/api/auth/logout` has controller-level Bearer-token session extraction despite lacking route-local `verifyToken`; `DATA_SOURCES` is defined but not read outside `config.js` by targeted repo search; `event-editor` is a special router/module path backed by fetched modal markup, not a normal `#page-event-editor` dashboard container.

UNKNOWN: This pass did not execute production traffic, browser navigation, live database checks, or live Google/LINE API calls. Runtime branch frequency, actual role visibility, and live environment values remain UNKNOWN.

## Files Inspected

| File | Why inspected |
| --- | --- |
| `docs/forensics/wknd/results/01-repo-boundary.md` through `docs/forensics/wknd/results/13-cross-domain-llm-trap-review.md` | Prior evidence gaps and dependency inputs for task 14. |
| `routes/auth.routes.js` | Route-local auth middleware for logout/verify endpoints. |
| `controllers/auth.controller.js` | Controller-level logout token/session behavior. |
| `middleware/auth.middleware.js` | Token middleware comparison point for route-local vs controller-local auth. |
| `routes/line-leads.routes.js` | `/api/line/*` route handlers and injected controller dependencies. |
| `controllers/line-leads.controller.js` | LINE token, whitelist, and ownership checks. |
| `services/auth-service.js` | `verifyLineIdToken` service dependency for line-leads controller. |
| `app.js` | Current app service-container entrypoint and static file serving. |
| `services/service-container.js` | Current DI wiring, `DATA_SOURCES` comparison, and Drive client creation. |
| `services/index.js` | Compatibility factory reference check. |
| `config.js` | `IDS`, `DATA_SOURCES`, and legacy env alias definitions. |
| `services/external-service.js` | Drive thumbnail runtime client usage. |
| `controllers/external.controller.js` | External service fallback construction. |
| `public/dashboard.html` | Hidden events nav, page containers, notification area, script loading. |
| `public/scripts/core/router.js` | `event-editor` special route handling. |
| `public/scripts/core/constants.js` | Events page route config. |
| `public/scripts/events/events.js` | Events page module registration. |
| `public/scripts/events/event-editor-standalone.js` | Event editor fetched view and page module registration. |
| `public/views/event-editor.html` | Event editor modal markup loaded by module. |
| `public/scripts/core/utils.js` | `closePanel` call and notification animation style injection. |
| `public/scripts/services/ui.js` | `showNotification` alias to toast helper. |
| `public/styles/modals.css` | Static `.notification` selector ownership. |
| `public/leads-view.html`, `public/scripts/leads-view.js`, `public/styles/leads-view.css` | Standalone leads-view static asset reachability. |
| `routes/opportunity.routes.js`, `controllers/opportunity.controller.js`, `services/opportunity-service.js`, `public/scripts/map-manager.js` | Taiwan map `/api/opportunities/by-county` response shape. |
| `public/scripts/services/charting.js`, `public/scripts/events/event-charts.js`, `public/scripts/dashboard/dashboard_widgets.js`, `public/scripts/sales/sales-analysis-components.js` | Chart library caller boundary. |

## Selected Gap List

| # | Prior UNKNOWN selected | Source report |
| --- | --- | --- |
| 1 | Whether `/api/auth/logout` requires token in controller | `03-backend-route-auth-alias-map.md` |
| 2 | Whether `/api/line/*` has custom auth semantics | `03-backend-route-auth-alias-map.md` |
| 3 | Whether non-app entrypoints still use `services/index.js` | `05-service-container-di-map.md`, `13-cross-domain-llm-trap-review.md` |
| 4 | Whether `config.DATA_SOURCES` values are read by runtime methods | `05-service-container-di-map.md` |
| 5 | Exact Google Sheet env names behind `config.IDS.*` | `06-data-reader-writer-fallback-map.md` |
| 6 | Whether the Drive client created in the container is used downstream | `05-service-container-di-map.md` |
| 7 | `event-editor` route container ownership | `07-spa-bootstrap-router-crmapp-map.md`, `13-cross-domain-llm-trap-review.md` |
| 8 | Hidden `events` route reachability and visibility | `07-spa-bootstrap-router-crmapp-map.md`, `12-charting-map-visualization-boundary.md` |
| 9 | Current `.notification` creator and `closePanel()` owner | `11-js-injected-css-common-ui-map.md` |
| 10 | Runtime success / static response shape for dashboard map API data | `12-charting-map-visualization-boundary.md`, `13-cross-domain-llm-trap-review.md` |

## Evidence Tables

### Gap Closure Table

| # | Status | EVIDENCED findings | UNKNOWN remaining |
| --- | --- | --- | --- |
| 1 | CLOSED_STATIC | `routes/auth.routes.js:29-30` routes `/logout` directly to `authController.logout` with no route-local `verifyToken`. `controllers/auth.controller.js:48-59` closes a session when `_extractSessionIdFromRequest(req)` returns one and always returns `{ success: true }`. `controllers/auth.controller.js:75-89` first uses `req.user.session_id`, then decodes a Bearer token with `ignoreExpiration: true`. | Live client behavior and whether every logout caller sends a Bearer token remain UNKNOWN. |
| 2 | CLOSED_STATIC | `routes/line-leads.routes.js:20-26` injects `contactService`, `authService`, and `systemService` into `LineLeadsController`. `controllers/line-leads.controller.js:39-59` requires a token for GET and calls `authService.verifyLineIdToken` unless using `TEST_LOCAL_TOKEN`. `controllers/line-leads.controller.js:69-74`, `controllers/line-leads.controller.js:134-140`, and `controllers/line-leads.controller.js:184-190` enforce whitelist checks. `controllers/line-leads.controller.js:144-150` and `controllers/line-leads.controller.js:194-200` enforce ownership checks for update/delete. | Actual whitelist values and live LINE verification results remain UNKNOWN. |
| 3 | PARTIAL_STATIC | `app.js:10` imports `./services/service-container`; `app.js:13` leaves `./services` commented out. Targeted `rg` found `services/index.js` references in docs, a packaging script, a comment in `routes/line-leads.routes.js:23`, and the file itself, but no active app import. | External commands, deployment scripts outside the repo, or generated snapshots were not used as runtime proof. |
| 4 | CLOSED_STATIC | `config.js:54-63` defines `DATA_SOURCES`. Targeted repo search found `DATA_SOURCES` only in `config.js`, while current wiring uses concrete classes and `config.IDS.*` at `services/service-container.js:106`, `services/service-container.js:117`, and `services/service-container.js:120-143`. | Whether the declarations express intended future configuration is UNKNOWN; roadmap intent is not runtime evidence. |
| 5 | PARTIAL_STATIC | `config.js:25-46` maps `IDS.CORE`, `IDS.RAW`, `IDS.SYSTEM`, `IDS.AUTH`, `IDS.PRODUCT`, and `IDS.INTERNAL_OPS` to `SPREADSHEET_ID`, `RAW_DATA_SPREADSHEET_ID`, `SYSTEM_SETTING_SPREADSHEET_ID`, `AUTH_SPREADSHEET_ID`, `MARKET_PRODUCT_SHEET_ID`, and `INTERNAL_OPS_SHEET_ID`. `config.js:67-69` also exposes legacy aliases. | Actual live environment values were not read or validated. |
| 6 | PARTIAL_STATIC | `services/service-container.js:99-102` creates `googleClientService`, Sheets, Drive, and Calendar clients. `services/service-container.js:323-357` returns `googleClientService` but not a direct `drive` property. `services/external-service.js:111-116` obtains Drive through `googleClientService.getDriveClient()` for file thumbnail/media retrieval. `services/index.js:114-118` exposes `drive` only in the compatibility factory. | Whether the eager `const drive` created in `service-container.js:101` has a side-effect purpose is UNKNOWN without runtime instrumentation. |
| 7 | CLOSED_STATIC | `public/scripts/core/router.js:157-178` treats `event-editor` as a special page that reloads each time and passes params. `public/scripts/events/event-editor-standalone.js:46` fetches `/views/event-editor.html`; `public/scripts/events/event-editor-standalone.js:627` registers `window.CRM_APP.pageModules['event-editor']`. `public/views/event-editor.html:1` defines `#standalone-event-modal`; no `#page-event-editor` was found in `public/dashboard.html`, whose page containers include `#page-events` at `public/dashboard.html:339`. | Browser runtime success of each event-editor navigation path remains UNKNOWN. |
| 8 | PARTIAL_STATIC | `public/dashboard.html:50` contains a nav link for `data-page="events"` with `style="display: none;"`. `public/dashboard.html:339` contains `#page-events`. `public/scripts/core/constants.js:16` defines the `events` page config. `public/scripts/events/events.js:83` registers `window.CRM_APP.pageModules.events`. | Whether the hidden nav is intentionally feature-gated, role-gated, or manually hidden for another reason remains UNKNOWN. |
| 9 | PARTIAL_STATIC | `public/scripts/services/ui.js:413` maps `window.showNotification = showToast`, and many callers use `showNotification`. `public/dashboard.html:428` and `public/styles/modals.css:251-274` still define a notification area and `.notification` styles. `public/scripts/core/utils.js:194-207` injects `notification-animation-styles` for `.notification`. `public/scripts/core/utils.js:79` calls `closePanel()`, but targeted search found no current `function closePanel` or `window.closePanel` definition in `public/scripts`. | A live/global `closePanel` provider from runtime-loaded or external scripts remains UNKNOWN. Current `.notification` element creation remains UNKNOWN; current calls appear routed to toast. |
| 10 | CLOSED_STATIC | `routes/opportunity.routes.js:25-27` maps `GET /api/opportunities/by-county` to the controller. `controllers/opportunity.controller.js:41-44` returns the service result directly with `res.json(result)`. `services/opportunity-service.js:992-1024` returns an array of `{ county, count }` after grouping active opportunities by company county. `public/scripts/map-manager.js:177-185` calls the API and expects an array with `item.county` and `item.count`. | Live API success, production data quality, and rendered map success remain UNKNOWN. |

### Targeted Search Ledger

| Target | Search/result summary | Classification |
| --- | --- | --- |
| `DATA_SOURCES` usage | Targeted `rg 'DATA_SOURCES'` outside generated/vendor found only `config.js:7` and `config.js:54`. | CLOSED_STATIC for repo runtime reads; UNKNOWN for intent. |
| `services/index.js` usage | Targeted `rg` found active app import of `services/service-container` at `app.js:10`; `./services` is commented at `app.js:13`; other hits are docs, packaging script, route comment, and `services/index.js`. | PARTIAL_STATIC. |
| Chart library boundary | Targeted search confirmed active ECharts callers in dashboard, sales, and map files; active Highcharts wrapper/callers remain in `public/scripts/services/charting.js` and `public/scripts/events/event-charts.js`. | CLOSED_STATIC for caller boundary; no removal inference. |
| Leads-view reachability | `app.js:27` serves `public` statically. `public/leads-view.html:18` loads `styles/leads-view.css`; `public/leads-view.html:137` loads `scripts/leads-view.js`. | CLOSED_STATIC for static-file reachability; UNKNOWN for user navigation frequency. |

## LLM Confusion Risks

| Risk | Why it remains risky | Safer constraint |
| --- | --- | --- |
| Treating mount order as the whole auth story | `/api/auth/logout` and `/api/line/*` lack route-local global auth but contain controller-level token logic. | Inspect both route middleware and controller body before labeling public/protected semantics. |
| Treating `DATA_SOURCES` as runtime switching | `DATA_SOURCES` is defined, but targeted search found no reads outside `config.js`; DI wiring chooses concrete classes. | Use `services/service-container.js` as runtime wiring evidence before discussing data path behavior. |
| Treating `event-editor` like a normal page container | Router and module evidence show a special route that fetches modal markup, not a dashboard container. | Prompt for event-editor changes must include router special cases and `public/views/event-editor.html`. |
| Treating hidden nav as unavailable route | `events` has hidden nav, a page container, constants config, and module registration. | Separate nav visibility from route/module existence. |
| Treating legacy notification CSS as removable | `.notification` CSS and animation injection remain, while current `showNotification` maps to toast. | Keep this as compatibility/runtime evidence until live DOM creator evidence is proven. |
| Treating map API shape as unproven source behavior | Static route/controller/service/client evidence aligns on array `{ county, count }`. | Runtime success still requires live API/browser trace, but static response shape is now evidenced. |

## No-Touch / Caution Areas

| Area | Classification | Evidence |
| --- | --- | --- |
| `/api/line/*` auth path | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Controller-level LINE verification, whitelist, and ownership gates at `controllers/line-leads.controller.js:39-74`, `controllers/line-leads.controller.js:130-150`, and `controllers/line-leads.controller.js:180-200`. |
| `services/index.js` | COMPATIBILITY_CANDIDATE | Active app uses `services/service-container.js` at `app.js:10`, but docs/scripts/comments still reference `services/index.js`, and the compatibility factory exposes `drive` at `services/index.js:114-118`. |
| `DATA_SOURCES` and legacy config aliases | COMPATIBILITY_CANDIDATE | `config.js:54-63` defines `DATA_SOURCES`; `config.js:67-69` defines legacy aliases. |
| `event-editor` route/view | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Router special cases at `public/scripts/core/router.js:157-178`; fetched view at `public/scripts/events/event-editor-standalone.js:46`; module registration at `public/scripts/events/event-editor-standalone.js:627`. |
| Notification styles and `closePanel` behavior | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Static `.notification` styles at `public/styles/modals.css:251-274`; animation injection at `public/scripts/core/utils.js:194-207`; unresolved `closePanel()` call at `public/scripts/core/utils.js:79`. |
| Highcharts/ECharts split | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | `public/scripts/events/event-charts.js:38-43` still checks Highcharts; `public/scripts/services/charting.js:194-215` creates Highcharts charts; ECharts callers remain elsewhere. |

## Evidence Gaps

### Closed Or Narrowed In This Pass

| Gap | Result |
| --- | --- |
| `/api/auth/logout` controller token behavior | CLOSED_STATIC. Route-local middleware absent; controller session extraction from `req.user` or Bearer token is evidenced. |
| `/api/line/*` custom auth semantics | CLOSED_STATIC. Controller-level LINE verification, whitelist, and ownership gates are evidenced. |
| `DATA_SOURCES` runtime reads | CLOSED_STATIC for targeted repo search. No reads found outside `config.js`. |
| `event-editor` container ownership | CLOSED_STATIC. Special route plus fetched modal markup; no dashboard `#page-event-editor` container evidenced. |
| Map API static response shape | CLOSED_STATIC. Route/controller/service/client shape aligns on array `{ county, count }`. |
| Leads-view static reachability | CLOSED_STATIC. Public static serving plus standalone HTML/CSS/JS path evidenced. |

### Remaining High-Risk UNKNOWNs

| UNKNOWN | Why still unknown |
| --- | --- |
| Live frequency of SQL/Sheets fallback branches | Requires logs, traffic, or instrumentation; this task used static inspection only. |
| Runtime browser success for all SPA pages, injected CSS order, charts, and maps | Requires browser execution/navigation, which task 14 did not perform. |
| Actual role/user visibility of the hidden `events` nav | Static source proves hidden nav plus route/module existence, not product intent or role policy. |
| Live Google Sheet IDs and DB/Supabase permission posture | This pass inspected env variable names only, not live secrets or database state. |
| `closePanel()` runtime provider | Targeted source search did not find a definition, but live/global provider evidence was not collected. |
| Eager Drive client side-effect purpose in `service-container.js` | Static evidence shows creation without returned direct `drive`; runtime side effects were not measured. |

## Recommended One Next Forensic Question, if applicable

For task 15 synthesis: Which remaining UNKNOWNs should be framed as future runtime-validation prompts rather than source cleanup prompts, especially live fallback frequency, browser route/render success, hidden route visibility, and external environment posture?
