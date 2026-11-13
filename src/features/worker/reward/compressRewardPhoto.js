const MAX_EDGE = 1280

export async function compressRewardPhoto(file) {
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
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('이미지를 처리하지 못했습니다.'))
      }, 'image/jpeg', 0.72)
    })
    return blob
  } finally {
    bitmap.close()
  }
}
