---

# TFC CRM Architecture Governance

## Operational SaaS Governance Edition

## 2026-05 Workspace Productization Revision

## 2026-05 Activity Hub Lifecycle Governance Addendum

---

# 0. Governance Purpose

This document defines the mandatory engineering, architectural, product, and AI-collaboration governance rules for the TFC CRM project.

This is NOT:

* a coding style guide
* a generic frontend handbook
* a refactoring wishlist

This IS:

* operational architecture governance
* AI collaboration governance
* product-language governance
* repository safety governance
* visual hierarchy governance
* minimal-diff governance
* data lifecycle governance
* Activity Hub record governance
* system/audit record governance

All future:

* ChatGPT
* Gemini
* Codex
* AI copilots
* contributors

must follow these rules.

---

# 1. Core Product Direction

TFC CRM is NOT:

* a dashboard template
* a CRUD admin panel
* a Bootstrap ERP clone
* a generic SaaS starter
* a decorative SaaS demo
* a record dumping interface

TFC CRM IS:

* an Operational Workspace
* a CRM Intelligence Workspace
* a Manufacturing/Sales Operational SaaS
* a Human Workflow System
* a Meeting & Opportunity Intelligence Hub
* a structured business memory system
* a workflow continuity system

The UI philosophy is:

```text
Operational clarity
Structured hierarchy
Low-noise workspace
Information ownership
Human workflow continuity
Auditability where needed
```

NOT:

```text
Card explosion
Colorful dashboard
Marketing SaaS
Readonly form systems
Unbounded activity noise
Uncontrolled deletion
```

---

# 2. AI Collaboration Roles (MANDATORY)

## 2.1 User — Product Owner (Highest Authority)

The user owns:

* workflow direction
* layout direction
* operational rhythm
* UX judgment
* PASS / NG authority
* product feeling
* hierarchy judgment
* final business semantics
* final data lifecycle decisions

The user does NOT need to:

* debug selectors
* trace runtime ownership
* inspect DOM trees
* explain CSS architecture
* manually reason through backend DI / constructor order

The user's product judgment overrides:

* AI preferences
* generic UI trends
* optimization assumptions
* default SaaS conventions

---

## 2.2 ChatGPT — Architecture Governor

ChatGPT owns:

* architecture judgment
* governance enforcement
* prompt strategy
* scope control
* PASS / NG translation
* renderer boundary reasoning
* visual-language translation
* product semantics clarification
* data lifecycle strategy
* deciding whether a patch is safe enough to proceed

ChatGPT MUST:

* protect architecture
* avoid scope explosion
* enforce minimal diff
* distinguish runtime issues vs design issues
* preserve ownership boundaries
* decide PASS / NG based on evidence
* prevent Codex / Gemini from becoming product decision-makers

ChatGPT MUST NOT:

* redesign frozen layouts
* reinterpret user product decisions
* silently optimize unrelated systems
* enter speculative refactor mode
* replace product direction with generic SaaS trends
* delegate product strategy to Codex

---

## 2.3 Gemini — Repo Brain / Forensics Specialist

Gemini owns:

* repo tracing
* ownership tracing
* selector tracing
* payload tracing
* runtime tracing
* forensic analysis
* dependency tracing
* evidence-based route/controller/service/reader/writer mapping

Gemini MUST:

* provide evidence-first analysis
* cite exact ownership
* identify safe modification boundaries
* explain selector/runtime interactions
* identify no-touch files
* distinguish known facts from assumptions

Gemini MUST NOT:

* make final UX/product judgments
* make final data lifecycle judgments
* redesign architecture without instruction
* over-refactor
* optimize outside scope
* patch unless explicitly instructed

---

## 2.4 Codex — Repo Hands / Patch Executor

Codex owns:

* patch implementation
* minimal diff execution
* try & error prototyping
* syntax verification
* scoped UI iteration
* repo-local implementation details

Codex MAY be used as:

* read-only repo forensic scanner when Gemini quota is unavailable

Codex MUST:

* stay inside prompt scope
* avoid unrelated cleanup
* avoid broad rewrites
* return exact modified files and diffs
* run syntax checks
* report validation commands
* preserve hard no-touch boundaries

Codex MUST NOT:

* reinterpret product direction
* redesign hierarchy
* optimize architecture without instruction
* make final product strategy decisions
* decide data lifecycle policy
* assume DB columns
* patch when prompt says read-only

---

# 3. ZERO ASSUMPTION POLICY (Highest Engineering Rule)

No AI or contributor may assume:

* runtime behavior
* selector ownership
* constructor order
* DI order
* payload structure
* renderer ownership
* route ownership
* modal ownership
* CSS application
* hierarchy ownership
* database columns
* table relationships
* writer allowed columns
* reader DTO fields
* endpoint behavior
* cache behavior
* event report linkage

without evidence.

Every meaningful modification requires:

* source evidence
* runtime evidence
* selector evidence
* ownership evidence
* payload evidence
* DB schema evidence when relevant
* route/controller/service evidence when relevant

Never patch based on:

* memory
* intuition
* "probably"
* generic framework assumptions
* field names that merely look reasonable

Critical example:

```text
interactions.event_log_id does NOT exist.
Do not assume it.
Do not add logic that writes it.
Do not treat frontend fallback fields as DB schema.
```

---

# 4. Forensics-First Workflow

Before modification:

* inspect ownership
* inspect runtime flow
* inspect renderer boundaries
* inspect selector specificity
* inspect call sites
* inspect payload availability
* inspect schema if DB is involved
* inspect reader/writer mapping if persistence is involved
* inspect route ordering if backend endpoints are involved

Every forensic phase must clearly define:

* target files
* ownership questions
* forbidden changes
* expected output format
* PASS / NG criteria
* exact files/functions to cite

Forensics must separate:

* runtime failure
* selector conflict
* architecture failure
* visual execution failure
* data lifecycle failure
* schema mismatch
* stale UI state
* backend persistence failure

These are NOT the same problem.

---

# 5. Minimal Diff Governance

All modifications must:

* preserve architecture
* preserve ownership
* preserve stable systems
* preserve unrelated workflows
* preserve old flows unless explicitly deprecated
* preserve audit trail unless explicitly governed

DO NOT:

* opportunistically refactor
* "clean up nearby code"
* redesign unrelated UI
* rename broadly
* migrate patterns globally
* change old modal/list behavior while patching Activity Hub
* alter backend delete behavior unless explicitly scoped

Fix ONLY the scoped problem.

---

# 6. Layout Freeze Governance

When the Product Owner explicitly freezes a layout:

DO NOT change:

* grid structure
* left/right ratios
* section ordering
* narrative flow
* metadata structure
* density allocation
* panel hierarchy structure

After Layout Freeze:
ONLY these are adjustable:

* borders
* typography
* surfaces
* divider rhythm
* rendering strength
* contrast hierarchy
* spacing refinement

Architecture Governor MUST NOT:

* continue redesigning layout
* question frozen hierarchy
* reinterpret operational rhythm

---

# 7. Workspace vs Form Renderer Governance

Operational Workspace UI is NOT equivalent to:

* modal report renderer
* readonly form renderer
* disabled textarea system
* admin CRUD form

Legacy form semantics:

* info-item
* info-value-box
* report-section

must NOT automatically control:
Operational Workspace rendering.

Governance Rule:

```text
Modal Renderer
and
Operational Workspace Renderer

may share:
- formatters
- payload mapping
- utility helpers

but may NOT share:
- visual semantics
- DOM ownership
- layout assumptions
```

---

# 8. Editable Surface Language Governance

TFC CRM uses:
Editable Workspace Surface Language.

View mode MUST:

* preserve grouping
* preserve ownership
* preserve editable feeling
* preserve future inline-edit compatibility

View mode MUST NOT become:

* readonly textarea
* disabled form field
* heavy input control
* plain markdown article
* borderless document dump

Correct editable surface characteristics:

* soft surface ownership
* restrained boundaries
* subtle grouping
* non-input identity
* future transformability into edit mode

---

# 9. Strong Prototype First Governance

When hierarchy is unclear:

DO:

* establish strong ownership first
* establish visible hierarchy first
* establish structure clarity first

THEN:

* refine
* soften
* reduce noise
* tune subtlety

DO NOT:

* start with ultra-subtle refinement
* chase maturity before hierarchy exists

Weak hierarchy + subtle rendering =
muddy UI.

---

# 10. Anti-Color-Rail Governance

TFC CRM rejects:

* side color rails
* bottom color bars
* giant accent strips
* rainbow dashboard hierarchy
* oversized domain color zones

Hierarchy must primarily come from:

* spacing
* typography
* surface depth
* border ownership
* divider rhythm
* contrast hierarchy

NOT from:

* loud color accents
* decorative rails
* dashboard-style identity markers

Subtle tinting is allowed only when restrained.

---

# 11. L2 / L3 Hierarchy Governance

TFC CRM operational workspaces use:

## L1

Workspace Shell

## L2

Section Ownership Container

## L3

Editable Content Surface

Governance Rules:

L2:

* owns operational zones
* owns strong hierarchy
* owns section authority

L3:

* owns editable surfaces
* remains visually weaker than L2
* must not compete with L2 hierarchy

Forbidden:

* card explosion
* nested heavy cards
* every field becoming equal hierarchy

---

# 12. Structured Workspace Document Governance

Operational workspaces should feel like:

```text
Structured Workspace Document
```

NOT:

* pure forms
* pure dashboards
* pure articles

Correct direction:

* operational reading flow
* editable future
* grouped intelligence
* structured narrative
* workspace ownership

---

# 13. Typography Governance

Hierarchy must primarily rely on:

* font weight
* spacing
* divider rhythm
* contrast
* content density

NOT:

* giant colors
* giant borders
* excessive decorations

Section Title:

* strongest hierarchy

Field Label:

* muted and stable

Field Value:

* readable and operational

Narrative:

* readable
* breathable
* calm

---

# 14. Surface Governance

Surface hierarchy must distinguish:

* workspace shell
* section ownership
* editable surfaces
* maintenance state
* audit/system state

Correct surface layering:

* visible enough for ownership
* restrained enough to avoid dashboard noise

Avoid:

* giant shadows
* giant cards
* inset form feel
* heavy UI chrome
* loud maintenance banners unless required

---

# 15. Runtime Ownership Governance

Before patching UI, identify:

* actual DOM owner
* actual renderer owner
* actual injected CSS owner
* actual runtime lifecycle owner
* actual state owner
* actual event handler owner

Do NOT patch:
child selectors
when the problem belongs to:
parent ownership.

Do NOT patch:
frontend display
when the problem belongs to:
backend payload, reader mapping, or writer mapping.

---

# 16. Modal Isolation Governance

Modal renderers and inline renderers must remain isolated.

Inline workspace evolution must NOT:

* break modal rendering
* pollute modal semantics
* overload shared renderer assumptions
* force old modal delete/edit flows into Activity Hub

Activity Hub is the new inline-first operational flow.
Old modal/list flows may remain for compatibility but must not govern Activity Hub product behavior.

---

# 17. Prompt Governance

All Gemini prompts:

* English only
* copy-paste safe
* single-layer formatting
* no nested fences
* no fragile markdown structures

All Codex prompts:

* must clearly state whether read-only or patch
* must define allowed files
* must define hard no-touch files
* must define validation commands
* must define expected output format

All prompts must:

* define scope
* define forbidden areas
* define output format
* define safety checks
* define PASS / NG targets

Prompt header format is mandatory:

```text
【給 Gemini｜xxx forensic prompt｜不要 patch】

【給 Codex｜xxx read-only forensic｜只鑑識，不可修改 repo】

【給 Codex｜xxx minimal patch prompt｜可修改 repo】
```

---

# 18. Code Output Governance

Full file outputs MUST include:

* file path
* version
* date
* changelog
* comments

No omitted code allowed.

Minimal diff outputs MUST include:

* modified files
* exact diff summary
* verification results
* no-touch confirmations
* validation command results

No patch may be accepted without:

* modified file list
* scope confirmation
* syntax check result
* PASS / NG review by ChatGPT

---

# 19. No Preventive Optimization Governance

Do NOT:

* future-proof everything
* redesign systems early
* abstract prematurely
* generalize without need
* add admin controls before governance is defined
* expose cleanup functions just for testing convenience

Build only what current operational requirements justify.

Testing convenience must not weaken production governance.

---

# 20. Activity Hub Record Governance

Activity Hub is not a generic log dump.

Activity Hub contains multiple record classes:

```text
1. Effective Business Records
2. Maintenance Actions
3. System / Audit Records
```

## 20.1 Effective Business Records

Default visible records:

* lightweight interactions
* active event reports
* valid opportunity activity records

These belong in the normal Activity Hub timeline.

## 20.2 Maintenance Actions

Available only in:

```text
資料維護中
```

Maintenance mode may allow:

* deleting ordinary lightweight interactions
* voiding event reports
* showing system records

Maintenance mode must NOT allow:

* bulk destructive actions
* deleting system records
* deleting audit tombstones
* hard-deleting event reports
* bypassing backend verification

## 20.3 System / Audit Records

System records include:

* 作廢事件報告 tombstones
* system-generated delete/void records
* future audit records
* internal maintenance records

System records are:

```text
hidden by default
visible only through 顯示系統紀錄
viewable but not deletable
```

---

# 21. Activity Hub Management Mode Governance

Activity Hub maintenance state is named:

```text
資料維護中
```

NOT:

```text
Edit mode
Admin mode
Debug mode
```

Because it is a controlled data maintenance state, not an arbitrary editing state.

## 21.1 Header Behavior

Normal mode:

```text
新增互動
新增事件報告
展開事件報告 / 收合事件報告
管理
```

Management mode:

```text
新增互動
新增事件報告
展開事件報告 / 收合事件報告
顯示系統紀錄 / 隱藏系統紀錄
資料維護中
```

Rules:

* `顯示系統紀錄` appears only in management mode.
* exiting management mode resets system records visibility to hidden.
* management button should use restrained warning/danger styling when active.
* management mode must not rerender unnecessarily if that destroys expanded state, unless scoped rerender is explicitly safe.

---

# 22. Lightweight Interaction Lifecycle Governance

Lightweight interactions may be deleted only when:

```text
Activity Hub is in 資料維護中
interaction is not locked
interaction is not system-generated
interaction is not an event report
interaction is not a tombstone
```

Delete endpoint:

```text
DELETE /api/interactions/:id
```

Rules:

* use `interactionId`
* do not require `rowIndex`
* do not delete related event report rows
* do not allow system record deletion
* confirm before deletion

---

# 23. Event Report Lifecycle Governance

Event reports are formal CRM records.

They are NOT ordinary disposable UI records.

## 23.1 Forbidden

Activity Hub must NOT:

* hard-delete event reports
* call `DELETE /api/events/:eventId` for Activity Hub void/delete
* delete event partition rows for user-facing maintenance
* remove records without audit trace
* assume `interactions.event_log_id`

## 23.2 Required Lifecycle

Event reports use:

```text
Soft Void + Activity Hub Tombstone
```

Soft void means:

* event report row remains in DB
* `is_voided = true`
* void metadata is retained
* wrapper interaction becomes tombstone
* event_ref marker is removed
* normal timeline hides the tombstone
* system records view can show the tombstone

## 23.3 Soft Void Columns

All event report tables must support:

```text
is_voided
voided_at
voided_by
void_reason
voided_interaction_id
```

Applies to:

```text
event_logs_general
event_logs_iot
event_logs_dt
event_logs_dx
event_logs_summary
```

## 23.4 Activity Hub Void Endpoint

Activity Hub must use:

```text
POST /api/events/:eventId/void
```

NOT:

```text
DELETE /api/events/:eventId
```

Payload must include:

```text
interactionId
voidReason optional
```

Backend must:

* fetch existing event report
* fetch wrapper interaction
* verify wrapper contentSummary marker matches eventId
* update event report void fields
* update wrapper interaction to tombstone
* remove event_ref / event_log_id marker
* avoid fake wrappers
* avoid duplicate system interaction unless explicitly governed

---

# 24. Tombstone Governance

A tombstone is a visible audit placeholder for a voided operational record.

For voided event reports, tombstone content should be:

```text
已作廢事件報告：「EVENT_NAME」
```

Tombstone records:

* are system/audit records
* are hidden in normal mode
* are visible through 顯示系統紀錄
* are not expandable
* are not editable as event reports
* are not deletable
* must not contain visible event_ref markers
* must not contain visible event_log_id markers

A tombstone must not render as:

* active event report card
* editable event report
* broken link
* old modal link

---

# 25. System Records / Audit Trail Governance

System records are part of governance, not clutter.

Rules:

```text
System records may be hidden from normal workflow.
System records must remain traceable.
System records must not be casually deleted from UI.
```

Formal UI rule:

```text
System records are viewable but not deletable.
```

Testing-stage exception:

```text
During development/testing, the Product Owner may manually clean test data directly in DB.
Do not expose production UI controls to delete audit/system records merely for test convenience.
```

Do NOT add:

* clear system records button
* delete tombstone button
* bulk cleanup UI
* test cleanup UI in production workspace

unless explicitly governed as admin-only or environment-only.

---

# 26. Event Module Product Boundary Governance

Event reports are no longer treated as a primary standalone module by default.

Current direction:

```text
Event reports are context records.
Primary creation should happen inside:
- Opportunity Detail / Activity Hub
- future Company Detail context if needed
```

Global event list / global event create may be:

* deprecated
* hidden
* downgraded
* moved to internal/audit lookup

but must NOT be deleted without forensics.

Before hiding or downgrading global event entry points, perform read-only forensic to identify:

* global event button locations
* event list entry points
* old modal dependencies
* event editor dependencies
* Activity Hub dependencies
* navigation/sidebar references
* dashboard references

Allowed product direction:

```text
Hide or downgrade global event UI entry.
Preserve backend and old files until dependencies are proven removable.
```

Forbidden:

```text
Delete event module files directly.
Remove routes without dependency analysis.
Break Activity Hub inline create/edit/void.
```

---

# 26.1 Accepted Opportunity Detail / Activity Hub Baselines (2026-05)

These baselines record accepted Opportunity Detail and Activity Hub behavior from the current workspace refinement cycle.

## 26.1.1 Event Module Primary Entry Downgrade

Event reports are no longer treated as a primary top-level module.

Primary event report workflow is contextual:

```text
Opportunity Detail / Activity Hub
```

Global event list and global create-event entry points may be hidden or downgraded.

Do NOT delete:

* event module files
* backend routes
* modal manager
* legacy event infrastructure

without separate forensic approval.

Activity Hub inline event report creation must remain intact.

## 26.1.2 Activity Hub Visual Hierarchy Baseline

Accepted visual hierarchy:

* muted gray-green = lightweight CRM interaction / general activity
* purple = formal event report / structured report
* neutral gray-white = secondary metadata such as event category/type
* subdued gray = system records / void / tombstone / audit-like records

Rules:

* `新增互動` uses muted gray-green.
* `新增事件報告` uses purple.
* lightweight interaction badges use muted gray-green.
* main event report badges use purple.
* event category/type metadata badges should stay neutral.
* system / void / tombstone records must stay subdued.

## 26.1.3 Right Rail Event Report List Baseline

The right-side event report list is a compact index, not a timeline clone.

It must keep the original structure:

```text
date
title badge + actor
divider
```

Do NOT split it into separate `事件報告` and `IOT/DT/DX` badges.

The single title badge uses restrained purple styling.

The title badge font weight is `400`.

## 26.1.4 Opportunity Detail Data / Label Consistency Baseline

Same-company potential contacts must not show contacts already linked in `關聯聯絡人`.

`PotentialContactsManager` must honor `comparisonList` / `comparisonKey` in opportunity context.

Potential specification chips must filter numeric artifact keys such as invalid `0` while preserving valid configured options such as `SDTM` and `技術服務(一般)`.

Accepted label changes:

```text
Main card:
商務脈絡 -> 客戶與銷售脈絡

Right rail:
商務脈絡 -> 商務關聯紀錄
```

## 26.1.5 Activity Hub Width Baseline

Event report cards may use content-fit behavior with readable min/max bounds.

Lightweight interaction rows should be narrowed by adjusting the whole micro row width, not by only constraining the text/copy layer.

When tuning lightweight interaction width:

* do not alter time / actor / edit icon placement
* do not change event report width

## 26.1.6 Opportunity Detail Typography Baseline

The top `機會名稱` label is the benchmark for peer card/widget section titles.

Peer section/widget titles include:

```text
機會進程
基本資訊
客戶與銷售脈絡
商機概況
關鍵日期
備註
動態牆
關聯聯絡人
商務關聯紀錄
同公司潛在聯絡人
事件報告列表
```

These titles should match the small restrained `機會名稱` label style.

They must not be larger, bolder, or more visually dominant than the benchmark.

Do NOT confuse this with the large opportunity name value/title.

## 26.1.7 Opportunity Detail Stepper UI Baseline

The current Opportunity Detail stepper UI is accepted and must be preserved unless a separate approved forensic authorizes a change.

Accepted behavior and style:

* view mode edit action is a lightweight pencil icon next to the stepper title
* edit mode Save / Cancel actions are lightweight and may remain right-aligned
* edit-mode hint text stays low-noise
* edit-mode hint text refers to square / box / status icons, not circles
* no behavior, data, or API changes are implied by stepper visual adjustments

Do not replace the current stepper with a heavier modal-first, card-heavy, or behavior-changing workflow.

---

# 27. Current Workspace Productization Status (2026-05)

Current Activity Hub status:

PASS:

* expanded-event-shell ownership
* inline workspace renderer separation
* dual-column workspace
* grouped metadata strip
* L2 section ownership
* soft editable L3 direction
* modal isolation
* lightweight interaction isolation
* management mode
* lightweight interaction delete
* expand/collapse event reports
* soft void schema
* event report soft void endpoint
* wrapper tombstone
* system records visibility toggle

LOCKED:

* Activity Hub inline-first direction
* management mode semantics
* system records view-only rule
* event report soft void over hard delete
* no `interactions.event_log_id`
* no Activity Hub hard delete via `DELETE /api/events/:eventId`

Current refinement stage:

* regression testing
* navigation downgrade for event module
* global event entry review
* event list dependency forensic

NOT:

* architecture redesign
* renderer redesign
* layout redesign
* hard delete implementation
* system record delete UI

---

# 28. Runtime Ownership Governance for Activity Hub

Before changing Activity Hub:

identify:

* `_interactions` ownership
* `_eventReportCache` ownership
* `_expandedReports` ownership
* `_isManagementMode` behavior
* `_showSystemRecords` behavior
* event report wrapper classification
* system record classification
* tombstone rendering path

Rules:

* event reports are identified by current event report predicates, not by DB `event_log_id`
* tombstones must not pass event report predicates
* system records must be hidden unless explicitly shown
* management mode must not silently mutate business records
* UI state must match backend state after F5 refresh

---

# 28.1 Operational Prompt / Validation Governance Addendum (2026-06)

This addendum records current operating rules for small patches, documentation consolidation, and AI-assisted repo work.

Scope precision is more important than prompt length. Small patches require especially precise scope because their risk is usually hidden in selector ownership, runtime ownership, and nearby shared behavior.

Micro / small patch prompts must define:

* exact target
* allowed file or files
* exact symbols, selectors, functions, or records to change or remove when applicable
* explicit preserve list
* no unrelated inspection unless the prompt explicitly asks for forensics
* no browser, server, login, session, or localhost tests by default
* stop after static validation

Default Codex validation boundary:

* no browser UI tests unless explicitly requested
* no local server start or restart
* no localhost port occupation
* no login, session, or localStorage workaround
* user performs browser / UI visual validation manually
* Codex runs static validation only unless explicitly requested

Default static validation:

* `node --check` for changed JavaScript files only
* `git diff --check`
* `git diff --name-only`
* targeted grep only when useful to prove ownership, call sites, or cleanup readiness

Role boundaries:

* Gemini is read-only repo forensics when owner, data flow, or risk is unclear; Gemini must not patch unless explicitly authorized.
* Codex is a precise repo patch executor; Codex is not the product judge and not the visual judge.
* The user is the final product authority, performs local browser / UI visual validation, and provides screenshots when needed.
* ChatGPT is the architecture governor, PASS / NG judge, scope strategist, and prompt strategist.

Reference docs:

* `docs/tfc-crm-ui-style-governance.md` defines current UI style governance and the Dashboard / Opportunity Detail dual baselines.
* `docs/supabase-access-sop.md` defines current Supabase access posture and future table-access SOP.

## Repository Scan Sequence / Token Boundary Governance

Every Gemini/Codex CRM task must first read the Always Read Baseline Docs.

`docs/repo-scan-boundary.md` is the authoritative scan-boundary policy. The scan-boundary policy protects core docs from being skipped.

After reading baseline docs, agents must apply scan boundaries and inspect only targeted owner files.

Generated snapshots, vendor libraries, static map data, lockfiles, binary assets, and packaging scripts must not be read by default.

Do not duplicate the entire repo-scan-boundary policy inside `docs/architecture-governance.md`.

## Phase Handoff Documentation / Changelog Governance

Every phase handoff or major checkpoint must include a docs-update evaluation.

Relevant repo docs should be updated only when governance, architecture baseline, scan boundary, UI baseline, Supabase/security posture, cleanup/no-touch rules, or current repo state meaningfully changed.

Small patches do not automatically require docs updates.

Changed governance docs must include or update a changelog entry with the date, summary of governance change, and scope.

Governance doc updates should be docs-only patches unless explicitly authorized. Source-code changes and governance-doc changes should not be mixed by default.

---

# 28.2 Product Cost / Opportunity Spec Governance Addendum (2026-06)

This addendum records the accepted Product Cost and Opportunity Detail specification behavior after the Product Cost migration.

## 28.2.1 Product Cost sheet mapping

The active Product Cost opportunity-spec fields are:

```text
L = oppSpecOption
M = oppDisplayCategory
N = oppDisplayOrder
O = oppBehaviorMode
P/Q/R/S/T/U/V continue as aspect / description / status / creator / createTime / lastModifier / lastUpdateTime
```

Old supplier / series / interface / property fields are no longer the active L/M/N/O mapping.

## 28.2.2 Opportunity specs endpoint

Opportunity Detail edit mode uses:

```text
GET /api/products/opportunity-specs
```

This is a lightweight Product Cost endpoint for possible-spec options. It returns opportunity spec data only, filters active products by status and truthy `oppSpecOption`, and must not return or expose cost.

## 28.2.3 Opportunity Detail possible specs

Accepted behavior:

* edit mode loads possible-spec options from `/api/products/opportunity-specs`
* selected product-backed specs are stored by product id in `potentialSpecification`
* legacy raw keys may remain display-safe and are not automatically migrated
* view mode hydrates product ids into product label / name / spec
* view hydration updates only the small specs tag area
* do not perform unsafe post-fetch full DOM rewrites
* do not call a post-fetch full-page `OpportunityInfoView.render(opp)` rewrite for this hydration

Legacy `systemConfig` fallback is allowed only for option availability safety. It is not the pricing source for product-id specs.

## 28.2.4 Opportunity spec price rule

Product-id possible specs use sales-model pricing:

```text
MTB / via MTB -> priceMtb
SI / via SI -> priceSi
direct / direct sale / MTU / fallback -> priceMtu
```

If the selected sales-model price is missing, blank, null, undefined, NaN, or non-numeric, fallback to `priceMtu`.

If `priceMtu` is also missing or non-numeric, fallback to `0`.

Rules:

* never use cost
* never fallback to `systemConfig['possible spec'] value2` for product-id specs
* legacy unknown keys calculate as `0`

## 28.2.5 Product Cost management page baseline

The active Product Cost management UI is a compact flat table.

Accepted current behavior:

* no active category grouped sections
* no active category chip wall / drag UI
* no active popup/detail modal edit path
* `ProductDetailModal` may remain in the repo but is not the active table edit path
* inline edit uses global edit mode and batch save
* Product ID, cost, opportunity spec option badge, and action column are not shown in the main table
* category badge uses `oppDisplayCategory` only
* product name and spec are single-line ellipsis
* MTB / SI / MTU prices use restrained colored badges
* status badges distinguish active, inactive, and unknown states

Editable inline fields:

```text
name
spec
priceMtb
priceSi
priceMtu
oppDisplayCategory
status
```

Linked hidden behavior:

* `oppDisplayCategory` syncs into hidden `category`
* active status syncs hidden `oppSpecOption` to `TRUE`
* inactive status syncs hidden `oppSpecOption` to `FALSE`
* new rows default active and `oppSpecOption = TRUE`
* new rows use `oppDisplayOrder = max valid oppDisplayOrder + 1`
* existing rows preserve hidden `oppDisplayOrder`
* `saveAll`, dirty-check, and payload shape remain on the existing batch path

## 28.2.6 Product Cost display ordering

Product Cost visual ordering is frontend-only.

Rules:

* do not change Sheet row order
* do not shift other rows' `oppDisplayOrder`
* do not persist visual ordering
* unsaved `_isNew` rows render at the top
* saved products are visually grouped by `oppDisplayCategory`
* category group order is determined by the smallest valid numeric `oppDisplayOrder` in that group
* within a group, products sort by their own numeric `oppDisplayOrder` ascending
* missing or non-numeric `oppDisplayOrder` sorts after numeric values within the group
* `this.allProducts` must not be mutated for display sorting
* product objects must not be mutated for display sorting
* `saveAll` remains `data-index` compatible

Previous category-order backend and chip-wall drag behavior may remain in code, but it is legacy / inactive for the current Product Cost table ordering model.

---

# 28.3 Cleanup Checkpoint And Compatibility Governance Addendum (2026-06)

This addendum records completed non-breaking cleanup and the mandatory order for future cleanup work.

Completed cleanup:

* Service container unused Sheet DI cleanup removed unused active DI imports / objects from `services/service-container.js`: `AnnouncementReader`, `AnnouncementWriter`, `WeeklyBusinessWriter`, `announcementReader`, `announcementWriter`, `weeklyWriter`, and `weeklyBusinessWriter`.
* Follow-up orphan SPA page module cleanup removed unreachable `loadFollowUpPage()` and `window.CRM_APP.pageModules['follow-up']` from `public/scripts/opportunities/opportunities.js`.
* Product Cost hidden chip-wall frontend cleanup removed hidden chip-wall markup and unreachable drag/reorder helpers from `public/scripts/products/products.js` and `public/views/product-list.html`.

The cleanup above did not authorize broader deletion. Protected areas remain protected:

* data adapter files
* routes / controllers / backend services
* Product Cost Sheet dependency and L/M/N/O mapping
* `/api/products/opportunity-specs`
* backend `/api/products/category-order`
* `SystemPref`
* `ProductDetailModal`
* `openDetailModal()`
* `loadCategoryOrder()`
* `this.categoryOrder`
* Dashboard follow-up logic and `/api/dashboard`
* Opportunity List, Opportunity Detail, and Activity Hub
* compatibility aliases such as `eventLogReader` and `contactCoreReader`

Future cleanup must follow this order:

```text
read-only forensic
PASS / NG review
exact minimal patch boundary
no broad deletion
runtime validation by static checks first
user / ChatGPT approval before removing compatibility or fallback paths
```

Do not remove Google Sheet fallback broadly.

Current Sheet-backed / compatibility domains that must remain protected:

* Product Cost Sheet
* RAW contacts
* LINE leads RAW flow
* System Config / Auth system config and users
* Weekly Business read fallback
* Internal Ops
* event-log legacy adapters unless separately proven removable

Highcharts remnants must not be deleted until event charts are migrated and all Highcharts callers are proven removed.

`ProductDetailModal` must not be deleted until separately approved.

`repomix-packs/**` are generated snapshots and must not be hand-edited.

Pending cleanup targets:

* `ProductDetailModal` reachability / removal-readiness
* final Product Cost `loadCategoryOrder()` / `categoryOrder` / `openDetailModal()` dependency review
* backend `/api/products/category-order` cleanup only after frontend no longer calls it
* Meeting / Calendar hidden workflow ownership decision
* LINE leads standalone page ownership decision
* System status modal / API trigger audit
* Event charts Highcharts to ECharts migration forensic
* `services/index.js` retired factory audit
* `data/index.js` legacy export audit
* Google Sheet fallback domain-by-domain SQL replacement roadmap

---

# 29. Internal Ops Dev Projects Governance Baseline

Internal Ops / Dev Projects / 進度追蹤 BETA is governed as an accepted Sheet-backed operational module.

Current visible section title:

```text
各種類型案件追蹤
```

Dev Projects remains Google Sheet-backed. The accepted Dev Projects range is `A:U`, where column `U` is `案件關係`. The semantic field for `案件關係` is `caseRelationType`.

Compatibility keys remain part of the active contract and must not be removed or renamed without separate migration approval:

```text
productCode
productName
projectName
featureName
assigneeCode
assigneeName
devStage
status
dependencies
notes
```

Semantic aliases exist for current UI language and new reasoning where applicable:

```text
caseCategory
caseName
opportunityName
relatedFeature
opportunityId
ownerName
caseStage
caseStatus
parentDevId
```

The accepted title-level controls are:

```text
顯示方式 [案件導向] [人員導向]
```

`案件導向` may show display-only grouping controls:

```text
分組 [不分組] [案件分類] [案件狀態]
```

Grouping is display-only. It must not filter, hide, remove, mutate, or persist row order. Grouping applies only to `案件導向`, respects system setting order where available, and keeps `封存案件` as a separate bottom group regardless of grouping mode.

Case-oriented view (`案件導向`) is grouped by `parentDevId` / `dependencies` for same-section hierarchy only. Only a two-level hierarchy is accepted. Child cases show `↳` and the relation badge inside the `案件名稱` cell when parent and child are in the same display section/group. Cross-section or cross-group child rows render as normal top-level rows without orphan/missing-parent warning. In normal mode, clicking the case name expands read-only notes. In maintenance mode, clicking the case name opens inline edit.

Dev Projects create/edit is inline. Popup modal behavior is no longer the governing Dev Projects UX, even if compatibility code remains elsewhere. Notes are included in create/edit payloads and must not be removed during UI cleanup.

Maintenance boundary:

* normal mode is read-only except note expansion
* maintenance/action mode enables editing
* delete appears only inside the expanded editor in maintenance mode
* progress `>= 100` locks status to `已完成`
* `已完成` remains in the normal main list for observation
* `封存` is a separate manual lifecycle state
* the archive checkbox appears in expanded edit mode when progress is 100% or current status is `封存`
* checked archive saves `封存`; unchecked archive restores `已完成` when applicable

Member-oriented view (`人員導向`) is a title-level tab beside `案件導向`. It must not show `分組` controls. It is grouped by person, uses the same list language as `案件導向`, and is read-only. Member rows use `↳ [主負責] case name` or `↳ [協作] case name`.

`人員導向` has one global detail control only:

```text
明細 [收合明細] / [展開明細]
```

The default member detail mode is expanded. Expanded mode shows member workload summary plus detail rows. Collapsed mode may hide detail rows globally, but must preserve member headers and summary counts. Do not add per-member expand/collapse state, row-level member toggles, localStorage, or URL state.

Dev Projects `人員導向` workload logic is aligned with the original lower `團隊成員工作負荷` baseline. The standalone lower `團隊成員工作負荷` block is retired from the Internal Ops page layout, but `public/scripts/internal-ops/internal-ops-team-workload.js` remains as historical/reference logic and must not be treated as deleted.

---

# 30. Final Governance Principle

If the UI starts feeling like:

* Bootstrap admin
* readonly CRM form
* dashboard widget wall
* rainbow SaaS template
* uncontrolled log dump
* ungoverned delete console

STOP.

TFC CRM must always feel like:

```text
A restrained operational workspace
for real human workflows,
with controlled maintenance,
clear auditability,
and disciplined data lifecycle governance.
```

---

# Changelog

## 2026-06-09

* Added phase handoff documentation and changelog governance.
* Clarified that repo docs are updated only when governance, architecture baseline, scan boundary, UI baseline, Supabase/security posture, cleanup/no-touch rules, or current repo state meaningfully change.
* Confirmed governance doc updates should normally be docs-only patches.
