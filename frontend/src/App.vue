<template>
  <n-config-provider
    :theme="currentTheme"
    :theme-overrides="currentThemeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider placement="top-right">
      <n-notification-provider placement="top-right">
        <n-dialog-provider>
          <HttpFeedbackBridge />
          <n-loading-bar-provider>
            <router-view />
          </n-loading-bar-provider>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { darkTheme, zhCN, dateZhCN } from 'naive-ui'
import HttpFeedbackBridge from '@/components/HttpFeedbackBridge.vue'
import { themeOverrides, lightThemeOverrides } from '@/utils/theme'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const currentTheme = computed(() => appStore.theme === 'dark' ? darkTheme : null)
const currentThemeOverrides = computed(() =>
  appStore.theme === 'dark' ? themeOverrides : lightThemeOverrides,
)

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', appStore.theme)
})
</script>
