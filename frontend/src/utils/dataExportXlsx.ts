import * as XLSX from 'xlsx'

const normalizeCell = (v: string | number | boolean | null) =>
  v === null || v === undefined ? '' : v

/** 将表头 + 数据行写入 xlsx 并触发浏览器下载（对齐 prototype §1.9 文件名由调用方传入） */
export function downloadExportSheet(
  fileName: string,
  headers: string[],
  rows: (string | number | null | boolean)[][],
) {
  const aoa: (string | number | boolean)[][] = [
    headers,
    ...rows.map((line) => line.map(normalizeCell)),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '导出数据')
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}

export interface ExportSheetDef {
  name: string
  headers: string[]
  rows: (string | number | null | boolean)[][]
}

/** Story 9.6：多 Sheet 工作簿（核心指标 / 漏斗 / 概览摘要） */
export function downloadMultiSheetXlsx(fileName: string, sheets: ExportSheetDef[]) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const aoa: (string | number | boolean)[][] = [
      s.headers,
      ...s.rows.map((line) => line.map(normalizeCell)),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const safe = s.name
      .slice(0, 31)
      .replace(/[*?:[\]/\\]/g, '_')
      .trim() || 'Sheet'
    XLSX.utils.book_append_sheet(wb, ws, safe)
  }
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}
