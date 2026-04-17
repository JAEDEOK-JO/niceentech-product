'use strict'

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require('electron')
const path = require('path')

// ─── 개발/프로덕션 환경 구분 ────────────────────────────────────────────────
const isDev = !app.isPackaged

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {Tray | null} */
let tray = null

// Windows: 앱 ID 설정 (알림 그룹화 및 핀 기능에 필요)
if (process.platform === 'win32') {
  app.setAppUserModelId('com.niceentech.product')
}

// ─── 아이콘 로더 (없으면 null 반환) ───────────────────────────────────────
function loadIcon(filename) {
  const iconPath = path.join(__dirname, '../build', filename)
  try {
    const img = nativeImage.createFromPath(iconPath)
    return img.isEmpty() ? null : img
  } catch {
    return null
  }
}

// ─── 윈도우 생성 ────────────────────────────────────────────────────────────
function createWindow() {
  const appIcon = loadIcon('icon.png') || loadIcon('icon.ico')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: appIcon ?? undefined,
    show: false, // ready-to-show 이벤트 후 표시
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // 개발 시 DevTools 자동 열기 (필요하면 주석 해제)
    // mainWindow.webContents.openDevTools()
  } else {
    // Hash 라우터를 사용하므로 file:// 프로토콜로 직접 로드
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 로딩 완료 후 표시 (흰 화면 방지)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 닫기 버튼 → 트레이로 최소화 (앱 종료 X)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── 시스템 트레이 생성 ─────────────────────────────────────────────────────
function createTray() {
  const normalIcon = loadIcon('tray.png') || loadIcon('tray.ico') || loadIcon('icon.png') || loadIcon('icon.ico')
  if (!normalIcon) {
    console.warn('[Tray] 아이콘 파일 없음: build/tray.png 또는 build/icon.png 를 추가하세요.')
    return
  }

  tray = new Tray(normalIcon)
  tray.setToolTip('NICEENTECH 생산관리 시스템')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'NICEENTECH 열기',
      click: () => showWindow(),
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)

  // 트레이 왼쪽 클릭: 창 토글
  tray.on('click', () => {
    if (mainWindow?.isVisible() && mainWindow?.isFocused()) {
      mainWindow.hide()
    } else {
      showWindow()
    }
  })

  // 더블클릭도 동일 동작 (Windows)
  tray.on('double-click', () => showWindow())
}

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// ─── IPC: 렌더러 → 메인 ─────────────────────────────────────────────────────

// 읽지 않은 메시지 수 업데이트 → 트레이 아이콘 + 작업표시줄 배지 변경
ipcMain.on('unread-count', (_, count) => {
  const n = Number(count) || 0

  if (!mainWindow || mainWindow.isDestroyed()) return

  if (n > 0) {
    // 트레이 아이콘을 알림 상태로 교체
    const notifyIcon = loadIcon('tray-notify.png') || loadIcon('tray-notify.ico')
    if (tray && notifyIcon) {
      tray.setImage(notifyIcon)
    }
    tray?.setToolTip(`NICEENTECH — 새 메시지 ${n}개`)

    // Windows 작업표시줄 오버레이 배지
    if (process.platform === 'win32') {
      const badge = loadIcon('badge.png') || loadIcon('badge.ico')
      mainWindow.setOverlayIcon(badge ?? null, `새 메시지 ${n}개`)
    }
  } else {
    // 트레이 아이콘 정상 상태로 복원
    const normalIcon = loadIcon('tray.png') || loadIcon('tray.ico') || loadIcon('icon.png') || loadIcon('icon.ico')
    if (tray && normalIcon) {
      tray.setImage(normalIcon)
    }
    tray?.setToolTip('NICEENTECH 생산관리 시스템')

    // 오버레이 배지 제거
    if (process.platform === 'win32') {
      mainWindow.setOverlayIcon(null, '')
    }
  }
})

// 렌더러에서 새 메시지 수신 시 Windows 알림
ipcMain.on('show-notification', (_, { title, body, url }) => {
  const { Notification } = require('electron')
  if (!Notification.isSupported()) return

  const notif = new Notification({
    title: title ?? 'NICEENTECH',
    body: body ?? '',
    icon: loadIcon('icon.png') || loadIcon('icon.ico') || undefined,
    silent: false,
  })

  notif.on('click', () => {
    showWindow()
    if (url && mainWindow) {
      mainWindow.webContents.send('navigate-to', url)
    }
  })

  notif.show()
})

// ─── 앱 이벤트 ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  createTray()

  // macOS: dock 클릭 시 창 복원
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showWindow()
  })
})

// 모든 창이 닫혀도 앱 유지 (트레이에 상주)
app.on('window-all-closed', () => {
  // macOS는 Cmd+Q 전까지 앱 유지가 관례이므로 별도 처리 없음
  // Windows/Linux도 트레이 상주를 위해 quit() 호출 안 함
})

app.on('before-quit', () => {
  app.isQuitting = true
})
