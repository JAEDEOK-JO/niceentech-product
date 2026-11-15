import { supabase } from '@/lib/supabase'
import { attachRewardPhotoUrls } from '@/features/worker/reward/reward.service'

const REWARD_COLUMNS =
  'id,user_id,photo_path,photo_paths,normal_photo_paths,original_note,found_note,status,amount,created_at'

async function withProfiles(rows) {
  const signed = await attachRewardPhotoUrls(rows)
  const userIds = [...new Set(signed.map((row) => row.user_id))]
  const names = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id,name,assigned_department')
      .in('id', userIds)
    if (error) throw error
    for (const profile of profiles ?? []) names.set(profile.id, profile)
  }

  return signed.map((row) => {
    const profile = names.get(row.user_id)
    return {
      ...row,
      name: profile?.name || '',
      department: profile?.assigned_department || '',
    }
  })
}

export async function fetchRewardReports({ year, month }) {
  const start = new Date(year, month ? month - 1 : 0, 1)
  const end = new Date(year, month ? month : 12, 1)
  const { data, error } = await supabase
    .from('worker_reward_reports')
    .select(REWARD_COLUMNS)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return withProfiles(data ?? [])
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
