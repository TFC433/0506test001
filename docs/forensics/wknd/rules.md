# Weekend Forensics Rules

Project: TFC CRM / 新CRM修改中

## Scope

This is a repo-forensics campaign.

The goal is to collect evidence for future planning quality.

This is not a cleanup campaign.

This is not a patch campaign.

This is not a refactor campaign.

This is not a migration campaign.

## Runner Model

This campaign uses a queue-runner model.

Each runner execution must:

1. read `goal.md`
2. read `rules.md`
3. read `queue.md`
4. read `state.md`
5. find the first task with status `PENDING`
6. run only that one task
7. write exactly one result report
8. update `state.md`
9. stop

Do not run multiple queue tasks in one execution.

Do not skip ahead.

Do not continue after a task becomes `BLOCKED`.

## Allowed Write Area

Codex / Jules may write only:

1. one markdown report under:

   `docs/forensics/wknd/results/`

2. the queue state file:

   `docs/forensics/wknd/state.md`

No other files may be created, edited, renamed, formatted, or deleted.

Do not modify:

* `goal.md`
* `rules.md`
* `queue.md`
* source files
* existing project docs outside `docs/forensics/wknd/`
* generated snapshots
* vendor assets

## Hard No

Do NOT:

* modify source code
* modify existing project docs outside `docs/forensics/wknd/`
* refactor
* delete files
* rename files
* format files
* install packages
* run broad tests
* create commits
* open PRs
* classify anything as dead
* recommend deletion
* recommend cleanup patches
* propose implementation
* propose migration
* treat UNKNOWN as dead
* treat LEGACY as removable
* treat COMPATIBILITY as removable
* treat GENERATED as source
* treat ARCHIVE as current truth unless proven
* edit generated snapshots
* edit vendor assets
* edit binary/media/font files

## Allowed Actions

Allowed actions are limited to:

* read files
* search files
* count files or lines
* inspect imports and exports
* inspect route/controller/service relationships
* inspect dependency injection
* inspect data reader/writer call paths
* inspect CSS load order and selector ownership
* inspect JS-injected CSS and common UI helpers
* inspect frontend SPA active paths
* inspect docs authority and archive boundaries
* write one markdown report under `docs/forensics/wknd/results/`
* update `docs/forensics/wknd/state.md`

## Exclusions

Do not deeply inspect:

* `.git`
* `node_modules`
* `dist`
* `build`
* `cache`
* `logs`
* `coverage`
* binary files
* media files
* image files
* audio files
* video files
* font files
* minified vendor files

Generated or packed files may be listed, but must not be treated as source code.

Vendor assets may be listed, but must not be hand-edited or treated as app logic.

## Evidence Rules

Every non-obvious claim must include file path evidence.

Use direct file paths and short snippets where useful.

Separate facts from assumptions.

If evidence is incomplete, say `UNKNOWN`.

Do not infer active ownership from filename alone.

Do not assume newer-looking files are correct.

Do not assume older-looking files are obsolete.

Do not assume SQL files replace non-SQL files unless actual active usage is traced.

Do not assume compatibility files are removable.

Do not assume archive docs are current instructions.

Do not assume generated Repomix files are source files.

## Allowed Classifications

Use only these classifications:

* EVIDENCED
* UNKNOWN
* NOT_INSPECTED
* ACTIVE_CONFIRMED
* POSSIBLY_ACTIVE
* COMPATIBILITY_CANDIDATE
* GENERATED_SNAPSHOT
* VENDOR_ASSET
* DOCS_ARCHIVE
* ACTIVE_DOC
* ROADMAP_DOC
* REPORT_DOC
* DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC

## Forbidden Classification

Do not use:

* DEAD

## Required Report Sections

Each result report must include:

1. Executive Conclusion
2. Files Inspected
3. Evidence Tables
4. LLM Confusion Risks
5. No-Touch / Caution Areas
6. Evidence Gaps
7. Recommended One Next Forensic Question, if applicable

Reports must not include:

* cleanup plans
* refactor plans
* deletion candidates
* patch instructions
* implementation steps
* migration plans

## Status Values

Use only:

* PENDING
* RUNNING
* DONE
* PARTIAL
* BLOCKED

## Stop Conditions

Stop the current run if:

* required queue or state files are missing
* the next task is unclear
* the task requires source modification
* the task requires cleanup/refactor/deletion
* the task cannot produce evidence without guessing
* the result file path is not under `docs/forensics/wknd/results/`
* a required prior report is missing for a dependent task
* `state.md` cannot be safely updated

When stopped, mark the task as `BLOCKED` in `state.md`, explain why, and stop.
