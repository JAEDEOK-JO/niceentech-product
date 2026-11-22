<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeWorkerDepartment } from '@/features/worker/workerDepartmentOptions'

const props = defineProps({
  item: { type: Object, required: true },
  departments: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['approve', 'save', 'remove'])

const name = ref('')
const department = ref('')
const clockId = ref('')
const leave = ref(0)

watch(
  () => props.item,
  (item) => {
    name.value = item?.name || ''
    department.value = normalizeWorkerDepartment(item?.assigned_department) || item?.assigned_department || ''
    clockId.value = item?.employee_code || ''
    leave.value = Number(item?.remainingAnnualLeave ?? 0)
  },
  { immediate: true },
)

const departmentOptions = computed(() => {
  const values = props.departments.map((value) => String(value))
  if (department.value && !values.includes(department.value)) values.push(department.value)
  return values
})

const loginId = computed(() => String(props.item.email ?? '').replace(/@niceentech\.kr$/i, ''))

const joinedAt = computed(() => {
  const text = String(props.item.created_at ?? '')
  return text.length >= 10 ? text.slice(0, 10) : '-'
})

function setClockId(event) {
  clockId.value = String(event.target.value ?? '').replace(/\D/g, '').slice(0, 8)
}

function save() {
  emit('save', {
    id: props.item.id,
    name: name.value.trim(),
    assignedDepartment: department.value,
    employeeCode: clockId.value,
    remainingAnnualLeave: leave.value,
  })
}
</script>

<template>
  <tr>
    <td class="border border-slate-200 px-3 py-2">
      <input
        v-model="name"
        type="text"
        class="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5 text-center font-extrabold text-slate-900"
      />
    </td>
    <td class="border border-slate-200 px-3 py-2">
      <select
        v-model="department"
        class="w-full min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-slate-700"
      >
        <option value="">-</option>
        <option v-for="option in departmentOptions" :key="option" :value="option">{{ option }}</option>
      </select>
    </td>
    <td class="border border-slate-200 px-3 py-2">
      <input
        :value="clockId"
        inputmode="numeric"
        class="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-center font-mono font-bold text-slate-900"
        @input="setClockId"
      />
    </td>
    <td class="border border-slate-200 px-3 py-2">
      <input
        v-model.number="leave"
        type="number"
        min="0"
        step="0.5"
        class="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center font-extrabold text-slate-900"
      />
    </td>
    <td class="border border-slate-200 px-4 py-3 text-center text-slate-600">{{ loginId || '-' }}</td>
    <td class="border border-slate-200 px-4 py-3 text-center text-slate-600">{{ joinedAt }}</td>
    <td class="border border-slate-200 px-4 py-3 text-center">
      <span
        class="rounded-full px-2.5 py-1 text-[11px] font-bold"
        :class="item.activate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
      >
        {{ item.activate ? '승인' : '대기' }}
      </span>
    </td>
    <td class="border border-slate-200 px-3 py-2">
      <div class="flex flex-wrap justify-center gap-1.5">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-extrabold text-slate-700 disabled:opacity-40"
          :disabled="saving"
          @click="save"
        >
          저장
        </button>
        <button
          v-if="!item.activate"
          type="button"
          class="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
          :disabled="saving"
          @click="emit('approve', item)"
        >
          승인
        </button>
        <button
          type="button"
          class="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-extrabold text-red-600 disabled:opacity-40"
          :disabled="saving"
          @click="emit('remove', item)"
        >
          삭제
        </button>
      </div>
    </td>
  </tr>
</template>
