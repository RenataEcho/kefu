export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'AUDIT_APPROVE'
  | 'AUDIT_REJECT'
  | 'ARCHIVE'
  | 'IMPORT'
  | 'EXPORT'

export interface AuditLogItem {
  id: string
  operatedAt: string
  operatorName: string
  tableName: string
  actionType: AuditActionType
  recordId: string
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
}

export interface PaginatedAuditLogs {
  list: AuditLogItem[]
  total: number
  page: number
  pageSize: number
}

export interface AuditLogListQuery {
  page: number
  pageSize: number
  tableName?: string
  recordId?: string | number
  actionType?: string
  startDate?: string
  endDate?: string
}
