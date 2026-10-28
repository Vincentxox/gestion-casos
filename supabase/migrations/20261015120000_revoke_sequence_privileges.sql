-- T-601: las secuencias de public heredaron de Supabase todos los permisos para anon y
-- authenticated (USAGE, SELECT y UPDATE). Con UPDATE, un rol puede reiniciar la secuencia
-- con setval() y hacer fallar las inserciones siguientes por id duplicado.
-- Los eventos y avisos se insertan solo desde funciones SECURITY DEFINER, así que los
-- usuarios no necesitan ningún permiso sobre estas secuencias.

revoke all on sequence public.case_events_id_seq from anon, authenticated;
revoke all on sequence public.notifications_id_seq from anon, authenticated;
