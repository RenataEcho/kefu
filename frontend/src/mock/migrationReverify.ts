import type { MockMethod } from 'vite-plugin-mock'
import { getMergedMockUsers } from './users'
import type { MockUser } from './users'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface TaskState {
  id: string
  status: 'running' | 'completed'
  processed: number
  total: number
}

const tasks: Record<string, TaskState> = {}

function classifyReverifyOutcome(u: MockUser): 'VERIFIED' | 'INVALID' | 'FAILED' {
  const c = u.rightLeopardCode.toUpperCase()
  if (c.startsWith('INV') || c.includes('INVALID')) return 'INVALID'
  if (c.startsWith('FT') || c.includes('FAILAPI')) return 'FAILED'
  if (u.id % 23 === 0) return 'FAILED'
  if (u.id % 19 === 0) return 'INVALID'
  return 'VERIFIED'
}

async function runReverifyJob(taskId: string, snapshot: MockUser[]) {
  const task = tasks[taskId]
  if (!task) return

  if (snapshot.length === 0) {
    task.status = 'completed'
    return
  }

  const chunkSize = 100
  for (let i = 0; i < snapshot.length; i += chunkSize) {
    if (tasks[taskId]?.status !== 'running') return
    await sleep(1000)
    const chunk = snapshot.slice(i, i + chunkSize)
    for (const snap of chunk) {
      const live = getMergedMockUsers().find((x) => x.id === snap.id)
      if (!live || live.codeVerifyStatus !== 'PENDING_VERIFY') {
        task.processed += 1
        continue
      }
      live.codeVerifyStatus = classifyReverifyOutcome(live)
      task.processed += 1
    }
  }

  task.status = 'completed'
}

function buildReport() {
  const users = getMergedMockUsers()
  const total = users.length
  let verified = 0
  let pendingVerify = 0
  let invalid = 0
  let failed = 0
  for (const u of users) {
    switch (u.codeVerifyStatus) {
      case 'VERIFIED':
        verified += 1
        break
      case 'PENDING_VERIFY':
        pendingVerify += 1
        break
      case 'INVALID':
        invalid += 1
        break
      case 'FAILED':
        failed += 1
        break
      default:
        break
    }
  }
  return { total, verified, pendingVerify, invalid, failed }
}

export default [
  {
    url: '/api/v1/migration/report',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: buildReport(),
    }),
  },
  {
    url: '/api/v1/migration/reverify',
    method: 'post',
    response: () => {
      const pending = getMergedMockUsers().filter((u) => u.codeVerifyStatus === 'PENDING_VERIFY')
      const taskId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      tasks[taskId] = {
        id: taskId,
        status: 'running',
        processed: 0,
        total: pending.length,
      }
      void runReverifyJob(taskId, [...pending])
      return {
        code: 0,
        message: 'success',
        data: { taskId },
      }
    },
  },
  {
    url: '/api/v1/migration/reverify/:taskId',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const taskId = String(options.query.taskId ?? '')
      const t = tasks[taskId]
      if (!t) {
        return { code: 10002, message: '任务不存在', data: null }
      }
      return {
        code: 0,
        message: 'success',
        data: {
          id: t.id,
          status: t.status,
          processed: t.processed,
          total: t.total,
        },
      }
    },
  },
] as MockMethod[]
