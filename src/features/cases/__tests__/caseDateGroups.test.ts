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

  it('conserva el orden descendente recibido del servidor', () => {
    const groups = groupCasesByDay(
      [
        record('new', new Date(2026, 8, 23, 8).toISOString()),
        record('old', new Date(2026, 8, 22, 8).toISOString()),
      ],
      now,
    )
    expect(groups.map(({ title }) => title)).toEqual(['Hoy', 'Ayer'])
  })

  it('conserva el orden ascendente recibido del servidor', () => {
    const groups = groupCasesByDay(
      [
        record('old', new Date(2026, 8, 22, 8).toISOString()),
        record('new', new Date(2026, 8, 23, 8).toISOString()),
      ],
      now,
    )
    expect(groups.map(({ title }) => title)).toEqual(['Ayer', 'Hoy'])
  })

  it('añade páginas nuevas al grupo ya existente sin duplicarlo', () => {
    const groups = groupCasesByDay(
      [
        record('first', new Date(2026, 8, 23, 8).toISOString()),
        record('older', new Date(2026, 8, 22, 8).toISOString()),
        record('next-page', new Date(2026, 8, 23, 7).toISOString()),
      ],
      now,
    )
    expect(groups.map(({ title }) => title)).toEqual(['Hoy', 'Ayer'])
    expect(groups[0]?.data.map(({ id }) => id)).toEqual(['first', 'next-page'])
  })
})
