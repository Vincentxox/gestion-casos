alter table public.profiles
add column area_id uuid references public.areas (id) on delete set null;

create index profiles_area_id_idx on public.profiles (area_id);

create or replace function public.set_user_area(
  target_user_id uuid,
  new_area_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  if new_area_id is not null and not exists (
    select 1
    from public.areas
    where id = new_area_id
      and is_active
  ) then
    raise exception 'Área no disponible';
  end if;

  update public.profiles
  set area_id = new_area_id
  where id = target_user_id;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

revoke all on function public.set_user_area(uuid, uuid) from public, anon;
grant execute on function public.set_user_area(uuid, uuid) to authenticated;
