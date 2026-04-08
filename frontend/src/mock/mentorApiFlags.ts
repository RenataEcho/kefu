/** Story 3-4 Mock：模拟第三方导师 API 不可用（对齐 UX §4.1 / prototype 导师 API 降级） */

let simulateMentorApiDown = false

export function setSimulateMentorApiDown(value: boolean) {
  simulateMentorApiDown = value
}

export function isMentorApiSimulatedDown(): boolean {
  return simulateMentorApiDown
}
