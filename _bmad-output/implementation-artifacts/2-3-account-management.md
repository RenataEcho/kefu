# Story 2.3：后台账号管理（创建/禁用/删除）

Status: review

## Story

作为**超级管理员**，
我希望能够创建和管理团队成员的后台账号，包括分配角色和设置审核员属性，
以便团队成员可以使用合适的权限登录并使用系统。

## Acceptance Criteria

1. **Given** 管理员在权限与账号管理页  
   **When** 填写账号信息（账号名、登录ID、初始密码、所属角色组、是否为审核员）并提交  
   **Then** 账号成功创建，密码以 bcrypt 哈希存储，`is_auditor` 属性正确记录；`loginId` 唯一（重复时返回 409）

2. **Given** 已创建的账号  
   **When** 管理员将其状态设为「禁用」  
   **Then** 该账号持有人后续登录请求返回 HTTP 401；已颁发的 Token 在下次请求时经 JwtStrategy 验证账号状态而失效

3. **Given** 已禁用的账号  
   **When** 管理员删除该账号  
   **Then** 账号成功删除；该账号产生的历史 `audit_logs` 记录**保留不删除**（`operatorName` 冗余存储保障追溯性）

4. **Given** 尚未禁用的账号  
   **When** 管理员尝试直接删除  
   **Then** 系统拒绝，返回 HTTP 400，提示「请先禁用账号后再删除」

5. **Given** 账号列表  
   **When** 管理员查看  
   **Then** 支持按角色组、审核员属性筛选；分页 20 条/页；列表字段：登录ID、显示名、所属角色、审核员、状态、创建时间

6. **Given** 管理员查看账号详情  
   **When** API 返回账号信息  
   **Then** 响应**不包含** `password_hash` 字段（满足 NFR7）

## Tasks / Subtasks

- [ ] Task 1: 创建 AccountsModule (AC: #1, #2, #3, #4, #5)
  - [ ] 创建 `backend/src/modules/accounts/accounts.module.ts`
  - [ ] 创建 `backend/src/modules/accounts/accounts.service.ts`
  - [ ] 创建 `backend/src/modules/accounts/accounts.controller.ts`
  - [ ] 创建 DTO：`CreateAccountDto`、`UpdateAccountDto`、`AccountListQueryDto`

- [ ] Task 2: 实现账号 CRUD API (AC: #1, #2, #3, #4, #5, #6)
  - [ ] `GET /api/v1/accounts` → 列表（支持 `roleId`、`isAuditor` 过滤、分页）
  - [ ] `GET /api/v1/accounts/:id` → 详情（**Prisma select 排除 `passwordHash`**）
  - [ ] `POST /api/v1/accounts` → 创建（需 `accounts:manage` 操作权限）
  - [ ] `PATCH /api/v1/accounts/:id` → 更新（名称/角色/审核员/状态）
  - [ ] `DELETE /api/v1/accounts/:id` → 删除（先检查状态为 DISABLED）

- [ ] Task 3: 账号禁用安全检查 (AC: #2, #4)
  - [ ] 删除前检查 `status === 'DISABLED'`，否则 throw BadRequestException「请先禁用账号后再删除」
  - [ ] 禁用后 JWT 失效通过 Story 2.1 的 `JwtStrategy` 每次校验 `status = 'ACTIVE'` 实现（无需额外处理）

- [x] Task 4: 前端账号管理页面 (AC: #1, #2, #3, #4, #5)
  - [x] 实现 `frontend/src/views/AccountsView.vue`（清单 Step 2 指定路由视图；未单独建 `rbac/AccountList.vue`）
  - [x] 账号列表 + 顶部筛选（角色组、审核员）
  - [x] 新建/编辑账号抽屉
  - [x] 禁用/启用、删除操作（删除有二次确认弹窗，显示影响提示）
  - [x] 启用态删除按钮禁用 + Tooltip「请先禁用账号后再删除」；Mock `DELETE` 非禁用返回 400 与相同文案

## Dev Notes

### 账号查询（排除密码字段）

```typescript
// 所有账号查询必须显式排除 passwordHash
const account = await this.prisma.account.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    loginId: true,
    roleId: true,
    isAuditor: true,
    status: true,
    createdAt: true,
    role: { select: { id: true, name: true } },
    // passwordHash: false  ← 不需要写 false，不在 select 中即不返回
  },
})
```

### 创建账号 Service

```typescript
async createAccount(dto: CreateAccountDto) {
  const existing = await this.prisma.account.findUnique({ where: { loginId: dto.loginId } })
  if (existing) {
    throw new ConflictException({ code: 20003, message: '登录ID已存在' })
  }

  const passwordHash = await bcrypt.hash(dto.password, 10)

  return this.prisma.account.create({
    data: {
      name: dto.name,
      loginId: dto.loginId,
      passwordHash,
      roleId: BigInt(dto.roleId),
      isAuditor: dto.isAuditor ?? false,
    },
    select: { id: true, name: true, loginId: true, roleId: true, isAuditor: true, status: true, createdAt: true },
  })
}
```

### 删除前状态检查

```typescript
async deleteAccount(id: bigint) {
  const account = await this.prisma.account.findUnique({ where: { id }, select: { status: true } })
  if (!account) throw new NotFoundException({ code: 10002, message: '账号不存在' })

  if (account.status !== 'DISABLED') {
    throw new BadRequestException({ code: 10001, message: '请先禁用账号后再删除' })
  }

  // 删除账号（audit_logs 保留：operatorName 冗余存储保障追溯）
  await this.prisma.account.delete({ where: { id } })
}
```

### 关键架构规范（不可偏离）

1. **密码查询必须排除**：所有 `findUnique`/`findMany` 账号查询的 `select` 中不包含 `passwordHash`
2. **删除前必须先禁用**：后端 Service 层强制检查，不依赖前端校验
3. **`audit_logs` 冗余存储 `operatorName`**：账号删除后，历史日志仍可显示操作人姓名
4. **操作权限 `accounts:manage`**：所有账号管理 API 需要此权限（通过 `@RequirePermission` 装饰器）

### 前序 Story 依赖

- **Story 2.1**（JWT + 禁用检查）
- **Story 2.2**（RbacGuard + `@RequirePermission`）

### Project Structure Notes

- 账号表设计：[Source: architecture.md#数据模型设计 Account]
- NFR7 密码处理：[Source: architecture.md#需求概览 NFR7]
- FR44 账号删除规格：[Source: epics.md#Story 2.3]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 纯前端交付：`vite-plugin-mock` 实现 `GET/POST/PATCH/DELETE /api/v1/accounts`、`POST .../reset-password`；列表分页 20、筛选 `roleId`/`isAuditor`；创建重复 `loginId` → HTTP 409 +「登录ID已存在」；详情/列表响应不含 `password_hash`。
- 侧栏底部增加「账号管理」入口（`accounts:read`）；写操作依赖 `accounts:manage`。
- Task 1–3（Nest/Prisma 模块）未在本仓库实现，待后端 Story 承接。

### File List

- frontend/src/types/account.ts
- frontend/src/api/accounts.ts
- frontend/src/mock/accounts.ts
- frontend/src/mock/index.ts
- frontend/src/views/AccountsView.vue
- frontend/src/components/layout/AppSidebar.vue
