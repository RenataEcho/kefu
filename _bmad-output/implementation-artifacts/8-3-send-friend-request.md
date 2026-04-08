# Story 8.3：以指定身份发起飞书好友申请

Status: review

## Story

作为**客服/专属顾问/管理员**，
我希望选择特定已授权的客服或导师身份，向目标用户发起飞书好友申请（满足 FR30）。

## Acceptance Criteria

1. **Given** 点击「发起好友申请」  
   **When** 触发  
   **Then** 弹出面板，展示已完成 OAuth 授权的客服/导师列表供选择

2. **Given** 选择授权账号并确认  
   **When** 操作  
   **Then** 以所选账号 OAuth Token 调用飞书 API 发起申请；`lark_friend_requests` 创建，`status: 'PENDING'`

3. **Given** OAuth Token 已过期  
   **When** 尝试发起  
   **Then** 提示「该账号飞书授权已过期，请重新授权」

4. **Given** 飞书 API 失败  
   **When** 返回错误  
   **Then** Toast 具体原因；`lark_friend_requests.status = 'FAILED'`（新增）

## Tasks / Subtasks

- [ ] Task 1: 发起好友申请 API (AC: #2, #3, #4)
  - [ ] `POST /api/v1/lark-friends/send-request`（`{ userId, operatorType, operatorId }`）
  - [ ] 读取 `agents/mentors.larkAccessToken`，检查是否过期
  - [ ] 调用飞书 API（以该 Token 身份）
  - [ ] 创建 `lark_friend_requests` 记录

- [ ] Task 2: 获取已授权账号列表 (AC: #1)
  - [ ] `GET /api/v1/agents?authorized=true`：返回 `larkTokenExpiresAt` 未过期的客服
  - [ ] `GET /api/v1/mentors?authorized=true`：同上导师

- [ ] Task 3: 前端申请发起弹窗 (AC: #1, #2, #3)
  - [ ] `NModal` 弹窗，`NSelect` 选择已授权账号
  - [ ] 过期账号显示但标注「已过期」，不可选

## Dev Notes

### Token 过期检查

```typescript
if (!agent.larkTokenExpiresAt || dayjs().isAfter(agent.larkTokenExpiresAt)) {
  throw new BadRequestException({ code: 30002, message: '该账号飞书授权已过期，请重新授权' })
}
```

### 前序 Story 依赖

- **Story 8.2**（OAuth Token 已存储）

### Project Structure Notes

- FR30 指定身份申请：[Source: epics.md#FR30]
- LarkFriendRequest 数据模型：[Source: architecture.md#数据模型设计 LarkFriendRequest]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **纯前端 / Mock（Step 25）**：`GET /lark-friends/authorized-operators`；`POST /lark-friends/send-request`（过期账号 30002、随机失败 30003）；`NModal` + `NSelect` 分组选择；`GET /cs-agents`、`/mentors` 支持 `authorized=true` 筛选（用于扩展）。

### File List

- `frontend/src/views/LarkFriendsView.vue`
- `frontend/src/mock/larkFriends.ts`
- `frontend/src/mock/csAgents.ts`
- `frontend/src/mock/mentors.ts`
- `frontend/src/api/larkFriends.ts`
- `frontend/src/api/csAgents.ts`
- `frontend/src/api/mentors.ts`
- `frontend/src/types/larkFriends.ts`
- `frontend/src/types/csAgent.ts`
- `frontend/src/types/mentor.ts`
