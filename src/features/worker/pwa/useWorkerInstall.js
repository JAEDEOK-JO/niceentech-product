import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useWorkerInstall() {
  const promptEvent = ref(null)

  function onPrompt(event) {
    event.preventDefault()
    promptEvent.value = event
  }

  async function install() {
    const event = promptEvent.value
    if (!event) return
    await event.prompt()
    promptEvent.value = null
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onPrompt)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
  })

  return {
    canInstall: computed(() => Boolean(promptEvent.value)),
    install,
  }
}
