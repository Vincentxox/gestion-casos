-- Solicitar una empresa nueva desde la app (contrato C-025, aprobado por el responsable el
-- 26/10/2026).
--
-- Una persona con cuenta y sin empresa pide crear la suya. La empresa se crea solo cuando un
-- administrador de la plataforma aprueba la solicitud: el servidor llama entonces a
-- `private.create_organization` con el correo de quien la pidió, y la invitación de
-- administrador que crea esa función la vincula de inmediato (su correo ya está verificado).
--
-- Reglas:
-- 1. Solo quien no tiene empresa y tiene el correo verificado puede pedirla.
-- 2. Una sola solicitud pendiente por persona; puede cancelarla.
-- 3. Solo los administradores de la plataforma (`private.platform_admins`) las ven y las
--    revisan. Esa tabla se llena desde el SQL Editor, nunca desde la app.
-- 4. Rechazar exige un motivo, que la persona ve.
-- 5. Al eliminar su cuenta (C-024) se borran sus solicitudes, porque guardan su correo y su
--    teléfono.

create table private.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on table private.platform_admins from public, anon, authenticated;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.platform_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_platform_admin() from public, anon, authenticated;

create table public.organization_creation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  organization_name text not null check (char_length(btrim(organization_name)) between 2 and 120),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),
  team_size text not null check (team_size in ('1-5', '6-25', '26-75', '76+')),
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  rejection_reason text check (
    rejection_reason is null or char_length(btrim(rejection_reason)) between 3 and 300
  ),
  organization_id uuid references public.organizations (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'rechazada' or rejection_reason is not null)
);

create unique index organization_creation_requests_pending_user_idx
  on public.organization_creation_requests (user_id)
  where status = 'pendiente';
create index organization_creation_requests_user_idx
  on public.organization_creation_requests (user_id, created_at desc);
create index organization_creation_requests_status_idx
  on public.organization_creation_requests (status, created_at desc);
create index organization_creation_requests_organization_idx
  on public.organization_creation_requests (organization_id);
create index organization_creation_requests_reviewed_by_idx
  on public.organization_creation_requests (reviewed_by);

-- Sin políticas: nadie la lee ni la escribe desde el cliente. Todo pasa por las RPC.
alter table public.organization_creation_requests enable row level security;
revoke all on table public.organization_creation_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Quien pide la empresa
-- ---------------------------------------------------------------------------

create or replace function public.request_organization_creation(
  organization_name text,
  contact_phone text,
  team_size text,
  message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  user_email text;
  user_confirmed_at timestamptz;
  new_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'Acceso denegado';
  end if;

  if exists (
    select 1 from public.profiles
    where id = current_user_id
      and (organization_id is not null or deleted_at is not null)
  ) then
    raise exception 'Tu cuenta ya pertenece a una empresa';
  end if;

  select lower(email), email_confirmed_at
  into user_email, user_confirmed_at
  from auth.users
  where id = current_user_id;

  if user_confirmed_at is null then
    raise exception 'Confirma tu correo antes de solicitar una empresa';
  end if;

  if exists (
    select 1 from public.organization_creation_requests
    where user_id = current_user_id
      and status = 'pendiente'
  ) then
    raise exception 'Ya tienes una solicitud pendiente';
  end if;

  insert into public.organization_creation_requests (
    user_id, email, organization_name, contact_phone, team_size, message
  )
  values (
    current_user_id,
    user_email,
    btrim(organization_name),
    nullif(btrim(coalesce(contact_phone, '')), ''),
    team_size,
    nullif(btrim(coalesce(message, '')), '')
  )
  returning id into new_request_id;

  return new_request_id;
end;
$$;

create or replace function public.cancel_organization_creation_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Acceso denegado';
  end if;

  update public.organization_creation_requests
  set status = 'cancelada'
  where user_id = (select auth.uid())
    and status = 'pendiente';

  if not found then
    raise exception 'No tienes una solicitud pendiente';
  end if;
end;
$$;

-- La última solicitud propia, para la pantalla «Únete a tu empresa». Sin filas si no hay.
create or replace function public.my_organization_creation_request()
returns table (
  id uuid,
  organization_name text,
  status text,
  rejection_reason text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.organization_name, r.status, r.rejection_reason, r.created_at, r.reviewed_at
  from public.organization_creation_requests r
  where r.user_id = (select auth.uid())
  order by r.created_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Administradores de la plataforma
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

-- `requested_status` null devuelve todas. Las pendientes, de la más antigua a la más nueva;
-- las demás, de la más reciente a la más antigua.
create or replace function public.list_organization_creation_requests(requested_status text)
returns table (
  id uuid,
  requester_name text,
  email text,
  organization_name text,
  contact_phone text,
  team_size text,
  message text,
  status text,
  rejection_reason text,
  organization_id uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Acceso denegado';
  end if;

  return query
  select
    r.id,
    requester.full_name,
    r.email,
    r.organization_name,
    r.contact_phone,
    r.team_size,
    r.message,
    r.status,
    r.rejection_reason,
    r.organization_id,
    reviewer.full_name,
    r.reviewed_at,
    r.created_at
  from public.organization_creation_requests r
  join public.profiles requester on requester.id = r.user_id
  left join public.profiles reviewer on reviewer.id = r.reviewed_by
  where requested_status is null or r.status = requested_status
  order by
    case when r.status = 'pendiente' then r.created_at end asc,
    coalesce(r.reviewed_at, r.created_at) desc;
end;
$$;

-- Devuelve el id de la empresa creada al aprobar, o null al rechazar.
create or replace function public.review_organization_creation_request(
  request_id uuid,
  approve boolean,
  reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.organization_creation_requests;
  requester public.profiles;
  new_organization_id uuid;
begin
  if not private.is_platform_admin() then
    raise exception 'Acceso denegado';
  end if;

  select * into request
  from public.organization_creation_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if request.status <> 'pendiente' then
    raise exception 'La solicitud ya no está pendiente';
  end if;

  if not coalesce(approve, false) then
    if char_length(btrim(coalesce(reason, ''))) < 3 then
      raise exception 'Escribe el motivo del rechazo';
    end if;

    update public.organization_creation_requests
    set status = 'rechazada',
        rejection_reason = btrim(reason),
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = request.id;

    return null;
  end if;

  -- Se bloquea el perfil para que no entre a otra empresa mientras se crea esta.
  select * into requester
  from public.profiles
  where id = request.user_id
  for update;

  if requester.organization_id is not null or requester.deleted_at is not null then
    raise exception 'Esta persona ya pertenece a una empresa';
  end if;

  new_organization_id := private.create_organization(request.organization_name, request.email);

  update public.organization_creation_requests
  set status = 'aprobada',
      organization_id = new_organization_id,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = request.id;

  return new_organization_id;
end;
$$;

revoke all on function public.request_organization_creation(text, text, text, text) from public, anon;
revoke all on function public.cancel_organization_creation_request() from public, anon;
revoke all on function public.my_organization_creation_request() from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.list_organization_creation_requests(text) from public, anon;
revoke all on function public.review_organization_creation_request(uuid, boolean, text) from public, anon;
grant execute on function public.request_organization_creation(text, text, text, text) to authenticated;
grant execute on function public.cancel_organization_creation_request() to authenticated;
grant execute on function public.my_organization_creation_request() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.list_organization_creation_requests(text) to authenticated;
grant execute on function public.review_organization_creation_request(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Eliminar la propia cuenta (C-024) borra también estas solicitudes
-- ---------------------------------------------------------------------------

create or replace function private.forget_organization_creation_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.organization_creation_requests where user_id = new.id;
  return null;
end;
$$;

revoke all on function private.forget_organization_creation_requests()
  from public, anon, authenticated;

create trigger profiles_forget_organization_creation_requests
after update of deleted_at on public.profiles
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute procedure private.forget_organization_creation_requests();
