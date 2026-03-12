import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage.vue'
import MainPage from '@/pages/MainPage.vue'
import MainRegisterPage from '@/pages/MainRegisterPage.vue'
import CompanyRegisterPage from '@/pages/CompanyRegisterPage.vue'
import HomePage from '@/pages/HomePage.vue'
import MyPage from '@/pages/MyPage.vue'
import NotificationsPage from '@/pages/NotificationsPage.vue'
import StatsPage from '@/pages/StatsPage.vue'
import ManagementGuidePage from '@/pages/ManagementGuidePage.vue'
import AdminSalesDashboardPage from '@/pages/AdminSalesDashboardPage.vue'
import AdminDesignDashboardPage from '@/pages/AdminDesignDashboardPage.vue'
import AdminOperationsDashboardPage from '@/pages/AdminOperationsDashboardPage.vue'
import AdminProductionDashboardPage from '@/pages/AdminProductionDashboardPage.vue'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const routes = [
  {
    path: '/',
    redirect: '/main',
  },
  {
    path: '/main',
    name: 'main',
    component: MainPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/main/register',
    name: 'main-register',
    component: MainRegisterPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/company/register',
    name: 'company-register',
    component: CompanyRegisterPage,
    meta: { requiresAuth: true, requiresDesignDepartment: true },
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
    path: '/admin/sales-dashboard',
    name: 'admin-sales-dashboard',
    component: AdminSalesDashboardPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/design-dashboard',
    name: 'admin-design-dashboard',
    component: AdminDesignDashboardPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/operations-dashboard',
    name: 'admin-operations-dashboard',
    component: AdminOperationsDashboardPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/production-dashboard',
    name: 'admin-production-dashboard',
    component: AdminProductionDashboardPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/main',
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
    return { name: 'main' }
  }

  if (to.meta.requiresAdmin || to.meta.requiresDesignDepartment) {
    const userId = data.session?.user?.id ?? null
    if (!userId) return { name: 'login' }
    const { data: profile } = await supabase.from('profiles').select('role,department').eq('id', userId).maybeSingle()
    if (to.meta.requiresAdmin && !isAdminRole(profile?.role)) {
      return { name: 'main' }
    }
    if (to.meta.requiresDesignDepartment && !isAdminRole(profile?.role) && !isDesignDepartment(profile?.department)) {
      return { name: 'main' }
    }
  }

  return true
})

export default router
