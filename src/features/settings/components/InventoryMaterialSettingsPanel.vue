<script setup>
import { computed, onMounted, ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import {
  RAW_MATERIAL_TYPE,
  SUBSIDIARY_MATERIAL_TYPE,
  createInventoryMaterialCatalogItem,
  deleteInventoryMaterialCatalogItem,
  fetchInventoryMaterialCatalog,
  updateInventoryMaterialCatalogItem,
} from '@/features/inventory/services/inventory.service'

const { confirm } = useDialog()

const materialTypes = [
  { key: RAW_MATERIAL_TYPE, label: '원자재', defaultGroup: '일반강관', defaultUnit: '본' },
  { key: SUBSIDIARY_MATERIAL_TYPE, label: '부자재', defaultGroup: 'EL (나사)', defaultUnit: 'EA' },
]

const activeType = ref(RAW_MATERIAL_TYPE)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const materialItems = ref([])
const form = ref({
  material_group: '일반강관',
  spec: '',
  unit: '본',
})
const editValues = ref({})
const editingItemId = ref(null)

const activeTypeMeta = computed(() =>
  materialTypes.find((item) => item.key === activeType.value) ?? materialTypes[0],
)

const activeItems = computed(() =>
  materialItems.value
    .filter((item) => item.material_type === activeType.value)
    .sort((left, right) => {
      if (Number(left.sort_order ?? 0) !== Number(right.sort_order ?? 0)) {
        return Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
      }
      const groupCompare = String(left.material_group ?? '').localeCompare(String(right.material_group ?? ''), 'ko')
      if (groupCompare !== 0) return groupCompare
      return String(left.spec ?? '').localeCompare(String(right.spec ?? ''), 'ko', { numeric: true })
    }),
)

const resetFormForType = () => {
  form.value = {
    material_group: activeTypeMeta.value.defaultGroup,
    spec: '',
    unit: activeTypeMeta.value.defaultUnit,
  }
}

const createEditValue = (item) => ({
  material_group: item.material_group ?? '',
  spec: item.spec ?? '',
  unit: item.unit ?? '',
  is_default: item.is_default ? 'true' : 'false',
  is_active: item.is_active ? 'true' : 'false',
})

const hydrateEditValues = () => {
  editValues.value = Object.fromEntries(materialItems.value.map((item) => [item.id, createEditValue(item)]))
}

const upsertLocalItem = (item) => {
  const itemId = String(item.id)
  const index = materialItems.value.findIndex((target) => String(target.id) === itemId)
  if (index >= 0) {
    materialItems.value.splice(index, 1, item)
  } else {
    materialItems.value.push(item)
  }
  editValues.value = {
    ...editValues.value,
    [item.id]: createEditValue(item),
  }
}

const loadItems = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    materialItems.value = await fetchInventoryMaterialCatalog(null, true)
    hydrateEditValues()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '자재 품목을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

const switchType = (type) => {
  activeType.value = type
  resetFormForType()
  editingItemId.value = null
}

const handleAdd = async () => {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const createdItem = await createInventoryMaterialCatalogItem({
      material_type: activeType.value,
      material_group: form.value.material_group,
      spec: form.value.spec,
      unit: form.value.unit,
    })
    upsertLocalItem(createdItem)
    form.value = {
      ...form.value,
      spec: '',
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '자재 품목을 추가하지 못했습니다.'
  } finally {
    saving.value = false
  }
}

const startEdit = (item) => {
  editingItemId.value = item.id
  editValues.value = {
    ...editValues.value,
    [item.id]: createEditValue(item),
  }
}

const handleUpdate = async (item) => {
  if (editingItemId.value !== item.id) {
    startEdit(item)
    return
  }

  if (saving.value) return
  const next = editValues.value[item.id] ?? {}
  if (next.is_active === 'false') {
    if (!await confirm(`${item.material_group} ${item.spec} 품목을 삭제하시겠습니까?`)) return
    saving.value = true
    errorMessage.value = ''
    try {
      await deleteInventoryMaterialCatalogItem(item.id)
      materialItems.value = materialItems.value.filter((target) => String(target.id) !== String(item.id))
      const { [item.id]: _deletedEditValue, ...nextEditValues } = editValues.value
      editValues.value = nextEditValues
      editingItemId.value = null
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '자재 품목을 삭제하지 못했습니다.'
    } finally {
      saving.value = false
    }
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const updatedItem = await updateInventoryMaterialCatalogItem(item.id, {
      ...next,
      is_default: next.is_default === 'true',
      is_active: next.is_active === 'true',
    })
    upsertLocalItem(updatedItem)
    editingItemId.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '자재 품목을 수정하지 못했습니다.'
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item) => {
  if (saving.value) return
  if (!await confirm(`${item.material_group} ${item.spec} 품목을 삭제하시겠습니까?`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    await deleteInventoryMaterialCatalogItem(item.id)
    materialItems.value = materialItems.value.filter((target) => String(target.id) !== String(item.id))
    const { [item.id]: _deletedEditValue, ...nextEditValues } = editValues.value
    editValues.value = nextEditValues
    if (editingItemId.value === item.id) editingItemId.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '자재 품목을 삭제하지 못했습니다.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  resetFormForType()
  void loadItems()
})
</script>

<template>
  <div class="grid gap-5">
    <div class="border-b border-slate-200 pb-4">
      <p class="text-sm font-bold text-slate-500">자재 설정</p>
      <h1 class="mt-1 text-2xl font-extrabold text-slate-900">원자재/부자재 품목 관리</h1>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="type in materialTypes"
        :key="type.key"
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-extrabold transition-colors"
        :class="activeType === type.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
        @click="switchType(type.key)"
      >
        {{ type.label }}
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
      {{ errorMessage }}
    </div>

    <form class="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_100px_auto]" @submit.prevent="handleAdd">
      <input
        v-model="form.material_group"
        type="text"
        placeholder="품목 그룹"
        class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
      />
      <input
        v-model="form.spec"
        type="text"
        placeholder="규격"
        class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
      />
      <input
        v-model="form.unit"
        type="text"
        placeholder="단위"
        class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
      />
      <button
        type="submit"
        class="h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white disabled:opacity-40"
        :disabled="saving || !form.material_group.trim() || !form.spec.trim()"
      >
        {{ activeTypeMeta.label }} 추가
      </button>
    </form>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-slate-50 py-12 text-center text-sm font-bold text-slate-400">
      불러오는 중입니다.
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="border-b border-slate-200 px-3 py-3 text-left">품목 그룹</th>
            <th class="border-b border-slate-200 px-3 py-3 text-left">규격</th>
            <th class="w-24 border-b border-slate-200 px-3 py-3 text-left">단위</th>
            <th class="w-24 border-b border-slate-200 px-3 py-3 text-center">기본값</th>
            <th class="w-32 border-b border-slate-200 px-3 py-3 text-center">상태</th>
            <th class="w-36 border-b border-slate-200 px-3 py-3 text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in activeItems" :key="item.id" :class="item.is_active ? 'bg-white' : 'bg-slate-50 text-slate-400'">
            <td class="border-b border-slate-100 px-3 py-2">
              <input
                v-if="editingItemId === item.id"
                v-model="editValues[item.id].material_group"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-300"
              />
              <span v-else class="text-sm font-extrabold text-slate-800">{{ item.material_group }}</span>
            </td>
            <td class="border-b border-slate-100 px-3 py-2">
              <input
                v-if="editingItemId === item.id"
                v-model="editValues[item.id].spec"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-300"
              />
              <span v-else class="text-sm font-bold text-slate-800">{{ item.spec }}</span>
            </td>
            <td class="border-b border-slate-100 px-3 py-2">
              <input
                v-if="editingItemId === item.id"
                v-model="editValues[item.id].unit"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-300"
              />
              <span v-else class="text-sm font-bold text-slate-800">{{ item.unit }}</span>
            </td>
            <td class="border-b border-slate-100 px-3 py-2 text-center">
              <select
                v-if="editingItemId === item.id"
                v-model="editValues[item.id].is_default"
                class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-extrabold outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="true">기본</option>
                <option value="false">일반</option>
              </select>
              <span v-else class="text-xs font-extrabold">{{ item.is_default ? '기본' : '일반' }}</span>
            </td>
            <td class="border-b border-slate-100 px-3 py-2 text-center">
              <select
                v-if="editingItemId === item.id"
                v-model="editValues[item.id].is_active"
                class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-extrabold outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="true">사용</option>
                <option value="false">삭제</option>
              </select>
              <span
                v-else
                class="rounded-full px-2.5 py-1 text-xs font-extrabold"
                :class="item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'"
              >
                {{ item.is_active ? '사용' : '삭제' }}
              </span>
            </td>
            <td class="border-b border-slate-100 px-3 py-2">
              <div class="flex justify-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-40"
                  :disabled="saving"
                  @click="handleUpdate(item)"
                >
                  {{ editingItemId === item.id ? '저장' : '수정' }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-red-200 px-3 py-2 text-xs font-extrabold text-red-500 disabled:opacity-40"
                  :disabled="saving || !item.is_active"
                  @click="handleDelete(item)"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="activeItems.length === 0">
            <td colspan="6" class="py-12 text-center text-sm font-bold text-slate-400">
              등록된 품목이 없습니다.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
