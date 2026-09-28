import { groupCasesByDay } from '../caseDateGroups'
import type { CaseRecord } from '../types'

function record(id: string, createdAt: string): CaseRecord {
  return { id, createdAt } as CaseRecord
}

describe('groupCasesByDay', () => {
  const now = new Date(2026, 8, 23, 12)

  it('agrupa hoy y ayer según el calendario local, conservando el orden', () => {
    const groups = groupCasesByDay(
      [
        record('a', new Date(2026, 8, 23, 8).toISOString()),
        record('b', new Date(2026, 8, 23, 7).toISOString()),
        record('c', new Date(2026, 8, 22, 22).toISOString()),
      ],
      now,
    )
    expect(groups.map(({ title }) => title)).toEqual(['Hoy', 'Ayer'])
    expect(groups[0]?.data.map(({ id }) => id)).toEqual(['a', 'b'])
  })

  it('tolera fechas inválidas', () => {
    expect(groupCasesByDay([record('a', 'bad')], now)[0]?.title).toBe('Fecha no disponible')
  })

  it('ordena los grupos por fecha aunque la lista venga ordenada por prioridad', () => {
    const groups = groupCasesByDay(
      [
        record('old', new Date(2026, 8, 22, 8).toISOString()),
        record('new', new Date(2026, 8, 23, 8).toISOString()),
      ],
      now,
    )
    expect(groups.map(({ title }) => title)).toEqual(['Hoy', 'Ayer'])
  })
})
