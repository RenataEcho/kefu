# Story 7.5：手动导入降级入口与飞书 API 降级状态提示

Status: review

## Story

作为**超级管理员**，
我希望在飞书 API 不可用时，能够手动导入入群申请数据，系统继续正常运转，
以便飞书故障期间业务不中断（满足 FR15、NFR11）。

## Acceptance Criteria

1. **Given** 飞书 API 不可用  
   **When** 系统检测到降级  
   **Then** `ApiStatusBar` 显示"飞书API暂时不可用，请使用手动导入"；`appStore.larkApiDegraded = true`

2. **Given** 管理员在降级状态下上传 Excel 并提交  
   **When** 导入处理完成  
   **Then** `group_audits` 记录创建，`applySource: 'MANUAL_IMPORT'`；SLA 计时从系统**导入操作时间**开始（不是飞书申请时间）

3. **Given** 飞书 API 恢复  
   **When** 轮询成功  
   **Then** `ApiStatusBar` 消失，自动切回 API 同步模式

4. **Given** 管理员点击「手动同步飞书状态」  
   **When** API 正常时  
   **Then** 触发即时轮询（`POST /api/v1/lark/sync`），满足 FR19 手动触发入口

## Tasks / Subtasks

> **纯前端交付说明：** Task 1–3 中 Nest/Redis/BullMQ 项不实现；由 `vite-plugin-mock` 模拟 `lark/status`、`lark/sync`、`manual-import` 行为。

- [x] Task 1: 飞书 API 降级检测 (AC: #1, #3)
  - [x] ~~在 `LarkApiService` 中…~~（跳过，Mock 内存变量 `larkServiceDegraded`）
  - [x] `GET /api/v1/lark/status` → 返回 `{ degraded: boolean }`
  - [x] 前端每 30 秒轮询更新 `appStore.larkApiDegraded`（`AppLayout`）

- [x] Task 2: 手动导入 API (AC: #2)
  - [x] `POST /api/v1/group-audits/manual-import`（Mock：创建 `manual_import` 记录，`applyTime` 为导入时刻）
  - [x] ~~解析 Excel…~~（Mock 占位上传即可）
  - [x] `applyTime = new Date()`（导入时刻），`applySource = 'MANUAL_IMPORT'`
  - [x] ~~BullMQ~~（跳过）

- [x] Task 3: 手动同步触发端点 (AC: #4)
  - [x] `POST /api/v1/lark/sync`（Mock：处理 PROCESSING + 清除降级）

- [x] Task 4: 前端降级展示 (AC: #1, #2, #3)
  - [x] 工作台顶部 `ApiStatusBar`（绑定 `appStore.larkApiDegraded`，文案对齐 AC）
  - [x] 降级时显示「前往手动导入」；正常时保留「手动同步飞书状态」并调用 `/lark/sync`

## Dev Notes

### SLA 计时起点区分

```typescript
// API 同步：applyTime = 飞书申请提交时间（飞书 API 返回）
// 手动导入：applyTime = new Date()（系统导入时刻）
```

这两种场景的 `applySource` 字段不同（`LARK_API` vs `MANUAL_IMPORT`），前端可据此显示数据来源说明。

### 关键架构规范

1. **SLA 起点规则**：手动导入必须用导入时刻（FR15 明确规定）
2. **降级自动检测 + 自动恢复**：无需管理员手动切换模式

### 前序 Story 依赖

- **Story 7.1**（`LarkApiService`、`syncFromLark()`）

### Project Structure Notes

- FR15 手动导入 SLA 计时：[Source: epics.md#FR15]
- NFR11 外部API降级：[Source: architecture.md#NFR11]

## Dev Agent Record

### Agent Model Used

Composer（GPT-5.2）

### Debug Log References

### Completion Notes List

- `useAppStore().larkApiDegraded` + `AppLayout` 30s 轮询；`AuditWorkbench` 顶栏 `ApiStatusBar` + 手动导入区；`POST /manual-import` 写入新 `PENDING` 且 `source: manual_import`。

### File List

- `frontend/src/stores/app.ts`
- `frontend/src/api/lark.ts`
- `frontend/src/components/layout/AppLayout.vue`
- `frontend/src/views/group-audits/AuditWorkbench.vue`
- `frontend/src/mock/groupAudits.ts`
