import type { MockMethod } from 'vite-plugin-mock'
import type { MentorListItem } from '@/types/mentor'
import {
  mentorCountForSchool,
  orgMentors,
  orgSchools,
  schoolAggregates,
  schoolNameById,
  schoolProjectCountForSchool,
  takeNextSchoolId,
} from './organizationData'
import { mentorTypeNameById } from './mentorTypesData'

function listItem(s: (typeof orgSchools)[0]) {
  const agg = schoolAggregates(s.id)
  return {
    id: s.id,
    name: s.name,
    principalName: s.leader,
    schoolProjectCount: schoolProjectCountForSchool(s.id),
    introductionHtml: s.introductionHtml,
    mentorCount: mentorCountForSchool(s.id),
    totalStudents: agg.totalStudents,
    totalRevenue: agg.totalRevenue,
    status: s.status,
    createdAt: s.createdAt,
  }
}

function mentorRowForSchool(m: (typeof orgMentors)[0]): MentorListItem {
  return {
    id: m.id,
    name: m.name,
    schoolId: m.schoolId,
    schoolName: schoolNameById(m.schoolId),
    mentorTypeId: m.mentorTypeId,
    mentorTypeName: mentorTypeNameById(m.mentorTypeId),
    feishuPhone: m.feishuPhone,
    studentCount: m.linkedUserCount,
    syncedStudentCount: m.syncedStudentCount,
    projectCount: m.projectCount,
    totalRevenue: m.totalRevenue,
    lastSyncedAt: m.lastSyncedAt,
    status: m.status,
    createdAt: m.createdAt,
    revenueDetail: m.revenueDetail,
    introductionHtml: m.introductionHtml,
  }
}

export default [
  {
    url: '/api/v1/schools/options',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: orgSchools.filter((s) => s.status === 'ENABLED').map((s) => ({ id: s.id, name: s.name })),
    }),
  },

  {
    url: '/api/v1/schools',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const page = Math.max(1, parseInt(opt.query.page || '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(opt.query.pageSize || '20', 10)))
      const kw = (opt.query.keyword || '').trim().toLowerCase()
      let rows = [...orgSchools]
      if (kw) rows = rows.filter((s) => s.name.toLowerCase().includes(kw))
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const total = rows.length
      const slice = rows.slice((page - 1) * pageSize, page * pageSize).map(listItem)
      return { code: 0, message: 'success', data: { items: slice, total, page, pageSize } }
    },
  },

  {
    url: '/api/v1/schools/:id/mentors',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const s = orgSchools.find((x) => x.id === id)
      if (!s) return { code: 10002, message: '门派不存在', data: null }
      const page = Math.max(1, parseInt(opt.query.page || '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(opt.query.pageSize || '100', 10)))
      let rows = orgMentors.filter((m) => m.schoolId === id)
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const total = rows.length
      const slice = rows.slice((page - 1) * pageSize, page * pageSize).map(mentorRowForSchool)
      return { code: 0, message: 'success', data: { items: slice, total, page, pageSize } }
    },
  },

  {
    url: '/api/v1/schools/:id',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const s = orgSchools.find((x) => x.id === id)
      if (!s) return { code: 10002, message: '门派不存在', data: null }
      return { code: 0, message: 'success', data: listItem(s) }
    },
  },

  {
    url: '/api/v1/schools',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      const name = String(body?.name || '').trim()
      if (!name) {
        return { code: 400, message: '门派名称不能为空', data: null }
      }
      const now = new Date().toISOString()
      const pn = String(body?.principalName ?? body?.leader ?? '').trim() || '待指定'
      const intro = String(body?.introductionHtml ?? '').trim() || '<p></p>'
      const row = {
        id: takeNextSchoolId(),
        name,
        leader: pn,
        introductionHtml: intro,
        status: 'ENABLED' as const,
        createdAt: now,
      }
      orgSchools.push(row)
      return { code: 0, message: 'success', data: listItem(row) }
    },
  },

  {
    url: '/api/v1/schools/:id',
    method: 'patch',
    response: (opt: { query: Record<string, string>; body: Record<string, unknown> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const s = orgSchools.find((x) => x.id === id)
      if (!s) return { code: 10002, message: '门派不存在', data: null }
      const body = opt.body || {}
      if (typeof body.name === 'string' && body.name.trim()) {
        s.name = body.name.trim()
      }
      if (body.status === 'ENABLED' || body.status === 'DISABLED') {
        s.status = body.status
      }
      const pnRaw = body.principalName ?? body.leader
      if (typeof pnRaw === 'string') {
        const t = pnRaw.trim()
        if (t) s.leader = t
      }
      if (typeof body.introductionHtml === 'string') {
        s.introductionHtml = body.introductionHtml.trim() || '<p></p>'
      }
      return { code: 0, message: 'success', data: listItem(s) }
    },
  },

  {
    url: '/api/v1/schools/:id',
    method: 'delete',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const idx = orgSchools.findIndex((x) => x.id === id)
      if (idx === -1) return { code: 10002, message: '门派不存在', data: null }
      const n = mentorCountForSchool(id)
      if (n > 0) {
        return {
          code: 10003,
          message: `该门派下有 ${n} 名导师，请先解除关联后再删除`,
          data: null,
        }
      }
      orgSchools.splice(idx, 1)
      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
