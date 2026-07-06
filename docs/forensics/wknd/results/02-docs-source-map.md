# 02 Docs Source Map

Task: `02-docs-source-map`

Status: DONE

Run time: 2026-07-03 22:51 to 2026-07-03 22:54 +08:00

## Executive Conclusion

EVIDENCED: The docs root is small and currently contains governance, roadmap, report/audit, SOP, and schema-reference documents. The root docs inventory is limited to `docs/architecture-governance.md`, `docs/crm-current-state-index.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/non-breaking-cleanup-roadmap.md`, `docs/repo-operational-consolidation-report.md`, `docs/repo-scan-boundary.md`, `docs/audit-session-log-governance.md`, `docs/echarts-migration-record.md`, `docs/highcharts-highmaps-remaining-references-audit.md`, `docs/supabase-access-sop.md`, and `docs/schema/audit-logs-v1.sql`.

EVIDENCED: `docs/architecture-governance.md`, `docs/tfc-crm-ui-style-governance.md`, `docs/supabase-access-sop.md`, and `docs/non-breaking-cleanup-roadmap.md` are explicitly listed as current governance docs by `docs/repo-operational-consolidation-report.md:61-69`. This does not make every statement implementation authorization; several docs explicitly limit their own authority.

EVIDENCED: `docs/crm-current-state-index.md` is a routing index, not the source of truth; it says repo evidence and source governance docs override it at `docs/crm-current-state-index.md:5-9`.

EVIDENCED: `docs/non-breaking-cleanup-roadmap.md` is planning-only and not self-authorizing for deletion or runtime changes at `docs/non-breaking-cleanup-roadmap.md:3-8`.

EVIDENCED: `docs/schema/audit-logs-v1.sql` is a manual Supabase reference script, documents already-applied schema, and is not an auto-run migration at `docs/schema/audit-logs-v1.sql:4-5`.

UNKNOWN: No separate `docs/archive/**` or handoff directory was found in the docs inventory during this run. Absence from this targeted inventory is not proof that archived or handoff-like content cannot exist elsewhere or inside long governance docs.

## Files Inspected

| File | Inspection scope | Evidence |
| --- | --- | --- |
| `docs/architecture-governance.md` | Purpose, scan policy, reference-doc statements, cleanup/no-touch addendum | `docs/architecture-governance.md:13-43`, `docs/architecture-governance.md:1491-1530`, `docs/architecture-governance.md:1668-1726` |
| `docs/crm-current-state-index.md` | Index authority and domain routing map | `docs/crm-current-state-index.md:1-13`, `docs/crm-current-state-index.md:24-88` |
| `docs/tfc-crm-ui-style-governance.md` | UI governance authority and Product Cost/modal boundary | `docs/tfc-crm-ui-style-governance.md:3-14`, `docs/tfc-crm-ui-style-governance.md:251-301` |
| `docs/non-breaking-cleanup-roadmap.md` | Roadmap authority, no-touch reminders, cleanup planning boundary | `docs/non-breaking-cleanup-roadmap.md:3-18`, `docs/non-breaking-cleanup-roadmap.md:43-63`, `docs/non-breaking-cleanup-roadmap.md:87-116` |
| `docs/repo-operational-consolidation-report.md` | Current architecture summary, governance-doc list, known caution areas | `docs/repo-operational-consolidation-report.md:1-7`, `docs/repo-operational-consolidation-report.md:54-107`, `docs/repo-operational-consolidation-report.md:288-316` |
| `docs/repo-scan-boundary.md` | Docs-read policy, conditional topic docs, active source areas, unknown/user-decision areas | `docs/repo-scan-boundary.md:1-17`, `docs/repo-scan-boundary.md:48-69`, `docs/repo-scan-boundary.md:111-168` |
| `docs/audit-session-log-governance.md` | Audit/session governance, schema relationship, redaction/future patch rules | `docs/audit-session-log-governance.md:1-29`, `docs/audit-session-log-governance.md:31-46`, `docs/audit-session-log-governance.md:84-90`, `docs/audit-session-log-governance.md:184-198` |
| `docs/echarts-migration-record.md` | ECharts baseline and Highcharts caution | `docs/echarts-migration-record.md:1-6`, `docs/echarts-migration-record.md:64-95` |
| `docs/highcharts-highmaps-remaining-references-audit.md` | Highcharts/Highmaps audit, remaining references, cleanup-readiness cautions | `docs/highcharts-highmaps-remaining-references-audit.md:1-6`, `docs/highcharts-highmaps-remaining-references-audit.md:67-122` |
| `docs/supabase-access-sop.md` | Supabase access posture and future-table SOP | `docs/supabase-access-sop.md:1-6`, `docs/supabase-access-sop.md:34-64` |
| `docs/schema/audit-logs-v1.sql` | Manual schema reference and frontend-access boundary | `docs/schema/audit-logs-v1.sql:4-13`, `docs/schema/audit-logs-v1.sql:111-118` |

## Evidence Tables

### Docs Inventory And Classification

| Path | Classification | Authority boundary | Evidence |
| --- | --- | --- | --- |
| `docs/architecture-governance.md` | ACTIVE_DOC | Broad architecture, AI collaboration, safety, scan, and domain governance reference. Still instructs agents to use necessary docs only, not all docs by default. | Purpose says it defines mandatory project governance at `docs/architecture-governance.md:13-43`; scan policy says docs are references and not mandatory input for every task at `docs/architecture-governance.md:1496-1518`. |
| `docs/crm-current-state-index.md` | ACTIVE_DOC | Routing index only. Use it to find relevant docs and owners, then verify with repo evidence/source governance. | It states it is "a routing index, not the source of truth" and that repo evidence/source governance override it at `docs/crm-current-state-index.md:5-9`. |
| `docs/tfc-crm-ui-style-governance.md` | ACTIVE_DOC | UI governance and PASS/NG reference, not a refactor authorization. | It says it is not a pixel-perfect spec, token catalog, or authorization to refactor shared CSS/components at `docs/tfc-crm-ui-style-governance.md:3-14`. |
| `docs/non-breaking-cleanup-roadmap.md` | ROADMAP_DOC | Planning record for cleanup candidates and no-touch reminders. Not source-change authorization. | Purpose says it is planning-only and does not authorize deletion/runtime changes at `docs/non-breaking-cleanup-roadmap.md:3-8`; no-touch reminders appear at `docs/non-breaking-cleanup-roadmap.md:94-104`. |
| `docs/repo-operational-consolidation-report.md` | REPORT_DOC | Current-state summary and caution report. Useful for orientation, but claims should be source-checked before changing runtime behavior. | It summarizes architecture at `docs/repo-operational-consolidation-report.md:3-7`, lists current governance docs at `docs/repo-operational-consolidation-report.md:61-69`, and lists caution areas at `docs/repo-operational-consolidation-report.md:94-107`. |
| `docs/repo-scan-boundary.md` | ACTIVE_DOC | Governance reference for scan boundaries and context control. It constrains reading behavior, not feature implementation. | It says it prevents context pollution and enforces targeted owner-file inspection at `docs/repo-scan-boundary.md:1-17`; conditional topic-doc rules are listed at `docs/repo-scan-boundary.md:48-59`. |
| `docs/audit-session-log-governance.md` | ACTIVE_DOC | Canonical audit/session governance and future patch rules. It is not a frontend viewer authorization. | It defines audit/session purpose and says no frontend audit viewer was implemented in this chapter at `docs/audit-session-log-governance.md:3-10`; future patch rules are at `docs/audit-session-log-governance.md:184-198`. |
| `docs/echarts-migration-record.md` | REPORT_DOC | Accepted chart baseline record. It explicitly does not authorize Highcharts cleanup by itself. | Purpose states it records accepted ECharts baselines and does not authorize Highcharts cleanup at `docs/echarts-migration-record.md:1-6`. |
| `docs/highcharts-highmaps-remaining-references-audit.md` | REPORT_DOC | Documentation-only audit of remaining Highcharts/Highmaps references. It preserves vendor/package/runtime caution. | Purpose says documentation-only and no dependency/script/package/runtime modification at `docs/highcharts-highmaps-remaining-references-audit.md:1-6`; keep/not-safe cautions are at `docs/highcharts-highmaps-remaining-references-audit.md:96-122`. |
| `docs/supabase-access-sop.md` | ACTIVE_DOC | Supabase access posture and future-table SOP. It does not authorize immediate SQL execution. | Purpose says documentation-only and no immediate SQL execution at `docs/supabase-access-sop.md:1-6`; current decision says no broad grants at `docs/supabase-access-sop.md:34-40`. |
| `docs/schema/audit-logs-v1.sql` | ACTIVE_DOC | Schema reference for audit/session work, not an auto-run migration. | Header comments say manual Supabase reference script only and not an auto-run migration at `docs/schema/audit-logs-v1.sql:4-5`. |

### Current Source-Of-Truth Map

| Domain | Read first | Cross-check before changing source | Evidence |
| --- | --- | --- | --- |
| General architecture and AI/collaboration safety | `docs/architecture-governance.md` | Yes: the same doc says agents should inspect targeted owner files after relevant docs/evidence are identified. | `docs/architecture-governance.md:13-43`, `docs/architecture-governance.md:1514-1518` |
| Task scoping and docs-reading policy | `docs/repo-scan-boundary.md` | Yes: it requires targeted owner-file inspection and targeted runtime linkage checks when needed. | `docs/repo-scan-boundary.md:19-30`, `docs/repo-scan-boundary.md:139-155` |
| UI style, Dashboard baseline, Opportunity Detail baseline | `docs/tfc-crm-ui-style-governance.md` | Yes: it says the source of truth includes existing repo forensic record and accepted dual UI baselines. | `docs/tfc-crm-ui-style-governance.md:3-14`, `docs/tfc-crm-ui-style-governance.md:30-45` |
| Current module routing | `docs/crm-current-state-index.md` | Required: this file explicitly defers to repo evidence and source governance. | `docs/crm-current-state-index.md:5-13`, `docs/crm-current-state-index.md:24-88` |
| Cleanup planning and no-touch reminders | `docs/non-breaking-cleanup-roadmap.md` | Required: planning only; no deletion/runtime changes without separate approval and validation. | `docs/non-breaking-cleanup-roadmap.md:3-18`, `docs/non-breaking-cleanup-roadmap.md:94-104` |
| Chart migration baseline | `docs/echarts-migration-record.md` plus `docs/highcharts-highmaps-remaining-references-audit.md` | Required: Highcharts/Highmaps remain loaded/called according to the audit, so source and runtime linkage must be checked before chart changes. | `docs/echarts-migration-record.md:64-95`, `docs/highcharts-highmaps-remaining-references-audit.md:67-122` |
| Supabase access posture | `docs/supabase-access-sop.md` | Required for DB/schema work; the SOP references backend service-role architecture and says no immediate SQL changes for existing CRM tables. | `docs/supabase-access-sop.md:7-19`, `docs/supabase-access-sop.md:34-64` |
| Audit/session behavior | `docs/audit-session-log-governance.md` plus `docs/schema/audit-logs-v1.sql` only when schema evidence is in scope | Required: schema SQL is reference-only and audit failures must not change business behavior. | `docs/audit-session-log-governance.md:19-29`, `docs/audit-session-log-governance.md:84-90`, `docs/schema/audit-logs-v1.sql:4-13` |

### Docs Not To Treat As Implementation Authorization

| Document | Why not implementation authorization | Evidence |
| --- | --- | --- |
| `docs/crm-current-state-index.md` | It is an index and expressly not the source of truth. | `docs/crm-current-state-index.md:5-9` |
| `docs/tfc-crm-ui-style-governance.md` | It governs UI style and explicitly does not authorize shared CSS/component refactors. | `docs/tfc-crm-ui-style-governance.md:3-14` |
| `docs/non-breaking-cleanup-roadmap.md` | It is cleanup planning only and does not self-authorize deletion or runtime changes. | `docs/non-breaking-cleanup-roadmap.md:3-8` |
| `docs/repo-operational-consolidation-report.md` | It is a report and caution summary, not a patch scope; it lists no-touch reminders and generated snapshot cautions. | `docs/repo-operational-consolidation-report.md:94-107`, `docs/repo-operational-consolidation-report.md:296-306` |
| `docs/echarts-migration-record.md` | It records accepted ECharts baselines and does not authorize Highcharts cleanup. | `docs/echarts-migration-record.md:1-6`, `docs/echarts-migration-record.md:76-82` |
| `docs/highcharts-highmaps-remaining-references-audit.md` | It is documentation-only and says not to remove anything in the audit task. | `docs/highcharts-highmaps-remaining-references-audit.md:1-6`, `docs/highcharts-highmaps-remaining-references-audit.md:115-122` |
| `docs/supabase-access-sop.md` | It is documentation-only and does not authorize immediate SQL execution. | `docs/supabase-access-sop.md:1-6` |
| `docs/schema/audit-logs-v1.sql` | It is a manual reference and not an auto-run migration. | `docs/schema/audit-logs-v1.sql:4-5` |

### Docs That Need Source Cross-Check Before Use

| Document | Cross-check need | Evidence |
| --- | --- | --- |
| `docs/crm-current-state-index.md` | Verify owners and current source files because it self-identifies as a routing index. | `docs/crm-current-state-index.md:5-13` |
| `docs/repo-operational-consolidation-report.md` | Verify active routes/controllers/services/data files before source changes because it is a summary report with caution areas. | `docs/repo-operational-consolidation-report.md:54-60`, `docs/repo-operational-consolidation-report.md:94-107` |
| `docs/non-breaking-cleanup-roadmap.md` | Verify runtime linkage and get explicit approval before acting on any cleanup candidate. | `docs/non-breaking-cleanup-roadmap.md:11-18`, `docs/non-breaking-cleanup-roadmap.md:94-104` |
| `docs/echarts-migration-record.md` | Verify current chart callers because it says Highcharts/Highmaps remain and points to the audit reference. | `docs/echarts-migration-record.md:70-82` |
| `docs/highcharts-highmaps-remaining-references-audit.md` | Verify chart source/runtime linkage because event charts and script loading remain active concerns in the audit. | `docs/highcharts-highmaps-remaining-references-audit.md:67-95` |
| `docs/supabase-access-sop.md` | Verify source and live DB context before SQL/permission work because it records posture and future SOP, not immediate SQL authorization. | `docs/supabase-access-sop.md:34-64` |
| `docs/schema/audit-logs-v1.sql` | Verify schema task scope and DB state before use because it is not auto-run and frontend access is intentionally restricted. | `docs/schema/audit-logs-v1.sql:4-13`, `docs/schema/audit-logs-v1.sql:111-118` |

## LLM Confusion Risks

| Risk | Classification | Evidence | Guardrail |
| --- | --- | --- | --- |
| Treating the current-state index as authoritative implementation truth | ACTIVE_DOC caution | `docs/crm-current-state-index.md` says it is not source of truth at `docs/crm-current-state-index.md:5-9`. | Use it as a router, then inspect source governance and owner files. |
| Treating cleanup roadmap entries as permission to alter source | ROADMAP_DOC caution | Roadmap says it does not authorize deletion/runtime changes at `docs/non-breaking-cleanup-roadmap.md:3-8`. | Treat as planning context only. |
| Treating report docs as source proof | REPORT_DOC caution | Operational report summarizes architecture and caution areas at `docs/repo-operational-consolidation-report.md:3-7` and `docs/repo-operational-consolidation-report.md:94-107`. | Cross-check with current files before source work. |
| Removing or changing Highcharts based only on ECharts baseline docs | REPORT_DOC caution | ECharts record says Highcharts/Highmaps have not been removed at `docs/echarts-migration-record.md:70-78`; audit says event charts still depend on Highcharts at `docs/highcharts-highmaps-remaining-references-audit.md:67-71`. | Require scoped chart runtime/linkage forensic before any chart dependency work. |
| Reading every baseline doc for every small patch | ACTIVE_DOC caution | Architecture governance says necessary-docs-only replaces always-read-baseline-docs at `docs/architecture-governance.md:1496-1518`; repo scan boundary has the same policy at `docs/repo-scan-boundary.md:32-46`. | Select docs by task topic and inspect targeted owner files only. |
| Treating schema SQL as migration authorization | ACTIVE_DOC caution | `docs/schema/audit-logs-v1.sql` says manual reference only and not auto-run migration at `docs/schema/audit-logs-v1.sql:4-5`. | Use only as schema reference when schema evidence is explicitly scoped. |
| Assuming Sheet/legacy/fallback paths are removable because roadmap mentions cleanup | COMPATIBILITY_CANDIDATE caution | Roadmap no-touch reminders protect Google Sheet fallback, RAW/LINE, system config/auth, weekly business fallback, Internal Ops, Highcharts remnants, and generated snapshots at `docs/non-breaking-cleanup-roadmap.md:94-104`. | Treat compatibility as protected until current runtime evidence and approval exist. |

## No-Touch / Caution Areas

| Area | Classification | Evidence |
| --- | --- | --- |
| Google Sheet fallback broadly | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Protected by `docs/non-breaking-cleanup-roadmap.md:94-101` and `docs/repo-operational-consolidation-report.md:296-303`. |
| RAW contacts and LINE leads RAW flow | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Protected by `docs/non-breaking-cleanup-roadmap.md:96-99` and `docs/repo-operational-consolidation-report.md:298-300`. |
| System Config / Auth Sheet-backed config and users | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Protected by `docs/non-breaking-cleanup-roadmap.md:99` and `docs/repo-operational-consolidation-report.md:301`. |
| Weekly Business read fallback | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Protected by `docs/non-breaking-cleanup-roadmap.md:100` and `docs/repo-operational-consolidation-report.md:302`. |
| Internal Ops Sheet-backed behavior | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Protected by `docs/non-breaking-cleanup-roadmap.md:101`; operational report says Internal Ops remains Sheet-backed at `docs/repo-operational-consolidation-report.md:308-316`. |
| Highcharts / Highmaps remnants | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | ECharts record says not to remove Highcharts/Highmaps without cleanup audit at `docs/echarts-migration-record.md:76-82`; audit says event chart references are not safe to remove at `docs/highcharts-highmaps-remaining-references-audit.md:110-122`. |
| `ProductDetailModal` and legacy modal infrastructure | COMPATIBILITY_CANDIDATE | UI governance says modal compatibility may remain and not govern Activity Hub behavior at `docs/tfc-crm-ui-style-governance.md:251-270`; Product Cost rules say `ProductDetailModal` may remain for compatibility at `docs/tfc-crm-ui-style-governance.md:272-301`. |
| `repomix-packs/**` | GENERATED_SNAPSHOT | Roadmap and operational report say generated snapshots must not be hand-edited at `docs/non-breaking-cleanup-roadmap.md:62-63` and `docs/repo-operational-consolidation-report.md:106-107`. |
| Audit/session schema direct frontend access | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | SQL reference says frontend clients must not directly insert/update/read audit/session rows at `docs/schema/audit-logs-v1.sql:7-13`; SOP says backend-only audit/session tables should not be exposed as frontend Data API tables at `docs/supabase-access-sop.md:55-60`. |

## Evidence Gaps

| Gap | Status | Evidence / reason |
| --- | --- | --- |
| Separate archive/handoff docs | UNKNOWN | The docs inventory inspected in this run did not expose a separate archive or handoff directory, but absence from targeted inventory is not proof of absence elsewhere. |
| Whether every report claim is still source-current | UNKNOWN | Report docs contain current-state summaries and caution areas, but this task did not rescan all source owners. `docs/crm-current-state-index.md:5-9` and `docs/repo-scan-boundary.md:139-155` require source evidence when relevance matters. |
| Whether all chart audit statements still match current source | UNKNOWN | This run inspected docs only and path existence. Task 12 is the proper charting/source boundary pass. |
| Whether all Supabase posture statements match live DB state | UNKNOWN | `docs/supabase-access-sop.md:21-27` references prior DB audit evidence, but this task did not query live DB state. |
| Whether all roadmap candidates remain reachable | UNKNOWN | Roadmap is planning-only; source reachability is intentionally deferred to domain tasks such as tasks 05, 06, 08, 10, 11, and 12. |

## Recommended One Next Forensic Question

For task 03: Which backend route mounts and route aliases are actually active in `app.js`, `routes/index.js`, and `routes/*.routes.js`, and which of those paths are protected by auth/role middleware versus public or unknown?
