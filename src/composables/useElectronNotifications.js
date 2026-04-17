import { watch } from 'vue'
import { supabase } from '@/lib/supabase'

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true

let msgChannel = null
let memberChannel = null
let myRoomIds = new Set()

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
