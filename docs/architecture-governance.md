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
* product direction
* layout direction
* operational rhythm
* UX judgment
* PASS / NG authority
* final QA ownership
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

* strategy
* architecture judgment
* governance enforcement
* prompt strategy
* scope control
* Scope Freeze ownership
* PASS / NG translation
* PASS / NG judgment
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

Gemini is an evidence-only forensics role. Gemini is not a strategy, planning, recommendation, product direction, or final patch-plan authority.

Gemini MUST:

* provide evidence-first analysis
* cite exact ownership
* identify safe modification boundaries
* explain selector/runtime interactions
* identify no-touch files
* distinguish known facts from assumptions
* return owner files, functions/selectors, current behavior, repo evidence, constraints, shared/cross-page risks, minimum touch points, forbidden files, and stop conditions when requested

Gemini MUST NOT:

* make final UX/product judgments
* make final data lifecycle judgments
* redesign architecture without instruction
* decide product strategy
* decide UI design direction
* provide final patch plans
* provide implementation code unless explicitly authorized
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

Codex is a minimal patch executor only. Codex is not a repo exploration tool, architecture strategist, product strategist, or recommendation authority unless explicitly instructed for a read-only forensic task.

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

* file names
* doc locations
* current implementation
* runtime behavior
* selector ownership
* owner functions
* constructor order
* DI order
* payload structure
* renderer ownership
* route ownership
* modal ownership
* CSS application
* CSS specificity
* CSS load order
* hierarchy ownership
* database columns
* DB constraints
* table relationships
* writer allowed columns
* reader DTO fields
* endpoint behavior
* cache behavior
* event report linkage
* validation state
* tool scope

without evidence.

Every meaningful modification requires:

* source evidence
* runtime evidence
* selector evidence
* ownership evidence
* payload evidence
* DB schema evidence when relevant
* route/controller/service evidence when relevant

No repo owner decision may be made without repo evidence. Scope Freeze must be based on explicit repo evidence or user-provided facts.

Never patch based on:

* memory
* intuition
* "probably"
* generic framework assumptions
* field names that merely look reasonable

If evidence is missing, the correct next step is evidence-only forensics or asking the user for repo output, not patching.

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

Before every Codex patch, ChatGPT must freeze:

* what this patch solves
* what this patch does not solve
* success criteria
* allowed files
* forbidden files
* allowed selectors/functions when applicable
* forbidden behavior changes
* validation
* report format
* stop conditions

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

Forensics is evidence gathering, not a mandatory repeating ceremony. One evidence pass is sufficient when ownership is known, the runtime symptom is confirmed, scope is frozen, product semantics are already decided, and the safe implementation boundary is evidenced. At that point, proceed to the scoped implementation and proportional validation.

Additional forensic passes are required only when a new evidence gap materially blocks safe implementation. Do not require a loop of forensics, planning, more forensics, implementation planning, and more forensics for an already-understood task. This rule preserves ZERO ASSUMPTION: it changes the number of redundant passes, not the evidence standard.

When a feature previously reached Runtime/Product PASS and becomes NG after performance optimization:

1. identify the first contract divergence;
2. reconnect the original reusable contract;
3. prefer minimal alignment with the optimized data path;
4. do not redesign the feature;
5. do not introduce field- or activity-specific hardcoding;
6. do not broaden the repair into a new architecture workstream unless evidence requires it.

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
* evidence-only by default
* ask only for owner files, functions/selectors, current behavior, repo evidence, constraints, shared/cross-page risks, minimum touch points, forbidden files, and stop conditions
* must not ask Gemini for product strategy, UI design direction, final patch plans, or implementation code unless explicitly authorized
* must use English in the main body for repo forensics prompts
* remain read-only for repo forensics unless explicitly instructed otherwise

All Codex prompts:

* must clearly state whether read-only or patch
* must define task type
* must define allowed files
* must define hard no-touch files
* must define product decision
* must define repo evidence
* must define patch requirements
* must define non-goals
* must define validation commands
* must define expected output format
* must define stop conditions
* must be strict minimal patch prompts with explicit allowed files, forbidden files, non-goals, hard stop conditions, and validation commands
* must not include future-phase roadmap text or out-of-scope future tasks

All prompts must:

* define scope
* define forbidden areas
* define output format
* define safety checks
* define PASS / NG targets
* have agreed scope before Codex patch prompts are sent
* use a second targeted placement forensic before Codex when a Gemini report identifies candidate docs but lacks exact placement / section evidence

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

System-record rows must remain readable audit rows. They must show their content, time, and recorder, but must not render the generic locked-row `View` action in Activity Hub. This cleanup is render-level removal, not CSS hiding.

Do NOT:

* hide the generic `View` action with CSS.
* globally remove or change `showForEditing()`.
* remove Event Report inline `撅?`.
* remove or change normal interaction edit behavior.
* delete shared modal code, `showEventLogReport()`, or backend endpoints.

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

## 21.2 Live State Sync

Management mode is live UI state, not a page rerender contract.

If an Event Report edit form is already open, entering management mode must immediately make `?潛???` editable. Leaving management mode must immediately make `?潛???` readonly again.

Rules:

* live sync is DOM-only.
* unsaved draft fields must be preserved.
* do not rerender the inline report solely to toggle this state.
* do not change save behavior, permission logic, or void behavior as part of this toggle.

## 21.3 Header Helper Hint

Activity Hub may show this helper hint inside `.activity-hub-header-actions`, immediately before `?啣?鈭?`:

```text
?亥?雿誥鈭辣?勗??楊頛舐????隢??脣蝞∠?蝬剛風璅∪??
```

The hint is guidance text only. It must not become permission logic.

Rules:

* keep it single-line / no-wrap.
* vertically align it with toolbar buttons.
* preserve the existing toolbar action order.

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

## 23.5 Timeline Time And Sorting Source

Event Report rows use the child Event Report `createdTime` as the timeline / occurrence time. Normal interaction rows use the parent `interactionTime || createdTime`.

Header time, expanded detail time, date grouping, and sorting must align to the same timeline-time source. Event Report expanded detail labels this time as `?潛???`.

Activity Wall sorting policy:

* sort local row copies by `_getInteractionTimelineTime()`.
* Event Report rows sort by child event `createdTime`.
* normal rows sort by parent `interactionTime || createdTime`.
* do not mutate the source row collection just to display timeline order.

Do NOT solve this policy with:

* a DB view.
* backend DTO enrichment for data already available to the Activity Wall.
* syncing child Event Report `createdTime` into parent `interactionTime`.

## 23.6 Timestamp Contract

Chronological CRM timeline ordering is the primary product goal for Activity Wall Event Report handling.

For this context, Event Report `createdTime` is a timeline timestamp. It is not governed as customer-site wall-clock preservation.

Timestamp rules:

* DB `timestamp without time zone` is treated as UTC-naive for timeline / system timestamps.
* frontend display uses the viewer/browser local timezone.
* `<input type="datetime-local">` shows local time to the user.
* inline Event Report create/update must convert datetime-local values to UTC ISO before sending.
* existing bad historical rows are not migrated or backfilled by this frontend governance work; known bad rows may be manually corrected.

Do NOT:

* change global `formatDateTime` for this issue.
* add an Event Report wall-clock-specific formatter for this completed policy.
* add migration/backfill as part of this frontend governance work.

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

## 26.1.8 Opportunity List Sorting and Display Baseline

Accepted behavior:

* Opportunity list sorting is parent-child lineage group based.
* Parent-child groups must not be flattened to solve sorting.
* If any opportunity inside the same `lineage_root_id` group has the newest direct business-related activity, the whole group moves to the top.
* Group sorting uses `lineage_group_latest_activity` / `lineageGroupLatestActivity`.
* Each visible row displays its own `row_activity_time` / `rowActivityTime`.
* Parent rows must not display child row activity time unless the parent row itself has that activity time.
* The display fallback is `effectiveLastActivity` only when `rowActivityTime` is unavailable.
* `effectiveLastActivity` must not be globally overwritten to mean group latest activity.
* `audit_logs` must not be used as the opportunity list sorting source.

Data model notes:

* `row_activity_time` is the per-opportunity business activity timestamp.
* `lineage_group_latest_activity` is the max `row_activity_time` within the same parent-child lineage group.
* Related activity tables must be pre-aggregated before joining into the opportunity view to avoid duplicate opportunity rows.

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
* Gemini repo forensics prompts should use English in the main body.
* Codex patch prompts must stay strict, minimal, scoped, and free of future-phase roadmap tasks.
* If documentation placement remains uncertain after first forensics, run a second targeted placement forensic before asking Codex to patch docs.

Reference docs:

* `docs/tfc-crm-ui-style-governance.md` defines current UI style governance and the Dashboard / Opportunity Detail dual baselines.
* `docs/supabase-access-sop.md` defines current Supabase access posture and future table-access SOP.

## Repository Scan Sequence / Token Boundary Governance

Necessary Docs Only / Task-tiered Docs Reading replaces the old Always Read Baseline Docs requirement.

Reading docs is not free and can waste Gemini/Codex usage. Gemini and Codex must not be required to read all baseline `.md` files by default.

Micro patches should usually rely on ChatGPT Scope Freeze and targeted repo evidence.

Small patches may read only directly relevant docs when needed.

Architecture, cross-module, and governance tasks may read necessary governance docs, but still only the minimum relevant set.

Unknown-scope tasks should use Gemini evidence-only owner/selector/function forensics before Codex patching.

Docs are governance references, not mandatory input for every task. The old pattern "always read all baseline docs before patching" is deprecated.

`docs/repo-scan-boundary.md` remains a governance reference for scan-boundary policy when that policy is directly relevant.

After necessary docs or targeted evidence are identified, agents must apply scan boundaries and inspect only targeted owner files.

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
* Activity Wall system-record cleanup removed the generic locked-row `View` action at render level while preserving system-record content, time, recorder, Event Report inline `撅?`, normal interaction edit behavior, `showForEditing()`, `showEventLogReport()`, shared modal code, and backend endpoints.
* Highcharts / Highmaps full retirement completed on 2026-07-06 with UI/Product PASS. Event charts dormant module removal, source-level Highcharts cleanup, Highcharts module removal, residual `@highcharts` cleanup, and browser smoke all passed. Highcharts is no longer an active runtime, loader, vendor, npm package, setup script, or `node_modules` dependency.

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
* shared modal code, `showEventLogReport()`, and Event Report backend endpoints
* `showForEditing()` global behavior

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
* Dormant RAW Sheet reader/writer compatibility code until a separate retirement audit proves it removable
* LINE leads route compatibility while CRM RAW runtime resolves through SQL
* System Config / Auth system config and users
* Weekly Business read fallback
* Internal Ops
* event-log legacy adapters unless separately proven removable

Highcharts / Highmaps retirement is complete. Historical Highcharts mentions in docs are `DOC_HISTORY_ONLY` unless future runtime/package evidence proves otherwise. Do not reintroduce Highcharts without an explicit new product/architecture decision.

`ProductDetailModal` must not be deleted until separately approved.

`repomix-packs/**` was generated AI context output. It is not source-of-truth, not runtime source, and should not be version-controlled. Regenerate it locally through `scripts/**/pack-*.ps1` only when needed; keep generator scripts for now.

Removing tracked `repomix-packs/**` does not authorize runtime source cleanup, docs archive deletion, fallback removal, charting cleanup, CSS cleanup, route cleanup, SQL-only migration, or removal of other generated/vendor/archive areas.

Pending cleanup targets:

* `ProductDetailModal` reachability / removal-readiness
* final Product Cost `loadCategoryOrder()` / `categoryOrder` / `openDetailModal()` dependency review
* backend `/api/products/category-order` cleanup only after frontend no longer calls it
* Opportunity Detail Event Reports rail / old modal duplicate behavior, requiring separate product decision
* Meeting / Calendar hidden workflow ownership decision
* LINE leads standalone page ownership decision
* System status modal / API trigger audit
* `services/index.js` retired factory audit
* `data/index.js` legacy export audit
* Google Sheet fallback domain-by-domain SQL replacement roadmap

---

# 28.4 Event Log todoItems Governance Addendum (2026-06-30)

The event log common field addition `todoItems` / `todo_items` is completed with User UI/Product PASS.

Accepted semantics:

* UI label is exactly `待辦事項`.
* API / DTO field name is `todoItems`.
* DB column name is `todo_items`.
* DB type is nullable `text`.
* The field applies only to the four physical event log tables:
  * `event_logs_general`
  * `event_logs_dt`
  * `event_logs_iot`
  * `event_logs_dx`
* The field is event-log record text only.
* The field is not a follow-up, task, reminder, subscription reminder, or global task-system record.
* The field follows the existing event log create/edit/read/display flow only.

Deliberate boundaries:

* `event_logs_summary` was deliberately untouched.
* `public/scripts/interactions.js` was deliberately untouched.
* Activity Hub timeline logic was deliberately untouched.
* Task, follow-up, reminder, and subscription systems were deliberately untouched.

Final common long-text field order:

```text
eventContent -> clientQuestions -> clientIntelligence -> eventNotes -> todoItems
```

Patch outcome:

* E1 DB PASS added `todo_items text` to the four physical event log tables.
* E2 Backend CODE PASS added writer whitelist, service create/update mapping, dynamic payload exclusion, reader DTO mapping, and audit redaction/label support.
* E3 initial CODE NG occurred because the label became mojibake and the field was placed before `eventNotes`.
* E3-FIX CODE PASS corrected the label to exactly `待辦事項` and moved `todoItems` after `eventNotes`.

AI collaboration boundary remains unchanged:

* Gemini is evidence-only repo/docs forensics and must not own phase planning or patch strategy.
* ChatGPT owns scope and phase judgment.
* The user owns product semantics and final PASS / NG.
* Codex executes frozen minimal patches only.

---

# 28.5 Sales Analysis Governance Archive (2026-07-02)

The Sales Analysis / 受注分析 patch series is closed with Function PASS, UI/Product PASS, final closure audit PASS, and governance cleanup PASS.

This section is the primary source of truth for the accepted Sales Analysis state after the completed frontend patch series.

## 28.5.1 Owner Files And Boundary

Active frontend owners:

```text
public/scripts/sales/sales-analysis.js
public/scripts/sales/sales-analysis-components.js
public/scripts/sales/sales-analysis-helper.js
```

Backend route/controller/service support remains in place, but this patch series did not change backend, API contract, DB schema, routes, controllers, services, data files, migrations, or global CSS.

## 28.5.2 Chart Metric Toggle Policy

`成交類型` and `成交來源` charts each have independent `件數 / 金額` metric toggles.

Accepted semantics:

* default metric is `件數`
* `成交類型` count is computed frontend-side from filtered `displayedDeals`, grouped by `opportunityType`
* `成交來源` count is computed frontend-side from filtered `displayedDeals`, grouped by `opportunitySource`
* amount mode preserves backend amount arrays:
  * `salesAnalysisData.byType`
  * `salesAnalysisData.bySource`
* toggles are chart-local state and must not refetch, reset date filters, reset list tabs, or change backend aggregation

Do not alter backend amount aggregation to support these toggles unless a separate product/API decision is made.

## 28.5.3 Monthly Trend Combo Chart Policy

`calculateMonthlyTrend(displayedDeals)` produces:

```text
{ label, count, amount }
```

Accepted data semantics:

* grouping uses the existing `wonDate` monthly bucket logic
* `count` increments by one won deal in the bucket
* `amount` sums `numericValue` in the same bucket
* filters/date range/current all-history bucket behavior remain unchanged

Accepted visual semantics:

* `成交件數` renders as a straight blue line with visible circle markers and low-opacity blue area fill
* `成交金額` renders as a restrained translucent light-purple bar
* visual Y-axis labels, ticks, and axis lines are hidden
* internal dual-axis scaling remains
* tooltip is the precision-reading layer and shows both count and compact amount
* dashed cross hover guide is enabled

## 28.5.4 List-Only Opportunity Type Tabs

The `成交案件列表` has list-only quick tabs by `opportunityType`.

Rules:

* default tab is `全部`
* tabs are generated only from opportunity types present in current `displayedDeals`
* missing/falsy type values use the existing `未分類` fallback
* tabs filter only visible table rows, list count, pagination total, and page slicing
* tabs do not mutate `displayedDeals`
* tabs do not affect KPI cards, charts, monthly trend, CSV export, API fetches, or backend behavior
* tab switching resets current page to 1 and pagination is clamped safely

Ordering:

* `全部` is fixed first
* configured present types use `window.CRM_APP.systemConfig['機會種類']` order ascending
* matching may use config `value` or `note`
* unconfigured present types are appended after configured types using locale fallback sorting
* `未分類` is last when present
* if settings are unavailable or malformed, sorting falls back to localeCompare

Anti-patterns:

* do not hardcode opportunity type labels or business ordering
* do not use mojibake or corrupted Chinese keys as fallback business logic
* do not sort alphabetically as the primary rule when dynamic settings order is available
* do not show all configured types if they are not present in `displayedDeals`

## 28.5.5 Sales Model Filter Removal Decision

The Sales Model filter UI was removed from Sales Analysis by product decision.

Accepted state:

* do not keep the filter in the list header
* do not move it to top/global filters
* `currentSalesModelFilter` remains a safe dormant compatibility/default state fixed as `all`
* API support for the `salesModel` parameter remains untouched
* Sales Analysis fetches/defaults to all sales models

Do not reintroduce Sales Model filter UI without a new product decision. Do not remove backend/API `salesModel` support as part of this UI cleanup.

## 28.5.6 Table, Channel, Direct Sales, And CSV Policy

Accepted list display:

* `負責業務` was replaced by `機會來源`
* table rows display `opportunitySource`
* direct-sales rows suppress the main channel display and show the existing empty placeholder

Direct-sales detection must use shared logic:

```text
SalesAnalysisHelper.isDirectSalesModel(model)
```

Do not duplicate direct-sales detection in table and CSV paths.

CSV behavior:

* CSV matches the accepted table column replacement for `機會來源`
* CSV uses the same direct-sales main-channel suppression rule
* CSV export remains based on `displayedDeals`
* CSV does not follow the list-only opportunity-type tabs

## 28.5.7 Workflow Archive

Completed workflow:

```text
forensic -> scope freeze -> minimal patch -> CODE PASS -> UI/Product PASS -> final closure audit -> governance cleanup
```

Final closure audit confirmed:

* no active broken handler remains
* list-only tabs do not affect KPI/charts/trend/CSV
* backend/controller/routes/DB remained unchanged
* mojibake fallback key cleanup completed

Do not convert this frontend UI cleanup into backend/API/DB work.

---

# 28.6 Activity Intelligence Reusable Platform Governance (2026-09)

Activity Intelligence / FANUC Forms is a reusable custom-form platform. Its durable dependency is:

```text
Form Designer → Schema / Settings → Normalized Runtime Field → Form Engine → Canonical Answer Model → consumers
```

Consumers include Quick Entry, Edit / Detail, Historical Assist, Analytics, CSV/export, and Records views. Current questions and fields must not be treated as hardcoded product schema.

The Form Engine owns canonical answer mutation. Historical suggestions provide candidates only; consumer layers must not independently reimplement field-type semantics. Person / Company assist and Generic Other-history are reusable capabilities governed by field semantics and settings, not fixed activity or business-field labels.

Performance optimization must preserve every accepted Product PASS contract, including Form Designer behavior, Form Engine semantics, canonical answer ownership, Quick Entry state, Person and Company assist, Generic Other-history, Records counts, Analytics semantics, and Follow-up semantics. Scoped rendering, projections, hydration changes, or future pagination do not imply semantic redesign.

The detailed accepted stage state and exact PASS boundaries live in `docs/activity-intelligence-stage-closure-2026-08.md`.

---

# 28.7 Highcharts / Highmaps Retirement Governance Archive (2026-07-06)

Highcharts / Highmaps full retirement is completed with UI/Product PASS.

Current charting source of truth:

* Active chart stack is ECharts.
* Dashboard trend uses ECharts.
* Sales Analysis charts use ECharts.
* Taiwan map uses ECharts with `public/assets/maps/taiwan.json`.
* `public/assets/maps/taiwan.json` is active and must be preserved for the ECharts Taiwan map.

Completed retirement scope:

* Event charts dormant module was removed after being confirmed loaded but UI-unreachable.
* Source-level Highcharts cleanup removed `createThemedChart()`, `getHighchartsThemeOptions()`, and Highcharts-only helper/theme code.
* Dashboard Highcharts / Highmaps loader scripts were removed.
* `public/assets/vendor/highcharts/**` was deleted.
* `scripts/setup-highcharts-vendor.js` was deleted.
* `highcharts` and `@highcharts/map-collection` were removed from npm metadata and local dependency state.
* Stale `scripts/shared/pack-shared-highcharts-vendor.ps1` and empty local `node_modules/@highcharts` residue were removed.

Governance rules:

* Highcharts is no longer active runtime, loader, vendor, npm package, setup script, or `node_modules` dependency.
* Historical Highcharts references in docs are `DOC_HISTORY_ONLY`.
* Future agents must not classify docs-only Highcharts mentions as active source.
* Do not reintroduce Highcharts without an explicit new product/architecture decision.
* Do not remove ECharts or `public/assets/maps/taiwan.json` as part of any Highcharts cleanup.

---

# 28.8 RAW Contact SQL Authority Governance Archive (2026-07-15)

Status:

```text
CRM-side RAW Contact SQL authority workstream: closed with UI/Product PASS.
OCR-side ingestion and cross-repository end-to-end closure: separate pending validation unless independently evidenced.
```

Accepted completion state:

* Phase A RAW SQL Adapter + Identifier Resolver: CODE PASS.
* Phase B RAW SQL Runtime Authority Cutover: CODE PASS.
* Frontend / LIFF / route static repository audit: PASS.
* Dashboard RAW Stats Concurrent Fetch Cleanup: CODE PASS.
* UI / Product Test: PASS on 2026-07-15.

## 28.8.1 RAW Runtime Authority

`public.raw_contact_captures` is the sole CRM runtime authority for RAW business-card records.

Active CRM RAW runtime list/read/edit/delete/status/workflow paths resolve through SQL RAW adapters:

* `data/raw-contact-sql-reader.js`
* `data/raw-contact-sql-writer.js`
* `ContactService.rawContactSqlReader`
* `ContactService.rawContactSqlWriter`
* `WorkflowService` RAW status transitions through SQL card resolution

No active CRM RAW runtime read/write fallback to the legacy RAW Google Sheet is part of the accepted target architecture.

This does not mean the entire CRM is Google-Sheet-free. Product data, system settings/auth, calendars, Internal Ops, Weekly Business fallback, and other operational domains may still use Google services according to their own governance.

## 28.8.2 Canonical RAW Identity

Canonical RAW business-card identity:

```text
card_id / cardId
```

Historical compatibility remains:

```text
raw_payload.legacy_row_index
-> runtime DTO rowIndex
```

Rules:

* if `cardId` exists, frontend actions send `cardId`;
* if `cardId` is absent, frontend actions may send a valid positive legacy `rowIndex`;
* new SQL-only records do not require `rowIndex`;
* `cardId` must not be copied into `rowIndex`;
* `rowIndex` is not the canonical identity.

## 28.8.3 Identifier Resolver Contract

Accepted backend identifier behavior:

| Input | Resolver behavior |
| --- | --- |
| UUID | lookup by `card_id` |
| positive integer / numeric string | lookup by `raw_payload.legacy_row_index` |
| invalid identifier | validation error |
| valid but missing identifier | not-found error |
| duplicate legacy identity | integrity error |

Future changes must not parse UUID identifiers as integers and must not restore a Google Sheet fallback for CRM RAW runtime.

## 28.8.4 `contacts.source_id` Compatibility

Current runtime compatibility:

| `contacts.source_id` value | Behavior |
| --- | --- |
| numeric | historical legacy `rowIndex` lookup in SQL |
| UUID | `cardId` lookup in SQL |
| `MANUAL` | no RAW source lookup |

Existing numeric `contacts.source_id` values were not bulk migrated during this workstream. Do not document or execute a bulk source-id migration without a separate approved workstream.

## 28.8.5 UI / API Boundary

The workstream preserved:

* no visible UI redesign;
* no HTML/CSS changes;
* no user-flow change;
* no external API URL-shape change.

Only invisible identifier plumbing changed where required. The project standing rule remains: no hardcoded dynamic business labels or identities.

LIFF lead update/delete routes preserve ownership checks before mutation while resolving the accepted identifier through SQL.

## 28.8.6 Dashboard RAW Statistics

Dashboard potential-contact statistics are backed by SQL RAW data.

Accepted frontend timing:

```text
/api/dashboard
and
/api/dashboard/contacts-stats

start concurrently
```

Failure boundary:

```text
Main Dashboard does not wait for RAW contact statistics.
RAW contact statistics failure does not fail the main Dashboard.
```

The endpoints are not merged. Current source evidence shows RAW stats are calculated from SQL record hydration through `rawContactSqlReader.getRawContacts()` with the existing five-minute cache; this archive does not claim a direct SQL COUNT implementation.

## 28.8.7 Regression Anti-Patterns

Future patches must not:

* restore SQL-read / Sheet-write split-brain;
* restore Google Sheet fallback for CRM RAW runtime;
* treat `rowIndex` as the canonical identity;
* fabricate `rowIndex` for SQL-only records;
* copy `cardId` into `rowIndex`;
* parse UUID identifiers as integers;
* assume every `contacts.source_id` is numeric;
* bulk-migrate `contacts.source_id` without a separate approved workstream;
* merge Dashboard RAW stats into the main request if this removes failure isolation without a new product/architecture decision;
* delete dormant RAW Sheet code solely because imports remain;
* declare the OCR repository closed without its own end-to-end evidence;
* declare the entire CRM Google-Sheet-free.

## 28.8.8 Non-Goals And Future Boundaries

This archive closes the CRM repository RAW Contact SQL migration workstream only.

It does not close:

* the external OCR repository;
* the end-to-end OCR ingestion system;
* the entire CRM SQL modernization program;
* all Google Sheet dependencies.

OCR-side validation remains separate unless independently evidenced:

```text
new scan
-> OCR processing
-> direct SQL insertion
-> CRM display/actionability
-> no required RAW Sheet dependency
```

---

# 29. Internal Ops Governance Baseline

## 29.1 Internal Ops Dev Projects Governance Baseline

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

Workload explanation governance:

* Dev Projects member workload explanation must reuse the same config used by the actual calculation: `getDevMemberWorkloadConfig()`.
* Do not independently parse `window.__systemConfig` for workload explanation UI.
* Do not hardcode sample Google Sheet values into UI explanations.
* UI explanations must reflect configured workload settings: max load, main-owner role weight, collaborator role weight, positive status weights, and zero-weight statuses.
* Do not expose internal fallback / default behavior as user-facing explanation unless explicitly requested by product direction.
* Do not change `getDevMemberWorkloadConfig()` or `buildDevMemberGroups()` merely to render explanatory text.

## 29.2 Subscription Ops Governance Baseline

The lower Internal Ops section `訂閱制與專案提醒管理` is UI PASS.

Accepted baseline:

* Accepted header pattern: compact `新增 / 維護` controls.
* Accepted semantic split:
  * `custom_subject` = 專案主旨
  * `custom_note` = 提醒項目 / 說明
  * `notes` = true expanded 備註
* Accepted archive behavior: archived subscription records render in a read-only archived section.
* Accepted future-start behavior: future-start records show `尚未開始` in management UI and are excluded from dashboard alert marquee.
* Accepted note behavior: expanded notes use the true `notes` field and note contrast is scoped to the note card only.
* Accepted layout polish: active/archive count rows are left aligned and table layout remains compact.

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

## 2026-09-02

* Added durable Activity Intelligence reusable-platform and canonical-answer governance.
* Added the regression-restoration rule for Product PASS behavior affected by performance optimization.
* Clarified that one sufficient evidence pass is enough and additional forensics are required only for material evidence gaps.
* Removed routing to superseded campaign-level forensic artifacts.

## 2026-07-15

* Archived completed CRM RAW Contact SQL authority cutover with UI/Product PASS.
* Recorded `public.raw_contact_captures` as the CRM RAW runtime authority, `cardId` as canonical identity, positive legacy `rowIndex` compatibility through `raw_payload.legacy_row_index`, and numeric / UUID / `MANUAL` `contacts.source_id` compatibility.
* Recorded Dashboard RAW stats concurrent request timing with failure isolation, and clarified that OCR-side end-to-end closure and all-CRM Google Sheet retirement are separate non-goals.

## 2026-07-06

* Archived completed Highcharts / Highmaps full retirement with UI/Product PASS.
* Recorded ECharts as the active chart stack and `public/assets/maps/taiwan.json` as active preserved map data for the ECharts Taiwan map.
* Classified remaining Highcharts documentation references as `DOC_HISTORY_ONLY` and prohibited reintroducing Highcharts without explicit new product/architecture approval.

## 2026-07-02

* Archived completed Sales Analysis / 受注分析 patch series with Function PASS, UI/Product PASS, final closure audit PASS, and governance cleanup PASS.
* Recorded accepted Sales Analysis governance for chart metric toggles, monthly trend combo chart, list-only opportunity-type tabs, Sales Model filter removal, direct-sales main-channel suppression, CSV behavior, and no backend/API/DB change boundary.
* Recorded anti-patterns / non-goals: no hardcoded opportunity type labels or business ordering, no mojibake fallback business keys, no list-tab mutation of `displayedDeals`, no list-tab impact on KPI/charts/trend/CSV, no Sales Model filter UI reintroduction without new product decision, no backend/API `salesModel` removal as part of UI cleanup, and no duplicated direct-sales detection.

## 2026-07-01

* Archived completed Opportunity Detail Activity Wall / Event Report PASS state as docs-only governance.
* Added primary Activity Hub / Event Report governance for timeline time source, Activity Wall sorting, UTC-naive timestamp handling, datetime-local UTC write normalization, management-mode live sync, helper hint placement, and system-record View render-level cleanup.
* Recorded anti-patterns / non-goals: no DB view, no parent `interactionTime` synchronization, no backend DTO enrichment for already available Activity Wall data, no global `formatDateTime` change, no Event Report wall-clock formatter for this policy, no migration/backfill, no shared modal or endpoint deletion, no global `showForEditing()` removal, and no CSS hiding for system-record cleanup.

## 2026-06-30

* Recorded completed event log common field `todoItems` / `todo_items` with User UI/Product PASS.
* Documented final label `待辦事項`, four-table scope, event-log-only semantics, `event_logs_summary` no-touch boundary, interactions/timeline no-touch boundary, and final field order `eventContent -> clientQuestions -> clientIntelligence -> eventNotes -> todoItems`.
* Recorded E3 initial CODE NG due to mojibake/wrong placement and E3-FIX CODE PASS correcting the label and placement.
* Reconfirmed AI collaboration boundaries: Gemini evidence-only forensics, ChatGPT scope/phase judgment, user product semantics/final PASS/NG, Codex frozen minimal patch execution.

## 2026-06-24

* Recorded Phase 8C/8D Opportunity List sorting/display baseline.
* Clarified distinction between group sorting key `lineageGroupLatestActivity` and per-row display key `rowActivityTime`.
* Added anti-pattern: do not use `audit_logs` as a business activity sorting source.

## 2026-06-18

* Completed the Audit / Session Log Foundation chapter at CODE PASS / USER PASS level.
* Added `docs/audit-session-log-governance.md` as the canonical reference for audit/session architecture, taxonomy, redaction, and future patch rules.
* Clarified that backend audit/session foundation now exists; frontend/admin manager audit viewer remains future work.

## 2026-06-16

* Added phase archive documentation update for Internal Ops.
* Documented Subscription Ops accepted baseline.
* Documented Dev Projects header toolbar accepted baseline and member workload note row governance.
* Strengthened prompt governance for English Gemini forensics prompts, strict Codex minimal patch scope, no future-phase roadmap text in Codex prompts, and second placement forensics when docs placement is uncertain.
* Sealed Mobile Dashboard V1 after regression QA PASS.
* Updated docs for the Mobile Dashboard UI baseline and repository consolidation record.
* Recorded that desktop retains the header marquee while mobile uses the compact expandable reminder panel.
* Confirmed mobile foundation repairs and the mobile header overflow guard as part of the sealed V1 scope.
* Recorded desktop zero-regression as mandatory for Mobile Dashboard work.
* Deferred M6B-2 header visual polish to backlog.

## 2026-06-09

* Added phase handoff documentation and changelog governance.
* Clarified that repo docs are updated only when governance, architecture baseline, scan boundary, UI baseline, Supabase/security posture, cleanup/no-touch rules, or current repo state meaningfully change.
* Confirmed governance doc updates should normally be docs-only patches.
