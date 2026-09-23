-- Solicitudes de acceso con código de empresa (docs/BUSINESS_RULES.md, sección 2.1).
--
-- * Cada empresa tiene un código de acceso que solo ven sus administradores.
-- * Una persona registrada sin empresa ingresa el código y crea una solicitud que solo
--   ven los administradores de esa empresa.
-- * El administrador la aprueba (eligiendo rol y área) o la rechaza.
-- * Los intentos con código inválido se limitan para evitar adivinar códigos.
-- * La invitación por correo sigue funcionando; si una persona con solicitud pendiente
--   acepta una invitación, la solicitud se cancela.

-- ---------------------------------------------------------------------------
-- Código de acceso por empresa
-- ---------------------------------------------------------------------------

-- 8 caracteres sin letras ni números ambiguos (sin 0, O, 1, I, L), formato XXXX-XXXX.
create or replace function private.generate_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  random_hex text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  code text := '';
  character_index integer;
begin
  for character_index in 0..7 loop
    code := code || substr(
      alphabet,
      (('x' || substr(random_hex, character_index * 2 + 1, 2))::bit(8)::integer % char_length(alphabet)) + 1,
      1
    );
  end loop;

  return substr(code, 1, 4) || '-' || substr(code, 5, 4);
end;
$$;

revoke all on function private.generate_join_code() from public, anon, authenticated;

alter table public.organizations
add column join_code text not null default private.generate_join_code();

create unique index organizations_join_code_unique_idx on public.organizations (join_code);

-- El código solo se entrega a administradores mediante RPC.
revoke select on table public.organizations from authenticated;
grant select (id, name, is_active, created_at, updated_at) on table public.organizations
  to authenticated;

create or replace function public.get_organization_join_code()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_code text;
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  select join_code into current_code
  from public.organizations
  where id = (select private.current_organization_id());

  return current_code;
end;
$$;

create or replace function public.regenerate_organization_join_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  loop
    new_code := private.generate_join_code();
    exit when not exists (select 1 from public.organizations where join_code = new_code);
  end loop;

  update public.organizations
  set join_code = new_code
  where id = (select private.current_organization_id());

  return new_code;
end;
$$;

revoke all on function public.get_organization_join_code() from public, anon;
revoke all on function public.regenerate_organization_join_code() from public, anon;
grant execute on function public.get_organization_join_code() to authenticated;
grant execute on function public.regenerate_organization_join_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Solicitudes de acceso
-- ---------------------------------------------------------------------------

create type public.access_request_status as enum (
  'pendiente',
  'aprobada',
  'rechazada',
  'cancelada'
);

create table public.organization_access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  status public.access_request_status not null default 'pendiente',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (
    decision_note is null or char_length(btrim(decision_note)) between 3 and 300
  ),
  assigned_role public.app_role,
  assigned_area_id uuid references public.areas (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Una sola solicitud pendiente por persona.
create unique index organization_access_requests_pending_user_idx
  on public.organization_access_requests (user_id)
  where status = 'pendiente';
create index organization_access_requests_user_idx
  on public.organization_access_requests (user_id, created_at desc);
create index organization_access_requests_organization_idx
  on public.organization_access_requests (organization_id, status, created_at desc);
create index organization_access_requests_decided_by_idx
  on public.organization_access_requests (decided_by);
create index organization_access_requests_assigned_area_idx
  on public.organization_access_requests (assigned_area_id);

alter table public.organization_access_requests enable row level security;

create policy "Administrators and requesters can read access requests"
on public.organization_access_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    organization_id = (select private.current_organization_id())
    and (select private.is_admin())
  )
);

-- Solo lectura desde el cliente: todo cambio pasa por las RPC de abajo.
revoke all on table public.organization_access_requests from anon, authenticated;
grant select on table public.organization_access_requests to authenticated;

create table private.access_code_attempts (
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index access_code_attempts_user_idx on private.access_code_attempts (user_id, attempted_at desc);

revoke all on table private.access_code_attempts from public, anon, authenticated;

-- Devuelve {status, organization_name}. status: 'pendiente' (solicitud creada),
-- 'codigo_invalido' o 'demasiados_intentos'. Los intentos inválidos se registran, por eso
-- no se lanzan como error (un error desharía el registro del intento).
create or replace function public.request_organization_access(access_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member public.profiles;
  user_email text;
  user_confirmed_at timestamptz;
  target_organization public.organizations;
  normalized_code text := upper(regexp_replace(coalesce(access_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if current_user_id is null then
    raise exception 'Acceso denegado';
  end if;

  select * into member from public.profiles where id = current_user_id;

  if member.organization_id is not null then
    raise exception 'Tu cuenta ya pertenece a una empresa';
  end if;

  select lower(email), email_confirmed_at
  into user_email, user_confirmed_at
  from auth.users
  where id = current_user_id;

  if user_confirmed_at is null then
    raise exception 'Confirma tu correo antes de solicitar acceso';
  end if;

  if exists (
    select 1
    from public.organization_access_requests
    where user_id = current_user_id
      and status = 'pendiente'
  ) then
    raise exception 'Ya tienes una solicitud pendiente';
  end if;

  if (
    select count(*)
    from private.access_code_attempts
    where user_id = current_user_id
      and attempted_at > now() - interval '1 hour'
  ) >= 10 then
    return jsonb_build_object('status', 'demasiados_intentos', 'organization_name', null);
  end if;

  if char_length(normalized_code) = 8 then
    select * into target_organization
    from public.organizations
    where join_code = substr(normalized_code, 1, 4) || '-' || substr(normalized_code, 5, 4)
      and is_active;
  end if;

  if target_organization.id is null then
    insert into private.access_code_attempts (user_id) values (current_user_id);
    return jsonb_build_object('status', 'codigo_invalido', 'organization_name', null);
  end if;

  insert into public.organization_access_requests (organization_id, user_id, email, full_name)
  values (target_organization.id, current_user_id, user_email, coalesce(member.full_name, ''));

  return jsonb_build_object('status', 'pendiente', 'organization_name', target_organization.name);
end;
$$;

create or replace function public.get_my_access_request()
returns table (
  id uuid,
  organization_name text,
  status public.access_request_status,
  decision_note text,
  created_at timestamptz,
  decided_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    requests.id,
    organizations.name,
    requests.status,
    requests.decision_note,
    requests.created_at,
    requests.decided_at
  from public.organization_access_requests as requests
  join public.organizations on organizations.id = requests.organization_id
  where requests.user_id = (select auth.uid())
  order by requests.created_at desc
  limit 1;
$$;

create or replace function public.cancel_my_access_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organization_access_requests
  set status = 'cancelada',
      decided_at = now()
  where user_id = (select auth.uid())
    and status = 'pendiente';

  if not found then
    raise exception 'No tienes una solicitud pendiente';
  end if;
end;
$$;

create or replace function public.approve_access_request(
  target_request_id uuid,
  new_role public.app_role,
  new_area_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  admin_organization_id uuid := (select private.current_organization_id());
  request public.organization_access_requests;
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  select * into request
  from public.organization_access_requests
  where id = target_request_id
    and organization_id = admin_organization_id
  for update;

  if not found then
    raise exception 'Solicitud de acceso no encontrada';
  end if;

  if request.status <> 'pendiente' then
    raise exception 'La solicitud de acceso ya no está pendiente';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = request.user_id
      and organization_id is not null
  ) then
    -- No se cancela aquí: la excepción revertiría la cancelación. El trigger
    -- profiles_cancel_access_requests ya cancela las solicitudes pendientes en cuanto
    -- un perfil queda vinculado a una empresa, así que este caso no debería ocurrir.
    raise exception 'Esta persona ya pertenece a una empresa';
  end if;

  perform private.assert_member_access(admin_organization_id, new_role, new_area_id);

  update public.profiles
  set organization_id = admin_organization_id,
      role = new_role,
      area_id = new_area_id
  where id = request.user_id;

  update public.organization_access_requests
  set status = 'aprobada',
      decided_by = admin_id,
      decided_at = now(),
      assigned_role = new_role,
      assigned_area_id = new_area_id
  where id = request.id;
end;
$$;

create or replace function public.reject_access_request(
  target_request_id uuid,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_note text := nullif(btrim(note), '');
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  if clean_note is not null and char_length(clean_note) not between 3 and 300 then
    raise exception 'El motivo debe tener entre 3 y 300 caracteres';
  end if;

  update public.organization_access_requests
  set status = 'rechazada',
      decided_by = (select auth.uid()),
      decided_at = now(),
      decision_note = clean_note
  where id = target_request_id
    and organization_id = (select private.current_organization_id())
    and status = 'pendiente';

  if not found then
    raise exception 'Solicitud de acceso no encontrada o ya resuelta';
  end if;
end;
$$;

revoke all on function public.request_organization_access(text) from public, anon;
revoke all on function public.get_my_access_request() from public, anon;
revoke all on function public.cancel_my_access_request() from public, anon;
revoke all on function public.approve_access_request(uuid, public.app_role, uuid) from public, anon;
revoke all on function public.reject_access_request(uuid, text) from public, anon;
grant execute on function public.request_organization_access(text) to authenticated;
grant execute on function public.get_my_access_request() to authenticated;
grant execute on function public.cancel_my_access_request() to authenticated;
grant execute on function public.approve_access_request(uuid, public.app_role, uuid) to authenticated;
grant execute on function public.reject_access_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Al aceptar una invitación se cancelan las solicitudes de acceso pendientes.
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

  -- Las solicitudes de acceso pendientes las cancela el trigger
  -- profiles_cancel_access_requests al vincular el perfil.
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Al quedar vinculado a una empresa, por cualquier vía (invitación, aprobación o
-- ajuste del servidor), se cancelan las solicitudes de acceso pendientes del perfil.
-- La aprobación marca después su propia solicitud como 'aprobada'.
-- ---------------------------------------------------------------------------

create or replace function private.cancel_access_requests_on_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organization_access_requests
  set status = 'cancelada',
      decided_at = now()
  where user_id = new.id
    and status = 'pendiente';
  return null;
end;
$$;

revoke all on function private.cancel_access_requests_on_link() from public, anon, authenticated;

drop trigger if exists profiles_cancel_access_requests on public.profiles;
create trigger profiles_cancel_access_requests
after insert or update of organization_id on public.profiles
for each row
when (new.organization_id is not null)
execute function private.cancel_access_requests_on_link();
