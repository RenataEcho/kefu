<template>
  <span class="sla-badge" :class="badgeClass">
    <n-icon size="13" :class="{ 'pulse-dot': status === 'overdue' }">
      <AlertCircleOutline v-if="status === 'overdue'" />
      <AlarmOutline v-else-if="status === 'warning'" />
      <TimeOutline v-else />
    </n-icon>
    <span class="sla-badge__label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon } from 'naive-ui'
import { AlertCircleOutline, AlarmOutline, TimeOutline } from '@vicons/ionicons5'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

const props = defineProps<{
  applyTime: string | Date
}>()

// SLA deadline: apply date + 3 natural days end-of-day in UTC+8 (UX-DR10 / FR25)
const getSlaDeadline = (applyTime: string | Date): dayjs.Dayjs => {
  return dayjs(applyTime)
    .tz('Asia/Shanghai')
    .add(3, 'day')
    .endOf('day')
}

const now = ref(dayjs())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    now.value = dayjs()
  }, 60_000)
})

onUnmounted(() => {
  clearInterval(timer)
})

const deadline = computed(() => getSlaDeadline(props.applyTime))

type SlaStatus = 'overdue' | 'warning' | 'pending'

const WARNING_THRESHOLD_HOURS = 2.5 * 24

const status = computed<SlaStatus>(() => {
  if (now.value.isAfter(deadline.value)) return 'overdue'
  const hoursElapsed = now.value.diff(dayjs(props.applyTime), 'hour', true)
  if (hoursElapsed >= WARNING_THRESHOLD_HOURS) return 'warning'
  return 'pending'
})

const diffMs = computed(() => {
  if (status.value === 'overdue') {
    return now.value.diff(deadline.value)
  }
  return deadline.value.diff(now.value)
})

const formatDiff = (ms: number): string => {
  const d = dayjs.duration(ms)
  const days = Math.floor(d.asDays())
  const hours = d.hours()
  const minutes = d.minutes()

  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

const label = computed(() => {
  if (status.value === 'overdue') return `已超时 ${formatDiff(diffMs.value)}`
  if (status.value === 'warning') return `即将超时 剩余 ${formatDiff(diffMs.value)}`
  return `待处理 剩余 ${formatDiff(diffMs.value)}`
})

const badgeClass = computed(() => ({
  'sla-badge--overdue': status.value === 'overdue',
  'sla-badge--warning': status.value === 'warning',
  'sla-badge--pending': status.value === 'pending',
}))
</script>

<style scoped>
.sla-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* UX 规范：危险红 #ef4444 / 警告橙 #f97316（与 AC#3、ux-design-specification 状态色表一致） */
.sla-badge--overdue {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.28);
}

.sla-badge--warning {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
  border: 1px solid rgba(249, 115, 22, 0.28);
}

.sla-badge--pending {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
  border: 1px solid rgba(249, 115, 22, 0.28);
}

.pulse-dot {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
