const STYLE_ID = 'niceentech-batch-print-style'
const HTML_CLASS = 'management-batch-print'

const BATCH_PRINT_CSS = `
html.${HTML_CLASS} .management-report-tabs,
html.${HTML_CLASS} .report-header,
html.${HTML_CLASS} .report-dialog,
html.${HTML_CLASS} .report-action-cell,
html.${HTML_CLASS} .report-print-title {
  display: none !important;
}

html.${HTML_CLASS} .batch-print-item {
  display: block !important;
  width: 100% !important;
}

html.${HTML_CLASS} .report-page:not(.report-page-break) {
  display: none !important;
}

html.${HTML_CLASS} .report-page.report-page-break {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  break-after: page;
  page-break-after: always;
}

html.${HTML_CLASS} .batch-print-item:last-child .report-page.report-page-break {
  break-after: auto;
  page-break-after: auto;
}

html.${HTML_CLASS} .report-root,
html.${HTML_CLASS} .report-root > main {
  max-width: none !important;
  width: 100% !important;
  min-height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
}

@media print {
  html.${HTML_CLASS} .management-report-tabs,
  html.${HTML_CLASS} .report-header,
  html.${HTML_CLASS} .report-dialog,
  html.${HTML_CLASS} .report-action-cell,
  html.${HTML_CLASS} .report-print-title,
  html.${HTML_CLASS} .report-page:not(.report-page-break) {
    display: none !important;
  }

  html.${HTML_CLASS} .batch-print-item {
    display: block !important;
    width: 100% !important;
  }

  html.${HTML_CLASS} .report-page.report-page-break {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    break-after: page;
    page-break-after: always;
  }

  html.${HTML_CLASS} .batch-print-item:last-child .report-page.report-page-break {
    break-after: auto;
    page-break-after: auto;
  }

  html.${HTML_CLASS} .report-root,
  html.${HTML_CLASS} .report-root > main {
    max-width: none !important;
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }
}
`

export const applyBatchPrintMode = () => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.add(HTML_CLASS)
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = BATCH_PRINT_CSS
}

export const clearBatchPrintMode = () => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove(HTML_CLASS)
  document.getElementById(STYLE_ID)?.remove()
}
