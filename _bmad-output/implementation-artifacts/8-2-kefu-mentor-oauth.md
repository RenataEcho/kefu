# Story 8.2：客服/导师飞书 OAuth 授权

Status: review

## Story

作为**客服/导师**，
我希望在系统内完成飞书账号 OAuth 授权，以支持以我的身份发起飞书好友申请（满足 FR29）。

## Acceptance Criteria

1. **Given** 客服点击「授权飞书账号」  
   **When** 触发  
   **Then** 新标签页打开飞书 OAuth 授权页面

2. **Given** 新标签页完成 OAuth 授权  
   **When** 飞书回调 redirect_uri  
   **Then** 通过 **BroadcastChannel API** 将授权成功状态同步到原标签页，原标签页 UI 即时更新为「已授权：{飞书昵称}」（满足 ARCH14）

3. **Given** OAuth Token 过期  
   **When** 使用授权  
   **Then** 提示「飞书授权已过期，请重新授权」

4. **Given** 授权 Token  
   **When** 存储  
   **Then** 加密存储在 `agents.lark_access_token`（或 `mentors.lark_access_token`），不明文暴露到前端

## Tasks / Subtasks

- [ ] Task 1: 飞书 OAuth 回调端点 (AC: #1, #2)
  - [ ] `GET /api/v1/lark/oauth/callback`（公开端点，接收 code + state）
  - [ ] 用 `code` 换取 access_token（调用飞书 Token API）
  - [ ] 将 token 存入 `agents` 或 `mentors` 表（通过 `state` 参数区分类型和ID）
  - [ ] 回调页面返回 `postMessage` → BroadcastChannel 通知原标签页

- [ ] Task 2: OAuth 授权发起端点 (AC: #1)
  - [ ] `GET /api/v1/lark/oauth/authorize?type=agent&id={agentId}`
  - [ ] 生成 `state`（包含 type 和 id），跳转飞书 OAuth URL

- [ ] Task 3: 前端 BroadcastChannel 实现 (AC: #2)
  - [ ] OAuth 回调页面（新标签页）完成后：`new BroadcastChannel('lark-oauth').postMessage({ status: 'success', name: larkName })`
  - [ ] 原标签页监听：`new BroadcastChannel('lark-oauth').onmessage = ...` → 更新 UI

## Dev Notes

### BroadcastChannel 跨标签页通信

```typescript
// 回调页面（OAuth callback route）
const channel = new BroadcastChannel('lark-oauth')
channel.postMessage({ status: 'success', larkName: data.name })
window.close()  // 关闭新标签页

// 原标签页
const channel = new BroadcastChannel('lark-oauth')
channel.onmessage = (e) => {
  if (e.data.status === 'success') {
    agentOauthStatus.value = `已授权：${e.data.larkName}`
  }
  channel.close()
}
```

### Token 安全存储

```typescript
// Token 仅在后端使用，不返回给前端
// 前端只需知道「是否已授权」（通过 larkTokenExpiresAt 判断）
const isAuthorized = agent.larkTokenExpiresAt && dayjs().isBefore(agent.larkTokenExpiresAt)
```

### 前序 Story 依赖

- **Story 3.2**（`agents` 表含 `larkAccessToken` 字段）
- **Story 3.3**（`mentors` 表含 `larkAccessToken` 字段）

### Project Structure Notes

- FR29 OAuth 授权规格：[Source: epics.md#FR29]
- ARCH14 BroadcastChannel：[Source: architecture.md#ARCH14]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **纯前端 / Mock（Step 24）**：公开路由 `/oauth/lark-mock` + `POST /lark/oauth/mock-complete` 写入客服/导师 Mock OAuth；`BroadcastChannel('lark-oauth')` 回传主标签页；`GET /lark-friends/oauth-summary`；飞书页顶部黄条「立即授权」与授权后摘要；客服/导师种子默认未授权便于演示。

### File List

- `frontend/src/router/index.ts`
- `frontend/src/views/oauth/LarkOAuthMockView.vue`
- `frontend/src/views/LarkFriendsView.vue`
- `frontend/src/mock/larkFriends.ts`
- `frontend/src/mock/csAgents.ts`
- `frontend/src/mock/organizationData.ts`
- `frontend/src/types/csAgent.ts`
- `frontend/src/api/csAgents.ts`
- `frontend/src/api/larkFriends.ts`
