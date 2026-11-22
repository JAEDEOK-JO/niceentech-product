export const NOTICE_LANGUAGES = [
  { code: 'lo', label: '라오어', native: 'ລາວ', action: 'ແປ' },
  { code: 'my', label: '미얀마어', native: 'မြန်မာ', action: 'ဘာသာပြန်' },
  { code: 'th', label: '태국어', native: 'ไทย', action: 'แปล' },
  { code: 'en', label: '영어', native: 'English', action: 'Translate' },
  { code: 'ru', label: '러시아어', native: 'Русский', action: 'Перевести' },
  { code: 'vi', label: '베트남어', native: 'Tiếng Việt', action: 'Dịch' },
  { code: 'ur', label: '파키스탄어', native: 'اردو', action: 'ترجمہ' },
  { code: 'bn', label: '방글라데시어', native: 'বাংলা', action: 'অনুবাদ' },
  { code: 'ne', label: '네팔어', native: 'नेपाली', action: 'अनुवाद' },
]

const CODES = new Set(NOTICE_LANGUAGES.map((language) => language.code))

function readBody(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') return String(value.body ?? '').trim()
  return ''
}

export function noticeTranslationMap(value) {
  const source = value && typeof value === 'object' ? value : {}
  const next = {}
  for (const language of NOTICE_LANGUAGES) {
    const body = readBody(source[language.code])
    if (body) next[language.code] = body
  }
  return next
}

export function noticeTranslationList(value) {
  const map = noticeTranslationMap(value)
  return NOTICE_LANGUAGES.filter((language) => map[language.code])
}

export function noticeTitle(notice) {
  return String(notice?.title || notice?.body || '')
}

export function noticeDisplayText(value) {
  return String(value ?? '').replace(/\\r\\n|\\n|\\r/g, '\n')
}

export function noticeBody(notice, code) {
  const translated = CODES.has(code) ? noticeTranslationMap(notice?.translations)[code] : ''
  return noticeDisplayText(translated || notice?.body || '')
}

export function noticeTextDir(code) {
  return code === 'ur' ? 'rtl' : 'ltr'
}
