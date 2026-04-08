import { get, post } from './request'
import type {
  DashboardGlobalData,
  DashboardDateRangeKey,
  AgentPersonalDashboardData,
  DashboardDateFilterPayload,
  DashboardExportResponse,
} from '@/types/dashboard'

export interface FetchGlobalDashboardParams {
  dateRange?: DashboardDateRangeKey
  startDate?: string
  endDate?: string
}

export function fetchGlobalDashboard(params: FetchGlobalDashboardParams = {}): Promise<DashboardGlobalData> {
  const dateRange = params.dateRange ?? 'current_month'
  const query: Record<string, string> = { dateRange }
  if (dateRange === 'custom' && params.startDate && params.endDate) {
    query.startDate = params.startDate
    query.endDate = params.endDate
  }
  return get<DashboardGlobalData>('/dashboard/global', { params: query })
}

export function fetchAgentPersonalDashboard(): Promise<AgentPersonalDashboardData> {
  return get<AgentPersonalDashboardData>('/dashboard/agent')
}

/** Story 9.6：全局运营看板导出（Mock 同步返回多 Sheet 数据） */
export function postDashboardExport(
  body: DashboardDateFilterPayload,
): Promise<DashboardExportResponse> {
  return post<DashboardExportResponse>('/dashboard/export', body)
}
