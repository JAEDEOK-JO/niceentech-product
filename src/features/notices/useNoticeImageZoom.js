import { computed, nextTick, ref } from 'vue'
import { clampNoticeZoom } from './noticeImageZoom'

export function useNoticeImageZoom() {
  const stageRef = ref(null)
  const scale = ref(1)
  const frame = ref({ width: 1, height: 1 })

  const imageStyle = computed(() => ({
    width: `${frame.value.width * scale.value}px`,
    height: `${frame.value.height * scale.value}px`,
  }))

  function measure(element) {
    const stage = element || stageRef.value
    if (!stage) return
    frame.value = {
      width: Math.max(stage.clientWidth, 1),
      height: Math.max(stage.clientHeight, 1),
    }
  }

  async function setZoom(next) {
    const stage = stageRef.value
    const previous = scale.value || 1
    const clamped = clampNoticeZoom(next)
    if (!stage) {
      scale.value = clamped
      return
    }
    const anchorX = (stage.scrollLeft + stage.clientWidth / 2) / previous
    const anchorY = (stage.scrollTop + stage.clientHeight / 2) / previous
    scale.value = clamped
    await nextTick()
    if (clamped <= 1) {
      stage.scrollLeft = 0
      stage.scrollTop = 0
      return
    }
    stage.scrollLeft = anchorX * clamped - stage.clientWidth / 2
    stage.scrollTop = anchorY * clamped - stage.clientHeight / 2
  }

  function resetZoom() {
    scale.value = 1
    const stage = stageRef.value
    if (!stage) return
    stage.scrollLeft = 0
    stage.scrollTop = 0
  }

  function onWheel(event) {
    setZoom(scale.value * (event.deltaY < 0 ? 1.15 : 1 / 1.15))
  }

  return { stageRef, scale, imageStyle, measure, setZoom, resetZoom, onWheel }
}
