import type { MockMethod } from 'vite-plugin-mock'
import { getExportJob } from './exportJobsStore'

export default [
  {
    url: '/api/v1/exports/:exportId',
    method: 'get',
    response: (options: { query: Record<string, string> }) => {
      const exportId = String(options.query.exportId ?? '')
      if (!exportId) {
        return { code: 400, message: '无效的导出任务', data: null }
      }
      const job = getExportJob(exportId)
      if (!job) {
        return { code: 10002, message: '导出任务不存在或已过期', data: null }
      }
      return { code: 0, message: 'success', data: job }
    },
  },
] as MockMethod[]
