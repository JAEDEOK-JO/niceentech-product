import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { mapCncItem, type CncItem, type CncItemForm } from '../types/cnc'
import { sortCncItems } from '../utils/cncDate'

export async function fetchCncItems(): Promise<CncItem[]> {
  const { data, error } = await supabase
    .from('cnc_items')
    .select('*')

  if (error) throw error
  return sortCncItems((data ?? []).map((row) => mapCncItem(row as Record<string, unknown>)))
}

export async function fetchCncProductListIdSet(): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('cnc_items')
    .select('product_list_id')
    .not('product_list_id', 'is', null)

  if (error) throw error

  return new Set(
    (data ?? [])
      .map((row) => Number(row.product_list_id ?? 0))
      .filter((id) => id > 0),
  )
}

export async function createCncItem(form: CncItemForm, userId: string): Promise<CncItem> {
  const { data, error } = await supabase
    .from('cnc_items')
    .insert({
      company: form.company.trim(),
      place: form.place.trim(),
      area: form.area.trim(),
      drawing_no: form.drawingNo.trim(),
      kind: form.kind.trim(),
      quantity: form.quantity,
      length: form.length,
      is_completed: false,
      product_list_id: form.productListId ?? null,
      created_by: userId || null,
    })
    .select()
    .single()

  if (error) throw error
  return mapCncItem(data as Record<string, unknown>)
}

export async function updateCncItemCompleted(id: number, isCompleted: boolean): Promise<CncItem> {
  const { data, error } = await supabase
    .from('cnc_items')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapCncItem(data as Record<string, unknown>)
}

export async function updateCncItem(id: number, form: CncItemForm): Promise<CncItem> {
  const { data, error } = await supabase
    .from('cnc_items')
    .update({
      company: form.company.trim(),
      place: form.place.trim(),
      area: form.area.trim(),
      drawing_no: form.drawingNo.trim(),
      kind: form.kind.trim(),
      quantity: form.quantity,
      length: form.length,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapCncItem(data as Record<string, unknown>)
}

export async function deleteCncItem(id: number): Promise<void> {
  const { error } = await supabase
    .from('cnc_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function deleteCncItemByProductListId(productListId: number): Promise<void> {
  const id = Number(productListId ?? 0)
  if (!id) return

  const { error } = await supabase
    .from('cnc_items')
    .delete()
    .eq('product_list_id', id)

  if (error) throw error
}

export function subscribeCncItems(callback: () => void): RealtimeChannel {
  return supabase
    .channel('cnc-items-list')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cnc_items' },
      () => callback(),
    )
    .subscribe()
}

export function unsubscribeCncItems(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}
