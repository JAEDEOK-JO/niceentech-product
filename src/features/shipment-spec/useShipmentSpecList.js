import { computed, ref, watch } from 'vue'
import { fetchShipmentSpecRows } from './fetchShipmentSpecRows'
import {
  addWeeks,
  formatIsoDate,
  formatKoreanDate,
  getBaseTuesday,
} from './shipmentSpecDates'

export const useShipmentSpecList = (session) => {
  const selectedTuesday = ref(getBaseTuesday())
  const rows = ref([])
  const loading = ref(false)
  const errorMessage = ref('')

  const weekOffset = computed(() => {
    const diffMs = selectedTuesday.value.getTime() - getBaseTuesday().getTime()
    return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
  })

  const selectedTuesdayIso = computed(() => formatIsoDate(selectedTuesday.value))
  const filterDate = computed(() => formatKoreanDate(selectedTuesday.value))
  const pageTitle = computed(() => `${filterDate.value} 출하명세서`)

  const moveWeek = (delta) => {
    selectedTuesday.value = addWeeks(selectedTuesday.value, delta)
  }

  const resetWeek = () => {
    selectedTuesday.value = getBaseTuesday()
  }

  const loadRows = async () => {
    if (!session.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      rows.value = await fetchShipmentSpecRows(filterDate.value)
    } catch (error) {
      rows.value = []
      errorMessage.value = error?.message ?? '조회 실패'
    } finally {
      loading.value = false
    }
  }

  watch([session, selectedTuesday], () => {
    void loadRows()
  }, { immediate: true })

  return {
    rows,
    loading,
    errorMessage,
    weekOffset,
    selectedTuesdayIso,
    pageTitle,
    moveWeek,
    loadRows,
  }
}
