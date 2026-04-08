# Story 1.3：Prisma 完整数据库 Schema 与迁移初始化

Status: ready-for-dev

## Story

作为**开发者**，
我希望全部业务表通过 Prisma Schema 定义并完成初始迁移，
以便后续各 Epic 可直接基于已就绪的数据库结构进行开发。

## Acceptance Criteria

1. **Given** `backend/prisma/schema.prisma` 已定义  
   **When** 运行 `prisma migrate dev`  
   **Then** 以下所有表成功创建：`users`、`payment_records`、`group_audits`、`agents`、`mentors`、`schools`（门派）、`accounts`、`roles`、`lark_friend_requests`、`notifications`、`sla_warnings`（预警记录）、`audit_logs`、`import_batches`、`youbao_user_stats`

2. **Given** `users` 表中的 `right_leopard_code` 字段  
   **When** 尝试插入重复的右豹编码  
   **Then** 数据库层抛出唯一约束违规错误，索引名为 `idx_users_right_leopard_code`（Prisma `@unique` 生成）

3. **Given** `audit_logs` 表及数据库应用账号权限  
   **When** 应用账号尝试对 `audit_logs` 执行 DELETE 或 UPDATE  
   **Then** 数据库层权限拒绝该操作（应用账号对 `audit_logs` 表仅有 INSERT/SELECT 权限）

4. **Given** 审查数据库表结构  
   **When** 检查所有表名和字段名  
   **Then** 所有表名为 `snake_case` 复数命名；所有主键为 `BIGINT AUTO_INCREMENT`；`created_at` 和 `updated_at` 由 Prisma `@default(now())` 和 `@updatedAt` 自动管理

5. **Given** 审查外键配置  
   **When** 检查数据库层面的外键  
   **Then** 外键关联仅在 Prisma Schema 层定义（应用层校验），数据库层**不设置** `ON DELETE CASCADE`，防止意外数据丢失

6. **Given** 运行 `prisma generate`  
   **When** 检查生成的 TypeScript 类型  
   **Then** 所有模型的 TypeScript 类型正确生成，可在 `@prisma/client` 中使用

## Tasks / Subtasks

- [ ] Task 1: 配置 Prisma 基础设置 (AC: #4)
  - [ ] 确认 `backend/prisma/schema.prisma` 已存在（Story 1.1 创建了目录）
  - [ ] 配置 Prisma `generator`（`provider = "prisma-client-js"`）
  - [ ] 配置 `datasource db`：`provider = "mysql"`，`url = env("DATABASE_URL")`
  - [ ] 设置 BigInt 序列化：在 `main.ts` 中添加 `BigInt.prototype.toJSON = function() { return this.toString() }`（Prisma BigInt → JSON 序列化需要）

- [ ] Task 2: 定义核心业务表 Schema (AC: #1, #2, #4, #5)
  - [ ] 定义 `User` 模型（含 `right_leopard_code` 唯一索引）
  - [ ] 定义 `PaymentRecord` 模型
  - [ ] 定义 `GroupAudit` 模型（含状态枚举、SLA 字段）
  - [ ] 定义 `Notification` 模型
  - [ ] 定义 `LarkFriendRequest` 模型

- [ ] Task 3: 定义组织架构表 Schema (AC: #1, #4, #5)
  - [ ] 定义 `School`（门派）模型
  - [ ] 定义 `Mentor` 模型（含 `school_id` 外键、第三方API同步字段）
  - [ ] 定义 `Agent`（客服）模型（含飞书 OAuth Token 字段）

- [ ] Task 4: 定义账号权限表 Schema (AC: #1, #4)
  - [ ] 定义 `Role` 模型（含 `permissions Json` 字段）
  - [ ] 定义 `Account` 模型（含 `login_id` 唯一索引、`is_auditor` 字段）

- [ ] Task 5: 定义审计与辅助表 Schema (AC: #1, #3, #4)
  - [ ] 定义 `AuditLog` 模型（`before_data Json?`、`after_data Json?`、冗余 `operator_name`）
  - [ ] 定义 `ImportBatch` 模型（含 `batch_no` 唯一索引）
  - [ ] 定义 `YoubaoUserStats` 模型（含 `right_leopard_code` 唯一索引）
  - [ ] 注意：`AuditLog` 表在 Prisma Schema 中**无** `delete` 操作权限（通过应用层约束）

- [ ] Task 6: 创建数据库初始化 SQL 脚本 (AC: #3)
  - [ ] 创建 `backend/prisma/init-permissions.sql`
  - [ ] 包含限制应用账号权限的 SQL：对 `audit_logs` 表仅授予 `SELECT, INSERT` 权限，撤销 `UPDATE, DELETE`
  - [ ] 添加注释说明此脚本需手动在生产环境执行（Prisma 不管理 DB 用户权限）

- [ ] Task 7: 创建种子数据脚本 (AC: #1)
  - [ ] 创建 `backend/prisma/seed.ts`
  - [ ] 包含初始管理员账号（loginId: `admin`，password: bcrypt(`admin123`)，role: 超级管理员）
  - [ ] 包含初始角色组（超级管理员：拥有所有权限）
  - [ ] 在 `backend/package.json` 中配置 `prisma.seed` 命令

- [ ] Task 8: 执行迁移并验证 (AC: #1, #2, #6)
  - [ ] 运行 `npx prisma migrate dev --name init`
  - [ ] 验证所有 14 张表成功创建
  - [ ] 运行 `npx prisma generate` 确认类型生成正常
  - [ ] 运行 `npx prisma db seed` 确认种子数据写入

## Dev Notes

### 完整 Prisma Schema

以下为完整的 `schema.prisma` 内容，必须**完全按此实现**，不得擅自修改字段名、类型或索引：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── 用户主档 ────────────────────────────────────────────────────────────────
model User {
  id                  BigInt    @id @default(autoincrement())
  rightLeopardCode    String    @unique @map("right_leopard_code") @db.VarChar(50)
  rightLeopardId      String?   @map("right_leopard_id") @db.VarChar(50)
  larkId              String?   @map("lark_id") @db.VarChar(50)
  larkPhone           String?   @map("lark_phone") @db.VarChar(20)
  larkNickname        String?   @map("lark_nickname") @db.VarChar(100)
  wxOpenId            String?   @map("wx_open_id") @db.VarChar(100)  // 绝不暴露到API响应
  codeVerifyStatus    String    @default("VERIFIED") @map("code_verify_status") @db.VarChar(20)
  // 状态枚举: VERIFIED | PENDING_VERIFY（跳过校验时）
  agentId             BigInt?   @map("agent_id")
  mentorId            BigInt?   @map("mentor_id")
  schoolId            BigInt?   @map("school_id")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  agent               Agent?    @relation(fields: [agentId], references: [id])
  mentor              Mentor?   @relation(fields: [mentorId], references: [id])
  school              School?   @relation(fields: [schoolId], references: [id])
  paymentRecords      PaymentRecord[]
  groupAudits         GroupAudit[]
  notifications       Notification[]

  @@map("users")
  @@index([agentId], name: "idx_users_agent_id")
  @@index([mentorId], name: "idx_users_mentor_id")
  @@index([schoolId], name: "idx_users_school_id")
  @@index([codeVerifyStatus], name: "idx_users_code_verify_status")
}

// ─── 付费记录 ────────────────────────────────────────────────────────────────
model PaymentRecord {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  amount          Decimal   @db.Decimal(10, 2)
  paymentTime     DateTime  @map("payment_time")
  contactPerson   String?   @map("contact_person") @db.VarChar(100)
  createdById     BigInt    @map("created_by_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user            User      @relation(fields: [userId], references: [id])

  @@map("payment_records")
  @@index([userId], name: "idx_payment_records_user_id")
  @@index([paymentTime], name: "idx_payment_records_payment_time")
}

// ─── 入群审核 ────────────────────────────────────────────────────────────────
model GroupAudit {
  id                  BigInt    @id @default(autoincrement())
  userId              BigInt    @map("user_id")
  status              String    @default("PENDING") @db.VarChar(20)
  // 状态枚举: PENDING | PROCESSING | APPROVED | REJECTED | ARCHIVED
  applyTime           DateTime  @map("apply_time")       // SLA计时起点
  applySource         String    @default("LARK_API") @map("apply_source") @db.VarChar(20)
  // 来源枚举: LARK_API | MANUAL_IMPORT
  processedById       BigInt?   @map("processed_by_id")
  processedAt         DateTime? @map("processed_at")
  rejectReason        String?   @map("reject_reason") @db.VarChar(500)
  archiveType         String?   @map("archive_type") @db.VarChar(20)
  // 归档类型: RE_SUBMIT | AUTO_EXPIRE | MANUAL
  archiveReason       String?   @map("archive_reason") @db.VarChar(500)
  archivedAt          DateTime? @map("archived_at")
  firstAlertSentAt    DateTime? @map("first_alert_sent_at")
  secondAlertSentAt   DateTime? @map("second_alert_sent_at")
  importBatchId       BigInt?   @map("import_batch_id")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  user                User      @relation(fields: [userId], references: [id])
  notifications       Notification[]

  @@map("group_audits")
  @@index([status], name: "idx_group_audits_status")
  @@index([applyTime], name: "idx_group_audits_apply_time")
  @@index([userId], name: "idx_group_audits_user_id")
}

// ─── 消息通知记录 ──────────────────────────────────────────────────────────
model Notification {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  groupAuditId    BigInt?   @map("group_audit_id")
  scenario        String    @db.VarChar(50)
  // 场景枚举: AUDIT_APPROVED | AUDIT_REJECTED | SLA_ALERT_FIRST | SLA_ALERT_SECOND
  channel         String    @default("WECHAT_MP") @db.VarChar(30)
  // 渠道枚举: WECHAT_MP（预留扩展）
  status          String    @default("PENDING") @db.VarChar(20)
  // 状态枚举: PENDING | SENT | FAILED
  failureReason   String?   @map("failure_reason") @db.VarChar(200)
  handleStatus    String    @default("PENDING_FOLLOW") @map("handle_status") @db.VarChar(20)
  // 处理状态枚举: PENDING_FOLLOW | HANDLED
  sentAt          DateTime? @map("sent_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id])
  groupAudit      GroupAudit? @relation(fields: [groupAuditId], references: [id])

  @@map("notifications")
  @@index([userId], name: "idx_notifications_user_id")
  @@index([status, handleStatus], name: "idx_notifications_status")
}

// ─── 飞书好友申请 ──────────────────────────────────────────────────────────
model LarkFriendRequest {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @map("user_id")
  operatorType    String    @map("operator_type") @db.VarChar(20)
  // 操作人类型: AGENT | MENTOR
  operatorId      BigInt    @map("operator_id")
  status          String    @default("PENDING") @db.VarChar(20)
  // 状态枚举: PENDING | ACCEPTED | REJECTED | TIMEOUT | MANUAL_CONFIRMED
  requestedAt     DateTime  @default(now()) @map("requested_at")
  respondedAt     DateTime? @map("responded_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("lark_friend_requests")
  @@index([userId], name: "idx_lark_friend_requests_user_id")
  @@index([status], name: "idx_lark_friend_requests_status")
}

// ─── 客服 ────────────────────────────────────────────────────────────────────
model Agent {
  id                  BigInt    @id @default(autoincrement())
  name                String    @db.VarChar(50)
  status              String    @default("ACTIVE") @db.VarChar(20)
  // 状态枚举: ACTIVE | DISABLED
  wxQrcodeUrl         String?   @map("wx_qrcode_url") @db.VarChar(500)
  larkAccessToken     String?   @map("lark_access_token") @db.VarChar(500)
  larkTokenExpiresAt  DateTime? @map("lark_token_expires_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  users               User[]

  @@map("agents")
}

// ─── 导师 ────────────────────────────────────────────────────────────────────
model Mentor {
  id                  BigInt    @id @default(autoincrement())
  name                String    @db.VarChar(50)
  schoolId            BigInt    @map("school_id")
  status              String    @default("ACTIVE") @db.VarChar(20)
  // 状态枚举: ACTIVE | DISABLED
  larkAccessToken     String?   @map("lark_access_token") @db.VarChar(500)
  larkTokenExpiresAt  DateTime? @map("lark_token_expires_at")
  thirdPartyId        String?   @map("third_party_id") @db.VarChar(50)
  studentCount        Int       @default(0) @map("student_count")
  projectCount        Int       @default(0) @map("project_count")
  totalRevenue        Decimal   @default(0) @map("total_revenue") @db.Decimal(12, 2)
  lastSyncedAt        DateTime? @map("last_synced_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  school              School    @relation(fields: [schoolId], references: [id])
  users               User[]

  @@map("mentors")
  @@index([schoolId], name: "idx_mentors_school_id")
}

// ─── 门派（School）────────────────────────────────────────────────────────────
model School {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)
  status          String    @default("ACTIVE") @db.VarChar(20)
  // 状态枚举: ACTIVE | DISABLED
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  mentors         Mentor[]
  users           User[]

  @@map("schools")
}

// ─── 角色组 ──────────────────────────────────────────────────────────────────
model Role {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)
  department      String?   @db.VarChar(50)
  permissions     Json
  // JSON结构: { menuPerms: string[], operationPerms: string[], fieldPerms: Record<string, boolean> }
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  accounts        Account[]

  @@map("roles")
}

// ─── 后台账号 ────────────────────────────────────────────────────────────────
model Account {
  id              BigInt    @id @default(autoincrement())
  name            String    @db.VarChar(50)            // 显示名（可自改）
  loginId         String    @unique @map("login_id") @db.VarChar(50)   // 登录账号（不可改）
  passwordHash    String    @map("password_hash") @db.VarChar(100)     // bcrypt hash
  roleId          BigInt    @map("role_id")
  isAuditor       Boolean   @default(false) @map("is_auditor")
  status          String    @default("ACTIVE") @db.VarChar(20)
  // 状态枚举: ACTIVE | DISABLED（必须先禁用才可删除）
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  role            Role      @relation(fields: [roleId], references: [id])

  @@map("accounts")
}

// ─── 操作日志 ────────────────────────────────────────────────────────────────
// 重要：此表应用账号只有 INSERT/SELECT 权限，不可 UPDATE/DELETE
model AuditLog {
  id              BigInt    @id @default(autoincrement())
  tableName       String    @map("table_name") @db.VarChar(50)
  recordId        BigInt    @map("record_id")
  operatorId      BigInt?   @map("operator_id")      // null = 系统自动操作
  operatorName    String?   @map("operator_name") @db.VarChar(50)  // 冗余存储（防账号删除后丢失）
  actionType      String    @map("action_type") @db.VarChar(30)
  // 枚举: CREATE | UPDATE | DELETE | AUDIT_APPROVE | AUDIT_REJECT | ARCHIVE | IMPORT | EXPORT
  beforeData      Json?     @map("before_data")
  afterData       Json?     @map("after_data")
  remark          String?   @db.VarChar(500)
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("audit_logs")
  @@index([tableName, recordId], name: "idx_audit_logs_table_record")
  @@index([operatorId], name: "idx_audit_logs_operator_id")
  @@index([createdAt], name: "idx_audit_logs_created_at")
}

// ─── 导入批次记录 ──────────────────────────────────────────────────────────
model ImportBatch {
  id              BigInt    @id @default(autoincrement())
  batchNo         String    @unique @map("batch_no") @db.VarChar(20)
  // 格式: IMP-000001（6位自增，全局唯一）
  importType      String    @map("import_type") @db.VarChar(30)
  // 类型: USER_IMPORT | PAYMENT_IMPORT | GROUP_AUDIT_IMPORT
  operatorId      BigInt    @map("operator_id")
  fileName        String    @map("file_name") @db.VarChar(200)
  totalCount      Int       @default(0) @map("total_count")
  localPassCount  Int       @default(0) @map("local_pass_count")
  apiPassCount    Int       @default(0) @map("api_pass_count")
  failCount       Int       @default(0) @map("fail_count")
  status          String    @default("PROCESSING") @db.VarChar(20)
  // 状态枚举: PROCESSING | COMPLETED | PARTIAL_FAILED
  errorFileUrl    String?   @map("error_file_url") @db.VarChar(500)
  createdAt       DateTime  @default(now()) @map("created_at")
  completedAt     DateTime? @map("completed_at")

  @@map("import_batches")
}

// ─── 右豹用户动作数据缓存表 ────────────────────────────────────────────────
// 定时刷新，不是事务性数据
model YoubaoUserStats {
  id                  BigInt    @id @default(autoincrement())
  rightLeopardCode    String    @unique @map("right_leopard_code") @db.VarChar(50)
  keywordCount        Int       @default(0) @map("keyword_count")
  orderCount          Int       @default(0) @map("order_count")
  projectRevenue      Decimal   @default(0) @map("project_revenue") @db.Decimal(12, 2)
  lastSyncedAt        DateTime? @map("last_synced_at")
  syncStatus          String    @default("SYNCED") @map("sync_status") @db.VarChar(20)
  // 状态枚举: SYNCING | SYNCED | FAILED | PENDING_VERIFY
  updatedAt           DateTime  @updatedAt @map("updated_at")

  @@map("youbao_user_stats")
}
```

### 数据库权限初始化脚本

创建 `backend/prisma/init-permissions.sql`（手动在生产环境执行，Prisma migrate 不包含）：

```sql
-- 限制应用账号对 audit_logs 表的权限
-- 应用账号: kefu_user（对应 DATABASE_URL 中的用户）

-- 撤销 UPDATE 和 DELETE 权限（如果之前有的话）
REVOKE UPDATE, DELETE ON kefu_db.audit_logs FROM 'kefu_user'@'%';

-- 仅保留 SELECT 和 INSERT
GRANT SELECT, INSERT ON kefu_db.audit_logs TO 'kefu_user'@'%';

FLUSH PRIVILEGES;
```

### BigInt 序列化处理

在 `backend/src/main.ts` 的 `bootstrap()` 中，在 `app.listen()` 之前添加：

```typescript
// BigInt 序列化到 JSON（Prisma BigInt 默认不支持 JSON.stringify）
(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
```

### 种子数据脚本

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 创建超级管理员角色
  const adminRole = await prisma.role.upsert({
    where: { id: 1n },
    update: {},
    create: {
      name: '超级管理员',
      permissions: {
        menuPerms: ['*'],           // 所有菜单权限
        operationPerms: ['*'],      // 所有操作权限
        fieldPerms: { paymentAmount: true, paymentContact: true },
      },
    },
  })

  // 创建初始管理员账号
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.account.upsert({
    where: { loginId: 'admin' },
    update: {},
    create: {
      name: '系统管理员',
      loginId: 'admin',
      passwordHash,
      roleId: adminRole.id,
      isAuditor: true,
    },
  })

  console.log('种子数据初始化完成')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

在 `backend/package.json` 中添加：
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### 关键架构规范（不可偏离）

1. **主键类型**：全局使用 `BigInt @id @default(autoincrement())`，不使用 `Int`
2. **外键不设 CASCADE**：Prisma Schema 层定义关联关系，数据库层无 `ON DELETE CASCADE`
3. **字段名映射**：TypeScript 字段用 camelCase（`rightLeopardCode`），数据库字段用 snake_case（通过 `@map("right_leopard_code")`）
4. **表名映射**：模型名用 PascalCase（`GroupAudit`），数据库表名用 snake_case 复数（通过 `@@map("group_audits")`）
5. **wx_open_id 绝不在 API 响应中出现**：所有涉及 User 的查询必须在 Prisma `select` 中显式排除 `wxOpenId`
6. **`audit_logs` 只写不改**：应用层不提供任何修改/删除审计日志的功能；`init-permissions.sql` 在数据库层双重保障

### Project Structure Notes

- 完整 Prisma Schema：[Source: architecture.md#数据模型设计]
- 数据库主键策略：[Source: architecture.md#数据库主键策略]
- ORM 与迁移策略：[Source: architecture.md#ORM与迁移策略]
- 操作日志不可篡改设计：[Source: architecture.md#操作日志不可篡改设计]
- 命名规范（数据库）：[Source: architecture.md#数据库命名（Prisma Schema）]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
