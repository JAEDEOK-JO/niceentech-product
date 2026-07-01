<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'

const props = defineProps<{
  open: boolean
  loading: boolean
  message: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'login', payload: { id: string; password: string }): void
}>()

const id = ref('')
const password = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) {
      id.value = ''
      password.value = ''
    }
  },
)

const submit = () => {
  emit('login', { id: id.value, password: password.value })
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
  >
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-lg font-extrabold text-slate-900">로그인</h2>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">
          닫기
        </button>
      </div>

      <div class="mt-5 space-y-4">
        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">아이디</span>
          <Input v-model="id" type="text" class="h-10" placeholder="아이디" :disabled="loading" />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">비밀번호</span>
          <Input
            v-model="password"
            type="password"
            class="h-10"
            placeholder="비밀번호"
            :disabled="loading"
            @keyup.enter="submit"
          />
        </label>

        <Button class="h-10 w-full font-bold" :disabled="loading" @click="submit">
          {{ loading ? '로그인 중...' : '로그인' }}
        </Button>

        <p v-if="message" class="text-center text-sm font-semibold text-slate-600">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
