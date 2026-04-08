# Story 4.8：用户主档详情页（§2.2）

Status: review

## Story

作为**客服 / 管理员**，
我希望从用户主档列表**点击行进入详情页**，集中查看基础信息、归属、付费与右豹动作数据，并查看操作日志，
以便在不打开编辑抽屉的情况下完成核对与协作（对齐 `prototype-spec.md` **§2.2** 详情区块；列表侧「点击行进入详情」）。

## Acceptance Criteria

1. **Given** 用户在用户主档列表  
   **When** 点击表格行（操作列按钮 `stopPropagation` 不触发）  
   **Then** 导航至 **`/users/:id`**（或项目约定的详情路由），展示用户主档详情页

2. **Given** 详情页加载成功  
   **When** 渲染 **[基础信息区]**  
   **Then** 展示只读：右豹编码（附校验状态：`badge-green` 已验证 / `badge-orange` 编码待验证）、右豹 ID、飞书 ID、飞书手机号、飞书昵称

3. **Given** 详情页  
   **When** 渲染 **[归属信息区]**  
   **Then** 展示：所属客服、所属导师、所属门派（名称可点击跳转至对应管理页/详情，若路由未就绪可先 Mock `router.push` 占位）

4. **Given** 当前角色具备付费字段权限  
   **When** 渲染 **[付费信息区]**  
   **Then** 展示：是否付费学员（只读 Badge）、付费金额、付费时间、付费对接人

5. **Given** 当前角色**不具备**付费字段权限  
   **When** 渲染页面  
   **Then** **[付费信息区]** 整块自 DOM 移除（布局坍塌，对齐 **§3.1** 角色视图策略）

6. **Given** 详情页  
   **When** 渲染 **[右豹动作数据区]**  
   **Then** 展示：总关键词数、总订单数、项目收益；状态文案：**实时** / **缓存，最后同步：X 时间前** / **同步中**（`badge-blue`）；提供 **[手动触发同步]** 按钮，点击后 loading + Toast，Mock 返回更新后时间戳

7. **Given** 详情页 **[操作日志区]**  
   **When** 首次进入  
   **Then** 区域 **默认折叠**；展开后表格列：操作时间、操作人、操作类型、变更字段、变更前值、变更后值；分页对齐 **§1.4**：默认 20 条，`[加载更多]` 每次 +20

8. **Given** 用户具备编辑权限  
   **When** 详情页顶栏或固定操作区  
   **Then** 提供 **[编辑]**，打开现有 `UserEditDrawer` 并传入 `userId`；保存成功后刷新详情

9. **Given** 用户具备删除权限且无关联数据  
   **When** 点击 **[删除]**  
   **Then** 行为与列表删除一致：关联拦截 Modal / 确认删除 Modal（复用 `4-3` 逻辑或抽 composable）

10. **Given** 无效 `id` 或网络错误  
    **When** 加载详情  
    **Then** 错误态 + 返回列表，不崩溃

11. **Given** 纯前端环境  
    **When** 验收  
    **Then** 详情与日志、同步动作均在 **`vite-plugin-mock`** 中实现

### 原型 §2.2 详情结构（交付对照）

| 区块 | 权限 / 条件 |
|------|-------------|
| 基础信息 | 始终 |
| 归属信息 | 始终 |
| 付费信息 | `hasFieldPermission` |
| 右豹动作数据 | 始终；同步按钮 Mock `POST /api/v1/users/:id/sync-youbao` |
| 操作日志 | 折叠 + §1.4 分页 |

## Tasks / Subtasks

- [x] Task 1: 路由 (AC: #1)
  - [x] 在 `src/router/index.ts` 增加子路由 `users/:id` → `UserDetailView.vue`（名称如 `UserDetail`），`meta.title`：用户详情，`permission` 与列表同为 `MENU_PERMS.USERS`

- [x] Task 2: Mock 扩展 (AC: #2–#7, #11)
  - [x] 扩展 `GET /api/v1/users/:id` 响应：详情专用字段（动作数据、同步状态、付费摘要、各计数字段）；**禁止**包含 `wxOpenId`
  - [x] `GET /api/v1/users/:id/audit-logs?cursor=`：分页日志
  - [x] `POST /api/v1/users/:id/sync-youbao`：返回 `{ lastSyncedAt, stats... }`
  - [x] 更新 `src/mock/users.ts`

- [x] Task 3: API 与 Store (AC: #11)
  - [x] `src/api/users.ts`：`fetchUser`、`fetchUserAuditLogs`、`syncUserYoubao`；详情加载在视图内直连 API（沿用 `userStore.fetchUserDetail` 供删除预检）
  - [x] `src/stores/user.ts`：未新增方法（按需省略）

- [x] Task 4: 详情页组件 (AC: #2–#10)
  - [x] 新建 `frontend/src/views/users/UserDetailView.vue`：分区玻璃卡片、与 `UserList` 页头风格统一
  - [x] `UserList.vue`：`handleRowClick` → `router.push({ name: 'UserDetail', params: { id: String(row.id) } })`

- [x] Task 5: 编辑 / 删除复用 (AC: #8, #9)
  - [x] 嵌入 `UserEditDrawer`；删除流程抽 `UserDeleteModals` + `useUserDeleteFlow` 供列表与详情共用

## Dev Notes

### 与 Story 4.1 / 4.3 的分工

- **4.1**：列表 + 筛选；行点击进详情在本 Story 接线。
- **4.3**：编辑抽屉与删除 Modal；详情页通过按钮复用，避免重复表单大块。

### 类型建议

在 `types/user.ts` 中区分 `UserListItem` 与 `UserDetail`（若已有 `UserDetail`，扩展 `actionStats`、`syncState`、`auditLogs` 分页字段）。

### 关键架构规范

1. **`wxOpenId` 永不返回**（NFR8）。
2. **付费字段**必须用权限系统隐藏整块区域，而非仅 `visibility:hidden`。

### 前序 Story 依赖

- **Story 4.1**（列表）
- **Story 4.2 / 4.3**（创建、编辑、删除）
- **Story 2.2**（字段与菜单权限）
- **Story 4.4**（右豹同步语义，可与本 Story Mock 对齐）

### Project Structure Notes

- 原型：[Source: `_bmad-output/planning-artifacts/prototype-spec.md` §2.2]

## Dev Agent Record

### Agent Model Used

Cursor Agent（实现会话）

### Debug Log References

### Completion Notes List

- 付费信息区：`paymentAmount` 与 `paymentContact` 任一字段权限为真则渲染整块；块内子行按各自字段权限显示。
- 操作日志：`n-collapse` 默认折叠，`display-directive="if"`，首次展开再请求 Mock；`加载更多` 使用 `nextCursor`。
- 列表与详情删除：`useUserDeleteFlow` + `UserDeleteModals.vue`。

### File List

- `frontend/src/views/users/UserDetailView.vue`
- `frontend/src/views/users/UserDeleteModals.vue`
- `frontend/src/composables/useUserDeleteFlow.ts`
- `frontend/src/views/users/UserList.vue`
- `frontend/src/router/index.ts`
- `frontend/src/api/users.ts`
- `frontend/src/mock/users.ts`
- `frontend/src/types/user.ts`

### Change Log

- 2026-04-07: Story 文件创建 — 用户主档详情 §2.2，状态 `drafted`
- 2026-04-07: 实现详情页、Mock 与列表行跳转，状态 `review`
