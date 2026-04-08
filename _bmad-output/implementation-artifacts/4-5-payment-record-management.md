# Story 4.5：付费记录管理（手动新增/修改/删除）

Status: review

## Story

作为**专属顾问/超级管理员**，
我希望能够手动新增、修改和删除付费记录，删除后付费状态自动原子性回退，
以便准确维护用户的付费状态（满足 FR7、FR9、FR10、FR11）。

## Acceptance Criteria

1. **Given** 负责人填写完整信息（右豹编码、付费金额正数、付费时间、付费对接人）  
   **When** 提交新增付费记录  
   **Then** 付费记录成功创建

2. **Given** 录入的右豹编码在 `users` 表中不存在  
   **When** 提交  
   **Then** 返回 `code: 10002`，提示"右豹编码不存在，请先录入用户主档"（满足 FR9）

3. **Given** 已有付费记录的用户  
   **When** 再次尝试为同一用户录入付费记录  
   **Then** 返回 `code: 10003`，提示"该用户已有付费记录，不可重复录入"（满足 FR9）

4. **Given** 付费金额填写为负数  
   **When** 提交  
   **Then** 校验拦截，`code: 10001`，提示"付费金额不可为负数"（满足 FR9）

5. **Given** 负责人删除某条付费记录  
   **When** 确认删除  
   **Then** 付费记录删除，同一事务中无需其他操作（`isPaid` 是实时计算，不存储冗余字段，满足 FR11）

6. **Given** 负责人修改付费记录  
   **When** 修改付费金额/付费时间/付费对接人并保存  
   **Then** 仅上述三个字段成功更新（满足 FR10）

## Tasks / Subtasks

- [x] Task 1: 创建 PaymentsModule — **本仓库跳过**（纯前端 Mock）

- [x] Task 2: 实现付费记录 API — **Mock** `frontend/src/mock/payments.ts`
  - [x] `GET /api/v1/payments`（分页 + `keyword` / 付费时间范围 / `contactPerson` / `createdBy` / `userId`）
  - [x] `GET /api/v1/users/:userId/payments`
  - [x] `GET /api/v1/payments/:id`
  - [x] `POST /api/v1/payments` + `appendMockAuditLog`（`payment_records`）
  - [x] `PATCH /api/v1/payments/:id` + 审计
  - [x] `DELETE /api/v1/payments/:id` + 审计

- [x] Task 3: 业务校验（Mock）
  - [x] 右豹编码不存在 → `10002`
  - [x] 用户已有付费记录 → `10003`
  - [x] 金额为负 → `10001`

- [x] Task 4: 前端付费记录管理
  - [x] `frontend/src/views/payments/PaymentList.vue` + `PaymentDetailDrawer.vue`
  - [x] `PaymentsView.vue` 挂载列表
  - [x] 新增 / 修改 / 删除弹窗；行点击进入详情抽屉 + 嵌入 `AuditLogTable`
  - [x] 字段/操作权限：`paymentAmount` / `paymentContact`、`payments:create|update|delete`
  - [x] 写操作后刷新 `useUserStore().loadUsers()` 保持主档列表一致

## Dev Notes

### 付费金额校验 DTO

```typescript
// create-payment.dto.ts
export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  rightLeopardCode: string  // 用于查找 userId

  @IsNumber()
  @Min(0, { message: '付费金额不可为负数' })
  amount: number

  @IsDateString()
  paymentTime: string

  @IsOptional()
  @IsString()
  contactPerson?: string
}
```

### 付费记录创建 Service

```typescript
async createPayment(dto: CreatePaymentDto, operatorId: bigint) {
  // 1. 查找用户
  const user = await this.prisma.user.findUnique({ where: { rightLeopardCode: dto.rightLeopardCode }, select: { id: true } })
  if (!user) throw new NotFoundException({ code: 10002, message: '右豹编码不存在，请先录入用户主档' })

  // 2. 检查重复付费
  const existing = await this.prisma.paymentRecord.count({ where: { userId: user.id } })
  if (existing > 0) throw new ConflictException({ code: 10003, message: '该用户已有付费记录，不可重复录入' })

  // 3. 创建付费记录
  return this.prisma.paymentRecord.create({
    data: {
      userId: user.id,
      amount: dto.amount,
      paymentTime: new Date(dto.paymentTime),
      contactPerson: dto.contactPerson,
      createdById: operatorId,
    },
  })
}
```

### 付费状态说明（架构决策）

`isPaid` 不是数据库字段，而是实时计算：
- `users` 表无 `is_paid` 字段
- 前端通过 `_count.paymentRecords > 0` 判断
- 删除付费记录后，查询结果自动反映未付费状态（FR11 "原子性回退"通过此机制实现，无需额外事务处理）

### 关键架构规范（不可偏离）

1. **付费状态不是冗余字段**：通过 `paymentRecords._count > 0` 实时计算，删除付费记录即自动"回退"
2. **修改仅允许三个字段**：`UpdatePaymentDto` 只含 `amount`/`paymentTime`/`contactPerson`，Service 层忽略其他字段
3. **`createdById` 记录操作人**：从 JWT `sub` 获取，不接受前端传入

### 前序 Story 依赖

- **Story 4.1**（`users` 数据）
- **Story 2.2**（`payments:create`、`payments:delete` 权限控制）

### Project Structure Notes

- PaymentRecord 数据模型：[Source: architecture.md#数据模型设计 PaymentRecord]
- FR7/FR9/FR10/FR11：[Source: epics.md#Story 4.5]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- `users` Mock 导出 `findMockUser`、`findMockUserByRightLeopardCode`、`getMergedMockUsers` 供付费 Mock 同步主档 `isPaid`、`paymentAmount`、`paymentPaidAt`、`paymentContact`、`paymentRecordsCount`。
- 首次拉列表时从已付费用户 **种子化** 一条付费记录，与现有用户数据一致。

### File List

- `frontend/src/types/payment.ts`
- `frontend/src/api/payments.ts`
- `frontend/src/stores/payment.ts`
- `frontend/src/mock/payments.ts`
- `frontend/src/mock/users.ts`（导出函数）
- `frontend/src/mock/index.ts`
- `frontend/src/views/PaymentsView.vue`
- `frontend/src/views/payments/PaymentList.vue`
- `frontend/src/views/payments/PaymentDetailDrawer.vue`

### Change Log

- 2026-04-07: Step 8 纯前端落地，状态 `review`
