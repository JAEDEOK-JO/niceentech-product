'use strict'

const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const NOTICE_ROOT = '\\\\niceentech\\품질관리부\\00.합격결과통보서'

function sanitizePathSegment(value) {
  const cleaned = String(value ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/^\.+$/, '_')
    .trim()
  return cleaned || '_'
}

function sanitizeFileName(value) {
  return sanitizePathSegment(value)
}

async function htmlToPdf(html) {
  const printWindow = new BrowserWindow({
    show: false,
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  const tempPath = path.join(app.getPath('temp'), `niceentech-notice-${Date.now()}.html`)

  try {
    fs.writeFileSync(tempPath, html, 'utf8')
    await printWindow.loadFile(tempPath)
    await printWindow.webContents.executeJavaScript(`
      Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        Promise.all(Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          })
        })),
      ])
    `)

    return await printWindow.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      scale: 1,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    })
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close()
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    } catch {
      // ignore cleanup errors
    }
  }
}

async function saveNoticeBundle(payload = {}) {
  const dir = path.join(
    NOTICE_ROOT,
    sanitizePathSegment(payload.company),
    sanitizePathSegment(payload.place),
    sanitizePathSegment(payload.testDate),
  )
  fs.mkdirSync(dir, { recursive: true })

  const joinName = sanitizeFileName(payload.joinFileName)
  const listName = sanitizeFileName(payload.listFileName)

  fs.writeFileSync(path.join(dir, joinName), Buffer.from(String(payload.joinBytesBase64 || ''), 'base64'))

  const listPdf = await htmlToPdf(String(payload.html ?? ''))
  fs.writeFileSync(path.join(dir, listName), listPdf)

  return { success: true, dir }
}

module.exports = { saveNoticeBundle }
