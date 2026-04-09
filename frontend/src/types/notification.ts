export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING'

export type NotificationScenario =
  | 'AUDIT_APPROVED'
  | 'AUDIT_REJECTED'
  | 'SLA_ALERT_FIRST'
  | 'SLA_ALERT_SECOND'

export type NotificationChannel = 'WECHAT' | 'LARK'

/** 补充需求 Phase I §十一 */
export type NotificationAuditType = 'group_audit' | 'entry_audit'

/** 推送接收方：用户侧或客服侧 */
export type NotificationRecipientType = 'user' | 'agent'

export interface NotificationRow {
  id: string
  userId: number
  rightLeopardCode: string
  /** 接收人类型；为客服时 recipientName 为客服名称 */
  recipientType: NotificationRecipientType
  /** 用户侧多为飞书昵称；客服侧为客服档案名称 */
  recipientName: string
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
  recipientType?: NotificationRecipientType | 'all' | null
}

export interface PaginatedNotifications {
  items: NotificationRow[]
  total: number
  page: number
  pageSize: number
}
