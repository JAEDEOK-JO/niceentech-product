import { ref } from 'vue'

export const rewardSearchQuery = ref('')
export const rewardSearchOpen = ref(false)

export function openRewardSearch() {
  rewardSearchOpen.value = true
}

export function closeRewardSearch() {
  rewardSearchOpen.value = false
  rewardSearchQuery.value = ''
}
