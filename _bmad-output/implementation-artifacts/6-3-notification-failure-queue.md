# Story 6.3：通知失败队列与记录查看页

Status: review

## Story

作为**客服**，
我希望能够查看推送失败的通知记录，了解哪些用户未收到审核结果，
以便通过线下方式跟进，确保审核结果触达（满足 FR23、FR24）。

## Acceptance Criteria

1. **Given** 任意通知推送最终失败  
   **When** 确认失败（未绑定 OpenID 或重试 3 次均失败）  
   **Then** `notifications` 记录 `status: 'FAILED'`，含 `failureReason`

2. **Given** 客服进入「消息通知记录」页  
   **When** 页面加载  
   **Then** 展示通知记录列表，按通知时间倒序，支持按状态（全部/SENT/FAILED）筛选；字段：通知时间、右豹编码、通知场景、渠道、推送状态（满足 FR24）

3. **Given** 筛选「失败」状态  
   **When** 筛选生效  
   **Then** 仅展示 FAILED 记录

4. **Given** 失败记录列表  
   **When** 客服查看  
   **Then** **无「重新推送」按钮**（线下跟进为主，避免过度推送）；分页 20 条/页

## Tasks / Subtasks

- [x] Task 1: 实现通知记录查询 API (AC: #1, #2, #3) — **Mock**
  - [x] `GET /api/v1/notifications`（需 `notifications:read` 菜单权限）
  - [x] 支持筛选：`status`（SENT/FAILED）、分页
  - [x] 响应字段：`id`、`userId`、`rightLeopardCode`（通过 user 关联）、`scenario`（中文映射）、`channel`、`status`、`failureReason`、`createdAt`

- [x] Task 2: 前端通知记录页 (AC: #2, #3, #4)
  - [x] 创建 `frontend/src/views/notifications/NotificationFailed.vue`
  - [x] 列表顶部筛选：推送状态（下拉，默认「全部」）
  - [x] 状态 Tag：SENT 绿色、FAILED 红色、PENDING 灰色
  - [x] 通知场景中文映射：`AUDIT_APPROVED: '审核通过'`、`AUDIT_REJECTED: '审核拒绝'`、`SLA_ALERT_FIRST: 'SLA首次预警'`、`SLA_ALERT_SECOND: 'SLA二次催促'`
  - [x] 无删除/重推按钮

## Dev Notes

### 通知场景中文映射

```typescript
// frontend/src/utils/notification-scenario.ts
export const SCENARIO_LABELS: Record<string, string> = {
  AUDIT_APPROVED: '审核通过',
  AUDIT_REJECTED: '审核拒绝',
  SLA_ALERT_FIRST: 'SLA首次预警',
  SLA_ALERT_SECOND: 'SLA二次催促',
}
```

### 通知记录查询（含右豹编码关联）

```typescript
// notifications.service.ts
async findAll(query: NotificationListQueryDto) {
  return this.prisma.notification.findMany({
    where: query.status ? { status: query.status } : undefined,
    include: {
      user: { select: { rightLeopardCode: true } },  // 关联查右豹编码
    },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  })
}
```

### 关键架构规范

1. **失败记录无重推功能**：系统设计决策，线下跟进（FR23）
2. **通知时间展示 `createdAt`**：通知记录创建时间即为通知触发时间

### 前序 Story 依赖

- **Story 6.1**（`notifications` 表、NotificationsService）

### Project Structure Notes

- FR24 通知记录字段：[Source: epics.md#FR24]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **2026-04-07（CoCo）：** `GET /api/v1/notifications` Mock + `NotificationFailed.vue`（`NotificationsView` 入口）；渠道展示对齐原型「微信服务号」；分页默认 20；无重推按钮。

### File List

- `frontend/src/utils/notification-scenario.ts`
- `frontend/src/types/notification.ts`
- `frontend/src/api/notifications.ts`
- `frontend/src/mock/notifications.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/views/notifications/NotificationFailed.vue`
- `frontend/src/views/NotificationsView.vue`
