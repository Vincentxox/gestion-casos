do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_status_history_comment_length'
      and conrelid = 'public.case_status_history'::regclass
  ) then
    alter table public.case_status_history
      add constraint case_status_history_comment_length
      check (comment is null or char_length(comment) between 3 and 500);
  end if;
end $$;

create or replace function private.record_case_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  status_comment text;
begin
  if tg_op = 'INSERT' then
    insert into public.case_status_history (
      case_id,
      previous_status,
      new_status,
      changed_by
    ) values (
      new.id,
      null,
      new.status,
      (select auth.uid())
    );
  elsif old.status is distinct from new.status then
    status_comment := nullif(
      btrim(current_setting('app.case_status_comment', true)),
      ''
    );

    if status_comment is null or char_length(status_comment) not between 3 and 500 then
      raise exception 'El comentario del cambio de estado debe tener entre 3 y 500 caracteres';
    end if;

    insert into public.case_status_history (
      case_id,
      previous_status,
      new_status,
      changed_by,
      comment
    ) values (
      new.id,
      old.status,
      new.status,
      (select auth.uid()),
      status_comment
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_case_status() from public, anon, authenticated;

create or replace function public.change_case_status(
  target_case_id uuid,
  requested_status public.case_status,
  status_comment text
)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_case public.cases;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  if status_comment is null
    or char_length(btrim(status_comment)) not between 3 and 500 then
    raise exception 'El comentario debe tener entre 3 y 500 caracteres';
  end if;

  perform set_config('app.case_status_comment', btrim(status_comment), true);

  update public.cases
  set status = requested_status
  where id = target_case_id
    and status is distinct from requested_status
  returning * into updated_case;

  if updated_case.id is null then
    if exists (select 1 from public.cases where id = target_case_id) then
      raise exception 'Selecciona un estado diferente al actual';
    end if;

    raise exception 'Caso no encontrado';
  end if;

  return updated_case;
end;
$$;

revoke all on function public.change_case_status(uuid, public.case_status, text)
  from public, anon;
grant execute on function public.change_case_status(uuid, public.case_status, text)
  to authenticated;

revoke update (status) on public.cases from authenticated;
