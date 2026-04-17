'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// 렌더러(Vue 앱)에서 window.electronAPI 로 접근 가능한 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
  /** 현재 Electron 환경인지 여부 */
  isElectron: true,

  /**
   * 읽지 않은 메시지 수를 메인 프로세스로 전달
   * → 트레이 아이콘 및 작업표시줄 배지 업데이트
   * @param {number} count
   */
  setUnreadCount: (count) => {
    ipcRenderer.send('unread-count', count)
  },

  /**
   * 네이티브 알림 요청 (OneSignal 대신 Electron 네이티브 알림 사용 시)
   * @param {{ title: string, body: string, url?: string }} options
   */
  showNotification: (options) => {
    ipcRenderer.send('show-notification', options)
  },

  /**
   * 메인 프로세스에서 보내는 '특정 경로로 이동' 이벤트 수신
   * @param {(url: string) => void} callback
   */
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (_, url) => callback(url))
  },

  /** 이벤트 리스너 제거 */
  removeNavigateListener: () => {
    ipcRenderer.removeAllListeners('navigate-to')
  },

  /**
   * 로그인/로그아웃 시 유저 ID를 메인 프로세스에 전달
   * → 메인 프로세스 Supabase 리스너 시작/중지
   * @param {string | null} userId
   */
  setAuthUserId: (userId) => {
    ipcRenderer.send('auth-user-id', userId || null)
  },
})
