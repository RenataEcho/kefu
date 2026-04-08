/** 异步导出任务（Story 4-7 Mock，内存态） */

export type ExportJobState =
  | { status: 'processing' }
  | {
      status: 'completed'
      fileName: string
      expiresAt: string
      downloadUrl: string
      sheet: {
        headers: string[]
        rows: (string | number | null | boolean)[][]
      }
    }
  | { status: 'failed'; message: string }

const jobs = new Map<string, ExportJobState>()

export function registerExportJobProcessing(exportId: string) {
  jobs.set(exportId, { status: 'processing' })
}

export function completeExportJob(
  exportId: string,
  payload: Omit<Extract<ExportJobState, { status: 'completed' }>, 'status'>,
) {
  jobs.set(exportId, { status: 'completed', ...payload })
}

export function failExportJob(exportId: string, message: string) {
  jobs.set(exportId, { status: 'failed', message })
}

export function getExportJob(exportId: string): ExportJobState | undefined {
  return jobs.get(exportId)
}
