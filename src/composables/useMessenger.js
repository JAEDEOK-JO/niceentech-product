import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const sendPush = async ({ roomId, excludeUserId, title, body, url }) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { room_id: roomId, exclude_user_id: excludeUserId, title, body, url },
    })
    if (error) {
      console.error('send-push invoke failed:', error)
      return
    }
    if (data?.error) {
      console.error('send-push response error:', data)
    }
  } catch (error) {
    console.error('send-push unexpected error:', error)
  }
}

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
    const userId = session.value?.user?.id
    if (!userId) { rooms.value = []; return }
    roomsLoading.value = true
    error.value = ''

    // 두 쿼리를 병렬로 실행: 내가 만든 방 + 멤버로 초대된 방
    const [ownedRes, memberRes] = await Promise.all([
      // 내가 owner인 방
      supabase.from('chat_rooms').select('*').eq('owner_id', userId),
      // 내가 chat_room_members에 등록된 방 ID 조회
      supabase.from('chat_room_members').select('room_id').eq('user_id', userId),
    ])

    roomsLoading.value = false
    if (ownedRes.error) { error.value = '채팅방 목록 조회 실패'; return }

    const ownedRooms = ownedRes.data ?? []
    const ownedIds = new Set(ownedRooms.map((r) => r.id))

    // 멤버로 초대된 방 중 내가 owner가 아닌 것만 추가 조회
    const memberIds = (memberRes.data ?? [])
      .map((r) => r.room_id)
      .filter((id) => !ownedIds.has(id))

    let invitedRooms = []
    if (memberIds.length > 0) {
      const { data: inv } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', memberIds)
      invitedRooms = inv ?? []
    }

    // 합치고 생성일 내림차순 정렬
    const combined = [...ownedRooms, ...invitedRooms]
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    rooms.value = combined
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

    // 방 생성자를 멤버로 자동 등록
    const { error: memberErr } = await supabase.from('chat_room_members').insert(
      { room_id: data.id, user_id: userId, display_name: ownerName, role: 'owner' },
    )
    if (memberErr) console.warn('chat_room_members 등록 실패:', memberErr.message)

    rooms.value = [data, ...rooms.value]
    return { ok: true, room: data }
  }

  // ─── 멤버 조회 ───────────────────────────────────────────────────────────
  const fetchMembers = async (roomId) => {
    const { data, error: err } = await supabase
      .from('chat_room_members')
      .select('user_id, display_name, role, joined_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
    if (err) return []
    return data ?? []
  }

  // ─── 멤버 초대 ───────────────────────────────────────────────────────────
  const inviteMember = async (roomId, targetUserId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', targetUserId)
      .maybeSingle()
    const displayName = String(profile?.name ?? '').trim() || '알 수 없음'

    const { error: err } = await supabase
      .from('chat_room_members')
      .upsert(
        { room_id: roomId, user_id: targetUserId, display_name: displayName, role: 'member' },
        { onConflict: 'room_id,user_id' },
      )
    if (err) return { ok: false, reason: err.message }
    return { ok: true }
  }

  // ─── 멤버 내보내기 ────────────────────────────────────────────────────────
  const removeMember = async (roomId, targetUserId) => {
    const { error: err } = await supabase
      .from('chat_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', targetUserId)
    if (err) return { ok: false, reason: err.message }
    return { ok: true }
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

    const textPreview = content.trim() ? content.trim().slice(0, 60) : '파일을 보냈습니다.'
    sendPush({
      roomId,
      excludeUserId: userId,
      title: `💬 ${senderName}`,
      body: textPreview,
      url: '/messenger',
    })

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

    const textPreview = content.trim()
      ? content.trim().slice(0, 60)
      : `파일 ${files.length}개를 보냈습니다.`
    sendPush({
      roomId,
      excludeUserId: userId,
      title: `💬 ${senderName}`,
      body: textPreview,
      url: '/messenger',
    })

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
    fetchMembers,
    inviteMember,
    removeMember,
  }
}
