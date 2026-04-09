<template>
  <div class="metric-card glass-card">
    <div class="metric-card__header">
      <span class="metric-card__title">
        {{ title }}
        <InfoTooltip
          v-if="fieldHelp"
          :title="fieldHelp.title ?? ''"
          :hint="fieldHelp.hint"
        />
      </span>
      <slot name="badge" />
    </div>

    <div class="metric-card__value-row">
      <span class="metric-card__value">{{ formattedValue }}</span>
      <span v-if="unit" class="metric-card__unit">{{ unit }}</span>
    </div>

    <div v-if="trend" class="metric-card__trend" :class="trendClass">
      <n-icon size="14">
        <TrendingUpOutline v-if="trend.direction === 'up'" />
        <TrendingDownOutline v-else />
      </n-icon>
      <span>{{ trend.direction === 'up' ? '+' : '-' }}{{ Math.abs(trend.value) }}%</span>
      <span class="metric-card__trend-label">较上期</span>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { TrendingUpOutline, TrendingDownOutline } from '@vicons/ionicons5'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import { getFieldHelp } from '@/utils/fieldHelpCatalog'

const props = defineProps<{
  title: string
  value: number | string
  unit?: string
  /** 与 fieldHelpCatalog 中的 key 对应，展示指标统计说明 */
  fieldHelpKey?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}>()

const fieldHelp = computed(() =>
  props.fieldHelpKey ? getFieldHelp(props.fieldHelpKey) ?? null : null,
)

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString('zh-CN')
  }
  return props.value
})

const trendClass = computed(() => ({
  'metric-card__trend--up': props.trend?.direction === 'up',
  'metric-card__trend--down': props.trend?.direction === 'down',
}))
</script>

<style scoped>
.glass-card {
  background: var(--glass-card-bg, rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-card-border, rgba(255, 255, 255, 0.12));
  box-shadow: var(--glass-card-shadow, 0 20px 25px -5px rgba(0, 0, 0, 0.4));
  background-image: var(--glass-card-gloss, linear-gradient(to bottom, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.05) 2px, transparent 2px));
  transition: background 0.35s, border-color 0.35s, box-shadow 0.35s;
}

.metric-card {
  border-radius: 14px;
  padding: 20px 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.35s, border-color 0.35s;
  cursor: default;
  overflow: hidden;
  position: relative;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: var(--metric-top-line, linear-gradient(90deg, transparent, rgba(99,102,241,0.55), transparent));
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--accent-glow);
}

.metric-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.metric-card__title {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  line-height: 1.4;
}

.metric-card__value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
}

.metric-card__value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Inter', 'PingFang SC', sans-serif;
  line-height: 1;
  letter-spacing: -0.03em;
}

.metric-card__unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-muted);
}

.metric-card__trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
}

.metric-card__trend--up {
  color: #22c55e;
}

.metric-card__trend--down {
  color: #ef4444;
}

.metric-card__trend-label {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 2px;
}
</style>
