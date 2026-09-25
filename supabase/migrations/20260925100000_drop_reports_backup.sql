-- Limpieza: borra la tabla de respaldo temporal que se creó a mano en el remoto
-- (23/09/2026), antes de aplicar las migraciones de reportes. Esas migraciones ya
-- están aplicadas y verificadas, así que el respaldo no se necesita. Guardaba una copia
-- de datos y no la usa ningún objeto. `if exists`: la tabla no existe en instalaciones
-- nuevas ni en el entorno local.
drop table if exists private.backup_before_reports_20260923;
