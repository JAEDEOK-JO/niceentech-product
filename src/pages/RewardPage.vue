<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import RewardDashboard from '@/features/worker-management/reward/RewardDashboard.vue'
import { canReviewWorkerRewards } from '@/features/worker-management/rewardAccess'

const { session } = useAuth()
const { profile } = useProfile(session)
const canReview = computed(() => canReviewWorkerRewards(profile.value?.role))
</script>

<template>
  <main class="min-h-screen bg-white px-[5px] py-5 sm:px-5">
    <RewardDashboard :can-review="canReview" />
  </main>
</template>
