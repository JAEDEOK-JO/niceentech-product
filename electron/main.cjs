const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const fs = require('fs')
const path = require('path')

const isDev = !app.isPackaged
let mainWindow = null
let updateLockWindow = null
let forceUpdateActive = false
let installingUpdate = false
let isCheckingForUpdates = false
let pendingTargetVersion = ''
let shouldDownloadOnNextAvailable = false
let updateState = {
  phase: 'idle',
  message: '업데이트 대기 중',
  detail: '',
  progressPercent: 0,
  currentVersion: app.getVersion(),
  targetVersion: '',
  lastCheckedAt: null,
  error: '',
}

const updateLogFilePath = path.join(app.getPath('userData'), 'update.log')

function normalizeVersion(value) {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^v?(\d+\.\d+\.\d+)$/)
  return matched ? matched[1] : ''
}

function appendUpdateLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`
  try {
    fs.mkdirSync(path.dirname(updateLogFilePath), { recursive: true })
    fs.appendFileSync(updateLogFilePath, line, 'utf8')
  } catch (error) {
    console.error('Failed to write update log', error)
  }
}

function broadcastUpdateState() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('desktop:update-status', updateState)
}

function setUpdateState(partial) {
  updateState = {
    ...updateState,
    ...partial,
    currentVersion: app.getVersion(),
  }
  appendUpdateLog(`state=${updateState.phase} message=${updateState.message}${updateState.detail ? ` detail=${updateState.detail}` : ''}`)
  broadcastUpdateState()
  return updateState
}

function buildUpdateLockHtml(message, detail = '', progressPercent = null) {
  const hasProgress = Number.isFinite(progressPercent)
  const safePercent = hasProgress ? Math.max(0, Math.min(100, progressPercent)) : 0
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
      .progress {
        margin-top: 18px;
      }
      .progress-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 700;
        color: #334155;
      }
      .progress-track {
        height: 12px;
        overflow: hidden;
        border-radius: 999px;
        background: #e2e8f0;
      }
      .progress-bar {
        height: 100%;
        width: ${safePercent}%;
        border-radius: 999px;
        background: linear-gradient(90deg, #0f172a 0%, #2563eb 100%);
        transition: width 160ms ease;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="badge">업데이트 진행 중</div>
        <h1>${message}</h1>
        <p>${detail}</p>
        ${
          hasProgress
            ? `<div class="progress">
                <div class="progress-meta">
                  <span>다운로드 진행률</span>
                  <span>${safePercent.toFixed(1)}%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar"></div>
                </div>
              </div>`
            : ''
        }
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

function showUpdateLockWindow(message, detail = '', progressPercent = null) {
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

  const html = buildUpdateLockHtml(message, detail, progressPercent)
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

async function runUpdateCheck({ manual = false, startDownload = false, targetVersion = '' } = {}) {
  if (isDev) {
    return setUpdateState({
      phase: 'unsupported',
      message: '개발 모드에서는 자동업데이트를 확인하지 않습니다.',
      detail: '',
      error: '',
    })
  }

  if (isCheckingForUpdates) {
    return updateState
  }

  if (forceUpdateActive && !manual) {
    return updateState
  }

  isCheckingForUpdates = true
  pendingTargetVersion = normalizeVersion(targetVersion)
  shouldDownloadOnNextAvailable = Boolean(startDownload)
  appendUpdateLog(`check:start manual=${manual}`)
  setUpdateState({
    phase: 'checking',
    message: startDownload ? '업데이트 릴리즈를 확인하는 중입니다.' : '업데이트를 확인하는 중입니다.',
    detail: '',
    progressPercent: 0,
    error: '',
    lastCheckedAt: new Date().toISOString(),
  })

  try {
    await autoUpdater.checkForUpdates()
    appendUpdateLog(`check:requested manual=${manual}`)
    return updateState
  } catch (error) {
    const message = String(error?.message ?? error ?? '알 수 없는 오류')
    appendUpdateLog(`check:error manual=${manual} message=${message}`)
    setUpdateState({
      phase: 'error',
      message: '업데이트 확인에 실패했습니다.',
      detail: message,
      progressPercent: 0,
      error: message,
    })

    if (mainWindow && !mainWindow.isDestroyed()) {
      await dialog
        .showMessageBox(mainWindow, {
          type: 'warning',
          title: 'NICEENTECH 업데이트 오류',
          message: manual ? '수동 업데이트 확인에 실패했습니다.' : '자동업데이트를 확인하는 중 문제가 발생했습니다.',
          detail: message,
          buttons: ['확인'],
        })
        .catch(() => {})
    }

    return updateState
  } finally {
    isCheckingForUpdates = false
  }
}

function configureAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  appendUpdateLog(`updater:configure version=${app.getVersion()}`)

  autoUpdater.on('update-available', (info) => {
    const nextVersion = normalizeVersion(info?.version) || String(info?.version ?? '')
    appendUpdateLog(`updater:available version=${nextVersion}`)

    if (pendingTargetVersion && nextVersion && pendingTargetVersion !== nextVersion) {
      shouldDownloadOnNextAvailable = false
      setUpdateState({
        phase: 'unavailable',
        message: '설정된 버전 릴리즈를 아직 찾지 못했습니다.',
        detail: `설정 버전 ${pendingTargetVersion} / 확인된 릴리즈 ${nextVersion}`,
        progressPercent: 0,
        targetVersion: pendingTargetVersion,
        error: '',
      })
      return
    }

    setUpdateState({
      phase: 'available',
      message: '새 버전을 찾았습니다.',
      detail: shouldDownloadOnNextAvailable
        ? `${nextVersion || '새 버전'} 다운로드를 시작합니다.`
        : `${nextVersion || '새 버전'} 릴리즈가 확인되었습니다.`,
      progressPercent: 0,
      targetVersion: nextVersion,
      error: '',
    })

    if (!shouldDownloadOnNextAvailable) {
      return
    }

    autoUpdater.downloadUpdate().catch((error) => {
      const message = String(error?.message ?? error ?? '알 수 없는 오류')
      appendUpdateLog(`updater:download-request-error message=${message}`)
      setUpdateState({
        phase: 'error',
        message: '업데이트 다운로드 시작에 실패했습니다.',
        detail: message,
        progressPercent: 0,
        targetVersion: nextVersion || pendingTargetVersion,
        error: message,
      })
      shouldDownloadOnNextAvailable = false
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number.isFinite(progress?.percent) ? Math.max(0, Math.min(100, progress.percent)) : 0
    appendUpdateLog(`updater:downloading percent=${percent.toFixed(1)}`)
    setUpdateState({
      phase: 'downloading',
      message: '업데이트 파일을 다운로드하는 중입니다.',
      detail: `진행률: ${percent.toFixed(1)}%`,
      progressPercent: percent,
      error: '',
    })
    showUpdateLockWindow(
      '최신 버전 다운로드 중입니다.',
      `업데이트를 적용하는 동안 앱을 사용할 수 없습니다.\n진행률: ${percent.toFixed(1)}%`,
      percent,
    )
  })

  autoUpdater.on('update-downloaded', () => {
    installingUpdate = true
    shouldDownloadOnNextAvailable = false
    pendingTargetVersion = ''
    appendUpdateLog('updater:downloaded')
    setUpdateState({
      phase: 'downloaded',
      message: '업데이트 다운로드가 완료되었습니다.',
      detail: '앱을 종료하고 최신 버전 설치를 진행합니다.',
      progressPercent: 100,
      error: '',
    })
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
    appendUpdateLog('updater:not-available')

    const expectedVersion = pendingTargetVersion
    shouldDownloadOnNextAvailable = false
    pendingTargetVersion = ''

    if (expectedVersion && expectedVersion !== normalizeVersion(app.getVersion())) {
      setUpdateState({
        phase: 'unavailable',
        message: '설정된 버전 릴리즈를 아직 찾지 못했습니다.',
        detail: `${expectedVersion} 버전이 GitHub 릴리즈에 아직 준비되지 않았습니다.`,
        progressPercent: 0,
        targetVersion: expectedVersion,
        error: '',
      })
      return
    }

    setUpdateState({
      phase: 'up-to-date',
      message: '현재 최신 버전을 사용 중입니다.',
      detail: '',
      progressPercent: 0,
      targetVersion: app.getVersion(),
      error: '',
    })
  })

  autoUpdater.on('error', (error) => {
    const message = String(error?.message ?? error ?? '알 수 없는 오류')
    shouldDownloadOnNextAvailable = false
    appendUpdateLog(`updater:error message=${message}`)
    setUpdateState({
      phase: 'error',
      message: '업데이트 처리 중 오류가 발생했습니다.',
      detail: message,
      progressPercent: 0,
      error: message,
    })

    if (forceUpdateActive) {
      hideUpdateLockWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        dialog
          .showMessageBox(mainWindow, {
            type: 'warning',
            title: 'NICEENTECH 업데이트 오류',
            message: '업데이트 중 문제가 발생했습니다.',
            detail: message,
            buttons: ['확인'],
          })
          .catch(() => {})
      }
      return
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'warning',
          title: 'NICEENTECH 업데이트 오류',
          message: '자동업데이트를 확인하는 중 문제가 발생했습니다.',
          detail: message,
          buttons: ['확인'],
        })
        .catch(() => {})
    }
  })

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

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastUpdateState()
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
  appendUpdateLog(`app:ready version=${app.getVersion()} packaged=${app.isPackaged}`)
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

ipcMain.handle('desktop:get-app-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  isPackaged: app.isPackaged,
  updateLogFilePath,
  updateState,
}))

ipcMain.handle('desktop:check-for-updates', async (_event, options = {}) => {
  return runUpdateCheck({
    manual: true,
    startDownload: Boolean(options?.startDownload),
    targetVersion: options?.targetVersion ?? '',
  })
})

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
