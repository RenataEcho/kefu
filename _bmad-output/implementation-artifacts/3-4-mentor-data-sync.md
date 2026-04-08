# Story 3.4：第三方 API 导师数据定时同步

Status: review

## Story

作为**超级管理员和导师**，
我希望系统自动同步导师的学员绑定关系、项目数量和收益数据，并清晰标注数据更新时间，
以便随时可查看最新的业务数据，无需手动整理（满足 FR36）。

## Acceptance Criteria

1. **Given** `@nestjs/schedule` 每小时定时任务  
   **When** 定时任务触发（`0 * * * *`）  
   **Then** 同步所有导师的学员数量、项目数量、收益数据，更新数据库并写入 Redis 缓存（`mentor:stats:{mentorId}`，TTL 3600s）

2. **Given** 第三方 API 正常可用  
   **When** 导师详情页加载  
   **Then** 展示最新同步数据，标注"最后同步时间：{datetime}"（NFR18）

3. **Given** 第三方 API 不可用  
   **When** 导师详情页加载  
   **Then** 展示数据库中旧数据（`lastSyncedAt` 标注），前端 `ApiStatusBar` 显示"第三方导师数据暂时无法更新，展示缓存数据"

4. **Given** 管理员在导师详情页  
   **When** 点击「手动同步」按钮  
   **Then** 立即触发该导师数据同步（异步，不阻塞前端，满足 NFR4）；前端轮询直到同步完成后刷新展示

5. **Given** 第三方 API 返回系统中不存在的导师  
   **When** 同步任务处理  
   **Then** 仅记录警告日志，不自动创建导师记录（满足架构规范）

## Tasks / Subtasks

- [ ] Task 1: 创建 MentorApiModule（第三方 API 集成）(AC: #1, #3, #5)
  - [ ] 创建 `backend/src/modules/external-apis/mentor-api/mentor-api.module.ts`
  - [ ] 创建 `backend/src/modules/external-apis/mentor-api/mentor-api.service.ts`
  - [ ] 配置 `HttpModule`（Axios），从 ConfigService 读取 `MENTOR_API_BASE_URL` 和 `MENTOR_API_KEY`
  - [ ] 实现 `syncMentorData(mentorId: string): Promise<MentorStatsDto>`
  - [ ] 降级处理：API 不可用时 throw `ExternalApiException`，Service 层 catch 后使用数据库旧数据

- [ ] Task 2: 实现定时同步任务（Cron）(AC: #1, #5)
  - [ ] 在 `MentorsModule`（或单独 `SyncModule`）中创建 `MentorSyncService`
  - [ ] `@Cron('0 * * * *')` 每小时触发全量同步
  - [ ] 记录同步日志：`this.logger.log('[Cron] 开始导师数据同步...')`
  - [ ] 同步完成后更新 `mentors.studentCount`、`projectCount`、`totalRevenue`、`lastSyncedAt`
  - [ ] 写入 Redis 缓存：`mentor:stats:{mentorId}`，TTL 3600s

- [ ] Task 3: 实现手动触发同步 API (AC: #4)
  - [ ] `POST /api/v1/mentors/:id/sync`（手动触发单个导师同步）
  - [ ] 使用 BullMQ `mentor-data-sync` 队列入队（不阻塞请求，满足 NFR4）
  - [ ] 返回 `{ status: 'queued' }`，前端轮询 `GET /api/v1/mentors/:id` 直到 `lastSyncedAt` 更新

- [ ] Task 4: Redis 缓存写入 (AC: #1, #3)
  - [ ] 注入 `@nestjs/bull` 或直接使用 `ioredis`（推荐 `ioredis` 做细粒度缓存控制）
  - [ ] Key 格式：`mentor:stats:{mentorId}`
  - [ ] TTL：3600s（`EX 3600`）

- [ ] Task 5: 前端降级状态展示 (AC: #2, #3, #4)
  - [ ] 在 `MentorDetail.vue` 中显示 `lastSyncedAt` 格式化时间
  - [ ] 从 `appStore.mentorApiDegraded` 读取降级状态，渲染 `ApiStatusBar`
  - [ ] 「手动同步」按钮：点击后调用 `POST /api/v1/mentors/:id/sync`，显示 loading，2秒后刷新数据

## Dev Notes

### 第三方 API 集成模式

```typescript
// mentor-api.service.ts
@Injectable()
export class MentorApiService {
  private readonly logger = new Logger(MentorApiService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getMentorStats(thirdPartyId: string): Promise<MentorStatsDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/mentor/${thirdPartyId}/stats`, {
          headers: { 'X-API-Key': this.configService.get('MENTOR_API_KEY') },
          timeout: 5000,
        })
      )
      return response.data
    } catch (error) {
      this.logger.warn(`第三方导师API调用失败: ${error.message}`)
      throw new ExternalApiException('MENTOR_API', error)
    }
  }
}
```

### Redis 缓存工具函数

```typescript
// 推荐在 AppModule 中注入 ioredis 实例
// 缓存键格式严格遵守架构规范
const cacheKey = `mentor:stats:${mentorId}`
await redis.setex(cacheKey, 3600, JSON.stringify(statsData))
const cached = await redis.get(cacheKey)
```

### 陌生导师处理

```typescript
// mentor-sync.service.ts - 同步时遇到 thirdPartyId 不在系统中的导师
const existingMentor = await this.prisma.mentor.findFirst({
  where: { thirdPartyId: apiMentor.id },
})
if (!existingMentor) {
  this.logger.warn(`第三方API返回未知导师: thirdPartyId=${apiMentor.id}，跳过`)
  return  // 不自动创建
}
```

### Redis 集成

在 Story 1.4 中 BullMQ 已连接 Redis。直接复用 Redis 连接：

```typescript
// AppModule 提供 Redis 实例
import Redis from 'ioredis'

{
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => new Redis(configService.get('REDIS_URL')),
  inject: [ConfigService],
}
```

### 关键架构规范（不可偏离）

1. **手动同步用 BullMQ 入队**：不同步执行（NFR4 不阻塞前端）
2. **缓存 Key 格式**：`mentor:stats:{mentorId}`，TTL 3600s（架构缓存策略表）
3. **陌生导师不自动创建**：只记录日志，业务不中断
4. **API 降级：展示数据库旧数据**：不抛出 500，使用 `catch` 降级到数据库读取

### 前序 Story 依赖

- **Story 1.4**（BullMQ `mentor-data-sync` 队列、`@nestjs/schedule`）
- **Story 3.3**（`mentors` 表的 `thirdPartyId`、`lastSyncedAt` 字段）

### Project Structure Notes

- 第三方导师系统API规范：[Source: architecture.md#第三方导师系统API]
- 缓存策略：[Source: architecture.md#缓存策略 mentor:stats]
- Cron 执行频率：[Source: architecture.md#Cron执行频率规范 每小时]
- NFR11 外部API降级：[Source: architecture.md#需求概览 NFR11]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **纯前端 / Mock（Step 21）**：未实现 Nest 定时任务与 Redis；`GET /mentors/:id` 返回 `mentorApiDegraded` + `POST /dev/mentor-api-degraded` 切换降级；导师详情页 `ApiStatusBar` 文案对齐 UX §4.1；`POST /mentors/:id/sync` 异步 Mock + 轮询刷新 `lastSyncedAt`。

### File List

- `frontend/src/mock/mentorApiFlags.ts`
- `frontend/src/mock/dev.ts`
- `frontend/src/mock/mentors.ts`
- `frontend/src/stores/app.ts`
- `frontend/src/types/mentor.ts`
- `frontend/src/api/mentors.ts`
- `frontend/src/views/organization/MentorDetailView.vue`
