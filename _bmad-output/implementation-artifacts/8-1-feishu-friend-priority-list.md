# Story 8.1：飞书好友优先级列表

Status: review

## Story

作为**客服/专属顾问/管理员**，
我希望查看待入群和审核中用户的优先级排序列表，分组清晰，
以便按系统推荐的优先级顺序处理好友申请，无需人工判断顺序（满足 FR28）。

## Acceptance Criteria

1. **Given** 操作人进入「飞书好友管理」页面  
   **When** 页面加载  
   **Then** 列表按三级排序规则展示：①待入群 > 审核中；②近10天动作数降序；③好友申请时效越早越靠前；顶部分组分隔线区分「待入群（X人）」和「审核中（X人）」

2. **Given** 好友申请 7 自然日无响应  
   **When** 每日凌晨定时任务检查  
   **Then** 申请状态 → `TIMEOUT`；主视图默认隐藏超时记录

3. **Given** 好友申请被拒绝  
   **When** 飞书 API 回调  
   **Then** 记录移出主列表，进入「需人工决策」分区（`REJECTED` 状态）

4. **Given** 「需人工决策」分区  
   **When** 有被拒记录  
   **Then** 可执行：重新申请（二次确认）或标记放弃

## Tasks / Subtasks

- [ ] Task 1: 飞书好友优先级列表 API (AC: #1, #2, #3)
  - [ ] `GET /api/v1/lark-friends/priority-list`：返回排序后的用户列表
  - [ ] 数据来源：`group_audits`（`APPROVED` 且好友状态非 `ACCEPTED`）+ 审核中（`PENDING`/`PROCESSING`）
  - [ ] 关联 `lark_friend_requests` 最新状态
  - [ ] 关联 `youbao_user_stats.keywordCount`（动作数）
  - [ ] 排序逻辑：前端或后端实现三级排序

- [ ] Task 2: 7日超时定时任务 (AC: #2)
  - [ ] `@Cron('0 0 * * *')` 每日凌晨
  - [ ] 查询 `status = 'PENDING'` 且 `requestedAt < 7天前` 的 `lark_friend_requests`
  - [ ] 更新 `status = 'TIMEOUT'`

- [ ] Task 3: 前端飞书好友管理页 (AC: #1, #2, #3, #4)
  - [ ] 创建 `frontend/src/views/lark-friends/LarkFriendList.vue`
  - [ ] 分组展示：`NDataTable` 内用分组线区分「待入群」和「审核中」
  - [ ] 「需人工决策」分区（折叠组件，数量为 0 时隐藏）
  - [ ] 默认隐藏 `TIMEOUT` 状态记录，「显示超时」切换按钮

## Dev Notes

### 优先级排序逻辑

```typescript
// 后端排序：
// 1. 分组排序：APPROVED（待入群）= 0，PENDING/PROCESSING（审核中）= 1
// 2. 动作数降序（youbaoUserStats.keywordCount）
// 3. 审核/申请时间升序（时效最早优先）
.sort((a, b) => {
  if (a.group !== b.group) return a.group - b.group
  if (b.keywordCount !== a.keywordCount) return b.keywordCount - a.keywordCount
  return new Date(a.applyTime).getTime() - new Date(b.applyTime).getTime()
})
```

### 前序 Story 依赖

- **Story 7.1**（`group_audits` 数据）
- **Story 4.4**（`youbao_user_stats` 动作数）

### Project Structure Notes

- FR28 优先级排序规则：[Source: epics.md#FR28]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **纯前端 / Mock（Step 23）**：`GET /lark-friends/priority-list` 三级排序 + 「待入群 / 审核中」分组标题；默认隐藏 `TIMEOUT`（开关「显示超时」）；「需人工决策」折叠区 + 重新申请 / 标记放弃 Mock；标记已添加、刷新。

### File List

- `frontend/src/mock/larkFriends.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/types/larkFriends.ts`
- `frontend/src/api/larkFriends.ts`
- `frontend/src/views/LarkFriendsView.vue`
