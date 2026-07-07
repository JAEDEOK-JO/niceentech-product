import { ref } from 'vue'
import { useProductionHalfYearData } from './useProductionHalfYearData'
import { buildSummaryCards, buildReview, buildOutlook } from './productionHalfYearAnalysis'
import { buildHalfYearReportHtml } from './halfYearReportHtml'

// 반기 결산 데이터를 모아 독립형 HTML로 만들어 브라우저(크롬)로 연다
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
        summaryCards: buildSummaryCards({
          summary: data.summary.value,
          shipmentSummary: data.shipmentSummary.value,
          drawingSummary: data.drawingSummary.value,
        }),
        review: buildReview({
          summary: data.summary.value,
          monthlyProduction: data.monthlyProduction.value,
          shipmentSummary: data.shipmentSummary.value,
          drawingSummary: data.drawingSummary.value,
          periodLabel: data.periodLabel.value,
        }),
        outlook: buildOutlook({
          summary: data.summary.value,
          shipmentSummary: data.shipmentSummary.value,
          year: data.year.value,
          half: data.half.value,
        }),
        monthlyProduction: data.monthlyProduction.value,
        workTypeBreakdown: data.workTypeBreakdown.value,
        processMetrics: data.processMetrics.value,
        shipmentSummary: data.shipmentSummary.value,
        drawingSummary: data.drawingSummary.value,
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
