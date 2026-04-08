# Story 7.10：入群审核详情（§2.1.1）

Status: review

## Story

作为**审核员 / 管理员**，
我希望在点击审核列表某一行后进入**审核详情**，在同一上下文内查看申请全貌、右豹动作数据、通知与归档信息，并在权限允许时完成通过、拒绝或归档，
以便无需离开工作台即可完成判断与留痕（对齐 `prototype-spec.md` **§2.1.1**、列表行交互 §2.1）。

## Acceptance Criteria

1. **Given** 审核员在入群审核工作台  
   **When** 点击列表中某一行（非操作列按钮冒泡）  
   **Then** 进入详情呈现方式：**独立路由** `/group-audits/:id`（已与 Story 7.2 路由约定一致）或右侧 **Drawer**（二选一须在实现中统一，推荐保留路由以便分享与刷新）

2. **Given** 详情页加载  
   **When** `id` 有效  
   **Then** 展示 **[申请基本信息]**：申请人飞书昵称、右豹编码、申请时间（含来源小标签：`飞书同步` / `手动导入`）、等待时长（与列表 SLA 规则一致）

3. **Given** 详情页  
   **When** 任意状态  
   **Then** 展示 **[审核状态]**：当前状态 Badge（对照 §2.1 完整表）、处理人、处理时间（已处理时）；拒绝原因在 **已拒绝** 时展示

4. **Given** 详情页  
   **When** 数据返回  
   **Then** 展示 **[右豹动作数据]**：近 10 天关键词申请数、订单数；数据状态标注为 **实时** / **缓存，最后同步：X** / **同步中**（`badge-blue` + ⏳ 与 §1.4 一致）

5. **Given** 详情页  
   **When** 存在推送结果  
   **Then** 展示 **[通知状态]**：已推送 / 推送失败；失败时展示失败原因，并提供 **[跳转失败记录]**（路由至 `/notifications` 且可带 query 预筛选，Mock 可用假 ID）

6. **Given** 记录为 **已归档**  
   **When** 详情展示  
   **Then** 展示 **[归档信息]**：归档类型、归档时间、归档原因

7. **Given** 审核员且状态为 **待审核**（含业务允许的中间态，与列表一致）  
   **When** 渲染操作区  
   **Then** 显示 **[通过] [拒绝]**；拒绝行为与列表拒绝弹窗规格一致（可复用组件）

8. **Given** 已处理状态  
   **When** 渲染操作区  
   **Then** 不显示通过/拒绝按钮，仅展示处理结果文案

9. **Given** 管理员  
   **When** 详情在非「已归档」等禁止状态下  
   **Then** 显示 **[归档此记录]**；点击后 **Modal** 必填归档原因，确认后调用 Mock 归档接口并刷新详情

10. **Given** 详情底部 **[操作日志区]**  
    **When** 默认进入页面  
    **Then** 日志区 **默认折叠**；展开后列表字段：操作时间、操作人、操作类型、操作内容（含拒绝/归档原因）；分页行为对齐 **§1.4**：首屏 20 条，`[加载更多]` 每次 +20 直至无更多

11. **Given** 无效 `id` 或接口失败  
    **When** 请求详情  
    **Then** 展示错误态（`n-result`）+ 返回列表入口，不全屏白屏

12. **Given** 纯前端环境  
    **When** 验收本 Story  
    **Then** 所有读写在 **`vite-plugin-mock`** 中拦截，无真实后端依赖

### 原型 §2.1.1 区块清单（交付对照）

| 区块 | 必显条件 | Badge / 组件 |
|------|----------|----------------|
| 申请基本信息 | 始终 | 来源标签、等待时长 |
| 审核状态 | 始终 | 与 §2.1 状态表一致 |
| 右豹动作数据 | 始终 | 实时/缓存/同步中 |
| 通知状态 | 有推送记录时 | 失败时 `badge-red` + 链接 |
| 归档信息 | 已归档 | — |
| 操作区 | 权限 × 状态 | 通过/拒绝/归档 |
| 操作日志 | 可折叠 | §1.4 分页 |

## Tasks / Subtasks

- [x] Task 1: Mock 详情与日志 (AC: #2–#6, #10–#12)
  - [x] `GET /api/v1/group-audits/:id` 返回详情 DTO：基本信息、`status`、`reviewer`、`reviewedAt`、`rejectReason`、`youbaoStats`、`dataSyncState`、`notification`、`archive`、`summary`
  - [x] `GET /api/v1/group-audits/:id/audit-logs?cursor=` 或 `page`：每页 20 条，`nextCursor` / `hasMore`
  - [x] `POST /api/v1/group-audits/:id/archive` body: `{ reason: string }`
  - [x] 在 `src/mock/groupAudits.ts`（或拆 `groupAuditDetail.ts`）注册，并在 `mock/index.ts` 聚合

- [x] Task 2: API 与类型 (AC: #12)
  - [x] `src/api/groupAudits.ts`：`fetchGroupAuditDetail(id)`、`fetchGroupAuditLogs(id, cursor)`、`archiveGroupAudit(id, reason)`
  - [x] `src/types/groupAudit.ts`：扩展 `GroupAuditDetail`、`GroupAuditLogItem`

- [x] Task 3: 详情页 UI (AC: #1–#11)
  - [x] 实现 / 补全 `frontend/src/views/group-audits/GroupAuditDetailView.vue`：玻璃拟态分区卡片、与 `AuditWorkbench` 视觉一致
  - [x] 通过/拒绝：复用 store `approve` / `reject` 或抽共享方法；成功后 `router.replace` 刷新或本地更新
  - [x] 列表 `AuditWorkbench`：行点击 `router.push({ name: 'GroupAuditDetail', params: { id } })`（若尚未接线则补全）

- [x] Task 4: 权限 (AC: #7, #9)
  - [x] `audit:approve` 控制通过/拒绝；归档仅 `admin` 或独立 permission（与 7-2 手动同步策略一致）

## Dev Notes

### 与 Story 7.2 的关系

- 列表与批量操作已在 `7-2-audit-workbench-list.md` 交付；本 Story **补齐 §2.1.1 详情结构与 Mock**。
- 路由已存在：`/group-audits/:id` → `GroupAuditDetailView.vue`。

### 操作日志字段（§05 业务规则）

入群审核日志操作类型示例：通过 / 拒绝 / 归档 / 手动导入；内容列承载拒绝原因、归档原因等。

### 关键架构规范（纯前端）

1. **不暴露** 任何微信 OpenID（与 NFR8 一致，详情 DTO 不含该字段）。
2. **降级态**：若 Story 7.5 的飞书 Banner 在布局层，详情页应在同一 `AppLayout` 下自然继承；无需重复实现除非产品要求详情顶栏单独条。

### 前序 Story 依赖

- **Story 7.2**（列表、路由、`groupAudit` store、基础 Mock）
- **Story 2.6**（`SlaStatusBadge` 可选用于等待时长/状态一致化）

### Project Structure Notes

- 原型：[Source: `_bmad-output/planning-artifacts/prototype-spec.md` §2.1.1]
- 分页：[Source: 同文档 §1.4 详情页操作日志]

## Dev Agent Record

### Agent Model Used

Composer（GPT-5.2）

### Debug Log References

### Completion Notes List

- 纯前端：`GroupAuditDetailView` 对接 Mock 详情/日志/归档；错误态 `n-result`；通知区跳转 `/notifications` 带 query；操作日志 `n-collapse` 默认折叠 + 加载更多（每页 20 条）。

### File List

- `frontend/src/types/groupAudit.ts`
- `frontend/src/api/groupAudits.ts`
- `frontend/src/mock/groupAudits.ts`
- `frontend/src/views/group-audits/GroupAuditDetailView.vue`
- `frontend/src/views/NotificationsView.vue`（query 提示条）

### Change Log

- 2026-04-07: Story 文件创建 — 入群审核详情 §2.1.1，状态 `drafted`
- 2026-04-07: 实现完成，状态 `review`
