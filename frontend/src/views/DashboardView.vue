<template>
  <div class="dashboard-page">
    <!-- ─── Page Header ────────────────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h1 class="page-title">{{ canViewGlobalDashboard ? '运营数据看板' : '我的建联看板' }}</h1>
          <PageRuleHelpLink />
        </div>
        <p class="page-desc">实时数据 · 最后更新 {{ lastUpdatedLabel }}</p>
      </div>
      <div v-if="canViewGlobalDashboard" class="header-right">
        <DateRangeFilter />
        <button
          v-if="hasOperationPermission('dashboard:export')"
          class="btn-primary"
          type="button"
          :disabled="exportLoading || dashboardStore.loading"
          @click="handleExportReport"
        >
          {{ exportLoading ? '导出中…' : '导出报告' }}
        </button>
      </div>
    </div>

    <!-- ─── Loading Skeleton ───────────────────────────────────── -->
    <template v-if="showGlobalSkeleton">
      <div class="metrics-grid">
        <div v-for="i in 4" :key="i" class="metric-skeleton glass-card">
          <n-skeleton text :width="80" />
          <n-skeleton text :width="120" style="height: 36px; margin-top: 12px" />
        </div>
      </div>
    </template>
    <template v-else-if="showPersonalSkeleton">
      <div class="metrics-grid metrics-grid--personal">
        <div v-for="i in personalMetricSkeletonCount" :key="i" class="metric-skeleton glass-card">
          <n-skeleton text :width="100" />
          <n-skeleton text :width="80" style="height: 36px; margin-top: 12px" />
        </div>
      </div>
      <div class="glass-panel personal-trend-skeleton">
        <n-skeleton text :width="160" style="margin-bottom: 16px" />
        <n-skeleton text style="height: 200px; border-radius: 8px" />
      </div>
    </template>

    <!-- ─── Error State ──────────────────────────────────────── -->
    <div v-else-if="canViewGlobalDashboard && dashboardStore.error" class="error-state">
      <n-result status="error" title="数据加载失败" :description="dashboardStore.error">
        <template #footer>
          <n-button type="primary" @click="dashboardStore.loadGlobalDashboard()">
            重新加载
          </n-button>
        </template>
      </n-result>
    </div>
    <div v-else-if="!canViewGlobalDashboard && dashboardStore.personalError" class="error-state">
      <n-result status="error" title="数据加载失败" :description="dashboardStore.personalError">
        <template #footer>
          <n-button type="primary" @click="dashboardStore.loadAgentPersonalDashboard()">
            重新加载
          </n-button>
        </template>
      </n-result>
    </div>

    <!-- ─── 个人建联看板（客服 / 运营主管等）──────────────────── -->
    <template v-else-if="!canViewGlobalDashboard && dashboardStore.personalData">
      <div class="metrics-grid metrics-grid--personal">
        <MetricCard
          title="本月新增建联"
          field-help-key="dashboard.metric.periodNewConnections"
          :value="dashboardStore.personalData.periodNewConnections"
        />
        <MetricCard
          title="历史累计建联"
          field-help-key="dashboard.metric.totalHistoricalConnections"
          :value="dashboardStore.personalData.totalHistoricalConnections"
        />
        <MetricCard
          v-if="hasFieldPermission('paymentAmount')"
          title="本期付费转化"
          field-help-key="dashboard.metric.periodPaymentConversions"
          :value="dashboardStore.personalData.periodPaymentConversions"
        />
      </div>
      <div class="glass-panel personal-trend-panel">
        <div class="panel-title panel-title--tight dashboard-panel-title">
          <span>近30天每日建联趋势</span>
          <FieldHelpInline catalog-key="dashboard.panel.connectionTrend30d" />
        </div>
        <AgentConnectionTrendChart :points="dashboardStore.personalData.trend30d" />
      </div>
      <p
        v-if="
          dashboardStore.personalData.periodNewConnections === 0 &&
          dashboardStore.personalData.totalHistoricalConnections === 0
        "
        class="personal-empty-hint"
      >
        数据将在用户录入后自动汇总
      </p>
    </template>

    <!-- ─── 全局运营看板（管理员 / 审核员）──────────────────────── -->
    <template v-else-if="canViewGlobalDashboard">
      <!-- Row 1: 4 Metric Cards -->
      <div class="metrics-grid">
        <MetricCard
          title="付费用户"
          field-help-key="dashboard.metric.paidUserCount"
          :value="dashboardStore.metrics.paidUserCount"
          :trend="{ value: dashboardStore.metrics.paidUserTrend, direction: 'up' }"
        />
        <MetricCard
          title="普通用户"
          field-help-key="dashboard.metric.regularUserCount"
          :value="dashboardStore.metrics.regularUserCount"
          :trend="{ value: dashboardStore.metrics.regularUserTrend, direction: 'up' }"
        />
        <MetricCard
          title="本月建联"
          field-help-key="dashboard.metric.monthlyConnections"
          :value="dashboardStore.metrics.monthlyConnections"
        >
          <div class="metric-sub">共 {{ dashboardStore.metrics.totalAgents }} 名客服</div>
        </MetricCard>
        <MetricCard
          title="SLA 达标率"
          field-help-key="dashboard.metric.slaComplianceRate"
          :value="dashboardStore.metrics.slaComplianceRate + '%'"
        >
          <template #badge>
            <span class="badge-green" style="font-size: 10px; padding: 2px 8px;">健康</span>
          </template>
          <div class="metric-sub">目标 ≥ {{ dashboardStore.metrics.slaTarget }}%</div>
        </MetricCard>
      </div>

      <!-- Row 2: Funnel + Agent Leaderboard + Sect Overview -->
      <div class="row-three-col">
        <!-- Conversion Funnel -->
        <div class="glass-panel funnel-panel">
          <div class="panel-title panel-title--dash-section dashboard-panel-title">
            <span>转化漏斗</span>
            <FieldHelpInline catalog-key="dashboard.panel.funnel" />
          </div>
          <ConversionFunnel :data="dashboardStore.funnel" />
          <p
            v-if="dashboardStore.funnelCacheTtlSeconds != null && dashboardStore.funnel.length"
            class="funnel-cache-hint"
          >
            统计数据来自服务端缓存，约每 {{ Math.round(dashboardStore.funnelCacheTtlSeconds / 60) }} 分钟刷新
          </p>
        </div>

        <!-- Agent Leaderboard -->
        <div class="glass-panel">
          <div class="panel-header">
            <div class="panel-title panel-title--dash-section dashboard-panel-title">
              <span>客服本期建联</span>
              <FieldHelpInline catalog-key="dashboard.panel.agentConnections" />
            </div>
            <span class="panel-hint">均值 {{ dashboardStore.agentAverage }}</span>
          </div>
          <div class="agent-list agent-list--balanced">
            <div v-for="agent in topAgents" :key="agent.id" class="agent-row">
              <div class="avatar" :class="{ 'avatar--warn': agent.periodNewUsers < dashboardStore.agentAverage }">
                {{ agent.name.charAt(agent.name.length - 1) }}
              </div>
              <div class="agent-info">
                <div class="agent-info-header">
                  <span class="agent-name">{{ agent.name }}</span>
                  <span class="agent-count" :class="{
                    'agent-count--top': agent.periodNewUsers >= dashboardStore.agentAverage * 1.1,
                    'agent-count--warn': agent.periodNewUsers < dashboardStore.agentAverage,
                  }">
                    {{ agent.periodNewUsers }}
                    <span v-if="agent.periodNewUsers < dashboardStore.agentAverage" class="agent-below">↓低于均值</span>
                  </span>
                </div>
                <div class="bar-track bar-track--sm">
                  <div
                    class="bar-fill"
                    :class="{ 'bar-fill--orange': agent.periodNewUsers < dashboardStore.agentAverage }"
                    :style="{ width: Math.min(100, agent.periodNewUsers) + '%' }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sect Overview -->
        <div class="glass-panel">
          <div class="panel-header">
            <div class="panel-title panel-title--dash-section dashboard-panel-title">
              <span>门派概览</span>
              <FieldHelpInline catalog-key="dashboard.panel.schoolOverview" />
            </div>
            <button type="button" class="btn-ghost" @click="goSectManagement">查看更多</button>
          </div>
          <div class="sect-list sect-list--balanced">
            <div
              v-for="school in dashboardStore.schools.slice(0, 5)"
              :key="school.id"
              class="sect-card sect-card--click"
              role="button"
              tabindex="0"
              @click="goSchoolDetail(school.id)"
              @keydown.enter="goSchoolDetail(school.id)"
            >
              <div class="sect-card-header">
                <span class="sect-name">{{ school.name }}</span>
                <span class="sect-hint">{{ school.mentorCount }} 位导师</span>
              </div>
              <div class="sect-card-body">
                <span class="sect-stat">学员 <b>{{ school.studentCount }}</b></span>
                <span class="sect-revenue">¥ {{ school.totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 0 }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mentor Overview（补充需求） -->
        <div class="glass-panel">
          <div class="panel-header">
            <div class="panel-title panel-title--dash-section dashboard-panel-title">
              <span>导师概览</span>
              <FieldHelpInline catalog-key="dashboard.panel.mentorOverview" />
            </div>
            <button type="button" class="btn-ghost" @click="goMentorManagement">查看更多</button>
          </div>
          <div class="sect-list sect-list--balanced">
            <div
              v-for="m in dashboardStore.mentors.slice(0, 5)"
              :key="m.id"
              class="sect-card sect-card--click"
              role="button"
              tabindex="0"
              @click="goMentorDetail(m.id)"
              @keydown.enter="goMentorDetail(m.id)"
            >
              <div class="sect-card-header">
                <span class="sect-name">{{ m.name }}</span>
                <span class="sect-hint">{{ m.schoolName }}</span>
              </div>
              <div class="sect-card-body">
                <span class="sect-stat">学员 <b>{{ m.studentCount }}</b> · 项目 <b>{{ m.projectCount }}</b></span>
                <span class="sect-revenue">¥ {{ m.totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 0 }) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 3: 飞书入群审核 + 录入审核 + API -->
      <div class="row-bottom-three">
        <!-- 飞书入群审核 -->
        <div class="glass-panel">
          <div class="panel-header">
            <div class="panel-title">飞书入群审核</div>
            <button type="button" class="btn-ghost" @click="$router.push({ name: 'GroupAudits' })">
              查看全部
            </button>
          </div>
          <div class="audit-list audit-list--balanced">
            <div
              v-for="item in dashboardStore.pendingAudits"
              :key="item.id"
              class="audit-row"
              :class="{ 'audit-row--timeout': item.status === 'timeout' }"
            >
              <div class="audit-row-left">
                <div class="avatar avatar--sm" :class="{ 'avatar--danger': item.status === 'timeout' }">
                  {{ item.name.charAt(0) }}
                </div>
                <div class="audit-info">
                  <div class="audit-name">{{ item.name }}</div>
                  <div class="audit-code mono">{{ item.code }}</div>
                </div>
              </div>
              <div class="audit-row-right">
                <span v-if="item.status === 'timeout'" class="badge-red">
                  超时{{ item.timeoutDays ? ` ${item.timeoutDays}天` : '' }}
                </span>
                <span v-else class="badge-orange">待审核</span>
                <button type="button" class="btn-primary btn-primary--sm">通过</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 录入审核看板 -->
        <div class="glass-panel">
          <div class="panel-header">
            <div class="panel-title">录入审核看板</div>
            <button type="button" class="btn-ghost" @click="$router.push({ name: 'EntryAudits' })">
              查看全部
            </button>
          </div>
          <div class="audit-list audit-list--balanced">
            <div
              v-for="item in dashboardStore.pendingEntryAudits"
              :key="item.id"
              class="audit-row"
              :class="{ 'audit-row--timeout': item.status === 'timeout' }"
            >
              <div class="audit-row-left">
                <div class="avatar avatar--sm" :class="{ 'avatar--danger': item.status === 'timeout' }">
                  {{ item.name.charAt(0) }}
                </div>
                <div class="audit-info">
                  <div class="audit-name">{{ item.name }}</div>
                  <div class="audit-code mono">{{ item.code }}</div>
                </div>
              </div>
              <div class="audit-row-right">
                <span v-if="item.status === 'timeout'" class="badge-red">
                  超时{{ item.timeoutDays ? ` ${item.timeoutDays}天` : '' }}
                </span>
                <span v-else class="badge-orange">待审核</span>
                <button type="button" class="btn-primary btn-primary--sm">通过</button>
              </div>
            </div>
          </div>
        </div>

        <!-- API Status -->
        <div class="glass-panel">
          <div class="panel-title">API 连接状态</div>
          <div class="api-list">
            <div
              v-for="api in dashboardStore.apiStatus"
              :key="api.name"
              class="api-row"
              :class="{ 'api-row--warn': api.status === 'cached' }"
            >
              <span class="api-name">{{ api.name }}</span>
              <span
                class="api-badge"
                :class="{
                  'badge-green': api.status === 'normal',
                  'badge-orange': api.status === 'cached',
                  'badge-red': api.status === 'error',
                }"
              >
                {{ api.status === 'normal' ? '正常' : api.status === 'cached' ? '缓存数据' : '异常' }}
              </span>
            </div>
          </div>
          <div class="api-footer">
            第三方导师系统使用缓存数据，最后同步 <b>2小时前</b>。<span class="api-refresh">手动刷新</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSkeleton, NResult, NButton, useMessage } from 'naive-ui'
import MetricCard from '@/components/business/MetricCard.vue'
import FieldHelpInline from '@/components/common/FieldHelpInline.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import ConversionFunnel from '@/components/business/ConversionFunnel.vue'
import AgentConnectionTrendChart from '@/components/business/AgentConnectionTrendChart.vue'
import DateRangeFilter from '@/components/common/DateRangeFilter.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { usePermission } from '@/composables/usePermission'
import { fromNow } from '@/utils/date'
import { postDashboardExport } from '@/api/dashboard'
import { downloadMultiSheetXlsx } from '@/utils/dataExportXlsx'

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()
const message = useMessage()
const { canViewGlobalDashboard, hasFieldPermission, hasOperationPermission } = usePermission()

const exportLoading = ref(false)

const lastUpdatedLabel = computed(() => {
  if (canViewGlobalDashboard.value) {
    return dashboardStore.lastUpdatedAt ? fromNow(dashboardStore.lastUpdatedAt) : '--'
  }
  const t = dashboardStore.personalData?.lastUpdatedAt
  return t ? fromNow(t) : '--'
})

watch(
  () =>
    [
      canViewGlobalDashboard.value,
      route.query.dateRange,
      route.query.startDate,
      route.query.endDate,
    ] as const,
  ([global]) => {
    if (!global) return
    dashboardStore.syncDateFilterFromRoute(route.query)
    void dashboardStore.loadGlobalDashboard()
  },
  { immediate: true },
)

watch(
  canViewGlobalDashboard,
  (global) => {
    if (global) return
    void dashboardStore.loadAgentPersonalDashboard()
  },
  { immediate: true },
)

const topAgents = computed(() => dashboardStore.agents.slice(0, 5))

function goSectManagement() {
  router.push({ name: 'SectManagement' })
}

function goMentorManagement() {
  router.push({ name: 'MentorManagement' })
}

function goSchoolDetail(id: number) {
  router.push({ name: 'SchoolDetail', params: { id: String(id) } })
}

function goMentorDetail(id: number) {
  router.push({ name: 'MentorDetail', params: { id: String(id) } })
}

/** 个人看板指标卡：本月 + 历史 + 可选付费 */
const personalMetricSkeletonCount = computed(() => 2 + (hasFieldPermission('paymentAmount') ? 1 : 0))

const showGlobalSkeleton = computed(
  () => canViewGlobalDashboard.value && dashboardStore.loading && !dashboardStore.hasData,
)

const showPersonalSkeleton = computed(
  () =>
    !canViewGlobalDashboard.value &&
    dashboardStore.personalLoading &&
    !dashboardStore.personalLoaded,
)

async function handleExportReport() {
  if (dashboardStore.dateRange === 'custom') {
    if (!dashboardStore.customStartDate || !dashboardStore.customEndDate) {
      message.warning('请先选择自定义日期范围')
      return
    }
  }
  exportLoading.value = true
  try {
    const body = {
      dateRange: dashboardStore.dateRange,
      startDate: dashboardStore.customStartDate,
      endDate: dashboardStore.customEndDate,
    }
    message.info('正在生成导出文件，完成后将自动下载')
    const data = await postDashboardExport(body)
    if (data.estimatedRows > 1000) {
      const sec = Math.max(8, Math.ceil(data.estimatedRows / 120))
      message.info(`导出数量较多，预计需要 ${sec} 秒，请稍候`)
    }
    downloadMultiSheetXlsx(
      data.fileName,
      data.sheets.map((s) => ({ name: s.name, headers: s.headers, rows: s.rows })),
    )
    message.success(
      `导出完成。${data.downloadUrl ? `下载链接 ${data.downloadUrl}（Mock）；` : ''}正式环境链接 ${data.expiresAt ? `有效期至 ${data.expiresAt.slice(0, 10)}` : '24h 内有效'}。`,
    )
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导出失败')
  } finally {
    exportLoading.value = false
  }
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ─── Page Header ──────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.page-desc {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-primary:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px var(--accent-glow);
}
.btn-primary--sm {
  font-size: 11px;
  padding: 5px 12px;
}

.btn-ghost {
  background: var(--panel-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ghost:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

/* ─── Metrics Grid (4 cards) ──────────────────────────── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

@media (max-width: 1024px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}

.metrics-grid--personal {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  max-width: 720px;
}

.personal-trend-panel {
  margin-top: 4px;
}

.panel-title--tight {
  margin-bottom: 12px;
}

.personal-trend-skeleton {
  margin-top: 4px;
}

.personal-empty-hint {
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.metric-skeleton {
  border-radius: 14px;
  padding: 20px 24px;
  min-height: 100px;
}

.metric-sub {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ─── Error State ──────────────────────────────────────── */
.error-state {
  border-radius: 14px;
  padding: 48px 24px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
}

/* ─── Glass Panel ──────────────────────────────────────── */
.glass-panel {
  background: var(--panel-bg);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 20px;
  transition: background 0.35s, border-color 0.35s;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* 第二行玻璃面板标题：对齐 ux-design-directions.html 13px / 600 */
.panel-title--dash-section {
  font-size: 13px;
  font-weight: 600;
}

.panel-header .panel-title { margin-bottom: 0; }

.dashboard-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.panel-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* ─── Row Layouts ──────────────────────────────────────── */
.row-three-col {
  display: grid;
  grid-template-columns: 1fr 1.25fr 1fr 1fr;
  gap: 14px;
}

.row-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.row-bottom-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  align-items: stretch;
}

.row-bottom-three > .glass-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.row-bottom-three > .glass-panel .audit-list--balanced {
  flex: 1;
}

@media (max-width: 1280px) {
  .row-three-col {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 1024px) {
  .row-three-col, .row-two-col, .row-bottom-three { grid-template-columns: 1fr; }
}

.funnel-panel {
  min-width: 0;
}

.sect-card--click {
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;
}

.sect-card--click:hover {
  transform: translateY(-1px);
  border-color: var(--accent-muted);
}

.bar-track {
  height: 6px;
  border-radius: 999px;
  background: var(--bar-track-bg);
  overflow: hidden;
}

.bar-track--sm { height: 4px; }

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  transition: width 0.5s ease;
}

.bar-fill--orange {
  background: linear-gradient(90deg, #f97316, #fb923c);
}

.funnel-cache-hint {
  margin: 12px 0 0;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.4;
}

.mono { font-family: 'JetBrains Mono', monospace; }

/* ─── Agent Leaderboard ────────────────────────────────── */
.agent-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.agent-list--balanced {
  min-height: 260px;
  gap: 8px;
}

.agent-list--balanced .agent-row {
  flex: 1 1 0;
  min-height: 0;
}

.agent-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--avatar-bg);
  color: var(--avatar-color);
  border: 1px solid var(--border-default);
  transition: background 0.35s, color 0.35s, border-color 0.35s;
}

.avatar--sm {
  width: 28px;
  height: 28px;
  font-size: 11px;
  border-radius: 8px;
}

.avatar--warn {
  color: var(--status-warning);
  background: rgba(249, 115, 22, 0.12);
}

.avatar--danger {
  color: var(--status-error);
  background: rgba(239, 68, 68, 0.1);
}

.agent-info { flex: 1; }

.agent-info-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.agent-name { color: var(--text-secondary); }

.agent-count {
  color: var(--text-primary);
  font-weight: 600;
}

.agent-count--top { color: var(--status-success); }
.agent-count--warn { color: var(--status-warning); }

.agent-below {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 4px;
}

/* ─── Sect Overview ────────────────────────────────────── */
.sect-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sect-list--balanced {
  min-height: 260px;
  gap: 8px;
}

.sect-list--balanced .sect-card {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.sect-card {
  background: var(--card-inner-bg);
  border-radius: 10px;
  padding: 12px 14px;
  transition: background 0.35s;
}

.sect-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.sect-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.sect-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.sect-card-body {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.sect-stat { color: var(--text-muted); }
.sect-stat b { color: var(--text-primary); }

.sect-revenue {
  color: var(--status-success);
  font-weight: 500;
}

/* ─── Pending Audits ───────────────────────────────────── */
.audit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audit-list--balanced {
  min-height: 200px;
  flex: 1;
  gap: 8px;
}

.audit-list--balanced .audit-row {
  flex: 1 1 0;
  min-height: 0;
}

.audit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  transition: background 0.35s, border-color 0.35s;
}

.audit-row--timeout {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.15);
}

.audit-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.audit-info {
  display: flex;
  flex-direction: column;
}

.audit-name {
  font-size: 13px;
  color: var(--text-primary);
}

.audit-code {
  font-size: 11px;
  color: var(--text-muted);
}

.audit-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ─── API Status ───────────────────────────────────────── */
.api-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--card-inner-bg);
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  transition: background 0.35s, border-color 0.35s;
}

.api-row--warn {
  background: rgba(249, 115, 22, 0.06);
  border-color: rgba(249, 115, 22, 0.2);
}

.api-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.api-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 99px;
}

.api-footer {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.api-footer b { color: var(--text-secondary); }

.api-refresh {
  color: var(--accent-hover);
  cursor: pointer;
  margin-left: 2px;
}
.api-refresh:hover { text-decoration: underline; }

/* ─── Badge overrides (scoped, use CSS vars) ─────────── */
.badge-red {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 500;
  color: var(--badge-red);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.badge-orange {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 500;
  color: var(--badge-orange);
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.badge-green {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 500;
  color: var(--badge-green);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
</style>
