# Story 7.8：SLA 预警记录查看页

Status: review

## Story

作为**审核员/超级管理员**，
我希望能够查看 SLA 预警记录，了解预警发送历史，
以便追溯哪些申请曾触发预警及其处理情况（满足 FR27）。

## Acceptance Criteria

1. **Given** 审核员（`is_auditor=true`）进入 SLA 预警记录页  
   **When** 加载  
   **Then** 展示预警记录：预警时间、申请记录ID、申请人信息、预警类型（首次/二次）、发送状态

2. **Given** 点击申请记录ID  
   **When** 操作  
   **Then** 跳转至对应入群审核详情

3. **Given** 普通客服（非审核员）  
   **When** 查看导航菜单  
   **Then** SLA 预警记录菜单项不可见（`is_auditor` 权限控制）

4. **Given** 列表  
   **When** 加载  
   **Then** 分页 20 条/页，按预警时间倒序

## Tasks / Subtasks

- [x] Task 1: SLA 预警记录 API
  - [x] 注意：架构中使用 `group_audits.firstAlertSentAt` 和 `secondAlertSentAt` 字段，没有独立的 `sla_warnings` 表
  - [x] `GET /api/v1/group-audits/sla-alerts`：Mock 由 `firstAlertSentAt`/`secondAlertSentAt` 展开行
  - [x] 响应含预警时间、类型、发送状态、`groupAuditId`、申请人信息

- [x] Task 2: 前端 SLA 预警记录页
  - [x] 实现 `frontend/src/views/SlaAlertsView.vue`（路由已存在）
  - [x] 菜单：`sla-alerts:read` +（`isAuditor` 或 `admin`）可见；路由 `beforeEnter` 双保险
  - [x] 分页 20 条/页；申请 ID 跳转 `GroupAuditDetail`

## Dev Notes

### SLA 预警记录来源

SLA 预警信息存储在 `group_audits` 表的两个字段（`firstAlertSentAt`、`secondAlertSentAt`），而不是独立的 `sla_warnings` 表。

查询逻辑：
```typescript
// 查询有预警记录的审核申请
const alertedAudits = await this.prisma.groupAudit.findMany({
  where: { firstAlertSentAt: { not: null } },
  include: { user: { select: { rightLeopardCode: true, larkNickname: true } } },
  orderBy: { firstAlertSentAt: 'desc' },
  skip, take,
})
```

### 菜单权限补充

在 `AppSidebar.vue` 中，SLA 预警菜单项的显示需要满足：
1. `hasMenuPermission(MENU_PERMS.SLA_ALERTS)` 为 true
2. 且（额外限制）`authStore.account?.isAuditor === true`

### 前序 Story 依赖

- **Story 7.7**（SLA 预警数据已写入 `firstAlertSentAt`）

### Project Structure Notes

- FR27 SLA 预警记录字段：[Source: epics.md#FR27]

## Dev Agent Record

### Agent Model Used

Composer（GPT-5.2）

### Debug Log References

### Completion Notes List

- Mock 用户 `auditor` 增加 `sla-alerts:read` / `notifications:read` 以便验收链路。

### File List

- `frontend/src/types/groupAudit.ts`
- `frontend/src/api/groupAudits.ts`
- `frontend/src/mock/groupAudits.ts`
- `frontend/src/views/SlaAlertsView.vue`
- `frontend/src/components/layout/AppSidebar.vue`
- `frontend/src/router/index.ts`
- `frontend/src/mock/auth.ts`
