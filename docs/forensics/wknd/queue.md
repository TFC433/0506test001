# Weekend Forensics Queue

Project: TFC CRM / 新CRM修改中

## Queue Model

This queue is designed for runner-style Codex / Jules automation.

The runner should not execute all tasks in one run.

Each runner execution should:

1. read `goal.md`
2. read `rules.md`
3. read `queue.md`
4. read `state.md`
5. find the first PENDING task
6. run only that one task
7. write one result report under `docs/forensics/wknd/results/`
8. update `state.md`
9. stop

This is one runner prompt, multiple scheduled runs.

## Campaign Size

Maximum planned executions:

15

Recommended interval:

2 hours

Expected total duration:

about 28 hours if all 15 runs are executed.

The queue may stop early if a task becomes `BLOCKED`.

The final synthesis should run only after the required prior reports exist.

---

# Task Order

## 01-repo-boundary

Output:

`docs/forensics/wknd/results/01-repo-boundary.md`

Goal:

Establish repo boundary, no-touch baseline, and source/generated/vendor/archive distinctions.

Primary focus:

* top-level repo folders
* `repomix-packs/**`
* `public/assets/vendor/**`
* `public/assets/maps/taiwan.json`
* `public/assets/**`
* `scripts/**`
* `package-lock.json`
* generated reports
* archive docs
* vendor assets
* schema dumps

Required output:

* top-level repo boundary table
* source vs generated vs vendor vs docs vs archive classification
* no-touch / caution list
* LLM confusion risks
* evidence gaps

Do not:

* deeply inspect generated snapshots
* deeply inspect vendor/minified files
* recommend deletion
* classify files as dead

---

## 02-docs-source-map

Output:

`docs/forensics/wknd/results/02-docs-source-map.md`

Goal:

Map docs authority, source-of-truth boundaries, archive/report/roadmap boundaries, and docs an LLM should read before future work.

Primary focus:

* `docs/architecture-governance.md`
* `docs/crm-current-state-index.md`
* `docs/tfc-crm-ui-style-governance.md`
* `docs/non-breaking-cleanup-roadmap.md`
* `docs/repo-operational-consolidation-report.md`
* `docs/repo-scan-boundary.md`
* `docs/audit-session-log-governance.md`
* `docs/echarts-migration-record.md`
* `docs/highcharts-highmaps-remaining-references-audit.md`
* `docs/supabase-access-sop.md`
* `docs/schema/**`
* relevant archive/handoff docs if present

Required output:

* docs inventory
* active governance vs roadmap vs report vs archive classification
* current source-of-truth map
* docs that should not be treated as implementation authorization
* docs that need source cross-check before use
* evidence gaps

Do not:

* rewrite governance docs
* update existing docs
* treat roadmap as authorization to change source

---

## 03-backend-route-auth-alias-map

Output:

`docs/forensics/wknd/results/03-backend-route-auth-alias-map.md`

Goal:

Map backend API entry points, auth boundaries, route aliases, and legacy compatibility routes.

Primary focus:

* `app.js`
* `routes/index.js`
* `routes/*.routes.js`
* `middleware/auth.middleware.js`
* `middleware/role.middleware.js`
* `middleware/error.middleware.js`

Required output:

* route mount map
* route file map
* HTTP method/path table
* middleware/auth boundary table
* compatibility alias table
* public vs protected vs unknown route classification
* evidence gaps

Do not:

* inspect service internals deeply
* decide alias routes are removable
* modify routes

---

## 04-controller-service-endpoint-map

Output:

`docs/forensics/wknd/results/04-controller-service-endpoint-map.md`

Goal:

Map controller functions to service methods for major backend domains.

Primary focus:

* `controllers/*.controller.js`
* `routes/*.routes.js`
* service method names referenced by controllers
* `req.app.get('services')`
* constructor injection patterns
* direct imports, if any

Required output:

* controller file inventory
* controller function → service method table
* service access pattern table
* direct data access warnings, if found
* unresolved controller/service links
* evidence gaps

Do not:

* inspect all service method bodies deeply
* infer service behavior from method names alone
* modify controllers

---

## 05-service-container-di-map

Output:

`docs/forensics/wknd/results/05-service-container-di-map.md`

Goal:

Map runtime dependency injection and identify actual service/data wiring.

Primary focus:

* `services/service-container.js`
* `config.js`
* `config/supabase.js`
* instantiated services
* instantiated readers/writers
* Google client / Sheets dependencies
* Supabase / SQL dependencies
* RAW / legacy comments
* cross-domain dependencies

Required output:

* service instantiation table
* constructor argument table
* SQL dependency table
* RAW / Sheets / legacy dependency table
* cross-domain dependency table
* DI comments / ownership evidence
* evidence gaps

Do not:

* assume `data/index.js` is runtime owner
* assume SQL variants replace non-SQL variants
* modify DI

---

## 06-data-reader-writer-fallback-map

Output:

`docs/forensics/wknd/results/06-data-reader-writer-fallback-map.md`

Goal:

Map data reader/writer usage, SQL vs legacy vs Sheets boundaries, RAW dependencies, and fallback behavior.

Primary focus:

* `data/*reader*.js`
* `data/*writer*.js`
* `data/*sql*.js`
* `data/index.js`
* `services/*-service.js` only where needed for reader/writer usage
* fallback-related logs and try/catch
* direct Supabase usage
* direct Google Sheets usage

Required output:

* data file inventory
* export/caller table
* SQL vs Sheets vs RAW dependency table
* fallback behavior ledger
* domain-level source classification
* no-touch / compatibility caution list
* evidence gaps

Allowed source classifications:

* ACTIVE_SQL_PRIMARY
* ACTIVE_LEGACY_PRIMARY
* ACTIVE_MIXED
* ACTIVE_FALLBACK
* RAW_DATA_DEPENDENCY
* COMPATIBILITY_CANDIDATE
* UNKNOWN
* DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC

Do not:

* classify anything as dead
* infer fallback from naming
* recommend deleting legacy readers/writers

---

## 07-spa-bootstrap-router-crmapp-map

Output:

`docs/forensics/wknd/results/07-spa-bootstrap-router-crmapp-map.md`

Goal:

Map frontend SPA bootstrap, router, page registration, and global `window.CRM_APP` mutation.

Primary focus:

* `public/dashboard.html`
* `public/login.html`
* `public/scripts/core/main.js`
* `public/scripts/core/router.js`
* `public/scripts/core/constants.js`
* `public/scripts/core/layout-manager.js`
* page-view containers
* page module registration
* global `window.CRM_APP` assignments and mutations

Required output:

* frontend entrypoint table
* page id → route → module map
* `CRM_APP` mutation table
* bootstrap sequence
* route/page ownership risk map
* evidence gaps

Do not:

* refactor frontend structure
* propose framework migration
* modify SPA files

---

## 08-frontend-api-stale-cache-map

Output:

`docs/forensics/wknd/results/08-frontend-api-stale-cache-map.md`

Goal:

Map frontend API client behavior, stale invalidation, refresh behavior, and risky refetch patterns.

Primary focus:

* `public/scripts/services/api.js`
* `public/scripts/core/main.js`
* `public/scripts/core/router.js`
* `public/scripts/dashboard/dashboard.js`
* frontend modules calling `authedFetch`
* `CRM_APP.markStale`
* stale cache helpers
* POST/PUT/DELETE invalidation behavior
* detail refetch patterns if discoverable

Required output:

* API wrapper responsibilities
* `authedFetch` caller map
* stale invalidation map
* page refresh / route refresh behavior
* LLM confusion risks
* Render/runtime risk notes if evidenced
* evidence gaps

Do not:

* optimize API calls
* change cache behavior
* remove refetches

---

## 09-frontend-heavy-module-map

Output:

`docs/forensics/wknd/results/09-frontend-heavy-module-map.md`

Goal:

Map responsibilities and LLM risks of the largest active frontend modules.

Primary focus:

* `public/scripts/opportunities/details/opportunity-interactions.js`
* `public/scripts/opportunities/opportunity-modals.js`
* `public/scripts/contacts/contacts.js`
* `public/scripts/interactions.js`
* `public/scripts/internal-ops/internal-ops-dev-projects.js`
* `public/scripts/internal-ops/internal-ops-subscriptions.js`
* `public/scripts/dashboard/dashboard_widgets.js`
* `public/scripts/events/event-report-manager.js`
* `public/scripts/sales/sales-analysis-components.js`
* other large active frontend modules if clearly relevant

Required output:

* heavy module inventory
* responsibility summary per file
* entrypoints / exported globals
* mixed-responsibility warnings
* long header/changelog context risk
* future prompt constraints per module
* evidence gaps

Do not:

* split files
* recommend refactors
* classify modules as dead

---

## 10-css-load-selector-ownership-map

Output:

`docs/forensics/wknd/results/10-css-load-selector-ownership-map.md`

Goal:

Map CSS load order, selector ownership, global overrides, and collision risks.

Primary focus:

* `public/styles/main.css`
* `public/styles/modules/variables.css`
* `public/styles/modules/base.css`
* `public/styles/modules/forms.css`
* `public/styles/modules/modals.css`
* `public/styles/modules/layout.css`
* `public/styles/modules/navigation.css`
* `public/styles/modules/components.css`
* `public/styles/modules/features.css`
* `public/styles/modules/responsive.css`
* `public/styles/user-profile.css`
* `public/styles/login.css`

Required output:

* CSS load order
* selector ownership table
* global selector / generic class risk map
* `!important` / override risk table
* modal/table/pagination/form/layout selector map
* evidence gaps

Do not:

* delete selectors
* recommend selector cleanup
* rewrite CSS

---

## 11-js-injected-css-common-ui-map

Output:

`docs/forensics/wknd/results/11-js-injected-css-common-ui-map.md`

Goal:

Map JS-injected CSS, common UI helpers, and shared UI behaviors that can confuse future LLM work.

Primary focus:

* `public/scripts/services/ui.js`
* `public/scripts/core/utils.js`
* `public/scripts/core/theme-toggle.js`
* `public/scripts/core/layout-manager.js`
* toast injection
* pagination style injection
* notification animation style injection
* theme transition style injection
* modal helper logic
* table/pagination/common UI helpers

Required output:

* JS-injected CSS inventory
* injected style id/name table
* helper function ownership table
* CSS-vs-JS responsibility boundary
* LLM confusion risks
* evidence gaps

Do not:

* move JS-injected CSS
* consolidate helpers
* remove injected styles

---

## 12-charting-map-visualization-boundary

Output:

`docs/forensics/wknd/results/12-charting-map-visualization-boundary.md`

Goal:

Map charting and map visualization boundaries across ECharts, Highcharts, Highmaps, and map assets.

Primary focus:

* `public/assets/vendor/echarts/echarts.min.js`
* `public/assets/vendor/highcharts/**`
* `public/assets/maps/taiwan.json`
* `public/scripts/services/charting.js`
* `public/scripts/dashboard/dashboard_widgets.js`
* `public/scripts/events/event-charts.js`
* `public/dashboard.html`
* docs related to ECharts / Highcharts migration or remaining references

Required output:

* charting library load map
* wrapper/helper usage map
* Highcharts caller map
* ECharts caller map
* Taiwan map asset usage map
* docs vs source consistency notes
* evidence gaps

Do not:

* recommend removing Highcharts
* recommend removing ECharts
* modify vendor files
* inspect minified vendor internals

---

## 13-cross-domain-llm-trap-review

Output:

`docs/forensics/wknd/results/13-cross-domain-llm-trap-review.md`

Goal:

Review prior reports and produce a cross-domain LLM trap map.

Input reports:

* `01-repo-boundary.md`
* `02-docs-source-map.md`
* `03-backend-route-auth-alias-map.md`
* `04-controller-service-endpoint-map.md`
* `05-service-container-di-map.md`
* `06-data-reader-writer-fallback-map.md`
* `07-spa-bootstrap-router-crmapp-map.md`
* `08-frontend-api-stale-cache-map.md`
* `09-frontend-heavy-module-map.md`
* `10-css-load-selector-ownership-map.md`
* `11-js-injected-css-common-ui-map.md`
* `12-charting-map-visualization-boundary.md`

Goal details:

Identify traps such as:

* route aliases
* legacy but active code
* compatibility paths
* RAW data dependencies
* generated snapshots mistaken as source
* roadmap docs mistaken as instructions
* CSS global selector collisions
* JS-injected CSS
* shared `CRM_APP` mutation
* chart library split
* backend DI vs data barrel mismatch

Required output:

* cross-domain trap table
* repeated risk areas
* wrong-prompt examples to avoid
* safer future prompt constraints
* evidence gaps

Do not:

* rescan the repo unless prior reports explicitly require it
* recommend cleanup
* propose patch steps

---

## 14-evidence-gap-closure-pass

Output:

`docs/forensics/wknd/results/14-evidence-gap-closure-pass.md`

Goal:

Close only the most important evidence gaps explicitly listed by earlier reports.

Input:

* all completed reports from tasks 01 through 13

Allowed behavior:

* read prior report evidence gaps
* select up to 10 highest-risk UNKNOWNs
* perform targeted repo inspection only for those UNKNOWNs
* mark each as CLOSED, STILL_UNKNOWN, or BLOCKED

Required output:

* selected gap list
* targeted files inspected
* gap closure table
* remaining high-risk UNKNOWNs
* recommended future forensic questions

Do not:

* start a new broad scan
* add new unrelated research topics
* recommend cleanup
* modify source

---

## 15-weekend-synthesis

Output:

`docs/forensics/wknd/results/15-weekend-synthesis.md`

Goal:

Produce the final weekend planning-quality synthesis.

Input:

* all completed reports from tasks 01 through 14

Required output:

* repo-wide active path map
* source vs generated/vendor/archive boundary
* backend/data-layer understanding summary
* frontend/SPA understanding summary
* CSS/common UI understanding summary
* docs authority summary
* LLM confusion map
* no-touch / caution areas
* remaining UNKNOWNs
* future prompt design rules
* future planning options
* recommended next phase options

Do not:

* rescan the repo broadly
* recommend cleanup as approved
* propose patches
* classify anything as dead
* decide what can be deleted

## Queue Completion Rule

The queue is complete only when:

* all tasks 01 through 15 are DONE or PARTIAL with acceptable evidence, and
* `15-weekend-synthesis.md` exists.

If any task is BLOCKED, stop and do not continue to later tasks.
