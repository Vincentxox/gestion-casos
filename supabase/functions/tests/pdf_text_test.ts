// Ejecutar con: node --experimental-strip-types --test supabase/functions/tests/
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  clampLines,
  describeUsage,
  elapsedLabel,
  formatAmount,
  fitStroke,
  formatDateTime,
  svgPathBounds,
  toWinAnsi,
  usageCost,
  usageKindLabel,
  verificationCode,
  wrapText,
} from '../_shared/pdfText.ts'

test('toWinAnsi conserva el español y reemplaza lo que la fuente no dibuja', () => {
  assert.equal(toWinAnsi('Niño ¿qué pasó? ¡Año 2026! €'), 'Niño ¿qué pasó? ¡Año 2026! €')
  assert.equal(toWinAnsi('Firma 😀 中文'), 'Firma ? ??')
  assert.equal(toWinAnsi('a\tb\r\nc\u0007'), 'a b\nc')
  assert.equal(toWinAnsi(null), '')
})

test('toWinAnsi cambia flechas y guiones especiales por equivalentes legibles', () => {
  assert.equal(toWinAnsi('Mantenimiento \u2192 Técnica'), 'Mantenimiento -> Técnica')
  assert.equal(toWinAnsi('a \u2190 b \u2194 c'), 'a <- b <-> c')
  assert.equal(toWinAnsi('\u22125 °C\u00a0y\u2011n'), '-5 °C y-n')
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

test('usageKindLabel distingue la clase del recurso y la mano de obra', () => {
  assert.equal(usageKindLabel({ tipo: 'recurso', clase: 'material' }), 'Material')
  assert.equal(usageKindLabel({ tipo: 'recurso', clase: 'equipo' }), 'Equipo')
  assert.equal(usageKindLabel({ tipo: 'mano_de_obra', clase: null }), 'Mano de obra')
  assert.equal(usageKindLabel({ tipo: 'recurso', clase: null }), '—')
})

test('usageCost multiplica cantidad por costo unitario solo en materiales', () => {
  const material = { tipo: 'recurso', clase: 'material' }
  assert.equal(usageCost({ ...material, cantidad: 2, costo_unitario: 12 }), 24)
  assert.equal(usageCost({ ...material, cantidad: '1.5', costo_unitario: '3.333' }), 5)
  assert.equal(usageCost({ ...material, cantidad: 2, costo_unitario: null }), null)
  assert.equal(usageCost({ ...material, cantidad: null, costo_unitario: 5 }), null)
  // Herramientas, equipos y mano de obra no suman al total de materiales.
  assert.equal(
    usageCost({ tipo: 'recurso', clase: 'herramienta', cantidad: 1, costo_unitario: 90 }),
    null,
  )
  assert.equal(
    usageCost({ tipo: 'recurso', clase: 'equipo', cantidad: 3, costo_unitario: 50 }),
    null,
  )
  assert.equal(
    usageCost({ tipo: 'mano_de_obra', clase: null, cantidad: 2, costo_unitario: 10 }),
    null,
  )
  assert.equal(
    formatAmount(1234.5),
    Number(1234.5).toLocaleString('es-GT', { minimumFractionDigits: 2 }),
  )
})

test('clampLines corta los bloques largos y marca el corte con «…»', () => {
  assert.deepEqual(clampLines(['uno', 'dos'], 3), ['uno', 'dos'])
  assert.deepEqual(clampLines(['uno', 'dos', 'tres', 'cuatro'], 2), ['uno', 'd…'])
  assert.deepEqual(clampLines(['ab', 'cd', 'ef'], 2), ['ab', 'cd…'])
  assert.deepEqual(clampLines(['uno'], 0), [])
})

test('elapsedLabel resume la duración en días, horas o minutos', () => {
  assert.equal(elapsedLabel('2026-10-11T09:15:00Z', '2026-10-12T13:42:00Z'), '1 d 4 h')
  assert.equal(elapsedLabel('2026-10-11T09:15:00Z', '2026-10-11T12:20:00Z'), '3 h')
  assert.equal(elapsedLabel('2026-10-11T09:15:00Z', '2026-10-11T09:40:00Z'), '25 min')
  assert.equal(elapsedLabel('2026-10-11T09:15:00Z', '2026-10-11T09:15:10Z'), '1 min')
  assert.equal(elapsedLabel(null, '2026-10-11T09:15:00Z'), null)
  assert.equal(elapsedLabel('2026-10-12T00:00:00Z', '2026-10-11T00:00:00Z'), null)
})
