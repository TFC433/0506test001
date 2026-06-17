-- ============================================================================
-- Audit / Session Log Foundation v1
-- ============================================================================
-- Manual Supabase reference script only. This file documents the schema already
-- applied manually by the product owner; it is not an auto-run migration.
--
-- Backend application code is expected to write these tables through the
-- Supabase service role client. Frontend clients must not directly insert,
-- update, or read audit/session log rows.
--
-- Note: service_role may have broad Supabase privileges. Application code must
-- keep public.system_audit_logs append-only by convention and must not expose
-- update/delete methods for audit log rows.

create extension if not exists pgcrypto;

create table if not exists public.user_sessions (
    session_id uuid primary key default gen_random_uuid(),
    username text not null,
    display_name text null,
    role text null,
    login_time timestamptz not null default now(),
    logout_time timestamptz null,
    last_seen_at timestamptz not null default now(),
    logout_reason text null,
    duration_seconds integer null,
    ip_address text null,
    user_agent text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint user_sessions_duration_non_negative
        check (duration_seconds is null or duration_seconds >= 0),
    constraint user_sessions_logout_after_login
        check (logout_time is null or logout_time >= login_time),
    constraint user_sessions_last_seen_after_login
        check (last_seen_at >= login_time)
);

create index if not exists idx_user_sessions_username
    on public.user_sessions (username);

create index if not exists idx_user_sessions_login_time_desc
    on public.user_sessions (login_time desc);

create index if not exists idx_user_sessions_last_seen_at_desc
    on public.user_sessions (last_seen_at desc);

create index if not exists idx_user_sessions_username_login_time_desc
    on public.user_sessions (username, login_time desc);

create table if not exists public.system_audit_logs (
    audit_id uuid primary key default gen_random_uuid(),
    actor_username text not null,
    actor_name text null,
    actor_role text null,
    session_id uuid null,
    module text not null,
    action text not null,
    target_type text null,
    target_id text not null,
    target_label text null,
    -- Human-readable fields for manager review and future frontend filtering.
    event_title text null,
    event_summary text null,
    event_category text null,
    business_event_type text null,
    changes jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    ip_address text null,
    user_agent text null,
    created_at timestamptz not null default now(),
    constraint system_audit_logs_changes_object
        check (jsonb_typeof(changes) = 'object'),
    constraint system_audit_logs_metadata_object
        check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_system_audit_logs_actor_username
    on public.system_audit_logs (actor_username);

create index if not exists idx_system_audit_logs_session_id
    on public.system_audit_logs (session_id);

create index if not exists idx_system_audit_logs_module
    on public.system_audit_logs (module);

create index if not exists idx_system_audit_logs_action
    on public.system_audit_logs (action);

create index if not exists idx_system_audit_logs_event_category
    on public.system_audit_logs (event_category);

create index if not exists idx_system_audit_logs_business_event_type
    on public.system_audit_logs (business_event_type);

create index if not exists idx_system_audit_logs_target_type_target_id
    on public.system_audit_logs (target_type, target_id);

create index if not exists idx_system_audit_logs_created_at_desc
    on public.system_audit_logs (created_at desc);

create index if not exists idx_system_audit_logs_module_created_at_desc
    on public.system_audit_logs (module, created_at desc);

create index if not exists idx_system_audit_logs_actor_username_created_at_desc
    on public.system_audit_logs (actor_username, created_at desc);

alter table public.user_sessions enable row level security;
alter table public.system_audit_logs enable row level security;

-- No anon/authenticated read or write policies are intentionally defined.
-- Direct frontend access is revoked; backend service-role writes are expected.
revoke all on table public.user_sessions from anon;
revoke all on table public.user_sessions from authenticated;
revoke all on table public.system_audit_logs from anon;
revoke all on table public.system_audit_logs from authenticated;

-- Explicit backend service-role access. service_role is expected to bypass RLS.
grant select, insert, update on table public.user_sessions to service_role;
grant select, insert on table public.system_audit_logs to service_role;
