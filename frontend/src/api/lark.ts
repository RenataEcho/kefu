import { get, post } from '@/api/request'
import type { LarkApiStatusResponse, LarkSyncTriggerResponse } from '@/types/groupAudit'

/** Story 7-5：飞书 API 降级状态（轮询） */
export function fetchLarkApiStatus(): Promise<LarkApiStatusResponse> {
  return get<LarkApiStatusResponse>('/lark/status')
}

/** Story 7-5 / FR19：API 正常时手动触发同步 */
export function triggerLarkSyncNow(): Promise<LarkSyncTriggerResponse> {
  return post<LarkSyncTriggerResponse>('/lark/sync', {})
}
