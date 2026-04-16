import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useMessenger = (session) => {
  const rooms = ref([])
  const messages = ref([])
  const activeRoomId = ref(null)
  const roomsLoading = ref(false)
  const messagesLoading = ref(false)
  const sending = ref(false)
  const uploading = ref(false)
  const error = ref('')

  let messageSubscription = null
  let roomSubscription = null

  const activeRoom = computed(() => rooms.value.find((r) => r.id === activeRoomId.value) ?? null)
  const MEDIA_PUBLIC_PREFIX = '/storage/v1/object/public/media/'

  const extractMediaStoragePath = (fileUrl) => {
    const raw = String(fileUrl ?? '').trim()
    if (!raw) return ''

    try {
      const parsed = new URL(raw)
      const markerIndex = parsed.pathname.indexOf(MEDIA_PUBLIC_PREFIX)
      if (markerIndex < 0) return ''
      return decodeURIComponent(parsed.pathname.slice(markerIndex + MEDIA_PUBLIC_PREFIX.length))
    } catch {
      return ''
    }
  }

  const removeMediaFiles = async (fileUrls = []) => {
    const storagePaths = [...new Set(fileUrls.map(extractMediaStoragePath).filter(Boolean))]
    if (storagePaths.length === 0) return { ok: true }

    const { error: removeErr } = await supabase.storage.from('media').remove(storagePaths)
    if (removeErr) return { ok: false, reason: removeErr.message }
    return { ok: true }
  }

  const fetchRooms = async () => {
    roomsLoading.value = true
    error.value = ''
    const { data, error: err } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false })
    roomsLoading.value = false
    if (err) { error.value = '채팅방 목록 조회 실패'; return }
    rooms.value = data ?? []
  }

  const createRoom = async ({ title, description = '' }) => {
    const userId = session.value?.user?.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle()
    const ownerName = String(profile?.name ?? '').trim() || '알 수 없음'

    const { data, error: err } = await supabase
      .from('chat_rooms')
      .insert({ title, description, owner_id: userId, owner_name: ownerName, member_count: 0 })
      .select()
      .single()
    if (err) return { ok: false, reason: err.message }
    rooms.value = [data, ...rooms.value]
    return { ok: true, room: data }
  }

  const deleteRoom = async (roomId) => {
    const { data: roomMessages, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('file_url')
      .eq('room_id', roomId)
    if (fetchErr) return { ok: false, reason: fetchErr.message }

    const { error: err } = await supabase.from('chat_rooms').delete().eq('id', roomId)
    if (err) return { ok: false }

    const storageResult = await removeMediaFiles((roomMessages ?? []).map((item) => item.file_url))
    if (!storageResult.ok) return { ok: false, reason: storageResult.reason }

    rooms.value = rooms.value.filter((r) => r.id !== roomId)
    if (activeRoomId.value === roomId) {
      activeRoomId.value = null
      messages.value = []
    }
    return { ok: true }
  }

  const fetchMessages = async (roomId) => {
    messagesLoading.value = true
    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    messagesLoading.value = false
    if (err) { error.value = '메시지 조회 실패'; return }
    messages.value = data ?? []
  }

  const resolveFileType = (file) => {
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'
    return 'image'
  }

  const uploadMediaFile = async (file, roomId) => {
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const randomId = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const storagePath = `chat/${roomId}/${randomId}${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(storagePath, file, { upsert: false })
    if (uploadErr) return { ok: false, reason: uploadErr.message }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath)
    return { ok: true, url: urlData.publicUrl, fileType: resolveFileType(file) }
  }

  const sendMessage = async ({ roomId, content, file = null }) => {
    if (!content.trim() && !file) return { ok: false, reason: 'empty' }
    sending.value = true

    const userId = session.value?.user?.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle()
    const senderName = String(profile?.name ?? '').trim() || '알 수 없음'

    let fileUrl = ''
    let fileType = ''
    if (file) {
      uploading.value = true
      const uploaded = await uploadMediaFile(file, roomId)
      uploading.value = false
      if (!uploaded.ok) { sending.value = false; return { ok: false, reason: uploaded.reason } }
      fileUrl = uploaded.url
      fileType = uploaded.fileType
    }

    const { data, error: err } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: userId,
        sender_name: senderName,
        content: content.trim(),
        file_url: fileUrl,
        file_type: fileType,
      })
      .select()
      .single()

    sending.value = false
    if (err) return { ok: false, reason: err.message }
    return { ok: true, message: data }
  }

  // 텍스트 + 다중 파일 일괄 전송
  const sendMessages = async ({ roomId, content, files = [] }) => {
    if (!content.trim() && files.length === 0) return { ok: false, reason: 'empty' }
    sending.value = true

    const userId = session.value?.user?.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle()
    const senderName = String(profile?.name ?? '').trim() || '알 수 없음'

    const insertRows = []

    // 텍스트 메시지 (파일과 별개로)
    if (content.trim()) {
      insertRows.push({ room_id: roomId, sender_id: userId, sender_name: senderName, content: content.trim(), file_url: '', file_type: '' })
    }

    // 파일 업로드 순차 처리
    if (files.length > 0) {
      uploading.value = true
      for (const file of files) {
        const uploaded = await uploadMediaFile(file, roomId)
        if (!uploaded.ok) { uploading.value = false; sending.value = false; return { ok: false, reason: uploaded.reason } }
        insertRows.push({ room_id: roomId, sender_id: userId, sender_name: senderName, content: '', file_url: uploaded.url, file_type: uploaded.fileType })
      }
      uploading.value = false
    }

    const { error: err } = await supabase.from('chat_messages').insert(insertRows)
    sending.value = false
    if (err) return { ok: false, reason: err.message }
    return { ok: true }
  }

  const deleteMessage = async (messageId) => {
    const targetMessage = messages.value.find((m) => m.id === messageId) ?? null
    const { error: err } = await supabase.from('chat_messages').delete().eq('id', messageId)
    if (err) return { ok: false }

    const storageResult = await removeMediaFiles([targetMessage?.file_url])
    if (!storageResult.ok) return { ok: false, reason: storageResult.reason }

    messages.value = messages.value.filter((m) => m.id !== messageId)
    return { ok: true }
  }

  const subscribeToRoom = (roomId) => {
    unsubscribeFromRoom()
    messageSubscription = supabase
      .channel(`chat_messages:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const exists = messages.value.some((m) => m.id === payload.new.id)
          if (!exists) messages.value = [...messages.value, payload.new]
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          messages.value = messages.value.filter((m) => m.id !== payload.old.id)
        },
      )
      .subscribe()
  }

  const subscribeToRooms = () => {
    roomSubscription = supabase
      .channel('chat_rooms_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, (payload) => {
        const exists = rooms.value.some((r) => r.id === payload.new.id)
        if (!exists) rooms.value = [payload.new, ...rooms.value]
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_rooms' }, (payload) => {
        rooms.value = rooms.value.filter((r) => r.id !== payload.old.id)
        if (activeRoomId.value === payload.old.id) {
          activeRoomId.value = null
          messages.value = []
        }
      })
      .subscribe()
  }

  const unsubscribeFromRoom = () => {
    if (messageSubscription) {
      supabase.removeChannel(messageSubscription)
      messageSubscription = null
    }
  }

  const unsubscribeAll = () => {
    unsubscribeFromRoom()
    if (roomSubscription) {
      supabase.removeChannel(roomSubscription)
      roomSubscription = null
    }
  }

  const selectRoom = async (roomId) => {
    activeRoomId.value = roomId
    messages.value = []
    await fetchMessages(roomId)
    subscribeToRoom(roomId)
  }

  return {
    rooms,
    messages,
    activeRoomId,
    activeRoom,
    roomsLoading,
    messagesLoading,
    sending,
    uploading,
    error,
    fetchRooms,
    createRoom,
    deleteRoom,
    sendMessage,
    sendMessages,
    deleteMessage,
    selectRoom,
    subscribeToRooms,
    unsubscribeAll,
  }
}
