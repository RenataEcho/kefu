# Story 7.2：审核工作台列表（状态标记 + SLA 可视化）

Status: review

## Story

作为**审核员/管理员**，
我希望在审核工作台看到清晰的申请列表，超时记录红色高亮，待处理记录橙色高亮，
以便一眼判断哪些申请最紧急（满足 FR16、UX-DR10）。

## Acceptance Criteria

1. **Given** 审核员进入入群审核工作台  
   **When** 页面首次加载  
   **Then** 列表 ≤ 3 秒显示（NFR1），分页 50 条/页（满足 NFR21），按 SLA 紧迫程度排序（超时在前，然后按申请时间升序）

2. **Given** 已超过 SLA 截止时间的「待审核」申请  
   **When** 列表显示  
   **Then** 该行整行红色高亮，`SlaStatusBadge` 显示「已超时 X 小时」

3. **Given** 未超时的「待审核」申请  
   **When** 列表显示  
   **Then** 该行橙色高亮，`SlaStatusBadge` 显示「剩余 X 小时/分钟」

4. **Given** 顶部筛选  
   **When** 管理员选择状态  
   **Then** 支持按状态筛选：待审核/已通过/已拒绝/已归档；默认显示「待审核」

5. **Given** 列表展示  
   **When** 渲染  
   **Then** 字段含：申请人飞书昵称、右豹编码、申请时间、SLA 状态徽标、近10天动作数（`YoubaoUserStats.keywordCount`）、当前状态、「通过」「拒绝」操作按钮（仅待审核时显示）

### 原型 §2.1 工作台列表（本次交付对齐）

| 条目 | 说明 |
|------|------|
| 列表结构与状态 Badge | 状态列按原型 Badge 表：`待审核` / `⏰ 即将超时` / `已超时` / `处理中…` / `已通过` / `已拒绝` / `已归档`；降级时处理中文案切换 |
| 来源标签 | 申请时间列展示 `飞书同步` / `手动导入` 小标签 |
| 筛选维度 | Tab 状态；待审核 Tab 下 SLA 子筛选（全部/仅超时/常规）；申请时间范围；处理人 |
| 已归档 | 默认列表不含已归档，仅「已归档」Tab 可见 |
| 单条/批量通过拒绝 | 批量上限 1000 条提示；通过 Toast 与原型 §2.1 一致 |
| 空态 | 无数据 / 筛选无结果 +「清除筛选」 |
| 手动同步飞书 | 管理员可见；Mock `POST .../sync-lark-status` |
| 降级 Banner + 手动导入 | `GET .../lark-health` + Banner；`POST .../manual-import` |
| 导出 §1.9 | Toast、>1000 条耗时提示、按钮 loading、文件名 `入群审核_导出_YYYY-MM-DD_HH-mm.xlsx` |
| Mock 接口 | `GET/POST /api/v1/group-audits`、`GET lark-health`、`POST sync-lark-status`、`POST manual-import`、`POST export` |

## Tasks / Subtasks

- [x] Task 1: 实现审核工作台列表 API (AC: #1, #4, #5)
  - [x] `GET /api/v1/group-audits`（分页，支持 `status` 筛选）— 通过 `src/mock/groupAudits.ts` vite-plugin-mock 实现
  - [x] 关联查询：`user`（`rightLeopardCode`、`larkNickname`）、`YoubaoUserStats`（`keywordCount`）— Mock 数据含全字段
  - [x] 响应含 `applyTime`（供前端 `SlaStatusBadge` 计算 SLA）
  - [x] 排序：`PENDING` 状态优先，超时申请（applyTime + 3天 < now）排最前

- [x] Task 2: 前端审核工作台列表页 (AC: #1, #2, #3, #4, #5)
  - [x] 创建 `frontend/src/views/group-audits/AuditWorkbench.vue`
  - [x] NDataTable 50 条/页
  - [x] 行颜色：前端根据 `applyTime` 计算是否超时 → 整行 CSS 类（`row-overdue` 红 / `row-pending` 橙）
  - [x] `SlaStatusBadge` 组件（Story 2.6 已实现）展示在状态列
  - [x] 筛选 Tab：待审核/已通过/已拒绝/已归档
  - [x] 「通过」「拒绝」按钮（`v-if="row.status === 'PENDING'"`）

## Dev Notes

### 排序逻辑

```typescript
// 后端排序：超时申请排最前，然后按申请时间升序
// 需要计算 SLA 截止时间并排序
orderBy: [
  { applyTime: 'asc' },  // 最早申请优先
]
// 超时判断在前端通过 SlaStatusBadge 组件展示
// 注意：纯 SQL 排序超时申请需要计算字段，简化方案：前端获取数据后二次排序
```

### 近10天动作数关联

```typescript
// 关联 YoubaoUserStats
groupAudit.user.rightLeopardCode → YoubaoUserStats.rightLeopardCode → keywordCount
```

由于 Prisma 不直接支持跨表关联（`YoubaoUserStats` 无外键），需要两步查询或在 Service 层合并。

### 行颜色控制（前端）

```typescript
// AuditWorkbench.vue
const getRowClass = (row: GroupAudit) => {
  if (row.status !== 'PENDING') return ''
  const deadline = getSlaDeadline(row.applyTime)  // dayjs UTC+8
  if (dayjs().isAfter(deadline)) return 'row-overdue'   // 红色
  return 'row-pending'  // 橙色
}
```

```css
.row-overdue td { background: rgba(239, 68, 68, 0.15) !important; }
.row-pending td { background: rgba(249, 115, 22, 0.1) !important; }
```

### 关键架构规范

1. **SLA 计算在前端完成**：后端只提供 `applyTime`，前端 `SlaStatusBadge` 用 dayjs+timezone 计算
2. **分页 50 条**（工作台审核场景，与普通列表 20 条不同）
3. **操作按钮仅对 `PENDING` 状态显示**

### 前序 Story 依赖

- **Story 7.1**（`group_audits` 数据已有）
- **Story 2.6**（`SlaStatusBadge` 组件）

### Project Structure Notes

- NFR1 列表性能：[Source: architecture.md#NFR1]
- UX-DR10 SLA 状态徽标：[Source: architecture.md#UX-DR10]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 纯前端实现：Task 1 的后端 API 通过 vite-plugin-mock 拦截，返回含 41 条多状态 Mock 数据
- SLA 计算完全在前端完成（dayjs + Asia/Shanghai 时区），直接复用 Story 2.6 的 SlaStatusBadge 组件
- 行颜色：`row-overdue`（红，rgba(239,68,68,0.08)）对应超时 PENDING；`row-pending`（橙，rgba(249,115,22,0.06)）对应未超时 PENDING；非 PENDING 行无高亮
- Mock 数据包含：8 条超时 PENDING、8 条未超时 PENDING、1 条 PROCESSING、10 条 APPROVED、5 条 REJECTED、4 条 ARCHIVED
- 通过/拒绝操作乐观更新本地 state，拒绝操作通过 n-modal 弹窗收集原因（最大 200 字）
- 分页 50 条/页，支持切换至 100 条；Pinia store：`groupAudit`
- §2.1：`GET/POST /api/v1/group-audits` 支持 `applyTimeFrom/To`、`reviewerName`、`pendingSla`；待审核 Tab 含 PENDING+PROCESSING；`pendingTotal` 用于 Tab 角标
- §2.1：`GET /group-audits/lark-health`、`POST sync-lark-status`、`POST manual-import`、`POST export`；导出使用 `xlsx` 生成 .xlsx，与 §1.9 文案一致
- 列表行点击进入 `GroupAuditDetailView` 占位（完整详情见 §2.1.1）；`audit:approve` 控制行内与批量操作，`audit:export` 控制导出，手动同步仅 `admin`

### File List

- `frontend/src/types/groupAudit.ts` (new)
- `frontend/src/mock/groupAudits.ts` (new)
- `frontend/src/mock/index.ts` (modified)
- `frontend/src/mock/auth.ts` (modified — `audit:export` 等)
- `frontend/src/api/groupAudits.ts` (new)
- `frontend/src/stores/groupAudit.ts` (new)
- `frontend/src/views/group-audits/AuditWorkbench.vue` (new)
- `frontend/src/views/group-audits/GroupAuditDetailView.vue` (new)
- `frontend/src/router/index.ts` (modified — 审核详情路由)
- `frontend/src/views/AuditView.vue` (modified)
- `frontend/package.json` (modified — `xlsx` 导出)
- `_bmad-output/implementation-artifacts/7-2-audit-workbench-list.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-04-04: Story 7-2 实现完成 — 审核工作台列表页（状态标记 + SLA 可视化）上线
- 2026-04-07: 对齐原型 §2.1 — 筛选维度、归档 Tab、状态 Badge 细分、等待时长列、动作数字段（关键词+订单）、飞书降级 Banner/手动导入、管理员同步、导出（§1.9）、Mock 扩展与详情页占位路由
