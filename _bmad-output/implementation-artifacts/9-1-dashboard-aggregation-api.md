# Story 9.1：Dashboard 数据聚合接口与 Redis 缓存层

Status: review

## Story

作为**系统（后端服务）**，
我希望 Dashboard 所有聚合数据通过 Redis 缓存提供，写操作后主动失效，
以便 Dashboard 在缓存有效时 ≤ 2 秒加载完成（满足 NFR5、ARCH15）。

## Acceptance Criteria

1. **Given** 管理员请求全局 Dashboard 数据  
   **When** Redis 缓存命中（`dashboard:global:{dateRange}`，TTL 300s）  
   **Then** 直接返回缓存，响应时间 ≤ 2 秒（满足 NFR5）

2. **Given** 缓存未命中  
   **When** 数据库查询完成  
   **Then** 结果写入 Redis（TTL 300s），同时返回

3. **Given** 业务表写操作（用户录入、付费记录、入群审核）  
   **When** 写操作完成  
   **Then** 相关 Dashboard 缓存主动失效（`del dashboard:global:*` + `del dashboard:agent:{agentId}:*`）

4. **Given** 日期范围参数  
   **When** 请求  
   **Then** 支持 5 种：`current_month`、`last_month`、`current_quarter`、`last_quarter`、`custom`（`startDate`+`endDate`）

## Tasks / Subtasks

> **纯前端范围说明：** 后端 Nest/Redis 任务不实现；以下以 **类型 + Mock 文档化** 与 `DashboardView` 对齐为完成标准。

- [x] Task 1: 创建 DashboardModule (AC: #1, #2, #3, #4) — **跳过真实后端**
  - [x] `src/types/dashboard.ts` 文件头注释：五种 `dateRange`、缓存键、`TTL=300s`、写后失效语义

- [x] Task 2: 实现全局 Dashboard 聚合数据 API (AC: #1, #2, #4)
  - [x] Mock `GET /api/v1/dashboard/global` 已存在；`src/mock/dashboard.ts` 顶部注释对齐架构

- [x] Task 3: 实现客服个人 Dashboard API (AC: #3, #4)
  - [x] Mock `GET /api/v1/dashboard/agent` 与 `AgentPersonalDashboardData` 一致

- [x] Task 4: 实现转化漏斗数据 API
  - [x] 漏斗嵌入 global 响应 `funnel[]`（与页面 `ConversionFunnel` 一致）

- [x] Task 5: 写操作后缓存失效 (AC: #3) — **文档化**
  - [x] 在 `types/dashboard.ts` 注明真实后端失效策略；Mock 不模拟

## Dev Notes

### 日期范围解析

```typescript
// dashboard.service.ts
export function resolveDateRange(dateRange: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = dayjs().tz('Asia/Shanghai')
  switch (dateRange) {
    case 'current_month':  return { start: now.startOf('month').toDate(), end: now.endOf('month').toDate() }
    case 'last_month':     return { start: now.subtract(1, 'month').startOf('month').toDate(), end: now.subtract(1, 'month').endOf('month').toDate() }
    case 'current_quarter':return { start: now.startOf('quarter').toDate(), end: now.endOf('quarter').toDate() }
    case 'last_quarter':   return { start: now.subtract(1, 'quarter').startOf('quarter').toDate(), end: now.subtract(1, 'quarter').endOf('quarter').toDate() }
    case 'custom':         return { start: new Date(startDate!), end: new Date(endDate!) }
    default:               return { start: now.startOf('month').toDate(), end: now.endOf('month').toDate() }
  }
}
```

### 缓存策略

```typescript
// 读缓存
const cacheKey = `dashboard:global:${dateRange}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// 查数据库
const data = await this.aggregateGlobalDashboard(dateRange)

// 写缓存
await redis.setex(cacheKey, 300, JSON.stringify(data))
return data
```

### 转化漏斗统计口径

```typescript
// 以"所选时间范围内新增量"为口径（FR42）
const [userCount, auditApprovedCount, paymentCount] = await Promise.all([
  prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
  prisma.groupAudit.count({ where: { status: 'APPROVED', processedAt: { gte: start, lte: end } } }),
  prisma.paymentRecord.count({ where: { createdAt: { gte: start, lte: end } } }),
])
```

### 关键架构规范

1. **缓存 TTL = 300s**（5分钟，满足 NFR5 ≤2秒的缓存响应）
2. **写操作后主动失效**：不等 TTL 过期，确保数据准确性
3. **日期范围必须用 UTC+8**：`dayjs + timezone`

### 前序 Story 依赖

- **Story 4.1**（users 数据）
- **Story 4.5**（payment_records）
- **Story 7.1**（group_audits）

### Project Structure Notes

- 缓存策略（dashboard）：[Source: architecture.md#缓存策略]
- NFR5 Dashboard ≤2秒：[Source: architecture.md#NFR5]
- FR41 5种日期范围：[Source: epics.md#FR41]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 与 Story 9.6 同轮：`POST /dashboard/export` 复用 `dateRange` 解析与 `factorForQuery`。

### File List

- `frontend/src/types/dashboard.ts`
- `frontend/src/mock/dashboard.ts`
