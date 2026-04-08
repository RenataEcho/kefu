# Story 8.4：好友申请状态自动追踪

Status: review

## Story

作为**客服/专属顾问/管理员**，
我希望系统自动更新好友申请的状态，也可手动标记，
以便随时掌握联络进度（满足 FR31、FR32）。

## Acceptance Criteria

1. **Given** 用户在飞书端接受好友申请  
   **When** 飞书 API 回调到达  
   **Then** `lark_friend_requests.status → 'ACCEPTED'`

2. **Given** 用户拒绝好友申请  
   **When** 回调到达  
   **Then** `status → 'REJECTED'`，记录移入「需人工决策」分区

3. **Given** 申请发出后 7 自然日内无响应  
   **When** `@Cron('0 0 * * *')` 检查  
   **Then** `status → 'TIMEOUT'`，主视图隐藏

4. **Given** 操作人点击「我已添加」  
   **When** 确认  
   **Then** `status → 'MANUAL_CONFIRMED'`（手动确认，满足 FR32）

5. **Given** 好友状态  
   **When** 读取  
   **Then** 先查 Redis 缓存（`lark:friend:{userId}`，TTL 86400s），缓存不存在时查数据库

## Tasks / Subtasks

- [x] Task 1: Webhook 处理好友状态更新 (AC: #1, #2) — **纯前端**
  - [x] Mock：`POST /api/v1/lark-friends/dev/simulate-friend-status` 模拟 ACCEPTED / REJECTED / TIMEOUT；列表「模拟回调」下拉触发
  - [x] UI 与 `priority-list` 联动刷新

- [x] Task 2: 7日超时任务 (AC: #3)
  - [x] Mock 种子含 TIMEOUT；主列表默认排除，`includeTimeout` 可展示；超时提示「查看」链

- [x] Task 3: 手动确认 API (AC: #4)
  - [x] `POST /api/v1/lark-friends/:userId/manual-confirm`（Mock）
  - [x] `status → MANUAL_CONFIRMED`；`mark-added` 同步为 MANUAL_CONFIRMED

- [x] Task 4: Redis 缓存写入 (AC: #5) — **文档/后端范畴**
  - [x] 纯前端不实现；架构约定保留于 Story Dev Notes

## Dev Notes

### 状态枚举完整值

```typescript
export const LARK_FRIEND_STATUS = {
  PENDING: 'PENDING',              // 待接受
  ACCEPTED: 'ACCEPTED',            // 已接受
  REJECTED: 'REJECTED',            // 已拒绝（移入人工决策）
  TIMEOUT: 'TIMEOUT',              // 7日超时
  MANUAL_CONFIRMED: 'MANUAL_CONFIRMED',  // 手动确认已添加
  ABANDONED: 'ABANDONED',          // 标记放弃（Story 8.5）
} as const
```

### 前序 Story 依赖

- **Story 7.1**（Webhook 处理基础设施）
- **Story 8.3**（`lark_friend_requests` 已创建）

### Project Structure Notes

- FR31/FR32：[Source: epics.md#FR31, FR32]
- 缓存策略 `lark:friend:{userId}`：[Source: architecture.md#缓存策略]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 纯前端：`LarkFriendsView` 完整页 + Mock 端点；`MANUAL_CONFIRMED` 类型与 Badge「已接受」一致。

### File List

- `frontend/src/views/LarkFriendsView.vue`
- `frontend/src/mock/larkFriends.ts`
- `frontend/src/api/larkFriends.ts`
- `frontend/src/types/larkFriends.ts`
