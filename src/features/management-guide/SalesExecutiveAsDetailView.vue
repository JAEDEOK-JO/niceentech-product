<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/button/Button.vue'

const SALES_AS_TABLE = 'sales_as_entries'

const emit = defineEmits(['go-back'])
const router = useRouter()

const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])

const now = new Date()
const reportYear = now.getFullYear()
const reportMonth = now.getMonth()
const reportMonthLabel = `${reportMonth + 1}월`
const reportMonthValue = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}-01`

const formatShortDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return raw || '-'
  return `${matched[2]}월 ${matched[3]}일`
}
const getFirstImageUrl = (row) => (Array.isArray(row?.image_urls) && row.image_urls.length > 0 ? row.image_urls[0] : '')

const fetchRows = async () => {
  loading.value = true
  errorMessage.value = ''

  const { data, error } = await supabase
    .from(SALES_AS_TABLE)
    .select('id,reported_at,company,place,issue,image_urls')
    .eq('target_month', reportMonthValue)
    .order('reported_at', { ascending: false })

  loading.value = false

  if (error) {
    errorMessage.value = error.message ?? 'AS 상세 데이터를 불러오지 못했습니다.'
    rows.value = []
    return
  }

  rows.value = data ?? []
}

const goDetail = (rowId) => {
  router.push({ name: 'sales-as-detail', params: { id: rowId } })
}

const totalCount = computed(() => rows.value.length)

onMounted(async () => {
  await fetchRows()
})
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.12em] text-slate-500">영업부 보고자료</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">{{ reportMonthLabel }} AS 상세</h1>
          <p class="mt-2 text-[13px] text-slate-600">AS 접수 내역과 첨부 이미지를 자세하게 확인합니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-back')">돌아가기</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500 shadow-sm">
        AS 상세 데이터를 불러오는 중입니다.
      </div>

      <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-4 py-16 text-center text-sm font-semibold text-red-600 shadow-sm">
        {{ errorMessage }}
      </div>

      <template v-else>
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">AS 접수 목록</p>
              <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 접수 기준</p>
            </div>
            <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">{{ totalCount }}건</span>
          </div>

          <div v-if="rows.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
            이번 달 AS 입력 데이터가 없습니다.
          </div>

          <div v-else class="mt-6 space-y-3">
            <article
              v-for="row in rows"
              :key="row.id"
              class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              @click="goDetail(row.id)"
            >
              <div class="flex items-start gap-3">
                <div class="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img v-if="getFirstImageUrl(row)" :src="getFirstImageUrl(row)" alt="AS 대표 이미지" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full items-center justify-center px-2 text-[11px] text-slate-400">이미지 없음</div>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-base font-extrabold text-slate-900">{{ row.company || '-' }}</p>
                      <p class="mt-0.5 truncate text-[13px] text-slate-600">{{ row.place || '-' }}</p>
                    </div>
                    <p class="shrink-0 text-[11px] font-semibold text-slate-500">{{ formatShortDate(row.reported_at) }}</p>
                  </div>

                  <p class="mt-2 line-clamp-3 text-[13px] leading-5 text-slate-700">{{ row.issue || '-' }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>
  </section>
</template>
