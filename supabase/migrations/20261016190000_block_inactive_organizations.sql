-- Empresa inactiva sin acceso (docs/BUSINESS_RULES.md 2.3, hallazgo D-5).
--
-- `organizations.is_active` existía desde el modelo multiempresa, pero nada lo revisaba:
-- una empresa desactivada seguía usando la app con normalidad. Desde esta migración:
--
-- 1. Los helpers de autorización tratan a quien pertenece a una empresa inactiva como a
--    una persona sin empresa. Así, todas las políticas RLS y las RPC que los usan le
--    niegan el acceso.
-- 2. Un trigger en cada tabla de negocio rechaza las escrituras de una persona sobre
--    filas de una empresa inactiva. Cubre las RPC SECURITY DEFINER que leen el perfil
--    directamente en vez de usar los helpers (por ejemplo `transition_case`).
-- 3. Las lecturas que no pasaban por los helpers (fotos pendientes propias, solicitudes
--    de acceso propias) y los permisos de fotos y recursos también exigen empresa activa.
-- 4. Quien pertenece a una empresa inactiva no registra dispositivos para avisos; sí puede
--    quitar los suyos (al cerrar sesión).
-- 5. La persona sigue leyendo su empresa (nombre y estado), para que la app le explique
--    por qué no tiene acceso.
--
-- No se borra ni se modifica ningún dato: al reactivar la empresa, todo vuelve a ser como
-- antes. Las tareas del servidor (sin usuario autenticado) no se bloquean.

-- ---------------------------------------------------------------------------
-- 1. Helpers de autorización: solo cuentan las empresas activas
-- ---------------------------------------------------------------------------

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = (select auth.uid())
    and o.is_active;
$$;

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = (select auth.uid())
    and o.is_active;
$$;

create or replace function private.current_area_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.area_id
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = (select auth.uid())
    and o.is_active;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = (select auth.uid())
      and o.is_active
      and p.role = 'administrador'
  );
$$;

create or replace function private.has_role(expected_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = (select auth.uid())
      and o.is_active
      and p.role = expected_role
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Escrituras sobre filas de una empresa inactiva
-- ---------------------------------------------------------------------------

-- Es SECURITY DEFINER porque la política de `organizations` ya no deja ver una empresa
-- inactiva por la vía normal. Se dispara al final de los triggers BEFORE de cada tabla
-- (por orden alfabético del nombre), cuando los triggers de preparación ya fijaron
-- `organization_id`.
create or replace function private.block_inactive_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_organization_id uuid;
  new_organization_id uuid;
begin
  -- Tareas del servidor: sin usuario autenticado.
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    old_organization_id := old.organization_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_organization_id := new.organization_id;
  end if;

  -- La solicitud de acceso propia no es un dato de la empresa: quien la pidió puede
  -- cancelarla, y aceptar una invitación de otra empresa la cancela sola
  -- (`profiles_cancel_access_requests`). Las demás escrituras sobre solicitudes (aprobar,
  -- rechazar) las hace un administrador y quedan bloqueadas.
  if tg_table_name = 'organization_access_requests'
    and (coalesce(to_jsonb(new), to_jsonb(old)) ->> 'user_id')::uuid = (select auth.uid()) then
    return coalesce(new, old);
  end if;

  if exists (
    select 1
    from public.organizations
    where id in (old_organization_id, new_organization_id)
      and not is_active
  ) then
    raise exception 'Tu empresa está inactiva. Comunícate con Nexo Casos para reactivarla.';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.block_inactive_organization() from public, anon, authenticated;

create trigger areas_verify_active_organization
before insert or update or delete on public.areas
for each row execute function private.block_inactive_organization();

create trigger case_events_verify_active_organization
before insert or update or delete on public.case_events
for each row execute function private.block_inactive_organization();

create trigger case_photos_verify_active_organization
before insert or update or delete on public.case_photos
for each row execute function private.block_inactive_organization();

create trigger case_report_versions_verify_active_organization
before insert or update or delete on public.case_report_versions
for each row execute function private.block_inactive_organization();

create trigger case_reports_verify_active_organization
before insert or update or delete on public.case_reports
for each row execute function private.block_inactive_organization();

create trigger case_resource_usages_verify_active_organization
before insert or update or delete on public.case_resource_usages
for each row execute function private.block_inactive_organization();

create trigger case_signatures_verify_active_organization
before insert or update or delete on public.case_signatures
for each row execute function private.block_inactive_organization();

create trigger cases_verify_active_organization
before insert or update or delete on public.cases
for each row execute function private.block_inactive_organization();

create trigger categories_verify_active_organization
before insert or update or delete on public.categories
for each row execute function private.block_inactive_organization();

create trigger former_members_verify_active_organization
before insert or update or delete on public.former_members
for each row execute function private.block_inactive_organization();

create trigger notifications_verify_active_organization
before insert or update or delete on public.notifications
for each row execute function private.block_inactive_organization();

create trigger organization_access_requests_verify_active_organization
before insert or update or delete on public.organization_access_requests
for each row execute function private.block_inactive_organization();

create trigger organization_invitations_verify_active_organization
before insert or update or delete on public.organization_invitations
for each row execute function private.block_inactive_organization();

create trigger priority_targets_verify_active_organization
before insert or update or delete on public.priority_targets
for each row execute function private.block_inactive_organization();

create trigger profiles_verify_active_organization
before insert or update or delete on public.profiles
for each row execute function private.block_inactive_organization();

create trigger resources_verify_active_organization
before insert or update or delete on public.resources
for each row execute function private.block_inactive_organization();

-- ---------------------------------------------------------------------------
-- 3. Lecturas y permisos que no pasaban por los helpers
-- ---------------------------------------------------------------------------

-- Fotos pendientes propias: la política solo miraba `uploaded_by`. Storage usa esta misma
-- visibilidad para leer los archivos (`private.can_read_case_photo_object`).
alter policy "Uploaders can read their pending photos" on public.case_photos
using (
  uploaded_by = (select auth.uid())
  and organization_id = (select private.current_organization_id())
);

-- Solicitudes de acceso propias: se siguen viendo las enviadas a otra empresa (quien aún
-- no tiene empresa espera su respuesta), pero no las de la propia empresa si está inactiva.
alter policy "Administrators and requesters can read access requests"
on public.organization_access_requests
using (
  (
    user_id = (select auth.uid())
    and (
      organization_id is distinct from (
        select p.organization_id from public.profiles p where p.id = (select auth.uid())
      )
      or organization_id = (select private.current_organization_id())
    )
  )
  or (
    organization_id = (select private.current_organization_id())
    and (select private.is_admin())
  )
);

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
  join public.profiles on profiles.id = requests.user_id
  where requests.user_id = (select auth.uid())
    and (
      requests.organization_id is distinct from profiles.organization_id
      or organizations.is_active
    )
  order by requests.created_at desc
  limit 1;
$$;

-- Permisos de fotos y de recursos: comparaban la empresa del caso con la del perfil sin
-- mirar si está activa. `can_manage_case_photos` decide, entre otras cosas, quién sube
-- archivos a Storage para una foto reservada, y Storage no tiene los triggers de arriba.
create or replace function private.can_manage_case_photos(
  target_case_id uuid,
  target_kind public.photo_kind
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cases
    join public.profiles on profiles.id = (select auth.uid())
    where cases.id = target_case_id
      and cases.organization_id = (select private.current_organization_id())
      and (
        cases.assigned_to = profiles.id
        or (profiles.role = 'jefe_area' and profiles.area_id = cases.target_area_id)
      )
      and cases.status = any (
        case target_kind
          when 'antes' then array['asignado', 'en_ejecucion', 'en_espera']::public.case_status[]
          else array['en_ejecucion', 'en_espera']::public.case_status[]
        end
      )
  );
$$;

create or replace function private.can_register_case_usage(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cases
    join public.profiles on profiles.id = (select auth.uid())
    where cases.id = target_case_id
      and cases.organization_id = (select private.current_organization_id())
      and cases.status in ('en_ejecucion', 'en_espera')
      and (
        cases.assigned_to = profiles.id
        or (profiles.role = 'jefe_area' and profiles.area_id = cases.target_area_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Dispositivos para avisos
-- ---------------------------------------------------------------------------

-- `push_tokens` no tiene `organization_id`: el trigger general no la cubre. Registrar o
-- reasignar un dispositivo exige que su dueño no pertenezca a una empresa inactiva.
-- Quitarlo (al cerrar sesión) sigue permitido.
create or replace function private.block_inactive_push_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and exists (
    select 1
    from public.profiles
    join public.organizations on organizations.id = profiles.organization_id
    where profiles.id = new.user_id
      and not organizations.is_active
  ) then
    raise exception 'Tu empresa está inactiva. Comunícate con Nexo Casos para reactivarla.';
  end if;

  return new;
end;
$$;

revoke all on function private.block_inactive_push_token() from public, anon, authenticated;

create trigger push_tokens_verify_active_organization
before insert or update on public.push_tokens
for each row execute function private.block_inactive_push_token();

-- ---------------------------------------------------------------------------
-- 5. La persona sigue viendo su empresa, aunque esté inactiva
-- ---------------------------------------------------------------------------

-- Antes: `id = current_organization_id()`, que ahora es null con la empresa inactiva.
-- La subconsulta pasa por la política de `profiles`, que siempre deja leer el perfil
-- propio. Solo afecta a la lectura: renombrar sigue exigiendo una empresa activa.
alter policy "Members can read their organization" on public.organizations
using (
  id = (
    select p.organization_id
    from public.profiles p
    where p.id = (select auth.uid())
  )
);
