import { get, post } from '@/api/request'
import type {
  EntryAuditDetail,
  EntryAuditLogsPage,
  EntryAuditQuery,
  PaginatedEntryAudits,
} from '@/types/entryAudit'

function buildListParams(query: EntryAuditQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  }
  if (query.status) params.status = query.status
  if (query.assignedAgentName?.trim()) params.assignedAgentName = query.assignedAgentName.trim()
  if (query.rightLeopardCode?.trim()) params.rightLeopardCode = query.rightLeopardCode.trim()
  if (query.rightLeopardUserId?.trim()) params.rightLeopardUserId = query.rightLeopardUserId.trim()
  if (query.source && query.source !== 'all') params.source = query.source
  if (query.applyTimeFrom) params.applyTimeFrom = query.applyTimeFrom
  if (query.applyTimeTo) params.applyTimeTo = query.applyTimeTo
  return params
}

export function fetchEntryAudits(query: EntryAuditQuery): Promise<PaginatedEntryAudits> {
  return get<PaginatedEntryAudits>('/entry-audits', { params: buildListParams(query) })
}

export function postEntryAuditsQuery(query: EntryAuditQuery): Promise<PaginatedEntryAudits> {
  return post<PaginatedEntryAudits>(
    '/entry-audits',
    buildListParams(query) as unknown as Record<string, unknown>,
  )
}

export function fetchEntryAuditDetail(id: number): Promise<EntryAuditDetail> {
  return get<EntryAuditDetail>(`/entry-audits/${id}`)
}

export function fetchEntryAuditLogs(
  id: number,
  cursor?: string | null,
): Promise<EntryAuditLogsPage> {
  return get<EntryAuditLogsPage>(`/entry-audits/${id}/audit-logs`, {
    params: { cursor: cursor || '0' },
  })
}

export function approveEntryAudit(id: number): Promise<null> {
  return post<null>(`/entry-audits/${id}/approve`, { id })
}

export function rejectEntryAudit(id: number, reason: string): Promise<null> {
  return post<null>(`/entry-audits/${id}/reject`, { id, reason })
}
