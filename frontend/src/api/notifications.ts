import { get, post } from '@/api/request'
import type { NotificationListQuery, PaginatedNotifications } from '@/types/notification'

export function fetchNotifications(query: NotificationListQuery): Promise<PaginatedNotifications> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  }
  if (query.status && query.status !== 'all') {
    params.status = query.status
  }
  if (query.rightLeopardCode?.trim()) {
    params.rightLeopardCode = query.rightLeopardCode.trim()
  }
  if (query.scenario && query.scenario !== 'all') {
    params.scenario = query.scenario
  }
  if (query.channel && query.channel !== 'all') {
    params.channel = query.channel
  }
  if (query.auditType && query.auditType !== 'all') {
    params.auditType = query.auditType
  }
  return get<PaginatedNotifications>('/notifications', { params })
}

export function postNotificationPushNow(id: string): Promise<{ status: 'SENT' }> {
  return post<{ status: 'SENT' }>(`/notifications/${encodeURIComponent(id)}/push-now`, {})
}

export function postNotificationRetryPush(id: string): Promise<{ status: 'SENT' }> {
  return post<{ status: 'SENT' }>(`/notifications/${encodeURIComponent(id)}/retry-push`, {})
}
