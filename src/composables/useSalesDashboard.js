import { computed, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { salesMetricDefinitionsSeed, salesPrimarySummaryKeys } from '@/features/admin-dashboard/adminDashboardConfig'

const METRIC_DEFINITIONS_TABLE = 'department_metric_definitions'
const METRIC_ENTRIES_TABLE = 'department_metric_entries'
const DEPARTMENT_CODE = 'sales'
const PERIOD_TYPE = 'weekly'

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const startOfWeekMonday = (date) => {
  const base = startOfDay(date)
  const day = base.getDay()
  const diff = day === 0 ? -6 : 1 - day
  base.setDate(base.getDate() + diff)
  return base
}
const endOfWeekSunday = (date) => {
  const end = new Date(startOfWeekMonday(date))
  end.setDate(end.getDate() + 6)
  return end
}
const formatIsoDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const formatKoreanDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}
const getIsoWeekInfo = (date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
  return { weekYear: target.getUTCFullYear(), weekNumber: weekNo }
}
const getWeekInputValue = (date) => {
  const info = getIsoWeekInfo(date)
  return `${info.weekYear}-W${String(info.weekNumber).padStart(2, '0')}`
}
const parseWeekInput = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-W(\d{2})$/)
  if (!match) return startOfWeekMonday(new Date())
  const year = Number(match[1])
  const week = Number(match[2])
  const jan4 = new Date(year, 0, 4)
  const monday = startOfWeekMonday(jan4)
  monday.setDate(monday.getDate() + (week - 1) * 7)
  return monday
}
const toNumberInput = (value) => {
  const raw = String(value ?? '').replaceAll(',', '').trim()
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}
const formatMetricValue = (valueType, value, unit = '') => {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (valueType === 'text') return String(value)
  if (!Number.isFinite(num)) return '-'
  if (valueType === 'currency') return `${Math.round(num).toLocaleString('ko-KR')}${unit || '원'}`
  if (valueType === 'percent') return `${num.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${unit || '%'}`
  if (unit) return `${num.toLocaleString('ko-KR')}${unit}`
  return num.toLocaleString('ko-KR')
}

export function useSalesDashboard(session) {
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const selectedWeekInput = ref(getWeekInputValue(new Date()))
  const metricDefinitions = ref([])
  const formValues = ref({})
  const recentEntryRows = ref([])

  const selectedPeriod = computed(() => {
    const start = parseWeekInput(selectedWeekInput.value)
    return {
      start,
      end: endOfWeekSunday(start),
      startIso: formatIsoDate(start),
      endIso: formatIsoDate(endOfWeekSunday(start)),
    }
  })
  const selectedWeekLabel = computed(
    () => `${formatKoreanDate(selectedPeriod.value.start)} - ${formatKoreanDate(selectedPeriod.value.end)}`,
  )

  const normalizeDefinitions = (rows) =>
    rows.map((row) => ({
      metricKey: row.metric_key ?? row.metricKey,
      label: row.label,
      valueType: row.value_type ?? row.valueType,
      unit: row.unit ?? '',
      sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    }))

  const ensureFormDefaults = () => {
    const next = {}
    for (const def of metricDefinitions.value) {
      next[def.metricKey] = formValues.value[def.metricKey] ?? ''
    }
    formValues.value = next
  }

  const fetchMetricDefinitions = async () => {
    if (!session.value) {
      metricDefinitions.value = normalizeDefinitions(salesMetricDefinitionsSeed)
      ensureFormDefaults()
      return
    }

    const { data, error: queryError } = await supabase
      .from(METRIC_DEFINITIONS_TABLE)
      .select('metric_key,label,value_type,unit,sort_order,is_active')
      .eq('department_code', DEPARTMENT_CODE)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (queryError || !data?.length) {
      metricDefinitions.value = normalizeDefinitions(salesMetricDefinitionsSeed)
      ensureFormDefaults()
      return
    }

    metricDefinitions.value = normalizeDefinitions(data)
    ensureFormDefaults()
  }

  const fetchWeekEntries = async () => {
    if (!session.value) {
      formValues.value = {}
      ensureFormDefaults()
      return
    }

    loading.value = true
    error.value = ''
    const { data, error: queryError } = await supabase
      .from(METRIC_ENTRIES_TABLE)
      .select('metric_key,numeric_value,text_value,note')
      .eq('department_code', DEPARTMENT_CODE)
      .eq('period_type', PERIOD_TYPE)
      .eq('period_start_date', selectedPeriod.value.startIso)

    loading.value = false
    if (queryError) {
      formValues.value = {}
      ensureFormDefaults()
      error.value = `영업부 데이터 조회 실패: ${queryError.message}`
      return
    }

    const next = {}
    for (const row of data ?? []) {
      const metricKey = String(row.metric_key ?? '').trim()
      const def = metricDefinitions.value.find((item) => item.metricKey === metricKey)
      if (!def) continue
      next[metricKey] = def.valueType === 'text' ? String(row.text_value ?? '') : String(row.numeric_value ?? '')
    }
    formValues.value = next
    ensureFormDefaults()
  }

  const fetchRecentEntries = async () => {
    if (!session.value) {
      recentEntryRows.value = []
      return
    }

    const threshold = new Date(selectedPeriod.value.start)
    threshold.setDate(threshold.getDate() - 56)
    const { data, error: queryError } = await supabase
      .from(METRIC_ENTRIES_TABLE)
      .select('metric_key,numeric_value,text_value,period_start_date,period_end_date')
      .eq('department_code', DEPARTMENT_CODE)
      .eq('period_type', PERIOD_TYPE)
      .gte('period_start_date', formatIsoDate(threshold))
      .order('period_start_date', { ascending: false })

    if (queryError) {
      recentEntryRows.value = []
      return
    }
    recentEntryRows.value = data ?? []
  }

  const saveEntries = async () => {
    if (!session.value?.user?.id) return { ok: false, reason: 'no_session' }

    saving.value = true
    error.value = ''
    const rows = metricDefinitions.value.map((def) => {
      const rawValue = formValues.value[def.metricKey]
      return {
        department_code: DEPARTMENT_CODE,
        metric_key: def.metricKey,
        period_type: PERIOD_TYPE,
        period_start_date: selectedPeriod.value.startIso,
        period_end_date: selectedPeriod.value.endIso,
        numeric_value: def.valueType === 'text' ? null : toNumberInput(rawValue),
        text_value: def.valueType === 'text' ? String(rawValue ?? '').trim() : '',
        note: null,
        created_by: session.value.user.id,
        updated_at: new Date().toISOString(),
      }
    })

    const { error: upsertError } = await supabase
      .from(METRIC_ENTRIES_TABLE)
      .upsert(rows, { onConflict: 'department_code,metric_key,period_type,period_start_date' })

    saving.value = false
    if (upsertError) {
      error.value = `영업부 데이터 저장 실패: ${upsertError.message}`
      return { ok: false, reason: 'db_error' }
    }

    await fetchWeekEntries()
    await fetchRecentEntries()
    return { ok: true }
  }

  const summaryCards = computed(() => {
    const metricMap = Object.fromEntries(metricDefinitions.value.map((item) => [item.metricKey, item]))
    const grouped = new Map()

    for (const row of recentEntryRows.value) {
      const key = String(row.period_start_date ?? '')
      const next = grouped.get(key) ?? { periodStartDate: key, values: {} }
      next.values[row.metric_key] = row.text_value ?? row.numeric_value
      grouped.set(key, next)
    }

    const currentWeek = grouped.get(selectedPeriod.value.startIso) ?? { values: {} }
    const previousWeekStart = new Date(selectedPeriod.value.start)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    const previousWeek = grouped.get(formatIsoDate(previousWeekStart)) ?? { values: {} }

    return salesPrimarySummaryKeys.map((metricKey) => {
      const def = metricMap[metricKey]
      const currentValue = currentWeek.values[metricKey] ?? null
      const previousValue = previousWeek.values[metricKey] ?? null
      const currentNumber = Number(currentValue)
      const previousNumber = Number(previousValue)
      let changeText = '전주 데이터 없음'

      if (Number.isFinite(currentNumber) && Number.isFinite(previousNumber)) {
        const diff = currentNumber - previousNumber
        if (def.valueType === 'currency') {
          changeText = `전주 대비 ${diff >= 0 ? '+' : ''}${Math.round(diff).toLocaleString('ko-KR')}원`
        } else if (def.valueType === 'percent') {
          changeText = `전주 대비 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%p`
        } else {
          changeText = `전주 대비 ${diff >= 0 ? '+' : ''}${diff.toLocaleString('ko-KR')}${def.unit || ''}`
        }
      }

      return {
        key: metricKey,
        label: def?.label ?? metricKey,
        valueText: formatMetricValue(def?.valueType, currentValue, def?.unit),
        changeText,
      }
    })
  })

  const historyColumns = computed(() =>
    metricDefinitions.value.filter((item) =>
      ['weekly_actual_sales', 'new_order_amount', 'new_order_count', 'delivery_delay_count', 'as_issue_count'].includes(
        item.metricKey,
      ),
    ),
  )

  const historyRows = computed(() => {
    const grouped = new Map()

    for (const row of recentEntryRows.value) {
      const key = String(row.period_start_date ?? '')
      const next =
        grouped.get(key) ??
        {
          periodStartDate: key,
          periodEndDate: String(row.period_end_date ?? ''),
          values: {},
        }
      next.values[row.metric_key] = row.text_value ?? row.numeric_value
      grouped.set(key, next)
    }

    return [...grouped.values()]
      .sort((a, b) => String(b.periodStartDate).localeCompare(String(a.periodStartDate)))
      .slice(0, 8)
      .map((row) => ({
        id: row.periodStartDate,
        weekLabel: `${row.periodStartDate} ~ ${row.periodEndDate}`,
        valueTexts: historyColumns.value.map((column) =>
          formatMetricValue(column.valueType, row.values[column.metricKey] ?? null, column.unit),
        ),
      }))
  })

  const updateMetricValue = ({ metricKey, value }) => {
    formValues.value = {
      ...formValues.value,
      [metricKey]: value,
    }
  }

  watch(
    session,
    async () => {
      await fetchMetricDefinitions()
    },
    { immediate: true },
  )

  watch(
    [session, selectedWeekInput, metricDefinitions],
    async ([currentSession, weekInput, definitions]) => {
      if (!weekInput || !definitions.length) return
      if (!currentSession) {
        formValues.value = {}
        recentEntryRows.value = []
        ensureFormDefaults()
        return
      }
      await fetchWeekEntries()
      await fetchRecentEntries()
    },
    { immediate: true },
  )

  return {
    loading,
    saving,
    error,
    selectedWeekInput,
    selectedWeekLabel,
    metricDefinitions,
    formValues,
    summaryCards,
    historyColumns,
    historyRows,
    updateMetricValue,
    saveEntries,
  }
}
