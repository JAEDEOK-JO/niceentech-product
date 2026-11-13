import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export function workerHtmlPlugin() {
  let outDir = 'dist'
  return {
    name: 'worker-html',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const html = readFileSync(join(outDir, 'index.html'), 'utf8')
      const workerHtml = html
        .replaceAll('href="/manifest.webmanifest"', 'href="/manifest-worker.webmanifest"')
        .replaceAll('rel="apple-touch-icon" href="/icon-192.svg"', 'rel="apple-touch-icon" href="/icon-192.png"')
        .replaceAll('name="apple-mobile-web-app-title" content="NICEENTECH"', 'name="apple-mobile-web-app-title" content="작업자"')
      writeFileSync(join(outDir, 'worker.html'), workerHtml)
    },
  }
}
