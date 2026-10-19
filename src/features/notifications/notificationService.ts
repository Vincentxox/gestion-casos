import { supabase } from '@/services/supabase/client'
import { listFormerMemberNames, memberDisplayName } from '@/services/supabase/formerMembers'
import type { Database } from '@/services/supabase/database.types'

export interface AppNotification {
  id: number
  caseId: string
  title: string
  body: string
  action: Database['public']['Enums']['case_action']
  caseNumber: string | null
  caseTitle: string | null
  actorId: string | null
  actorName: string | null
  comment: string | null
  createdAt: string
  readAt: string | null
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id,case_id,title,body,action,created_at,read_at,case:cases!notifications_case_id_fkey(case_number,title),event:case_events!notifications_event_id_fkey(actor_id,comment,actor:profiles!case_events_actor_id_fkey(full_name))',
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  const formerNames = await listFormerMemberNames(
    data.map((row) => (!row.event?.actor ? row.event?.actor_id : null)),
  )
  return data.map((row) => ({
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    body: row.body,
    action: row.action,
    caseNumber: row.case?.case_number ?? null,
    caseTitle: row.case?.title ?? null,
    actorId: row.event?.actor_id ?? null,
    actorName: row.event?.actor_id
      ? memberDisplayName(
          row.event.actor_id,
          row.event.actor?.full_name,
          formerNames,
          'Usuario sin nombre',
        )
      : null,
    comment: row.event?.comment ?? null,
    createdAt: row.created_at,
    readAt: row.read_at,
  }))
}

export async function markNotificationsRead(ids: number[] | null = null): Promise<number> {
  const { data, error } = await supabase.rpc(
    'mark_notifications_read',
    ids === null ? {} : { notification_ids: ids },
  )
  if (error) throw error
  return data
}
