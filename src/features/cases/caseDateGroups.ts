import type { CaseRecord } from './types'
import { notificationGroupName } from '@/features/notifications/notificationPresentation'

export interface CaseDateGroup {
  title: string
  data: CaseRecord[]
}

export function groupCasesByDay(cases: CaseRecord[], now = new Date()): CaseDateGroup[] {
  const groups = new Map<string, CaseDateGroup>()
  for (const item of cases) {
    const group = notificationGroupName(item.createdAt, now)
    const title = group === 'Anteriores' ? 'Antes' : group
    if (!groups.has(title)) groups.set(title, { title, data: [] })
    groups.get(title)?.data.push(item)
  }
  return [...groups.values()]
}
