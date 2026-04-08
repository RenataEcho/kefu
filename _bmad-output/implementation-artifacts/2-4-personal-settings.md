# Story 2.4：个人设置（昵称与密码自助修改）

Status: review

## Story

作为**所有账号持有人**，
我希望能够自助修改自己的昵称和登录密码，
以便我可以更新个人信息，无需管理员介入（满足 FR45）。

## Acceptance Criteria

1. **Given** 已登录的账号持有人  
   **When** 点击顶部导航栏右上角头像/昵称下拉菜单  
   **Then** 出现「个人设置」入口，点击后进入 `/settings/profile` 页面

2. **Given** 个人设置页  
   **When** 修改昵称并点击保存  
   **Then** 昵称更新成功，顶部导航栏中的显示名**即时更新**（无需刷新页面，通过 Pinia store 更新驱动）

3. **Given** 个人设置页修改密码表单  
   **When** 填写当前密码、新密码、确认新密码并提交  
   **Then** 当前密码验证通过后，新密码以 bcrypt 哈希更新并保存

4. **Given** 当前密码填写错误  
   **When** 提交修改密码表单  
   **Then** 返回 HTTP 400，提示"当前密码不正确"，不更新密码

5. **Given** 新密码与确认新密码不一致  
   **When** 前端表单  
   **Then** 前端实时校验拦截（`watch` 监听），提示"两次输入的密码不一致"，保存按钮禁用，不发起 API 请求

6. **Given** 账号只能修改自己的信息  
   **When** API 处理请求  
   **Then** 从 JWT `sub` 中提取当前账号 ID，只允许修改自己的记录（不接受请求体中的其他 accountId）

## Tasks / Subtasks

- [ ] Task 1: 后端个人设置 API (AC: #2, #3, #4, #6) — **本仓库纯前端：由 Mock 模拟，未实现 Nest**
  - [ ] 创建 `backend/src/modules/accounts/dto/update-profile.dto.ts`（`name?: string`）
  - [ ] 创建 `backend/src/modules/accounts/dto/change-password.dto.ts`（`currentPassword: string`、`newPassword: string`）
  - [ ] `PATCH /api/v1/auth/profile` → 修改当前登录账号的 `name`（从 JWT `sub` 获取 accountId）
  - [ ] `POST /api/v1/auth/change-password` → 修改密码（验证旧密码 + bcrypt 哈希新密码）
  - [ ] 密码修改后**不**强制注销（保持 Sliding Session 体验）

- [x] Task 2: 前端个人设置页 (AC: #1, #2, #3, #4, #5)
  - [x] 创建 `frontend/src/views/settings/ProfileSettings.vue`
  - [x] 页面分两个表单区块：基本信息（昵称修改）+ 密码修改
  - [x] 昵称修改成功后 `authStore.updateDisplayName`（即时更新 Pinia + localStorage）
  - [x] 密码确认实时校验（`watch`）+ 新密码复杂度 Inline；错误密码 HTTP 400「当前密码不正确」
  - [x] 顶栏下拉「个人设置」→ `/settings/profile`

- [x] Task 3: 配置路由 (AC: #1)
  - [x] `/settings/profile` + `/settings` 重定向；无 `meta.permission`
  - [x] 路由无菜单权限限制（所有已登录用户均可访问）

## Dev Notes

### 后端 API 实现

```typescript
// PATCH /api/v1/auth/profile - 修改昵称
@Patch('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(
  @CurrentUser() user: JwtPayload,
  @Body() dto: UpdateProfileDto,
) {
  return this.accountsService.updateProfile(BigInt(user.sub), dto)
}

// POST /api/v1/auth/change-password - 修改密码
@Post('change-password')
@UseGuards(JwtAuthGuard)
@HttpCode(200)
async changePassword(
  @CurrentUser() user: JwtPayload,
  @Body() dto: ChangePasswordDto,
) {
  return this.accountsService.changePassword(BigInt(user.sub), dto)
}
```

```typescript
// accounts.service.ts
async changePassword(accountId: bigint, dto: ChangePasswordDto) {
  const account = await this.prisma.account.findUnique({
    where: { id: accountId },
    select: { passwordHash: true },
  })

  const isValid = await bcrypt.compare(dto.currentPassword, account.passwordHash)
  if (!isValid) {
    throw new BadRequestException({ code: 10001, message: '当前密码不正确' })
  }

  const newHash = await bcrypt.hash(dto.newPassword, 10)
  await this.prisma.account.update({
    where: { id: accountId },
    data: { passwordHash: newHash },
  })

  return { message: '密码修改成功' }
}
```

### 前端即时更新逻辑

```typescript
// ProfileSettings.vue
const updateName = async () => {
  await authApi.updateProfile({ name: newName.value })
  authStore.account.name = newName.value  // 立即更新 Pinia store
  message.success('昵称修改成功')
}
```

### 关键架构规范（不可偏离）

1. **只能修改自己的信息**：API 从 JWT `sub` 获取 accountId，不接受请求体中的 `accountId` 参数
2. **密码修改不强制注销**：提升 UX，密码修改后 Token 继续有效（Sliding Session 保证安全）
3. **前端双重校验**：新旧密码一致性在前端实时校验（不发请求），`currentPassword` 错误由后端返回

### 前序 Story 依赖

- **Story 2.1**（JWT 认证、`@CurrentUser()` 装饰器、`useAuthStore`）

### Project Structure Notes

- FR45 个人设置需求：[Source: epics.md#Story 2.4]
- @CurrentUser 装饰器：[Source: architecture.md#common/decorators/current-user.decorator.ts]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- Mock：`GET/PATCH /api/v1/me`、`POST /api/v1/me/password`；昵称覆盖与按账号密码覆盖与登录 Mock 联动；`PATCH` 空名为 400。
- 前端：`frontend/src/api/me.ts`、`auth` store `updateDisplayName`；已删除占位 `SettingsView.vue`。

### File List

- frontend/src/api/me.ts
- frontend/src/mock/auth.ts
- frontend/src/stores/auth.ts
- frontend/src/views/settings/ProfileSettings.vue
- frontend/src/router/index.ts
- frontend/src/components/layout/AppHeader.vue
