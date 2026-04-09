import type { MockMethod } from 'vite-plugin-mock'
import { orgMentors, orgSchools, schoolNameById } from './organizationData'
import {
  takeNextMockUserId,
  insertCreatedMockUser,
  findMockUserByRightLeopardCode,
  MOCK_AGENTS,
  type MockUser,
} from './users'
import type {
  MigrationUserImportBatch,
  MigrationUserImportFailedRow,
  MigrationUserImportRowInput,
} from '@/types/migrationUsers'

let nextBatchSeq = 1

interface StoredBatch extends MigrationUserImportBatch {
  /** 处理完成前为空 */
  failedRows: MigrationUserImportFailedRow[]
}

const batches: StoredBatch[] = []

let migrationUserDemoSeeded = false

function seedDemoMigrationUserBatches() {
  if (migrationUserDemoSeeded) return
  migrationUserDemoSeeded = true
  const t0 = new Date(Date.now() - 86400000 * 18).toISOString()
  const t1 = new Date(Date.now() - 86400000 * 9).toISOString()
  batches.push(
    {
      id: 'mig-user-demo-1',
      batchNo: 'MIG-000501',
      importType: 'MIGRATION_USER',
      fileName: '历史主档_华东区.xlsx',
      createdAt: t0,
      operatorName: '迁移专员-陈',
      status: 'COMPLETED',
      totalCount: 240,
      successCount: 238,
      failCount: 2,
      pendingVerifyCount: 238,
      failedRows: [
        { rowNumber: 15, field: '右豹编码', rightLeopardCode: 'RB010001', reason: '编码已存在' },
        { rowNumber: 66, field: '右豹编码', rightLeopardCode: '', reason: '右豹编码为空' },
      ],
    },
    {
      id: 'mig-user-demo-2',
      batchNo: 'MIG-000502',
      importType: 'MIGRATION_USER',
      fileName: '历史主档_华南补录.xlsx',
      createdAt: t1,
      operatorName: '迁移专员-刘',
      status: 'COMPLETED',
      totalCount: 56,
      successCount: 56,
      failCount: 0,
      pendingVerifyCount: 56,
      failedRows: [],
    },
  )
}

function resolveAgent(name?: string): { id: number; name: string } {
  const t = name?.trim()
  if (!t) return { id: MOCK_AGENTS[0]!.id, name: MOCK_AGENTS[0]!.name }
  const a = MOCK_AGENTS.find((x) => x.name === t)
  return a ? { id: a.id, name: a.name } : { id: 0, name: '' }
}

function resolveMentor(name?: string): { id: number; name: string; schoolId: number; schoolName: string } {
  const t = name?.trim()
  if (!t) {
    const m = orgMentors[0]!
    return { id: m.id, name: m.name, schoolId: m.schoolId, schoolName: schoolNameById(m.schoolId) }
  }
  const m = orgMentors.find((x) => x.name === t)
  return m
    ? { id: m.id, name: m.name, schoolId: m.schoolId, schoolName: schoolNameById(m.schoolId) }
    : { id: 0, name: '', schoolId: 0, schoolName: '' }
}

function resolveSchool(name?: string, mentorSchoolId?: number): { id: number; name: string } {
  const t = name?.trim()
  if (t) {
    const s = orgSchools.find((x) => x.name === t)
    if (s) return { id: s.id, name: s.name }
  }
  if (mentorSchoolId) {
    const s = orgSchools.find((x) => x.id === mentorSchoolId)
    if (s) return { id: s.id, name: s.name }
  }
  const s0 = orgSchools[0]!
  return { id: s0.id, name: s0.name }
}

function processMigrationBatch(batchId: string, rows: MigrationUserImportRowInput[]) {
  const batch = batches.find((b) => b.id === batchId)
  if (!batch) return

  const failed: MigrationUserImportFailedRow[] = []
  let success = 0

  for (const row of rows) {
    if (findMockUserByRightLeopardCode(row.rightLeopardCode)) {
      failed.push({
        rowNumber: row.rowNumber,
        field: '右豹编码',
        rightLeopardCode: row.rightLeopardCode,
        reason: '编码已存在',
      })
      continue
    }

    const agent = resolveAgent(row.agentName)
    const mentor = resolveMentor(row.mentorName)
    const school = resolveSchool(row.schoolName, mentor.schoolId || undefined)

    const newUser: MockUser = {
      id: takeNextMockUserId(),
      rightLeopardCode: row.rightLeopardCode.trim(),
      rightLeopardId: row.rightLeopardId?.trim() ?? `mig_${Date.now()}_${row.rowNumber}`,
      larkId: row.larkId?.trim() ?? '',
      larkNickname: row.larkNickname?.trim() ?? `迁移用户${row.rowNumber}`,
      larkPhone: row.larkPhone?.trim() ?? '',
      codeVerifyStatus: 'PENDING_VERIFY',
      agentId: agent.id,
      agent: { id: agent.id, name: agent.name },
      mentorId: mentor.id,
      mentor: { id: mentor.id, name: mentor.name },
      schoolId: school.id,
      school: { id: school.id, name: school.name },
      isPaid: false,
      paymentAmount: null,
      paymentPaidAt: null,
      paymentContact: null,
      createdAt: new Date().toISOString(),
      groupAuditsCount: 0,
      paymentRecordsCount: 0,
    }

    insertCreatedMockUser(newUser)
    success += 1
  }

  batch.status = 'COMPLETED'
  batch.successCount = success
  batch.failCount = failed.length
  batch.pendingVerifyCount = success
  batch.failedRows = failed
}

export default [
  {
    url: '/api/v1/migration/users/import',
    method: 'post',
    response: (opt: { body?: { fileName?: string; rows?: MigrationUserImportRowInput[]; type?: string } }) => {
      const body = opt.body ?? {}
      const rows = Array.isArray(body.rows) ? body.rows : []
      if (rows.length === 0) {
        return { code: 400, message: '导入数据为空', data: null }
      }

      const id = `mig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const batchNo = `MIG-${String(nextBatchSeq++).padStart(6, '0')}`
      const batch: StoredBatch = {
        id,
        batchNo,
        importType: 'MIGRATION_USER',
        fileName: String(body.fileName || 'migration.xlsx').trim() || 'migration.xlsx',
        createdAt: new Date().toISOString(),
        operatorName: '当前操作员',
        status: 'PROCESSING',
        totalCount: rows.length,
        successCount: 0,
        failCount: 0,
        pendingVerifyCount: 0,
        failedRows: [],
      }
      batches.unshift(batch)

      const snapshot = rows.map((r) => ({ ...r }))
      setTimeout(() => {
        processMigrationBatch(id, snapshot)
      }, 620)

      return {
        code: 0,
        message: 'success',
        data: { batchId: id, status: 'processing' as const },
      }
    },
  },
  {
    url: '/api/v1/migration/users/import-batches',
    method: 'get',
    response: () => {
      seedDemoMigrationUserBatches()
      return {
        code: 0,
        message: 'success',
        data: {
          items: batches.map((b) => ({
            id: b.id,
            batchNo: b.batchNo,
            importType: b.importType,
            fileName: b.fileName,
            createdAt: b.createdAt,
            operatorName: b.operatorName,
            status: b.status,
            totalCount: b.totalCount,
            successCount: b.successCount,
            failCount: b.failCount,
            pendingVerifyCount: b.pendingVerifyCount,
          })),
          total: batches.length,
        },
      }
    },
  },
  {
    url: '/api/v1/migration/users/import-batches/:batchId',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      seedDemoMigrationUserBatches()
      const batchId = String(opt.query.batchId ?? '')
      const b = batches.find((x) => x.id === batchId)
      if (!b) return { code: 10002, message: '批次不存在', data: null }
      return {
        code: 0,
        message: 'success',
        data: b,
      }
    },
  },
] as MockMethod[]
