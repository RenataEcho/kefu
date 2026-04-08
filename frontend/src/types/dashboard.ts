/**
 * Dashboard 聚合数据类型（前端消费 `GET /api/v1/dashboard/global` · `GET /api/v1/dashboard/agent`）。
 *
 * **Story 9.1（后端/Redis）在纯前端环境的约定：**
 * - 日期范围：`current_month` | `last_month` | `current_quarter` | `last_quarter` | `custom`（需 `startDate`+`endDate`）。
 * - 缓存键语义（真实后端）：`dashboard:global:{dateRange}`、`dashboard:agent:{agentId}:{dateRange}`，TTL **300s**。
 * - 写操作后失效：`del dashboard:global:*`、`del dashboard:agent:{agentId}:*`（Mock 不模拟失效，仅文档对齐）。
 * - 时区：业务口径 UTC+8（Mock 使用浏览器本地时间因子模拟不同 `dateRange`）。
 */

export type DashboardDateRangeKey =
  | 'current_month'
  | 'last_month'
  | 'current_quarter'
  | 'last_quarter'
  | 'custom'

export interface DashboardDateFilterPayload {
  dateRange: DashboardDateRangeKey
  startDate?: string
  endDate?: string
}

export interface DashboardMetrics {
  paidUserCount: number
  regularUserCount: number
  paidUserTrend: number
  regularUserTrend: number
  monthlyConnections: number
  totalAgents: number
  slaComplianceRate: number
  slaTarget: number
}

export interface SchoolOverviewItem {
  id: number
  name: string
  mentorCount: number
  studentCount: number
  totalRevenue: number
}

export interface MentorOverviewItem {
  id: number
  name: string
  schoolName: string
  studentCount: number
  /** 负责项目数（补充需求看板） */
  projectCount: number
  totalRevenue: number
  periodNewStudents: number
  lastSyncAt: string
}

export interface AgentOverviewItem {
  id: number
  name: string
  totalUsers: number
  periodNewUsers: number
  paidUserCount: number
}

export interface FunnelStep {
  label: string
  count: number
}

export interface PendingAuditItem {
  id: number
  name: string
  code: string
  status: 'timeout' | 'pending'
  timeoutDays?: number
}

export interface ApiStatusItem {
  name: string
  status: 'normal' | 'cached' | 'error'
  lastSync?: string
}

export interface AgentPersonalTrendPoint {
  /** YYYY-MM-DD */
  date: string
  count: number
}

/** 客服个人建联看板（GET /dashboard/agent） */
export interface AgentPersonalDashboardData {
  /** 本月内新增录入的主档用户数（原型 2.3 客服视图「本月」） */
  periodNewConnections: number
  /** 名下历史累计建联用户数（原型 2.3 客服视图「历史」） */
  totalHistoricalConnections: number
  /** 本期付费转化人数（有 paymentAmount 字段权限时展示） */
  periodPaymentConversions: number
  trend30d: AgentPersonalTrendPoint[]
  lastUpdatedAt: string
}

export interface DashboardGlobalData {
  metrics: DashboardMetrics
  schools: SchoolOverviewItem[]
  mentors: MentorOverviewItem[]
  agents: AgentOverviewItem[]
  funnel: FunnelStep[]
  /** 漏斗等指标聚合层 Redis 缓存 TTL（秒），Mock 固定 300 */
  funnelCacheTtlSeconds?: number
  pendingAudits: PendingAuditItem[]
  /** 录入审核待办预览（与 pendingAudits 结构一致；Mock 必返，实装可后补） */
  pendingEntryAudits?: PendingAuditItem[]
  apiStatus: ApiStatusItem[]
  lastUpdatedAt: string
}

/** Story 9.6：运营看板导出（POST /dashboard/export） */
export interface DashboardExportSheetPayload {
  name: string
  headers: string[]
  rows: (string | number | null | boolean)[][]
}

export interface DashboardExportResponse {
  fileName: string
  /** 用于 §1.9 大量导出秒数预估提示 */
  estimatedRows: number
  sheets: DashboardExportSheetPayload[]
  downloadUrl?: string
  expiresAt?: string
}
