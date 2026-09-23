-- Corrección de la revisión de Codex a C-008: quien ejecutó el trabajo (técnico asignado,
-- aunque sea jefe del área técnica) no puede validar ni devolver su propio reporte. La
-- exclusión es explícita en ambas RPC y no depende de la regla de firma duplicada.

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

  if target_case.status <> 'reporte_enviado' then
    raise exception 'Solo se puede validar un reporte enviado';
  end if;

  admin_substitutes := member.role = 'administrador'
    and (select private.technical_validation_needs_admin(target_case));

  if member.id = target_case.assigned_to then
    raise exception 'No puedes validar un trabajo que ejecutaste';
  end if;

  if not (
    (member.role = 'jefe_area' and member.area_id = target_case.target_area_id)
    or admin_substitutes
  ) then
    raise exception 'Solo el jefe del área técnica puede validar el reporte';
  end if;

  select * into version
  from public.case_report_versions
  where case_id = target_case.id
    and status = 'vigente';

  signature := private.sign_report_version(
    version, 'validacion_tecnica', member, signature_stroke, accepts_terms
  );
  perform private.move_case_for_report(
    target_case,
    'validado',
    'validar_reporte',
    member,
    case when admin_substitutes
      then 'Validación del administrador: el jefe del área técnica ejecutó el trabajo'
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
    if member.id = target_case.assigned_to then
      raise exception 'No puedes devolver un trabajo que ejecutaste';
    end if;
    allowed := (member.role = 'jefe_area' and member.area_id = target_case.target_area_id)
      or (
        member.role = 'administrador'
        and (select private.technical_validation_needs_admin(target_case))
      );
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

revoke all on function public.validate_case_report(uuid, text, boolean) from public, anon;
revoke all on function public.return_case_report(uuid, text) from public, anon;
grant execute on function public.validate_case_report(uuid, text, boolean) to authenticated;
grant execute on function public.return_case_report(uuid, text) to authenticated;
