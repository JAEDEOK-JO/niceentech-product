import { reactive } from 'vue'

const state = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '확인',
  cancelText: '취소',
  type: 'confirm', // 'confirm' | 'alert'
  resolve: null,
})

export function useDialog() {
  const confirm = (message, options = {}) => {
    return new Promise((resolve) => {
      state.visible = true
      state.type = 'confirm'
      state.message = message
      state.title = options.title ?? ''
      state.confirmText = options.confirmText ?? '확인'
      state.cancelText = options.cancelText ?? '취소'
      state.resolve = resolve
    })
  }

  const alert = (message, options = {}) => {
    return new Promise((resolve) => {
      state.visible = true
      state.type = 'alert'
      state.message = message
      state.title = options.title ?? ''
      state.confirmText = options.confirmText ?? '확인'
      state.resolve = resolve
    })
  }

  const handleConfirm = () => {
    state.visible = false
    state.resolve?.(true)
    state.resolve = null
  }

  const handleCancel = () => {
    state.visible = false
    state.resolve?.(false)
    state.resolve = null
  }

  return { state, confirm, alert, handleConfirm, handleCancel }
}
