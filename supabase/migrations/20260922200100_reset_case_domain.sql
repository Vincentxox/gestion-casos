-- Retira el modelo de casos anterior para implementar el flujo de solicitudes aprobado
-- (docs/BUSINESS_RULES.md, sección 5).
--
-- El responsable del proyecto aprobó el 22/09/2026 descartar los casos y el historial
-- existentes. Los usuarios, perfiles, áreas y categorías se conservan y se migran en las
-- migraciones siguientes.

drop function if exists public.change_case_status(uuid, public.case_status, text);
drop table if exists public.case_status_history;
drop table if exists public.cases;
drop function if exists private.record_case_status();
drop type if exists public.case_status;

-- Estas RPC se reemplazan por `public.set_member_access`, que valida la empresa.
drop function if exists public.set_user_role(uuid, public.app_role);
drop function if exists public.set_user_area(uuid, uuid);
