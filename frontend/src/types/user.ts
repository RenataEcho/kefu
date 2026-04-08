export type CodeVerifyStatus =
  | 'VERIFIED'
  | 'PENDING_VERIFY'
  | 'INVALID'
  | 'FAILED'

export interface RelatedEntity {
  id: number
  name: string
}

export interface MentorOption extends RelatedEntity {
  schoolId: number
  schoolName: string
}

/** 补充需求 Phase I：用户详情项目明细 */
export interface UserProjectDetailRow {
  projectName: string
  businessCategory: string
  inscriptionCount: number
  backfillCount: number
  orderCount: number
  settledRevenueYuan: number
  pendingRevenueYuan: number
}

export interface UserListItem {
  id: number
  rightLeopardCode: string
  rightLeopardId: string
  larkNickname: string
  larkPhone: string
  codeVerifyStatus: CodeVerifyStatus
  /** Story 5.3：无效编码「保留」标记（列表接口可选返回） */
  invalidRetained?: boolean
  agentId: number
  agent: RelatedEntity
  mentorId: number
  mentor: RelatedEntity
  schoolId: number
  school: RelatedEntity
  isPaid: boolean
  paymentAmount: number | null
  /** 补充需求：列表列「项目收益」（Mock 与付费金额同源） */
  projectRevenue: number | null
  createdAt: string
}

export interface UserListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  agentId?: number | null
  mentorId?: number | null
  schoolId?: number | null
  codeVerifyStatus?: CodeVerifyStatus | null
  isPaid?: boolean | null
}

export interface UserListOptions {
  agents: RelatedEntity[]
  mentors: MentorOption[]
  schools: RelatedEntity[]
}

export interface CreateUserDto {
  rightLeopardCode: string
  rightLeopardId?: string
  larkId?: string
  larkPhone?: string
  larkNickname?: string
  agentId?: number | null
  mentorId?: number | null
  schoolId?: number | null
  skipVerify?: boolean
}

export interface UpdateUserDto {
  /** Story 5.3：修正编码后通常配合 codeVerifyStatus 回到待验证 */
  rightLeopardCode?: string
  codeVerifyStatus?: CodeVerifyStatus
  /** Story 5.3：无效编码记录「保留」标记 */
  invalidRetained?: boolean
  rightLeopardId?: string
  larkId?: string
  larkPhone?: string
  larkNickname?: string
  agentId?: number | null
  mentorId?: number | null
  schoolId?: number | null
}

export type YoubaoSyncState = 'live' | 'cached' | 'syncing'

export interface UserYoubaoInfo {
  keywordCount: number
  orderCount: number
  projectRevenue: number
  state: YoubaoSyncState
  lastSyncedAt: string | null
}

/** 用户主档详情（GET /users/:id，不含 wxOpenId） */
export interface UserDetail extends UserListItem {
  larkId: string
  groupAuditsCount: number
  paymentRecordsCount: number
  paidAt: string | null
  paymentContact: string | null
  youbao: UserYoubaoInfo
  /** 补充需求 Phase I：项目明细（Mock） */
  projectDetails: UserProjectDetailRow[]
  /** Mock：右豹 API 模拟降级时由 GET 返回，用于顶栏 ApiStatusBar（Story 4-4） */
  youbaoDegraded?: boolean
}

/** POST /users/:id/sync-youbao 入队响应（纯前端 Mock，Story 4-4） */
export interface SyncYoubaoQueuedResponse {
  status: 'queued'
}

/** 详情页内嵌操作日志行（字段级） */
export interface UserAuditLogRow {
  id: string
  operatedAt: string
  operatorName: string
  operationType: string
  fieldName: string
  beforeValue: string
  afterValue: string
}

export interface UserAuditLogsPage {
  list: UserAuditLogRow[]
  nextCursor: string | null
}
