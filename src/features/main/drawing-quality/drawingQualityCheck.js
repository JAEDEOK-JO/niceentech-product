import { supabase } from '@/lib/supabase'
import {
  finishDrawingQualityStatus,
  removeDrawingQualityStatus,
  startDrawingQualityStatus,
} from '@/features/main/drawing-quality/drawingQualityStatus'

export const DRAWING_QUALITY_CHECK_DELAY_MS = 10_000

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
  if (error || !data?.ok) {
    return { ok: false, message: await readFailureMessage(error, data) }
  }

  return { ok: true, message: '검수리스트 등록', qualityListId: data.qualityListId }
}

export function scheduleDrawingQualityCheck({ productListId, drawingNo, group, files, onResult }) {
  const pdfs = (files ?? []).filter((file) => file?.id && isPdfFile(file))
  if (!productListId || pdfs.length === 0) return

  const statusId = startDrawingQualityStatus({
    productListId,
    drawingNo,
    group,
  })

  for (const file of pdfs) {
    window.setTimeout(() => {
      void registerDrawingQuality({
        productListId,
        drawingFileId: file.id,
      })
        .then((result) => {
          if (result.skipped) removeDrawingQualityStatus(statusId)
          else finishDrawingQualityStatus(statusId, result.ok ? 'done' : 'failed')
          onResult?.(result)
        })
        .catch(() => {
          finishDrawingQualityStatus(statusId, 'failed')
        })
    }, DRAWING_QUALITY_CHECK_DELAY_MS)
  }
}
