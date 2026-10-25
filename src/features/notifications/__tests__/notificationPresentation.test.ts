import type { AppNotification } from '../notificationService'
import {
  filterNotifications,
  groupNotifications,
  notificationAppearance,
  notificationGroupName,
  notificationTimeLabel,
} from '../notificationPresentation'
import { colors, phaseColors } from '@/theme/tokens'

const now = new Date(2026, 9, 16, 12, 0)
const item = (id: number, date: Date, readAt: string | null = null): AppNotification => ({
  id,
  caseId: `case-${id}`,
  title: 'Aviso',
  body: 'Texto',
  action: 'crear',
  caseNumber: 'CAS-2026-00001',
  caseTitle: 'Fuga',
  actorId: null,
  actorName: null,
  comment: null,
  createdAt: date.toISOString(),
  readAt,
})

test('mapea acciones sin depender del título', () => {
  expect(notificationAppearance('asignar').background).toBe(phaseColors.curso.bg)
  expect(notificationAppearance('reasignar').background).toBe(phaseColors.curso.bg)
  expect(notificationAppearance('enviar_reporte').background).toBe(phaseColors.revision.bg)
  expect(notificationAppearance('validar_reporte').background).toBe(phaseColors.revision.bg)
  expect(notificationAppearance('aprobar_reporte').background).toBe(phaseColors.cerrada.bg)
  expect(notificationAppearance('pausar').background).toBe(phaseColors.detenida.bg)
  expect(notificationAppearance('rechazar').background).toBe(phaseColors.rechazada.bg)
  expect(notificationAppearance('cancelar').background).toBe(phaseColors.rechazada.bg)
  expect(notificationAppearance('devolver_reporte').background).toBe(phaseColors.nueva.bg)
  expect(notificationAppearance('crear').background).toBe(colors.primarySoft)
  expect(notificationAppearance('mensaje')).toMatchObject({
    icon: 'chatbubble-outline',
    background: colors.primarySoft,
  })
  expect(notificationAppearance('aceptar').background).toBe(colors.neutralSoft)
  expect(notificationAppearance('iniciar').background).toBe(colors.neutralSoft)
})

test('agrupa por calendario local y conserva el orden de cada grupo', () => {
  const items = [
    item(1, new Date(2026, 9, 16, 10, 30)),
    item(2, new Date(2026, 9, 15, 18, 5)),
    item(3, new Date(2026, 9, 13, 9, 0)),
    item(4, new Date(2026, 8, 30, 8, 0)),
    item(5, new Date(2026, 9, 16, 8, 0)),
  ]
  expect(
    groupNotifications(items, now).map((group) => [
      group.title,
      group.items.map((entry) => entry.id),
    ]),
  ).toEqual([
    ['Hoy', [1, 5]],
    ['Ayer', [2]],
    ['Esta semana', [3]],
    ['Anteriores', [4]],
  ])
  expect(notificationGroupName('incorrecta', now)).toBe('Anteriores')
})

test('formatea hora corta y fecha sin segundos', () => {
  expect(notificationTimeLabel(new Date(2026, 9, 16, 8, 5).toISOString(), now)).toMatch(/^0?8:05$/)
  expect(notificationTimeLabel(new Date(2026, 9, 15, 18, 5).toISOString(), now)).toBe('Ayer')
  expect(notificationTimeLabel(new Date(2026, 9, 13, 9, 0).toISOString(), now)).toBe('mar')
  expect(notificationTimeLabel(new Date(2026, 8, 30, 8, 0).toISOString(), now)).toBe('30 sep')
  expect(notificationTimeLabel(new Date(2025, 9, 21, 8, 0).toISOString(), now)).toBe('21 oct 2025')
  expect(notificationTimeLabel('incorrecta', now)).toBe('')
})

test('filtra sin leer sin alterar todos', () => {
  const items = [item(1, now), item(2, now, now.toISOString())]
  expect(filterNotifications(items, 'all')).toEqual(items)
  expect(filterNotifications(items, 'unread')).toEqual([items[0]])
})
