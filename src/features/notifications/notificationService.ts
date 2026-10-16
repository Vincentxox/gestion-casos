import { supabase } from '@/services/supabase/client'

export interface AppNotification {
  id: number
  caseId: string
  title: string
  body: string
  createdAt: string
  readAt: string | null
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,case_id,title,body,created_at,read_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    body: row.body,
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
