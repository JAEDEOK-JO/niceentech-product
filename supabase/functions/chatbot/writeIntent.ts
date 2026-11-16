const WRITE_REQUEST =
  /(삭제|수정|변경|업데이트|등록|추가|저장|초기화|취소)(해|하|좀|부탁|시키|할\s*수)|지워|없애|고쳐|바꿔|비워|넣어\s*줘|(삭제|수정|변경)\s*[.!?。]?$|\b(drop|delete|update|insert|truncate|alter)\b/i

const LOOKUP = /(몇|숫자|건수|횟수|얼마|누구|담당자|별로|현황|조회|알려|보여|리스트|목록)/
const DIRECT_ORDER = /(해\s*줘|해주세요|해\s*주세요|해라|부탁|시켜|지워|없애|고쳐|바꿔|비워)/

export function isWriteRequest(question: string) {
  const text = question.trim()
  if (!WRITE_REQUEST.test(text)) return false
  if (LOOKUP.test(text) && !DIRECT_ORDER.test(text)) return false
  return true
}
