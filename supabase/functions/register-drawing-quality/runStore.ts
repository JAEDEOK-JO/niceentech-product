import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import type { PipeRecord } from './aggregateRecords.ts'
import type { SharedNote } from './quantityPrompts.ts'

export const ACTIVE_RUN_STATES = ['pending', 'surveying', 'reading', 'zooming'] as const
export type RunState = (typeof ACTIVE_RUN_STATES)[number] | 'done' | 'review' | 'failed'
export type TaskKind = 'survey' | 'page' | 'zoom'
export type TaskState = 'queued' | 'submitted' | 'done' | 'failed'

export type PageEntry = {
  pdf_page: number
  page_kind: string
  analyze: boolean
  state: 'pending' | 'read' | 'excluded' | 'failed'
  reason: string
  fully_read: boolean
  unread_reason: string
  quantity_notes: { text: string; scope: string }[]
}

export type QuantityRun = {
  id: number
  drawing_pdf_id: number | null
  product_list_id: number | null
  source_path: string
  file_name: string | null
  insert_quality: boolean
  state: RunState
  start_after: string
  page_count: number | null
  pages: PageEntry[]
  shared_notes: SharedNote[]
  records: PipeRecord[]
  error: string | null
  created_at: string
}

export type QuantityTask = {
  id: number
  run_id: number
  kind: TaskKind
  pages: number[]
  record_key: string | null
  context: Record<string, unknown>
  state: TaskState
  attempts: number
  response_id: string | null
  result: Record<string, unknown> | null
  error: string | null
  submitted_at: string | null
}

const RUN_LOCK_MS = 120_000

const throwIf = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

export async function createRun(
  supabase: SupabaseClient,
  values: {
    drawingPdfId: number | null
    productListId: number | null
    sourcePath: string
    fileName: string
    insertQuality: boolean
    startAfter: Date
    model: string
    effort: string
  },
) {
  const { data, error } = await supabase
    .from('drawing_quantity_runs')
    .insert({
      drawing_pdf_id: values.drawingPdfId,
      product_list_id: values.productListId,
      source_path: values.sourcePath,
      file_name: values.fileName,
      insert_quality: values.insertQuality,
      start_after: values.startAfter.toISOString(),
      model: values.model,
      reasoning_effort: values.effort,
    })
    .select('id')
    .single()
  throwIf(error)
  return Number(data.id)
}

export async function lockRun(supabase: SupabaseClient, runId: number) {
  const now = new Date()
  const { data, error } = await supabase
    .from('drawing_quantity_runs')
    .update({ locked_until: new Date(now.getTime() + RUN_LOCK_MS).toISOString() })
    .eq('id', runId)
    .in('state', [...ACTIVE_RUN_STATES])
    .lte('start_after', now.toISOString())
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select('*')
  throwIf(error)
  return (data?.[0] as QuantityRun | undefined) ?? null
}

export async function unlockRun(supabase: SupabaseClient, runId: number) {
  await supabase.from('drawing_quantity_runs').update({ locked_until: null }).eq('id', runId)
}

export async function updateRun(supabase: SupabaseClient, runId: number, values: Record<string, unknown>) {
  const { error } = await supabase
    .from('drawing_quantity_runs')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', runId)
  throwIf(error)
}

export async function listDueRunIds(supabase: SupabaseClient, limit = 20) {
  const { data, error } = await supabase
    .from('drawing_quantity_runs')
    .select('id')
    .in('state', [...ACTIVE_RUN_STATES])
    .lte('start_after', new Date().toISOString())
    .order('id', { ascending: true })
    .limit(limit)
  throwIf(error)
  return (data ?? []).map((row) => Number(row.id))
}

export async function listTasks(supabase: SupabaseClient, runId: number) {
  const { data, error } = await supabase
    .from('drawing_quantity_tasks')
    .select('*')
    .eq('run_id', runId)
    .order('id', { ascending: true })
  throwIf(error)
  return (data ?? []) as QuantityTask[]
}

export async function createTasks(
  supabase: SupabaseClient,
  runId: number,
  tasks: { kind: TaskKind; pages: number[]; recordKey?: string; context?: Record<string, unknown> }[],
) {
  if (tasks.length === 0) return
  const { error } = await supabase.from('drawing_quantity_tasks').insert(
    tasks.map((task) => ({
      run_id: runId,
      kind: task.kind,
      pages: task.pages,
      record_key: task.recordKey ?? null,
      context: task.context ?? {},
    })),
  )
  throwIf(error)
}

export async function updateTask(supabase: SupabaseClient, taskId: number, values: Record<string, unknown>) {
  const { error } = await supabase
    .from('drawing_quantity_tasks')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  throwIf(error)
}
