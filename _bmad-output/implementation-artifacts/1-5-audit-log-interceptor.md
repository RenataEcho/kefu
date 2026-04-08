# Story 1.5：操作日志审计拦截器

Status: ready-for-dev

## Story

作为**系统管理员**，
我希望所有数据变更操作被自动记录到审计日志，无需开发者手动调用，
以便任何数据变更都可追溯，满足内部审计需求（NFR10）。

## Acceptance Criteria

1. **Given** `AuditLogInterceptor` 已全局注册到 NestJS 应用  
   **When** 任意 POST/PATCH/DELETE API 调用成功完成  
   **Then** `audit_logs` 表中自动新增一条记录，包含：`table_name`（当前操作的业务表名）、`record_id`（被操作记录的 ID）、`operator_id`（从 JWT Token `sub` 字段提取）、`operator_name`（从 JWT Token 提取，冗余存储）、`action_type`（CREATE/UPDATE/DELETE）、`before_data`（操作前完整 JSON 快照）、`after_data`（操作后完整 JSON 快照）、`created_at`

2. **Given** 任意 GET 请求  
   **When** 拦截器执行  
   **Then** 不创建任何 `audit_logs` 记录

3. **Given** 审计日志写入失败（如数据库临时不可用）  
   **When** 主业务操作已成功完成  
   **Then** 主操作响应正常返回，不因审计失败而回滚主业务事务；审计失败写入应用错误日志（`Logger.error()`）供排查

4. **Given** 任何角色的任何账号  
   **When** 尝试通过系统 API 删除任意 `audit_logs` 记录  
   **Then** 系统不提供任何删除审计日志的 API 端点（无 `DELETE /api/v1/audit-logs/:id` 接口）；即使直接操作数据库，应用账号权限亦拒绝 DELETE（双重保障，满足 NFR10）

5. **Given** 需要精确控制审计日志内容的复杂操作（如批量导入）  
   **When** Service 层调用 `AuditService.log()`  
   **Then** 可以手动记录自定义审计日志，支持自定义 `actionType`（如 `IMPORT`、`EXPORT`）

6. **Given** `@SkipAudit()` 装饰器标记的 Controller 方法  
   **When** 请求完成  
   **Then** 拦截器不记录该操作（用于特殊场景，如系统内部接口）

## Tasks / Subtasks

- [ ] Task 1: 实现 AuditService (AC: #1, #3, #5)
  - [ ] 创建 `backend/src/modules/audit-logs/audit.service.ts`
  - [ ] 实现 `log(params: AuditLogParams): Promise<void>` 方法
  - [ ] 使用 `try/catch` 包裹写入操作：失败时只记录错误日志，不抛出异常（主业务不受影响）
  - [ ] 创建 `backend/src/modules/audit-logs/audit-logs.module.ts`，导出 `AuditService`

- [ ] Task 2: 实现 @SkipAudit() 装饰器 (AC: #6)
  - [ ] 创建 `backend/src/common/decorators/skip-audit.decorator.ts`
  - [ ] 使用 `SetMetadata('skipAudit', true)` 实现

- [ ] Task 3: 实现 AuditLogInterceptor (AC: #1, #2, #3, #6)
  - [ ] 创建 `backend/src/common/interceptors/audit-log.interceptor.ts`
  - [ ] 实现核心逻辑：
    - 只拦截 POST、PATCH、DELETE 方法（GET 跳过）
    - 检查 `@SkipAudit()` 元数据，若存在则跳过
    - 从请求上下文提取 `operator_id` 和 `operator_name`（JWT 认证后的 `request.user`）
    - 从路由参数提取 `record_id`（`request.params.id`）
    - 使用 `@Audit()` 元数据获取 `table_name`
    - 记录调用前快照（`before_data`）—— 通过 `AuditService.getSnapshot()` 查询（如有需要）
    - 请求完成后，将响应 `data` 作为 `after_data`
    - 调用 `AuditService.log()` 写入日志
    - **在 tap() 中执行，不影响主响应**
  - [ ] 在 `main.ts` 中全局注册，或在各 Module 中按需注册

- [ ] Task 4: 实现 @Audit() 元数据装饰器 (AC: #1)
  - [ ] 创建 `backend/src/common/decorators/audit.decorator.ts`
  - [ ] `@Audit(tableName: string)` → `SetMetadata('auditTable', tableName)`
  - [ ] 在 Controller 方法上使用：`@Audit('users')`、`@Audit('payment_records')` 等

- [ ] Task 5: 创建 AuditLogs 查看 API（只读）(AC: #4)
  - [ ] 创建 `backend/src/modules/audit-logs/audit-logs.controller.ts`
  - [ ] 仅提供 `GET /api/v1/audit-logs` 和 `GET /api/v1/audit-logs/:id` 端点
  - [ ] **严格禁止** 创建 `DELETE /api/v1/audit-logs/:id` 或 `PATCH /api/v1/audit-logs/:id` 端点
  - [ ] 支持 `tableName`、`operatorId`、`startDate`、`endDate` 筛选参数

- [ ] Task 6: 编写单元测试 (AC: #2, #3)
  - [ ] 测试 GET 请求不触发审计日志
  - [ ] 测试审计写入失败时主业务响应仍正常返回
  - [ ] 测试 `@SkipAudit()` 装饰器生效

- [ ] Task 7: 验收测试 (AC: #1, #4)
  - [ ] 调用任意 POST 接口（如 POST /api/v1/health 的 mock 端点），验证 `audit_logs` 有新记录
  - [ ] 尝试 `DELETE /api/v1/audit-logs/1`，验证 404 返回（端点不存在）

## Dev Notes

### AuditService 实现

```typescript
// backend/src/modules/audit-logs/audit.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface AuditLogParams {
  tableName: string
  recordId: bigint | number | string
  operatorId?: bigint | number | null
  operatorName?: string | null
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUDIT_APPROVE' | 'AUDIT_REJECT' | 'ARCHIVE' | 'IMPORT' | 'EXPORT'
  beforeData?: object | null
  afterData?: object | null
  remark?: string
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tableName: params.tableName,
          recordId: BigInt(params.recordId),
          operatorId: params.operatorId ? BigInt(params.operatorId) : null,
          operatorName: params.operatorName ?? null,
          actionType: params.actionType,
          beforeData: params.beforeData ?? undefined,
          afterData: params.afterData ?? undefined,
          remark: params.remark,
        },
      })
    } catch (error) {
      // 审计日志写入失败不能影响主业务
      this.logger.error(`审计日志写入失败: ${error.message}`, error.stack)
    }
  }
}
```

### AuditLogInterceptor 实现

```typescript
// backend/src/common/interceptors/audit-log.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  Inject, Optional
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { AuditService } from '../../modules/audit-logs/audit.service'

const SKIP_AUDIT_KEY = 'skipAudit'
const AUDIT_TABLE_KEY = 'auditTable'

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const method = request.method

    // 只拦截写操作
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle()
    }

    // 检查 @SkipAudit()
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skipAudit) {
      return next.handle()
    }

    const tableName = this.reflector.getAllAndOverride<string>(AUDIT_TABLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!tableName || !this.auditService) {
      return next.handle()
    }

    const user = request.user  // JWT 认证后由 JwtAuthGuard 注入
    const recordId = request.params?.id

    // 判断 actionType
    const actionType =
      method === 'POST' ? 'CREATE' :
      method === 'PATCH' ? 'UPDATE' : 'DELETE'

    return next.handle().pipe(
      tap(async (responseData) => {
        // responseData 是 Controller 返回的原始数据（ResponseInterceptor 包装前）
        await this.auditService.log({
          tableName,
          recordId: recordId || (responseData?.id),
          operatorId: user?.sub,
          operatorName: user?.name,
          actionType,
          afterData: method !== 'DELETE' ? responseData : null,
          beforeData: null,  // 复杂场景在 Service 层手动传入
        })
      })
    )
  }
}
```

### 装饰器实现

```typescript
// backend/src/common/decorators/audit.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const Audit = (tableName: string) => SetMetadata('auditTable', tableName)

// backend/src/common/decorators/skip-audit.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const SkipAudit = () => SetMetadata('skipAudit', true)
```

### Controller 使用示例

```typescript
// 在各业务 Controller 上添加 @Audit() 装饰器
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {

  @Post()
  @Audit('users')            // ← 声明审计表名
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto)
  }

  @Patch(':id')
  @Audit('users')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(BigInt(id), dto)
  }

  @Delete(':id')
  @Audit('users')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(BigInt(id))
  }

  @Get()
  // ← GET 不加 @Audit()，拦截器自动跳过
  async findAll() {
    return this.usersService.findAll()
  }
}
```

### 手动调用 AuditService 的场景

对于批量导入、导出等复杂操作，在 Service 层显式调用：

```typescript
// backend/src/modules/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async importUsers(rows: CreateUserDto[], operatorId: bigint, operatorName: string) {
    // 批量创建
    const created = await this.prisma.user.createMany({ data: rows })

    // 手动记录审计日志（批量操作，自定义 actionType）
    await this.auditService.log({
      tableName: 'users',
      recordId: 0,  // 批量操作无单一 recordId，用 0 标识
      operatorId,
      operatorName,
      actionType: 'IMPORT',
      afterData: { count: created.count },
      remark: `批量导入 ${created.count} 条用户记录`,
    })

    return created
  }
}
```

### 注意事项：AuditLog 双重保障

1. **API 层**：`AuditLogsController` 只提供 GET 端点，无任何 PUT/PATCH/DELETE 端点
2. **数据库层**：`backend/prisma/init-permissions.sql` 已限制应用账号只有 INSERT/SELECT 权限（Story 1.3 创建）
3. **代码层**：`AuditService.log()` 方法只调用 `prisma.auditLog.create()`，无 update/delete 操作

### 全局注册 vs. 模块注册

全局注册方式（推荐）：
```typescript
// main.ts
app.useGlobalInterceptors(
  new ResponseInterceptor(),
  // AuditLogInterceptor 依赖 AuditService，需用 DI 注入
  // 在 AppModule providers 中注册并通过 APP_INTERCEPTOR token
)
```

使用 `APP_INTERCEPTOR` 保持 DI：
```typescript
// app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core'
providers: [
  { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
]
```

### Project Structure Notes

- 操作日志不可篡改设计：[Source: architecture.md#操作日志不可篡改设计]
- 操作日志记录规范：[Source: architecture.md#操作日志记录规范]
- AuditLog 表结构：[Source: architecture.md#数据模型设计 AuditLog]
- `action_type` 枚举：[Source: architecture.md#操作日志记录规范 AuditActionType]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
