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
/** @type {Tray | null} */
let tray = null

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
  if (mainWindow && !mainWindow.isDestroyed()) {
    showWindow()
    return
  }

  const appIcon = loadIcon('icon.png') || loadIcon('icon.ico')

  mainWindow = new BrowserWindow({
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
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('focus', () => mainWindow?.flashFrame(false))
  mainWindow.on('close', (event) => {
    if (app.isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
    mainWindow?.setSkipTaskbar(true)
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
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
    { type: 'separator' },
    { label: '종료', click: () => { app.isQuitting = true; app.quit() } },
  ]))
  tray.on('click', () => {
    mainWindow?.isVisible() && mainWindow?.isFocused() ? mainWindow.hide() : showWindow()
  })
  tray.on('double-click', showWindow)
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.flashFrame(false)
  mainWindow.setOpacity(1)
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function sendUpdateStatus(status) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('update-status', status)
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
      showWindow()
      if (url) mainWindow?.webContents.send('navigate-to', url)
    })
    notification.show()
  }

  if (!mainWindow || mainWindow.isDestroyed()) return

  if (!mainWindow.isVisible()) {
    mainWindow.setOpacity(0)
    mainWindow.setSkipTaskbar(false)
    mainWindow.showInactive()
    mainWindow.minimize()
    mainWindow.flashFrame(true)
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setOpacity(1)
    }, 500)
  } else if (mainWindow.isMinimized() || !mainWindow.isFocused()) {
    mainWindow.flashFrame(true)
  }
}

ipcMain.on('show-notification', (_, payload) => {
  bringToNotice(payload || {})
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
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (n > 0) {
    const notifyIcon = loadIcon('tray-notify.png') || loadIcon('tray.png')
    if (tray && notifyIcon) tray.setImage(notifyIcon)
    tray?.setToolTip(`NICEENTECH 새 메시지 ${n}개`)
    if (process.platform === 'win32') {
      const badge = loadIcon('badge.png')
      mainWindow.setOverlayIcon(badge ?? null, `새 메시지 ${n}개`)
    }
  } else {
    const normalIcon = loadIcon('tray.png') || loadIcon('icon.png')
    if (tray && normalIcon) tray.setImage(normalIcon)
    tray?.setToolTip('NICEENTECH')
    if (process.platform === 'win32') mainWindow.setOverlayIcon(null, '')
    mainWindow.flashFrame(false)
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
    if (process.platform === 'win32') mainWindow?.setProgressBar(percent / 100)
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
    if (process.platform === 'win32') mainWindow?.setProgressBar(-1)
    sendUpdateStatus({ phase: 'error', message: err?.message || '업데이트 중 오류가 발생했습니다.', percent: 0 })
    console.error('[AutoUpdater]', err?.message || err)
  })
  autoUpdater.on('update-downloaded', (info) => {
    if (process.platform === 'win32') mainWindow?.setProgressBar(-1)
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
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }
    showWindow()
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
      BrowserWindow.getAllWindows().length === 0 ? createWindow() : showWindow()
    })
  })
}

app.on('window-all-closed', () => { /* keep tray app running */ })
app.on('before-quit', () => { app.isQuitting = true })
