import { useVirtualKeyboard } from '@/features/virtual-keyboard/composables/useVirtualKeyboard'

function resolveInput(el) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el
  return el?.querySelector?.('input, textarea') || null
}

export const vVirtualKeyboard = {
  mounted(el) {
    const { canUse, openFor } = useVirtualKeyboard()
    const open = () => {
      if (!canUse.value) return
      const input = resolveInput(el)
      if (input) openFor(input)
    }
    el.__vkOpen = open
    el.addEventListener('focusin', open)
    el.addEventListener('click', open)
  },
  unmounted(el) {
    if (el.__vkOpen) {
      el.removeEventListener('focusin', el.__vkOpen)
      el.removeEventListener('click', el.__vkOpen)
      delete el.__vkOpen
    }
  },
}
