<script setup>
import { computed, onMounted, ref } from 'vue'
import { ASSIGN_CAPABILITIES, CAPABILITY } from '@/features/access/capabilityCatalog'
import {
  fetchCapabilityDirectory,
  grantCapability,
  revokeCapability,
} from '@/features/settings/services/userCapabilitySettings.service'
import UserCapabilityAssignList from './UserCapabilityAssignList.vue'
import UserCapabilityScopeList from './UserCapabilityScopeList.vue'

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const profiles = ref([])
const grants = ref([])

const profileById = computed(() => new Map(profiles.value.map((profile) => [profile.id, profile])))

function membersFor(capability) {
  const ids = grants.value
    .filter((grant) => grant.capability === capability)
    .map((grant) => grant.user_id)
  return [...new Set(ids)].map((id) => profileById.value.get(id)).filter(Boolean)
}

const scopeMembers = computed(() => {
  const departmentsByUser = new Map()
  for (const grant of grants.value) {
    if (grant.capability !== CAPABILITY.attendanceScope) continue
    const department = String(grant.detail ?? '').trim()
    if (!department) continue
    const current = departmentsByUser.get(grant.user_id) ?? []
    current.push(department)
    departmentsByUser.set(grant.user_id, current)
  }
  return [...departmentsByUser.entries()].map(([id, departments]) => ({
    id,
    departments,
  }))
})

async function refresh() {
  const directory = await fetchCapabilityDirectory()
  profiles.value = directory.profiles
  grants.value = directory.grants
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    await refresh()
  } catch {
    errorMessage.value = '불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function change(task) {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await task()
    await refresh()
  } catch {
    errorMessage.value = '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function add(capability, userId) {
  return change(() => grantCapability(userId, capability))
}

function remove(capability, userId) {
  return change(() => revokeCapability(userId, capability))
}

function toggleScope(userId, department) {
  const enabled = scopeMembers.value.find((member) => member.id === userId)?.departments.includes(department)
  return change(() => (
    enabled
      ? revokeCapability(userId, CAPABILITY.attendanceScope, department)
      : grantCapability(userId, CAPABILITY.attendanceScope, department)
  ))
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="grid gap-6">
    <div class="border-b border-slate-200 pb-4">
      <p class="text-sm font-bold text-slate-500">설정</p>
      <h1 class="mt-1 text-2xl font-extrabold text-slate-900">권한</h1>
    </div>
    <p v-if="loading" class="text-sm font-bold text-slate-500">불러오는 중...</p>
    <p v-if="errorMessage" class="text-sm font-bold text-rose-600">{{ errorMessage }}</p>
    <template v-if="!loading">
      <UserCapabilityAssignList
        v-for="item in ASSIGN_CAPABILITIES"
        :key="item.key"
        :label="item.label"
        :members="membersFor(item.key)"
        :profiles="profiles"
        :saving="saving"
        @add="add(item.key, $event)"
        @remove="remove(item.key, $event)"
      />
      <UserCapabilityScopeList
        :members="scopeMembers"
        :profiles="profiles"
        :saving="saving"
        @toggle="toggleScope"
      />
    </template>
  </div>
</template>
