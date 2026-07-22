<script setup lang="ts">
import type { MentionMember } from '../utils/mentionText'

defineProps<{
  members: MentionMember[]
  activeIndex: number
}>()

const emit = defineEmits<{
  select: [member: MentionMember]
}>()
</script>

<template>
  <div
    v-if="members.length > 0"
    class="mb-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm"
  >
    <button
      v-for="(member, index) in members"
      :key="member.user_id"
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left transition"
      :class="index === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'"
      @mousedown.prevent="emit('select', member)"
    >
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
      >
        {{ String(member.display_name ?? '?').charAt(0) }}
      </div>
      <span class="truncate text-sm font-semibold text-slate-800">{{ member.display_name }}</span>
    </button>
  </div>
</template>
