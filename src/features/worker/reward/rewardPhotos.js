export const REWARD_PHOTO_LIMIT = 3

export function takeRewardPhotos(currentCount, files) {
  const images = [...files].filter((file) => String(file?.type || '').startsWith('image/'))
  const room = Math.max(0, REWARD_PHOTO_LIMIT - currentCount)
  return {
    accepted: images.slice(0, room),
    invalid: files.length > 0 && images.length === 0,
    overflow: images.length > room,
  }
}
