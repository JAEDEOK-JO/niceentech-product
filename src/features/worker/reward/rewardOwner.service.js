import { supabase } from '@/lib/supabase'
import { keptRewardPhotoPaths, newRewardPhotoFiles } from './rewardOwner'
import { REWARD_PHOTO_LIMIT } from './rewardPhotos'
import { uploadRewardPhotos } from './reward.service'

const BUCKET = 'worker-rewards'

function storedPaths(row) {
  const normal = Array.isArray(row.normal_photo_paths) ? row.normal_photo_paths.filter(Boolean) : []
  const problem = Array.isArray(row.photo_paths) && row.photo_paths.length
    ? row.photo_paths.filter(Boolean)
    : row.photo_path
      ? [row.photo_path]
      : []
  return [...normal, ...problem]
}

async function removeStoredPhotos(paths) {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return
  await supabase.storage.from(BUCKET).remove(unique)
}

export async function updateOwnRewardReport(userId, report, { normalPhotos, problemPhotos, foundNote }) {
  const found = String(foundNote ?? '').trim()
  if (!found) throw new Error('문제가 없습니다.')

  const uploaded = []
  let normalPaths = []
  let problemPaths = []
  try {
    const normalNew = await uploadRewardPhotos(userId, newRewardPhotoFiles(normalPhotos))
    uploaded.push(...normalNew)
    const problemNew = await uploadRewardPhotos(userId, newRewardPhotoFiles(problemPhotos))
    uploaded.push(...problemNew)

    normalPaths = [...keptRewardPhotoPaths(normalPhotos), ...normalNew].slice(0, REWARD_PHOTO_LIMIT)
    problemPaths = [...keptRewardPhotoPaths(problemPhotos), ...problemNew].slice(0, REWARD_PHOTO_LIMIT)
    const { data, error } = await supabase
      .from('worker_reward_reports')
      .update({
        photo_path: problemPaths[0] ?? null,
        photo_paths: problemPaths.length ? problemPaths : null,
        normal_photo_paths: normalPaths.length ? normalPaths : null,
        original_note: String(report.original_note ?? '').trim(),
        found_note: found,
        status: '대기',
      })
      .eq('id', report.id)
      .eq('user_id', userId)
      .select('id')

    if (error || !data?.length) {
      await removeStoredPhotos(uploaded)
      throw error || new Error('수정할 수 없습니다.')
    }
  } catch (error) {
    await removeStoredPhotos(uploaded)
    throw error
  }

  const kept = new Set([...normalPaths, ...problemPaths])
  await removeStoredPhotos(storedPaths(report).filter((path) => !kept.has(path)))
}

export async function deleteOwnRewardReport(userId, report) {
  const { data, error } = await supabase
    .from('worker_reward_reports')
    .delete()
    .eq('id', report.id)
    .eq('user_id', userId)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new Error('삭제할 수 없습니다.')
  await removeStoredPhotos(storedPaths(report))
}
