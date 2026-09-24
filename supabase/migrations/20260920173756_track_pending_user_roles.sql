-- Los perfiles actuales ya recibieron atención; los nuevos quedan pendientes.
alter table public.perfiles
  add column rol_confirmado_en timestamptz;

update public.perfiles
set rol_confirmado_en = now();

create index perfiles_rol_pendiente_idx
  on public.perfiles (creado_en desc)
  where rol_confirmado_en is null;

-- Las cuentas de prueba creadas desde Auth pueden no incluir nombre completo.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1),
      'Usuario'
    )
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Confirmar incluso "visualizador" retira el aviso sin cambiar su rol inicial.
create or replace function public.set_user_role(
  target_user_id uuid, new_role public.rol_aplicacion
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'No puedes modificar tu propio rol';
  end if;

  update public.perfiles
  set rol = new_role, rol_confirmado_en = now()
  where id = target_user_id;

  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$$;
revoke all on function public.set_user_role(uuid, public.rol_aplicacion)
  from public, anon;
grant execute on function public.set_user_role(uuid, public.rol_aplicacion)
  to authenticated;
