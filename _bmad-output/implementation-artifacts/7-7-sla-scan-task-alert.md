# Story 7.7：SLA 定时扫描任务与超时预警推送

Status: review

## Story

作为**审核员**，
我希望在入群申请超过 3 自然日未处理时，通过微信和系统内 Banner 收到预警，8 小时后若仍未处理再收一次二次催促，
以便不遗漏任何超时申请（满足 FR25、FR26、NFR12）。

## Acceptance Criteria

1. **Given** BullMQ `sla-alert` 定时任务（每 5 分钟）  
   **When** 扫描发现超过第 3 日 23:59（UTC+8）仍 `PENDING` 的申请且未发首次预警  
   **Then** 向所有 `is_auditor=true` 有效账号发送首次预警：① 微信推送（OpenID 已绑定）；② 系统内 Banner 持续展示（满足 FR25）

2. **Given** 首次预警已发出，8 小时后申请仍 `PENDING`  
   **When** 扫描任务运行  
   **Then** 发送二次催促（渠道同上），此后不再重复（满足 FR26）

3. **Given** SLA 扫描任务失败  
   **When** 异常退出  
   **Then** BullMQ 5 分钟后重试，最多 3 次（满足 NFR12）

4. **Given** 幂等性  
   **When** 扫描任务多次运行  
   **Then** 已发首次预警的申请不重复发送（通过 `firstAlertSentAt` 非空判断）

5. **Given** 预警发送  
   **When** 完成  
   **Then** `group_audits.firstAlertSentAt`（首次）或 `secondAlertSentAt`（二次）更新

## Tasks / Subtasks

- [ ] Task 1: SLA 扫描任务（Cron + BullMQ）(AC: #1, #2, #3, #4) — **后端，本仓库未实现**
  - [ ] `@Cron('*/5 * * * *')` 触发 `sla-alert` 队列 job
  - [ ] BullMQ Processor `SlaAlertProcessor`

- [ ] Task 2: SlaAlertProcessor 实现 (AC: #1, #2, #4, #5) — **后端，本仓库未实现**
  - [ ] 查询超时 `PENDING` 申请（`applyTime + 3天 < now UTC+8`）
  - [ ] 按 `firstAlertSentAt` 是否为空分组处理：
    - `null` → 发首次预警 + 更新 `firstAlertSentAt`
    - 非 null + `(now - firstAlertSentAt) >= 8h` + `secondAlertSentAt is null` → 发二次 + 更新 `secondAlertSentAt`
  - [ ] 向所有 `is_auditor=true` 且 `status=ACTIVE` 的账号查询 OpenID → 入队微信通知

- [x] Task 3: SLA Banner SSE（系统内 Banner 持续展示）(AC: #1) — **纯前端 Mock**
  - [x] `GET /api/v1/group-audits/sla-banner`：查询是否有超时未处理申请，返回 `{ hasOverdue: boolean, overdueCount: number }`
  - [x] 前端每 60 秒轮询（或 SSE），`hasOverdue = true` 时显示全局 Banner

- [x] Task 4: 前端 SLA Banner (AC: #1)
  - [x] 在 `AppLayout.vue` 中添加 SLA 超时 Banner（全局，不可关闭）
  - [x] Banner 样式：橙色警告条，"X 条入群申请已超时，请尽快处理"，点击跳转工作台

## Dev Notes

### SLA 超时判断（UTC+8）

```typescript
// 必须用 dayjs + timezone，不能用 Date 本地时间
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(timezone)

const isOverdue = (applyTime: Date): boolean => {
  const deadline = dayjs(applyTime)
    .tz('Asia/Shanghai')
    .add(3, 'day')
    .endOf('day')  // 23:59:59
  return dayjs().isAfter(deadline)
}
```

### SLA 预警通知

向所有审核员发送的通知场景：
- 首次：`scenario: 'SLA_ALERT_FIRST'`
- 二次：`scenario: 'SLA_ALERT_SECOND'`

**注意**：SLA 预警对象是「审核员账号」，不是普通用户。需要查询 `accounts` 表（`is_auditor=true`）找到对应用户（审核员也是系统用户，通过 OpenID 绑定）。

### 幂等检查

```typescript
// 扫描时先检查 firstAlertSentAt
const overdueAudits = await this.prisma.groupAudit.findMany({
  where: {
    status: 'PENDING',
    applyTime: { lt: slaThreshold },  // 超过3天
    firstAlertSentAt: null,           // 未发过首次预警
  },
})
```

### 关键架构规范

1. **SLA 时间计算用 dayjs + timezone**（不用 Date 本地时间）
2. **向审核员（is_auditor=true）发送**，不是向申请人发送
3. **幂等通过 `firstAlertSentAt`/`secondAlertSentAt` 字段控制**

### 前序 Story 依赖

- **Story 6.1**（`NotificationsService.send()`）
- **Story 7.1**（`group_audits` 数据和 SLA 字段）

### Project Structure Notes

- FR25/FR26 SLA 预警规格：[Source: epics.md#FR25, FR26]
- NFR12 SLA 任务可靠性：[Source: architecture.md#NFR12]
- Cron 频率（5分钟）：[Source: architecture.md#Cron执行频率规范]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **2026-04-07（CoCo）：** 按纯前端范围完成 Task 3–4：`vite-plugin-mock` 提供 `sla-banner`；`AppLayout` 对具备 `audit:read` 的用户每 60s 轮询，超时条使用 `--status-warning` Token；Task 1–2 仍为后端 BullMQ/Cron，未在本仓库实现。

### File List

- `frontend/src/mock/groupAudits.ts`
- `frontend/src/api/groupAudits.ts`
- `frontend/src/types/groupAudit.ts`
- `frontend/src/components/layout/AppLayout.vue`
