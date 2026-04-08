import { get, post } from '@/api/request'
import type { StartExportResponse } from '@/types/dataExport'
import type {
  GroupAuditDetail,
  GroupAuditLogsPage,
  GroupAuditQuery,
  GroupAuditStatus,
  LarkHealthResponse,
  PaginatedGroupAudits,
  PaginatedSlaAlerts,
  SlaBannerPayload,
  SyncLarkStatusResponse,
} from '@/types/groupAudit'

function buildListParams(query: GroupAuditQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
  }
  if (query.status) params.status = query.status
  if (query.applyTimeFrom) params.applyTimeFrom = query.applyTimeFrom
  if (query.applyTimeTo) params.applyTimeTo = query.applyTimeTo
  if (query.reviewerName) params.reviewerName = query.reviewerName
  if (query.pendingSla && query.pendingSla !== 'all') params.pendingSla = query.pendingSla
  if (query.rightLeopardCode?.trim()) params.rightLeopardCode = query.rightLeopardCode.trim()
  return params
}

function buildFilterBody(query: Omit<GroupAuditQuery, 'page' | 'pageSize'>): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (query.status) params.status = query.status
  if (query.applyTimeFrom) params.applyTimeFrom = query.applyTimeFrom
  if (query.applyTimeTo) params.applyTimeTo = query.applyTimeTo
  if (query.reviewerName) params.reviewerName = query.reviewerName
  if (query.pendingSla && query.pendingSla !== 'all') params.pendingSla = query.pendingSla
  if (query.rightLeopardCode?.trim()) params.rightLeopardCode = query.rightLeopardCode.trim()
  return params
}

export function fetchGroupAudits(query: GroupAuditQuery): Promise<PaginatedGroupAudits> {
  return get<PaginatedGroupAudits>('/group-audits', { params: buildListParams(query) })
}

/** POST 与 GET 等价，供复杂筛选或网关场景（Mock 对齐） */
export function postGroupAuditsQuery(query: GroupAuditQuery): Promise<PaginatedGroupAudits> {
  return post<PaginatedGroupAudits>('/group-audits', buildListParams(query) as unknown as Record<string, unknown>)
}

export function fetchLarkHealth(): Promise<LarkHealthResponse> {
  return get<LarkHealthResponse>('/group-audits/lark-health')
}

export function syncLarkGroupAuditStatus(): Promise<SyncLarkStatusResponse> {
  return post<SyncLarkStatusResponse>('/group-audits/sync-lark-status', {})
}

export function manualImportGroupAuditFallback(): Promise<{ imported: number }> {
  return post<{ imported: number }>('/group-audits/manual-import', {})
}

/** Story 7-9：异步导出（与 §1.9 轮询一致） */
export function startGroupAuditsExport(
  query: Omit<GroupAuditQuery, 'page' | 'pageSize'>,
): Promise<StartExportResponse> {
  return post<StartExportResponse>('/group-audits/export', buildFilterBody(query))
}

export function fetchGroupAuditDetail(id: number): Promise<GroupAuditDetail> {
  return get<GroupAuditDetail>(`/group-audits/${id}`)
}

export function fetchGroupAuditLogs(
  id: number,
  cursor?: string | null,
): Promise<GroupAuditLogsPage> {
  return get<GroupAuditLogsPage>(`/group-audits/${id}/audit-logs`, {
    params: { cursor: cursor || '0' },
  })
}

export function archiveGroupAudit(id: number, reason: string): Promise<null> {
  return post<null>(`/group-audits/${id}/archive`, { reason })
}

export function fetchSlaAlerts(
  page: number,
  pageSize = 20,
  auditType?: 'group_audit' | 'entry_audit' | null,
): Promise<PaginatedSlaAlerts> {
  const params: Record<string, string | number> = { page, pageSize }
  if (auditType) params.auditType = auditType
  return get<PaginatedSlaAlerts>('/group-audits/sla-alerts', { params })
}

export function fetchSlaBanner(): Promise<SlaBannerPayload> {
  return get<SlaBannerPayload>('/group-audits/sla-banner')
}

export function approveGroupAudit(id: number): Promise<null> {
  return post<null>(`/group-audits/${id}/approve`, { id })
}

export function rejectGroupAudit(id: number, reason: string): Promise<null> {
  return post<null>(`/group-audits/${id}/reject`, { id, reason })
}

export function batchApproveGroupAudits(ids: number[]): Promise<{ batchJobId: string }> {
  return post<{ batchJobId: string }>('/group-audits/batch-approve', { ids })
}

export function batchRejectGroupAudits(ids: number[], reason: string): Promise<{ batchJobId: string }> {
  return post<{ batchJobId: string }>('/group-audits/batch-reject', { ids, reason })
}

export type { GroupAuditStatus }
