import type { MockMethod } from 'vite-plugin-mock'
import type {
  NotificationAuditType,
  NotificationChannel,
  NotificationRecipientType,
  NotificationRow,
  NotificationScenario,
  NotificationStatus,
} from '@/types/notification'

const SCENARIOS: NotificationScenario[] = [
  'AUDIT_APPROVED',
  'AUDIT_REJECTED',
  'SLA_ALERT_FIRST',
  'SLA_ALERT_SECOND',
]

const STATUSES: NotificationStatus[] = ['SENT', 'FAILED', 'PENDING']

const CHANNELS: NotificationChannel[] = ['WECHAT', 'LARK']

const FAILURE_REASONS = ['未绑定 OpenID', '推送超时', '服务异常', null] as const

const MOCK_USER_RECIPIENT_NAMES = [
  '周海燕',
  '赵敏',
  '林晓',
  '陈晨',
  '刘洋',
  '孙悦',
  '马超',
  '黄蕾',
]

const MOCK_AGENT_RECIPIENT_NAMES = [
  '王小明',
  '张闭环',
  '李审核',
  '系统管理员',
  '付费对接-周婷',
]

function seedRows(): NotificationRow[] {
  const base = new Date('2026-03-01T08:00:00.000Z').getTime()
  const rows: NotificationRow[] = []
  for (let i = 0; i < 42; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length]
    let status: NotificationStatus = STATUSES[i % STATUSES.length]
    if (scenario === 'SLA_ALERT_FIRST' || scenario === 'SLA_ALERT_SECOND') {
      status = i % 5 === 0 ? 'FAILED' : 'SENT'
    }
    if (i < 4) {
      status = 'PENDING'
    }
    const failureReason =
      status === 'FAILED' ? FAILURE_REASONS[i % FAILURE_REASONS.length] : null
    const t = new Date(base + i * 3700_000 + (i % 7) * 86400000).toISOString()
    const auditType: NotificationAuditType = i % 3 === 0 ? 'entry_audit' : 'group_audit'
    const recipientType: NotificationRecipientType =
      scenario === 'SLA_ALERT_FIRST' || scenario === 'SLA_ALERT_SECOND' ? 'agent' : i % 4 === 0 ? 'agent' : 'user'
    const recipientName =
      recipientType === 'agent'
        ? MOCK_AGENT_RECIPIENT_NAMES[i % MOCK_AGENT_RECIPIENT_NAMES.length]!
        : MOCK_USER_RECIPIENT_NAMES[i % MOCK_USER_RECIPIENT_NAMES.length]!
    rows.push({
      id: `ntf-${1000 + i}`,
      userId: 200 + (i % 18),
      rightLeopardCode: `RB${String(200000 + i * 17).padStart(6, '0')}`,
      recipientType,
      recipientName,
      scenario,
      channel: CHANNELS[i % CHANNELS.length]!,
      status,
      failureReason,
      createdAt: t,
      auditType,
    })
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

let store = seedRows()

export default [
  {
    url: '/api/v1/notifications',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const page = Math.max(1, parseInt(opt.query.page || '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(opt.query.pageSize || '20', 10)))
      const statusFilter = opt.query.status as NotificationStatus | 'all' | undefined
      const codeQ = (opt.query.rightLeopardCode || '').trim()
      const scenarioQ = opt.query.scenario as NotificationScenario | 'all' | undefined
      const channelQ = opt.query.channel as NotificationChannel | 'all' | undefined
      const auditTypeQ = opt.query.auditType as NotificationAuditType | 'all' | undefined
      const recipientTypeQ = opt.query.recipientType as NotificationRecipientType | 'all' | undefined

      let rows = [...store]
      if (statusFilter === 'SENT' || statusFilter === 'FAILED' || statusFilter === 'PENDING') {
        rows = rows.filter((r) => r.status === statusFilter)
      }
      if (codeQ) {
        const c = codeQ.toUpperCase()
        rows = rows.filter((r) => r.rightLeopardCode.toUpperCase() === c)
      }
      if (scenarioQ && scenarioQ !== 'all') {
        rows = rows.filter((r) => r.scenario === scenarioQ)
      }
      if (channelQ && channelQ !== 'all') {
        rows = rows.filter((r) => r.channel === channelQ)
      }
      if (auditTypeQ && auditTypeQ !== 'all') {
        rows = rows.filter((r) => r.auditType === auditTypeQ)
      }
      if (recipientTypeQ && recipientTypeQ !== 'all') {
        rows = rows.filter((r) => r.recipientType === recipientTypeQ)
      }

      const total = rows.length
      const slice = rows.slice((page - 1) * pageSize, page * pageSize)
      return {
        code: 0,
        message: 'success',
        data: { items: slice, total, page, pageSize },
      }
    },
  },
  {
    url: '/api/v1/notifications/:id/push-now',
    method: 'post',
    response: (opt: { query: Record<string, string> }) => {
      const id = String(opt.query?.id ?? '')
      const row = store.find((r) => r.id === id)
      if (!row) return { code: 10002, message: '记录不存在', data: null }
      if (row.status !== 'PENDING') {
        return { code: 400, message: '仅待推送状态可立即推送', data: null }
      }
      row.status = 'SENT'
      row.failureReason = null
      return { code: 0, message: 'success', data: { status: 'SENT' as const } }
    },
  },
  {
    url: '/api/v1/notifications/:id/retry-push',
    method: 'post',
    response: (opt: { query: Record<string, string> }) => {
      const id = String(opt.query?.id ?? '')
      const row = store.find((r) => r.id === id)
      if (!row) return { code: 10002, message: '记录不存在', data: null }
      if (row.status !== 'FAILED' && row.status !== 'PENDING') {
        return { code: 400, message: '当前状态不可重推', data: null }
      }
      row.status = 'SENT'
      row.failureReason = null
      return { code: 0, message: 'success', data: { status: 'SENT' as const } }
    },
  },
] as MockMethod[]
