# TFC CRM UI Style Governance

## 1. Purpose and scope

This document defines UI governance rules for future TFC CRM module migrations.

It is a governance and PASS / NG reference. It is not a pixel-perfect design spec, not a token catalog, and not authorization to refactor shared CSS or extract components.

The source of truth is the existing repo forensic record and the accepted dual UI baselines:

* Dashboard = analytics / KPI / chart / filter tab / widget control baseline
* Opportunity Detail = operational workflow / high-density CRM / Activity Hub / relationship context / inline editing baseline

Future module work should align locally to this document before any broader component refactor is proposed.

## 2. Core visual philosophy

TFC CRM is an operational SaaS workspace, not a marketing website.

The UI tone must be:

* low-noise
* high-density
* enterprise CRM oriented
* sharp, compact, and work-focused
* optimized for scanning, comparison, and repeated action

The preferred visual language is restrained structure, clear hierarchy, and compact operational surfaces. Decorative UI must not compete with CRM data, workflow state, Activity Hub records, charts, or controls.

## 3. Dual baselines

TFC CRM has two accepted UI baselines.

### Dashboard baseline

Use Dashboard patterns for analytics pages and analytics sections.

Dashboard-governed surfaces include:

* KPI summaries
* charts and trend widgets
* dashboard filter tabs
* dashboard widget controls
* analytics feed summaries
* compact business performance panels

Dashboard UI may use slightly more visual hierarchy than workflow pages, but it must remain restrained and business-like.

### Opportunity Detail baseline

Use Opportunity Detail patterns for workflow and detail pages.

Opportunity Detail-governed surfaces include:

* high-density CRM detail views
* Activity Hub
* relationship context panels
* right rail indexes
* inline create / edit / void flows
* operational metadata strips
* compact record timelines and row groups

Opportunity Detail UI must prioritize workflow continuity, inline action clarity, and information density.

Activity Wall UI baseline:

* Event Reports are inline-first in Activity Wall; modal compatibility may remain but must not govern the primary workflow.
* management-mode helper text may sit in `.activity-hub-header-actions` immediately before `?啣?鈭?`; it is compact guidance text, not a permission control.
* management mode is live UI state for open Event Report edit forms; entering management mode makes `?潛???` editable and leaving management mode makes it readonly without discarding drafts.
* system-record rows are readable audit rows without the generic locked-row `View` action.

## 4. Surface and card hierarchy

Structural cards should use subtle borders and small radius.

PASS:

* compact blocks with clear borders
* restrained section separation
* small-radius cards or sharp panels
* hierarchy created through spacing, typography, borders, and density
* local alignment with the relevant accepted baseline

NG:

* large decorative cards that make the app feel like a marketing page
* excessive shadows
* hover lift as a default interaction
* glow effects
* decorative gradients
* oversized border radius for operational surfaces
* nested card structures that add visual noise without workflow value

Do not introduce new card styles without a clear module-specific reason and forensic justification.

## 5. Button and control semantics

Buttons and controls must preserve existing semantic weight.

PASS:

* primary actions are reserved for the main committed action in the current context
* secondary actions are visually quieter
* icon controls remain compact and tool-like
* destructive or irreversible actions are visually distinct but not theatrical
* widget controls follow Dashboard control patterns
* inline workflow controls follow Opportunity Detail / Activity Hub patterns

NG:

* inventing a new button family for one module without justification
* using promotional CTA styling inside CRM workflows
* making all actions look primary
* replacing compact icon controls with large decorative buttons
* adding glow, lift, gradient, or heavy shadow states to routine controls

Do not introduce new button styles without justification.

## 6. Filter tab rules

Filter tabs are a Dashboard-governed pattern unless a detail workflow has an established local equivalent.

PASS:

* use filter tabs for analytics segmentation, KPI ranges, chart modes, and dashboard widget views
* keep tab groups compact
* make selected state clear without heavy decoration
* preserve readable counts, labels, and active state
* avoid layout shift when tabs change state

NG:

* using large marketing-style pills as tabs
* turning every row status into a tab
* adding new tab styling when Dashboard filter tab semantics already fit
* using gradients or glow to indicate active filters

Filter tab changes must be judged against the Dashboard baseline.

## 7. Badge / chip / label semantics

Badges, chips, and labels communicate record type, status, metadata, or filter state. They are not decoration.

PASS:

* muted gray-green for lightweight CRM interaction / general activity where already established
* purple for formal event report / structured report where already established
* neutral gray-white for secondary metadata such as event category or type
* subdued gray for system, void, tombstone, and audit-like records
* small restrained labels for section titles and metadata
* numeric or configured chips filtered according to existing data rules

NG:

* adding new badge color semantics without justification
* making metadata badges visually stronger than primary record content
* splitting accepted compact right-rail event report title badges into multiple competing badges
* using badges as decorative color accents
* changing established Activity Hub record-class colors without forensic approval

Badges must support scanability and meaning.

## 8. List / table / row density rules

Lists, tables, and row groups must preserve high-density CRM behavior.

PASS:

* compact rows
* clear row boundaries
* readable primary and secondary text
* stable action placement
* compact right rail indexes
* timeline or Activity Hub rows that preserve inline workflow continuity
* dense operational tables that support repeated scanning

NG:

* expanding rows into large decorative cards without workflow need
* hiding key CRM metadata behind hover-only UI
* creating excessive vertical whitespace
* moving edit / void / inline actions away from established row context
* changing event report list structure from compact index to timeline clone

For workflow/detail pages, Opportunity Detail density is the benchmark.

## 9. Chart and analytics rules

Charts and analytics widgets follow Dashboard governance.

PASS:

* compact KPI hierarchy
* restrained chart containers
* clear labels and units
* stable widget controls
* business-readable trend states
* chart interactions that do not disrupt dashboard scanning
* Apache ECharts is the preferred chart renderer for new chart work
* preview modal pattern may be used for accepted chart enlargement workflows
* gray no-data states for empty chart/map regions
* system-aligned color scales instead of decorative palettes
* Sales Analysis `成交類型` uses a standard professional donut with subtle `padAngle: 1` separation

NG:

* decorative chart panels that dominate the page
* unexplained chart color semantics
* chart controls that diverge from Dashboard widget control patterns
* analytics cards with marketing-style hero treatment
* broad dashboard range or filter UI changes without forensic validation
* rainbow charts unless the business meaning is explicitly justified
* CDN chart dependencies
* rounded/petal-style Sales Analysis `成交類型` donut slices
* thick artificial transparent gaps in the Sales Analysis `成交類型` donut
* claims that the accepted Sales Analysis `成交類型` donut is fully gapless
* reverting Sales Analysis charts to Highcharts

Analytics work must preserve Dashboard stability and stale-refresh assumptions.

### 9.1 Sales Analysis UI Baseline

Sales Analysis follows the Dashboard analytics baseline with compact local controls.

Accepted Sales Analysis chart and control conventions:

* `成交類型` and `成交來源` chart metric toggles use compact `action-btn` segmented controls.
* active metric uses primary visual weight; inactive metric uses secondary visual weight.
* metric toggles are independent per chart and must not become global page filters.
* monthly trend combo chart uses `成交件數` as a straight blue line with visible circle markers and low-opacity blue area fill.
* monthly trend combo chart uses `成交金額` as a restrained translucent light-purple bar.
* monthly trend visual Y-axis labels, ticks, and axis lines stay hidden; tooltip is the precision-reading layer.
* monthly trend tooltip must show both count and compact amount.
* dashed cross hover guide is accepted for precision reading.

Accepted Sales Analysis list toolbar convention:

* opportunity-type quick tabs belong in the `成交案件列表` header toolbar, immediately left of `每頁顯示`.
* accepted label is `機會種類篩選：`.
* tab buttons use the same compact visual language as page-size buttons.
* old standalone bulky tab rows should not be reintroduced when the control belongs to the table toolbar.
* no global CSS is required for this accepted pattern; prefer local inline style and existing `action-btn` conventions.

Sales Analysis UI anti-patterns:

* do not reintroduce the Sales Model filter UI without a new product decision.
* do not make list-only opportunity-type tabs affect KPI cards, charts, monthly trend, CSV, API fetches, or backend behavior.
* do not hardcode opportunity type labels, colors, or ordering in UI code.
* do not use mojibake or corrupted Chinese keys as UI/business fallback logic.

## 10. Modal / preview rules

Modal and preview behavior must respect the owning workflow.

PASS:

* use modals for isolated confirmation, preview, or legacy compatibility where already established
* keep preview surfaces compact and task-focused
* preserve Activity Hub inline-first behavior
* keep workflow actions close to their record context
* ensure modals do not become the governing pattern for Activity Hub behavior

NG:

* forcing old modal/list flows into Activity Hub
* replacing accepted inline create / edit / void flows with modal-first behavior
* adding decorative preview shells that reduce data density
* changing legacy modal infrastructure without forensic approval

Activity Hub is inline-first. Modal compatibility may remain, but it must not govern Activity Hub product behavior.

## 10.1 Product Cost table baseline

Product Cost management is a compact flat table management surface.

Current active UI rules:

* no active category grouped sections
* no active category chip wall / drag ordering UI
* no active popup/detail modal edit path
* `ProductDetailModal` may remain in the repo for compatibility, but it is not the active table edit path
* global edit mode turns visible editable cells into bordered inline inputs
* add-new-product happens inline in the table
* unsaved new rows render at the top until saved
* main table does not show Product ID, cost, opportunity spec option badge, behavior mode, description, creator, modifier, or action columns
* category badge uses `oppDisplayCategory` only
* product name and spec remain single-line ellipsis
* MTB / SI / MTU prices use restrained rectangular badges: blue, cyan-blue, and purple
* status badges are rectangular: active green, inactive red, unknown gray
* toolbar controls stay compact with icon + text labels

Display ordering is visual only:

* do not change Sheet row order
* do not shift or rewrite `oppDisplayOrder`
* unsaved `_isNew` rows first
* saved rows visually group by `oppDisplayCategory`
* group order follows the smallest valid numeric `oppDisplayOrder` in each group
* rows inside a group follow their own numeric `oppDisplayOrder` ascending

Do not document or treat the old chip wall / category-order flow as the current Product Cost ordering model unless it is explicitly labeled legacy / inactive.

## 11. Anti-patterns

The following are NG unless explicitly justified by approved forensic findings:

* marketing website layout language
* excessive shadows
* hover lift on routine cards
* glow effects
* decorative gradients
* oversized radius on operational surfaces
* decorative cards that do not carry workflow value
* new button styles without justification
* new card styles without justification
* new badge color semantics without justification
* global CSS extraction during module migration
* shared component extraction before local module alignment
* broad visual refactors bundled with small behavior patches
* browser UI testing by default
* local server start / restart without explicit request
* login, session, or localStorage workarounds for validation
* diagnosing visual hierarchy mismatch only by adjusting margin/padding before checking CSS class stacking and specificity
* mixing different-generation button classes inside one toolbar
* letting a toolbar button carry both an old base class and a new compact class unless evidence proves it is intentional
* changing visual controls that look non-unified before first inspecting DOM class composition, active-state selectors, and specificity

Governance is by convention first.

## 12. Future module migration workflow

Future module migrations must follow this workflow:

1. Identify whether the target surface is analytics-governed or workflow/detail-governed.
2. Align analytics surfaces to the Dashboard baseline.
3. Align workflow/detail surfaces to the Opportunity Detail baseline.
4. Preserve existing local semantics before introducing new UI forms.
5. Keep patches small and scoped.
6. Avoid global CSS extraction.
7. Avoid shared component refactors until local alignment is complete and separately justified.
8. Validate by PASS / NG criteria before proposing broader cleanup.
9. Use governance by convention first.
10. Migrate module by module.
11. Treat user visual PASS / NG as the acceptance boundary.

Module migration PASS:

* the module clearly maps to one or both accepted baselines
* new UI follows existing local patterns where possible
* visual hierarchy supports operational CRM work
* code, CSS, and HTML changes are scoped to the migration request

Module migration NG:

* the module invents a third visual language
* local migration becomes a global style refactor
* new controls, cards, or badges appear without justification
* visual changes reduce data density or workflow clarity

## 13. Gemini / Codex workflow rules

AI roles, Scope Freeze, and PASS / NG authority are governed by `docs/architecture-governance.md`.

Repo scan, docs-reading, and Necessary Docs Only rules are governed by `docs/repo-scan-boundary.md`.

UI-specific workflow rules:

* precise scope is mandatory
* small patches require especially precise scope
* do not use UI style work as a broad redesign or global CSS refactor
* read only files explicitly allowed or directly required by the UI task
* no browser UI tests by default
* do not start or restart the local server unless explicitly requested
* do not perform login, session, or localStorage workarounds
* static validation only unless explicitly requested
* if only Markdown changed, no `node --check` is needed

Default static validation:

```text
git diff --check
git diff --name-only
```

Do not expand validation beyond the requested scope without authorization.

## 14. PASS / NG validation rule

Every future UI migration must be judged as PASS or NG against this document.

ChatGPT performs CODE PASS / NG against scope, governance, evidence, and static validation. The user performs final UI / product PASS / NG.

PASS means:

* the surface is aligned to Dashboard or Opportunity Detail as appropriate
* the UI remains low-noise, high-density, and enterprise CRM oriented
* cards, buttons, controls, tabs, badges, lists, tables, charts, modals, and previews preserve accepted semantics
* new visual forms are justified by local need and forensic evidence
* the patch scope is precise
* static validation passes

NG means:

* the UI drifts toward marketing-site presentation
* decorative styling overrides operational clarity
* the work introduces unjustified button, card, badge, or tab styles
* analytics pages diverge from Dashboard patterns
* workflow/detail pages diverge from Opportunity Detail patterns
* Activity Hub inline-first behavior is weakened
* local migration is used as a vehicle for global CSS extraction or shared component refactor
* validation scope exceeds authorization

When in doubt, preserve the accepted baseline and document the reason before changing UI semantics.

## 15. Current accepted baselines

The Dashboard and Opportunity Detail remain the dual UI baselines.

Dashboard is the analytics / KPI / chart / filter tab / widget control baseline. Current accepted chart patterns include Apache ECharts for Dashboard trend work, inline compact filter tabs, chart preview modal support, restrained business color scales, and no decorative rainbow charting unless a business semantic requires it.

Opportunity Detail is the operational workflow / high-density CRM / Activity Hub / relationship context / inline editing baseline. Workflow pages must stay dense, low-noise, and oriented around record context, relationship context, and inline operational actions.

The current operational SaaS visual direction is low-noise, high-density, restrained enterprise CRM tone, compact surfaces, subtle borders, small radius, and minimal decorative effects.

## 15.1 Internal Ops Dev Projects UI Baseline

Internal Ops / Dev Projects uses the accepted operational table/list language for `各種類型案件追蹤`.

The accepted Dev Projects header toolbar baseline is:

```text
left: 各種類型案件追蹤 + 依操作日期由近到遠排序
right: 顯示方式 [案件導向] [人員導向] | 分組 [不分組] [案件分類] [案件狀態] | 如要編輯，請進入維護模式，並點擊名稱進行編輯 [展開備註] [新增] [維護]
```

The toolbar is no-wrap. Controls are right-aligned except the title/subtitle. The `|` separator is accepted for header control groups. The maintenance helper text is always visible to guide edit behavior.

All Dev Projects header toolbar buttons must use the unified compact visual class `dev-project-header-btn`. Do not mix different-generation button classes in this toolbar. Do not mix these old classes into accepted Dev Projects header toolbar buttons:

* `dev-project-view-tab`
* `dev-case-group-btn`
* `internal-ops-btn`

Preserve behavior attributes/handlers such as `data-dev-project-view-tab`, existing onclick handlers, `is-active`, and `is-danger`.

The accepted header control patterns are:

```text
案件導向: 顯示方式 [案件導向] [人員導向] 分組 [不分組] [案件分類] [案件狀態]
人員導向: 顯示方式 [案件導向] [人員導向] 明細 [收合明細] / [展開明細]
```

Header controls use the same compact chip / segmented button language. `分組` controls appear only in `案件導向`; `明細` appears only in `人員導向`. The neutral grouping label is `不分組`. The member detail control is one global toggle, defaults to expanded, and must not become per-member expand/collapse UI.

`案件導向` uses stable table/list language with this column language:

```text
# | 案件名稱 | 案件分類 | 關聯機會 | 關聯功能 | 人員 | 案件階段 | 案件狀態 | 開發時程 | 進度
```

`人員導向` uses the same list language, without the `人員` column because the person is the group header:

```text
# | 案件名稱 | 案件分類 | 關聯機會 | 關聯功能 | 案件階段 | 案件狀態 | 開發時程 | 進度
```

Relationship and role badges belong inside the `案件名稱` cell:

* case view: `↳ [案件關係] case name`
* member view: `↳ [主負責] case name` or `↳ [協作] case name`

Accepted list hierarchy polish:

* row numbers render as `1.`, `2.`, `3.`
* extended / child case rows may use subtle full-row tint
* case group separator rows may use subtle full-row tint and stronger text weight
* member collaborator rows may use subtle full-row tint
* in `人員導向`, a lightweight workload explanation note row is accepted under the Dev Projects header and above the `共 XX 筆` count row
* in `案件導向`, the workload explanation note is not shown
* the workload note row should visually match subtitle/helper text level: muted, compact, non-intrusive
* workload note text must use dynamic config via `getDevMemberWorkloadConfig()`
* do not hardcode Google Sheet example values in workload note text
* do not display internal fallback/default calculation behavior as user-facing note text
* do not use side color bars or left accent lines
* do not use loud red / yellow / green row background tints

Avoid these Dev Projects regressions:

* no card grid for member view
* no standalone `案件關係` column
* no chip-wall collaboration summary
* no popup-modal-first editing for Dev Projects
* no per-member expand/collapse state or row-level member toggles

Expanded edit mode may show an archive checkbox when progress is 100% or current status is `封存`. This checkbox is lifecycle control, not a visual filter.

Badge color governance:

* system settings `樣式` contains only a base hex color
* frontend generates background, border, text color, padding, radius, and font rhythm
* blank or invalid style falls back to `#616161`
* `案件階段` maps to `開發階段`
* `案件狀態` maps to `開發狀態`
* `案件分類` maps to `進度案件分類`
* `案件關係` maps to `進度案件關係`
* workload badge maps to `負荷量表`

Progress may show `超前` or `落後` beside progress when applicable. Normal progress status shows no extra tag.

Dev Projects should remain compact, low-noise, operational SaaS UI: sharp table/list surfaces, restrained badges, readable primary case names, and muted secondary metadata.

Do not perform global CSS extraction yet. Governance is by convention first, followed by module-by-module migration and user visual PASS / NG.

## 15.2 Mobile Dashboard UI Baseline

Mobile Dashboard is an independent mobile layout, not a scaled-down desktop Dashboard. Desktop Dashboard remains the analytics / KPI / chart / widget control baseline, while mobile Dashboard may use dedicated mobile-only slots and compact content patterns when those changes are scoped to mobile breakpoints.

Desktop header marquee remains the desktop reminder entry and must keep its existing appearance, animation, and render path. Mobile does not use the header marquee; it is hidden at mobile viewport widths. Mobile uses the compact reminder panel above KPI as the official mobile reminder entry.

The mobile reminder panel default state shows at most 3 reminders. When the current alerts array contains more than 3 reminders, the panel may show `展開全部` / `收合` controls. Expanding shows only the current alerts array already returned by the existing alerts endpoint. It must not fetch more data, widen backend query scope, or require API / SQL changes.

Desktop zero-regression is mandatory for Mobile Dashboard work. Mobile CSS must stay inside mobile media queries unless a non-visual JS state property is required for mobile-only rendering. Mobile Dashboard content scope and global app shell header scope must remain separate: Dashboard content patches must not become header redesigns, and header overflow guards must not alter Dashboard content.

M6B-2 header visual polish is deferred / backlog. V1 only accepts the mobile header overflow guard needed to prevent small-viewport squeezing or horizontal overflow.
