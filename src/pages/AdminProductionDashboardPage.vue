<script setup>
import { useRoute, useRouter } from 'vue-router'
import AdminDepartmentPlaceholderView from '@/features/admin-dashboard/AdminDepartmentPlaceholderView.vue'

const router = useRouter()
const route = useRoute()

const goHome = () => {
  router.push('/main')
}
</script>

<template>
  <AdminDepartmentPlaceholderView
    title="생산부 대시보드"
    description="생산부 주간 입력 대시보드는 다음 단계에서 생산실적·공정 지연 지표 중심으로 연결할 예정입니다."
    :current-path="route.path"
    @go-home="goHome"
  />
</template>
