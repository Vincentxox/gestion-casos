-- Eliminar mi cuenta (contrato C-024, aprobado por el responsable el 26/10/2026; requisito
-- de Google Play para apps que crean cuentas).
--
-- La persona elimina su propia cuenta desde la app. Esta función deja el perfil sin datos
-- personales y la Edge Function `delete-account` borra después su foto y su usuario de Auth
-- (borrado suave). Se conserva lo que es registro de trabajo de la empresa: solicitudes,
-- historial, reportes, firmas, recursos y su nombre en `former_members`.
--
-- Reglas:
-- 1. Solo la propia persona, con su sesión.
-- 2. Se bloquea si tiene trabajos asignados abiertos (como la baja de miembros, 2.2).
-- 3. Se bloquea si es el único administrador y la empresa tiene otros miembros.
-- 4. Si es el único miembro, la empresa queda inactiva (2.3). No se borra ningún dato.
-- 5. Repetirla no cambia nada: así la Edge Function puede reintentar sus pasos.

alter table public.profiles
add column deleted_at timestamptz;

-- Quien pertenece a una empresa inactiva también puede eliminar su cuenta (Google Play lo
-- exige siempre). `prepare_account_deletion` marca la transacción con el usuario que se
-- elimina, y solo entonces el bloqueo de empresa inactiva deja pasar sus escrituras. El
-- resto de la función es igual a la de 20261016190000.
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

  -- Eliminación de la propia cuenta, en curso dentro de esta transacción.
  if current_setting('nexo.deleting_account', true) = (select auth.uid())::text then
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

create or replace function public.prepare_account_deletion()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  profile public.profiles%rowtype;
  open_cases text;
  other_members boolean;
  photo_folder text;
begin
  if current_user_id is null then
    raise exception 'Acceso denegado';
  end if;

  -- El bloqueo hace esperar a una asignación simultánea (transition_case lee al técnico con
  -- `for share`), así que la búsqueda de trabajos abiertos la ve.
  select * into profile
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  if profile.deleted_at is not null then
    return null;
  end if;

  -- Solo dura hasta el final de esta transacción (ver block_inactive_organization).
  perform set_config('nexo.deleting_account', current_user_id::text, true);

  if profile.organization_id is not null then
    select string_agg(case_number, ', ' order by case_number) into open_cases
    from public.cases
    where organization_id = profile.organization_id
      and assigned_to = current_user_id
      and status in ('asignado', 'en_ejecucion', 'en_espera');

    if open_cases is not null then
      raise exception 'Pide que reasignen primero tus trabajos abiertos: %', open_cases;
    end if;

    select exists (
      select 1 from public.profiles
      where organization_id = profile.organization_id
        and id <> current_user_id
    ) into other_members;

    if other_members
      and profile.role = 'administrador'
      and not exists (
        select 1 from public.profiles
        where organization_id = profile.organization_id
          and role = 'administrador'
          and id <> current_user_id
      ) then
      raise exception 'Nombra a otro administrador antes de eliminar tu cuenta';
    end if;

    photo_folder := profile.organization_id::text || '/' || current_user_id::text || '/';

    insert into public.former_members (organization_id, user_id, full_name, deactivated_by)
    values (profile.organization_id, current_user_id, profile.full_name, current_user_id)
    on conflict (organization_id, user_id) do update
    set full_name = excluded.full_name,
        deactivated_at = now(),
        deactivated_by = excluded.deactivated_by;
  end if;

  delete from public.push_tokens where user_id = current_user_id;
  delete from public.notifications where recipient_id = current_user_id;
  delete from public.organization_access_requests where user_id = current_user_id;

  -- Primero sale de la empresa conservando el rol: el control de «la empresa debe conservar
  -- un administrador» solo mira cambios de rol dentro de una empresa, y la regla 3 ya
  -- comprobó que no deja sola a una empresa con miembros.
  update public.profiles
  set organization_id = null,
      area_id = null,
      avatar_url = null,
      full_name = 'Cuenta eliminada',
      deleted_at = now()
  where id = current_user_id;

  update public.profiles
  set role = 'solicitante'
  where id = current_user_id;

  -- Al final, porque una empresa inactiva bloquea los cambios de sus perfiles.
  if profile.organization_id is not null and not other_members then
    update public.organizations
    set is_active = false
    where id = profile.organization_id;
  end if;

  return photo_folder;
end;
$$;

revoke all on function public.prepare_account_deletion() from public, anon;
grant execute on function public.prepare_account_deletion() to authenticated;
