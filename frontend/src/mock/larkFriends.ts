import type { MockMethod } from 'vite-plugin-mock'
import type {
  LarkAuthorizedOperatorOption,
  LarkFriendPriorityRow,
  LarkFriendPriorityResponse,
  LarkOauthSummary,
} from '@/types/larkFriends'
import { mockApplyAgentLarkOAuth, mockCsAgentsList } from './csAgents'
import { mockApplyMentorLarkOAuth, orgMentors } from './organizationData'
import { findMockUser, getMergedMockUsers } from './users'

type Fr = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT' | 'MANUAL_CONFIRMED'

interface InternalRow {
  userId: number
  groupKey: 'PENDING_JOIN' | 'AUDITING'
  keywordCount: number
  friendRequestStatus: Fr
  applyTime: string | null
  rejectedAt: string | null
  rejectedCount: number
  abandoned: boolean
}

const monthlySends: Record<string, number> = {}

function monthKey(op: 'agent' | 'mentor', id: number) {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}:${op}:${id}`
}

function bumpMonthly(op: 'agent' | 'mentor', id: number) {
  const k = monthKey(op, id)
  monthlySends[k] = (monthlySends[k] ?? 0) + 1
}

function getMonthly(op: 'agent' | 'mentor', id: number) {
  return monthlySends[monthKey(op, id)] ?? 0
}

function seedRows(): InternalRow[] {
  const users = getMergedMockUsers()
  const slice = users.slice(0, 20)
  return slice.map((u, i) => {
    const groupKey: 'PENDING_JOIN' | 'AUDITING' = i % 3 !== 2 ? 'PENDING_JOIN' : 'AUDITING'
    let friendRequestStatus: Fr = 'NONE'
    let applyTime: string | null = null
    let rejectedAt: string | null = null
    let rejectedCount = 0

    if (i % 11 === 0) {
      friendRequestStatus = 'PENDING'
      applyTime = new Date(Date.now() - (i + 1) * 3600000 * 6).toISOString()
    } else if (i % 11 === 1) {
      friendRequestStatus = 'ACCEPTED'
      applyTime = new Date(Date.now() - 86400000 * 2).toISOString()
    } else if (i % 11 === 4) {
      friendRequestStatus = 'MANUAL_CONFIRMED'
      applyTime = new Date(Date.now() - 86400000).toISOString()
    } else if (i % 11 === 2) {
      friendRequestStatus = 'TIMEOUT'
      applyTime = new Date(Date.now() - 86400000 * 9).toISOString()
    } else if (i % 11 === 3) {
      friendRequestStatus = 'REJECTED'
      rejectedAt = new Date(Date.now() - 86400000 * 3).toISOString()
      rejectedCount = 1
      applyTime = new Date(Date.now() - 86400000 * 5).toISOString()
    }

    return {
      userId: u.id,
      groupKey,
      keywordCount: 3 + (i % 17) * 2,
      friendRequestStatus,
      applyTime,
      rejectedAt,
      rejectedCount,
      abandoned: false,
    }
  })
}

let rows: InternalRow[] = seedRows()

function toDto(r: InternalRow): LarkFriendPriorityRow | null {
  const u = findMockUser(r.userId)
  if (!u) return null
  const groupAuditLabel = r.groupKey === 'PENDING_JOIN' ? '待入群' : '审核中'
  return {
    userId: r.userId,
    rightLeopardCode: u.rightLeopardCode,
    larkNickname: u.larkNickname,
    groupKey: r.groupKey,
    groupAuditLabel,
    keywordCount: r.keywordCount,
    friendRequestStatus: r.friendRequestStatus,
    applyTime: r.applyTime,
    userCreatedAt: u.createdAt,
    rejectedAt: r.rejectedAt,
    rejectedCount: r.rejectedCount,
  }
}

function userCreatedAtMs(userId: number) {
  const u = findMockUser(userId)
  return u ? new Date(u.createdAt).getTime() : 0
}

function sortPriorityList(list: InternalRow[]) {
  return [...list].sort((a, b) => {
    const ga = a.groupKey === 'PENDING_JOIN' ? 0 : 1
    const gb = b.groupKey === 'PENDING_JOIN' ? 0 : 1
    if (ga !== gb) return ga - gb
    if (b.keywordCount !== a.keywordCount) return b.keywordCount - a.keywordCount
    const ta = a.applyTime ? new Date(a.applyTime).getTime() : Number.MAX_SAFE_INTEGER
    const tb = b.applyTime ? new Date(b.applyTime).getTime() : Number.MAX_SAFE_INTEGER
    if (ta !== tb) return ta - tb
    return userCreatedAtMs(b.userId) - userCreatedAtMs(a.userId)
  })
}

function buildPriorityResponse(includeTimeout: boolean): LarkFriendPriorityResponse {
  const manual: InternalRow[] = []
  const mainPool: InternalRow[] = []

  for (const r of rows) {
    if (r.abandoned) continue
    if (r.friendRequestStatus === 'REJECTED') {
      manual.push(r)
      continue
    }
    if (r.friendRequestStatus === 'TIMEOUT' && !includeTimeout) {
      continue
    }
    mainPool.push(r)
  }

  const sorted = sortPriorityList(mainPool)
  const pendingJoin = sorted.filter((x) => x.groupKey === 'PENDING_JOIN')
  const auditing = sorted.filter((x) => x.groupKey === 'AUDITING')
  const timeoutCount = rows.filter((x) => !x.abandoned && x.friendRequestStatus === 'TIMEOUT').length

  return {
    pendingJoin: pendingJoin.map((x) => toDto(x)!).filter(Boolean),
    auditing: auditing.map((x) => toDto(x)!).filter(Boolean),
    manualDecision: sortPriorityList(manual)
      .map((x) => toDto(x)!)
      .filter(Boolean),
    timeoutCount,
  }
}

function oauthSummary(): LarkOauthSummary {
  const now = Date.now()
  const authAgents = mockCsAgentsList.filter(
    (a) => a.larkOauthExpiresAt != null && new Date(a.larkOauthExpiresAt).getTime() > now,
  )
  const expiredAgents = mockCsAgentsList.filter(
    (a) => a.larkOauthExpiresAt != null && new Date(a.larkOauthExpiresAt).getTime() <= now,
  )
  const authMentors = orgMentors.filter(
    (m) => m.larkOauthExpiresAt != null && new Date(m.larkOauthExpiresAt).getTime() > now,
  )
  const hasAny = authAgents.length + authMentors.length > 0
  let operatorHint: LarkOauthSummary['operatorHint'] = 'ok'
  if (!hasAny) {
    operatorHint = expiredAgents.length > 0 ? 'expired' : 'none'
  }
  return {
    hasAnyAuthorized: hasAny,
    authorizedAgentCount: authAgents.length,
    authorizedMentorCount: authMentors.length,
    operatorHint,
  }
}

function authorizedOperatorOptions(): LarkAuthorizedOperatorOption[] {
  const now = Date.now()
  const out: LarkAuthorizedOperatorOption[] = []
  for (const a of mockCsAgentsList) {
    if (a.status === 'DISABLED') continue
    const exp = a.larkOauthExpiresAt ? new Date(a.larkOauthExpiresAt).getTime() : 0
    const expired = !a.larkOauthExpiresAt || exp <= now
    out.push({
      id: a.id,
      name: a.name,
      type: 'agent',
      expired,
      monthlySendCount: getMonthly('agent', a.id),
    })
  }
  for (const m of orgMentors) {
    if (m.status === 'DISABLED') continue
    const exp = m.larkOauthExpiresAt ? new Date(m.larkOauthExpiresAt).getTime() : 0
    const expired = !m.larkOauthExpiresAt || exp <= now
    out.push({
      id: m.id,
      name: m.name,
      type: 'mentor',
      expired,
      monthlySendCount: getMonthly('mentor', m.id),
    })
  }
  return out.sort((x, y) => {
    if (x.expired !== y.expired) return x.expired ? 1 : -1
    return x.name.localeCompare(y.name, 'zh-CN')
  })
}

export default [
  {
    url: '/api/v1/lark-friends/priority-list',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const includeTimeout = opt.query.includeTimeout === 'true'
      const data = buildPriorityResponse(includeTimeout)
      return { code: 0, message: 'success', data }
    },
  },

  {
    url: '/api/v1/lark-friends/oauth-summary',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: oauthSummary(),
    }),
  },

  {
    url: '/api/v1/lark-friends/authorized-operators',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: authorizedOperatorOptions(),
    }),
  },

  {
    url: '/api/v1/lark/oauth/mock-complete',
    method: 'post',
    response: (opt: { body?: Record<string, unknown> }) => {
      const type = opt.body?.type === 'mentor' ? 'mentor' : 'agent'
      const id = typeof opt.body?.id === 'number' ? opt.body.id : parseInt(String(opt.body?.id), 10)
      const displayName =
        typeof opt.body?.displayName === 'string' && opt.body.displayName.trim()
          ? String(opt.body.displayName).trim()
          : type === 'agent'
            ? `客服#${id}（飞书）`
            : `导师#${id}（飞书）`
      if (!id || Number.isNaN(id)) {
        return { code: 400, message: '缺少 id', data: null }
      }
      const ok =
        type === 'agent'
          ? mockApplyAgentLarkOAuth(id, displayName, 30)
          : mockApplyMentorLarkOAuth(id, displayName, 30)
      if (!ok) return { code: 10002, message: '账号不存在', data: null }
      return { code: 0, message: 'success', data: { type, id, displayName } }
    },
  },

  {
    url: '/api/v1/lark-friends/send-request',
    method: 'post',
    response: (opt: { body?: Record<string, unknown> }) => {
      const userId =
        typeof opt.body?.userId === 'number' ? opt.body.userId : parseInt(String(opt.body?.userId), 10)
      const operatorType = opt.body?.operatorType === 'mentor' ? 'mentor' : 'agent'
      const operatorId =
        typeof opt.body?.operatorId === 'number'
          ? opt.body.operatorId
          : parseInt(String(opt.body?.operatorId), 10)
      if (!userId || Number.isNaN(userId)) {
        return { code: 400, message: '缺少 userId', data: null }
      }
      if (!operatorId || Number.isNaN(operatorId)) {
        return { code: 400, message: '缺少 operatorId', data: null }
      }
      const now = Date.now()
      if (operatorType === 'agent') {
        const a = mockCsAgentsList.find((x) => x.id === operatorId)
        if (!a) return { code: 10002, message: '客服不存在', data: null }
        if (!a.larkOauthExpiresAt || new Date(a.larkOauthExpiresAt).getTime() <= now) {
          return { code: 30002, message: '该账号飞书授权已过期，请重新授权', data: null }
        }
      } else {
        const m = orgMentors.find((x) => x.id === operatorId)
        if (!m) return { code: 10002, message: '导师不存在', data: null }
        if (!m.larkOauthExpiresAt || new Date(m.larkOauthExpiresAt).getTime() <= now) {
          return { code: 30002, message: '该账号飞书授权已过期，请重新授权', data: null }
        }
      }

      if (Math.random() < 0.08) {
        return {
          code: 30003,
          message: '飞书 API 返回 rate limit，请稍后重试',
          data: { status: 'FAILED' as const },
        }
      }

      const row = rows.find((r) => r.userId === userId)
      if (row) {
        row.friendRequestStatus = 'PENDING'
        row.applyTime = new Date().toISOString()
        row.rejectedAt = null
        row.rejectedCount = row.rejectedCount
      }
      bumpMonthly(operatorType, operatorId)
      return {
        code: 0,
        message: 'success',
        data: {
          status: 'PENDING' as const,
          operatorName:
            operatorType === 'agent'
              ? mockCsAgentsList.find((x) => x.id === operatorId)?.name ?? ''
              : orgMentors.find((x) => x.id === operatorId)?.name ?? '',
        },
      }
    },
  },

  {
    url: '/api/v1/lark-friends/mark-added',
    method: 'post',
    response: (opt: { body?: Record<string, unknown> }) => {
      const userId =
        typeof opt.body?.userId === 'number' ? opt.body.userId : parseInt(String(opt.body?.userId), 10)
      if (!userId || Number.isNaN(userId)) return { code: 400, message: '缺少 userId', data: null }
      const row = rows.find((r) => r.userId === userId)
      if (row) {
        row.friendRequestStatus = 'MANUAL_CONFIRMED'
        row.applyTime = row.applyTime ?? new Date().toISOString()
      }
      return { code: 0, message: 'success', data: null }
    },
  },

  {
    url: '/api/v1/lark-friends/:userId/manual-confirm',
    method: 'post',
    response: (opt: { query: Record<string, string> }) => {
      const userId = parseInt(String(opt.query.userId), 10)
      if (Number.isNaN(userId)) return { code: 400, message: '无效的用户', data: null }
      const row = rows.find((r) => r.userId === userId)
      if (!row) return { code: 10002, message: '记录不存在', data: null }
      row.friendRequestStatus = 'MANUAL_CONFIRMED'
      row.applyTime = row.applyTime ?? new Date().toISOString()
      return { code: 0, message: 'success', data: { status: 'MANUAL_CONFIRMED' as const } }
    },
  },

  {
    url: '/api/v1/lark-friends/decision-required',
    method: 'get',
    response: () => {
      const manual = rows.filter((r) => !r.abandoned && r.friendRequestStatus === 'REJECTED')
      const sorted = sortPriorityList(manual)
      return {
        code: 0,
        message: 'success',
        data: sorted.map((x) => toDto(x)!).filter(Boolean),
      }
    },
  },

  {
    url: '/api/v1/lark-friends/dev/simulate-friend-status',
    method: 'post',
    response: (opt: { body?: Record<string, unknown> }) => {
      const userId =
        typeof opt.body?.userId === 'number' ? opt.body.userId : parseInt(String(opt.body?.userId), 10)
      const status = String(opt.body?.status ?? '')
      if (!userId || Number.isNaN(userId)) return { code: 400, message: '缺少 userId', data: null }
      if (!['ACCEPTED', 'REJECTED', 'TIMEOUT'].includes(status)) {
        return { code: 400, message: 'status 须为 ACCEPTED | REJECTED | TIMEOUT', data: null }
      }
      const row = rows.find((r) => r.userId === userId)
      if (!row) return { code: 10002, message: '记录不存在', data: null }
      if (status === 'ACCEPTED') {
        row.friendRequestStatus = 'ACCEPTED'
      } else if (status === 'REJECTED') {
        row.friendRequestStatus = 'REJECTED'
        row.rejectedAt = new Date().toISOString()
        row.rejectedCount = (row.rejectedCount ?? 0) + 1
      } else {
        row.friendRequestStatus = 'TIMEOUT'
      }
      return { code: 0, message: 'success', data: { friendRequestStatus: row.friendRequestStatus } }
    },
  },

  {
    url: '/api/v1/lark-friends/reapply',
    method: 'post',
    response: (opt: { body?: Record<string, unknown> }) => {
      const userId =
        typeof opt.body?.userId === 'number' ? opt.body.userId : parseInt(String(opt.body?.userId), 10)
      if (!userId || Number.isNaN(userId)) return { code: 400, message: '缺少 userId', data: null }
      const row = rows.find((r) => r.userId === userId)
      if (row) {
        row.friendRequestStatus = 'NONE'
        row.applyTime = null
        row.rejectedAt = null
      }
      return { code: 0, message: 'success', data: null }
    },
  },

  {
    url: '/api/v1/lark-friends/:userId/abandon',
    method: 'post',
    response: (opt: { query: Record<string, string> }) => {
      const userId = parseInt(String(opt.query.userId), 10)
      if (Number.isNaN(userId)) return { code: 400, message: '缺少 userId', data: null }
      const row = rows.find((r) => r.userId === userId)
      if (row) {
        row.abandoned = true
      }
      return { code: 0, message: 'success', data: { status: 'ABANDONED' as const } }
    },
  },

  {
    url: '/api/v1/lark-friends/abandon',
    method: 'post',
    response: (opt: { body?: Record<string, unknown> }) => {
      const userId =
        typeof opt.body?.userId === 'number' ? opt.body.userId : parseInt(String(opt.body?.userId), 10)
      if (!userId || Number.isNaN(userId)) return { code: 400, message: '缺少 userId', data: null }
      const row = rows.find((r) => r.userId === userId)
      if (row) {
        row.abandoned = true
      }
      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
