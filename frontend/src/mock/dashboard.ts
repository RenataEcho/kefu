/**
 * Dashboard Mock：`GET /dashboard/global`、`GET /dashboard/agent`、`POST /dashboard/export`。
 * Story 9.1 的 Redis 键、TTL=300s、五种 dateRange、写后失效等语义见 `src/types/dashboard.ts` 文件头注释。
 */
import type { MockMethod } from 'vite-plugin-mock'
import { orgMentors, orgSchools, schoolNameById } from './organizationData'
import { MOCK_AGENTS } from './users'

const PRESET_FACTORS: Record<string, number> = {
  current_month: 1,
  last_month: 0.82,
  current_quarter: 1.12,
  last_quarter: 0.95,
}

function factorForQuery(dateRange: string, startDate?: string, endDate?: string): number {
  if (dateRange === 'custom' && startDate && endDate) {
    const key = `${startDate}:${endDate}`
    let h = 0
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
    return 0.68 + ((h >>> 0) % 35) / 100
  }
  return PRESET_FACTORS[dateRange] ?? 1
}

function buildSchoolOverview(f: number) {
  return orgSchools.map((school) => {
    const mentorsInSchool = orgMentors.filter((m) => m.schoolId === school.id)
    const base = mentorsInSchool.length * 24
    const studentCount = Math.max(8, Math.round(base * f))
    return {
      id: school.id,
      name: school.name,
      mentorCount: mentorsInSchool.length,
      studentCount,
      totalRevenue: Math.round(studentCount * 1350 * f * 100) / 100,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

function buildMentorOverview(f: number) {
  const hourOffsets = [0.5, 1.2, 2.5, 4.0, 6.3]
  return orgMentors.map((mentor, idx) => {
    const studentCount = Math.max(10, Math.round((32 + idx * 5) * f))
    const periodNewStudents = Math.max(1, Math.round((4 + (idx % 4)) * f))
    const projectCount = Math.max(3, Math.round((8 + idx * 3) * f))
    const syncDate = new Date(Date.now() - hourOffsets[idx % hourOffsets.length] * 3600000)
    return {
      id: mentor.id,
      name: mentor.name,
      schoolName: schoolNameById(mentor.schoolId),
      studentCount,
      projectCount,
      totalRevenue: Math.round(studentCount * (220 + idx * 12) * f * 100) / 100,
      periodNewStudents,
      lastSyncAt: syncDate.toISOString(),
    }
  }).sort((a, b) => b.periodNewStudents - a.periodNewStudents)
}

function buildAgentOverview(f: number) {
  const names = ['小陈', '小李', '小张', '小王', '小赵', '小周']
  const bases = [68, 61, 57, 34, 48, 52]
  return MOCK_AGENTS.map((agent, idx) => {
    const periodNewUsers = Math.max(4, Math.round((bases[idx] ?? 40) * f))
    const totalUsers = periodNewUsers + 45 + idx * 3
    return {
      id: agent.id,
      name: names[idx] ?? agent.name,
      totalUsers,
      periodNewUsers,
      paidUserCount: Math.floor(totalUsers * 0.38),
    }
  }).sort((a, b) => b.periodNewUsers - a.periodNewUsers)
}

function dashboardExportFileName() {
  const d = new Date()
  const z = (n: number) => String(n).padStart(2, '0')
  return `运营看板_导出_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}.xlsx`
}

function buildTrend30d(): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hash = (y * 372 + (d.getMonth() + 1) * 31 + d.getDate()) % 11
    out.push({ date: `${y}-${m}-${day}`, count: Math.max(0, hash + 1 + (i % 4)) })
  }
  return out
}

export default [
  {
    url: '/api/v1/dashboard/global',
    method: 'get',
    response: ({ query }: { query: Record<string, string> }) => {
      const dateRange = query.dateRange || 'current_month'
      const startDate = query.startDate
      const endDate = query.endDate
      const f = factorForQuery(dateRange, startDate, endDate)

      const agents = buildAgentOverview(f)
      const schools = buildSchoolOverview(f)
      const mentors = buildMentorOverview(f)

      const paidUserCount = 2847
      const regularUserCount = 8421

      return {
        code: 0,
        message: 'success',
        data: {
          metrics: {
            paidUserCount,
            regularUserCount,
            paidUserTrend: 12.3,
            regularUserTrend: 8.7,
            /* 本月建联 / 客服数：与全局日期筛选解耦（原型 2.3） */
            monthlyConnections: 312,
            totalAgents: MOCK_AGENTS.length,
            slaComplianceRate: 97.2,
            slaTarget: 95,
          },
          schools,
          mentors,
          agents,
          funnel: [
            { label: '录入', count: Math.max(120, Math.round(892 * f)) },
            { label: '入群', count: Math.max(100, Math.round(756 * f)) },
            { label: '付费', count: Math.max(40, Math.round(342 * f)) },
          ],
          funnelCacheTtlSeconds: 300,
          pendingAudits: [
            { id: 1, name: '刘先生', code: 'YB-2847-XK', status: 'timeout', timeoutDays: 1 },
            { id: 2, name: '张女士', code: 'YB-1923-MN', status: 'timeout' },
            { id: 3, name: '王先生', code: 'YB-3301-PQ', status: 'pending' },
          ],
          pendingEntryAudits: [
            { id: 201, name: '赵同学', code: 'RB020001', status: 'timeout', timeoutDays: 2 },
            { id: 202, name: '钱同学', code: 'RB020002', status: 'pending' },
            { id: 203, name: '孙同学', code: 'RB020003', status: 'timeout', timeoutDays: 1 },
          ],
          apiStatus: [
            { name: '右豹 APP API', status: 'normal' },
            { name: '飞书 API', status: 'normal' },
            { name: '第三方导师系统', status: 'cached', lastSync: '2小时前' },
            { name: '微信服务号', status: 'normal' },
          ],
          lastUpdatedAt: new Date().toISOString(),
        },
      }
    },
  },
  {
    url: '/api/v1/dashboard/agent',
    method: 'get',
    response: () => {
      const trend30d = buildTrend30d()
      return {
        code: 0,
        message: 'success',
        data: {
          periodNewConnections: 52,
          totalHistoricalConnections: 428,
          periodPaymentConversions: 18,
          trend30d,
          lastUpdatedAt: new Date().toISOString(),
        },
      }
    },
  },

  {
    url: '/api/v1/dashboard/export',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      if (body?.failExport === true) {
        return { code: 50001, message: '导出任务失败（Mock）', data: null }
      }
      const dateRange = String(body?.dateRange ?? 'current_month')
      const startDate = body?.startDate != null ? String(body.startDate) : undefined
      const endDate = body?.endDate != null ? String(body.endDate) : undefined
      if (dateRange === 'custom' && (!startDate || !endDate)) {
        return { code: 400, message: '自定义范围需同时提供 startDate 与 endDate', data: null }
      }

      const f = factorForQuery(dateRange, startDate, endDate)
      const schools = buildSchoolOverview(f).slice(0, 50)
      const mentors = buildMentorOverview(f).slice(0, 50)
      const agents = buildAgentOverview(f).slice(0, 50)
      const funnelRows = [
        { label: '录入', count: Math.max(120, Math.round(892 * f)) },
        { label: '入群', count: Math.max(100, Math.round(756 * f)) },
        { label: '付费', count: Math.max(40, Math.round(342 * f)) },
      ]
      const estimatedRows = 180 + schools.length + mentors.length + agents.length

      return {
        code: 0,
        message: 'success',
        data: {
          fileName: dashboardExportFileName(),
          estimatedRows,
          downloadUrl: '/api/v1/exports/dashboard-report/mock-link',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          sheets: [
            {
              name: '核心指标',
              headers: ['指标', '数值', '筛选'],
              rows: [
                ['付费用户', 2847, dateRange],
                ['普通用户', 8421, dateRange],
                ['本月建联', 312, '与日期筛选解耦'],
                ['SLA 达标率', '97.2%', ''],
              ],
            },
            {
              name: '转化漏斗',
              headers: ['阶段', '所选范围内新增量'],
              rows: funnelRows.map((x) => [x.label, x.count]),
            },
            {
              name: '门派概览',
              headers: ['门派', '导师数', '学员数', '总收益'],
              rows: schools.map((s) => [s.name, s.mentorCount, s.studentCount, s.totalRevenue]),
            },
            {
              name: '导师概览',
              headers: ['导师', '门派', '学员数', '项目数', '总收益', '本期新增'],
              rows: mentors.map((m) => [
                m.name,
                m.schoolName,
                m.studentCount,
                m.projectCount,
                m.totalRevenue,
                m.periodNewStudents,
              ]),
            },
            {
              name: '客服概览',
              headers: ['客服', '名下用户', '本期新增', '付费用户'],
              rows: agents.map((a) => [a.name, a.totalUsers, a.periodNewUsers, a.paidUserCount]),
            },
          ],
        },
      }
    },
  },
] as MockMethod[]
