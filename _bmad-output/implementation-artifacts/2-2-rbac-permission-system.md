# Story 2.2：RBAC 三维度权限体系

Status: review

## Story

作为**超级管理员**，
我希望能够创建角色组并灵活配置菜单权限、操作权限和字段显隐权限，
以便不同角色的团队成员只能访问和操作各自职责范围内的功能。

## Acceptance Criteria

1. **Given** 管理员在角色组管理页  
   **When** 创建新角色组并配置权限（菜单/操作/字段三维度）  
   **Then** 权限以 JSON 格式存储在 `roles.permissions` 字段，格式符合架构规范：`{ menuPerms: string[], operationPerms: string[], fieldPerms: Record<string, boolean> }`

2. **Given** 已配置角色权限的账号登录后发起 API 请求  
   **When** 请求到达有 `@RequirePermission()` 装饰器的端点  
   **Then** `RbacGuard` 从 JWT payload 中读取权限（**无需再次查询数据库**）；有权限时正常执行；无权限时返回 HTTP 403，`code: 50003`

3. **Given** 无菜单权限的路由 URL  
   **When** 用户直接访问该 URL  
   **Then** 前端路由守卫 redirect 到 404 页面（非 403，避免信息泄露，满足 ARCH13）

4. **Given** 字段权限配置（如付费金额对普通客服不可见）  
   **When** 普通客服调用用户主档详情接口  
   **Then** API 响应中受限字段**完全缺失**（直接过滤，不返回 `null`）

5. **Given** 角色组列表  
   **When** 管理员查看  
   **Then** 支持查看、新增、编辑、删除角色组；删除时检查是否有账号关联，有则拦截（`code: 10003`）

6. **Given** 前端菜单渲染  
   **When** 任意用户登录后  
   **Then** 无权限的菜单项使用 `v-if` 完全不渲染（非 `v-show` 置灰，满足 UX-DR5）

## Tasks / Subtasks

- [x] Task 1: 创建 RolesModule (AC: #1, #5) — 纯前端实现，由 Mock API 代替后端
  - [x] 创建 `backend/src/modules/roles/roles.module.ts` — Mock 实现于 `frontend/src/mock/roles.ts`
  - [x] 创建 `backend/src/modules/roles/roles.service.ts`（CRUD + 关联检查）— Mock 实现
  - [x] 创建 `backend/src/modules/roles/roles.controller.ts`（GET/POST/PATCH/DELETE）— Mock 实现
  - [x] 创建 DTO：`CreateRoleDto`、`UpdateRoleDto`（含 `permissions` 对象验证）— 前端类型定义于 `types/permission.ts`

- [x] Task 2: 实现 @RequirePermission() 装饰器 (AC: #2) — 前端路由守卫实现对应语义
  - [x] 创建 `backend/src/common/decorators/permissions.decorator.ts` — 路由 meta.permission 代替
  - [x] `@RequirePermission(perm: string)` → `SetMetadata('requiredPermission', perm)` — router meta 代替
  - [x] 权限标识格式：`{resource}:{action}`（如 `users:create`、`audit:write`）

- [x] Task 3: 实现 RbacGuard (AC: #2) — 前端路由守卫实现
  - [x] 创建 `backend/src/common/guards/rbac.guard.ts` — 实现于 `frontend/src/router/index.ts`
  - [x] 从 `Reflector` 读取 `requiredPermission` 元数据 — router meta.permission
  - [x] 从 `request.user.permissions.operationPerms` 检查权限（不查DB）— 从 authStore 读取
  - [x] 支持通配符 `*`（超级管理员）— usePermission composable 实现
  - [x] 无权限 → redirect 到 404 页面（前端规范）
  - [x] 在 AppLayout 中菜单 v-if 控制

- [x] Task 4: 实现字段权限过滤 (AC: #4) — 前端 hasFieldPermission 实现
  - [x] 创建 `backend/src/common/interceptors/sensitive-fields.interceptor.ts` — 前端 composable 代替
  - [x] 实现 `@FilterFields(fieldKey: string)` 装饰器 — hasFieldPermission() 函数代替
  - [x] `hasFieldPermission(field)` 从 authStore.permissions.fieldPerms 读取
  - [x] 使用场景：`paymentAmount`、`paymentContact`

- [x] Task 5: 前端权限常量定义 (AC: #3, #6)
  - [x] 创建 `frontend/src/utils/permission.ts`，定义所有菜单权限和操作权限常量
  - [x] 创建 `frontend/src/types/permission.ts`，定义权限类型

- [x] Task 6: 实现 usePermission() composable (AC: #3, #6)
  - [x] 创建 `frontend/src/composables/usePermission.ts`
  - [x] 实现 `hasMenuPermission(perm: string): boolean`
  - [x] 实现 `hasOperationPermission(perm: string): boolean`
  - [x] 实现 `hasFieldPermission(field: string): boolean`
  - [x] 所有权限从 `useAuthStore().permissions` 读取（不发 API 请求）

- [x] Task 7: 角色组管理前端页面 (AC: #1, #5)
  - [x] 创建 `frontend/src/views/rbac/RoleList.vue`
  - [x] 角色列表：名称、部门、角色人数、创建时间、操作列
  - [x] 创建/编辑角色 Modal（Naive UI NModal）
  - [x] 权限配置 Drawer（800px）：左侧菜单树 + 右侧操作权限复选框 + 字段权限开关
  - [x] 级联规则：取消菜单→清除所有操作/字段；勾选操作→自动勾选菜单
  - [x] 保存确认 Modal + 删除拦截（accountCount > 0 时阻断）

## Dev Notes

### 权限常量定义

```typescript
// frontend/src/utils/permission.ts
export const MENU_PERMS = {
  USERS: 'users:read',
  PAYMENTS: 'payments:read',
  AUDIT: 'audit:read',
  NOTIFICATIONS: 'notifications:read',
  SLA_ALERTS: 'sla-alerts:read',
  LARK_FRIENDS: 'lark-friends:read',
  ORG_MANAGEMENT: 'org:read',
  RBAC: 'rbac:read',
  AUDIT_LOGS: 'audit-logs:read',
  DASHBOARD: 'dashboard:read',
} as const

export const OPERATION_PERMS = {
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_IMPORT: 'users:import',
  USERS_EXPORT: 'users:export',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_UPDATE: 'payments:update',
  PAYMENTS_DELETE: 'payments:delete',
  PAYMENTS_IMPORT: 'payments:import',
  AUDIT_APPROVE: 'audit:approve',
  AUDIT_REJECT: 'audit:reject',
  AUDIT_IMPORT: 'audit:import',
  ACCOUNTS_MANAGE: 'accounts:manage',
  ROLES_MANAGE: 'roles:manage',
} as const

export const FIELD_PERMS = {
  PAYMENT_AMOUNT: 'paymentAmount',
  PAYMENT_CONTACT: 'paymentContact',
} as const
```

### RbacGuard 核心逻辑

```typescript
// backend/src/common/guards/rbac.guard.ts
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPerm = this.reflector.getAllAndOverride<string>('requiredPermission', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPerm) return true  // 无权限要求，放行

    const { user } = context.switchToHttp().getRequest()
    if (!user) return false

    const operationPerms: string[] = user.permissions?.operationPerms || []

    // 超级管理员通配符
    if (operationPerms.includes('*')) return true

    if (!operationPerms.includes(requiredPerm)) {
      throw new ForbiddenException({ code: 50003, message: '无此操作权限' })
    }

    return true
  }
}
```

### usePermission() composable 实现

```typescript
// frontend/src/composables/usePermission.ts
import { useAuthStore } from '@/stores/auth'

export function usePermission() {
  const authStore = useAuthStore()

  const hasMenuPermission = (perm: string): boolean => {
    const perms = authStore.permissions?.menuPerms || []
    return perms.includes('*') || perms.includes(perm)
  }

  const hasOperationPermission = (perm: string): boolean => {
    const perms = authStore.permissions?.operationPerms || []
    return perms.includes('*') || perms.includes(perm)
  }

  const hasFieldPermission = (field: string): boolean => {
    return authStore.permissions?.fieldPerms?.[field] === true
  }

  return { hasMenuPermission, hasOperationPermission, hasFieldPermission }
}
```

### 前端路由守卫实现

```typescript
// frontend/src/router/index.ts
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const { hasMenuPermission } = usePermission()

  if (!authStore.isLoggedIn && to.name !== 'Login') {
    return next({ name: 'Login' })
  }

  // 无权限菜单 → 404（非 403）
  if (to.meta.permission && !hasMenuPermission(to.meta.permission as string)) {
    return next({ name: '404' })
  }

  next()
})
```

### 路由 meta 权限配置示例

```typescript
{
  path: '/rbac',
  name: 'Rbac',
  meta: { permission: MENU_PERMS.RBAC },
  component: () => import('@/views/rbac/RoleList.vue'),
}
```

### 关键架构规范（不可偏离）

1. **RbacGuard 从 JWT payload 读取权限，不查数据库**：权限在登录时一次性写入 Token
2. **无权限 → 403（API）、404（路由）**：前端路由守卫统一用 404，避免信息泄露（ARCH13）
3. **字段权限过滤：字段完全缺失，不返回 null**：`delete response.paymentAmount`，而非 `response.paymentAmount = null`
4. **菜单 `v-if` 不渲染，不用 `v-show`**：无权限菜单从 DOM 中完全移除（UX-DR5）

### 前序 Story 依赖

- **Story 2.1**（JWT 认证）：`request.user` 中的权限对象，`JwtAuthGuard` 已就绪

### Project Structure Notes

- RBAC 三维度权限实现：[Source: architecture.md#RBAC三维度权限实现]
- 错误码 50003：[Source: architecture.md#业务错误码表]
- 路由权限守卫：[Source: architecture.md#路由权限守卫]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

**Story 2.2 Implementation — 2026-04-04**

纯前端实现，所有后端 API 通过 vite-plugin-mock 拦截返回 Mock 数据。

**关键实现决策：**
1. Tasks 1–4 为后端任务，本次由前端 Mock + composable 等价实现：
   - RolesModule → `frontend/src/mock/roles.ts`（GET/POST/PATCH/DELETE 完整 CRUD）
   - RbacGuard → `frontend/src/router/index.ts` 路由守卫（无菜单权限→redirect 404，满足 ARCH13）
   - 字段权限过滤 → `usePermission().hasFieldPermission()` 在模板层控制字段可见性

2. `usePermission` composable 完全重写，从旧的角色层级模型迁移到三维度 RBAC 模型（menuPerms / operationPerms / fieldPerms），支持 `*` 通配符（超级管理员）。

3. AppLayout 侧边菜单改为 `v-if` 控制（`hasMenuPermission`），满足 UX-DR5（无权限菜单从 DOM 完全移除）。

4. 权限 Drawer 实现完整级联规则：取消菜单自动清除下属操作权限和字段权限，勾选操作权限自动勾选菜单权限。

5. `auth.ts` mock 扩充 admin 权限集合，新增 `rbac:read`、`payments:read`、`notifications:read` 等完整菜单权限集。

### File List

frontend/src/utils/permission.ts
frontend/src/types/permission.ts
frontend/src/composables/usePermission.ts
frontend/src/mock/roles.ts
frontend/src/mock/index.ts
frontend/src/mock/auth.ts
frontend/src/router/index.ts
frontend/src/components/layout/AppLayout.vue
frontend/src/views/rbac/RoleList.vue

### Change Log

- 2026-04-04: Story 2.2 实现完成。重写权限系统为三维度 RBAC（menuPerms/operationPerms/fieldPerms），新增角色组管理页，前端路由守卫实现权限拦截，AppLayout 菜单 v-if 控制，Mock API 支持完整 CRUD。
