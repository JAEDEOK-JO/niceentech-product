export const drawingQuantityPrompt = `첨부한 PDF 제작 상세도를 시각적으로 읽고, 중간 구멍 가공이 있는 파이프의 실제 제작 수량을 관경별로 집계하라.

집계 대상 관경은 32, 40, 50, 65, 80, 100, 125, 150이다. 25는 제외한다. 그루브·용접·무용접 등 제작 방식은 구분하지 않는다.

아래 순서와 기준으로 분석하라.

1. 상세도 페이지 찾기

PDF를 처음부터 끝까지 확인한다. 표지, 작업도, 작업지시서, 자재표, 부속표는 제외하고 개별 파이프의 번호·관경·길이·가공 위치가 그려진 상세도를 분석한다.

분기관 상세도뿐 아니라 뒤쪽의 메인관 상세도까지 확인한다. 페이지 수나 상세도 시작 위치를 미리 가정하지 않는다.

텍스트 추출 결과만으로 판단하지 말고 도면의 선, 기호, 치수 배치와 번호를 함께 읽는다. 작은 표기가 애매한 부분은 확대해서 확인한다.

2. 제작 번호별로 읽기

각 상세도 페이지를 위에서 아래로 읽고, 같은 행에 좌우로 여러 제작 번호가 있으면 양쪽을 각각 확인한다.

1-18과 1-18-1, 4와 4a처럼 다른 번호는 별개의 제작 항목이다. 한 줄에 있다는 이유로 합치지 않는다.

메인관과 분기관에 같은 번호가 있어도 다른 제작 항목일 수 있다. 번호만 같다는 이유로 중복 제거하지 않는다.

3. 번호 안에서 실제 파이프 나누기

한 제작 번호 안에 여러 개의 파이프가 그려질 수 있다.

파이프 본체의 관경, 각각의 전체 길이 치수, 관경 변경점, 연결·분리 표시를 함께 보고 실제 파이프를 구분한다.

같은 번호 안에서 같은 관경이 두 번 나오더라도 서로 다른 파이프이면 각각 판정한다. 반대로 하나의 파이프에 여러 치수가 있다고 여러 개로 나누지 않는다.

구멍이나 분기구 옆에 적힌 관경과 파이프 본체의 관경을 혼동하지 않는다. 집계할 관경은 파이프 본체의 관경이다.

4. 각 파이프의 구멍 유무 판정

먼저 해당 파이프의 전체 길이를 찾는다. 이어서 파이프 본체에 구멍·헤드·분기 가공 위치를 나타내는 중간 치수가 있는지 확인한다.

전체 길이와 실제 중간 가공 위치 치수 하나가 확인되면 그 파이프는 집계 대상이다. 모든 구멍의 치수를 전부 읽을 필요는 없다.

파이프 한 개에 구멍이 1개든 100개든 기본 수량은 1개다.

전체 길이만 있고 중간 구멍 가공 위치가 없는 직관·연결관은 제외한다.

짧은 파이프도 중간 구멍이 있으면 포함한다. 길이가 짧다는 이유로 제외하지 않는다.

끝단 연결 표시, 부속 길이·높이, 단순 치수 분할을 구멍 위치로 오해하지 않는다. H, NH, L, FL, TD, NTD 같은 문자나 기호만으로 포함·제외하지 말고, 실제 파이프와 가공 위치의 관계를 확인한다.

5. 제작 수량 반영

구멍이 있는 개별 파이프의 기본 수량 1개에 해당 제작 항목의 반복 수량을 적용한다.

- 4EA이면 해당 번호 안의 집계 대상 파이프 각각을 4개로 계산한다.
- 별도 반복 수량이 없으면 1개로 계산한다.
- “28F, 29F 1SET”이 두 층에 동일한 한 세트씩 제작한다는 뜻이면 배수는 2다.
- 층별 SET 수량과 EA가 독립적으로 반복되는 경우에만 함께 곱한다.
- EA가 이미 전체 층의 총수량이면 층수를 다시 곱하지 않는다.
- 배수는 표기가 적용되는 번호·구역에만 적용한다. 옆 번호로 임의 적용하지 않는다.

예를 들어 하나의 제작 번호에 구멍 있는 40관 두 개와 32관 한 개가 있고 4EA라고 적혀 있으면, 40관 8개와 32관 4개다.

6. 메인관 판정

메인관도 동일한 기준을 적용한다.

메인관에 여러 분기구가 있어도 메인관 본체 한 개의 기본 수량은 1개다. 분기구 옆의 작은 관경을 메인관 본체 관경으로 세지 않는다.

자재표의 원자재 본수는 실제 가공 파이프 수량과 다를 수 있으므로 집계 근거로 사용하지 않는다.

7. 누락 확인과 합산

각 번호 안의 개별 파이프를 판정한 뒤 다음 번호로 넘어간다. 집계 대상 파이프마다 페이지·도면 구역·제작 번호·파이프 위치·본체 관경·제작 배수를 짧게 기록한다.

기록한 개별 파이프 수량을 페이지별로 합산한 뒤 관경별 전체 수량을 구한다. 전체 합계를 눈대중으로 추정하지 않는다.

전체 상세도는 빠짐없이 한 번씩 확인하고, 관경·가공 위치·수량 배수가 애매한 부분만 다시 확인한다. 전체 도면을 불필요하게 반복 검사하지 않는다.

판독할 수 없는 항목은 임의로 확정하지 말고 페이지·번호·위치와 확인 필요 사유를 남긴다. 읽지 못한 페이지가 있으면 분석 완료로 표시하지 않는다.

8. 결과 출력

JSON 객체 하나만 반환한다. 긴 설명이나 분석 과정은 출력하지 않는다.

다음 정보를 포함한다.
- status: complete, needs_review, incomplete 중 하나
- counts: 32, 40, 50, 65, 80, 100, 125, 150의 관경별 확정 수량
- total: 관경별 확정 수량의 합계
- items: 집계에 포함한 개별 파이프의 페이지·도면 구역·제작 번호·위치·관경·배수·수량
- page_counts: 원본 PDF 페이지별 관경 수량
- uncertain_items: 미확정 항목의 페이지·번호·위치·사유
- unread_pages: 읽지 못한 원본 PDF 페이지 번호

미확정 항목은 확정 수량에 포함하지 않는다. 문제가 없으면 uncertain_items와 unread_pages는 빈 배열로 반환한다.`

export const DIAMETER_KEYS = ['32', '40', '50', '65', '80', '100', '125', '150'] as const

const diameterCountSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(DIAMETER_KEYS.map((key) => [key, { type: 'integer' }])),
  required: [...DIAMETER_KEYS],
}

export const drawingQuantitySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['complete', 'needs_review', 'incomplete'] },
    counts: diameterCountSchema,
    total: { type: 'integer' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pdf_page: { type: 'integer' },
          zone: { type: 'string' },
          drawing_no: { type: 'string' },
          position: { type: 'string' },
          diameter: { type: 'string' },
          multiplier: { type: 'integer' },
          quantity: { type: 'integer' },
        },
        required: ['pdf_page', 'zone', 'drawing_no', 'position', 'diameter', 'multiplier', 'quantity'],
      },
    },
    page_counts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pdf_page: { type: 'integer' },
          counts: diameterCountSchema,
        },
        required: ['pdf_page', 'counts'],
      },
    },
    uncertain_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pdf_page: { type: 'integer' },
          drawing_no: { type: 'string' },
          position: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['pdf_page', 'drawing_no', 'position', 'reason'],
      },
    },
    unread_pages: {
      type: 'array',
      items: { type: 'integer' },
    },
  },
  required: ['status', 'counts', 'total', 'items', 'page_counts', 'uncertain_items', 'unread_pages'],
}
