# Activity Intelligence Stage Closure — 2026-08

## Purpose

This document is the durable handoff for the completed Activity Intelligence / FANUC Forms stage. It records accepted architecture, protected product contracts, performance milestones, and the next workstream without serving as a chronological implementation diary.

## Product and architecture identity

Activity Intelligence / FANUC Forms is a reusable custom-form platform. Current questions and fields are configuration, not a hardcoded product schema.

```text
Form Designer
→ Schema / Settings
→ Normalized Runtime Field
→ Form Engine
→ Canonical Answer Model
→ consumers
```

Consumers include Quick Entry, Edit / Detail, Historical Assist, Analytics, CSV/export, and Records views. Consumer layers may present or derive answers, but they must not independently redefine field-type semantics or canonical answer mutation.

Primary current owners:

* `public/scripts/activity-intelligence/activity-intelligence-management.js`
* `public/scripts/activity-intelligence/activity-intelligence-api.js`
* `public/styles/activity-intelligence/activity-intelligence-management.css`
* `public/views/activity-intelligence.html`
* `routes/activity-intelligence.routes.js`
* `controllers/activity-intelligence.controller.js`
* `services/activity-intelligence-service.js`
* `services/activity-intelligence-perf.js`
* `data/activity-intelligence-sql-reader.js`
* `data/activity-intelligence-sql-writer.js`
* `tests/activity-intelligence-contract-check.js`

## Reusable Form Engine contracts

### Generic Other

Other is a reusable Form Designer / Form Engine capability. Historical suggestions provide candidate values only; the Form Engine owns canonical answer mutation. `single_choice` and `multiple_choice` may require different canonical mutation mechanics inside the Form Engine, and consumers must not reimplement those mechanics.

Supported writer contracts may encounter persisted choice values in scalar-, object-, or array-shaped representations. Historical-assist normalization must respect those supported persisted forms without moving canonical mutation ownership out of the Form Engine.

Accepted regression restoration state:

```text
GENERIC_OTHER_HISTORY_REGRESSION_RESTORATION
RUNTIME_PRODUCT_PASS

GENERIC_OTHER_FORM_ENGINE_PARITY
RUNTIME_PRODUCT_PASS
```

This closes the repaired Other-history regression for both `single_choice` and `multiple_choice`.

### Person / Company assist

```text
FORM_ASSIST_PERSON_COMPANY_RUNTIME_PRODUCT_PASS
```

Person / Company historical assist is reusable field-assist capability, not a fixed-form feature. Governance and future implementation must use reusable field settings and semantics rather than hardcoded activity names or current business-field labels.

## Records projection performance state

### Phase 1 — Record List Projection V1

The dedicated lightweight record-list path exists. Records list views do not require full submissions; detail/edit may still use one-record or full-detail paths. Analytics, export, and other full consumers remain separate.

```text
PHASE_1_RECORD_LIST_PROJECTION_V1_CODE_PASS
```

### Phase 1.1 — Full-state double-load removal

The Records full-state duplicate load was removed. Runtime HAR evidence confirmed the Records path can operate without a duplicate `/submissions` load.

```text
PHASE_1_RECORD_LIST_PROJECTION
EXIT_PASS

PHASE_1_1_DOUBLE_LOAD_REMOVAL
RUNTIME_HAR_PASS
```

### Phase 1.2 — Count projection consistency

Records counts for 我的紀錄 and 全部紀錄 use projection-owned state.

```text
PHASE_1_2_RECORDS_COUNT_PROJECTION_CONSISTENCY
RUNTIME_PRODUCT_PASS
```

## Answer Hydration V1

Answer hydration page-size optimization is complete. Overview showed meaningful runtime improvement; Submissions performance was neutral. No unsupported percentage is asserted here.

```text
ANSWER_HYDRATION_V1_FUNCTIONAL_RUNTIME_PASS
OVERVIEW_PERFORMANCE_PASS
SUBMISSIONS_PERFORMANCE_NEUTRAL
OVERALL_PERFORMANCE_V1_PARTIAL_PASS
```

## Scoped Tab Render V1

Warm desktop navigation could avoid Activity Intelligence data requests while still paying global root-rendering cost. V1 introduced opt-in scoped navigation for same-activity warm transitions:

* Analytics → Records / Quick Entry
* Records → Analytics

The `.aim-main` boundary is replaced while the stable root, shell, topbar, and sidebar remain. Breadcrumb and navigation state are refreshed locally. The global `render()` path remains authoritative fallback, and mobile remains on the global-render path. This work did not change backend, API, data boundaries, or pagination.

Accepted evidence is deliberately limited to:

```text
ACTIVITY_INTELLIGENCE_SCOPED_TAB_RENDER_V1_CODE_PASS
ACTIVITY_INTELLIGENCE_SCOPED_TAB_RENDER_V1_NETWORK_RUNTIME_PASS
```

Full `RUNTIME_PRODUCT_PASS` or `CLOSED` is not claimed because the recorded acceptance covers static/code and network-runtime evidence, not a complete product smoke acceptance.

## Protected product contracts

Performance, rendering, projection, and data-ownership work must preserve:

* reusable Form Designer behavior;
* reusable Form Engine semantics;
* canonical answer ownership;
* Quick Entry state;
* Person assist;
* Company assist;
* Generic Other-history behavior;
* Records counts;
* Analytics semantics;
* Follow-up semantics.

An already-PASS product contract must not be redesigned merely to improve rendering or data ownership. Scoped rendering or a lightweight data path does not make global fallback, cache maps, or full-submission consumers obsolete.

## Records shared runtime snapshots (2026-09-07)

```text
RECORDS_PERFORMANCE_CODE_PASS
```

Repository evidence showed that `/record-list` repeated the same version's complete runtime item metadata in each row. Client initialization normalized those items three times per record: for answer values, option notes, and the runtime snapshot. This slice removes that repeated transport and preparation work without changing the logical Records dataset.

The Records loader now opts into `runtimeSnapshots=shared-v1`. Inside the existing `{ success, data }` response, `data` contains `{ runtimeSnapshots: 'shared-v1', records, formRuntimeSnapshots }`. Each record replaces its inline snapshot with a zero-based `formRuntimeSnapshotRef`; `null` preserves a missing snapshot. The service deduplicates snapshots by their persisted `versionId`, retaining historical versions and form contexts. Requests without the supported opt-in still return the original array, and the new frontend accepts that legacy array for compatibility with older servers.

The client prepares each shared snapshot and its field lookup once per response. Records share that normalized metadata, while answer values and option notes remain record-owned. There is no persistent metadata cache; reloads prepare fresh objects. Rich submission normalization keeps its original behavior unless the Records adapter supplies prepared metadata. Shared snapshot metadata is read-only consumer input; editing continues through the existing rich detail/edit path.

Structural effect: for N records, V distinct versions and F fields per version, repeated snapshot serialization and initialization field normalization fall from O(N × F) to O(V × F). Per-record answers, server answer hydration, browser full-dataset ownership, filtering and rendering remain in place. This is not server pagination and does not reduce SQL row counts.

Validation: `node tests/activity-intelligence-contract-check.js` passed, including actual client normalizer parity across current/historical versions, visitor/field-intelligence contexts, void records, Other text, option notes, cards and summaries; empty/missing snapshots; invalid references; array compatibility; and fresh preparation on reload. A synthetic 200-record, five-field, single-version fixture reduced serialized JSON from 650,381 to 303,796 bytes and initialization field-normalizer calls from 3,000 to 5. These are repository fixture measurements, not browser/production timings or a Runtime Product PASS. Changed JavaScript syntax, diff whitespace and UTF-8/BOM checks passed. No database or Sheet changes were made.

## Next performance workstream

```text
RECORDS_SERVER_PAGINATION_NOT_IMPLEMENTED
```

Current `/record-list` remains application-level unpaginated. Records filtering, search, sorting, and count ownership are still largely frontend-based. Naive server pagination would break filter, sort, or count correctness; a future server-pagination workstream must preserve those contracts together.

Records server pagination is separate from Scoped Tab Render. Analytics / Follow-up full-submission and data-boundary work also remain separate future workstreams. This archive does not design or authorize any of them.

## Handoff boundary

This stage is ready for phase handoff at the accepted states above. Future work should route through `docs/crm-current-state-index.md`, apply the durable rules in `docs/architecture-governance.md`, and protect the cleanup boundaries in `docs/non-breaking-cleanup-roadmap.md`.
