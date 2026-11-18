<script setup>
import { computed, ref } from 'vue'
import { ATTENDANCE_SCOPE_DEPARTMENTS } from '@/features/access/capabilityCatalog'

const props = defineProps({
  members: { type: Array, required: true },
  profiles: { type: Array, required: true },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

const query = ref('')
const openedIds = ref([])

const visibleMembers = computed(() => {
  const ids = new Set([...props.members.map((member) => member.id), ...openedIds.value])
  return props.profiles.filter((profile) => ids.has(profile.id))
})

const candidates = computed(() => {
  const keyword = query.value.trim()
  if (!keyword) return []
  const visibleIds = new Set(visibleMembers.value.map((profile) => profile.id))
  return props.profiles
    .filter((profile) => !visibleIds.has(profile.id))
    .filter((profile) => profile.name.includes(keyword) || profile.department.includes(keyword))
    .slice(0, 8)
})

function departmentsOf(userId) {
  return props.members.find((member) => member.id === userId)?.departments ?? []
}

function open(profile) {
  if (!openedIds.value.includes(profile.id)) openedIds.value = [...openedIds.value, profile.id]
  query.value = ''
}
</script>

<template>
  <section class="grid gap-2">
    <h2 class="text-sm font-extrabold text-slate-900">근태 범위</h2>
    <div v-for="profile in visibleMembers" :key="profile.id" class="grid gap-2 rounded-xl border border-slate-200 px-3 py-2">
      <p class="text-sm font-bold text-slate-900">
        {{ profile.name }}
        <span v-if="profile.department" class="font-medium text-slate-400">{{ profile.department }}</span>
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="department in ATTENDANCE_SCOPE_DEPARTMENTS"
          :key="department"
          type="button"
          class="rounded-full px-3 py-1 text-xs font-extrabold disabled:opacity-40"
          :class="departmentsOf(profile.id).includes(department) ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'"
          :disabled="saving"
          @click="emit('toggle', profile.id, department)"
        >
          {{ department }}
        </button>
      </div>
    </div>
    <input
      v-model="query"
      type="search"
      placeholder="이름"
      class="h-10 rounded-xl border border-slate-200 px-3 text-sm"
    />
    <div v-if="candidates.length" class="grid overflow-hidden rounded-xl border border-slate-200">
      <button
        v-for="profile in candidates"
        :key="profile.id"
        type="button"
        class="border-t border-slate-100 px-3 py-2 text-left text-sm font-bold first:border-t-0 hover:bg-slate-50"
        @click="open(profile)"
      >
        {{ profile.name }}
        <span v-if="profile.department" class="ml-2 font-medium text-slate-400">{{ profile.department }}</span>
      </button>
    </div>
  </section>
</template>
