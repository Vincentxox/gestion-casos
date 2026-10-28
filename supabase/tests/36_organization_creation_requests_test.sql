-- Pruebas: solicitar una empresa nueva desde la app (contrato C-025). Se ejecutan después de 35.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Todo el archivo corre en una transacción que se revierte.
begin;

select test.register('pide_f', 'pide.f@f.test', 'Fabiola Pide Empresa');
select test.register('pide_g', 'pide.g@g.test', 'Gonzalo Pide Empresa');
select test.register('sin_confirmar', 'sin.confirmar@h.test', 'Hugo Sin Confirmar', false);
select test.register('plataforma', 'plataforma@nexo.test', 'Vera Plataforma');
insert into private.platform_admins (user_id) values (test.uid('plataforma'));

-- ---------------------------------------------------------------------------
-- 1. Pedir la empresa
-- ---------------------------------------------------------------------------

select test.login('');
set role authenticated;
select test.throws(
  $$select public.request_organization_creation('Empresa F', null, '1-5', null)$$,
  'Acceso denegado',
  'sin sesión no se pide una empresa'
);
reset role;

select test.set('member', (
  select users.name from test.users users
  join public.profiles p on p.id = users.id
  where p.organization_id is not null
  order by users.name
  limit 1
));
select test.login(test.get('member'));
set role authenticated;
select test.throws(
  $$select public.request_organization_creation('Otra empresa', null, '1-5', null)$$,
  'Tu cuenta ya pertenece a una empresa',
  'quien ya tiene empresa no pide otra'
);
reset role;

select test.login('sin_confirmar');
set role authenticated;
select test.throws(
  $$select public.request_organization_creation('Empresa H', null, '1-5', null)$$,
  'Confirma tu correo',
  'sin correo verificado no se pide una empresa'
);
reset role;

select test.login('pide_f');
set role authenticated;
select public.request_organization_creation(
  '  Ferretería Fénix  ', ' +502 5555 0000 ', '6-25', 'Somos un equipo de mantenimiento'
) as request_f \gset
select test.throws(
  $$select public.request_organization_creation('Ferretería Fénix 2', null, '1-5', null)$$,
  'Ya tienes una solicitud pendiente',
  'una sola solicitud pendiente por persona'
);
select test.throws(
  $$select public.request_organization_creation('Fénix', null, '1000', null)$$,
  'Ya tienes una solicitud pendiente',
  'la pendiente se comprueba antes que los datos'
);
select test.ok(
  (select status = 'pendiente' and organization_name = 'Ferretería Fénix'
   from public.my_organization_creation_request()),
  'la persona ve su solicitud pendiente con el nombre limpio'
);
select test.throws(
  'select count(*) from public.organization_creation_requests',
  'permission denied',
  'la tabla no se lee directamente'
);
select test.throws(
  $$select * from public.list_organization_creation_requests(null)$$,
  'Acceso denegado',
  'quien pide no lista las solicitudes'
);
select test.throws(
  format($$select public.review_organization_creation_request(%L, true, null)$$, :'request_f'),
  'Acceso denegado',
  'quien pide no aprueba su propia solicitud'
);
select test.ok(not public.is_platform_admin(), 'quien pide no es administrador de plataforma');
reset role;

select test.ok(
  (select email = 'pide.f@f.test' and contact_phone = '+502 5555 0000' and team_size = '6-25'
   from public.organization_creation_requests where id = :'request_f'::uuid),
  'el servidor guarda el correo de la cuenta y limpia el teléfono'
);

-- Un administrador de empresa tampoco es administrador de plataforma.
select test.login('admin_b');
set role authenticated;
select test.throws(
  $$select * from public.list_organization_creation_requests('pendiente')$$,
  'Acceso denegado',
  'un administrador de empresa no lista las solicitudes'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. Cancelar y volver a pedir
-- ---------------------------------------------------------------------------

select test.login('pide_g');
set role authenticated;
select test.throws(
  'select public.cancel_organization_creation_request()',
  'No tienes una solicitud pendiente',
  'no se cancela lo que no existe'
);
select public.request_organization_creation('Gimnasio Gala', null, '1-5', null) as request_g1 \gset
select public.cancel_organization_creation_request();
select test.ok(
  (select status = 'cancelada' from public.my_organization_creation_request()),
  'la persona cancela su solicitud'
);
select public.request_organization_creation('Gimnasio Gala', null, '26-75', null) as request_g \gset
reset role;

-- ---------------------------------------------------------------------------
-- 3. Revisar
-- ---------------------------------------------------------------------------

-- En la transacción de la prueba todas tienen la misma hora; F y la cancelada de G se
-- pidieron antes.
update public.organization_creation_requests
set created_at = created_at - interval '1 hour'
where id in (:'request_f'::uuid, :'request_g1'::uuid);

select test.login('plataforma');
set role authenticated;
select test.ok(public.is_platform_admin(), 'el administrador de plataforma se reconoce');
select test.ok(
  (select count(*) = 2 and bool_and(status = 'pendiente')
   from public.list_organization_creation_requests('pendiente')),
  'lista las dos pendientes'
);
select test.ok(
  (select requester_name from public.list_organization_creation_requests('pendiente') limit 1)
    = 'Fabiola Pide Empresa',
  'la más antigua va primero y muestra quién la pidió'
);
select test.throws(
  format($$select public.review_organization_creation_request(%L, false, '  ')$$, :'request_g'),
  'Escribe el motivo del rechazo',
  'rechazar exige un motivo'
);
select public.review_organization_creation_request(
  :'request_g', false, 'No encontramos la empresa'
) is null as rejected \gset
select test.ok(:'rejected', 'rechazar no crea empresa');
select test.throws(
  format($$select public.review_organization_creation_request(%L, true, null)$$, :'request_g'),
  'La solicitud ya no está pendiente',
  'una solicitud revisada no se revisa otra vez'
);

select public.review_organization_creation_request(:'request_f', true, null) as org_f \gset
reset role;

select test.ok(
  (select name = 'Ferretería Fénix' and is_active from public.organizations where id = :'org_f'::uuid),
  'aprobar crea la empresa con el nombre pedido'
);
select test.ok(
  (select organization_id = :'org_f'::uuid and role = 'administrador'
   from public.profiles where id = test.uid('pide_f')),
  'quien la pidió queda como administrador de la empresa nueva'
);
select test.ok(
  exists (select 1 from public.organization_invitations
          where organization_id = :'org_f'::uuid and email = 'pide.f@f.test'
            and role = 'administrador' and accepted_by = test.uid('pide_f')),
  'la invitación de administrador queda aceptada'
);

select test.login('pide_f');
set role authenticated;
select test.ok(
  (select status = 'aprobada' from public.my_organization_creation_request()),
  'la persona ve su solicitud aprobada'
);
reset role;

select test.login('pide_g');
set role authenticated;
select test.ok(
  (select status = 'rechazada' and rejection_reason = 'No encontramos la empresa'
   from public.my_organization_creation_request()),
  'la persona ve el motivo del rechazo'
);
select public.request_organization_creation('Gimnasio Gala Centro', null, '1-5', null) as request_g2 \gset
reset role;

-- Si la persona entra a otra empresa antes de la revisión, no se crea la nueva.
select test.login('');
insert into public.organization_invitations (organization_id, email, role)
values (:'org_f'::uuid, 'pide.g@g.test', 'solicitante');
select test.ok(
  (select organization_id = :'org_f'::uuid from public.profiles where id = test.uid('pide_g')),
  'la persona entra a otra empresa por invitación'
);
select test.login('plataforma');
set role authenticated;
select test.throws(
  format($$select public.review_organization_creation_request(%L, true, null)$$, :'request_g2'),
  'Esta persona ya pertenece a una empresa',
  'no se aprueba para quien ya tiene empresa'
);
select test.ok(
  (select count(*) = 1 from public.list_organization_creation_requests('aprobada')),
  'lista las aprobadas'
);
reset role;

-- ---------------------------------------------------------------------------
-- 4. Eliminar la cuenta borra sus solicitudes (C-024)
-- ---------------------------------------------------------------------------

select test.register('pide_k', 'pide.k@k.test', 'Karla Pide Empresa');
select test.login('pide_k');
set role authenticated;
select public.request_organization_creation('Kiosco Kala', '5555', '1-5', 'Hola') as request_k \gset
select public.prepare_account_deletion();
reset role;
select test.ok(
  not exists (select 1 from public.organization_creation_requests where user_id = test.uid('pide_k')),
  'al eliminar la cuenta se borran sus solicitudes de empresa'
);

-- ---------------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------------

select test.ok(
  not has_function_privilege('anon', 'public.request_organization_creation(text, text, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.cancel_organization_creation_request()', 'execute')
  and not has_function_privilege('anon', 'public.my_organization_creation_request()', 'execute')
  and not has_function_privilege('anon', 'public.is_platform_admin()', 'execute')
  and not has_function_privilege('anon', 'public.list_organization_creation_requests(text)', 'execute')
  and not has_function_privilege('anon', 'public.review_organization_creation_request(uuid, boolean, text)', 'execute'),
  'anon no ejecuta ninguna función de solicitudes de empresa'
);
select test.ok(
  not has_table_privilege('authenticated', 'private.platform_admins', 'select')
  and not has_table_privilege('authenticated', 'private.platform_admins', 'insert'),
  'nadie se agrega como administrador de plataforma desde la app'
);

rollback;

\echo 'Todas las pruebas de solicitudes de empresa pasaron'
