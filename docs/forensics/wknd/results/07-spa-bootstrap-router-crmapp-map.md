# 07 SPA Bootstrap Router CRM_APP Map

## Executive Conclusion

EVIDENCED: The active dashboard SPA entrypoint is `public/dashboard.html`, which blocks unauthenticated users by checking both `crm-token` and `crmToken`, then loads `public/scripts/import-bundle.js?v=1.0.4` as the bundled script entrypoint (`public/dashboard.html:26`, `public/dashboard.html:430`). `public/login.html` is a separate login entrypoint that loads `public/scripts/core/login.js` directly after API/UI/core helpers (`public/login.html:94`, `public/login.html:98`).

EVIDENCED: SPA routing is hash and DOM based. `Router.init()` listens for `hashchange` and delegated `[data-page]` clicks, while `Router.navigateTo()` writes `document.body.dataset.activePage`, pushes hash state, hides all `.page-view` nodes, and shows `#page-${pageName}` or maps `weekly-detail` onto `#page-weekly-business` (`public/scripts/core/router.js:24`, `public/scripts/core/router.js:28`, `public/scripts/core/router.js:100`, `public/scripts/core/router.js:109`, `public/scripts/core/router.js:136`, `public/scripts/core/router.js:137`, `public/scripts/core/router.js:140`).

EVIDENCED: `window.CRM_APP` is a shared global namespace, not a single owner. It is initialized in multiple core files, configured in `constants.js`, mutated by `main.js`, `router.js`, `layout-manager.js`, `sync-service.js`, and page modules (`public/scripts/core/constants.js:3`, `public/scripts/core/constants.js:6`, `public/scripts/core/main.js:16`, `public/scripts/core/router.js:214`, `public/scripts/core/layout-manager.js:258`, `public/scripts/core/sync-service.js:44`).

UNKNOWN: This pass did not execute the browser runtime, so it did not prove every page module renders successfully after navigation. The evidence is static source evidence only.

## Files Inspected

| Classification | File | Evidence |
| --- | --- | --- |
| ACTIVE_CONFIRMED | `public/dashboard.html` | Dashboard entrypoint loads CSS, vendor chart scripts, auth guard, page containers, and `scripts/import-bundle.js?v=1.0.4` (`public/dashboard.html:10`, `public/dashboard.html:13`, `public/dashboard.html:26`, `public/dashboard.html:174`, `public/dashboard.html:430`). |
| ACTIVE_CONFIRMED | `public/login.html` | Login entrypoint contains `#login-form` and loads `core/login.js` (`public/login.html:24`, `public/login.html:98`). |
| ACTIVE_CONFIRMED | `public/scripts/import-bundle.js` | Defines ordered script list and writes each script with `document.write` (`public/scripts/import-bundle.js:14`, `public/scripts/import-bundle.js:78`, `public/scripts/import-bundle.js:79`). |
| ACTIVE_CONFIRMED | `public/scripts/core/constants.js` | Defines `window.CRM_APP.pageConfig`, shared system config fields, and empty `pageModules` (`public/scripts/core/constants.js:6`, `public/scripts/core/constants.js:44`, `public/scripts/core/constants.js:47`). |
| ACTIVE_CONFIRMED | `public/scripts/core/main.js` | Defines `CRM_APP.init`, resource loading, config loading, initial route handling, stale marking, and DOMContentLoaded startup (`public/scripts/core/main.js:16`, `public/scripts/core/main.js:19`, `public/scripts/core/main.js:29`, `public/scripts/core/main.js:118`, `public/scripts/core/main.js:229`, `public/scripts/core/main.js:240`). |
| ACTIVE_CONFIRMED | `public/scripts/core/router.js` | Defines delegated navigation, hash handling, view switching, page module loading, loaded/stale cache flags, and exported `CRM_APP.navigateTo` (`public/scripts/core/router.js:24`, `public/scripts/core/router.js:28`, `public/scripts/core/router.js:91`, `public/scripts/core/router.js:155`, `public/scripts/core/router.js:159`, `public/scripts/core/router.js:214`). |
| ACTIVE_CONFIRMED | `public/scripts/core/layout-manager.js` | Reads and writes user/session role state on `CRM_APP`, injects admin navigation, and exports dropdown/role helpers (`public/scripts/core/layout-manager.js:84`, `public/scripts/core/layout-manager.js:109`, `public/scripts/core/layout-manager.js:124`, `public/scripts/core/layout-manager.js:204`, `public/scripts/core/layout-manager.js:258`, `public/scripts/core/layout-manager.js:259`). |

## Evidence Tables

### Frontend Entrypoint Table

| Entrypoint | Classification | Evidence | Notes |
| --- | --- | --- | --- |
| `public/dashboard.html` | ACTIVE_CONFIRMED | Auth guard checks `crm-token` and `crmToken`, redirecting to `/login.html`; page body has `data-active-page="dashboard"`; bundled script is `scripts/import-bundle.js?v=1.0.4` (`public/dashboard.html:23`, `public/dashboard.html:26`, `public/dashboard.html:430`). | Main SPA shell. |
| `public/login.html` | ACTIVE_CONFIRMED | Contains `#login-form`; loads `theme-toggle.js`, `api.js`, `ui.js`, `utils.js`, and `core/login.js` (`public/login.html:24`, `public/login.html:94`, `public/login.html:98`). | Separate login page, not routed by SPA router in this pass. |
| `public/scripts/import-bundle.js` | ACTIVE_CONFIRMED | Loads core scripts before feature scripts, including constants, layout manager, sync service, router, and main (`public/scripts/import-bundle.js:21`, `public/scripts/import-bundle.js:25`). | Script ordering is an active dependency. |

### Bootstrap Sequence

| Step | EVIDENCED behavior | Evidence |
| --- | --- | --- |
| 1 | Dashboard HTML loads styles, chart vendors, and deferred html2pdf before the app bundle. | `public/dashboard.html:10`, `public/dashboard.html:13`, `public/dashboard.html:19`, `public/dashboard.html:21`, `public/dashboard.html:430` |
| 2 | `import-bundle.js` writes scripts in array order. | `public/scripts/import-bundle.js:14`, `public/scripts/import-bundle.js:78`, `public/scripts/import-bundle.js:79` |
| 3 | `constants.js` creates `pageConfig` and empty `pageModules`. | `public/scripts/core/constants.js:6`, `public/scripts/core/constants.js:47` |
| 4 | `main.js` waits for `DOMContentLoaded`, guards duplicate initialization with `window.CRM_APP_INITIALIZED`, registers fallback modules for weekly, sales, and internal ops when globals exist, then calls `CRM_APP.init()`. | `public/scripts/core/main.js:229`, `public/scripts/core/main.js:231`, `public/scripts/core/main.js:236`, `public/scripts/core/main.js:240` |
| 5 | `CRM_APP.init()` loads modal/form resources, loads config, initializes layout, initializes router, then handles the initial hash route. | `public/scripts/core/main.js:19`, `public/scripts/core/main.js:20`, `public/scripts/core/main.js:21`, `public/scripts/core/main.js:23`, `public/scripts/core/main.js:29` |
| 6 | Initial hash routing uses `window.location.hash`; valid `pageConfig` keys route directly, otherwise dashboard becomes default and hash is replaced with `#dashboard`. | `public/scripts/core/main.js:51`, `public/scripts/core/main.js:55`, `public/scripts/core/main.js:58`, `public/scripts/core/main.js:62` |

### Page ID, Route, Module Map

| Route key | DOM container | Visible nav or trigger | Module registration evidence | Classification |
| --- | --- | --- | --- | --- |
| `dashboard` | `#page-dashboard` (`public/dashboard.html:175`) | Logo/nav/header/stat links (`public/dashboard.html:34`, `public/dashboard.html:43`, `public/dashboard.html:110`) | Special case calls `window.dashboardManager.refresh()` when not loaded or stale (`public/scripts/core/router.js:148`, `public/scripts/core/router.js:149`). | ACTIVE_CONFIRMED |
| `contacts` | `#page-contacts` (`public/dashboard.html:331`) | Nav/stat links (`public/dashboard.html:44`, `public/dashboard.html:184`) | `contacts.js` registers `window.CRM_APP.pageModules.contacts = loadContacts` (`public/scripts/contacts/contacts.js:1711`, `public/scripts/contacts/contacts.js:1712`). | ACTIVE_CONFIRMED |
| `opportunities` | `#page-opportunities` (`public/dashboard.html:332`) | Nav/stat links (`public/dashboard.html:45`, `public/dashboard.html:195`) | `opportunities.js` registers `window.CRM_APP.pageModules.opportunities = loadOpportunities` (`public/scripts/opportunities/opportunities.js:538`, `public/scripts/opportunities/opportunities.js:539`). | ACTIVE_CONFIRMED |
| `companies` | `#page-companies` (`public/dashboard.html:336`) | Nav/stat links (`public/dashboard.html:46`, `public/dashboard.html:228`, `public/dashboard.html:239`) | `company-list.js` registers `window.CRM_APP.pageModules.companies = loadCompaniesListPage` (`public/scripts/companies/company-list.js:475`, `public/scripts/companies/company-list.js:476`). | ACTIVE_CONFIRMED |
| `weekly-business` | `#page-weekly-business` (`public/dashboard.html:338`) | Nav link (`public/dashboard.html:47`) | `weekly-business.js` and `main.js` register `weekly-business` (`public/scripts/weekly/weekly-business.js:693`, `public/scripts/core/main.js:231`). | ACTIVE_CONFIRMED |
| `weekly-detail` | Reuses `#page-weekly-business` (`public/scripts/core/router.js:136`) | Programmatic navigation found in weekly module (`public/scripts/weekly/weekly-business.js:51`, `public/scripts/weekly/weekly-business.js:578`) | `weekly-business.js` and `main.js` register `weekly-detail` (`public/scripts/weekly/weekly-business.js:694`, `public/scripts/core/main.js:232`). | ACTIVE_CONFIRMED |
| `events` | `#page-events` (`public/dashboard.html:339`) | Hidden nav item (`public/dashboard.html:50`) | `events.js` registers `window.CRM_APP.pageModules.events = loadEventLogsPage` (`public/scripts/events/events.js:20`, `public/scripts/events/events.js:83`). | POSSIBLY_ACTIVE |
| `interactions` | `#page-interactions` (`public/dashboard.html:337`) | Nav link (`public/dashboard.html:51`) | `interactions.js` registers `window.CRM_APP.pageModules.interactions = loadAllInteractionsPage` (`public/scripts/interactions.js:1093`, `public/scripts/interactions.js:1201`). | ACTIVE_CONFIRMED |
| `sales-analysis` | `#page-sales-analysis` (`public/dashboard.html:333`) | Nav/stat links (`public/dashboard.html:53`, `public/dashboard.html:217`) | `sales-analysis.js` and `main.js` register `sales-analysis` (`public/scripts/sales/sales-analysis.js:87`, `public/scripts/sales/sales-analysis.js:427`, `public/scripts/core/main.js:233`). | ACTIVE_CONFIRMED |
| `announcements` | `#page-announcements` (`public/dashboard.html:347`) | Nav link (`public/dashboard.html:64`) | `announcements.js` registers `window.CRM_APP.pageModules.announcements = loadAnnouncementsPage` (`public/scripts/announcements.js:10`, `public/scripts/announcements.js:181`). | ACTIVE_CONFIRMED |
| `internal-ops` | `#page-internal-ops` (`public/dashboard.html:351`) | Nav link and subscription marquee (`public/dashboard.html:66`, `public/dashboard.html:100`) | `internal-ops.js` exposes `window.loadInternalOpsPage`; `main.js` registers it at startup if present (`public/scripts/internal-ops/internal-ops.js:54`, `public/scripts/core/main.js:236`). | ACTIVE_CONFIRMED |
| `products` | `#page-products` (`public/dashboard.html:349`) | Admin-only injected nav uses `CRM_APP.navigateTo('products')` (`public/scripts/core/layout-manager.js:204`) | `products.js` registers `window.CRM_APP.pageModules['products'] = () => ProductManager.init()` (`public/scripts/products/products.js:590`). | POSSIBLY_ACTIVE |
| `company-details` | `#page-company-details` (`public/dashboard.html:344`) | Programmatic detail navigation from company files (`public/scripts/companies/company-list.js:417`, `public/scripts/companies/company-details-events.js:267`) | `companies.js` registers `company-details` (`public/scripts/companies/companies.js:16`, `public/scripts/companies/companies.js:116`). | ACTIVE_CONFIRMED |
| `opportunity-details` | `#page-opportunity-details` (`public/dashboard.html:345`) | Programmatic detail navigation from dashboard/components/internal ops (`public/scripts/dashboard/dashboard_kanban.js:272`, `public/scripts/components/chip-wall.js:404`, `public/scripts/internal-ops/internal-ops-dev-projects.js:1603`) | `opportunity-details.js` registers `opportunity-details` (`public/scripts/opportunities/opportunity-details.js:98`, `public/scripts/opportunities/opportunity-details.js:230`). | ACTIVE_CONFIRMED |
| `event-editor` | UNKNOWN: no `#page-event-editor` container found in dashboard page in this pass. | Router has explicit `event-editor` special cases (`public/scripts/core/router.js:157`, `public/scripts/core/router.js:170`, `public/scripts/core/router.js:178`). | `event-editor-standalone.js` registers `window.CRM_APP.pageModules['event-editor']` and fetches `/views/event-editor.html` (`public/scripts/events/event-editor-standalone.js:46`, `public/scripts/events/event-editor-standalone.js:627`). | UNKNOWN |

### `CRM_APP` Mutation Table

| Mutated member | Writer | Evidence | Classification |
| --- | --- | --- | --- |
| `pageConfig` | `constants.js` | Route keys defined in object literal (`public/scripts/core/constants.js:6`, `public/scripts/core/constants.js:24`). | ACTIVE_CONFIRMED |
| `systemConfig`, `currentUser`, `formTemplates`, `pageModules` | `constants.js` | Initial shared fields (`public/scripts/core/constants.js:44`, `public/scripts/core/constants.js:47`). | ACTIVE_CONFIRMED |
| `init`, `loadConfig`, `handleInitialRoute`, `loadResources`, `markStale` | `main.js` | Methods assigned onto `CRM_APP` (`public/scripts/core/main.js:16`, `public/scripts/core/main.js:39`, `public/scripts/core/main.js:51`, `public/scripts/core/main.js:66`, `public/scripts/core/main.js:118`). | ACTIVE_CONFIRMED |
| `pageConfig[page].stale` | `main.js` | `markStale()` sets `stale = true` (`public/scripts/core/main.js:118`, `public/scripts/core/main.js:124`). | ACTIVE_CONFIRMED |
| `navigateTo` | `router.js` | Router bind exported as `window.CRM_APP.navigateTo` (`public/scripts/core/router.js:214`). | ACTIVE_CONFIRMED |
| `pageConfig[page].loaded`, `pageConfig[page].stale` | `router.js` | Dashboard and module routes set loaded true and stale false after load (`public/scripts/core/router.js:149`, `public/scripts/core/router.js:151`, `public/scripts/core/router.js:179`, `public/scripts/core/router.js:180`). | ACTIVE_CONFIRMED |
| `ROLE_DEFINITIONS`, `currentUserRole`, `currentUser`, `updateAllDropdowns`, `refreshRoleDisplay` | `layout-manager.js` | Role and helper exports (`public/scripts/core/layout-manager.js:109`, `public/scripts/core/layout-manager.js:124`, `public/scripts/core/layout-manager.js:184`, `public/scripts/core/layout-manager.js:258`, `public/scripts/core/layout-manager.js:259`). | ACTIVE_CONFIRMED |
| `refreshCurrentView` | `sync-service.js` | Exported as `window.CRM_APP.refreshCurrentView` (`public/scripts/core/sync-service.js:44`). | ACTIVE_CONFIRMED |
| `pageModules.*` | Page modules and `main.js` | Multiple feature files register route loaders (`public/scripts/contacts/contacts.js:1712`, `public/scripts/opportunities/opportunities.js:539`, `public/scripts/weekly/weekly-business.js:693`, `public/scripts/core/main.js:231`). | ACTIVE_CONFIRMED |
| `companyList` | Detail-related modules | Company cache is read/written in opportunity detail code (`public/scripts/opportunities/opportunity-details-events.js:142`, `public/scripts/opportunities/details/opportunity-details-components.js:276`). | POSSIBLY_ACTIVE |

### Route/Page Ownership Risk Map

| Risk area | Evidence | Classification |
| --- | --- | --- |
| Route key and DOM container can diverge. | `weekly-detail` is in `pageConfig` but routes to `#page-weekly-business`, not `#page-weekly-detail` (`public/scripts/core/constants.js:15`, `public/scripts/core/router.js:136`). | EVIDENCED |
| Module registration is distributed, not centralized. | `pageModules` starts empty in constants, then is assigned in many modules (`public/scripts/core/constants.js:47`, `public/scripts/contacts/contacts.js:1712`, `public/scripts/opportunities/opportunities.js:539`, `public/scripts/events/events.js:83`, `public/scripts/weekly/weekly-business.js:693`). | EVIDENCED |
| Script order affects whether module globals exist before `DOMContentLoaded` fallback registration. | `main.js` is loaded before many feature scripts, but its DOMContentLoaded callback registers globals later if they exist (`public/scripts/import-bundle.js:25`, `public/scripts/import-bundle.js:54`, `public/scripts/core/main.js:229`, `public/scripts/core/main.js:231`). | EVIDENCED |
| Hidden nav does not mean inactive. | `events` nav item is `style="display: none"`, but `pageConfig` and `events.js` registration exist (`public/dashboard.html:50`, `public/scripts/core/constants.js:16`, `public/scripts/events/events.js:83`). | EVIDENCED |
| Cache state is part of routing behavior. | `Router.navigateTo()` uses `loaded` and `stale`; `api.js` marks affected pages stale after write operations (`public/scripts/core/router.js:159`, `public/scripts/services/api.js:78`, `public/scripts/services/api.js:133`, `public/scripts/services/api.js:148`). | EVIDENCED |
| `data-page` triggers are not the only navigation path. | Inline/programmatic `CRM_APP.navigateTo()` appears in dashboard marquee, layout admin nav, weekly, dashboard kanban, chip wall, and internal ops (`public/dashboard.html:100`, `public/scripts/core/layout-manager.js:204`, `public/scripts/weekly/weekly-business.js:51`, `public/scripts/dashboard/dashboard_kanban.js:272`, `public/scripts/components/chip-wall.js:404`, `public/scripts/internal-ops/internal-ops-dev-projects.js:1603`). | EVIDENCED |

## LLM Confusion Risks

| Risk | Why it can mislead | Evidence |
| --- | --- | --- |
| Treating `constants.js` as full route ownership. | It declares route metadata, but actual route loaders are registered elsewhere. | `public/scripts/core/constants.js:6`, `public/scripts/core/constants.js:47`, `public/scripts/contacts/contacts.js:1712`, `public/scripts/weekly/weekly-business.js:693` |
| Treating visible nav as the route list. | Some routes are detail-only, admin-injected, hidden, or programmatic. | `public/dashboard.html:50`, `public/scripts/core/layout-manager.js:204`, `public/scripts/core/constants.js:15`, `public/scripts/opportunities/opportunity-details.js:230` |
| Assuming `page-${route}` always exists. | `weekly-detail` intentionally reuses `page-weekly-business`; `event-editor` has router exceptions but no dashboard container was confirmed. | `public/scripts/core/router.js:136`, `public/scripts/events/event-editor-standalone.js:46`, `public/scripts/events/event-editor-standalone.js:627` |
| Assuming `CRM_APP` has one owner. | Shared namespace is mutated by core, layout, router, sync, and feature modules. | `public/scripts/core/constants.js:44`, `public/scripts/core/main.js:118`, `public/scripts/core/router.js:214`, `public/scripts/core/layout-manager.js:258`, `public/scripts/core/sync-service.js:44` |
| Ignoring stale/loaded flags when judging route behavior. | Reload behavior depends on flags changed by router, dashboard code, sync service, and API writes. | `public/scripts/core/router.js:159`, `public/scripts/dashboard/dashboard.js:206`, `public/scripts/core/sync-service.js:19`, `public/scripts/services/api.js:148` |

## No-Touch / Caution Areas

| Area | Caution | Evidence |
| --- | --- | --- |
| `public/scripts/import-bundle.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC: script order is runtime behavior, not just a list. | Core files load before feature modules; document writes preserve order (`public/scripts/import-bundle.js:21`, `public/scripts/import-bundle.js:25`, `public/scripts/import-bundle.js:78`, `public/scripts/import-bundle.js:79`). |
| `window.CRM_APP.pageModules` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC: registrations are distributed and some are duplicated as fallbacks. | Constants initializes empty object; modules and main register entries (`public/scripts/core/constants.js:47`, `public/scripts/core/main.js:231`, `public/scripts/weekly/weekly-business.js:693`, `public/scripts/sales/sales-analysis.js:427`). |
| Detail route handling | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC: detail routes are always load-on-enter and may map to shared containers. | Router uses `pageName.includes('-details') || pageName === 'weekly-detail'`; `weekly-detail` maps to `page-weekly-business` (`public/scripts/core/router.js:115`, `public/scripts/core/router.js:136`, `public/scripts/core/router.js:159`). |
| Auth token compatibility | COMPATIBILITY_CANDIDATE: both `crm-token` and `crmToken` are used. | Dashboard guard checks both; login normalizes both keys (`public/dashboard.html:26`, `public/scripts/core/login.js:41`, `public/scripts/core/login.js:44`, `public/scripts/core/login.js:115`, `public/scripts/core/login.js:117`). |
| Hidden/admin routes | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC: hidden or injected navigation may still be active. | Hidden `events` link exists; products nav is injected for admin-level roles (`public/dashboard.html:50`, `public/scripts/core/layout-manager.js:204`). |

## Evidence Gaps

| Gap | Status | Evidence / reason |
| --- | --- | --- |
| Runtime render success for each route | UNKNOWN | This static pass did not run a browser or execute navigation. |
| `event-editor` route container ownership | UNKNOWN | Router and module registration exist, and module fetches `/views/event-editor.html`; no `#page-event-editor` container was confirmed in `public/dashboard.html` (`public/scripts/core/router.js:157`, `public/scripts/events/event-editor-standalone.js:46`, `public/scripts/events/event-editor-standalone.js:627`). |
| Whether hidden `events` route is intentionally hidden or role/feature gated elsewhere | UNKNOWN | The nav item is hidden but route config and loader exist (`public/dashboard.html:50`, `public/scripts/core/constants.js:16`, `public/scripts/events/events.js:83`). |
| Complete list of all programmatic `CRM_APP.navigateTo()` callers | PARTIAL | Targeted examples were inspected; a full caller census belongs to a later API/cache or heavy-module pass, not this bootstrap-focused task. |
| Whether `companyList` global cache is authoritative | UNKNOWN | Writes were observed in opportunity detail paths, but ownership was not deeply inspected in this task (`public/scripts/opportunities/opportunity-details-events.js:142`, `public/scripts/opportunities/details/opportunity-details-components.js:276`). |

## Recommended One Next Forensic Question

Which frontend write flows call `authedFetch`, which pages they mark stale, and which route reloads are intentionally forced versus cached? This follows from the evidenced router/cache boundary in `public/scripts/core/router.js:159`, `public/scripts/core/main.js:118`, and `public/scripts/services/api.js:148` and aligns with the next queued task.