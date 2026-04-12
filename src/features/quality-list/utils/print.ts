import * as XLSX from 'xlsx'
import type { QualityListRow } from '../types/quality'

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

export function printQualityList(items: QualityListRow[], title: string) {
  const popup = window.open('', '_blank', 'width=1280,height=900')
  if (!popup) {
    throw new Error('팝업이 차단되어 인쇄 화면을 열 수 없습니다.')
  }

  const rows = items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.testDate}</td>
        <td>${item.lotRound}</td>
        <td>${item.company}</td>
        <td>${item.place}</td>
        <td>${item.area}</td>
        <td>${item.initial}</td>
        <td>${item.lotNameH ?? ''}</td>
        <td>${item.lotNumH ?? ''}</td>
        <td>${item.a32}</td>
        <td>${item.a40}</td>
        <td>${item.a50}</td>
        <td>${item.a65}</td>
        <td>${item.m65}</td>
        <td>${item.m80}</td>
        <td>${item.m100}</td>
        <td>${item.m125}</td>
        <td>${item.m150}</td>
        <td>${item.m200}</td>
        <td>${item.totalH}</td>
      </tr>`,
    )
    .join('')

  popup.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin: 0 0 16px; font-size: 20px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>검사일</th>
              <th>차수</th>
              <th>회사명</th>
              <th>현장명</th>
              <th>구역명</th>
              <th>도번</th>
              <th>확관로트</th>
              <th>로트번호</th>
              <th>32A</th>
              <th>40A</th>
              <th>50A</th>
              <th>65A</th>
              <th>M65</th>
              <th>M80</th>
              <th>M100</th>
              <th>M125</th>
              <th>M150</th>
              <th>M200</th>
              <th>합계</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  popup.print()
}
