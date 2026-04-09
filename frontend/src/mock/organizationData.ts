/**
 * 门派 / 导师 Mock 共享内存（避免 schools ↔ mentors 循环依赖）
 * Story 3-1 / 3-3 · 补充需求 Phase I（门派负责人、导师类型、项目明细等）
 */

import type { MentorProjectRow } from '@/types/mentor'

export type OrgSchoolStatus = 'ENABLED' | 'DISABLED'

export interface OrgSchoolRecord {
  id: number
  name: string
  status: OrgSchoolStatus
  createdAt: string
  /** 门派负责人 */
  leader: string
  /** 导师介绍（富文本 HTML） */
  introductionHtml: string
}

export interface OrgMentorRecord {
  id: number
  name: string
  schoolId: number
  status: OrgSchoolStatus
  mentorTypeId: number
  feishuPhone: string
  introductionHtml: string
  projects: MentorProjectRow[]
  /** 关联用户主档学员数（删除拦截） */
  linkedUserCount: number
  /** 第三方同步：学员数 */
  syncedStudentCount: number
  projectCount: number
  totalRevenue: number
  lastSyncedAt: string | null
  createdAt: string
  /** 原型 §2.6：收益明细展开 */
  revenueDetail: { period: string; amountYuan: number }[]
  /** Story 8-2/8-3 Mock：飞书 OAuth（仅 Mock 内存，不明文 token） */
  larkOauthExpiresAt: string | null
  larkDisplayName: string | null
}

const base = new Date('2025-07-01T00:00:00.000Z').getTime()

const schoolNames = ['华山派', '武当派', '峨眉派', '少林派', '丐帮', '明教']
const schoolLeaders = ['岳不群', '张三丰', '灭绝师太', '玄慈', '史火龙', '张无忌']

function allocationPeriod(seed: number): Pick<MentorProjectRow, 'allocationPeriodStart' | 'allocationPeriodEnd'> {
  const start = new Date(base + seed * 86400000 * 11)
  const end = new Date(start.getTime() + (45 + (seed % 40)) * 86400000)
  return {
    allocationPeriodStart: start.toISOString(),
    allocationPeriodEnd: end.toISOString(),
  }
}

function demoProjects(prefix: string): MentorProjectRow[] {
  return [
    {
      projectName: `${prefix}-星辰短剧`,
      businessCategory: '短剧',
      ...allocationPeriod(1),
      keywordCount: 86,
      backfillCount: 32,
      orderCount: 24,
      settledRevenueYuan: 18600,
      pendingRevenueYuan: 4200,
    },
    {
      projectName: `${prefix}-推文矩阵`,
      businessCategory: '推文',
      ...allocationPeriod(2),
      keywordCount: 142,
      backfillCount: 58,
      orderCount: 41,
      settledRevenueYuan: 9200,
      pendingRevenueYuan: 3100,
    },
    {
      projectName: `${prefix}-端原生联运`,
      businessCategory: '端原生',
      ...allocationPeriod(3),
      keywordCount: 55,
      backfillCount: 19,
      orderCount: 12,
      settledRevenueYuan: 5400,
      pendingRevenueYuan: 800,
    },
  ]
}

export const orgSchools: OrgSchoolRecord[] = schoolNames.map((name, i) => ({
  id: i + 1,
  name,
  status: i === 4 ? 'DISABLED' : 'ENABLED',
  createdAt: new Date(base + i * 86400000 * 3).toISOString(),
  leader: schoolLeaders[i] ?? '—',
  introductionHtml: `<p><strong>${name}</strong> 以实战带教为主，覆盖<strong>短剧/推文</strong>全链路。</p>`,
}))

export const orgMentors: OrgMentorRecord[] = [
  {
    id: 1,
    name: '岳不群',
    schoolId: 1,
    status: 'ENABLED',
    mentorTypeId: 1,
    feishuPhone: '13800001001',
    introductionHtml: '<p>专注<strong>付费转化</strong>与社群冷启动，支持 1v1 诊断。</p>',
    projects: demoProjects('岳不群'),
    linkedUserCount: 0,
    syncedStudentCount: 128,
    projectCount: 42,
    totalRevenue: 186500.5,
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date(base + 1000000).toISOString(),
    revenueDetail: [
      { period: '2026-Q1', amountYuan: 62000 },
      { period: '2025-Q4', amountYuan: 124500.5 },
    ],
    larkOauthExpiresAt: null,
    larkDisplayName: null,
  },
  {
    id: 2,
    name: '宁中则',
    schoolId: 1,
    status: 'ENABLED',
    mentorTypeId: 2,
    feishuPhone: '13800001002',
    introductionHtml: '<p>擅长<strong>内容复盘</strong>与账号定位。</p>',
    projects: demoProjects('宁中则').slice(0, 2),
    linkedUserCount: 3,
    syncedStudentCount: 86,
    projectCount: 28,
    totalRevenue: 94200,
    lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(base + 2000000).toISOString(),
    revenueDetail: [{ period: '2026-Q1', amountYuan: 94200 }],
    larkOauthExpiresAt: null,
    larkDisplayName: null,
  },
  {
    id: 3,
    name: '张三丰',
    schoolId: 2,
    status: 'ENABLED',
    mentorTypeId: 1,
    feishuPhone: '13800001003',
    introductionHtml: '<p>武当<strong>内家运营</strong>方法论，偏长期主义。</p>',
    projects: demoProjects('张三丰'),
    linkedUserCount: 0,
    syncedStudentCount: 256,
    projectCount: 71,
    totalRevenue: 412300.75,
    lastSyncedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(base + 3000000).toISOString(),
    revenueDetail: [
      { period: '2026-Q1', amountYuan: 210000 },
      { period: '2025-Q4', amountYuan: 202300.75 },
    ],
    larkOauthExpiresAt: null,
    larkDisplayName: null,
  },
  {
    id: 4,
    name: '周芷若',
    schoolId: 3,
    status: 'ENABLED',
    mentorTypeId: 2,
    feishuPhone: '13800001004',
    introductionHtml: '<p>峨眉派<strong>精细化投放</strong>与素材迭代。</p>',
    projects: demoProjects('周芷若').slice(0, 2),
    linkedUserCount: 0,
    syncedStudentCount: 64,
    projectCount: 19,
    totalRevenue: 55800,
    lastSyncedAt: null,
    createdAt: new Date(base + 4000000).toISOString(),
    revenueDetail: [{ period: '2026-Q1', amountYuan: 55800 }],
    larkOauthExpiresAt: null,
    larkDisplayName: null,
  },
  {
    id: 5,
    name: '玄苦',
    schoolId: 4,
    status: 'DISABLED',
    mentorTypeId: 3,
    feishuPhone: '13800001005',
    introductionHtml: '<p>少林<strong>合规</strong>向内容策略。</p>',
    projects: demoProjects('玄苦').slice(0, 1),
    linkedUserCount: 0,
    syncedStudentCount: 12,
    projectCount: 4,
    totalRevenue: 8900,
    lastSyncedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdAt: new Date(base + 5000000).toISOString(),
    revenueDetail: [{ period: '2025-Q4', amountYuan: 8900 }],
    larkOauthExpiresAt: null,
    larkDisplayName: null,
  },
  {
    id: 6,
    name: '陈友谅',
    schoolId: 6,
    status: 'ENABLED',
    mentorTypeId: 2,
    feishuPhone: '13800001006',
    introductionHtml: '<p>明教渠道<strong>矩阵打法</strong>。</p>',
    projects: demoProjects('陈友谅').slice(0, 2),
    linkedUserCount: 0,
    syncedStudentCount: 33,
    projectCount: 11,
    totalRevenue: 32100.25,
    lastSyncedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(base + 6000000).toISOString(),
    revenueDetail: [{ period: '2026-Q1', amountYuan: 32100.25 }],
    larkOauthExpiresAt: null,
    larkDisplayName: null,
  },
]

let nextSchoolSeq = orgSchools.reduce((m, s) => Math.max(m, s.id), 0) + 1
let nextMentorSeq = orgMentors.reduce((m, x) => Math.max(m, x.id), 0) + 1

export function takeNextSchoolId(): number {
  return nextSchoolSeq++
}

export function takeNextMentorId(): number {
  return nextMentorSeq++
}

export function mentorCountForSchool(schoolId: number): number {
  return orgMentors.filter((m) => m.schoolId === schoolId).length
}

/** 门派项目数：归属该门派的各导师项目按项目名称去重后的数量（非表单写入） */
export function schoolProjectCountForSchool(schoolId: number): number {
  const names = new Set<string>()
  for (const m of orgMentors) {
    if (m.schoolId !== schoolId) continue
    for (const p of m.projects) {
      const n = String(p.projectName ?? '').trim()
      if (n) names.add(n)
    }
  }
  return names.size
}

export function schoolNameById(schoolId: number): string {
  return orgSchools.find((s) => s.id === schoolId)?.name ?? '—'
}

/** 门派列表/详情聚合：学员总数、学员总收益（第三方同步口径） */
export function schoolAggregates(schoolId: number): { totalStudents: number; totalRevenue: number } {
  const mentors = orgMentors.filter((m) => m.schoolId === schoolId)
  return {
    totalStudents: mentors.reduce((sum, m) => sum + m.syncedStudentCount, 0),
    totalRevenue: mentors.reduce((sum, m) => sum + m.totalRevenue, 0),
  }
}

/** Story 8-2 Mock：OAuth 回调页写入导师授权态 */
export function mockApplyMentorLarkOAuth(id: number, displayName: string, daysValid = 30) {
  const m = orgMentors.find((x) => x.id === id)
  if (!m) return false
  m.larkOauthExpiresAt = new Date(Date.now() + 86400000 * daysValid).toISOString()
  m.larkDisplayName = displayName
  return true
}
