import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'dark' | 'light'

export const useAppStore = defineStore('app', () => {
  const theme = ref<Theme>('dark')
  const sidebarCollapsed = ref(false)
  const globalLoading = ref(false)

  // API degradation status — true when 右豹APP API is unreachable
  const youbaoApiDegraded = ref(false)

  /** Story 7-5：飞书 Open API 不可用（由 GET /lark/status 轮询更新） */
  const larkApiDegraded = ref(false)

  /** Story 3-4：第三方导师系统 API 不可用（导师详情 ApiStatusBar） */
  const mentorApiDegraded = ref(false)

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setYoubaoApiDegraded(degraded: boolean) {
    youbaoApiDegraded.value = degraded
  }

  function setLarkApiDegraded(degraded: boolean) {
    larkApiDegraded.value = degraded
  }

  function setMentorApiDegraded(degraded: boolean) {
    mentorApiDegraded.value = degraded
  }

  return {
    theme,
    sidebarCollapsed,
    globalLoading,
    youbaoApiDegraded,
    larkApiDegraded,
    mentorApiDegraded,
    toggleTheme,
    toggleSidebar,
    setYoubaoApiDegraded,
    setLarkApiDegraded,
    setMentorApiDegraded,
  }
})
