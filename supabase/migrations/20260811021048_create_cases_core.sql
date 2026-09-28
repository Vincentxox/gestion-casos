create type public.case_status as enum ('abierto', 'en_progreso', 'cerrado');
create type public.case_priority as enum ('alta', 'media', 'baja');

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default (
    'CAS-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null check (char_length(category) between 2 and 80),
  location text not null check (char_length(location) between 3 and 180),
  priority public.case_priority not null default 'media',
  status public.case_status not null default 'abierto',
  created_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_status_history (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases (id) on delete cascade,
  previous_status public.case_status,
  new_status public.case_status not null,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  comment text,
  created_at timestamptz not null default now()
);

create index cases_created_at_idx on public.cases (created_at desc);
create index cases_status_created_at_idx on public.cases (status, created_at desc);
create index cases_priority_created_at_idx on public.cases (priority, created_at desc);
create index cases_created_by_idx on public.cases (created_by);
create index cases_assigned_to_idx on public.cases (assigned_to) where assigned_to is not null;
create index case_status_history_case_created_idx
  on public.case_status_history (case_id, created_at desc);

alter table public.cases enable row level security;
alter table public.case_status_history enable row level security;

create or replace function private.has_role(expected_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = expected_role
  );
$$;

revoke all on function private.has_role(public.app_role) from public;
grant execute on function private.has_role(public.app_role) to authenticated;

create policy "Authorized users can read cases"
on public.cases
for select
to authenticated
using (
  (select private.is_admin())
  or (select private.has_role('auditor'))
  or created_by = (select auth.uid())
  or assigned_to = (select auth.uid())
);

create policy "Administrators can create cases"
on public.cases
for insert
to authenticated
with check (
  (select private.is_admin())
  and created_by = (select auth.uid())
);

create policy "Administrators can update cases"
on public.cases
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Authorized users can read case history"
on public.case_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.cases
    where public.cases.id = case_status_history.case_id
  )
);

revoke all on table public.cases from anon, authenticated;
grant select on table public.cases to authenticated;
grant insert (title, description, category, location, priority, created_by)
  on table public.cases to authenticated;
grant update (title, description, category, location, priority, status, assigned_to)
  on table public.cases to authenticated;

revoke all on table public.case_status_history from anon, authenticated;
grant select on table public.case_status_history to authenticated;

create trigger cases_set_updated_at
before update on public.cases
for each row execute procedure private.set_updated_at();

create or replace function private.record_case_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.case_status_history (
      case_id,
      previous_status,
      new_status,
      changed_by
    ) values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      (select auth.uid())
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_case_status() from public;

create trigger cases_record_status
after insert or update of status on public.cases
for each row execute procedure private.record_case_status();
