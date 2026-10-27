import { supabase } from '@/lib/supabase'

export async function saveQualityMergeBackup(keeperId: number, ids: number[]) {
  const original = await supabase.from('quality_list').select('*').in('id', ids)
  if (original.error) throw original.error
  if ((original.data?.length ?? 0) !== ids.length) throw new Error('합칠 항목을 다시 불러와 주세요.')

  const saved = await supabase
    .from('quality_merge_backups')
    .insert({ keeper_id: keeperId, rows: original.data })
    .select('id')
    .single()
  if (saved.error) throw saved.error
  return Number(saved.data.id)
}

export async function discardQualityMergeBackup(backupId: number) {
  await supabase.from('quality_merge_backups').delete().eq('id', backupId)
}

export async function fetchQualityMergeBackups(keeperIds: number[]) {
  const backups = new Map<number, number>()
  if (keeperIds.length === 0) return backups

  const response = await supabase
    .from('quality_merge_backups')
    .select('id, keeper_id')
    .in('keeper_id', keeperIds)
    .order('created_at', { ascending: false })
  if (response.error) return backups

  for (const row of response.data ?? []) {
    const keeperId = Number(row.keeper_id)
    if (!backups.has(keeperId)) backups.set(keeperId, Number(row.id))
  }
  return backups
}

export async function undoQualityMerge(backupId: number) {
  const response = await supabase.rpc('undo_quality_merge', { p_backup_id: backupId })
  if (response.error) throw response.error
}
