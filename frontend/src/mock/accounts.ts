import type { MockMethod } from 'vite-plugin-mock'
import type { AdminAccount, AdminAccountStatus } from '@/types/account'

const ROLE_NAMES: Record<number, string> = {
  1: '超级管理员',
  2: '运营主管',
  3: '普通客服',
  4: '审核专员',
}

interface StoredAccount {
  id: number
  name: string
  loginId: string
  roleId: number
  roleName: string
  isAuditor: boolean
  status: AdminAccountStatus
  createdAt: string
  _passwordSet: boolean
}

function seed(): StoredAccount[] {
  const base = '2026-01-02T08:00:00.000Z'
  return [
    {
      id: 1,
      name: '系统管理员',
      loginId: 'admin',
      roleId: 1,
      roleName: ROLE_NAMES[1],
      isAuditor: false,
      status: 'ACTIVE',
      createdAt: base,
      _passwordSet: true,
    },
    {
      id: 2,
      name: '运营主管演示',
      loginId: 'supervisor',
      roleId: 2,
      roleName: ROLE_NAMES[2],
      isAuditor: false,
      status: 'ACTIVE',
      createdAt: '2026-01-05T10:20:00.000Z',
      _passwordSet: true,
    },
    {
      id: 3,
      name: '王小明',
      loginId: 'kefu',
      roleId: 3,
      roleName: ROLE_NAMES[3],
      isAuditor: false,
      status: 'ACTIVE',
      createdAt: '2026-01-12T14:00:00.000Z',
      _passwordSet: true,
    },
    {
      id: 4,
      name: '李审核',
      loginId: 'auditor',
      roleId: 4,
      roleName: ROLE_NAMES[4],
      isAuditor: true,
      status: 'ACTIVE',
      createdAt: '2026-02-01T09:30:00.000Z',
      _passwordSet: true,
    },
    {
      id: 5,
      name: '已禁用账号示例',
      loginId: 'disabled_demo',
      roleId: 3,
      roleName: ROLE_NAMES[3],
      isAuditor: false,
      status: 'DISABLED',
      createdAt: '2026-02-10T16:00:00.000Z',
      _passwordSet: true,
    },
  ]
}

let accounts: StoredAccount[] = seed()
let nextId = 6

function toPublic(a: StoredAccount): AdminAccount {
  return {
    id: a.id,
    name: a.name,
    loginId: a.loginId,
    roleId: a.roleId,
    roleName: a.roleName,
    isAuditor: a.isAuditor,
    status: a.status,
    createdAt: a.createdAt,
    passwordSet: a._passwordSet,
  }
}

function parseIdFromUrl(url: string): number {
  const parts = url.split('/').filter(Boolean)
  const idPart = parts[parts.length - 1]?.split('?')[0]
  return parseInt(idPart ?? '0', 10)
}

/** 解析 .../accounts/5/reset-password */
function parseResetPasswordId(url: string): number {
  const m = url.match(/\/accounts\/(\d+)\/reset-password(?:\?|$)/)
  return m ? parseInt(m[1], 10) : 0
}

function generateRandomPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  const out: string[] = [pick(upper), pick(lower), pick(digits)]
  const all = upper + lower + digits
  while (out.length < 8) out.push(pick(all))
  return out.sort(() => Math.random() - 0.5).join('')
}

export default [
  {
    url: '/api/v1/accounts',
    method: 'get',
    response: ({
      query,
    }: {
      query: Record<string, string>
    }) => {
      let list = [...accounts]
      const roleId = query.roleId
      if (roleId != null && roleId !== '') {
        const rid = parseInt(roleId, 10)
        if (!Number.isNaN(rid)) list = list.filter((a) => a.roleId === rid)
      }
      if (query.isAuditor === 'true') list = list.filter((a) => a.isAuditor)
      if (query.isAuditor === 'false') list = list.filter((a) => !a.isAuditor)

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10) || 20))
      const total = list.length
      const start = (page - 1) * pageSize
      const slice = list.slice(start, start + pageSize).map(toPublic)

      return {
        code: 0,
        message: 'success',
        data: {
          list: slice,
          total,
          page,
          pageSize,
        },
      }
    },
  },
  {
    url: '/api/v1/accounts',
    method: 'post',
    response: ({
      body,
    }: {
      body: {
        name?: string
        loginId?: string
        password?: string
        roleId?: number
        isAuditor?: boolean
      }
    }) => {
      const loginId = (body.loginId || '').trim()
      if (accounts.some((a) => a.loginId === loginId)) {
        return {
          statusCode: 409,
          code: 20003,
          message: '登录ID已存在',
          data: null,
        }
      }
      const roleId = Number(body.roleId)
      if (!ROLE_NAMES[roleId]) {
        return { code: 40001, message: '无效的角色', data: null }
      }
      const row: StoredAccount = {
        id: nextId++,
        name: (body.name || '').trim() || loginId,
        loginId,
        roleId,
        roleName: ROLE_NAMES[roleId],
        isAuditor: body.isAuditor === true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        _passwordSet: !!(body.password && body.password.length > 0),
      }
      accounts.push(row)
      return { code: 0, message: 'success', data: toPublic(row) }
    },
  },
  {
    url: '/api/v1/accounts/:id',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const id = parseIdFromUrl(url)
      const a = accounts.find((x) => x.id === id)
      if (!a) return { code: 40400, message: '账号不存在', data: null }
      return { code: 0, message: 'success', data: toPublic(a) }
    },
  },
  {
    url: '/api/v1/accounts/:id',
    method: 'patch',
    response: ({
      url,
      body,
    }: {
      url: string
      body: {
        name?: string
        roleId?: number
        isAuditor?: boolean
        status?: AdminAccountStatus
      }
    }) => {
      const id = parseIdFromUrl(url)
      const idx = accounts.findIndex((x) => x.id === id)
      if (idx === -1) return { code: 40400, message: '账号不存在', data: null }
      const cur = accounts[idx]
      if (body.name != null) cur.name = body.name.trim()
      if (body.roleId != null) {
        const rid = Number(body.roleId)
        if (!ROLE_NAMES[rid]) return { code: 40001, message: '无效的角色', data: null }
        cur.roleId = rid
        cur.roleName = ROLE_NAMES[rid]
      }
      if (body.isAuditor != null) cur.isAuditor = body.isAuditor
      if (body.status != null) {
        if (body.status !== 'ACTIVE' && body.status !== 'DISABLED') {
          return { code: 40001, message: '无效的状态', data: null }
        }
        cur.status = body.status
      }
      accounts[idx] = cur
      return { code: 0, message: 'success', data: toPublic(cur) }
    },
  },
  {
    url: '/api/v1/accounts/:id',
    method: 'delete',
    response: ({ url }: { url: string }) => {
      const id = parseIdFromUrl(url)
      const idx = accounts.findIndex((x) => x.id === id)
      if (idx === -1) return { code: 40400, message: '账号不存在', data: null }
      const a = accounts[idx]
      if (a.status !== 'DISABLED') {
        return {
          statusCode: 400,
          code: 10001,
          message: '请先禁用账号后再删除',
          data: null,
        }
      }
      accounts.splice(idx, 1)
      return { code: 0, message: 'success', data: null }
    },
  },
  {
    url: '/api/v1/accounts/:id/reset-password',
    method: 'post',
    response: ({ url }: { url: string }) => {
      const id = parseResetPasswordId(url)
      if (!id) return { code: 40000, message: '请求路径无效', data: null }
      const a = accounts.find((x) => x.id === id)
      if (!a) return { code: 40400, message: '账号不存在', data: null }
      const newPassword = generateRandomPassword()
      a._passwordSet = true
      return {
        code: 0,
        message: 'success',
        data: { newPassword },
      }
    },
  },
] as MockMethod[]
