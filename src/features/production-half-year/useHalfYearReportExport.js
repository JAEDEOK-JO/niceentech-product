import { ref } from 'vue'
import { useProductionHalfYearData } from './useProductionHalfYearData'
import { buildSummaryCards } from './productionHalfYearAnalysis'
import { buildHalfYearReportHtml } from './halfYearReportHtml'

export const useHalfYearReportExport = () => {
  const isExporting = ref(false)
  const exportError = ref('')

  const openHalfYearReport = async () => {
    if (isExporting.value) return
    isExporting.value = true
    exportError.value = ''

    try {
      const data = useProductionHalfYearData()
      await data.fetchData()
      if (data.errorMessage.value) throw new Error(data.errorMessage.value)

      const html = buildHalfYearReportHtml({
        periodLabel: data.periodLabel.value,
        summary: data.summary.value,
        summaryCards: buildSummaryCards({ summary: data.summary.value }),
        monthlyRows: data.monthlyRows.value,
      })

      const filename = `production-half-year-${data.year.value}-H${data.half.value}.html`

      if (window.electronAPI?.openHtmlReport) {
        const result = await window.electronAPI.openHtmlReport({ filename, html })
        if (!result?.success) throw new Error(result?.error ?? '브라우저에서 열지 못했습니다.')
        return
      }

      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      window.open(blobUrl, '_blank')
    } catch (error) {
      exportError.value = error?.message ?? '반기 결산 보고서를 생성하지 못했습니다.'
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportError, openHalfYearReport }
}
