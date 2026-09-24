-- El orden del enum define la clasificación ascendente: baja, media, alta.
create type public.prioridad_actividad as enum ('baja', 'media', 'alta');

alter table public.actividades
  add column prioridad public.prioridad_actividad not null default 'media';

create index actividades_prioridad_creado_idx
  on public.actividades (prioridad, creado_en desc, id);
