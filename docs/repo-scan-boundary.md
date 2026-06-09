# TFC CRM Repository Scan Boundary Policy

## Core Principle

The repo scan boundary policy must not be used to skip the core CRM governance docs.

Every Gemini/Codex CRM task must first read the Always Read Baseline Docs, then apply scan boundaries, then inspect only targeted owner files.

## 1. Purpose

This document prevents context pollution and uncontrolled repo scanning.

It protects the core governance docs as mandatory reading before any repository inspection.

It excludes generated, vendor, binary, lockfile, static-map, and duplicated context from default full-content reads.

It enforces targeted owner-file inspection instead of broad repository scanning.

## 2. Required Scan Sequence

Every future Gemini/Codex CRM task must follow this order:

1. Always Read Baseline Docs.
2. Apply this repo scan boundary policy.
3. Identify the task owner area.
4. Inspect only targeted owner files.
5. Use targeted `rg`/search for runtime linkage when needed.
6. Stop and report if the task requires out-of-scope files, schema/RLS/GRANT changes, product decisions, or browser/runtime confirmation.

## 3. Always Read Baseline Docs

These must be read at the start of every Gemini/Codex CRM task:

* `docs/architecture-governance.md`
* `docs/tfc-crm-ui-style-governance.md`
* `docs/repo-operational-consolidation-report.md`
* `docs/supabase-access-sop.md`
* `docs/non-breaking-cleanup-roadmap.md`
* `docs/repo-scan-boundary.md`

Why each file is mandatory:

* `docs/architecture-governance.md` is the supreme collaboration, architecture, PASS/NG, Zero Assumption, and minimal diff rulebook.
* `docs/tfc-crm-ui-style-governance.md` defines UI style, layout, SaaS workspace, density, hierarchy, and visual PASS/NG baselines.
* `docs/repo-operational-consolidation-report.md` provides the current repo state map, active module boundaries, acceptable baselines, and no-touch reminders.
* `docs/supabase-access-sop.md` protects DB access, `service_role` usage, RLS/GRANT decisions, and prevents frontend direct Supabase access.
* `docs/non-breaking-cleanup-roadmap.md` protects cleanup boundaries, do-not-touch areas, legacy fallback risks, and prevents opportunistic deletion/refactor.
* `docs/repo-scan-boundary.md` defines the current scan policy.

## 4. Conditional Topic Docs

Read these only when the task matches the topic:

* `docs/echarts-migration-record.md`
  Use for chart, ECharts, Dashboard analytics, Sales Analysis chart, Taiwan map, or chart style migration work.
* `docs/highcharts-highmaps-remaining-references-audit.md`
  Use for Highcharts, Highmaps, Event chart dependencies, chart vendor cleanup, or vendor removal work.

## 5. Default No-Read Content

Default No-Read means:

* Do not read full contents by default.
* Path existence and runtime references may still be checked with targeted search.
* Do not use absolute wording like never unless the task is truly impossible.
* Explicit user authorization can override the default boundary.

Default no-read areas:

* `repomix-packs/**`
  Reason: generated markdown snapshots and duplicated source context.
  Exception: only when explicitly auditing or modifying repomix/context-pack generation.
* `public/assets/vendor/**`
  Reason: third-party/minified vendor libraries.
  Exception: path/reference checks for Highcharts/ECharts cleanup, chart dependency audits, or explicit library linkage verification.
* `public/assets/maps/taiwan.json`
  Reason: large static map data.
  Exception: path/reference checks for map widget, 404, missing map, or explicit map geometry/data task.
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

## 8. Unknown / Need User Decision

These require explicit Product Owner decision before exclusion, cleanup, deletion, or broad modification:

* `public/leads-view.html`
* `public/styles/leads-view.css`
* calendar / meeting hidden workflow related files
* meeting modal components
* calendar-service related workflow

These areas may be active, hidden, pending ownership decision, or legacy but still referenced. Do not modify, delete, or exclude them permanently without explicit Product Owner decision.

## 9. Gemini Rule

Gemini is read-only repo forensics unless explicitly authorized otherwise.

Gemini must:

* read the Always Read Baseline Docs first
* follow `docs/repo-scan-boundary.md`
* report inspected files
* report intentionally skipped files
* report targeted searches used
* identify owner files
* identify unknowns
* not patch unless explicitly authorized

## 10. Codex Rule

Codex is repo hands.

Codex must:

* read the Always Read Baseline Docs first
* follow `docs/repo-scan-boundary.md`
* modify only explicitly allowed files
* avoid no-read content unless explicitly authorized
* avoid scope creep
* not run browser tests
* not start server
* not install packages
* not commit
* stop and report if the required owner is outside allowed scope

Default validation:

* `git diff --check`
* `git diff --name-only`

For JavaScript changes only:

* `node --check` changed JavaScript files

## 11. Phase Handoff And Changelog Rule

`docs/repo-scan-boundary.md` is part of the Always Read Baseline Docs.

After a phase handoff, agents must evaluate whether this file or other baseline docs need updates.

Updates are required only when scan boundaries, Always Read docs, Default No-Read areas, Must Keep Available areas, Unknown/Need User Decision areas, or prompt workflow rules changed.

Any update must include a changelog entry.

Small patches do not require changing this file unless the scan policy itself changed.

## 12. Prompt Snippet

```text
Read the Always Read Baseline Docs first:
docs/architecture-governance.md
docs/tfc-crm-ui-style-governance.md
docs/repo-operational-consolidation-report.md
docs/supabase-access-sop.md
docs/non-breaking-cleanup-roadmap.md
docs/repo-scan-boundary.md

Then apply docs/repo-scan-boundary.md.
Do not scan the whole repo.
Do not read Default No-Read contents unless explicitly authorized.
Use targeted owner-file inspection and targeted rg/search only.
Report inspected files and intentionally skipped files.
```

## 13. Changelog

### 2026-06-09

* Added phase handoff and changelog rule.
* Clarified that scan-boundary governance must protect Always Read Baseline Docs from being skipped.
* Clarified when `docs/repo-scan-boundary.md` should be updated after phase handoff.
