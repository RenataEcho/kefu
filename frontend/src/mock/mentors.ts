import type { MockMethod } from 'vite-plugin-mock'
import type { MentorListItem, MentorProjectRow } from '@/types/mentor'
import { getMergedMockUsers } from './users'
import { isMentorApiSimulatedDown } from './mentorApiFlags'
import {
  orgMentors,
  orgSchools,
  schoolNameById,
  takeNextMentorId,
} from './organizationData'
import { mockMentorTypeStore, mentorTypeNameById } from './mentorTypesData'

function statsFromUserId(id: number) {
  const keywordCount = 12 + (id % 55)
  const backfillCount = 5 + (id % 28)
  const orderCount = 3 + (id % 22)
  return {
    keywordCount,
    backfillCount,
    orderCount,
    settledRevenueYuan: Math.round(keywordCount * 80 + orderCount * 120),
    pendingRevenueYuan: Math.round(backfillCount * 45),
  }
}

function toListItem(m: (typeof orgMentors)[0]): MentorListItem {
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

function toDetailPayload(m: (typeof orgMentors)[0]) {
  return {
    ...toListItem(m),
    introductionHtml: m.introductionHtml,
    mentorApiDegraded: isMentorApiSimulatedDown(),
  }
}

const pendingMentorSync = new Set<number>()

const emptyProjects: MentorProjectRow[] = []

export default [
  {
    url: '/api/v1/mentors',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const page = Math.max(1, parseInt(opt.query.page || '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(opt.query.pageSize || '20', 10)))
      const kw = (opt.query.keyword || '').trim().toLowerCase()
      const schoolIdRaw = opt.query.schoolId
      const schoolId = schoolIdRaw ? parseInt(schoolIdRaw, 10) : NaN

      const authorizedOnly = opt.query.authorized === 'true'
      const now = Date.now()

      let rows = [...orgMentors]
      if (!Number.isNaN(schoolId) && schoolId > 0) {
        rows = rows.filter((m) => m.schoolId === schoolId)
      }
      if (authorizedOnly) {
        rows = rows.filter(
          (m) => m.larkOauthExpiresAt != null && new Date(m.larkOauthExpiresAt).getTime() > now,
        )
      }
      if (kw) rows = rows.filter((m) => m.name.toLowerCase().includes(kw))
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const total = rows.length
      const slice = rows.slice((page - 1) * pageSize, page * pageSize).map(toListItem)
      return { code: 0, message: 'success', data: { items: slice, total, page, pageSize } }
    },
  },

  {
    url: '/api/v1/mentors',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      const name = String(body?.name || '').trim()
      const schoolId = typeof body?.schoolId === 'number' ? body.schoolId : parseInt(String(body?.schoolId), 10)
      const mentorTypeId =
        typeof body?.mentorTypeId === 'number'
          ? body.mentorTypeId
          : parseInt(String(body?.mentorTypeId ?? ''), 10)
      if (!name) {
        return { code: 400, message: '导师名称不能为空', data: null }
      }
      if (!schoolId || Number.isNaN(schoolId) || !orgSchools.some((s) => s.id === schoolId)) {
        return { code: 400, message: '请选择所属门派', data: null }
      }
      if (!mentorTypeId || Number.isNaN(mentorTypeId) || !mockMentorTypeStore.rows.some((t) => t.id === mentorTypeId)) {
        return { code: 400, message: '请选择导师类型', data: null }
      }
      const feishuPhone = String(body?.feishuPhone ?? '').trim()
      const phoneOk = /^1[3-9]\d{9}$/.test(feishuPhone)
      if (feishuPhone && !phoneOk) {
        return { code: 400, message: '请输入正确的飞书手机号', data: null }
      }
      const introductionHtml = String(body?.introductionHtml ?? '').trim() || '<p></p>'
      const now = new Date().toISOString()
      const row = {
        id: takeNextMentorId(),
        name,
        schoolId,
        status: 'ENABLED' as const,
        mentorTypeId,
        feishuPhone: feishuPhone || '',
        introductionHtml,
        projects: [...emptyProjects],
        linkedUserCount: 0,
        syncedStudentCount: 0,
        projectCount: 0,
        totalRevenue: 0,
        lastSyncedAt: null as string | null,
        createdAt: now,
        revenueDetail: [] as { period: string; amountYuan: number }[],
        larkOauthExpiresAt: null as string | null,
        larkDisplayName: null as string | null,
      }
      orgMentors.push(row)
      return { code: 0, message: 'success', data: toListItem(row) }
    },
  },

  {
    url: '/api/v1/mentors/:id/sync',
    method: 'post',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const m = orgMentors.find((x) => x.id === id)
      if (!m) return { code: 10002, message: '导师不存在', data: null }
      if (isMentorApiSimulatedDown()) {
        return {
          code: 400,
          message: '第三方导师数据暂时无法更新，请稍后重试',
          data: null,
        }
      }
      if (!pendingMentorSync.has(id)) {
        pendingMentorSync.add(id)
        setTimeout(() => {
          const row = orgMentors.find((x) => x.id === id)
          if (row) {
            row.lastSyncedAt = new Date().toISOString()
            row.syncedStudentCount = Math.max(row.syncedStudentCount, row.linkedUserCount + 1)
          }
          pendingMentorSync.delete(id)
        }, 900)
      }
      return { code: 0, message: 'success', data: { status: 'queued' as const } }
    },
  },

  {
    url: '/api/v1/mentors/:id/projects',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const m = orgMentors.find((x) => x.id === id)
      if (!m) return { code: 10002, message: '导师不存在', data: null }
      const items = m.projects ?? []
      return {
        code: 0,
        message: 'success',
        data: { items, total: items.length },
      }
    },
  },

  {
    url: '/api/v1/mentors/:id/students',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const m = orgMentors.find((x) => x.id === id)
      if (!m) return { code: 10002, message: '导师不存在', data: null }
      const page = Math.max(1, parseInt(opt.query.page || '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(opt.query.pageSize || '20', 10)))
      const users = getMergedMockUsers()
        .filter((u) => u.mentorId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const total = users.length
      const slice = users.slice((page - 1) * pageSize, page * pageSize).map((u) => {
        const st = statsFromUserId(u.id)
        return {
          id: u.id,
          rightLeopardCode: u.rightLeopardCode,
          larkNickname: u.larkNickname,
          isPaid: u.isPaid,
          createdAt: u.createdAt,
          ...st,
        }
      })
      return {
        code: 0,
        message: 'success',
        data: { items: slice, total, page, pageSize },
      }
    },
  },

  {
    url: '/api/v1/mentors/:id',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const m = orgMentors.find((x) => x.id === id)
      if (!m) return { code: 10002, message: '导师不存在', data: null }
      return { code: 0, message: 'success', data: toDetailPayload(m) }
    },
  },

  {
    url: '/api/v1/mentors/:id',
    method: 'patch',
    response: (opt: { query: Record<string, string>; body: Record<string, unknown> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const m = orgMentors.find((x) => x.id === id)
      if (!m) return { code: 10002, message: '导师不存在', data: null }
      const body = opt.body || {}
      if (typeof body.name === 'string' && body.name.trim()) {
        m.name = body.name.trim()
      }
      if (body.schoolId != null) {
        const sid = typeof body.schoolId === 'number' ? body.schoolId : parseInt(String(body.schoolId), 10)
        if (!sid || Number.isNaN(sid) || !orgSchools.some((s) => s.id === sid)) {
          return { code: 400, message: '请选择所属门派', data: null }
        }
        m.schoolId = sid
      }
      if (body.status === 'ENABLED' || body.status === 'DISABLED') {
        m.status = body.status
      }
      if (body.mentorTypeId != null) {
        const tid = typeof body.mentorTypeId === 'number' ? body.mentorTypeId : parseInt(String(body.mentorTypeId), 10)
        if (!tid || Number.isNaN(tid) || !mockMentorTypeStore.rows.some((t) => t.id === tid)) {
          return { code: 400, message: '请选择有效的导师类型', data: null }
        }
        m.mentorTypeId = tid
      }
      if (typeof body.feishuPhone === 'string') {
        const p = body.feishuPhone.trim()
        if (p && !/^1[3-9]\d{9}$/.test(p)) {
          return { code: 400, message: '请输入正确的飞书手机号', data: null }
        }
        m.feishuPhone = p
      }
      if (typeof body.introductionHtml === 'string') {
        m.introductionHtml = body.introductionHtml.trim() || '<p></p>'
      }
      return { code: 0, message: 'success', data: toListItem(m) }
    },
  },

  {
    url: '/api/v1/mentors/:id',
    method: 'delete',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const idx = orgMentors.findIndex((x) => x.id === id)
      if (idx === -1) return { code: 10002, message: '导师不存在', data: null }
      const m = orgMentors[idx]
      if (m.linkedUserCount > 0) {
        return {
          code: 10003,
          message: `该导师名下有 ${m.linkedUserCount} 名学员，请先解除关联后再删除`,
          data: null,
        }
      }
      orgMentors.splice(idx, 1)
      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
