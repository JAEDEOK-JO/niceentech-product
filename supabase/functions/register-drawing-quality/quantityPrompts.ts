import { PIPE_RULES, RECORD_RULES } from './quantityRules.ts'

export type SharedNote = {
  source_page: number
  text: string
  applies_to_pages: number[]
  scope: string
}

export type PipeRecordInput = Record<string, unknown>

export function buildSurveyPrompt(pageCount: number) {
  return `첨부한 PDF는 배관 제작 도면 ${pageCount}페이지 전체다. 이번 단계에서는 파이프 수량을 세지 않는다.

모든 페이지를 처음부터 끝까지 확인하고 다음 두 가지만 정리한다.

1. pages: 1부터 ${pageCount}까지 모든 페이지를 빠짐없이 한 건씩 기록한다. page_kind, 분석 여부(analyze), 판단 이유(reason)를 남긴다. 실제 파이프 상세도가 조금이라도 있으면 analyze는 true다.

2. shared_notes: 다른 페이지의 판독에 필요한 수량표, 층별 SET 표, EA 표기, 공통 작업 지시를 원문 그대로 옮긴다. 각 항목이 적용되는 페이지 번호(applies_to_pages)와 적용 범위(scope)를 적는다. 표가 적힌 페이지에만 적용되는 내용도 기록한다. 없으면 빈 배열이다.

${PIPE_RULES}

JSON 객체 하나만 반환한다.`
}

function formatNotes(notes: SharedNote[]) {
  if (notes.length === 0) return '없음'
  return notes
    .map((note) => `- ${note.source_page}페이지 표기 (적용 범위: ${note.scope || '미기재'}): ${note.text}`)
    .join('\n')
}

export function buildPagePrompt(options: { pageNo: number; pageCount: number; notes: SharedNote[] }) {
  return `첨부한 PDF는 원본 도면 ${options.pageCount}페이지 중 ${options.pageNo}페이지 한 장이다. 이 페이지의 파이프를 판독해 기록한다.

[다른 페이지에서 확인된 수량표·공통 지시]
${formatNotes(options.notes)}
위 내용은 이 페이지에 실제로 적용되는 경우에만 사용한다. 이 페이지 안에 별도 수량표가 있으면 그 적용 범위를 우선 확인한다.

먼저 페이지 전체에서 파이프와 수량표·SET 표기의 관계를 확인한 뒤, 위에서 아래로, 같은 줄의 왼쪽에서 오른쪽으로 번호별·파이프별로 판정한다.

page에는 다음을 기록한다.
- page_kind, analyzed: 상세도가 있어 분석했으면 true. 제외했으면 false와 exclusion_reason
- quantity_notes: 이 페이지에 적힌 수량표·SET·EA 표기 원문과 적용 범위
- fully_read: 페이지의 모든 상세도를 끝까지 판독했으면 true. 잘리거나 흐려서 읽지 못한 부분이 있으면 false와 unread_reason

${PIPE_RULES}

${RECORD_RULES}

JSON 객체 하나만 반환한다.`
}

export function buildZoomPrompt(options: {
  pageNo: number
  record: PipeRecordInput
  quantityNotes: string
}) {
  return `첨부한 PDF는 원본 도면 ${options.pageNo}페이지의 일부를 확대한 것이다. 앞선 판독에서 아래 기록을 확정하지 못했다.

[확정하지 못한 기록]
${JSON.stringify(options.record)}

[이 페이지의 수량표·SET·EA 표기]
${options.quantityNotes || '없음'}

확대된 영역에서 이 기록에 해당하는 파이프를 다시 판정한다. 해당 파이프를 찾았으면 found는 true이고, records에 그 파이프의 판정 결과를 기록한다. 기록 하나가 실제로는 여러 파이프였으면 각각 기록한다. 찾지 못했으면 found는 false이고 records는 빈 배열이다.

확대된 영역 밖의 수량표는 위에 적힌 표기만 사용한다. region은 원본 기록의 값을 그대로 둔다.

${PIPE_RULES}

${RECORD_RULES}

JSON 객체 하나만 반환한다.`
}
