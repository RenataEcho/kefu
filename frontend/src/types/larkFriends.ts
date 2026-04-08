/** Story 8-1 ~ 8-3 飞书好友管理（前端 + Mock） */

export type LarkFriendGroupKey = 'PENDING_JOIN' | 'AUDITING'

export type LarkFriendRequestUiStatus =
  | 'NONE'
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TIMEOUT'
  /** Story 8.4：手动确认已添加；界面与 ACCEPTED 同为「已接受」 */
  | 'MANUAL_CONFIRMED'

export interface LarkFriendPriorityRow {
  userId: number
  rightLeopardCode: string
  larkNickname: string
  groupKey: LarkFriendGroupKey
  /** 入群状态展示文案 */
  groupAuditLabel: string
  /** 近 10 天动作数（Mock） */
  keywordCount: number
  friendRequestStatus: LarkFriendRequestUiStatus
  /** 好友申请发出时间；未申请为 null */
  applyTime: string | null
  userCreatedAt: string
  rejectedAt?: string | null
  rejectedCount?: number
}

export interface LarkFriendPriorityResponse {
  pendingJoin: LarkFriendPriorityRow[]
  auditing: LarkFriendPriorityRow[]
  manualDecision: LarkFriendPriorityRow[]
  timeoutCount: number
}

export interface LarkOauthSummary {
  hasAnyAuthorized: boolean
  authorizedAgentCount: number
  authorizedMentorCount: number
  /** 用于顶部提示条：none | expired | ok */
  operatorHint: 'none' | 'expired' | 'ok'
}

export interface LarkAuthorizedOperatorOption {
  id: number
  name: string
  type: 'agent' | 'mentor'
  /** 是否已过期（展示但不可选） */
  expired: boolean
  /** 本月 Mock 发出申请数 */
  monthlySendCount: number
}

export interface LarkSendFriendRequestBody {
  userId: number
  operatorType: 'agent' | 'mentor'
  operatorId: number
}
