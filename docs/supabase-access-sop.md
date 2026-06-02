# Supabase Access SOP

## 1. Purpose

This SOP records how TFC CRM should handle Supabase access after the 2026 public schema Data API GRANT behavior change. It is documentation-only and does not authorize immediate SQL execution.

## 2. Current architecture

Current repo architecture is:

```text
Frontend -> Node / Express API -> Supabase service_role client
```

Repo evidence:

* `config/supabase.js` creates the Supabase client with `SUPABASE_SERVICE_ROLE_KEY`.
* Controllers expose Express `/api` routes for CRM modules.
* Frontend scripts use API routes rather than direct frontend table access through `supabase-js`.

Prior DB audit evidence from the task context:

* Existing live DB audit showed no `anon` / `authenticated` grants on public CRM tables.
* Existing public tables have grants mainly for `postgres` and `service_role`.
* RLS is false on existing CRM tables.
* `pg_policies` returned no rows.

## 3. Impact of Supabase 2026 GRANT change

The 2026 behavior change affects how new public schema tables may be exposed through the Data API. For this CRM, existing operational CRM tables are backend-owned and accessed through the service role key on the server side.

Because current frontend access goes through Express APIs, internal CRM tables should not be exposed to `anon` or `authenticated` roles just to satisfy Data API defaults.

## 4. Existing DB decision

Current decision:

* no immediate SQL changes are needed for existing CRM tables
* do not grant `anon` or `authenticated` on existing backend-only CRM tables
* do not enable broad Data API exposure for internal CRM data

## 5. Future new-table SOP

### A. Backend-only CRM table

Use this for internal CRM tables, operational records, system records, audit records, opportunities, companies, contacts, interactions, event reports, and other server-owned business data.

Decision:

* keep access through Node / Express API
* use server-side `service_role`
* do not grant `anon` or `authenticated`
* do not expose direct frontend table access

### B. Frontend direct Supabase table

Use this only if a future feature is explicitly designed for direct Supabase Data API access from the browser.

Required before approval:

* explicit product owner approval
* documented table purpose
* RLS enabled
* RLS policies defined and reviewed
* minimal grants only for the intended role
* proof that no internal CRM data is exposed

### C. Public read-only reference table

Use this only for non-sensitive reference data that is safe to expose publicly or to authenticated users.

Required before approval:

* confirm the table contains no internal CRM records, customer data, pricing-sensitive data, or audit data
* enable RLS if direct access is used
* grant only read access needed by the target role
* document owner and review cadence

Example only, not current action:

```sql
-- Example for a future approved public read-only reference table only.
-- Do not run for internal CRM tables.
grant select on table public.some_reference_table to authenticated;
```

## 6. What not to do

Do not:

* grant all tables to `anon` or `authenticated`
* grant while RLS is disabled
* expose internal CRM tables through the Data API
* move browser code to direct `supabase-js` table access for internal CRM data
* treat service_role backend access as permission to loosen frontend grants

## 7. Required checklist before adding a new table

Before adding a new table, decide and document:

* table owner: backend-only, frontend-direct, or public reference
* data sensitivity
* expected callers
* whether browser direct access is required
* whether RLS is enabled
* which policies exist
* which roles receive grants
* whether Express API coverage is needed
* whether audit/system lifecycle rules apply
* whether the table contains CRM customer, opportunity, contact, interaction, event, or internal operations data

## 8. Recommended owner decision flow

1. If the table contains CRM operational data, make it backend-only.
2. If the table contains audit/system lifecycle data, make it backend-only.
3. If browser direct access is requested, require explicit architecture approval before grants.
4. If the table is public reference data, grant only the minimum read access after review.
5. If unclear, default to backend-only and request read-only forensics before changing grants.
