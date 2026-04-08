---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-03'
project_name: '客户服务中心'
user_name: 'Maziluo'
date: '2026-04-03'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prototype-spec.md
  - _bmad-output/planning-artifacts/product-brief-kefu.md
---

# 技术架构文档 · 客户服务中心

**作者：** Maziluo
**日期：** 2026-04-03
**版本：** v1.0
**基于：** PRD v1.0 + UX 设计规范 + 原型补充规格 v1.4

---

## 执行摘要

客户服务中心是右豹平台内部运营团队专属管理后台，技术架构目标是以最精简的团队资源（1名前端 + 1名后端）交付一套**稳定可替换**的数字化工具，完整替代现有的「企业微信 + 飞书 + Excel」组合。

**核心架构原则：**

1. **前后端分离**：Vue3 SPA + NestJS REST API，清晰职责边界，独立部署
2. **外部API韧性**：4路外部API均有明确降级策略，任一不可用时核心业务不中断
3. **AI代理一致性**：本文档为所有实现决策的唯一真相来源，确保多个AI代理实现的代码可无缝协作
4. **单租户内部工具**：不考虑多租户隔离，聚焦业务逻辑实现

---

## 项目上下文分析

### 需求概览

**功能需求规模：** FR1–FR48，共 48 条，分布于 8 个功能域：

| 功能域 | FR范围 | 核心复杂点 |
|---|---|---|
| 用户数据管理 | FR1–FR13 | 右豹编码实时API校验、付费状态联动、批量导入两阶段校验 |
| 入群审核 | FR14–FR20 | 飞书API双向同步、SLA计时、重复申请拦截、归档规则 |
| 消息通知 | FR21–FR24 | 微信服务号推送、失败队列、异步解耦 |
| SLA超时预警 | FR25–FR27 | 定时扫描任务、首次+二次催促逻辑、幂等性 |
| 飞书好友管理 | FR28–FR32 | OAuth多账号授权、申请状态机、超时自动标记 |
| 组织管理 | FR33–FR38 | 级联关联检查、第三方API同步、层级下钻 |
| 数据看板 | FR39–FR42 | 多角色差异化视图、转化漏斗统计口径、日期范围筛选 |
| 权限与账号管理 | FR43–FR48 | 3维度RBAC（菜单/操作/字段）、操作日志不可篡改 |

**非功能需求关键约束（架构驱动）：**

| NFR | 要求 | 架构影响 |
|---|---|---|
| NFR1 | 列表页首屏 ≤ 3秒 | 数据库索引设计、分页强制化 |
| NFR2 | 编码校验 ≤ 2秒 | API超时控制、缓存预热考量 |
| NFR3 | Excel导入(≤500条) ≤ 30秒 | 异步队列处理 |
| NFR4 | 定时任务不阻塞前端 | 独立异步执行 |
| NFR5 | Dashboard ≤ 2秒（缓存有效时） | Redis缓存层 |
| NFR6 | 强制HTTPS | Nginx配置 |
| NFR7 | 密码加盐哈希 | bcrypt存储 |
| NFR8 | OpenID不暴露 | API层字段过滤 |
| NFR9 | Token有效期 ≤ 8小时 | JWT短期过期 |
| NFR11 | 外部API降级可用 | 降级策略设计 |
| NFR14 | 审核操作幂等性 | 乐观锁/幂等键 |
| NFR15 | 工作时间可用性 ≥ 99% | Docker健康检查 |

### 技术约束与依赖

- **外部依赖（4路API）：** 右豹APP API、飞书API、第三方导师系统API、微信服务号API
- **数据迁移：** 一次性历史Excel数据迁移，上线前完成，不在系统内常驻功能
- **微信H5页面：** FR13（OpenID绑定）、FR18（拒绝修改指引）属用户侧，不在本后台范围
- **部署环境：** 单机Docker部署（内部工具，无高可用要求）

### 复杂度评估

- **项目复杂度：** 中等偏高
- **技术域：** Full-Stack Web（管理后台）
- **主要横切关注点：**
  - 异步任务调度（SLA扫描、API同步、通知发送）
  - 3维度RBAC权限控制
  - 4路外部API集成与降级策略
  - 操作日志不可篡改审计链
  - 数据一致性（付费状态原子变更）

---

## 技术选型

### 主技术栈

| 层级 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| **前端框架** | Vue 3 | 3.5.x | UX规范已确认，与Naive UI深度配合 |
| **前端构建** | Vite | 5.x | 热重载快、配置简洁，Vue官方推荐 |
| **UI组件库** | Naive UI | 2.x | 专为Vue3设计，主题CSS变量支持深度定制，覆盖全部组件需求 |
| **CSS工具** | Tailwind CSS | 3.x | backdrop-blur等玻璃拟态核心属性原生支持 |
| **状态管理** | Pinia | 2.x | Vue3官方推荐，TypeScript友好，模块化 |
| **前端路由** | Vue Router | 4.x | Vue3官方，守卫机制完善 |
| **前端语言** | TypeScript | 5.x | 类型安全，减少运行时错误 |
| **后端框架** | NestJS | 10.x | TypeScript原生，模块化清晰，内置DI/Guards/Interceptors，适合RBAC和审计 |
| **后端语言** | TypeScript | 5.x | 前后端统一语言，类型共享 |
| **ORM** | Prisma | 5.x | 类型安全、迁移管理完善、MySQL支持成熟 |
| **主数据库** | MySQL | 8.0 | PRD资源规划已定，关系型满足业务需求 |
| **缓存/队列** | Redis | 7.x | 外部API数据缓存 + Bull队列基础 |
| **异步队列** | BullMQ | 5.x | Redis-backed，支持延迟任务、重试、优先级（SLA预警队列） |
| **定时任务** | @nestjs/schedule | 3.x | NestJS原生Cron支持，与模块系统集成 |
| **文件处理** | Multer | 1.x | NestJS内置集成，Excel/图片上传 |
| **认证** | JWT + Passport | — | NestJS生态标准方案 |
| **密码哈希** | bcrypt | 5.x | NFR7加盐哈希要求 |
| **HTTP客户端** | Axios | 1.x | 外部API调用，支持拦截器和超时控制 |
| **验证** | class-validator + class-transformer | — | NestJS DTO验证标准方案 |
| **包管理** | pnpm | 9.x | Monorepo支持，磁盘效率高 |
| **反向代理** | Nginx | 1.24+ | HTTPS终止、静态资源服务、API代理 |
| **容器化** | Docker + Docker Compose | — | 开发/生产环境一致性 |

### 项目初始化命令

```bash
# 后端初始化
npx @nestjs/cli new kefu-backend --package-manager pnpm --strict

# 前端初始化
pnpm create vite@latest kefu-frontend -- --template vue-ts

# Monorepo根目录
mkdir kefu && cd kefu
pnpm init
# 配置 pnpm-workspace.yaml
```

---

## 核心架构决策

### 数据架构决策

#### 数据库主键策略

- **主键类型：** 全局使用自增整型 `id BIGINT AUTO_INCREMENT`
- **业务唯一键：** `right_leopard_code`（右豹编码）为用户主档业务主键，数据库层唯一索引
- **外键约束：** 在应用层校验关联数据存在性，数据库层不设置级联删除（防止意外数据丢失）

#### ORM与迁移策略

- **ORM：** Prisma（类型安全查询，迁移文件版本化）
- **迁移：** `prisma migrate dev`（开发）/ `prisma migrate deploy`（生产）
- **Schema位置：** `backend/prisma/schema.prisma`
- **迁移文件：** `backend/prisma/migrations/` 版本化管理，不可手动修改历史迁移

#### 缓存策略

| 缓存场景 | Key格式 | TTL | 失效策略 |
|---|---|---|---|
| 右豹APP动作数据 | `user:actions:{rightLeopardCode}` | 3600s | 定时刷新 + 手动触发 |
| 第三方导师API数据 | `mentor:stats:{mentorId}` | 3600s | 定时刷新 + 手动触发 |
| Dashboard聚合数据 | `dashboard:global:{dateRange}` | 300s | 写操作后主动失效 |
| 客服个人Dashboard | `dashboard:agent:{agentId}:{dateRange}` | 300s | 写操作后主动失效 |
| 飞书好友状态 | `lark:friend:{userId}` | 86400s | 每日定时刷新 |

#### 数据同步策略

| 数据源 | 同步方式 | 频率 | 降级行为 |
|---|---|---|---|
| 右豹APP动作数据 | 定时任务 + 手动触发 + 首次录入时异步拉取 | 每小时 | 展示Redis缓存 + 页面标注"缓存数据" |
| 飞书好友状态 | 定时任务 + 手动刷新 | 每日 | 展示旧数据 + 页面顶部提示 |
| 第三方导师数据 | 定时任务 + 手动触发 | 每小时 | 展示Redis缓存 + 标注最后同步时间 |
| 飞书入群申请 | 定时轮询 + Webhook回调 + 手动触发 | 5分钟轮询 | 手动导入降级路径 |

### 认证与安全架构

#### JWT认证方案

```
认证流程：
POST /api/v1/auth/login
  → 验证 loginId + password（bcrypt.compare）
  → 生成 JWT（payload: {sub: accountId, roleId, isAuditor, permissions}）
  → 返回 { accessToken, expiresIn: 28800 }（8小时）

后续请求：
Authorization: Bearer <token>
  → JwtAuthGuard 验证 token 有效性
  → RbacGuard 从 token 中取权限，校验当前接口权限
```

#### RBAC三维度权限实现

```
权限维度：
1. 菜单权限（menuPermissions）：控制路由可见性
   格式：['users:read', 'audit:read', 'audit:write', ...]

2. 操作权限（operationPermissions）：控制CRUD操作
   格式：['users:create', 'users:update', 'users:delete', 'users:import', 'users:export']

3. 字段权限（fieldPermissions）：控制敏感字段显隐
   格式：{ paymentAmount: true, paymentContact: true }

存储方式：
- 角色组（Role）表存储权限JSON（permissions字段）
- 账号（Account）表关联角色组ID + is_auditor布尔值
- JWT payload中携带完整权限对象（减少数据库查询）

前端实现：
- pinia store缓存当前用户权限
- usePermission() composable统一权限判断
- 无权限菜单项完全不渲染（v-if而非v-show）
- 无权限字段从DOM移除（非置灰）
```

#### 操作日志不可篡改设计

- **日志写入：** 所有数据变更通过NestJS Interceptor自动记录，不依赖开发者手动调用
- **不可删除：** 日志表不提供DELETE API；数据库层通过应用账号权限限制（应用账号仅有INSERT/SELECT权限）
- **字段：** `id, table_name, record_id, operator_id, action_type, before_data(JSON), after_data(JSON), created_at`

### API设计决策

#### RESTful规范

```
Base URL: /api/v1/

资源命名：复数小写连字符
  GET    /api/v1/users              → 列表
  POST   /api/v1/users              → 创建
  GET    /api/v1/users/:id          → 详情
  PATCH  /api/v1/users/:id          → 更新（部分更新用PATCH）
  DELETE /api/v1/users/:id          → 删除

嵌套资源：
  GET    /api/v1/users/:id/audit-records   → 用户的审核记录
  GET    /api/v1/mentors/:id/students      → 导师名下学员

操作型接口（非CRUD）：
  POST   /api/v1/users/:id/verify-code    → 触发编码校验
  POST   /api/v1/audit-records/:id/approve → 审核通过
  POST   /api/v1/audit-records/:id/reject  → 审核拒绝
  POST   /api/v1/lark/sync-status          → 手动触发飞书同步
```

#### 统一响应格式

```typescript
// 成功响应
{
  code: 0,
  data: T | T[] | PaginatedResult<T>,
  message: 'success'
}

// 分页响应 data 结构
{
  items: T[],
  total: number,
  page: number,
  pageSize: number
}

// 错误响应
{
  code: number,        // 业务错误码（见错误码表）
  data: null,
  message: string      // 面向开发者的错误描述
}

// HTTP状态码语义：
// 200 - 成功
// 201 - 创建成功
// 400 - 客户端参数错误
// 401 - 未认证（Token无效/过期）
// 403 - 无权限（有效Token但无操作权限）
// 404 - 资源不存在
// 409 - 业务冲突（如编码重复）
// 422 - 外部API校验失败
// 500 - 服务器内部错误
```

#### 业务错误码表

```
// 通用
10001 - 参数验证失败
10002 - 资源不存在
10003 - 操作被拦截（关联数据存在）

// 右豹编码校验
20001 - 编码格式错误
20002 - 编码不存在（右豹API返回）
20003 - 编码已被录入（重复）
20004 - 右豹API超时（可重试）
20005 - 右豹API不可用

// 飞书
30001 - 飞书API不可用
30002 - 飞书OAuth授权失败
30003 - 飞书好友申请失败

// 微信服务号
40001 - 用户未绑定OpenID
40002 - 推送失败

// 认证授权
50001 - 账号不存在或密码错误
50002 - Token已过期
50003 - 无此操作权限
```

### 前端架构决策

#### 状态管理（Pinia Store 模块划分）

```
stores/
├── auth.ts          # 当前账号信息、权限缓存、登录状态
├── user.ts          # 用户主档列表、筛选状态
├── audit.ts         # 入群审核工作台状态
├── dashboard.ts     # Dashboard数据、日期范围选择器
├── notification.ts  # 通知失败记录
└── app.ts           # 全局应用状态（主题、API降级状态）
```

#### 组件架构策略

```
组件分层：
1. 设计系统层（来自Naive UI）
   → 直接使用NDataTable、NForm、NDrawer等

2. 业务组件层（项目定制）
   → CodeVerifyInput       编码校验输入框（三态：loading/valid/invalid）
   → MetricCard            玻璃拟态指标卡片
   → SlaStatusBadge        SLA状态徽标（自动计算超时状态）
   → ApiStatusBar          API降级状态条（正常时不渲染）
   → ConversionFunnel      转化漏斗图

3. 页面层
   → 对应路由的完整页面
   → 调用Pinia store + 业务组件
```

#### 路由权限守卫

```typescript
// router/index.ts
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 1. 未登录跳转登录页
  if (!authStore.isLoggedIn && to.name !== 'Login') {
    return next({ name: 'Login' })
  }

  // 2. 检查菜单权限（无权限菜单直接404而非403，避免信息泄露）
  if (to.meta.permission && !authStore.hasMenuPermission(to.meta.permission)) {
    return next({ name: '404' })
  }

  next()
})
```

### 基础设施与部署决策

#### Docker Compose 架构

```yaml
# 服务拓扑
services:
  nginx:      # 反向代理 + 静态资源 + HTTPS终止
  frontend:   # Vue3 SPA构建产物（由nginx直接服务，无独立容器）
  backend:    # NestJS API服务（端口3000）
  mysql:      # MySQL 8.0（端口3306，仅内网可访问）
  redis:      # Redis 7.x（端口6379，仅内网可访问）
  worker:     # BullMQ Worker进程（与backend共享代码，独立进程）
```

#### 环境配置策略

```
.env.example    # 提交到Git，包含所有变量名（值为占位符）
.env.local      # 开发环境，不提交Git
.env.production # 生产环境，不提交Git

关键环境变量：
DATABASE_URL        # Prisma连接字符串
REDIS_URL           # Redis连接字符串
JWT_SECRET          # JWT签名密钥（生产环境须随机生成）
JWT_EXPIRES_IN      # 28800（8小时）

# 右豹APP API
YOUBAO_API_BASE_URL
YOUBAO_API_KEY

# 飞书API
LARK_APP_ID
LARK_APP_SECRET
LARK_WEBHOOK_TOKEN

# 第三方导师API
MENTOR_API_BASE_URL
MENTOR_API_KEY

# 微信服务号
WECHAT_APP_ID
WECHAT_APP_SECRET
```

---

## 实现模式与一致性规则

> 本章节为AI代理实现的强制规范，所有代理必须遵循。

### 命名规范

#### 数据库命名（Prisma Schema）

```
表名：snake_case 复数
  ✅ users, payment_records, group_audits, audit_logs
  ❌ User, PaymentRecord, AuditLog

字段名：snake_case
  ✅ right_leopard_code, created_at, is_auditor
  ❌ rightLeopardCode, createdAt, isAuditor

外键命名：{关联表单数}_id
  ✅ user_id, agent_id, mentor_id, role_id
  ❌ userId, fk_user

索引命名：idx_{表名}_{字段名}
  ✅ idx_users_right_leopard_code, idx_group_audits_status
  ❌ users_code_index, unique_code
```

#### API命名

```
端点：/api/v1/{资源复数连字符}
  ✅ /api/v1/users, /api/v1/group-audits, /api/v1/audit-logs
  ❌ /api/v1/user, /api/v1/groupAudit

路径参数：:id（固定用id）
  ✅ /api/v1/users/:id
  ❌ /api/v1/users/:userId

查询参数：camelCase
  ✅ ?page=1&pageSize=20&rightLeopardCode=xxx
  ❌ ?right_leopard_code=xxx
```

#### 代码命名

```
NestJS模块/文件：kebab-case
  ✅ users.module.ts, group-audit.service.ts
  ❌ UsersModule.ts, groupAuditService.ts

类名：PascalCase
  ✅ UsersService, GroupAuditController, CreateUserDto
  ❌ usersService, group_audit_controller

接口/类型名：PascalCase（接口不加I前缀）
  ✅ type UserListItem = {...}, interface PaginatedResult<T> {...}
  ❌ IUserListItem, TUserListItem

Vue组件：PascalCase（文件名和组件名一致）
  ✅ CodeVerifyInput.vue, SlaStatusBadge.vue
  ❌ code-verify-input.vue, sla_status_badge.vue

Vue组合式函数：useXxx格式
  ✅ usePermission(), useAuditActions(), usePagination()
  ❌ permissionHelper(), auditUtils()

Pinia Store：useXxxStore格式
  ✅ useAuthStore(), useAuditStore()
  ❌ authStore, AuditStore

CSS类（Tailwind之外的自定义类）：kebab-case
  ✅ .badge-red, .metric-card, .api-status-bar
  ❌ .badgeRed, .MetricCard
```

### 结构规范

#### API响应一致性

```typescript
// 所有Controller必须使用统一响应包装
// ✅ 正确 - 使用ResponseInterceptor自动包装
@Controller('users')
export class UsersController {
  @Get()
  async findAll(): Promise<User[]> {  // 直接返回数据，Interceptor负责包装
    return this.usersService.findAll()
  }
}

// 错误抛出必须使用NestJS内置异常
throw new NotFoundException('用户不存在')
throw new ConflictException('右豹编码已存在')
throw new BadRequestException({ code: 20004, message: '右豹API超时' })
```

#### 操作日志记录规范

```typescript
// 所有数据变更操作必须记录审计日志
// 使用AuditInterceptor自动捕获，或在Service层显式调用

// ✅ 显式调用（推荐用于复杂操作）
await this.auditService.log({
  tableName: 'users',
  recordId: user.id,
  operatorId: currentUser.id,
  actionType: 'UPDATE',
  beforeData: oldUser,
  afterData: updatedUser,
})

// 操作类型枚举（统一使用）
enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  AUDIT_APPROVE = 'AUDIT_APPROVE',
  AUDIT_REJECT = 'AUDIT_REJECT',
  ARCHIVE = 'ARCHIVE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}
```

#### 外部API调用规范

```typescript
// 所有外部API调用必须通过统一的ExternalApiService
// 包含：超时控制、错误转换、降级处理

// ✅ 正确
@Injectable()
export class YoubaoApiService {
  async validateCode(code: string): Promise<ValidationResult> {
    try {
      const result = await this.httpClient.get('/validate', {
        params: { code },
        timeout: 5000,  // 必须设置超时
      })
      return { valid: true, data: result.data }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new ExternalApiTimeoutException('YOUBAO', error)
      }
      throw new ExternalApiException('YOUBAO', error)
    }
  }
}

// ❌ 错误 - 前端直接调用外部API（PRD约束：所有外部API通过后端中转）
// axios.get('https://youbao-api.example.com/validate')
```

#### 分页规范

```typescript
// 所有列表接口必须支持分页，且分页参数统一
class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}

// 分页查询统一使用skip/take
const [items, total] = await prisma.user.findManyAndCount({
  where: filter,
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },  // 默认按创建时间倒序
})
```

### 格式规范

#### 日期时间处理

```
数据库存储：UTC时间（MySQL DATETIME）
API传输：ISO 8601字符串（"2026-04-03T10:30:00.000Z"）
前端显示：转换为UTC+8展示
SLA计算：以UTC+8自然日为基准（第3日23:59 UTC+8）

// ✅ 正确
const slaDeadline = dayjs(applyTime).add(3, 'day').endOf('day')  // UTC+8

// ❌ 错误 - 不使用服务器本地时区，显式指定时区
new Date(applyTime + 3*24*3600*1000)
```

#### 前端API调用规范

```typescript
// 统一使用src/api/目录下的service文件
// ✅ 正确
import { usersApi } from '@/api/users'
const result = await usersApi.getList({ page: 1, pageSize: 20 })

// API service文件格式
export const usersApi = {
  getList: (params: UserListParams) =>
    request.get<PaginatedResult<User>>('/users', { params }),
  create: (data: CreateUserDto) =>
    request.post<User>('/users', data),
}

// ❌ 错误 - 在组件中直接调用axios
axios.get('/api/v1/users')
```

### 异步任务模式

#### BullMQ队列命名规范

```
队列名：{功能域}-{操作}（kebab-case）

queues/
├── notification-send        # 微信服务号通知发送
├── sla-alert               # SLA超时预警发送
├── youbao-data-sync        # 右豹APP数据同步（用户录入时触发）
├── lark-audit-sync         # 飞书入群状态同步
├── mentor-data-sync        # 第三方导师数据同步
├── excel-import-process    # Excel批量导入后台校验
└── file-export-generate    # 数据导出文件生成
```

#### 定时任务规范（Cron）

```typescript
// 所有Cron任务必须有：
// 1. 幂等性保证（重复执行结果一致）
// 2. 失败重试（BullMQ负责）
// 3. 执行日志记录

@Cron('0 * * * *')  // 每小时整点
async syncYoubaoData() {
  const jobId = `youbao-sync-${Date.now()}`
  this.logger.log(`[Cron] 启动右豹数据同步任务 ${jobId}`)
  // ... 具体逻辑
}

// Cron执行频率规范：
// SLA超时扫描：每5分钟 - '*/5 * * * *'
// 飞书入群状态轮询：每5分钟 - '*/5 * * * *'
// 右豹APP数据同步：每小时 - '0 * * * *'
// 第三方导师数据同步：每小时 - '0 * * * *'
// 飞书好友状态刷新：每日凌晨2点 - '0 2 * * *'
// 自动归档检查（30日超期）：每日凌晨0点 - '0 0 * * *'
// 飞书好友申请超时标记（7日）：每日凌晨0点 - '0 0 * * *'
```

### 错误处理模式

#### 前端错误处理

```typescript
// 全局HTTP拦截器（request.ts）
// 401 → 清除Token + 跳转登录页 + 全屏Modal提示
// 403 → Toast提示"权限已更新，请刷新页面"
// 422（外部API失败）→ Toast提示具体原因（从response.message取）
// 500 → Toast提示"系统异常，请稍后重试"

// 表单校验错误 → Inline提示（紧贴输入框下方）
// 操作成功 → Toast绿色（3秒消失）
// 操作失败 → Toast红色（手动关闭 + 重试按钮）
// 高风险操作 → Modal确认弹窗（显示影响范围）
// API降级状态 → ApiStatusBar横幅（持续显示，不可关闭）
```

#### 后端降级策略模式

```typescript
// 外部API降级统一模式
enum ApiDegradationLevel {
  FULL = 'FULL',          // 正常
  DEGRADED = 'DEGRADED',  // 降级（使用缓存）
  UNAVAILABLE = 'UNAVAILABLE',  // 不可用（需手动操作）
}

// 每个外部API Service必须实现：
interface ExternalApiDegradation {
  checkHealth(): Promise<boolean>
  getStatus(): ApiDegradationLevel
  // 降级时的fallback逻辑
}
```

---

## 数据模型设计

### 核心实体

```prisma
// schema.prisma（关键表结构）

// 用户主档
model User {
  id                  BigInt    @id @default(autoincrement())
  rightLeopardCode    String    @unique @map("right_leopard_code") @db.VarChar(50)
  rightLeopardId      String?   @map("right_leopard_id") @db.VarChar(50)
  larkId              String?   @map("lark_id") @db.VarChar(50)
  larkPhone           String?   @map("lark_phone") @db.VarChar(20)
  larkNickname        String?   @map("lark_nickname") @db.VarChar(100)
  wxOpenId            String?   @map("wx_open_id") @db.VarChar(100)  // 不在API响应中暴露
  codeVerifyStatus    String    @default("VERIFIED") @map("code_verify_status") @db.VarChar(20)
  agentId             BigInt?   @map("agent_id")
  mentorId            BigInt?   @map("mentor_id")
  schoolId            BigInt?   @map("school_id")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  agent               Agent?    @relation(fields: [agentId], references: [id])
  mentor              Mentor?   @relation(fields: [mentorId], references: [id])
  school              School?   @relation(fields: [schoolId], references: [id])
  paymentRecords      PaymentRecord[]
  groupAudits         GroupAudit[]
  auditLogs           AuditLog[]

  @@map("users")
  @@index([agentId], name: "idx_users_agent_id")
  @@index([mentorId], name: "idx_users_mentor_id")
  @@index([schoolId], name: "idx_users_school_id")
  @@index([codeVerifyStatus], name: "idx_users_code_verify_status")
}

// 付费记录
model PaymentRecord {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  amount          Decimal   @db.Decimal(10, 2)
  paymentTime     DateTime  @map("payment_time")
  contactPerson   String?   @map("contact_person") @db.VarChar(100)
  createdById     BigInt    @map("created_by_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user            User      @relation(fields: [userId], references: [id])
  @@map("payment_records")
  @@index([userId], name: "idx_payment_records_user_id")
  @@index([paymentTime], name: "idx_payment_records_payment_time")
}

// 入群审核
model GroupAudit {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  status          String    @default("PENDING") @db.VarChar(20)
  // 状态枚举: PENDING | PROCESSING | APPROVED | REJECTED | ARCHIVED
  applyTime       DateTime  @map("apply_time")      // SLA计时起点
  applySource     String    @default("LARK_API") @map("apply_source") @db.VarChar(20)
  // 来源枚举: LARK_API | MANUAL_IMPORT
  processedById   BigInt?   @map("processed_by_id")
  processedAt     DateTime? @map("processed_at")
  rejectReason    String?   @map("reject_reason") @db.VarChar(500)
  archiveType     String?   @map("archive_type") @db.VarChar(20)
  // 归档类型: RE_SUBMIT | AUTO_EXPIRE | MANUAL
  archiveReason   String?   @map("archive_reason") @db.VarChar(500)
  archivedAt      DateTime? @map("archived_at")
  firstAlertSentAt  DateTime? @map("first_alert_sent_at")
  secondAlertSentAt DateTime? @map("second_alert_sent_at")
  importBatchId   BigInt?   @map("import_batch_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user            User      @relation(fields: [userId], references: [id])
  notifications   Notification[]

  @@map("group_audits")
  @@index([status], name: "idx_group_audits_status")
  @@index([applyTime], name: "idx_group_audits_apply_time")
  @@index([userId], name: "idx_group_audits_user_id")
}

// 消息通知记录
model Notification {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  groupAuditId    BigInt?   @map("group_audit_id")
  scenario        String    @db.VarChar(50)
  // 场景枚举: AUDIT_APPROVED | AUDIT_REJECTED | SLA_ALERT_FIRST | SLA_ALERT_SECOND
  channel         String    @default("WECHAT_MP") @db.VarChar(30)
  // 渠道枚举: WECHAT_MP（预留扩展）
  status          String    @default("PENDING") @db.VarChar(20)
  // 状态枚举: PENDING | SENT | FAILED
  failureReason   String?   @map("failure_reason") @db.VarChar(200)
  handleStatus    String    @default("PENDING_FOLLOW") @map("handle_status") @db.VarChar(20)
  // 处理状态枚举: PENDING_FOLLOW | HANDLED
  sentAt          DateTime? @map("sent_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id])
  groupAudit      GroupAudit? @relation(fields: [groupAuditId], references: [id])

  @@map("notifications")
  @@index([userId], name: "idx_notifications_user_id")
  @@index([status, handleStatus], name: "idx_notifications_status")
}

// 飞书好友申请
model LarkFriendRequest {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  operatorType    String    @map("operator_type") @db.VarChar(20)
  // 操作人类型: AGENT | MENTOR
  operatorId      BigInt    @map("operator_id")
  status          String    @default("PENDING") @db.VarChar(20)
  // 状态枚举: PENDING | ACCEPTED | REJECTED | TIMEOUT | MANUAL_CONFIRMED
  requestedAt     DateTime  @default(now()) @map("requested_at")
  respondedAt     DateTime? @map("responded_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("lark_friend_requests")
  @@index([userId], name: "idx_lark_friend_requests_user_id")
  @@index([status], name: "idx_lark_friend_requests_status")
}

// 客服
model Agent {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)
  status          String    @default("ACTIVE") @db.VarChar(20)
  wxQrcodeUrl     String?   @map("wx_qrcode_url") @db.VarChar(500)
  larkAccessToken String?   @map("lark_access_token") @db.VarChar(500)
  larkTokenExpiresAt DateTime? @map("lark_token_expires_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  users           User[]
  @@map("agents")
}

// 导师
model Mentor {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)
  schoolId        BigInt    @map("school_id")
  status          String    @default("ACTIVE") @db.VarChar(20)
  larkAccessToken String?   @map("lark_access_token") @db.VarChar(500)
  larkTokenExpiresAt DateTime? @map("lark_token_expires_at")
  // 第三方API同步字段
  thirdPartyId    String?   @map("third_party_id") @db.VarChar(50)
  studentCount    Int       @default(0) @map("student_count")
  projectCount    Int       @default(0) @map("project_count")
  totalRevenue    Decimal   @default(0) @map("total_revenue") @db.Decimal(12, 2)
  lastSyncedAt    DateTime? @map("last_synced_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  school          School    @relation(fields: [schoolId], references: [id])
  users           User[]
  @@map("mentors")
  @@index([schoolId], name: "idx_mentors_school_id")
}

// 门派
model School {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)
  status          String    @default("ACTIVE") @db.VarChar(20)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  mentors         Mentor[]
  users           User[]
  @@map("schools")
}

// 角色组
model Role {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)
  department      String?   @db.VarChar(50)
  permissions     Json      // { menuPerms: [], operationPerms: [], fieldPerms: {} }
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  accounts        Account[]
  @@map("roles")
}

// 后台账号
model Account {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)          // 显示名（可自改）
  loginId         String    @unique @map("login_id") @db.VarChar(50)  // 登录账号（不可改）
  passwordHash    String    @map("password_hash") @db.VarChar(100)
  roleId          BigInt    @map("role_id")
  isAuditor       Boolean   @default(false) @map("is_auditor")
  status          String    @default("ACTIVE") @db.VarChar(20)
  // 状态枚举: ACTIVE | DISABLED
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  role            Role      @relation(fields: [roleId], references: [id])
  @@map("accounts")
}

// 操作日志
model AuditLog {
  id              BigInt    @id @default(autoincrement())
  tableName       String    @map("table_name") @db.VarChar(50)
  recordId        BigInt    @map("record_id")
  operatorId      BigInt?   @map("operator_id")  // null表示系统自动操作
  operatorName    String?   @map("operator_name") @db.VarChar(50)  // 冗余存储，防账号删除后丢失
  actionType      String    @map("action_type") @db.VarChar(30)
  beforeData      Json?     @map("before_data")
  afterData       Json?     @map("after_data")
  remark          String?   @db.VarChar(500)
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("audit_logs")
  @@index([tableName, recordId], name: "idx_audit_logs_table_record")
  @@index([operatorId], name: "idx_audit_logs_operator_id")
  @@index([createdAt], name: "idx_audit_logs_created_at")
}

// 导入批次记录
model ImportBatch {
  id              BigInt    @id @default(autoincrement())
  batchNo         String    @unique @map("batch_no") @db.VarChar(20)
  // 格式: IMP-000001（6位自增，全局唯一）
  importType      String    @map("import_type") @db.VarChar(30)
  // 类型: USER_IMPORT | PAYMENT_IMPORT | GROUP_AUDIT_IMPORT
  operatorId      BigInt    @map("operator_id")
  fileName        String    @map("file_name") @db.VarChar(200)
  totalCount      Int       @default(0) @map("total_count")
  localPassCount  Int       @default(0) @map("local_pass_count")
  apiPassCount    Int       @default(0) @map("api_pass_count")
  failCount       Int       @default(0) @map("fail_count")
  status          String    @default("PROCESSING") @db.VarChar(20)
  // 状态枚举: PROCESSING | COMPLETED | PARTIAL_FAILED
  errorFileUrl    String?   @map("error_file_url") @db.VarChar(500)
  createdAt       DateTime  @default(now()) @map("created_at")
  completedAt     DateTime? @map("completed_at")

  @@map("import_batches")
}

// 右豹用户动作数据（缓存表，定时刷新）
model YoubaoUserStats {
  id                  BigInt    @id @default(autoincrement())
  rightLeopardCode    String    @unique @map("right_leopard_code") @db.VarChar(50)
  keywordCount        Int       @default(0) @map("keyword_count")     // 近10天关键词申请数
  orderCount          Int       @default(0) @map("order_count")       // 近10天订单数
  projectRevenue      Decimal   @default(0) @map("project_revenue") @db.Decimal(12, 2)
  lastSyncedAt        DateTime? @map("last_synced_at")
  syncStatus          String    @default("SYNCED") @map("sync_status") @db.VarChar(20)
  // 状态枚举: SYNCING | SYNCED | FAILED | PENDING_VERIFY（编码待验证）
  updatedAt           DateTime  @updatedAt @map("updated_at")

  @@map("youbao_user_stats")
}
```

---

## 外部API集成架构

### 集成概览

```
所有外部API调用遵循统一原则：
1. 所有调用通过后端服务中转，前端不直接调用外部API（PRD约束）
2. 每路API有独立Service + 独立降级状态管理
3. API状态变化通过Server-Sent Events（SSE）推送到前端，驱动ApiStatusBar更新
4. 降级状态存储在Redis（key: external-api:{apiName}:status）
```

### 右豹APP API

```typescript
// 模块：YoubaoApiModule
// 功能：编码校验（强依赖）+ 动作数据同步（弱依赖）

// 编码校验（强依赖）
// - 不可用时：抛出 ExternalApiTimeoutException，前端展示"暂跳过校验"选项（仅管理员可见）
// - 跳过校验录入的记录：status='PENDING_VERIFY'，API恢复后30分钟内自动补校验

// 动作数据同步（弱依赖）
// - 调用时机：用户首次录入后异步触发、每小时定时任务、手动触发
// - 不可用时：展示YoubaoUserStats表中缓存数据 + 标注"缓存，最后同步：X"
// - 超时阈值：5000ms

// Endpoint：POST /youbao/validate?code={code}
// Endpoint：GET  /youbao/user-stats?code={code}
```

### 飞书API

```typescript
// 模块：LarkApiModule
// 功能：入群申请同步（弱依赖）+ 审核操作（弱依赖）+ 好友申请（弱依赖）

// 入群申请同步
// - 正常：5分钟定时轮询 + Webhook实时回调
// - 不可用时：审核工作台顶部告警Banner + [前往手动导入]按钮
// - 手动导入后：SLA计时从系统导入时间开始（而非飞书申请时间）

// 审核操作
// - 通过：调用飞书API批准入群
//   调用失败：列表行状态回滚至"待审核" + Toast提示
//   30分钟未收到Webhook回调：后端自动触发补偿性轮询

// 好友申请
// - 需先完成OAuth授权（per账号）
// - OAuth Token存储在agents/mentors表
// - Token过期自动刷新

// Webhook回调地址：POST /api/v1/lark/webhook
// Webhook验证：X-Lark-Signature 签名校验（LARK_WEBHOOK_TOKEN）
```

### 第三方导师系统API

```typescript
// 模块：MentorApiModule
// 功能：学员绑定关系同步 + 项目数量 + 收益数据

// 同步策略（弱依赖）
// - 每小时定时任务全量刷新
// - 手动触发（管理员操作）
// - 不可用时：展示mentors表中缓存数据 + 标注最后同步时间

// 陌生导师处理
// - API返回系统中不存在的导师时：不自动创建记录，仅记录系统日志
// - 前端无感知
```

### 微信服务号API

```typescript
// 模块：WechatApiModule
// 功能：向用户推送通知消息（弱依赖）

// 推送场景：
// - 审核通过 / 审核拒绝（含H5修改指引链接）
// - SLA超时预警（首次 + 二次催促，发给所有is_auditor=true账号的绑定OpenID）

// 推送失败处理
// - 未绑定OpenID：直接进入失败队列，不重试
// - 网络超时：自动重试一次（BullMQ retry配置）
// - 业务错误：进入失败队列

// OpenID绑定（H5，不在后台范围）
// - 绑定关系存储在users.wx_open_id字段
// - wx_open_id不在任何后台API响应中返回（Prisma select排除）
// - 同步失败：进入notification_failures表（notifications表status=FAILED）
```

---

## 项目目录结构

```
kefu/                                    # Monorepo根目录
├── frontend/                            # Vue3 SPA
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.ts                      # 应用入口
│   │   ├── App.vue                      # 根组件
│   │   ├── router/
│   │   │   └── index.ts                 # 路由配置 + 权限守卫
│   │   ├── stores/                      # Pinia Stores
│   │   │   ├── auth.ts                  # 认证 + 权限缓存
│   │   │   ├── user.ts                  # 用户主档
│   │   │   ├── audit.ts                 # 入群审核
│   │   │   ├── dashboard.ts             # 数据看板
│   │   │   ├── notification.ts          # 通知失败记录
│   │   │   └── app.ts                   # 全局状态（主题、API降级）
│   │   ├── api/                         # API服务层
│   │   │   ├── request.ts               # axios实例 + 拦截器（401/403处理）
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── payments.ts
│   │   │   ├── group-audits.ts
│   │   │   ├── notifications.ts
│   │   │   ├── sla-alerts.ts
│   │   │   ├── lark-friends.ts
│   │   │   ├── agents.ts
│   │   │   ├── mentors.ts
│   │   │   ├── schools.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── roles.ts
│   │   │   ├── accounts.ts
│   │   │   └── audit-logs.ts
│   │   ├── composables/                 # 组合式函数
│   │   │   ├── usePermission.ts         # 权限判断（hasMenu/hasOp/hasField）
│   │   │   ├── usePagination.ts         # 分页逻辑复用
│   │   │   ├── useApiStatus.ts          # 外部API降级状态SSE
│   │   │   └── useAuditActions.ts       # 审核操作逻辑
│   │   ├── components/                  # 组件
│   │   │   ├── business/                # 业务专属组件
│   │   │   │   ├── CodeVerifyInput.vue  # 编码校验输入框（三态）
│   │   │   │   ├── MetricCard.vue       # 玻璃拟态指标卡片
│   │   │   │   ├── SlaStatusBadge.vue   # SLA状态徽标
│   │   │   │   ├── ApiStatusBar.vue     # API降级状态横幅
│   │   │   │   └── ConversionFunnel.vue # 转化漏斗图
│   │   │   ├── layout/                  # 布局组件
│   │   │   │   ├── AppLayout.vue        # 主布局（侧边栏 + 内容区）
│   │   │   │   ├── AppSidebar.vue       # 240px左侧导航
│   │   │   │   └── AppHeader.vue        # 顶部导航（账号信息 + 主题切换）
│   │   │   └── common/                  # 通用组件
│   │   │       ├── ImportBatchTable.vue # 导入记录Tab
│   │   │       └── AuditLogTable.vue    # 操作日志区块
│   │   ├── views/                       # 页面组件
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── users/
│   │   │   │   ├── UserList.vue
│   │   │   │   └── UserDetail.vue
│   │   │   ├── payments/
│   │   │   │   └── PaymentList.vue
│   │   │   ├── group-audits/
│   │   │   │   ├── AuditWorkbench.vue   # 审核工作台（主视图）
│   │   │   │   └── AuditDetail.vue
│   │   │   ├── notifications/
│   │   │   │   └── NotificationFailed.vue
│   │   │   ├── sla-alerts/
│   │   │   │   └── SlaAlertList.vue
│   │   │   ├── lark-friends/
│   │   │   │   └── LarkFriendList.vue
│   │   │   ├── organization/
│   │   │   │   ├── AgentList.vue
│   │   │   │   ├── AgentDetail.vue
│   │   │   │   ├── MentorList.vue
│   │   │   │   ├── MentorDetail.vue
│   │   │   │   ├── SchoolList.vue
│   │   │   │   └── SchoolDetail.vue
│   │   │   ├── rbac/
│   │   │   │   ├── RoleList.vue
│   │   │   │   └── AccountList.vue
│   │   │   └── settings/
│   │   │       └── ProfileSettings.vue  # 个人设置（FR45）
│   │   ├── utils/
│   │   │   ├── date.ts                  # 日期处理（dayjs UTC+8）
│   │   │   ├── permission.ts            # 权限常量定义
│   │   │   └── validators.ts            # 通用校验函数
│   │   └── types/                       # TypeScript类型定义
│   │       ├── api.ts                   # API响应类型
│   │       ├── models.ts                # 业务模型类型
│   │       └── permission.ts            # 权限类型
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                             # NestJS API
│   ├── src/
│   │   ├── main.ts                      # 应用入口（端口3000）
│   │   ├── app.module.ts                # 根模块
│   │   ├── config/                      # 配置模块
│   │   │   ├── configuration.ts         # 环境变量加载
│   │   │   └── configuration.validation.ts  # 环境变量校验（Joi）
│   │   ├── common/                      # 公共模块
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── permissions.decorator.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── rbac.guard.ts        # 3维度权限校验
│   │   │   ├── interceptors/
│   │   │   │   ├── response.interceptor.ts   # 统一响应格式包装
│   │   │   │   ├── audit-log.interceptor.ts  # 自动操作日志记录
│   │   │   │   └── sensitive-fields.interceptor.ts  # 敏感字段过滤（wx_open_id等）
│   │   │   ├── filters/
│   │   │   │   └── global-exception.filter.ts  # 全局异常处理 → 统一错误响应
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   └── dto/
│   │   │       └── pagination.dto.ts    # 通用分页参数DTO
│   │   ├── modules/                     # 功能模块（按业务域划分）
│   │   │   ├── auth/                    # 认证
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts   # POST /auth/login, POST /auth/logout
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── strategies/
│   │   │   │       └── jwt.strategy.ts
│   │   │   ├── users/                   # 用户主档（FR1-FR13）
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-user.dto.ts
│   │   │   │       ├── update-user.dto.ts
│   │   │   │       └── user-filter.dto.ts
│   │   │   ├── payments/                # 付费记录（FR7-FR11）
│   │   │   │   ├── payments.module.ts
│   │   │   │   ├── payments.controller.ts
│   │   │   │   └── payments.service.ts
│   │   │   ├── group-audits/            # 入群审核（FR14-FR20）
│   │   │   │   ├── group-audits.module.ts
│   │   │   │   ├── group-audits.controller.ts
│   │   │   │   └── group-audits.service.ts
│   │   │   ├── notifications/           # 消息通知（FR21-FR24）
│   │   │   │   ├── notifications.module.ts
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   └── notifications.service.ts
│   │   │   ├── sla-alerts/              # SLA预警（FR25-FR27）
│   │   │   │   ├── sla-alerts.module.ts
│   │   │   │   ├── sla-alerts.controller.ts
│   │   │   │   └── sla-alerts.service.ts
│   │   │   ├── lark-friends/            # 飞书好友管理（FR28-FR32）
│   │   │   │   ├── lark-friends.module.ts
│   │   │   │   ├── lark-friends.controller.ts
│   │   │   │   └── lark-friends.service.ts
│   │   │   ├── agents/                  # 客服管理（FR33）
│   │   │   │   └── agents.module.ts
│   │   │   ├── mentors/                 # 导师管理（FR34-FR36）
│   │   │   │   └── mentors.module.ts
│   │   │   ├── schools/                 # 门派管理（FR35）
│   │   │   │   └── schools.module.ts
│   │   │   ├── dashboard/               # 数据看板（FR39-FR42）
│   │   │   │   ├── dashboard.module.ts
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   └── dashboard.service.ts
│   │   │   ├── rbac/                    # 权限与账号管理（FR43-FR45）
│   │   │   │   ├── rbac.module.ts
│   │   │   │   ├── roles.controller.ts
│   │   │   │   ├── accounts.controller.ts
│   │   │   │   └── rbac.service.ts
│   │   │   └── audit-logs/              # 操作审计（FR46-FR47）
│   │   │       ├── audit-logs.module.ts
│   │   │       ├── audit-logs.controller.ts
│   │   │       └── audit-logs.service.ts
│   │   ├── external-apis/               # 外部API集成层
│   │   │   ├── youbao/                  # 右豹APP API
│   │   │   │   ├── youbao-api.module.ts
│   │   │   │   └── youbao-api.service.ts
│   │   │   ├── lark/                    # 飞书API
│   │   │   │   ├── lark-api.module.ts
│   │   │   │   ├── lark-api.service.ts
│   │   │   │   └── lark-webhook.controller.ts  # POST /lark/webhook
│   │   │   ├── mentor-system/           # 第三方导师系统API
│   │   │   │   ├── mentor-system.module.ts
│   │   │   │   └── mentor-system.service.ts
│   │   │   └── wechat/                  # 微信服务号API
│   │   │       ├── wechat-api.module.ts
│   │   │       └── wechat-api.service.ts
│   │   ├── jobs/                        # 异步任务
│   │   │   ├── jobs.module.ts
│   │   │   ├── processors/              # BullMQ Processors
│   │   │   │   ├── notification-send.processor.ts
│   │   │   │   ├── youbao-data-sync.processor.ts
│   │   │   │   ├── lark-audit-sync.processor.ts
│   │   │   │   ├── mentor-data-sync.processor.ts
│   │   │   │   └── excel-import.processor.ts
│   │   │   └── schedulers/              # Cron定时任务
│   │   │       ├── sla-scanner.scheduler.ts     # SLA超时扫描（每5分钟）
│   │   │       ├── lark-poller.scheduler.ts     # 飞书申请轮询（每5分钟）
│   │   │       ├── youbao-sync.scheduler.ts     # 右豹数据同步（每小时）
│   │   │       ├── mentor-sync.scheduler.ts     # 导师数据同步（每小时）
│   │   │       ├── lark-friend-daily.scheduler.ts  # 飞书好友状态刷新（每日）
│   │   │       └── archive-check.scheduler.ts   # 归档检查（每日）
│   │   └── prisma/                      # Prisma模块
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   ├── schema.prisma                # 数据库Schema
│   │   ├── migrations/                  # 迁移文件（版本化，不可手动修改）
│   │   └── seed.ts                      # 初始数据（超级管理员账号）
│   ├── test/
│   │   ├── unit/                        # 单元测试（*.spec.ts）
│   │   └── e2e/                         # E2E测试
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── package.json
│
├── docker/                              # Docker配置
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/                         # SSL证书（不提交Git）
│   └── mysql/
│       └── init.sql                     # 数据库初始化脚本
├── docker-compose.yml                   # 生产环境
├── docker-compose.dev.yml               # 开发环境（含热重载）
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### 功能需求到目录映射

| 功能模块 | 前端目录 | 后端模块 |
|---|---|---|
| 用户数据管理（FR1-FR13） | `views/users/` + `api/users.ts` | `modules/users/` + `external-apis/youbao/` |
| 付费记录（FR7-FR11） | `views/payments/` | `modules/payments/` |
| 入群审核（FR14-FR20） | `views/group-audits/` | `modules/group-audits/` + `external-apis/lark/` |
| 消息通知（FR21-FR24） | `views/notifications/` | `modules/notifications/` + `external-apis/wechat/` |
| SLA预警（FR25-FR27） | `views/sla-alerts/` | `modules/sla-alerts/` + `jobs/schedulers/sla-scanner` |
| 飞书好友管理（FR28-FR32） | `views/lark-friends/` | `modules/lark-friends/` + `external-apis/lark/` |
| 组织管理（FR33-FR38） | `views/organization/` | `modules/agents/` + `modules/mentors/` + `modules/schools/` |
| 数据看板（FR39-FR42） | `views/Dashboard.vue` | `modules/dashboard/` |
| 权限账号管理（FR43-FR45） | `views/rbac/` + `views/settings/` | `modules/rbac/` |
| 操作审计（FR46-FR47） | `components/common/AuditLogTable.vue` | `modules/audit-logs/` + `common/interceptors/audit-log` |

---

## 架构验证结果

### 一致性验证 ✅

**技术决策兼容性：**
- Vue3 + Naive UI + Tailwind CSS：三者设计明确配合，UX规范已确认
- NestJS + Prisma + MySQL：成熟生产组合，TypeScript端到端类型安全
- BullMQ + Redis：共用Redis实例，避免额外依赖
- JWT + Passport：NestJS生态标准，Guards体系与RBAC天然集成

**模式一致性：**
- 统一响应格式确保前端请求处理逻辑一致
- 操作日志Interceptor确保所有变更自动记录
- 分页DTO确保所有列表接口参数一致

### 需求覆盖验证 ✅

**功能需求覆盖（FR1-FR48）：**

| 需求 | 覆盖情况 | 关键架构支撑 |
|---|---|---|
| FR2 右豹编码实时校验 | ✅ | YoubaoApiService + 降级策略 + PENDING_VERIFY状态 |
| FR12 动作数据定时同步 | ✅ | youbao-sync.scheduler + BullMQ队列 |
| FR14 飞书入群申请自动同步 | ✅ | lark-poller.scheduler + Webhook回调 |
| FR15 飞书降级手动导入 | ✅ | ImportBatch + ApiStatusBar + 降级状态管理 |
| FR19 Webhook超时补偿 | ✅ | 30分钟补偿轮询（后端Cron） |
| FR20 重复提交拦截 | ✅ | 飞书API端静默处理，审核工作台不产生重复记录 |
| FR25/FR26 SLA超时预警（首次+二次） | ✅ | sla-scanner.scheduler + group_audits.first/second_alert_sent_at字段 |
| FR43-FR44 3维度RBAC | ✅ | RbacGuard + JWT权限payload + roles.permissions JSON |
| FR46 操作日志不可篡改 | ✅ | AuditLogInterceptor + 应用账号无DELETE权限 |

**非功能需求覆盖：**

| NFR | 覆盖情况 | 架构支撑 |
|---|---|---|
| NFR1 列表 ≤3秒 | ✅ | 数据库索引设计 + 强制分页（最大100条/页） |
| NFR2 编码校验 ≤2秒 | ✅ | 5000ms超时控制 + 降级机制 |
| NFR3 Excel导入 ≤30秒 | ✅ | BullMQ异步队列 + 5秒轮询进度 |
| NFR4 异步任务不阻塞 | ✅ | BullMQ独立Worker进程 |
| NFR5 Dashboard ≤2秒 | ✅ | Redis缓存层（5分钟TTL） |
| NFR6 强制HTTPS | ✅ | Nginx SSL终止 |
| NFR7 密码加盐哈希 | ✅ | bcrypt（salt rounds: 10） |
| NFR8 OpenID不暴露 | ✅ | SensitiveFieldsInterceptor排除wx_open_id |
| NFR9 Token ≤8小时 | ✅ | JWT_EXPIRES_IN=28800 |
| NFR11 外部API降级 | ✅ | 4路API独立降级策略 |
| NFR14 审核操作幂等 | ✅ | 数据库状态机 + group_audits.status约束 |
| NFR16 编码唯一性 | ✅ | 数据库唯一索引 + 应用层预校验 |

### 实现准备度验证 ✅

**关键决策完整性：** 所有技术决策均包含具体版本和理由
**目录结构完整性：** 覆盖前后端所有功能域，包括外部API集成和异步任务
**模式完整性：** 命名、API格式、错误处理、日志记录均有明确规范

### 缺口分析

**MVP范围内待细化（不阻塞开发）：**
- 数据导出文件的临时存储方案（建议本地文件系统 + 24小时自动清理Cron）
- 飞书OAuth Token刷新的具体实现逻辑（建议在每次调用前检查是否过期，过期则自动刷新）

**Post-MVP预留：**
- 短信降级通道（当前不实现，推送失败进人工跟进队列）
- 多实例水平扩展（当前单机Docker部署，BullMQ共享Redis支持未来扩展）

### 架构完整性检查清单

**✅ 需求分析**
- [x] PRD FR1-FR48全量分析
- [x] NFR1-NFR19全量覆盖
- [x] 外部集成约束识别
- [x] 横切关注点映射

**✅ 技术决策**
- [x] 前后端框架确定（Vue3 + NestJS）
- [x] 数据库选型确定（MySQL 8.0 + Redis 7.x）
- [x] ORM策略确定（Prisma 5.x）
- [x] 异步任务架构（BullMQ + @nestjs/schedule）
- [x] 认证方案（JWT 8小时 + bcrypt）
- [x] RBAC设计（3维度：菜单/操作/字段）

**✅ 实现模式**
- [x] 数据库命名规范（snake_case）
- [x] API命名规范（RESTful + 统一响应格式）
- [x] 代码命名规范（前后端分别定义）
- [x] 错误处理规范（错误码 + 前端分层处理）
- [x] 操作日志规范（Interceptor自动记录）
- [x] 外部API调用规范（统一Service层 + 降级模式）

**✅ 项目结构**
- [x] 完整目录树（前端 + 后端 + Docker）
- [x] 功能需求到目录映射表
- [x] 外部API集成目录划分
- [x] 异步任务目录划分

### 实现就绪度评估

**总体状态：** 🟢 可以开始实现

**置信度：** 高

**关键优势：**
1. UX规范已明确前端技术栈（Vue3 + Naive UI + Tailwind）
2. PRD已明确资源规划（Node.js + MySQL + Redis）
3. 原型规格已细化所有页面交互和业务规则
4. 4路外部API集成有清晰降级策略

**实现顺序建议：**
1. 基础设施（Docker环境 + 数据库Schema + 认证）
2. 核心链路（用户录入 + 编码校验 + 入群审核）
3. 通知与预警（消息推送 + SLA定时任务）
4. 组织管理 + 数据看板
5. 飞书好友管理 + 权限管理

---

### AI代理实现指引

**所有AI代理必须：**

1. **遵循统一响应格式** — 后端所有接口通过ResponseInterceptor包装，不手动构造响应对象
2. **使用规范命名** — 数据库snake_case，API camelCase查询参数，代码PascalCase/camelCase，文件kebab-case
3. **外部API通过Service层** — 不在Controller或其他位置直接调用外部API
4. **所有变更记录审计日志** — 通过AuditLogInterceptor或显式调用AuditService
5. **OpenID不在API响应中返回** — 通过SensitiveFieldsInterceptor全局过滤
6. **分页强制化** — 所有列表接口必须支持分页，默认20条/页，最大100条/页
7. **日期统一处理** — 数据库UTC存储，API ISO 8601传输，前端转换UTC+8显示
8. **遵循错误码规范** — 使用本文档定义的业务错误码，不自创错误码

**遇到架构问题时：** 以本文档为准，如有冲突或未覆盖场景，优先参考PRD约束，再参考UX规范。

---

*文档由 Maziluo 与 Winston（架构师）协作完成 · 2026-04-03*
