BEGIN;

-- ============================================================================
-- Activity Intelligence Transaction RPCs v1
-- ============================================================================
-- Manual Supabase reference script only. This file is not an auto-run migration.
--
-- Preconditions:
-- - The five Activity Intelligence tables already exist in public.
-- - RLS and table grants have already been verified by the product owner.
-- - These functions are intended for server-side Supabase service_role calls.
--
-- This script intentionally does not create tables, schemas, frontend grants, or
-- compatibility fallbacks.

create extension if not exists pgcrypto;

create or replace function public.activity_intelligence_private_rekey_options(
    p_options jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if jsonb_typeof(coalesce(p_options, '[]'::jsonb)) <> 'array' then
        return '[]'::jsonb;
    end if;

    return coalesce((
        select jsonb_agg(
            case
                when jsonb_typeof(value) = 'object' then
                    value - 'optionKey' - 'option_key'
                    || jsonb_build_object('optionKey', gen_random_uuid()::text)
                else
                    jsonb_build_object(
                        'optionKey', gen_random_uuid()::text,
                        'label', value #>> '{}',
                        'value', value #>> '{}'
                    )
            end
            order by ordinality
        )
        from jsonb_array_elements(p_options) with ordinality
    ), '[]'::jsonb);
end;
$$;

create or replace function public.activity_intelligence_private_insert_items(
    p_form_version_id uuid,
    p_items jsonb,
    p_rekey boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_item jsonb;
    v_sort_order integer;
    v_item_key uuid;
    v_options jsonb;
begin
    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
        raise exception 'p_items must be a JSON array' using errcode = '22023';
    end if;

    for v_item, v_sort_order in
        select value, ordinality::integer
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
    loop
        v_item_key := case
            when p_rekey then gen_random_uuid()
            else coalesce((v_item->>'item_key')::uuid, gen_random_uuid())
        end;
        v_options := case
            when p_rekey then public.activity_intelligence_private_rekey_options(coalesce(v_item->'options', '[]'::jsonb))
            else coalesce(v_item->'options', '[]'::jsonb)
        end;

        insert into public.activity_intelligence_form_items (
            form_item_id,
            form_version_id,
            item_key,
            item_type,
            title,
            helper_text,
            placeholder,
            options,
            settings,
            is_hidden,
            is_removed,
            sort_order,
            created_at,
            updated_at
        )
        values (
            gen_random_uuid(),
            p_form_version_id,
            v_item_key,
            v_item->>'item_type',
            v_item->>'title',
            coalesce(v_item->>'helper_text', ''),
            coalesce(v_item->>'placeholder', ''),
            v_options,
            coalesce(v_item->'settings', '{}'::jsonb),
            coalesce((v_item->>'is_hidden')::boolean, false),
            coalesce((v_item->>'is_removed')::boolean, false),
            coalesce((v_item->>'sort_order')::integer, v_sort_order),
            now(),
            now()
        );
    end loop;
end;
$$;

create or replace function public.activity_intelligence_create_activity(
    p_activity jsonb,
    p_items jsonb,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_activity_id uuid := coalesce((p_activity->>'activity_id')::uuid, gen_random_uuid());
    v_version_1_id uuid := gen_random_uuid();
    v_draft_version_id uuid := gen_random_uuid();
begin
    insert into public.activity_intelligence_activities (
        activity_id,
        name,
        description,
        form_open_start,
        form_open_end,
        exhibition_start,
        exhibition_end,
        created_by_user_id,
        created_by_display_name,
        updated_by_user_id,
        updated_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_activity_id,
        p_activity->>'name',
        coalesce(p_activity->>'description', ''),
        (p_activity->>'form_open_start')::date,
        (p_activity->>'form_open_end')::date,
        nullif(p_activity->>'exhibition_start', '')::date,
        nullif(p_activity->>'exhibition_end', '')::date,
        p_actor->>'userId',
        p_actor->>'displayName',
        p_actor->>'userId',
        p_actor->>'displayName',
        now(),
        now()
    );

    insert into public.activity_intelligence_form_versions (
        form_version_id,
        activity_id,
        version_number,
        status,
        published_at,
        published_by_user_id,
        published_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_version_1_id,
        v_activity_id,
        1,
        'draft',
        null,
        null,
        null,
        now(),
        now()
    );

    perform public.activity_intelligence_private_insert_items(v_version_1_id, p_items, false);

    update public.activity_intelligence_form_versions
    set status = 'published',
        published_at = now(),
        published_by_user_id = p_actor->>'userId',
        published_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where form_version_id = v_version_1_id;

    insert into public.activity_intelligence_form_versions (
        form_version_id,
        activity_id,
        version_number,
        status,
        published_at,
        published_by_user_id,
        published_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_draft_version_id,
        v_activity_id,
        2,
        'draft',
        null,
        null,
        null,
        now(),
        now()
    );

    insert into public.activity_intelligence_form_items (
        form_item_id,
        form_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        created_at,
        updated_at
    )
    select
        gen_random_uuid(),
        v_draft_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        now(),
        now()
    from public.activity_intelligence_form_items
    where form_version_id = v_version_1_id
    order by sort_order;

    return jsonb_build_object('activity_id', v_activity_id);
end;
$$;

create or replace function public.activity_intelligence_duplicate_activity(
    p_source_activity_id uuid,
    p_activity jsonb,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_source_published_id uuid;
    v_activity_id uuid := coalesce((p_activity->>'activity_id')::uuid, gen_random_uuid());
    v_version_1_id uuid := gen_random_uuid();
    v_draft_version_id uuid := gen_random_uuid();
begin
    select form_version_id
    into v_source_published_id
    from public.activity_intelligence_form_versions
    where activity_id = p_source_activity_id
      and status = 'published';

    if v_source_published_id is null then
        raise exception 'Source activity has no current published form' using errcode = '23514';
    end if;

    insert into public.activity_intelligence_activities (
        activity_id,
        name,
        description,
        form_open_start,
        form_open_end,
        exhibition_start,
        exhibition_end,
        created_by_user_id,
        created_by_display_name,
        updated_by_user_id,
        updated_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_activity_id,
        p_activity->>'name',
        coalesce(p_activity->>'description', ''),
        (p_activity->>'form_open_start')::date,
        (p_activity->>'form_open_end')::date,
        nullif(p_activity->>'exhibition_start', '')::date,
        nullif(p_activity->>'exhibition_end', '')::date,
        p_actor->>'userId',
        p_actor->>'displayName',
        p_actor->>'userId',
        p_actor->>'displayName',
        now(),
        now()
    );

    insert into public.activity_intelligence_form_versions (
        form_version_id,
        activity_id,
        version_number,
        status,
        published_at,
        published_by_user_id,
        published_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_version_1_id,
        v_activity_id,
        1,
        'draft',
        null,
        null,
        null,
        now(),
        now()
    );

    insert into public.activity_intelligence_form_items (
        form_item_id,
        form_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        created_at,
        updated_at
    )
    select
        gen_random_uuid(),
        v_version_1_id,
        gen_random_uuid(),
        item_type,
        title,
        helper_text,
        placeholder,
        public.activity_intelligence_private_rekey_options(options),
        settings,
        is_hidden,
        false,
        sort_order,
        now(),
        now()
    from public.activity_intelligence_form_items
    where form_version_id = v_source_published_id
    order by sort_order;

    update public.activity_intelligence_form_versions
    set status = 'published',
        published_at = now(),
        published_by_user_id = p_actor->>'userId',
        published_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where form_version_id = v_version_1_id;

    insert into public.activity_intelligence_form_versions (
        form_version_id,
        activity_id,
        version_number,
        status,
        published_at,
        published_by_user_id,
        published_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_draft_version_id,
        v_activity_id,
        2,
        'draft',
        null,
        null,
        null,
        now(),
        now()
    );

    insert into public.activity_intelligence_form_items (
        form_item_id,
        form_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        created_at,
        updated_at
    )
    select
        gen_random_uuid(),
        v_draft_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        now(),
        now()
    from public.activity_intelligence_form_items
    where form_version_id = v_version_1_id
    order by sort_order;

    return jsonb_build_object('activity_id', v_activity_id);
end;
$$;

create or replace function public.activity_intelligence_save_draft(
    p_activity_id uuid,
    p_items jsonb,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_draft_version_id uuid;
begin
    select form_version_id
    into v_draft_version_id
    from public.activity_intelligence_form_versions
    where activity_id = p_activity_id
      and status = 'draft';

    if v_draft_version_id is null then
        raise exception 'Draft form not found' using errcode = '23514';
    end if;

    delete from public.activity_intelligence_form_items
    where form_version_id = v_draft_version_id;

    perform public.activity_intelligence_private_insert_items(v_draft_version_id, p_items, false);

    update public.activity_intelligence_form_versions
    set updated_at = now()
    where form_version_id = v_draft_version_id;

    update public.activity_intelligence_activities
    set updated_by_user_id = p_actor->>'userId',
        updated_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where activity_id = p_activity_id;

    return jsonb_build_object('activity_id', p_activity_id, 'form_version_id', v_draft_version_id);
end;
$$;

create or replace function public.activity_intelligence_discard_draft(
    p_activity_id uuid,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_published_version_id uuid;
    v_draft_version_id uuid;
begin
    select form_version_id
    into v_published_version_id
    from public.activity_intelligence_form_versions
    where activity_id = p_activity_id
      and status = 'published';

    select form_version_id
    into v_draft_version_id
    from public.activity_intelligence_form_versions
    where activity_id = p_activity_id
      and status = 'draft';

    if v_published_version_id is null or v_draft_version_id is null then
        raise exception 'Published or draft form not found' using errcode = '23514';
    end if;

    delete from public.activity_intelligence_form_items
    where form_version_id = v_draft_version_id;

    insert into public.activity_intelligence_form_items (
        form_item_id,
        form_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        created_at,
        updated_at
    )
    select
        gen_random_uuid(),
        v_draft_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        false,
        sort_order,
        now(),
        now()
    from public.activity_intelligence_form_items
    where form_version_id = v_published_version_id
    order by sort_order;

    update public.activity_intelligence_activities
    set updated_by_user_id = p_actor->>'userId',
        updated_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where activity_id = p_activity_id;

    return jsonb_build_object('activity_id', p_activity_id, 'form_version_id', v_draft_version_id);
end;
$$;

create or replace function public.activity_intelligence_publish_draft(
    p_activity_id uuid,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_current_published_id uuid;
    v_current_draft_id uuid;
    v_next_draft_id uuid := gen_random_uuid();
    v_next_version_number integer;
begin
    select form_version_id
    into v_current_published_id
    from public.activity_intelligence_form_versions
    where activity_id = p_activity_id
      and status = 'published';

    select form_version_id, version_number + 1
    into v_current_draft_id, v_next_version_number
    from public.activity_intelligence_form_versions
    where activity_id = p_activity_id
      and status = 'draft';

    if v_current_published_id is null or v_current_draft_id is null then
        raise exception 'Published or draft form not found' using errcode = '23514';
    end if;

    delete from public.activity_intelligence_form_items
    where form_version_id = v_current_draft_id
      and is_removed = true;

    update public.activity_intelligence_form_versions
    set status = 'archived',
        updated_at = now()
    where form_version_id = v_current_published_id;

    update public.activity_intelligence_form_versions
    set status = 'published',
        published_at = now(),
        published_by_user_id = p_actor->>'userId',
        published_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where form_version_id = v_current_draft_id;

    insert into public.activity_intelligence_form_versions (
        form_version_id,
        activity_id,
        version_number,
        status,
        published_at,
        published_by_user_id,
        published_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_next_draft_id,
        p_activity_id,
        v_next_version_number,
        'draft',
        null,
        null,
        null,
        now(),
        now()
    );

    insert into public.activity_intelligence_form_items (
        form_item_id,
        form_version_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        is_removed,
        sort_order,
        created_at,
        updated_at
    )
    select
        gen_random_uuid(),
        v_next_draft_id,
        item_key,
        item_type,
        title,
        helper_text,
        placeholder,
        options,
        settings,
        is_hidden,
        false,
        sort_order,
        now(),
        now()
    from public.activity_intelligence_form_items
    where form_version_id = v_current_draft_id
    order by sort_order;

    update public.activity_intelligence_activities
    set updated_by_user_id = p_actor->>'userId',
        updated_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where activity_id = p_activity_id;

    return jsonb_build_object(
        'activity_id', p_activity_id,
        'published_form_version_id', v_current_draft_id,
        'draft_form_version_id', v_next_draft_id
    );
end;
$$;

create or replace function public.activity_intelligence_private_insert_answers(
    p_submission_id uuid,
    p_form_version_id uuid,
    p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_answer jsonb;
    v_item record;
begin
    if jsonb_typeof(coalesce(p_answers, '[]'::jsonb)) <> 'array' then
        raise exception 'p_answers must be a JSON array' using errcode = '22023';
    end if;

    for v_answer in
        select value
        from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
    loop
        select form_item_id, item_type
        into v_item
        from public.activity_intelligence_form_items
        where form_version_id = p_form_version_id
          and form_item_id = (v_answer->>'form_item_id')::uuid;

        if v_item.form_item_id is null then
            raise exception 'Answer item does not belong to the submission form version' using errcode = '23514';
        end if;

        if v_item.item_type not in ('short_text', 'long_text', 'number', 'yes_no', 'single_choice', 'multiple_choice', 'dropdown') then
            raise exception 'Answer item type is not answer-producing' using errcode = '23514';
        end if;

        insert into public.activity_intelligence_submission_answers (
            submission_answer_id,
            submission_id,
            form_item_id,
            value_text,
            value_number,
            value_boolean,
            value_jsonb,
            other_text,
            created_at,
            updated_at
        )
        values (
            gen_random_uuid(),
            p_submission_id,
            v_item.form_item_id,
            nullif(v_answer->>'value_text', ''),
            case when v_answer ? 'value_number' and v_answer->>'value_number' is not null then (v_answer->>'value_number')::numeric else null end,
            case when v_answer ? 'value_boolean' and v_answer->>'value_boolean' is not null then (v_answer->>'value_boolean')::boolean else null end,
            case when v_answer ? 'value_jsonb' then v_answer->'value_jsonb' else null end,
            nullif(v_answer->>'other_text', ''),
            now(),
            now()
        );
    end loop;
end;
$$;

create or replace function public.activity_intelligence_create_submission(
    p_submission jsonb,
    p_answers jsonb,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_submission_id uuid := coalesce((p_submission->>'submission_id')::uuid, gen_random_uuid());
    v_activity_id uuid := (p_submission->>'activity_id')::uuid;
    v_form_version_id uuid;
begin
    select form_version_id
    into v_form_version_id
    from public.activity_intelligence_form_versions
    where activity_id = v_activity_id
      and status = 'published';

    if v_form_version_id is null then
        raise exception 'Activity has no current published form' using errcode = '23514';
    end if;

    insert into public.activity_intelligence_submissions (
        submission_id,
        activity_id,
        form_version_id,
        status,
        card_id,
        created_by_user_id,
        created_by_display_name,
        updated_by_user_id,
        updated_by_display_name,
        created_at,
        updated_at
    )
    values (
        v_submission_id,
        v_activity_id,
        v_form_version_id,
        'active',
        nullif(p_submission->>'card_id', '')::uuid,
        p_actor->>'userId',
        p_actor->>'displayName',
        p_actor->>'userId',
        p_actor->>'displayName',
        now(),
        now()
    );

    perform public.activity_intelligence_private_insert_answers(v_submission_id, v_form_version_id, p_answers);

    return jsonb_build_object('submission_id', v_submission_id);
end;
$$;

create or replace function public.activity_intelligence_update_submission(
    p_submission_id uuid,
    p_card_id uuid,
    p_answers jsonb,
    p_actor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_form_version_id uuid;
begin
    select form_version_id
    into v_form_version_id
    from public.activity_intelligence_submissions
    where submission_id = p_submission_id;

    if v_form_version_id is null then
        raise exception 'Submission not found' using errcode = '23514';
    end if;

    update public.activity_intelligence_submissions
    set card_id = p_card_id,
        updated_by_user_id = p_actor->>'userId',
        updated_by_display_name = p_actor->>'displayName',
        updated_at = now()
    where submission_id = p_submission_id;

    delete from public.activity_intelligence_submission_answers
    where submission_id = p_submission_id;

    perform public.activity_intelligence_private_insert_answers(p_submission_id, v_form_version_id, p_answers);

    return jsonb_build_object('submission_id', p_submission_id);
end;
$$;

create or replace function public.activity_intelligence_guard_form_item()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_form_version_id uuid;
    v_version_status text;
begin
    if tg_op = 'DELETE'
       and current_setting('app.activity_intelligence_hard_delete', true) = 'on' then
        return OLD;
    end if;

    v_form_version_id := case
        when tg_op = 'DELETE' then OLD.form_version_id
        else NEW.form_version_id
    end;

    select status
    into v_version_status
    from public.activity_intelligence_form_versions
    where form_version_id = v_form_version_id;

    if v_version_status is null then
        raise exception 'Parent Activity Intelligence form version not found' using errcode = '23514';
    end if;

    if v_version_status <> 'draft' then
        raise exception 'Only draft form items may be inserted, updated, or deleted. Version status: %', v_version_status using errcode = '23514';
    end if;

    if tg_op = 'UPDATE' then
        if NEW.form_item_id is distinct from OLD.form_item_id then
            raise exception 'Activity Intelligence form_item_id is immutable' using errcode = '23514';
        end if;
        if NEW.form_version_id is distinct from OLD.form_version_id then
            raise exception 'Activity Intelligence form_version_id is immutable' using errcode = '23514';
        end if;
        if NEW.item_key is distinct from OLD.item_key then
            raise exception 'Activity Intelligence item_key is immutable inside a form version' using errcode = '23514';
        end if;
        if NEW.created_at is distinct from OLD.created_at then
            raise exception 'Activity Intelligence form item created_at is immutable' using errcode = '23514';
        end if;
    end if;

    if tg_op = 'DELETE' then
        return OLD;
    end if;
    return NEW;
end;
$$;

create or replace function public.activity_intelligence_guard_form_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if tg_op = 'DELETE'
       and current_setting('app.activity_intelligence_hard_delete', true) = 'on' then
        return OLD;
    end if;

    if tg_op = 'DELETE' then
        if OLD.status <> 'draft' then
            raise exception 'Only draft Activity Intelligence form versions may be deleted.' using errcode = '23514';
        end if;
        return OLD;
    end if;

    if NEW.form_version_id is distinct from OLD.form_version_id then
        raise exception 'Activity Intelligence form_version_id is immutable' using errcode = '23514';
    end if;
    if NEW.activity_id is distinct from OLD.activity_id then
        raise exception 'Activity Intelligence form version activity_id is immutable' using errcode = '23514';
    end if;
    if NEW.version_number is distinct from OLD.version_number then
        raise exception 'Activity Intelligence form version_number is immutable' using errcode = '23514';
    end if;
    if NEW.created_at is distinct from OLD.created_at then
        raise exception 'Activity Intelligence form version created_at is immutable' using errcode = '23514';
    end if;

    if OLD.status = 'draft' and NEW.status not in ('draft', 'published') then
        raise exception 'Invalid Activity Intelligence draft form version status transition' using errcode = '23514';
    end if;
    if OLD.status = 'published' and NEW.status not in ('published', 'archived') then
        raise exception 'Invalid Activity Intelligence published form version status transition' using errcode = '23514';
    end if;
    if OLD.status = 'archived' and NEW.status <> 'archived' then
        raise exception 'Archived Activity Intelligence form versions are immutable' using errcode = '23514';
    end if;

    if OLD.status in ('published', 'archived') then
        if NEW.published_at is distinct from OLD.published_at
           or NEW.published_by_user_id is distinct from OLD.published_by_user_id
           or NEW.published_by_display_name is distinct from OLD.published_by_display_name then
            raise exception 'Activity Intelligence publication metadata is immutable after publication' using errcode = '23514';
        end if;
    end if;

    return NEW;
end;
$$;

create or replace function public.activity_intelligence_hard_delete_submission(
    p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_deleted_count integer;
begin
    delete from public.activity_intelligence_submission_answers
    where submission_id = p_submission_id;

    delete from public.activity_intelligence_submissions
    where submission_id = p_submission_id;

    get diagnostics v_deleted_count = row_count;
    if v_deleted_count = 0 then
        raise exception 'Submission not found' using errcode = '23514';
    end if;

    return jsonb_build_object('submission_id', p_submission_id);
end;
$$;

create or replace function public.activity_intelligence_hard_delete_activity(
    p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_deleted_count integer;
begin
    perform set_config(
        'app.activity_intelligence_hard_delete',
        'on',
        true
    );

    delete from public.activity_intelligence_submission_answers
    where submission_id in (
        select submission_id
        from public.activity_intelligence_submissions
        where activity_id = p_activity_id
    );

    delete from public.activity_intelligence_submissions
    where activity_id = p_activity_id;

    delete from public.activity_intelligence_form_items
    where form_version_id in (
        select form_version_id
        from public.activity_intelligence_form_versions
        where activity_id = p_activity_id
    );

    delete from public.activity_intelligence_form_versions
    where activity_id = p_activity_id;

    delete from public.activity_intelligence_activities
    where activity_id = p_activity_id;

    get diagnostics v_deleted_count = row_count;
    if v_deleted_count = 0 then
        raise exception 'Activity not found' using errcode = '23514';
    end if;

    perform set_config(
        'app.activity_intelligence_hard_delete',
        'off',
        true
    );

    return jsonb_build_object('activity_id', p_activity_id);
end;
$$;

revoke execute on function public.activity_intelligence_private_rekey_options(jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_private_rekey_options(jsonb) from anon;
revoke execute on function public.activity_intelligence_private_rekey_options(jsonb) from authenticated;
revoke execute on function public.activity_intelligence_private_rekey_options(jsonb) from service_role;

revoke execute on function public.activity_intelligence_private_insert_items(uuid, jsonb, boolean) from PUBLIC;
revoke execute on function public.activity_intelligence_private_insert_items(uuid, jsonb, boolean) from anon;
revoke execute on function public.activity_intelligence_private_insert_items(uuid, jsonb, boolean) from authenticated;
revoke execute on function public.activity_intelligence_private_insert_items(uuid, jsonb, boolean) from service_role;

revoke execute on function public.activity_intelligence_private_insert_answers(uuid, uuid, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_private_insert_answers(uuid, uuid, jsonb) from anon;
revoke execute on function public.activity_intelligence_private_insert_answers(uuid, uuid, jsonb) from authenticated;
revoke execute on function public.activity_intelligence_private_insert_answers(uuid, uuid, jsonb) from service_role;

revoke execute on function public.activity_intelligence_create_activity(jsonb, jsonb, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_create_activity(jsonb, jsonb, jsonb) from anon;
revoke execute on function public.activity_intelligence_create_activity(jsonb, jsonb, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_duplicate_activity(uuid, jsonb, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_duplicate_activity(uuid, jsonb, jsonb) from anon;
revoke execute on function public.activity_intelligence_duplicate_activity(uuid, jsonb, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_save_draft(uuid, jsonb, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_save_draft(uuid, jsonb, jsonb) from anon;
revoke execute on function public.activity_intelligence_save_draft(uuid, jsonb, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_discard_draft(uuid, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_discard_draft(uuid, jsonb) from anon;
revoke execute on function public.activity_intelligence_discard_draft(uuid, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_publish_draft(uuid, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_publish_draft(uuid, jsonb) from anon;
revoke execute on function public.activity_intelligence_publish_draft(uuid, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_create_submission(jsonb, jsonb, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_create_submission(jsonb, jsonb, jsonb) from anon;
revoke execute on function public.activity_intelligence_create_submission(jsonb, jsonb, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_update_submission(uuid, uuid, jsonb, jsonb) from PUBLIC;
revoke execute on function public.activity_intelligence_update_submission(uuid, uuid, jsonb, jsonb) from anon;
revoke execute on function public.activity_intelligence_update_submission(uuid, uuid, jsonb, jsonb) from authenticated;

revoke execute on function public.activity_intelligence_hard_delete_submission(uuid) from PUBLIC;
revoke execute on function public.activity_intelligence_hard_delete_submission(uuid) from anon;
revoke execute on function public.activity_intelligence_hard_delete_submission(uuid) from authenticated;

revoke execute on function public.activity_intelligence_hard_delete_activity(uuid) from PUBLIC;
revoke execute on function public.activity_intelligence_hard_delete_activity(uuid) from anon;
revoke execute on function public.activity_intelligence_hard_delete_activity(uuid) from authenticated;

grant execute on function public.activity_intelligence_create_activity(jsonb, jsonb, jsonb) to service_role;
grant execute on function public.activity_intelligence_duplicate_activity(uuid, jsonb, jsonb) to service_role;
grant execute on function public.activity_intelligence_save_draft(uuid, jsonb, jsonb) to service_role;
grant execute on function public.activity_intelligence_discard_draft(uuid, jsonb) to service_role;
grant execute on function public.activity_intelligence_publish_draft(uuid, jsonb) to service_role;
grant execute on function public.activity_intelligence_create_submission(jsonb, jsonb, jsonb) to service_role;
grant execute on function public.activity_intelligence_update_submission(uuid, uuid, jsonb, jsonb) to service_role;
grant execute on function public.activity_intelligence_hard_delete_submission(uuid) to service_role;
grant execute on function public.activity_intelligence_hard_delete_activity(uuid) to service_role;

COMMIT;
