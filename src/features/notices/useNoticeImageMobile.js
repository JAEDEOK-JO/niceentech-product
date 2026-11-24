import { onMounted, onUnmounted, ref } from 'vue'

const NOTICE_IMAGE_MOBILE_QUERY = '(max-width: 767px), (pointer: coarse) and (hover: none)'

export function isNoticeImageMobile() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(NOTICE_IMAGE_MOBILE_QUERY).matches
}

export function useNoticeImageMobile() {
  const mobile = ref(isNoticeImageMobile())
  let media

  const update = () => {
    mobile.value = media?.matches ?? false
  }

  onMounted(() => {
    media = window.matchMedia(NOTICE_IMAGE_MOBILE_QUERY)
    update()
    media.addEventListener('change', update)
  })

  onUnmounted(() => {
    media?.removeEventListener('change', update)
  })

  return mobile
}
