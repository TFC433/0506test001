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

Product Cost:

* `public/views/product-list.html`
* `public/scripts/products/products.js`
* active UI is a compact flat table with inline global edit mode
* `ProductDetailModal` may remain in the repo but is not the active Product Cost table edit path
* category chip wall / category-order drag UI is legacy / inactive for the current table ordering model

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
* Product Cost visual ordering is frontend-only and must not be confused with Sheet row order or persistent category-order settings.
* Opportunity Detail product-backed spec pricing must not use cost or `systemConfig` value2.

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

## 11. Current Product Cost / Opportunity Spec baseline

Product Cost opportunity-spec mapping:

```text
L = oppSpecOption
M = oppDisplayCategory
N = oppDisplayOrder
O = oppBehaviorMode
P/Q/R/S/T/U/V continue as aspect / description / status / creator / createTime / lastModifier / lastUpdateTime
```

Opportunity Detail possible spec options come from:

```text
GET /api/products/opportunity-specs
```

Endpoint and pricing rules:

* endpoint is lightweight and does not return cost
* endpoint filters active products with truthy `oppSpecOption`
* product-id specs store product id keys in `potentialSpecification`
* legacy raw keys remain display-safe and are not automatically migrated
* product-id spec pricing uses sales-model price, falls back to `priceMtu`, then `0`
* cost is never used
* `systemConfig` value2 is not used for product-id spec price calculation

Product Cost table behavior:

* visible table is flat and compact
* inline edit fields are `name`, `spec`, `priceMtb`, `priceSi`, `priceMtu`, `oppDisplayCategory`, and `status`
* `oppDisplayCategory` syncs hidden `category`
* status syncs hidden `oppSpecOption`
* new rows default active and use `oppDisplayOrder = max valid oppDisplayOrder + 1`
* existing rows preserve hidden `oppDisplayOrder`
* `saveAll`, dirty-check, and payload shape remain the existing batch path

Product Cost display ordering:

* unsaved `_isNew` rows render first
* saved rows visually group by `oppDisplayCategory`
* group order follows each group's minimum valid numeric `oppDisplayOrder`
* rows inside the group sort by their own numeric `oppDisplayOrder` ascending
* missing/non-numeric order sorts after numeric order within the group
* display sorting does not mutate `this.allProducts`, product objects, Sheet row order, or `oppDisplayOrder`
