import { get, post, patch, del } from '@/api/request'
import type {
  UserListQuery,
  UserListItem,
  UserListOptions,
  CreateUserDto,
  UpdateUserDto,
  UserDetail,
  UserAuditLogsPage,
  SyncYoubaoQueuedResponse,
} from '@/types/user'

export interface PaginatedUsers {
  items: UserListItem[]
  total: number
  page: number
  pageSize: number
}

export interface VerifyCodeResult {
  valid: boolean
  message?: string
}

export function fetchUsers(query: UserListQuery): Promise<PaginatedUsers> {
  const params: Record<string, string | number | boolean> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  }
  if (query.keyword) params.keyword = query.keyword
  const rlc = String(query.rightLeopardCode ?? '').trim()
  if (rlc) params.rightLeopardCode = rlc
  if (query.agentId != null) params.agentId = query.agentId
  if (query.mentorId != null) params.mentorId = query.mentorId
  if (query.schoolId != null) params.schoolId = query.schoolId
  if (query.codeVerifyStatus) params.codeVerifyStatus = query.codeVerifyStatus
  if (query.isPaid != null) params.isPaid = query.isPaid

  return get<PaginatedUsers>('/users', { params })
}

export function fetchUserOptions(): Promise<UserListOptions> {
  return get<UserListOptions>('/users/options')
}

export function verifyUserCode(code: string): Promise<VerifyCodeResult> {
  return post<VerifyCodeResult>('/users/verify-code', { code })
}

export function createUser(dto: CreateUserDto): Promise<UserListItem> {
  return post<UserListItem>('/users', dto)
}

export function fetchUser(id: number): Promise<UserDetail> {
  return get<UserDetail>(`/users/${id}`)
}

export function fetchUserAuditLogs(id: number, cursor?: string | null): Promise<UserAuditLogsPage> {
  const params: Record<string, string> = {}
  if (cursor != null && cursor !== '') params.cursor = cursor
  return get<UserAuditLogsPage>(`/users/${id}/audit-logs`, { params })
}

export function syncUserYoubao(id: number): Promise<SyncYoubaoQueuedResponse> {
  return post<SyncYoubaoQueuedResponse>(`/users/${id}/sync-youbao`, {})
}

export function updateUser(id: number, dto: UpdateUserDto): Promise<UserListItem> {
  return patch<UserListItem>(`/users/${id}`, dto)
}

export function deleteUser(id: number): Promise<void> {
  return del<void>(`/users/${id}`)
}
