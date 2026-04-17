'use strict'

/**
 * 메인 프로세스에서 직접 Supabase 리얼타임 연결
 * 렌더러(BrowserWindow)가 숨겨지거나 스로틀링 되어도 안정적으로 알림 수신
 */

const { createClient } = require('@supabase/supabase-js')

let supabase = null
let msgChannel = null
let memberChannel = null
let myRoomIds = new Set()
let currentUserId = null

function init(supabaseUrl, supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  })
}

async function refreshMyRooms(userId) {
  if (!supabase || !userId) return
  const { data } = await supabase
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId)
  myRoomIds = new Set((data ?? []).map((r) => r.room_id))
}

function stop() {
  if (msgChannel) { supabase?.removeChannel(msgChannel); msgChannel = null }
  if (memberChannel) { supabase?.removeChannel(memberChannel); memberChannel = null }
  myRoomIds.clear()
  currentUserId = null
}

/**
 * @param {string} userId - 로그인한 유저 ID
 * @param {(payload: { title: string, body: string, url: string }) => void} onNotify
 */
async function start(userId, onNotify) {
  stop()
  if (!supabase || !userId) return
  currentUserId = userId

  await refreshMyRooms(userId)

  // 새 메시지 구독
  msgChannel = supabase
    .channel(`main_notify:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        const msg = payload.new
        if (!msg) return
        if (msg.sender_id === userId) return           // 내가 보낸 메시지
        if (!myRoomIds.has(msg.room_id)) return        // 내 방 아님

        onNotify({
          title: `💬 ${msg.sender_name || '메신저'}`,
          body: msg.content?.trim() || '파일을 보냈습니다.',
          url: '/messenger',
        })
      },
    )
    .subscribe()

  // 방 멤버십 변경 반영
  memberChannel = supabase
    .channel(`main_rooms:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_room_members', filter: `user_id=eq.${userId}` },
      () => refreshMyRooms(userId),
    )
    .subscribe()
}

module.exports = { init, start, stop }
