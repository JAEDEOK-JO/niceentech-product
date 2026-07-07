// 데이터가 포함된 독립형 HTML 결산 보고서 생성 (브라우저에서 로그인 없이 열람)

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const formatQty = (value) => Math.round(Number(value) || 0).toLocaleString('ko-KR')

const CARD_TONES = {
  indigo: '#eef2ff',
  sky: '#f0f9ff',
  emerald: '#ecfdf5',
  amber: '#fffbeb',
  violet: '#f5f3ff',
}

const renderSummaryCards = (cards) =>
  cards
    .map(
      (card) => `
      <div class="card" style="background:${CARD_TONES[card.tone] ?? '#f8fafc'}">
        <p class="card-label">${esc(card.label)}</p>
        <p class="card-value">${esc(card.value)}</p>
        ${card.sub ? `<p class="card-sub">${esc(card.sub)}</p>` : ''}
      </div>`,
    )
    .join('')

const renderReview = (review) => `
  <p class="headline">${esc(review.headline)}</p>
  <ul class="review-list">
    ${review.items
      .map(
        (item) => `
      <li><span class="tag">${esc(item.title)}</span><span>${esc(item.text)}</span></li>`,
      )
      .join('')}
  </ul>`

const renderColumnChart = (months, valueKey, color) => {
  const max = Math.max(...months.map((month) => Number(month[valueKey]) || 0), 1)
  return `
  <div class="col-chart">
    ${months
      .map((month) => {
        const value = Number(month[valueKey]) || 0
        const height = Math.max(Math.round((value / max) * 120), value > 0 ? 4 : 0)
        return `
      <div class="col">
        <span class="col-value">${formatQty(value)}</span>
        <div class="col-bar" style="height:${height}px;background:${color}"></div>
        <span class="col-label">${esc(month.label)}</span>
      </div>`
      })
      .join('')}
  </div>`
}

const renderMonthlyTable = (months, summary, shipmentSummary) => `
  <table>
    <thead>
      <tr>
        <th>월</th><th>현장 수</th><th>생산 헤드</th><th>인치 작업</th><th>출하완료</th><th>미출하</th>
      </tr>
    </thead>
    <tbody>
      ${months
        .map(
          (month) => `
      <tr>
        <td>${esc(month.label)}</td>
        <td>${formatQty(month.siteCount)}</td>
        <td>${formatQty(month.totalHeadQty)}</td>
        <td>${month.inchQty > 0 ? formatQty(month.inchQty) : '-'}</td>
        <td class="good">${formatQty(month.shippedHeadQty)}</td>
        <td class="${month.unshippedHeadQty > 0 ? 'bad' : ''}">${formatQty(month.unshippedHeadQty)}</td>
      </tr>`,
        )
        .join('')}
      <tr class="total">
        <td>합계</td>
        <td>${formatQty(summary.siteCount)}</td>
        <td>${formatQty(summary.totalHeadQty)}</td>
        <td>${summary.inchQty > 0 ? formatQty(summary.inchQty) : '-'}</td>
        <td class="good">${formatQty(shipmentSummary.shippedHeadQty)}</td>
        <td class="bad">${formatQty(shipmentSummary.unshippedHeadQty)}</td>
      </tr>
    </tbody>
  </table>`

const renderRowBars = (items, color) => {
  const max = Math.max(...items.map((item) => Number(item.totalHeadQty) || 0), 1)
  return items
    .map(
      (item) => `
    <div class="row-bar">
      <div class="row-bar-head">
        <span>${esc(item.label)}</span>
        <span>${formatQty(item.totalHeadQty)}헤드 · ${formatQty(item.siteCount)}개 현장</span>
      </div>
      <div class="track"><div class="fill" style="width:${((Number(item.totalHeadQty) || 0) / max) * 100}%;background:${color}"></div></div>
    </div>`,
    )
    .join('')
}

export const buildHalfYearReportHtml = ({
  periodLabel,
  summary,
  summaryCards,
  review,
  outlook,
  monthlyProduction,
  workTypeBreakdown,
  processMetrics,
  shipmentSummary,
  drawingSummary,
}) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>생산부 반기 결산 · ${esc(periodLabel)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; background: #f1f5f9; color: #0f172a; padding: 24px; }
  .wrap { max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  h1 { font-size: 20px; }
  .period { color: #4f46e5; font-weight: 700; font-size: 14px; margin-top: 2px; }
  .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; }
  .panel h2 { font-size: 14px; margin-bottom: 12px; }
  .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
  .card-label { font-size: 11px; color: #64748b; font-weight: 700; }
  .card-value { font-size: 15px; font-weight: 800; margin-top: 4px; }
  .card-sub { font-size: 10px; color: #64748b; font-weight: 700; margin-top: 2px; }
  .headline { background: #eef2ff; color: #312e81; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 700; line-height: 1.6; }
  .review-list { list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
  .review-list li { display: flex; gap: 8px; font-size: 12px; line-height: 1.6; color: #334155; font-weight: 600; }
  .tag { flex-shrink: 0; background: #f1f5f9; color: #475569; border-radius: 6px; padding: 2px 6px; font-size: 10px; font-weight: 800; height: fit-content; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .col-chart { display: flex; align-items: flex-end; gap: 8px; height: 170px; padding-top: 16px; }
  .col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; height: 100%; }
  .col-bar { width: 70%; max-width: 44px; border-radius: 6px 6px 0 0; }
  .col-value { font-size: 10px; font-weight: 800; color: #475569; }
  .col-label { font-size: 11px; font-weight: 700; color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f8fafc; color: #64748b; font-size: 11px; padding: 8px 10px; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  td { padding: 8px 10px; text-align: right; border-top: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-variant-numeric: tabular-nums; }
  tr.total td { border-top: 2px solid #e2e8f0; background: #f8fafc; font-weight: 800; color: #0f172a; }
  .good { color: #059669; }
  .bad { color: #e11d48; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .row-bar { margin-bottom: 10px; }
  .row-bar-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; }
  .track { height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
  .fill { height: 100%; border-radius: 999px; }
  .gauge-facts { display: flex; gap: 24px; flex-wrap: wrap; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; }
  .gauge-facts .accent { color: #4f46e5; }
  .outlook { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .outlook-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
  .outlook-label { font-size: 11px; color: #64748b; font-weight: 700; }
  .outlook-value { font-size: 14px; font-weight: 800; margin-top: 4px; }
  .note { margin-top: 10px; font-size: 12px; color: #475569; font-weight: 600; }
  @media print {
    body { background: #fff; padding: 0; }
    .panel { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>생산부 반기 결산</h1>
    <p class="period">${esc(periodLabel)}</p>
  </header>

  <section class="cards">${renderSummaryCards(summaryCards)}</section>

  <section class="panel">
    <h2>총평</h2>
    ${renderReview(review)}
  </section>

  <section class="charts">
    <div class="panel">
      <h2>월별 생산량 (헤드)</h2>
      ${renderColumnChart(monthlyProduction, 'totalHeadQty', '#6366f1')}
    </div>
    <div class="panel">
      <h2>월별 미출하 (헤드)</h2>
      ${renderColumnChart(monthlyProduction, 'unshippedHeadQty', '#f43f5e')}
    </div>
  </section>

  <section class="panel">
    <h2>월별 상세</h2>
    ${renderMonthlyTable(monthlyProduction, summary, shipmentSummary)}
  </section>

  <section class="two-col">
    <div class="panel">
      <h2>작업 유형별 실적</h2>
      ${renderRowBars(workTypeBreakdown, '#6366f1')}
    </div>
    <div class="panel">
      <h2>공정별 완료 물량</h2>
      ${renderRowBars(processMetrics, '#10b981')}
    </div>
  </section>

  <section class="panel">
    <h2>도면배포 대비 생산 소화율</h2>
    <div class="gauge-facts">
      <span>배포 ${formatQty(drawingSummary.totalHeadQty)}헤드 (${formatQty(drawingSummary.siteCount)}개 현장)</span>
      <span>생산 ${formatQty(drawingSummary.producedHead)}헤드</span>
      <span class="accent">소화율 ${(Number(drawingSummary.conversionRate) || 0).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%</span>
    </div>
    <div class="track" style="height:14px">
      <div class="fill" style="width:${Math.min(Number(drawingSummary.conversionRate) || 0, 100)}%;background:${
        (Number(drawingSummary.conversionRate) || 0) >= 100 ? '#10b981' : '#6366f1'
      }"></div>
    </div>
  </section>

  <section class="panel">
    <h2>${esc(outlook.nextLabel)} 전망</h2>
    <div class="outlook">
      ${outlook.rows
        .map(
          (row) => `
      <div class="outlook-item">
        <p class="outlook-label">${esc(row.label)}</p>
        <p class="outlook-value">${esc(row.value)}</p>
      </div>`,
        )
        .join('')}
    </div>
    ${outlook.note ? `<p class="note">${esc(outlook.note)}</p>` : ''}
  </section>
</div>
</body>
</html>`
