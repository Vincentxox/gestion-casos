create table public.categories (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (
    description is null or char_length(btrim(description)) between 3 and 300
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_area_name_unique_idx
  on public.categories (area_id, lower(btrim(name)));
create index categories_area_active_name_idx
  on public.categories (area_id, is_active, name);

alter table public.categories enable row level security;

revoke all on table public.categories from anon, authenticated;
grant select, insert, update on table public.categories to authenticated;

create policy "Authenticated users can read active categories"
on public.categories
for select
to authenticated
using (
  (is_active and area_id in (select id from public.areas where is_active))
  or (select private.is_admin())
);

create policy "Administrators can create categories"
on public.categories
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Administrators can update categories"
on public.categories
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create trigger categories_set_updated_at
before update on public.categories
for each row execute procedure private.set_updated_at();

insert into public.categories (area_id, name, description)
select areas.id, seeds.category_name, seeds.description
from (
  values
    ('Administración', 'Solicitud administrativa', 'Trámites y gestiones administrativas.'),
    ('Tecnología', 'Falla de equipo', 'Problemas con computadoras y dispositivos.'),
    ('Tecnología', 'Acceso a sistemas', 'Cuentas, permisos y acceso a aplicaciones.'),
    ('Tecnología', 'Conectividad', 'Problemas de red o conexión a internet.'),
    ('Mantenimiento', 'Electricidad', 'Fallas eléctricas e iluminación.'),
    ('Mantenimiento', 'Agua y tuberías', 'Fugas y problemas de abastecimiento.'),
    ('Mantenimiento', 'Infraestructura', 'Daños o reparaciones de instalaciones.'),
    ('Recursos Humanos', 'Gestión de personal', 'Solicitudes relacionadas con colaboradores.'),
    ('Seguridad', 'Control de acceso', 'Incidentes relacionados con accesos físicos.'),
    ('Seguridad', 'Reporte de incidente', 'Registro de incidentes y riesgos.')
) as seeds(area_name, category_name, description)
join public.areas on areas.name = seeds.area_name;
