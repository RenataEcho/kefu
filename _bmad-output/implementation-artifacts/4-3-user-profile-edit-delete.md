# Story 4.3：用户主档编辑与删除

Status: review

## Story

作为**客服/专属顾问/管理员**，
我希望能够修改用户主档的可编辑字段，管理员可删除记录，删除前系统展示影响范围，
以便维护准确的用户数据（满足 FR5、FR6）。

## Acceptance Criteria

1. **Given** 客服点击用户记录的「编辑」操作  
   **When** 触发操作  
   **Then** 右侧抽屉打开，预填当前字段值；可修改的字段根据角色权限显示（满足 PRD 字段分级表）

2. **Given** 客服修改用户主档基础字段并保存  
   **When** 提交更新  
   **Then** 记录更新成功，`audit_logs` 自动记录修改前后数据快照（满足 FR46）

3. **Given** 管理员尝试删除有关联数据的用户（存在入群审核记录或付费记录）  
   **When** 点击「删除」弹出二次确认弹窗  
   **Then** 弹窗展示影响范围；确认后系统拦截返回 `code: 10003`，提示"请先删除关联记录"（满足 FR6）

4. **Given** 管理员删除无关联数据的用户记录  
   **When** 确认删除  
   **Then** 记录成功删除，列表刷新，Toast 提示"删除成功"

5. **Given** 普通客服查看用户主档操作区  
   **When** 查看按钮区域  
   **Then** 删除按钮不存在（操作权限 `users:delete` 控制）

## Tasks / Subtasks

- [x] Task 1: 实现用户编辑 API (AC: #1, #2)
  - [x] `GET /api/v1/users/:id`（用户详情，含全量字段，**严格排除 wxOpenId**）
  - [x] `PATCH /api/v1/users/:id`（需 `users:update` 权限）+ `@Audit('users')`
  - [x] `UpdateUserDto`：仅含可编辑字段（`rightLeopardId`、`larkId`、`larkPhone`、`larkNickname`、`agentId`、`mentorId`、`schoolId`）
  - [x] 审计日志需要 `before_data`：Mock 层捕获 before/after 数据快照（纯前端实现）

- [x] Task 2: 实现用户删除 API（含关联检查）(AC: #3, #4, #5)
  - [x] `DELETE /api/v1/users/:id`（需 `users:delete` 权限）+ `@Audit('users')`
  - [x] 删除前检查：`groupAudits._count > 0 || paymentRecords._count > 0` → code 10003
  - [x] 关联数量通过 Mock 用户数据的 `groupAuditsCount` / `paymentRecordsCount` 字段模拟

- [x] Task 3: 前端编辑抽屉 (AC: #1, #2)
  - [x] 在 `UserList.vue` 中添加编辑入口（操作列「编辑」按钮）
  - [x] 编辑抽屉 `UserEditDrawer.vue` 预填当前值，调用 `PATCH /api/v1/users/:id`
  - [x] 字段显隐基于 `usePermission().hasOperationPermission('users:update')`

- [x] Task 4: 前端删除逻辑 (AC: #3, #4, #5)
  - [x] 删除按钮仅对 `users:delete` 权限用户渲染（`v-if`）
  - [x] 关联数据拦截 Modal：展示"入群审核记录 X 条 / 付费记录 X 条"，仅 [关闭]
  - [x] 删除确认 Modal（无关联时）：警告文案 + [取消][确认删除]
  - [x] 后端返回 10003 时，前端 Toast 红色提示"请先删除关联记录"

## Dev Notes

### 带 before_data 的审计日志

```typescript
// users.service.ts
async updateUser(id: bigint, dto: UpdateUserDto) {
  // 1. 获取更新前快照（用于审计日志）
  const beforeUser = await this.prisma.user.findUnique({
    where: { id },
    select: { id: true, rightLeopardCode: true, larkNickname: true, agentId: true, /* ...可编辑字段 */ },
  })
  if (!beforeUser) throw new NotFoundException({ code: 10002, message: '用户不存在' })

  // 2. 执行更新
  const updatedUser = await this.prisma.user.update({
    where: { id },
    data: { ...dto, agentId: dto.agentId ? BigInt(dto.agentId) : undefined },
  })

  // 3. 手动记录审计日志（携带 before_data）
  await this.auditService.log({
    tableName: 'users',
    recordId: id,
    operatorId: null,  // 由 AuditLogInterceptor 的上下文注入（或在 Controller 层传入）
    actionType: 'UPDATE',
    beforeData: beforeUser,
    afterData: updatedUser,
  })

  return updatedUser
}
```

> 注意：由于需要 `beforeData`，`UPDATE` 操作推荐在 Service 层手动调用 `AuditService.log()`，而非依赖拦截器自动记录（拦截器无法获取更新前快照）。

### 关联检查 + 删除

```typescript
async deleteUser(id: bigint) {
  const user = await this.prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { groupAudits: true, paymentRecords: true } },
    },
  })
  if (!user) throw new NotFoundException({ code: 10002, message: '用户不存在' })

  if (user._count.groupAudits > 0 || user._count.paymentRecords > 0) {
    throw new BadRequestException({
      code: 10003,
      message: `该用户有 ${user._count.groupAudits} 条入群审核记录和 ${user._count.paymentRecords} 条付费记录，请先删除关联记录`,
    })
  }

  await this.prisma.user.delete({ where: { id } })
}
```

### 关键架构规范（不可偏离）

1. **UPDATE 需要手动记录 before_data**：不能依赖 AuditLogInterceptor（拦截器拿不到更新前数据）
2. **删除前必须检查两类关联**：`groupAudits` 和 `paymentRecords`（FR6 两类关联数据）
3. **`wxOpenId` 仍然排除**：GET 用户详情也不能包含此字段

### 前序 Story 依赖

- **Story 4.1**（`UserList.vue`、`UsersService` 基础已就绪）
- **Story 4.2**（`CreateUserDto`、右侧抽屉模式）

### Project Structure Notes

- FR5 用户编辑规格：[Source: epics.md#FR5]
- FR6 用户删除规格：[Source: epics.md#FR6]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

无重大调试问题。TypeScript 类型检查初次运行发现 POST /users mock 缺少新增字段，已修复。

### Completion Notes List

- **纯前端实现**：所有 API 通过 vite-plugin-mock 拦截，无后端代码
- **GET /api/v1/users/:id**：返回含 `larkId`、`groupAuditsCount`、`paymentRecordsCount` 的完整用户详情
- **PATCH /api/v1/users/:id**：支持更新 7 个可编辑字段，mentor 变更自动联动 school
- **DELETE /api/v1/users/:id**：检查关联数量，有关联返回 code 10003
- **UserEditDrawer.vue**：加载态 + 错误态 + 预填表单，右豹编码只读展示带校验状态 Tag
- **删除流程**：先 GET 详情获取关联数，有关联 → 拦截 Modal（仅关闭），无关联 → 确认 Modal
- **权限控制**：编辑按钮受 `users:update`，删除按钮受 `users:delete`，v-if 精确控制
- **Step 6 收尾（与 4-8 联动）**：列表与详情共用 `UserDeleteModals` + `useUserDeleteFlow`；`PATCH/DELETE` Mock 调用 `appendMockAuditLog` 写入全局操作日志（含可编辑字段 before/after）；编辑抽屉「归属信息」仅当 `hasMenuPermission(org:read)` 显示，无权限时 PATCH 不传 `agentId`/`mentorId`/`schoolId`；`AuditLogTable` 增加 `reloadNonce` 保存后刷新嵌入日志。

### File List

- `frontend/src/api/request.ts` — 新增 `patch` 函数
- `frontend/src/types/user.ts` — 新增 `UpdateUserDto`、`UserDetail` 类型
- `frontend/src/api/users.ts` — 新增 `fetchUser`、`updateUser`、`deleteUser` 函数
- `frontend/src/mock/users.ts` — 新增 GET/PATCH/DELETE /:id 三个 Mock 端点；MockUser 新增 `larkId`、`groupAuditsCount`、`paymentRecordsCount` 字段
- `frontend/src/stores/user.ts` — 新增 `fetchUserDetail`、`updateUserRecord`、`deleteUserRecord` 三个 action
- `frontend/src/views/users/UserEditDrawer.vue` — 新建：编辑抽屉组件
- `frontend/src/views/users/UserList.vue` — 更新：集成编辑抽屉、删除 Modal、操作列扩展
- `frontend/src/views/users/UserDeleteModals.vue`、`frontend/src/composables/useUserDeleteFlow.ts` — Step 5/6：删除弹窗复用（列表 + 详情）
- `frontend/src/mock/auditLogs.ts` — `appendMockAuditLog` 供 users Mock 追加审计
- `frontend/src/components/common/AuditLogTable.vue` — `reloadNonce` 强制重拉
