export const MENU_PERMS = {
  DASHBOARD: 'dashboard:read',
  USERS: 'users:read',
  /** Story 5.2 / 5.3：数据迁移中心 */
  MIGRATION: 'migration:read',
  PAYMENTS: 'payments:read',
  AUDIT: 'audit:read',
  NOTIFICATIONS: 'notifications:read',
  SLA_ALERTS: 'sla-alerts:read',
  LARK_FRIENDS: 'lark-friends:read',
  ORG_MANAGEMENT: 'org:read',
  RBAC: 'rbac:read',
  ACCOUNTS: 'accounts:read',
  AUDIT_LOGS: 'audit-logs:read',
} as const

export const OPERATION_PERMS = {
  DASHBOARD_EXPORT: 'dashboard:export',
  ORG_MANAGE: 'org:manage',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_IMPORT: 'users:import',
  /** Story 5.1：历史用户主档迁移导入（无 500 条上限） */
  USERS_MIGRATION_IMPORT: 'users:migration:import',
  /** Story 5.2：历史付费记录迁移导入 */
  PAYMENTS_MIGRATION_IMPORT: 'payments:migration:import',
  /** Story 5.3：批量补校验 */
  MIGRATION_REVERIFY: 'migration:reverify',
  USERS_EXPORT: 'users:export',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_UPDATE: 'payments:update',
  PAYMENTS_DELETE: 'payments:delete',
  PAYMENTS_IMPORT: 'payments:import',
  PAYMENTS_EXPORT: 'payments:export',
  AUDIT_APPROVE: 'audit:approve',
  AUDIT_REJECT: 'audit:reject',
  AUDIT_IMPORT: 'audit:import',
  AUDIT_EXPORT: 'audit:export',
  ACCOUNTS_MANAGE: 'accounts:manage',
  ROLES_MANAGE: 'roles:manage',
} as const

/** 与 PRD 用户主档字段分级表及补充需求「敏感字段权限」对齐的可配置字段 key */
export const FIELD_PERMS = {
  YOUBAO_CODE: 'youbaoCode',
  FEISHU_NICKNAME: 'feishuNickname',
  FEISHU_USER_ID: 'feishuUserId',
  FEISHU_PHONE: 'feishuPhone',
  YOUBAO_ID: 'youbaoId',
  ORG_ASSIGNMENT: 'orgAssignment',
  PAYMENT_AMOUNT: 'paymentAmount',
  PAYMENT_CONTACT: 'paymentContact',
  WX_OPEN_ID: 'wxOpenId',
} as const

export type MenuPermKey = keyof typeof MENU_PERMS
export type OperationPermKey = keyof typeof OPERATION_PERMS
export type FieldPermKey = keyof typeof FIELD_PERMS
