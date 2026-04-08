import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { MENU_PERMS } from '@/utils/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/oauth/lark-mock',
    name: 'LarkOAuthMock',
    component: () => import('@/views/oauth/LarkOAuthMockView.vue'),
    meta: { public: true, title: '飞书授权 Mock' },
  },

  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '数据看板', permission: MENU_PERMS.DASHBOARD },
        beforeEnter: (to, _from, next) => {
          const authStore = useAuthStore()
          const u = authStore.user
          if (!u) {
            next()
            return
          }
          const canGlobal = u.role === 'admin' || u.isAuditor === true
          if (!canGlobal && (to.query.dateRange || to.query.startDate || to.query.endDate)) {
            next({ name: 'Dashboard', query: {}, replace: true })
            return
          }
          next()
        },
      },
      { path: 'funnel', redirect: '/dashboard' },
      {
        path: 'users/:id(\\d+)',
        name: 'UserDetail',
        component: () => import('@/views/users/UserDetailView.vue'),
        meta: { title: '用户详情', permission: MENU_PERMS.USERS },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UsersView.vue'),
        meta: { title: '用户主档表', permission: MENU_PERMS.USERS },
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('@/views/PaymentsView.vue'),
        meta: { title: '付费记录', permission: MENU_PERMS.PAYMENTS },
      },
      {
        path: 'migration',
        name: 'MigrationHub',
        component: () => import('@/views/migration/MigrationHubView.vue'),
        meta: { title: '数据迁移', permission: MENU_PERMS.MIGRATION },
      },
      {
        path: 'group-audits',
        name: 'GroupAudits',
        component: () => import('@/views/AuditView.vue'),
        meta: { title: '入群审核', permission: MENU_PERMS.AUDIT },
      },
      {
        path: 'group-audits/:id(\\d+)',
        name: 'GroupAuditDetail',
        component: () => import('@/views/group-audits/GroupAuditDetailView.vue'),
        meta: { title: '入群审核详情', permission: MENU_PERMS.AUDIT },
      },
      {
        path: 'entry-audits',
        name: 'EntryAudits',
        component: () => import('@/views/entry-audits/EntryAuditView.vue'),
        meta: { title: '录入审核', permission: MENU_PERMS.AUDIT },
      },
      {
        path: 'entry-audits/:id(\\d+)',
        name: 'EntryAuditDetail',
        component: () => import('@/views/entry-audits/EntryAuditDetailView.vue'),
        meta: { title: '录入审核详情', permission: MENU_PERMS.AUDIT },
      },
      { path: 'audit', redirect: '/group-audits' },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationsView.vue'),
        meta: { title: '消息通知', permission: MENU_PERMS.NOTIFICATIONS },
      },
      {
        path: 'sla-alerts',
        name: 'SlaAlerts',
        component: () => import('@/views/SlaAlertsView.vue'),
        meta: { title: 'SLA预警', permission: MENU_PERMS.SLA_ALERTS },
        beforeEnter: (_to, _from, next) => {
          const authStore = useAuthStore()
          const u = authStore.user
          if (u && !u.isAuditor && u.role !== 'admin') {
            next({ name: '403' })
            return
          }
          next()
        },
      },
      {
        path: 'lark-friends',
        name: 'LarkFriends',
        component: () => import('@/views/LarkFriendsView.vue'),
        meta: { title: '飞书好友管理-暂不做', permission: MENU_PERMS.LARK_FRIENDS },
      },
      {
        path: 'cs-management/:id(\\d+)',
        name: 'CsAgentDetail',
        component: () => import('@/views/cs-management/CsAgentDetailView.vue'),
        meta: { title: '客服详情', permission: MENU_PERMS.ORG_MANAGEMENT },
      },
      {
        path: 'cs-management',
        name: 'CsManagement',
        component: () => import('@/views/CsManagementView.vue'),
        meta: { title: '客服管理', permission: MENU_PERMS.ORG_MANAGEMENT },
      },
      {
        path: 'mentor-management/:id(\\d+)',
        name: 'MentorDetail',
        component: () => import('@/views/organization/MentorDetailView.vue'),
        meta: { title: '导师详情', permission: MENU_PERMS.ORG_MANAGEMENT },
      },
      {
        path: 'mentor-management',
        name: 'MentorManagement',
        component: () => import('@/views/MentorManagementView.vue'),
        meta: { title: '导师管理', permission: MENU_PERMS.ORG_MANAGEMENT },
      },
      {
        path: 'sect-management/:id(\\d+)',
        name: 'SchoolDetail',
        component: () => import('@/views/organization/SchoolDetailView.vue'),
        meta: { title: '门派详情', permission: MENU_PERMS.ORG_MANAGEMENT },
      },
      {
        path: 'sect-management',
        name: 'SectManagement',
        component: () => import('@/views/SectManagementView.vue'),
        meta: { title: '门派管理', permission: MENU_PERMS.ORG_MANAGEMENT },
      },
      // Legacy redirects
      {
        path: 'organization',
        redirect: '/cs-management',
      },
      { path: 'org', redirect: '/cs-management' },
      {
        path: 'rbac',
        name: 'Rbac',
        component: () => import('@/views/rbac/RoleList.vue'),
        meta: { title: '角色管理', permission: MENU_PERMS.RBAC },
      },
      {
        path: 'audit-logs',
        name: 'AuditLogs',
        component: () => import('@/views/AuditLogsView.vue'),
        meta: { title: '操作日志', permission: MENU_PERMS.AUDIT_LOGS },
      },
      {
        path: 'accounts',
        name: 'Accounts',
        component: () => import('@/views/AccountsView.vue'),
        meta: { title: '账号管理', permission: MENU_PERMS.ACCOUNTS },
      },
      {
        path: 'settings',
        redirect: '/settings/profile',
      },
      {
        path: 'settings/profile',
        name: 'ProfileSettings',
        component: () => import('@/views/settings/ProfileSettings.vue'),
        meta: { title: '个人设置' },
      },
    ],
  },

  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev/components',
          name: 'ComponentDemo',
          component: () => import('@/views/dev/ComponentDemo.vue'),
          meta: { public: true, title: '组件预览' },
        },
      ]
    : []),

  {
    path: '/403',
    name: '403',
    component: () => import('@/views/ErrorView.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/403',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    return { name: 'Dashboard' }
  }

  if (authStore.isAuthenticated && to.meta.permission) {
    const { hasMenuPermission } = usePermission()
    if (!hasMenuPermission(to.meta.permission as string)) {
      return { name: '403' }
    }
  }
})

export default router
