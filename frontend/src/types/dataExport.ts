export interface StartExportResponse {
  exportId: string
}

export type ExportJobPollData =
  | { status: 'processing' }
  | {
      status: 'completed'
      fileName: string
      expiresAt: string
      /** Mock：占位 URL，真实环境为可下载地址 */
      downloadUrl: string
      sheet: {
        headers: string[]
        rows: (string | number | null | boolean)[][]
      }
    }
  | { status: 'failed'; message: string }
