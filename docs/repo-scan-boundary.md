# TFC CRM Repository Scan Boundary Policy

## Core Principle

The repo scan boundary policy must prevent context pollution while preserving access to necessary governance references.

Every Gemini/Codex CRM task must apply Necessary Docs Only / Task-Tiered Docs Reading, then inspect only targeted owner files or explicitly scoped governance references.

## 1. Purpose

This document prevents context pollution and uncontrolled repo scanning.

It treats governance docs as references to read when directly relevant, not mandatory input for every task.

It excludes generated, vendor, binary, lockfile, static-map, and duplicated context from default full-content reads.

It enforces targeted owner-file inspection instead of broad repository scanning.

## 2. Required Scan Sequence

Every future Gemini/Codex CRM task must follow this order:

1. Identify task type and scope.
2. If scope is known and the patch is micro/small, follow ChatGPT Scope Freeze and targeted repo evidence.
3. If scope is unknown, use Gemini evidence-only forensics to identify owner files, functions, selectors, constraints, and stop conditions before Codex patching.
4. If the task is architecture, cross-module, or governance work, read only the necessary governance docs.
5. Apply this repo scan boundary policy.
6. Inspect only targeted owner files.
7. Use targeted `rg`/search for runtime linkage when needed.
8. Stop and report if the task requires out-of-scope files, schema/RLS/GRANT changes, product decisions, or browser/runtime confirmation.

## 3. Necessary Docs Only / Task-Tiered Docs Reading

Reading docs is not free and can waste Gemini/Codex usage.

The old pattern "always read all baseline docs before patching" is deprecated.

Docs are governance references, not mandatory input for every task.

Task-tiered reading:

* Micro patches usually do not read docs; they rely on ChatGPT Scope Freeze and targeted repo evidence.
* Small patches read only directly relevant docs when needed.
* Governance, architecture, and cross-module tasks may read necessary governance docs only.
* Unknown-scope tasks use Gemini evidence-only forensics first, not Codex broad scanning.
* Do not read all baseline docs by default.

## 4. Conditional Topic Docs

Read these only when the task matches the topic:

* `docs/audit-session-log-governance.md`
  Use for audit/session architecture, audit taxonomy, session lifecycle, backend mutation audit hooks, audit redaction rules, or manager-log future work.
* `docs/echarts-migration-record.md`
  Use for chart, ECharts, Dashboard analytics, Sales Analysis chart, Taiwan map, or chart style migration work.
* `docs/highcharts-highmaps-remaining-references-audit.md`
  Historical Highcharts / Highmaps audit. Use only when reviewing the completed retirement history or verifying `DOC_HISTORY_ONLY` references. Do not treat docs-only Highcharts mentions as active runtime/package/vendor evidence.
* `docs/schema/audit-logs-v1.sql`
  Keep available for audit/session schema-related tasks when schema evidence is explicitly required.

Weekend Forensics archive:

* `docs/forensics/wknd/results/**`
  Archived planning-evidence area for the completed Weekend Forensics campaign. It is not mandatory baseline reading for every task. Consult it only when a task uses Weekend Forensics-derived planning, repo-wide LLM safety, source/generated/vendor/archive boundaries, or high-risk planning assumptions. It is not source code, not generated source, not patch target content, and does not authorize cleanup or deletion.

## 5. Default No-Read Content

Default No-Read means:

* Do not read full contents by default.
* Path existence and runtime references may still be checked with targeted search.
* Do not use absolute wording like never unless the task is truly impossible.
* Explicit user authorization can override the default boundary.

Default no-read areas:

* `repomix-packs/**`
  Reason: generated local AI context output and duplicated source context. It is not source-of-truth, not runtime source, and should not be version-controlled.
  Exception: only when explicitly auditing or modifying repomix/context-pack generation. If needed, regenerate locally with `scripts/**/pack-*.ps1`; keep generator scripts for now.
* `public/assets/vendor/**`
  Reason: third-party/minified vendor libraries.
  Exception: path/reference checks for Highcharts/ECharts cleanup, chart dependency audits, or explicit library linkage verification.
* `public/assets/maps/taiwan.json`
  Reason: large static map data.
  Exception: path/reference checks for map widget, 404, missing map, or explicit map geometry/data task.
  Active dependency: preserved for the ECharts Taiwan map and must not be classified as removable Highcharts cleanup residue.
* `package-lock.json`
  Reason: generated dependency lockfile.
  Exception: npm install issue, dependency resolution, security audit, lockfile corruption, or version mismatch.
* `scripts/**/*.ps1`
  Reason: repomix/context-pack utility scripts.
  Exception: modifying snapshot packaging or AI context pack generation.
* Binary/image/font/archive/export/log/temp files:
  * `*.png`
  * `*.jpg`
  * `*.jpeg`
  * `*.gif`
  * `*.webp`
  * `*.ico`
  * `*.woff`
  * `*.woff2`
  * `*.ttf`
  * `*.otf`
  * `*.pdf`
  * `*.xlsx`
  * `*.xls`
  * `*.zip`
  * `*.7z`
  * `*.rar`
  * `*.log`
  * `*.bak`
  * `*.old`
  * `*.tmp`

## 6. Must Keep Available With Targeted Scan

These are active CRM runtime/source areas and must not be globally excluded:

* `public/scripts/**`
* `public/views/**`
* `public/components/**`
* `public/**/*.html`
* `public/styles/**`
* `routes/**`
* `controllers/**`
* `services/**`
* `data/**`
* `middleware/**`
* `config.js`
* `config/**`
* `app.js`
* `services/service-container.js`
* `package.json`

Must Keep Available does not mean scan the whole folder every time.

It means the area cannot be excluded by default. Agents must inspect only the task owner files.

Specific rules:

* `data/**` is active CRM data-flow source for Supabase, SQL readers/writers, Sheet fallback, DTO mapping, and persistence. Do not classify it as default exclude. Inspect only relevant reader/writer owner files.
* `public/styles/**` is active runtime CSS. Inspect only relevant CSS modules/selectors when the task touches layout, visual regression, header, dashboard, Internal Ops, responsive behavior, or UI hierarchy.
* `package.json` is conditional but must remain available for dependency, script, module, or runtime package checks.

## 7. Runtime Linkage Rule

Before treating a path as irrelevant for a task, use targeted search when needed for:

* imports
* `require` calls
* script tags
* link tags
* fetch calls
* route registration
* service-container wiring
* data reader/writer usage
* CSS selector ownership
* asset references
* vendor references
* config loaders

Highcharts / Highmaps retirement rule:

* Highcharts references in docs are `DOC_HISTORY_ONLY` unless future runtime/package evidence proves otherwise.
* No active Highcharts should exist in public scripts, package files, vendor assets, setup scripts, or `node_modules`.
* Future scans must not classify docs-only Highcharts mentions as active source.
* ECharts and `public/assets/maps/taiwan.json` remain active scan targets.

## 8. Unknown / Need User Decision

These require explicit Product Owner decision before exclusion, cleanup, deletion, or broad modification:

* `public/leads-view.html`
* `public/styles/leads-view.css`
* calendar / meeting hidden workflow related files
* meeting modal components
* calendar-service related workflow

These areas may be active, hidden, pending ownership decision, or legacy but still referenced. Do not modify, delete, or exclude them permanently without explicit Product Owner decision.

## 9. Gemini Rule

Gemini is evidence-only repo forensics unless explicitly authorized otherwise.

Gemini must:

* follow `docs/repo-scan-boundary.md`
* read docs broadly only when the task itself is governance/docs forensics
* report inspected files
* report intentionally skipped files
* report targeted searches used
* identify owner files
* identify headings, selectors, functions, current behavior, constraints, conflicts, touch points, forbidden files, and stop conditions when relevant
* identify unknowns
* not act as product strategy, planning, recommendation, UI design, or final patch-plan authority
* not produce patch text or final implementation plans unless explicitly requested
* not patch unless explicitly authorized

## 10. Codex Rule

Codex is a minimal patch executor.

Codex must:

* follow ChatGPT Scope Freeze
* follow `docs/repo-scan-boundary.md`
* modify only explicitly allowed files
* read only files explicitly allowed or directly required by the task
* avoid no-read content unless explicitly authorized
* avoid broad repo exploration
* avoid baseline docs reading by default
* avoid scope creep
* not run browser tests
* not start server
* not install packages
* not commit
* stop and report if required files/scope are unclear or if the required owner/change is outside allowed scope

Default validation:

* `git diff --check`
* `git diff --name-only`

For JavaScript changes only:

* `node --check` changed JavaScript files

## 11. Phase Handoff And Changelog Rule

`docs/repo-scan-boundary.md` is a governance reference for scan-boundary policy.

After a phase handoff, agents must evaluate whether this file or other directly relevant governance docs need updates.

Updates are required only when scan boundaries, Necessary Docs Only rules, Default No-Read areas, Must Keep Available areas, Unknown/Need User Decision areas, or prompt workflow rules changed.

Any update must include a changelog entry.

Small patches do not require changing this file unless the scan policy itself changed.

## 12. Prompt Snippet

```text
Follow the ChatGPT Scope Freeze.
Read only files explicitly allowed or directly required by the task.
Do not perform broad docs or repo scans.
Do not scan the whole repo.
Do not read Default No-Read contents unless explicitly authorized.
Use targeted owner-file inspection and targeted rg/search only.
If scope is unclear, stop and request evidence-only forensics.
Use static validation only unless the user explicitly approves otherwise.
Report inspected files and intentionally skipped files.
```

## 13. Changelog

### 2026-07-06

* Recorded completed Highcharts / Highmaps retirement scan rule: docs-only Highcharts mentions are `DOC_HISTORY_ONLY`, while ECharts and `public/assets/maps/taiwan.json` remain active scan targets.
* Classified `docs/forensics/wknd/results/**` as archived Weekend Forensics planning evidence, not mandatory baseline reading or patch target content.
* Clarified that Weekend Forensics archive consultation is conditional and does not authorize cleanup or deletion.

### 2026-06-18

* Added `docs/audit-session-log-governance.md` as the conditional must-read reference for audit/session/backend mutation audit work.
* Clarified that `docs/schema/audit-logs-v1.sql` remains available for explicit audit/session schema-evidence tasks.

### 2026-06-15

* Replaced Always Read Baseline Docs with Necessary Docs Only / Task-Tiered Docs Reading.
* Aligned Gemini, Codex, and prompt snippet rules with Scope Freeze and targeted evidence.

### 2026-06-09

* Added phase handoff and changelog rule.
* Clarified that scan-boundary governance must protect Always Read Baseline Docs from being skipped.
* Clarified when `docs/repo-scan-boundary.md` should be updated after phase handoff.
