<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useDialog } from '@/composables/useDialog'
import CncListTable from './CncListTable.vue'
import CncMobileList from './CncMobileList.vue'
import CncRegisterDialog from './CncRegisterDialog.vue'
import CncEditDialog from './CncEditDialog.vue'
import { useCncItems } from '../composables/useCncItems'
import {
  createCncItem,
  deleteCncItem,
  updateCncItem,
  updateCncItemCompleted,
} from '../services/cnc.service'
import { canManageCnc } from '../utils/cncPermission'
import type { CncItem, CncItemForm } from '../types/cnc'

const props = withDefaults(
  defineProps<{
    standalone?: boolean
  }>(),
  {
    standalone: false,
  },
)

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)
const { confirm } = useDialog()
const { items, loading, applySortedItems } = useCncItems()

const canManage = computed(() => canManageCnc(profile.value))

const sectionClass = computed(() => (
  props.standalone ? 'min-h-[calc(100vh-53px)]' : 'min-h-[calc(100vh-72px)]'
))

const saving = ref(false)
const updating = ref(false)
const deleting = ref(false)
const updatingId = ref<number | null>(null)
const registerDialogOpen = ref(false)
const editDialogOpen = ref(false)
const editingItem = ref<CncItem | null>(null)
const errorMessage = ref('')

const handleRegisterSubmit = async (form: CncItemForm) => {
  const userId = session.value?.user?.id ?? ''
  if (!userId) return

  saving.value = true
  errorMessage.value = ''
  try {
    const created = await createCncItem(form, userId)
    applySortedItems([created, ...items.value])
    registerDialogOpen.value = false
  } catch {
    errorMessage.value = '등록에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

const openEditDialog = (item: CncItem) => {
  if (!canManage.value) return
  editingItem.value = item
  editDialogOpen.value = true
}

const closeEditDialog = () => {
  if (updating.value || deleting.value) return
  editDialogOpen.value = false
  editingItem.value = null
}

const handleEditSubmit = async (form: CncItemForm) => {
  if (!editingItem.value) return

  updating.value = true
  errorMessage.value = ''
  try {
    const updated = await updateCncItem(editingItem.value.id, form)
    applySortedItems(items.value.map((item) => (item.id === updated.id ? updated : item)))
    editDialogOpen.value = false
    editingItem.value = null
  } catch {
    errorMessage.value = '수정에 실패했습니다.'
  } finally {
    updating.value = false
  }
}

const handleDelete = async () => {
  if (!editingItem.value) return
  if (!await confirm('삭제하시겠습니까?')) return

  const targetId = editingItem.value.id
  deleting.value = true
  errorMessage.value = ''
  try {
    await deleteCncItem(targetId)
    applySortedItems(items.value.filter((item) => item.id !== targetId))
    editDialogOpen.value = false
    editingItem.value = null
  } catch {
    errorMessage.value = '삭제에 실패했습니다.'
  } finally {
    deleting.value = false
  }
}

const handleToggleCompleted = async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
  updatingId.value = id
  errorMessage.value = ''
  try {
    const updated = await updateCncItemCompleted(id, isCompleted)
    applySortedItems(items.value.map((item) => (item.id === id ? updated : item)))
  } catch {
    errorMessage.value = '상태 변경에 실패했습니다.'
  } finally {
    updatingId.value = null
  }
}
</script>

<template>
  <section class="bg-slate-50" :class="sectionClass">
    <div class="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 v-if="!standalone" class="text-2xl font-extrabold text-slate-900">CNC</h1>
        <div v-else class="flex-1" />
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="!standalone"
            variant="outline"
            class="h-9 px-4 text-sm"
            @click="router.push({ name: 'main' })"
          >
            생산계획표
          </Button>
          <Button class="h-9 bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800" @click="registerDialogOpen = true">
            등록
          </Button>
        </div>
      </div>

      <p v-if="errorMessage" class="mb-4 text-sm font-bold text-red-600">{{ errorMessage }}</p>

      <div class="hidden md:block">
        <CncListTable
          :items="items"
          :loading="loading"
          :updating-id="updatingId"
          :can-manage="canManage"
          @toggle-completed="handleToggleCompleted"
          @edit-area="openEditDialog"
        />
      </div>
    </div>

    <div class="md:hidden">
      <CncMobileList
        :items="items"
        :loading="loading"
        :updating-id="updatingId"
        :can-manage="canManage"
        @toggle-completed="handleToggleCompleted"
        @edit-area="openEditDialog"
      />
    </div>

    <CncRegisterDialog
      :open="registerDialogOpen"
      :saving="saving"
      @close="registerDialogOpen = false"
      @submit="handleRegisterSubmit"
    />

    <CncEditDialog
      :open="editDialogOpen"
      :item="editingItem"
      :saving="updating"
      :deleting="deleting"
      @close="closeEditDialog"
      @submit="handleEditSubmit"
      @delete="handleDelete"
    />
  </section>
</template>
