<script setup>
import { ref } from 'vue'
import { UserRound } from 'lucide-vue-next'
import Card from '@/components/ui/card/Card.vue'
import Input from '@/components/ui/input/Input.vue'
import Button from '@/components/ui/button/Button.vue'

const props = defineProps({
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

const id = ref('')
const password = ref('')

const submit = () => {
  emit('login', { id: id.value, password: password.value })
}
</script>

<template>
  <section class="mx-auto flex min-h-screen w-full max-w-[520px] items-center px-6">
    <Card class="w-full p-8">
      <div class="mb-6 flex items-center justify-center gap-2">
        <UserRound class="h-5 w-5 text-blue-600" />
        <h1 class="text-xl font-bold">NiceEnTech</h1>
      </div>

      <div class="space-y-3">
        <label class="text-sm font-semibold">아이디</label>
        <Input v-model="id" placeholder="test01" />
        <p class="mt-1 text-xs text-slate-500">@niceentech.kr 자동 적용</p>
      </div>

      <div class="mt-4 space-y-3">
        <label class="text-sm font-semibold">비밀번호</label>
        <Input v-model="password" type="password" placeholder="비밀번호 입력" @keyup.enter="submit" />
      </div>

      <Button class="mt-6 w-full" :disabled="loading" @click="submit">
        {{ loading ? '로그인 중...' : '로그인' }}
      </Button>

      <p v-if="message" class="mt-4 text-center text-sm text-slate-600">
        {{ message }}
      </p>
    </Card>
  </section>
</template>
