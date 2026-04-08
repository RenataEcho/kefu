# Story 5.1：历史用户主档 Excel 批量导入

Status: review

## Story

作为**超级管理员**，
我希望能够将历史 Excel 中的用户主档数据批量导入系统，系统跳过实时 API 校验并标记待验证状态，
以便在不依赖 API 稳定性的前提下完成历史数据入库（满足 FR48）。

## Acceptance Criteria

1. **Given** 管理员上传历史用户主档 Excel 文件  
   **When** 提交导入  
   **Then** 系统解析数据，**跳过右豹 APP API 实时校验**，所有记录强制以 `PENDING_VERIFY` 状态入库

2. **Given** Excel 中存在字段格式错误（如手机号格式不合规）  
   **When** 导入处理完成  
   **Then** 展示失败记录列表（行号、字段名、错误原因），成功记录正常入库

3. **Given** Excel 中存在重复的右豹编码  
   **When** 处理该记录  
   **Then** 跳过并标注"编码已存在"，不覆盖现有记录

4. **Given** 导入完成  
   **When** 结果页面加载  
   **Then** 展示：成功导入条数、失败条数（含原因）、`PENDING_VERIFY` 标记条数；支持导出失败明细

5. **Given** 迁移场景  
   **When** 单次导入  
   **Then** 无 500 条上限限制（与 Story 4.6 普通导入区分）；过程异步，前端展示进度

## Tasks / Subtasks

- [x] Task 1: 创建历史迁移导入端点 (AC: #1, #5)
  - [x] `POST /api/v1/migration/users/import`（Mock；`type: MIGRATION`；无 500 条上限）
  - [x] 内存 `batches` + `setTimeout` 异步完成

- [x] Task 2: 实现迁移专用 Processor (AC: #1, #2, #3)
  - [x] 本地校验手机号；**无右豹 API**；成功行强制 `PENDING_VERIFY`
  - [x] 重复编码 → 失败行「编码已存在」

- [x] Task 3: 前端迁移导入页 (AC: #4, #5)
  - [x] 用户主档 `UserList` → Tab「历史迁移导入」+ `UserMigrationImportTab.vue`
  - [x] 轮询批次详情、结果统计、导出失败明细 xlsx

## Dev Notes

### 迁移与普通导入的关键区别

| 维度 | 普通导入（Story 4.6）| 历史迁移（Story 5.1）|
|------|---------------------|---------------------|
| 行数上限 | 500 条 | 无上限 |
| API 校验 | 执行实时校验 | **完全跳过** |
| 入库状态 | VERIFIED（通过后）| **强制 PENDING_VERIFY** |
| 后续步骤 | 无 | Story 5.3 批量补校验 |

### 迁移 Excel 字段映射

```typescript
interface MigrationUserRow {
  rowNumber: number
  rightLeopardCode: string    // 右豹编码（必填）
  rightLeopardId?: string     // 右豹ID（可选）
  larkId?: string             // 飞书ID（可选）
  larkPhone?: string          // 飞书手机号（可选，格式校验）
  larkNickname?: string       // 飞书昵称（可选）
  agentName?: string          // 客服名称（需匹配系统中已有客服）
  mentorName?: string         // 导师名称（需匹配）
  schoolName?: string         // 门派名称（需匹配）
}
```

### 关键约束

- 所有迁移导入记录 `codeVerifyStatus = 'PENDING_VERIFY'`（绝对不设为 VERIFIED）
- `agentName`、`mentorName`、`schoolName` 通过名称匹配到 ID（不存在时跳过关联）

### 前序 Story 依赖

- **Story 4.6**（`excel-import-process` BullMQ 队列、exceljs 已集成）
- **Story 3.1~3.3**（`schools`、`agents`、`mentors` 已有数据用于名称匹配）

### Project Structure Notes

- FR48 历史数据迁移规格：[Source: epics.md#FR48]
- ImportBatch 模型：[Source: architecture.md#数据模型设计 ImportBatch]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 权限：`users:migration:import`（Mock admin）；`users.ts` 导出 `takeNextMockUserId` / `insertCreatedMockUser`。

### File List

- `frontend/src/mock/migrationUsers.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/mock/users.ts`
- `frontend/src/mock/auth.ts`
- `frontend/src/mock/roles.ts`
- `frontend/src/api/migrationUsers.ts`
- `frontend/src/types/migrationUsers.ts`
- `frontend/src/utils/migrationUserImportExcel.ts`
- `frontend/src/views/users/UserMigrationImportTab.vue`
- `frontend/src/views/users/UserList.vue`
- `frontend/src/utils/permission.ts`
