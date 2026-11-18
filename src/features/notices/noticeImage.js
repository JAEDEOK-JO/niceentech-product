const NOTICE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const NOTICE_IMAGE_LIMIT = 2

export function noticeImageFile(file) {
  if (!file || !NOTICE_IMAGE_TYPES.has(file.type)) return null
  return file
}

export function noticeImageFiles(fileList) {
  return [...(fileList ?? [])]
    .map((file) => noticeImageFile(file))
    .filter(Boolean)
    .slice(0, NOTICE_IMAGE_LIMIT)
}

export function noticeImagePaths(notice) {
  const listed = Array.isArray(notice?.image_paths) ? notice.image_paths.filter(Boolean) : []
  if (listed.length) return listed.slice(0, NOTICE_IMAGE_LIMIT)
  return notice?.image_path ? [notice.image_path] : []
}

export function noticeImageExtension(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}
