<template>
  <div class="date-range-filter">
    <n-radio-group :value="presetFromRoute" size="small" @update:value="onPresetChange">
      <n-radio-button value="current_month">本月</n-radio-button>
      <n-radio-button value="last_month">上月</n-radio-button>
      <n-radio-button value="current_quarter">本季度</n-radio-button>
      <n-radio-button value="last_quarter">上季度</n-radio-button>
      <n-radio-button value="custom">自定义区间</n-radio-button>
    </n-radio-group>
    <div v-if="presetFromRoute === 'custom'" class="custom-row">
      <n-date-picker
        v-model:value="pickerRange"
        type="daterange"
        clearable
        size="small"
        :actions="['clear', 'confirm']"
      />
      <n-button type="primary" size="small" :disabled="!canApplyCustom" class="apply-btn" @click="applyCustom">
        应用
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NRadioGroup, NRadioButton, NDatePicker, NButton } from 'naive-ui'
import dayjs from 'dayjs'
import type { DashboardDateFilterPayload, DashboardDateRangeKey } from '@/types/dashboard'

const VALID_PRESETS: DashboardDateRangeKey[] = [
  'current_month',
  'last_month',
  'current_quarter',
  'last_quarter',
  'custom',
]

const emit = defineEmits<{
  change: [payload: DashboardDateFilterPayload]
}>()

const route = useRoute()
const router = useRouter()

const pickerRange = ref<[number, number] | null>(null)

const presetFromRoute = computed<DashboardDateRangeKey>(() => {
  const raw = (route.query.dateRange as string) || 'current_month'
  return VALID_PRESETS.includes(raw as DashboardDateRangeKey) ? (raw as DashboardDateRangeKey) : 'current_month'
})

const canApplyCustom = computed(() => Array.isArray(pickerRange.value) && pickerRange.value.length === 2)

function syncPickerFromRoute() {
  const dr = presetFromRoute.value
  const sd = route.query.startDate as string | undefined
  const ed = route.query.endDate as string | undefined
  if (dr === 'custom' && sd && ed) {
    const start = dayjs(sd).startOf('day').valueOf()
    const end = dayjs(ed).endOf('day').valueOf()
    pickerRange.value = [start, end]
  } else if (dr !== 'custom') {
    pickerRange.value = null
  }
}

watch(
  () => [route.query.dateRange, route.query.startDate, route.query.endDate],
  () => syncPickerFromRoute(),
  { immediate: true },
)

function stripDateExtras(query: Record<string, unknown>) {
  const next = { ...query }
  delete next.startDate
  delete next.endDate
  return next
}

function onPresetChange(value: DashboardDateRangeKey) {
  if (value !== 'custom') {
    const base = stripDateExtras({ ...route.query })
    router.replace({
      query: { ...base, dateRange: value },
    })
    emit('change', { dateRange: value })
    return
  }
  const base = stripDateExtras({ ...route.query })
  router.replace({
    query: { ...base, dateRange: 'custom' },
  })
  emit('change', { dateRange: 'custom' })
}

function applyCustom() {
  if (!pickerRange.value || pickerRange.value.length !== 2) return
  const [a, b] = pickerRange.value
  const startDate = dayjs(Math.min(a, b)).format('YYYY-MM-DD')
  const endDate = dayjs(Math.max(a, b)).format('YYYY-MM-DD')
  router.replace({
    query: {
      ...route.query,
      dateRange: 'custom',
      startDate,
      endDate,
    },
  })
  emit('change', { dateRange: 'custom', startDate, endDate })
}
</script>

<style scoped>
.date-range-filter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  font-family: Inter, 'PingFang SC', system-ui, sans-serif;
}

.custom-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.apply-btn {
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

/* UX: 输入框圆角 8px；与深色玻璃拟态 token 对齐 */
.date-range-filter :deep(.n-radio-group .n-radio-button) {
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
}

.date-range-filter :deep(.n-radio-group.n-radio-group--button-group) {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0;
  padding: 4px;
  border-radius: 10px;
  background: var(--panel-bg);
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.date-range-filter :deep(.n-radio-group.n-radio-group--button-group .n-radio-button) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  margin: 0 2px;
  color: var(--text-secondary);
}

.date-range-filter :deep(.n-radio-group.n-radio-group--button-group .n-radio-button::before) {
  display: none;
}

.date-range-filter :deep(.n-radio-group.n-radio-group--button-group .n-radio-button--checked) {
  background: var(--accent-muted) !important;
  color: var(--accent-hover) !important;
  box-shadow: 0 0 0 1px var(--accent-glow) !important;
}

.date-range-filter :deep(.n-radio-group.n-radio-group--button-group .n-radio-button:not(.n-radio-button--disabled):hover) {
  color: var(--text-primary);
  background: var(--hover-bg) !important;
}

.date-range-filter :deep(.n-date-picker) {
  min-width: 260px;
}

.date-range-filter :deep(.n-input) {
  border-radius: 8px;
  font-size: 13px;
}
</style>
