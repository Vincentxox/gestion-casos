create policy "Admins can update user assignments"
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant update (area_id) on table public.profiles to authenticated;

create or replace function private.protect_profile_area_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.area_id is distinct from old.area_id
    and not (select private.is_admin()) then
    raise exception 'Solo un administrador puede cambiar el área asignada';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_area_assignment()
from public, anon, authenticated;

create trigger profiles_protect_area_assignment
before update of area_id on public.profiles
for each row execute procedure private.protect_profile_area_assignment();

create or replace function public.set_user_area(
  target_user_id uuid,
  new_area_id uuid
)
returns void
language plpgsql
security invoker
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
