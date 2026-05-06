<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, Delete, Download, KeyRound } from 'lucide-vue-next'
import {
  DESKTOP_INSTALL_PASSWORD,
  buildDesktopInstallerFileName,
  buildDesktopInstallerUrl,
} from '@/constants/desktopInstall'
import packageJson from '../../../package.json'

const emit = defineEmits(['unlocked'])

const mode = ref('install')
const password = ref('')
const errorMessage = ref('')

const installerFileName = computed(() => buildDesktopInstallerFileName(packageJson.version))
const installerUrl = computed(() => buildDesktopInstallerUrl(packageJson.version))
const maskedPassword = computed(() => password.value.padEnd(4, '○').slice(0, 4))
const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

const openPasswordPad = () => {
  password.value = ''
  errorMessage.value = ''
  mode.value = 'password'
}

const appendDigit = (digit) => {
  if (password.value.length >= 4) return
  password.value += digit
  errorMessage.value = ''
}

const removeDigit = () => {
  password.value = password.value.slice(0, -1)
  errorMessage.value = ''
}

const clearPassword = () => {
  password.value = ''
  errorMessage.value = ''
}

const submitPassword = () => {
  if (password.value === DESKTOP_INSTALL_PASSWORD) {
    emit('unlocked')
    return
  }
  password.value = ''
  errorMessage.value = '비밀번호가 맞지 않습니다.'
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 px-5">
      <section v-if="mode === 'install'" class="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Download class="h-6 w-6" />
        </div>
        <h2 class="mt-5 text-2xl font-extrabold text-slate-950">인터넷 웹버전 사용금지</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">PC버전으로 다운로드 해주세요.</p>

        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p class="text-xs font-bold text-slate-500">설치 파일</p>
          <p class="mt-1 break-all text-sm font-semibold text-slate-800">{{ installerFileName }}</p>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-3">
          <a
            :href="installerUrl"
            :download="installerFileName"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            <Download class="h-4 w-4" />
            다운로드 받기
          </a>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            @click="openPasswordPad"
          >
            <KeyRound class="h-4 w-4" />
            비밀번호 입력
          </button>
        </div>
      </section>

      <section v-else class="w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="뒤로"
            @click="mode = 'install'"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div>
            <h2 class="text-lg font-extrabold text-slate-950">비밀번호 입력</h2>
            <p class="text-xs font-semibold text-slate-500">승인된 사용자만 접속할 수 있습니다.</p>
          </div>
        </div>

        <div class="mt-5 rounded-2xl bg-slate-100 px-4 py-4 text-center text-2xl font-extrabold tracking-[0.4em] text-slate-900">
          {{ maskedPassword }}
        </div>
        <p class="mt-2 min-h-5 text-center text-sm font-bold text-red-600">{{ errorMessage }}</p>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <button
            v-for="digit in digits.slice(0, 9)"
            :key="digit"
            type="button"
            class="h-14 rounded-2xl bg-slate-100 text-xl font-extrabold text-slate-900 hover:bg-slate-200"
            @click="appendDigit(digit)"
          >
            {{ digit }}
          </button>
          <button
            type="button"
            class="h-14 rounded-2xl border border-slate-200 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            @click="clearPassword"
          >
            지움
          </button>
          <button
            type="button"
            class="h-14 rounded-2xl bg-slate-100 text-xl font-extrabold text-slate-900 hover:bg-slate-200"
            @click="appendDigit('0')"
          >
            0
          </button>
          <button
            type="button"
            class="flex h-14 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="한 글자 삭제"
            @click="removeDigit"
          >
            <Delete class="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          class="mt-3 h-12 w-full rounded-2xl bg-slate-950 text-sm font-extrabold text-white hover:bg-slate-800 disabled:bg-slate-300"
          :disabled="password.length !== 4"
          @click="submitPassword"
        >
          확인
        </button>
      </section>
    </div>
  </Teleport>
</template>
