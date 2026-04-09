<template>
  <aside class="app-sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" :fill="'var(--accent-glow)'" :stroke="'var(--border-default)'" stroke-width="1" />
          <path d="M5 17a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1v-4zm6-4a1 1 0 011-1h3a1 1 0 011 1v8a1 1 0 01-1 1h-3a1 1 0 01-1-1v-8zm6-4a1 1 0 011-1h3a1 1 0 011 1v12a1 1 0 01-1 1h-3a1 1 0 01-1-1V9z" :fill="'var(--avatar-color)'" />
        </svg>
      </div>
      <transition name="logo-fade">
        <span v-if="!appStore.sidebarCollapsed" class="logo-text">客户服务中心</span>
      </transition>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <template v-for="group in visibleGroups" :key="group.label">
        <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">{{ group.label }}</div>

        <template v-for="item in group.items" :key="item.key">
          <n-tooltip
            v-if="appStore.sidebarCollapsed"
            placement="right"
            :show-arrow="false"
            :delay="300"
          >
            <template #trigger>
              <div
                class="nav-item"
                :class="{ active: isActive(item.path) }"
                @click="navigate(item.path)"
              >
                <span class="nav-dot" :class="{ 'nav-dot--red': item.badgeCount }" />
              </div>
            </template>
            {{ item.label }}
          </n-tooltip>

          <div
            v-else
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="navigate(item.path)"
          >
            <span class="nav-dot" :class="{ 'nav-dot--red': item.badgeCount }" />
            <span class="nav-label">{{ item.label }}</span>
            <span v-if="item.badgeCount" class="nav-badge">{{ item.badgeCount }}</span>
          </div>
        </template>
      </template>
    </nav>

    <!-- Admin-only -->
    <template v-if="adminNavItems.length">
      <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">系统配置</div>
      <template v-for="item in adminNavItems" :key="item.key">
        <n-tooltip
          v-if="appStore.sidebarCollapsed"
          placement="right"
          :show-arrow="false"
          :delay="300"
        >
          <template #trigger>
            <div
              class="nav-item"
              :class="{ active: isActive(item.path) }"
              @click="navigate(item.path)"
            >
              <span class="nav-dot" />
            </div>
          </template>
          {{ item.label }}
        </n-tooltip>
        <div
          v-else
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
        >
          <span class="nav-dot" />
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </template>
    </template>

    <!-- Footer -->
    <div class="sidebar-divider" />
    <div class="sidebar-footer-nav">
      <template v-for="item in footerItems" :key="item.key">
        <div
          v-if="!appStore.sidebarCollapsed"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
        >
          <span class="nav-dot" />
          <span class="nav-label">{{ item.label }}</span>
        </div>
        <n-tooltip v-else placement="right" :show-arrow="false" :delay="300">
          <template #trigger>
            <div
              class="nav-item"
              :class="{ active: isActive(item.path) }"
              @click="navigate(item.path)"
            >
              <span class="nav-dot" />
            </div>
          </template>
          {{ item.label }}
        </n-tooltip>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { MENU_PERMS } from '@/utils/permission'

const appStore = useAppStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { hasMenuPermission } = usePermission()

interface MenuItem {
  key: string
  label: string
  path: string
  perm: string
  badgeCount?: number
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: '运营概览',
    items: [{ key: 'dashboard', label: '数据看板', path: '/dashboard', perm: MENU_PERMS.DASHBOARD }],
  },
  {
    label: '用户管理',
    items: [
      { key: 'users', label: '用户主档表', path: '/users', perm: MENU_PERMS.USERS },
      { key: 'payments', label: '付费记录', path: '/payments', perm: MENU_PERMS.PAYMENTS },
      { key: 'migration', label: '数据迁移', path: '/migration', perm: MENU_PERMS.MIGRATION },
    ],
  },
  {
    label: '审核工作台',
    items: [
      { key: 'audit', label: '入群审核', path: '/group-audits', perm: MENU_PERMS.AUDIT, badgeCount: 3 },
      { key: 'entry-audit', label: '录入审核', path: '/entry-audits', perm: MENU_PERMS.AUDIT },
      { key: 'sla', label: 'SLA 预警', path: '/sla-alerts', perm: MENU_PERMS.SLA_ALERTS },
      { key: 'notifications', label: '消息通知', path: '/notifications', perm: MENU_PERMS.NOTIFICATIONS },
      {
        key: 'lark',
        label: '飞书好友管理-暂不做',
        path: '/lark-friends',
        perm: MENU_PERMS.LARK_FRIENDS,
      },
    ],
  },
  {
    label: '组织管理',
    items: [
      { key: 'cs', label: '客服管理', path: '/cs-management', perm: MENU_PERMS.ORG_MANAGEMENT },
      { key: 'mentor', label: '导师管理', path: '/mentor-management', perm: MENU_PERMS.ORG_MANAGEMENT },
      { key: 'sect', label: '门派管理', path: '/sect-management', perm: MENU_PERMS.ORG_MANAGEMENT },
    ],
  },
  {
    label: '权限管理',
    items: [
      { key: 'rbac', label: '角色管理', path: '/rbac', perm: MENU_PERMS.RBAC },
      { key: 'accounts', label: '账号管理', path: '/accounts', perm: MENU_PERMS.ACCOUNTS },
    ],
  },
]

const FOOTER_ITEMS: MenuItem[] = []

const adminNavItems = computed(() => {
  if (authStore.user?.role !== 'admin') return []
  return [{ key: 'page-rules', label: '规则配置说明', path: '/system/page-rules' }]
})

const visibleGroups = computed<MenuGroup[]>(() =>
  MENU_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!hasMenuPermission(item.perm)) return false
        if (
          item.path === '/sla-alerts' &&
          !(authStore.user?.isAuditor || authStore.user?.role === 'admin')
        )
          return false
        return true
      }),
    }))
    .filter((group) => group.items.length > 0),
)

const footerItems = computed<MenuItem[]>(() =>
  FOOTER_ITEMS.filter((item) => hasMenuPermission(item.perm)),
)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function navigate(path: string) {
  router.push(path)
}
</script>

<style scoped>
.app-sidebar {
  width: 200px;
  min-width: 200px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease, min-width 0.25s ease, background 0.35s, border-color 0.35s;
  position: relative;
  z-index: 100;
  flex-shrink: 0;
  background: var(--sidebar-bg, rgba(15, 23, 42, 0.85));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-subtle);
  padding: 12px 8px;
  overflow-y: auto;
}

.app-sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px 16px;
  min-height: 44px;
  overflow: hidden;
}

.logo-icon { flex-shrink: 0; }

.logo-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  letter-spacing: -0.1px;
}

.logo-fade-enter-active,
.logo-fade-leave-active { transition: opacity 0.15s ease; }
.logo-fade-enter-from,
.logo-fade-leave-to { opacity: 0; }

/* ─── Navigation ────────────────────────────────────────── */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 12px;
  margin-bottom: 2px;
  margin-top: 12px;
  user-select: none;
}

.nav-group-label:first-child { margin-top: 6px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-label);
  transition: all 0.15s;
  user-select: none;
  font-size: 13.5px;
  position: relative;
}

.nav-item:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-glow);
  color: var(--accent-hover);
}

.nav-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-dot--red {
  background: #ef4444;
  opacity: 1;
}

.nav-label {
  font-size: 13.5px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 99px;
  font-weight: 600;
  color: var(--badge-red);
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.38);
}

.app-sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px;
}

/* ─── Footer ────────────────────────────────────────────── */
.sidebar-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 8px 0;
}

.sidebar-footer-nav { padding: 0; }
</style>
