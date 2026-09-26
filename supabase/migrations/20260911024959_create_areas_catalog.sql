create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (
    description is null or char_length(btrim(description)) between 3 and 300
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index areas_name_unique_idx on public.areas (lower(btrim(name)));
create index areas_active_name_idx on public.areas (is_active, name);

alter table public.areas enable row level security;

revoke all on table public.areas from anon, authenticated;
grant select, insert, update on table public.areas to authenticated;

create policy "Authenticated users can read active areas"
on public.areas
for select
to authenticated
using (is_active or (select private.is_admin()));

create policy "Administrators can create areas"
on public.areas
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Administrators can update areas"
on public.areas
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create trigger areas_set_updated_at
before update on public.areas
for each row execute procedure private.set_updated_at();

insert into public.areas (name, description)
values
  ('Administración', 'Solicitudes y gestiones administrativas.'),
  ('Tecnología', 'Sistemas, equipos, accesos y conectividad.'),
  ('Mantenimiento', 'Infraestructura, instalaciones y reparaciones.'),
  ('Recursos Humanos', 'Gestiones relacionadas con el personal.'),
  ('Seguridad', 'Incidentes, accesos y prevención de riesgos.');
