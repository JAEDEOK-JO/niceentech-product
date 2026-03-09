import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage.vue'
import HomePage from '@/pages/HomePage.vue'
import MyPage from '@/pages/MyPage.vue'
import NotificationsPage from '@/pages/NotificationsPage.vue'
import StatsPage from '@/pages/StatsPage.vue'
import ManagementGuidePage from '@/pages/ManagementGuidePage.vue'

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { guestOnly: true },
  },
  {
    path: '/home',
    name: 'home',
    component: HomePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/mypage',
    name: 'mypage',
    component: MyPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: NotificationsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/management-guide',
    name: 'management-guide',
    component: ManagementGuidePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const { data } = await supabase.auth.getSession()
  const isLoggedIn = !!data.session

  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && isLoggedIn) {
    return { name: 'home' }
  }

  return true
})

export default router
