const { app, BrowserWindow, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const isDev = !app.isPackaged
let mainWindow = null
let hasShownUpdateAvailableMessage = false

function shouldIgnoreUpdateError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()
  return (
    message.includes('404') ||
    message.includes('latest.yml') ||
    message.includes('no published versions') ||
    message.includes('cannot find channel')
  )
}

function configureAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    if (hasShownUpdateAvailableMessage || !mainWindow) return
    hasShownUpdateAvailableMessage = true
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'NICEENTECH 업데이트',
        message: '새 버전을 확인했습니다. 백그라운드에서 다운로드를 시작합니다.',
        buttons: ['확인'],
      })
      .catch(() => {})
  })

  autoUpdater.on('update-downloaded', async () => {
    if (!mainWindow) {
      autoUpdater.quitAndInstall()
      return
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'NICEENTECH 업데이트',
      message: '업데이트 다운로드가 완료되었습니다.',
      detail: '지금 재시작하면 최신 버전으로 설치됩니다.',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      cancelId: 1,
    })

    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (error) => {
    if (shouldIgnoreUpdateError(error)) return
    const message = String(error?.message ?? error ?? '알 수 없는 오류')
    if (!mainWindow) return
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
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)
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

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
