# Story 7.1：飞书 API 集成与入群申请自动同步

Status: ready-for-dev

## Story

作为**系统（后端服务）**，
我希望通过飞书 API 自动拉取群入群申请并生成审核记录，
以便审核员无需手动查看飞书群，申请自动出现在工作台（满足 FR14、FR19）。

## Acceptance Criteria

1. **Given** 飞书 API 配置就位  
   **When** 每 5 分钟定时任务（`*/5 * * * *`）触发  
   **Then** 拉取新入群申请，未存在于 `group_audits` 的申请自动创建记录（`status: 'PENDING'`），SLA 计时从飞书申请提交时间开始

2. **Given** 飞书 Webhook 回调到达 `POST /api/v1/lark/webhook`  
   **When** 系统收到推送  
   **Then** 即时创建/更新 `group_audits` 记录

3. **Given** Webhook 请求  
   **When** 验证 `X-Lark-Signature` 签名（LARK_WEBHOOK_TOKEN）  
   **Then** 验证失败 → HTTP 403 丢弃；通过 → 正常处理

4. **Given** 审核操作完成后 30 分钟内未收到飞书状态回调  
   **When** 补偿性轮询任务触发  
   **Then** 主动查询飞书端最新状态并更新本地记录（满足 FR19 补偿轮询）

## Tasks / Subtasks

- [ ] Task 1: 创建 LarkApiModule (AC: #1, #2, #3, #4)
  - [ ] 创建 `backend/src/modules/external-apis/lark/lark-api.module.ts`
  - [ ] 实现 `LarkApiService`：access_token 获取/缓存（Redis `lark:access_token`，TTL 7000s）
  - [ ] 实现 `getGroupJoinRequests()` → 拉取待审核入群申请列表
  - [ ] 实现 `approveGroupJoin(requestId)` → 批准入群
  - [ ] 实现 `rejectGroupJoin(requestId, reason)` → 拒绝入群

- [ ] Task 2: 创建 GroupAuditsModule 基础 (AC: #1)
  - [ ] 创建 `backend/src/modules/group-audits/group-audits.module.ts`
  - [ ] 创建 `backend/src/modules/group-audits/group-audits.service.ts`
  - [ ] 实现 `syncFromLark()` → 幂等同步（通过飞书申请ID判重）

- [ ] Task 3: 定时轮询任务 (AC: #1)
  - [ ] `@Cron('*/5 * * * *')` 触发 `syncFromLark()`
  - [ ] 日志记录：`[Cron] 飞书入群申请同步开始`

- [ ] Task 4: Webhook 接收端点 (AC: #2, #3)
  - [ ] `POST /api/v1/lark/webhook`（公开端点，不需要 JWT 认证）
  - [ ] Webhook Token 验证（HMAC-SHA256 签名）
  - [ ] 处理入群申请事件，调用 `syncFromLark()`

- [ ] Task 5: 补偿性轮询（30分钟超时检查）(AC: #4)
  - [ ] 审核操作完成时，延迟 30 分钟入队 `lark-audit-sync` BullMQ job
  - [ ] Job 处理：检查当前状态，若未收到 Webhook → 主动查询飞书

## Dev Notes

### 飞书 API Access Token

```typescript
// lark-api.service.ts
async getAccessToken(): Promise<string> {
  const cached = await this.redis.get('lark:access_token')
  if (cached) return cached

  const response = await firstValueFrom(
    this.httpService.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: this.larkAppId,
      app_secret: this.larkAppSecret,
    })
  )
  const { tenant_access_token, expire } = response.data
  await this.redis.setex('lark:access_token', expire - 200, tenant_access_token)
  return tenant_access_token
}
```

### Webhook 签名验证

```typescript
// 飞书 Webhook 签名验证
const signature = request.headers['x-lark-signature']
const timestamp = request.headers['x-lark-request-timestamp']
const body = JSON.stringify(request.body)

const computedSig = crypto
  .createHmac('sha256', this.webhookToken)
  .update(timestamp + body)
  .digest('hex')

if (computedSig !== signature) throw new ForbiddenException()
```

### SLA 截止时间计算

```typescript
// 飞书 API 返回的 apply_time（Unix 时间戳）
const applyTime = new Date(larkRequest.apply_time * 1000)
// SLA 截止 = 申请时间所在日 + 3 天 23:59:59（UTC+8）
// 前端用 dayjs + timezone 计算展示，后端存储原始 applyTime
```

### 幂等同步关键

```typescript
// 使用飞书申请 ID 判重（需在 group_audits 表添加 lark_request_id 唯一索引）
await this.prisma.groupAudit.upsert({
  where: { larkRequestId: request.id },  // 需在 schema 添加此字段
  update: { /* 状态更新 */ },
  create: { /* 新建记录 */ },
})
```

**重要**：需要在 `schema.prisma` 的 `GroupAudit` 模型添加 `larkRequestId` 字段（Story 1.3 未包含，需在此 Story 中补充迁移）：
```prisma
larkRequestId String? @unique @map("lark_request_id") @db.VarChar(100)
```

### 关键架构规范（不可偏离）

1. **双通道同步**：5分钟轮询 + Webhook 实时回调，两者均需幂等
2. **飞书 API 降级**：不可用时设置 Redis `lark:api:status = 'UNAVAILABLE'`，前端读取展示 ApiStatusBar
3. **Webhook 端点免 JWT 鉴权**：飞书服务器直接推送，无法携带 JWT Token
4. **SLA 起点**：API 同步时 = 飞书申请提交时间；手动导入时 = 系统导入时间（Story 7.5 实现）

### 前序 Story 依赖

- **Story 1.3**（`group_audits` 表）
- **Story 1.4**（`lark-audit-sync` BullMQ 队列、`@nestjs/schedule`）

### Project Structure Notes

- 飞书 API 集成规范：[Source: architecture.md#飞书API]
- FR14 自动同步规格：[Source: epics.md#FR14]
- FR19 状态同步三通道：[Source: epics.md#FR19]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
