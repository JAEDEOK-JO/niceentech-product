const { app, BrowserWindow, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const isDev = !app.isPackaged
let mainWindow = null
let updateLockWindow = null
let forceUpdateActive = false
let installingUpdate = false
let isCheckingForUpdates = false
let updateCheckTimer = null

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000

function shouldIgnoreUpdateError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()
  return (
    message.includes('404') ||
    message.includes('latest.yml') ||
    message.includes('no published versions') ||
    message.includes('cannot find channel')
  )
}

function buildUpdateLockHtml(message, detail = '') {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NICEENTECH 업데이트</title>
    <style>
      body {
        margin: 0;
        font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 28px 24px;
        box-sizing: border-box;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      .badge {
        display: inline-block;
        margin-bottom: 14px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #0f172a;
        color: white;
        font-size: 12px;
        font-weight: 700;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 22px;
        font-weight: 800;
      }
      p {
        margin: 0;
        line-height: 1.6;
        color: #475569;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="badge">업데이트 진행 중</div>
        <h1>${message}</h1>
        <p>${detail}</p>
      </div>
    </div>
  </body>
</html>`
}

function setMainWindowInteractionEnabled(enabled) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (typeof mainWindow.setEnabled === 'function') {
    mainWindow.setEnabled(enabled)
  }
  if (typeof mainWindow.setClosable === 'function') {
    mainWindow.setClosable(enabled || installingUpdate)
  }
}

function showUpdateLockWindow(message, detail = '') {
  if (!mainWindow || mainWindow.isDestroyed()) return

  forceUpdateActive = true
  setMainWindowInteractionEnabled(false)

  if (!updateLockWindow || updateLockWindow.isDestroyed()) {
    updateLockWindow = new BrowserWindow({
      parent: mainWindow,
      modal: true,
      width: 460,
      height: 280,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      movable: false,
      frame: false,
      show: false,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    updateLockWindow.on('closed', () => {
      updateLockWindow = null
    })
  }

  const html = buildUpdateLockHtml(message, detail)
  updateLockWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`).catch(() => {})

  if (!updateLockWindow.isVisible()) {
    updateLockWindow.once('ready-to-show', () => {
      updateLockWindow?.show()
    })
  } else {
    updateLockWindow.focus()
  }
}

function hideUpdateLockWindow() {
  forceUpdateActive = false
  installingUpdate = false
  setMainWindowInteractionEnabled(true)

  if (updateLockWindow && !updateLockWindow.isDestroyed()) {
    updateLockWindow.destroy()
  }
  updateLockWindow = null
}

function runUpdateCheck() {
  if (isDev || isCheckingForUpdates || forceUpdateActive) return
  isCheckingForUpdates = true
  autoUpdater
    .checkForUpdates()
    .catch(() => {})
    .finally(() => {
      isCheckingForUpdates = false
    })
}

function configureAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', (info) => {
    showUpdateLockWindow(
      '최신 버전으로 업데이트 중입니다.',
      `${info?.version ?? '새 버전'}을 다운로드하는 동안 앱을 사용할 수 없습니다.\n잠시만 기다려 주세요.`,
    )
  })

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number.isFinite(progress?.percent) ? Math.max(0, Math.min(100, progress.percent)) : 0
    showUpdateLockWindow(
      '최신 버전 다운로드 중입니다.',
      `업데이트를 적용하는 동안 앱을 사용할 수 없습니다.\n진행률: ${percent.toFixed(1)}%`,
    )
  })

  autoUpdater.on('update-downloaded', () => {
    installingUpdate = true
    showUpdateLockWindow(
      '업데이트 설치를 시작합니다.',
      '잠시 후 앱이 자동으로 종료되고 최신 버전으로 설치됩니다.',
    )

    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true)
    }, 1500)
  })

  autoUpdater.on('update-not-available', () => {
    hideUpdateLockWindow()
  })

  autoUpdater.on('error', (error) => {
    if (shouldIgnoreUpdateError(error)) return
    const message = String(error?.message ?? error ?? '알 수 없는 오류')

    if (forceUpdateActive) {
      showUpdateLockWindow(
        '업데이트 중 문제가 발생했습니다.',
        `앱을 종료한 뒤 다시 실행해 주세요.\n\n${message}`,
      )
      setTimeout(() => {
        app.quit()
      }, 3000)
      return
    }

    if (!mainWindow) {
      return
    }
    dialog
      .showMessageBox(mainWindow, {
        type: 'warning',
        title: 'NICEENTECH 업데이트 오류',
        message: '자동업데이트를 확인하는 중 문제가 발생했습니다.',
        detail: message,
        buttons: ['확인'],
      })
      .catch(() => {})
  })

  setTimeout(() => {
    runUpdateCheck()
  }, 3000)

  updateCheckTimer = setInterval(() => {
    runUpdateCheck()
  }, UPDATE_CHECK_INTERVAL_MS)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', (event) => {
    if (forceUpdateActive && !installingUpdate) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isPrintShortcut =
      input.type === 'keyDown' &&
      input.key.toLowerCase() === 'p' &&
      (input.control || input.meta)

    if (!isPrintShortcut) return

    event.preventDefault()
    mainWindow.webContents.print({
      printBackground: true,
    })
  })
}

app.whenReady().then(() => {
  createMainWindow()
  configureAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
})

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
