const WRITE_REQUEST =
  /(삭제|수정|변경|업데이트|등록|추가|저장|초기화|취소)(해|하|좀|부탁|시키|할\s*수)|지워|없애|고쳐|바꿔|비워|넣어\s*줘|(삭제|수정|변경)\s*[.!?。]?$|\b(drop|delete|update|insert|truncate|alter)\b/i

export function isWriteRequest(question: string) {
  return WRITE_REQUEST.test(question.trim())
}
