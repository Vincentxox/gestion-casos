import type { CaseRecord } from './types'

export interface CaseDateGroup {
  title: string
  data: CaseRecord[]
}

function calendarDay(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function groupCasesByDay(cases: CaseRecord[], now = new Date()): CaseDateGroup[] {
  const today = calendarDay(now)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const previous = calendarDay(yesterday)
  const groups = new Map<string, CaseDateGroup>()
  for (const item of cases) {
    const date = new Date(item.createdAt)
    const key = Number.isNaN(date.getTime()) ? 'unknown' : calendarDay(date)
    const title =
      key === today
        ? 'Hoy'
        : key === previous
          ? 'Ayer'
          : key === 'unknown'
            ? 'Fecha no disponible'
            : date.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups.has(key)) groups.set(key, { title, data: [] })
    groups.get(key)?.data.push(item)
  }
  return [...groups.values()].sort((a, b) => {
    const newest = (group: CaseDateGroup) =>
      Math.max(
        ...group.data.map((item) => {
          const time = new Date(item.createdAt).getTime()
          return Number.isNaN(time) ? 0 : time
        }),
      )
    return newest(b) - newest(a)
  })
}
