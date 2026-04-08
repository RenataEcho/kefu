import type { AuditActionType } from '@/types/auditLog'

export const TABLE_NAME_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'users', label: '用户主档' },
  { value: 'payment_records', label: '付费记录' },
  { value: 'group_audits', label: '入群审核' },
  { value: 'agents', label: '客服' },
  { value: 'mentors', label: '导师' },
  { value: 'schools', label: '门派' },
] as const

export function tableLabel(tableName: string): string {
  const o = TABLE_NAME_OPTIONS.find((x) => x.value === tableName)
  return o?.label ?? tableName
}

const ACTION_TYPE_MAP: Record<
  AuditActionType,
  { label: string; type: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  CREATE: { label: '创建', type: 'success' },
  UPDATE: { label: '修改', type: 'warning' },
  DELETE: { label: '删除', type: 'error' },
  AUDIT_APPROVE: { label: '审核通过', type: 'success' },
  AUDIT_REJECT: { label: '审核拒绝', type: 'error' },
  ARCHIVE: { label: '归档', type: 'default' },
  IMPORT: { label: '批量导入', type: 'info' },
  EXPORT: { label: '数据导出', type: 'info' },
}

export function actionTypeLabel(action: string): string {
  return ACTION_TYPE_MAP[action as AuditActionType]?.label ?? action
}

export function actionTypeTagType(action: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  return ACTION_TYPE_MAP[action as AuditActionType]?.type ?? 'default'
}

export const ACTION_FILTER_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'CREATE', label: '创建' },
  { value: 'UPDATE', label: '修改' },
  { value: 'DELETE', label: '删除' },
  { value: 'AUDIT_APPROVE', label: '审核通过' },
  { value: 'AUDIT_REJECT', label: '审核拒绝' },
  { value: 'ARCHIVE', label: '归档' },
  { value: 'IMPORT', label: '批量导入' },
  { value: 'EXPORT', label: '数据导出' },
]
