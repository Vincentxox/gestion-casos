import { buildCaseSearchFilters, getCaseSegments } from '../caseSearch'
import { caseSearchTextSchema } from '../schemas'

const base = {
  status: 'todos' as const,
  scope: 'todas' as const,
  exactStatus: null,
  priority: null,
  sinceDays: null,
  activeOnly: false,
  searchText: '  Luz  ',
  now: Date.parse('2026-10-16T12:00:00.000Z'),
}

test('mapea grupo, prioridad, fecha y texto a filtros del servidor', () => {
  expect(
    buildCaseSearchFilters({
      ...base,
      status: 'pendientes',
      priority: 'alta',
      sinceDays: 7,
    }),
  ).toEqual({
    scope: 'todas',
    statuses: ['solicitado', 'aceptado'],
    priority: 'alta',
    updatedSince: '2026-10-09T12:00:00.000Z',
    searchText: 'Luz',
    sortPending: true,
  })
})

test('el estado exacto y solo activas se intersecan sin ampliar resultados', () => {
  expect(
    buildCaseSearchFilters({ ...base, exactStatus: 'aprobado', activeOnly: true }).statuses,
  ).toEqual([])
  expect(buildCaseSearchFilters({ ...base, activeOnly: true }).statuses).not.toContain('aprobado')
})

test('los alcances especiales usan bandeja y conservan su estado', () => {
  expect(buildCaseSearchFilters({ ...base, scope: 'por_aceptar' })).toMatchObject({
    scope: 'bandeja',
    statuses: ['solicitado'],
  })
  expect(buildCaseSearchFilters({ ...base, scope: 'sin_asignar' })).toMatchObject({
    scope: 'bandeja',
    statuses: ['aceptado'],
  })
})

test('los contadores se suman por grupos e incluyen ceros', () => {
  expect(
    getCaseSegments([
      { status: 'solicitado', total: 5 },
      { status: 'en_ejecucion', total: 3 },
      { status: 'aprobado', total: 2 },
    ]),
  ).toEqual({ todos: 10, pendientes: 5, en_curso: 3, cerradas: 2 })
})

test('la búsqueda respeta el límite de 100 caracteres', () => {
  expect(caseSearchTextSchema.parse('  caso  ')).toBe('caso')
  expect(caseSearchTextSchema.safeParse('x'.repeat(100)).success).toBe(true)
  expect(caseSearchTextSchema.safeParse('x'.repeat(101)).success).toBe(false)
})
