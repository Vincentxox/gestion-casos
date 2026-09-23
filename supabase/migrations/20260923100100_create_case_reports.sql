-- Reporte de cierre y firma electrónica simple (docs/BUSINESS_RULES.md, secciones 7 y 8).
--
-- * `case_reports`: borrador editable por el técnico asignado o el jefe técnico mientras
--   la solicitud está en ejecución o en espera.
-- * `case_report_versions`: al firmar el técnico, el borrador, los recursos y las fotos
--   se congelan en una versión inmutable con el hash SHA-256 de su contenido.
-- * `case_signatures`: cada firma guarda el trazo vectorial, el consentimiento, la fecha
--   del servidor, el hash de la versión, la IP y el dispositivo tomados de la petición.
--   Ninguna firma se edita ni se borra.
-- * RPC: `submit_case_report` (ejecución), `validate_case_report` (validación técnica),
--   `approve_case_report` (conformidad) y `return_case_report` (devolución).
-- * El PDF lo genera una Edge Function al aprobar; se guarda en el bucket privado
--   `case-reports` y sus datos en las columnas `pdf_*` de la versión.

create type public.signature_type as enum ('ejecucion', 'validacion_tecnica', 'conformidad');
create type public.report_version_status as enum ('vigente', 'devuelta');

-- ---------------------------------------------------------------------------
-- Borrador
-- ---------------------------------------------------------------------------

create table public.case_reports (
  case_id uuid primary key references public.cases (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  diagnosis text check (diagnosis is null or char_length(diagnosis) <= 2000),
  work_done text check (work_done is null or char_length(work_done) <= 4000),
  cause text check (cause is null or char_length(cause) <= 1000),
  observations text check (observations is null or char_length(observations) <= 2000),
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index case_reports_organization_idx on public.case_reports (organization_id);
create index case_reports_updated_by_idx on public.case_reports (updated_by);

alter table public.case_reports enable row level security;

create trigger case_reports_set_updated_at
before update on public.case_reports
for each row execute procedure private.set_updated_at();

-- Completa empresa y autor, y normaliza los textos. Los permisos los da la RLS.
create or replace function private.prepare_case_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.case_id is distinct from old.case_id then
    raise exception 'No se puede cambiar la solicitud de un reporte';
  end if;

  select organization_id into new.organization_id
  from public.cases
  where id = new.case_id;

  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.diagnosis := nullif(btrim(new.diagnosis), '');
  new.work_done := nullif(btrim(new.work_done), '');
  new.cause := nullif(btrim(new.cause), '');
  new.observations := nullif(btrim(new.observations), '');
  return new;
end;
$$;

revoke all on function private.prepare_case_report() from public, anon, authenticated;

create trigger case_reports_prepare
before insert or update on public.case_reports
for each row execute procedure private.prepare_case_report();

create policy "Members can read reports of visible cases"
on public.case_reports
for select
to authenticated
using (exists (select 1 from public.cases where cases.id = case_reports.case_id));

create policy "Assigned staff can start the report"
on public.case_reports
for insert
to authenticated
with check ((select private.can_register_case_usage(case_id)));

create policy "Assigned staff can edit the report"
on public.case_reports
for update
to authenticated
using ((select private.can_register_case_usage(case_id)))
with check ((select private.can_register_case_usage(case_id)));

revoke all on table public.case_reports from anon, authenticated;
grant select on table public.case_reports to authenticated;
grant insert (case_id, diagnosis, work_done, cause, observations)
  on table public.case_reports to authenticated;
grant update (diagnosis, work_done, cause, observations)
  on table public.case_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Versiones congeladas
-- ---------------------------------------------------------------------------

create table public.case_report_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.report_version_status not null default 'vigente',
  content jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  returned_by uuid references public.profiles (id) on delete restrict,
  returned_at timestamptz,
  return_reason text check (
    return_reason is null or char_length(btrim(return_reason)) between 3 and 500
  ),
  pdf_path text,
  pdf_size_bytes bigint check (pdf_size_bytes is null or pdf_size_bytes >= 0),
  pdf_sha256 text check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$'),
  pdf_generated_at timestamptz,
  unique (case_id, version_number)
);

create unique index case_report_versions_one_current_idx
  on public.case_report_versions (case_id)
  where status = 'vigente';
create index case_report_versions_organization_idx
  on public.case_report_versions (organization_id);
create index case_report_versions_created_by_idx on public.case_report_versions (created_by);
create index case_report_versions_returned_by_idx on public.case_report_versions (returned_by);
create index case_report_versions_hash_idx on public.case_report_versions (content_hash);

alter table public.case_report_versions enable row level security;

-- El contenido firmado nunca cambia. Solo pueden cambiar la devolución (una vez) y los
-- datos del PDF (los escribe la Edge Function).
create or replace function private.guard_report_version_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Las versiones del reporte no se pueden borrar';
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.case_id is distinct from old.case_id
    or new.version_number is distinct from old.version_number
    or new.content is distinct from old.content
    or new.content_hash is distinct from old.content_hash
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'El contenido firmado del reporte no se puede modificar';
  end if;

  if old.status = 'devuelta' and (
    new.status is distinct from old.status
    or new.returned_by is distinct from old.returned_by
    or new.returned_at is distinct from old.returned_at
    or new.return_reason is distinct from old.return_reason
  ) then
    raise exception 'La devolución del reporte no se puede modificar';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_report_version_changes() from public, anon, authenticated;

create trigger case_report_versions_guard_changes
before update or delete on public.case_report_versions
for each row execute procedure private.guard_report_version_changes();

create policy "Members can read report versions of visible cases"
on public.case_report_versions
for select
to authenticated
using (exists (select 1 from public.cases where cases.id = case_report_versions.case_id));

revoke all on table public.case_report_versions from anon, authenticated;
grant select on table public.case_report_versions to authenticated;

-- ---------------------------------------------------------------------------
-- Firmas
-- ---------------------------------------------------------------------------

create table public.case_signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  version_id uuid not null references public.case_report_versions (id) on delete restrict,
  signature_type public.signature_type not null,
  signer_id uuid not null references public.profiles (id) on delete restrict,
  signer_role public.app_role not null,
  signed_at timestamptz not null default now(),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  -- Datos de trazado SVG en un lienzo de 0 a 1000 (M, L, Q, C y Z con coordenadas).
  stroke_path text not null check (
    char_length(stroke_path) between 10 and 20000
    and stroke_path ~ '^M[MLQCZmlqcz0-9 ,.\-]*$'
  ),
  consent_text text not null,
  ip_address text,
  user_agent text,
  signature_hash text not null check (signature_hash ~ '^[0-9a-f]{64}$'),
  unique (version_id, signature_type),
  unique (version_id, signer_id)
);

create index case_signatures_case_idx on public.case_signatures (case_id, signed_at);
create index case_signatures_organization_idx on public.case_signatures (organization_id);
create index case_signatures_signer_idx on public.case_signatures (signer_id);

alter table public.case_signatures enable row level security;

create or replace function private.guard_signature_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Las firmas no se pueden modificar ni borrar';
end;
$$;

revoke all on function private.guard_signature_changes() from public, anon, authenticated;

create trigger case_signatures_guard_changes
before update or delete on public.case_signatures
for each row execute procedure private.guard_signature_changes();

create policy "Members can read signatures of visible cases"
on public.case_signatures
for select
to authenticated
using (exists (select 1 from public.cases where cases.id = case_signatures.case_id));

revoke all on table public.case_signatures from anon, authenticated;
grant select on table public.case_signatures to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones internas
-- ---------------------------------------------------------------------------

-- IP y agente de usuario de la petición HTTP (PostgREST expone las cabeceras). Si la
-- llamada no viene de la API, devuelven null.
create or replace function private.request_header(header_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(btrim(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> header_name
  ), '');
$$;

create or replace function private.request_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select left(coalesce(
    private.request_header('cf-connecting-ip'),
    nullif(btrim(split_part(private.request_header('x-forwarded-for'), ',', 1)), ''),
    private.request_header('x-real-ip')
  ), 100);
$$;

revoke all on function private.request_header(text) from public, anon, authenticated;
revoke all on function private.request_ip() from public, anon, authenticated;

create or replace function private.sha256_hex(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(value, 'UTF8')), 'hex');
$$;

revoke all on function private.sha256_hex(text) from public, anon, authenticated;

-- Contenido congelado de una versión: datos de la solicitud, borrador, recursos y fotos.
create or replace function private.build_report_content(
  target_case_id uuid,
  target_version integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'version', target_version,
    'solicitud', jsonb_build_object(
      'id', cases.id,
      'numero', cases.case_number,
      'titulo', cases.title,
      'descripcion', cases.description,
      'ubicacion', cases.location,
      'prioridad', cases.priority,
      'tipo_servicio', categories.name,
      'area_solicitante', requesting.name,
      'area_destino', target.name,
      'creada_por', creator.full_name,
      'tecnico', technician.full_name
    ),
    'fechas', jsonb_build_object(
      'creada', cases.created_at,
      'aceptada', cases.accepted_at,
      'asignada', cases.assigned_at,
      'iniciada', cases.started_at,
      'enviada', now()
    ),
    'reporte', jsonb_build_object(
      'diagnostico', reports.diagnosis,
      'trabajo_realizado', reports.work_done,
      'causa', reports.cause,
      'observaciones', reports.observations
    ),
    'recursos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tipo', usages.kind,
        'recurso', usages.resource_name,
        'clase', usages.resource_kind,
        'unidad', usages.unit,
        'costo_unitario', usages.unit_cost,
        'cantidad', usages.quantity,
        'horas', usages.hours,
        'tecnico', worker.full_name,
        'notas', usages.notes
      ) order by usages.created_at, usages.id)
      from public.case_resource_usages usages
      left join public.profiles worker on worker.id = usages.technician_id
      where usages.case_id = cases.id
    ), '[]'::jsonb),
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', photos.id,
        'tipo', photos.kind,
        'imagen', photos.image_path,
        'miniatura', photos.thumb_path,
        'bytes', photos.size_bytes,
        'subida', photos.confirmed_at
      ) order by photos.kind, photos.confirmed_at, photos.id)
      from public.case_photos photos
      where photos.case_id = cases.id
        and photos.confirmed_at is not null
    ), '[]'::jsonb)
  )
  from public.cases
  join public.categories on categories.id = cases.category_id
  join public.areas requesting on requesting.id = cases.requesting_area_id
  join public.areas target on target.id = cases.target_area_id
  join public.profiles creator on creator.id = cases.created_by
  left join public.profiles technician on technician.id = cases.assigned_to
  left join public.case_reports reports on reports.case_id = cases.id
  where cases.id = target_case_id;
$$;

revoke all on function private.build_report_content(uuid, integer)
  from public, anon, authenticated;

-- Registra una firma sobre la versión vigente con su evidencia.
create or replace function private.sign_report_version(
  target_version public.case_report_versions,
  requested_type public.signature_type,
  signer public.profiles,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent constant text := 'Confirmo que revisé este reporte y estoy de acuerdo con su contenido.';
  clean_stroke text := btrim(signature_stroke);
  signed_time timestamptz := now();
  signature public.case_signatures;
begin
  if accepts_terms is distinct from true then
    raise exception 'Debes aceptar el texto de consentimiento para firmar';
  end if;

  if clean_stroke is null
    or char_length(clean_stroke) not between 10 and 20000
    or clean_stroke !~ '^M[MLQCZmlqcz0-9 ,.\-]*$' then
    raise exception 'Dibuja tu firma antes de continuar';
  end if;

  if exists (
    select 1
    from public.case_signatures
    where version_id = target_version.id
      and signer_id = signer.id
  ) then
    raise exception 'Ya firmaste esta versión del reporte';
  end if;

  insert into public.case_signatures (
    organization_id,
    case_id,
    version_id,
    signature_type,
    signer_id,
    signer_role,
    signed_at,
    content_hash,
    stroke_path,
    consent_text,
    ip_address,
    user_agent,
    signature_hash
  ) values (
    target_version.organization_id,
    target_version.case_id,
    target_version.id,
    requested_type,
    signer.id,
    signer.role,
    signed_time,
    target_version.content_hash,
    clean_stroke,
    consent,
    (select private.request_ip()),
    left((select private.request_header('user-agent')), 300),
    (select private.sha256_hex(concat_ws(
      '|',
      target_version.content_hash,
      requested_type::text,
      signer.id::text,
      to_char(signed_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      private.sha256_hex(clean_stroke)
    )))
  )
  returning * into signature;

  return signature;
end;
$$;

revoke all on function private.sign_report_version(
  public.case_report_versions, public.signature_type, public.profiles, text, boolean
) from public, anon, authenticated;

-- Aplica un cambio de estado del reporte y lo registra en el historial.
create or replace function private.move_case_for_report(
  target_case public.cases,
  next_status public.case_status,
  recorded_action public.case_action,
  actor public.profiles,
  action_comment text
)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_case public.cases;
begin
  update public.cases
  set status = next_status,
      status_changed_at = now(),
      closed_at = case when next_status = 'aprobado' then now() else closed_at end
  where id = target_case.id
  returning * into updated_case;

  insert into public.case_events (
    case_id,
    organization_id,
    action,
    from_status,
    to_status,
    actor_id,
    actor_role,
    comment
  ) values (
    target_case.id,
    target_case.organization_id,
    recorded_action,
    target_case.status,
    next_status,
    actor.id,
    actor.role,
    action_comment
  );

  return updated_case;
end;
$$;

revoke all on function private.move_case_for_report(
  public.cases, public.case_status, public.case_action, public.profiles, text
) from public, anon, authenticated;

-- ¿El área solicitante tiene al menos un jefe? Si no, la conformidad la da el
-- administrador (sección 5.3).
create or replace function private.requesting_area_has_manager(target_case public.cases)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where organization_id = target_case.organization_id
      and organization_id = (select private.current_organization_id())
      and area_id = target_case.requesting_area_id
      and role = 'jefe_area'
  );
$$;

revoke all on function private.requesting_area_has_manager(public.cases) from public, anon;
grant execute on function private.requesting_area_has_manager(public.cases) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC del reporte
-- ---------------------------------------------------------------------------

create or replace function public.submit_case_report(
  target_case_id uuid,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_report_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  draft public.case_reports;
  required_photos smallint;
  after_photos integer;
  next_version integer;
  frozen jsonb;
  version public.case_report_versions;
begin
  select * into member from public.profiles where id = (select auth.uid());

  if member.id is null or member.organization_id is null then
    raise exception 'Acceso denegado';
  end if;

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if target_case.status <> 'en_ejecucion' then
    raise exception 'Solo se puede enviar el reporte de un trabajo en ejecución';
  end if;

  if target_case.assigned_to is distinct from member.id then
    raise exception 'Solo el técnico asignado puede firmar y enviar el reporte';
  end if;

  select * into draft from public.case_reports where case_id = target_case.id;

  if coalesce(char_length(draft.diagnosis), 0) < 10
    or coalesce(char_length(draft.work_done), 0) < 10 then
    raise exception 'Completa el diagnóstico y el trabajo realizado (mínimo 10 caracteres cada uno)';
  end if;

  select min_after_photos into required_photos
  from public.categories
  where id = target_case.category_id;

  select count(*) into after_photos
  from public.case_photos
  where case_id = target_case.id
    and kind = 'despues'
    and confirmed_at is not null;

  if after_photos < required_photos then
    raise exception 'Este tipo de servicio requiere al menos % foto(s) de después', required_photos;
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.case_report_versions
  where case_id = target_case.id;

  frozen := (select private.build_report_content(target_case.id, next_version));

  insert into public.case_report_versions (
    organization_id,
    case_id,
    version_number,
    content,
    content_hash,
    created_by
  ) values (
    target_case.organization_id,
    target_case.id,
    next_version,
    frozen,
    (select private.sha256_hex(frozen::text)),
    member.id
  )
  returning * into version;

  perform private.sign_report_version(version, 'ejecucion', member, signature_stroke, accepts_terms);
  perform private.move_case_for_report(target_case, 'reporte_enviado', 'enviar_reporte', member, null);

  return version;
end;
$$;

create or replace function public.validate_case_report(
  target_case_id uuid,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  version public.case_report_versions;
  signature public.case_signatures;
begin
  select * into member from public.profiles where id = (select auth.uid());

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if member.id is null or not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if target_case.status <> 'reporte_enviado' then
    raise exception 'Solo se puede validar un reporte enviado';
  end if;

  if not (member.role = 'jefe_area' and member.area_id = target_case.target_area_id) then
    raise exception 'Solo el jefe del área técnica puede validar el reporte';
  end if;

  select * into version
  from public.case_report_versions
  where case_id = target_case.id
    and status = 'vigente';

  signature := private.sign_report_version(
    version, 'validacion_tecnica', member, signature_stroke, accepts_terms
  );
  perform private.move_case_for_report(target_case, 'validado', 'validar_reporte', member, null);

  return signature;
end;
$$;

create or replace function public.approve_case_report(
  target_case_id uuid,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  version public.case_report_versions;
  signature public.case_signatures;
  admin_substitutes boolean;
begin
  select * into member from public.profiles where id = (select auth.uid());

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if member.id is null or not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if target_case.status <> 'validado' then
    raise exception 'Solo se puede aprobar un reporte validado';
  end if;

  admin_substitutes := member.role = 'administrador'
    and not (select private.requesting_area_has_manager(target_case));

  if not (
    (member.role = 'jefe_area' and member.area_id = target_case.requesting_area_id)
    or admin_substitutes
  ) then
    raise exception 'Solo el jefe del área solicitante puede aprobar el reporte';
  end if;

  select * into version
  from public.case_report_versions
  where case_id = target_case.id
    and status = 'vigente';

  signature := private.sign_report_version(
    version, 'conformidad', member, signature_stroke, accepts_terms
  );
  perform private.move_case_for_report(
    target_case,
    'aprobado',
    'aprobar_reporte',
    member,
    case when admin_substitutes
      then 'Conformidad del administrador: el área solicitante no tiene jefe'
    end
  );

  return signature;
end;
$$;

create or replace function public.return_case_report(
  target_case_id uuid,
  return_reason text
)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  clean_reason text := nullif(btrim(return_reason), '');
  allowed boolean;
begin
  select * into member from public.profiles where id = (select auth.uid());

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if member.id is null or not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if clean_reason is null or char_length(clean_reason) not between 3 and 500 then
    raise exception 'Indica las observaciones para devolver el reporte (entre 3 y 500 caracteres)';
  end if;

  if target_case.status = 'reporte_enviado' then
    allowed := member.role = 'jefe_area' and member.area_id = target_case.target_area_id;
  elsif target_case.status = 'validado' then
    allowed := (member.role = 'jefe_area' and member.area_id = target_case.requesting_area_id)
      or (
        member.role = 'administrador'
        and not (select private.requesting_area_has_manager(target_case))
      );
  else
    raise exception 'Solo se puede devolver un reporte enviado o validado';
  end if;

  if not allowed then
    raise exception 'No puedes devolver este reporte';
  end if;

  update public.case_report_versions
  set status = 'devuelta',
      returned_by = member.id,
      returned_at = now(),
      return_reason = clean_reason
  where case_id = target_case.id
    and status = 'vigente';

  return private.move_case_for_report(
    target_case, 'en_ejecucion', 'devolver_reporte', member, clean_reason
  );
end;
$$;

revoke all on function public.submit_case_report(uuid, text, boolean) from public, anon;
revoke all on function public.validate_case_report(uuid, text, boolean) from public, anon;
revoke all on function public.approve_case_report(uuid, text, boolean) from public, anon;
revoke all on function public.return_case_report(uuid, text) from public, anon;
grant execute on function public.submit_case_report(uuid, text, boolean) to authenticated;
grant execute on function public.validate_case_report(uuid, text, boolean) to authenticated;
grant execute on function public.approve_case_report(uuid, text, boolean) to authenticated;
grant execute on function public.return_case_report(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- PDF final: bucket privado. Solo escribe la Edge Function (service_role).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-reports', 'case-reports', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can read report PDFs of visible cases"
on storage.objects
for select
to authenticated
using (bucket_id = 'case-reports' and private.can_read_case_object(name));

-- El uso de almacenamiento incluye los PDF generados.
create or replace function private.organization_storage_bytes(target_organization_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce((
      select sum(size_bytes)
      from public.case_photos
      where organization_id = target_organization_id
        and confirmed_at is not null
    ), 0)
    + coalesce((
      select sum(pdf_size_bytes)
      from public.case_report_versions
      where organization_id = target_organization_id
    ), 0)
  )::bigint;
$$;

revoke all on function private.organization_storage_bytes(uuid) from public, anon, authenticated;

-- Verificación: un miembro de la empresa comprueba un código (primeros 12 caracteres del
-- hash impreso en el PDF) y obtiene la solicitud y el estado de esa versión.
create or replace function public.verify_report_code(verification_code text)
returns table (
  case_number text,
  version_number integer,
  version_status public.report_version_status,
  content_hash text,
  signatures integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    cases.case_number,
    versions.version_number,
    versions.status,
    versions.content_hash,
    (select count(*)::integer from public.case_signatures where version_id = versions.id)
  from public.case_report_versions versions
  join public.cases on cases.id = versions.case_id
  where btrim(verification_code) ~* '^[0-9a-f]{12,64}$'
    and left(versions.content_hash, char_length(btrim(verification_code)))
      = lower(btrim(verification_code));
$$;

revoke all on function public.verify_report_code(text) from public, anon;
grant execute on function public.verify_report_code(text) to authenticated;
