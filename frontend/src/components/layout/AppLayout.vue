<template>
  <div class="app-layout">
    <AppSidebar />

    <div class="main-wrapper">
      <AppHeader />

      <!-- Story 7-7：SLA 超时全局 Banner（不可关闭，60s 轮询） -->
      <div v-if="slaBannerVisible" class="sla-banner-stack">
        <div
          v-if="slaBanner.groupOverdue > 0"
          class="sla-overdue-banner"
          role="button"
          tabindex="0"
          @click="goGroupAudits"
          @keyup.enter="goGroupAudits"
        >
          <n-icon :component="WarningOutline" :size="18" class="sla-overdue-banner__icon" />
          <span class="sla-overdue-banner__text">
            {{ slaBanner.groupOverdue }} 条入群申请已超时，请尽快处理
          </span>
          <span class="sla-overdue-banner__cta">前往处理</span>
        </div>
        <div
          v-if="slaBanner.entryOverdue > 0"
          class="sla-overdue-banner sla-overdue-banner--entry"
          role="button"
          tabindex="0"
          @click="goEntryAudits"
          @keyup.enter="goEntryAudits"
        >
          <n-icon :component="WarningOutline" :size="18" class="sla-overdue-banner__icon" />
          <span class="sla-overdue-banner__text">
            {{ slaBanner.entryOverdue }} 条用户录入审核已超时，请尽快处理
          </span>
          <span class="sla-overdue-banner__cta">前往处理</span>
        </div>
      </div>

      <main class="page-content">
        <div class="content-inner">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>

    <!-- Token expiry warning modal -->
    <n-modal
      v-model:show="showExpiryWarning"
      :mask-closable="false"
      preset="card"
      title="会话即将过期"
      style="max-width: 420px;"
      :bordered="false"
    >
      <div class="expiry-body">
        <div class="expiry-icon-wrap">
          <n-icon :component="TimeOutline" :size="40" style="color: #f97316" />
        </div>
        <p class="expiry-message">
          您已 <strong>{{ elapsedTimeText }}</strong> 未操作，<br />
          请及时点击任意操作以保持登录状态。
        </p>
        <p class="expiry-sub">
          距会话过期还有 <span class="expiry-countdown">{{ remainingTimeText }}</span>
        </p>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px">
          <n-button @click="handleExpiryLogout">退出登录</n-button>
          <n-button type="primary" @click="handleExpiryContinue">继续使用</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { usePermission } from '@/composables/usePermission'
import { MENU_PERMS } from '@/utils/permission'
import { fetchLarkApiStatus } from '@/api/lark'
import { fetchSlaBanner } from '@/api/groupAudits'
import { TimeOutline, WarningOutline } from '@vicons/ionicons5'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const { hasMenuPermission } = usePermission()

const slaBanner = ref<{ groupOverdue: number; entryOverdue: number }>({
  groupOverdue: 0,
  entryOverdue: 0,
})

const slaBannerVisible = computed(
  () => slaBanner.value.groupOverdue > 0 || slaBanner.value.entryOverdue > 0,
)
let slaPollTimer: ReturnType<typeof setInterval> | null = null

const canPollSlaBanner = computed(
  () => authStore.isAuthenticated && hasMenuPermission(MENU_PERMS.AUDIT),
)

async function refreshSlaBanner() {
  if (!canPollSlaBanner.value) {
    slaBanner.value = { groupOverdue: 0, entryOverdue: 0 }
    return
  }
  try {
    const data = await fetchSlaBanner()
    const groupOverdue = data.overdueCount ?? 0
    const entryOverdue = data.entryAuditOverdueCount ?? 0
    slaBanner.value = { groupOverdue, entryOverdue }
  } catch {
    /* 静默失败 */
  }
}

function goGroupAudits() {
  router.push({ name: 'GroupAudits' })
}

function goEntryAudits() {
  router.push({ name: 'EntryAudits' })
}

function startSlaBannerPoll() {
  if (slaPollTimer) {
    clearInterval(slaPollTimer)
    slaPollTimer = null
  }
  if (!canPollSlaBanner.value) return
  void refreshSlaBanner()
  slaPollTimer = setInterval(refreshSlaBanner, 60 * 1000)
}

watch(
  () => [authStore.isAuthenticated, authStore.user?.permissions?.menuPerms],
  () => {
    startSlaBannerPoll()
    if (!canPollSlaBanner.value) {
      if (slaPollTimer) {
        clearInterval(slaPollTimer)
        slaPollTimer = null
      }
      slaBanner.value = { groupOverdue: 0, entryOverdue: 0 }
    }
  },
  { deep: true },
)

const showExpiryWarning = ref(false)
let expiryCheckTimer: ReturnType<typeof setInterval> | null = null

function computeRemainingMs(): number {
  return Math.max(0, authStore.tokenExpiresAt - Date.now())
}

const remainingTimeText = computed(() => {
  const ms = computeRemainingMs()
  if (ms <= 0) return '已过期'
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins} 分 ${secs} 秒`
})

const elapsedTimeText = computed(() => {
  const remainingMs = computeRemainingMs()
  const elapsedMs = Math.max(0, 28800 * 1000 - remainingMs)
  const hours = Math.floor(elapsedMs / 3600000)
  const mins = Math.floor((elapsedMs % 3600000) / 60000)
  if (hours > 0) return `${hours} 小时 ${mins} 分钟`
  return `${mins} 分钟`
})

function checkTokenExpiry() {
  if (!authStore.isAuthenticated) return
  if (authStore.isTokenExpiringSoon && !showExpiryWarning.value) {
    showExpiryWarning.value = true
  }
}

function handleExpiryContinue() {
  showExpiryWarning.value = false
}

function handleExpiryLogout() {
  showExpiryWarning.value = false
  authStore.clearAuth()
  router.push('/login')
}

let larkStatusTimer: ReturnType<typeof setInterval> | null = null

async function pollLarkApiStatus() {
  if (!authStore.isAuthenticated) return
  try {
    const s = await fetchLarkApiStatus()
    appStore.setLarkApiDegraded(!!s.degraded)
  } catch {
    appStore.setLarkApiDegraded(false)
  }
}

onMounted(() => {
  expiryCheckTimer = setInterval(checkTokenExpiry, 60 * 1000)
  checkTokenExpiry()
  void pollLarkApiStatus()
  larkStatusTimer = setInterval(pollLarkApiStatus, 30_000)
  startSlaBannerPoll()
})

onUnmounted(() => {
  if (expiryCheckTimer) clearInterval(expiryCheckTimer)
  if (larkStatusTimer) clearInterval(larkStatusTimer)
  if (slaPollTimer) clearInterval(slaPollTimer)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
  overflow: hidden;
  transition: background 0.35s ease;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.sla-banner-stack {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.sla-overdue-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 20px;
  background: color-mix(in srgb, var(--status-warning) 18%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--status-warning) 42%, transparent);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.sla-overdue-banner--entry {
  background: color-mix(in srgb, #ef4444 14%, transparent);
  border-bottom-color: color-mix(in srgb, #ef4444 35%, transparent);
}

.sla-overdue-banner--entry:hover {
  background: color-mix(in srgb, #ef4444 20%, transparent);
}

.sla-overdue-banner--entry .sla-overdue-banner__icon {
  color: #ef4444;
}

.sla-overdue-banner--entry .sla-overdue-banner__cta {
  color: #dc2626;
}

.sla-overdue-banner:hover {
  background: color-mix(in srgb, var(--status-warning) 26%, transparent);
}

.sla-overdue-banner:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.sla-overdue-banner__icon {
  flex-shrink: 0;
  color: var(--status-warning);
}

.sla-overdue-banner__text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.sla-overdue-banner__cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--status-warning);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-base);
  padding: 16px 20px;
  transition: background 0.35s ease;
}

.content-inner {
  width: 100%;
  max-width: none;
  margin: 0;
}

/* ─── Token expiry modal ────────────────────────────────── */
.expiry-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 16px;
  text-align: center;
}

.expiry-icon-wrap {
  padding: 12px;
  border-radius: 50%;
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.25);
}

.expiry-message {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.7;
}

.expiry-message strong {
  color: #f97316;
}

.expiry-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.expiry-countdown {
  color: #ef4444;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

/* ─── Route transitions ─────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
