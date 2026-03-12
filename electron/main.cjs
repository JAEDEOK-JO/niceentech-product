const { app, BrowserWindow, shell } = require('electron')
const path = require('path')

const isDev = !app.isPackaged
const resolveDesktopRemoteUrl = () => {
  const fromEnv = String(process.env.DESKTOP_REMOTE_URL ?? '').trim()
  if (fromEnv) return fromEnv

  try {
    const pkg = require(path.join(app.getAppPath(), 'package.json'))
    return String(pkg.desktopRemoteUrl ?? '').trim()
  } catch {
    return ''
  }
}

function createMainWindow() {
  const win = new BrowserWindow({
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
    win.loadURL('http://localhost:5173')
  } else {
    const remoteUrl = resolveDesktopRemoteUrl()
    if (remoteUrl && /^https?:\/\//i.test(remoteUrl)) {
      win.loadURL(remoteUrl)
    } else {
      // Fallback for cases where remote URL is not configured.
      win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    }
  }

  win.webContents.on('before-input-event', (event, input) => {
    const isPrintShortcut =
      input.type === 'keyDown' &&
      input.key.toLowerCase() === 'p' &&
      (input.control || input.meta)

    if (!isPrintShortcut) return

    event.preventDefault()
    win.webContents.print({
      printBackground: true,
    })
  })
}

app.whenReady().then(() => {
  createMainWindow()

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
