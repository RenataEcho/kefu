export type AdminAccountStatus = 'ACTIVE' | 'DISABLED'

/** 列表/详情（不含 passwordHash，NFR7） */
export interface AdminAccount {
  id: number
  name: string
  loginId: string
  roleId: number
  roleName: string
  isAuditor: boolean
  status: AdminAccountStatus
  createdAt: string
  /** 列表展示「已设置」，由接口布尔表示 */
  passwordSet: boolean
}

export interface PaginatedAccounts {
  list: AdminAccount[]
  total: number
  page: number
  pageSize: number
}

export interface AccountListQuery {
  page: number
  pageSize: number
  roleId?: number
  isAuditor?: boolean
}

export interface CreateAccountDto {
  name: string
  loginId: string
  password: string
  roleId: number
  isAuditor?: boolean
}

export interface UpdateAccountDto {
  name?: string
  roleId?: number
  isAuditor?: boolean
  status?: AdminAccountStatus
}

export interface ResetPasswordResult {
  newPassword: string
}
