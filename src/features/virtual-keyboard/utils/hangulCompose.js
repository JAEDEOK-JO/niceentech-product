const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]
const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ',
  'ㅣ',
]
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

const CHO_MAP = Object.fromEntries(CHO.map((ch, i) => [ch, i]))
const JUNG_MAP = Object.fromEntries(JUNG.map((ch, i) => [ch, i]))
const JONG_MAP = Object.fromEntries(JONG.map((ch, i) => [ch, i]).filter(([ch]) => ch))

const VOWEL_COMBINE = {
  ㅗㅏ: 'ㅘ',
  ㅗㅐ: 'ㅙ',
  ㅗㅣ: 'ㅚ',
  ㅜㅓ: 'ㅝ',
  ㅜㅔ: 'ㅞ',
  ㅜㅣ: 'ㅟ',
  ㅡㅣ: 'ㅢ',
}

const VOWEL_SPLIT = {
  ㅘ: ['ㅗ', 'ㅏ'],
  ㅙ: ['ㅗ', 'ㅐ'],
  ㅚ: ['ㅗ', 'ㅣ'],
  ㅝ: ['ㅜ', 'ㅓ'],
  ㅞ: ['ㅜ', 'ㅔ'],
  ㅟ: ['ㅜ', 'ㅣ'],
  ㅢ: ['ㅡ', 'ㅣ'],
}

const FINAL_COMBINE = {
  ㄱㅅ: 'ㄳ',
  ㄴㅈ: 'ㄵ',
  ㄴㅎ: 'ㄶ',
  ㄹㄱ: 'ㄺ',
  ㄹㅁ: 'ㄻ',
  ㄹㅂ: 'ㄼ',
  ㄹㅅ: 'ㄽ',
  ㄹㅌ: 'ㄾ',
  ㄹㅍ: 'ㄿ',
  ㄹㅎ: 'ㅀ',
  ㅂㅅ: 'ㅄ',
}

const FINAL_SPLIT = {
  ㄳ: ['ㄱ', 'ㅅ'],
  ㄵ: ['ㄴ', 'ㅈ'],
  ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'],
  ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'],
  ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'],
  ㅄ: ['ㅂ', 'ㅅ'],
}

const FINAL_TO_CHO = {
  ㄱ: 'ㄱ',
  ㄲ: 'ㄲ',
  ㄴ: 'ㄴ',
  ㄷ: 'ㄷ',
  ㄹ: 'ㄹ',
  ㅁ: 'ㅁ',
  ㅂ: 'ㅂ',
  ㅅ: 'ㅅ',
  ㅆ: 'ㅆ',
  ㅇ: 'ㅇ',
  ㅈ: 'ㅈ',
  ㅊ: 'ㅊ',
  ㅋ: 'ㅋ',
  ㅌ: 'ㅌ',
  ㅍ: 'ㅍ',
  ㅎ: 'ㅎ',
}

function isHangulSyllable(ch) {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function composeSyllable(cho, jung, jong = '') {
  const choIndex = CHO_MAP[cho]
  const jungIndex = JUNG_MAP[jung]
  if (choIndex == null || jungIndex == null) return null
  const jongIndex = jong ? JONG_MAP[jong] : 0
  if (jong && jongIndex == null) return null
  return String.fromCharCode(0xac00 + (choIndex * 21 + jungIndex) * 28 + (jongIndex || 0))
}

function decomposeSyllable(ch) {
  if (!isHangulSyllable(ch)) return null
  const code = ch.charCodeAt(0) - 0xac00
  const cho = CHO[Math.floor(code / 588)]
  const jung = JUNG[Math.floor((code % 588) / 28)]
  const jong = JONG[code % 28]
  return { cho, jung, jong }
}

/**
 * @param {string} text
 * @param {string} jamo 한글 자모 1글자
 * @returns {string}
 */
export function appendHangulJamo(text, jamo) {
  const value = String(text ?? '')
  const last = value.slice(-1)
  const head = value.slice(0, -1)

  if (CHO_MAP[jamo] != null) {
    if (!last) return jamo
    if (CHO_MAP[last] != null || JUNG_MAP[last] != null) return value + jamo

    const parts = decomposeSyllable(last)
    if (!parts) return value + jamo
    if (!parts.jong) {
      if (JONG_MAP[jamo] == null) return value + jamo
      return head + composeSyllable(parts.cho, parts.jung, jamo)
    }

    const combined = FINAL_COMBINE[parts.jong + jamo]
    if (combined) return head + composeSyllable(parts.cho, parts.jung, combined)
    return value + jamo
  }

  if (JUNG_MAP[jamo] != null) {
    if (!last) return jamo

    if (CHO_MAP[last] != null) {
      const syllable = composeSyllable(last, jamo)
      return syllable ? head + syllable : value + jamo
    }

    if (JUNG_MAP[last] != null) {
      const combined = VOWEL_COMBINE[last + jamo]
      return combined ? head + combined : value + jamo
    }

    const parts = decomposeSyllable(last)
    if (!parts) return value + jamo

    if (!parts.jong) {
      const combined = VOWEL_COMBINE[parts.jung + jamo]
      if (!combined) return value + jamo
      return head + composeSyllable(parts.cho, combined)
    }

    const split = FINAL_SPLIT[parts.jong]
    if (split) {
      const [keep, move] = split
      const prev = composeSyllable(parts.cho, parts.jung, keep)
      const next = composeSyllable(FINAL_TO_CHO[move] || move, jamo)
      if (!prev || !next) return value + jamo
      return head + prev + next
    }

    const move = FINAL_TO_CHO[parts.jong]
    if (!move) return value + jamo
    const prev = composeSyllable(parts.cho, parts.jung)
    const next = composeSyllable(move, jamo)
    if (!prev || !next) return value + jamo
    return head + prev + next
  }

  return value + jamo
}

/**
 * @param {string} text
 * @returns {string}
 */
export function backspaceHangul(text) {
  const value = String(text ?? '')
  if (!value) return ''
  const last = value.slice(-1)
  const head = value.slice(0, -1)

  if (CHO_MAP[last] != null || JUNG_MAP[last] != null) return head

  const parts = decomposeSyllable(last)
  if (!parts) return head

  if (parts.jong) {
    const split = FINAL_SPLIT[parts.jong]
    if (split) return head + composeSyllable(parts.cho, parts.jung, split[0])
    return head + composeSyllable(parts.cho, parts.jung)
  }

  const split = VOWEL_SPLIT[parts.jung]
  if (split) return head + composeSyllable(parts.cho, split[0])
  return head + parts.cho
}
