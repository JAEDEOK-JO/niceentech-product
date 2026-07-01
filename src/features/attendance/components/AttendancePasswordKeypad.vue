<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Employee } from '../types/attendance'
import { resolveEmployeePassword } from '../utils/employeePassword'

const props = defineProps<{
  employee: Employee
}>()

const emit = defineEmits<{
  (e: 'success', employee: Employee): void
  (e: 'cancel'): void
}>()

const MIN_LEN = 4
const MAX_LEN = 8
const input = ref('')
const errorShake = ref(false)
const errorMessage = ref('')
let errorTimer: ReturnType<typeof setTimeout> | null = null

const masked = computed(() => {
  const dots = '●'.repeat(input.value.length)
  const empty = '○'.repeat(Math.max(0, MIN_LEN - input.value.length))
  return dots + empty
})

const canSubmit = computed(() => input.value.length >= MIN_LEN)

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

function press(d: string) {
  if (input.value.length >= MAX_LEN) return
  input.value += d
  errorMessage.value = ''
}

function backspace() {
  input.value = input.value.slice(0, -1)
  errorMessage.value = ''
}

function clear() {
  input.value = ''
  errorMessage.value = ''
}

function submit() {
  if (!canSubmit.value) return
  const entered = Number(input.value)
  const stored = resolveEmployeePassword(props.employee)
  // 0은 통과 불가 (기본값/미설정 처리)
  if (entered !== 0 && stored !== 0 && entered === stored) {
    emit('success', props.employee)
    return
  }
  errorShake.value = true
  errorMessage.value = '비밀번호가 틀렸습니다'
  if (errorTimer) clearTimeout(errorTimer)
  setTimeout(() => { errorShake.value = false }, 400)
  setTimeout(() => { input.value = '' }, 200)
  errorTimer = setTimeout(() => { errorMessage.value = '' }, 2500)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
        <div class="mb-1 text-center">
          <p class="text-xs font-bold text-slate-400">{{ employee.department }}</p>
          <h2 class="mt-1 text-xl font-extrabold text-slate-900">{{ employee.name }}</h2>
          <p class="mt-1 text-xs text-slate-500">비밀번호를 입력하세요</p>
          <p class="mt-0.5 text-[11px] font-bold text-slate-400">최소 4자 ~ 최대 8자</p>
        </div>

        <!-- 입력 표시 -->
        <div
          class="mt-4 select-none rounded-xl bg-slate-100 py-4 text-center text-2xl tracking-[0.4em] text-slate-700"
          :class="errorShake ? 'shake text-red-500' : ''"
        >
          {{ masked }}
        </div>

        <!-- 에러 메시지 -->
        <p
          class="mt-2 mb-2 h-5 text-center text-sm font-extrabold text-red-500 transition-opacity"
          :class="errorMessage ? 'opacity-100' : 'opacity-0'"
        >
          {{ errorMessage || ' ' }}
        </p>

        <!-- 키패드 -->
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="k in KEYS"
            :key="k"
            type="button"
            class="rounded-xl bg-slate-50 py-4 text-xl font-extrabold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            @click="press(k)"
          >{{ k }}</button>

          <button
            type="button"
            class="rounded-xl bg-slate-50 py-4 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200"
            @click="clear"
          >지움</button>
          <button
            type="button"
            class="rounded-xl bg-slate-50 py-4 text-xl font-extrabold text-slate-900 transition-colors hover:bg-slate-200 active:bg-slate-300"
            @click="press('0')"
          >0</button>
          <button
            type="button"
            class="rounded-xl bg-slate-50 py-4 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200"
            @click="backspace"
          >←</button>
        </div>

        <!-- 액션 -->
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="emit('cancel')"
          >취소</button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-700 disabled:bg-slate-300"
            :disabled="!canSubmit"
            @click="submit"
          >확인</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
.shake { animation: shake 0.4s ease; }
</style>
