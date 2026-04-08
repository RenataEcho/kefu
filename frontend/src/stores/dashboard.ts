import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LocationQuery } from 'vue-router'
import { fetchGlobalDashboard, fetchAgentPersonalDashboard } from '@/api/dashboard'
import type {
  DashboardGlobalData,
  DashboardMetrics,
  SchoolOverviewItem,
  MentorOverviewItem,
  AgentOverviewItem,
  FunnelStep,
  PendingAuditItem,
  ApiStatusItem,
  DashboardDateRangeKey,
  AgentPersonalDashboardData,
} from '@/types/dashboard'

const VALID_RANGE: DashboardDateRangeKey[] = [
  'current_month',
  'last_month',
  'current_quarter',
  'last_quarter',
  'custom',
]

function parseDateFilterFromQuery(query: LocationQuery) {
  const raw = (query.dateRange as string) || 'current_month'
  const dateRange = VALID_RANGE.includes(raw as DashboardDateRangeKey)
    ? (raw as DashboardDateRangeKey)
    : 'current_month'
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  return { dateRange, startDate, endDate }
}

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dateRange = ref<DashboardDateRangeKey>('current_month')
  const customStartDate = ref<string | undefined>()
  const customEndDate = ref<string | undefined>()

  const metrics = ref<DashboardMetrics>({
    paidUserCount: 0,
    regularUserCount: 0,
    paidUserTrend: 0,
    regularUserTrend: 0,
    monthlyConnections: 0,
    totalAgents: 0,
    slaComplianceRate: 0,
    slaTarget: 95,
  })
  const schools = ref<SchoolOverviewItem[]>([])
  const mentors = ref<MentorOverviewItem[]>([])
  const agents = ref<AgentOverviewItem[]>([])
  const funnel = ref<FunnelStep[]>([])
  const funnelCacheTtlSeconds = ref<number | undefined>()
  const pendingAudits = ref<PendingAuditItem[]>([])
  const pendingEntryAudits = ref<PendingAuditItem[]>([])
  const apiStatus = ref<ApiStatusItem[]>([])
  const lastUpdatedAt = ref<string>('')

  const personalLoading = ref(false)
  const personalError = ref<string | null>(null)
  const personalLoaded = ref(false)
  const personalData = ref<AgentPersonalDashboardData | null>(null)

  const hasData = computed(() => schools.value.length > 0 || mentors.value.length > 0)

  const agentAverage = computed(() => {
    if (agents.value.length === 0) return 0
    return Math.round(agents.value.reduce((s, a) => s + a.periodNewUsers, 0) / agents.value.length)
  })

  function syncDateFilterFromRoute(query: LocationQuery) {
    const parsed = parseDateFilterFromQuery(query)
    dateRange.value = parsed.dateRange
    customStartDate.value = parsed.startDate
    customEndDate.value = parsed.endDate
  }

  async function loadGlobalDashboard() {
    if (dateRange.value === 'custom' && (!customStartDate.value || !customEndDate.value)) {
      return
    }

    loading.value = true
    error.value = null
    try {
      const data: DashboardGlobalData = await fetchGlobalDashboard({
        dateRange: dateRange.value,
        startDate: customStartDate.value,
        endDate: customEndDate.value,
      })
      metrics.value = data.metrics
      schools.value = data.schools
      mentors.value = data.mentors
      agents.value = data.agents
      funnel.value = data.funnel
      funnelCacheTtlSeconds.value = data.funnelCacheTtlSeconds
      pendingAudits.value = data.pendingAudits
      pendingEntryAudits.value = data.pendingEntryAudits ?? []
      apiStatus.value = data.apiStatus
      lastUpdatedAt.value = data.lastUpdatedAt
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '加载数据失败'
    } finally {
      loading.value = false
    }
  }

  async function loadAgentPersonalDashboard() {
    personalLoading.value = true
    personalError.value = null
    try {
      personalData.value = await fetchAgentPersonalDashboard()
      personalLoaded.value = true
    } catch (e: unknown) {
      personalError.value = e instanceof Error ? e.message : '加载数据失败'
    } finally {
      personalLoading.value = false
    }
  }

  return {
    loading,
    error,
    dateRange,
    customStartDate,
    customEndDate,
    metrics,
    schools,
    mentors,
    agents,
    funnel,
    funnelCacheTtlSeconds,
    pendingAudits,
    pendingEntryAudits,
    apiStatus,
    lastUpdatedAt,
    personalLoading,
    personalError,
    personalLoaded,
    personalData,
    hasData,
    agentAverage,
    syncDateFilterFromRoute,
    loadGlobalDashboard,
    loadAgentPersonalDashboard,
  }
})
