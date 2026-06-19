import { supabase } from '@/lib/supabase'
import {
  WELDING_SCHEDULE_PERMISSION_ERROR,
  canManageWeldingSchedule,
  type WeldingSchedulePermissionProfile,
} from '@/features/welding-schedule/utils/weldingSchedulePermission'

const PRODUCT_LIST_TABLE = 'product_list'

export interface WeldingScheduleRow {
  id: number
  initial: string
  company: string
  place: string
  area: string
  work_type: string
  head: number
  hole: number
  inch: number
  groove: number
  welding_status: string
  worker_welding: string
  worker_welding_time: string
  worker_welding_time_final: string
  shipment: boolean
  welding_schedule_inspector: string
  welding_inspector: string
  welding_schedule_date: string
  memo: string
  test_date: string
}

const toNumber = (value: unknown) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const normalizeText = (value: unknown) => String(value ?? '').trim()

const getCurrentProfile = async (): Promise<WeldingSchedulePermissionProfile | null> => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user?.id) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as WeldingSchedulePermissionProfile
}

const assertWeldingSchedulePermission = async () => {
  const profile = await getCurrentProfile()
  if (!canManageWeldingSchedule(profile)) {
    throw new Error(WELDING_SCHEDULE_PERMISSION_ERROR)
  }
}

export const parseIsoDate = (value: string) => {
  const raw = normalizeText(value)
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return null
  const [, year, month, day] = matched
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export const formatIsoDate = (date: Date) => {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  next.setHours(0, 0, 0, 0)
  return next
}

export const getWeekStartMonday = (baseDate = new Date()) => {
  const safe = new Date(baseDate)
  safe.setHours(0, 0, 0, 0)
  const day = safe.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return addDays(safe, mondayOffset)
}

export const formatKoreanDate = (value: string | Date) => {
  const date = value instanceof Date ? value : parseIsoDate(value)
  if (!date) return normalizeText(value)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
}

export const formatShortDate = (value: string | Date) => {
  const date = value instanceof Date ? value : parseIsoDate(value)
  if (!date) return normalizeText(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const mapWeldingScheduleRow = (row: Record<string, unknown>): WeldingScheduleRow => ({
  id: Number(row.id),
  initial: normalizeText(row.initial),
  company: normalizeText(row.company),
  place: normalizeText(row.place),
  area: normalizeText(row.area),
  work_type: normalizeText(row.work_type),
  head: toNumber(row.head),
  hole: toNumber(row.hole),
  inch: toNumber(row.inch),
  groove: toNumber(row.groove),
  welding_status: normalizeText(row.welding_status),
  worker_welding: normalizeText(row.worker_welding),
  worker_welding_time: normalizeText(row.worker_welding_time),
  worker_welding_time_final: normalizeText(row.worker_welding_time_final),
  shipment: Boolean(row.shipment),
  welding_schedule_inspector: normalizeText(row.welding_schedule_inspector),
  welding_inspector: normalizeText(row.welding_inspector),
  welding_schedule_date: normalizeText(row.welding_schedule_date),
  memo: normalizeText(row.memo),
  test_date: normalizeText(row.test_date),
})

export const fetchWeldingScheduleRows = async (weekStartIso: string) => {
  const weekStart = parseIsoDate(weekStartIso)
  if (!weekStart) return []
  const weekEndIso = formatIsoDate(addDays(weekStart, 6))

  const { data, error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .select(
      'id,initial,company,place,area,work_type,head,hole,inch,groove,welding_status,worker_welding,worker_welding_time,worker_welding_time_final,shipment,welding_schedule_inspector,welding_inspector,welding_schedule_date,memo,test_date',
    )
    .gte('welding_schedule_date', weekStartIso)
    .lte('welding_schedule_date', weekEndIso)
    .order('welding_schedule_date', { ascending: true })
    .order('company', { ascending: true })
    .order('place', { ascending: true })
    .order('area', { ascending: true })

  if (error) {
    throw new Error(error.message ?? '용접일정을 불러오지 못했습니다.')
  }

  return (data ?? []).map((row) => mapWeldingScheduleRow(row as Record<string, unknown>))
}

export const updateWeldingScheduleRow = async (rowId: number, scheduleDateIso: string, inspector: string) => {
  await assertWeldingSchedulePermission()

  const { error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .update({
      welding_schedule_date: scheduleDateIso,
      welding_schedule_inspector: inspector,
    })
    .eq('id', rowId)

  if (error) {
    throw new Error(error.message ?? '용접일정을 변경하지 못했습니다.')
  }
}

export const clearWeldingScheduleRow = async (rowId: number) => {
  await assertWeldingSchedulePermission()

  const { error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .update({
      welding_schedule_date: null,
      welding_schedule_inspector: '',
    })
    .eq('id', rowId)

  if (error) {
    throw new Error(error.message ?? '용접일정을 취소하지 못했습니다.')
  }
}
