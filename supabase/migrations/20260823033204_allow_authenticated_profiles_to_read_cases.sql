-- Every signed-in application user has cases.read in the mobile permission map.
-- Keep RLS as the authorization boundary and require a server-managed profile
-- with one of the supported roles before exposing any case rows.
drop policy if exists "Authorized users can read cases" on public.cases;

create policy "Application users can read cases"
on public.cases
for select
to authenticated
using (
  (select private.has_role('administrador'))
  or (select private.has_role('auditor'))
  or (select private.has_role('visualizador'))
);
