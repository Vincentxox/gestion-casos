import {
  buildCaseSearchFilters,
  calendarDateBoundary,
  getCaseSegments,
  getQuickFilterCounts,
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

test('las pestañas aplican el chip activo sobre los conteos base sin otra consulta', () => {
  const counts = [
    { status: 'solicitado' as const, total: 5, overdue: 2, unassigned: 5 },
    { status: 'aceptado' as const, total: 4, overdue: 1, unassigned: 3 },
    { status: 'en_ejecucion' as const, total: 3, overdue: 2, unassigned: 0 },
    { status: 'aprobado' as const, total: 2, overdue: 0, unassigned: 0 },
  ]
  expect(getCaseSegments(counts, 'sin_asignar')).toEqual({ abiertas: 3, cerradas: 2, todas: 3 })
  expect(getCaseSegments(counts, null, true)).toEqual({ abiertas: 5, cerradas: 2, todas: 5 })
})

test('el estado exacto y los estados heredados filtran cada pestaña sin alterar los accesos rápidos', () => {
  const counts = [
    { status: 'solicitado' as const, total: 3, overdue: 1, unassigned: 3 },
    { status: 'en_espera' as const, total: 2, overdue: 1, unassigned: 0 },
    { status: 'aprobado' as const, total: 4, overdue: 0, unassigned: 0 },
  ]
  expect(getCaseSegments(counts, null, false, 'en_espera')).toEqual({
    abiertas: 2,
    cerradas: 0,
    todas: 2,
  })
  expect(getCaseSegments(counts, null, false, null, ['en_espera', 'aprobado'])).toEqual({
    abiertas: 2,
    cerradas: 4,
    todas: 6,
  })
  expect(getCaseSegments(counts, null, true, null, ['en_espera', 'aprobado'])).toEqual({
    abiertas: 1,
    cerradas: 4,
    todas: 1,
  })
  expect(getQuickFilterCounts(counts).por_aceptar).toBe(3)
})

test('los seis filtros rápidos se cuentan a partir de las filas filtradas por el servidor', () => {
  expect(
    getQuickFilterCounts([
      { status: 'solicitado', total: 5, overdue: 2, unassigned: 5 },
      { status: 'aceptado', total: 4, overdue: 1, unassigned: 3 },
      { status: 'en_ejecucion', total: 3, overdue: 2, unassigned: 0 },
      { status: 'en_espera', total: 2, overdue: 1, unassigned: 0 },
      { status: 'reporte_enviado', total: 4, overdue: 0, unassigned: 0 },
      { status: 'validado', total: 1, overdue: 0, unassigned: 0 },
    ]),
  ).toEqual({
    vencidas: 6,
    por_aceptar: 5,
    sin_asignar: 3,
    en_ejecucion: 3,
    en_espera: 2,
    en_revision: 5,
  })
  expect(getQuickFilterCounts([])).toEqual({
    vencidas: 0,
    por_aceptar: 0,
    sin_asignar: 0,
    en_ejecucion: 0,
    en_espera: 0,
    en_revision: 0,
  })
})

test('el estado exacto se intersecta con el filtro rápido', () => {
  expect(
    buildCaseSearchFilters({
      ...base,
      tab: 'abiertas',
      exactStatus: 'validado',
      quickStatus: 'en_revision',
    }).statuses,
  ).toEqual(['validado'])
  expect(
    buildCaseSearchFilters({
      ...base,
      tab: 'abiertas',
      exactStatus: 'aceptado',
      quickStatus: 'en_revision',
    }).statuses,
  ).toEqual([])
})

test('la búsqueda respeta el límite de 100 caracteres', () => {
  expect(caseSearchTextSchema.parse('  caso  ')).toBe('caso')
  expect(caseSearchTextSchema.safeParse('x'.repeat(100)).success).toBe(true)
  expect(caseSearchTextSchema.safeParse('x'.repeat(101)).success).toBe(false)
})
