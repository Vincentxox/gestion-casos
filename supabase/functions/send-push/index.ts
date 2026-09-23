// Edge Function `send-push` (T-905; docs/BUSINESS_RULES.md, sección 9).
//
// La ejecuta una tarea programada (pg_cron + pg_net) cada minuto con la cabecera
// `x-cron-secret`. Toma los avisos pendientes con `claim_pending_push` (que los marca
// como tomados para no duplicar envíos), los envía con el servicio de push de Expo,
// borra los tokens que Expo informa como inexistentes y guarda el error de los avisos
// que no llegaron a ningún teléfono. Se despliega sin verificación de JWT
// (`--no-verify-jwt`): la autorización es el secreto compartido.
import { json, serviceClient } from '../_shared/clients.ts'
import {
  EXPO_PUSH_URL,
  buildMessages,
  chunk,
  interpretTickets,
  safeEqual,
  type ExpoTicket,
  type PendingNotification,
  type PushToken,
} from '../_shared/push.ts'

const BATCH_SIZE = 200

Deno.serve(async (request) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || !safeEqual(request.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'No autorizado' }, 401)
  }

  const service = serviceClient()
  try {
    const { data: claimed, error: claimError } = await service.rpc('claim_pending_push', {
      batch_size: BATCH_SIZE,
    })
    if (claimError) throw claimError
    const notifications = (claimed ?? []) as PendingNotification[]
    if (notifications.length === 0) return json({ claimed: 0, sent: 0 })

    const recipients = [...new Set(notifications.map((item) => item.recipient_id))]
    const { data: tokens, error: tokensError } = await service
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', recipients)
    if (tokensError) throw tokensError

    const { messages, withoutDevice } = buildMessages(notifications, (tokens ?? []) as PushToken[])
    const tickets: ExpoTicket[] = []
    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN')
    for (const batch of chunk(messages)) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(batch),
        })
        const payload = await response.json().catch(() => ({}))
        const data = Array.isArray(payload?.data) ? (payload.data as ExpoTicket[]) : []
        // Si Expo rechaza el lote completo, cada mensaje queda con ese error.
        const fallback: ExpoTicket = {
          status: 'error',
          message: String(payload?.errors?.[0]?.message ?? `HTTP ${response.status}`),
          details: { error: String(payload?.errors?.[0]?.code ?? 'ErrorDeEnvio') },
        }
        batch.forEach((_, index) => tickets.push(data[index] ?? fallback))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'sin conexión'
        batch.forEach(() =>
          tickets.push({ status: 'error', message, details: { error: 'ErrorDeRed' } }),
        )
      }
    }

    const { invalidTokens, failures } = interpretTickets(messages, tickets)
    if (invalidTokens.length > 0) {
      await service.from('push_tokens').delete().in('token', invalidTokens)
    }
    if (withoutDevice.length > 0) {
      await service
        .from('notifications')
        .update({ push_error: 'sin_dispositivo' })
        .in('id', withoutDevice)
    }
    for (const [id, error] of failures) {
      await service.from('notifications').update({ push_error: error }).eq('id', id)
    }

    return json({
      claimed: notifications.length,
      sent: tickets.filter((ticket) => ticket.status === 'ok').length,
      withoutDevice: withoutDevice.length,
      failed: failures.size,
      removedTokens: invalidTokens.length,
    })
  } catch (error) {
    console.error('send-push', error instanceof Error ? error.message : error)
    return json({ error: 'No fue posible enviar los avisos' }, 500)
  }
})
