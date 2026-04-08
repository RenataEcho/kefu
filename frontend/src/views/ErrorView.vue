<template>
  <div class="error-page">
    <div class="error-container">
      <n-icon :component="LockClosedOutline" :size="56" class="error-icon" />
      <h1 class="error-code">403</h1>
      <h2 class="error-title">无访问权限</h2>
      <p class="error-desc">您没有访问该页面所需的权限，请联系管理员。</p>
      <n-button type="primary" @click="goHome">返回首页</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LockClosedOutline } from '@vicons/ionicons5'

const router = useRouter()
function goHome() {
  router.push('/')
}
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 64px 80px;
  border-radius: 20px;
  text-align: center;
  background: var(--panel-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--panel-border);
}

.error-icon {
  color: var(--status-error);
  opacity: 0.8;
}

.error-code {
  font-size: 72px;
  font-weight: 800;
  color: var(--accent);
  margin: 0;
  line-height: 1;
  letter-spacing: -2px;
}

.error-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.error-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
  max-width: 280px;
}
</style>
