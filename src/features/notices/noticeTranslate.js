import { supabase } from '@/lib/supabase'
import { NOTICE_LANGUAGES, noticeTranslationMap } from './noticeLanguages'

export async function translateNoticeBody(body) {
  const text = String(body ?? '').trim()
  if (!text) throw new Error('내용이 없습니다.')

  const { data, error } = await supabase.functions.invoke('translate-notice', {
    body: { body: text },
  })
  const translations = noticeTranslationMap(data?.translations)
  const missing = NOTICE_LANGUAGES.some((language) => !translations[language.code])
  if (error || missing) throw new Error('번역에 실패했습니다.')
  return translations
}
