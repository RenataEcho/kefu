import { get, post, patch, del } from '@/api/request'
import type {
  PaymentListQuery,
  PaginatedPayments,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentRecordItem,
  PaymentImportBatch,
  PaymentImportStartResponse,
  PaymentImportRequestBody,
} from '@/types/payment'

export function fetchPayments(query: PaymentListQuery): Promise<PaginatedPayments> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  }
  if (query.keyword) params.keyword = query.keyword
  if (query.startDate) params.startDate = query.startDate
  if (query.endDate) params.endDate = query.endDate
  if (query.userId != null) params.userId = query.userId
  if (query.contactPerson) params.contactPerson = query.contactPerson
  if (query.createdBy) params.createdBy = query.createdBy

  return get<PaginatedPayments>('/payments', { params })
}

export function fetchPayment(id: number): Promise<PaymentRecordItem> {
  return get<PaymentRecordItem>(`/payments/${id}`)
}

export function createPayment(dto: CreatePaymentDto): Promise<PaymentRecordItem> {
  return post<PaymentRecordItem>('/payments', dto)
}

export function updatePayment(id: number, dto: UpdatePaymentDto): Promise<PaymentRecordItem> {
  return patch<PaymentRecordItem>(`/payments/${id}`, dto)
}

export function deletePayment(id: number): Promise<void> {
  return del<void>(`/payments/${id}`)
}

export function fetchPaymentsByUserId(userId: number): Promise<PaymentRecordItem[]> {
  return get<PaymentRecordItem[]>(`/users/${userId}/payments`)
}

export function fetchImportBatches(): Promise<PaymentImportBatch[]> {
  return get<PaymentImportBatch[]>('/payments/import-batches')
}

export function fetchImportBatch(batchId: string): Promise<PaymentImportBatch> {
  return get<PaymentImportBatch>(`/payments/import-batches/${batchId}`)
}

export function submitPaymentImport(
  body: PaymentImportRequestBody,
): Promise<PaymentImportStartResponse> {
  return post<PaymentImportStartResponse>('/payments/import', body)
}
