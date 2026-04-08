# Story 8.5：需人工决策分区处理

Status: review

## Story

作为**客服/专属顾问/管理员**，
我希望被拒绝的好友申请有专门的分区展示，可以选择重新申请或放弃（满足 FR28 被拒处理）。

## Acceptance Criteria

1. **Given** 「需人工决策」分区有被拒记录  
   **When** 页面加载  
   **Then** 展示被拒记录：用户信息、原申请时间、拒绝时间；分区标题显示数量

2. **Given** 点击「重新申请」  
   **When** 二次确认后  
   **Then** 执行与 Story 8.3 相同的申请发起流程

3. **Given** 点击「标记放弃」  
   **When** 确认  
   **Then** `status → 'ABANDONED'`，记录从决策分区移出

4. **Given** 数量为 0  
   **When** 渲染  
   **Then** 分区折叠隐藏

## Tasks / Subtasks

- [x] Task 1: 标记放弃 API (AC: #3)
  - [x] `POST /api/v1/lark-friends/:userId/abandon`（Mock，保留 body 版 abandon 兼容）
  - [x] `abandoned` 标记后移出决策区

- [x] Task 2: 「需人工决策」数据查询 API (AC: #1)
  - [x] `GET /api/v1/lark-friends/decision-required`
  - [x] 返回 `REJECTED` 行；`LarkFriendsView` 与 `priority-list` 并行加载

- [x] Task 3: 前端决策分区 (AC: #1, #2, #3, #4)
  - [x] `LarkFriendsView` 底部 `n-collapse`「需人工决策（N）」
  - [x] 「重新申请」确认 Modal + `reapply` + 打开发起弹窗
  - [x] 「标记放弃」无确认（对齐原型 §2.5）；数量为 0 整区隐藏

## Dev Notes

### 前序 Story 依赖

- **Story 8.3**（申请发起逻辑）
- **Story 8.4**（REJECTED 状态数据）

### Project Structure Notes

- FR28 被拒处理流程：[Source: epics.md#FR28]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 与 8.4 同一批交付：`LarkFriendsView` 内含决策区与放弃、重新申请流程。

### File List

- `frontend/src/views/LarkFriendsView.vue`
- `frontend/src/mock/larkFriends.ts`
- `frontend/src/api/larkFriends.ts`
