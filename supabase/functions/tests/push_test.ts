// Ejecutar con: node --experimental-strip-types --test supabase/functions/tests/
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildMessages, chunk, interpretTickets, safeEqual } from '../_shared/push.ts'

const notifications = [
  { id: 1, recipient_id: 'u1', case_id: 'c1', title: 'Nueva solicitud', body: 'CAS-1' },
  { id: 2, recipient_id: 'u2', case_id: 'c1', title: 'Te asignaron un trabajo', body: 'CAS-1' },
  { id: 3, recipient_id: 'u3', case_id: 'c2', title: 'Reporte por validar', body: 'CAS-2' },
]
const tokens = [
  { token: 'ExponentPushToken[a]', user_id: 'u1' },
  { token: 'ExponentPushToken[b]', user_id: 'u1' },
  { token: 'ExponentPushToken[c]', user_id: 'u2' },
]

test('buildMessages crea un mensaje por teléfono y separa los avisos sin dispositivo', () => {
  const { messages, owners, withoutDevice } = buildMessages(notifications, tokens)
  assert.equal(messages.length, 3)
  assert.deepEqual(owners, [1, 1, 2])
  assert.deepEqual(withoutDevice, [3])
  assert.deepEqual(messages[2]?.data, { caseId: 'c1', notificationId: 2 })
})

test('chunk divide en lotes del tamaño indicado', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.equal(chunk(Array.from({ length: 250 }, (_, i) => i)).length, 3)
})

test('interpretTickets detecta tokens inválidos y avisos sin ningún envío correcto', () => {
  const { messages } = buildMessages(notifications, tokens)
  const { invalidTokens, failures } = interpretTickets(messages, [
    { status: 'error', message: 'no existe', details: { error: 'DeviceNotRegistered' } },
    { status: 'ok', id: 't2' },
    { status: 'error', details: { error: 'MessageRateExceeded' } },
  ])
  assert.deepEqual(invalidTokens, ['ExponentPushToken[a]'])
  // El aviso 1 llegó a su segundo teléfono: no cuenta como fallido.
  assert.deepEqual([...failures.entries()], [[2, 'MessageRateExceeded']])
})

test('interpretTickets marca como fallidos los mensajes sin respuesta', () => {
  const { messages } = buildMessages(notifications.slice(1, 2), tokens)
  const { failures } = interpretTickets(messages, [])
  assert.deepEqual([...failures.entries()], [[2, 'sin_respuesta']])
})

test('safeEqual compara secretos sin cortar antes de tiempo', () => {
  assert.equal(safeEqual('secreto-largo', 'secreto-largo'), true)
  assert.equal(safeEqual('secreto-largo', 'secreto-larga'), false)
  assert.equal(safeEqual('corto', 'corto-mas'), false)
})
