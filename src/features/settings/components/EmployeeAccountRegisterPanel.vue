<script setup>
import { computed, reactive, ref } from 'vue'
import {
  PROFILE_DEPARTMENT_OPTIONS,
  PROFILE_POSITION_OPTIONS,
  PROFILE_ROLE_OPTIONS,
  PROFILE_ROLES,
  PROFILE_WORK_MAN_OPTIONS,
} from '@/constants/profileOptions'
import { registerEmployeeAccount } from '@/features/settings/services/employeeAccount.service'

const emit = defineEmits(['registered'])

const form = reactive({
  emailId: '',
  password: '',
  name: '',
  department: PROFILE_DEPARTMENT_OPTIONS[0],
  position: PROFILE_POSITION_OPTIONS[0],
  phone: '',
  role: PROFILE_ROLES.user,
  workMan: '없음',
  activate: true,
})

const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

const canSubmit = computed(() =>
  String(form.emailId).trim() &&
  String(form.password).length >= 6 &&
  String(form.name).trim() &&
  String(form.role).trim() &&
  String(form.workMan).trim(),
)

const formatPhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

const handlePhoneInput = (event) => {
  const formatted = formatPhone(event?.target?.value)
  form.phone = formatted
  if (event?.target) event.target.value = formatted
}

const resetForm = () => {
  form.emailId = ''
  form.password = ''
  form.name = ''
  form.department = PROFILE_DEPARTMENT_OPTIONS[0]
  form.position = PROFILE_POSITION_OPTIONS[0]
  form.phone = ''
  form.role = PROFILE_ROLES.user
  form.workMan = '없음'
  form.activate = true
}

const handleSubmit = async () => {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await registerEmployeeAccount(form)
    message.value = '사원 계정이 등록되었습니다.'
    emit('registered')
    resetForm()
  } catch (error) {
    const code = error?.detail?.error || error?.message || ''
    const messages = {
      forbidden: 'admin 계정만 사원등록을 할 수 있습니다.',
      duplicate_email: '이미 등록된 이메일입니다.',
      invalid_input: '필수 입력값을 확인해주세요.',
      missing_config: '서버 설정이 누락되었습니다.',
    }
    errorMessage.value = messages[code] ?? '등록 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="bg-white">
    <div class="border-b border-slate-200 pb-4">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-red-500">ROOT ADMIN</p>
      <h1 class="mt-1 text-2xl font-extrabold text-slate-900">사원등록</h1>
      <p class="mt-2 text-sm text-slate-500">로그인 가능한 사원 계정을 생성하고 기본 권한을 설정합니다.</p>
    </div>

    <form class="mt-6 grid gap-5" @submit.prevent="handleSubmit">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          이메일 아이디
          <div class="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white">
            <input v-model="form.emailId" type="text" autocomplete="off" class="min-w-0 flex-1 px-3 text-sm font-semibold text-slate-900 outline-none" />
            <span class="flex shrink-0 items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500">@niceentech.kr</span>
          </div>
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          초기 비밀번호
          <input v-model="form.password" type="password" autocomplete="new-password" class="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900" />
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          이름
          <input v-model="form.name" type="text" class="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900" />
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          연락처
          <input
            :value="form.phone"
            type="tel"
            inputmode="numeric"
            placeholder="010-1111-1111"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            @input="handlePhoneInput"
          />
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          부서
          <select v-model="form.department" class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
            <option v-for="department in PROFILE_DEPARTMENT_OPTIONS" :key="department" :value="department">{{ department }}</option>
          </select>
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          직급
          <select v-model="form.position" class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
            <option v-for="position in PROFILE_POSITION_OPTIONS" :key="position" :value="position">{{ position }}</option>
          </select>
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          권한
          <select v-model="form.role" class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
            <option v-for="role in PROFILE_ROLE_OPTIONS" :key="role" :value="role">{{ role }}</option>
          </select>
        </label>
        <label class="grid gap-1.5 text-sm font-bold text-slate-700">
          작업라인
          <select v-model="form.workMan" class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
            <option v-for="workMan in PROFILE_WORK_MAN_OPTIONS" :key="workMan" :value="workMan">{{ workMan }}</option>
          </select>
        </label>
      </div>

      <label class="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        <input v-model="form.activate" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
        활성 계정
      </label>

      <div v-if="message" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{{ message }}</div>
      <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{{ errorMessage }}</div>

      <div class="flex justify-end">
        <button
          type="submit"
          class="h-11 rounded-xl bg-slate-900 px-5 text-sm font-extrabold text-white disabled:opacity-40"
          :disabled="!canSubmit || loading"
        >
          {{ loading ? '등록 중...' : '사원등록' }}
        </button>
      </div>
    </form>
  </section>
</template>
