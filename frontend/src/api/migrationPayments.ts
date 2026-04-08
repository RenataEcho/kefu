import { get, post } from '@/api/request'
import type {
  PaymentImportBatch,
  PaymentImportRequestBody,
  PaymentImportStartResponse,
} from '@/types/payment'

/** Story 5.2：历史付费记录迁移（无单次条数上限，失败原因文案与 4-6 区分） */
export function fetchMigrationPaymentImportBatches(): Promise<PaymentImportBatch[]> {
  return get<PaymentImportBatch[]>('/migration/payments/import-batches')
}

export function fetchMigrationPaymentImportBatch(
  batchId: string,
): Promise<PaymentImportBatch> {
  return get<PaymentImportBatch>(`/migration/payments/import-batches/${batchId}`)
}

export function submitMigrationPaymentImport(
  body: PaymentImportRequestBody,
): Promise<PaymentImportStartResponse> {
  return post<PaymentImportStartResponse>('/migration/payments/import', body)
}
