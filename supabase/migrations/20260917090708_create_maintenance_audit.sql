-- Bitácora de cambios de datos. Solo un administrador puede consultarla.
create table public.maintenance_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);
create index maintenance_audit_log_record_idx
  on public.maintenance_audit_log (table_name, record_id, occurred_at desc);
create index maintenance_audit_log_actor_idx
  on public.maintenance_audit_log (actor_id, occurred_at desc)
  where actor_id is not null;
create index maintenance_audit_log_occurred_idx
  on public.maintenance_audit_log (occurred_at desc);

alter table public.maintenance_audit_log enable row level security;
revoke all on table public.maintenance_audit_log from anon, authenticated;
grant select on table public.maintenance_audit_log to authenticated;
create policy "Administrators read maintenance audit" on public.maintenance_audit_log
for select to authenticated using ((select private.is_admin()));

create or replace function private.record_maintenance_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare changed_id uuid;
begin
  if tg_op = 'INSERT' then
    changed_id := new.id;
    insert into public.maintenance_audit_log
      (table_name, record_id, operation, actor_id, new_data)
    values (tg_table_name, changed_id, tg_op, auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    changed_id := new.id;
    insert into public.maintenance_audit_log
      (table_name, record_id, operation, actor_id, old_data, new_data)
    values (tg_table_name, changed_id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    changed_id := old.id;
    insert into public.maintenance_audit_log
      (table_name, record_id, operation, actor_id, old_data)
    values (tg_table_name, changed_id, tg_op, auth.uid(), to_jsonb(old));
    return old;
  end if;
end;
$$;
revoke all on function private.record_maintenance_audit() from public, anon, authenticated;

do $audit$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'services', 'areas', 'job_titles', 'employees',
    'equipment_types', 'brands', 'models', 'equipment', 'activity_types',
    'supplies', 'spare_parts', 'maintenance_requests', 'activities',
    'activity_assignments', 'activity_supplies', 'activity_spare_parts',
    'activity_photos'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.record_maintenance_audit()',
      table_name || '_audit_changes', table_name
    );
  end loop;
end;
$audit$;
