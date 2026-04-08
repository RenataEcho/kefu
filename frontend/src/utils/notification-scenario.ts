/** Story 6-3：通知场景中文映射 */
export const SCENARIO_LABELS: Record<string, string> = {
  AUDIT_APPROVED: '审核通过',
  AUDIT_REJECTED: '审核拒绝',
  SLA_ALERT_FIRST: 'SLA首次预警',
  SLA_ALERT_SECOND: 'SLA二次催促',
}

export function scenarioLabel(scenario: string): string {
  return SCENARIO_LABELS[scenario] ?? scenario
}

/** 原型 §2.4：当前唯一渠道 */
export const CHANNEL_LABELS: Record<string, string> = {
  WECHAT: '微信服务号',
  LARK: '飞书',
}

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel
}
