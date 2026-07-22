import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  countMessageUnread,
  indexReadsByUser,
  type RoomReadRow,
} from '../utils/messageReadCount'

type MemberLike = { user_id: string }

export function useRoomReadReceipts(options: {
  roomId: Ref<string | null>
  members: Ref<MemberLike[]>
  myUserId: Ref<string>
}) {
  const readsByUserId = ref<Record<string, string>>({})
  const loading = ref(false)
  /** 템플릿 반응성 강제용 */
  const readsTick = ref(0)

  let channel: ReturnType<typeof supabase.channel> | null = null

  const memberUserIds = computed(() => {
    const ids = options.members.value
      .map((m) => String(m.user_id ?? '').trim())
      .filter(Boolean)
    const me = String(options.myUserId.value ?? '').trim()
    if (me && !ids.includes(me)) ids.push(me)
    return ids
  })

  const bump = () => {
    readsTick.value += 1
  }

  const clearChannel = () => {
    if (!channel) return
    supabase.removeChannel(channel)
    channel = null
  }

  const fetchReads = async (roomId: string) => {
    loading.value = true
    const { data, error } = await supabase
      .from('chat_room_reads')
      .select('user_id, last_read_at')
      .eq('room_id', roomId)

    loading.value = false
    if (error) {
      console.warn('[read-receipts] fetch failed', error.message)
      return
    }
    readsByUserId.value = indexReadsByUser((data ?? []) as RoomReadRow[])
    bump()
  }

  const applyUserRead = (userId: string, lastReadAt?: string) => {
    const uid = String(userId ?? '').trim()
    if (!uid) return
    const at = String(lastReadAt ?? '').trim() || new Date().toISOString()
    const prev = readsByUserId.value[uid]
    if (prev) {
      const prevMs = Date.parse(prev)
      const nextMs = Date.parse(at)
      if (Number.isFinite(prevMs) && Number.isFinite(nextMs) && nextMs < prevMs) return
    }
    readsByUserId.value = {
      ...readsByUserId.value,
      [uid]: at,
    }
    bump()
  }

  const subscribe = (roomId: string) => {
    clearChannel()
    channel = supabase
      .channel(`chat_room_reads_receipts:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_room_reads',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as RoomReadRow | null
          if (!row?.user_id) {
            void fetchReads(roomId)
            return
          }

          if (payload.eventType === 'DELETE') {
            const next = { ...readsByUserId.value }
            delete next[row.user_id]
            readsByUserId.value = next
            bump()
            return
          }

          const lastReadAt = String((row as RoomReadRow).last_read_at ?? '').trim()
          if (!lastReadAt) {
            void fetchReads(roomId)
            return
          }
          applyUserRead(row.user_id, lastReadAt)
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void fetchReads(roomId)
      })
  }

  watch(
    () => options.roomId.value,
    async (roomId) => {
      clearChannel()
      readsByUserId.value = {}
      bump()
      if (!roomId) return
      await fetchReads(roomId)
      subscribe(roomId)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    clearChannel()
  })

  const getMessageUnreadCount = (message: { created_at?: string; sender_id?: string } | null) => {
    // readsTick 의존으로 템플릿 갱신 보장
    void readsTick.value
    if (!message?.created_at || !message?.sender_id) return 0
    return countMessageUnread(
      message.created_at,
      memberUserIds.value,
      readsByUserId.value,
      message.sender_id,
    )
  }

  return {
    readsByUserId,
    loading,
    getMessageUnreadCount,
    applyUserRead,
    refreshReads: async () => {
      const roomId = options.roomId.value
      if (!roomId) return
      await fetchReads(roomId)
    },
  }
}
