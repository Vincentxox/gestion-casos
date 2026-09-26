// Ejecutar con: node --experimental-strip-types --test supabase/functions/tests/
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildMessages, chunk, classifyTickets, groupByError, safeEqual } from '../_shared/push.ts'

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

test('classifyTickets separa enviados, errores permanentes y transitorios', () => {
  const { messages } = buildMessages(notifications, tokens)
  const outcome = classifyTickets(messages, [
    { status: 'error', message: 'no existe', details: { error: 'DeviceNotRegistered' } },
    { status: 'ok', id: 't2' },
    { status: 'error', details: { error: 'MessageRateExceeded' } },
  ])
  assert.deepEqual(outcome.invalidTokens, ['ExponentPushToken[a]'])
  // El aviso 1 llegó a su segundo teléfono: cuenta como enviado.
  assert.deepEqual(outcome.sent, [1])
  assert.deepEqual([...outcome.permanent.entries()], [])
  assert.deepEqual([...outcome.transient.entries()], [[2, 'MessageRateExceeded']])
})

test('un aviso cuyos teléfonos no existen se cierra como error permanente', () => {
  const { messages } = buildMessages(notifications.slice(1, 2), tokens)
  const outcome = classifyTickets(messages, [
    { status: 'error', message: 'no existe', details: { error: 'DeviceNotRegistered' } },
  ])
  assert.deepEqual([...outcome.permanent.entries()], [[2, 'DeviceNotRegistered: no existe']])
  assert.equal(outcome.transient.size, 0)
})

test('sin respuesta o con error de red, el aviso se reintenta', () => {
  const { messages } = buildMessages(notifications, tokens)
  const outcome = classifyTickets(messages, [
    { status: 'error', message: 'timeout', details: { error: 'ErrorDeRed' } },
  ])
  assert.deepEqual(outcome.sent, [])
  assert.deepEqual([...outcome.transient.keys()].sort(), [1, 2])
  assert.equal(outcome.transient.get(2), 'sin_respuesta')
})

test('groupByError agrupa los avisos por motivo', () => {
  const groups = groupByError(
    new Map([
      [1, 'ErrorDeRed'],
      [2, 'MessageRateExceeded'],
      [3, 'ErrorDeRed'],
    ]),
  )
  assert.deepEqual(
    [...groups.entries()],
    [
      ['ErrorDeRed', [1, 3]],
      ['MessageRateExceeded', [2]],
    ],
  )
})

test('safeEqual compara secretos sin cortar antes de tiempo', () => {
  assert.equal(safeEqual('secreto-largo', 'secreto-largo'), true)
  assert.equal(safeEqual('secreto-largo', 'secreto-larga'), false)
  assert.equal(safeEqual('corto', 'corto-mas'), false)
})
