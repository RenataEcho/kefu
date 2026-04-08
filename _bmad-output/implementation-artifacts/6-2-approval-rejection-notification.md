# Story 6.2：审核通过与拒绝通知推送

Status: ready-for-dev

## Story

作为**申请入群的用户**，
我希望在入群申请被审核后通过微信服务号收到审核结果通知，
以便及时了解审核结果，无需主动询问客服（满足 FR21、FR22）。

## Acceptance Criteria

1. **Given** 审核员通过某条入群申请  
   **When** 通过操作成功后  
   **Then** 系统自动入队通知任务；用户 OpenID 已绑定时，推送「入群审核已通过」模板消息

2. **Given** 审核员拒绝某条入群申请并填写拒绝原因  
   **When** 拒绝操作成功后  
   **Then** 系统自动入队通知任务；推送「入群申请未通过」模板消息，含拒绝原因 + H5 修改指引链接（满足 FR22）

3. **Given** 拒绝原因为空  
   **When** 构建通知内容  
   **Then** 使用默认文案："您的入群申请未符合要求，请按要求修改后重新申请"（满足 FR17）

## Tasks / Subtasks

- [ ] Task 1: 审核通过时触发通知（集成在 Story 7.3 的审核通过 Service 中）
  - [ ] 在 `GroupAuditService.approve()` 完成后调用 `NotificationsService.send({ userId, scenario: 'AUDIT_APPROVED', groupAuditId })`
  - [ ] 通知异步入队，不阻塞审核响应

- [ ] Task 2: 审核拒绝时触发通知（集成在 Story 7.4 的审核拒绝 Service 中）
  - [ ] 在 `GroupAuditService.reject()` 完成后调用 `NotificationsService.send({ userId, scenario: 'AUDIT_REJECTED', rejectReason, groupAuditId })`
  - [ ] 拒绝原因为空时，传入默认文案

- [ ] Task 3: 实现通知消息模板（微信服务号模板消息）
  - [ ] 审核通过模板内容：标题"入群审核结果"、内容"您的飞书入群申请已通过审核"
  - [ ] 审核拒绝模板内容：标题"入群审核结果"、拒绝原因字段、H5 修改指引链接（可配置）

## Dev Notes

### 通知集成位置说明

Story 6.2 本身不实现独立的审核逻辑，而是作为 **Story 7.3**（审核通过）和 **Story 7.4**（审核拒绝）的集成点。

开发 Story 7.3 和 7.4 时，在 Service 层注入 `NotificationsService` 并调用：

```typescript
// group-audit.service.ts - 在 approve/reject 方法末尾
await this.notificationsService.send({
  userId: audit.userId,
  scenario: 'AUDIT_APPROVED',
  groupAuditId: audit.id,
})
```

### 默认拒绝文案常量

```typescript
// backend/src/modules/notifications/notification-templates.ts
export const DEFAULT_REJECT_REASON = '您的入群申请未符合要求，请按要求修改后重新申请'
export const H5_REJECT_GUIDE_URL = process.env.H5_REJECT_GUIDE_URL || 'https://example.com/guide'
```

### 关键架构规范

- **通知触发在 Service 层**，不在 Controller（保证事务完整性）
- **默认文案集中管理**（不在代码中散落硬编码字符串）

### 前序 Story 依赖

- **Story 6.1**（NotificationsService 基础设施）
- **Story 7.3、7.4**（审核操作 Service，此 Story 集成其中）

### Project Structure Notes

- FR21/FR22 审核通知：[Source: epics.md#FR21, FR22]
- FR17 默认拒绝文案：[Source: epics.md#FR17]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
