# Weekend Forensics Acceptance & Planning Baseline

Project: TFC CRM / 新CRM修改中
Source Phase: Weekend Forensics Campaign
Status: Planning Baseline
Decision: ACCEPT_FOR_PLANNING_WITH_CAUTION

---

## 1. Purpose

This document converts the completed Weekend Forensics campaign into a planning baseline.

It summarizes which repo facts are safe to use for next-stage planning, which areas require caution, which areas remain UNKNOWN, and which boundaries must not be crossed by future ChatGPT / Codex / Jules / Gemini work.

This is not a cleanup plan.
This is not a patch plan.
This is not a refactor plan.
This is not deletion authorization.
This does not approve any next workstream by itself.

---

## 2. Evidence Chain

This baseline is derived from:

```text
docs/forensics/wknd/results/01-repo-boundary.md
docs/forensics/wknd/results/02-docs-source-map.md
docs/forensics/wknd/results/03-backend-route-auth-alias-map.md
docs/forensics/wknd/results/04-controller-service-endpoint-map.md
docs/forensics/wknd/results/05-service-container-di-map.md
docs/forensics/wknd/results/06-data-reader-writer-fallback-map.md
docs/forensics/wknd/results/07-spa-bootstrap-router-crmapp-map.md
docs/forensics/wknd/results/08-frontend-api-stale-cache-map.md
docs/forensics/wknd/results/09-frontend-heavy-module-map.md
docs/forensics/wknd/results/10-css-load-selector-ownership-map.md
docs/forensics/wknd/results/11-js-injected-css-common-ui-map.md
docs/forensics/wknd/results/12-charting-map-visualization-boundary.md
docs/forensics/wknd/results/13-cross-domain-llm-trap-review.md
docs/forensics/wknd/results/14-evidence-gap-closure-pass.md
docs/forensics/wknd/results/15-weekend-synthesis.md
docs/forensics/wknd/results/16-gemini-final-qa-summary.md
```

Gemini QA conclusion:

```text
ACCEPT_WITH_CAUTION_AND_KEEP_SPECIFIC_UNKNOWNS
```

Planning baseline decision:

```text
ACCEPT_FOR_PLANNING_WITH_CAUTION
```

---

## 3. What This Baseline Authorizes

This baseline authorizes:

* entering Planning Phase
* using Weekend Forensics reports as planning-quality evidence
* designing safer future Codex / Jules / Gemini prompts
* identifying future targeted forensic needs
* drafting repo-specific LLM operating rules
* discussing possible next planning directions
* creating planning options for later human approval

---

## 4. What This Baseline Does Not Authorize

This baseline does not authorize:

* source code changes
* cleanup patches
* deletion of files
* refactors
* migrations
* direct Codex patch execution
* direct PR creation
* CSS cleanup
* fallback removal
* charting-library removal
* route alias removal
* role/access-control changes
* classifying files as dead
* starting any specific workstream without separate approval

---

## 5. Planning-Safe Repo Facts

The following facts are safe to use as planning assumptions.

### 5.1 Repo Boundary

The repo contains multiple evidence categories that must be treated differently:

* active source code
* generated snapshots
* vendor assets
* map/data assets
* active governance docs
* roadmap docs
* archive/report docs
* schema / operational docs

Planning rule:

```text
Generated, vendor, archive, and roadmap files must not be treated as active source code.
```

---

### 5.2 Generated / Vendor Boundary

The following categories must not be edited by default:

* `repomix-packs/**`
* minified vendor libraries
* chart vendor assets
* map assets such as `taiwan.json`
* package lockfiles
* generated reports or snapshots

Planning rule:

```text
Generated and vendor files may be used for context, but future patch prompts must target original source files only.
```

---

### 5.3 Docs Boundary

The docs layer contains different authority levels.

Planning-safe distinctions:

* active governance docs define current working rules
* current-state indexes help route future investigations
* cleanup roadmaps are not implementation authorization
* archive/report docs are historical evidence unless current authority is proven
* migration records must be cross-checked against source before planning code changes

Planning rule:

```text
Future prompts must explicitly state which docs are source-of-truth for the target domain.
```

---

### 5.4 Backend DI / Service Wiring

`services/service-container.js` is safe to treat as the key runtime dependency-injection map for service and data-layer planning.

Planning-safe assumptions:

* service wiring is not safely inferred from filenames alone
* `data/index.js` must not be treated as the sole data-layer source of truth
* SQL readers/writers and legacy / RAW / Sheets dependencies coexist
* active wiring must be traced through service/container usage

Planning rule:

```text
Future backend prompts must trace app → routes → controller → service → DI → data dependency before planning changes.
```

---

### 5.5 SQL / Sheets / RAW / Legacy Coexistence

The repo is not purely SQL-only.

Planning-safe assumptions:

* SQL paths exist and are important
* Google Sheets / RAW / legacy paths also exist
* fallback and compatibility paths must not be assumed removable
* SQL-first does not mean all non-SQL code is dead

Planning rule:

```text
Legacy, RAW, Sheet, and fallback paths require targeted evidence before any cleanup, consolidation, or removal planning.
```

---

### 5.6 Frontend SPA / Global State

The frontend is a vanilla JS SPA with shared global state.

Planning-safe assumptions:

* `dashboard.html` is a page shell / loader, not the whole behavior owner
* `main.js`, `router.js`, `constants.js`, and `layout-manager.js` are central frontend coordination files
* `window.CRM_APP` is mutated across multiple files
* page modules must be mapped before planning changes

Planning rule:

```text
Future frontend prompts must identify page id, route, module owner, and CRM_APP interactions before patch planning.
```

---

### 5.7 Frontend API / Stale / Refresh Behavior

`public/scripts/services/api.js` and `CRM_APP.markStale` are planning-critical.

Planning-safe assumptions:

* `authedFetch` participates in centralized API behavior
* write operations may trigger stale invalidation
* stale / refresh behavior can affect performance and Render/runtime behavior
* refetch optimization is high-risk and needs endpoint-level evidence

Planning rule:

```text
Future API or performance prompts must explicitly preserve auth, stale invalidation, and page refresh semantics unless targeted evidence supports a change.
```

---

### 5.8 CSS / Common UI Boundary

CSS ownership is split.

Planning-safe assumptions:

* `public/styles/main.css` controls static CSS module import order
* module CSS files carry broad shared UI responsibility
* JS-injected CSS exists
* toast, pagination, notification, modal, theme, and shared UI helpers may live in JS
* static selector scan alone cannot prove selector removability

Planning rule:

```text
Future CSS prompts must separate static CSS, JS-injected CSS, dynamic class usage, and live DOM validation.
```

---

### 5.9 Charting / Map / Visualization Boundary

Charting is mixed-mode.

Planning-safe assumptions:

* Highcharts, Highmaps, ECharts, and Taiwan map data must be treated as distinct boundaries
* chart vendor files are not app logic
* migration docs do not override active source references
* Highcharts must not be treated as dead solely because ECharts exists

Planning rule:

```text
Future charting prompts must verify active source references and runtime needs before proposing chart-library changes.
```

---

### 5.10 Route / Auth / Role Boundary

Global route auth boundaries are evidenced, but controller-internal role behavior remains more sensitive.

Planning-safe assumptions:

* pre-auth routes exist
* global auth middleware exists
* route aliases and compatibility routes exist
* controller/service mapping can be statically traced
* deeper business visibility and role checks are not fully proven

Planning rule:

```text
Future auth/role prompts must include controller-level targeted forensic before planning any access or visibility change.
```

---

## 6. Use-With-Caution Areas

The following areas are usable for planning only with explicit caution.

| Area                             | Planning Status  | Required Caution                                                   |
| -------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Data fallback paths              | Use with caution | Runtime traffic is not proven                                      |
| Google Sheets / RAW dependencies | Use with caution | Do not assume removable                                            |
| CSS selector ownership           | Use with caution | Static evidence does not prove runtime cascade                     |
| JS-injected CSS                  | Use with caution | Live DOM specificity remains unknown                               |
| Chart migration                  | Use with caution | Active references and runtime rendering must be checked per target |
| Controller role logic            | Use with caution | Middleware auth is not the same as business visibility             |
| Heavy frontend modules           | Use with caution | Side effects and shared globals require task-specific tracing      |
| Cleanup roadmap docs             | Use with caution | Roadmap is not implementation authorization                        |

---

## 7. Remaining UNKNOWNs

The following must remain UNKNOWN until targeted evidence is collected.

### 7.1 Production Fallback Traffic

Still UNKNOWN:

* whether SQL fallback branches actually execute in production
* how frequently Google Sheets / RAW / legacy fallback paths are used
* whether fallback paths are only safety nets or operationally active

Rule:

```text
Do not remove, disable, or simplify fallback paths without runtime evidence or targeted forensic.
```

---

### 7.2 Browser CSS / DOM Cascade

Still UNKNOWN:

* final live browser specificity between static CSS and JS-injected CSS
* dynamic class application across modules
* interaction between responsive CSS, modal CSS, injected CSS, and page-specific states

Rule:

```text
Do not plan CSS cleanup from static evidence alone.
```

---

### 7.3 Controller Internal Role Logic

Still UNKNOWN:

* which controllers explicitly check `req.user.role`
* which controller methods enforce business visibility
* whether some visibility rules are frontend-only, backend-only, or mixed

Rule:

```text
Do not change role visibility or super_admin behavior without controller-level targeted forensic.
```

---

### 7.4 Runtime Chart Rendering

Still UNKNOWN:

* live rendering fidelity of ECharts / Highcharts / Highmaps
* runtime map data payload shape
* whether migration docs fully reflect current runtime chart behavior

Rule:

```text
Do not remove chart libraries or map assets based on static evidence alone.
```

---

### 7.5 Non-JSON API Response Behavior

Still UNKNOWN:

* non-JSON response handling inside `authedFetch`
* edge-case behavior for API wrapper errors
* UI consequences of failed parse / retry / stale invalidation sequences

Rule:

```text
Do not alter API wrapper behavior without targeted test or forensic evidence.
```

---

## 8. No-Touch / Caution Areas

The following must not be casually modified.

```text
repomix-packs/**
public/assets/vendor/**
public/assets/maps/taiwan.json
package-lock.json
generated reports
archive docs
roadmap docs
legacy route aliases
compatibility routes
fallback readers/writers
RAW data readers
Highcharts / ECharts vendor files
CSS shared modules
JS-injected CSS helpers
global CRM_APP state management
service-container DI wiring
```

No-touch does not mean never change.

It means:

```text
Do not change without targeted forensic, scoped plan, and human approval.
```

---

## 9. LLM Trap Map

Future AI work must avoid the following traps.

| Trap                                               | Why It Is Dangerous                                           | Safer Prompt Constraint                       |
| -------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| Treating generated Repomix files as source         | They duplicate source context and are not patch targets       | Always patch original source files only       |
| Treating roadmap docs as authorization             | Roadmaps are planning notes, not current commands             | Cross-check source and active governance      |
| Treating SQL files as replacing legacy files       | SQL and legacy paths coexist                                  | Trace runtime DI and callers                  |
| Treating `data/index.js` as data-layer truth       | Runtime wiring may bypass barrel exports                      | Use `service-container.js` and actual imports |
| Treating Highcharts as dead because ECharts exists | Both may be active                                            | Verify active references                      |
| Treating CSS selector collision as cleanup proof   | Static scan cannot prove unused selectors                     | Require DOM/class usage evidence              |
| Treating global auth as full role logic            | Business visibility may live in controllers/services/frontend | Trace controller role checks                  |
| Treating HTML as page behavior owner               | SPA behavior lives in JS modules                              | Map page id → route → module                  |
| Treating JS-injected CSS as duplicate CSS          | It may own runtime-only behavior                              | Map injection owner before changes            |
| Treating heavy modules as refactor targets         | They may contain intertwined side effects                     | Use targeted forensic first                   |

---

## 10. Repo-Specific Prompt Rules

Future Codex / Jules / Gemini prompts for this repo should include the following rules unless explicitly overridden.

### 10.1 Universal Rules

```text
Do not modify source files unless this is an approved patch task.
Do not classify anything as dead.
Do not recommend deletion from static evidence alone.
Do not assume legacy means removable.
Do not assume compatibility means removable.
Do not assume generated files are patch targets.
Do not assume roadmap docs authorize implementation.
Use UNKNOWN when evidence is incomplete.
Cite file paths for all non-obvious claims.
```

---

### 10.2 Backend Prompt Rules

```text
Trace route → controller → service → DI → data dependency.
Use services/service-container.js as the key DI map.
Do not treat data/index.js as sole truth.
Do not remove fallback/RAW/Sheet paths without targeted evidence.
Preserve compatibility routes unless explicitly approved.
```

---

### 10.3 Frontend Prompt Rules

```text
Identify page id, route, module owner, and CRM_APP usage.
Do not change CRM_APP globals without tracing callers.
Do not change authedFetch or markStale behavior without endpoint-level evidence.
Separate HTML shell, core bootstrap, router, layout, and page modules.
```

---

### 10.4 CSS Prompt Rules

```text
Separate static CSS from JS-injected CSS.
Do not infer unused selectors from static grep alone.
Do not modify global selectors without page impact review.
Do not modify responsive/modal/table/pagination styles without ownership map.
```

---

### 10.5 Docs Prompt Rules

```text
Identify active governance docs before using documentation as authority.
Treat roadmap/report/archive docs as evidence, not commands.
Do not rewrite governance docs unless the task is docs-only and explicitly approved.
```

---

## 11. Candidate Next Planning Directions

No next workstream is approved by this baseline.

The following are candidate planning directions only:

| Candidate Direction               | Purpose                                                              | Status         |
| --------------------------------- | -------------------------------------------------------------------- | -------------- |
| LLM-friendly repo operating guide | Turn forensics into reusable AI operating rules                      | Candidate only |
| Data layer planning map           | Summarize SQL / Sheets / RAW / fallback boundaries                   | Candidate only |
| Frontend SPA operating map        | Summarize page ownership and CRM_APP risks                           | Candidate only |
| CSS / common UI ownership map     | Summarize static CSS and JS-injected CSS responsibilities            | Candidate only |
| Runtime unknowns follow-up        | Target production fallback, DOM cascade, role logic, chart rendering | Candidate only |
| Heavy module prompt constraints   | Define safe future prompt boundaries for large modules               | Candidate only |

These are not approved tasks.
They are not cleanup authorization.
They are not patch authorization.

---

## 12. Next Planning Decision Pending

No immediate next workstream is approved by this document.

The next step is for the human owner and ChatGPT to review this accepted planning baseline and choose one next planning direction.

Before choosing, confirm:

* whether the goal is docs-only planning
* whether runtime evidence is needed
* whether the task should use Codex, Gemini, Jules, or ChatGPT only
* whether the output should be a repo document, prompt pack, or external planning note
* whether the task is still planning or is moving toward targeted forensic

This document intentionally stops before selecting a next task.

---

## 13. Final Planning Decision

The Weekend Forensics campaign has produced enough evidence to support Planning Phase.

Final decision:

```text
PROCEED_TO_PLANNING_PHASE
```

With restrictions:

```text
Do not proceed to cleanup.
Do not proceed to patching.
Do not proceed to deletion.
Do not proceed to refactor.
Retain runtime UNKNOWNs.
Use targeted forensic before changing high-risk areas.
Choose only one next planning direction at a time.
```

This baseline should be used as the guardrail for the next phase.
