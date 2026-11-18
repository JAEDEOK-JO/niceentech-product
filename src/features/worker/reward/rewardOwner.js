export function canOwnerChangeReward(item, userId) {
  return Boolean(item?.id) && item.user_id === userId && item.status !== '승인'
}

export function keptRewardPhotoPaths(photos) {
  return photos.map((photo) => photo.path).filter(Boolean)
}

export function newRewardPhotoFiles(photos) {
  return photos.map((photo) => photo.file).filter(Boolean)
}

export function existingRewardPhotos(urls, paths) {
  const list = Array.isArray(paths) ? paths.filter(Boolean) : []
  return list
    .map((path, index) => ({ path, url: urls?.[index] || '' }))
    .filter((photo) => photo.url)
}

export function problemPathsOf(report) {
  if (Array.isArray(report?.photo_paths) && report.photo_paths.length) return report.photo_paths
  return report?.photo_path ? [report.photo_path] : []
}
