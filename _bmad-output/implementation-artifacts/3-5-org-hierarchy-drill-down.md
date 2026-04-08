# Story 3.5：组织层级下钻展示

Status: review

## Story

作为**超级管理员和导师**，
我希望能够从门派逐级下钻查看导师，再从导师下钻查看名下学员，
以便直观了解组织层级结构和各层级聚合数据（满足 FR38）。

## Acceptance Criteria

1. **Given** 管理员在门派详情页  
   **When** 点击「旗下导师」Tab  
   **Then** 展示该门派下所有导师列表，包含每位导师的学员数量和总收益聚合数据

2. **Given** 管理员在导师详情页  
   **When** 点击「名下学员」Tab  
   **Then** 展示该导师名下所有学员（用户主档）列表，包含学员付费状态

3. **Given** 门派列表  
   **When** 页面加载  
   **Then** 每条门派记录显示旗下导师数量、学员总数、总收益聚合值

4. **Given** 学员列表中某条记录  
   **When** 管理员点击进入  
   **Then** 跳转到对应用户主档详情页（完成门派→导师→用户完整下钻路径）

5. **Given** 聚合数据  
   **When** 导师详情页展示  
   **Then** 显示"最后同步时间：{datetime}"（满足 NFR18）

## Tasks / Subtasks

- [ ] Task 1: 门派详情 API（含旗下导师列表）(AC: #1, #3)
  - [ ] `GET /api/v1/schools/:id`：返回门派详情，含 `mentorCount`、`totalStudents`（学员总数）、`totalRevenue`（聚合总收益）
  - [ ] `GET /api/v1/schools/:id/mentors`：返回该门派下的导师列表（含 `studentCount`、`totalRevenue`、`lastSyncedAt`）

- [ ] Task 2: 导师详情 API（含名下学员列表）(AC: #2, #4, #5)
  - [ ] `GET /api/v1/mentors/:id`：返回导师详情，含所属门派信息、`studentCount`、`projectCount`、`totalRevenue`、`lastSyncedAt`
  - [ ] `GET /api/v1/mentors/:id/students`：返回该导师名下的用户主档列表（含付费状态）；分页

- [ ] Task 3: 门派列表聚合优化 (AC: #3)
  - [ ] 更新 `GET /api/v1/schools` 响应：每条记录含 `mentorCount`（`_count.mentors`）
  - [ ] 添加 `totalStudents` 聚合：通过 `SUM(mentors.studentCount)` 或应用层聚合
  - [ ] 添加 `totalRevenue` 聚合

- [ ] Task 4: 前端门派详情页 (AC: #1, #3)
  - [ ] 创建 `frontend/src/views/organization/SchoolDetail.vue`
  - [ ] 基本信息 + 聚合统计（导师数/学员总数/总收益）
  - [ ] Tab 切换：「基本信息」和「旗下导师」
  - [ ] 「旗下导师」Tab：NDataTable 展示导师列表，点击导师名称跳转导师详情

- [ ] Task 5: 前端导师详情页 (AC: #2, #4, #5)
  - [ ] 创建 `frontend/src/views/organization/MentorDetail.vue`
  - [ ] 基本信息 + 第三方同步数据（含 `lastSyncedAt` 标注）+ 手动同步按钮
  - [ ] Tab 切换：「基本信息」和「名下学员」
  - [ ] 「名下学员」Tab：用户主档列表（精简版），点击跳转用户详情页

## Dev Notes

### 聚合查询实现

```typescript
// schools.service.ts - 门派详情聚合
async getSchoolDetail(id: bigint) {
  const school = await this.prisma.school.findUnique({
    where: { id },
    include: {
      _count: { select: { mentors: true } },
    },
  })

  // 学员总数和总收益：从 mentors 表聚合
  const aggregate = await this.prisma.mentor.aggregate({
    where: { schoolId: id },
    _sum: { studentCount: true, totalRevenue: true },
  })

  return {
    ...school,
    mentorCount: school._count.mentors,
    totalStudents: aggregate._sum.studentCount || 0,
    totalRevenue: aggregate._sum.totalRevenue || 0,
  }
}
```

### 导师名下学员 API

```typescript
// mentors.service.ts
async getMentorStudents(mentorId: bigint, page: number, pageSize: number) {
  const [users, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({
      where: { mentorId },
      select: {
        id: true,
        rightLeopardCode: true,
        larkNickname: true,
        paymentRecords: { select: { id: true }, take: 1 },  // 判断是否付费
        createdAt: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    this.prisma.user.count({ where: { mentorId } }),
  ])

  return {
    items: users.map(u => ({ ...u, isPaid: u.paymentRecords.length > 0 })),
    total, page, pageSize,
  }
}
```

### 前端下钻路由

```typescript
// router/index.ts
{ path: '/organization/schools/:id', name: 'SchoolDetail', component: SchoolDetail },
{ path: '/organization/mentors/:id', name: 'MentorDetail', component: MentorDetail },
// 学员详情跳转到 UserDetail（Epic 4 实现）
{ path: '/users/:id', name: 'UserDetail', component: UserDetail },
```

### 关键架构规范（不可偏离）

1. **`_count` 聚合用 Prisma 内置功能**：不做应用层循环计数
2. **学员付费状态**：通过 `paymentRecords` 关联判断（有记录 = 已付费），不存储冗余字段
3. **下钻跳转复用 Epic 4 的用户详情页**：不创建重复页面

### 前序 Story 依赖

- **Story 3.1**（`schools` 数据）
- **Story 3.3**（`mentors` 数据）
- **Story 3.4**（`studentCount`、`totalRevenue` 已同步填充）

### Project Structure Notes

- FR38 组织层级下钻：[Source: epics.md#FR38]
- 目录结构（SchoolDetail.vue、MentorDetail.vue）：[Source: architecture.md#项目目录结构]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **纯前端 / Mock（Step 22）**：`GET /schools/:id`、`/schools/:id/mentors`；门派列表增加 `totalStudents` / `totalRevenue`；`SchoolDetailView` / `MentorDetailView` 路由与 Tab；列表行点击进入详情；`UserDetailView` 导师/门派跳转至详情路由。

### File List

- `frontend/src/mock/schools.ts`
- `frontend/src/mock/organizationData.ts`
- `frontend/src/types/school.ts`
- `frontend/src/api/schools.ts`
- `frontend/src/views/organization/SchoolDetailView.vue`
- `frontend/src/views/organization/SchoolList.vue`
- `frontend/src/views/organization/MentorList.vue`
- `frontend/src/router/index.ts`
- `frontend/src/views/users/UserDetailView.vue`
