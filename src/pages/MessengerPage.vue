<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useMessenger } from '@/composables/useMessenger'

const { session } = useAuth()
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
  deleteMessage,
  selectRoom,
  subscribeToRooms,
  unsubscribeAll,
} = useMessenger(session)

const MAX_FILES = 10
const ACCEPTED = 'image/*,video/*,application/pdf,.pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp,.tiff,.mp4,.mov,.avi,.mkv,.webm'

const messageListRef = ref(null)
const fileInputRef = ref(null)
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
const myId = computed(() => session.value?.user?.id ?? '')

const showSnack = (msg) => {
  snackMessage.value = msg
  if (snackTimer) clearTimeout(snackTimer)
  snackTimer = setTimeout(() => { snackMessage.value = '' }, 2200)
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
  for (const msg of messages.value) {
    const date = formatDate(msg.created_at)
    if (date !== lastDate) { groups.push({ type: 'date', date }); lastDate = date }
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

const handleSelectRoom = async (room) => { await selectRoom(room.id) }

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
  if (!confirm(`"${room.title}" 채팅방을 삭제할까요?`)) return
  const result = await deleteRoom(room.id)
  if (!result.ok) showSnack('삭제 실패')
}

const handleSend = async () => {
  if (!activeRoomId.value) return
  if (!messageInput.value.trim() && pendingFiles.value.length === 0) return

  const content = messageInput.value
  const files = pendingFiles.value.map((p) => p.file)
  messageInput.value = ''
  clearPendingFiles()

  const result = await sendMessages({ roomId: activeRoomId.value, content, files })
  if (!result.ok) {
    showSnack('전송 실패')
    messageInput.value = content
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

const handleDeleteMessage = async (msg) => {
  if (msg.sender_id !== myId.value) return
  await deleteMessage(msg.id)
}

onMounted(async () => {
  await fetchRooms()
  subscribeToRooms()
})
onBeforeUnmount(() => {
  clearPendingFiles()
  unsubscribeAll()
})
</script>

<template>
  <section class="flex h-[calc(100vh-72px)] bg-slate-50">

    <!-- 사이드바 -->
    <aside
      class="flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 overflow-hidden"
      :class="sidebarOpen ? 'w-72' : 'w-0'"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <h2 class="text-base font-extrabold text-slate-900">채팅방</h2>
        <button
          type="button"
          class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition"
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
          class="group relative cursor-pointer border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50"
          :class="activeRoomId === room.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''"
          @click="handleSelectRoom(room)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-slate-900">{{ room.title }}</p>
              <p v-if="room.description" class="mt-0.5 truncate text-xs text-slate-400">{{ room.description }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">{{ room.owner_name }}</p>
            </div>
            <button
              type="button"
              class="mt-0.5 shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
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

    <!-- 채팅 영역 -->
    <div class="flex flex-1 flex-col min-w-0">

      <!-- 헤더 -->
      <div class="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3.5">
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div v-if="activeRoom" class="min-w-0">
          <h2 class="truncate text-base font-extrabold text-slate-900">{{ activeRoom.title }}</h2>
          <p v-if="activeRoom.description" class="truncate text-xs text-slate-400">{{ activeRoom.description }}</p>
        </div>
        <p v-else class="text-sm text-slate-400">채팅방을 선택해주세요</p>
      </div>

      <!-- 메시지 목록 -->
      <div ref="messageListRef" class="flex-1 overflow-y-auto px-4 py-4">
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
              v-else-if="item.type === 'message'"
              class="group flex items-end gap-2"
              :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''"
            >
              <!-- 아바타 (상대방) -->
              <div
                v-if="item.msg.sender_id !== myId"
                class="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600"
              >
                {{ String(item.msg.sender_name ?? '?').charAt(0) }}
              </div>

              <div
                class="flex max-w-[70%] flex-col gap-1"
                :class="item.msg.sender_id === myId ? 'items-end' : 'items-start'"
              >
                <!-- 이름 (상대방) -->
                <p v-if="item.msg.sender_id !== myId" class="text-[11px] font-semibold text-slate-500">{{ item.msg.sender_name }}</p>

                <!-- 이미지 -->
                <img
                  v-if="item.msg.file_type === 'image' && item.msg.file_url"
                  :src="item.msg.file_url"
                  class="max-w-[260px] cursor-pointer rounded-2xl border border-slate-200 object-cover shadow-sm transition hover:opacity-90"
                  :class="item.msg.sender_id === myId ? 'rounded-br-sm' : 'rounded-bl-sm'"
                  @click="window.open(item.msg.file_url, '_blank')"
                />

                <!-- 동영상 -->
                <video
                  v-else-if="item.msg.file_type === 'video' && item.msg.file_url"
                  :src="item.msg.file_url"
                  controls
                  class="max-w-[300px] rounded-2xl border border-slate-200 shadow-sm"
                  :class="item.msg.sender_id === myId ? 'rounded-br-sm' : 'rounded-bl-sm'"
                />

                <!-- PDF -->
                <a
                  v-else-if="item.msg.file_type === 'pdf' && item.msg.file_url"
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

                <!-- 텍스트 버블 -->
                <div
                  v-if="item.msg.content"
                  class="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm"
                  :class="
                    item.msg.sender_id === myId
                      ? 'rounded-br-sm bg-indigo-600 text-white'
                      : 'rounded-bl-sm bg-white text-slate-800 border border-slate-200'
                  "
                >
                  {{ item.msg.content }}
                </div>

                <!-- 시간 + 삭제 -->
                <div class="flex items-center gap-1.5" :class="item.msg.sender_id === myId ? 'flex-row-reverse' : ''">
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
          </template>
        </div>
      </div>

      <!-- 파일 미리보기 (다중) -->
      <div v-if="pendingFiles.length > 0" class="border-t border-slate-100 bg-white px-4 py-2.5">
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
      <div v-if="activeRoomId" class="border-t border-slate-200 bg-white px-4 py-3">
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
            v-model="messageInput"
            rows="1"
            class="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none transition"
            placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
            :disabled="sending || uploading"
            @keydown="handleKeydown"
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
              placeholder="예: 현장A 작업팀"
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
  </section>
</template>
