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
      const workerHtml = html.replaceAll('href="/manifest.webmanifest"', 'href="/manifest-worker.webmanifest"')
      writeFileSync(join(outDir, 'worker.html'), workerHtml)
    },
  }
}
