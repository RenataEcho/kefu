import { get, post } from '@/api/request'
import type {
  MigrationUserImportBatch,
  MigrationUserImportRowInput,
  MigrationUserImportStartResponse,
} from '@/types/migrationUsers'

export function postMigrationUserImport(body: {
  fileName: string
  rows: MigrationUserImportRowInput[]
}): Promise<MigrationUserImportStartResponse> {
  return post<MigrationUserImportStartResponse>('/migration/users/import', {
    type: 'MIGRATION',
    ...body,
  })
}

export function fetchMigrationUserImportBatches(): Promise<{
  items: Omit<MigrationUserImportBatch, 'failedRows'>[]
  total: number
}> {
  return get('/migration/users/import-batches')
}

export function fetchMigrationUserImportBatchDetail(
  batchId: string,
): Promise<MigrationUserImportBatch> {
  return get<MigrationUserImportBatch>(`/migration/users/import-batches/${batchId}`)
}
