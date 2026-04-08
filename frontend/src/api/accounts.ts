import axios from 'axios'
import request, { get, post, patch } from '@/api/request'
import type {
  AccountListQuery,
  AdminAccount,
  CreateAccountDto,
  PaginatedAccounts,
  ResetPasswordResult,
  UpdateAccountDto,
} from '@/types/account'

export function fetchAccounts(query: AccountListQuery): Promise<PaginatedAccounts> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: query.pageSize,
  }
  if (query.roleId != null) params.roleId = query.roleId
  if (query.isAuditor !== undefined) params.isAuditor = query.isAuditor ? 'true' : 'false'
  return get<PaginatedAccounts>('/accounts', { params })
}

export function fetchAccountDetail(id: number): Promise<AdminAccount> {
  return get<AdminAccount>(`/accounts/${id}`)
}

export function createAccount(dto: CreateAccountDto): Promise<AdminAccount> {
  return post<AdminAccount>('/accounts', dto)
}

export function updateAccount(id: number, dto: UpdateAccountDto): Promise<AdminAccount> {
  return patch<AdminAccount>(`/accounts/${id}`, dto)
}

export function resetAccountPassword(id: number): Promise<ResetPasswordResult> {
  return post<ResetPasswordResult>(`/accounts/${id}/reset-password`, {})
}

export async function deleteAccount(id: number): Promise<void> {
  try {
    await request.delete(`/accounts/${id}`)
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
      const d = e.response.data as { message?: string }
      if (d.message) throw new Error(d.message)
    }
    throw e instanceof Error ? e : new Error('删除失败')
  }
}
