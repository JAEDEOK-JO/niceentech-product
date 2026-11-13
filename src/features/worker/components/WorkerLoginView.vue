<script setup>
import { ref } from 'vue'
import { UserRound } from 'lucide-vue-next'
import Card from '@/components/ui/card/Card.vue'
import Input from '@/components/ui/input/Input.vue'
import Button from '@/components/ui/button/Button.vue'
import { fetchWorkerDepartments } from '../services/workerDepartments'
import { registerWorker } from '../services/registerWorker'

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['login'])

const mode = ref('login')
const id = ref('')
const password = ref('')
const passwordConfirm = ref('')
const name = ref('')
const assignedDepartments = ref([])
const assignedDepartment = ref('')
const departmentsLoading = ref(false)
const signupLoading = ref(false)
const signupMessage = ref('')
const statusMessage = ref('')

const submitLogin = () => {
  emit('login', { id: id.value, password: password.value })
}

const openSignup = async () => {
  signupMessage.value = ''
  mode.value = 'signup'
  if (assignedDepartments.value.length > 0) return
  departmentsLoading.value = true
  const result = await fetchWorkerDepartments()
  departmentsLoading.value = false
  if (!result.ok) {
    signupMessage.value = result.message
    return
  }
  assignedDepartments.value = result.departments
  assignedDepartment.value = result.departments[0]
}

const openLogin = () => {
  signupMessage.value = ''
  mode.value = 'login'
}

const submitSignup = async () => {
  if (signupLoading.value) return
  if (password.value !== passwordConfirm.value) {
    signupMessage.value = '비밀번호가 다릅니다'
    return
  }
  signupLoading.value = true
  signupMessage.value = ''
  const result = await registerWorker({
    id: id.value,
    password: password.value,
    name: name.value,
    assignedDepartment: assignedDepartment.value,
  })
  signupLoading.value = false
  if (!result.ok) {
    signupMessage.value = result.message
    return
  }
  signupMessage.value = ''
  statusMessage.value = '승인 대기'
  mode.value = 'login'
}
</script>

<template>
  <section class="mx-auto flex min-h-dvh w-full max-w-[480px] items-center px-6">
    <Card class="w-full p-8">
      <div class="mb-6 flex items-center justify-center gap-2">
        <UserRound class="h-5 w-5 text-blue-600" />
        <h1 class="text-xl font-bold">NICEENTECH</h1>
      </div>

      <template v-if="mode === 'login'">
        <div class="space-y-3">
          <label class="text-sm font-semibold">아이디</label>
          <Input v-model="id" placeholder="test01" />
        </div>
        <div class="mt-4 space-y-3">
          <label class="text-sm font-semibold">비밀번호</label>
          <Input v-model="password" type="password" placeholder="비밀번호 입력" @keyup.enter="submitLogin" />
        </div>
        <Button class="mt-6 w-full" :disabled="loading" @click="submitLogin">
          {{ loading ? '로그인 중...' : '로그인' }}
        </Button>
        <Button class="mt-3 w-full" variant="outline" type="button" @click="openSignup">회원가입</Button>
        <p v-if="statusMessage || message" class="mt-4 text-center text-sm text-slate-600">{{ statusMessage || message }}</p>
      </template>

      <template v-else>
        <div class="space-y-3">
          <label class="text-sm font-semibold">아이디</label>
          <Input v-model="id" autocomplete="off" />
        </div>
        <div class="mt-4 space-y-3">
          <label class="text-sm font-semibold">비밀번호</label>
          <Input v-model="password" type="password" autocomplete="new-password" />
        </div>
        <div class="mt-4 space-y-3">
          <label class="text-sm font-semibold">비밀번호 확인</label>
          <Input v-model="passwordConfirm" type="password" autocomplete="new-password" />
        </div>
        <div class="mt-4 space-y-3">
          <label class="text-sm font-semibold">이름</label>
          <Input v-model="name" />
        </div>
        <div class="mt-4 space-y-3">
          <label class="text-sm font-semibold">담당부서</label>
          <select
            v-model="assignedDepartment"
            class="flex h-11 w-full rounded-xl border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option v-for="option in assignedDepartments" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
        <Button class="mt-6 w-full" :disabled="signupLoading || departmentsLoading || loading || !assignedDepartment" @click="submitSignup">
          {{ signupLoading || loading ? '가입 중...' : '가입' }}
        </Button>
        <Button class="mt-3 w-full" variant="outline" type="button" :disabled="signupLoading || departmentsLoading || loading" @click="openLogin">
          로그인
        </Button>
        <p v-if="signupMessage || message" class="mt-4 text-center text-sm text-slate-600">
          {{ signupMessage || message }}
        </p>
      </template>
    </Card>
  </section>
</template>
