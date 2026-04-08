export type CsAgentStatus = 'ENABLED' | 'DISABLED'

/** 补充需求 Phase I：客服类型 */
export type CsAgentType = 'NORMAL' | 'PAID'

export const CS_AGENT_TYPE_LABELS: Record<CsAgentType, string> = {
  NORMAL: '普通客服',
  PAID: '付费客服',
}

export interface CsAgentListItem {
  id: number
  name: string
  /** 补充需求：普通客服 | 付费客服 */
  agentType: CsAgentType
  /** 补充需求：飞书手机号（Mock 文本，前端校验格式） */
  feishuPhone: string
  status: CsAgentStatus
  wxQrcodeUrl: string
  /** 补充需求 Phase I §十：信息录入 H5 链接（含 agentId 查询参数） */
  entryFormUrl: string
  linkedUserCount: number
  createdAt: string
  /** Story 8-2 Mock：飞书 OAuth 过期时间；null 表示未授权 */
  larkOauthExpiresAt?: string | null
  /** Mock 展示用昵称（非 token） */
  larkDisplayName?: string | null
}

export interface CsAgentAuditLogEntry {
  id: string
  operatedAt: string
  operatorName: string
  operationType: string
  fieldName: string
  beforeValue: string
  afterValue: string
}

export interface CsAgentDetail extends CsAgentListItem {
  createdByName: string
  auditLogs: CsAgentAuditLogEntry[]
}

export interface CsAgentListQuery {
  page: number
  pageSize: number
  keyword: string
  status: CsAgentStatus | null
  /** 补充需求 Phase I */
  agentType?: CsAgentType | null
  /** Story 8-3：仅飞书 OAuth 未过期的客服 */
  authorized?: boolean
}

export interface PaginatedCsAgents {
  items: CsAgentListItem[]
  total: number
  page: number
  pageSize: number
}

export interface UpdateCsAgentDto {
  name?: string
  status?: CsAgentStatus
  wxQrcodeUrl?: string
  agentType?: CsAgentType
  feishuPhone?: string
}

export interface CreateCsAgentDto {
  name: string
  wxQrcodeUrl?: string
  agentType?: CsAgentType
  feishuPhone?: string
}
