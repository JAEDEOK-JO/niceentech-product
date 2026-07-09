import { computed, shallowRef, ref, watch } from 'vue'
import { appendHangulJamo, backspaceHangul } from '@/features/virtual-keyboard/utils/hangulCompose'
import {
  isWebVirtualKeyboardHost,
  useVirtualKeyboardSetting,
} from '@/features/virtual-keyboard/composables/useVirtualKeyboardSetting'

/** @type {import('vue').ShallowRef<HTMLInputElement | HTMLTextAreaElement | null>} */
const activeInput = shallowRef(null)
const visible = ref(false)
const layout = ref('ko')
const shift = ref(false)

let watchReady = false

function ensureCanUseWatch(canUse) {
  if (watchReady) return
  watchReady = true
  watch(canUse, (ok) => {
    if (!ok && visible.value) {
      visible.value = false
      activeInput.value = null
      shift.value = false
    }
  })
}

function setNativeValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function readSelection(el) {
  const start = el.selectionStart ?? String(el.value ?? '').length
  const end = el.selectionEnd ?? start
  return { start, end }
}

function writeWithCaret(el, nextValue, caret) {
  setNativeValue(el, nextValue)
  const pos = Math.max(0, Math.min(caret, nextValue.length))
  try {
    el.setSelectionRange(pos, pos)
  } catch {
    /* ignore */
  }
}

function applyText(text) {
  const el = activeInput.value
  if (!el || el.disabled || el.readOnly) return
  const current = String(el.value ?? '')
  const { start, end } = readSelection(el)
  const next = current.slice(0, start) + text + current.slice(end)
  writeWithCaret(el, next, start + text.length)
}

function applyHangul(jamo) {
  const el = activeInput.value
  if (!el || el.disabled || el.readOnly) return
  const current = String(el.value ?? '')
  const { start, end } = readSelection(el)

  if (start !== end) {
    const next = current.slice(0, start) + jamo + current.slice(end)
    writeWithCaret(el, next, start + jamo.length)
    return
  }

  const head = current.slice(0, start)
  const tail = current.slice(start)
  const composedHead = appendHangulJamo(head, jamo)
  writeWithCaret(el, composedHead + tail, composedHead.length)
}

function applyBackspace() {
  const el = activeInput.value
  if (!el || el.disabled || el.readOnly) return
  const current = String(el.value ?? '')
  const { start, end } = readSelection(el)

  if (start !== end) {
    const next = current.slice(0, start) + current.slice(end)
    writeWithCaret(el, next, start)
    return
  }

  if (start <= 0) return

  if (layout.value === 'ko') {
    const head = current.slice(0, start)
    const tail = current.slice(start)
    const nextHead = backspaceHangul(head)
    writeWithCaret(el, nextHead + tail, nextHead.length)
    return
  }

  const next = current.slice(0, start - 1) + current.slice(start)
  writeWithCaret(el, next, start - 1)
}

export function useVirtualKeyboard() {
  const { enabled } = useVirtualKeyboardSetting()
  const canUse = computed(() => isWebVirtualKeyboardHost() && enabled.value)
  ensureCanUseWatch(canUse)

  const close = () => {
    visible.value = false
    activeInput.value = null
    shift.value = false
  }

  const openFor = (el) => {
    if (!canUse.value) return
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return
    activeInput.value = el
    visible.value = true
  }

  const toggleLayout = () => {
    layout.value = layout.value === 'ko' ? 'en' : 'ko'
    shift.value = false
  }

  const pressKey = (key) => {
    if (!visible.value || !activeInput.value) return

    if (key === 'backspace') {
      applyBackspace()
      return
    }
    if (key === 'space') {
      applyText(' ')
      return
    }
    if (key === 'enter') {
      activeInput.value.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      }))
      activeInput.value.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      }))
      return
    }
    if (key === 'shift') {
      shift.value = !shift.value
      return
    }
    if (key === 'lang') {
      toggleLayout()
      return
    }
    if (key === 'close') {
      close()
      return
    }

    if (/^[0-9]$/.test(key)) {
      applyText(key)
      return
    }

    if (layout.value === 'ko') {
      applyHangul(key)
      if (shift.value) shift.value = false
      return
    }

    const char = shift.value ? key.toUpperCase() : key.toLowerCase()
    applyText(char)
    if (shift.value && key.length === 1 && /[a-z]/i.test(key)) {
      shift.value = false
    }
  }

  return {
    visible,
    layout,
    shift,
    activeInput,
    canUse,
    openFor,
    close,
    pressKey,
    toggleLayout,
  }
}
