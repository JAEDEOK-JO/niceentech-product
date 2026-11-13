import { supabase } from '@/lib/supabase'
import { compressRewardPhoto } from './compressRewardPhoto'
import { REWARD_AMOUNT } from './rewardAmount'
import { REWARD_PHOTO_LIMIT } from './rewardPhotos'

const BUCKET = 'worker-rewards'

const normalPathsOf = (row) =>
  (Array.isArray(row.normal_photo_paths) ? row.normal_photo_paths : []).filter(Boolean)

const problemPathsOf = (row) => {
  if (Array.isArray(row.photo_paths) && row.photo_paths.length > 0) return row.photo_paths.filter(Boolean)
  return row.photo_path ? [row.photo_path] : []
}

export async function signRewardPhotoUrls(paths) {
  const unique = [...new Set(paths.filter(Boolean))]
  const urls = new Map()
  if (unique.length === 0) return urls
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60)
  if (error) throw error
  for (const item of data ?? []) urls.set(item.path, item.signedUrl || '')
  return urls
}

export async function attachRewardPhotoUrls(rows) {
  const signed = await signRewardPhotoUrls(rows.flatMap((row) => [...normalPathsOf(row), ...problemPathsOf(row)]))
  return rows.map((row) => ({
    ...row,
    normalPhotoUrls: normalPathsOf(row).map((path) => signed.get(path) || '').filter(Boolean),
    problemPhotoUrls: problemPathsOf(row).map((path) => signed.get(path) || '').filter(Boolean),
  }))
}

export async function fetchMyRewards(userId) {
  const { data, error } = await supabase
    .from('worker_reward_reports')
    .select('id,photo_path,photo_paths,normal_photo_paths,original_note,found_note,status,amount,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return attachRewardPhotoUrls(data ?? [])
}

async function uploadPhotos(userId, files) {
  const paths = []
  for (const file of [...files].slice(0, REWARD_PHOTO_LIMIT)) {
    const photo = await compressRewardPhoto(file)
    const path = `${userId}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(BUCKET).upload(path, photo, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (error) throw error
    paths.push(path)
  }
  return paths
}

export async function submitRewardReport(userId, { normalFiles, problemFiles, originalNote, foundNote }) {
  const found = String(foundNote ?? '').trim()
  if (!found) throw new Error('문제가 없습니다.')
  const paths = []
  try {
    const normalPaths = await uploadPhotos(userId, normalFiles ?? [])
    paths.push(...normalPaths)
    const problemPaths = await uploadPhotos(userId, problemFiles ?? [])
    paths.push(...problemPaths)

    const { error } = await supabase.from('worker_reward_reports').insert({
      user_id: userId,
      photo_path: problemPaths[0] ?? null,
      photo_paths: problemPaths.length ? problemPaths : null,
      normal_photo_paths: normalPaths.length ? normalPaths : null,
      original_note: String(originalNote ?? '').trim(),
      found_note: found,
      status: '대기',
      amount: REWARD_AMOUNT,
    })
    if (error) throw error
  } catch (error) {
    if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths)
    throw error
  }
}
