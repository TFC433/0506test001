# 08 Frontend API Stale Cache Map

Run time: 2026-07-04 10:55 +08:00

## Executive Conclusion

EVIDENCED: the active dashboard frontend loads `public/scripts/import-bundle.js` from `public/dashboard.html`, and that bundle loads `public/scripts/services/api.js`, `public/scripts/core/constants.js`, `public/scripts/core/sync-service.js`, `public/scripts/core/router.js`, `public/scripts/core/main.js`, page modules, and `public/scripts/dashboard/dashboard.js` in a single ordered script list (`public/dashboard.html:430`, `public/scripts/import-bundle.js:13-57`).

EVIDENCED: the central frontend API wrapper is `authedFetch` in `public/scripts/services/api.js`. It queues requests, rate-limits them, retries `429`, attaches the `crm-token` authorization header, handles `401/403` by clearing auth storage and redirecting to login, parses JSON, displays success/error notifications, and marks SPA pages stale after successful `POST`, `PUT`, or `DELETE` unless `options.skipRefresh` is set (`public/scripts/services/api.js:31-35`, `public/scripts/services/api.js:74-78`, `public/scripts/services/api.js:84-92`, `public/scripts/services/api.js:96-107`, `public/scripts/services/api.js:127-152`, `public/scripts/services/api.js:157-160`).

EVIDENCED: stale invalidation has two overlapping surfaces. The general `CRM_APP.markStale(pageNames)` sets `pageConfig[page].stale = true` (`public/scripts/core/main.js:118-125`), while `dashboardManager.markStale()` sets `pageConfig.dashboard.loaded = false` (`public/scripts/dashboard/dashboard.js:40-43`). Many mutation callers still call `dashboardManager.markStale()` directly, while the API wrapper calls `CRM_APP.markStale()` for URL-based affected pages (`public/scripts/services/api.js:133-148`, `public/scripts/announcements.js:139-160`, `public/scripts/contacts/contacts.js:1528-1683`, `public/scripts/opportunities/details/opportunity-interactions.js:1179-3001`).

EVIDENCED: router refresh depends on page config flags. Dashboard reloads when `!config.loaded || config.stale`, then clears both flags; non-detail pages reload when they have a module and are detail/event-editor/unloaded/stale, then non-detail non-event-editor pages set `loaded = true` and `stale = false` after loading (`public/scripts/core/router.js:148-152`, `public/scripts/core/router.js:158-180`). Detail pages are intentionally reloaded on navigation rather than cached by the same flag rule (`public/scripts/core/router.js:114-124`, `public/scripts/core/router.js:158-166`).

UNKNOWN: this pass did not execute the browser runtime, so it does not prove which branch fires for each user workflow. The report is source-evidence only.

## Files Inspected

| File | Inspection focus | Classification |
| --- | --- | --- |
| `public/dashboard.html` | Active dashboard shell and import bundle reference | ACTIVE_CONFIRMED |
| `public/scripts/import-bundle.js` | Runtime script order and loaded frontend modules | ACTIVE_CONFIRMED |
| `public/scripts/services/api.js` | `authedFetch`, request queue, auth, write invalidation | ACTIVE_CONFIRMED |
| `public/scripts/core/constants.js` | `pageConfig` and `pageModules` setup | ACTIVE_CONFIRMED |
| `public/scripts/core/main.js` | bootstrap, `loadConfig`, `CRM_APP.markStale`, module registration | ACTIVE_CONFIRMED |
| `public/scripts/core/router.js` | stale/load flag refresh behavior | ACTIVE_CONFIRMED |
| `public/scripts/core/sync-service.js` | fallback/current-view refresh behavior | COMPATIBILITY_CANDIDATE |
| `public/scripts/dashboard/dashboard.js` | dashboard refresh, dashboard stale flag, force refresh | ACTIVE_CONFIRMED |
| `public/scripts/dashboard/dashboard_kanban.js` | dashboard refresh callback context | POSSIBLY_ACTIVE |
| `public/scripts/contacts/contacts.js` | local contact refetches, `skipRefresh`, dashboard stale calls | ACTIVE_CONFIRMED |
| `public/scripts/companies/company-list.js` | company list mutations and local reloads | ACTIVE_CONFIRMED |
| `public/scripts/companies/company-details-events.js` | detail-page `skipRefresh`, local reload, reload fallback | ACTIVE_CONFIRMED |
| `public/scripts/events/event-wizard.js` | event create `skipRefresh`, dashboard stale, `refreshCurrentView` | ACTIVE_CONFIRMED |
| `public/scripts/events/event-editor-standalone.js` | event save/delete stale and current-view refresh | ACTIVE_CONFIRMED |
| `public/scripts/events/event-list.js` | event delete local list reload | ACTIVE_CONFIRMED |
| `public/scripts/opportunities/opportunity-details.js` | opportunity detail loader registration | ACTIVE_CONFIRMED |
| `public/scripts/opportunities/opportunity-details-events.js` | detail save with `skipRefresh`, detail reload, dashboard stale | ACTIVE_CONFIRMED |
| `public/scripts/opportunities/details/opportunity-associated-contacts.js` | relationship mutations and detail reloads | ACTIVE_CONFIRMED |
| `public/scripts/opportunities/details/opportunity-interactions.js` | interaction/event mutations, detail refetches, dashboard stale | ACTIVE_CONFIRMED |
| `public/scripts/products/products.js` | product batch save and explicit product refresh | ACTIVE_CONFIRMED |
| `public/scripts/interactions.js` | interactions/audit/session/activity API reads and preference write | ACTIVE_CONFIRMED |

## Evidence Tables

### API Wrapper Responsibilities

| Responsibility | Status | Evidence |
| --- | --- | --- |
| Request queue and throttling | EVIDENCED | `authedFetch` pushes requests to `requestQueue`; `processQueue()` drains them with `RATE_LIMIT_CONFIG.interval` (`public/scripts/services/api.js:31-35`, `public/scripts/services/api.js:38-64`). |
| Auth header injection | EVIDENCED | `executeFetch` reads `crm-token` and sets `Authorization: Bearer ...` (`public/scripts/services/api.js:72-75`). |
| Write detection | EVIDENCED | `method` defaults to `GET`; `POST`, `PUT`, `DELETE` are write operations (`public/scripts/services/api.js:77-78`). |
| 429 retry behavior | EVIDENCED | `response.status === 429` retries with exponential backoff until `maxRetries` (`public/scripts/services/api.js:84-92`). |
| Auth failure redirect | EVIDENCED | `401/403` clears token/user storage and redirects to `/login.html` after notification (`public/scripts/services/api.js:96-107`). |
| Smart stale invalidation | EVIDENCED | Successful writes with `result?.success !== false` and no `skipRefresh` call `CRM_APP.markStale(affectedPages)` (`public/scripts/services/api.js:127-148`). |
| Success/error notifications | EVIDENCED | Writes emit success notification; caught non-auth errors emit operation-failed notification (`public/scripts/services/api.js:151-160`). |
| Non-JSON response behavior | UNKNOWN | The wrapper initializes `result = null` and only parses JSON when content type includes JSON (`public/scripts/services/api.js:110-118`), but this pass did not enumerate all non-JSON API consumers. |

### URL-Based Stale Invalidation Map

| URL family in `authedFetch` | Pages marked by wrapper | Status | Evidence |
| --- | --- | --- | --- |
| Any successful write | `dashboard` | EVIDENCED | `affectedPages` starts as `['dashboard']` (`public/scripts/services/api.js:133-135`). |
| `/api/companies` | `dashboard`, `companies` | EVIDENCED | Companies URL branch pushes `companies` (`public/scripts/services/api.js:136-137`). |
| `/api/opportunities` | `dashboard`, `opportunities`, `companies` | EVIDENCED | Opportunities URL branch pushes both list pages (`public/scripts/services/api.js:138-139`). |
| `/api/contacts` | `dashboard`, `contacts`, `companies`, `opportunities` | EVIDENCED | Contacts URL branch pushes all three list pages (`public/scripts/services/api.js:140-141`). |
| `/api/events`, `/api/event-logs`, `/api/interactions` | `dashboard`, `companies`, `opportunities` | EVIDENCED | Event/interaction branch pushes `companies` and `opportunities` (`public/scripts/services/api.js:142-143`). |
| `/api/weekly` | `dashboard`, `weekly-business` | EVIDENCED | Weekly URL branch checks `/api/weekly` (`public/scripts/services/api.js:144-145`). |
| `/api/business/weekly/...` | Wrapper mapping unclear | UNKNOWN | Weekly page writes use `/api/business/weekly/...` (`public/scripts/weekly/weekly-business.js:453`, `public/scripts/weekly/weekly-business.js:500`), while wrapper checks `/api/weekly` (`public/scripts/services/api.js:144`). The local weekly module separately calls `dashboardManager.markStale()` (`public/scripts/weekly/weekly-business.js:456-457`, `public/scripts/weekly/weekly-business.js:505-506`). |
| `/api/products/...` | `dashboard` only by wrapper | EVIDENCED | Products writes use `/api/products/batch` and `/api/products/refresh`; no products-specific branch exists in the wrapper mapping (`public/scripts/products/products.js:427-431`, `public/scripts/products/products.js:554-565`, `public/scripts/products/products.js:583-584`, `public/scripts/services/api.js:133-148`). |
| `/api/internal-ops/...` | `dashboard` only by wrapper | EVIDENCED | Internal ops uses `authedFetch(url, { ... })` for writes, while wrapper has no internal-ops URL branch (`public/scripts/internal-ops/internal-ops.js:725-758`, `public/scripts/services/api.js:133-148`). |

### `authedFetch` Caller Map

| Caller area | Observed usage | Status | Evidence |
| --- | --- | --- | --- |
| Frontend-wide count | 137 `authedFetch(` references across 36 JS files under `public/scripts` | EVIDENCED | Counted with `Select-String` over `public/scripts/**/*.js`; representative file list includes `public/scripts/contacts/contacts.js`, `public/scripts/opportunities/opportunity-modals.js`, `public/scripts/events/event-editor-standalone.js`, `public/scripts/dashboard/dashboard.js`, and `public/scripts/products/products.js`. |
| Bootstrap/config | Loads app config once during startup | EVIDENCED | `CRM_APP.loadConfig` calls `/api/config` (`public/scripts/core/main.js:39-44`). |
| Dashboard | Loads `/api/dashboard`, non-blocking contacts stats, subscription alerts, and cache invalidation | EVIDENCED | `dashboardManager.refresh()` calls `/api/dashboard`; contacts stats call is non-blocking; force refresh posts `/api/cache/invalidate` (`public/scripts/dashboard/dashboard.js:75-80`, `public/scripts/dashboard/dashboard.js:154-160`, `public/scripts/dashboard/dashboard.js:201-210`). |
| Contacts | Reads list/detail support data and uses `skipRefresh` on several writes, followed by local `filterAndRenderContacts` and dashboard stale marking | EVIDENCED | Contact writes include `skipRefresh: true`; successful branches call `filterAndRenderContacts` and `dashboardManager.markStale()` (`public/scripts/contacts/contacts.js:1143-1207`, `public/scripts/contacts/contacts.js:1510-1529`, `public/scripts/contacts/contacts.js:1554-1575`, `public/scripts/contacts/contacts.js:1628-1683`). |
| Opportunities list/detail | List loads metadata/config and opportunities; detail pages use explicit detail reloads after some writes | EVIDENCED | Opportunities list uses `/api/opportunities/metadata/years`, `/api/config`, and `/api/opportunities?...` (`public/scripts/opportunities/opportunities.js:107-108`, `public/scripts/opportunities/opportunities.js:296`). Detail save uses `skipRefresh: true`, reloads `window.loadOpportunityDetailPage`, and marks dashboard stale (`public/scripts/opportunities/opportunity-details-events.js:498-528`). |
| Opportunity relationships | Relationship writes reload detail page explicitly | EVIDENCED | Associated-contact mutations call `window.loadOpportunityDetailPage(...)` after success (`public/scripts/opportunities/details/opportunity-associated-contacts.js:324-350`, `public/scripts/opportunities/details/opportunity-associated-contacts.js:393-394`, `public/scripts/opportunities/details/opportunity-associated-contacts.js:741-769`). |
| Opportunity interactions | Uses direct mutation calls, dashboard stale marking, and a local detail refetch helper | EVIDENCED | `_refetchInteractions()` reads opportunity details; mutation branches call `dashboardManager.markStale()` (`public/scripts/opportunities/details/opportunity-interactions.js:1276-1279`, `public/scripts/opportunities/details/opportunity-interactions.js:1329-1440`, `public/scripts/opportunities/details/opportunity-interactions.js:1674-1739`, `public/scripts/opportunities/details/opportunity-interactions.js:2994-3001`). |
| Companies | Company list reloads itself after mutations; company details use `skipRefresh` and detail reload or `window.location.reload()` fallback | EVIDENCED | Company list delete reloads `loadCompaniesListPage()` (`public/scripts/companies/company-list.js:110-121`); detail writes/deletes use `skipRefresh: true` and reload detail or location fallback (`public/scripts/companies/company-details-events.js:149-154`, `public/scripts/companies/company-details-events.js:256-311`, `public/scripts/companies/company-details-events.js:386-400`). |
| Events | Event wizard/editor/event list mix local refresh, dashboard stale, and `refreshCurrentView` | EVIDENCED | Wizard creates with `skipRefresh: true`, marks dashboard stale, then calls `refreshCurrentView`; editor save/delete marks dashboard stale and delete calls `refreshCurrentView`; event list delete reloads `pageModules.events()` (`public/scripts/events/event-wizard.js:435-463`, `public/scripts/events/event-editor-standalone.js:547-585`, `public/scripts/events/event-list.js:177-181`). |
| Products | Product page keeps its own in-memory `allProducts`, refetches after batch save and explicit refresh | EVIDENCED | `loadData` fills `allProducts`; batch save refetches `/api/products`; force refresh posts `/api/products/refresh` then reloads data (`public/scripts/products/products.js:45-55`, `public/scripts/products/products.js:554-565`, `public/scripts/products/products.js:578-584`). |
| Interactions/audit pages | Read-heavy paginated fetches plus a preference write | EVIDENCED | `interactions.js` writes `/api/config/pref` and reads audit logs, user sessions, and activity timeline pages (`public/scripts/interactions.js:431-434`, `public/scripts/interactions.js:468-482`, `public/scripts/interactions.js:824-838`, `public/scripts/interactions.js:924-945`). |

### Router and Refresh Behavior

| Behavior | Status | Evidence |
| --- | --- | --- |
| Page registry starts in `constants.js` | EVIDENCED | `window.CRM_APP.pageConfig` defines list/detail page loaded flags; `window.CRM_APP.pageModules = {}` is initialized (`public/scripts/core/constants.js:6-24`, `public/scripts/core/constants.js:45-47`). |
| Dashboard stale reload | EVIDENCED | Router calls `dashboardManager.refresh()` when dashboard config is unloaded or stale, then clears flags (`public/scripts/core/router.js:148-152`). |
| Non-detail stale reload | EVIDENCED | Non-dashboard modules reload when `isDetailPage || pageName === 'event-editor' || !config.loaded || config.stale`; non-detail non-event-editor pages clear flags after load (`public/scripts/core/router.js:158-180`). |
| Detail pages always load when navigated | EVIDENCED | `isDetailPage` is true for names containing `-details` and weekly detail, and contributes to `needsLoad` (`public/scripts/core/router.js:114-124`, `public/scripts/core/router.js:158-166`). |
| `refreshCurrentView` compatibility/fallback path | EVIDENCED | `SyncService.refreshCurrentView` sets every list page's `loaded = false` and navigates to the current hash page; it is assigned to `window.CRM_APP.refreshCurrentView` (`public/scripts/core/sync-service.js:15-22`, `public/scripts/core/sync-service.js:31-44`). |
| Dashboard force refresh | EVIDENCED | `dashboardManager.forceRefresh` posts `/api/cache/invalidate`, sets non-detail page loaded flags false, refreshes dashboard with cache-busting timestamp, then navigates back to current page (`public/scripts/dashboard/dashboard.js:178-210`). |
| Runtime branch outcomes | UNKNOWN | Source shows multiple possible refresh branches, but this pass did not drive browser interactions to observe which branches fire for each workflow. |

### POST/PUT/DELETE Invalidation and Local Refresh Examples

| Example path | Central wrapper invalidation? | Local refresh/stale behavior | Evidence |
| --- | --- | --- | --- |
| Contact source sync preview/commit | Disabled with `skipRefresh: true` | Commit refilters contacts locally; preview does not mutate UI list | `public/scripts/contacts/contacts.js:1143-1207` |
| Contact raw/core save/delete | Disabled with `skipRefresh: true` | Refetches/refilters contacts and marks dashboard stale | `public/scripts/contacts/contacts.js:1510-1529`, `public/scripts/contacts/contacts.js:1554-1575`, `public/scripts/contacts/contacts.js:1628-1683` |
| Opportunity detail save | Disabled with `skipRefresh: true` | Reloads detail page and marks dashboard stale | `public/scripts/opportunities/opportunity-details-events.js:498-528` |
| Opportunity associated contacts | Usually not disabled in observed snippets | Reloads opportunity detail page after relationship changes | `public/scripts/opportunities/details/opportunity-associated-contacts.js:324-350`, `public/scripts/opportunities/details/opportunity-associated-contacts.js:393-394`, `public/scripts/opportunities/details/opportunity-associated-contacts.js:741-769` |
| Opportunity interactions/events | Mixed; direct writes observed | Marks dashboard stale and sometimes refetches interactions/details | `public/scripts/opportunities/details/opportunity-interactions.js:1170-1185`, `public/scripts/opportunities/details/opportunity-interactions.js:1276-1279`, `public/scripts/opportunities/details/opportunity-interactions.js:1321-1440`, `public/scripts/opportunities/details/opportunity-interactions.js:2994-3001` |
| Company detail save/delete/contact edit | Disabled with `skipRefresh: true` | Reloads company detail or falls back to `window.location.reload()` | `public/scripts/companies/company-details-events.js:149-154`, `public/scripts/companies/company-details-events.js:256-311`, `public/scripts/companies/company-details-events.js:386-400` |
| Event wizard create | Disabled with `skipRefresh: true` | Marks dashboard stale, then calls `refreshCurrentView` | `public/scripts/events/event-wizard.js:435-463` |
| Event editor save/delete | Not disabled in observed save/delete snippets | Marks dashboard stale; delete calls `refreshCurrentView` | `public/scripts/events/event-editor-standalone.js:533-548`, `public/scripts/events/event-editor-standalone.js:573-585` |
| Product batch save | Not disabled in observed snippets | Refetches `/api/products` after batch save; product refresh explicitly posts refresh then reloads data | `public/scripts/products/products.js:427-438`, `public/scripts/products/products.js:554-565`, `public/scripts/products/products.js:578-584` |
| Dashboard force refresh | Not disabled | Invalidates backend cache, clears list-page loaded flags, refreshes dashboard, navigates back | `public/scripts/dashboard/dashboard.js:201-210` |

## LLM Confusion Risks

| Risk | Why it can confuse future work | Evidence |
| --- | --- | --- |
| Two stale APIs with different semantics | `CRM_APP.markStale()` sets `stale = true`; `dashboardManager.markStale()` sets dashboard `loaded = false`. They are both named stale/markStale but affect flags differently. | `public/scripts/core/main.js:118-125`, `public/scripts/dashboard/dashboard.js:40-43` |
| `skipRefresh` does not mean no refresh | Several `skipRefresh: true` writes avoid wrapper invalidation but perform local refetch/detail reload/current-view refresh afterward. | `public/scripts/contacts/contacts.js:1510-1529`, `public/scripts/opportunities/opportunity-details-events.js:498-528`, `public/scripts/events/event-wizard.js:435-463` |
| Central URL mapping is partial | Wrapper has specific branches for companies/opportunities/contacts/events/weekly, but products and internal ops have no page-specific branch, and weekly page writes use `/api/business/weekly/...` while wrapper checks `/api/weekly`. | `public/scripts/services/api.js:133-148`, `public/scripts/products/products.js:554-584`, `public/scripts/weekly/weekly-business.js:453-506` |
| Detail pages are not cached like list pages | Router reloads detail pages when navigated, while list pages use loaded/stale flags. | `public/scripts/core/router.js:114-124`, `public/scripts/core/router.js:158-180` |
| `refreshCurrentView` is still active despite API cleanup comment | `api.js` says stale-based router refresh is intended, but `sync-service.js` assigns `window.CRM_APP.refreshCurrentView`, and event/meeting paths still call it. | `public/scripts/services/api.js:7-8`, `public/scripts/core/sync-service.js:11-44`, `public/scripts/events/event-wizard.js:462-463`, `public/scripts/events/event-editor-standalone.js:584-585`, `public/scripts/meetings.js:247` |
| Browser reload fallback still exists | `api.js` removed legacy location reload behavior, but detail modules still use `window.location.reload()` as fallback. | `public/scripts/services/api.js:7-8`, `public/scripts/companies/company-details-events.js:307-311`, `public/scripts/companies/company-details-events.js:397-400` |
| Dashboard refresh triggers nested fetches | Dashboard `refresh()` loads `/api/dashboard`, initializes kanban with a refresh callback, updates map, and separately fetches `/api/dashboard/contacts-stats`. | `public/scripts/dashboard/dashboard.js:75-80`, `public/scripts/dashboard/dashboard.js:133-145`, `public/scripts/dashboard/dashboard.js:154-160` |
| Caller count is broad | `authedFetch` appears in 36 JS files and 137 call sites, so prompt work targeting "the API client" can miss local refresh paths. | Source-wide count from `public/scripts/**/*.js`; representative active bundle includes many of those modules (`public/scripts/import-bundle.js:13-57`). |

## No-Touch / Caution Areas

| Area | Classification | Caution | Evidence |
| --- | --- | --- | --- |
| `public/scripts/services/api.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Central request/auth/error/stale wrapper; many modules depend on it. | `public/scripts/services/api.js:31-35`, `public/scripts/services/api.js:74-78`, `public/scripts/services/api.js:127-152` |
| `public/scripts/core/router.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Owns loaded/stale handling for dashboard, list pages, event-editor, and detail pages. | `public/scripts/core/router.js:148-180` |
| `public/scripts/core/sync-service.js` | COMPATIBILITY_CANDIDATE | Still defines `refreshCurrentView`, which current modules call. Compatibility status is not removability. | `public/scripts/core/sync-service.js:11-44`, `public/scripts/events/event-wizard.js:462-463`, `public/scripts/events/event-editor-standalone.js:584-585` |
| `public/scripts/dashboard/dashboard.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Dashboard has its own stale flag behavior and force refresh path in addition to wrapper invalidation. | `public/scripts/dashboard/dashboard.js:40-43`, `public/scripts/dashboard/dashboard.js:178-210` |
| Detail mutation modules | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Several detail writes intentionally bypass wrapper refresh and run local/detail reload behavior. | `public/scripts/opportunities/opportunity-details-events.js:498-528`, `public/scripts/companies/company-details-events.js:149-154`, `public/scripts/companies/company-details-events.js:386-400` |
| `public/scripts/import-bundle.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Establishes script order for globals such as `authedFetch`, `CRM_APP`, router, page modules, and dashboard manager. | `public/scripts/import-bundle.js:13-57` |

## Evidence Gaps

| Gap | Status | Evidence / boundary |
| --- | --- | --- |
| Per-workflow runtime branch confirmation | UNKNOWN | Source evidence shows multiple branches; no browser interaction or network trace was run in this task. |
| Complete POST/PUT/DELETE matrix | PARTIAL | Representative write paths were inspected, but not every one of the 137 `authedFetch` call sites was manually classified. |
| Internal-ops local refresh behavior | PARTIAL | Internal ops uses guarded `authedFetch` writes (`public/scripts/internal-ops/internal-ops.js:725-758`), but this task did not deeply inspect all internal-ops submodule refresh state. |
| Products stale relationship to dashboard/list flags | PARTIAL | Product page has local refresh (`public/scripts/products/products.js:554-584`) and wrapper marks dashboard for writes, but no product-specific wrapper branch exists (`public/scripts/services/api.js:133-148`). |
| Weekly central-vs-local stale behavior | PARTIAL | Weekly local module marks dashboard stale after mutations (`public/scripts/weekly/weekly-business.js:456-457`, `public/scripts/weekly/weekly-business.js:505-506`), while wrapper URL matching appears keyed to `/api/weekly` (`public/scripts/services/api.js:144-145`). No runtime trace was run. |
| Non-JSON write responses | UNKNOWN | Wrapper permits `result = null` for non-JSON responses before success handling (`public/scripts/services/api.js:110-130`), but this pass did not enumerate backend response content types. |

## Recommended One Next Forensic Question

Which mutation workflows still rely on local refresh or `refreshCurrentView` instead of central `CRM_APP.markStale`, and which of those are intentional compatibility behavior versus unresolved evidence gaps?
