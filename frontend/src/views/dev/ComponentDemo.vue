<template>
  <div class="demo-page">
    <div class="demo-page__header">
      <h1 class="demo-page__title">业务组件库预览</h1>
      <p class="demo-page__subtitle">Story 2.6 · 仅在开发模式下可见</p>
    </div>

    <!-- ① CodeVerifyInput -->
    <section class="demo-section">
      <h2 class="demo-section__title">① CodeVerifyInput — 编码校验输入框</h2>
      <div class="demo-grid">
        <div class="demo-card">
          <p class="demo-card__label">空值（idle 状态）</p>
          <CodeVerifyInput v-model="code1" :on-verify="mockVerify" />
        </div>
        <div class="demo-card">
          <p class="demo-card__label">校验通过（valid）— 输入任意内容后失焦</p>
          <CodeVerifyInput v-model="code2" :on-verify="mockVerifySuccess" />
        </div>
        <div class="demo-card">
          <p class="demo-card__label">校验失败（invalid）— 输入任意内容后失焦</p>
          <CodeVerifyInput v-model="code3" :on-verify="mockVerifyFail" />
        </div>
      </div>
    </section>

    <!-- ② MetricCard -->
    <section class="demo-section">
      <h2 class="demo-section__title">② MetricCard — 玻璃拟态指标卡片</h2>
      <div class="demo-grid demo-grid--4col">
        <MetricCard title="本月新增用户" :value="1284" unit="人" :trend="{ value: 12.5, direction: 'up' }" />
        <MetricCard title="入群申请总数" :value="876" unit="条" :trend="{ value: 3.2, direction: 'down' }" />
        <MetricCard title="审核通过率" value="94.3%" :trend="{ value: 2.1, direction: 'up' }" />
        <MetricCard title="SLA 超时率" value="1.8%" />
      </div>
    </section>

    <!-- ③ SlaStatusBadge -->
    <section class="demo-section">
      <h2 class="demo-section__title">③ SlaStatusBadge — SLA 状态徽标</h2>
      <div class="demo-grid">
        <div class="demo-card">
          <p class="demo-card__label">已超时（7 天前提交）</p>
          <SlaStatusBadge :apply-time="overdueTime" />
        </div>
        <div class="demo-card">
          <p class="demo-card__label">待处理（1 天前提交）</p>
          <SlaStatusBadge :apply-time="recentTime" />
        </div>
        <div class="demo-card">
          <p class="demo-card__label">待处理（今天提交）</p>
          <SlaStatusBadge :apply-time="todayTime" />
        </div>
      </div>
    </section>

    <!-- ④ ApiStatusBar -->
    <section class="demo-section">
      <h2 class="demo-section__title">④ ApiStatusBar — API 降级状态条</h2>
      <div class="demo-card" style="padding: 0; overflow: hidden; border-radius: 8px;">
        <ApiStatusBar
          :degraded="apiDegraded"
          message="右豹API服务暂时不可用，编码校验功能降级，管理员可选择跳过校验"
        />
        <div style="padding: 16px; display: flex; align-items: center; gap: 12px;">
          <n-switch v-model:value="apiDegraded" />
          <span style="color: #94a3b8; font-size: 13px;">
            {{ apiDegraded ? '降级状态（显示状态条）' : '正常状态（v-if 不渲染 DOM）' }}
          </span>
        </div>
      </div>
    </section>

    <!-- ⑤ InfoTooltip -->
    <section class="demo-section">
      <h2 class="demo-section__title">⑤ InfoTooltip — 字段说明（玻璃拟态）</h2>
      <div class="demo-card" style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #e2e8f0; font-size: 14px;">付费对接人</span>
        <InfoTooltip title="字段规则">
          <p>选项来自客服管理中「客服类型 = 付费客服」的账号，去重展示。</p>
          <p>若列表为空，请先在客服管理维护付费客服。</p>
        </InfoTooltip>
      </div>
    </section>

    <!-- ⑥ ConversionFunnel -->
    <section class="demo-section">
      <h2 class="demo-section__title">⑥ ConversionFunnel — 转化漏斗图</h2>
      <div class="demo-card" style="max-width: 360px;">
        <ConversionFunnel :data="funnelData" />
      </div>
      <p class="demo-caption">边界（全 0）</p>
      <div class="demo-card" style="max-width: 360px;">
        <ConversionFunnel :data="funnelDataZero" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NSwitch } from 'naive-ui'
import CodeVerifyInput from '@/components/business/CodeVerifyInput.vue'
import MetricCard from '@/components/business/MetricCard.vue'
import SlaStatusBadge from '@/components/business/SlaStatusBadge.vue'
import ApiStatusBar from '@/components/business/ApiStatusBar.vue'
import ConversionFunnel from '@/components/business/ConversionFunnel.vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import dayjs from 'dayjs'

const code1 = ref('')
const code2 = ref('YB-10001')
const code3 = ref('YB-99999')

const apiDegraded = ref(false)

const overdueTime = dayjs().subtract(7, 'day').toISOString()
const recentTime = dayjs().subtract(1, 'day').toISOString()
const todayTime = dayjs().subtract(2, 'hour').toISOString()

const funnelData = [
  { label: '录入', count: 1284 },
  { label: '入群', count: 876 },
  { label: '付费', count: 321 },
]

const funnelDataZero = [
  { label: '录入', count: 0 },
  { label: '入群', count: 0 },
  { label: '付费', count: 0 },
]

const mockVerify = async (code: string): Promise<{ valid: boolean; message?: string }> => {
  await new Promise((r) => setTimeout(r, 800))
  return code.startsWith('YB-') ? { valid: true } : { valid: false, message: '编码不存在，请检查是否输入正确' }
}

const mockVerifySuccess = async (_code: string): Promise<{ valid: boolean }> => {
  await new Promise((r) => setTimeout(r, 600))
  return { valid: true }
}

const mockVerifyFail = async (_code: string): Promise<{ valid: boolean; message: string }> => {
  await new Promise((r) => setTimeout(r, 600))
  return { valid: false, message: '该编码已被其他用户占用' }
}
</script>

<style scoped>
.demo-page {
  min-height: 100vh;
  background: #0f172a;
  padding: 32px;
  font-family: 'Inter', 'PingFang SC', sans-serif;
}

.demo-page__header {
  margin-bottom: 40px;
}

.demo-page__title {
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 8px;
}

.demo-page__subtitle {
  font-size: 14px;
  color: #475569;
  margin: 0;
}

.demo-section {
  margin-bottom: 48px;
}

.demo-section__title {
  font-size: 16px;
  font-weight: 600;
  color: #94a3b8;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.demo-grid--4col {
  grid-template-columns: repeat(4, 1fr);
}

.demo-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
}

.demo-caption {
  margin: 12px 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.demo-card__label {
  font-size: 12px;
  color: #475569;
  margin: 0 0 12px;
}
</style>
