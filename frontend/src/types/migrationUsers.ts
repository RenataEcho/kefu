/** Story 5.1：历史用户主档迁移（Mock /api/v1/migration/users/*） */

export type MigrationUserImportStatus = 'PROCESSING' | 'COMPLETED'

export interface MigrationUserImportRowInput {
  rowNumber: number
  rightLeopardCode: string
  rightLeopardId?: string
  larkId?: string
  larkPhone?: string
  larkNickname?: string
  agentName?: string
  mentorName?: string
  schoolName?: string
}

export interface MigrationUserImportFailedRow {
  rowNumber: number
  field?: string
  rightLeopardCode?: string
  reason: string
}

export interface MigrationUserImportBatch {
  id: string
  batchNo: string
  importType: 'MIGRATION_USER'
  fileName: string
  createdAt: string
  operatorName: string
  status: MigrationUserImportStatus
  totalCount: number
  successCount: number
  failCount: number
  /** 成功行均为 PENDING_VERIFY */
  pendingVerifyCount: number
  failedRows: MigrationUserImportFailedRow[]
}

export interface MigrationUserImportStartResponse {
  batchId: string
  status: 'processing'
}
