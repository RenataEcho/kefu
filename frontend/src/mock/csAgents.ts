import type { MockMethod } from 'vite-plugin-mock'
import type { CsAgentDetail, CsAgentListItem, CsAgentStatus, CsAgentType } from '@/types/csAgent'

/** 补充需求 Phase I §十：录入 H5（Mock 域名，含 agentId） */
export function entryFormUrlForAgent(id: number): string {
  return `https://entry.kefu-mock.local/h5/apply?agentId=${id}`
}

function qrDataUrl(seed: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="#e2e8f0" width="120" height="120" rx="8"/><g fill="#0f172a"><rect x="12" y="12" width="32" height="32"/><rect x="76" y="12" width="32" height="32"/><rect x="12" y="76" width="32" height="32"/><rect x="52" y="52" width="10" height="10"/><rect x="68" y="52" width="10" height="10"/><rect x="52" y="68" width="10" height="10"/><rect x="84" y="68" width="10" height="10"/><text x="60" y="58" font-size="9" fill="#64748b" text-anchor="middle" font-family="system-ui">QR ${seed}</text></g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

interface StoredAgent extends CsAgentListItem {
  createdByName: string
  auditLogs: CsAgentDetail['auditLogs']
}

const creators = ['系统管理员', '王运营', '李超管']

function seedAgents(): StoredAgent[] {
  const names = [
    '王小明',
    '李晓红',
    '张大伟',
    '刘芳芳',
    '陈建国',
    '赵敏',
    '周杰',
    '吴倩',
    '郑爽',
    '孙悦',
    '马超',
    '黄蓉',
    '杨过',
    '郭靖',
    '黄药师',
    '欧阳锋',
    '洪七公',
    '一灯',
    '周伯通',
    '王重阳',
    '林朝英',
    '丘处机',
    '马钰',
  ]
  const base = new Date('2025-08-01').getTime()
  return names.map((name, i) => {
    const id = i + 1
    const createdAt = new Date(base + (names.length - i) * 86400000 * 2 + i * 3600000).toISOString()
    // id 1 关联多名用户，用于删除拦截演示
    const linkedUserCount = id === 1 ? 14 : id % 4 === 0 ? 0 : Math.min(6, (id * 3) % 9)
    const status: CsAgentStatus = id === 7 || id === 15 ? 'DISABLED' : 'ENABLED'
    const agentType: CsAgentType = id % 3 === 0 || id % 5 === 0 ? 'PAID' : 'NORMAL'
    const feishuPhone = `138${String(10000000 + id * 10037).padStart(8, '0').slice(0, 8)}`
    const larkOauthExpiresAt = null as string | null
    const larkDisplayName = null as string | null
    return {
      id,
      name,
      agentType,
      feishuPhone,
      status,
      wxQrcodeUrl: qrDataUrl(id),
      entryFormUrl: entryFormUrlForAgent(id),
      linkedUserCount,
      createdAt,
      larkOauthExpiresAt,
      larkDisplayName,
      createdByName: creators[i % creators.length],
      auditLogs: [
        {
          id: `${id}-log-1`,
          operatedAt: new Date(new Date(createdAt).getTime() + 3600000).toISOString(),
          operatorName: creators[i % creators.length],
          operationType: '创建',
          fieldName: '—',
          beforeValue: '—',
          afterValue: '—',
        },
        {
          id: `${id}-log-2`,
          operatedAt: new Date(new Date(createdAt).getTime() + 7200000).toISOString(),
          operatorName: '王运营',
          operationType: '更新',
          fieldName: '企微二维码',
          beforeValue: '未上传',
          afterValue: '已上传',
        },
        {
          id: `${id}-log-3`,
          operatedAt: new Date(new Date(createdAt).getTime() + 10800000).toISOString(),
          operatorName: '李超管',
          operationType: '更新',
          fieldName: '状态',
          beforeValue: '启用',
          afterValue: status === 'DISABLED' ? '禁用' : '启用',
        },
      ],
    }
  })
}

let agents: StoredAgent[] = seedAgents()
let nextId = agents.length + 1

/** Story 8-2 Mock：OAuth 回调页写入授权态 */
export function mockApplyAgentLarkOAuth(id: number, displayName: string, daysValid = 30) {
  const a = agents.find((x) => x.id === id)
  if (!a) return false
  a.larkOauthExpiresAt = new Date(Date.now() + 86400000 * daysValid).toISOString()
  a.larkDisplayName = displayName
  return true
}

function listItem(a: StoredAgent): CsAgentListItem {
  const { createdByName: _c, auditLogs: _l, ...rest } = a
  return rest
}

function detailOf(a: StoredAgent): CsAgentDetail {
  return {
    ...listItem(a),
    createdByName: a.createdByName,
    auditLogs: [...a.auditLogs].sort(
      (x, y) => new Date(y.operatedAt).getTime() - new Date(x.operatedAt).getTime(),
    ),
  }
}

function pushAudit(
  agent: StoredAgent,
  entry: Omit<StoredAgent['auditLogs'][0], 'id'> & { id?: string },
) {
  agent.auditLogs.unshift({
    id: entry.id ?? `log-${Date.now()}`,
    operatedAt: entry.operatedAt,
    operatorName: entry.operatorName,
    operationType: entry.operationType,
    fieldName: entry.fieldName,
    beforeValue: entry.beforeValue,
    afterValue: entry.afterValue,
  })
}

export default [
  {
    url: '/api/v1/cs-agents',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const page = Math.max(1, parseInt(opt.query.page || '1'))
      const pageSize = Math.max(1, parseInt(opt.query.pageSize || '20'))
      const keyword = (opt.query.keyword || '').trim().toLowerCase()
      const status = opt.query.status as CsAgentStatus | undefined
      const agentType = opt.query.agentType as CsAgentType | undefined

      const authorizedOnly = opt.query.authorized === 'true'
      const now = Date.now()

      let rows = [...agents]
      if (keyword) {
        rows = rows.filter((a) => a.name.toLowerCase().includes(keyword))
      }
      if (authorizedOnly) {
        rows = rows.filter(
          (a) =>
            a.larkOauthExpiresAt != null && new Date(a.larkOauthExpiresAt).getTime() > now,
        )
      }
      if (status === 'ENABLED' || status === 'DISABLED') {
        rows = rows.filter((a) => a.status === status)
      }
      if (agentType === 'NORMAL' || agentType === 'PAID') {
        rows = rows.filter((a) => a.agentType === agentType)
      }
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const total = rows.length
      const items = rows.slice((page - 1) * pageSize, page * pageSize).map(listItem)
      return { code: 0, message: 'success', data: { items, total, page, pageSize } }
    },
  },

  {
    url: '/api/v1/cs-agents',
    method: 'post',
    response: (opt: { body: Record<string, unknown> }) => {
      const name = String(opt.body?.name || '').trim()
      if (!name) {
        return { code: 400, message: '客服名称不能为空', data: null }
      }
      const now = new Date().toISOString()
      const b = opt.body as { agentType?: string; feishuPhone?: string }
      const agentType: CsAgentType =
        b.agentType === 'PAID' || b.agentType === 'NORMAL' ? b.agentType : 'NORMAL'
      const feishuPhone =
        typeof b.feishuPhone === 'string' ? String(b.feishuPhone).trim() : ''
      const newId = nextId++
      const wxQrcodeUrl =
        typeof opt.body?.wxQrcodeUrl === 'string' && opt.body.wxQrcodeUrl
          ? String(opt.body.wxQrcodeUrl)
          : qrDataUrl(newId)
      const row: StoredAgent = {
        id: newId,
        name,
        agentType,
        feishuPhone,
        status: 'ENABLED',
        wxQrcodeUrl,
        entryFormUrl: entryFormUrlForAgent(newId),
        linkedUserCount: 0,
        createdAt: now,
        larkOauthExpiresAt: null,
        larkDisplayName: null,
        createdByName: '当前管理员',
        auditLogs: [],
      }
      pushAudit(row, {
        operatedAt: now,
        operatorName: '当前管理员',
        operationType: '创建',
        fieldName: '—',
        beforeValue: '—',
        afterValue: name,
      })
      agents = [row, ...agents]
      return { code: 0, message: 'success', data: listItem(row) }
    },
  },

  {
    url: '/api/v1/cs-agents/:id',
    method: 'get',
    response: (opt: { query: Record<string, string> }) => {
      const id = parseInt(String(opt.query.id))
      if (Number.isNaN(id)) {
        return { code: 400, message: '无效的客服 ID', data: null }
      }
      const a = agents.find((x) => x.id === id)
      if (!a) {
        return { code: 10002, message: '客服不存在', data: null }
      }
      return { code: 0, message: 'success', data: detailOf(a) }
    },
  },

  {
    url: '/api/v1/cs-agents/:id',
    method: 'patch',
    response: (opt: { query: Record<string, string>; body: Record<string, unknown> }) => {
      const id = parseInt(String(opt.query.id))
      if (Number.isNaN(id)) {
        return { code: 400, message: '无效的客服 ID', data: null }
      }
      const a = agents.find((x) => x.id === id)
      if (!a) {
        return { code: 10002, message: '客服不存在', data: null }
      }
      const body = opt.body || {}
      const now = new Date().toISOString()
      if (typeof body.name === 'string' && body.name.trim()) {
        const before = a.name
        a.name = body.name.trim()
        pushAudit(a, {
          operatedAt: now,
          operatorName: '当前管理员',
          operationType: '更新',
          fieldName: '名称',
          beforeValue: before,
          afterValue: a.name,
        })
      }
      if (body.status === 'ENABLED' || body.status === 'DISABLED') {
        const before = a.status === 'ENABLED' ? '启用' : '禁用'
        a.status = body.status
        pushAudit(a, {
          operatedAt: now,
          operatorName: '当前管理员',
          operationType: '更新',
          fieldName: '状态',
          beforeValue: before,
          afterValue: a.status === 'ENABLED' ? '启用' : '禁用',
        })
      }
      if (typeof body.wxQrcodeUrl === 'string' && body.wxQrcodeUrl) {
        pushAudit(a, {
          operatedAt: now,
          operatorName: '当前管理员',
          operationType: '更新',
          fieldName: '企微二维码',
          beforeValue: '旧图片',
          afterValue: '新图片',
        })
        a.wxQrcodeUrl = body.wxQrcodeUrl
      }
      if (body.agentType === 'NORMAL' || body.agentType === 'PAID') {
        if (body.agentType !== a.agentType) {
          const before = a.agentType === 'PAID' ? '付费客服' : '普通客服'
          a.agentType = body.agentType
          pushAudit(a, {
            operatedAt: now,
            operatorName: '当前管理员',
            operationType: '更新',
            fieldName: '客服类型',
            beforeValue: before,
            afterValue: a.agentType === 'PAID' ? '付费客服' : '普通客服',
          })
        }
      }
      if (typeof body.feishuPhone === 'string') {
        const next = body.feishuPhone.trim()
        if (next !== a.feishuPhone) {
          const before = a.feishuPhone || '（空）'
          a.feishuPhone = next
          pushAudit(a, {
            operatedAt: now,
            operatorName: '当前管理员',
            operationType: '更新',
            fieldName: '飞书手机号',
            beforeValue: before,
            afterValue: next || '（空）',
          })
        }
      }
      return { code: 0, message: 'success', data: listItem(a) }
    },
  },

  {
    url: '/api/v1/cs-agents/:id',
    method: 'delete',
    rawResponse: (req, res) => {
      const pathname = (req.url || '').split('?')[0]
      const m = pathname.match(/\/api\/v1\/cs-agents\/(\d+)$/)
      const id = m ? parseInt(m[1], 10) : NaN
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')

      if (Number.isNaN(id)) {
        res.statusCode = 400
        res.end(JSON.stringify({ code: 400, message: '无效的客服 ID', data: null }))
        return
      }
      const idx = agents.findIndex((x) => x.id === id)
      if (idx === -1) {
        res.statusCode = 404
        res.end(JSON.stringify({ code: 10002, message: '客服不存在', data: null }))
        return
      }
      const a = agents[idx]
      if (a.linkedUserCount > 0) {
        res.statusCode = 400
        res.end(
          JSON.stringify({
            code: 10003,
            message: `该客服名下有 ${a.linkedUserCount} 名用户，请先解除关联后再删除`,
            data: null,
          }),
        )
        return
      }
      agents.splice(idx, 1)
      res.statusCode = 200
      res.end(JSON.stringify({ code: 0, message: 'success', data: null }))
    },
  },
] as MockMethod[]

/** 供飞书好友 Mock 读取客服 OAuth 态（仅开发环境） */
export { agents as mockCsAgentsList }

/** 付费客服名称（去重），供付费记录 Mock / 前端下拉 */
export function mockPaidCsAgentNames(): string[] {
  return [
    ...new Set(agents.filter((a) => a.agentType === 'PAID').map((a) => a.name)),
  ].sort()
}
