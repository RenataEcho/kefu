import type { MockMethod } from 'vite-plugin-mock'
import type { UserProjectDetailRow } from '@/types/user'
import { appendMockAuditLog } from './auditLogs'
import {
  completeExportJob,
  failExportJob,
  registerExportJobProcessing,
} from './exportJobsStore'
import { isYoubaoApiSimulatedDown } from './youbaoFlags'

// ─── Reference Data ──────────────────────────────────────────────────────────

export const MOCK_AGENTS = [
  { id: 1, name: '王小明' },
  { id: 2, name: '李晓红' },
  { id: 3, name: '张大伟' },
  { id: 4, name: '刘芳芳' },
  { id: 5, name: '陈建国' },
]

export const MOCK_MENTORS = [
  { id: 1, name: '赵天龙', schoolId: 1, schoolName: '紫霄门' },
  { id: 2, name: '钱多多', schoolId: 1, schoolName: '紫霄门' },
  { id: 3, name: '孙宇轩', schoolId: 2, schoolName: '青云派' },
  { id: 4, name: '李华南', schoolId: 3, schoolName: '天剑宗' },
  { id: 5, name: '周明智', schoolId: 2, schoolName: '青云派' },
]

export const MOCK_SCHOOLS = [
  { id: 1, name: '紫霄门' },
  { id: 2, name: '青云派' },
  { id: 3, name: '天剑宗' },
  { id: 4, name: '玄武堂' },
]

// ─── User Records ─────────────────────────────────────────────────────────────

type CodeVerifyStatus =
  | 'VERIFIED'
  | 'PENDING_VERIFY'
  | 'INVALID'
  | 'FAILED'

export interface MockUser {
  id: number
  rightLeopardCode: string
  rightLeopardId: string
  larkId: string
  larkNickname: string
  larkPhone: string
  codeVerifyStatus: CodeVerifyStatus
  /** Story 5.3：无效编码记录上管理员「保留」标记 */
  invalidRetained?: boolean
  agentId: number
  agent: { id: number; name: string }
  mentorId: number
  mentor: { id: number; name: string }
  schoolId: number
  school: { id: number; name: string }
  isPaid: boolean
  paymentAmount: number | null
  paymentPaidAt: string | null
  paymentContact: string | null
  createdAt: string
  groupAuditsCount: number
  paymentRecordsCount: number
}

type YoubaoState = 'live' | 'cached' | 'syncing'

interface YoubaoRuntime {
  keywordCount: number
  orderCount: number
  projectRevenue: number
  state: YoubaoState
  lastSyncedAt: string | null
}

const youbaoByUserId: Record<number, YoubaoRuntime> = {}

function ensureYoubao(u: MockUser): YoubaoRuntime {
  const down = isYoubaoApiSimulatedDown()

  if (!youbaoByUserId[u.id]) {
    if (
      u.codeVerifyStatus === 'PENDING_VERIFY' ||
      u.codeVerifyStatus === 'INVALID' ||
      u.codeVerifyStatus === 'FAILED'
    ) {
      youbaoByUserId[u.id] = {
        keywordCount: 0,
        orderCount: 0,
        projectRevenue: 0,
        state: 'syncing',
        lastSyncedAt: null,
      }
    } else {
      youbaoByUserId[u.id] = {
        keywordCount: 20 + (u.id % 50),
        orderCount: 2 + (u.id % 8),
        projectRevenue: Math.round(1000 + u.id * 37),
        state: down ? 'cached' : u.id % 4 === 0 ? 'cached' : 'live',
        lastSyncedAt: new Date(Date.now() - (u.id % 5) * 3600000 - 86400000).toISOString(),
      }
    }
  }

  const y = youbaoByUserId[u.id]
  if (u.codeVerifyStatus === 'VERIFIED' && y.state === 'syncing') {
    y.keywordCount = 20 + (u.id % 50)
    y.orderCount = 2 + (u.id % 8)
    y.projectRevenue = Math.round(1000 + u.id * 37)
    y.state = down ? 'cached' : u.id % 4 === 0 ? 'cached' : 'live'
    y.lastSyncedAt = new Date().toISOString()
  }
  if (down && u.codeVerifyStatus === 'VERIFIED') {
    y.state = 'cached'
  } else if (!down && u.codeVerifyStatus === 'VERIFIED' && y.state !== 'syncing') {
    y.state = u.id % 4 === 0 ? 'cached' : 'live'
  }

  return y
}

export function findMockUser(id: number): MockUser | undefined {
  return CREATED_USERS.find((u) => u.id === id) ?? ALL_USERS.find((u) => u.id === id)
}

export function findMockUserByRightLeopardCode(code: string): MockUser | undefined {
  const t = code.trim().toLowerCase()
  if (!t) return undefined
  return [...CREATED_USERS, ...ALL_USERS].find((u) => u.rightLeopardCode.toLowerCase() === t)
}

/** 供 payments Mock 等遍历全部用户（含会话内新建） */
export function getMergedMockUsers() {
  return [...CREATED_USERS, ...ALL_USERS]
}

const USER_PROJECT_CATS = [
  '推文',
  '短剧',
  '游戏',
  '应用',
  '海外故事',
  '海外短剧',
  '端原生',
  '版权',
  '商单',
  '融合',
  'MCN',
  '快手',
] as const

function mockProjectDetailsForUser(u: MockUser): UserProjectDetailRow[] {
  const y = ensureYoubao(u)
  return [0, 1].map((i) => ({
    projectName: `示例项目 ${u.id}-${i + 1}`,
    businessCategory: USER_PROJECT_CATS[(u.id + i) % USER_PROJECT_CATS.length]!,
    inscriptionCount: Math.max(0, y.keywordCount - i * 4),
    backfillCount: 8 + (u.id % 20) + i * 2,
    orderCount: Math.max(0, y.orderCount - i),
    settledRevenueYuan: Math.round(600 + u.id * 15 + i * 200),
    pendingRevenueYuan: Math.round(100 + u.id * 4 + i * 30),
  }))
}

function userAuditSnapshot(u: MockUser): Record<string, unknown> {
  return {
    rightLeopardCode: u.rightLeopardCode,
    codeVerifyStatus: u.codeVerifyStatus,
    invalidRetained: u.invalidRetained ?? false,
    rightLeopardId: u.rightLeopardId,
    larkId: u.larkId,
    larkPhone: u.larkPhone,
    larkNickname: u.larkNickname,
    agentId: u.agentId,
    agentName: u.agent?.name ?? '',
    mentorId: u.mentorId,
    mentorName: u.mentor?.name ?? '',
    schoolId: u.schoolId,
    schoolName: u.school?.name ?? '',
  }
}

function toDetailPayload(u: MockUser) {
  const y = ensureYoubao(u)
  const { paymentPaidAt: _pp, paymentContact: _pc, ...rest } = u
  return {
    ...rest,
    projectRevenue: u.isPaid ? u.paymentAmount : y.projectRevenue,
    paidAt: u.isPaid ? u.paymentPaidAt : null,
    paymentContact: u.isPaid ? u.paymentContact : null,
    projectDetails: mockProjectDetailsForUser(u),
    youbao: {
      keywordCount: y.keywordCount,
      orderCount: y.orderCount,
      projectRevenue: y.projectRevenue,
      state: y.state,
      lastSyncedAt: y.lastSyncedAt,
    },
    youbaoDegraded: isYoubaoApiSimulatedDown(),
  }
}

const USER_AUDIT_FIELDS = ['飞书昵称', '飞书手机号', '所属客服', '右豹 ID', '付费金额', '—']

function userAuditRows(userId: number, offset: number, limit: number) {
  const total = 28
  const list = []
  const base = new Date('2026-03-15').getTime()
  for (let i = offset; i < Math.min(offset + limit, total); i++) {
    const field = USER_AUDIT_FIELDS[i % USER_AUDIT_FIELDS.length]
    list.push({
      id: `ual-${userId}-${i}`,
      operatedAt: new Date(base + i * 7200000).toISOString(),
      operatorName: ['王运营', '李审核', '张客服'][i % 3],
      operationType: i % 5 === 0 ? '创建' : '修改',
      fieldName: field,
      beforeValue: i % 2 === 0 ? '（空）' : `旧值-${i}`,
      afterValue: i % 2 === 0 ? `新值-${i}` : `新值-${i + 1}`,
    })
  }
  const nextCursor = offset + limit < total ? String(offset + limit) : null
  return { list, nextCursor }
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString()
}

function generateUsers(): MockUser[] {
  const firstNames = ['小明', '晓红', '大伟', '芳芳', '建国', '美丽', '志远', '秀英', '海燕', '国华']
  const lastNames = ['王', '李', '张', '刘', '陈', '杨', '赵', '吴', '周', '徐', '孙', '马', '胡', '郭', '何']
  const start = new Date('2025-06-01')
  const end = new Date('2026-04-01')

  return Array.from({ length: 58 }, (_, i) => {
    const idx = i + 1
    const agent = MOCK_AGENTS[(i % MOCK_AGENTS.length)]
    const mentor = MOCK_MENTORS[(i % MOCK_MENTORS.length)]
    const school = { id: mentor.schoolId, name: mentor.schoolName }
    const lnIdx = i % lastNames.length
    const fnIdx = i % firstNames.length
    const nickname = `${lastNames[lnIdx]}${firstNames[fnIdx]}`

    const isPaid = idx % 3 !== 0
    const paidAt = isPaid ? randomDate(start, end) : null
    return {
      id: idx,
      rightLeopardCode: `RB${String(10000 + idx).padStart(6, '0')}`,
      rightLeopardId: `YB${String(20000 + idx).padStart(8, '0')}`,
      larkId: `lark_${String(30000 + idx)}`,
      larkNickname: nickname,
      larkPhone: `1${['3', '5', '6', '7', '8'][i % 5]}${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
      codeVerifyStatus: (idx % 7 === 0 ? 'PENDING_VERIFY' : 'VERIFIED') as CodeVerifyStatus,
      agentId: agent.id,
      agent: { id: agent.id, name: agent.name },
      mentorId: mentor.id,
      mentor: { id: mentor.id, name: mentor.name },
      schoolId: school.id,
      school: { id: school.id, name: school.name },
      isPaid,
      paymentAmount: isPaid ? Math.round((Math.random() * 5000 + 500) * 100) / 100 : null,
      paymentPaidAt: paidAt,
      paymentContact: isPaid ? `对接人${(idx % 9) + 1}` : null,
      createdAt: randomDate(start, end),
      groupAuditsCount: idx % 5 === 0 ? 2 : 0,
      paymentRecordsCount: isPaid ? 1 : 0,
    }
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

const ALL_USERS = generateUsers()

// Story 5.3：演示 INVALID / FAILED 分布（迁移验证报告）
;(function seedVerifyEdgeCases() {
  const a = ALL_USERS.find((u) => u.id === 3)
  if (a) {
    a.codeVerifyStatus = 'INVALID'
    a.invalidRetained = false
  }
  const b = ALL_USERS.find((u) => u.id === 5)
  if (b) {
    b.codeVerifyStatus = 'FAILED'
  }
  const c = ALL_USERS.find((u) => u.id === 9)
  if (c) {
    c.codeVerifyStatus = 'INVALID'
    c.rightLeopardCode = 'INV-MIG-009'
    c.invalidRetained = false
  }
})()

// ─── In-memory created users storage ─────────────────────────────────────────

let nextId = ALL_USERS.length + 1
const CREATED_USERS: MockUser[] = []

/** 历史迁移等 Mock 写入新用户（Story 5.1） */
export function takeNextMockUserId(): number {
  return nextId++
}

export function insertCreatedMockUser(user: MockUser): void {
  CREATED_USERS.unshift(user)
}

function filterMergedUsersForExport(body: Record<string, unknown>): MockUser[] {
  let filtered = [...CREATED_USERS, ...ALL_USERS]
  const codeExact = String(body.rightLeopardCode ?? '').trim()
  if (codeExact) {
    const c = codeExact.toUpperCase()
    filtered = filtered.filter((u) => u.rightLeopardCode.toUpperCase() === c)
  }
  const keyword = String(body.keyword ?? '').trim()
  if (keyword) {
    const kw = keyword.toLowerCase()
    filtered = filtered.filter(
      (u) =>
        u.larkNickname.toLowerCase().includes(kw) ||
        u.larkPhone.toLowerCase().includes(kw) ||
        u.agent?.name.toLowerCase().includes(kw) ||
        u.mentor?.name.toLowerCase().includes(kw),
    )
  }
  if (body.agentId != null && body.agentId !== '') {
    const id = Number(body.agentId)
    if (!Number.isNaN(id)) filtered = filtered.filter((u) => u.agentId === id)
  }
  if (body.mentorId != null && body.mentorId !== '') {
    const id = Number(body.mentorId)
    if (!Number.isNaN(id)) filtered = filtered.filter((u) => u.mentorId === id)
  }
  if (body.schoolId != null && body.schoolId !== '') {
    const id = Number(body.schoolId)
    if (!Number.isNaN(id)) filtered = filtered.filter((u) => u.schoolId === id)
  }
  if (body.codeVerifyStatus) {
    filtered = filtered.filter((u) => u.codeVerifyStatus === body.codeVerifyStatus)
  }
  if (body.isPaid === true || body.isPaid === false) {
    filtered = filtered.filter((u) => u.isPaid === body.isPaid)
  }
  return filtered
}

function buildUserExportSheet(users: MockUser[]) {
  const headers = [
    '右豹编码',
    '右豹ID',
    '飞书ID',
    '飞书手机号',
    '飞书昵称',
    '所属客服',
    '所属导师',
    '所属门派',
    '编码校验状态',
    '付费状态',
    '付费记录数',
    '录入时间',
  ]
  const rows = users.map((u) => [
    u.rightLeopardCode,
    u.rightLeopardId,
    u.larkId,
    u.larkPhone,
    u.larkNickname,
    u.agent?.name ?? '',
    u.mentor?.name ?? '',
    u.school?.name ?? '',
    u.codeVerifyStatus === 'VERIFIED'
      ? '已验证'
      : u.codeVerifyStatus === 'PENDING_VERIFY'
        ? '待验证'
        : u.codeVerifyStatus === 'INVALID'
          ? '编码无效'
          : '校验未响应',
    u.isPaid ? '付费学员' : '普通用户',
    u.paymentRecordsCount,
    u.createdAt,
  ])
  return { headers, rows }
}

function exportUserFileName() {
  const d = new Date()
  const z = (n: number) => String(n).padStart(2, '0')
  return `用户主档_导出_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}.xlsx`
}

// ─── Mock Endpoints ───────────────────────────────────────────────────────────

export default [
  // GET /api/v1/users — paginated list with filtering
  {
    url: '/api/v1/users',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const {
        page = '1',
        pageSize = '20',
        keyword = '',
        rightLeopardCode = '',
        agentId,
        mentorId,
        schoolId,
        codeVerifyStatus,
        isPaid,
      } = options.query

      // Merge seed data with in-session created users (newest first)
      let filtered = [...CREATED_USERS, ...ALL_USERS]

      const codeQ = String(rightLeopardCode ?? '').trim()
      if (codeQ) {
        const c = codeQ.toUpperCase()
        filtered = filtered.filter((u) => u.rightLeopardCode.toUpperCase() === c)
      }

      if (keyword) {
        const kw = keyword.toLowerCase()
        filtered = filtered.filter(
          (u) =>
            u.larkNickname.toLowerCase().includes(kw) ||
            u.larkPhone.toLowerCase().includes(kw) ||
            u.agent?.name.toLowerCase().includes(kw) ||
            u.mentor?.name.toLowerCase().includes(kw),
        )
      }
      if (agentId) {
        filtered = filtered.filter((u) => u.agentId === Number(agentId))
      }
      if (mentorId) {
        filtered = filtered.filter((u) => u.mentorId === Number(mentorId))
      }
      if (schoolId) {
        filtered = filtered.filter((u) => u.schoolId === Number(schoolId))
      }
      if (codeVerifyStatus) {
        filtered = filtered.filter((u) => u.codeVerifyStatus === codeVerifyStatus)
      }
      if (isPaid !== undefined && isPaid !== '') {
        const paid = isPaid === 'true'
        filtered = filtered.filter((u) => u.isPaid === paid)
      }

      const total = filtered.length
      const pageNum = Math.max(1, parseInt(page))
      const pageSizeNum = Math.max(1, parseInt(pageSize))
      const items = filtered
        .slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum)
        .map((u) => {
          const y = ensureYoubao(u)
          return {
            ...u,
            projectRevenue: u.isPaid ? u.paymentAmount : y.projectRevenue,
          }
        })

      return {
        code: 0,
        message: 'success',
        data: {
          items,
          total,
          page: pageNum,
          pageSize: pageSizeNum,
        },
      }
    },
  },

  // POST /api/v1/users/export — 异步导出（须在 /users/:id 之前注册路径语义）
  {
    url: '/api/v1/users/export',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      const exportId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      registerExportJobProcessing(exportId)
      const snapshot = { ...(options.body ?? {}) }
      setTimeout(() => {
        try {
          const filtered = filterMergedUsersForExport(snapshot)
          const { headers, rows } = buildUserExportSheet(filtered)
          completeExportJob(exportId, {
            fileName: exportUserFileName(),
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            downloadUrl: `/api/v1/exports/${exportId}/file`,
            sheet: { headers, rows },
          })
        } catch {
          failExportJob(exportId, '导出处理失败')
        }
      }, 720)
      return { code: 0, message: 'success', data: { exportId } }
    },
  },

  // GET /api/v1/users/options — filter dropdown options
  {
    url: '/api/v1/users/options',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: {
        agents: MOCK_AGENTS,
        mentors: MOCK_MENTORS,
        schools: MOCK_SCHOOLS,
      },
    }),
  },

  // POST /api/v1/users/verify-code — validate a 右豹 code (Story 4-2)
  {
    url: '/api/v1/users/verify-code',
    method: 'post',
    response: (options: { body: { code: string } }) => {
      const { code } = options.body ?? {}
      if (!code) {
        return { code: 400, message: '编码不能为空', data: null }
      }

      // Simulate: codes starting with "RB" are valid, "ERR" returns invalid, "TO" simulates timeout
      if (code.toUpperCase().startsWith('TO')) {
        return { code: 422, message: '校验服务暂时无响应，请稍后重试', data: null }
      }

      const alreadyExists = [...ALL_USERS, ...CREATED_USERS].some(
        (u) => u.rightLeopardCode === code,
      )
      if (alreadyExists) {
        return {
          code: 0,
          message: 'success',
          data: { valid: false, message: '该编码已存在于系统，请查看已有记录' },
        }
      }

      if (code.toUpperCase().startsWith('ERR') || code.length < 3) {
        return {
          code: 0,
          message: 'success',
          data: { valid: false, message: '该编码在右豹平台不存在，请与用户核实后重新填写' },
        }
      }

      return {
        code: 0,
        message: 'success',
        data: { valid: true },
      }
    },
  },

  // GET /api/v1/users/:id/audit-logs — 详情页内嵌日志（cursor 分页，Story 4-8）
  {
    url: '/api/v1/users/:id/audit-logs',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      if (Number.isNaN(id) || !findMockUser(id)) {
        return { code: 10002, message: '用户不存在', data: null }
      }
      const cursor = options.query.cursor ?? '0'
      const offset = parseInt(cursor, 10) || 0
      const page = userAuditRows(id, offset, 20)
      return { code: 0, message: 'success', data: page }
    },
  },

  // POST /api/v1/users/:id/sync-youbao — 入队语义 Mock（Story 4-4 / 4-8）
  {
    url: '/api/v1/users/:id/sync-youbao',
    method: 'post',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      const user = findMockUser(id)
      if (!user) {
        return { code: 10002, message: '用户不存在', data: null }
      }
      if (isYoubaoApiSimulatedDown()) {
        return {
          code: 50301,
          message: '右豹 APP 暂时不可用，请稍后重试',
          data: null,
        }
      }
      if (
        user.codeVerifyStatus === 'PENDING_VERIFY' ||
        user.codeVerifyStatus === 'INVALID' ||
        user.codeVerifyStatus === 'FAILED'
      ) {
        return {
          code: 400,
          message: '编码待验证通过后方可同步右豹动作数据',
          data: null,
        }
      }
      const y = ensureYoubao(user)
      y.state = 'live'
      y.lastSyncedAt = new Date().toISOString()
      y.keywordCount += Math.floor(Math.random() * 3) + 1
      y.orderCount += Math.floor(Math.random() * 2)
      return { code: 0, message: 'success', data: { status: 'queued' as const } }
    },
  },

  // GET /api/v1/users/:id — user detail（Story 4-3 / 4-8 扩展）
  {
    url: '/api/v1/users/:id',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      if (Number.isNaN(id)) {
        return { code: 400, message: '无效的用户 ID', data: null }
      }
      const user = findMockUser(id)
      if (!user) {
        return { code: 10002, message: '用户不存在', data: null }
      }
      return { code: 0, message: 'success', data: toDetailPayload(user) }
    },
  },

  // PATCH /api/v1/users/:id — update user (Story 4-3)
  {
    url: '/api/v1/users/:id',
    method: 'patch',
    response: (options: {
      query: Record<string, string>
      body: Record<string, unknown>
    }) => {
      const id = parseInt(options.query.id)
      if (isNaN(id)) {
        return { code: 400, message: '无效的用户 ID', data: null }
      }

      // Find in created users first, then seed users
      let targetList: MockUser[] = CREATED_USERS
      let userIdx = CREATED_USERS.findIndex((u) => u.id === id)
      if (userIdx === -1) {
        targetList = ALL_USERS
        userIdx = ALL_USERS.findIndex((u) => u.id === id)
      }
      if (userIdx === -1) {
        return { code: 10002, message: '用户不存在', data: null }
      }

      const user = targetList[userIdx]
      const dto = options.body ?? {}

      const beforeSnap = userAuditSnapshot(JSON.parse(JSON.stringify(user)) as MockUser)

      // Apply editable fields
      if (dto.rightLeopardId !== undefined) user.rightLeopardId = String(dto.rightLeopardId ?? '')
      if (dto.larkId !== undefined) user.larkId = String(dto.larkId ?? '')
      if (dto.larkPhone !== undefined) user.larkPhone = String(dto.larkPhone ?? '')
      if (dto.larkNickname !== undefined) user.larkNickname = String(dto.larkNickname ?? '')

      if (dto.rightLeopardCode !== undefined) {
        const newCode = String(dto.rightLeopardCode ?? '').trim()
        if (newCode && newCode !== user.rightLeopardCode) {
          const taken = [...ALL_USERS, ...CREATED_USERS].some(
            (x) =>
              x.id !== user.id &&
              x.rightLeopardCode.toLowerCase() === newCode.toLowerCase(),
          )
          if (taken) {
            return { code: 20003, message: '该右豹编码已被录入', data: null }
          }
          user.rightLeopardCode = newCode
        }
      }

      if (dto.codeVerifyStatus !== undefined) {
        const v = String(dto.codeVerifyStatus)
        if (v === 'VERIFIED' || v === 'PENDING_VERIFY' || v === 'INVALID' || v === 'FAILED') {
          user.codeVerifyStatus = v as CodeVerifyStatus
        }
      }

      if (dto.invalidRetained !== undefined) {
        user.invalidRetained = Boolean(dto.invalidRetained)
      }

      if (dto.agentId !== undefined) {
        const agentId = dto.agentId ? Number(dto.agentId) : 0
        const agent = MOCK_AGENTS.find((a) => a.id === agentId)
        user.agentId = agentId
        user.agent = agent ? { id: agent.id, name: agent.name } : { id: 0, name: '' }
      }
      if (dto.mentorId !== undefined) {
        const mentorId = dto.mentorId ? Number(dto.mentorId) : 0
        const mentor = MOCK_MENTORS.find((m) => m.id === mentorId)
        user.mentorId = mentorId
        user.mentor = mentor ? { id: mentor.id, name: mentor.name } : { id: 0, name: '' }
        if (mentor) {
          const school = MOCK_SCHOOLS.find((s) => s.id === mentor.schoolId)
          user.schoolId = mentor.schoolId
          user.school = school ? { id: school.id, name: school.name } : { id: 0, name: '' }
        }
      }
      if (dto.schoolId !== undefined && dto.mentorId === undefined) {
        const schoolId = dto.schoolId ? Number(dto.schoolId) : 0
        const school = MOCK_SCHOOLS.find((s) => s.id === schoolId)
        user.schoolId = schoolId
        user.school = school ? { id: school.id, name: school.name } : { id: 0, name: '' }
      }

      appendMockAuditLog({
        tableName: 'users',
        actionType: 'UPDATE',
        recordId: String(id),
        beforeData: beforeSnap,
        afterData: userAuditSnapshot(user),
      })

      return {
        code: 0,
        message: 'success',
        data: { ...user, projectRevenue: user.isPaid ? user.paymentAmount : null },
      }
    },
  },

  // DELETE /api/v1/users/:id — delete user (Story 4-3)
  {
    url: '/api/v1/users/:id',
    method: 'delete',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(options.query.id)
      if (isNaN(id)) {
        return { code: 400, message: '无效的用户 ID', data: null }
      }

      // Check in created users first, then seed data
      let userIdx = CREATED_USERS.findIndex((u) => u.id === id)
      if (userIdx !== -1) {
        const user = CREATED_USERS[userIdx]
        if (user.groupAuditsCount > 0 || user.paymentRecordsCount > 0) {
          return {
            code: 10003,
            message: `该用户有 ${user.groupAuditsCount} 条入群审核记录和 ${user.paymentRecordsCount} 条付费记录，请先删除关联记录`,
            data: null,
          }
        }
        const delSnap = userAuditSnapshot(JSON.parse(JSON.stringify(user)) as MockUser)
        appendMockAuditLog({
          tableName: 'users',
          actionType: 'DELETE',
          recordId: String(id),
          beforeData: delSnap,
          afterData: null,
        })
        CREATED_USERS.splice(userIdx, 1)
        return { code: 0, message: 'success', data: null }
      }

      const allIdx = ALL_USERS.findIndex((u) => u.id === id)
      if (allIdx === -1) {
        return { code: 10002, message: '用户不存在', data: null }
      }
      const seedUser = ALL_USERS[allIdx]
      if (seedUser.groupAuditsCount > 0 || seedUser.paymentRecordsCount > 0) {
        return {
          code: 10003,
          message: `该用户有 ${seedUser.groupAuditsCount} 条入群审核记录和 ${seedUser.paymentRecordsCount} 条付费记录，请先删除关联记录`,
          data: null,
        }
      }
      const seedSnap = userAuditSnapshot(JSON.parse(JSON.stringify(seedUser)) as MockUser)
      appendMockAuditLog({
        tableName: 'users',
        actionType: 'DELETE',
        recordId: String(id),
        beforeData: seedSnap,
        afterData: null,
      })
      ALL_USERS.splice(allIdx, 1)
      return { code: 0, message: 'success', data: null }
    },
  },

  // POST /api/v1/users — create user (Story 4-2)
  {
    url: '/api/v1/users',
    method: 'post',
    response: (options: {
      body: {
        rightLeopardCode: string
        rightLeopardId?: string
        larkId?: string
        larkPhone?: string
        larkNickname?: string
        agentId?: number
        mentorId?: number
        schoolId?: number
        skipVerify?: boolean
      }
    }) => {
      const dto = options.body ?? {}

      // Uniqueness check
      const alreadyExists = [...ALL_USERS, ...CREATED_USERS].some(
        (u) => u.rightLeopardCode === dto.rightLeopardCode,
      )
      if (alreadyExists) {
        return { code: 20003, message: '该右豹编码已被录入', data: null }
      }

      const agent = MOCK_AGENTS.find((a) => a.id === dto.agentId) ?? null
      const mentor = MOCK_MENTORS.find((m) => m.id === dto.mentorId) ?? null
      const school = mentor
        ? MOCK_SCHOOLS.find((s) => s.id === mentor.schoolId) ?? null
        : MOCK_SCHOOLS.find((s) => s.id === dto.schoolId) ?? null

      const newUser: MockUser = {
        id: nextId++,
        rightLeopardCode: dto.rightLeopardCode,
        rightLeopardId: dto.rightLeopardId ?? '',
        larkId: dto.larkId ?? '',
        larkNickname: dto.larkNickname ?? '',
        larkPhone: dto.larkPhone ?? '',
        codeVerifyStatus: dto.skipVerify ? 'PENDING_VERIFY' : 'VERIFIED',
        agentId: dto.agentId ?? 0,
        agent: agent ? { id: agent.id, name: agent.name } : { id: 0, name: '' },
        mentorId: dto.mentorId ?? 0,
        mentor: mentor ? { id: mentor.id, name: mentor.name } : { id: 0, name: '' },
        schoolId: school?.id ?? dto.schoolId ?? 0,
        school: school ? { id: school.id, name: school.name } : { id: 0, name: '' },
        isPaid: false,
        paymentAmount: null,
        paymentPaidAt: null,
        paymentContact: null,
        createdAt: new Date().toISOString(),
        groupAuditsCount: 0,
        paymentRecordsCount: 0,
      }

      CREATED_USERS.unshift(newUser)

      return {
        code: 0,
        message: 'success',
        data: { ...newUser, projectRevenue: null as number | null },
      }
    },
  },
] as MockMethod[]
