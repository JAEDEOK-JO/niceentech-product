<script setup lang="ts">
import WorkerAppBar from './WorkerAppBar.vue'
import WorkerAttendanceView from './WorkerAttendanceView.vue'
import WorkerBottomNav from './WorkerBottomNav.vue'
import WorkerLabelView from './WorkerLabelView.vue'
import WorkerProfileView from './WorkerProfileView.vue'
import WorkerRewardView from '../reward/WorkerRewardView.vue'
import type { WorkerTab } from '../workerTab'

const tab = defineModel<WorkerTab>('tab', { required: true })

defineProps<{
  userId: string
  name: string
  department: string
}>()

const emit = defineEmits<{
  (e: 'logout'): void
}>()
</script>

<template>
  <div class="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-slate-50">
    <WorkerAppBar :name="name" :department="department" />
    <main class="min-h-0 flex-1 overflow-y-auto">
      <WorkerLabelView v-if="tab === 'notice'" label="알림" />
      <WorkerAttendanceView
        v-else-if="tab === 'attendance'"
        :user-id="userId"
        :name="name"
        :department="department"
      />
      <WorkerRewardView
        v-else-if="tab === 'reward'"
        :user-id="userId"
        :name="name"
        :department="department"
      />
      <WorkerProfileView v-else :name="name" @logout="emit('logout')" />
    </main>
    <WorkerBottomNav v-model="tab" />
  </div>
</template>
