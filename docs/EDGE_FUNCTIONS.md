# Edge Functions de Nexo Casos

Funciones del servidor para el reporte, los avisos push y la limpieza de fotos (T-904 y
T-905). Viven en `supabase/functions/` y corren en Deno dentro de Supabase. Ninguna
clave de servidor llega a la app: `SUPABASE_SERVICE_ROLE_KEY` solo existe en el entorno
de las funciones.

| Función               | Quién la llama                    | JWT    | Qué hace                                                                 |
| --------------------- | --------------------------------- | ------ | ------------------------------------------------------------------------ |
| `generate-report-pdf` | La app, con la sesión del usuario | Sí     | Genera una vez el PDF de un caso aprobado y devuelve un enlace de 5 min. |
| `send-push`           | Tarea programada, cada minuto     | No (*) | Envía los avisos pendientes con Expo Push.                               |
| `cleanup-photos`      | Tarea programada, cada hora       | No (*) | Borra reservas de fotos sin confirmar de más de 24 horas.                |

(*) Se autorizan con la cabecera `x-cron-secret`, comparada con el secreto `CRON_SECRET`.

## Contrato de `generate-report-pdf`

```ts
const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
  body: { caseId },
})
// data: { url: string; sha256: string; generatedAt: string }
```

- 401 sin sesión, 404 si la persona no ve la solicitud, 409 si la solicitud no está
  aprobada, 500 si falla la generación. Los errores traen `{ error: string }` en español.
- La primera llamada genera y guarda el PDF; las siguientes solo firman un enlace nuevo.
- El PDF incluye los datos congelados de la versión firmada, las miniaturas de las fotos
  (las originales siguen en Storage), las tres firmas con su trazo y una hoja de
  evidencia con firmantes, IP, dispositivo, hashes y el historial.

## Despliegue (requiere autorización del responsable)

1. Aplicar antes la migración `20260923110000_create_push_dispatch.sql`.
2. Definir los secretos de las funciones (panel de Supabase → Edge Functions → Secrets):
   - `CRON_SECRET`: un valor aleatorio largo. No se guarda en el repositorio.
   - `EXPO_ACCESS_TOKEN` (opcional): solo si se activa la seguridad reforzada de push en
     Expo.
3. Desplegar:

   ```bash
   supabase functions deploy generate-report-pdf
   supabase functions deploy send-push --no-verify-jwt
   supabase functions deploy cleanup-photos --no-verify-jwt
   ```

## Tareas programadas

Requieren las extensiones `pg_cron` y `pg_net`. La URL del proyecto y el secreto se
guardan en Vault desde el SQL editor, sin escribirlos en migraciones ni documentos:

```sql
select vault.create_secret('https://<proyecto>.supabase.co', 'project_url');
select vault.create_secret('<el mismo valor de CRON_SECRET>', 'cron_secret');

select cron.schedule('nexo-send-push', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);

select cron.schedule('nexo-cleanup-photos', '17 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/cleanup-photos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);
```

## Pruebas

- Lógica compartida (texto del PDF, trazos, lotes y tickets de push):
  `node --experimental-strip-types --test supabase/functions/tests/*_test.ts`.
- Tipos de las funciones: `deno check supabase/functions/<función>/index.ts` (paso
  «Edge Functions» del CI).
- Las funciones de apoyo en SQL se prueban en `supabase/tests/17_push_dispatch_test.sql`.

## Limitaciones conocidas del MVP

- `send-push` no consulta los recibos de Expo (entrega final al teléfono); solo los
  tickets de envío.
- Si Supabase no tiene `SUPABASE_ANON_KEY` (proyectos solo con claves nuevas), cambiar
  `userClient` a la clave publicable.
