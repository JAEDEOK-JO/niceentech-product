<script setup>
import Button from '@/components/ui/button/Button.vue'
import AdminDashboardNav from '@/features/admin-dashboard/AdminDashboardNav.vue'

defineProps({
  currentPath: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  selectedWeekInput: { type: String, default: '' },
  selectedWeekLabel: { type: String, default: '' },
  metricDefinitions: { type: Array, default: () => [] },
  formValues: { type: Object, default: () => ({}) },
  summaryCards: { type: Array, default: () => [] },
  historyColumns: { type: Array, default: () => [] },
  historyRows: { type: Array, default: () => [] },
})

const emit = defineEmits(['go-home', 'update:selected-week-input', 'update-metric', 'save'])
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Admin Dashboard</p>
          <h1 class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">영업부 주간 대시보드</h1>
          <p class="mt-2 text-sm text-slate-600">주간 영업 실적을 직접 입력하고 대표 보고용 요약을 확인할 수 있습니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-home')">홈으로</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <AdminDashboardNav :current-path="currentPath" />
            <p class="mt-4 text-sm font-semibold text-slate-700">선택 주간 : {{ selectedWeekLabel }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="text-sm font-semibold text-slate-600" for="sales-week-input">주차</label>
            <input
              id="sales-week-input"
              :value="selectedWeekInput"
              type="week"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              @input="emit('update:selected-week-input', $event.target.value)"
            />
            <Button :disabled="saving || loading" @click="emit('save')">
              {{ saving ? '저장 중...' : '저장' }}
            </Button>
          </div>
        </div>

        <p v-if="error" class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ error }}
        </p>

        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article v-for="card in summaryCards" :key="card.key" class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p class="text-xs font-bold text-slate-500">{{ card.label }}</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ card.valueText }}</p>
            <p class="mt-2 text-xs leading-5 text-slate-600">{{ card.changeText }}</p>
          </article>
        </div>

        <div class="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-extrabold text-slate-900">주간 지표 입력</p>
                <p class="mt-1 text-xs text-slate-500">숫자 지표는 비워두면 미입력 상태로 저장됩니다.</p>
              </div>
            </div>

            <div v-if="loading" class="py-12 text-center text-sm text-slate-500">주간 데이터를 불러오는 중...</div>
            <div v-else class="mt-4 grid gap-4 md:grid-cols-2">
              <div
                v-for="metric in metricDefinitions"
                :key="metric.metricKey"
                class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                :class="metric.valueType === 'text' ? 'md:col-span-2' : ''"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-bold text-slate-900">{{ metric.label }}</p>
                  <span v-if="metric.unit" class="text-xs font-semibold text-slate-500">{{ metric.unit }}</span>
                </div>

                <textarea
                  v-if="metric.valueType === 'text'"
                  :value="formValues[metric.metricKey] ?? ''"
                  rows="4"
                  class="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  placeholder="특이사항을 입력하세요"
                  @input="emit('update-metric', { metricKey: metric.metricKey, value: $event.target.value })"
                />
                <input
                  v-else
                  :value="formValues[metric.metricKey] ?? ''"
                  type="text"
                  inputmode="decimal"
                  class="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  :placeholder="metric.unit ? `${metric.unit} 단위 입력` : '숫자 입력'"
                  @input="emit('update-metric', { metricKey: metric.metricKey, value: $event.target.value })"
                />
              </div>
            </div>
          </article>

          <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-extrabold text-slate-900">최근 주간 비교</p>
            <div v-if="historyRows.length === 0" class="py-12 text-center text-sm text-slate-500">저장된 주간 데이터가 없습니다.</div>
            <div v-else class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-slate-600">
                  <tr>
                    <th class="rounded-l-2xl px-3 py-2 text-left font-bold">주간</th>
                    <th
                      v-for="column in historyColumns"
                      :key="column.metricKey"
                      class="px-3 py-2 text-left font-bold"
                    >
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in historyRows" :key="row.id" class="border-b border-slate-100 last:border-b-0">
                    <td class="px-3 py-3 font-semibold text-slate-900">{{ row.weekLabel }}</td>
                    <td v-for="(valueText, index) in row.valueTexts" :key="`${row.id}-${index}`" class="px-3 py-3 text-slate-700">
                      {{ valueText }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </main>
  </section>
</template>
