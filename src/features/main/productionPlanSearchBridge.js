import { ref } from 'vue'

export const productionPlanSearchActive = ref(false)
export const productionPlanSearchSignal = ref(0)

export function requestProductionPlanSearch() {
  productionPlanSearchSignal.value += 1
  window.dispatchEvent(new CustomEvent('production-plan-search'))
}
