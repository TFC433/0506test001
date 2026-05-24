# TFC CRM Architecture Governance

## 1. Purpose

This document serves as the authoritative AI governance memory layer for the TFC CRM repository. Its primary purpose is to preserve established runtime contracts, hidden architectural relationships, and transitional migration bridges. By documenting these operational realities, this guide prevents accidental cleanup regressions and enables safe, AI-assisted development and maintenance. The overriding goal is operational stability, not architectural purity.

## 2. Repository Architecture Summary

The TFC CRM operates as a hybrid architecture currently undergoing a multi-generation transition:

* **Frontend:** A Vanilla JS Single Page Application (SPA) driven by hash-based routing, manual DOM mutation (`innerHTML`), and a global state object (`window.CRM_APP`). Modules are dynamically loaded via `document.write` synchronous blocking.
* **Backend:** A Node.js/Express API layer utilizing a centralized Inversion of Control (IoC) container (`services/service-container.js`) for dependency injection.
* **Data Layer (Dual-World):** The system operates across two data worlds: a legacy Google Sheets environment (RAW) for intake and operational workflows, and a modernized Supabase/PostgreSQL environment (CORE) for official, verified business entities.

## 3. Frontend Runtime Contracts

### 3.1 SPA Router Cache Contract

The frontend SPA routing (`core/router.js`) relies on a strict caching mechanism to prevent redundant API calls during navigation.

* **Contract:** The router skips executing module load functions if a page's `config.loaded` flag is `true`.
* **Invalidation:** Any module that mutates backend data MUST call `CRM_APP.markStale('pageName')` (or passing an array of page names). This forces the router to drop the cache and re-fetch data upon the next visit to that specific route.

### 3.2 Modal Container Ownership

* **Contract:** The `loadResources()` function in `core/main.js` performs a destructive, brute-force `innerHTML` rewrite of the `#modal-container` by concatenating multiple HTML partials.
* **Risk:** Do NOT bind DOM event listeners or manage state on modal elements prior to the completion of `loadResources()`. Running this function multiple times will orphan event listeners and destroy existing modal DOM nodes.

### 3.3 Opportunity Detail Runtime Ownership

The Opportunity Details page (`public/scripts/opportunities/opportunity-details.js`) acts as a master orchestrator rather than a standard component.

* **Contract:** `loadOpportunityDetailPage()` forcefully wipes the `#page-opportunity-details` container and injects the `/views/opportunity-detail.html` template.
* **Mount Targets:** It expects strict DOM ID mount targets (e.g., `#opportunity-info-card-container`, `[data-stepper-slot="opportunity-stage-stepper"]`) to exist in the template and delegates rendering to globally registered singletons (`OpportunityInfoCard`, `OpportunityStepper`).

### 3.4 Dynamic Style Injection

* **Contract:** Certain components (e.g., `_injectStylesForOppInfoCard()` in `opportunity-details-components.js`) dynamically append `<style>` tags to the document `<head>` at runtime.
* **Risk:** These injected styles contain unscoped, highly generic class names (e.g., `.form-group`, `.form-col`, `.form-label`) that leak into the global CSS cascade. Do NOT add new generic class names via JavaScript injection to prevent collision with static stylesheets.

## 4. RAW ↔ CORE Governance

### 4.1 Dual-World Architecture

The CRM operates across a RAW world (Google Sheets) and a CORE world (SQL).

* **Boundary Management:** `services/service-container.js` controls this boundary via dependency injection.
* **Bridge Ownership:** `ContactService` holds explicit references to both `contactRawReader` (Sheets) and `contactSqlReader` (SQL). It is the authoritative bridge for promoting unverified intake data into official CRM entities.

### 4.2 Identity Contracts

* **RAW Identity:** Bound strictly to Google Sheet array indices / row indexes.
* **CORE Identity:** Bound strictly to standard UUIDs.
* **Migration Bridge Identity:** The RAW sheet uses index 23 (`ORIGINAL_ID`) and index 24 (`STATUS`) to track migration state. A `STATUS` of `'已升級'` acts as the definitive state-machine lock indicating a RAW record has crossed into the CORE SQL world.

### 4.3 Contact Upgrade Lifecycle

The operational flow for promoting a contact is a strict sequence:

1. **Read:** `contactRawReader` fetches the RAW lead.
2. **Bridge Execution:** `ContactService` processes the upgrade logic.
3. **CORE Write:** `contactSqlWriter` inserts the official UUID-based SQL record.
4. **RAW Archive:** `contactWriter` writes back to the Google Sheet, mutating the `STATUS` column to `'已升級'`.

* **Contract Risk:** This requires careful transactional synchronization. If the SQL write succeeds but the Sheet write fails, the system will yield phantom duplicates in the intake pipeline.

### 4.4 DTO Compatibility Bridges

Because the backend migrated to SQL but the frontend UI remains largely legacy, a translation layer is mandatory.

* **Contract:** `normalizeOppForUi(opp)` in `opportunity-details.js` acts as the definitive DTO bridge.
* **Mappings:** It maps SQL properties back to legacy UI keys (e.g., `productDetails` ↔ `potentialSpecification`, `salesChannel` ↔ `channelDetails`, `businessType` ↔ `business_type`).
* **Risk:** Do NOT remove this function or its mappings. Without it, the UI edit forms will render blank and subsequently overwrite valid SQL data with `undefined` upon saving.

## 5. Dangerous Cleanup Zones

The following areas appear to contain "redundant" or "legacy" code but are structurally load-bearing. **DO NOT CLEAN UP:**

1. **`config.js` `CONTACT_FIELDS` Array:** The integer values map strictly to Google Sheet columns A-Z (0-25 max). Do NOT shift these indices to "clean up" space. Repurposed fields (e.g., index 22) must keep their integer intact.
2. **`contactRawReader` DI Injection:** Located in `service-container.js`. Removing this reader because the system is "on SQL now" will instantly sever the intake pipeline (OCR/Line Leads).
3. **`normalizeOppForUi()`:** Located in `opportunity-details.js`. As documented above, this prevents catastrophic UI-driven data loss.
4. **Generic Injected CSS Selectors:** Located in `opportunity-details-components.js`. Attempting to "clean" these by removing them will shatter the edit mode layout.

## 6. Current Technical Debt Classification

### Stable

* Basic Express routing layers (`routes/*`).
* Supabase client initialization (`config/supabase.js`).
* SQL-only read/write domain services (e.g., `EventLogService`).

### Transitional Bridges

* `ContactService` dual-reader injection signature.
* `normalizeOppForUi()` DTO mapping function.

### Hidden Runtime Contracts

* `CRM_APP.markStale()` requirement for cache invalidation.
* Destructive DOM wipe of `#modal-container` during SPA initialization.
* Writer conflict avoidance synchronizing `salesChannel` and `channelDetails` in the frontend before submission.

### Governance Risks

* Dynamic style injection (`_injectStylesForOppInfoCard()`) leaking generic CSS classes into the global namespace.
* `ContactService` acting as an ambiguous provider to downstream controllers that may not distinguish between RAW and CORE payloads.

### Future Stabilization Candidates

* Eliminating the RAW Sheets intake pipeline entirely in favor of SQL intake tables.
* Scoping or migrating dynamically injected CSS to dedicated static stylesheets.

## 7. AI Collaboration Rules

All future AI-assisted modifications MUST adhere to the following principles:

1. **ZERO ASSUMPTION POLICY:** Do not assume standard framework lifecycles (like React/Vue). The codebase is highly procedural Vanilla JS.
2. **Runtime-First Forensics:** Trace DOM mutation ownership and global object (`window.CRM_APP`) dependencies before modifying frontend files.
3. **Evidence-First Modifications:** Base all changes on explicit file contents, not hypothetical best practices.
4. **Minimal Diff Discipline:** Do not rewrite files or perform preventive refactoring. Execute only the precise changes required for the immediate fix or feature.
5. **No Cleanup Without Tracing:** Never delete legacy variables, DTO mappings, or array indices without confirming they are disconnected from both the RAW Sheet pipeline and the SQL CORE pipeline.

## 8. Governance Workflow

Modifications to this document are strictly governed.

* This document is an architectural memory layer, not a roadmap.
* Content may only be added or modified following a verifiable forensic census of the repository proving a change in a runtime contract, lifecycle behavior, or migration bridge.