import type { AuthUser } from '@/stores/auth'
import { get } from '@/api/request'

/** 与登录态一致的用户结构（Mock：`/api/v1/auth/me`） */
export function fetchSessionUser(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me')
}
