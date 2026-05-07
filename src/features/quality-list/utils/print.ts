import * as XLSX from 'xlsx'
import type { QualityListRow } from '../types/quality'

interface StampSizeRow {
  field: keyof QualityListRow
  size: number
  prev: number
  hasReducer: boolean
}

const STAMP_ROWS: StampSizeRow[] = [
  { field: 'a32',  size: 32,  prev: 25,  hasReducer: true  },
  { field: 'a40',  size: 40,  prev: 32,  hasReducer: true  },
  { field: 'a50',  size: 50,  prev: 40,  hasReducer: true  },
  { field: 'a65',  size: 65,  prev: 50,  hasReducer: true  },
  { field: 'm65',  size: 65,  prev: 50,  hasReducer: true  },
  { field: 'm80',  size: 80,  prev: 65,  hasReducer: true  },
  { field: 'm100', size: 100, prev: 80,  hasReducer: false },
  { field: 'm125', size: 125, prev: 100, hasReducer: false },
  { field: 'm150', size: 150, prev: 125, hasReducer: false },
  { field: 'm200', size: 200, prev: 150, hasReducer: false },
]

function extractTestYear(testDate: string): string {
  const match = String(testDate ?? '').match(/(\d{4})/)
  return match ? match[1] : ''
}

function buildStampLotNumber(lotNumH: number): string {
  const num = Number(lotNumH)
  if (!Number.isFinite(num) || num <= 0) return ''
  return String(num)
}

function sanitizeForFileName(input: string): string {
  return String(input ?? '').replace(/[\\/:*?"<>|]+/g, '_').trim()
}

export function exportQualityStampToExcel(item: QualityListRow) {
  const year = extractTestYear(item.testDate)
  const lotNumber = buildStampLotNumber(item.lotNumH)
  const manufacturer = [item.company, item.place].filter((part) => String(part ?? '').trim()).join('/')

  const rows = STAMP_ROWS.map((row) => ({
    수량: Number(item[row.field] ?? 0),
    제품형식: row.prev <= 25 ? `${row.size}x(25)` : `${row.size}x(${row.prev}~25)`,
    레듀샤: row.hasReducer ? `${row.size}x(${row.prev})` : '',
    배관재질: item.lotKsd ?? '',
    스케쥴번호: item.lotKsdNum ?? '',
    인증번호: item.lotCertification ?? '',
    로트번호: lotNumber,
    제조일자: year,
    제조번호: manufacturer,
    구분: '확관형',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, '증지')

  const namePart = sanitizeForFileName(`${item.company}_${item.place}`) || 'stamp'
  XLSX.writeFile(wb, `증지_${namePart}_${Date.now()}.xlsx`)
}

function buildRows(items: QualityListRow[]) {
  return items.map((item, index) => ({
    No: index + 1,
    검사일: item.testDate,
    차수: item.lotRound,
    회사명: item.company,
    현장명: item.place,
    구역명: item.area,
    도번: item.initial,
    확관로트: item.lotNameH,
    확관로트번호: item.lotNumH,
    백관32A: item.a32,
    백관40A: item.a40,
    백관50A: item.a50,
    백관65A: item.a65,
    메인65A: item.m65,
    메인80A: item.m80,
    메인100A: item.m100,
    메인125A: item.m125,
    메인150A: item.m150,
    메인200A: item.m200,
    합계: item.totalH,
    최종확인: item.total ? 'Y' : '',
  }))
}

export function exportQualityListToExcel(items: QualityListRow[], fileName: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(buildRows(items))
  XLSX.utils.book_append_sheet(wb, ws, 'quality')
  XLSX.writeFile(wb, fileName)
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function roundColor(round: string): string {
  if (round === '2차') return '#ea580c'
  if (round === '3차') return '#16a34a'
  if (round === '4차') return '#7c3aed'
  return '#111827'
}

export function printQualityList(items: QualityListRow[], title: string) {
  const popup = window.open('', '_blank', 'width=1280,height=900')
  if (!popup) {
    throw new Error('팝업이 차단되어 인쇄 화면을 열 수 없습니다.')
  }

  const total = items.reduce(
    (sum, item) =>
      sum + item.a32 + item.a40 + item.a50 + item.a65 +
      item.m65 + item.m80 + item.m100 + item.m125 + item.m150 + item.m200,
    0,
  )

  const rows = items
    .map((item, index) => {
      const placeParts = [item.company, item.place].filter((p) => String(p ?? '').trim())
      const placeMain = escapeHtml(placeParts.join(' '))
      const area = item.area ? ` ${escapeHtml(item.area)}` : ''
      const lotNumShort = item.lotNumH ? String(item.lotNumH).slice(-3) : '---'
      const color = roundColor(item.lotRound)
      const lotStart = item.lotNumStartH ? String(item.lotNumStartH) : ''
      const lotEnd = item.lotNumEndH ? String(item.lotNumEndH) : ''
      const lotCell = `
        <div class="lot-inner" style="color:${color}">
          <span class="lot-num">(${escapeHtml(lotNumShort)})</span>
          <span class="lot-name">${escapeHtml(item.lotNameH || '-')}</span>
          <span class="lot-range">${escapeHtml(lotStart)} ~ ${escapeHtml(lotEnd)}</span>
        </div>`
      const cell = (v: number) => (v ? String(v) : '')
      return `
      <tr>
        <td>${index + 1}</td>
        <td class="td-initial">${escapeHtml(item.initial)}</td>
        <td class="td-place">${placeMain}${area}</td>
        <td class="td-lot">${lotCell}</td>
        <td class="td-inch">${cell(item.a32)}</td>
        <td class="td-inch">${cell(item.a40)}</td>
        <td class="td-inch">${cell(item.a50)}</td>
        <td class="td-inch">${cell(item.a65)}</td>
        <td class="td-metric">${cell(item.m65)}</td>
        <td class="td-metric">${cell(item.m80)}</td>
        <td class="td-metric">${cell(item.m100)}</td>
        <td class="td-metric">${cell(item.m125)}</td>
        <td class="td-metric">${cell(item.m150)}</td>
        <td class="td-metric">${cell(item.m200)}</td>
        <td class="td-total">${item.totalH || ''}</td>
      </tr>`
    })
    .join('')

  popup.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 8mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', Arial, sans-serif; margin: 0; padding: 14px 18px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          h1 { margin: 0 0 10px; font-size: 20px; text-align: center; color: #1e3a8a; font-weight: 700; }
          .summary { display: flex; justify-content: flex-end; font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
          table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 14px; table-layout: fixed; }
          th, td {
            border-right: 1px solid #94a3b8;
            border-bottom: 1px solid #94a3b8;
            padding: 0;
            vertical-align: middle;
            text-align: center;
          }
          th:first-child, td:first-child { border-left: 1px solid #94a3b8; }
          thead th {
            color: #1e3a8a;
            font-weight: 700;
            font-size: 14px;
            height: 40px;
            padding: 0 4px;
            white-space: nowrap;
            border-top: 1px solid #94a3b8;
            border-right: 1px solid #64748b;
            border-bottom: 2px solid #475569;
          }
          thead .th-base   { background: #eff6ff; }
          thead .th-inch   { background: #dbeafe; }
          thead .th-metric { background: #ffedd5; color: #7c2d12; }
          tbody tr { height: 58px; page-break-inside: avoid; }
          tbody .td-initial { font-size: 13px; color: #334155; font-weight: 600; word-break: break-all; line-height: 1.4; }
          tbody .td-place {
            text-align: left;
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            padding: 6px 8px;
            line-height: 1.5;
            word-break: keep-all;
          }
          tbody .td-lot { padding: 0 4px; }
          tbody .lot-inner {
            display: flex; flex-direction: row; align-items: center; justify-content: center;
            gap: 3px; white-space: nowrap;
          }
          tbody .lot-num { font-size: 12px; font-weight: 600; }
          tbody .lot-name { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
          tbody .lot-range { font-size: 12px; font-weight: 600; }
          tbody .td-inch   { background: #ffffff; font-weight: 700; }
          tbody .td-metric { background: #fff7ed; font-weight: 700; }
          tbody .td-total  { font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="summary">총합 : ${total}개</div>
        <table>
          <colgroup>
            <col style="width:32px" />
            <col style="width:52px" />
            <col style="width:26%" />
            <col style="width:22%" />
            <col style="width:46px" />
            <col style="width:46px" />
            <col style="width:46px" />
            <col style="width:46px" />
            <col style="width:46px" />
            <col style="width:46px" />
            <col style="width:50px" />
            <col style="width:50px" />
            <col style="width:50px" />
            <col style="width:50px" />
            <col style="width:54px" />
          </colgroup>
          <thead>
            <tr>
              <th class="th-base">N</th>
              <th class="th-base">도번</th>
              <th class="th-base">현장명</th>
              <th class="th-base">확관</th>
              <th class="th-inch">32A</th>
              <th class="th-inch">40A</th>
              <th class="th-inch">50A</th>
              <th class="th-inch">65A</th>
              <th class="th-metric">65A</th>
              <th class="th-metric">80A</th>
              <th class="th-metric">100A</th>
              <th class="th-metric">125A</th>
              <th class="th-metric">150A</th>
              <th class="th-metric">200A</th>
              <th class="th-base">합계</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.addEventListener('load', function () {
            setTimeout(function () { window.focus(); window.print(); }, 150);
          });
        </script>
      </body>
    </html>
  `)
  popup.document.close()
}
