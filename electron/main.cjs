'use strict'

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, Notification } = require('electron')
const path = require('path')
const supabaseListener = require('./supabase-listener.cjs')

// 빌드 시 gen-electron-env.mjs 가 생성한 파일 (Supabase 크리덴셜)
let ENV = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }
try { ENV = require('./env.generated.cjs') } catch { /* 파일 없으면 무시 */ }

// 백그라운드 스로틀링 방지 (숨겨진 창에서도 JS 정상 실행)
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

const isDev = !app.isPackaged

if (process.platform === 'win32') {
  app.setAppUserModelId('com.niceentech.product')
}

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {Tray | null} */
let tray = null

// ─── 아이콘 로더 ────────────────────────────────────────────────────────────
function loadIcon(filename) {
  const p = path.join(__dirname, '../build', filename)
  try {
    const img = nativeImage.createFromPath(p)
    return img.isEmpty() ? null : img
  } catch { return null }
}

// ─── 창 생성 ────────────────────────────────────────────────────────────────
function createWindow() {
  const appIcon = loadIcon('icon.png') || loadIcon('icon.ico')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: appIcon ?? undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // 숨겨도 JS 계속 실행
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // 포커스 받으면 깜빡임 중지
  mainWindow.on('focus', () => mainWindow?.flashFrame(false))

  // X 버튼 → 트레이로 숨김
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
      mainWindow.setSkipTaskbar(true)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── 트레이 생성 ────────────────────────────────────────────────────────────
function createTray() {
  const icon = loadIcon('tray.png') || loadIcon('icon.png')
  if (!icon) { console.warn('[Tray] build/tray.png 없음'); return }

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

// ─── 창 표시 ────────────────────────────────────────────────────────────────
function showWindow() {
  if (!mainWindow) return
  mainWindow.flashFrame(false)
  mainWindow.setOpacity(1)         // opacity가 0인 상태일 수 있으므로 복원
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// ─── 알림 + 작업표시줄 깜빡임 ────────────────────────────────────────────────
function bringToNotice({ title, body, url }) {
  // 1) 토스트 알림 (최우선)
  if (Notification.isSupported()) {
    const n = new Notification({
      title: title || 'NICEENTECH',
      body: body || '',
      icon: loadIcon('icon.png') || undefined,
      silent: false,
      urgency: 'critical',
    })
    n.on('click', () => {
      showWindow()
      if (url) mainWindow?.webContents.send('navigate-to', url)
    })
    n.show()
  }

  // 2) 작업표시줄에 나타나게 + 깜빡임
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (!mainWindow.isVisible()) {
    // 창이 숨겨진 상태: opacity 0으로 투명하게 만들고 표시 → 사용자 눈에 안 보임
    mainWindow.setOpacity(0)
    mainWindow.setSkipTaskbar(false)
    mainWindow.showInactive()    // 투명한 채로 표시 (포커스 X)
    mainWindow.minimize()        // 즉시 최소화 → 작업표시줄 버튼 생성
    mainWindow.flashFrame(true)  // 깜빡임
    // 나중에 창을 실제로 열 때 정상으로 보이도록 opacity 복원
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setOpacity(1)
    }, 500)
  } else if (mainWindow.isMinimized()) {
    mainWindow.flashFrame(true)
  } else if (!mainWindow.isFocused()) {
    mainWindow.flashFrame(true)
  }
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('show-notification', (_, payload) => {
  bringToNotice(payload || {})
})

// 렌더러가 로그인 상태 변경 시 메인 프로세스 Supabase 리스너도 갱신
ipcMain.on('auth-user-id', (_, userId) => {
  if (userId) {
    supabaseListener.start(userId, (payload) => bringToNotice(payload))
  } else {
    supabaseListener.stop()
  }
})

ipcMain.on('unread-count', (_, count) => {
  const n = Number(count) || 0
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (n > 0) {
    const notifyIcon = loadIcon('tray-notify.png') || loadIcon('tray.png')
    if (tray && notifyIcon) tray.setImage(notifyIcon)
    tray?.setToolTip(`NICEENTECH — 새 메시지 ${n}개`)
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

// ─── 앱 이벤트 ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  // 메인 프로세스 Supabase 리스너 초기화
  if (ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY) {
    supabaseListener.init(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  } else {
    console.warn('[Electron] Supabase 크리덴셜 없음 → npm run build:electron 을 먼저 실행하세요')
  }

  createWindow()
  createTray()
  app.on('activate', () => {
    BrowserWindow.getAllWindows().length === 0 ? createWindow() : showWindow()
  })
})

app.on('window-all-closed', () => { /* 트레이 상주 유지 */ })
app.on('before-quit', () => { app.isQuitting = true })
