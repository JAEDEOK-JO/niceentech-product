import { HALF_YEAR_IMPROVEMENT_ITEMS } from './halfYearImprovementNotes'

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const formatQty = (value) => Math.round(Number(value) || 0).toLocaleString('ko-KR')
const formatRate = (rate) => {
  const numeric = Number(rate)
  if (!Number.isFinite(numeric)) return '-'
  return `${numeric.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`
}

const CARD_TONES = {
  indigo: '#eef2ff',
  sky: '#f0f9ff',
  amber: '#fffbeb',
  emerald: '#ecfdf5',
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

const renderColumnChart = (months, valueKey, color, formatter = formatQty) => {
  const max = Math.max(...months.map((month) => Number(month[valueKey]) || 0), 1)
  return `
  <div class="col-chart">
    ${months
      .map((month) => {
        const value = Number(month[valueKey]) || 0
        const height = Math.max(Math.round((value / max) * 120), value > 0 ? 4 : 0)
        return `
      <div class="col">
        <span class="col-value">${formatter(value)}</span>
        <div class="col-bar" style="height:${height}px;background:${color}"></div>
        <span class="col-label">${esc(month.label)}</span>
      </div>`
      })
      .join('')}
  </div>`
}

const renderMonthlyTable = (months, summary) => `
  <table>
    <thead>
      <tr>
        <th>월</th><th>생산(검수)</th><th>도면(배포)</th><th>목요일12시이후</th><th>지연비중</th><th>당월배포 생산완료</th>
      </tr>
    </thead>
    <tbody>
      ${months
        .map(
          (month) => `
      <tr>
        <td>${esc(month.label)}</td>
        <td>${formatQty(month.producedHeadQty)}</td>
        <td>${formatQty(month.drawingHeadQty)}</td>
        <td class="${month.lateDrawingHeadQty > 0 ? 'warn' : ''}">${formatQty(month.lateDrawingHeadQty)}</td>
        <td class="${month.lateDrawingRate >= 30 ? 'bad' : ''}">${formatRate(month.lateDrawingRate)}</td>
        <td>${formatQty(month.drawingProducedHeadQty)} (${formatRate(month.drawingConversionRate)})</td>
      </tr>`,
        )
        .join('')}
      <tr class="total">
        <td>합계</td>
        <td>${formatQty(summary.producedHeadQty)}</td>
        <td>${formatQty(summary.drawingHeadQty)}</td>
        <td>${formatQty(summary.lateDrawingHeadQty)}</td>
        <td>${formatRate(summary.lateDrawingRate)} (평균)</td>
        <td>${formatQty(summary.drawingProducedHeadQty)} (${formatRate(summary.drawingConversionRate)})</td>
      </tr>
    </tbody>
  </table>`

const IMPROVE_TYPE_COLORS = {
  개선됨: 'background:#d1fae5;color:#047857;',
  요청: 'background:#ffe4e6;color:#be123c;',
  건의: 'background:#fef3c7;color:#b45309;',
  '개선 예정': 'background:#e0e7ff;color:#4338ca;',
}

const renderImprovementSection = () => `
  <section class="panel">
    <h2 class="improve-heading">개선사항 및 문제점</h2>
    <div class="improve-grid">
      ${HALF_YEAR_IMPROVEMENT_ITEMS.map(
        (item) => `
      <div class="improve-card">
        <div class="improve-head">
          <span class="improve-badge" style="${IMPROVE_TYPE_COLORS[item.type] ?? ''}">${esc(item.type)}</span>
          <p class="improve-title">${esc(item.title)}</p>
        </div>
        <p class="improve-body">${esc(item.body)}</p>
      </div>`,
      ).join('')}
    </div>
  </section>`

export const buildHalfYearReportHtml = ({
  periodLabel,
  summaryCards,
  monthlyRows,
  summary,
}) => `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>생산부 반기 결산 - ${esc(periodLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif; background: #f1f5f9; color: #0f172a; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { margin: 0; font-size: 22px; }
    .period { margin: 4px 0 20px; color: #4f46e5; font-weight: 800; }
    h2 { margin: 0 0 12px; font-size: 15px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; }
    .card-label { margin: 0; font-size: 11px; font-weight: 700; color: #64748b; }
    .card-value { margin: 6px 0 0; font-size: 16px; font-weight: 800; }
    .card-sub { margin: 4px 0 0; font-size: 10px; font-weight: 700; color: #64748b; }
    .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .col-chart { display: flex; align-items: flex-end; gap: 8px; min-height: 160px; padding-top: 8px; }
    .col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .col-bar { width: 100%; max-width: 36px; border-radius: 8px 8px 0 0; }
    .col-value, .col-label { font-size: 10px; font-weight: 700; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 10px; border-top: 1px solid #e2e8f0; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    thead th { background: #f8fafc; font-size: 11px; color: #64748b; border-top: 0; }
    tr.total { background: #f8fafc; font-weight: 800; }
    .warn { color: #d97706; }
    .bad { color: #e11d48; }
    .improve-heading { font-size: 17px; }
    .improve-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .improve-card { border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 14px; }
    .improve-head { display: flex; align-items: center; gap: 8px; }
    .improve-badge { border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .improve-title { margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; }
    .improve-body { margin: 8px 0 0; font-size: 13px; font-weight: 600; color: #334155; line-height: 1.6; }
    @media (max-width: 720px) { .improve-grid { grid-template-columns: 1fr; } }
    @media print {
      body { background: #fff; }
      .wrap { max-width: none; padding: 0; }
    }
    @media (max-width: 720px) {
      .cards, .grid-2 { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>생산부 반기 결산</h1>
    <p class="period">${esc(periodLabel)}</p>

    <div class="cards">${renderSummaryCards(summaryCards)}</div>

    <div class="grid-2">
      <section class="panel">
        <h2>월별 생산량(검수일)</h2>
        ${renderColumnChart(monthlyRows, 'producedHeadQty', '#6366f1')}
      </section>
      <section class="panel">
        <h2>월별 도면배포(배포일)</h2>
        ${renderColumnChart(monthlyRows, 'drawingHeadQty', '#0ea5e9')}
      </section>
    </div>

    <div class="grid-2">
      <section class="panel">
        <h2>목요일 12시 이후 도면</h2>
        ${renderColumnChart(monthlyRows, 'lateDrawingHeadQty', '#f59e0b')}
      </section>
      <section class="panel">
        <h2>당월배포 → 생산완료</h2>
        ${renderColumnChart(monthlyRows, 'drawingProducedHeadQty', '#6366f1')}
      </section>
    </div>

    <section class="panel">
      <h2>월별 상세</h2>
      ${renderMonthlyTable(monthlyRows, summary)}
    </section>

    ${renderImprovementSection()}
  </div>
</body>
</html>`
