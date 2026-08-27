import formCss from './shipmentSpecForm.css?raw'

const toAbsoluteUrl = (url) => {
  const raw = String(url ?? '').trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  return new URL(raw, window.location.origin).href
}

const fetchAsDataUrl = async (url) => {
  const absolute = toAbsoluteUrl(url)
  if (!absolute || absolute.startsWith('data:')) return absolute

  try {
    const response = await fetch(absolute)
    if (!response.ok) return absolute
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? absolute))
      reader.onerror = () => resolve(absolute)
      reader.readAsDataURL(blob)
    })
  } catch {
    return absolute
  }
}

const inlineImages = async (root) => {
  const images = Array.from(root.querySelectorAll('img[src]'))
  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute('src')
    if (!src) return
    const dataUrl = await fetchAsDataUrl(src)
    if (dataUrl) img.setAttribute('src', dataUrl)
  }))
}

export const buildShipmentSpecPrintHtml = async (root, landscape) => {
  const clone = root.cloneNode(true)
  await inlineImages(clone)

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>출하명세서</title>
  <style>
${formCss}

@page {
  size: A4 ${landscape ? 'landscape' : 'portrait'};
  margin: 0;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.shipment-spec-print-root {
  position: static;
  left: auto;
  top: auto;
}

.shipment-spec-print-item {
  box-sizing: border-box;
  width: ${landscape ? '297mm' : '210mm'};
  height: ${landscape ? '210mm' : '297mm'};
  overflow: hidden;
  break-after: page;
  page-break-after: always;
  page-break-inside: avoid;
  break-inside: avoid;
}

.shipment-spec-print-item:last-child {
  break-after: auto;
  page-break-after: auto;
}
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`
}
