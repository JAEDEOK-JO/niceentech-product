import { supabase } from '@/lib/supabase'
import { noticeImageExtension } from './noticeImage'

const BUCKET = 'worker-notices'

export async function uploadNoticeImage(userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.${noticeImageExtension(file)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeNoticeImages(paths) {
  const list = [...new Set((paths ?? []).filter(Boolean))]
  if (list.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(list)
  if (error) throw error
}

export async function signNoticeImageUrls(paths) {
  const unique = [...new Set(paths.filter(Boolean))]
  const urls = new Map()
  if (unique.length === 0) return urls
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60)
  if (error) throw error
  for (const item of data ?? []) urls.set(item.path, item.signedUrl || '')
  return urls
}
