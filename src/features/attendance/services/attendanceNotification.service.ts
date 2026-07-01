import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAdminRole } from '@/utils/adminAccess'
import type { AttendanceRequest } from '../types/attendance'
import {
  mapAttendanceRequestNotification,
  type AttendanceRequestNotification,
} from '../types/attendanceNotification'

export async function fetchAttendanceNotifications(
  userId: string,
): Promise<AttendanceRequestNotification[]> {
  const { data, error } = await supabase
    .from('attendance_request_notifications')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []).map((row) => mapAttendanceRequestNotification(row as Record<string, unknown>))
}

export async function fetchUnreadAttendanceNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('attendance_request_notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('recipient_user_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return Number(count ?? 0)
}

export async function markAttendanceNotificationRead(
  notificationId: number,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_request_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('recipient_user_id', userId)

  if (error) throw error
}

export async function markAllAttendanceNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_request_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('recipient_user_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

export function subscribeAttendanceNotifications(
  userId: string,
  callback: () => void,
): RealtimeChannel {
  return supabase
    .channel(`attendance-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance_request_notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      () => callback(),
    )
    .subscribe()
}

export function unsubscribeAttendanceNotifications(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}

export async function fetchActiveAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, activate')
    .eq('activate', true)

  if (error) throw error

  return (data ?? [])
    .filter((row) => isAdminRole(String(row.role ?? '')))
    .map((row) => String(row.id ?? '').trim())
    .filter(Boolean)
}

export async function sendAttendanceRequestPushToAdmins(request: AttendanceRequest): Promise<void> {
  try {
    const adminIds = await fetchActiveAdminUserIds()
    if (adminIds.length === 0) return

    const startDate = request.startDate.slice(0, 10)
    const title = `[휴가 신청] ${request.userName}`
    const body = `${request.department} · ${request.leaveType} ${request.daysCount}일 · ${startDate}`

    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        user_ids: adminIds,
        title,
        body,
        url: '/attendance',
      },
    })

    if (error) console.error('[sendAttendanceRequestPushToAdmins]', error)
  } catch (err) {
    console.error('[sendAttendanceRequestPushToAdmins]', err)
  }
}
