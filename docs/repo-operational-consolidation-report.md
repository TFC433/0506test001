# Repo Operational Consolidation Report

## 1. Current project architecture summary

TFC CRM is a Node / Express backed operational CRM workspace. The frontend is served from `public/` and communicates with backend `/api` routes. The backend organizes route, controller, service, and data-access ownership across modules such as companies, contacts, opportunities, events, interactions, sales analysis, products, weekly business, and system/dashboard.

The governance direction is an operational SaaS workspace: restrained, dense, workflow-oriented, and governed by small scoped patches.

## 2. Major frontend areas

Dashboard:

* `public/dashboard.html`
* `public/scripts/dashboard/*`
* `public/scripts/map-manager.js`
* Dashboard is the analytics / KPI / chart / filter tab / widget control baseline.

Opportunity Detail:

* `public/views/opportunity-detail.html`
* `public/scripts/opportunities/opportunity-details.js`
* `public/scripts/opportunities/details/*`
* Opportunity Detail is the operational workflow / high-density CRM / Activity Hub / relationship context / inline editing baseline.

Sales Analysis:

* `public/scripts/sales/sales-analysis.js`
* `public/scripts/sales/sales-analysis-components.js`
* `public/scripts/sales/sales-analysis-helper.js`
* Backend route/controller/service path includes `routes/sales.routes.js`, `controllers/sales.controller.js`, and `services/sales-analysis-service.js`.

Company / Contact / Opportunity list areas:

* `public/scripts/companies/*`
* `public/scripts/contacts/*`
* `public/scripts/opportunities/opportunities.js`
* `public/scripts/opportunities/opportunity-modals.js`
* Related routes and controllers exist under `routes/` and `controllers/`.

## 3. Backend access summary

The backend uses an Express API layer. Controllers expose `/api` endpoints, services hold business logic, and data readers/writers access Supabase-backed storage.

Supabase access follows the server-side service role pattern:

* `config/supabase.js` creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY`.
* Frontend code uses Express `/api` routes rather than direct frontend Supabase table access.

## 4. Current governance docs list

Current governance docs:

* `docs/architecture-governance.md`
* `docs/tfc-crm-ui-style-governance.md`
* `docs/supabase-access-sop.md`

## 5. Current UI baseline docs list

Current UI baseline documentation:

* `docs/tfc-crm-ui-style-governance.md`
* `docs/echarts-migration-record.md`

## 6. Current chart migration status

Sales Analysis, Dashboard trend, and Taiwan map have accepted ECharts baselines. ECharts local vendor asset exists under `public/assets/vendor/echarts/echarts.min.js`.

Highcharts / Highmaps are not removed yet. Remaining references are documented in:

* `docs/highcharts-highmaps-remaining-references-audit.md`

## 7. Current security / Supabase posture

Current posture is backend-owned CRM data access through Express and Supabase `service_role`. Task-context DB audit evidence says existing public CRM tables do not grant `anon` / `authenticated`, RLS is false on existing CRM tables, and no policies were returned by `pg_policies`.

The current decision is no immediate DB permission change and no broad grants to `anon` / `authenticated`.

## 8. Known caution areas

Known caution areas:

* Highcharts cleanup is not done yet.
* UI style governance exists but is not fully rolled out everywhere.
* Future module UI migrations should be module-by-module.
* Event charts still appear to rely on Highcharts.
* Global CSS extraction is not yet authorized.

## 9. Recommended next actions ranked by safety

1. Documentation review.
2. Read-only audits.
3. Small scoped patches with exact file and symbol targets.
4. Avoid broad refactor.

## 10. What should not be done while user is away

Do not:

* run browser testing
* perform UI visual patching
* perform large refactors
* make DB permission changes
* install packages
* start or restart local servers
* occupy localhost ports
