# Story 4.6：付费记录 Excel 批量导入

Status: review

## Story

作为**超级管理员**，
我希望能够通过 Excel 批量导入付费记录，系统自动识别失败条目并支持导出失败明细，
以便高效处理批量付费数据录入（满足 FR8）。

## Acceptance Criteria

1. **Given** 管理员上传符合模板的 Excel 文件（≤500条）  
   **When** 提交导入  
   **Then** ≤ 30 秒内完成处理并展示结果（满足 NFR3）：成功 X 条，失败 Y 条

2. **Given** Excel 中存在不合规记录（编码不存在/重复付费/金额为负）  
   **When** 导入处理完成  
   **Then** 失败记录列表展示每条失败的行号、右豹编码和失败原因

3. **Given** 导入结果页面存在失败记录  
   **When** 管理员点击「导出失败明细」  
   **Then** 下载包含失败记录详情的 Excel 文件，含原始数据和失败原因列

4. **Given** 上传的 Excel 文件超过 500 条  
   **When** 上传后提交  
   **Then** 提示"单次导入上限 500 条，请分批处理"，不执行导入

5. **Given** 批量导入过程  
   **When** 执行中  
   **Then** 异步处理，前端展示 `ImportBatch` 状态（`PROCESSING → COMPLETED/PARTIAL_FAILED`），不阻塞其他操作（满足 NFR4）

## Tasks / Subtasks

- [ ] Task 1: 设计 Excel 导入模板 (AC: #1, #2)
  - [ ] 提供下载模板端点：`GET /api/v1/payments/import-template`
  - [ ] 模板列：右豹编码（必填）、付费金额（必填，正数）、付费时间（必填，YYYY-MM-DD）、付费对接人（可选）

- [ ] Task 2: 实现文件上传接口 (AC: #1, #4)
  - [ ] `POST /api/v1/payments/import`（Multer，`.xlsx` 格式）
  - [ ] 使用 `exceljs` 读取文件，检查行数 ≤ 500
  - [ ] 创建 `import_batches` 记录（`status: 'PROCESSING'`，生成 `batchNo: IMP-XXXXXX`）
  - [ ] 入队 `excel-import-process` BullMQ job，返回 `{ batchId, status: 'processing' }`

- [ ] Task 3: 实现 BullMQ 导入 Processor (AC: #1, #2, #5)
  - [ ] `@Process('payment-import')` 处理 job
  - [ ] 逐行校验（编码存在、未重复付费、金额非负）
  - [ ] 成功行 → 批量 `createMany`
  - [ ] 失败行 → 收集到 `failedRows` 数组
  - [ ] 更新 `import_batches`（`status: COMPLETED/PARTIAL_FAILED`，`failCount`，`localPassCount`）
  - [ ] 若有失败行，生成失败明细 Excel → 存储本地 `uploads/exports/`，更新 `errorFileUrl`

- [ ] Task 4: 导入结果查询 API (AC: #2, #3)
  - [ ] `GET /api/v1/payments/import-batches/:batchId`（轮询状态）
  - [ ] 响应含：`status`、`totalCount`、`localPassCount`、`failCount`、`errorFileUrl`

- [ ] Task 5: 前端导入页面 (AC: #1, #2, #3, #4, #5)
  - [ ] 在 `PaymentList.vue` 中添加「批量导入」入口
  - [ ] 上传 Excel → 轮询 `batchId` 状态（每 2 秒）→ 展示结果
  - [ ] 失败记录展示表格 + 「导出失败明细」按钮（触发下载 `errorFileUrl`）

## Dev Notes

### exceljs 读取 Excel

```typescript
import * as ExcelJS from 'exceljs'

async parsePaymentExcel(buffer: Buffer): Promise<PaymentRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  const rows: PaymentRow[] = []

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return  // 跳过表头
    rows.push({
      rowNumber,
      rightLeopardCode: row.getCell(1).value?.toString()?.trim() || '',
      amount: parseFloat(row.getCell(2).value?.toString() || '0'),
      paymentTime: row.getCell(3).value?.toString() || '',
      contactPerson: row.getCell(4).value?.toString()?.trim(),
    })
  })
  return rows
}
```

### 失败明细 Excel 生成

```typescript
async generateFailureReport(failedRows: FailedRow[]): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('失败明细')
  sheet.addRow(['行号', '右豹编码', '付费金额', '付费时间', '付费对接人', '失败原因'])
  failedRows.forEach(row => sheet.addRow([row.rowNumber, row.rightLeopardCode, row.amount, row.paymentTime, row.contactPerson, row.failureReason]))

  const fileName = `payment-import-failures-${Date.now()}.xlsx`
  const filePath = `uploads/exports/${fileName}`
  await workbook.xlsx.writeFile(filePath)
  return `/uploads/exports/${fileName}`
}
```

### batchNo 生成

```typescript
// 格式: IMP-000001（全局自增6位）
// 简单实现：查询当前最大 batchNo 并自增
const lastBatch = await this.prisma.importBatch.findFirst({ orderBy: { id: 'desc' }, select: { batchNo: true } })
const nextNum = lastBatch ? parseInt(lastBatch.batchNo.split('-')[1]) + 1 : 1
const batchNo = `IMP-${String(nextNum).padStart(6, '0')}`
```

### 关键架构规范（不可偏离）

1. **≤ 500 条限制在接口层**：读取 Excel 后检查行数，超出直接返回 400
2. **导入过程异步**：BullMQ 处理，前端轮询状态（NFR4）
3. **失败记录不回滚成功记录**：成功 = 局部成功，失败单独报告

### 前序 Story 依赖

- **Story 4.5**（`PaymentsService.createPayment()` 校验逻辑可复用）
- **Story 1.3**（`import_batches` 表）
- **Story 1.4**（`excel-import-process` BullMQ 队列）

### Project Structure Notes

- FR8 批量导入规格：[Source: epics.md#FR8]
- NFR3 导入性能：[Source: architecture.md#需求概览 NFR3]

### 纯前端 / Mock 落地说明（本仓库）

本阶段**不实现** NestJS、Multer、BullMQ、Prisma；由前端解析 Excel 后以 JSON 提交，Mock 模拟异步批次。

| 能力 | 实现位置 |
|------|----------|
| 模板下载 | 浏览器 `xlsx` 生成：`frontend/src/utils/paymentImportExcel.ts` → `downloadPaymentImportTemplate()` |
| 解析上传 | 同上 `parsePaymentImportFile()`，上限 500 行 |
| 提交导入 | `POST /api/v1/payments/import`，body：`{ fileName, rows: PaymentImportRowInput[] }` |
| 批次列表 / 详情 | `GET /api/v1/payments/import-batches`、`GET /api/v1/payments/import-batches/:batchId`（Mock 路由注册在 `payments/:id` 之前） |
| 异步语义 | Mock `setTimeout` ~480ms 后 `PROCESSING` → `COMPLETED` / `PARTIAL_FAILED` |
| 落库与校验 | `frontend/src/mock/payments.ts`：`tryInsertPayment` 与 `POST /payments` 单条新增共用 |
| UI | `PaymentList.vue` + `PaymentImportRecordsTab.vue`；导入记录 Tab 激活且存在 `PROCESSING` 时每 5s 刷新列表 |

失败明细导出为**前端生成** xlsx（`downloadPaymentImportFailures`），非服务端 `errorFileUrl`。

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
