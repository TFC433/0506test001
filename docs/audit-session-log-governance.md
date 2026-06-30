# Audit / Session Log Governance

## 1. Purpose and Scope

The Audit / Session Log system is manager-readable business and audit event tracking for valuable CRM actions. It is not debug logging, click tracking, or a replacement for existing Interactions / timeline records.

Audit instrumentation is backend-owned and is attached to meaningful CRM mutations. Existing business workflows, response shapes, and timeline behavior must remain unchanged.

`system_audit_logs` is the backend foundation for future admin or manager log viewers. No frontend audit viewer or manager log viewer was implemented in this chapter.

### Audit Logs Are Not Business Sorting Sources

`audit_logs` are governance evidence and operational traceability records. They must not be used as the Opportunity List sorting source or as a general business activity sorting model.

Opportunity business activity sorting should be based only on direct opportunity-related business tables with `opportunity_id`, such as opportunity records, interactions, opportunity-contact links, and approved event log tables.

Do not count read/view/search/login/session/audit-query events as opportunity business activity.

## 2. Architecture Rules

Controllers build compact `auditContext` objects from `req.user` and request metadata. Services receive optional `auditContext`.

Do not pass full Express `req` objects deep into services. Do not add audit hooks to generic low-level writers when the business context belongs in controller or service layers.

Audit failures should not block business operations. The exception is login: login may intentionally fail if session creation fails, because authenticated tokens must include valid session context.

`auditLoggerService.logMutation(...)` is the standard backend mutation-audit entry point. `AuditLogSqlWriter` writes to backend-only audit/session tables.

`auditContext` must remain optional for backward compatibility with existing internal callers.

## 3. Session Lifecycle

`user_sessions` tracks login session lifecycle.

Current session behavior:

* login creates a session row
* JWT payload contains `session_id`
* login records best-effort IP address and User-Agent
* logout best-effort closes the session
* `last_seen_at` is updated with throttling
* missing or expired token logout should not block local frontend logout behavior

Session lifecycle records are stored in `user_sessions`; they are not ordinary `system_audit_logs.business_event_type` rows.

## 4. Schema Strategy

`user_sessions` and `system_audit_logs` are backend-only CRM audit/session tables.

`system_audit_logs` uses first-class scalar fields:

* `actor_username`
* `actor_name`
* `actor_role`
* `session_id`
* `module`
* `action`
* `target_type`
* `target_id`
* `target_label`
* `event_title`
* `event_summary`
* `event_category`
* `business_event_type`
* `changes`
* `metadata`
* `ip_address`
* `user_agent`
* `created_at`

`event_title`, `event_summary`, `event_category`, and `business_event_type` must be first-class columns, not metadata-only values.

`changes` stores safe changed fields. `metadata` stores source, context, and filtering support.

Common metadata keys:

* `source`
* `audit_version`
* `detected_events`
* `changed_fields`
* `changed_field_labels`
* related ids and labels where available

## 5. Non-Blocking Failure Rules

Audit logging failures should be caught and warned.

Audit read failures for `beforeData` should not block the original operation if the original operation can safely continue.

Do not throw audit errors to users. Do not allow audit instrumentation to change the main response shape. Do not change original business behavior just to support audit.

## 6. Redaction and Sensitive Data Rules

Sensitive or long fields must be redacted before entering `system_audit_logs.changes`.

Do not store full raw values for:

* notes
* todoItems / todo_items
* customNote
* content
* description
* comments
* details
* specs
* participants if large
* potentialSpecification
* product_details
* drive/calendar links
* attachments
* email/phone/mobile/contact details
* raw payloads
* tokens/secrets
* long strings

`todoItems` / `todo_items` may contain long or sensitive meeting follow-up text. It must not store full raw content in `system_audit_logs.changes` and follows the same redaction principle as notes, content, description, and detail-style fields.

Safe labels may be used for summaries:

* company name
* opportunity name
* event title
* reminder title
* dev project title
* owner display name
* status
* dates
* IDs and relation IDs where appropriate

When uncertain, prefer redaction in `changes`.

## 7. Covered Audit Domains and Taxonomy

| Domain | Module | Target Type | Event Types / Lifecycle | Metadata Source | Major Metadata Keys |
| --- | --- | --- | --- | --- | --- |
| Session | `user_sessions` table | session row | login, logout, throttled `last_seen_at` | N/A | username, display name, role, IP, User-Agent, login/logout/last-seen timestamps |
| Companies | `companies` | `company` | `company_created`, `company_updated`, `company_deleted` | `companies` | `changed_fields`, `changed_field_labels`, `source`, `audit_version` |
| Opportunities | `opportunities` | `opportunity`, `opportunity_contact` | `opportunity_created`, `opportunity_updated`, `opportunity_won`, `opportunity_lost`, `opportunity_stage_changed`, `opportunity_status_changed`, `opportunity_value_changed`, `opportunity_assignee_changed`, `opportunity_deleted`, `opportunity_contact_linked`, `opportunity_contact_unlinked` | `opportunities` | `detected_events`, `changed_fields`, `changed_field_labels`, related opportunity/company/contact ids, source tags |
| Event Logs | `event_logs` | `event_log` | `event_log_created`, `event_log_updated`, `event_log_deleted`, `event_log_voided` | `event_logs` | `detected_events`, `changed_fields`, `changed_field_labels`, related opportunity/company ids, event type/status |
| Interactions | `interactions` | `interaction` | `interaction_created`, `interaction_updated`, `interaction_deleted` | `interactions` | `detected_events`, `changed_fields`, `changed_field_labels`, related opportunity/company/contact ids, interaction/event type, `origin` |
| SubscriptionOps | `subscription_ops` | `subscription_op` | `subscription_created`, `subscription_updated`, `subscription_archived` | `subscription_ops` | `reminder_kind`, `source_type`, `create_source`, related opportunity/product/customer labels, `detected_events`, `changed_fields`, `changed_field_labels` |
| InternalOps / DevProjects | `internal_ops` | `dev_project` | `dev_project_created`, `dev_project_updated`, `dev_project_archived`, `dev_project_unarchived`, `dev_project_completed`, `dev_project_status_changed`, `dev_project_progress_changed`, `dev_project_owner_changed`, `dev_project_collaborators_changed`, `dev_project_dates_changed`, `dev_project_opportunity_link_changed`, `dev_project_parent_changed`, `dev_project_deleted` | `internal_ops_dev_projects` | `detected_events`, `changed_fields`, `changed_field_labels`, related opportunity id/label, parent dev project id, case category/stage, owner name, `delete_type` |

Session login/logout/last-seen tracking is implemented through `user_sessions`; session records are not ordinary business-event audit rows.

## 8. Special Source Tags

Opportunity batch update:

* no separate `opportunity_batch_updated`
* per-item update audit is reused
* metadata includes `update_source: batch_update`

Raw contact upgrade:

* no separate `opportunity_upgraded_from_contact` audit row
* existing `opportunity_created` and `opportunity_contact_linked` rows are reused
* metadata includes `create_source: raw_contact_upgrade`
* metadata includes `link_source: raw_contact_upgrade`
* metadata includes `source_row_index` where available
* `detected_events` may include `upgraded_from_raw_contact`

SubscriptionOps create source:

* metadata uses `create_source`, `reminder_kind`, and `source_type`
* custom/product reminders are not split into separate top-level event types unless a future scope explicitly decides

DevProjects update:

* one update writes one audit row
* primary `business_event_type` is selected by priority
* secondary events go into `metadata.detected_events`

## 9. Intentionally Skipped / Deferred Paths

* `closeOpportunity` exists but is unexposed/dead at the API layer; do not audit unless a future route appears.
* SubscriptionOps unarchive/delete are not audited because active backend routes do not exist.
* DevProjects grouping/filter/view-mode controls are UI-only and should not be audited.
* No separate batch summary audit was added.
* No separate `opportunity_upgraded_from_contact` row was added.
* System-generated Interactions are not double-audited; only explicit `InteractionController` CRUD is audited.
* Frontend audit viewer / manager log viewer is future work.

## 10. Rules for Future Patches

When modifying a controller/service in a covered domain, preserve existing audit hooks.

If adding a new valuable mutation, add audit using the existing taxonomy style. Add a new `business_event_type` only after explicit scope decision.

Future patches must:

* keep `auditContext` optional
* keep audit failures non-blocking
* redact before diffing
* avoid adding audit hooks to generic low-level writers
* avoid logging frontend-only UI state
* avoid changing response shapes solely for audit
* keep `event_title`, `event_summary`, `event_category`, and `business_event_type` as first-class audit fields
