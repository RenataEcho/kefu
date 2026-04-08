# Story 9.6：运营看板导出报告（§1.9 扩展 · 全局 Dashboard）

Status: review

## Story

作为**超级管理员 / 审核员**，
我希望在**全局运营看板**点击 **「导出报告」**，按当前日期筛选条件导出一份可汇报的 Excel（含核心指标、漏斗、概览摘要），
以便在会议或飞书中直接分发（交互对齐 `prototype-spec.md` **§1.9**；导出模块表未单独列出「看板」时，本 Story 作为 **Dashboard 专用导出** 定义）。

## Acceptance Criteria

1. **Given** 用户具备全局 Dashboard 权限且 `DashboardView` 顶栏展示 **导出报告**  
   **When** 点击按钮  
   **Then** 立即 Toast：**「正在生成导出文件，完成后将自动下载」**（与 §1.9 一致）

2. **Given** 导出请求已发起  
   **When** 处理中  
   **Then** **导出报告** 按钮进入 **loading + disabled**，防止重复点击

3. **Given** Mock 返回预计条数或行数 **> 1000**（或由服务端字段 `estimatedRows` 判定）  
   **When** 点击导出  
   **Then** 在 Toast 或二次轻提示中展示：**「导出数量较多，预计需要 X 秒，请稍候」**（`X` 来自 Mock 或简单公式）

4. **Given** 导出任务完成（Mock 可同步完成）  
   **When** 前端收到成功响应  
   **Then** 触发浏览器下载 **`.xlsx`** 文件；文件名：  
   **`运营看板_导出_YYYY-MM-DD_HH-mm.xlsx`**（与 §1.9 命名模式一致，模块名用「运营看板」）

5. **Given** 导出成功  
   **When** 响应体包含 `downloadUrl` + `expiresAt`（24h 内有效）  
   **Then** 可选：写入本地「待展示通知」结构或 `NNotification`，便于与 **§1.5** 站内通知规范衔接（纯前端可用假链接验收文案）

6. **Given** 当前路由 Query 为日期筛选（与 Story 9.4 一致：`dateRange`、`startDate`、`endDate`）  
   **When** 请求导出  
   **Then** 请求体或 Query **原样携带**当前筛选，Mock 校验参数存在即通过

7. **Given** 客服**个人看板**（Story 9.3）  
   **When** 若需导出  
   **Then** 产品可选：**不展示**「导出报告」或导出仅为个人指标 + 趋势（若展示，文件名建议 `我的建联看板_导出_YYYY-MM-DD_HH-mm.xlsx`）；本 Story **默认仅要求全局看板** 按钮落实

8. **Given** 导出失败（Mock 返回错误码）  
   **When** 用户已点击  
   **Then** Toast / Message 错误提示；按钮恢复可点

9. **Given** 纯前端环境  
   **When** 验收  
   **Then** `POST /api/v1/exports` 或 `POST /api/v1/dashboard/export` 由 **`vite-plugin-mock`** 实现，可用 `xlsx` 库在前端组装 Blob 触发下载（与 Story 7-2 审核导出模式一致）

### 原型 §1.9 对齐表（看板扩展）

| 项 | 看板实现 |
|----|-----------|
| 导出范围 | 当前日期筛选下的指标快照 + 漏斗 + 各概览表前 50 行（与 §1.4 上限一致） |
| 格式 | `.xlsx` |
| 交互 | 异步文案、loading、>1000 提示 |
| 通知链接 | §1.5 可选 |

## Tasks / Subtasks

- [x] Task 1: Mock (AC: #1–#6, #8, #9)
  - [x] `POST /api/v1/dashboard/export` body: `{ dateRange, startDate?, endDate? }`；`custom` 缺参 400
  - [x] 同步返回 `fileName`、`estimatedRows`、`sheets[]`、`downloadUrl`、`expiresAt`；`body.failExport===true` 可测失败
  - [x] `src/mock/dashboard.ts`

- [x] Task 2: API (AC: #9)
  - [x] `postDashboardExport` → `src/api/dashboard.ts`
  - [x] `DashboardExportResponse` / `DashboardExportSheetPayload` → `src/types/dashboard.ts`

- [x] Task 3: UI 接线 (AC: #1–#8, #7)
  - [x] `DashboardView.vue`：Toast、loading/disabled、`downloadMultiSheetXlsx`、>1000 秒数提示、成功含 §1.5 链接文案
  - [x] 操作权限 `dashboard:export`（admin / auditor Mock）

- [x] Task 4: 个人看板 (AC: #7)
  - [x] 产品选择：**不展示**「导出报告」（按钮仅在 `canViewGlobalDashboard` 且具备 `dashboard:export` 时出现）

## Dev Notes

### 与 §1.9 三模块导出表的关系

| 模块 | 文件名模式 | Story |
|------|------------|--------|
| 用户主档 | `用户主档_导出_...` | 4-7 |
| 付费记录 | `付费记录_导出_...` | 4-7 |
| 入群审核 | `入群审核_导出_...` | 7-9 |
| **运营看板** | `运营看板_导出_...` | **本 Story 9.6** |

### 实现提示

- 可与 **7-9**、**4-7** 共用小型 `useExportJob` composable：`loading`、`runExport`、`onSuccessDownload`。
- Excel 列建议：Sheet1 核心指标、Sheet2 漏斗三步、Sheet3 门派/导师/客服概览（与当前 `DashboardView` 数据结构对齐）。

### 前序 Story 依赖

- **Story 9.2**（全局看板布局与数据）
- **Story 9.4**（日期筛选 Query）
- **Story 9.1 / mock dashboard**（`GET /api/v1/dashboard/global` 字段复用）

### Project Structure Notes

- 导出通用规范：[Source: `_bmad-output/planning-artifacts/prototype-spec.md` §1.9、§1.5]
- 看板布局：[Source: 同文档 §2.3]

## Dev Agent Record

### Agent Model Used

（实现后填写）

### Debug Log References

### Completion Notes List

- 多 Sheet：`核心指标` / `转化漏斗` / `门派概览` / `导师概览` / `客服概览`；文件名 `运营看板_导出_YYYY-MM-DD_HH-mm.xlsx`。

### File List

- `frontend/src/views/DashboardView.vue`
- `frontend/src/api/dashboard.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/mock/dashboard.ts`
- `frontend/src/utils/dataExportXlsx.ts`
- `frontend/src/mock/auth.ts`
- `frontend/src/mock/roles.ts`
- `frontend/src/utils/permission.ts`

### Change Log

- 2026-04-07: Story 文件创建 — 运营看板导出报告，状态 `drafted`
- 2026-04-07: 纯前端实现完成，状态 `review`
