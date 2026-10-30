<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
})

const open = ref(false)
const position = ref({})
let timer = 0

const findOverflow = (el) => {
  for (const child of el.children) {
    const found = findOverflow(child)
    if (found) return found
  }
  if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) return el
  return null
}

const hide = () => {
  window.clearTimeout(timer)
  timer = 0
  open.value = false
}

const show = (event) => {
  const host = event.currentTarget
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    const text = String(props.text ?? '').trim()
    const target = text ? findOverflow(host) : null
    if (!target) return
    const rect = target.getBoundingClientRect()
    const width = 320
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8))
    const below = rect.bottom + 6
    const placeAbove = below > window.innerHeight - 80
    position.value = {
      left: `${left}px`,
      top: placeAbove ? `${Math.max(8, rect.top - 6)}px` : `${below}px`,
      transform: placeAbove ? 'translateY(-100%)' : 'none',
      maxWidth: `${width}px`,
    }
    open.value = true
  }, 200)
}

onBeforeUnmount(hide)
</script>

<template>
  <span class="block w-full min-w-0 max-w-full" @mouseenter="show" @mouseleave="hide">
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-if="open"
      class="pointer-events-none fixed z-[80] whitespace-pre-wrap break-words rounded-md bg-slate-900 px-2.5 py-1.5 text-left text-xs font-semibold leading-5 text-white shadow-lg"
      :style="position"
    >
      {{ text }}
    </div>
  </Teleport>
</template>
