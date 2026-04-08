# Story 6.1：微信服务号 API 集成与通知发送基础设施

Status: ready-for-dev

## Story

作为**系统（后端服务）**，
我希望有稳定的微信服务号消息推送基础设施，通知发送异步解耦，
以便审核结果推送不阻塞审核操作本身，失败时有完整记录（满足 NFR13、ARCH7）。

## Acceptance Criteria

1. **Given** 微信服务号 API 配置（`WECHAT_APP_ID`、`WECHAT_APP_SECRET`）就位  
   **When** 系统启动  
   **Then** 微信 API 客户端成功初始化，access_token 可正常获取和自动刷新（TTL < 7200s 时自动刷新）

2. **Given** 审核操作完成后触发通知  
   **When** 业务逻辑调用 `NotificationService.send()`  
   **Then** 通知任务加入 BullMQ `notification-send` 队列立即返回，不同步等待（满足 NFR13）

3. **Given** BullMQ Worker 处理并推送成功  
   **When** 完成  
   **Then** `notifications` 表记录：`userId`、`scenario`、`status: 'SENT'`、`sentAt`

4. **Given** 用户未绑定 OpenID（`users.wxOpenId = null`）  
   **When** Worker 处理  
   **Then** 任务标记 `status: 'FAILED'`、`failureReason: '用户未绑定OpenID'`，不重试，不进入失败队列重试

5. **Given** 微信 API 推送失败（网络超时等）  
   **When** Worker 处理  
   **Then** BullMQ 自动重试 3 次（指数退避：2s, 4s, 8s），3 次均失败后最终 `status: 'FAILED'`

## Tasks / Subtasks

- [ ] Task 1: 创建 WechatApiModule (AC: #1)
  - [ ] 创建 `backend/src/modules/external-apis/wechat/wechat-api.module.ts`
  - [ ] 创建 `backend/src/modules/external-apis/wechat/wechat-api.service.ts`
  - [ ] 实现 access_token 获取和 Redis 缓存（key: `wechat:access_token`，TTL 7000s 安全余量）
  - [ ] 实现 `sendTemplateMessage(openId, templateId, data)` 方法

- [ ] Task 2: 创建 NotificationsModule (AC: #2, #3, #4, #5)
  - [ ] 创建 `backend/src/modules/notifications/notifications.module.ts`
  - [ ] 创建 `backend/src/modules/notifications/notifications.service.ts`
  - [ ] 实现 `send(params)` → 创建 `notifications` 记录（`status: 'PENDING'`）→ 入队
  - [ ] 创建 `backend/src/modules/notifications/notifications.processor.ts`

- [ ] Task 3: 实现通知 Processor (AC: #3, #4, #5)
  - [ ] 读取 `notifications` 记录（`userId`、`scenario`）
  - [ ] 查询 `users.wxOpenId`（内部查询，不通过 API 响应暴露）
  - [ ] 未绑定 OpenID → `status: 'FAILED'`，`failureReason: '用户未绑定OpenID'`，不重试
  - [ ] 调用 `WechatApiService.sendTemplateMessage()`
  - [ ] 成功 → `status: 'SENT'`，`sentAt: new Date()`
  - [ ] 失败 → BullMQ 重试配置（`attempts: 3, backoff: { type: 'exponential', delay: 2000 }`）

## Dev Notes

### 微信 Access Token 缓存

```typescript
// wechat-api.service.ts
async getAccessToken(): Promise<string> {
  const cached = await this.redis.get('wechat:access_token')
  if (cached) return cached

  const response = await firstValueFrom(
    this.httpService.get(`https://api.weixin.qq.com/cgi-bin/token`, {
      params: { grant_type: 'client_credential', appid: this.wechatAppId, secret: this.wechatAppSecret },
    })
  )

  const { access_token, expires_in } = response.data
  await this.redis.setex('wechat:access_token', expires_in - 200, access_token)  // 提前200秒刷新
  return access_token
}
```

### BullMQ 重试配置

```typescript
await this.notificationQueue.add('send', { notificationId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,  // 保留失败 job 供调试
})
```

### OpenID 查询（内部使用，不通过 API 暴露）

```typescript
// 仅在 Processor 内部查询，不在任何 API 响应中返回
const user = await this.prisma.user.findUnique({
  where: { id: notif.userId },
  select: { wxOpenId: true },  // 仅在此处允许查询 wxOpenId
})
```

### 关键架构规范（不可偏离）

1. **异步通知，不阻塞审核操作**（NFR13）
2. **未绑定 OpenID 不重试**：直接标记 FAILED，不进入 BullMQ 重试循环
3. **wxOpenId 只在 Processor 内部查询**：不通过任何 API 接口暴露（NFR8）
4. **Access Token Redis 缓存**：TTL = `expires_in - 200`，防止过期

### 前序 Story 依赖

- **Story 1.3**（`notifications` 表）
- **Story 1.4**（`notification-send` BullMQ 队列）

### Project Structure Notes

- 微信服务号API规范：[Source: architecture.md#微信服务号API]
- NFR13 异步解耦：[Source: architecture.md#NFR13]
- Notification 数据模型：[Source: architecture.md#数据模型设计 Notification]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
