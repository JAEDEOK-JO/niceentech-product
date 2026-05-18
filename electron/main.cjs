'use strict'

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, Notification } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const supabaseListener = require('./supabase-listener.cjs')

let ENV = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }
try { ENV = require('./env.generated.cjs') } catch { /* generated at build time */ }

const isLinuxArm = process.platform === 'linux' && (process.arch === 'arm' || process.arch === 'arm64')
const isDev = !app.isPackaged
const useDevServer = process.argv.includes('--dev-server') || process.env.NICEENTECH_DEV_SERVER === '1'
const isKiosk = isLinuxArm

if (isLinuxArm) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
}

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

if (process.platform === 'win32') {
  app.setAppUserModelId('com.niceentech.product')
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {BrowserWindow[]} */
let appWindows = []
/** @type {Tray | null} */
let tray = null
const MAX_WINDOWS = 2

function getOpenWindows() {
  appWindows = appWindows.filter((window) => window && !window.isDestroyed())
  return appWindows
}

function getPrimaryWindow() {
  const focused = BrowserWindow.getFocusedWindow()
  if (focused && !focused.isDestroyed() && getOpenWindows().includes(focused)) return focused
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  return getOpenWindows()[0] || null
}

function destroyTray() {
  if (!tray) return
  tray.destroy()
  tray = null
}

function loadIcon(filename) {
  const iconPath = path.join(__dirname, '../build', filename)
  try {
    const img = nativeImage.createFromPath(iconPath)
    return img.isEmpty() ? null : img
  } catch {
    return null
  }
}

function createWindow() {
  const openWindows = getOpenWindows()
  if (openWindows.length >= MAX_WINDOWS) {
    showWindow(openWindows[openWindows.length - 1])
    return openWindows[openWindows.length - 1]
  }

  const appIcon = loadIcon('icon.png') || loadIcon('icon.ico')

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: appIcon ?? undefined,
    show: false,
    kiosk: isKiosk,
    fullscreen: isKiosk,
    autoHideMenuBar: isKiosk,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  if (useDevServer) {
    window.loadURL('http://localhost:5173')
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  appWindows.push(window)
  mainWindow = window

  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    destroyTray()
    appWindows = appWindows.filter((item) => item !== window)
    mainWindow = getOpenWindows()[getOpenWindows().length - 1] || null
    if (getOpenWindows().length === 0) {
      destroyTray()
      app.isQuitting = true
      app.quit()
    }
  })
  window.on('focus', () => {
    mainWindow = window
    window.flashFrame(false)
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
  return window
}

function createTray() {
  if (tray) return

  const icon = loadIcon('tray.png') || loadIcon('icon.png')
  if (!icon) {
    console.warn('[Tray] build/tray.png missing')
    return
  }

  tray = new Tray(icon)
  tray.setToolTip('NICEENTECH')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'NICEENTECH 열기', click: showWindow },
    { label: '새 창 열기', click: createWindow },
    { type: 'separator' },
    { label: '종료', click: quitApp },
  ]))
  tray.on('click', () => {
    const window = getPrimaryWindow()
    window?.isVisible() && window?.isFocused() ? window.minimize() : showWindow(window)
  })
  tray.on('double-click', showWindow)
}

function showWindow(targetWindow = getPrimaryWindow()) {
  if (!targetWindow || targetWindow.isDestroyed()) return
  targetWindow.flashFrame(false)
  targetWindow.setOpacity(1)
  targetWindow.setSkipTaskbar(false)
  if (targetWindow.isMinimized()) targetWindow.restore()
  targetWindow.show()
  targetWindow.focus()
}

function quitApp() {
  app.isQuitting = true
  destroyTray()
  app.quit()
}

function sendUpdateStatus(status) {
  for (const window of getOpenWindows()) {
    window.webContents.send('update-status', status)
  }
}

function bringToNotice({ title, body, url }) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'NICEENTECH',
      body: body || '',
      icon: loadIcon('icon.png') || undefined,
      silent: false,
      urgency: 'critical',
    })
    notification.on('click', () => {
      const window = getPrimaryWindow() || createWindow()
      showWindow(window)
      if (url) window?.webContents.send('navigate-to', url)
    })
    notification.show()
  }

  const window = getPrimaryWindow()
  if (!window || window.isDestroyed()) return

  if (!window.isVisible()) {
    window.setOpacity(0)
    window.setSkipTaskbar(false)
    window.showInactive()
    window.minimize()
    window.flashFrame(true)
    setTimeout(() => {
      if (window && !window.isDestroyed()) window.setOpacity(1)
    }, 500)
  } else if (window.isMinimized() || !window.isFocused()) {
    window.flashFrame(true)
  }
}

ipcMain.on('show-notification', (_, payload) => {
  bringToNotice(payload || {})
})

ipcMain.handle('get-printers', async () => {
  const window = getPrimaryWindow()
  if (!window || window.isDestroyed()) return []
  const printers = await window.webContents.getPrintersAsync()
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName || printer.name,
    description: printer.description || '',
    status: printer.status || 0,
    isDefault: Boolean(printer.isDefault),
  }))
})

ipcMain.handle('print-report', async (_, requestedOptions = {}) => {
  const window = getPrimaryWindow()
  if (!window || window.isDestroyed()) {
    return { success: false, errorType: 'Window is not available' }
  }

  const scaleFactor = Number(requestedOptions.scaleFactor)
  const copies = Number(requestedOptions.copies)
  const deviceName = String(requestedOptions.deviceName || '').trim()
  const pageRanges = Array.isArray(requestedOptions.pageRanges)
    ? requestedOptions.pageRanges
      .map((range) => ({
        from: Number(range?.from),
        to: Number(range?.to),
      }))
      .filter((range) => (
        Number.isInteger(range.from) &&
        Number.isInteger(range.to) &&
        range.from >= 0 &&
        range.to >= range.from
      ))
    : []
  const printOptions = {
    silent: true,
    printBackground: true,
    color: true,
    landscape: requestedOptions.landscape !== false,
    pageSize: requestedOptions.pageSize || 'A4',
    preferCSSPageSize: false,
    margins: { marginType: 'printableArea' },
    scaleFactor: Number.isFinite(scaleFactor) ? Math.max(10, Math.min(200, scaleFactor)) : 90,
    copies: Number.isFinite(copies) ? Math.max(1, Math.min(999, Math.round(copies))) : 1,
    ...(pageRanges.length ? { pageRanges } : {}),
    ...(deviceName ? { deviceName } : {}),
  }

  return new Promise((resolve) => {
    window.webContents.print(printOptions, (success, errorType) => {
      resolve({ success, errorType: errorType || '' })
    })
  })
})

ipcMain.on('auth-user-id', (_, userId) => {
  if (userId) {
    supabaseListener.start(userId, (payload) => bringToNotice(payload))
  } else {
    supabaseListener.stop()
  }
})

ipcMain.on('check-for-update', () => {
  if (isDev) return
  sendUpdateStatus({ phase: 'checking', message: '업데이트를 확인하고 있습니다.', percent: 0 })
  autoUpdater.checkForUpdates().catch((err) => {
    sendUpdateStatus({ phase: 'error', message: err?.message || '업데이트 확인에 실패했습니다.', percent: 0 })
    console.warn('[AutoUpdater] manual check failed:', err?.message || err)
  })
})

ipcMain.on('unread-count', (_, count) => {
  const n = Number(count) || 0
  const window = getPrimaryWindow()
  if (!window || window.isDestroyed()) return

  if (n > 0) {
    const notifyIcon = loadIcon('tray-notify.png') || loadIcon('tray.png')
    if (tray && notifyIcon) tray.setImage(notifyIcon)
    tray?.setToolTip(`NICEENTECH 새 메시지 ${n}개`)
    if (process.platform === 'win32') {
      const badge = loadIcon('badge.png')
      window.setOverlayIcon(badge ?? null, `새 메시지 ${n}개`)
    }
  } else {
    const normalIcon = loadIcon('tray.png') || loadIcon('icon.png')
    if (tray && normalIcon) tray.setImage(normalIcon)
    tray?.setToolTip('NICEENTECH')
    if (process.platform === 'win32') window.setOverlayIcon(null, '')
    window.flashFrame(false)
  }
})

function setupAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ phase: 'checking', message: '업데이트를 확인하고 있습니다.', percent: 0 })
  })
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      phase: 'available',
      message: `${info?.version || ''} 버전 다운로드를 시작합니다.`,
      percent: 0,
      version: info?.version || '',
    })
  })
  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ phase: 'not-available', message: '현재 최신 버전입니다.', percent: 0 })
  })
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.max(0, Math.min(100, Number(progress?.percent || 0)))
    if (process.platform === 'win32') {
      for (const window of getOpenWindows()) window.setProgressBar(percent / 100)
    }
    sendUpdateStatus({
      phase: 'downloading',
      message: '업데이트 파일을 다운로드하고 있습니다.',
      percent,
      transferred: progress?.transferred || 0,
      total: progress?.total || 0,
      bytesPerSecond: progress?.bytesPerSecond || 0,
    })
  })
  autoUpdater.on('error', (err) => {
    if (process.platform === 'win32') {
      for (const window of getOpenWindows()) window.setProgressBar(-1)
    }
    sendUpdateStatus({ phase: 'error', message: err?.message || '업데이트 중 오류가 발생했습니다.', percent: 0 })
    console.error('[AutoUpdater]', err?.message || err)
  })
  autoUpdater.on('update-downloaded', (info) => {
    if (process.platform === 'win32') {
      for (const window of getOpenWindows()) window.setProgressBar(-1)
    }
    sendUpdateStatus({
      phase: 'installing',
      message: `${info?.version || ''} 버전 다운로드가 완료되었습니다. 자동으로 설치합니다.`,
      percent: 100,
      version: info?.version || '',
    })
    setTimeout(() => {
      app.isQuitting = true
      autoUpdater.quitAndInstall(true, true)
    }, 1500)
  })

  autoUpdater.checkForUpdates().catch((err) => {
    sendUpdateStatus({ phase: 'error', message: err?.message || '업데이트 확인에 실패했습니다.', percent: 0 })
    console.warn('[AutoUpdater] check failed:', err?.message || err)
  })
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    const openWindows = getOpenWindows()
    if (openWindows.length < MAX_WINDOWS) createWindow()
    else showWindow(openWindows[openWindows.length - 1])
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)

    if (ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY) {
      supabaseListener.init(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
    } else {
      console.warn('[Electron] Supabase credentials missing. Run npm run build:electron first.')
    }

    createWindow()
    createTray()
    setupAutoUpdater()
    app.on('activate', () => {
      getOpenWindows().length === 0 ? createWindow() : showWindow()
    })
  })
}

app.on('window-all-closed', () => {
  destroyTray()
  app.isQuitting = true
  app.quit()
})
app.on('before-quit', () => {
  app.isQuitting = true
  destroyTray()
})
