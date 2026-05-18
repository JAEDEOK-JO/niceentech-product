<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import {
  createEmployeeOptionSetting,
  deleteEmployeeOptionSetting,
  fetchEmployeeOptionSettings,
  updateEmployeeOptionSetting,
  type EmployeeOptionCategory,
  type EmployeeOptionSetting,
} from '@/features/attendance/services/employeeOptions.service'

const { confirm } = useDialog()

const CATEGORY_LABELS: Record<EmployeeOptionCategory, string> = {
  department: '부서',
  assigned_department: '담당부서',
  nationality: '국적',
}

const CATEGORY_PLACEHOLDERS: Record<EmployeeOptionCategory, string> = {
  department: '예: 생산부',
  assigned_department: '예: 메인관',
  nationality: '예: 한국',
}

const categories: EmployeeOptionCategory[] = ['department', 'assigned_department', 'nationality']

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const settings = ref<EmployeeOptionSetting[]>([])
const newValues = ref<Record<EmployeeOptionCategory, string>>({
  department: '',
  assigned_department: '',
  nationality: '',
})
const editValues = ref<Record<number, string>>({})

const groupedSettings = computed(() => {
  const groups: Record<EmployeeOptionCategory, EmployeeOptionSetting[]> = {
    department: [],
    assigned_department: [],
    nationality: [],
  }

  for (const setting of settings.value) {
    groups[setting.category]?.push(setting)
  }

  for (const category of categories) {
    groups[category].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
      return left.value.localeCompare(right.value, 'ko')
    })
  }

  return groups
})

async function loadSettings() {
  loading.value = true
  errorMessage.value = ''
  try {
    settings.value = await fetchEmployeeOptionSettings()
    editValues.value = Object.fromEntries(settings.value.map((item) => [item.id, item.value]))
  } catch {
    errorMessage.value = '선택값을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function handleAdd(category: EmployeeOptionCategory) {
  const value = newValues.value[category].trim()
  if (!value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await createEmployeeOptionSetting(category, value)
    newValues.value[category] = ''
    await loadSettings()
  } catch {
    errorMessage.value = '추가하지 못했습니다. 이미 등록된 값인지 확인해주세요.'
  } finally {
    saving.value = false
  }
}

async function handleUpdate(setting: EmployeeOptionSetting) {
  const value = String(editValues.value[setting.id] ?? '').trim()
  if (!value || value === setting.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await updateEmployeeOptionSetting(setting.id, value)
    await loadSettings()
  } catch {
    errorMessage.value = '수정하지 못했습니다. 이미 등록된 값인지 확인해주세요.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(setting: EmployeeOptionSetting) {
  if (saving.value) return
  if (!await confirm(`${CATEGORY_LABELS[setting.category]} '${setting.value}' 항목을 삭제하시겠습니까?`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    await deleteEmployeeOptionSetting(setting.id)
    await loadSettings()
  } catch {
    errorMessage.value = '삭제하지 못했습니다.'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="grid gap-5">
    <div class="border-b border-slate-200 pb-4">
      <p class="text-sm font-bold text-slate-500">직원 설정</p>
      <h1 class="mt-1 text-2xl font-extrabold text-slate-900">직원 선택값 관리</h1>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-slate-50 py-12 text-center text-sm font-bold text-slate-400">
      불러오는 중입니다.
    </div>

    <div v-else class="grid gap-4">
      <section
        v-for="category in categories"
        :key="category"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-base font-extrabold text-slate-900">{{ CATEGORY_LABELS[category] }}</h2>
          <span class="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-500">
            {{ groupedSettings[category].length }}개
          </span>
        </div>

        <form class="mb-3 flex gap-2" @submit.prevent="handleAdd(category)">
          <input
            v-model="newValues[category]"
            type="text"
            :placeholder="CATEGORY_PLACEHOLDERS[category]"
            class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            type="submit"
            class="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
            :disabled="saving || !newValues[category].trim()"
          >
            추가
          </button>
        </form>

        <div class="grid gap-2">
          <div
            v-for="setting in groupedSettings[category]"
            :key="setting.id"
            class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
          >
            <input
              v-model="editValues[setting.id]"
              type="text"
              class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600 disabled:opacity-40"
              :disabled="saving || !String(editValues[setting.id] ?? '').trim() || editValues[setting.id] === setting.value"
              @click="handleUpdate(setting)"
            >
              수정
            </button>
            <button
              type="button"
              class="rounded-lg border border-red-200 px-3 py-2 text-xs font-extrabold text-red-500 disabled:opacity-40"
              :disabled="saving"
              @click="handleDelete(setting)"
            >
              삭제
            </button>
          </div>

          <div
            v-if="groupedSettings[category].length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-bold text-slate-400"
          >
            등록된 항목이 없습니다.
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
