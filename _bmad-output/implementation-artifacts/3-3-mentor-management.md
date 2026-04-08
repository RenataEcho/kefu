# Story 3.3：导师管理（CRUD + 门派归属）

Status: review

## Story

作为**超级管理员**，
我希望能够管理导师记录并指定每位导师的所属门派，
以便组织层级关系完整可追溯（满足 FR34）。

## Acceptance Criteria

1. **Given** 管理员在导师新增抽屉  
   **When** 填写导师信息但未选择所属门派  
   **Then** 前端校验拦截，提示"请选择所属门派"，不提交（满足 FR34：导师必须归属一个门派）

2. **Given** 管理员填写完整导师信息（含所属门派）  
   **When** 提交新增  
   **Then** 导师记录成功创建，所属门派关联正确记录

3. **Given** 关联了用户主档（学员）的导师记录  
   **When** 管理员尝试删除该导师  
   **Then** 系统拦截，返回 HTTP 400，`code: 10003`，message: "该导师名下有 X 名学员，请先解除关联后再删除"（满足 FR37）

4. **Given** 已创建的导师记录  
   **When** 管理员修改导师所属门派  
   **Then** 更新成功，门派侧的导师归属关系同步更新（数据库关联正确）

5. **Given** 导师列表  
   **When** 管理员查看  
   **Then** 支持按门派筛选；列表显示：导师名称、所属门派、学员数量、第三方API同步数据（学员数/项目数/收益）；分页 20 条/页

## Tasks / Subtasks

- [ ] Task 1: 创建 MentorsModule (AC: #1, #2, #3, #4, #5)
  - [ ] 创建 `backend/src/modules/mentors/mentors.module.ts`
  - [ ] 创建 `backend/src/modules/mentors/mentors.service.ts`
  - [ ] 创建 `backend/src/modules/mentors/mentors.controller.ts`
  - [ ] 创建 DTO：`CreateMentorDto`（`name: string`、`schoolId: string`）、`UpdateMentorDto`、`MentorListQueryDto`

- [ ] Task 2: 实现 Mentors CRUD API (AC: #2, #3, #4, #5)
  - [ ] `GET /api/v1/mentors`（分页列表，支持 `schoolId` 筛选，含 `_count` 学员数聚合）
  - [ ] `GET /api/v1/mentors/:id`（详情，含 school 关联）
  - [ ] `POST /api/v1/mentors`（需 `org:manage` 权限）+ `@Audit('mentors')`
  - [ ] `PATCH /api/v1/mentors/:id`（更新，可修改 schoolId）+ `@Audit('mentors')`
  - [ ] `DELETE /api/v1/mentors/:id`（先检查用户关联数量）+ `@Audit('mentors')`

- [x] Task 3: 前端导师管理页 (AC: #1, #2, #3, #4, #5) — **Mock + `org:manage`**
  - [x] 创建 `frontend/src/views/organization/MentorList.vue`
  - [x] 列表：导师名称、所属门派、学员数、同步学员/项目/总收益、最后同步；展开行展示收益明细（对齐原型 §2.6）
  - [x] 顶部筛选：门派（`GET /schools` 拉取选项）
  - [x] 新增/编辑导师抽屉 `MentorFormDrawer`（门派必选，文案「请选择所属门派」）
  - [x] 删除确认；关联学员 `code: 10003` 拦截 Modal

## Dev Notes

### 必填门派校验（后端 DTO）

```typescript
// create-mentor.dto.ts
export class CreateMentorDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty({ message: '请选择所属门派' })
  schoolId: string  // 字符串接收，Service 层转 BigInt
}
```

### 关联用户检查

```typescript
// mentors.service.ts
async deleteMentor(id: bigint) {
  const userCount = await this.prisma.user.count({ where: { mentorId: id } })
  if (userCount > 0) {
    throw new BadRequestException({
      code: 10003,
      message: `该导师名下有 ${userCount} 名学员，请先解除关联后再删除`,
    })
  }
  await this.prisma.mentor.delete({ where: { id } })
}
```

### 列表查询（含聚合）

```typescript
const mentors = await this.prisma.mentor.findMany({
  where: schoolId ? { schoolId: BigInt(schoolId) } : undefined,
  include: {
    school: { select: { id: true, name: true } },
    _count: { select: { users: true } },
  },
  skip, take,
  orderBy: { createdAt: 'desc' },
})
```

### 注意：第三方同步字段

`studentCount`、`projectCount`、`totalRevenue`、`lastSyncedAt` 这些字段在创建时为默认值（0/null），由 Story 3.4 的定时同步任务填充，不需要在 CRUD 接口中手动管理。

### 关键架构规范（不可偏离）

1. **`schoolId` 必填**：后端 DTO 和前端表单双重校验
2. **第三方同步字段只读**：`PATCH /api/v1/mentors/:id` 不接受 `studentCount` 等同步字段的修改（`UpdateMentorDto` 中不包含这些字段）
3. **`@Audit('mentors')` 标注所有写操作**

### 前序 Story 依赖

- **Story 3.1**（`schools` 数据已存在，用于下拉选择）
- **Story 1.3**（`mentors` 表）

### Project Structure Notes

- Mentor 数据模型：[Source: architecture.md#数据模型设计 Mentor]
- FR34 导师管理规格：[Source: epics.md#FR34]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **2026-04-07（CoCo）：** 纯前端：`/api/v1/mentors` CRUD Mock，共享 `organizationData`；新建导师默认同步字段为 0；Task 1–2 后端未实现。

### File List

- `frontend/src/mock/organizationData.ts`
- `frontend/src/mock/mentors.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/types/mentor.ts`
- `frontend/src/api/mentors.ts`
- `frontend/src/views/organization/MentorList.vue`
- `frontend/src/views/organization/MentorFormDrawer.vue`
- `frontend/src/views/MentorManagementView.vue`
