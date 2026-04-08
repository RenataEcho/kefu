# Story 7.6：重复申请拦截与归档规则

Status: review

## Story

作为**系统（后端服务）**，
我希望自动拦截重复的入群申请，被拒后重新申请时旧记录自动归档，
以便工作台保持整洁（满足 FR20）。

## Acceptance Criteria

1. **Given** 用户在飞书端再次提交申请（当前已有 `PENDING` 状态记录）  
   **When** 系统同步到该申请  
   **Then** 识别为重复，飞书端静默丢弃（不创建新记录），工作台不出现重复条目

2. **Given** 用户被拒绝后重新提交  
   **When** 新申请同步进来  
   **Then** 旧 `REJECTED` 记录 → `ARCHIVED`（`archiveType: 'RE_SUBMIT'`）；新申请创建，SLA 重置

3. **Given** `PENDING` 状态记录超过 30 自然日未处理  
   **When** 每日凌晨 0 点自动检查任务触发  
   **Then** 超期记录 → `ARCHIVED`（`archiveType: 'AUTO_EXPIRE'`）

4. **Given** 管理员点击「手动归档」  
   **When** 操作确认  
   **Then** 记录 → `ARCHIVED`（`archiveType: 'MANUAL'`）

## Tasks / Subtasks

> **纯前端：** Task 1–3 服务端逻辑以 Mock 种子数据展示结果为主（不实现真实 `syncFromLark` / Cron）。

- [x] Task 1: 重复申请拦截（在 `syncFromLark` 中实现）(AC: #1)
  - [x] ~~同步时…~~（Mock 不模拟重复丢弃链路，依赖原型「无特殊 UI」）

- [x] Task 2: 重新申请归档逻辑（在 `syncFromLark` 中实现）(AC: #2)
  - [x] ~~同步时…~~（Mock：已归档种子含 `RE_SUBMIT` 类型）

- [x] Task 3: 30日自动归档定时任务 (AC: #3)
  - [x] ~~@Cron…~~（Mock：种子 `AUTO_EXPIRE` 归档记录）

- [x] Task 4: 手动归档 API (AC: #4)
  - [x] `POST /api/v1/group-audits/:id/archive`（Mock 已实现，见 Story 7-10）

- [x] Task 5: 前端手动归档入口 (AC: #4)
  - [x] 详情页「归档此记录」（管理员）；列表「已归档」Tab 展示 `archiveType` 列

## Dev Notes

### 重复/重新申请检查逻辑

```typescript
// group-audits.service.ts - syncFromLark 中
async upsertFromLark(larkRequest: LarkJoinRequest) {
  const userId = await this.resolveUserId(larkRequest.applicantLarkId)

  // 查找该用户最新的申请记录
  const latest = await this.prisma.groupAudit.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (latest?.status === 'PENDING') {
    // 重复申请：静默丢弃
    return
  }

  if (latest?.status === 'REJECTED') {
    // 被拒后重新申请：归档旧记录
    await this.prisma.groupAudit.update({
      where: { id: latest.id },
      data: { status: 'ARCHIVED', archiveType: 'RE_SUBMIT', archivedAt: new Date() },
    })
  }

  // 创建新申请记录
  await this.prisma.groupAudit.create({ data: { userId, status: 'PENDING', applyTime: new Date(larkRequest.applyTime * 1000), applySource: 'LARK_API', larkRequestId: larkRequest.id } })
}
```

### 归档类型枚举

```typescript
export const ARCHIVE_TYPES = {
  RE_SUBMIT: 'RE_SUBMIT',        // 重新申请，旧记录归档
  AUTO_EXPIRE: 'AUTO_EXPIRE',    // 30日自动过期归档
  MANUAL: 'MANUAL',              // 管理员手动归档
} as const
```

### 前序 Story 依赖

- **Story 7.1**（`syncFromLark()` 方法，在此处扩展）

### Project Structure Notes

- FR20 重复申请规格：[Source: epics.md#FR20]
- GroupAudit 归档字段：[Source: architecture.md#数据模型设计 GroupAudit]

## Dev Agent Record

### Agent Model Used

Composer（GPT-5.2）

### Debug Log References

### Completion Notes List

- 列表 `ARCHIVED` Tab 增加归档类型列；Mock 种子含 `RE_SUBMIT` / `AUTO_EXPIRE` / `MANUAL`；详情 `archive` 区块与列表字段一致。

### File List

- `frontend/src/types/groupAudit.ts`
- `frontend/src/mock/groupAudits.ts`
- `frontend/src/views/group-audits/AuditWorkbench.vue`
- `frontend/src/views/group-audits/GroupAuditDetailView.vue`
