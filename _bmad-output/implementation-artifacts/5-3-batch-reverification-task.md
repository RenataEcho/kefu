# Story 5.3：批量补校验任务与迁移验证报告

Status: review

## Story

作为**超级管理员**，
我希望系统在迁移完成后自动批量校验所有 `编码待验证` 记录，并生成完整的验证报告，
以便准确了解数据质量，人工处理无效记录（满足 FR48、NFR19）。

## Acceptance Criteria

1. **Given** 历史数据导入完成，管理员手动触发批量补校验  
   **When** 任务开始执行  
   **Then** 以 ≤100 条/批、每批间隔 1 秒的频率依次校验 `PENDING_VERIFY` 记录（满足 FR48 限流规格）

2. **Given** 某条记录校验返回有效  
   **When** 完成  
   **Then** `codeVerifyStatus → 'VERIFIED'`

3. **Given** 某条记录校验返回无效  
   **When** 完成  
   **Then** 标记为 `INVALID`（新增枚举值），**不自动删除**，等待管理员人工处理

4. **Given** 某批次 API 超时/失败  
   **When** 该批次处理完成  
   **Then** 失败记录标记为 `FAILED`，继续处理下一批次

5. **Given** 全部记录校验完成  
   **When** 管理员查看迁移验证报告  
   **Then** 报告展示：总数、已验证、无效、未响应（FAILED）各条数（满足 NFR19）

6. **Given** 管理员查看 `INVALID` 记录  
   **When** 操作  
   **Then** 可执行：保留（等待确认）、手动修正编码、删除记录 三种操作

## Tasks / Subtasks

- [x] Task 1: Schema 更新 - 新增 `INVALID` 状态 (AC: #3) — **前端类型 + Mock 用户枚举**
  - [x] `users.codeVerifyStatus`：`VERIFIED | PENDING_VERIFY | INVALID | FAILED`
  - [x] Prisma 略（纯前端）

- [x] Task 2: 实现批量补校验任务 API (AC: #1) — **Mock**
  - [x] `POST /api/v1/migration/reverify` → `{ taskId }`
  - [x] `GET /api/v1/migration/reverify/:taskId` 轮询进度

- [x] Task 3: 实现补校验 Processor (AC: #1, #2, #3, #4) — **Mock 异步批处理**
  - [x] 每批 100 条、`sleep(1000)` 批间隔
  - [x] 结果写入 `codeVerifyStatus`：VERIFIED / INVALID / FAILED（规则含编码前缀与 id 散列便于演示）

- [x] Task 4: 迁移验证报告 API (AC: #5)
  - [x] `GET /api/v1/migration/report` — `groupBy` 等价统计

- [x] Task 5: 无效记录处理 API (AC: #6)
  - [x] `PATCH /api/v1/users/:id` 扩展：`rightLeopardCode`、`codeVerifyStatus`、`invalidRetained`
  - [x] `DELETE /users/:id` 沿用 4.3

- [x] Task 6: 前端迁移验证报告页 (AC: #5, #6)
  - [x] 「数据迁移」→ Tab「验证报告」统计卡片 + 启动补校验 + INVALID 列表与三操作

## Dev Notes

### codeVerifyStatus 完整枚举

```typescript
// 在整个项目中一致使用这些值
export const CODE_VERIFY_STATUS = {
  VERIFIED: 'VERIFIED',            // 已验证（API 确认有效）
  PENDING_VERIFY: 'PENDING_VERIFY', // 待验证（跳过校验录入或迁移数据）
  INVALID: 'INVALID',              // 编码无效（API 返回不存在）
  FAILED: 'FAILED',                // 校验请求失败（API 超时/错误）
} as const
```

### 统计报告查询

```typescript
// users.service.ts
async getMigrationReport() {
  const stats = await this.prisma.user.groupBy({
    by: ['codeVerifyStatus'],
    _count: { id: true },
  })

  const total = await this.prisma.user.count()

  return {
    total,
    verified: stats.find(s => s.codeVerifyStatus === 'VERIFIED')?._count.id || 0,
    pendingVerify: stats.find(s => s.codeVerifyStatus === 'PENDING_VERIFY')?._count.id || 0,
    invalid: stats.find(s => s.codeVerifyStatus === 'INVALID')?._count.id || 0,
    failed: stats.find(s => s.codeVerifyStatus === 'FAILED')?._count.id || 0,
  }
}
```

### 关键约束

- **批量限速**：≤100 条/批，间隔 1 秒（FR48）
- **无效记录不自动删除**：INVALID 状态仅标记，管理员决策

### 前序 Story 依赖

- **Story 5.1**（`PENDING_VERIFY` 记录已入库）
- **Story 4.2**（YoubaoApiService 已有 `validateCode()`）
- **Story 1.4**（`batch-audit` BullMQ 队列）

### Project Structure Notes

- FR48 补校验规格：[Source: epics.md#FR48 补校验批次规格]
- NFR19 迁移验证报告：[Source: architecture.md#NFR19]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- Mock：`migrationReverify.ts`；种子用户 id=3 `INVALID`、id=5 `FAILED` 便于验收列表与报告。
- 用户列表/详情/编辑抽屉展示四态编码校验；右豹同步仅在 `VERIFIED` 时可点。
- 「保留」→ `PATCH` `invalidRetained: true`；「修正编码」→ 新编码 + `PENDING_VERIFY`。

### File List

- `frontend/src/mock/migrationReverify.ts`
- `frontend/src/mock/users.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/types/migrationReverify.ts`
- `frontend/src/types/user.ts`
- `frontend/src/api/migrationReverify.ts`
- `frontend/src/views/migration/MigrationReverifyTab.vue`
- `frontend/src/views/migration/MigrationHubView.vue`
- `frontend/src/views/users/UserList.vue`
- `frontend/src/views/users/UserDetailView.vue`
- `frontend/src/views/users/UserEditDrawer.vue`
- `frontend/src/utils/permission.ts`
- `frontend/src/mock/auth.ts`
- `frontend/src/mock/roles.ts`

### Change Log

- 2026-04-07：完成 Step 32 纯前端交付（补校验 Mock + 验证报告 UI + INVALID 处置）。
