import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { FIELD_PERM_SENSITIVE_KEYS } from '@/utils/rbacCatalog'

export function usePermission() {
  const authStore = useAuthStore()

  /** 管理员或审核员可看全局运营看板；客服/主管等仅个人看板（FR40 / Story 9.3） */
  const canViewGlobalDashboard = computed(() => {
    const u = authStore.user
    if (!u) return false
    return u.role === 'admin' || u.isAuditor === true
  })

  const hasMenuPermission = (perm: string): boolean => {
    const perms = authStore.permissions?.menuPerms ?? []
    return perms.includes('*') || perms.includes(perm)
  }

  const hasOperationPermission = (perm: string): boolean => {
    const perms = authStore.permissions?.operationPerms ?? []
    return perms.includes('*') || perms.includes(perm)
  }

  const hasFieldPermission = (field: string): boolean => {
    const v = authStore.permissions?.fieldPerms?.[field]
    if (v === true) return true
    if (v === false) return false
    return !FIELD_PERM_SENSITIVE_KEYS.has(field)
  }

  return { hasMenuPermission, hasOperationPermission, hasFieldPermission, canViewGlobalDashboard }
}
