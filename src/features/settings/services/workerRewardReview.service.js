import { supabase } from '@/lib/supabase'
import { attachRewardPhotoUrls } from '@/features/worker/reward/reward.service'

export async function fetchPendingRewards() {
  const { data, error } = await supabase
    .from('worker_reward_reports')
    .select('id,user_id,photo_path,photo_paths,normal_photo_paths,original_note,found_note,created_at')
    .eq('status', '대기')
    .order('created_at', { ascending: true })

  if (error) throw error
  const rows = await attachRewardPhotoUrls(data ?? [])
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const names = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,name,assigned_department')
      .in('id', userIds)
    if (profileError) throw profileError
    for (const profile of profiles ?? []) names.set(profile.id, profile)
  }

  return rows.map((row) => {
    const profile = names.get(row.user_id)
    return {
      ...row,
      name: profile?.name || '',
      department: profile?.assigned_department || '',
    }
  })
}

export async function reviewReward(id, status) {
  const { data, error } = await supabase
    .from('worker_reward_reports')
    .update({ status })
    .eq('id', id)
    .eq('status', '대기')
    .select('id')

  if (error) return { ok: false, message: '처리에 실패했습니다.' }
  if (!data?.length) return { ok: false, message: '처리에 실패했습니다.' }
  return { ok: true }
}
