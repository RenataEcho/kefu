<template>
  <!-- UX-DR11: v-if ensures zero DOM when not degraded -->
  <div v-if="degraded" class="api-status-bar" role="status" aria-live="polite">
    <div class="api-status-bar__inner">
      <n-icon size="16" class="api-status-bar__icon">
        <InformationCircleOutline />
      </n-icon>
      <span class="api-status-bar__message">{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'

defineProps<{
  degraded: boolean
  message: string
}>()
</script>

<style scoped>
/* UX-DR11: full-width blue info bar, fixed at layout top, z-index: 50 */
.api-status-bar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(56, 189, 248, 0.15);
  border-bottom: 1px solid rgba(56, 189, 248, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.api-status-bar__inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.api-status-bar__icon {
  color: var(--status-info);
  flex-shrink: 0;
}

.api-status-bar__message {
  font-size: 13px;
  font-weight: 400;
  color: var(--status-info);
  line-height: 1.4;
}
</style>
