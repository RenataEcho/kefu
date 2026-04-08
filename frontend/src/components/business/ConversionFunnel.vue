<template>
  <div class="conversion-funnel">
    <template v-if="showEmptyHint">
      <div class="funnel-empty" role="status">
        {{ emptyMessage }}
      </div>
    </template>
    <div v-else ref="hostRef" class="funnel-chart-host" role="img" aria-label="转化漏斗" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import * as echarts from 'echarts'

export interface FunnelStepInput {
  label: string
  count: number
}

const props = withDefaults(
  defineProps<{
    data: FunnelStepInput[]
    emptyMessage?: string
  }>(),
  {
    emptyMessage: '数据将在用户录入后自动汇总',
  },
)

const hostRef = ref<HTMLElement | null>(null)
const chartRef = shallowRef<echarts.ECharts | null>(null)
let themeObserver: MutationObserver | null = null

const showEmptyHint = computed(() => props.data.length === 0)

function conversionRateLabel(current: number, previous: number): string {
  if (previous === 0) return '0%'
  return `${((current / previous) * 100).toFixed(1)}%`
}

function themePalette() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return {
    text: light ? '#475569' : '#94a3b8',
    tooltipBg: light ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.92)',
    tooltipFg: light ? '#1e293b' : '#e2e8f0',
    tooltipBorder: light ? 'rgba(99, 120, 180, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    colors: light
      ? ['#4f46e5', '#6366f1', '#16a34a']
      : ['#6366f1', '#818cf8', '#22c55e'],
  }
}

function buildOption(): echarts.EChartsOption {
  const pal = themePalette()
  const steps = props.data
  const first = steps[0]?.count ?? 1

  const seriesData = steps.map((step, index) => {
    const prev = index === 0 ? null : steps[index - 1]!.count
    const rate =
      index === 0 ? '首步基准 100%' : `较上一步 ${conversionRateLabel(step.count, prev!)}`
    const pctOfFirst = first > 0 ? ((step.count / first) * 100).toFixed(1) : '0'
    return {
      name: step.label,
      value: step.count,
      rate,
      pctOfFirst,
    }
  })

  return {
    color: pal.colors,
    tooltip: {
      trigger: 'item',
      backgroundColor: pal.tooltipBg,
      borderColor: pal.tooltipBorder,
      textStyle: { color: pal.tooltipFg, fontSize: 12 },
      formatter: (p: unknown) => {
        const params = p as {
          name: string
          value: number
          data?: { rate?: string; pctOfFirst?: string }
        }
        const rate = params.data?.rate ?? ''
        const pct = params.data?.pctOfFirst ?? ''
        return `<div style="font-weight:600;margin-bottom:4px">${params.name}</div>数量：${params.value.toLocaleString('zh-CN')}<br/>占首步：${pct}%<br/>${rate}`
      },
    },
    series: [
      {
        name: '转化漏斗',
        type: 'funnel',
        left: '8%',
        width: '72%',
        top: 10,
        bottom: 10,
        minSize: '14%',
        maxSize: '100%',
        sort: 'descending',
        gap: 8,
        label: {
          show: true,
          position: 'inside',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 18,
          formatter: (p: { name: string; value: number }) =>
            `${p.name}\n${p.value.toLocaleString('zh-CN')}`,
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.25)' },
        },
        data: seriesData,
      },
    ],
  }
}

function resize() {
  chartRef.value?.resize()
}

onMounted(() => {
  const el = hostRef.value
  if (!el) return
  chartRef.value = echarts.init(el, undefined, { renderer: 'canvas' })
  if (!showEmptyHint.value) {
    chartRef.value.setOption(buildOption())
  }
  window.addEventListener('resize', resize)
  themeObserver = new MutationObserver(() => {
    if (!showEmptyHint.value) {
      chartRef.value?.setOption(buildOption(), true)
    }
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

watch(
  () => props.data,
  () => {
    if (showEmptyHint.value) {
      chartRef.value?.clear()
      return
    }
    if (!chartRef.value && hostRef.value) {
      chartRef.value = echarts.init(hostRef.value, undefined, { renderer: 'canvas' })
    }
    chartRef.value?.setOption(buildOption(), true)
  },
  { deep: true },
)

watch(showEmptyHint, (empty) => {
  if (empty) {
    chartRef.value?.clear()
  } else {
    if (!chartRef.value && hostRef.value) {
      chartRef.value = echarts.init(hostRef.value, undefined, { renderer: 'canvas' })
    }
    chartRef.value?.setOption(buildOption(), true)
  }
})

onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null
  window.removeEventListener('resize', resize)
  chartRef.value?.dispose()
  chartRef.value = null
})
</script>

<style scoped>
.conversion-funnel {
  width: 100%;
}

.funnel-empty {
  padding: var(--spacing-md) var(--spacing-sm);
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.5;
}

.funnel-chart-host {
  width: 100%;
  height: 260px;
  min-height: 260px;
}
</style>
