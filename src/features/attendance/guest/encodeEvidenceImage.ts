const MAX_EDGE = 1280
const MAX_DATA_URL_LENGTH = 1_500_000

export async function encodeEvidenceImage(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 처리하지 못했습니다.')
    context.drawImage(bitmap, 0, 0, width, height)
    const encoded = canvas.toDataURL('image/jpeg', 0.72)
    if (encoded.length <= MAX_DATA_URL_LENGTH) return encoded
    return canvas.toDataURL('image/jpeg', 0.5)
  } finally {
    bitmap.close()
  }
}
