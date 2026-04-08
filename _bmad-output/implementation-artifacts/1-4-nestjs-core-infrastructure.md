# Story 1.4：NestJS 核心基础设施与统一 API 规范

Status: ready-for-dev

## Story

作为**开发者**，
我希望所有 API 端点返回统一格式的响应，全局异常被统一处理，
以便前端可以可靠地解析任何 API 的输出，无需为每个端点单独处理异常格式。

## Acceptance Criteria

1. **Given** 任意成功的 API 调用  
   **When** 返回响应  
   **Then** 格式固定为 `{ code: 0, data: T, message: "success" }`；创建操作 HTTP 201，其余 HTTP 200

2. **Given** 任意业务错误  
   **When** 返回错误响应  
   **Then** 格式固定为 `{ code: NNNNN, data: null, message: "..." }`，HTTP 状态码与错误类型一致（400/401/403/404/409/422/500）

3. **Given** 请求体参数验证失败（class-validator 触发）  
   **When** 请求到达 Controller  
   **Then** 返回 HTTP 400，`code: 10001`，message 包含失败字段名和原因描述

4. **Given** 代码库中的业务错误码  
   **When** 审查 `src/common/errors/error-codes.ts`  
   **Then** 存在集中定义的错误码常量，覆盖架构规范中 10001–50003 全部错误码

5. **Given** BullMQ 配置  
   **When** backend 启动  
   **Then** BullMQ 已初始化并连接到 Redis，以下队列已定义：`notification-send`、`sla-alert`、`youbao-data-sync`、`lark-audit-sync`、`mentor-data-sync`、`excel-import-process`、`file-export-generate`

6. **Given** 定时任务配置  
   **When** backend 启动  
   **Then** `@nestjs/schedule` 已配置，Cron 装饰器可用；worker 进程通过 `NestFactory.createApplicationContext()` 独立运行，不启动 HTTP 服务

7. **Given** Prisma 服务  
   **When** 任意模块需要数据库访问  
   **Then** 可通过注入 `PrismaService` 使用 Prisma Client，且服务在应用关闭时自动断开连接

8. **Given** `GET /api/v1/health` 端点  
   **When** 调用  
   **Then** 返回 `{ code: 0, data: { status: "ok", timestamp: "..." }, message: "success" }`

## Tasks / Subtasks

- [ ] Task 1: 实现 PrismaService (AC: #7)
  - [ ] 创建 `backend/src/prisma/prisma.service.ts`
  - [ ] 继承 `PrismaClient`，实现 `OnModuleInit`（`this.$connect()`）和 `OnModuleDestroy`（`this.$disconnect()`）
  - [ ] 创建 `backend/src/prisma/prisma.module.ts`，导出 `PrismaService`，标记为全局模块（`@Global()`）
  - [ ] 在 `AppModule` 中导入 `PrismaModule`

- [ ] Task 2: 实现统一响应格式拦截器 (AC: #1)
  - [ ] 创建 `backend/src/common/interceptors/response.interceptor.ts`
  - [ ] 实现 `ResponseInterceptor implements NestInterceptor`
  - [ ] 自动将 Controller 返回值包装为 `{ code: 0, data: T, message: 'success' }`
  - [ ] 在 `main.ts` 中全局注册：`app.useGlobalInterceptors(new ResponseInterceptor())`

- [ ] Task 3: 实现全局异常过滤器 (AC: #2, #3)
  - [ ] 创建 `backend/src/common/filters/global-exception.filter.ts`
  - [ ] 实现 `GlobalExceptionFilter implements ExceptionFilter`
  - [ ] 处理 `HttpException`（NestJS 内置）→ 转换为统一错误格式
  - [ ] 处理 `PrismaClientKnownRequestError`（Prisma P2002 唯一约束等）→ 409
  - [ ] 处理未知错误 → HTTP 500
  - [ ] 提取业务 `code`：从 `exception.getResponse()` 中解析，默认用 HTTP 状态码映射
  - [ ] 在 `main.ts` 中全局注册：`app.useGlobalFilters(new GlobalExceptionFilter())`

- [ ] Task 4: 实现全局 Validation Pipe (AC: #3)
  - [ ] 在 `main.ts` 中全局注册 `ValidationPipe`：`whitelist: true`、`forbidNonWhitelisted: true`、`transform: true`
  - [ ] 自定义 `exceptionFactory`：将 class-validator 错误转换为 `{ code: 10001, message: '字段名: 错误原因' }`
  - [ ] 创建 `backend/src/common/pipes/validation.pipe.ts`（对全局 pipe 的封装，方便单元测试）

- [ ] Task 5: 定义错误码常量 (AC: #4)
  - [ ] 创建 `backend/src/common/errors/error-codes.ts`
  - [ ] 按照架构规范定义所有错误码（见 Dev Notes 完整错误码表）

- [ ] Task 6: 实现 ConfigModule (AC: #5, #6)
  - [ ] 创建 `backend/src/config/configuration.ts`（加载并返回所有环境变量）
  - [ ] 创建 `backend/src/config/configuration.validation.ts`（使用 Joi 校验所有必需变量）
  - [ ] 在 `AppModule` 中导入 `ConfigModule.forRoot({ isGlobal: true, load: [configuration], validationSchema })`

- [ ] Task 7: 配置 BullMQ 队列 (AC: #5)
  - [ ] 在 `AppModule` 中导入 `BullModule.forRootAsync()`（从 `ConfigModule` 读取 `REDIS_URL`）
  - [ ] 创建 `backend/src/queues/queue-names.ts` 定义所有队列名称常量
  - [ ] 注册所有 7 个队列（`BullModule.registerQueue()`）

- [ ] Task 8: 配置 ScheduleModule (AC: #6)
  - [ ] 在 `AppModule` 中导入 `ScheduleModule.forRoot()`

- [ ] Task 9: 实现 HealthController (AC: #8)
  - [ ] 创建 `backend/src/health/health.controller.ts`
  - [ ] `GET /api/v1/health` → 返回 `{ status: 'ok', timestamp: new Date().toISOString() }`
  - [ ] 此端点**跳过 JWT 鉴权**（公开端点，用于 Docker 健康检查）

- [ ] Task 10: 配置全局前缀和 CORS (AC: #1, #2)
  - [ ] 在 `main.ts` 中设置全局前缀：`app.setGlobalPrefix('api/v1')`
  - [ ] 配置 CORS：开发环境允许 `localhost:5173`，生产环境通过 Nginx 同域无需 CORS
  - [ ] 添加 `BigInt.prototype.toJSON` 序列化（见 Story 1.3 Dev Notes）

- [ ] Task 11: 创建通用 DTO (AC: #1)
  - [ ] 创建 `backend/src/common/dto/pagination.dto.ts`（`page: number = 1`、`pageSize: number = 20`）
  - [ ] 创建 `backend/src/common/dto/api-response.dto.ts`（响应类型定义）

- [ ] Task 12: 验收测试 (AC: #1, #2, #3, #8)
  - [ ] `curl http://localhost:3000/api/v1/health` 返回正确格式
  - [ ] 发送无效请求验证 400 格式正确包含 `code: 10001`
  - [ ] 检查 BullMQ 连接到 Redis 无报错

## Dev Notes

### NestJS main.ts 关键配置

```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

// Prisma BigInt 序列化修复
;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 全局前缀
  app.setGlobalPrefix('api/v1')

  // 全局拦截器（统一响应格式）
  app.useGlobalInterceptors(new ResponseInterceptor())

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter())

  // 全局 ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (e) => `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`
        )
        return new BadRequestException({
          code: 10001,
          message: messages.join('; '),
        })
      },
    })
  )

  // CORS（开发环境）
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  })

  await app.listen(3000)
}

bootstrap()
```

### ResponseInterceptor 实现

```typescript
// backend/src/common/interceptors/response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        data,
        message: 'success',
      }))
    )
  }
}
```

### GlobalExceptionFilter 实现要点

```typescript
// backend/src/common/filters/global-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code = 99999
    let message = '系统异常，请稍后重试'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      if (typeof exceptionResponse === 'object' && 'code' in (exceptionResponse as object)) {
        code = (exceptionResponse as any).code
        message = (exceptionResponse as any).message
      } else {
        code = status
        message = typeof exceptionResponse === 'string' ? exceptionResponse : exception.message
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT
        code = 20003  // 或根据具体业务设置
        message = '数据已存在（唯一约束冲突）'
      }
    }

    response.status(status).json({ code, data: null, message })
  }
}
```

### 完整错误码表

```typescript
// backend/src/common/errors/error-codes.ts
export const ErrorCodes = {
  // 通用
  VALIDATION_FAILED: 10001,        // 参数验证失败
  RESOURCE_NOT_FOUND: 10002,       // 资源不存在
  OPERATION_BLOCKED: 10003,        // 操作被拦截（关联数据存在）

  // 右豹编码校验
  CODE_FORMAT_ERROR: 20001,        // 编码格式错误
  CODE_NOT_EXIST: 20002,           // 编码不存在（右豹API返回）
  CODE_DUPLICATE: 20003,           // 编码已被录入（重复）
  YOUBAO_API_TIMEOUT: 20004,       // 右豹API超时（可重试）
  YOUBAO_API_UNAVAILABLE: 20005,   // 右豹API不可用

  // 飞书
  LARK_API_UNAVAILABLE: 30001,     // 飞书API不可用
  LARK_OAUTH_FAILED: 30002,        // 飞书OAuth授权失败
  LARK_FRIEND_REQUEST_FAILED: 30003, // 飞书好友申请失败

  // 微信服务号
  WECHAT_OPENID_NOT_BOUND: 40001,  // 用户未绑定OpenID
  WECHAT_PUSH_FAILED: 40002,       // 推送失败

  // 认证授权
  AUTH_INVALID_CREDENTIALS: 50001, // 账号不存在或密码错误
  AUTH_TOKEN_EXPIRED: 50002,       // Token已过期
  AUTH_NO_PERMISSION: 50003,       // 无此操作权限
} as const
```

### 队列名称常量

```typescript
// backend/src/queues/queue-names.ts
export const QUEUE_NAMES = {
  NOTIFICATION_SEND: 'notification-send',
  SLA_ALERT: 'sla-alert',
  YOUBAO_DATA_SYNC: 'youbao-data-sync',
  LARK_AUDIT_SYNC: 'lark-audit-sync',
  MENTOR_DATA_SYNC: 'mentor-data-sync',
  EXCEL_IMPORT_PROCESS: 'excel-import-process',
  FILE_EXPORT_GENERATE: 'file-export-generate',
} as const
```

### AppModule 配置

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bull'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import configuration from './config/configuration'
import { QUEUE_NAMES } from './queues/queue-names'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: (configService) => ({
        redis: configService.get('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATION_SEND },
      { name: QUEUE_NAMES.SLA_ALERT },
      { name: QUEUE_NAMES.YOUBAO_DATA_SYNC },
      { name: QUEUE_NAMES.LARK_AUDIT_SYNC },
      { name: QUEUE_NAMES.MENTOR_DATA_SYNC },
      { name: QUEUE_NAMES.EXCEL_IMPORT_PROCESS },
      { name: QUEUE_NAMES.FILE_EXPORT_GENERATE },
    ),
    HealthModule,
    // 其他业务模块在各自 Story 中添加
  ],
})
export class AppModule {}
```

### PrismaService 实现

```typescript
// backend/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

```typescript
// backend/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 分页 DTO

```typescript
// backend/src/common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}
```

### 关键架构规范（不可偏离）

1. **全局前缀必须是 `api/v1`**：所有 Controller 的 `@Controller()` 装饰器不需要再加 `api/v1` 前缀
2. **ResponseInterceptor 全局注册**：所有 Controller 直接返回数据，不需要手动包装
3. **业务异常必须使用 NestJS 内置异常类**：`NotFoundException`、`ConflictException` 等，传入 `{ code: ErrorCodes.XXX, message: '...' }` 对象
4. **ValidationPipe `transform: true`**：DTO 中的 `@Type(() => Number)` 才能正确转换字符串到数字（查询参数默认是字符串）
5. **PrismaModule 全局（@Global）**：无需在每个 Feature Module 中导入 PrismaModule

### Project Structure Notes

- 统一响应格式：[Source: architecture.md#统一响应格式]
- 业务错误码表：[Source: architecture.md#业务错误码表]
- BullMQ 队列命名规范：[Source: architecture.md#BullMQ队列命名规范]
- 分页规范：[Source: architecture.md#分页规范]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
