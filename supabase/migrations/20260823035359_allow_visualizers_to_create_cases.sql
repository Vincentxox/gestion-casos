-- Visualizers can register new cases, but they can only claim ownership for
-- themselves. Auditors remain read-only and all update/assignment policies
-- continue to be restricted to administrators.
drop policy if exists "Administrators can create cases" on public.cases;

create policy "Administrators and visualizers can create cases"
on public.cases
for insert
to authenticated
with check (
  (
    (select private.is_admin())
    or (select private.has_role('visualizador'))
  )
  and created_by = (select auth.uid())
);
