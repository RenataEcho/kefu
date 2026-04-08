<template>
  <div ref="hostRef" class="agent-trend-chart" role="img" aria-label="近30天每日建联趋势" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { AgentPersonalTrendPoint } from '@/types/dashboard'

const props = defineProps<{
  points: AgentPersonalTrendPoint[]
}>()

const hostRef = ref<HTMLElement | null>(null)
const chartRef = shallowRef<echarts.ECharts | null>(null)
let themeObserver: MutationObserver | null = null

function themeColors() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return {
    text: light ? '#475569' : '#94a3b8',
    line: light ? '#4f46e5' : '#6366f1',
    areaFrom: light ? 'rgba(79, 70, 229, 0.22)' : 'rgba(99, 102, 241, 0.28)',
    areaTo: light ? 'rgba(79, 70, 229, 0.02)' : 'rgba(99, 102, 241, 0.02)',
    split: light ? 'rgba(99, 120, 180, 0.12)' : 'rgba(255, 255, 255, 0.08)',
    tooltipBg: light ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.92)',
    tooltipFg: light ? '#1e293b' : '#e2e8f0',
    tooltipBorder: light ? 'rgba(99, 120, 180, 0.2)' : 'rgba(255, 255, 255, 0.1)',
  }
}

function buildOption(): echarts.EChartsOption {
  const c = themeColors()
  const labels = props.points.map((p) => {
    const [, mm, dd] = p.date.split('-')
    return `${mm}/${dd}`
  })
  const vals = props.points.map((p) => p.count)

  return {
    grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipFg, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: c.split } },
      axisLabel: { color: c.text, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: c.split, type: 'dashed' } },
      axisLabel: { color: c.text, fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: vals.length <= 14,
        lineStyle: { width: 2, color: c.line },
        itemStyle: { color: c.line },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: c.areaFrom },
            { offset: 1, color: c.areaTo },
          ]),
        },
        data: vals,
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
  chartRef.value.setOption(buildOption())
  window.addEventListener('resize', resize)
  themeObserver = new MutationObserver(() => {
    chartRef.value?.setOption(buildOption(), true)
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

watch(
  () => props.points,
  () => {
    chartRef.value?.setOption(buildOption(), true)
  },
  { deep: true },
)

onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null
  window.removeEventListener('resize', resize)
  chartRef.value?.dispose()
  chartRef.value = null
})
</script>

<style scoped>
.agent-trend-chart {
  width: 100%;
  height: 200px;
  min-height: 200px;
}
</style>
