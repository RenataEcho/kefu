import type { MockMethod } from 'vite-plugin-mock'
import type { RbacRole, RbacPermissions } from '@/types/permission'

/** 与 rbacCatalog FIELD_PERM_OPTIONS 键一致，便于角色权限抽屉与 Mock 对齐 */
const FIELD_ALL_ON: Record<string, boolean> = {
  youbaoCode: true,
  feishuNickname: true,
  feishuUserId: true,
  feishuPhone: true,
  youbaoId: true,
  orgAssignment: true,
  paymentAmount: true,
  paymentContact: true,
  wxOpenId: true,
}

const FIELD_SENSITIVE_OFF: Record<string, boolean> = {
  ...FIELD_ALL_ON,
  paymentAmount: false,
  paymentContact: false,
  wxOpenId: false,
}

const ADMIN_ALL_PERMS: RbacPermissions = {
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
    'users:export',
    'payments:create',
    'payments:update',
    'payments:delete',
    'payments:import',
    'payments:migration:import',
    'payments:export',
    'migration:reverify',
    'audit:approve',
    'audit:reject',
    'audit:import',
    'audit:export',
    'accounts:manage',
    'roles:manage',
    'org:manage',
  ],
  fieldPerms: { ...FIELD_ALL_ON },
}

let roles: RbacRole[] = [
  {
    id: 1,
    name: '超级管理员',
    department: '管理部',
    accountCount: 1,
    permissions: ADMIN_ALL_PERMS,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: '运营主管',
    department: '运营部',
    accountCount: 3,
    permissions: {
      menuPerms: ['dashboard:read', 'users:read', 'payments:read', 'audit:read', 'org:read', 'migration:read'],
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
      fieldPerms: { ...FIELD_ALL_ON },
    },
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 3,
    name: '普通客服',
    department: '客服部',
    accountCount: 12,
    permissions: {
      menuPerms: ['users:read', 'audit:read'],
      operationPerms: ['users:create', 'users:update'],
      fieldPerms: { ...FIELD_SENSITIVE_OFF },
    },
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 4,
    name: '审核专员',
    department: '审核部',
    accountCount: 5,
    permissions: {
      menuPerms: ['audit:read', 'sla-alerts:read'],
      operationPerms: ['audit:approve', 'audit:reject'],
      fieldPerms: { ...FIELD_SENSITIVE_OFF },
    },
    createdAt: '2026-02-01T00:00:00.000Z',
  },
]

let nextId = 5

export default [
  {
    url: '/api/v1/roles',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: {
        list: [...roles].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        total: roles.length,
      },
    }),
  },
  {
    url: '/api/v1/roles',
    method: 'post',
    response: ({
      body,
    }: {
      body: { name: string; department: string; permissions: RbacPermissions }
    }) => {
      const newRole: RbacRole = {
        id: nextId++,
        name: body.name,
        department: body.department,
        accountCount: 0,
        permissions: body.permissions ?? {
          menuPerms: [],
          operationPerms: [],
          fieldPerms: {},
        },
        createdAt: new Date().toISOString(),
      }
      roles.push(newRole)
      return { code: 0, message: 'success', data: newRole }
    },
  },
  {
    url: '/api/v1/roles/:id',
    method: 'patch',
    response: ({
      url,
      body,
    }: {
      url: string
      body: Partial<RbacRole>
    }) => {
      const id = parseInt(url.split('/').pop() ?? '0', 10)
      const idx = roles.findIndex((r) => r.id === id)
      if (idx === -1) return { code: 40400, message: '角色不存在', data: null }
      const prev = roles[idx]
      const next: RbacRole = { ...prev, ...body }
      if (body.permissions) {
        next.permissions = {
          menuPerms: body.permissions.menuPerms ?? prev.permissions.menuPerms,
          operationPerms: body.permissions.operationPerms ?? prev.permissions.operationPerms,
          fieldPerms:
            body.permissions.fieldPerms !== undefined
              ? { ...body.permissions.fieldPerms }
              : prev.permissions.fieldPerms,
        }
      }
      roles[idx] = next
      return { code: 0, message: 'success', data: roles[idx] }
    },
  },
  {
    url: '/api/v1/roles/:id',
    method: 'delete',
    response: ({ url }: { url: string }) => {
      const id = parseInt(url.split('/').pop() ?? '0', 10)
      const role = roles.find((r) => r.id === id)
      if (!role) return { code: 40400, message: '角色不存在', data: null }
      if (role.accountCount > 0) {
        return {
          code: 10003,
          message: `该角色下有 ${role.accountCount} 个账号，请先转移后删除`,
          data: null,
        }
      }
      roles = roles.filter((r) => r.id !== id)
      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
