import { supabase } from '@/lib/supabase'
import {
  finishDrawingQualityStatus,
  removeDrawingQualityStatus,
  startDrawingQualityStatus,
} from '@/features/main/drawing-quality/drawingQualityStatus'
import { watchDrawingQuantityState } from '@/features/main/drawing-quality/drawingQualityWatch'

function isPdfFile(file) {
  return String(file?.name ?? '').trim().toLowerCase().endsWith('.pdf')
}

async function readFailureMessage(error, data) {
  if (data?.message) return String(data.message)
  try {
    const body = await error?.context?.json?.()
    if (body?.message) return String(body.message)
  } catch {
    // 응답 본문이 없으면 기본 문구를 쓴다.
  }
  return '검수리스트 등록 실패'
}

async function registerDrawingQuality({ productListId, drawingFileId }) {
  const { data, error } = await supabase.functions.invoke('register-drawing-quality', {
    body: { productListId, drawingFileId },
  })

  if (data?.skipped) return { ok: true, skipped: true }
  if (data?.accepted) return { ok: true, accepted: true }
  if (error || !data?.ok) {
    return { ok: false, message: await readFailureMessage(error, data) }
  }

  return { ok: true, message: '검수리스트 등록', qualityListId: data.qualityListId }
}

async function resolveQuantityState(drawingFileId, result) {
  if (result?.skipped) return 'skipped'
  const watched = await watchDrawingQuantityState(drawingFileId)
  if (['done', 'review', 'running'].includes(watched)) return watched
  return 'failed'
}

export function scheduleDrawingQualityCheck({ productListId, drawingNo, group, files, onResult }) {
  if (group !== '용접/무용접') return
  const pdfs = (files ?? []).filter((file) => file?.id && isPdfFile(file))
  if (!productListId || pdfs.length === 0) return

  const statusId = startDrawingQualityStatus({
    productListId,
    drawingNo,
    group,
  })

  for (const file of pdfs) {
    void registerDrawingQuality({
      productListId,
      drawingFileId: file.id,
    })
      .then((result) => resolveQuantityState(file.id, result))
      .catch(() => watchDrawingQuantityState(file.id))
      .then((state) => {
        if (state === 'skipped') removeDrawingQualityStatus(statusId)
        else if (state === 'done' || state === 'review') finishDrawingQualityStatus(statusId, state)
        else if (state === 'running') return
        else finishDrawingQualityStatus(statusId, 'failed')
        onResult?.({ ok: state === 'done' || state === 'review', skipped: state === 'skipped' })
      })
      .catch(() => {
        finishDrawingQualityStatus(statusId, 'failed')
      })
  }
}
