/** Story 5.3：批量补校验与迁移验证报告（Mock /api/v1/migration/*） */

export interface MigrationReport {
  total: number
  verified: number
  pendingVerify: number
  invalid: number
  failed: number
}

export type MigrationReverifyTaskStatus = 'running' | 'completed'

export interface MigrationReverifyTask {
  id: string
  status: MigrationReverifyTaskStatus
  processed: number
  total: number
}

export interface MigrationReverifyStartResponse {
  taskId: string
}
