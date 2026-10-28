-- Aviso de rendimiento de Supabase (unindexed foreign keys): priority_targets.updated_by
-- referencia a profiles sin índice. Al borrar un perfil, PostgreSQL recorre toda la tabla
-- para aplicar `on delete set null`. Es la única clave foránea de public sin índice.

create index priority_targets_updated_by_idx on public.priority_targets (updated_by);
