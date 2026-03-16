<script setup>
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'

const props = defineProps({
  form: { type: Object, required: true },
  managers: { type: Array, default: () => [] },
  loadingManagers: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
  fullNamePreview: { type: String, default: '' },
})

const emit = defineEmits(['go-back', 'update-form', 'submit'])

const calendarWeekLabels = ['일', '월', '화', '수', '목', '금', '토']
const isCalendarDialogOpen = ref(false)
const activeDateField = ref('')
const localCalendarValue = ref('')
const localCalendarMonth = ref(new Date())
const monthLabels = ['01월', '02월', '03월', '04월', '05월', '06월', '07월', '08월', '09월', '10월', '11월', '12월']

const parseCompactDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (!matched) return null
  const [, y, m, d] = matched
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

const parseMonthValue = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})$/)
  if (!matched) return null
  const [, y, m] = matched
  const date = new Date(Number(y), Number(m) - 1, 1)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

const formatCompactDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

const formatIsoDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatMonthValue = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const formatDisplayDate = (value) => {
  const parsed = parseCompactDate(value)
  if (!parsed) return ''
  return `${parsed.getFullYear()}년 ${String(parsed.getMonth() + 1).padStart(2, '0')}월 ${String(parsed.getDate()).padStart(2, '0')}일`
}

const formatDisplayMonth = (value) => {
  const parsed = parseMonthValue(value)
  if (!parsed) return ''
  return `${parsed.getFullYear()}년 ${String(parsed.getMonth() + 1).padStart(2, '0')}월`
}

const syncCalendarMonth = (value) => {
  const parsed = activeDateField.value === 'registrationMonth' ? parseMonthValue(value) : parseCompactDate(value)
  const base = parsed ?? new Date()
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth(), 1)
}

watch(
  () => [props.form.registrationMonth, props.form.startDate, props.form.endDate],
  () => {
    if (!isCalendarDialogOpen.value) return
    let sourceValue = ''
    if (activeDateField.value === 'registrationMonth') sourceValue = props.form.registrationMonth
    else if (activeDateField.value === 'startDate') sourceValue = props.form.startDate
    else sourceValue = props.form.endDate
    localCalendarValue.value = String(sourceValue ?? '')
    syncCalendarMonth(localCalendarValue.value)
  },
)

const isMonthPickerMode = computed(() => activeDateField.value === 'registrationMonth')

const calendarMonthLabel = computed(() => {
  const base = localCalendarMonth.value
  if (isMonthPickerMode.value) return `${base.getFullYear()}년`
  return `${base.getFullYear()}년 ${String(base.getMonth() + 1).padStart(2, '0')}월`
})

const calendarWeeks = computed(() => {
  const monthStart = new Date(localCalendarMonth.value.getFullYear(), localCalendarMonth.value.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      date.setHours(0, 0, 0, 0)
      return {
        key: formatCompactDate(date),
        isoKey: formatIsoDate(date),
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === localCalendarMonth.value.getMonth(),
        isSelected: formatCompactDate(date) === String(localCalendarValue.value ?? ''),
      }
    }),
  )
})

const monthOptions = computed(() =>
  monthLabels.map((label, index) => {
    const date = new Date(localCalendarMonth.value.getFullYear(), index, 1)
    return {
      key: formatMonthValue(date),
      label,
      isSelected: formatMonthValue(date) === String(localCalendarValue.value ?? ''),
    }
  }),
)

const openCalendarDialog = (field) => {
  activeDateField.value = field
  localCalendarValue.value = String(props.form?.[field] ?? '')
  syncCalendarMonth(localCalendarValue.value)
  isCalendarDialogOpen.value = true
}

const closeCalendarDialog = () => {
  isCalendarDialogOpen.value = false
  activeDateField.value = ''
}

const moveCalendarMonth = (delta) => {
  const base = localCalendarMonth.value
  if (isMonthPickerMode.value) {
    localCalendarMonth.value = new Date(base.getFullYear() + delta, base.getMonth(), 1)
    return
  }
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectCalendarDate = (day) => {
  if (!activeDateField.value) return
  localCalendarValue.value = day.key
  emit('update-form', activeDateField.value, day.key)
  closeCalendarDialog()
}

const dialogTitle = computed(() => {
  if (activeDateField.value === 'registrationMonth') return '등록일 선택'
  if (activeDateField.value === 'startDate') return '착공일 선택'
  return '준공일 선택'
})
</script>

<template>
  <section class="min-h-screen bg-white">
    <main class="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900 md:text-2xl">회사등록</h1>
          <p class="mt-1 text-sm text-slate-500">회사명과 현장명을 등록하면 생산등록 검색에 바로 사용할 수 있습니다.</p>
        </div>
        <Button class="h-9 px-4 text-sm" variant="outline" @click="emit('go-back')">돌아가기</Button>
      </div>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">회사명</p>
            <Input
              :model-value="form.company"
              placeholder="회사명 입력"
              @update:model-value="emit('update-form', 'company', $event)"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">현장명</p>
            <Input
              :model-value="form.place"
              placeholder="현장명 입력"
              @update:model-value="emit('update-form', 'place', $event)"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">총헤드수</p>
            <Input
              :model-value="form.totalHeadCount"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder="숫자만 입력"
              @update:model-value="emit('update-form', 'totalHeadCount', $event)"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">건물종류</p>
            <select
              class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              :value="form.companyType"
              @change="emit('update-form', 'companyType', $event.target.value)"
            >
              <option value="아파트">아파트</option>
              <option value="물류센터">물류센터</option>
              <option value="5층 미만">5층 미만</option>
              <option value="15층 미만">15층 미만</option>
              <option value="오피스텔">오피스텔</option>
            </select>
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">소장 이름</p>
            <Input
              :model-value="form.directorName"
              placeholder="소장 이름 입력"
              @update:model-value="emit('update-form', 'directorName', $event)"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">소장 전화번호</p>
            <Input
              :model-value="form.directorPhone"
              placeholder="예: 010-1111-1111"
              @update:model-value="emit('update-form', 'directorPhone', $event)"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">사업자등록번호</p>
            <Input
              :model-value="form.businessRegistrationNumber"
              placeholder="숫자만 입력"
              @update:model-value="emit('update-form', 'businessRegistrationNumber', $event)"
            />
          </div>
          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">현장 주소</p>
            <textarea
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              rows="1"
              :value="form.siteAddress"
              placeholder="현장 주소 입력"
              @input="emit('update-form', 'siteAddress', $event.target.value)"
            />
          </div>

          <div class="md:col-span-2">
            <div class="grid gap-5 md:grid-cols-3">
              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">등록일</p>
                <button
                  type="button"
                  class="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-left text-slate-900 transition hover:bg-slate-50"
                  @click="openCalendarDialog('registrationMonth')"
                >
                  <span :class="form.registrationMonth ? 'text-slate-900' : 'text-slate-400'">
                    {{ formatDisplayMonth(form.registrationMonth) || '등록일 선택' }}
                  </span>
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 fill-none stroke-current text-slate-500" stroke-width="2">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                </button>
                <p class="mt-2 text-xs text-slate-500">선택한 월의 1일 기준으로 저장됩니다.</p>
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">착공일</p>
                <button
                  type="button"
                  class="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-left text-slate-900 transition hover:bg-slate-50"
                  @click="openCalendarDialog('startDate')"
                >
                  <span :class="form.startDate ? 'text-slate-900' : 'text-slate-400'">
                    {{ formatDisplayDate(form.startDate) || '착공일 선택' }}
                  </span>
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 fill-none stroke-current text-slate-500" stroke-width="2">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                </button>
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">준공일</p>
                <button
                  type="button"
                  class="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-left text-slate-900 transition hover:bg-slate-50"
                  @click="openCalendarDialog('endDate')"
                >
                  <span :class="form.endDate ? 'text-slate-900' : 'text-slate-400'">
                    {{ formatDisplayDate(form.endDate) || '준공일 선택' }}
                  </span>
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 fill-none stroke-current text-slate-500" stroke-width="2">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">담당자</p>
            <select
              class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              :value="form.managerId"
              @change="emit('update-form', 'managerId', $event.target.value)"
            >
              <option value="">담당자 미지정</option>
              <option v-for="item in managers" :key="item.id" :value="item.id">
                {{ item.name || '이름없음' }}{{ item.department ? ` (${item.department})` : '' }}
              </option>
            </select>
            <p class="mt-2 text-xs text-slate-500">
              {{ loadingManagers ? '담당자 목록 불러오는 중...' : '등록 후 생산등록 화면에서 담당자가 자동으로 채워집니다.' }}
            </p>
          </div>
        </div>

        <p v-if="saveError" class="mt-4 text-sm font-bold text-red-600">{{ saveError }}</p>

        <div class="mt-6 flex justify-end gap-2">
          <Button class="h-10 px-5 text-sm" variant="outline" @click="emit('go-back')">취소</Button>
          <Button class="h-10 px-5 text-sm" :disabled="saving" @click="emit('submit')">
            {{ saving ? '저장 중...' : '회사 등록' }}
          </Button>
        </div>
      </div>
    </main>

    <div
      v-if="isCalendarDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      @click.self="closeCalendarDialog"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">{{ dialogTitle }}</h2>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="closeCalendarDialog">닫기</button>
        </div>

        <div class="mt-4">
          <div class="mb-3 flex items-center justify-between">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              @click="moveCalendarMonth(-1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <p class="text-sm font-extrabold text-slate-900">{{ calendarMonthLabel }}</p>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              @click="moveCalendarMonth(1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div v-if="isMonthPickerMode" class="grid grid-cols-3 gap-2">
            <button
              v-for="month in monthOptions"
              :key="month.key"
              type="button"
              class="flex h-12 items-center justify-center rounded-lg border text-sm transition"
              :class="
                month.isSelected
                  ? 'border-slate-900 bg-slate-900 font-extrabold text-white'
                  : 'border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50'
              "
              @click="selectCalendarDate(month)"
            >
              {{ month.label }}
            </button>
          </div>

          <div v-else class="grid grid-cols-7 gap-1">
            <div
              v-for="label in calendarWeekLabels"
              :key="label"
              class="flex h-8 items-center justify-center text-xs font-bold text-slate-500"
            >
              {{ label }}
            </div>
            <button
              v-for="day in calendarWeeks.flat()"
              :key="day.isoKey"
              type="button"
              class="flex h-11 items-center justify-center rounded-lg border text-sm transition"
              :class="[
                day.isSelected
                  ? 'border-slate-900 bg-slate-900 font-extrabold text-white'
                  : 'border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50',
                !day.isCurrentMonth ? 'opacity-45' : '',
              ]"
              @click="selectCalendarDate(day)"
            >
              {{ day.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
