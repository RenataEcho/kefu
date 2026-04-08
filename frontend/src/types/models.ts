import type { RoleCode } from './permission'

export interface User {
  id: number
  username: string
  displayName: string
  email: string
  role: RoleCode
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: number
  username: string
  displayName: string
  role: RoleCode
  status: 'active' | 'disabled'
  lastLoginAt: string | null
  createdAt: string
}
