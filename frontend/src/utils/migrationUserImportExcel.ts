import * as XLSX from 'xlsx'
import type { MigrationUserImportRowInput } from '@/types/migrationUsers'

const HEADERS = [
  '右豹编码',
  '右豹ID',
  '飞书ID',
  '飞书手机号',
  '飞书昵称',
  '客服名称',
  '导师名称',
  '门派名称',
] as const

/** 历史迁移模板（第二行示例，对齐 Story 5.1 字段） */
export function downloadMigrationUserTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    [...HEADERS],
    ['RB010099', 'YB00000099', 'lark_m99', '13800138000', '迁移示例', '王小明', '赵天龙', '紫霄门'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '历史用户迁移')
  XLSX.writeFile(wb, '历史用户主档迁移模板.xlsx')
}

function cellToRaw(cell: unknown): string | number | null {
  if (cell == null || cell === '') return null
  if (typeof cell === 'number') return cell
  return String(cell).trim()
}

const PHONE_RE = /^1[3-9]\d{9}$/

function headerIndexMap(headerRow: (string | number | null)[]): Record<string, number> {
  const map: Record<string, number> = {}
  headerRow.forEach((h, i) => {
    const t = h == null ? '' : String(h).trim()
    if (t) map[t] = i
  })
  return map
}

/** 无 500 条上限（Story 5.1） */
export async function parseMigrationUserImportFile(file: File): Promise<{
  rows: MigrationUserImportRowInput[]
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

  const col = headerIndexMap(matrix[0] ?? [])
  const codeIdx = col['右豹编码']
  if (codeIdx === undefined) {
    return { rows: [], error: '缺少「右豹编码」列' }
  }

  const dataRows = matrix
    .slice(1)
    .filter((r) => r?.some((c) => c !== null && c !== '' && String(c).trim() !== ''))

  const pick = (r: (string | number | null)[], name: string) => {
    const i = col[name]
    return i === undefined ? null : cellToRaw(r[i] ?? null)
  }

  const rows: MigrationUserImportRowInput[] = []
  let excelRow = 2
  for (const r of dataRows) {
    const codeRaw = pick(r, '右豹编码')
    const rightLeopardCode = codeRaw != null ? String(codeRaw).trim() : ''
    if (!rightLeopardCode) {
      excelRow += 1
      continue
    }
    rows.push({
      rowNumber: excelRow,
      rightLeopardCode,
      rightLeopardId: pick(r, '右豹ID') != null ? String(pick(r, '右豹ID')) : undefined,
      larkId: pick(r, '飞书ID') != null ? String(pick(r, '飞书ID')) : undefined,
      larkPhone: pick(r, '飞书手机号') != null ? String(pick(r, '飞书手机号')) : undefined,
      larkNickname: pick(r, '飞书昵称') != null ? String(pick(r, '飞书昵称')) : undefined,
      agentName: pick(r, '客服名称') != null ? String(pick(r, '客服名称')) : undefined,
      mentorName: pick(r, '导师名称') != null ? String(pick(r, '导师名称')) : undefined,
      schoolName: pick(r, '门派名称') != null ? String(pick(r, '门派名称')) : undefined,
    })
    excelRow += 1
  }

  for (const row of rows) {
    if (row.larkPhone && !PHONE_RE.test(row.larkPhone)) {
      return {
        rows: [],
        error: `第 ${row.rowNumber} 行：飞书手机号格式不合规`,
      }
    }
  }

  return { rows }
}

export function downloadMigrationUserFailures(
  failed: { rowNumber: number; field?: string; rightLeopardCode?: string; reason: string }[],
) {
  const headers = ['行号', '字段', '右豹编码', '失败原因']
  const aoa = [
    headers,
    ...failed.map((f) => [f.rowNumber, f.field ?? '', f.rightLeopardCode ?? '', f.reason]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '失败明细')
  const d = new Date()
  const z = (n: number) => String(n).padStart(2, '0')
  const name = `历史用户迁移失败_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}.xlsx`
  XLSX.writeFile(wb, name)
}
