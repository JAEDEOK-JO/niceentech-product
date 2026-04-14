<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainProductionPlanView from '@/features/main/MainProductionPlanView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useProductionPlan } from '@/composables/useProductionPlan'
import { isAdminRole, isDesignDepartment, normalizeDepartment } from '@/utils/adminAccess'

const router = useRouter()
const route = useRoute()
const { session } = useAuth()
const { profile } = useProfile(session)
const {
  weekOffset,
  selectedTuesdayIso,
  searchText,
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
    },
  })
}

const handleSearchChange = (value) => {
  searchText.value = String(value ?? '')
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

const handleCellAction = async ({ row, columnKey }) => {
  if (!row?.id || !columnKey) return

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
  () => [route.query.date, route.query.q],
  ([dateQuery, searchQuery]) => {
    const nextDate = typeof dateQuery === 'string' ? dateQuery : ''
    const nextSearch = typeof searchQuery === 'string' ? searchQuery : ''

    if (nextDate && nextDate !== selectedTuesdayIso.value) {
      setSelectedTuesday(nextDate)
    }
    if (nextSearch !== searchText.value) {
      searchText.value = nextSearch
    }
  },
  { immediate: true },
)

watch(
  () => [selectedTuesdayIso.value, searchText.value],
  ([date, search]) => {
    const normalizedSearch = String(search ?? '').trim()
    const currentDate = typeof route.query.date === 'string' ? route.query.date : ''
    const currentSearch = typeof route.query.q === 'string' ? route.query.q : ''
    if (currentDate === date && currentSearch === normalizedSearch) return

    router.replace({
      name: 'main',
      query: {
        ...route.query,
        date,
        q: normalizedSearch || undefined,
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
    :plan-loading="planLoading"
    :plan-error="planError"
    :grouped-rows="groupedRows"
    :current-work-man="profile?.work_man || ''"
    @move-week="moveWeek"
    @reset-week="resetWeek"
    @go-register="goRegister"
    @search-change="handleSearchChange"
    @select-tuesday="handleSelectTuesday"
    @edit-row="handleEditRow"
    @toggle-row-inspection="handleToggleInspection"
    @toggle-row-hold="handleToggleHold"
    @delete-row="handleDeleteRow"
    @ship-row="handleShipRow"
    @cancel-ship-row="handleCancelShipRow"
    @cell-action="handleCellAction"
    @move-test-date="handleMoveTestDate"
    @load-drawing-files="handleLoadDrawingFiles"
    @upload-drawing-files="handleUploadDrawingFiles"
    @delete-drawing-file="handleDeleteDrawingFile"
  />
</template>
