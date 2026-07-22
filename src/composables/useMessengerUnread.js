import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

const unreadCountsByRoom = ref({})
const unreadLoading = ref(false)
const trackedUserId = ref('')

let unreadRefreshPromise = null
let messageEventsChannel = null
let roomEventsChannel = null
let readEventsChannel = null

const totalUnreadCount = computed(() => (
  Object.values(unreadCountsByRoom.value).reduce((sum, count) => sum + (Number(count) || 0), 0)
))

const normalizeUnreadCounts = (rows = []) => {
  const next = {}
  for (const row of rows) {
    const roomId = String(row?.room_id ?? '').trim()
    if (!roomId) continue
    next[roomId] = Math.max(0, Number(row?.unread_count) || 0)
  }
  return next
}

const clearUnreadState = () => {
  unreadCountsByRoom.value = {}
  unreadLoading.value = false
}

const removeRealtimeChannel = (channel) => {
  if (!channel) return
  supabase.removeChannel(channel)
}

const getRoomUnreadCount = (roomId) => {
  const key = String(roomId ?? '').trim()
  return Math.max(0, Number(unreadCountsByRoom.value[key]) || 0)
}

const refreshUnreadCounts = async (userId = trackedUserId.value) => {
  const normalizedUserId = String(userId ?? '').trim()
  if (!normalizedUserId) {
    clearUnreadState()
    return { ok: true, counts: {} }
  }

  if (unreadRefreshPromise) return unreadRefreshPromise

  unreadLoading.value = true
  const requestUserId = normalizedUserId
  unreadRefreshPromise = supabase
    .rpc('get_my_chat_room_unread_counts')
    .then(({ data, error }) => {
      if (error) return { ok: false, reason: error.message }

      const counts = normalizeUnreadCounts(data ?? [])
      if (trackedUserId.value === requestUserId) {
        unreadCountsByRoom.value = counts
      }
      return { ok: true, counts }
    })
    .finally(() => {
      unreadLoading.value = false
      unreadRefreshPromise = null
    })

  return unreadRefreshPromise
}

const ensureRealtimeChannels = (userId) => {
  const normalizedUserId = String(userId ?? '').trim()
  if (!normalizedUserId) return

  if (!messageEventsChannel) {
    messageEventsChannel = supabase
      .channel(`chat_messages_unread:${normalizedUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        void refreshUnreadCounts()
      })
      .subscribe()
  }

  if (!roomEventsChannel) {
    roomEventsChannel = supabase
      .channel(`chat_rooms_unread:${normalizedUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
        void refreshUnreadCounts()
      })
      .subscribe()
  }

  if (!readEventsChannel) {
    readEventsChannel = supabase
      .channel(`chat_room_reads_unread:${normalizedUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_room_reads', filter: `user_id=eq.${normalizedUserId}` },
        () => {
          void refreshUnreadCounts()
        },
      )
      .subscribe()
  }
}

const stopUnreadTracking = () => {
  removeRealtimeChannel(messageEventsChannel)
  removeRealtimeChannel(roomEventsChannel)
  removeRealtimeChannel(readEventsChannel)

  messageEventsChannel = null
  roomEventsChannel = null
  readEventsChannel = null

  trackedUserId.value = ''
  clearUnreadState()
}

const startUnreadTracking = async (userId) => {
  const normalizedUserId = String(userId ?? '').trim()
  if (!normalizedUserId) {
    stopUnreadTracking()
    return { ok: true, counts: {} }
  }

  if (trackedUserId.value && trackedUserId.value !== normalizedUserId) {
    stopUnreadTracking()
  }

  trackedUserId.value = normalizedUserId
  ensureRealtimeChannels(normalizedUserId)

  return refreshUnreadCounts(normalizedUserId)
}

const markRoomAsRead = async (roomId) => {
  const normalizedRoomId = String(roomId ?? '').trim()
  if (!normalizedRoomId || !trackedUserId.value) {
    return { ok: false, reason: 'missing-room-or-user' }
  }

  unreadCountsByRoom.value = {
    ...unreadCountsByRoom.value,
    [normalizedRoomId]: 0,
  }

  const { error, data } = await supabase.rpc('mark_my_chat_room_read', {
    target_room_id: normalizedRoomId,
  })

  if (error) {
    await refreshUnreadCounts()
    return { ok: false, reason: error.message }
  }

  void refreshUnreadCounts()
  return {
    ok: true,
    lastReadAt: String(data?.last_read_at ?? '').trim() || new Date().toISOString(),
  }
}

export const useMessengerUnread = () => ({
  unreadCountsByRoom,
  unreadLoading,
  totalUnreadCount,
  getRoomUnreadCount,
  refreshUnreadCounts,
  startUnreadTracking,
  stopUnreadTracking,
  markRoomAsRead,
})
