import type { MockMethod } from 'vite-plugin-mock'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import type { SlaAlertRow } from '@/types/groupAudit'
import type {
  EntryAuditDetail,
  EntryAuditItem,
  EntryAuditLogItem,
  EntryAuditSource,
  EntryAuditStatus,
} from '@/types/entryAudit'

dayjs.extend(utc)
dayjs.extend(timezone)

export const DEFAULT_ENTRY_REJECT_REASON = '您的录入申请未符合要求，请按要求修改后重新提交'

function shotSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect fill="#1e293b" width="160" height="100" rx="8"/><rect x="12" y="12" width="136" height="56" fill="#334155" rx="4"/><text x="80" y="86" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="system-ui">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const AGENTS = [
  { id: 1, name: '王小明' },
  { id: 2, name: '李晓红' },
  { id: 3, name: '张大伟' },
  { id: 4, name: '刘芳芳' },
  { id: 5, name: '陈建国' },
]

function daysAgo(days: number, jitterHours = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() - jitterHours)
  return d.toISOString()
}

type RawEntry = Omit<
  EntryAuditItem,
  'id'
> & {
  id?: number
}

function buildSeed(): EntryAuditItem[] {
  const raw: RawEntry[] = [
    {
      assignedAgentName: AGENTS[0].name,
      assignedAgentId: AGENTS[0].id,
      rightLeopardCode: 'RB020001',
      rightLeopardUserId: 'ylu-10001',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(5, 2),
      source: 'qr_entry',
      status: 'PENDING',
      firstAlertSentAt: daysAgo(4, 0),
      secondAlertSentAt: daysAgo(2, 0),
    },
    {
      assignedAgentName: AGENTS[1].name,
      assignedAgentId: AGENTS[1].id,
      rightLeopardCode: 'RB020002',
      rightLeopardUserId: 'ylu-10002',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(4, 5),
      source: 'admin_import',
      status: 'PENDING',
      firstAlertSentAt: daysAgo(3, 0),
    },
    {
      assignedAgentName: AGENTS[2].name,
      assignedAgentId: AGENTS[2].id,
      rightLeopardCode: 'RB020003',
      rightLeopardUserId: 'ylu-10003',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(1, 1),
      source: 'qr_entry',
      status: 'PENDING',
    },
    {
      assignedAgentName: AGENTS[0].name,
      assignedAgentId: AGENTS[0].id,
      rightLeopardCode: 'RB020004',
      rightLeopardUserId: 'ylu-10004',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(2, 0),
      source: 'admin_import',
      status: 'PROCESSING',
    },
    {
      assignedAgentName: AGENTS[3].name,
      assignedAgentId: AGENTS[3].id,
      rightLeopardCode: 'RB020005',
      rightLeopardUserId: 'ylu-10005',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(12, 0),
      source: 'qr_entry',
      status: 'APPROVED',
      reviewerName: '王小明',
      reviewedAt: daysAgo(11, 2),
    },
    {
      assignedAgentName: AGENTS[4].name,
      assignedAgentId: AGENTS[4].id,
      rightLeopardCode: 'RB020006',
      rightLeopardUserId: 'ylu-10006',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(9, 0),
      source: 'admin_import',
      status: 'REJECTED',
      reviewerName: '李晓红',
      reviewedAt: daysAgo(8, 1),
      rejectReason: '截图不清晰',
    },
    {
      assignedAgentName: AGENTS[1].name,
      assignedAgentId: AGENTS[1].id,
      rightLeopardCode: 'RB020007',
      rightLeopardUserId: 'ylu-10007',
      codeScreenshotUrl: shotSvg('编码截图'),
      idScreenshotUrl: shotSvg('ID截图'),
      applyTime: daysAgo(40, 0),
      source: 'qr_entry',
      status: 'ARCHIVED',
      reviewerName: '张大伟',
      reviewedAt: daysAgo(35, 0),
    },
    ...Array.from({ length: 14 }, (_, i) => {
      const ag = AGENTS[i % AGENTS.length]!
      const n = 8 + i
      return {
        assignedAgentName: ag.name,
        assignedAgentId: ag.id,
        rightLeopardCode: `RB02${String(n).padStart(4, '0')}`,
        rightLeopardUserId: `ylu-${10010 + i}`,
        codeScreenshotUrl: shotSvg('编码截图'),
        idScreenshotUrl: shotSvg('ID截图'),
        applyTime: daysAgo((i % 9) + 1, i % 5),
        source: (i % 2 === 0 ? 'qr_entry' : 'admin_import') as EntryAuditSource,
        status: (i % 7 === 0 ? 'PENDING' : i % 7 === 1 ? 'APPROVED' : 'REJECTED') as EntryAuditStatus,
        reviewerName: i % 7 === 0 ? undefined : '刘芳芳',
        reviewedAt: i % 7 === 0 ? undefined : daysAgo(i % 6, 0),
        rejectReason: i % 7 === 2 ? '资料不完整' : undefined,
        firstAlertSentAt: i % 4 === 0 ? daysAgo(i % 3, 0) : null,
        secondAlertSentAt: i % 8 === 0 ? daysAgo(1, 0) : null,
      } satisfies RawEntry
    }),
  ]

  return raw.map((r, idx) => ({
    ...r,
    id: idx + 1,
  }))
}

let ALL_ENTRY: EntryAuditItem[] = buildSeed()

const ENTRY_LOGS = new Map<number, EntryAuditLogItem[]>()

function seedLogs() {
  ENTRY_LOGS.clear()
  ALL_ENTRY.forEach((r) => {
    const logs: EntryAuditLogItem[] = [
      {
        id: `${r.id}-l1`,
        operatedAt: r.applyTime,
        operatorName: '系统',
        actionType: '创建',
        content:
          r.source === 'qr_entry'
            ? '用户通过专属二维码提交录入申请（Mock）'
            : '后台批量导入生成录入待审记录（Mock）',
      },
    ]
    if (r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'ARCHIVED') {
      logs.unshift({
        id: `${r.id}-l2`,
        operatedAt: r.reviewedAt ?? r.applyTime,
        operatorName: r.reviewerName ?? '审核员',
        actionType: r.status === 'APPROVED' ? '通过' : r.status === 'REJECTED' ? '拒绝' : '归档',
        content:
          r.status === 'REJECTED'
            ? `原因：${r.rejectReason || DEFAULT_ENTRY_REJECT_REASON}`
            : '已处理',
      })
    }
    ENTRY_LOGS.set(r.id, logs)
  })
}

seedLogs()

function prependLog(id: number, log: EntryAuditLogItem) {
  const cur = ENTRY_LOGS.get(id) ?? []
  ENTRY_LOGS.set(id, [log, ...cur])
}

function isPendingLike(s: EntryAuditStatus): boolean {
  return s === 'PENDING' || s === 'PROCESSING'
}

/** 与入群审核一致：第 3 自然日 23:59（Asia/Shanghai）后仍待处理视为超时 */
function isEntryApplyTimeSlaOverdue(applyTime: string): boolean {
  const deadline = dayjs(applyTime).tz('Asia/Shanghai').add(3, 'day').endOf('day')
  return dayjs().isAfter(deadline)
}

/** 供 SLA Banner Mock 统计录入审核超时 */
export function countSlaOverdueEntryAudits(): number {
  return ALL_ENTRY.filter(
    (r) => isPendingLike(r.status) && isEntryApplyTimeSlaOverdue(r.applyTime),
  ).length
}

function pendingTotal(): number {
  return ALL_ENTRY.filter((r) => isPendingLike(r.status)).length
}

function toDetail(r: EntryAuditItem): EntryAuditDetail {
  return { ...r }
}

interface ListParams {
  page: string
  pageSize: string
  status?: string
  assignedAgentName?: string
  rightLeopardCode?: string
  rightLeopardUserId?: string
  source?: string
  applyTimeFrom?: string
  applyTimeTo?: string
}

function parseParams(src: Record<string, unknown>): ListParams {
  return {
    page: String(src.page ?? '1'),
    pageSize: String(src.pageSize ?? '20'),
    status: src.status != null && src.status !== '' ? String(src.status) : undefined,
    assignedAgentName:
      src.assignedAgentName != null && String(src.assignedAgentName).trim() !== ''
        ? String(src.assignedAgentName).trim()
        : undefined,
    rightLeopardCode:
      src.rightLeopardCode != null && String(src.rightLeopardCode).trim() !== ''
        ? String(src.rightLeopardCode).trim()
        : undefined,
    rightLeopardUserId:
      src.rightLeopardUserId != null && String(src.rightLeopardUserId).trim() !== ''
        ? String(src.rightLeopardUserId).trim()
        : undefined,
    source: src.source != null && String(src.source) !== '' ? String(src.source) : undefined,
    applyTimeFrom:
      src.applyTimeFrom != null && String(src.applyTimeFrom) !== ''
        ? String(src.applyTimeFrom)
        : undefined,
    applyTimeTo:
      src.applyTimeTo != null && String(src.applyTimeTo) !== '' ? String(src.applyTimeTo) : undefined,
  }
}

function filterList(p: ListParams): EntryAuditItem[] {
  let rows = [...ALL_ENTRY]
  if (p.status && p.status !== 'all') {
    if (p.status === 'PENDING') {
      rows = rows.filter((r) => isPendingLike(r.status))
    } else {
      rows = rows.filter((r) => r.status === p.status)
    }
  }
  if (p.assignedAgentName) {
    const q = p.assignedAgentName.toLowerCase()
    rows = rows.filter((r) => r.assignedAgentName.toLowerCase().includes(q))
  }
  if (p.rightLeopardCode) {
    const q = p.rightLeopardCode.toLowerCase()
    rows = rows.filter((r) => r.rightLeopardCode.toLowerCase().includes(q))
  }
  if (p.rightLeopardUserId) {
    const q = p.rightLeopardUserId.toLowerCase()
    rows = rows.filter((r) => r.rightLeopardUserId.toLowerCase().includes(q))
  }
  if (p.source === 'admin_import' || p.source === 'qr_entry') {
    rows = rows.filter((r) => r.source === p.source)
  }
  if (p.applyTimeFrom) {
    const from = new Date(`${p.applyTimeFrom}T00:00:00+08:00`).getTime()
    rows = rows.filter((r) => new Date(r.applyTime).getTime() >= from)
  }
  if (p.applyTimeTo) {
    const to = new Date(`${p.applyTimeTo}T23:59:59.999+08:00`).getTime()
    rows = rows.filter((r) => new Date(r.applyTime).getTime() <= to)
  }
  return rows.sort((a, b) => new Date(b.applyTime).getTime() - new Date(a.applyTime).getTime())
}

function listResponse(p: ListParams) {
  const filtered = filterList(p)
  const total = filtered.length
  const page = Math.max(1, parseInt(p.page, 10))
  const pageSize = Math.max(1, parseInt(p.pageSize, 10))
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  return {
    code: 0,
    message: 'success',
    data: { items, total, page, pageSize, pendingTotal: pendingTotal() },
  }
}

/** 供 groupAudits Mock 合并 SLA 预警列表 */
export function buildEntryAuditSlaAlertRows(): SlaAlertRow[] {
  const rows: SlaAlertRow[] = []
  ALL_ENTRY.forEach((r) => {
    if (r.firstAlertSentAt) {
      rows.push({
        id: `sla-entry-${r.id}-1`,
        alertAt: r.firstAlertSentAt,
        groupAuditId: 0,
        entryAuditId: r.id,
        auditType: 'entry_audit',
        larkNickname: r.assignedAgentName,
        rightLeopardCode: r.rightLeopardCode,
        alertType: 'first',
        sendStatus: r.id === 1 ? 'failed' : 'success',
        keywordCount: 0,
        backfillCount: 0,
        orderCount: 0,
        actionRevenueYuan: 0,
      })
    }
    if (r.secondAlertSentAt) {
      rows.push({
        id: `sla-entry-${r.id}-2`,
        alertAt: r.secondAlertSentAt,
        groupAuditId: 0,
        entryAuditId: r.id,
        auditType: 'entry_audit',
        larkNickname: r.assignedAgentName,
        rightLeopardCode: r.rightLeopardCode,
        alertType: 'second',
        sendStatus: 'success',
        keywordCount: 0,
        backfillCount: 0,
        orderCount: 0,
        actionRevenueYuan: 0,
      })
    }
  })
  return rows.sort((a, b) => new Date(b.alertAt).getTime() - new Date(a.alertAt).getTime())
}

export default [
  {
    url: '/api/v1/entry-audits/:id/audit-logs',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      const rec = ALL_ENTRY.find((r) => r.id === id)
      if (!rec) {
        return { code: 10002, message: '记录不存在', data: null }
      }
      const cursor = options.query.cursor ?? '0'
      const offset = parseInt(cursor, 10) || 0
      const all = ENTRY_LOGS.get(id) ?? []
      const slice = all.slice(offset, offset + 20)
      const hasMore = offset + 20 < all.length
      return {
        code: 0,
        message: 'success',
        data: {
          items: slice,
          nextCursor: hasMore ? String(offset + 20) : null,
          hasMore,
        },
      }
    },
  },
  {
    url: '/api/v1/entry-audits/:id/approve',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      const bodyId = options.body?.id as number | undefined
      if (bodyId == null) {
        return { code: 0, message: 'success', data: null }
      }
      const record = ALL_ENTRY.find((r) => r.id === bodyId)
      if (!record) {
        return { code: 10002, message: '记录不存在', data: null }
      }
      if (record.status === 'APPROVED') {
        return { code: 0, message: 'success', data: null }
      }
      if (record.status === 'PENDING' || record.status === 'PROCESSING') {
        record.status = 'APPROVED'
        const now = new Date().toISOString()
        record.reviewedAt = now
        record.reviewerName = record.reviewerName ?? '当前审核员'
        prependLog(bodyId, {
          id: `${bodyId}-ap-${Date.now()}`,
          operatedAt: now,
          operatorName: record.reviewerName,
          actionType: '通过',
          content: '录入审核已通过（Mock）',
        })
      }
      return { code: 0, message: 'success', data: null }
    },
  },
  {
    url: '/api/v1/entry-audits/:id/reject',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      const bodyId = options.body?.id as number | undefined
      const rawReason = (options.body?.reason as string) ?? ''
      const resolvedReason = rawReason.trim() ? rawReason.trim() : DEFAULT_ENTRY_REJECT_REASON
      if (bodyId == null) {
        return { code: 0, message: 'success', data: null }
      }
      const record = ALL_ENTRY.find((r) => r.id === bodyId)
      if (record && record.status === 'PENDING') {
        record.status = 'REJECTED'
        record.rejectReason = resolvedReason
        record.reviewedAt = new Date().toISOString()
        record.reviewerName = record.reviewerName ?? '当前审核员'
        prependLog(bodyId, {
          id: `${bodyId}-rj-${Date.now()}`,
          operatedAt: record.reviewedAt,
          operatorName: record.reviewerName,
          actionType: '拒绝',
          content: `原因：${resolvedReason}`,
        })
        return { code: 0, message: 'success', data: { jobId: `entry-reject-${bodyId}` } }
      }
      return { code: 0, message: 'success', data: null }
    },
  },
  {
    url: '/api/v1/entry-audits/:id',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      const record = ALL_ENTRY.find((r) => r.id === id)
      if (!record) {
        return { code: 10002, message: '记录不存在', data: null }
      }
      return { code: 0, message: 'success', data: toDetail(record) }
    },
  },
  {
    url: '/api/v1/entry-audits',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      return listResponse(parseParams(options.query || {}))
    },
  },
  {
    url: '/api/v1/entry-audits',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      return listResponse(parseParams(body || {}))
    },
  },
] as MockMethod[]
