export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING'

export type NotificationScenario =
  | 'AUDIT_APPROVED'
  | 'AUDIT_REJECTED'
  | 'SLA_ALERT_FIRST'
  | 'SLA_ALERT_SECOND'

export type NotificationChannel = 'WECHAT' | 'LARK'

/** 补充需求 Phase I §十一 */
export type NotificationAuditType = 'group_audit' | 'entry_audit'

export interface NotificationRow {
  id: string
  userId: number
  rightLeopardCode: string
  scenario: NotificationScenario
  channel: string
  status: NotificationStatus
  failureReason: string | null
  createdAt: string
  auditType: NotificationAuditType
}

export interface NotificationListQuery {
  page?: number
  pageSize?: number
  /** 不传或 all：全部 */
  status?: NotificationStatus | 'all' | null
  rightLeopardCode?: string | null
  scenario?: NotificationScenario | 'all' | null
  channel?: NotificationChannel | 'all' | null
  auditType?: NotificationAuditType | 'all' | null
}

export interface PaginatedNotifications {
  items: NotificationRow[]
  total: number
  page: number
  pageSize: number
}
