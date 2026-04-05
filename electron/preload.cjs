const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),
  checkForUpdates: (options = {}) => ipcRenderer.invoke('desktop:check-for-updates', options),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {}
    const listener = (_, payload) => callback(payload)
    ipcRenderer.on('desktop:update-status', listener)
    return () => {
      ipcRenderer.removeListener('desktop:update-status', listener)
    }
  },
})
