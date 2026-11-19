import { supabase } from '@/lib/supabase'
import { NOTICE_IMAGE_LIMIT, noticeImagePaths } from './noticeImage'
import { noticeTranslationMap } from './noticeLanguages'
import { removeNoticeImages, signNoticeImageUrls, uploadNoticeImage } from './noticeImage.service'

export async function fetchNoticeWorkers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,activate')
    .eq('role', '작업자')
    .order('name')

  if (error) throw error
  return (data ?? [])
    .filter((row) => row.activate !== false && String(row.name || '').trim())
    .map((row) => ({ id: row.id, name: String(row.name).trim() }))
}

export async function fetchNotices() {
  const { data, error } = await supabase
    .from('worker_notices')
    .select('id,title,body,image_path,image_paths,requires_check,translations,created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  const notices = data ?? []
  if (notices.length === 0) return []

  const { data: checks, error: checkError } = await supabase
    .from('worker_notice_checks')
    .select('notice_id,user_id')
    .in('notice_id', notices.map((notice) => notice.id))

  if (checkError) throw checkError
  const checkedByNotice = new Map()
  for (const check of checks ?? []) {
    const ids = checkedByNotice.get(check.notice_id) ?? []
    ids.push(check.user_id)
    checkedByNotice.set(check.notice_id, ids)
  }

  const imageUrls = await signNoticeImageUrls(notices.flatMap((notice) => noticeImagePaths(notice)))
  return notices.map((notice) => ({
    ...notice,
    imageUrls: noticeImagePaths(notice).map((path) => imageUrls.get(path)).filter(Boolean),
    translations: noticeTranslationMap(notice.translations),
    checkedUserIds: checkedByNotice.get(notice.id) ?? [],
  }))
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user?.id) throw new Error('로그인이 필요합니다.')
  return data.session.user.id
}

export async function createNotice(title, body, files = [], requiresCheck = true, translations = {}) {
  const heading = String(title ?? '').trim()
  const text = String(body ?? '').trim()
  if (!heading || !text) throw new Error('내용이 없습니다.')
  const userId = await currentUserId()
  const imagePaths = []
  try {
    for (const file of [...files].slice(0, NOTICE_IMAGE_LIMIT)) {
      imagePaths.push(await uploadNoticeImage(userId, file))
    }
    const { error } = await supabase.from('worker_notices').insert({
      title: heading,
      body: text,
      created_by: userId,
      requires_check: requiresCheck !== false,
      translations: noticeTranslationMap(translations),
      image_paths: imagePaths.length ? imagePaths : null,
    })
    if (error) throw error
  } catch (error) {
    await removeNoticeImages(imagePaths)
    throw error
  }
}

export async function deleteNotice(notice) {
  const imagePaths = noticeImagePaths(notice)
  const { error } = await supabase.from('worker_notices').delete().eq('id', notice.id)
  if (error) throw error
  await removeNoticeImages(imagePaths)
}

export async function confirmNotice(noticeId) {
  const userId = await currentUserId()

  const { error } = await supabase.from('worker_notice_checks').insert({
    notice_id: noticeId,
    user_id: userId,
  })
  if (error && error.code !== '23505') throw error
}
