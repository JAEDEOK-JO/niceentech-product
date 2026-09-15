import { computed, ref } from 'vue'
import { getShipmentSpecDialogCopy } from './shipmentSpecDialogCopy'

const locale = ref('th')
const copy = computed(() => getShipmentSpecDialogCopy(locale.value))

export const useShipmentSpecDialogLocale = () => ({
  locale,
  copy,
})
