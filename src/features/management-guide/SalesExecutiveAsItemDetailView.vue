<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'

const SALES_AS_TABLE = 'sales_as_entries'

const emit = defineEmits(['go-back'])
const route = useRoute()

const loading = ref(false)
const errorMessage = ref('')
const row = ref(null)

const asId = computed(() => String(route.params.id ?? '').trim())

const formatShortDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return raw || '-'
  return `${matched[1]}.${matched[2]}.${matched[3]}`
}

const fetchRow = async () => {
  loading.value = true
  errorMessage.value = ''

  const { data, error } = await supabase
    .from(SALES_AS_TABLE)
    .select('id,reported_at,company,place,issue,image_urls,created_at')
    .eq('id', asId.value)
    .maybeSingle()

  loading.value = false

  if (error) {
    errorMessage.value = error.message ?? 'AS 상세 데이터를 불러오지 못했습니다.'
    row.value = null
    return
  }

  if (!data) {
    errorMessage.value = '해당 AS 데이터를 찾을 수 없습니다.'
    row.value = null
    return
  }

  row.value = data
}

onMounted(async () => {
  await fetchRow()
})
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.12em] text-slate-500">영업부 보고자료</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">AS 상세 보고</h1>
          <p class="mt-2 text-[13px] text-slate-600">선택한 AS 접수 건의 상세 내용을 확인합니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-back')">2페이지로</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500 shadow-sm">
        AS 상세 데이터를 불러오는 중입니다.
      </div>

      <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-4 py-16 text-center text-sm font-semibold text-red-600 shadow-sm">
        {{ errorMessage }}
      </div>

      <template v-else-if="row">
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-2xl font-extrabold text-slate-900">{{ row.company || '-' }}</p>
              <p class="mt-2 text-base text-slate-600">{{ row.place || '-' }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p class="text-xs font-bold text-slate-500">접수일</p>
              <p class="mt-1 text-sm font-semibold text-slate-800">{{ formatShortDate(row.reported_at) }}</p>
            </div>
          </div>

          <div class="mt-6 space-y-5">
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p class="text-xs font-bold text-slate-500">AS 내용</p>
              <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">{{ row.issue || '-' }}</p>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-bold text-slate-500">첨부 이미지</p>
              <div v-if="Array.isArray(row.image_urls) && row.image_urls.length > 0" class="mt-3 space-y-4">
                <a
                  v-for="(url, index) in row.image_urls"
                  :key="`${row.id}-${index}`"
                  :href="url"
                  target="_blank"
                  rel="noreferrer"
                  class="flex justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <img :src="url" alt="AS 첨부 이미지" class="max-h-none w-auto max-w-full object-contain" />
                </a>
              </div>
              <div v-else class="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-10 text-center text-sm text-slate-400">
                이미지 없음
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>
  </section>
</template>
