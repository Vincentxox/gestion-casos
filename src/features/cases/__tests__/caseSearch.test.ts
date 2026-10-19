import {
  buildCaseSearchFilters,
  calendarDateBoundary,
  getCaseSegments,
  validateCreatedRange,
} from '../caseSearch'
import { caseSearchTextSchema } from '../schemas'

const base = {
  tab: 'todas' as const,
  scope: 'todas' as const,
  quickStatus: null,
  exactStatus: null,
  priorities: [] as ('alta' | 'media' | 'baja')[],
  sinceDays: null,
  fromDate: null,
  toDate: null,
  overdueOnly: false,
  searchText: '  Luz  ',
  sort: 'recientes' as const,
  now: Date.parse('2026-10-16T12:00:00.000Z'),
}

test('combina Abiertas, prioridades, fecha de creación, vencidas y texto', () => {
  expect(
    buildCaseSearchFilters({
      ...base,
      tab: 'abiertas',
      priorities: ['alta', 'media'],
      sinceDays: 7,
      overdueOnly: true,
    }),
  ).toEqual({
    scope: 'todas',
    statuses: [
      'solicitado',
      'aceptado',
      'asignado',
      'en_ejecucion',
      'en_espera',
      'reporte_enviado',
      'validado',
    ],
    priorities: ['alta', 'media'],
    createdFrom: '2026-10-09T12:00:00.000Z',
    createdTo: null,
    overdueOnly: true,
    unassignedOnly: false,
    searchText: 'Luz',
    sort: 'recientes',
  })
})

test('los chips de estado se intersecan con la pestaña sin ampliar resultados', () => {
  expect(
    buildCaseSearchFilters({ ...base, tab: 'cerradas', quickStatus: 'en_revision' }).statuses,
  ).toEqual([])
  expect(buildCaseSearchFilters({ ...base, quickStatus: 'en_revision' }).statuses).toEqual([
    'reporte_enviado',
    'validado',
  ])
  expect(
    buildCaseSearchFilters({
      ...base,
      tab: 'abiertas',
      quickStatus: 'sin_asignar',
      scope: 'mi_area',
    }),
  ).toMatchObject({
    scope: 'mi_area',
    statuses: ['aceptado'],
    unassignedOnly: true,
  })
})

test('el rango elegido es inclusivo al inicio y exclusivo al día siguiente del final', () => {
  const filters = buildCaseSearchFilters({ ...base, fromDate: '2026-10-01', toDate: '2026-10-08' })
  expect(filters.createdFrom).toBe(calendarDateBoundary('2026-10-01'))
  expect(filters.createdTo).toBe(calendarDateBoundary('2026-10-08', true))
  expect(validateCreatedRange('2026-10-08', '2026-10-01')).toBe(
    'La fecha final debe ser posterior a la inicial',
  )
  expect(validateCreatedRange('2026-02-30', null)).toMatch(/fecha inicial válida/)
})

test('los contadores incluyen ceros y agrupan abiertas, cerradas y todas', () => {
  expect(
    getCaseSegments([
      { status: 'solicitado', total: 5, overdue: 1, unassigned: 5 },
      { status: 'en_ejecucion', total: 3, overdue: 2, unassigned: 0 },
      { status: 'aprobado', total: 2, overdue: 0, unassigned: 0 },
    ]),
  ).toEqual({ abiertas: 8, cerradas: 2, todas: 10 })
})

test('la búsqueda respeta el límite de 100 caracteres', () => {
  expect(caseSearchTextSchema.parse('  caso  ')).toBe('caso')
  expect(caseSearchTextSchema.safeParse('x'.repeat(100)).success).toBe(true)
  expect(caseSearchTextSchema.safeParse('x'.repeat(101)).success).toBe(false)
})
