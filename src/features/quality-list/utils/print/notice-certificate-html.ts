import { createApp, h, nextTick } from 'vue'
import NoticeCertificateTemplate from '../../components/print/NoticeCertificateTemplate.vue'
import noticeCss from '../../components/print/notice-certificate.css?raw'
import type { NoticeCertificateModel } from './notice-certificate'

function toAbsoluteUrl(url: string) {
  const raw = String(url ?? '').trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  return new URL(raw, window.location.origin).href
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const absolute = toAbsoluteUrl(url)
  if (!absolute || absolute.startsWith('data:')) return absolute

  try {
    const response = await fetch(absolute)
    if (!response.ok) return absolute
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? absolute))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return absolute
  }
}

async function inlineImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img[src]'))
  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute('src')
    if (!src) return
    img.setAttribute('src', await fetchAsDataUrl(src))
  }))
}

export async function buildNoticeCertificateHtml(model: NoticeCertificateModel): Promise<string> {
  const mountNode = document.createElement('div')
  mountNode.style.position = 'fixed'
  mountNode.style.left = '-10000px'
  mountNode.style.top = '0'
  document.body.appendChild(mountNode)

  const app = createApp({
    render: () => h(NoticeCertificateTemplate, { model }),
  })

  try {
    app.mount(mountNode)
    await nextTick()
    await inlineImages(mountNode)

    const fontDataUrl = await fetchAsDataUrl('/The Jamsil OTF 3 Regular.otf')
    const content = mountNode.innerHTML

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>생산제품 성능검사 인증 리스트</title>
  <style>
@font-face {
  font-family: "TheJamsil";
  src: url("${fontDataUrl}") format("opentype");
  font-weight: 100 900;
  font-style: normal;
}

@page {
  size: A4 landscape;
  margin: 6mm;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  width: 285mm;
  height: 198mm;
  overflow: hidden;
  background: #fff;
  color: #000;
  font-family: TheJamsil, "Malgun Gothic", sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

${noticeCss}
  </style>
</head>
<body>
  ${content}
</body>
</html>`
  } finally {
    app.unmount()
    mountNode.remove()
  }
}
