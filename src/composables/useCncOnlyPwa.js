import { watch } from 'vue'
import { useRoute } from 'vue-router'

const DEFAULT_MANIFEST = '/manifest.webmanifest'
const CNC_MANIFEST = '/manifest-cnc-only.webmanifest'
const WORKER_MANIFEST = '/manifest-worker.webmanifest'
const DEFAULT_TITLE = 'NICEENTECH'
const CNC_TITLE = 'CNC'
const WORKER_TITLE = '나이스엔테크(작업자)'

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

const applyInstalledApp = (path) => {
  const isCnc = path === '/cnc-only'
  const isWorker = path === '/worker' || path.startsWith('/worker/')
  const manifest = isCnc ? CNC_MANIFEST : isWorker ? WORKER_MANIFEST : DEFAULT_MANIFEST
  const title = isCnc ? CNC_TITLE : isWorker ? WORKER_TITLE : DEFAULT_TITLE
  setLinkHref('manifest', manifest)
  document.title = title
  setMetaContent('apple-mobile-web-app-title', title)
}

export function useCncOnlyPwa() {
  const route = useRoute()

  watch(
    () => route.path,
    (path) => {
      applyInstalledApp(path)
    },
    { immediate: true },
  )
}
