import type { AppNotification } from '@/features/notifications/notificationService'
import {
  getAdminAlerts,
  getGreeting,
  getHomePhases,
  getTodayNotifications,
  NEXT_STEP_BUTTON_LABELS,
  NEXT_STEP_LABELS,
  NEXT_STEP_VISUALS,
  nextStepDeadlineLabel,
  nextStepDueMeta,
} from '../homePresentation'
import type { HomeSummary } from '../homeService'

test('el saludo depende de la hora local', () => {
  expect([getGreeting(8), getGreeting(15), getGreeting(21)]).toEqual([
    'Buenos días',
    'Buenas tardes',
    'Buenas noches',
  ])
})

test('cada acción principal tiene texto, botón e ícono de fase', () => {
  expect(NEXT_STEP_LABELS).toEqual({
    aceptar: 'Aceptar solicitud',
    asignar: 'Asignar técnico',
    iniciar: 'Iniciar trabajo',
    enviar_reporte: 'Completar reporte',
    validar_reporte: 'Validar reporte',
    aprobar_reporte: 'Aprobar reporte',
  })
  expect(NEXT_STEP_BUTTON_LABELS).toEqual({
    aceptar: 'Revisar',
    asignar: 'Asignar',
    iniciar: 'Iniciar',
    enviar_reporte: 'Completar',
    validar_reporte: 'Revisar',
    aprobar_reporte: 'Revisar',
  })
  expect(Object.values(NEXT_STEP_VISUALS).map(({ phase }) => phase)).toEqual([
    'nueva',
    'curso',
    'curso',
    'revision',
    'revision',
    'cerrada',
  ])
})

test('las cuatro fases reúnen cada estado una sola vez y suman el total', () => {
  expect(
    getHomePhases([
      { status: 'solicitado', total: 1 },
      { status: 'aceptado', total: 2 },
      { status: 'asignado', total: 3 },
      { status: 'en_ejecucion', total: 4 },
      { status: 'en_espera', total: 5 },
      { status: 'reporte_enviado', total: 6 },
      { status: 'validado', total: 7 },
      { status: 'aprobado', total: 8 },
      { status: 'rechazado', total: 9 },
      { status: 'cancelado', total: 10 },
    ]),
  ).toEqual({ por_aceptar: 1, en_curso: 14, en_revision: 13, cerradas: 27, total: 55 })
  expect(getHomePhases([]).total).toBe(0)
})

test('la línea de datos muestra el plazo futuro o vencido', () => {
  const now = new Date('2026-10-18T12:00:00Z')
  expect(nextStepDueMeta({ dueAt: '2026-10-18T13:00:00Z' }, now)).toBe('vence en 1 h')
  expect(nextStepDueMeta({ dueAt: '2026-10-16T12:00:00Z' }, now)).toBe('venció hace 2 días')
  expect(nextStepDueMeta({ dueAt: null }, now)).toBe('sin plazo')
})

test('muestra Vencida o el tiempo que queda hasta el plazo', () => {
  const now = new Date('2026-10-18T12:00:00Z')
  expect(
    nextStepDeadlineLabel({ dueAt: '2026-10-18T13:00:00Z', overdueStage: 'aceptacion' }, now),
  ).toBe('Vencida')
  expect(nextStepDeadlineLabel({ dueAt: '2026-10-18T12:35:00Z', overdueStage: null }, now)).toBe(
    'Vence en 35 min',
  )
  expect(nextStepDeadlineLabel({ dueAt: '2026-10-18T15:00:00Z', overdueStage: null }, now)).toBe(
    'Vence en 3 h',
  )
  expect(nextStepDeadlineLabel({ dueAt: null, overdueStage: null }, now)).toBe('Sin plazo')
})

test('Hoy muestra como máximo tres avisos del día local', () => {
  const now = new Date(2026, 9, 18, 12)
  const make = (id: number, date: Date): AppNotification => ({
    id,
    caseId: String(id),
    title: 'Aviso',
    body: '',
    action: 'mensaje',
    caseNumber: null,
    caseTitle: null,
    actorId: null,
    actorName: null,
    comment: null,
    createdAt: date.toISOString(),
    readAt: null,
  })
  const result = getTodayNotifications(
    [
      make(1, new Date(2026, 9, 17, 23)),
      ...[2, 3, 4, 5].map((id) => make(id, new Date(2026, 9, 18, id))),
    ],
    now,
  )
  expect(result.map((item) => item.id)).toEqual([2, 3, 4])
})

test('Admin enumera pendientes configurables y omite los que están resueltos', () => {
  const admin: NonNullable<HomeSummary['admin']> = {
    usuarios_sin_area: 2,
    usuarios_sin_nombre: 0,
    solicitudes_acceso_pendientes: 1,
    invitaciones_pendientes: 0,
    tipos_servicio_activos: 0,
    recursos_activos: 1,
    areas_tecnicas_sin_jefe: ['Taller'],
    areas_tecnicas_sin_tecnico: [],
    conformidades_sin_firmante: 1,
  }
  expect(getAdminAlerts(admin).map(({ label }) => label)).toEqual([
    '1 reporte sin firmante de conformidad',
    'Taller no tiene jefe de área',
    '2 usuarios sin área',
    '1 persona pidió acceso',
    'No hay tipos de servicio activos',
  ])
  expect(
    getAdminAlerts({
      ...admin,
      usuarios_sin_area: 0,
      solicitudes_acceso_pendientes: 0,
      tipos_servicio_activos: 1,
      areas_tecnicas_sin_jefe: [],
      conformidades_sin_firmante: 0,
    }),
  ).toEqual([])
})
