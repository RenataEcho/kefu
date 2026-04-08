export type GroupAuditStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

/** Story 7-6：归档类型（与后端枚举一致，纯 Mock） */
export type GroupAuditArchiveType = 'RE_SUBMIT' | 'AUTO_EXPIRE' | 'MANUAL'

/** 详情页右豹数据同步态（原型 §2.1.1 / §1.4） */
export type GroupAuditYoubaoSyncState = 'live' | 'cached' | 'syncing'

/** 待审核列表内 SLA 子筛选（原型 §2.1：超时 / 待审核） */
export type PendingSlaFilter = 'all' | 'overdue' | 'normal'

export interface GroupAuditItem {
  id: number
  /** 申请人飞书昵称 */
  larkNickname: string
  /** 右豹编码 */
  rightLeopardCode: string
  /** 申请时间 ISO string (UTC+8 语义，dayjs 可直接解析) */
  applyTime: string
  /** 审核状态 */
  status: GroupAuditStatus
  /** 近10天关键词申请数（YoubaoUserStats.keywordCount） */
  keywordCount: number
  /** 近10天订单数（右豹 API） */
  orderCount: number
  /** 近10天回填数（补充需求） */
  backfillCount: number
  /** 近10天动作相关收益（元，Mock） */
  actionRevenueYuan: number
  /** 申请来源 */
  source: 'lark_sync' | 'manual_import'
  /** 处理人（已通过/已拒绝时有值） */
  reviewerName?: string
  /** 拒绝原因 */
  rejectReason?: string
  /** 审核/处理完成时间（已处理态） */
  reviewedAt?: string
  /** 已归档时的类型与时间、原因 */
  archiveType?: GroupAuditArchiveType
  archivedAt?: string
  archiveReason?: string
  /** SLA 预警发送时间（Story 7-8 Mock 数据源） */
  firstAlertSentAt?: string | null
  secondAlertSentAt?: string | null
}

/** 入群审核详情（Story 7-10） */
export interface GroupAuditDetail extends GroupAuditItem {
  youbaoStats: {
    keywordCount: number
    orderCount: number
    backfillCount: number
    actionRevenueYuan: number
  }
  dataSyncState: {
    state: GroupAuditYoubaoSyncState
    /** 缓存态展示「最后同步」文案 */
    lastSyncedAt?: string
  }
  /** 有推送记录时返回；无则 undefined */
  notification?: {
    status: 'pushed' | 'failed'
    failureReason?: string
    /** 跳转失败记录用 query */
    failureRecordId?: string
  }
  /** 已归档时返回 */
  archive?: {
    type: GroupAuditArchiveType
    archivedAt: string
    reason: string
  } | null
}

export interface GroupAuditLogItem {
  id: string
  operatedAt: string
  operatorName: string
  actionType: string
  content: string
}

export interface GroupAuditLogsPage {
  items: GroupAuditLogItem[]
  nextCursor: string | null
  hasMore: boolean
}

/** 补充需求 Phase I §十一：SLA 预警关联审核类型 */
export type SlaRelatedAuditType = 'group_audit' | 'entry_audit'

export interface SlaAlertRow {
  id: string
  alertAt: string
  /** 入群审核记录 ID；录入审核场景可为 0 */
  groupAuditId: number
  /** 录入审核记录 ID，auditType 为 entry_audit 时使用 */
  entryAuditId?: number
  /** 默认 group_audit（兼容旧 Mock） */
  auditType: SlaRelatedAuditType
  /** 入群：飞书昵称；录入：所属客服名（列表展示） */
  larkNickname: string
  /** 与用户主档对齐的所属客服，供 SLA 筛选（入群场景由右豹编码反查主档 Mock） */
  assignedAgentName?: string
  rightLeopardCode: string
  alertType: 'first' | 'second'
  sendStatus: 'success' | 'failed'
  /** 与入群审核列表对齐的近10天动作摘要（Mock） */
  keywordCount: number
  backfillCount: number
  orderCount: number
  actionRevenueYuan: number
}

export interface PaginatedSlaAlerts {
  items: SlaAlertRow[]
  total: number
  page: number
  pageSize: number
}

/** Story 7-7：全局 SLA 超时 Banner 轮询 */
export interface SlaBannerPayload {
  hasOverdue: boolean
  /** 飞书入群审核 SLA 超时条数 */
  overdueCount: number
  /** 用户录入审核 SLA 超时条数（旧接口未返回时按 0） */
  entryAuditOverdueCount?: number
}

export interface GroupAuditQuery {
  page?: number
  pageSize?: number
  /** 列表 Tab：待审核含 PENDING+PROCESSING；已归档需主动选择才展示 */
  status?: GroupAuditStatus | null
  /** 申请时间起（YYYY-MM-DD） */
  applyTimeFrom?: string | null
  /** 申请时间止（YYYY-MM-DD） */
  applyTimeTo?: string | null
  /** 处理人（已通过/已拒绝/已归档筛选） */
  reviewerName?: string | null
  /** 待审核队列内：全部 / 仅超时 / 仅未超时 */
  pendingSla?: PendingSlaFilter | null
  /** 右豹编码（精确匹配，大小写不敏感） */
  rightLeopardCode?: string | null
}

export interface PaginatedGroupAudits {
  items: GroupAuditItem[]
  total: number
  page: number
  pageSize: number
  /** 待处理条数（PENDING+PROCESSING，不受当前 Tab 影响） */
  pendingTotal?: number
}

export interface LarkHealthResponse {
  degraded: boolean
}

export interface SyncLarkStatusResponse {
  updated: number
}

export interface LarkApiStatusResponse {
  degraded: boolean
}

export interface LarkSyncTriggerResponse {
  updated: number
}
