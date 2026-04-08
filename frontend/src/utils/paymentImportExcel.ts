import * as XLSX from 'xlsx'
import type { PaymentImportFailedRow, PaymentImportRowInput } from '@/types/payment'

const MAX_ROWS = 500

const HEADERS = ['右豹编码', '付费金额', '付费时间', '付费对接人'] as const

/** 下载导入模板（含第二行示例，对齐 prototype §2.7） */
export function downloadPaymentImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    [...HEADERS],
    ['RB010001', 1999.5, '2026-01-15', '对接人A'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '付费导入')
  XLSX.writeFile(wb, '付费记录导入模板.xlsx')
}

function cellToRaw(cell: unknown): string | number | null {
  if (cell == null || cell === '') return null
  if (typeof cell === 'number') return cell
  return String(cell).trim()
}

function formatExcelDate(n: number): string {
  const SSF = (XLSX as { SSF?: { parse_date_code: (v: number) => unknown } }).SSF
  const d = SSF?.parse_date_code(n) as
    | { y: number; m: number; d: number; H?: number; M?: number }
    | null
    | undefined
  if (!d || typeof d.y !== 'number') return ''
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.y}-${pad(d.m)}-${pad(d.d)}${d.H != null || d.M != null ? ` ${pad(d.H ?? 0)}:${pad(d.M ?? 0)}` : ''}`
}

/** 从上传文件解析行（首行为表头） */
export async function parsePaymentImportFile(file: File): Promise<{
  rows: PaymentImportRowInput[]
  error?: string
}> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return { rows: [], error: '工作表为空' }

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as (string | number | null)[][]

  if (matrix.length < 2) {
    return { rows: [], error: '至少需要表头与一行数据' }
  }

  const dataRows = matrix.slice(1).filter((r) => r?.some((c) => c !== null && c !== '' && String(c).trim() !== ''))

  if (dataRows.length > MAX_ROWS) {
    return {
      rows: [],
      error: `单次导入上限 ${MAX_ROWS} 条，请分批处理（当前 ${dataRows.length} 条）`,
    }
  }

  const rows: PaymentImportRowInput[] = []
  let excelRow = 2
  for (const r of dataRows) {
    const codeRaw = cellToRaw(r[0])
    const amountRaw = cellToRaw(r[1])
    let timeRaw = cellToRaw(r[2])
    const contactRaw = cellToRaw(r[3])

    if (typeof timeRaw === 'number') {
      timeRaw = formatExcelDate(timeRaw)
    }

    const rightLeopardCode = codeRaw != null ? String(codeRaw).trim() : ''
    const amount =
      typeof amountRaw === 'number'
        ? amountRaw
        : amountRaw != null && String(amountRaw).trim() !== ''
          ? Number(String(amountRaw).replace(/,/g, ''))
          : NaN
    const paymentTime = timeRaw != null ? String(timeRaw).trim() : ''
    const contactPerson =
      contactRaw != null && String(contactRaw).trim() !== '' ? String(contactRaw).trim() : undefined

    rows.push({
      rowNumber: excelRow,
      rightLeopardCode,
      amount,
      paymentTime,
      contactPerson,
    })
    excelRow += 1
  }

  return { rows }
}

/** 导出失败明细 xlsx */
export function downloadPaymentImportFailures(failed: PaymentImportFailedRow[], batchNo: string) {
  const aoa = [
    ['行号', '右豹编码', '付费金额', '付费时间', '付费对接人', '失败原因'],
    ...failed.map((f) => [
      f.rowNumber,
      f.rightLeopardCode,
      f.amount,
      f.paymentTime,
      f.contactPerson,
      f.reason,
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '失败明细')
  const safe = batchNo.replace(/[^\w-]+/g, '_')
  XLSX.writeFile(wb, `付费导入失败明细_${safe}.xlsx`)
}

export { MAX_ROWS }
