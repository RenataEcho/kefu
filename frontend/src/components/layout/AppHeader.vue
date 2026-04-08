<template>
  <header class="app-header">
    <div class="header-left">
      <span class="brand-name">客户服务中心</span>
    </div>

    <div class="header-spacer" />

    <div class="header-right">
      <!-- Theme toggle -->
      <div class="theme-area">
        <span class="theme-label">{{ appStore.theme === 'dark' ? '深色' : '浅色' }}</span>
        <div class="theme-toggle" @click="appStore.toggleTheme" title="切换深色/浅色模式">
          <div class="theme-toggle-knob" :class="{ 'knob-light': appStore.theme === 'light' }">
            <span class="theme-icon">{{ appStore.theme === 'dark' ? '🌙' : '☀️' }}</span>
          </div>
        </div>
      </div>

      <div class="header-divider" />

      <!-- User dropdown -->
      <n-dropdown
        :options="userMenuOptions"
        placement="bottom-end"
        @select="onUserMenuSelect"
      >
        <div class="user-trigger">
          <div class="user-avatar">{{ avatarInitial }}</div>
          <span class="user-name">{{ authStore.user?.displayName }}</span>
          <svg width="12" height="12" fill="var(--text-muted)" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
        </div>
      </n-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { SettingsOutline, LogOutOutline } from '@vicons/ionicons5'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as Parameters<typeof h>[0]) })
}

const avatarInitial = computed<string>(() => {
  const name = authStore.user?.displayName ?? 'U'
  return name.charAt(0).toUpperCase()
})

const userMenuOptions: DropdownOption[] = [
  {
    label: '个人设置',
    key: 'settings',
    icon: renderIcon(SettingsOutline),
  },
  {
    type: 'divider',
    key: 'divider',
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline),
  },
]

function onUserMenuSelect(key: string) {
  if (key === 'logout') {
    authStore.clearAuth()
    router.push('/login')
  } else if (key === 'settings') {
    router.push('/settings/profile')
  }
}
</script>

<style scoped>
.app-header {
  height: 56px;
  min-height: 56px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--header-bg, rgba(15, 23, 42, 0.92));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  gap: 16px;
  transition: background 0.35s, border-color 0.35s;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-spacer { flex: 1; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ─── Theme toggle ──────────────────────────────────────── */
.theme-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-label {
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
}

.theme-toggle {
  width: 48px;
  height: 26px;
  border-radius: 13px;
  border: 1px solid var(--border-default);
  background: var(--panel-bg);
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
  flex-shrink: 0;
}

.theme-toggle-knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-surface);
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-knob.knob-light {
  transform: translateX(22px);
  background: #ffffff;
}

.theme-icon {
  font-size: 11px;
  line-height: 1;
}

/* ─── Divider ───────────────────────────────────────────── */
.header-divider {
  width: 1px;
  height: 20px;
  background: var(--border-subtle);
}

/* ─── User ──────────────────────────────────────────────── */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.user-trigger:hover {
  background: var(--hover-bg);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--avatar-bg);
  color: var(--avatar-color);
  border: 1px solid var(--border-default);
  transition: background 0.35s, color 0.35s, border-color 0.35s;
}

.user-name {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
