import type { MockMethod } from 'vite-plugin-mock'
import {
  mockMentorTypeStore,
  takeNextMentorTypeId,
  type MentorTypeStatus,
} from './mentorTypesData'

export default [
  {
    url: '/api/v1/mentor-types',
    method: 'get',
    response: (opt: { query?: Record<string, string> }) => {
      const q = opt?.query ?? {}
      const page = Math.max(1, parseInt(q.page || '1', 10))
      const pageSize = Math.max(1, Math.min(100, parseInt(q.pageSize || '20', 10)))
      const kw = (q.keyword || '').trim().toLowerCase()
      let rows = [...mockMentorTypeStore.rows]
      if (kw) rows = rows.filter((t) => t.name.toLowerCase().includes(kw))
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const total = rows.length
      const items = rows.slice((page - 1) * pageSize, page * pageSize)
      return { code: 0, message: 'success', data: { items, total, page, pageSize } }
    },
  },
  {
    url: '/api/v1/mentor-types',
    method: 'post',
    response: ({ body }: { body: Record<string, unknown> }) => {
      const name = String(body?.name || '').trim()
      if (!name) {
        return { code: 400, message: '类型名称不能为空', data: null }
      }
      const row = {
        id: takeNextMentorTypeId(),
        name,
        createdAt: new Date().toISOString(),
        status: 'ENABLED' as const,
      }
      mockMentorTypeStore.rows.unshift(row)
      return { code: 0, message: 'success', data: row }
    },
  },
  {
    url: '/api/v1/mentor-types/:id',
    method: 'patch',
    response: (opt: { query: Record<string, string>; body: Record<string, unknown> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const t = mockMentorTypeStore.rows.find((x) => x.id === id)
      if (!t) return { code: 10002, message: '导师类型不存在', data: null }
      const body = opt.body || {}
      if (typeof body.name === 'string' && body.name.trim()) {
        t.name = body.name.trim()
      }
      if (body.status === 'ENABLED' || body.status === 'DISABLED') {
        t.status = body.status as MentorTypeStatus
      }
      return { code: 0, message: 'success', data: t }
    },
  },
  {
    url: '/api/v1/mentor-types/:id',
    method: 'delete',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id), 10)
      const idx = mockMentorTypeStore.rows.findIndex((x) => x.id === id)
      if (idx === -1) return { code: 10002, message: '导师类型不存在', data: null }
      mockMentorTypeStore.rows.splice(idx, 1)
      return { code: 0, message: 'success', data: null }
    },
  },
] as MockMethod[]
