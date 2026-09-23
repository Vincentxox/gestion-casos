// Ejecutar con: node --experimental-strip-types --test supabase/functions/tests/
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  describeUsage,
  fitStroke,
  formatDateTime,
  svgPathBounds,
  toWinAnsi,
  verificationCode,
  wrapText,
} from '../_shared/pdfText.ts'

test('toWinAnsi conserva el español y reemplaza lo que la fuente no dibuja', () => {
  assert.equal(toWinAnsi('Niño ¿qué pasó? ¡Año 2026! €'), 'Niño ¿qué pasó? ¡Año 2026! €')
  assert.equal(toWinAnsi('Firma 😀 中文'), 'Firma ? ??')
  assert.equal(toWinAnsi('a\tb\r\nc\u0007'), 'a b\nc')
  assert.equal(toWinAnsi(null), '')
})

test('wrapText corta por palabras y parte las palabras demasiado largas', () => {
  const measure = (value: string) => value.length
  assert.deepEqual(wrapText('uno dos tres cuatro', 8, measure), ['uno dos', 'tres', 'cuatro'])
  assert.deepEqual(wrapText('abcdefghij', 4, measure), ['abcd', 'efgh', 'ij'])
  assert.deepEqual(wrapText('a\n\nb', 10, measure), ['a', '', 'b'])
})

test('svgPathBounds recorre comandos absolutos, relativos y L implícitos', () => {
  assert.deepEqual(svgPathBounds('M 10 10 L 200 120 Q 250 160 300 100 C 320 90 360 140 420 180'), {
    minX: 10,
    minY: 10,
    maxX: 420,
    maxY: 180,
  })
  assert.deepEqual(svgPathBounds('m 100 100 l 50 -20 20 30 z'), {
    minX: 100,
    minY: 80,
    maxX: 170,
    maxY: 110,
  })
  assert.deepEqual(svgPathBounds('M 5 5 10 20'), { minX: 5, minY: 5, maxX: 10, maxY: 20 })
  assert.equal(svgPathBounds(''), null)
})

test('fitStroke centra el trazo dentro de la caja respetando la proporción', () => {
  const placement = fitStroke(
    { minX: 0, minY: 0, maxX: 1000, maxY: 400 },
    { left: 50, top: 300, width: 208, height: 88 },
  )
  assert.equal(placement.scale, 0.2)
  assert.equal(placement.x, 54)
  assert.equal(placement.y, 296)
})

test('formatDateTime usa la hora de Guatemala', () => {
  assert.equal(formatDateTime('2026-09-23T18:30:00Z'), '23/09/2026, 12:30')
  assert.equal(formatDateTime(null), '—')
  assert.equal(formatDateTime('no es fecha'), '—')
})

test('verificationCode muestra los primeros 12 caracteres del hash en grupos', () => {
  assert.equal(verificationCode('a1b2c3d4e5f6' + '0'.repeat(52)), 'A1B2-C3D4-E5F6')
})

test('describeUsage combina cantidad, unidad y horas', () => {
  assert.equal(describeUsage({ cantidad: 2, unidad: 'm' }), '2 m')
  assert.equal(describeUsage({ horas: 1.5 }), '1.5 h')
  assert.equal(describeUsage({}), '—')
})
