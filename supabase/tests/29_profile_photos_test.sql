-- Pruebas: foto de perfil (docs/BUSINESS_RULES.md, sección 2.4; contrato C-017).
--
-- Usa la Empresa D de la prueba 27 y la Empresa E como empresa ajena.

\set ON_ERROR_STOP 1
\set QUIET 1

create function test.profile_photo_path(user_name text, file_name text, org_key text default 'org_d')
returns text language sql stable
as $$ select test.get(org_key) || '/' || test.uid(user_name) || '/' || file_name $$;

create function test.upload_profile_photo(object_name text)
returns void language sql
as $$
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('profile-photos', object_name, auth.uid(), '{"size": 50000, "mimetype": "image/jpeg"}');
$$;

-- Cuántas fotos de perfil con esa ruta ve la persona autenticada.
create function test.visible_profile_photos(object_name text)
returns bigint language sql stable
as $$ select count(*) from storage.objects where bucket_id = 'profile-photos' and name = object_name $$;

-- Cuántas filas borra la persona autenticada.
create function test.remove_profile_photo(object_name text)
returns integer language plpgsql
as $$
declare
  removed integer;
begin
  delete from storage.objects where bucket_id = 'profile-photos' and name = object_name;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

grant execute on function
  test.profile_photo_path(text, text, text),
  test.upload_profile_photo(text),
  test.visible_profile_photos(text),
  test.remove_profile_photo(text)
to authenticated;

create function test.avatar_of(user_name text)
returns text language sql stable
as $$ select avatar_url from public.profiles where id = test.uid(user_name) $$;

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------

select test.ok(
  (select not public and file_size_limit = 1048576
     and allowed_mime_types = array['image/jpeg', 'image/webp']
   from storage.buckets where id = 'profile-photos'),
  'el bucket de fotos de perfil es privado, de 1 MB y solo JPEG o WebP'
);

-- ---------------------------------------------------------------------------
-- 2. Subir y elegir la foto propia
-- ---------------------------------------------------------------------------

select test.set('photo_1', test.profile_photo_path('tec_a_d', 'foto-1.jpg'));
select test.set('photo_2', test.profile_photo_path('tec_a_d', 'foto-2.jpg'));

select test.login('tec_a_d');
set role authenticated;
select test.upload_profile_photo(test.get('photo_1'));
select public.set_profile_photo(test.get('photo_1'));
reset role;

select test.ok(test.avatar_of('tec_a_d') = test.get('photo_1'),
  'la persona sube una foto a su carpeta y la elige como foto de perfil');

select test.login('tec_a_d');
set role authenticated;
select test.throws(
  format($$update public.profiles set avatar_url = %L where id = %L$$,
         'https://ejemplo.test/foto.jpg', test.uid('tec_a_d')),
  'permission denied',
  'avatar_url ya no se escribe directamente'
);
select test.throws(
  format($$select test.upload_profile_photo(%L)$$, test.profile_photo_path('sol_d', 'ajena.jpg')),
  'row-level security',
  'no se sube una foto a la carpeta de otra persona'
);
select test.throws(
  format($$select test.upload_profile_photo(%L)$$, test.profile_photo_path('tec_a_d', 'x.jpg', 'org_e')),
  'row-level security',
  'no se sube una foto a la carpeta de otra empresa'
);
select test.throws(
  format($$select test.upload_profile_photo(%L)$$, test.profile_photo_path('tec_a_d', 'sub/x.jpg')),
  'row-level security',
  'no se sube una foto a una subcarpeta'
);
select test.throws(
  format($$select public.set_profile_photo(%L)$$, test.profile_photo_path('tec_a_d', 'no-existe.jpg')),
  'No se encontró la foto subida',
  'no se elige una foto que no se subió'
);
select test.throws(
  $$select public.set_profile_photo(null)$$,
  'La foto debe estar en tu carpeta de perfil',
  'no se elige una ruta vacía'
);
reset role;

-- Una foto de otra persona, ya subida.
select test.login('sol_d');
set role authenticated;
select test.upload_profile_photo(test.profile_photo_path('sol_d', 'sol.jpg'));
reset role;

select test.login('tec_a_d');
set role authenticated;
select test.throws(
  format($$select public.set_profile_photo(%L)$$, test.profile_photo_path('sol_d', 'sol.jpg')),
  'La foto debe estar en tu carpeta de perfil',
  'no se elige como propia la foto de otra persona'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Quién la ve
-- ---------------------------------------------------------------------------

select test.login('jefe_t_d');
set role authenticated;
select test.ok(test.visible_profile_photos(test.get('photo_1')) = 1,
  'un miembro de la misma empresa ve la foto vigente');
select test.ok(test.visible_profile_photos(test.profile_photo_path('sol_d', 'sol.jpg')) = 0,
  'una foto subida pero no elegida no la ve nadie más');
reset role;

select test.login('admin_e');
set role authenticated;
select test.ok(test.visible_profile_photos(test.get('photo_1')) = 0,
  'alguien de otra empresa no ve la foto');
select test.ok(test.remove_profile_photo(test.get('photo_1')) = 0,
  'alguien de otra empresa no la borra');
select test.throws(
  format($$select public.set_profile_photo(%L)$$, test.get('photo_1')),
  'La foto debe estar en tu carpeta de perfil',
  'alguien de otra empresa no elige la foto ajena como propia'
);
reset role;

-- Al cambiar de foto, la anterior deja de verse; su dueño todavía la ve y la borra.
select test.login('tec_a_d');
set role authenticated;
select test.upload_profile_photo(test.get('photo_2'));
select public.set_profile_photo(test.get('photo_2'));
reset role;

select test.login('jefe_t_d');
set role authenticated;
select test.ok(
  test.visible_profile_photos(test.get('photo_2')) = 1
    and test.visible_profile_photos(test.get('photo_1')) = 0,
  'al cambiar de foto, los demás ven solo la nueva'
);
select test.ok(test.remove_profile_photo(test.get('photo_2')) = 0,
  'otro miembro de la empresa no borra la foto');
reset role;

select test.login('tec_a_d');
set role authenticated;
select test.ok(test.visible_profile_photos(test.get('photo_1')) = 1,
  'la persona ve las fotos de su carpeta');
select test.ok(test.remove_profile_photo(test.get('photo_1')) = 1,
  'la persona borra una foto de su carpeta');
select public.clear_profile_photo();
reset role;

select test.ok(test.avatar_of('tec_a_d') is null, 'la persona quita su foto de perfil');

select test.login('jefe_t_d');
set role authenticated;
select test.ok(test.visible_profile_photos(test.get('photo_2')) = 0,
  'una foto quitada deja de verse');
reset role;

-- ---------------------------------------------------------------------------
-- 4. Baja y empresa inactiva
-- ---------------------------------------------------------------------------

select test.set('photo_aud', test.profile_photo_path('aud_d', 'aud.jpg'));
select test.login('aud_d');
set role authenticated;
select test.upload_profile_photo(test.get('photo_aud'));
select public.set_profile_photo(test.get('photo_aud'));
reset role;

select test.login('admin_d');
set role authenticated;
select public.deactivate_member(test.uid('aud_d'));
select test.ok(test.visible_profile_photos(test.get('photo_aud')) = 0,
  'la foto de quien se dio de baja deja de verse');
reset role;

select test.ok(test.avatar_of('aud_d') is null, 'la baja quita la foto de perfil');

select test.login('aud_d');
set role authenticated;
select test.throws(
  format($$select public.set_profile_photo(%L)$$, test.get('photo_aud')),
  'Acceso denegado',
  'sin empresa no se elige una foto'
);
reset role;

select test.set('photo_e', test.profile_photo_path('admin_e', 'e.jpg', 'org_e'));
select test.login('admin_e');
set role authenticated;
select test.upload_profile_photo(test.get('photo_e'));
select public.set_profile_photo(test.get('photo_e'));
reset role;

update public.organizations set is_active = false where id = test.get('org_e')::uuid;
select test.login('admin_e');
set role authenticated;
select test.ok(test.visible_profile_photos(test.get('photo_e')) = 0,
  'con la empresa inactiva nadie de la empresa ve la foto');
select test.throws(
  format($$select test.upload_profile_photo(%L)$$, test.profile_photo_path('admin_e', 'e2.jpg', 'org_e')),
  'row-level security',
  'con la empresa inactiva no se suben fotos'
);
select test.throws($$select public.clear_profile_photo()$$, 'Acceso denegado',
  'con la empresa inactiva no se cambia la foto');
reset role;
update public.organizations set is_active = true where id = test.get('org_e')::uuid;

select test.ok(test.avatar_of('admin_e') = test.get('photo_e'),
  'al reactivar la empresa, la foto sigue elegida');

-- ---------------------------------------------------------------------------
-- 5. Permisos de las funciones
-- ---------------------------------------------------------------------------

select test.ok(
  not has_function_privilege('anon', 'public.set_profile_photo(text)', 'execute')
  and not has_function_privilege('anon', 'public.clear_profile_photo()', 'execute')
  and not has_function_privilege('anon', 'private.is_own_profile_photo_path(text)', 'execute')
  and not has_function_privilege('anon', 'private.can_read_profile_photo_object(text)', 'execute')
  and not has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'update'),
  'anon no ejecuta las funciones de foto y authenticated no escribe avatar_url'
);

\echo 'Todas las pruebas de foto de perfil pasaron.'
