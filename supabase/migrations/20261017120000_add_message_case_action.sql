-- Mensajes dentro del caso (docs/BUSINESS_RULES.md, sección 5.7), parte 1 de 2.
--
-- Un mensaje se guarda como un evento del caso con la acción `mensaje`. PostgreSQL no deja
-- usar un valor nuevo de un enum en la misma transacción que lo agrega, así que el valor va
-- en esta migración y lo que lo usa en `20261017120100_case_messages.sql`.

alter type public.case_action add value if not exists 'mensaje';
