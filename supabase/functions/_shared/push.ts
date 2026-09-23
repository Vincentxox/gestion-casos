// Lógica pura del envío de avisos push con el servicio de Expo (sin dependencias).

export interface PendingNotification {
  id: number
  recipient_id: string
  case_id: string
  title: string
  body: string
  push_attempts?: number
}

export interface PushToken {
  token: string
  user_id: string
}

export interface ExpoMessage {
  to: string
  title: string
  body: string
  sound: 'default'
  data: { caseId: string; notificationId: number }
}

export interface ExpoTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
export const EXPO_BATCH_SIZE = 100

// Un mensaje por cada teléfono del destinatario; recuerda a qué aviso pertenece.
export function buildMessages(
  notifications: PendingNotification[],
  tokens: PushToken[],
): { messages: ExpoMessage[]; owners: number[]; withoutDevice: number[] } {
  const byUser = new Map<string, string[]>()
  for (const { token, user_id } of tokens) {
    byUser.set(user_id, [...(byUser.get(user_id) ?? []), token])
  }
  const messages: ExpoMessage[] = []
  const owners: number[] = []
  const withoutDevice: number[] = []
  for (const notification of notifications) {
    const userTokens = byUser.get(notification.recipient_id) ?? []
    if (userTokens.length === 0) {
      withoutDevice.push(notification.id)
      continue
    }
    for (const to of userTokens) {
      messages.push({
        to,
        title: notification.title.slice(0, 120),
        body: notification.body.slice(0, 240),
        sound: 'default',
        data: { caseId: notification.case_id, notificationId: notification.id },
      })
      owners.push(notification.id)
    }
  }
  return { messages, owners, withoutDevice }
}

export function chunk<T>(items: T[], size = EXPO_BATCH_SIZE): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

// Errores de Expo que no se arreglan reintentando: el aviso se cierra con su motivo.
// Cualquier otro (red, límite de envío, error del servicio o sin respuesta) se reintenta
// hasta agotar los intentos (`release_push`).
export const PERMANENT_PUSH_ERRORS = new Set([
  'DeviceNotRegistered',
  'MessageTooBig',
  'InvalidCredentials',
  'MismatchSenderId',
])

export interface PushOutcome {
  sent: number[]
  permanent: Map<number, string>
  transient: Map<number, string>
  invalidTokens: string[]
}

// Clasifica cada aviso según los tickets de Expo (en el mismo orden que los mensajes):
// enviado si al menos uno de sus teléfonos respondió `ok`; si no, error permanente
// cuando todos sus errores son permanentes, o transitorio en otro caso.
export function classifyTickets(messages: ExpoMessage[], tickets: ExpoTicket[]): PushOutcome {
  const invalidTokens: string[] = []
  const delivered = new Set<number>()
  const firstError = new Map<number, string>()
  const onlyPermanent = new Map<number, boolean>()
  messages.forEach((message, index) => {
    const notificationId = message.data.notificationId
    const ticket = tickets[index]
    if (ticket?.status === 'ok') {
      delivered.add(notificationId)
      return
    }
    const code = ticket?.details?.error ?? (ticket ? 'error' : 'sin_respuesta')
    if (code === 'DeviceNotRegistered') invalidTokens.push(message.to)
    if (!firstError.has(notificationId)) {
      firstError.set(
        notificationId,
        `${code}${ticket?.message ? `: ${ticket.message}` : ''}`.slice(0, 300),
      )
    }
    onlyPermanent.set(
      notificationId,
      (onlyPermanent.get(notificationId) ?? true) && PERMANENT_PUSH_ERRORS.has(code),
    )
  })
  const permanent = new Map<number, string>()
  const transient = new Map<number, string>()
  for (const [notificationId, error] of firstError) {
    if (delivered.has(notificationId)) continue
    if (onlyPermanent.get(notificationId)) permanent.set(notificationId, error)
    else transient.set(notificationId, error)
  }
  return { sent: [...delivered], permanent, transient, invalidTokens }
}

// Agrupa avisos por mensaje de error para actualizar en pocas llamadas.
export function groupByError(failures: Map<number, string>): Map<string, number[]> {
  const groups = new Map<string, number[]>()
  for (const [id, error] of failures) groups.set(error, [...(groups.get(error) ?? []), id])
  return groups
}

// Comparación de secretos en tiempo constante.
export function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}
