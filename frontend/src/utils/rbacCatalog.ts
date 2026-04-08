/**
 * RBAC 全量操作/字段清单：角色分配抽屉与 Mock 持久化共用（Supplement Step 11）
 */
import { OPERATION_PERMS, FIELD_PERMS } from '@/utils/permission'

/** 操作权限值 → 侧栏菜单 key（用于取消菜单时级联清除操作、计算半选） */
export const OPERATION_TO_MENU_KEY: Record<string, string> = {
  [OPERATION_PERMS.DASHBOARD_EXPORT]: 'dashboard',
  [OPERATION_PERMS.ORG_MANAGE]: 'org',
  [OPERATION_PERMS.USERS_CREATE]: 'users',
  [OPERATION_PERMS.USERS_UPDATE]: 'users',
  [OPERATION_PERMS.USERS_DELETE]: 'users',
  [OPERATION_PERMS.USERS_IMPORT]: 'users',
  [OPERATION_PERMS.USERS_MIGRATION_IMPORT]: 'migration',
  [OPERATION_PERMS.USERS_EXPORT]: 'users',
  [OPERATION_PERMS.PAYMENTS_CREATE]: 'payments',
  [OPERATION_PERMS.PAYMENTS_UPDATE]: 'payments',
  [OPERATION_PERMS.PAYMENTS_DELETE]: 'payments',
  [OPERATION_PERMS.PAYMENTS_IMPORT]: 'payments',
  [OPERATION_PERMS.PAYMENTS_MIGRATION_IMPORT]: 'migration',
  [OPERATION_PERMS.PAYMENTS_EXPORT]: 'payments',
  [OPERATION_PERMS.MIGRATION_REVERIFY]: 'migration',
  [OPERATION_PERMS.AUDIT_APPROVE]: 'audit',
  [OPERATION_PERMS.AUDIT_REJECT]: 'audit',
  [OPERATION_PERMS.AUDIT_IMPORT]: 'audit',
  [OPERATION_PERMS.AUDIT_EXPORT]: 'audit',
  [OPERATION_PERMS.ACCOUNTS_MANAGE]: 'accounts',
  [OPERATION_PERMS.ROLES_MANAGE]: 'rbac',
}

export const MENU_KEY_LABEL: Record<string, string> = {
  dashboard: '数据看板',
  users: '用户主档',
  migration: '数据迁移',
  payments: '付费记录',
  audit: '入群审核',
  org: '组织管理',
  accounts: '账号管理',
  rbac: '角色管理',
  'lark-friends': '飞书好友',
  notifications: '通知失败记录',
  'sla-alerts': 'SLA 预警记录',
}

export interface OperationPermOption {
  key: string
  label: string
  menuKey: string
}

export const OPERATION_PERM_OPTIONS: OperationPermOption[] = (
  Object.keys(OPERATION_PERMS) as (keyof typeof OPERATION_PERMS)[]
).map((k) => {
  const key = OPERATION_PERMS[k]
  const menuKey = OPERATION_TO_MENU_KEY[key] ?? 'dashboard'
  const labels: Partial<Record<keyof typeof OPERATION_PERMS, string>> = {
    DASHBOARD_EXPORT: '导出报告',
    ORG_MANAGE: '组织维护（增删改）',
    USERS_CREATE: '用户 — 新增',
    USERS_UPDATE: '用户 — 修改',
    USERS_DELETE: '用户 — 删除',
    USERS_IMPORT: '用户 — 导入',
    USERS_MIGRATION_IMPORT: '用户 — 历史主档迁移导入',
    USERS_EXPORT: '用户 — 导出',
    PAYMENTS_CREATE: '付费 — 新增',
    PAYMENTS_UPDATE: '付费 — 修改',
    PAYMENTS_DELETE: '付费 — 删除',
    PAYMENTS_IMPORT: '付费 — 导入',
    PAYMENTS_MIGRATION_IMPORT: '付费 — 历史记录迁移导入',
    PAYMENTS_EXPORT: '付费 — 导出',
    MIGRATION_REVERIFY: '迁移 — 批量补校验',
    AUDIT_APPROVE: '审核 — 通过',
    AUDIT_REJECT: '审核 — 拒绝',
    AUDIT_IMPORT: '审核 — 手动导入',
    AUDIT_EXPORT: '审核 — 导出',
    ACCOUNTS_MANAGE: '账号 — 管理',
    ROLES_MANAGE: '角色 — 管理',
  }
  return {
    key,
    label: labels[k] ?? key,
    menuKey,
  }
})

export interface FieldPermOption {
  key: string
  label: string
}

export const FIELD_PERM_OPTIONS: FieldPermOption[] = [
  { key: FIELD_PERMS.YOUBAO_CODE, label: '右豹编码' },
  { key: FIELD_PERMS.FEISHU_NICKNAME, label: '飞书昵称' },
  { key: FIELD_PERMS.FEISHU_USER_ID, label: '飞书 ID' },
  { key: FIELD_PERMS.FEISHU_PHONE, label: '飞书手机号' },
  { key: FIELD_PERMS.YOUBAO_ID, label: '右豹 ID' },
  { key: FIELD_PERMS.ORG_ASSIGNMENT, label: '所属客服 / 导师 / 门派' },
  { key: FIELD_PERMS.PAYMENT_AMOUNT, label: '项目收益（原付费金额）' },
  { key: FIELD_PERMS.PAYMENT_CONTACT, label: '付费对接人' },
  { key: FIELD_PERMS.WX_OPEN_ID, label: '微信 OpenID（系统字段，界面默认不展示）' },
]

/** 未在角色中显式配置时：敏感类默认不可见，其余默认可见 */
export const FIELD_PERM_SENSITIVE_KEYS = new Set<string>([
  FIELD_PERMS.PAYMENT_AMOUNT,
  FIELD_PERMS.PAYMENT_CONTACT,
  FIELD_PERMS.WX_OPEN_ID,
])

export function groupOperationOptions(): { menuKey: string; title: string; items: OperationPermOption[] }[] {
  const order = [
    'dashboard',
    'users',
    'payments',
    'migration',
    'audit',
    'org',
    'accounts',
    'rbac',
  ]
  const map = new Map<string, OperationPermOption[]>()
  for (const opt of OPERATION_PERM_OPTIONS) {
    const list = map.get(opt.menuKey) ?? []
    list.push(opt)
    map.set(opt.menuKey, list)
  }
  return order
    .filter((mk) => map.has(mk))
    .map((menuKey) => ({
      menuKey,
      title: MENU_KEY_LABEL[menuKey] ?? menuKey,
      items: map.get(menuKey)!,
    }))
}
