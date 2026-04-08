import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoleCode } from '@/types/permission'

export interface AuthPermissions {
  menuPerms: string[]
  operationPerms: string[]
  fieldPerms: Record<string, boolean>
}

export interface AuthUser {
  id: number
  loginId: string
  displayName: string
  role: RoleCode
  roleId: string
  isAuditor: boolean
  permissions: AuthPermissions
}

const STORAGE_TOKEN = 'access_token'
const STORAGE_EXPIRES = 'token_expires_at'
const STORAGE_USER = 'auth_user'

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_USER)
    return stored ? (JSON.parse(stored) as AuthUser) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_TOKEN))
  const tokenExpiresAt = ref<number>(parseInt(localStorage.getItem(STORAGE_EXPIRES) || '0'))
  const user = ref<AuthUser | null>(loadUser())

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role ?? null)
  const permissions = computed(() => user.value?.permissions ?? null)

  /** Token 剩余有效期 ≤ 15 分钟时为 true（AC#5） */
  const isTokenExpiringSoon = computed(() => {
    if (!tokenExpiresAt.value) return false
    const remaining = tokenExpiresAt.value - Date.now()
    return remaining > 0 && remaining <= 15 * 60 * 1000
  })

  /** Token 已过期 */
  const isTokenExpired = computed(() => {
    if (!tokenExpiresAt.value) return false
    return Date.now() >= tokenExpiresAt.value
  })

  /** 登录成功后设置完整认证信息（AC#1） */
  function setAuth(authUser: AuthUser, accessToken: string, expiresIn: number = 28800) {
    user.value = authUser
    token.value = accessToken
    tokenExpiresAt.value = Date.now() + expiresIn * 1000
    localStorage.setItem(STORAGE_TOKEN, accessToken)
    localStorage.setItem(STORAGE_EXPIRES, tokenExpiresAt.value.toString())
    localStorage.setItem(STORAGE_USER, JSON.stringify(authUser))
  }

  /** Sliding Session：更新 Token（AC#3） */
  function setToken(accessToken: string, expiresIn: number = 28800) {
    token.value = accessToken
    tokenExpiresAt.value = Date.now() + expiresIn * 1000
    localStorage.setItem(STORAGE_TOKEN, accessToken)
    localStorage.setItem(STORAGE_EXPIRES, tokenExpiresAt.value.toString())
  }

  function clearAuth() {
    user.value = null
    token.value = null
    tokenExpiresAt.value = 0
    localStorage.removeItem(STORAGE_TOKEN)
    localStorage.removeItem(STORAGE_EXPIRES)
    localStorage.removeItem(STORAGE_USER)
  }

  /** 个人设置昵称保存后同步顶栏（Story 2.4 AC#2） */
  function updateDisplayName(displayName: string) {
    if (!user.value) return
    user.value = { ...user.value, displayName }
    localStorage.setItem(STORAGE_USER, JSON.stringify(user.value))
  }

  /** 启动或续期后拉取服务端用户，修正本地缓存缺 permissions 导致的侧栏/路由权限失效 */
  function setUser(next: AuthUser) {
    user.value = next
    localStorage.setItem(STORAGE_USER, JSON.stringify(next))
  }

  return {
    user,
    token,
    tokenExpiresAt,
    isAuthenticated,
    userRole,
    permissions,
    isTokenExpiringSoon,
    isTokenExpired,
    setAuth,
    setToken,
    clearAuth,
    updateDisplayName,
    setUser,
  }
})
