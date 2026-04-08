import { get } from '@/api/request'
import type { AuditLogItem, AuditLogListQuery, PaginatedAuditLogs } from '@/types/auditLog'

export function fetchAuditLogs(query: AuditLogListQuery): Promise<PaginatedAuditLogs> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: query.pageSize,
  }
  if (query.tableName) params.tableName = query.tableName
  if (query.recordId != null && query.recordId !== '') params.recordId = String(query.recordId)
  if (query.actionType) params.actionType = query.actionType
  if (query.startDate) params.startDate = query.startDate
  if (query.endDate) params.endDate = query.endDate
  return get<PaginatedAuditLogs>('/audit-logs', { params })
}

export function fetchAuditLogDetail(id: string): Promise<AuditLogItem> {
  return get<AuditLogItem>(`/audit-logs/${id}`)
}
