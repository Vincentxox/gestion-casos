-- Pruebas: quien ejecutó el trabajo no valida ni devuelve su propio reporte.
-- Se ejecutan después de 14. case_dev: asignado a jefe_tec (único jefe de
-- Mantenimiento), devuelto por el administrador y de nuevo en ejecución.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.login('jefe_tec');
set role authenticated;
select public.submit_case_report(test.get('case_dev')::uuid, test.get('stroke'), true);
select test.throws(
  format($$select public.validate_case_report(%L, %L, true)$$, test.get('case_dev'), test.get('stroke')),
  'No puedes validar un trabajo que ejecutaste',
  'el jefe que ejecutó no valida su propio reporte'
);
select test.throws(
  format($$select public.return_case_report(%L, 'Me lo devuelvo')$$, test.get('case_dev')),
  'No puedes devolver un trabajo que ejecutaste',
  'el jefe que ejecutó no devuelve su propio reporte'
);
reset role;

select test.ok(
  (select status = 'reporte_enviado' from public.cases where id = test.get('case_dev')::uuid)
    and (select count(*) = 1 from public.case_signatures
         where case_id = test.get('case_dev')::uuid
           and version_id = (select id from public.case_report_versions
                             where case_id = test.get('case_dev')::uuid and status = 'vigente')),
  'el reporte sigue enviado, solo con la firma de ejecución'
);

select test.login('admin');
set role authenticated;
select public.validate_case_report(test.get('case_dev')::uuid, test.get('stroke'), true);
reset role;
select test.ok(
  (select status = 'validado' from public.cases where id = test.get('case_dev')::uuid),
  'el administrador suplente valida la segunda versión'
);

-- Un jefe que no ejecutó sigue validando con normalidad (case_q, ejecutado por tec1).
select test.login('jefe_tec');
set role authenticated;
select public.validate_case_report(test.get('case_q')::uuid, test.get('stroke'), true);
reset role;
select test.ok(
  (select status = 'validado' from public.cases where id = test.get('case_q')::uuid),
  'el jefe que no ejecutó valida el reporte del técnico'
);

\echo 'Todas las pruebas de exclusión del ejecutor pasaron.'
