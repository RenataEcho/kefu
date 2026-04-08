/** 供 dev Mock 与用户详情 Mock 共享：模拟右豹 APP API 不可用（Story 4-4 AC#4） */

let simulateYoubaoApiDown = false

export function setSimulateYoubaoApiDown(value: boolean) {
  simulateYoubaoApiDown = value
}

export function isYoubaoApiSimulatedDown(): boolean {
  return simulateYoubaoApiDown
}
