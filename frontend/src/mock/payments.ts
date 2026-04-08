import type { MockMethod } from 'vite-plugin-mock'
import type { PaymentImportFailedRow } from '@/types/payment'
import { appendMockAuditLog } from './auditLogs'
import {
  completeExportJob,
  failExportJob,
  registerExportJobProcessing,
} from './exportJobsStore'
import {
  findMockUser,
  findMockUserByRightLeopardCode,
  getMergedMockUsers,
} from './users'
import { mockPaidCsAgentNames } from './csAgents'

interface PayRow {
  id: number
  userId: number
  rightLeopardCode: string
  larkNickname: string
  amount: number
  paymentTime: string
  contactPerson: string | null
  createdByName: string
  createdAt: string
}

const paymentRecords: PayRow[] = []
let seedDone = false
let nextPayId = 1

function ensureSeed() {
  if (seedDone) return
  seedDone = true
  for (const u of getMergedMockUsers()) {
    if (u.isPaid && u.paymentRecordsCount > 0 && u.paymentAmount != null) {
      paymentRecords.push({
        id: nextPayId++,
        userId: u.id,
        rightLeopardCode: u.rightLeopardCode,
        larkNickname: u.larkNickname,
        amount: u.paymentAmount,
        paymentTime: u.paymentPaidAt ?? u.createdAt,
        contactPerson: u.paymentContact,
        createdByName: '系统种子',
        createdAt: u.createdAt,
      })
    }
  }
  const paidNames = mockPaidCsAgentNames()
  if (paidNames.length > 0) {
    paymentRecords.forEach((p, i) => {
      const name = paidNames[i % paidNames.length]!
      p.contactPerson = name
      const u = findMockUser(p.userId)
      if (u) u.paymentContact = name
    })
  }
}

function toApiItem(p: PayRow) {
  const u = findMockUser(p.userId)
  return {
    id: p.id,
    userId: p.userId,
    rightLeopardCode: u?.rightLeopardCode ?? p.rightLeopardCode,
    larkNickname: u?.larkNickname ?? p.larkNickname,
    amount: p.amount,
    paymentTime: p.paymentTime,
    contactPerson: p.contactPerson,
    createdByName: p.createdByName,
    createdAt: p.createdAt,
  }
}

function paymentAuditSnapshot(p: PayRow): Record<string, unknown> {
  return {
    userId: p.userId,
    rightLeopardCode: p.rightLeopardCode,
    amount: p.amount,
    paymentTime: p.paymentTime,
    contactPerson: p.contactPerson,
  }
}

function applyPaymentToUser(row: PayRow) {
  const u = findMockUser(row.userId)
  if (!u) return
  u.isPaid = true
  u.paymentAmount = row.amount
  u.paymentPaidAt = row.paymentTime
  u.paymentContact = row.contactPerson
  u.paymentRecordsCount = 1
}

function clearPaymentOnUser(userId: number) {
  const u = findMockUser(userId)
  if (!u) return
  u.isPaid = false
  u.paymentAmount = null
  u.paymentPaidAt = null
  u.paymentContact = null
  u.paymentRecordsCount = 0
}

function listMeta() {
  const contactPersons = [
    ...new Set(
      paymentRecords.map((r) => r.contactPerson).filter((c): c is string => Boolean(c)),
    ),
  ].sort()
  const creators = [...new Set(paymentRecords.map((r) => r.createdByName))].sort()
  return { contactPersons, creators }
}

function filterPaymentsForExport(q: {
  keyword?: unknown
  startDate?: unknown
  endDate?: unknown
  userId?: unknown
  contactPerson?: unknown
  createdBy?: unknown
}): PayRow[] {
  ensureSeed()
  let list = [...paymentRecords]

  const keyword = String(q.keyword ?? '').trim()
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter(
      (p) =>
        p.rightLeopardCode.toLowerCase().includes(kw) ||
        p.larkNickname.toLowerCase().includes(kw) ||
        (p.contactPerson?.toLowerCase().includes(kw) ?? false) ||
        p.createdByName.toLowerCase().includes(kw),
    )
  }
  if (q.userId != null && q.userId !== '') {
    const uid = Number(q.userId)
    if (!Number.isNaN(uid)) list = list.filter((p) => p.userId === uid)
  }
  if (q.contactPerson) {
    const c = String(q.contactPerson)
    list = list.filter((p) => p.contactPerson === c)
  }
  if (q.createdBy) {
    const c = String(q.createdBy)
    list = list.filter((p) => p.createdByName === c)
  }
  if (q.startDate) {
    const ts = new Date(String(q.startDate)).getTime()
    list = list.filter((p) => new Date(p.paymentTime).getTime() >= ts)
  }
  if (q.endDate) {
    const ts = new Date(String(q.endDate)).getTime() + 86400000 - 1
    list = list.filter((p) => new Date(p.paymentTime).getTime() <= ts)
  }

  list.sort(
    (a, b) => new Date(b.paymentTime).getTime() - new Date(a.paymentTime).getTime(),
  )
  return list
}

function buildPaymentExportSheet(rows: PayRow[]) {
  const headers = ['右豹编码', '飞书昵称', '付费金额', '付费时间', '付费对接人', '录入人', '创建时间']
  const data = rows.map((p) => {
    const api = toApiItem(p)
    return [
      api.rightLeopardCode,
      api.larkNickname,
      api.amount,
      api.paymentTime,
      api.contactPerson ?? '',
      api.createdByName,
      api.createdAt,
    ]
  })
  return { headers, rows: data }
}

function exportPaymentFileName() {
  const d = new Date()
  const z = (n: number) => String(n).padStart(2, '0')
  return `付费记录_导出_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}.xlsx`
}

interface ImportRowBody {
  rowNumber: number
  rightLeopardCode: string
  amount: number
  paymentTime: string
  contactPerson?: string
}

interface ImportBatchStored {
  id: string
  batchNo: string
  createdAt: string
  operatorName: string
  fileName: string
  totalCount: number
  localPassCount: number
  apiPassCount: number
  failCount: number
  status: 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILED'
  failedRows: PaymentImportFailedRow[]
}

const importBatches: ImportBatchStored[] = []
let nextImportBatchSeq = 1

/** Story 5.2：历史付费迁移，与普通导入批次分表（无 500 条上限） */
const migrationImportBatches: ImportBatchStored[] = []
let nextMigrationImportBatchSeq = 1

type TryInsertResult =
  | { ok: true; row: PayRow }
  | { ok: false; code: number; message: string }

function tryInsertPayment(params: {
  user: { id: number; rightLeopardCode: string; larkNickname: string }
  amount: number
  paymentTimeIso: string
  contactPerson: string | null
  createdByName: string
}): TryInsertResult {
  const { user, amount, paymentTimeIso, contactPerson, createdByName } = params
  if (Number.isNaN(amount) || amount < 0) {
    return { ok: false, code: 10001, message: '付费金额不可为负数' }
  }
  if (paymentRecords.some((p) => p.userId === user.id)) {
    return { ok: false, code: 10003, message: '该用户已有付费记录，不可重复录入' }
  }
  const now = new Date().toISOString()
  const row: PayRow = {
    id: nextPayId++,
    userId: user.id,
    rightLeopardCode: user.rightLeopardCode,
    larkNickname: user.larkNickname,
    amount,
    paymentTime: paymentTimeIso,
    contactPerson,
    createdByName,
    createdAt: now,
  }
  paymentRecords.push(row)
  applyPaymentToUser(row)
  appendMockAuditLog({
    tableName: 'payment_records',
    actionType: 'CREATE',
    recordId: String(row.id),
    beforeData: null,
    afterData: paymentAuditSnapshot(row),
  })
  return { ok: true, row }
}

type PaymentImportMode = 'standard' | 'migration'

function finalizeImportBatch(
  batch: ImportBatchStored,
  rows: ImportRowBody[],
  operatorName: string,
  mode: PaymentImportMode = 'standard',
) {
  const failed: PaymentImportFailedRow[] = []
  const seenCodes = new Set<string>()
  let localPassCount = 0
  let apiPassCount = 0

  const userMissingMsg =
    mode === 'migration' ? '用户主档不存在' : '右豹编码不存在，请先录入用户主档'
  const duplicateMsg =
    mode === 'migration' ? '该用户已有付费记录' : '该用户已有付费记录，不可重复录入'

  const pushFail = (
    r: ImportRowBody,
    reason: string,
    amountDisplay: number | string = r.amount,
  ) => {
    failed.push({
      rowNumber: r.rowNumber,
      rightLeopardCode: String(r.rightLeopardCode ?? '').trim(),
      amount: amountDisplay,
      paymentTime: r.paymentTime,
      contactPerson: r.contactPerson?.trim() ?? '',
      reason,
    })
  }

  for (const r of rows) {
    const code = String(r.rightLeopardCode ?? '').trim()
    if (!code) {
      pushFail(r, '请填写右豹编码')
      continue
    }
    const key = code.toUpperCase()
    if (seenCodes.has(key)) {
      pushFail(r, '文件中同一用户重复出现')
      continue
    }
    seenCodes.add(key)

    const amount = Number(r.amount)
    if (Number.isNaN(amount) || amount < 0) {
      pushFail(r, '付费金额不可为负数')
      continue
    }

    if (!String(r.paymentTime ?? '').trim()) {
      pushFail(r, '请填写付费时间')
      continue
    }
    const t = new Date(r.paymentTime)
    if (Number.isNaN(t.getTime())) {
      pushFail(r, '请填写有效的付费时间')
      continue
    }

    localPassCount++

    const user = findMockUserByRightLeopardCode(code)
    if (!user) {
      pushFail(r, userMissingMsg)
      continue
    }

    const res = tryInsertPayment({
      user,
      amount,
      paymentTimeIso: t.toISOString(),
      contactPerson: r.contactPerson?.trim() || null,
      createdByName: operatorName,
    })
    if (!res.ok) {
      const reason =
        res.code === 10003 ? duplicateMsg : res.message
      pushFail(r, reason)
      continue
    }
    apiPassCount++
  }

  const failCount = failed.length
  batch.status = failCount === 0 ? 'COMPLETED' : 'PARTIAL_FAILED'
  batch.localPassCount = localPassCount
  batch.apiPassCount = apiPassCount
  batch.failCount = failCount
  batch.failedRows = failed
  batch.createdAt = new Date().toISOString()
}

export default [
  // ─── Story 5.2：历史付费迁移导入（须在 payments/import 之前注册）────────────
  {
    url: '/api/v1/migration/payments/import-batches',
    method: 'get',
    response: () => {
      ensureSeed()
      return {
        code: 0,
        message: 'success',
        data: migrationImportBatches.map((b) => ({
          id: b.id,
          batchNo: b.batchNo,
          createdAt: b.createdAt,
          operatorName: b.operatorName,
          fileName: b.fileName,
          totalCount: b.totalCount,
          localPassCount: b.localPassCount,
          apiPassCount: b.apiPassCount,
          failCount: b.failCount,
          status: b.status,
        })),
      }
    },
  },
  {
    url: '/api/v1/migration/payments/import-batches/:batchId',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      ensureSeed()
      const batchId = String(options.query.batchId ?? '')
      const b = migrationImportBatches.find((x) => x.id === batchId)
      if (!b) {
        return { code: 10002, message: '导入批次不存在', data: null }
      }
      return {
        code: 0,
        message: 'success',
        data: {
          id: b.id,
          batchNo: b.batchNo,
          createdAt: b.createdAt,
          operatorName: b.operatorName,
          fileName: b.fileName,
          totalCount: b.totalCount,
          localPassCount: b.localPassCount,
          apiPassCount: b.apiPassCount,
          failCount: b.failCount,
          status: b.status,
          failedRows: b.status === 'PROCESSING' ? [] : b.failedRows,
        },
      }
    },
  },
  {
    url: '/api/v1/migration/payments/import',
    method: 'post',
    response: (options: { body: { fileName?: string; rows?: ImportRowBody[] } }) => {
      ensureSeed()
      const body = options.body ?? {}
      const rows = Array.isArray(body.rows) ? body.rows : []
      if (rows.length === 0) {
        return { code: 400, message: '导入数据为空', data: null }
      }

      const id = `mig-pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const batchNo = `MIG-${String(nextMigrationImportBatchSeq++).padStart(6, '0')}`
      const operatorName = '当前操作员'
      const batch: ImportBatchStored = {
        id,
        batchNo,
        createdAt: new Date().toISOString(),
        operatorName,
        fileName: String(body.fileName || 'migration-import.xlsx').trim() || 'migration-import.xlsx',
        totalCount: rows.length,
        localPassCount: 0,
        apiPassCount: 0,
        failCount: 0,
        status: 'PROCESSING',
        failedRows: [],
      }
      migrationImportBatches.unshift(batch)

      const snapshot = rows.map((r) => ({ ...r }))
      setTimeout(() => {
        finalizeImportBatch(batch, snapshot, operatorName, 'migration')
      }, 480)

      return {
        code: 0,
        message: 'success',
        data: { batchId: id, status: 'processing' as const },
      }
    },
  },

  // GET /api/v1/users/:userId/payments — 用户名下付费记录（Story 4-5）
  {
    url: '/api/v1/users/:userId/payments',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      ensureSeed()
      const userId = parseInt(String(options.query.userId), 10)
      if (Number.isNaN(userId)) {
        return { code: 400, message: '无效的用户 ID', data: null }
      }
      const list = paymentRecords.filter((p) => p.userId === userId).map(toApiItem)
      return { code: 0, message: 'success', data: list }
    },
  },

  // GET /api/v1/payments/import-batches — 导入批次列表（须在 :id 之前注册）
  {
    url: '/api/v1/payments/import-batches',
    method: 'get',
    response: () => {
      ensureSeed()
      return {
        code: 0,
        message: 'success',
        data: importBatches.map((b) => ({
          id: b.id,
          batchNo: b.batchNo,
          createdAt: b.createdAt,
          operatorName: b.operatorName,
          fileName: b.fileName,
          totalCount: b.totalCount,
          localPassCount: b.localPassCount,
          apiPassCount: b.apiPassCount,
          failCount: b.failCount,
          status: b.status,
        })),
      }
    },
  },

  // GET /api/v1/payments/import-batches/:batchId
  {
    url: '/api/v1/payments/import-batches/:batchId',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      ensureSeed()
      const batchId = String(options.query.batchId ?? '')
      const b = importBatches.find((x) => x.id === batchId)
      if (!b) {
        return { code: 10002, message: '导入批次不存在', data: null }
      }
      return {
        code: 0,
        message: 'success',
        data: {
          id: b.id,
          batchNo: b.batchNo,
          createdAt: b.createdAt,
          operatorName: b.operatorName,
          fileName: b.fileName,
          totalCount: b.totalCount,
          localPassCount: b.localPassCount,
          apiPassCount: b.apiPassCount,
          failCount: b.failCount,
          status: b.status,
          failedRows:
            b.status === 'PROCESSING' ? [] : b.failedRows,
        },
      }
    },
  },

  // POST /api/v1/payments/import — 异步批量导入（Mock setTimeout）
  {
    url: '/api/v1/payments/import',
    method: 'post',
    response: (options: { body: { fileName?: string; rows?: ImportRowBody[] } }) => {
      ensureSeed()
      const body = options.body ?? {}
      const rows = Array.isArray(body.rows) ? body.rows : []
      if (rows.length === 0) {
        return { code: 400, message: '导入数据为空', data: null }
      }
      if (rows.length > 500) {
        return { code: 400, message: '单次导入上限 500 条，请分批处理', data: null }
      }

      const id = `ib-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const batchNo = `IMP-${String(nextImportBatchSeq++).padStart(6, '0')}`
      const operatorName = '当前操作员'
      const batch: ImportBatchStored = {
        id,
        batchNo,
        createdAt: new Date().toISOString(),
        operatorName,
        fileName: String(body.fileName || 'import.xlsx').trim() || 'import.xlsx',
        totalCount: rows.length,
        localPassCount: 0,
        apiPassCount: 0,
        failCount: 0,
        status: 'PROCESSING',
        failedRows: [],
      }
      importBatches.unshift(batch)

      const snapshot = rows.map((r) => ({ ...r }))
      setTimeout(() => {
        finalizeImportBatch(batch, snapshot, operatorName, 'standard')
      }, 480)

      return {
        code: 0,
        message: 'success',
        data: { batchId: id, status: 'processing' as const },
      }
    },
  },

  // GET /api/v1/payments — 分页列表
  {
    url: '/api/v1/payments',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      ensureSeed()
      const {
        page = '1',
        pageSize = '20',
        keyword = '',
        startDate = '',
        endDate = '',
        userId: userIdQ = '',
        contactPerson = '',
        createdBy = '',
      } = options.query

      let list = [...paymentRecords]

      if (keyword) {
        const kw = keyword.toLowerCase()
        list = list.filter(
          (p) =>
            p.rightLeopardCode.toLowerCase().includes(kw) ||
            p.larkNickname.toLowerCase().includes(kw) ||
            (p.contactPerson?.toLowerCase().includes(kw) ?? false) ||
            p.createdByName.toLowerCase().includes(kw),
        )
      }
      if (userIdQ !== '' && userIdQ != null) {
        const uid = Number(userIdQ)
        if (!Number.isNaN(uid)) list = list.filter((p) => p.userId === uid)
      }
      if (contactPerson) {
        list = list.filter((p) => p.contactPerson === contactPerson)
      }
      if (createdBy) {
        list = list.filter((p) => p.createdByName === createdBy)
      }
      if (startDate) {
        const ts = new Date(startDate).getTime()
        list = list.filter((p) => new Date(p.paymentTime).getTime() >= ts)
      }
      if (endDate) {
        const ts = new Date(endDate).getTime() + 86400000 - 1
        list = list.filter((p) => new Date(p.paymentTime).getTime() <= ts)
      }

      list.sort(
        (a, b) => new Date(b.paymentTime).getTime() - new Date(a.paymentTime).getTime(),
      )

      const p = Math.max(1, parseInt(page, 10) || 1)
      const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))
      const total = list.length
      const startIdx = (p - 1) * ps
      const slice = list.slice(startIdx, startIdx + ps).map(toApiItem)

      return {
        code: 0,
        message: 'success',
        data: {
          items: slice,
          total,
          page: p,
          pageSize: ps,
          meta: listMeta(),
        },
      }
    },
  },

  // POST /api/v1/payments/export — 异步导出（须在 /payments/:id 之前）
  {
    url: '/api/v1/payments/export',
    method: 'post',
    response: (options: { body: Record<string, unknown> }) => {
      ensureSeed()
      const exportId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      registerExportJobProcessing(exportId)
      const b = options.body ?? {}
      const snapshot = { ...b }
      setTimeout(() => {
        try {
          const filtered = filterPaymentsForExport(snapshot)
          const { headers, rows } = buildPaymentExportSheet(filtered)
          completeExportJob(exportId, {
            fileName: exportPaymentFileName(),
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

  // GET /api/v1/payments/:id
  {
    url: '/api/v1/payments/:id',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      ensureSeed()
      const id = parseInt(String(options.query.id), 10)
      if (Number.isNaN(id)) {
        return { code: 400, message: '无效的 ID', data: null }
      }
      const row = paymentRecords.find((r) => r.id === id)
      if (!row) return { code: 10002, message: '付费记录不存在', data: null }
      return { code: 0, message: 'success', data: toApiItem(row) }
    },
  },

  // POST /api/v1/payments
  {
    url: '/api/v1/payments',
    method: 'post',
    response: (options: {
      body: {
        rightLeopardCode?: string
        amount?: number
        paymentTime?: string
        contactPerson?: string
      }
    }) => {
      ensureSeed()
      const dto = options.body ?? {}
      const code = String(dto.rightLeopardCode ?? '').trim()
      if (!code) {
        return { code: 400, message: '请填写右豹编码', data: null }
      }
      const amount = Number(dto.amount)
      if (Number.isNaN(amount) || amount < 0) {
        return { code: 10001, message: '付费金额不可为负数', data: null }
      }
      if (!dto.paymentTime) {
        return { code: 400, message: '请填写付费时间', data: null }
      }

      const user = findMockUserByRightLeopardCode(code)
      if (!user) {
        return {
          code: 10002,
          message: '右豹编码不存在，请先录入用户主档',
          data: null,
        }
      }

      const res = tryInsertPayment({
        user,
        amount,
        paymentTimeIso: new Date(dto.paymentTime).toISOString(),
        contactPerson: dto.contactPerson?.trim() || null,
        createdByName: '当前操作员',
      })
      if (!res.ok) {
        return { code: res.code, message: res.message, data: null }
      }

      return { code: 0, message: 'success', data: toApiItem(res.row) }
    },
  },

  // PATCH /api/v1/payments/:id
  {
    url: '/api/v1/payments/:id',
    method: 'patch',
    response: (options: {
      query: Record<string, string>
      body: Record<string, unknown>
    }) => {
      ensureSeed()
      const id = parseInt(String(options.query.id), 10)
      if (Number.isNaN(id)) {
        return { code: 400, message: '无效的 ID', data: null }
      }
      const idx = paymentRecords.findIndex((r) => r.id === id)
      if (idx === -1) {
        return { code: 10002, message: '付费记录不存在', data: null }
      }
      const row = paymentRecords[idx]
      const beforeSnap = paymentAuditSnapshot({ ...row })

      const dto = options.body ?? {}
      if (dto.amount !== undefined) {
        const amt = Number(dto.amount)
        if (Number.isNaN(amt) || amt < 0) {
          return { code: 10001, message: '付费金额不可为负数', data: null }
        }
        row.amount = amt
      }
      if (dto.paymentTime !== undefined) {
        row.paymentTime = new Date(String(dto.paymentTime)).toISOString()
      }
      if (dto.contactPerson !== undefined) {
        const c = dto.contactPerson
        row.contactPerson =
          c === null || c === '' ? null : String(c).trim() || null
      }

      row.rightLeopardCode = findMockUser(row.userId)?.rightLeopardCode ?? row.rightLeopardCode
      row.larkNickname = findMockUser(row.userId)?.larkNickname ?? row.larkNickname

      applyPaymentToUser(row)

      appendMockAuditLog({
        tableName: 'payment_records',
        actionType: 'UPDATE',
        recordId: String(row.id),
        beforeData: beforeSnap,
        afterData: paymentAuditSnapshot(row),
      })

      return { code: 0, message: 'success', data: toApiItem(row) }
    },
  },

  // DELETE /api/v1/payments/:id
  {
    url: '/api/v1/payments/:id',
    method: 'delete',
    response: (options: { query: Record<string, string> }) => {
      ensureSeed()
      const id = parseInt(String(options.query.id), 10)
      if (Number.isNaN(id)) {
        return { code: 400, message: '无效的 ID', data: null }
      }
      const idx = paymentRecords.findIndex((r) => r.id === id)
      if (idx === -1) {
        return { code: 10002, message: '付费记录不存在', data: null }
      }
      const row = paymentRecords[idx]
      const beforeSnap = paymentAuditSnapshot(row)
      const userId = row.userId
      paymentRecords.splice(idx, 1)
      clearPaymentOnUser(userId)

      appendMockAuditLog({
        tableName: 'payment_records',
        actionType: 'DELETE',
        recordId: String(id),
        beforeData: beforeSnap,
        afterData: null,
      })

      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
