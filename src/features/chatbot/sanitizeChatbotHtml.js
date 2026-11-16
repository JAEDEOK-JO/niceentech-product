const ALLOWED = new Set(['p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h3', 'div'])
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'img', 'svg', 'link', 'meta'])

function stripFence(value) {
  return value.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function copyChildren(source, target) {
  for (const child of [...source.childNodes]) {
    const next = cleanNode(child)
    if (next) target.append(next)
  }
}

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const tag = node.tagName.toLowerCase()
  if (DROPPED.has(tag)) return null
  if (!ALLOWED.has(tag)) {
    const fragment = document.createDocumentFragment()
    for (const child of [...node.childNodes]) {
      const next = cleanNode(child)
      if (next) fragment.append(next)
    }
    return fragment
  }

  if (tag === 'div') {
    const kind = node.getAttribute('class')
    if (kind !== 'chart' && kind !== 'bar') return null
    const el = document.createElement('div')
    el.className = kind
    if (kind === 'bar') {
      const label = String(node.getAttribute('data-label') ?? '').trim().slice(0, 40)
      const value = Number(node.getAttribute('data-value'))
      if (!label || !Number.isFinite(value) || value < 0) return null
      el.dataset.label = label
      el.dataset.value = String(value)
    } else {
      copyChildren(node, el)
    }
    return el
  }

  const el = document.createElement(tag)
  copyChildren(node, el)
  return el
}

function applyBarWidths(root) {
  for (const chart of root.querySelectorAll('.chart')) {
    const bars = [...chart.querySelectorAll(':scope > .bar')]
    const max = Math.max(1, ...bars.map((bar) => Number(bar.dataset.value)))
    for (const bar of bars) {
      const value = Number(bar.dataset.value)
      const width = Math.max(8, Math.round((value / max) * 100))
      const label = document.createElement('span')
      label.textContent = bar.dataset.label
      const count = document.createElement('b')
      count.textContent = Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
      bar.style.width = `${width}%`
      bar.replaceChildren(label, count)
    }
  }
}

export function sanitizeChatbotHtml(raw) {
  const source = stripFence(String(raw ?? '').trim())
  if (!source.startsWith('<')) return { html: false, text: source }

  const doc = new DOMParser().parseFromString(`<div>${source}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  const clean = document.createElement('div')
  if (root) copyChildren(root, clean)
  applyBarWidths(clean)
  const htmlText = clean.innerHTML.trim()
  if (!htmlText) return { html: false, text: source }
  return { html: true, htmlText }
}
