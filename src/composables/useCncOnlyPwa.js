import { watch } from 'vue'
import { useRoute } from 'vue-router'

const DEFAULT_MANIFEST = '/manifest.webmanifest'
const CNC_MANIFEST = '/manifest-cnc-only.webmanifest'
const DEFAULT_TITLE = 'NICEENTECH'
const CNC_TITLE = 'CNC'

const setLinkHref = (rel, href) => {
  let link = document.querySelector(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}

const setMetaContent = (name, content) => {
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }
  meta.content = content
}

const applyCncOnlyPwa = (enabled) => {
  setLinkHref('manifest', enabled ? CNC_MANIFEST : DEFAULT_MANIFEST)
  document.title = enabled ? CNC_TITLE : DEFAULT_TITLE
  setMetaContent('apple-mobile-web-app-title', enabled ? CNC_TITLE : DEFAULT_TITLE)
}

export function useCncOnlyPwa() {
  const route = useRoute()

  watch(
    () => route.path,
    (path) => {
      applyCncOnlyPwa(path === '/cnc-only')
    },
    { immediate: true },
  )
}
