-- Roles del modelo de negocio aprobado (docs/BUSINESS_RULES.md, sección 4).
--
-- Los valores nuevos se agregan en una migración propia: PostgreSQL no permite usar un
-- valor de enum en la misma transacción en la que se agrega.
--
-- `visualizador` pasa a llamarse `solicitante`. Las filas existentes conservan su rol
-- porque el cambio de nombre no modifica el valor almacenado.

alter type public.app_role rename value 'visualizador' to 'solicitante';
alter type public.app_role add value if not exists 'jefe_area' after 'administrador';
alter type public.app_role add value if not exists 'tecnico' after 'jefe_area';

alter table public.profiles alter column role set default 'solicitante';
