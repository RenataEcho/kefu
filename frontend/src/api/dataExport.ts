import { get, post } from '@/api/request'
import type { StartExportResponse, ExportJobPollData } from '@/types/dataExport'
import type { UserListQuery } from '@/types/user'
import type { PaymentListQuery } from '@/types/payment'

export type UsersExportBody = Omit<UserListQuery, 'page' | 'pageSize'>

export type PaymentsExportBody = Omit<PaymentListQuery, 'page' | 'pageSize'>

export function startUsersExport(body: UsersExportBody): Promise<StartExportResponse> {
  return post<StartExportResponse>('/users/export', body)
}

export function startPaymentsExport(body: PaymentsExportBody): Promise<StartExportResponse> {
  return post<StartExportResponse>('/payments/export', body)
}

export function fetchExportStatus(exportId: string): Promise<ExportJobPollData> {
  return get<ExportJobPollData>(`/exports/${exportId}`)
}
