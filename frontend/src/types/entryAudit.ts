/** 录入审核：用户主档来源 — 后台导入 / 用户扫码录入 */
export type EntryAuditSource = 'admin_import' | 'qr_entry'

/** 与入群审核状态机对齐（Mock） */
export type EntryAuditStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

export interface EntryAuditItem {
  id: number
  /** 所属客服 */
  assignedAgentName: string
  assignedAgentId: number
  rightLeopardCode: string
  /** 右豹 ID */
  rightLeopardUserId: string
  codeScreenshotUrl: string
  idScreenshotUrl: string
  applyTime: string
  source: EntryAuditSource
  status: EntryAuditStatus
  reviewerName?: string
  reviewedAt?: string
  rejectReason?: string
  /** 供 SLA 预警 Mock 衍生行 */
  firstAlertSentAt?: string | null
  secondAlertSentAt?: string | null
}

export interface EntryAuditDetail extends EntryAuditItem {
  /** 详情扩展位，与列表一致即可 */
}

export interface EntryAuditLogItem {
  id: string
  operatedAt: string
  operatorName: string
  actionType: string
  content: string
}

export interface EntryAuditLogsPage {
  items: EntryAuditLogItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface EntryAuditQuery {
  page?: number
  pageSize?: number
  status?: EntryAuditStatus | null
  /** 所属客服名称（模糊） */
  assignedAgentName?: string | null
  rightLeopardCode?: string | null
  rightLeopardUserId?: string | null
  /** 不传或 all 表示全部来源 */
  source?: EntryAuditSource | 'all' | null
  applyTimeFrom?: string | null
  applyTimeTo?: string | null
}

export interface PaginatedEntryAudits {
  items: EntryAuditItem[]
  total: number
  page: number
  pageSize: number
  pendingTotal?: number
}
