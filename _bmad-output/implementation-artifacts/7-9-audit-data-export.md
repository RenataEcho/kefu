# Story 7.9：入群审核数据导出

Status: review

## Story

作为**超级管理员**，
我希望能够将入群审核记录按当前筛选条件导出为 Excel，
以便进行离线分析和存档。

## Acceptance Criteria

1. **Given** 管理员设置筛选条件并点击「导出」  
   **When** 操作  
   **Then** 异步生成 Excel，内容与当前筛选结果一致

2. **Given** Excel 文件生成完成  
   **When** 轮询到完成状态  
   **Then** 提供下载链接，有效期 24 小时

3. **Given** 导出字段  
   **When** 生成 Excel  
   **Then** 含：申请人右豹编码、飞书昵称、申请时间、SLA截止时间、审核结果、审核时间、拒绝原因

4. **Given** 导出权限  
   **When** 普通客服查看  
   **Then** 导出按钮不可见（需 `audit:export` 或管理员权限）

## Tasks / Subtasks

> **纯前端：** Task 1–2 使用与 Story 4-7 相同的内存 `exportJobsStore` + `GET /exports/:id` 轮询，在前端生成 xlsx。

- [x] Task 1: 审核记录导出 API
  - [x] `POST /api/v1/group-audits/export`（`audit:export` 权限由前端按钮控制）
  - [x] 接收与列表筛选相同的参数
  - [x] 返回 `{ exportId }`（Mock 注册异步任务）

- [x] Task 2: 导出 Processor
  - [x] Mock `setTimeout` 内按筛选全量过滤
  - [x] SLA 截止列使用上海时区 +3 天 endOf('day') 格式化
  - [x] ~~真实文件上传~~ → `completeExportJob` 提供 `sheet`

- [x] Task 3: 前端导出入口
  - [x] 工作台「导出」+ `runExportWithPolling` + `startGroupAuditsExport`

## Dev Notes

复用 Story 4.7 的导出基础设施（`file-export-generate` 队列、Redis 状态存储、24小时有效期）。

### 关键约束

- SLA截止时间在 Excel 中以 ISO 8601 字符串或格式化日期显示（`YYYY-MM-DD HH:mm:ss`）

### 前序 Story 依赖

- **Story 4.7**（导出基础设施）
- **Story 7.1**（`group_audits` 数据）

### Project Structure Notes

- 导出文件24小时有效期：[Source: epics.md#FR48 导出规格]

## Dev Agent Record

### Agent Model Used

Composer（GPT-5.2）

### Debug Log References

### Completion Notes List

- 导出列：右豹编码、飞书昵称、申请时间、SLA 截止、审核结果、审核时间、拒绝原因；>1000 条走 §1.9 `rowEstimate` 提示。

### File List

- `frontend/src/api/groupAudits.ts`
- `frontend/src/mock/groupAudits.ts`
- `frontend/src/views/group-audits/AuditWorkbench.vue`
- `frontend/src/composables/useAsyncDataExport.ts`（复用）
- `frontend/src/mock/index.ts`（确保聚合 `dataExport`）
