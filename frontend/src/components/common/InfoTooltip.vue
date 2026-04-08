<template>
  <n-popover
    trigger="hover"
    :show-arrow="false"
    placement="top"
    :delay="200"
    raw
    :style="{ padding: 0 }"
    class="info-tooltip-root"
  >
    <template #trigger>
      <span
        class="info-tooltip-trigger"
        role="button"
        tabindex="0"
        aria-label="字段说明"
        @click.prevent
      >
        <n-icon :component="InformationCircleOutline" :size="16" />
      </span>
    </template>
    <div class="info-tooltip-panel">
      <div v-if="title" class="info-tooltip-title">{{ title }}</div>
      <div class="info-tooltip-body">
        <slot>{{ hint }}</slot>
      </div>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
import { NIcon, NPopover } from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'

withDefaults(
  defineProps<{
    /** 简短标题（可选） */
    title?: string
    /** 无插槽时的纯文本说明 */
    hint?: string
  }>(),
  { title: '', hint: '' },
)
</script>

<style scoped>
.info-tooltip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  vertical-align: middle;
  color: var(--text-muted);
  cursor: help;
  border-radius: var(--radius-sm);
  transition: color 0.15s, background 0.15s;
}

.info-tooltip-trigger:hover,
.info-tooltip-trigger:focus-visible {
  color: var(--accent-hover);
  background: var(--hover-bg);
  outline: none;
}

.info-tooltip-panel {
  max-width: 280px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--glass-card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-card-border);
  box-shadow: var(--glass-card-shadow);
  background-image: var(--glass-card-gloss);
}

.info-tooltip-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.info-tooltip-body {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-primary);
}

.info-tooltip-body :deep(p) {
  margin: 0 0 8px;
}

.info-tooltip-body :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
