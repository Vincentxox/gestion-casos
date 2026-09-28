// Edge Function `send-push` (T-905; docs/BUSINESS_RULES.md, sección 9).
//
// La ejecuta una tarea programada (pg_cron + pg_net) cada minuto con la cabecera
// `x-cron-secret`. Reclama avisos con `claim_pending_push` (reclamo de 5 minutos, sin
// marcarlos como enviados), los envía con el servicio de push de Expo y después:
// `complete_push` para los enviados y los errores permanentes (con su motivo) y
// `release_push` para los fallos transitorios, que se reintentan hasta 5 veces. Si la
// función falla a mitad, el reclamo vence y otra ejecución los retoma. Borra los tokens
// que Expo informa como inexistentes. Se despliega sin verificación de JWT
// (`--no-verify-jwt`): la autorización es el secreto compartido.
import { json, serviceClient } from '../_shared/clients.ts'
import {
  EXPO_PUSH_URL,
  buildMessages,
  chunk,
  classifyTickets,
  groupByError,
  safeEqual,
  type ExpoMessage,
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

    // Si esta consulta falla, los avisos quedan reclamados y se retoman al vencer el reclamo.
    const recipients = [...new Set(notifications.map((item) => item.recipient_id))]
    const { data: tokens, error: tokensError } = await service
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', recipients)
    if (tokensError) throw tokensError

    const { messages, withoutDevice } = buildMessages(notifications, (tokens ?? []) as PushToken[])
    const tickets = await sendToExpo(messages)
    const outcome = classifyTickets(messages, tickets)

    if (outcome.invalidTokens.length > 0) {
      await service.from('push_tokens').delete().in('token', outcome.invalidTokens)
    }

    const calls: Array<PromiseLike<{ error: unknown }>> = []
    if (outcome.sent.length > 0) {
      calls.push(service.rpc('complete_push', { notification_ids: outcome.sent }))
    }
    if (withoutDevice.length > 0) {
      calls.push(
        service.rpc('complete_push', {
          notification_ids: withoutDevice,
          error_message: 'sin_dispositivo',
        }),
      )
    }
    for (const [error, ids] of groupByError(outcome.permanent)) {
      calls.push(service.rpc('complete_push', { notification_ids: ids, error_message: error }))
    }
    for (const [error, ids] of groupByError(outcome.transient)) {
      calls.push(service.rpc('release_push', { notification_ids: ids, error_message: error }))
    }
    for (const result of await Promise.all(calls)) {
      if (result.error) throw result.error
    }

    return json({
      claimed: notifications.length,
      sent: outcome.sent.length,
      withoutDevice: withoutDevice.length,
      failedPermanently: outcome.permanent.size,
      retrying: outcome.transient.size,
      removedTokens: outcome.invalidTokens.length,
    })
  } catch (error) {
    console.error('send-push', error instanceof Error ? error.message : error)
    return json({ error: 'No fue posible enviar los avisos' }, 500)
  }
})

// Envía en lotes de 100. Un lote rechazado o sin conexión deja a cada mensaje con ese
// error, que `classifyTickets` trata como transitorio.
async function sendToExpo(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
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
  return tickets
}
