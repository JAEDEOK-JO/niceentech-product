<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  members: { type: Array, required: true },
  profiles: { type: Array, required: true },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['add', 'remove'])

const query = ref('')

const candidates = computed(() => {
  const keyword = query.value.trim()
  if (!keyword) return []
  const memberIds = new Set(props.members.map((member) => member.id))
  return props.profiles
    .filter((profile) => !memberIds.has(profile.id))
    .filter((profile) => profile.name.includes(keyword) || profile.department.includes(keyword))
    .slice(0, 8)
})

function add(profile) {
  query.value = ''
  emit('add', profile.id)
}
</script>

<template>
  <section class="grid gap-2">
    <h2 class="text-sm font-extrabold text-slate-900">{{ label }}</h2>
    <div class="flex flex-wrap gap-2">
      <p v-if="members.length === 0" class="text-sm font-bold text-slate-400">없음</p>
      <button
        v-for="member in members"
        :key="member.id"
        type="button"
        class="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-800 disabled:opacity-40"
        :disabled="saving"
        @click="emit('remove', member.id)"
      >
        {{ member.name }}
        <span v-if="member.department" class="text-slate-400">{{ member.department }}</span>
        빼기
      </button>
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
        :disabled="saving"
        @click="add(profile)"
      >
        {{ profile.name }}
        <span v-if="profile.department" class="ml-2 font-medium text-slate-400">{{ profile.department }}</span>
      </button>
    </div>
  </section>
</template>
