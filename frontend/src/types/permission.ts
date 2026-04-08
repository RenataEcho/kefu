export type RoleCode = 'admin' | 'supervisor' | 'kefu' | 'auditor'

export interface RbacPermissions {
  menuPerms: string[]
  operationPerms: string[]
  fieldPerms: Record<string, boolean>
}

export interface RbacRole {
  id: number
  name: string
  department: string
  accountCount: number
  permissions: RbacPermissions
  createdAt: string
}

export interface CreateRoleDto {
  name: string
  department: string
  permissions: RbacPermissions
}

export interface UpdateRoleDto {
  name?: string
  department?: string
  permissions?: RbacPermissions
}
