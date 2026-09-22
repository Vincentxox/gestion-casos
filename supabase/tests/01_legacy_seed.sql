-- Datos equivalentes al estado previo del proyecto remoto (antes del nuevo modelo).

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@a.test', now(), '{"full_name":"Ana Admin"}'),
  ('00000000-0000-0000-0000-00000000a002', 'visual@a.test', now(), '{"full_name":"Vera Visual"}'),
  ('00000000-0000-0000-0000-00000000a003', 'auditor@a.test', now(), '{"full_name":"Aldo Auditor"}');

update public.profiles set role = 'administrador' where id = '00000000-0000-0000-0000-00000000a001';
update public.profiles set role = 'auditor' where id = '00000000-0000-0000-0000-00000000a003';
-- El trigger anterior exige que un administrador cambie el área.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
update public.profiles
set area_id = (select id from public.areas where name = 'Administración')
where id = '00000000-0000-0000-0000-00000000a002';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
insert into public.cases (title, description, category, location, priority, created_by)
values ('Caso heredado', 'Caso creado con el modelo anterior', 'Electricidad', 'Oficina 1', 'media',
        '00000000-0000-0000-0000-00000000a001');
select set_config('request.jwt.claim.sub', '', false);
