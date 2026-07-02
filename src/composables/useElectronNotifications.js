import { watch } from 'vue'
import { supabase } from '@/lib/supabase'

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true

let msgChannel = null
let memberChannel = null
let attendanceChannel = null
let myRoomIds = new Set()

const buildAttendanceBody = (row) => {
  const days = Number(row.days_count ?? 0)
  const parts = [
    String(row.department ?? '').trim(),
    [String(row.leave_type ?? '').trim(), days > 0 ? `${days}일` : ''].filter(Boolean).join(' '),
    String(row.start_date ?? '').trim(),
    String(row.reason ?? '').trim(),
  ].filter(Boolean)
  return parts.join(' · ') || '새 휴가 신청이 등록되었습니다.'
}

export function useElectronNotifications(sessionRef) {
  if (!isElectron) return

  const refreshMyRooms = async (userId) => {
    const { data } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', userId)
    myRoomIds = new Set((data ?? []).map((r) => r.room_id))
  }

  const stop = () => {
    if (msgChannel) { supabase.removeChannel(msgChannel); msgChannel = null }
    if (memberChannel) { supabase.removeChannel(memberChannel); memberChannel = null }
    if (attendanceChannel) { supabase.removeChannel(attendanceChannel); attendanceChannel = null }
    myRoomIds.clear()
  }

  const start = async (userId) => {
    stop()
    if (!userId) return

    await refreshMyRooms(userId)

    msgChannel = supabase
      .channel(`electron_notify:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new
          if (!msg) return
          if (msg.sender_id === userId) return
          if (!myRoomIds.has(msg.room_id)) return   // 내 방 아님
          if (document.hasFocus()) return

          window.electronAPI.showNotification({
            title: `💬 ${msg.sender_name || '메신저'}`,
            body: msg.content?.trim() || '파일을 보냈습니다.',
            url: '/messenger',
          })
        },
      )
      .subscribe()

    // 휴가 신청 등록 시 전 직원에게 알림 (추후 권한별 필터링 예정)
    attendanceChannel = supabase
      .channel(`electron_attendance:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_requests' },
        (payload) => {
          const row = payload.new
          if (!row) return
          if (row.user_id === userId) return
          if (document.hasFocus()) return

          window.electronAPI.showNotification({
            title: `[휴가 신청] ${String(row.user_name ?? '').trim() || '직원'}`,
            body: buildAttendanceBody(row),
            url: '/attendance',
          })
        },
      )
      .subscribe()

    // 방 멤버십 변경 시 목록 갱신 (초대/퇴장)
    memberChannel = supabase
      .channel(`electron_rooms:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_room_members', filter: `user_id=eq.${userId}` },
        () => refreshMyRooms(userId),
      )
      .subscribe()
  }

  watch(
    () => sessionRef?.value?.user?.id ?? '',
    (userId) => { userId ? start(userId) : stop() },
    { immediate: true },
  )
}
