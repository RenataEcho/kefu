# Story 3.1：门派管理（CRUD + 关联数据检查）

Status: review

## Story

作为**超级管理员**，
我希望能够新增、修改和删除门派记录，删除时系统检查关联数据，
以便组织架构的顶层数据始终准确，并防止意外删除有关联数据的门派。

## Acceptance Criteria

1. **Given** 管理员在门派管理页  
   **When** 填写门派名称并提交新增  
   **Then** 门派记录成功创建，`audit_logs` 自动记录创建操作（FR46，由 Story 1.5 的 `AuditLogInterceptor` 自动完成）

2. **Given** 已存在的门派记录  
   **When** 管理员修改门派信息并保存  
   **Then** 记录更新成功，列表即时刷新，Toast 提示"修改成功"

3. **Given** 关联了导师的门派记录  
   **When** 管理员尝试删除该门派  
   **Then** 系统拦截删除，返回 HTTP 400，`code: 10003`，message: "该门派下有 X 名导师，请先解除关联后再删除"

4. **Given** 未关联任何导师的门派记录  
   **When** 管理员确认删除  
   **Then** 门派记录成功删除，Toast 提示"删除成功"

5. **Given** 门派管理页  
   **When** 管理员操作  
   **Then** 无法在此页面操作导师的门派归属（满足 FR35：门派侧只读）；列表分页 20 条/页

## Tasks / Subtasks

- [ ] Task 1: 创建 SchoolsModule (AC: #1, #2, #3, #4, #5)
  - [ ] 创建 `backend/src/modules/schools/schools.module.ts`
  - [ ] 创建 `backend/src/modules/schools/schools.service.ts`
  - [ ] 创建 `backend/src/modules/schools/schools.controller.ts`
  - [ ] 创建 DTO：`CreateSchoolDto`（`name: string`）、`UpdateSchoolDto`、`SchoolListQueryDto`

- [ ] Task 2: 实现 Schools CRUD API (AC: #1, #2, #3, #4)
  - [ ] `GET /api/v1/schools`（分页列表，含导师数量聚合）
  - [ ] `GET /api/v1/schools/:id`（详情）
  - [ ] `POST /api/v1/schools`（需 `org:manage` 权限）+ `@Audit('schools')`
  - [ ] `PATCH /api/v1/schools/:id`（更新）+ `@Audit('schools')`
  - [ ] `DELETE /api/v1/schools/:id`（删除，先检查关联导师数量）+ `@Audit('schools')`

- [ ] Task 3: 实现关联检查逻辑 (AC: #3)
  - [ ] 删除前 `prisma.mentor.count({ where: { schoolId: id } })`
  - [ ] 若 count > 0 → `throw new BadRequestException({ code: 10003, message: '该门派下有 X 名导师，请先解除关联后再删除' })`

- [x] Task 4: 前端门派管理页 (AC: #1, #2, #3, #4, #5) — **Mock + `org:manage`**
  - [x] 创建 `frontend/src/views/organization/SchoolList.vue`
  - [x] 列表：门派名称、导师数量、状态、创建时间
  - [x] 新增/编辑门派（抽屉 `SchoolFormDrawer`）
  - [x] 删除确认弹窗；关联导师时 `code: 10003` 拦截 Modal（仅关闭）

## Dev Notes

### 关联检查 Service 模式（Epic 3 共用）

```typescript
// 删除时的关联检查模式（schools/mentors/agents 均使用此模式）
async deleteSchool(id: bigint) {
  const mentorCount = await this.prisma.mentor.count({ where: { schoolId: id } })
  if (mentorCount > 0) {
    throw new BadRequestException({
      code: 10003,
      message: `该门派下有 ${mentorCount} 名导师，请先解除关联后再删除`,
    })
  }
  await this.prisma.school.delete({ where: { id } })
}
```

### 门派列表聚合查询

```typescript
// 列表时聚合导师数量（避免 N+1 查询）
const schools = await this.prisma.school.findMany({
  include: {
    _count: { select: { mentors: true } },
  },
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
})
```

### 关键架构规范（不可偏离）

1. **`@Audit('schools')` 装饰器**：所有写操作 Controller 方法都要标注，触发审计日志
2. **关联检查在 Service 层（不在 Controller）**：保持业务逻辑内聚
3. **门派侧不提供导师归属修改入口**：`SchoolList` 和 `SchoolDetail` 页面无导师关联操作（FR35）
4. **操作权限 `org:manage`**：通过 `@RequirePermission` 装饰器保护写操作

### 前序 Story 依赖

- **Story 1.3**（`schools` 表已就绪）
- **Story 1.5**（`AuditLogInterceptor`、`AuditService`）
- **Story 2.2**（`RbacGuard`、`@RequirePermission`）
- **Story 2.5**（前端路由、布局框架）

### Project Structure Notes

- Schools 数据模型：[Source: architecture.md#数据模型设计 School]
- FR35 门派侧限制：[Source: epics.md#FR35]
- FR37 关联数据检查：[Source: epics.md#FR37]
- 错误码 10003：[Source: architecture.md#业务错误码表]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **2026-04-07（CoCo）：** 纯前端：`/api/v1/schools`、`/schools/options` Mock；`SectManagementView` 挂载 `SchoolList`；写操作需 `org:manage`（已加入管理员 Mock 权限）。Task 1–3 为 NestJS，未在本仓库实现。

### File List

- `frontend/src/mock/organizationData.ts`
- `frontend/src/mock/schools.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/types/school.ts`
- `frontend/src/api/schools.ts`
- `frontend/src/views/organization/SchoolList.vue`
- `frontend/src/views/organization/SchoolFormDrawer.vue`
- `frontend/src/views/SectManagementView.vue`
- `frontend/src/utils/permission.ts`
- `frontend/src/mock/auth.ts`
- `frontend/src/mock/roles.ts`
