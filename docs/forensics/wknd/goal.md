# Weekend Forensics Goal

Project: TFC CRM / 新CRM修改中

## Purpose

This folder defines a weekend repo-forensics campaign.

The purpose is to help the human owner and ChatGPT build a clearer, evidence-based understanding of the current repository before making any future planning decisions.

This campaign is for planning-quality evidence, not for code changes.

## Why This Exists

The repo has grown into a mixed architecture with:

* Node / Express backend
* Vanilla JS SPA frontend
* SQL / Supabase data paths
* Google Sheets / RAW / legacy data paths
* shared frontend helpers
* CSS modules plus JS-injected CSS
* governance docs, archive docs, reports, and generated Repomix snapshots

This makes it easy for an LLM to choose the wrong file, wrong active path, wrong source of truth, or wrong cleanup assumption.

The campaign should reduce that risk.

## Primary Goal

Create a repo-wide understanding map that helps future ChatGPT / Codex / Jules work avoid wrong assumptions.

The final outcome should help answer:

* Which files are active entry points?
* Which files are source, generated, vendor, archive, or compatibility?
* Which areas are most likely to confuse an LLM?
* Which domains need deeper evidence before future cleanup planning?
* Which docs should be read first before touching a domain?
* Which paths must not be casually modified without deeper forensic review?

## Non-Goals

This campaign must NOT:

* modify source code
* cleanup files
* remove files
* refactor code
* rename files
* format files
* migrate features
* optimize architecture
* decide what is dead
* decide what can be deleted
* produce patches
* open PRs
* create commits

## Expected Outputs

The campaign should produce markdown reports under:

`docs/forensics/wknd/results/`

Reports should contain evidence tables, not implementation plans.

Each report should clearly separate:

* evidenced facts
* unknowns
* compatibility concerns
* generated / vendor / archive boundaries
* future forensic questions

## Working Principle

Unknown is not dead.

Legacy is not removable.

Compatibility is not removable.

Generated is not source.

Archive is not current truth unless proven.

Docs are guidance only when their current authority is evidenced.

No cleanup decision should be made from this campaign alone.

## Human / Tool Roles

Human owner:

* product direction
* final judgment
* whether to proceed to future planning

ChatGPT:

* planning strategist
* prompt designer
* report reviewer
* PASS / PARTIAL / NG evaluator

Codex / Jules:

* repo-local forensic worker
* evidence collector
* report generator

Gemini:

* optional cross-check reviewer
* evidence auditor

## Success Definition

This campaign succeeds if, by the end, ChatGPT and the human owner have a clearer repo map and can design safer future prompts.

It does not need to prove every detail.

It does not need to finish every domain.

It does not need to recommend cleanup.

It only needs to improve planning quality and reduce wrong assumptions.
