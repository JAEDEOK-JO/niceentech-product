<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useMessenger } from '@/composables/useMessenger'
import { useMessengerUnread } from '@/composables/useMessengerUnread'
import { useMentionInput } from '@/features/messenger/composables/useMentionInput'
import { useRoomReadReceipts } from '@/features/messenger/composables/useRoomReadReceipts'
import MentionMemberPicker from '@/features/messenger/components/MentionMemberPicker.vue'
import ChatMentionText from '@/features/messenger/components/ChatMentionText.vue'
import ChatReadCount from '@/features/messenger/components/ChatReadCount.vue'
import MessengerDrawingSearchDialog from '@/features/messenger/components/MessengerDrawingSearchDialog.vue'
import MessengerProductionRequestDialog from '@/features/messenger/components/MessengerProductionRequestDialog.vue'
import MessengerProductionRequestCard from '@/features/messenger/components/MessengerProductionRequestCard.vue'
import MessengerProductionConfirmCard from '@/features/messenger/components/MessengerProductionConfirmCard.vue'
import MessengerProductionRecheckCard from '@/features/messenger/components/MessengerProductionRecheckCard.vue'
import MessengerRoomViewTabs from '@/features/messenger/components/MessengerRoomViewTabs.vue'
import MessengerWorkBoardPanel from '@/features/messenger/components/MessengerWorkBoardPanel.vue'
import {
  buildProductionRequestPayload,
  fetchProductDrawingFiles,
} from '@/features/messenger/services/productDrawingSearch.service'
import { confirmProductionRequestMessage, processDueScheduledMessages } from '@/features/messenger/services/productionConfirm.service'
import {
  isProductionRequestMessage,
  isProductionConfirmMessage,
  isProductionRecheckMessage,
  parseProductionRequest,
  parseProductionConfirm,
  parseProductionRecheck,
} from '@/features/messenger/utils/productionRequestMessage'
import { supabase } from '@/lib/supabase'

const { session } = useAuth()
const {
  getRoomUnreadCount,
  markRoomAsRead,
  refreshUnreadCounts,
  startUnreadTracking,
} = useMessengerUnread()
const {
  rooms,
  messages,
  activeRoomId,
  activeRoom,
  roomsLoading,
  messagesLoading,
  sending,
  uploading,
  fetchRooms,
  createRoom,
  deleteRoom,
  sendMessages,
  sendProductionRequest,
  deleteMessage,
  selectRoom,
  subscribeToRooms,
  unsubscribeAll,
  fetchMembers,
  inviteMember,
  removeMember,
} = useMessenger(session)

const MAX_FILES = 10
const ACCEPTED = 'image/*,video/*,application/pdf,.pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp,.tiff,.mp4,.mov,.avi,.mkv,.webm'

const messageListRef = ref(null)
const fileInputRef = ref(null)
const textareaRef = ref(null)
const messageInput = ref('')

// 다중 파일 상태
const pendingFiles = ref([]) // [{ file, previewUrl, fileType, name }]

const isCreatingRoom = ref(false)
const newRoomTitle = ref('')
const newRoomDesc = ref('')
const createRoomError = ref('')
const showCreateRoomDialog = ref(false)
const snackMessage = ref('')
let snackTimer = null
const sidebarOpen = ref(true)
const isMobileViewport = ref(false)
const myId = computed(() => session.value?.user?.id ?? '')
const imageViewerOpen = ref(false)
const imageViewerUrls = ref([])
const imageViewerIndex = ref(0)
const imageZoom = ref(1)
const imageOffset = ref({ x: 0, y: 0 })
const isImageDragging = ref(false)
const imageDragStart = ref({ x: 0, y: 0 })
const imageDragOrigin = ref({ x: 0, y: 0 })
const currentImageViewerUrl = computed(() => imageViewerUrls.value[imageViewerIndex.value] ?? '')
const drawingSearchOpen = ref(false)
const productionRequestOpen = ref(false)
const productionRequestProduct = ref(null)
const productionRequestSubmitting = ref(false)

const openProductionRequest = (item) => {
  drawingSearchOpen.value = false
  productionRequestProduct.value = item
  productionRequestOpen.value = true
}

const closeProductionRequest = () => {
  if (productionRequestSubmitting.value) return
  productionRequestOpen.value = false
  productionRequestProduct.value = null
}

const handleProductionRequestSubmit = async ({ requestType, requestTypeLabel, requestText, recipients }) => {
  if (!activeRoomId.value || !productionRequestProduct.value) return
  productionRequestSubmitting.value = true

  let drawings = []
  let drawingUrl = ''
  if (productionRequestProduct.value.hasDrawing) {
    const drawingResult = await fetchProductDrawingFiles(productionRequestProduct.value.id)
    drawings = drawingResult.files
    drawingUrl = drawings[0]?.viewUrl ?? ''
  }

  const payload = buildProductionRequestPayload({
    product: productionRequestProduct.value,
    requestType,
    requestTypeLabel,
    requestText,
    recipients,
    drawingUrl,
    drawings,
  })

  const result = await sendProductionRequest({
    roomId: activeRoomId.value,
    payload,
  })

  productionRequestSubmitting.value = false
  if (!result.ok) {
    showSnack('전송 실패')
    return
  }

  productionRequestOpen.value = false
  productionRequestProduct.value = null
  if (roomViewTab.value === 'open') {
    await workBoardPanelRef.value?.refresh?.()
  }
}

const getProductionRequestPayload = (msg) => parseProductionRequest(msg?.content)
const getProductionConfirmPayload = (msg) => parseProductionConfirm(msg?.content)
const getProductionRecheckPayload = (msg) => parseProductionRecheck(msg?.content)
const confirmingMessageId = ref('')
const roomViewTab = ref('chat') // chat | open | done
const workBoardPanelRef = ref(null)
let scheduleTimer = null

const handleWorkConfirm = async ({ messageId, optionId }) => {
  if (!messageId || confirmingMessageId.value) return
  confirmingMessageId.value = messageId
  const result = await confirmProductionRequestMessage({ messageId, optionId })
  confirmingMessageId.value = ''
  if (!result.ok) {
    const reason = String(result.reason ?? '')
    if (reason.includes('already_confirmed') || reason.includes('already_closed')) {
      showSnack('이미 확인됨')
    } else {
      showSnack('확인 실패')
    }
    return
  }
  if (roomViewTab.value !== 'chat') {
    await workBoardPanelRef.value?.refresh?.()
  }
}
// 멤버 관리 패널
const memberPanelOpen = ref(false)
const members = ref([])
const membersLoading = ref(false)
const allProfiles = ref([])
const profilesLoading = ref(false)
const inviting = ref(false)

const {
  mentionOpen,
  mentionIndex,
  filteredMembers,
  syncMentionFromCaret,
  selectMention,
  handleMentionKeydown,
  closeMention,
  resetSelectedMentions,
  getMentionedUserIdsForSend,
} = useMentionInput({
  messageInput,
  members,
  myUserId: myId,
  textareaRef,
})

const { getMessageUnreadCount, applyUserRead, refreshReads } = useRoomReadReceipts({
  roomId: activeRoomId,
  members,
  myUserId: myId,
})

const loadRoomMembers = async (roomId) => {
  if (!roomId) {
    members.value = []
    return
  }
  membersLoading.value = true
  members.value = await fetchMembers(roomId)
  membersLoading.value = false
}

const openMemberPanel = async () => {
  if (!activeRoomId.value) return
  memberPanelOpen.value = true
  membersLoading.value = true
  profilesLoading.value = true
  const [memberData, profileData] = await Promise.all([
    fetchMembers(activeRoomId.value),
    supabase.from('profiles').select('id, name, department').order('name'),
  ])
  members.value = memberData
  allProfiles.value = profileData.data ?? []
  membersLoading.value = false
  profilesLoading.value = false
}

watch(activeRoomId, async (roomId) => {
  closeMention()
  resetSelectedMentions()
  messageInput.value = ''
  roomViewTab.value = 'chat'
  if (!roomId && isMobileViewport.value) sidebarOpen.value = true
  await loadRoomMembers(roomId)
  if (memberPanelOpen.value && roomId) await openMemberPanel()
})

const isMember = (profileId) => members.value.some((m) => m.user_id === profileId)

const handleInvite = async (profileId) => {
  if (!activeRoomId.value || inviting.value) return
  inviting.value = true
  const result = await inviteMember(activeRoomId.value, profileId)
  if (result.ok) {
    members.value = await fetchMembers(activeRoomId.value)
    showSnack('초대 완료')
  } else {
    showSnack('초대 실패')
  }
  inviting.value = false
}

const handleKick = async (userId) => {
  if (!activeRoomId.value) return
  const result = await removeMember(activeRoomId.value, userId)
  if (result.ok) {
    members.value = await fetchMembers(activeRoomId.value)
    showSnack('멤버 제거 완료')
  } else {
    showSnack('제거 실패')
  }
}

const deleteDialogVisible = ref(false)
const deleteDialogTitle = ref('삭제 확인')
const deleteDialogMessage = ref('삭제하시겠습니까?')
const deleteTarget = ref(null)
const deleteTargetType = ref('')

const showSnack = (msg) => {
  snackMessage.value = msg
  if (snackTimer) clearTimeout(snackTimer)
  snackTimer = setTimeout(() => { snackMessage.value = '' }, 2200)
}

const formatUnreadCount = (count) => {
  const normalized = Math.max(0, Number(count) || 0)
  return normalized > 99 ? '99+' : String(normalized)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight
}

watch(() => messages.value.length, scrollToBottom)
watch(activeRoomId, scrollToBottom)

const formatTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

const groupedMessages = computed(() => {
  const groups = []
  let lastDate = ''
  const isImageOnlyMessage = (msg) => msg?.file_type === 'image' && msg?.file_url && !String(msg?.content ?? '').trim()

  for (let index = 0; index < messages.value.length; index += 1) {
    const msg = messages.value[index]
    const date = formatDate(msg.created_at)
    if (date !== lastDate) { groups.push({ type: 'date', date }); lastDate = date }

    if (isImageOnlyMessage(msg)) {
      const imageGroup = [msg]
      let nextIndex = index + 1
      while (nextIndex < messages.value.length) {
        const nextMsg = messages.value[nextIndex]
        const nextDate = formatDate(nextMsg.created_at)
        if (nextDate !== date) break
        if (!isImageOnlyMessage(nextMsg)) break
        if (nextMsg.sender_id !== msg.sender_id) break
        imageGroup.push(nextMsg)
        nextIndex += 1
      }

      if (imageGroup.length >= 2) {
        groups.push({ type: 'image-group', messages: imageGroup, sender_id: msg.sender_id, sender_name: msg.sender_name })
        index = nextIndex - 1
        continue
      }
    }

    groups.push({ type: 'message', msg })
  }
  return groups
})

const resolveFileType = (file) => {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf') return 'pdf'
  return 'image'
}

const handleFileSelect = (e) => {
  const selected = Array.from(e.target.files ?? [])
  if (!selected.length) return

  const remaining = MAX_FILES - pendingFiles.value.length
  if (remaining <= 0) { showSnack(`최대 ${MAX_FILES}개까지 첨부 가능합니다`); return }

  const toAdd = selected.slice(0, remaining)
  if (selected.length > remaining) showSnack(`${selected.length - remaining}개 초과로 ${remaining}개만 추가됩니다`)

  for (const file of toAdd) {
    const ft = resolveFileType(file)
    const previewUrl = ft === 'image' ? URL.createObjectURL(file) : ''
    pendingFiles.value.push({ file, previewUrl, fileType: ft, name: file.name })
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const removePendingFile = (index) => {
  const item = pendingFiles.value[index]
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  pendingFiles.value.splice(index, 1)
}

const clearPendingFiles = () => {
  for (const item of pendingFiles.value) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }
  pendingFiles.value = []
}

const handleSelectRoom = async (room) => {
  await selectRoom(room.id)
  const result = await markRoomAsRead(room.id)
  if (result?.ok) {
    applyUserRead(myId.value, result.lastReadAt)
  }
  void refreshReads()
  if (isMobileViewport.value) {
    sidebarOpen.value = false
  }
}

const handleCreateRoom = async () => {
  const title = newRoomTitle.value.trim()
  if (!title) { createRoomError.value = '채팅방 이름을 입력해주세요'; return }
  isCreatingRoom.value = true
  createRoomError.value = ''
  const result = await createRoom({ title, description: newRoomDesc.value.trim() })
  isCreatingRoom.value = false
  if (!result.ok) { createRoomError.value = '생성 실패: ' + result.reason; return }
  showCreateRoomDialog.value = false
  newRoomTitle.value = ''
  newRoomDesc.value = ''
  await selectRoom(result.room.id)
}

const handleDeleteRoom = async (room) => {
  deleteDialogTitle.value = '채팅방 삭제'
  deleteDialogMessage.value = `"${room.title}" 채팅방을 삭제하시겠습니까?`
  deleteTargetType.value = 'room'
  deleteTarget.value = room
  deleteDialogVisible.value = true
}

const handleSend = async () => {
  if (!activeRoomId.value) return
  if (!messageInput.value.trim() && pendingFiles.value.length === 0) return

  const content = messageInput.value
  const mentionedUserIds = getMentionedUserIdsForSend(content)
  const files = pendingFiles.value.map((p) => p.file)
  messageInput.value = ''
  clearPendingFiles()
  closeMention()
  resetSelectedMentions()

  const result = await sendMessages({ roomId: activeRoomId.value, content, files, mentionedUserIds })
  if (!result.ok) {
    showSnack('전송 실패')
    messageInput.value = content
  }
}

const handleKeydown = (e) => {
  if (handleMentionKeydown(e)) return
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

const handleDeleteMessage = async (msg) => {
  if (msg.sender_id !== myId.value) return
  deleteDialogTitle.value = '메시지 삭제'
  deleteDialogMessage.value = '삭제하시겠습니까?'
  deleteTargetType.value = 'message'
  deleteTarget.value = msg
  deleteDialogVisible.value = true
}

const closeDeleteDialog = () => {
  deleteDialogVisible.value = false
  deleteDialogTitle.value = '삭제 확인'
  deleteDialogMessage.value = '삭제하시겠습니까?'
  deleteTargetType.value = ''
  deleteTarget.value = null
}

const confirmDelete = async () => {
  if (!deleteTarget.value || !deleteTargetType.value) return

  if (deleteTargetType.value === 'room') {
    const result = await deleteRoom(deleteTarget.value.id)
    if (!result.ok) showSnack('삭제 실패')
  } else if (deleteTargetType.value === 'message') {
    const result = await deleteMessage(deleteTarget.value.id)
    if (!result.ok) showSnack('삭제 실패')
  }

  closeDeleteDialog()
}

const openImageViewer = (url, urls = []) => {
  const viewerUrls = Array.isArray(urls) && urls.length > 0 ? urls.filter(Boolean) : [url].filter(Boolean)
  if (!viewerUrls.length) return
  imageViewerUrls.value = viewerUrls
  imageViewerIndex.value = Math.max(0, viewerUrls.findIndex((item) => item === url))
  imageZoom.value = 1
  imageOffset.value = { x: 0, y: 0 }
  imageViewerOpen.value = true
}

const closeImageViewer = () => {
  imageViewerOpen.value = false
  imageViewerUrls.value = []
  imageViewerIndex.value = 0
  imageZoom.value = 1
  imageOffset.value = { x: 0, y: 0 }
  isImageDragging.value = false
}

const zoomImage = (delta) => {
  const next = imageZoom.value + delta
  imageZoom.value = Math.min(3, Math.max(0.5, Number(next.toFixed(2))))
}

const resetImageViewer = () => {
  imageZoom.value = 1
  imageOffset.value = { x: 0, y: 0 }
  isImageDragging.value = false
}

const canMovePrevImage = computed(() => imageViewerIndex.value > 0)
const canMoveNextImage = computed(() => imageViewerIndex.value < imageViewerUrls.value.length - 1)
const moveImageViewer = (delta) => {
  const next = imageViewerIndex.value + delta
  if (next < 0 || next >= imageViewerUrls.value.length) return
  imageViewerIndex.value = next
  resetImageViewer()
}

const getImageGroupGridStyle = (count) => ({
  gridTemplateColumns: `repeat(${Math.min(Math.max(Number(count) || 1, 1), 4)}, minmax(0, 120px))`,
})

const handleImageWheel = (e) => {
  e.preventDefault()
  zoomImage(e.deltaY < 0 ? 0.2 : -0.2)
}

const startImageDrag = (e) => {
  if (!imageViewerOpen.value) return
  isImageDragging.value = true
  imageDragStart.value = { x: e.clientX, y: e.clientY }
  imageDragOrigin.value = { ...imageOffset.value }
}

const moveImageDrag = (e) => {
  if (!isImageDragging.value) return
  const dx = e.clientX - imageDragStart.value.x
  const dy = e.clientY - imageDragStart.value.y
  imageOffset.value = {
    x: imageDragOrigin.value.x + dx,
    y: imageDragOrigin.value.y + dy,
  }
}

const endImageDrag = () => {
  isImageDragging.value = false
}

const handleViewerKeydown = (e) => {
  if (!imageViewerOpen.value) return
  if (e.key === 'Escape') closeImageViewer()
  if (e.key === 'ArrowLeft') moveImageViewer(-1)
  if (e.key === 'ArrowRight') moveImageViewer(1)
}

const syncMobileViewport = () => {
  if (typeof window === 'undefined') return
  const nextIsMobile = window.matchMedia('(max-width: 767px)').matches
  isMobileViewport.value = nextIsMobile
  // 데스크톱: Electron처럼 목록 항상 표시 / 모바일: 방 미선택이면 목록 표시
  if (!nextIsMobile) {
    sidebarOpen.value = true
    return
  }
  if (!activeRoomId.value) sidebarOpen.value = true
}

const syncActiveRoomReadState = async () => {
  if (!activeRoomId.value) return
  if (document.visibilityState === 'hidden') return
  const result = await markRoomAsRead(activeRoomId.value)
  if (result?.ok) {
    applyUserRead(myId.value, result.lastReadAt)
  }
  void refreshReads()
}

const handleVisibilityChange = () => {
  void syncActiveRoomReadState()
}

watch(
  () => messages.value[messages.value.length - 1]?.id ?? '',
  () => {
    const latestMessage = messages.value[messages.value.length - 1]
    if (!latestMessage) return
    if (!activeRoomId.value) return
    if (latestMessage.sender_id === myId.value) return
    void syncActiveRoomReadState()
  },
)

// 새로고침 시 세션이 onMounted보다 늦게 로드될 수 있어서
// myId watch로 처리 (immediate: true → 이미 로드됐으면 즉시 실행)
let roomsInitialized = false
watch(myId, async (newId) => {
  if (!newId || roomsInitialized) return
  roomsInitialized = true
  await startUnreadTracking(newId)
  await fetchRooms()
  await refreshUnreadCounts()
  subscribeToRooms()
}, { immediate: true })

onMounted(() => {
  syncMobileViewport()
  window.addEventListener('resize', syncMobileViewport)
  window.addEventListener('keydown', handleViewerKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void processDueScheduledMessages()
  scheduleTimer = setInterval(() => {
    void processDueScheduledMessages()
  }, 60000)
})
onBeforeUnmount(() => {
  clearPendingFiles()
  unsubscribeAll()
  if (scheduleTimer) clearInterval(scheduleTimer)
  window.removeEventListener('resize', syncMobileViewport)
  window.removeEventListener('keydown', handleViewerKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <section class="relative flex h-[calc(100dvh-56px)] overflow-hidden bg-slate-50 md:h-[calc(100vh-72px)]">

    <!-- 사이드바: 데스크톱 항상 표시, 모바일은 토글 -->
    <aside
      class="z-20 flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white md:relative md:inset-auto md:w-72"
      :class="sidebarOpen ? 'absolute inset-0 w-full' : 'hidden md:flex'"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <div class="flex min-w-0 items-center gap-2">
          <button
            v-if="activeRoomId && isMobileViewport"
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 md:hidden"
            @click="sidebarOpen = false"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <h2 class="text-base font-extrabold text-slate-900">채팅방</h2>
        </div>
        <button
          type="button"
          class="min-h-10 rounded-xl bg-indigo-600 px-4 text-sm font-extrabold text-white transition hover:bg-indigo-700 active:scale-95"
          @click="showCreateRoomDialog = true"
        >+ 새 채팅방</button>
      </div>

      <div v-if="roomsLoading" class="flex flex-1 items-center justify-center text-sm text-slate-400">로딩 중...</div>
      <div v-else-if="rooms.length === 0" class="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">
        채팅방이 없습니다.<br />새 채팅방을 만들어보세요.
      </div>
      <ul v-else class="flex-1 overflow-y-auto">
        <li
          v-for="room in rooms"
          :key="room.id"
          class="group relative cursor-pointer border-b border-slate-100 px-4 py-4 transition hover:bg-slate-50 md:py-3"
          :class="activeRoomId === room.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''"
          @click="handleSelectRoom(room)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-bold text-slate-900">{{ room.title }}</p>
                <span
                  v-if="getRoomUnreadCount(room.id) > 0"
                  class="inline-flex shrink-0 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-extrabold leading-none text-white"
                >
                  {{ formatUnreadCount(getRoomUnreadCount(room.id)) }}
                </span>
              </div>
              <p v-if="room.description" class="mt-0.5 truncate text-xs text-slate-400">{{ room.description }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">{{ room.owner_name }}</p>
            </div>
            <button
              type="button"
              class="mt-0.5 shrink-0 rounded-md p-2 text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-400 md:p-1 md:opacity-0 md:group-hover:opacity-100"
              @click.stop="handleDeleteRoom(room)"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </aside>

    <!-- 채팅 영역 + 멤버 패널 wrapper -->
    <div class="flex min-w-0 flex-1">
    <!-- 채팅 영역 -->
    <div class="min-w-0 flex-1 flex-col" :class="sidebarOpen ? 'hidden md:flex' : 'flex'">

      <!-- 헤더 -->
      <div class="flex min-h-[60px] items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 md:px-4 md:py-3.5">
        <button
          type="button"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 md:hidden"
          @click="sidebarOpen = true"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div v-if="activeRoom" class="min-w-0 flex-1">
          <h2 class="truncate text-base font-extrabold text-slate-900">{{ activeRoom.title }}</h2>
          <p v-if="activeRoom.description" class="truncate text-xs text-slate-400">{{ activeRoom.description }}</p>
        </div>
        <p v-else class="flex-1 text-sm text-slate-400">채팅방을 선택해주세요</p>
        <MessengerRoomViewTabs
          v-if="activeRoom"
          v-model="roomViewTab"
        />
        <!-- 멤버 관리 버튼 -->
        <button
          v-if="activeRoom"
          type="button"
          class="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold transition"
          :class="memberPanelOpen ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'"
          @click="memberPanelOpen ? memberPanelOpen = false : openMemberPanel()"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          멤버
          <span v-if="members.length > 0" class="rounded-full bg-indigo-100 px-1.5 text-[10px] font-extrabold text-indigo-700">{{ members.length }}</span>
        </button>
      </div>

      <!-- 작업 보드 (카드 목록) -->
      <MessengerWorkBoardPanel
        v-if="activeRoomId && roomViewTab !== 'chat'"
        ref="workBoardPanelRef"
        :room-id="activeRoomId"
        :tab="roomViewTab"
        :confirming-message-id="confirmingMessageId"
        @confirm="handleWorkConfirm"
      />

      <!-- 메시지 목록 -->
      <div v-else ref="messageListRef" class="flex-1 overflow-y-auto px-3 py-4 md:px-4">
        <div v-if="!activeRoomId" class="flex h-full items-center justify-center">
          <div class="text-center text-slate-400">
            <svg viewBox="0 0 24 24" class="mx-auto mb-3 h-12 w-12 opacity-30" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <p class="text-sm font-semibold">채팅방을 선택하세요</p>
          </div>
        </div>
        <div v-else-if="messagesLoading" class="flex h-full items-center justify-center text-sm text-slate-400">메시지 로딩 중...</div>
        <div v-else-if="groupedMessages.length === 0" class="flex h-full items-center justify-center text-sm text-slate-400">첫 메시지를 보내보세요</div>
        <div v-else class="space-y-1">
          <template v-for="(item, idx) in groupedMessages" :key="idx">

            <!-- 날짜 구분선 -->
            <div v-if="item.type === 'date'" class="my-4 flex items-center gap-3">
              <div class="h-px flex-1 bg-slate-200" />
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">{{ item.date }}</span>
              <div class="h-px flex-1 bg-slate-200" />
            </div>

            <!-- 메시지 -->
            <div
              v-else-if="item.type === 'message' || item.type === 'image-group'"
              class="group flex items-end gap-2"
              :class="(item.type === 'message' ? item.msg.sender_id : item.sender_id) === myId ? 'flex-row-reverse' : ''"
            >
              <!-- 아바타 (상대방) -->
              <div
                v-if="(item.type === 'message' ? item.msg.sender_id : item.sender_id) !== myId"
                class="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="
                  String(item.type === 'message' ? item.msg.sender_name : item.sender_name ?? '') === '시스템'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-200 text-slate-600'
                "
              >
                {{ String(item.type === 'message' ? item.msg.sender_name : item.sender_name ?? '?').charAt(0) }}
              </div>

              <div
                class="flex max-w-[min(420px,calc(100vw-96px))] flex-col gap-1 md:max-w-[420px]"
                :class="(item.type === 'message' ? item.msg.sender_id : item.sender_id) === myId ? 'items-end' : 'items-start'"
              >
                <!-- 이름 (상대방) -->
                <p
                  v-if="(item.type === 'message' ? item.msg.sender_id : item.sender_id) !== myId"
                  class="text-[11px] font-semibold"
                  :class="
                    String(item.type === 'message' ? item.msg.sender_name : item.sender_name ?? '') === '시스템'
                      ? 'text-sky-600'
                      : 'text-slate-500'
                  "
                >
                  {{ item.type === 'message' ? item.msg.sender_name : item.sender_name }}
                </p>

                <div
                  v-if="item.type === 'image-group'"
                  class="flex items-end gap-1"
                  :class="item.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <div
                    class="grid max-w-[calc(100vw-96px)] gap-1.5 rounded-2xl md:max-w-[520px]"
                    :class="item.sender_id === myId ? 'rounded-br-sm' : 'rounded-bl-sm'"
                    :style="getImageGroupGridStyle(item.messages.length)"
                  >
                    <button
                      v-for="(imageMsg, imageIndex) in item.messages"
                      :key="imageMsg.id"
                      type="button"
                      class="group/image relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      :class="item.sender_id === myId && imageIndex === item.messages.length - 1 ? 'rounded-br-sm' : item.sender_id !== myId && imageIndex === item.messages.length - 1 ? 'rounded-bl-sm' : ''"
                      @click="openImageViewer(imageMsg.file_url, item.messages.map((msg) => msg.file_url))"
                    >
                      <img
                        :src="imageMsg.file_url"
                        class="h-[96px] w-[96px] object-cover transition hover:opacity-90 sm:h-[120px] sm:w-[120px]"
                        :alt="`chat-image-${imageMsg.id}`"
                      />
                      <button
                        v-if="item.sender_id === myId"
                        type="button"
                        class="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white group-hover/image:flex hover:bg-red-500"
                        @click.stop="handleDeleteMessage(imageMsg)"
                      >
                        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </button>
                  </div>
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount
                      :count="getMessageUnreadCount(item.messages[item.messages.length - 1])"
                    />
                    <span class="text-[10px] text-slate-400">{{ formatTime(item.messages[item.messages.length - 1]?.created_at) }}</span>
                  </div>
                </div>

                <!-- 생산확인 요청 카드 -->
                <div
                  v-else-if="item.type === 'message' && isProductionRequestMessage(item.msg)"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <MessengerProductionRequestCard
                    v-if="getProductionRequestPayload(item.msg)"
                    :payload="getProductionRequestPayload(item.msg)"
                    :message-id="item.msg.id"
                    :sender-name="item.msg.sender_name"
                    :confirming="confirmingMessageId === item.msg.id"
                    @confirm="handleWorkConfirm"
                  />
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                      <button
                        v-if="item.msg.sender_id === myId"
                        type="button"
                        class="hidden rounded p-0.5 text-slate-300 hover:text-red-400 group-hover:block"
                        @click="handleDeleteMessage(item.msg)"
                      >
                        <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 작업확인 완료 카드 -->
                <div
                  v-else-if="item.type === 'message' && isProductionConfirmMessage(item.msg)"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <MessengerProductionConfirmCard
                    v-if="getProductionConfirmPayload(item.msg)"
                    :payload="getProductionConfirmPayload(item.msg)"
                    :message-id="item.msg.id"
                    :sender-name="item.msg.sender_name"
                    :confirming="confirmingMessageId === item.msg.id"
                    @confirm="handleWorkConfirm"
                  />
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                  </div>
                </div>

                <!-- 재확인 요청 카드 -->
                <div
                  v-else-if="item.type === 'message' && isProductionRecheckMessage(item.msg)"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <MessengerProductionRecheckCard
                    v-if="getProductionRecheckPayload(item.msg)"
                    :payload="getProductionRecheckPayload(item.msg)"
                    :message-id="item.msg.id"
                    :sender-name="item.msg.sender_name"
                    :confirming="confirmingMessageId === item.msg.id"
                    @confirm="handleWorkConfirm"
                  />
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                  </div>
                </div>

                <!-- 이미지 -->
                <div
                  v-else-if="item.msg.file_type === 'image' && item.msg.file_url"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <img
                    :src="item.msg.file_url"
                    class="max-w-[min(312px,calc(100vw-96px))] cursor-pointer rounded-2xl border border-slate-200 object-cover shadow-sm transition hover:opacity-90"
                    :class="item.msg.sender_id === myId ? 'rounded-br-sm' : 'rounded-bl-sm'"
                    @click="openImageViewer(item.msg.file_url)"
                  />
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                  </div>
                </div>

                <!-- 동영상 -->
                <div
                  v-else-if="item.msg.file_type === 'video' && item.msg.file_url"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <video
                    :src="item.msg.file_url"
                    controls
                    class="max-w-[min(300px,calc(100vw-96px))] rounded-2xl border border-slate-200 shadow-sm"
                    :class="item.msg.sender_id === myId ? 'rounded-br-sm' : 'rounded-bl-sm'"
                  />
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                  </div>
                </div>

                <!-- PDF -->
                <div
                  v-else-if="item.msg.file_type === 'pdf' && item.msg.file_url"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <a
                    :href="item.msg.file_url"
                    target="_blank"
                    class="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
                    :class="item.msg.sender_id === myId ? 'rounded-br-sm' : 'rounded-bl-sm'"
                  >
                    <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="currentColor">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17.5v-5h1.25c.69 0 1.25.56 1.25 1.25v2.5c0 .69-.56 1.25-1.25 1.25H8.5zm1.25-4h-.5v3h.5c.14 0 .25-.11.25-.25v-2.5c0-.14-.11-.25-.25-.25zm2.75 4v-5h2v.75h-1.25v1.25H14v.75h-1.25v2.25H12.5zm3.5 0v-5h.75v5H16z" />
                    </svg>
                    PDF 파일 보기
                  </a>
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                  </div>
                </div>

                <!-- 텍스트 버블 -->
                <div
                  v-if="item.type === 'message' && item.msg.content && !isProductionRequestMessage(item.msg) && !isProductionConfirmMessage(item.msg) && !isProductionRecheckMessage(item.msg)"
                  class="flex items-end gap-1"
                  :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
                >
                  <div
                    class="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm"
                    :class="
                      item.msg.sender_id === myId
                        ? 'rounded-br-sm bg-indigo-600 text-white'
                        : 'rounded-bl-sm bg-white text-slate-800 border border-slate-200'
                    "
                  >
                    <ChatMentionText
                      :content="item.msg.content"
                      :members="members"
                      :mine="item.msg.sender_id === myId"
                    />
                  </div>
                  <div
                    class="flex flex-col gap-0.5"
                    :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
                  >
                    <ChatReadCount :count="getMessageUnreadCount(item.msg)" />
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] text-slate-400">{{ formatTime(item.msg.created_at) }}</span>
                      <button
                        v-if="item.msg.sender_id === myId"
                        type="button"
                        class="hidden rounded p-0.5 text-slate-300 hover:text-red-400 group-hover:block"
                        @click="handleDeleteMessage(item.msg)"
                      >
                        <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 파일 미리보기 (다중) -->
      <div v-if="pendingFiles.length > 0 && roomViewTab === 'chat'" class="border-t border-slate-100 bg-white px-3 py-2.5 md:px-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-slate-500">첨부 파일 {{ pendingFiles.length }}/{{ MAX_FILES }}</span>
          <button type="button" class="text-[11px] font-semibold text-red-400 hover:text-red-600" @click="clearPendingFiles">전체 삭제</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(item, idx) in pendingFiles"
            :key="idx"
            class="group relative"
          >
            <!-- 이미지 미리보기 -->
            <img
              v-if="item.fileType === 'image' && item.previewUrl"
              :src="item.previewUrl"
              class="h-16 w-16 rounded-xl border border-slate-200 object-cover"
            />
            <!-- 동영상 아이콘 -->
            <div
              v-else-if="item.fileType === 'video'"
              class="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-800"
            >
              <svg viewBox="0 0 24 24" class="h-7 w-7 text-white" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </div>
            <!-- PDF 아이콘 -->
            <div
              v-else-if="item.fileType === 'pdf'"
              class="flex h-16 w-16 items-center justify-center rounded-xl border border-red-200 bg-red-50"
            >
              <span class="text-xs font-extrabold text-red-500">PDF</span>
            </div>
            <!-- 파일명 툴팁 -->
            <div class="absolute -bottom-5 left-0 hidden w-max max-w-[120px] truncate rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
              {{ item.name }}
            </div>
            <!-- 삭제 버튼 -->
            <button
              type="button"
              class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow hover:bg-red-500"
              @click="removePendingFile(idx)"
            >
              <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 추가 버튼 -->
          <button
            v-if="pendingFiles.length < MAX_FILES"
            type="button"
            class="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition"
            @click="fileInputRef?.click()"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 입력창 -->
      <div v-if="activeRoomId && roomViewTab === 'chat'" class="flex-shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-4">
        <MentionMemberPicker
          v-if="mentionOpen"
          :members="filteredMembers"
          :active-index="mentionIndex"
          @select="selectMention"
        />
        <div class="flex items-end gap-2">
          <!-- 파일 첨부 버튼 -->
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-40"
            :disabled="uploading || sending || pendingFiles.length >= MAX_FILES"
            @click="fileInputRef?.click()"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-extrabold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
            :disabled="uploading || sending"
            @click="drawingSearchOpen = true"
          >
            요청
          </button>
          <input
            ref="fileInputRef"
            type="file"
            :accept="ACCEPTED"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />

          <!-- 텍스트 입력 -->
          <textarea
            ref="textareaRef"
            v-model="messageInput"
            rows="1"
            class="min-h-10 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none"
            placeholder="메시지 입력"
            :disabled="sending || uploading"
            @keydown="handleKeydown"
            @input="syncMentionFromCaret"
            @click="syncMentionFromCaret"
            @keyup="syncMentionFromCaret"
          />

          <!-- 전송 버튼 -->
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
            :disabled="(!messageInput.trim() && pendingFiles.length === 0) || sending || uploading"
            @click="handleSend"
          >
            <svg v-if="!sending && !uploading" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            <svg v-else class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 멤버 관리 패널 -->
    <aside
      v-if="memberPanelOpen && activeRoom"
      class="fixed inset-x-0 bottom-0 top-[56px] z-30 flex w-full shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white md:static md:w-72"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <h3 class="text-sm font-extrabold text-slate-900">멤버 관리</h3>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="memberPanelOpen = false">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="flex flex-1 flex-col overflow-y-auto divide-y divide-slate-100">

        <!-- 현재 멤버 목록 -->
        <div class="px-4 py-3">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">현재 멤버 ({{ members.length }})</p>
          <div v-if="membersLoading" class="text-xs text-slate-400">로딩 중...</div>
          <ul v-else class="space-y-1">
            <li
              v-for="m in members"
              :key="m.user_id"
              class="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {{ String(m.display_name ?? '?').charAt(0) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-slate-800">{{ m.display_name }}</p>
                  <p class="text-[10px] text-slate-400">{{ m.role === 'owner' ? '관리자' : '멤버' }}</p>
                </div>
              </div>
              <button
                v-if="m.role !== 'owner' && m.user_id !== myId"
                type="button"
                class="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-400"
                title="내보내기"
                @click="handleKick(m.user_id)"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          </ul>
        </div>

        <!-- 초대할 직원 목록 -->
        <div class="px-4 py-3">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">초대하기</p>
          <div v-if="profilesLoading" class="text-xs text-slate-400">로딩 중...</div>
          <ul v-else class="space-y-1">
            <li
              v-for="p in allProfiles"
              :key="p.id"
              class="flex items-center justify-between rounded-lg px-2 py-1.5"
              :class="isMember(p.id) ? 'opacity-40' : 'hover:bg-slate-50'"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {{ String(p.name ?? '?').charAt(0) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-slate-800">{{ p.name }}</p>
                  <p v-if="p.department" class="text-[10px] text-slate-400">{{ p.department }}</p>
                </div>
              </div>
              <button
                v-if="!isMember(p.id)"
                type="button"
                class="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
                :disabled="inviting"
                @click="handleInvite(p.id)"
              >
                초대
              </button>
              <span v-else class="text-[11px] font-semibold text-slate-400">참여중</span>
            </li>
          </ul>
        </div>

      </div>
    </aside>

    </div><!-- end 채팅 영역 + 멤버 패널 wrapper -->

    <!-- 새 채팅방 다이얼로그 -->
    <div
      v-if="showCreateRoomDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      @click.self="showCreateRoomDialog = false"
    >
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 class="mb-4 text-lg font-extrabold text-slate-900">새 채팅방 만들기</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">채팅방 이름 *</label>
            <input
              v-model="newRoomTitle"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="채팅방 제목"
              @keydown.enter="handleCreateRoom"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">설명 (선택)</label>
            <input
              v-model="newRoomDesc"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="채팅방 설명"
            />
          </div>
          <p v-if="createRoomError" class="text-xs font-semibold text-red-500">{{ createRoomError }}</p>
        </div>
        <div class="mt-5 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            @click="showCreateRoomDialog = false"
          >취소</button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
            :disabled="isCreatingRoom"
            @click="handleCreateRoom"
          >{{ isCreatingRoom ? '생성 중...' : '만들기' }}</button>
        </div>
      </div>
    </div>

    <!-- 스낵바 -->
    <div
      v-if="snackMessage"
      class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-slate-900/95 px-8 py-5 text-lg font-bold text-white shadow-2xl"
    >
      {{ snackMessage }}
    </div>

    <div
      v-if="deleteDialogVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="closeDeleteDialog"
    >
      <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 class="text-lg font-extrabold text-slate-900">{{ deleteDialogTitle }}</h3>
        <p class="mt-3 text-sm leading-6 text-slate-600">{{ deleteDialogMessage }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="closeDeleteDialog"
          >
            취소
          </button>
          <button
            type="button"
            class="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
            @click="confirmDelete"
          >
            삭제
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="imageViewerOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      @click.self="closeImageViewer"
    >
      <div class="flex h-full w-full flex-col">
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-40"
              :disabled="!canMovePrevImage"
              @click="moveImageViewer(-1)"
            >
              이전
            </button>
            <button
              type="button"
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
              @click="zoomImage(-0.2)"
            >
              축소
            </button>
            <span class="text-sm font-semibold text-white">{{ Math.round(imageZoom * 100) }}%</span>
            <button
              type="button"
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
              @click="zoomImage(0.2)"
            >
              확대
            </button>
            <button
              type="button"
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
              @click="resetImageViewer"
            >
              원본
            </button>
            <button
              type="button"
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-40"
              :disabled="!canMoveNextImage"
              @click="moveImageViewer(1)"
            >
              다음
            </button>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="imageViewerUrls.length > 1" class="text-sm font-semibold text-white">
              {{ imageViewerIndex + 1 }} / {{ imageViewerUrls.length }}
            </span>
            <button
              type="button"
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
              @click="closeImageViewer"
            >
              닫기
            </button>
          </div>
        </div>
        <div
          class="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          @mousemove="moveImageDrag"
          @mouseup="endImageDrag"
          @mouseleave="endImageDrag"
          @wheel="handleImageWheel"
        >
          <img
            :src="currentImageViewerUrl"
            alt="chat-image-preview"
            class="max-h-none max-w-none select-none rounded-xl shadow-2xl"
            :class="isImageDragging ? 'cursor-grabbing' : 'cursor-grab'"
            :style="{
              transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageZoom})`,
              transformOrigin: 'center center',
            }"
            draggable="false"
            @mousedown.prevent="startImageDrag"
          />
        </div>
      </div>
    </div>

    <MessengerDrawingSearchDialog
      :open="drawingSearchOpen"
      @close="drawingSearchOpen = false"
      @select="openProductionRequest"
    />
    <MessengerProductionRequestDialog
      :open="productionRequestOpen"
      :product="productionRequestProduct"
      :submitting="productionRequestSubmitting"
      @close="closeProductionRequest"
      @submit="handleProductionRequestSubmit"
    />
  </section>
</template>
