# Story 4.4：右豹动作数据同步

Status: review

## Story

作为**客服/管理员**，
我希望系统自动同步用户的右豹动作数据（关键词数、订单数、项目收益），并标注同步状态，
以便审核或查看用户详情时无需切换到右豹 APP（满足 FR12）。

## Acceptance Criteria

1. **Given** `@nestjs/schedule` 每小时定时任务（`0 * * * *`）  
   **When** 任务触发  
   **Then** 批量异步同步所有 `VERIFIED` 状态用户的右豹动作数据，写入 `youbao_user_stats` 表和 Redis 缓存（`user:actions:{code}`，TTL 3600s）；过程不阻塞前端（满足 NFR4）

2. **Given** 新用户刚完成录入  
   **When** 用户详情页加载动作数据区域  
   **Then** 显示"同步中..."loading 状态（`syncStatus = 'SYNCING'`），后台 BullMQ 异步拉取数据

3. **Given** 右豹 APP API 正常  
   **When** 用户详情页展示动作数据  
   **Then** 显示总关键词数、总订单数、项目收益，标注"最后同步时间：{datetime}"

4. **Given** 右豹 APP API 不可用  
   **When** 用户详情页加载  
   **Then** 展示 Redis 缓存数据 + "缓存数据"标注；`ApiStatusBar` 显示降级提示

5. **Given** 管理员点击「手动同步」按钮  
   **When** 触发操作  
   **Then** 立即入队 `youbao-data-sync` 异步同步该用户（不阻塞，NFR4），返回 `{ status: 'queued' }`

## 纯前端交付说明（本仓库）

后端 Cron/BullMQ/Redis 未实现；AC 在 **`vite-plugin-mock` + 用户详情页** 上语义对齐：

- **AC#2**：`codeVerifyStatus === 'PENDING_VERIFY'` 时 `youbao.state === 'syncing'`，指标区 `n-spin`，文案「后台任务拉取中…（Mock）」。
- **AC#3**：展示三项指标 + **最后同步时间**（绝对时间 + 相对时间）。
- **AC#4**：`POST /api/v1/dev/youbao-degraded` body `{ "degraded": true|false }` 切换全局模拟降级；`GET /users/:id` 返回 `youbaoDegraded`，详情页同步 `appStore.setYoubaoApiDegraded`，并渲染 **`ApiStatusBar`**；动作数据为 **`cached`** 态与「缓存数据」标注。
- **AC#5**：`POST /users/:id/sync-youbao` 返回 **`{ status: 'queued' }`**（内存中已更新 stats，前端延迟 `GET` 模拟队列完成）；降级或待验证时返回业务错误码；按钮需 **`users:update`**。

## Tasks / Subtasks

- [x] Task 1–2: 后端 YoubaoSyncService / Processor — **本仓库跳过**（Mock + 前端状态代替）
- [x] Task 3: 手动同步 API — **Mock**：`POST /api/v1/users/:id/sync-youbao`，`queued` 语义 + 错误分支
- [x] Task 4: 用户详情动作数据 — **`UserDetailView.vue`** + `youbaoFlags` + `dev/youbao-degraded`

## Dev Agent Record

### Completion Notes List

- `frontend/src/mock/youbaoFlags.ts`：`isYoubaoApiSimulatedDown` / `setSimulateYoubaoApiDown`
- `frontend/src/mock/dev.ts`：`POST /api/v1/dev/youbao-degraded`
- `frontend/src/mock/users.ts`：`ensureYoubao` 分支（待验证 / 降级 / 已验证）、`toDetailPayload.youbaoDegraded`、`sync-youbao` 响应
- `frontend/src/types/user.ts`：`UserDetail.youbaoDegraded`、`SyncYoubaoQueuedResponse`
- `frontend/src/api/users.ts`：`syncUserYoubao` 返回类型
- `frontend/src/views/users/UserDetailView.vue`：`ApiStatusBar`、右豹区块、入队后刷新、`users:update` 门控

### File List

（见 Completion Notes）

### Change Log

- 2026-04-07: Step 7 纯前端对齐 Story 4-4 AC#2–#5，状态 `review`
