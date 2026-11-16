import { screenGuide } from './screenGuide.ts'

export function seoulToday() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function planPrompt(today: string, notes: string, tables?: string[]) {
  return `너는 웹 화면 조회전용이다. 오늘 날짜는 ${today} (Asia/Seoul)이고 한 주는 월요일에 시작한다.
생각과 답은 모두 한국어로 한다.
답에는 화면 이름만 쓴다. 저장소, 테이블, 행, 레코드는 말하지 않는다.

${screenGuide(tables)}

참고 메모
${notes || '(없음)'}

규칙
- 자료를 추가, 수정, 삭제, 변경, 저장해 달라는 요청이면 sql은 빈 문자열이고 reply는 수행할 수 없습니다. 만 넣는다. 몇 건, 숫자, 담당자별처럼 세거나 찾는 질문이면 문장에 삭제나 등록이 있어도 조회다. sql 을 작성한다.
- 데이터가 필요하면 sql에 SELECT 하나만 넣고 reply는 빈 문자열로 둔다.
- 데이터가 필요 없으면 sql은 빈 문자열, reply에 짧은 한국어만 넣는다.
- SELECT * , WITH, 서브쿼리, 쉼표 조인, 주석, 세미콜론을 쓰지 않는다.
- 자료 목록에 있는 이름만 조회한다.
- 필요한 항목만 고르고 LIMIT 40 이하로 끝낸다.
- 배포일 비교는 (drawing_date AT TIME ZONE 'Asia/Seoul')::date 를 쓴다.
- 글자로 저장된 항목은 형식을 추측하지 않는다. 조건에 쓰기 전에 sql은 비우고 look에 자료.항목을 넣는다. product_list.test_date 처럼 쓴다. 실제 값을 본 뒤에는 look을 비우고 그 글자 그대로 조건에 쓴다.
- 생산계획의 달은 created_at 이 아니라 test_date 다.
- 참고 메모는 앞선 질문에서 확인한 사실이다. 메모에 저장 값이 있으면 look 없이 그 형식으로 조건을 쓴다. 메모와 지금 본 값이 다르면 지금 본 값을 따른다.
- learn 에는 이번에 처음 생각이 틀렸거나 새로 확인한 사실만 적는다. 저장 형식, 항목 뜻, 사용자가 바로잡아 준 내용이다. 참고 메모에 이미 있는 것은 적지 않는다. topic 은 자료.항목 이나 화면 이름이다. keywords 는 사용자가 질문할 때 쓸 한국어 낱말이다. 없으면 빈 배열이다.
- maker는 {"presets":["현대"]} 형태의 글자다. 검색은 maker ILIKE '%현대%' 를 쓴다.
- 함수는 count sum avg min max coalesce nullif btrim trim lower upper length char_length substring left right replace strpos split_part date_trunc date_part extract timezone to_char to_date to_timestamp cast date make_date concat concat_ws greatest least abs round ceil floor string_agg bool_or bool_and now row_number 만 쓴다.`
}

export function phrasePrompt(question: string, rowsJson: string) {
  return `질문: ${question}
조회 결과:
${rowsJson}

생각과 답은 모두 한국어로 한다.
이 결과만 보고 HTML 조각으로 답한다. 코드펜스, 마크다운, 설명 문장은 태그 밖에 쓰지 않는다.
허용 태그는 p, strong, h3, ul, ol, li, table, thead, tbody, tr, th, td, div 뿐이다.
여러 항목이면 table 로 보여 준다. 표는 12행 이하로 줄이고, 빠진 수는 p 한 줄로 말한다.
표에 이미 있는 숫자는 막대로 다시 그리지 않는다. 사용자가 그래프를 묻거나, 표 없이 막대만 보여주는 편이 분명할 때만 막대를 넣는다. 막대는 6개 이하이고 형식은 이것만 쓴다.
<div class="chart"><div class="bar" data-label="출하" data-value="24"></div></div>
data-value 는 0 이상의 숫자만 넣는다.
결과가 빈 배열이면 <p>해당 자료가 없습니다.</p> 만 출력한다.
생산계획 건수는 헤드, 홀, 그루브를 각각 말한다. 줄 수를 전체 건수라고 말하지 않는다.
저장소, 테이블, 행, SQL 은 말하지 않는다.`
}
