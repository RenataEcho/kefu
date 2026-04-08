import { get, post } from '@/api/request'
import type {
  MigrationReport,
  MigrationReverifyStartResponse,
  MigrationReverifyTask,
} from '@/types/migrationReverify'

export function fetchMigrationReport(): Promise<MigrationReport> {
  return get<MigrationReport>('/migration/report')
}

export function postMigrationReverify(): Promise<MigrationReverifyStartResponse> {
  return post<MigrationReverifyStartResponse>('/migration/reverify', {})
}

export function fetchMigrationReverifyTask(taskId: string): Promise<MigrationReverifyTask> {
  return get<MigrationReverifyTask>(`/migration/reverify/${taskId}`)
}
