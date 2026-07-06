# 01 Repo Boundary

## Executive Conclusion

This repo contains an active Node / Express backend, a static vanilla-JS frontend, operational docs, generated Repomix snapshots, locally copied vendor chart assets, static media/map assets, scripts that generate or copy artifacts, and local environment/credential files.

EVIDENCED: runtime entry is `app.js`, because `package.json` sets `"main": "app.js"` and `"start": "node app.js"`, and `app.js` mounts static `public` plus API routes from `routes/index.js`.

EVIDENCED: `repomix-packs/**` are generated snapshots, because pack scripts such as `scripts/opportunity/pack-opportunity-full.ps1` invoke `repomix .` with `--output repomix-packs/opportunity/opportunity-full.md`, and `docs/architecture-governance.md` states `repomix-packs/**` are generated snapshots.

EVIDENCED: `public/assets/vendor/highcharts/**` are local vendor copies, because `scripts/setup-highcharts-vendor.js` copies files from `node_modules/highcharts` and `node_modules/@highcharts/map-collection` into `public/assets/vendor/highcharts`.

UNKNOWN: whether every generated report, roadmap, or governance document is currently authoritative for implementation decisions. Task 02 is required for docs authority.

## Files Inspected

| Path | Inspection Type | Evidence |
| --- | --- | --- |
| `package.json` | Read | `"main": "app.js"`, `"start": "node app.js"`, dependencies include Express, Supabase, Google APIs, ECharts, Highcharts. |
| `package-lock.json` | Header read | Lockfile version 3 with root package `tfc-crm-system`; lockfile is dependency resolution metadata, not source logic. |
| `app.js` | Header and bootstrap read | Requires Express, config, service container, middleware, routes; serves `public`; mounts `/api`; serves `public/login.html` and `public/dashboard.html`. |
| `.repomixignore` | Read | Excludes `node_modules`, build/cache outputs, media, env files, and `package-lock.json` from Repomix input. |
| `scripts/opportunity/pack-opportunity-full.ps1` | Read | Invokes `repomix .` and writes `repomix-packs/opportunity/opportunity-full.md`. |
| `scripts/setup-highcharts-vendor.js` | Read | Copies Highcharts files from `node_modules` into `public/assets/vendor/highcharts`. |
| `repomix-packs/**` | Listed | Contains domain snapshot Markdown files such as `repomix-packs/auth/auth-full.md`, `repomix-packs/opportunity/opportunity-full.md`, and `repomix-packs/shared/shared-frontend-core.md`. |
| `public/assets/**` | Listed | Contains avatar PNG files, `public/assets/maps/taiwan.json`, ECharts minified JS, and Highcharts vendor JS files. |
| `scripts/**` | Listed | Contains many `pack-*.ps1` Repomix scripts and `scripts/setup-highcharts-vendor.js`. |
| `docs/**` | Listed and narrow search | Contains governance/report/roadmap docs and `docs/schema/audit-logs-v1.sql`. |

## Evidence Tables

### Top-Level Repo Boundary

| Path | Classification | Evidence | Caution |
| --- | --- | --- | --- |
| `app.js` | ACTIVE_CONFIRMED | `package.json` sets `"main": "app.js"` and `"start": "node app.js"`; `app.js` starts Express and mounts `/api`. | Backend entrypoint; do not treat as isolated from `services/service-container.js` or `routes/index.js`. |
| `config.js` | ACTIVE_CONFIRMED | `app.js` requires `./config` before server startup. | Contains runtime config surface; source ownership needs deeper task evidence. |
| `config/` | POSSIBLY_ACTIVE | `config/supabase.js` is present and dependencies include `@supabase/supabase-js` in `package.json`. | Do not infer exact runtime owner until DI/data tasks. |
| `controllers/` | POSSIBLY_ACTIVE | Controllers are present and `app.js` mounts API routes from `routes/index.js`; route/controller linkage is task 03/04 scope. | Not fully classified in this boundary pass. |
| `routes/` | ACTIVE_CONFIRMED | `app.js` requires `./routes` and mounts `app.use('/api', allApiRoutes)`. | Alias/compatibility routes need task 03. |
| `middleware/` | ACTIVE_CONFIRMED | `app.js` imports `middleware/error.middleware.js` and uses `globalErrorHandler`. | Auth/role boundaries need task 03. |
| `services/` | ACTIVE_CONFIRMED | `app.js` requires `./services/service-container` and stores initialized services on `app`. | DI ownership needs task 05. |
| `data/` | POSSIBLY_ACTIVE | File inventory contains SQL and non-SQL readers/writers; `package.json` includes Supabase and Google APIs. | Do not classify SQL or legacy primacy until task 06. |
| `public/` | ACTIVE_CONFIRMED | `app.js` serves `express.static(path.join(__dirname, 'public'))`, serves `public/login.html`, and falls back to `public/dashboard.html`. | Frontend ownership needs tasks 07-12. |
| `utils/` | POSSIBLY_ACTIVE | Inventory includes `utils/audit-helpers.js` and `utils/date-helpers.js`. | Callers not inspected in this boundary task. |
| `tools/` | NOT_INSPECTED | Inventory includes `tools/authenticate.js` and `tools/hash-generator.js`. | Tool files are not proven runtime entrypoints in this pass. |
| `scripts/` | COMPATIBILITY_CANDIDATE | Contains Repomix pack scripts and Highcharts vendor setup script. | Operational scripts; not app runtime logic unless explicitly invoked. |
| `docs/` | ACTIVE_DOC / ROADMAP_DOC / REPORT_DOC | Top-level docs include governance, current-state index, roadmap, reports, SOP, schema, and this forensic queue. | Authority varies by document; task 02 must map docs authority. |
| `repomix-packs/` | GENERATED_SNAPSHOT | Pack scripts write outputs under `repomix-packs/**`; `docs/architecture-governance.md` identifies this path as generated snapshots. | Do not treat as source. |
| `node_modules/` | VENDOR_ASSET | Top-level dependency directory exists; package metadata lists NPM dependencies. | Excluded from forensic source review. |
| `.git/` | NOT_INSPECTED | Git metadata directory exists at repo root. | Excluded by rules. |
| `.agents/` | NOT_INSPECTED | Top-level directory exists. | Ownership not inspected in this task. |
| `.env`, `credentials.json`, `oauth-credentials.json`, `oauth-token.json` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Top-level local environment/credential files exist. | Sensitive runtime/local credential surface; not source logic. |
| `.codex-server.err.log`, `.codex-server.out.log` | NOT_INSPECTED | Top-level log files exist. | Logs are not current source truth. |

### Source vs Generated vs Vendor vs Docs vs Archive

| Path | Classification | Evidence |
| --- | --- | --- |
| `package.json` | ACTIVE_CONFIRMED | Defines app entry, scripts, dependencies, and Node engine. |
| `package-lock.json` | GENERATED_SNAPSHOT | Lockfile header shows dependency resolution metadata for package `tfc-crm-system`; `.repomixignore` excludes `package-lock.json` from packed source context. |
| `repomix-packs/auth/*.md` | GENERATED_SNAPSHOT | Listed files include `auth-backend-security.md`, `auth-full.md`, and `auth-login-ui.md`; pack scripts use `repomix . --output repomix-packs/...`. |
| `repomix-packs/opportunity/*.md` | GENERATED_SNAPSHOT | Listed files include `opportunity-full.md`; `scripts/opportunity/pack-opportunity-full.ps1` writes that exact output. |
| `repomix-packs/shared/*.md` | GENERATED_SNAPSHOT | Listed files include `shared-frontend-core.md`, `shared-styles-layout.md`, and `shared-highcharts-vendor.md`; scripts under `scripts/shared/` write these outputs. |
| `public/assets/vendor/echarts/echarts.min.js` | VENDOR_ASSET | Listed under `public/assets/vendor`; `public/dashboard.html` loads `assets/vendor/echarts/echarts.min.js`. |
| `public/assets/vendor/highcharts/*.js` | VENDOR_ASSET | Listed under `public/assets/vendor/highcharts`; `scripts/setup-highcharts-vendor.js` copies these files from `node_modules`. |
| `public/assets/maps/taiwan.json` | VENDOR_ASSET | Listed as a large static JSON asset under `public/assets/maps`. | 
| `public/assets/avatars/*.png` | VENDOR_ASSET | Listed as PNG image assets; `.repomixignore` excludes image extensions from packed source context. |
| `docs/architecture-governance.md` | ACTIVE_DOC | Contains governance statements including generated snapshot caution for `repomix-packs/**`. |
| `docs/crm-current-state-index.md` | ACTIVE_DOC | Listed in docs root; task 02 must verify authority and read-first status. |
| `docs/non-breaking-cleanup-roadmap.md` | ROADMAP_DOC | Filename and queue focus identify it as roadmap; roadmap docs are not implementation authorization under `docs/forensics/wknd/rules.md`. |
| `docs/repo-operational-consolidation-report.md` | REPORT_DOC | Filename and queue focus identify it as report; report docs require source cross-check before implementation use. |
| `docs/schema/audit-logs-v1.sql` | REPORT_DOC | File header states it is a manual Supabase reference script documenting schema already applied. |
| Archive docs | UNKNOWN | No top-level docs path named archive was found by the targeted filename search; archive boundaries need task 02. |

### No-Touch / Caution List

| Path | Classification | Evidence | Caution |
| --- | --- | --- | --- |
| `repomix-packs/**` | GENERATED_SNAPSHOT | Generated by `scripts/**/pack-*.ps1`; governance states it must not be hand-edited. | Source truth must come from unpacked files, not snapshots. |
| `public/assets/vendor/**` | VENDOR_ASSET | Highcharts setup script copies files from `node_modules`; dashboard loads vendor paths directly. | Vendor assets are not app logic. |
| `public/assets/maps/taiwan.json` | VENDOR_ASSET | Listed under static assets and loaded as map data in charting scope, not source logic. | Large static data; do not inspect as code. |
| `public/assets/avatars/*.png`, `public/images/*.svg`, `public/favicon.svg` | VENDOR_ASSET | Listed media/image assets; media excluded by rules and `.repomixignore`. | Binary/static visual assets are not app logic. |
| `node_modules/**` | VENDOR_ASSET | Dependency directory exists; package metadata controls dependencies. | Excluded from forensic source review. |
| `.env`, `credentials.json`, `oauth-credentials.json`, `oauth-token.json` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Local environment and credential-like files exist at repo root. | Sensitive/local configuration surface. |
| `package-lock.json` | GENERATED_SNAPSHOT | Lockfile version and package metadata; `.repomixignore` excludes it. | Dependency resolution artifact, not application source. |
| `docs/non-breaking-cleanup-roadmap.md` | ROADMAP_DOC | Roadmap file exists in docs root and rules say roadmap docs are not implementation authorization. | Do not treat as permission to modify code. |
| `docs/repo-operational-consolidation-report.md` | REPORT_DOC | Report file exists in docs root. | Report claims need current source cross-check. |
| `docs/schema/audit-logs-v1.sql` | REPORT_DOC | Header says manual Supabase reference script only. | Schema reference is not proof of runtime access path. |

## LLM Confusion Risks

| Risk | Classification | Evidence | Safer Prompt Constraint |
| --- | --- | --- | --- |
| Treating `repomix-packs/**` as editable source | GENERATED_SNAPSHOT | Pack scripts write `repomix-packs/...`; governance states generated snapshots must not be hand-edited. | Read snapshots only as packed references when explicitly requested; verify against source paths. |
| Treating vendor chart files as app logic | VENDOR_ASSET | `scripts/setup-highcharts-vendor.js` copies Highcharts files from `node_modules` to `public/assets/vendor/highcharts`; dashboard loads those assets. | Inspect wrappers/callers, not minified vendor internals. |
| Treating roadmap/report docs as authorization | ROADMAP_DOC / REPORT_DOC | `docs/non-breaking-cleanup-roadmap.md` and `docs/repo-operational-consolidation-report.md` exist; rules say roadmap docs are not implementation authorization. | Ask for source evidence and current task authorization before acting on docs. |
| Confusing static map JSON with app source | VENDOR_ASSET | `public/assets/maps/taiwan.json` is a large static asset under `public/assets/maps`. | Treat as data asset unless a charting task proves caller behavior. |
| Assuming SQL files define runtime ownership | REPORT_DOC / UNKNOWN | `docs/schema/audit-logs-v1.sql` says manual reference script only; data layer contains both SQL and non-SQL readers/writers. | Use DI and data task evidence before deciding runtime data path. |
| Overlooking local credential/config files | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | `.env`, `credentials.json`, `oauth-credentials.json`, and `oauth-token.json` exist at root. | Do not quote, edit, or rely on sensitive local files unless explicitly in scope. |
| Assuming scripts are runtime application code | COMPATIBILITY_CANDIDATE | `scripts/**` includes many Repomix pack scripts and a vendor setup script. | Classify scripts by invocation evidence before using them as runtime behavior evidence. |

## No-Touch / Caution Areas

The following areas should not be casually modified or treated as current source truth without deeper forensic review:

| Area | Reason | Evidence |
| --- | --- | --- |
| `repomix-packs/**` | Generated snapshots, not source. | `scripts/**/pack-*.ps1`; `docs/architecture-governance.md`. |
| `public/assets/vendor/**` | Vendor copies loaded by frontend. | `scripts/setup-highcharts-vendor.js`; `public/dashboard.html`. |
| `public/assets/maps/taiwan.json` | Static map data asset. | `public/assets/**` inventory. |
| `public/assets/avatars/**`, `public/images/**`, `public/favicon.svg` | Media/static visual assets. | `public/assets/**` and `public` inventory. |
| `node_modules/**` | Installed dependencies. | Top-level inventory and `package.json`. |
| Local environment/credential files | Sensitive runtime/local configuration surface. | Top-level inventory. |
| `docs/schema/**` | Reference/schema docs are not runtime proof by themselves. | `docs/schema/audit-logs-v1.sql` header. |
| Roadmap/report docs | Planning/report artifacts are not implementation authorization. | `docs/non-breaking-cleanup-roadmap.md`; `docs/repo-operational-consolidation-report.md`; `docs/forensics/wknd/rules.md`. |

## Evidence Gaps

| Gap | Status | Why It Remains |
| --- | --- | --- |
| Exact docs authority map | UNKNOWN | This task only identified docs categories; task 02 is dedicated to docs source mapping. |
| Archive document boundaries | UNKNOWN | Targeted filename search did not find a top-level archive path, but archive references appear in docs content. Task 02 should handle this. |
| Route/controller/service active ownership | UNKNOWN | `app.js` confirms route and service container entrypoints, but task 03/04/05 must map internals. |
| SQL vs legacy runtime data ownership | UNKNOWN | Both SQL and non-SQL data files exist; task 06 must trace callers and fallback behavior. |
| Frontend module ownership | UNKNOWN | `app.js` confirms `public` is served; SPA bootstrap and module ownership belong to tasks 07-12. |
| Whether all `scripts/**` are operationally current | UNKNOWN | Scripts were inventoried only where needed to classify generated/vendor outputs. |

## Recommended One Next Forensic Question

Which docs are current source-of-truth, which are roadmap/report/reference only, and which docs must be cross-checked against source before future work?
