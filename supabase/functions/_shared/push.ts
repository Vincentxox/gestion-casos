// Lógica pura del envío de avisos push con el servicio de Expo (sin dependencias).

export interface PendingNotification {
  id: number
  recipient_id: string
  case_id: string
  title: string
  body: string
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

// Interpreta los tickets de Expo (en el mismo orden que los mensajes enviados): tokens
// que ya no existen y el primer error de cada aviso. Un aviso cuenta como entregado si
// al menos uno de sus teléfonos respondió `ok`.
export function interpretTickets(
  messages: ExpoMessage[],
  tickets: ExpoTicket[],
): { invalidTokens: string[]; failures: Map<number, string> } {
  const invalidTokens: string[] = []
  const errors = new Map<number, string>()
  const delivered = new Set<number>()
  messages.forEach((message, index) => {
    const notificationId = message.data.notificationId
    const ticket = tickets[index]
    if (ticket?.status === 'ok') {
      delivered.add(notificationId)
      return
    }
    const code = ticket?.details?.error ?? (ticket ? 'error' : 'sin_respuesta')
    if (code === 'DeviceNotRegistered') invalidTokens.push(message.to)
    if (!errors.has(notificationId)) {
      errors.set(
        notificationId,
        `${code}${ticket?.message ? `: ${ticket.message}` : ''}`.slice(0, 300),
      )
    }
  })
  const failures = new Map<number, string>()
  for (const [notificationId, error] of errors) {
    if (!delivered.has(notificationId)) failures.set(notificationId, error)
  }
  return { invalidTokens, failures }
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
