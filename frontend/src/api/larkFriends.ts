import { get, post } from '@/api/request'
import type {
  LarkAuthorizedOperatorOption,
  LarkFriendPriorityRow,
  LarkFriendPriorityResponse,
  LarkOauthSummary,
  LarkSendFriendRequestBody,
} from '@/types/larkFriends'

export function fetchLarkFriendPriorityList(includeTimeout = false): Promise<LarkFriendPriorityResponse> {
  return get<LarkFriendPriorityResponse>('/lark-friends/priority-list', {
    params: includeTimeout ? { includeTimeout: 'true' } : {},
  })
}

export function fetchLarkOauthSummary(): Promise<LarkOauthSummary> {
  return get<LarkOauthSummary>('/lark-friends/oauth-summary')
}

export function fetchLarkAuthorizedOperators(): Promise<LarkAuthorizedOperatorOption[]> {
  return get<LarkAuthorizedOperatorOption[]>('/lark-friends/authorized-operators')
}

export function postLarkOAuthMockComplete(body: {
  type: 'agent' | 'mentor'
  id: number
  displayName?: string
}): Promise<{ type: string; id: number; displayName: string }> {
  return post('/lark/oauth/mock-complete', body)
}

export function postLarkSendFriendRequest(
  body: LarkSendFriendRequestBody,
): Promise<{ status: string; operatorName: string }> {
  return post('/lark-friends/send-request', body)
}

export function postLarkMarkAdded(userId: number): Promise<null> {
  return post<null>('/lark-friends/mark-added', { userId })
}

/** Story 8.4：POST /lark-friends/:userId/manual-confirm → MANUAL_CONFIRMED */
export function postLarkManualConfirm(userId: number): Promise<{ status: string }> {
  return post<{ status: string }>(`/lark-friends/${userId}/manual-confirm`)
}

/** Story 8.5：与 priority-list.manualDecision 一致；独立接口便于缓存/分页扩展 */
export function fetchLarkDecisionRequired(): Promise<LarkFriendPriorityRow[]> {
  return get<LarkFriendPriorityRow[]>('/lark-friends/decision-required')
}

export function postLarkReapply(userId: number): Promise<null> {
  return post<null>('/lark-friends/reapply', { userId })
}

export function postLarkAbandon(userId: number): Promise<{ status: string }> {
  return post<{ status: string }>(`/lark-friends/${userId}/abandon`)
}

/** Mock：模拟飞书 Webhook 回调（Story 8.4 验收） */
export function postLarkDevSimulateFriendStatus(
  userId: number,
  status: 'ACCEPTED' | 'REJECTED' | 'TIMEOUT',
): Promise<{ friendRequestStatus: string }> {
  return post<{ friendRequestStatus: string }>('/lark-friends/dev/simulate-friend-status', {
    userId,
    status,
  })
}
