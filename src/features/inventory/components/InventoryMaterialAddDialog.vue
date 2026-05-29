<script setup>
import { computed, ref, watch } from 'vue'
import { Loader2, Search } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  savingItemId: { type: [String, Number], default: '' },
})

const emit = defineEmits(['close', 'select', 'remove'])

const searchText = ref('')

const filteredItems = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const list = props.items ?? []
  if (!keyword) return list
  return list.filter((item) =>
    [item.material_group, item.name, item.spec, item.unit]
      .some((value) => String(value ?? '').toLowerCase().includes(keyword)),
  )
})

const groupedItems = computed(() => {
  const groups = []
  for (const item of filteredItems.value) {
    const groupName = String(item.material_group || item.name || '기타')
    let group = groups.find((target) => target.name === groupName)
    if (!group) {
      group = { name: groupName, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})

const isSavingItem = (item) => String(props.savingItemId || '') === String(item?.id ?? '')
const canSelectItem = (item) => !props.loading && !props.savingItemId && !item.isLinkedToCompany

watch(
  () => props.open,
  (open) => {
    if (open) searchText.value = ''
  },
)
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
    @click.self="emit('close')"
  >
    <div class="flex max-h-[82vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
      <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 class="text-base font-extrabold text-slate-900">{{ title }}</h2>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">
          닫기
        </button>
      </div>

      <div class="border-b border-slate-100 px-5 py-3">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchText"
            type="text"
            class="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="품목 그룹, 규격 검색"
            autofocus
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div v-if="loading" class="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 class="h-4 w-4 animate-spin" />
          불러오는 중입니다.
        </div>

        <div v-else-if="groupedItems.length === 0" class="py-12 text-center text-sm font-bold text-slate-400">
          등록된 품목이 없습니다.
        </div>

        <div v-else class="grid gap-4">
          <section v-for="group in groupedItems" :key="group.name" class="rounded-xl border border-slate-200">
            <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-800">
              {{ group.name }}
            </div>
            <div class="grid gap-2 p-3 sm:grid-cols-2">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left"
                :class="
                  item.isLinkedToCompany
                    ? 'border-slate-100 bg-slate-50 text-slate-400'
                    : 'border-slate-200 bg-white hover:bg-blue-50'
                "
                @click="canSelectItem(item) && emit('select', item)"
              >
                <span class="text-sm font-extrabold" :class="item.isLinkedToCompany ? 'text-slate-400' : 'text-slate-900'">{{ item.spec }}</span>
                <button
                  type="button"
                  class="inline-flex min-w-10 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold disabled:opacity-50"
                  :class="item.isLinkedToCompany ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
                  :disabled="loading || Boolean(savingItemId)"
                  @click.stop="item.isLinkedToCompany ? emit('remove', item) : emit('select', item)"
                >
                  <Loader2 v-if="isSavingItem(item)" class="h-3 w-3 animate-spin" />
                  {{ item.isLinkedToCompany ? '제외' : '추가' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
