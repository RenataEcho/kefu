import { fetchExportStatus } from '@/api/dataExport'
import type { StartExportResponse } from '@/types/dataExport'
import { downloadExportSheet } from '@/utils/dataExportXlsx'

const POLL_MS = 1500
const TIMEOUT_MS = 120_000

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export type ExportMessageApi = {
  info: (content: string) => void
  success: (content: string) => void
  error: (content: string) => void
}

/**
 * 提交异步导出任务后轮询状态，完成后用 sheet 数据在前端生成 xlsx（Mock 无真实文件流）。
 */
export async function runExportWithPolling(options: {
  start: () => Promise<StartExportResponse>
  message: ExportMessageApi
  /** 用于 §1.9 大量数据时的文案提示 */
  rowEstimate?: number
}): Promise<void> {
  const { start, message, rowEstimate } = options

  if (rowEstimate != null && rowEstimate > 1000) {
    message.info(`导出数量较多（${rowEstimate} 条），预计需要 10～20 秒，请稍候`)
  } else {
    message.info('正在生成导出文件，完成后将自动下载')
  }

  const { exportId } = await start()
  const deadline = Date.now() + TIMEOUT_MS

  while (Date.now() < deadline) {
    const data = await fetchExportStatus(exportId)
    if (data.status === 'failed') {
      throw new Error(data.message || '导出失败')
    }
    if (data.status === 'completed') {
      downloadExportSheet(data.fileName, data.sheet.headers, data.sheet.rows)
      message.success(
        '导出完成。正式环境下载链接 24 小时内有效（Mock 已直接下载到本机）',
      )
      return
    }
    await sleep(POLL_MS)
  }

  throw new Error('导出超时，请稍后重试')
}
