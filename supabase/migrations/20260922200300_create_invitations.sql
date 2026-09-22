-- Ingreso de usuarios por invitación (docs/BUSINESS_RULES.md, sección 2).
--
-- * El administrador invita un correo con rol y área.
-- * Cuando una persona con ese correo verificado existe o se registra (correo o Google),
--   queda vinculada a la empresa. Sin invitación, el usuario queda sin empresa.
-- * La vinculación la hace siempre el servidor; el correo se lee de auth.users.

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) <= 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  role public.app_role not null default 'solicitante',
  area_id uuid references public.areas (id) on delete set null,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  check (accepted_at is null or revoked_at is null)
);

-- Un correo tiene como máximo una invitación pendiente por empresa. Si varias empresas
-- invitan el mismo correo, se acepta la más antigua.
create unique index organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;
create index organization_invitations_email_idx
  on public.organization_invitations (email)
  where accepted_at is null and revoked_at is null;
create index organization_invitations_organization_idx
  on public.organization_invitations (organization_id, created_at desc);

alter table public.organization_invitations enable row level security;

create or replace function private.guard_invitation_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.email := lower(btrim(new.email));

    if current_user in ('anon', 'authenticated') then
      new.organization_id := (select private.current_organization_id());
      new.invited_by := (select auth.uid());
      new.accepted_at := null;
      new.accepted_by := null;
      new.revoked_at := null;
    end if;

    perform private.assert_member_access(new.organization_id, new.role, new.area_id);

    -- No se revela si el correo ya pertenece a otra empresa: en ese caso la invitación
    -- queda pendiente y no tiene efecto.
    return new;
  end if;

  if current_user in ('anon', 'authenticated') then
    if old.accepted_at is not null or old.revoked_at is not null then
      raise exception 'La invitación ya no está pendiente';
    end if;

    if new.revoked_at is null then
      raise exception 'Solo puedes revocar la invitación';
    end if;

    new.revoked_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.guard_invitation_changes() from public, anon, authenticated;

create trigger organization_invitations_guard_changes
before insert or update on public.organization_invitations
for each row execute procedure private.guard_invitation_changes();

create policy "Administrators can read invitations of their organization"
on public.organization_invitations
for select
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

create policy "Administrators can invite members"
on public.organization_invitations
for insert
to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

create policy "Administrators can revoke invitations"
on public.organization_invitations
for update
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
)
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

revoke all on table public.organization_invitations from anon, authenticated;
grant select on table public.organization_invitations to authenticated;
grant insert (email, role, area_id) on table public.organization_invitations to authenticated;
grant update (revoked_at) on table public.organization_invitations to authenticated;

-- ---------------------------------------------------------------------------
-- Vinculación de un usuario con su invitación pendiente
-- ---------------------------------------------------------------------------

create or replace function private.link_pending_invitation(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
  user_confirmed_at timestamptz;
  invitation public.organization_invitations;
begin
  select lower(email), email_confirmed_at
  into user_email, user_confirmed_at
  from auth.users
  where id = target_user_id;

  if user_email is null or user_confirmed_at is null then
    return false;
  end if;

  if exists (
    select 1
    from public.profiles
    where id = target_user_id
      and organization_id is not null
  ) then
    return false;
  end if;

  select * into invitation
  from public.organization_invitations
  where email = user_email
    and accepted_at is null
    and revoked_at is null
  order by created_at
  limit 1
  for update;

  if not found then
    return false;
  end if;

  update public.profiles
  set organization_id = invitation.organization_id,
      role = invitation.role,
      area_id = invitation.area_id
  where id = target_user_id;

  update public.organization_invitations
  set accepted_at = now(),
      accepted_by = target_user_id
  where id = invitation.id;

  return true;
end;
$$;

revoke all on function private.link_pending_invitation(uuid) from public, anon, authenticated;

-- Permite al usuario reintentar la vinculación (por ejemplo, justo después de confirmar
-- su correo). Solo actúa sobre el usuario autenticado.
create or replace function public.accept_pending_invitation()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Acceso denegado';
  end if;

  return private.link_pending_invitation((select auth.uid()));
end;
$$;

revoke all on function public.accept_pending_invitation() from public, anon;
grant execute on function public.accept_pending_invitation() to authenticated;

-- Al invitar a alguien que ya tiene cuenta verificada, se vincula de inmediato.
create or replace function private.link_existing_user_after_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_user_id uuid;
begin
  select id into existing_user_id
  from auth.users
  where lower(email) = new.email
    and email_confirmed_at is not null
  limit 1;

  if existing_user_id is not null then
    perform private.link_pending_invitation(existing_user_id);
  end if;

  return null;
end;
$$;

revoke all on function private.link_existing_user_after_invitation()
  from public, anon, authenticated;

create trigger organization_invitations_link_existing_user
after insert on public.organization_invitations
for each row execute procedure private.link_existing_user_after_invitation();

-- ---------------------------------------------------------------------------
-- Registro y confirmación de correo
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  -- Un error de vinculación nunca debe impedir el registro; la invitación queda
  -- pendiente y el administrador puede corregirla.
  begin
    perform private.link_pending_invitation(new.id);
  exception when others then
    raise warning 'No se pudo vincular la invitación del usuario %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function private.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform private.link_pending_invitation(new.id);
  exception when others then
    raise warning 'No se pudo vincular la invitación del usuario %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function private.handle_user_email_confirmed() from public, anon, authenticated;

create trigger on_auth_user_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute procedure private.handle_user_email_confirmed();

-- ---------------------------------------------------------------------------
-- Alta de empresas (solo desde el servidor: SQL editor o futura consola interna)
-- ---------------------------------------------------------------------------

create or replace function private.create_organization(
  organization_name text,
  administrator_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
begin
  insert into public.organizations (name)
  values (btrim(organization_name))
  returning id into new_organization_id;

  insert into public.organization_invitations (organization_id, email, role)
  values (new_organization_id, administrator_email, 'administrador');

  return new_organization_id;
end;
$$;

revoke all on function private.create_organization(text, text) from public, anon, authenticated;
