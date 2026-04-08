# Story 4.7：用户主档与付费记录数据导出

Status: review

## Story

作为**超级管理员**，
我希望能够将用户主档和付费记录按当前筛选条件导出为 Excel，
以便进行离线分析或与其他系统对接。

## Acceptance Criteria

1. **Given** 管理员在用户主档列表已设置筛选条件  
   **When** 点击「导出」按钮  
   **Then** 系统异步生成 Excel 文件；导出内容与当前筛选结果一致；**不包含** `微信OpenID` 字段（满足 NFR8）

2. **Given** 管理员在付费记录列表  
   **When** 点击「导出」  
   **Then** 异步生成付费记录 Excel，包含付费金额等字段（管理员权限完整字段）

3. **Given** Excel 文件生成完成  
   **When** 前端轮询到完成状态  
   **Then** 提供下载链接，有效期 24 小时（满足 PRD 补充决策记录）

4. **Given** 普通客服在用户主档列表  
   **When** 查看操作区域  
   **Then** 导出按钮不存在（需 `users:export` 操作权限，`v-if` 控制）

## Tasks / Subtasks

- [ ] Task 1: 实现用户主档导出 API (AC: #1, #3)
  - [ ] `POST /api/v1/users/export`（需 `users:export` 权限）
  - [ ] 接收与列表筛选相同的查询参数（`keyword`、`agentId`、`schoolId`、`codeVerifyStatus`、`isPaid`）
  - [ ] 入队 `file-export-generate` BullMQ job，返回 `{ exportId }`
  - [ ] 导出字段：右豹编码、右豹ID、飞书ID、飞书手机号、飞书昵称、所属客服、所属导师、所属门派、编码校验状态、付费状态、录入时间（**不含 wxOpenId**）

- [ ] Task 2: 实现付费记录导出 API (AC: #2, #3)
  - [ ] `POST /api/v1/payments/export`（需 `payments:export` 或管理员权限）
  - [ ] 同样异步入队，返回 `{ exportId }`

- [ ] Task 3: 实现导出 BullMQ Processor (AC: #1, #2, #3)
  - [ ] `@Process('export')` 处理 job
  - [ ] 查询数据（不分页，全量查询筛选结果）
  - [ ] 使用 `exceljs` 生成 Excel
  - [ ] 存储到 `uploads/exports/{exportId}.xlsx`
  - [ ] 在内存/数据库标记导出完成，记录文件 URL 和 24 小时过期时间

- [ ] Task 4: 导出状态查询和文件清理 (AC: #3)
  - [ ] `GET /api/v1/exports/:exportId`（轮询状态）→ `{ status, downloadUrl, expiresAt }`
  - [ ] `@Cron('0 0 * * *')` 每日清理超过 24 小时的导出文件（`fs.unlink`）

- [ ] Task 5: 前端导出入口 (AC: #1, #2, #4)
  - [ ] 在 `UserList.vue` 和 `PaymentList.vue` 添加「导出」按钮（`v-if` 权限控制）
  - [ ] 点击 → 轮询 `exportId` 状态 → 完成后显示「点击下载」链接

## Dev Notes

### 导出状态追踪（简单实现）

使用 Redis 存储导出状态（不需要额外数据库表）：

```typescript
// 存储导出任务状态
const exportKey = `export:${exportId}`
await redis.setex(exportKey, 24 * 3600, JSON.stringify({ status: 'processing', downloadUrl: null }))

// 完成时更新
await redis.setex(exportKey, 24 * 3600, JSON.stringify({ status: 'done', downloadUrl: `/uploads/exports/${exportId}.xlsx` }))
```

### 用户导出字段（严格排除 wxOpenId）

```typescript
const users = await this.prisma.user.findMany({
  where,
  select: {
    rightLeopardCode: true,
    rightLeopardId: true,
    larkId: true,
    larkPhone: true,
    larkNickname: true,
    codeVerifyStatus: true,
    createdAt: true,
    agent: { select: { name: true } },
    mentor: { select: { name: true } },
    school: { select: { name: true } },
    _count: { select: { paymentRecords: true } },
    // wxOpenId: 不在 select → 永远不会出现在导出文件中（NFR8）
  },
})
```

### 导出 UUID 生成

```typescript
import { randomUUID } from 'crypto'
const exportId = randomUUID()
```

### 关键架构规范（不可偏离）

1. **导出文件不含 wxOpenId**：Prisma select 严格控制（NFR8）
2. **导出异步进行**：BullMQ job，不阻塞请求（NFR4）
3. **导出链接 24 小时有效**：Redis 过期 + 定时文件清理
4. **导出权限 `users:export` 控制**：前端 `v-if` + 后端 `@RequirePermission`

### 前序 Story 依赖

- **Story 4.1**（用户列表筛选逻辑可复用）
- **Story 1.4**（`file-export-generate` BullMQ 队列）

### Project Structure Notes

- NFR8 wxOpenId 不暴露：[Source: architecture.md#需求概览 NFR8]
- 导出文件链接保留24小时：[Source: epics.md#FR48 导出功能]

### 纯前端 / Mock 落地说明（本仓库）

| 项 | 说明 |
|----|------|
| 任务 API | `POST /api/v1/users/export`、`POST /api/v1/payments/export` → `{ exportId }`；body 与列表筛选一致（无分页） |
| 轮询 | `GET /api/v1/exports/:exportId` → `processing` \| `completed`（含 `fileName`、`expiresAt`、`downloadUrl`、`sheet`）\| `failed` |
| 异步 | `frontend/src/mock/exportJobsStore.ts` + `setTimeout` ~720ms 写入完成态 |
| 文件 | Mock 不返回真实二进制流；浏览器用 `sheet.headers` + `sheet.rows` 调 `xlsx` 生成文件（`utils/dataExportXlsx.ts`） |
| 交互 | `composables/useAsyncDataExport.ts` 轮询 + Toast；列表 `total > 1000` 时 §1.9 长耗时提示 |
| 权限 | `users:export`、`payments:export`；`UserList` / `PaymentList`（仅「付费记录」Tab）`v-if` |

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
