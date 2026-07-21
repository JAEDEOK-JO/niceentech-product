import { supabase } from '@/lib/supabase'

export const ATTENDANCE_EVIDENCE_MAX = 5
export const ATTENDANCE_EVIDENCE_BUCKET = 'media'
export const ATTENDANCE_EVIDENCE_FOLDER = 'attendance'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])

export function normalizeEvidenceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, ATTENDANCE_EVIDENCE_MAX)
}

export function canAddEvidence(currentCount: number, addCount = 1): boolean {
  return currentCount + addCount <= ATTENDANCE_EVIDENCE_MAX
}

export function isAllowedEvidenceFile(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true
  const name = file.name.toLowerCase()
  return /\.(jpe?g|png|webp|gif)$/.test(name)
}

function buildStoragePath(userId: string, file: File): string {
  const extMatch = file.name.match(/(\.[a-zA-Z0-9]+)$/)
  const ext = extMatch?.[1]?.toLowerCase() || '.jpg'
  const randomId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const safeUser = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '')
  return `${ATTENDANCE_EVIDENCE_FOLDER}/${safeUser}/${randomId}${ext}`
}

export async function uploadAttendanceEvidence(
  file: File,
  userId: string,
): Promise<string> {
  if (!isAllowedEvidenceFile(file)) {
    throw new Error('이미지 파일만 등록할 수 있습니다.')
  }

  const storagePath = buildStoragePath(userId, file)
  const { error } = await supabase.storage
    .from(ATTENDANCE_EVIDENCE_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
    })

  if (error) throw error

  const { data } = supabase.storage
    .from(ATTENDANCE_EVIDENCE_BUCKET)
    .getPublicUrl(storagePath)

  return data.publicUrl
}

export async function uploadAttendanceEvidenceFiles(
  files: File[],
  userId: string,
  currentUrls: string[] = [],
): Promise<string[]> {
  const remaining = ATTENDANCE_EVIDENCE_MAX - currentUrls.length
  if (remaining <= 0) return currentUrls

  const targets = files.slice(0, remaining)
  const uploaded: string[] = []

  for (const file of targets) {
    const url = await uploadAttendanceEvidence(file, userId)
    uploaded.push(url)
  }

  return [...currentUrls, ...uploaded].slice(0, ATTENDANCE_EVIDENCE_MAX)
}

export function getEvidenceStoragePathFromUrl(url: string): string | null {
  const marker = `/object/public/${ATTENDANCE_EVIDENCE_BUCKET}/`
  const raw = String(url ?? '')
  const index = raw.indexOf(marker)
  if (index < 0) return null
  return decodeURIComponent(raw.slice(index + marker.length))
}

export async function removeAttendanceEvidence(url: string): Promise<void> {
  const path = getEvidenceStoragePathFromUrl(url)
  if (!path) return
  const { error } = await supabase.storage
    .from(ATTENDANCE_EVIDENCE_BUCKET)
    .remove([path])
  if (error) throw error
}

export async function removeAttendanceEvidenceUrls(urls: string[]): Promise<void> {
  const paths = urls
    .map((url) => getEvidenceStoragePathFromUrl(url))
    .filter((path): path is string => Boolean(path))
  if (paths.length === 0) return
  const { error } = await supabase.storage
    .from(ATTENDANCE_EVIDENCE_BUCKET)
    .remove(paths)
  if (error) throw error
}
