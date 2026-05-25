# TFC CRM Architecture Governance

## Operational SaaS Governance Edition

## 2026-05 Workspace Productization Revision

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

TFC CRM IS:

* an Operational Workspace
* a CRM Intelligence Workspace
* a Manufacturing/Sales Operational SaaS
* a Human Workflow System
* a Meeting & Opportunity Intelligence Hub

The UI philosophy is:

```text
Operational clarity
Structured hierarchy
Low-noise workspace
Information ownership
Human workflow continuity
```

NOT:

```text
Card explosion
Colorful dashboard
Marketing SaaS
Readonly form systems
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

The user does NOT need to:

* debug selectors
* trace runtime ownership
* inspect DOM trees
* explain CSS architecture

The user's product judgment overrides:

* AI preferences
* generic UI trends
* optimization assumptions

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

ChatGPT MUST:

* protect architecture
* avoid scope explosion
* enforce minimal diff
* distinguish runtime issues vs design issues
* preserve ownership boundaries

ChatGPT MUST NOT:

* redesign frozen layouts
* reinterpret user product decisions
* silently optimize unrelated systems
* enter speculative refactor mode
* replace product direction with generic SaaS trends

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

Gemini MUST:

* provide evidence-first analysis
* cite exact ownership
* identify safe modification boundaries
* explain selector/runtime interactions

Gemini MUST NOT:

* make final UX/product judgments
* redesign architecture without instruction
* over-refactor
* optimize outside scope

---

## 2.4 Codex — Repo Hands / Patch Executor

Codex owns:

* patch implementation
* minimal diff execution
* try & error prototyping
* syntax verification
* scoped UI iteration

Codex MUST:

* stay inside prompt scope
* avoid unrelated cleanup
* avoid broad rewrites
* return exact modified files and diffs
* run syntax checks

Codex MUST NOT:

* reinterpret product direction
* redesign hierarchy
* optimize architecture without instruction

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

without evidence.

Every meaningful modification requires:

* source evidence
* runtime evidence
* selector evidence
* ownership evidence
* payload evidence

Never patch based on:

* memory
* intuition
* "probably"
* generic framework assumptions

---

# 4. Forensics-First Workflow

Before modification:

* inspect ownership
* inspect runtime flow
* inspect renderer boundaries
* inspect selector specificity
* inspect call sites
* inspect payload availability

Every forensic phase must clearly define:

* target files
* ownership questions
* forbidden changes
* expected output format
* PASS / NG criteria

Forensics must separate:

* runtime failure
* selector conflict
* architecture failure
* visual execution failure

These are NOT the same problem.

---

# 5. Minimal Diff Governance

All modifications must:

* preserve architecture
* preserve ownership
* preserve stable systems
* preserve unrelated workflows

DO NOT:

* opportunistically refactor
* "clean up nearby code"
* redesign unrelated UI
* rename broadly
* migrate patterns globally

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

Correct surface layering:

* visible enough for ownership
* restrained enough to avoid dashboard noise

Avoid:

* giant shadows
* giant cards
* inset form feel
* heavy UI chrome

---

# 15. Runtime Ownership Governance

Before patching UI:
identify:

* actual DOM owner
* actual renderer owner
* actual injected CSS owner
* actual runtime lifecycle owner

Do NOT patch:
child selectors
when the problem belongs to:
parent ownership.

---

# 16. Modal Isolation Governance

Modal renderers and inline renderers must remain isolated.

Inline workspace evolution must NOT:

* break modal rendering
* pollute modal semantics
* overload shared renderer assumptions

---

# 17. Prompt Governance

All Gemini prompts:

* English only
* copy-paste safe
* single-layer formatting
* no nested fences
* no fragile markdown structures

All prompts must:

* define scope
* define forbidden areas
* define output format
* define safety checks
* define PASS / NG targets

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
* exact diff
* verification results

---

# 19. No Preventive Optimization Governance

Do NOT:

* future-proof everything
* redesign systems early
* abstract prematurely
* generalize without need

Build only what current operational requirements justify.

---

# 20. Current Workspace Productization Status (2026-05)

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

LOCKED:

* layout structure
* metadata structure
* dual-column ratios
* narrative flow

Current refinement stage:

* surface rendering refinement
* typography refinement
* editable-surface refinement
* hierarchy polishing

NOT:

* architecture redesign
* renderer redesign
* layout redesign

---

# 21. Final Governance Principle

If the UI starts feeling like:

* Bootstrap admin
* readonly CRM form
* dashboard widget wall
* rainbow SaaS template

STOP.

TFC CRM must always feel like:

```text
A restrained operational workspace
for real human workflows.
```
