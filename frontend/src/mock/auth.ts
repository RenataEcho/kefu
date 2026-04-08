import type { MockMethod } from 'vite-plugin-mock'

const MOCK_USERS: Record<
  string,
  { id: number; displayName: string; role: string; roleId: string; isAuditor: boolean }
> = {
  admin: { id: 1, displayName: '系统管理员', role: 'admin', roleId: '1', isAuditor: false },
  supervisor: { id: 2, displayName: '运营主管', role: 'supervisor', roleId: '2', isAuditor: false },
  kefu: { id: 3, displayName: '王小明', role: 'kefu', roleId: '3', isAuditor: false },
  auditor: { id: 4, displayName: '李审核', role: 'auditor', roleId: '4', isAuditor: true },
}

const MOCK_PERMISSIONS: Record<
  string,
  { menuPerms: string[]; operationPerms: string[]; fieldPerms: Record<string, boolean> }
> = {
  admin: {
    menuPerms: [
      'dashboard:read',
      'users:read',
      'migration:read',
      'payments:read',
      'audit:read',
      'notifications:read',
      'sla-alerts:read',
      'lark-friends:read',
      'org:read',
      'rbac:read',
      'accounts:read',
      'audit-logs:read',
    ],
    operationPerms: [
      'dashboard:export',
      'users:create',
      'users:update',
      'users:delete',
      'users:import',
      'users:migration:import',
      'payments:migration:import',
      'migration:reverify',
      'users:export',
      'payments:create',
      'payments:update',
      'payments:delete',
      'payments:import',
      'payments:export',
      'audit:approve',
      'audit:reject',
      'audit:import',
      'audit:export',
      'accounts:manage',
      'roles:manage',
      'org:manage',
    ],
    fieldPerms: {
      youbaoCode: true,
      feishuNickname: true,
      feishuUserId: true,
      feishuPhone: true,
      youbaoId: true,
      orgAssignment: true,
      paymentAmount: true,
      paymentContact: true,
      wxOpenId: true,
    },
  },
  supervisor: {
    menuPerms: ['dashboard:read', 'users:read', 'payments:read', 'audit:read', 'org:read'],
    operationPerms: [
      'users:create',
      'users:update',
      'users:export',
      'payments:create',
      'payments:update',
      'payments:export',
      'audit:approve',
      'audit:reject',
      'audit:export',
    ],
    fieldPerms: {
      youbaoCode: true,
      feishuNickname: true,
      feishuUserId: true,
      feishuPhone: true,
      youbaoId: true,
      orgAssignment: true,
      paymentAmount: true,
      paymentContact: true,
      wxOpenId: false,
    },
  },
  kefu: {
    menuPerms: ['dashboard:read', 'users:read', 'audit:read'],
    operationPerms: ['users:create', 'users:update'],
    fieldPerms: {
      youbaoCode: true,
      feishuNickname: true,
      feishuUserId: true,
      feishuPhone: true,
      youbaoId: true,
      orgAssignment: true,
      paymentAmount: false,
      paymentContact: false,
      wxOpenId: false,
    },
  },
  auditor: {
    menuPerms: ['dashboard:read', 'audit:read', 'sla-alerts:read', 'notifications:read'],
    operationPerms: ['dashboard:export', 'audit:approve', 'audit:reject', 'audit:export'],
    fieldPerms: {
      youbaoCode: true,
      feishuNickname: true,
      feishuUserId: true,
      feishuPhone: true,
      youbaoId: true,
      orgAssignment: true,
      paymentAmount: false,
      paymentContact: false,
      wxOpenId: false,
    },
  },
}

function generateToken(role: string): string {
  return `mock-token-${role}-${Date.now()}`
}

function getUserByToken(authHeader: string): { loginId: string } | null {
  const match = authHeader?.match(/mock-token-(\w+)-\d+/)
  if (!match) return null
  const role = match[1]
  const loginId = Object.keys(MOCK_USERS).find((k) => MOCK_USERS[k].role === role)
  return loginId ? { loginId } : null
}

/** 个人设置 Mock：昵称覆盖、密码覆盖（默认 123456） */
const displayNameOverrideByLogin: Record<string, string> = {}
const passwordOverrideByLogin: Record<string, string> = {}

function effectiveDisplayName(loginId: string): string {
  return displayNameOverrideByLogin[loginId] ?? MOCK_USERS[loginId]?.displayName ?? ''
}

function effectivePassword(loginId: string): string {
  return passwordOverrideByLogin[loginId] ?? '123456'
}

function mePayload(loginId: string) {
  const user = MOCK_USERS[loginId]
  const permissions = MOCK_PERMISSIONS[loginId]
  return {
    id: user.id,
    loginId,
    displayName: effectiveDisplayName(loginId),
    role: user.role,
    roleId: user.roleId,
    isAuditor: user.isAuditor,
    permissions,
  }
}

export default [
  {
    url: '/api/v1/auth/login',
    method: 'post',
    response: ({ body }: { body: { loginId?: string; username?: string; password?: string } }) => {
      const loginId = (body.loginId || body.username || '').trim()
      const user = MOCK_USERS[loginId]

      if (!user || body.password !== effectivePassword(loginId)) {
        return { code: 50001, message: '账号或密码错误', data: null }
      }

      const permissions = MOCK_PERMISSIONS[loginId]

      return {
        code: 0,
        message: 'success',
        data: {
          accessToken: generateToken(user.role),
          expiresIn: 28800,
          user: {
            id: user.id,
            loginId,
            displayName: effectiveDisplayName(loginId),
            role: user.role,
            roleId: user.roleId,
            isAuditor: user.isAuditor,
            permissions,
          },
        },
      }
    },
  },
  {
    url: '/api/v1/auth/logout',
    method: 'post',
    response: () => ({ code: 0, message: 'success', data: null }),
  },
  {
    url: '/api/v1/auth/me',
    method: 'get',
    response: (options: { headers: Record<string, string> }) => {
      const auth = options.headers?.authorization || ''
      const result = getUserByToken(auth)

      if (!result) {
        return { code: 50002, message: 'Token 已过期或无效', data: null }
      }

      const { loginId } = result

      return {
        code: 0,
        message: 'success',
        data: mePayload(loginId),
      }
    },
  },
  {
    url: '/api/v1/me',
    method: 'get',
    response: (options: { headers: Record<string, string> }) => {
      const auth = options.headers?.authorization || ''
      const result = getUserByToken(auth)
      if (!result) return { code: 50002, message: 'Token 已过期或无效', data: null }
      return { code: 0, message: 'success', data: mePayload(result.loginId) }
    },
  },
  {
    url: '/api/v1/me',
    method: 'patch',
    response: ({
      headers,
      body,
    }: {
      headers: Record<string, string>
      body: { displayName?: string }
    }) => {
      const auth = headers?.authorization || ''
      const result = getUserByToken(auth)
      if (!result) return { code: 50002, message: 'Token 已过期或无效', data: null }
      const name = (body.displayName ?? '').trim()
      if (!name) return { statusCode: 400, code: 40001, message: '账号名称不能为空', data: null }
      displayNameOverrideByLogin[result.loginId] = name
      return { code: 0, message: 'success', data: mePayload(result.loginId) }
    },
  },
  {
    url: '/api/v1/me/password',
    method: 'post',
    response: ({
      headers,
      body,
    }: {
      headers: Record<string, string>
      body: { currentPassword?: string; newPassword?: string }
    }) => {
      const auth = headers?.authorization || ''
      const result = getUserByToken(auth)
      if (!result) return { code: 50002, message: 'Token 已过期或无效', data: null }
      const loginId = result.loginId
      if (body.currentPassword !== effectivePassword(loginId)) {
        return { statusCode: 400, code: 10001, message: '当前密码不正确', data: null }
      }
      passwordOverrideByLogin[loginId] = body.newPassword || ''
      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
