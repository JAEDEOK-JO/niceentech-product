<script setup>
import { watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainProductionPlanView from '@/features/main/MainProductionPlanView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useProductionPlan } from '@/composables/useProductionPlan'
import { canManageWeldingSchedule } from '@/features/welding-schedule/utils/weldingSchedulePermission'
import { isAdminRole, isDesignDepartment, normalizeDepartment } from '@/utils/adminAccess'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  weekOffset,
  selectedTuesdayIso,
  searchText,
  searchAllDates,
  planLoading,
  planError,
  pageTitle,
  moveWeek,
  resetWeek,
  setSelectedTuesday,
  groupedRows,
  updatePlanRowFields,
  deletePlanRow,
  fetchDrawingFiles,
  uploadDrawingFiles,
  deleteDrawingFile,
} = useProductionPlan(session)

const canManageWeldingSchedulePermission = computed(() => canManageWeldingSchedule(profile.value))

const isOperationsDepartment = (value) => normalizeDepartment(value).includes(normalizeDepartment('공무'))
const formatKoreanDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return raw
  const [, year, month, day] = matched
  return `${year}년 ${month}월 ${day}일`
}
const goRegister = () => {
  router.push({
    name: 'main-register',
    query: {
      date: selectedTuesdayIso.value,
      q: String(searchText.value ?? '').trim() || undefined,
      all: searchAllDates.value ? '1' : undefined,
    },
  })
}
const goStats = () => {
  router.push({
    name: 'stats',
    query: {
      testDate: selectedTuesdayIso.value,
    },
  })
}

const handleSearchChange = (value) => {
  if (typeof value === 'string') {
    searchText.value = value
    return
  }

  searchText.value = String(value?.text ?? '')
  searchAllDates.value = Boolean(value?.allDates)
}

const handleSelectTuesday = (value) => {
  setSelectedTuesday(value)
}

const handleEditRow = (row) => {
  if (!row?.id) return
  router.push({
    name: 'main-edit',
    params: { id: row.id },
    query: {
      date: selectedTuesdayIso.value,
      q: String(searchText.value ?? '').trim() || undefined,
      all: searchAllDates.value ? '1' : undefined,
    },
  })
}

const handleToggleInspection = async (row) => {
  if (!row?.id) return
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      not_test: !Boolean(row.not_test),
    },
  })
}

const handleToggleHold = async (row) => {
  if (!row?.id) return
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      hold: !Boolean(row.hold),
    },
  })
}

const handleDeleteRow = async (row) => {
  if (!row?.id) return
  await deletePlanRow({ rowId: row.id })
}

const handleUpdateInch = async ({ row, value }) => {
  if (!row?.id) return
  const safeValue = String(value ?? '').trim()
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      inch: safeValue === '' ? null : Number(safeValue),
    },
  })
}

const handleCancelShipRow = async (row) => {
  if (!row?.id) return
  const updates = { shipment: false }
  if (row.worker_t === '출하완료') {
    updates.worker_t = '작업완료'
    updates.worker_t_time_final = ''
  }
  if (row.worker_nasa === '출하완료') {
    updates.worker_nasa = '작업완료'
    updates.worker_nasa_time_final = ''
  }
  if (row.worker_main === '출하완료') {
    updates.worker_main = '작업완료'
    updates.worker_main_time_final = ''
  }
  if (row.worker_welding === '출하완료') {
    updates.worker_welding = '작업완료'
    updates.worker_welding_time_final = ''
  }
  await updatePlanRowFields({ rowId: row.id, updates })
}

const handleShipRow = async (row) => {
  if (!row?.id) return
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const finalTimeStr = `${yy}.${mm}.${dd} ${HH}:${min}`

  const updates = { shipment: true }
  if (row.worker_t === '작업완료') {
    updates.worker_t = '출하완료'
    updates.worker_t_time_final = finalTimeStr
  }
  if (row.worker_nasa === '작업완료') {
    updates.worker_nasa = '출하완료'
    updates.worker_nasa_time_final = finalTimeStr
  }
  if (row.worker_main === '작업완료') {
    updates.worker_main = '출하완료'
    updates.worker_main_time_final = finalTimeStr
  }
  if (row.worker_welding === '작업완료') {
    updates.worker_welding = '출하완료'
    updates.worker_welding_time_final = finalTimeStr
  }

  await updatePlanRowFields({ rowId: row.id, updates })
}

const formatIsoDate = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatMonthDay = (date = new Date()) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}

const formatWorkerDate = (date = new Date()) => {
  const year = String(date.getFullYear()).slice(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}
const getNasaStatus = (row) => String(row?.nasa_status ?? '').trim() || String(row?.worker_nasa ?? '').trim()
const isDoneStatus = (value) => ['작업완료', '출하완료'].includes(String(value ?? '').trim())
const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
const isCompletionSatisfied = (row, workerTDone, workerMainDone) => {
  const requiresWorkerT = toNumber(row?.head) > 0
  const requiresWorkerMain = toNumber(row?.hole) > 0
  if (!requiresWorkerT && !requiresWorkerMain) return workerTDone && workerMainDone
  return (!requiresWorkerT || workerTDone) && (!requiresWorkerMain || workerMainDone)
}
const withCompleteUpdates = (row, updates) => {
  const workerTDone = isDoneStatus(updates.worker_t ?? row?.worker_t)
  const workerMainDone = isDoneStatus(updates.worker_main ?? row?.worker_main)
  const complete = isCompletionSatisfied(row, workerTDone, workerMainDone)
  return {
    ...updates,
    complete,
    complete_date: complete ? formatMonthDay() : '',
  }
}
const processConfigs = {
  worker_t: {
    statusField: 'worker_t',
    timeField: 'worker_t_time',
    finalTimeField: 'worker_t_time_final',
    stageStatusField: 'marking_weld_a_status',
    startedField: 'marking_weld_a_started_on',
    completedField: 'marking_weld_a_completed_on',
  },
  worker_main: {
    statusField: 'worker_main',
    timeField: 'worker_main_time',
    finalTimeField: 'worker_main_time_final',
    stageStatusField: 'main_status',
    startedField: 'main_started_on',
    completedField: 'main_completed_on',
  },
}

const buildProcessUpdates = (row, config, { reset = false } = {}) => {
  if (reset) {
    return withCompleteUpdates(row, {
      [config.statusField]: '없음',
      [config.timeField]: '',
      [config.finalTimeField]: '',
      [config.stageStatusField]: '없음',
      [config.startedField]: null,
      [config.completedField]: null,
    })
  }

  const current = String(row?.[config.statusField] ?? '').trim()
  if (!current || current === '없음' || current === '작업전') {
    return withCompleteUpdates(row, {
      [config.statusField]: '작업중',
      [config.timeField]: '',
      [config.finalTimeField]: '',
      [config.stageStatusField]: '작업중',
      [config.startedField]: formatIsoDate(),
      [config.completedField]: null,
    })
  }
  if (current === '작업중') {
    return withCompleteUpdates(row, {
      [config.statusField]: '작업완료',
      [config.timeField]: formatWorkerDate(),
      [config.stageStatusField]: '작업완료',
      [config.startedField]: row?.[config.startedField] || formatIsoDate(),
      [config.completedField]: formatIsoDate(),
    })
  }
  return null
}

const handleWeldingStart = async ({ row, inspector }) => {
  if (!row?.id) return
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      welding_status: '작업중',
      worker_welding: '작업중',
      welding_inspector: inspector,
      welding_started_on: formatIsoDate(),
      worker_welding_time: '',
    },
  })
  await supabase.from('welding_inspections').upsert(
    {
      product_list_id: row.id,
      company: row.company ?? '',
      place: row.place ?? '',
      area: row.area ?? '',
      head_count: row.head ?? 0,
      drawing_no: row.initial ?? '',
      test_date: row.test_date ?? '',
      inspector,
      welding_status: '작업중',
    },
    { onConflict: 'product_list_id' },
  )
}

const handleWeldingLongPress = async (row) => {
  if (!row?.id) return
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      welding_status: '없음',
      worker_welding: '없음',
      worker_welding_time: '',
      welding_started_on: null,
      welding_completed_on: null,
      welding_inspector: '',
    },
  })
  await supabase.from('welding_inspections').delete().eq('product_list_id', row.id)
}
const handleNasaLongPress = async (row) => {
  if (!row?.id) return
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      nasa_status: '없음',
      worker_nasa: '없음',
      worker_nasa_time: '',
      worker_nasa_time_final: '',
      nasa_started_on: null,
      nasa_completed_on: null,
    },
  })
}

const handleCellAction = async ({ row, columnKey, reset = false }) => {
  if (!row?.id || !columnKey) return

  if (processConfigs[columnKey]) {
    const updates = buildProcessUpdates(row, processConfigs[columnKey], { reset })
    if (!updates) return
    await updatePlanRowFields({ rowId: row.id, updates })
    return
  }

  if (columnKey === 'worker_nasa') {
    const current = getNasaStatus(row)
    let next = ''
    const updates = {}
    if (!current || current === '없음' || current === '작업전') {
      next = '작업중'
      updates.nasa_started_on = formatIsoDate()
      updates.nasa_completed_on = null
      updates.worker_nasa_time = ''
    } else if (current === '작업중') {
      next = '작업완료'
      updates.nasa_completed_on = formatIsoDate()
      updates.worker_nasa_time = formatWorkerDate()
    } else {
      return
    }
    updates.nasa_status = next
    updates.worker_nasa = next
    await updatePlanRowFields({ rowId: row.id, updates })
    return
  }

  if (columnKey === 'worker_welding') {
    const current = String(row.welding_status ?? '').trim()
    let next = ''
    const updates = {}
    if (!current || current === '없음' || current === '작업전') {
      next = '작업중'
      updates.welding_started_on = formatIsoDate()
      updates.worker_welding_time = ''
    } else if (current === '작업중') {
      next = '작업완료'
      updates.welding_completed_on = formatIsoDate()
      updates.worker_welding_time = formatWorkerDate()
    } else {
      return
    }
    updates.welding_status = next
    updates.worker_welding = next
    await updatePlanRowFields({ rowId: row.id, updates })
    if (next === '작업완료') {
      await supabase.from('welding_inspections')
        .update({ welding_status: '작업완료' })
        .eq('product_list_id', row.id)
    }
    return
  }

  if (columnKey === 'initial') {
    await updatePlanRowFields({
      rowId: row.id,
      updates: { stamp: !Boolean(row.stamp) },
    })
    return
  }

  if (columnKey === 'design_distributed') {
    if (!isAdminRole(profile.value?.role) && !isOperationsDepartment(profile.value?.department)) return
    await updatePlanRowFields({
      rowId: row.id,
      updates: { ahn: !Boolean(row.ahn) },
    })
    return
  }

  if (columnKey === 'name') {
    if (!isAdminRole(profile.value?.role) && !isDesignDepartment(profile.value?.department)) return
    await updatePlanRowFields({
      rowId: row.id,
      updates: { calculation: !Boolean(row.calculation) },
    })
    return
  }

  if (columnKey === 'company') {
    await updatePlanRowFields({
      rowId: row.id,
      updates: {
        drawing_date: row?.drawing_date ? null : new Date().toISOString(),
      },
    })
    return
  }

  if (columnKey === 'place') {
    router.push({ name: 'company-list' })
  }
}

const handleMoveTestDate = async ({ row, nextDateIso }) => {
  if (!row?.id || !nextDateIso) return
  await updatePlanRowFields({
    rowId: row.id,
    updates: {
      test_date: formatKoreanDate(nextDateIso),
    },
  })
}

const handleAddWeldingSchedule = async ({ row, scheduleDateIso, inspector, onResult }) => {
  if (!row?.id || !scheduleDateIso) {
    onResult?.({ ok: false })
    return
  }
  const result = await updatePlanRowFields({
    rowId: row.id,
    updates: {
      welding_schedule_date: scheduleDateIso,
      welding_schedule_inspector: inspector ?? '',
    },
  })
  onResult?.(result)
}

const handleRemoveWeldingSchedule = async ({ row, onResult }) => {
  if (!row?.id) {
    onResult?.({ ok: false })
    return
  }
  const result = await updatePlanRowFields({
    rowId: row.id,
    updates: {
      welding_schedule_date: null,
      welding_schedule_inspector: '',
    },
  })
  onResult?.(result)
}

const handleLoadDrawingFiles = async ({ rowId, onResult }) => {
  const result = await fetchDrawingFiles({ rowId })
  onResult?.(result)
}

const handleUploadDrawingFiles = async ({ rowId, files, onResult }) => {
  const result = await uploadDrawingFiles({ rowId, files })
  onResult?.(result)
}

const handleDeleteDrawingFile = async ({ fileId, onResult }) => {
  const result = await deleteDrawingFile({ fileId })
  onResult?.(result)
}



watch(
  () => [route.query.date, route.query.q, route.query.all],
  ([dateQuery, searchQuery, allQuery]) => {
    const nextDate = typeof dateQuery === 'string' ? dateQuery : ''
    const nextSearch = typeof searchQuery === 'string' ? searchQuery : ''
    const nextSearchAllDates = allQuery === '1'

    if (nextDate && nextDate !== selectedTuesdayIso.value) {
      setSelectedTuesday(nextDate)
    }
    if (nextSearch !== searchText.value) {
      searchText.value = nextSearch
    }
    if (nextSearchAllDates !== searchAllDates.value) {
      searchAllDates.value = nextSearchAllDates
    }
  },
  { immediate: true },
)

watch(
  () => [selectedTuesdayIso.value, searchText.value, searchAllDates.value],
  ([date, search, allDates]) => {
    const normalizedSearch = String(search ?? '').trim()
    const currentDate = typeof route.query.date === 'string' ? route.query.date : ''
    const currentSearch = typeof route.query.q === 'string' ? route.query.q : ''
    const currentAll = route.query.all === '1'
    if (currentDate === date && currentSearch === normalizedSearch && currentAll === allDates) return

    router.replace({
      name: 'main',
      query: {
        ...route.query,
        date,
        q: normalizedSearch || undefined,
        all: allDates ? '1' : undefined,
      },
    })
  },
)
</script>

<template>
  <MainProductionPlanView
    :page-title="pageTitle"
    :week-offset="weekOffset"
    :selected-tuesday-iso="selectedTuesdayIso"
    :search-text="searchText"
    :search-all-dates="searchAllDates"
    :plan-loading="planLoading"
    :plan-error="planError"
    :grouped-rows="groupedRows"
    :current-work-man="profile?.work_man || ''"
    :current-role="profile?.role || ''"
    :can-manage-welding-schedule="canManageWeldingSchedulePermission"
    @move-week="moveWeek"
    @reset-week="resetWeek"
    @go-register="goRegister"
    @go-stats="goStats"
    @search-change="handleSearchChange"
    @select-tuesday="handleSelectTuesday"
    @edit-row="handleEditRow"
    @toggle-row-inspection="handleToggleInspection"
    @toggle-row-hold="handleToggleHold"
    @delete-row="handleDeleteRow"
    @ship-row="handleShipRow"
    @cancel-ship-row="handleCancelShipRow"
    @cell-action="handleCellAction"
    @welding-start="handleWeldingStart"
    @welding-long-press="handleWeldingLongPress"
    @nasa-long-press="handleNasaLongPress"
    @update-inch="handleUpdateInch"
    @move-test-date="handleMoveTestDate"
    @add-welding-schedule="handleAddWeldingSchedule"
    @remove-welding-schedule="handleRemoveWeldingSchedule"
    @load-drawing-files="handleLoadDrawingFiles"
    @upload-drawing-files="handleUploadDrawingFiles"
    @delete-drawing-file="handleDeleteDrawingFile"
  />
</template>
