<script setup>
import { computed, ref } from 'vue'
import { Search, X } from 'lucide-vue-next'

const props = defineProps({
  companies: { type: Array, default: () => [] },
  title: { type: String, default: '현장 검색' },
  description: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select'])

const keyword = ref('')
const searchedKeyword = ref('')

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()

const filteredCompanies = computed(() => {
  const query = normalizeText(searchedKeyword.value)
  const source = props.companies ?? []
  if (!query) return []
  return source
    .filter((company) =>
      `${company.company ?? ''} ${company.place ?? ''} ${company.initial ?? ''}`
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 5)
})

const formatCompany = (company) => [company.company, company.place].filter(Boolean).join(' ')

const searchCompanies = () => {
  searchedKeyword.value = keyword.value
}

const clearSearchResult = () => {
  searchedKeyword.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <h2 class="text-lg font-extrabold text-slate-900">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm font-semibold text-slate-500">{{ description }}</p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </header>

        <div class="border-b border-slate-100 px-5 py-4">
          <div class="relative">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="keyword"
              type="text"
              class="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="회사명, 현장명, 도번 검색"
              autofocus
              @input="clearSearchResult"
              @keydown.enter.prevent="searchCompanies"
            />
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div v-if="searchedKeyword && filteredCompanies.length === 0" class="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-bold text-slate-400">
            검색된 현장이 없습니다.
          </div>
          <button
            v-for="company in filteredCompanies"
            :key="company.id"
            type="button"
            class="mb-2 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50"
            @click="emit('select', company)"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-extrabold text-slate-900">{{ formatCompany(company) }}</span>
              <span v-if="company.initial" class="mt-1 block text-xs font-bold text-slate-500">도번 {{ company.initial }}</span>
            </span>
            <span class="shrink-0 text-xs font-extrabold text-blue-600">선택</span>
          </button>
        </div>

        <footer class="flex justify-end border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="emit('close')"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
