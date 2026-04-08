import type { MockMethod } from 'vite-plugin-mock'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import type {
  GroupAuditArchiveType,
  GroupAuditDetail,
  GroupAuditItem,
  GroupAuditLogItem,
  GroupAuditStatus,
  GroupAuditYoubaoSyncState,
  SlaAlertRow,
} from '@/types/groupAudit'
import {
  completeExportJob,
  failExportJob,
  registerExportJobProcessing,
} from './exportJobsStore'
import { buildEntryAuditSlaAlertRows, countSlaOverdueEntryAudits } from './entryAudits'

dayjs.extend(utc)
dayjs.extend(timezone)

// ─── Business Constants (FR17) ────────────────────────────────────────────────

/** 默认拒绝文案（满足 FR17：空原因时系统兜底） */
export const DEFAULT_REJECT_REASON = '您的入群申请未符合要求，请按要求修改后重新申请'

// ─── Wechat Notification Queue Simulation (NFR20) ─────────────────────────────

interface WechatNotificationJob {
  jobId: string
  auditId: number
  scenario: 'AUDIT_REJECTED'
  reason: string
  queuedAt: string
}

/** 内存中的通知队列，模拟 BullMQ 异步执行 */
const WECHAT_NOTIFICATION_QUEUE: WechatNotificationJob[] = []

function enqueueRejectNotification(auditId: number, reason: string): string {
  const jobId = `wechat-reject-${auditId}-${Date.now()}`
  WECHAT_NOTIFICATION_QUEUE.push({
    jobId,
    auditId,
    scenario: 'AUDIT_REJECTED',
    reason,
    queuedAt: new Date().toISOString(),
  })
  return jobId
}

// ─── Reference Data ───────────────────────────────────────────────────────────

const REVIEWERS = ['王小明', '李晓红', '张大伟', '刘芳芳']

const LARK_NAMES = [
  '赵天龙', '钱多多', '孙宇轩', '李华南', '周明智',
  '吴建华', '郑秀英', '王海燕', '冯国华', '陈志远',
  '楚云天', '魏文强', '蒋梦琪', '沈冰冰', '韩艺雪',
  '林小燕', '何思远', '罗俊杰', '郭晨曦', '梁嘉欣',
  '谢雨桐', '宋子涵', '唐雪莲', '许晓峰', '邓嘉乐',
  '方志宏', '石玲玲', '姚明辉', '潘晓薇', '邵天宇',
  '薛梦真', '雷振宇', '贺文博', '叶青云', '傅子轩',
  '白雪晴', '卢昊天', '丁一凡', '崔晓宁', '康婷婷',
]

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Returns an ISO string for N days ago from now */
function daysAgo(days: number, jitterHours = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() - jitterHours)
  return d.toISOString()
}

// ─── Generate Mock Records ────────────────────────────────────────────────────

type RawRecord = Omit<GroupAuditItem, 'id' | 'orderCount' | 'backfillCount' | 'actionRevenueYuan'> & {
  orderCount?: number
  backfillCount?: number
  actionRevenueYuan?: number
}

function shanghaiSlaDeadlineIso(applyTime: string): string {
  return dayjs(applyTime).tz('Asia/Shanghai').add(3, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss')
}

function buildRecords(): GroupAuditItem[] {
  const records: RawRecord[] = [
    // === OVERDUE PENDING (>3 days) — sorted to top after client-side sort ====
    {
      larkNickname: '赵天龙',
      rightLeopardCode: 'RB010001',
      applyTime: daysAgo(5, 3),
      status: 'PENDING',
      keywordCount: 42,
      source: 'lark_sync',
      firstAlertSentAt: daysAgo(4, 0),
      secondAlertSentAt: daysAgo(2, 0),
    },
    {
      larkNickname: '钱多多',
      rightLeopardCode: 'RB010002',
      applyTime: daysAgo(4, 7),
      status: 'PENDING',
      keywordCount: 18,
      source: 'lark_sync',
      firstAlertSentAt: daysAgo(3, 2),
      secondAlertSentAt: null,
    },
    { larkNickname: '孙宇轩', rightLeopardCode: 'RB010003', applyTime: daysAgo(6, 0),  status: 'PENDING', keywordCount: 7,  source: 'manual_import' },
    { larkNickname: '李华南', rightLeopardCode: 'RB010004', applyTime: daysAgo(3, 2),  status: 'PENDING', keywordCount: 31, source: 'lark_sync' },
    { larkNickname: '周明智', rightLeopardCode: 'RB010005', applyTime: daysAgo(7, 5),  status: 'PENDING', keywordCount: 5,  source: 'lark_sync' },
    { larkNickname: '吴建华', rightLeopardCode: 'RB010006', applyTime: daysAgo(4, 1),  status: 'PENDING', keywordCount: 23, source: 'lark_sync' },
    { larkNickname: '郑秀英', rightLeopardCode: 'RB010007', applyTime: daysAgo(5, 8),  status: 'PENDING', keywordCount: 14, source: 'manual_import' },
    { larkNickname: '王海燕', rightLeopardCode: 'RB010008', applyTime: daysAgo(3, 4),  status: 'PENDING', keywordCount: 9,  source: 'lark_sync' },

    // === NON-OVERDUE PENDING (<3 days) =======================================
    { larkNickname: '冯国华', rightLeopardCode: 'RB010009', applyTime: daysAgo(2, 0),  status: 'PENDING', keywordCount: 37, source: 'lark_sync' },
    { larkNickname: '陈志远', rightLeopardCode: 'RB010010', applyTime: daysAgo(1, 6),  status: 'PENDING', keywordCount: 11, source: 'lark_sync' },
    { larkNickname: '楚云天', rightLeopardCode: 'RB010011', applyTime: daysAgo(2, 3),  status: 'PENDING', keywordCount: 28, source: 'lark_sync' },
    { larkNickname: '魏文强', rightLeopardCode: 'RB010012', applyTime: daysAgo(0, 8),  status: 'PENDING', keywordCount: 6,  source: 'manual_import' },
    { larkNickname: '蒋梦琪', rightLeopardCode: 'RB010013', applyTime: daysAgo(1, 2),  status: 'PENDING', keywordCount: 19, source: 'lark_sync' },
    { larkNickname: '沈冰冰', rightLeopardCode: 'RB010014', applyTime: daysAgo(2, 10), status: 'PENDING', keywordCount: 45, source: 'lark_sync' },
    { larkNickname: '韩艺雪', rightLeopardCode: 'RB010015', applyTime: daysAgo(0, 4),  status: 'PENDING', keywordCount: 3,  source: 'lark_sync' },
    { larkNickname: '林小燕', rightLeopardCode: 'RB010016', applyTime: daysAgo(1, 12), status: 'PENDING', keywordCount: 22, source: 'lark_sync' },

    // === PROCESSING ===========================================================
    { larkNickname: '何思远', rightLeopardCode: 'RB010017', applyTime: daysAgo(1, 0),  status: 'PROCESSING', keywordCount: 16, source: 'lark_sync' },

    // === APPROVED =============================================================
    { larkNickname: '罗俊杰', rightLeopardCode: 'RB010018', applyTime: daysAgo(10, 0), status: 'APPROVED', keywordCount: 33, source: 'lark_sync',   reviewerName: REVIEWERS[0], reviewedAt: daysAgo(9, 2) },
    { larkNickname: '郭晨曦', rightLeopardCode: 'RB010019', applyTime: daysAgo(12, 0), status: 'APPROVED', keywordCount: 8,  source: 'lark_sync',   reviewerName: REVIEWERS[1], reviewedAt: daysAgo(11, 1) },
    { larkNickname: '梁嘉欣', rightLeopardCode: 'RB010020', applyTime: daysAgo(8, 0),  status: 'APPROVED', keywordCount: 27, source: 'manual_import', reviewerName: REVIEWERS[2], reviewedAt: daysAgo(7, 4) },
    { larkNickname: '谢雨桐', rightLeopardCode: 'RB010021', applyTime: daysAgo(15, 0), status: 'APPROVED', keywordCount: 52, source: 'lark_sync',   reviewerName: REVIEWERS[0], reviewedAt: daysAgo(14, 0) },
    { larkNickname: '宋子涵', rightLeopardCode: 'RB010022', applyTime: daysAgo(9, 0),  status: 'APPROVED', keywordCount: 41, source: 'lark_sync',   reviewerName: REVIEWERS[3], reviewedAt: daysAgo(8, 3) },
    { larkNickname: '唐雪莲', rightLeopardCode: 'RB010023', applyTime: daysAgo(20, 0), status: 'APPROVED', keywordCount: 15, source: 'lark_sync',   reviewerName: REVIEWERS[1], reviewedAt: daysAgo(19, 1) },
    { larkNickname: '许晓峰', rightLeopardCode: 'RB010024', applyTime: daysAgo(11, 0), status: 'APPROVED', keywordCount: 38, source: 'manual_import', reviewerName: REVIEWERS[2], reviewedAt: daysAgo(10, 2) },
    { larkNickname: '邓嘉乐', rightLeopardCode: 'RB010025', applyTime: daysAgo(7, 0),  status: 'APPROVED', keywordCount: 12, source: 'lark_sync',   reviewerName: REVIEWERS[0], reviewedAt: daysAgo(6, 5) },
    { larkNickname: '方志宏', rightLeopardCode: 'RB010026', applyTime: daysAgo(14, 0), status: 'APPROVED', keywordCount: 29, source: 'lark_sync',   reviewerName: REVIEWERS[3], reviewedAt: daysAgo(13, 0) },
    { larkNickname: '石玲玲', rightLeopardCode: 'RB010027', applyTime: daysAgo(18, 0), status: 'APPROVED', keywordCount: 7,  source: 'lark_sync',   reviewerName: REVIEWERS[1], reviewedAt: daysAgo(17, 2) },
    { larkNickname: '姚明辉', rightLeopardCode: 'RB010028', applyTime: daysAgo(6, 0),  status: 'APPROVED', keywordCount: 46, source: 'lark_sync',   reviewerName: REVIEWERS[2], reviewedAt: daysAgo(5, 1) },

    // === REJECTED =============================================================
    { larkNickname: '潘晓薇', rightLeopardCode: 'RB010029', applyTime: daysAgo(5, 0),  status: 'REJECTED', keywordCount: 2,  source: 'lark_sync',   reviewerName: REVIEWERS[0], rejectReason: '近期动作数不符合要求，建议完善资料后重新申请', reviewedAt: daysAgo(4, 2) },
    { larkNickname: '邵天宇', rightLeopardCode: 'RB010030', applyTime: daysAgo(8, 0),  status: 'REJECTED', keywordCount: 0,  source: 'manual_import', reviewerName: REVIEWERS[1], rejectReason: '右豹编码核验失败', reviewedAt: daysAgo(7, 1) },
    { larkNickname: '薛梦真', rightLeopardCode: 'RB010031', applyTime: daysAgo(13, 0), status: 'REJECTED', keywordCount: 1,  source: 'lark_sync',   reviewerName: REVIEWERS[3], rejectReason: '', reviewedAt: daysAgo(12, 0) },
    { larkNickname: '雷振宇', rightLeopardCode: 'RB010032', applyTime: daysAgo(4, 0),  status: 'REJECTED', keywordCount: 3,  source: 'lark_sync',   reviewerName: REVIEWERS[2], rejectReason: '账号信息不匹配', reviewedAt: daysAgo(3, 4) },
    { larkNickname: '贺文博', rightLeopardCode: 'RB010033', applyTime: daysAgo(6, 0),  status: 'REJECTED', keywordCount: 4,  source: 'lark_sync',   reviewerName: REVIEWERS[0], rejectReason: '', reviewedAt: daysAgo(5, 2) },

    // === ARCHIVED（Story 7-6：归档类型展示） ==================================
    {
      larkNickname: '叶青云',
      rightLeopardCode: 'RB010034',
      applyTime: daysAgo(35, 0),
      status: 'ARCHIVED',
      keywordCount: 0,
      source: 'lark_sync',
      archiveType: 'AUTO_EXPIRE',
      archivedAt: daysAgo(5, 0),
      archiveReason: '超过 30 天未处理，系统自动归档',
    },
    {
      larkNickname: '傅子轩',
      rightLeopardCode: 'RB010035',
      applyTime: daysAgo(45, 0),
      status: 'ARCHIVED',
      keywordCount: 2,
      source: 'lark_sync',
      archiveType: 'RE_SUBMIT',
      archivedAt: daysAgo(40, 0),
      archiveReason: '用户重新提交入群申请，旧记录归档',
    },
    {
      larkNickname: '白雪晴',
      rightLeopardCode: 'RB010036',
      applyTime: daysAgo(60, 0),
      status: 'ARCHIVED',
      keywordCount: 1,
      source: 'manual_import',
      archiveType: 'MANUAL',
      archivedAt: daysAgo(58, 0),
      archiveReason: '管理员手动归档：重复资料',
    },
    {
      larkNickname: '卢昊天',
      rightLeopardCode: 'RB010037',
      applyTime: daysAgo(40, 0),
      status: 'ARCHIVED',
      keywordCount: 0,
      source: 'lark_sync',
      archiveType: 'AUTO_EXPIRE',
      archivedAt: daysAgo(8, 0),
      archiveReason: '超过 30 天未处理，系统自动归档',
    },

    // === More PENDING to pad list =============================================
    ...LARK_NAMES.slice(0, 5).map((name, i) => ({
      larkNickname: `${name}（2）`,
      rightLeopardCode: `RB0200${String(i + 1).padStart(2, '0')}`,
      applyTime: daysAgo(i % 2 === 0 ? 4 : 1, i * 2),
      status: 'PENDING' as GroupAuditStatus,
      keywordCount: (i + 1) * 7,
      source: 'lark_sync' as const,
    })),
  ]

  return records.map((r, idx) => {
    const orderCount = r.orderCount ?? Math.max(0, Math.round(r.keywordCount / 2))
    const backfillCount = r.backfillCount ?? Math.max(0, Math.round(r.keywordCount * 0.35))
    const actionRevenueYuan =
      r.actionRevenueYuan ?? Math.round(r.keywordCount * 120 + orderCount * 45)
    return {
      id: idx + 1,
      ...r,
      orderCount,
      backfillCount,
      actionRevenueYuan,
    }
  })
}

// Mutable in-memory store so approve/reject mutations are reflected in the list
const ALL_RECORDS: GroupAuditItem[] = buildRecords()

/** 飞书 API 降级（Story 7-5）；`POST /api/v1/lark/sync` 成功后清除 */
let larkServiceDegraded = true

let nextAuditSeq = ALL_RECORDS.reduce((m, r) => Math.max(m, r.id), 0) + 1

const AUDIT_LOG_BOOK = new Map<number, GroupAuditLogItem[]>()

function archiveTypeLabel(t: GroupAuditArchiveType): string {
  if (t === 'AUTO_EXPIRE') return '超期自动归档'
  if (t === 'RE_SUBMIT') return '重新申请归档'
  return '手动归档'
}

function buildInitialLogs(r: GroupAuditItem): GroupAuditLogItem[] {
  const src = r.source === 'manual_import' ? '手动导入' : '飞书同步'
  const logs: GroupAuditLogItem[] = [
    {
      id: `${r.id}-seed-1`,
      operatedAt: r.applyTime,
      operatorName: '系统',
      actionType: '创建申请',
      content: `来源：${src}`,
    },
  ]
  if (r.status === 'PROCESSING') {
    logs.push({
      id: `${r.id}-seed-proc`,
      operatedAt: r.reviewedAt ?? r.applyTime,
      operatorName: r.reviewerName ?? '审核员',
      actionType: '通过',
      content: '已提交飞书入群，等待回调',
    })
  }
  if (r.status === 'APPROVED') {
    logs.push({
      id: `${r.id}-seed-approve`,
      operatedAt: r.reviewedAt ?? r.applyTime,
      operatorName: r.reviewerName ?? '审核员',
      actionType: '通过',
      content: '审核通过',
    })
  }
  if (r.status === 'REJECTED') {
    logs.push({
      id: `${r.id}-seed-reject`,
      operatedAt: r.reviewedAt ?? r.applyTime,
      operatorName: r.reviewerName ?? '审核员',
      actionType: '拒绝',
      content: r.rejectReason?.trim() ? `原因：${r.rejectReason}` : `原因：${DEFAULT_REJECT_REASON}`,
    })
  }
  if (r.status === 'ARCHIVED' && r.archiveType) {
    logs.push({
      id: `${r.id}-seed-arch`,
      operatedAt: r.archivedAt ?? r.applyTime,
      operatorName: '系统',
      actionType: '归档',
      content: `${archiveTypeLabel(r.archiveType)}${r.archiveReason ? ` — ${r.archiveReason}` : ''}`,
    })
  }
  return logs.sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime())
}

function initAuditLogBook() {
  ALL_RECORDS.forEach((r) => {
    AUDIT_LOG_BOOK.set(r.id, buildInitialLogs(r))
  })
}

initAuditLogBook()

function getLogsForAudit(auditId: number): GroupAuditLogItem[] {
  return AUDIT_LOG_BOOK.get(auditId) ?? []
}

function prependAuditLog(auditId: number, entry: Omit<GroupAuditLogItem, 'id'> & { id?: string }) {
  const row: GroupAuditLogItem = {
    id: entry.id ?? `log-${auditId}-${Date.now()}`,
    operatedAt: entry.operatedAt,
    operatorName: entry.operatorName,
    actionType: entry.actionType,
    content: entry.content,
  }
  const cur = getLogsForAudit(auditId)
  AUDIT_LOG_BOOK.set(auditId, [row, ...cur])
}

function pickYoubaoSyncState(r: GroupAuditItem): {
  state: GroupAuditYoubaoSyncState
  lastSyncedAt?: string
} {
  if (r.status === 'PROCESSING') return { state: 'syncing' }
  if (r.source === 'manual_import') {
    return { state: 'cached', lastSyncedAt: dayjs(r.applyTime).subtract(2, 'minute').toISOString() }
  }
  return { state: 'live' }
}

function buildDetailPayload(r: GroupAuditItem): GroupAuditDetail {
  const sync = pickYoubaoSyncState(r)
  let notification: GroupAuditDetail['notification']
  if (r.status === 'REJECTED') {
    notification = {
      status: 'failed',
      failureReason: '微信模板消息发送失败（Mock）',
      failureRecordId: `nf-audit-${r.id}`,
    }
  } else if (r.status === 'APPROVED') {
    notification = { status: 'pushed' }
  }

  let archive: GroupAuditDetail['archive'] = null
  if (r.status === 'ARCHIVED' && r.archiveType && r.archivedAt) {
    archive = {
      type: r.archiveType,
      archivedAt: r.archivedAt,
      reason: r.archiveReason ?? '—',
    }
  }

  return {
    ...r,
    youbaoStats: {
      keywordCount: r.keywordCount,
      orderCount: r.orderCount,
      backfillCount: r.backfillCount,
      actionRevenueYuan: r.actionRevenueYuan,
    },
    dataSyncState: {
      state: sync.state,
      lastSyncedAt: sync.lastSyncedAt,
    },
    notification,
    archive,
  }
}

function runSyncProcessingRecords(): number {
  let updated = 0
  ALL_RECORDS.forEach((rec) => {
    if (rec.status === 'PROCESSING') {
      rec.status = 'APPROVED'
      rec.reviewerName = rec.reviewerName || '系统同步'
      rec.reviewedAt = new Date().toISOString()
      prependAuditLog(rec.id, {
        operatedAt: rec.reviewedAt,
        operatorName: '系统',
        actionType: '同步',
        content: '飞书回调确认：已通过',
      })
      updated += 1
    }
  })
  return updated
}

/** Story 7-7：第 3 自然日 23:59（Asia/Shanghai）后仍 PENDING 视为超时未处理 */
function isApplyTimeSlaOverdue(applyTime: string): boolean {
  const deadline = dayjs(applyTime).tz('Asia/Shanghai').add(3, 'day').endOf('day')
  return dayjs().isAfter(deadline)
}

function countSlaOverduePendingAudits(): number {
  return ALL_RECORDS.filter((r) => r.status === 'PENDING' && isApplyTimeSlaOverdue(r.applyTime)).length
}

function buildSlaAlertRows(): SlaAlertRow[] {
  const rows: SlaAlertRow[] = []
  ALL_RECORDS.forEach((r) => {
    if (r.firstAlertSentAt) {
      rows.push({
        id: `sla-${r.id}-1`,
        alertAt: r.firstAlertSentAt,
        groupAuditId: r.id,
        auditType: 'group_audit',
        larkNickname: r.larkNickname,
        rightLeopardCode: r.rightLeopardCode,
        alertType: 'first',
        sendStatus: 'success',
        keywordCount: r.keywordCount,
        backfillCount: r.backfillCount,
        orderCount: r.orderCount,
        actionRevenueYuan: r.actionRevenueYuan,
      })
    }
    if (r.secondAlertSentAt) {
      rows.push({
        id: `sla-${r.id}-2`,
        alertAt: r.secondAlertSentAt,
        groupAuditId: r.id,
        auditType: 'group_audit',
        larkNickname: r.larkNickname,
        rightLeopardCode: r.rightLeopardCode,
        alertType: 'second',
        sendStatus: r.id === 1 ? 'failed' : 'success',
        keywordCount: r.keywordCount,
        backfillCount: r.backfillCount,
        orderCount: r.orderCount,
        actionRevenueYuan: r.actionRevenueYuan,
      })
    }
  })
  return rows.sort((a, b) => new Date(b.alertAt).getTime() - new Date(a.alertAt).getTime())
}

function statusLabelForExport(s: GroupAuditStatus): string {
  const m: Record<GroupAuditStatus, string> = {
    PENDING: '待审核',
    PROCESSING: '处理中',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    ARCHIVED: '已归档',
  }
  return m[s]
}

function buildGroupAuditExportSheet(filtered: GroupAuditItem[]) {
  const headers = [
    '申请人右豹编码',
    '飞书昵称',
    '申请时间',
    'SLA截止时间',
    '审核结果',
    '审核时间',
    '拒绝原因',
  ]
  const rows = filtered.map((r) => {
    const slaEnd = shanghaiSlaDeadlineIso(r.applyTime)
    const reviewed = r.reviewedAt ? dayjs(r.reviewedAt).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') : ''
    const reason =
      r.status === 'REJECTED' ? (r.rejectReason?.trim() ? r.rejectReason : DEFAULT_REJECT_REASON) : ''
    return [
      r.rightLeopardCode,
      r.larkNickname,
      dayjs(r.applyTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
      slaEnd,
      statusLabelForExport(r.status),
      reviewed,
      reason,
    ]
  })
  return { headers, rows }
}

function exportFileName(prefix: string) {
  return `${prefix}_${dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD_HH-mm')}.xlsx`
}

// ─── SLA helpers (mirrors frontend SlaStatusBadge / 原型 §2.1) ────────────────

function isOverdue(applyTime: string): boolean {
  const deadline = dayjs(applyTime).tz('Asia/Shanghai').add(3, 'day').endOf('day')
  return dayjs().isAfter(deadline)
}

function isPendingWorkqueueStatus(s: GroupAuditStatus): boolean {
  return s === 'PENDING' || s === 'PROCESSING'
}

function computePendingTotal(): number {
  return ALL_RECORDS.filter((r) => isPendingWorkqueueStatus(r.status)).length
}

interface ListFilterParams {
  page: string
  pageSize: string
  status?: string
  applyTimeFrom?: string
  applyTimeTo?: string
  reviewerName?: string
  pendingSla?: string
  rightLeopardCode?: string
}

function parseListParams(
  src: Record<string, string | undefined> | Record<string, unknown>,
): ListFilterParams {
  const q = src as Record<string, unknown>
  return {
    page: String(q.page ?? '1'),
    pageSize: String(q.pageSize ?? '50'),
    status: q.status != null && q.status !== '' ? String(q.status) : undefined,
    applyTimeFrom: q.applyTimeFrom != null && q.applyTimeFrom !== '' ? String(q.applyTimeFrom) : undefined,
    applyTimeTo: q.applyTimeTo != null && q.applyTimeTo !== '' ? String(q.applyTimeTo) : undefined,
    reviewerName: q.reviewerName != null && q.reviewerName !== '' ? String(q.reviewerName) : undefined,
    pendingSla: q.pendingSla != null && q.pendingSla !== '' ? String(q.pendingSla) : undefined,
    rightLeopardCode:
      q.rightLeopardCode != null && String(q.rightLeopardCode).trim() !== ''
        ? String(q.rightLeopardCode).trim()
        : undefined,
  }
}

function filterGroupAudits(params: ListFilterParams): GroupAuditItem[] {
  let filtered = [...ALL_RECORDS]

  const { status, applyTimeFrom, applyTimeTo, reviewerName, pendingSla, rightLeopardCode } = params

  if (status === 'PENDING') {
    filtered = filtered.filter((r) => isPendingWorkqueueStatus(r.status))
  } else if (status === 'ARCHIVED' || status === 'APPROVED' || status === 'REJECTED') {
    filtered = filtered.filter((r) => r.status === status)
  } else if (!status) {
    filtered = filtered.filter((r) => isPendingWorkqueueStatus(r.status))
  } else {
    filtered = filtered.filter((r) => r.status === status)
  }

  if (applyTimeFrom) {
    const from = new Date(`${applyTimeFrom}T00:00:00+08:00`).getTime()
    filtered = filtered.filter((r) => new Date(r.applyTime).getTime() >= from)
  }
  if (applyTimeTo) {
    const to = new Date(`${applyTimeTo}T23:59:59.999+08:00`).getTime()
    filtered = filtered.filter((r) => new Date(r.applyTime).getTime() <= to)
  }

  if (reviewerName) {
    filtered = filtered.filter((r) => (r.reviewerName || '').includes(reviewerName))
  }

  if (rightLeopardCode) {
    const q = rightLeopardCode.toLowerCase()
    filtered = filtered.filter((r) => r.rightLeopardCode.toLowerCase().includes(q))
  }

  const inWorkqueue = !status || status === 'PENDING'
  const ps = pendingSla || 'all'
  if (inWorkqueue && ps !== 'all') {
    if (ps === 'overdue') {
      filtered = filtered.filter(
        (r) => r.status === 'PENDING' && isOverdue(r.applyTime),
      )
    } else if (ps === 'normal') {
      filtered = filtered.filter(
        (r) => r.status === 'PROCESSING' || (r.status === 'PENDING' && !isOverdue(r.applyTime)),
      )
    }
  }

  return filtered
}

// ─── Sort: PENDING first (overdue first), then PROCESSING, then applyTime asc ─
function sortRecords(records: GroupAuditItem[]): GroupAuditItem[] {
  const rank = (s: GroupAuditStatus): number => {
    if (s === 'PENDING') return 0
    if (s === 'PROCESSING') return 1
    return 2
  }

  return [...records].sort((a, b) => {
    const ra = rank(a.status)
    const rb = rank(b.status)
    if (ra !== rb) return ra - rb

    if (a.status === 'PENDING' && b.status === 'PENDING') {
      const aOver = isOverdue(a.applyTime)
      const bOver = isOverdue(b.applyTime)
      if (aOver !== bOver) return aOver ? -1 : 1
    }

    return new Date(a.applyTime).getTime() - new Date(b.applyTime).getTime()
  })
}

function buildListResponse(params: ListFilterParams) {
  const filtered = filterGroupAudits(params)
  const sorted = sortRecords(filtered)
  const total = sorted.length
  const pageNum = Math.max(1, parseInt(params.page))
  const pageSizeNum = Math.max(1, parseInt(params.pageSize))
  const items = sorted.slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum)
  const pendingTotal = computePendingTotal()

  return {
    code: 0,
    message: 'success',
    data: { items, total, page: pageNum, pageSize: pageSizeNum, pendingTotal },
  }
}

// ─── Mock Endpoints ───────────────────────────────────────────────────────────

export default [
  {
    url: '/api/v1/group-audits/lark-health',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: { degraded: larkServiceDegraded },
    }),
  },

  {
    url: '/api/v1/lark/status',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: { degraded: larkServiceDegraded },
    }),
  },

  {
    url: '/api/v1/lark/sync',
    method: 'post',
    response: () => {
      const updated = runSyncProcessingRecords()
      larkServiceDegraded = false
      return { code: 0, message: 'success', data: { updated } }
    },
  },

  {
    url: '/api/v1/group-audits/sync-lark-status',
    method: 'post',
    response: () => {
      const updated = runSyncProcessingRecords()
      larkServiceDegraded = false
      return { code: 0, message: 'success', data: { updated } }
    },
  },

  {
    url: '/api/v1/group-audits/manual-import',
    method: 'post',
    response: () => {
      const now = new Date().toISOString()
      const id = nextAuditSeq++
      const rec: GroupAuditItem = {
        id,
        larkNickname: `手动导入_${dayjs(now).format('MMDD-HHmm')}`,
        rightLeopardCode: `RB${String(880000 + id).slice(-6)}`,
        applyTime: now,
        status: 'PENDING',
        keywordCount: 0,
        orderCount: 0,
        backfillCount: 0,
        actionRevenueYuan: 0,
        source: 'manual_import',
      }
      ALL_RECORDS.push(rec)
      AUDIT_LOG_BOOK.set(
        id,
        [
          {
            id: `${id}-mi-1`,
            operatedAt: now,
            operatorName: '管理员',
            actionType: '手动导入',
            content: '通过 Excel 手动导入创建申请（Mock）',
          },
        ],
      )
      return { code: 0, message: 'success', data: { imported: 1 } }
    },
  },

  {
    url: '/api/v1/group-audits/export',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      const exportId = `ga-exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      registerExportJobProcessing(exportId)
      const snapshot = { ...(body ?? {}) }
      setTimeout(() => {
        try {
          const p = parseListParams(snapshot)
          const rows = filterGroupAudits(p)
          const { headers, rows: sheetRows } = buildGroupAuditExportSheet(rows)
          completeExportJob(exportId, {
            fileName: exportFileName('入群审核_导出'),
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            downloadUrl: `/api/v1/exports/${exportId}/file`,
            sheet: { headers, rows: sheetRows },
          })
        } catch {
          failExportJob(exportId, '导出处理失败')
        }
      }, 720)
      return { code: 0, message: 'success', data: { exportId } }
    },
  },

  {
    url: '/api/v1/group-audits/sla-banner',
    method: 'get',
    response: () => {
      const overdueCount = countSlaOverduePendingAudits()
      const entryAuditOverdueCount = countSlaOverdueEntryAudits()
      return {
        code: 0,
        message: 'success',
        data: {
          hasOverdue: overdueCount > 0 || entryAuditOverdueCount > 0,
          overdueCount,
          entryAuditOverdueCount,
        },
      }
    },
  },

  {
    url: '/api/v1/group-audits/sla-alerts',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const page = Math.max(1, parseInt(options.query?.page ?? '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(options.query?.pageSize ?? '20', 10)))
      const auditTypeQ = (options.query?.auditType ?? '').trim()
      let all = [...buildSlaAlertRows(), ...buildEntryAuditSlaAlertRows()]
      if (auditTypeQ === 'group_audit' || auditTypeQ === 'entry_audit') {
        all = all.filter((r) => r.auditType === auditTypeQ)
      }
      all.sort((a, b) => new Date(b.alertAt).getTime() - new Date(a.alertAt).getTime())
      const total = all.length
      const slice = all.slice((page - 1) * pageSize, page * pageSize)
      return {
        code: 0,
        message: 'success',
        data: { items: slice, total, page, pageSize },
      }
    },
  },

  {
    url: '/api/v1/group-audits/:id/audit-logs',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      const record = ALL_RECORDS.find((r) => r.id === id)
      if (!record) {
        return { code: 10002, message: '记录不存在', data: null }
      }
      const cursor = options.query.cursor ?? '0'
      const offset = parseInt(cursor, 10) || 0
      const all = getLogsForAudit(id)
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
    url: '/api/v1/group-audits/:id/archive',
    method: 'post',
    response: (options: { query: Record<string, string>; body: Record<string, unknown> }) => {
      const id = parseInt(String(options.query.id), 10)
      const reason = String((options.body?.reason as string) ?? '').trim()
      if (!reason) {
        return { code: 400, message: '请填写归档原因', data: null }
      }
      const record = ALL_RECORDS.find((r) => r.id === id)
      if (!record) {
        return { code: 10002, message: '记录不存在', data: null }
      }
      if (record.status === 'ARCHIVED') {
        return { code: 400, message: '记录已归档', data: null }
      }
      const now = new Date().toISOString()
      record.status = 'ARCHIVED'
      record.archiveType = 'MANUAL'
      record.archivedAt = now
      record.archiveReason = reason
      prependAuditLog(id, {
        operatedAt: now,
        operatorName: '管理员',
        actionType: '归档',
        content: `手动归档：${reason}`,
      })
      return { code: 0, message: 'success', data: null }
    },
  },

  {
    url: '/api/v1/group-audits/:id',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const id = parseInt(String(options.query.id), 10)
      const record = ALL_RECORDS.find((r) => r.id === id)
      if (!record) {
        return { code: 10002, message: '记录不存在', data: null }
      }
      return { code: 0, message: 'success', data: buildDetailPayload(record) }
    },
  },

  // GET /api/v1/group-audits — paginated list
  {
    url: '/api/v1/group-audits',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const params = parseListParams(options.query || {})
      return buildListResponse(params)
    },
  },

  // POST /api/v1/group-audits — 同 GET，复杂筛选可走 Body（原型 Mock）
  {
    url: '/api/v1/group-audits',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      const params = parseListParams(body || {})
      return buildListResponse(params)
    },
  },

  // POST /api/v1/group-audits/:id/approve
  {
    url: '/api/v1/group-audits/:id/approve',
    method: 'post',
    response: (options: { query: Record<string, string>; body: Record<string, unknown> }) => {
      const bodyId = options.body?.id as number | undefined
      if (bodyId != null) {
        const record = ALL_RECORDS.find((r) => r.id === bodyId)
        if (record) {
          // 幂等检查：已为 APPROVED → 直接返回成功，不重复操作
          if (record.status === 'APPROVED') {
            return { code: 0, message: 'success', data: null }
          }
          if (record.status === 'PENDING') {
            record.status = 'PROCESSING'
            const now = new Date().toISOString()
            record.reviewedAt = now
            prependAuditLog(bodyId, {
              operatedAt: now,
              operatorName: record.reviewerName ?? '审核员',
              actionType: '通过',
              content: '已提交飞书入群，等待回调',
            })
          }
        }
      }
      return { code: 0, message: 'success', data: null }
    },
  },

  // POST /api/v1/group-audits/:id/reject
  {
    url: '/api/v1/group-audits/:id/reject',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      const bodyId = options.body?.id as number | undefined
      const rawReason = (options.body?.reason as string) ?? ''
      // FR17：空原因时使用系统默认文案兜底
      const resolvedReason = rawReason.trim() ? rawReason.trim() : DEFAULT_REJECT_REASON
      if (bodyId != null) {
        const record = ALL_RECORDS.find((r) => r.id === bodyId)
        if (record && record.status === 'PENDING') {
          record.status = 'REJECTED'
          record.rejectReason = resolvedReason
          record.reviewedAt = new Date().toISOString()
          prependAuditLog(bodyId, {
            operatedAt: record.reviewedAt,
            operatorName: record.reviewerName ?? '审核员',
            actionType: '拒绝',
            content: `原因：${resolvedReason}`,
          })
          // AC#3：触发微信拒绝通知入队列（scenario: 'AUDIT_REJECTED'）
          const jobId = enqueueRejectNotification(bodyId, resolvedReason)
          return { code: 0, message: 'success', data: { jobId } }
        }
      }
      return { code: 0, message: 'success', data: null }
    },
  },

  // POST /api/v1/group-audits/batch-approve
  {
    url: '/api/v1/group-audits/batch-approve',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      const ids = (options.body?.ids as number[]) ?? []
      ids.forEach((id) => {
        const record = ALL_RECORDS.find((r) => r.id === id)
        if (record) {
          // 幂等：已 APPROVED → 跳过
          if (record.status === 'PENDING') {
            record.status = 'PROCESSING'
          }
        }
      })
      const batchJobId = `batch-approve-${Date.now()}`
      return { code: 0, message: 'success', data: { batchJobId } }
    },
  },

  // POST /api/v1/group-audits/batch-reject
  {
    url: '/api/v1/group-audits/batch-reject',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      const ids = (options.body?.ids as number[]) ?? []
      const rawReason = (options.body?.reason as string) ?? ''
      // AC#4：批量拒绝统一使用默认文案（FR17 兜底）
      const resolvedReason = rawReason.trim() ? rawReason.trim() : DEFAULT_REJECT_REASON
      ids.forEach((id) => {
        const record = ALL_RECORDS.find((r) => r.id === id)
        if (record && record.status === 'PENDING') {
          record.status = 'REJECTED'
          record.rejectReason = resolvedReason
          // BullMQ 异步执行模拟（NFR20）
          enqueueRejectNotification(id, resolvedReason)
        }
      })
      const batchJobId = `batch-reject-${Date.now()}`
      return { code: 0, message: 'success', data: { batchJobId } }
    },
  },
] as MockMethod[]
