import { get, patch, post } from '@/api/request'

export interface MeProfile {
  id: number
  loginId: string
  displayName: string
  role: string
  roleId: string
  isAuditor: boolean
  permissions: {
    menuPerms: string[]
    operationPerms: string[]
    fieldPerms: Record<string, boolean>
  }
}

export function fetchMe(): Promise<MeProfile> {
  return get<MeProfile>('/me')
}

export function patchMe(payload: { displayName: string }): Promise<MeProfile> {
  return patch<MeProfile>('/me', payload)
}

export function changeMyPassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  return post<void>('/me/password', payload)
}
