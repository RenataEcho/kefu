export interface PaymentRecordItem {
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

export interface PaymentListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  startDate?: string | null
  endDate?: string | null
  userId?: number | null
  contactPerson?: string | null
  createdBy?: string | null
}

export interface PaymentListMeta {
  contactPersons: string[]
  creators: string[]
}

export interface PaginatedPayments {
  items: PaymentRecordItem[]
  total: number
  page: number
  pageSize: number
  meta: PaymentListMeta
}

export interface CreatePaymentDto {
  rightLeopardCode: string
  amount: number
  paymentTime: string
  contactPerson?: string
}

export interface UpdatePaymentDto {
  amount?: number
  paymentTime?: string
  contactPerson?: string | null
}

/** ─── 批量导入（Story 4-6） ───────────────────────────────────── */

export interface PaymentImportRowInput {
  rowNumber: number
  rightLeopardCode: string
  amount: number
  paymentTime: string
  contactPerson?: string
}

export interface PaymentImportFailedRow {
  rowNumber: number
  rightLeopardCode: string
  amount: number | string
  paymentTime: string
  contactPerson: string
  reason: string
}

export type PaymentImportBatchStatus = 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILED'

export interface PaymentImportBatch {
  id: string
  batchNo: string
  createdAt: string
  operatorName: string
  fileName: string
  totalCount: number
  localPassCount: number
  apiPassCount: number
  failCount: number
  status: PaymentImportBatchStatus
  /** 列表接口可省略；详情在完成后返回 */
  failedRows?: PaymentImportFailedRow[]
}

export interface PaymentImportStartResponse {
  batchId: string
  status: 'processing'
}

export interface PaymentImportRequestBody {
  fileName: string
  rows: PaymentImportRowInput[]
}
