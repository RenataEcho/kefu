import type { MockMethod } from 'vite-plugin-mock'
import type { AuditActionType, AuditLogItem } from '@/types/auditLog'

const TABLES = ['users', 'payment_records', 'group_audits', 'agents', 'mentors', 'schools'] as const

const ACTIONS: AuditActionType[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'AUDIT_APPROVE',
  'AUDIT_REJECT',
  'ARCHIVE',
  'IMPORT',
  'EXPORT',
]

const OPS = ['系统管理员', '王运营', '李审核', '张客服', '赵导师']

function seedLogs(): AuditLogItem[] {
  const out: AuditLogItem[] = []
  const base = new Date('2026-03-01').getTime()
  for (let i = 0; i < 48; i++) {
    const tableName = TABLES[i % TABLES.length]
    const actionType = ACTIONS[i % ACTIONS.length]
    const recordId = String((i % 12) + 1)
    const t = new Date(base + i * 3600000 * 3 + i * 120000).toISOString()
    out.push({
      id: `log-${i + 1}`,
      operatedAt: t,
      operatorName: OPS[i % OPS.length],
      tableName,
      actionType,
      recordId,
      beforeData:
        actionType === 'CREATE'
          ? null
          : { status: 'PENDING', note: `before-${i}`, updatedAt: t },
      afterData:
        actionType === 'DELETE'
          ? null
          : { status: actionType.includes('AUDIT') ? 'APPROVED' : 'ACTIVE', note: `after-${i}` },
    })
  }
  return out.reverse()
}

let allLogs: AuditLogItem[] = seedLogs()

/** 供其他 Mock（如 users PATCH/DELETE）追加一条审计记录，满足 Story 4-3 AC#2 */
export function appendMockAuditLog(
  partial: Omit<AuditLogItem, 'id' | 'operatedAt' | 'operatorName'> & {
    id?: string
    operatedAt?: string
    operatorName?: string
  },
): AuditLogItem {
  const id =
    partial.id ?? `log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const item: AuditLogItem = {
    id,
    operatedAt: partial.operatedAt ?? new Date().toISOString(),
    operatorName: partial.operatorName ?? '当前操作员',
    tableName: partial.tableName,
    actionType: partial.actionType,
    recordId: partial.recordId,
    beforeData: partial.beforeData ?? null,
    afterData: partial.afterData ?? null,
  }
  allLogs.unshift(item)
  return item
}

function parseId(url: string): string {
  const seg = url.split('/').filter(Boolean).pop() ?? ''
  return seg.split('?')[0]
}

export default [
  {
    url: '/api/v1/audit-logs',
    method: 'get',
    response: ({ query }: { query: Record<string, string> }) => {
      let list = [...allLogs]

      const tableName = query.tableName
      if (tableName) list = list.filter((l) => l.tableName === tableName)

      const recordId = query.recordId
      if (recordId != null && recordId !== '') {
        list = list.filter((l) => l.recordId === String(recordId))
      }

      const actionType = query.actionType
      if (actionType) list = list.filter((l) => l.actionType === actionType)

      const start = query.startDate
      const end = query.endDate
      if (start) {
        const ts = new Date(start).getTime()
        list = list.filter((l) => new Date(l.operatedAt).getTime() >= ts)
      }
      if (end) {
        const ts = new Date(end).getTime()
        list = list.filter((l) => new Date(l.operatedAt).getTime() <= ts)
      }

      list.sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime())

      const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10) || 20))
      const total = list.length
      const startIdx = (page - 1) * pageSize
      const slice = list.slice(startIdx, startIdx + pageSize)

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
    url: '/api/v1/audit-logs/:id',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const id = parseId(url)
      const row = allLogs.find((l) => l.id === id)
      if (!row) return { code: 40400, message: '日志不存在', data: null }
      return { code: 0, message: 'success', data: row }
    },
  },
] as MockMethod[]
