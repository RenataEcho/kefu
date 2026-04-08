# Story 5.2：历史付费记录 Excel 批量导入

Status: review

## Story

作为**超级管理员**，
我希望能够将历史 Excel 中的付费记录数据批量导入系统，
以便历史付费数据完整进入系统，用户付费状态从迁移第一天起即准确（满足 FR48）。

## Acceptance Criteria

1. **Given** 管理员上传历史付费记录 Excel  
   **When** 提交导入  
   **Then** 对应用户主档已存在时，付费记录成功创建（无付费上限限制）

2. **Given** Excel 中付费记录对应的右豹编码不存在于 `users` 表  
   **When** 处理该记录  
   **Then** 跳过并标注"用户主档不存在"

3. **Given** Excel 中存在重复付费记录（同一右豹编码已有付费记录）  
   **When** 处理  
   **Then** 跳过并标注"该用户已有付费记录"

4. **Given** 导入完成  
   **When** 查看结果  
   **Then** 展示成功/失败统计，支持导出失败明细

## Tasks / Subtasks

- [x] Task 1: 创建历史付费记录导入端点 (AC: #1) — **纯前端 Mock**
  - [x] `POST /api/v1/migration/payments/import`（无 500 条上限，异步 setTimeout 与 4-6 一致）
  - [x] 批次前缀 `MIG-`，独立列表 `GET /migration/payments/import-batches`

- [x] Task 2: 实现付费迁移 Processor (AC: #1, #2, #3) — **Mock 复用 `finalizeImportBatch` migration 模式**
  - [x] 与 Story 4.6 共用 `tryInsertPayment`，migration 模式失败文案对齐 AC#2/#3
  - [x] 不调用右豹 API（Mock 与 4-6 一致）

- [x] Task 3: 前端入口（整合到迁移管理页）(AC: #4)
  - [x] 「数据迁移」`/migration` → Tab「付费记录」+ 导入记录轮询与失败明细导出
  - [x] 页面内提示建议先完成用户主档迁移（Hub 顶部 Alert）

## Dev Notes

### 依赖顺序说明

**必须先完成 Story 5.1（用户主档导入）**，再执行 Story 5.2（付费记录导入），因为付费记录需要 `users` 表中存在对应用户。

前端可以通过导入向导页面引导操作顺序。

### 复用 Story 4.6 逻辑

迁移付费记录 Processor 与 Story 4.6 的 Processor 核心逻辑相同，唯一区别是无行数上限。可以提取共享的校验逻辑到 `PaymentsService.validatePaymentRow()`。

### 前序 Story 依赖

- **Story 5.1**（用户主档已入库）
- **Story 4.6**（付费记录导入逻辑基础）

### Project Structure Notes

- FR48 历史数据迁移：[Source: epics.md#FR48]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 纯前端：`vite-plugin-mock` 在 `payments.ts` 增加 `migration/payments/*`；`finalizeImportBatch(..., 'migration')` 区分失败文案。
- 入口：`MigrationHubView` + `MigrationPaymentImportTab` + `MigrationPaymentImportRecordsTab`；权限 `payments:migration:import`、`migration:read`。

### File List

- `frontend/src/mock/payments.ts`
- `frontend/src/api/migrationPayments.ts`
- `frontend/src/views/migration/MigrationHubView.vue`
- `frontend/src/views/migration/MigrationPaymentImportTab.vue`
- `frontend/src/views/migration/MigrationPaymentImportRecordsTab.vue`
- `frontend/src/router/index.ts`
- `frontend/src/components/layout/AppSidebar.vue`
- `frontend/src/utils/permission.ts`
- `frontend/src/mock/auth.ts`
- `frontend/src/mock/roles.ts`

### Change Log

- 2026-04-07：完成 Step 31 纯前端交付（Mock + 迁移中心付费 Tab）。
