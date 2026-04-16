<script setup>
import { useDialog } from '@/composables/useDialog'

const { state, handleConfirm, handleCancel } = useDialog()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="state.visible"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 px-4"
        @click.self="state.type === 'confirm' ? handleCancel() : handleConfirm()"
      >
        <div class="w-full max-w-sm rounded-3xl bg-white shadow-2xl">

          <!-- 본문 -->
          <div class="px-6 pb-2 pt-6">
            <p v-if="state.title" class="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
              {{ state.title }}
            </p>
            <p class="text-base font-semibold leading-relaxed text-slate-800">{{ state.message }}</p>
          </div>

          <!-- 버튼 -->
          <div class="flex gap-2 p-4">
            <button
              v-if="state.type === 'confirm'"
              type="button"
              class="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              @click="handleCancel"
            >
              {{ state.cancelText }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-2xl py-2.5 text-sm font-bold text-white"
              :class="state.type === 'confirm' ? 'bg-slate-900 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-700'"
              @click="handleConfirm"
            >
              {{ state.confirmText }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
