/**
 * 导师类型 Mock 内存表（补充需求 Phase I · Supplement Step 6）
 */

export type MentorTypeStatus = 'ENABLED' | 'DISABLED'

export interface MentorTypeRecord {
  id: number
  name: string
  createdAt: string
  status: MentorTypeStatus
}

const base = new Date('2025-08-01T08:00:00.000Z').getTime()

export const mockMentorTypeStore: { rows: MentorTypeRecord[] } = {
  rows: [
    { id: 1, name: '金牌导师', createdAt: new Date(base).toISOString(), status: 'ENABLED' },
    { id: 2, name: '实习导师', createdAt: new Date(base + 86400000 * 2).toISOString(), status: 'ENABLED' },
    { id: 3, name: '储备导师', createdAt: new Date(base + 86400000 * 5).toISOString(), status: 'DISABLED' },
  ],
}

let nextMentorTypeId =
  mockMentorTypeStore.rows.reduce((m, r) => Math.max(m, r.id), 0) + 1

export function takeNextMentorTypeId(): number {
  return nextMentorTypeId++
}

export function mentorTypeNameById(id: number): string {
  return mockMentorTypeStore.rows.find((r) => r.id === id)?.name ?? '—'
}
