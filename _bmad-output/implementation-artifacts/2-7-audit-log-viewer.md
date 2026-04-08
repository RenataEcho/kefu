# Story 2.7：操作日志查看页

Status: ready-for-dev

## Story

作为**超级管理员**，
我希望能够查看各业务表的操作日志记录，
以便追溯任何数据变更的操作人、时间和变更内容（满足 FR47）。

## Acceptance Criteria

1. **Given** 管理员进入操作日志查看页  
   **When** 页面加载  
   **Then** 展示日志列表，字段包含：操作时间、操作人昵称、操作表名、操作类型（创建/修改/删除/审核）、操作记录ID、前后数据快照（可展开显示 JSON）

2. **Given** 日志列表顶部筛选器  
   **When** 按业务表名筛选（用户主档/付费记录/入群审核/客服/导师/门派）  
   **Then** 列表仅显示所选业务表的日志记录（满足 FR47 六张业务表范围）

3. **Given** 日志列表  
   **When** 查看  
   **Then** 分页 20 条/页；按创建时间倒序排列；**页面上无任何删除或修改日志的操作入口**（满足 NFR10）

4. **Given** 任意业务记录详情侧边栏  
   **When** 展示该记录的操作日志区域  
   **Then** 默认显示最近 20 条操作日志，底部提供「加载更多」按钮（满足 NFR21）

5. **Given** 日志条目中的 `before_data` 和 `after_data`  
   **When** 用户点击展开  
   **Then** 以格式化 JSON 展开显示（代码字体，JSON 高亮），默认折叠

## Tasks / Subtasks

- [ ] Task 1: 完善 AuditLogsController (AC: #1, #2, #3)
  - [ ] 确认 Story 1.5 创建的 `AuditLogsController` 包含：
    - `GET /api/v1/audit-logs`：支持 `tableName`、`operatorId`、`startDate`、`endDate`、`page`、`pageSize` 筛选
    - `GET /api/v1/audit-logs/:id`：日志详情
  - [ ] 确认**无** `DELETE`、`PATCH`、`POST` 端点（只读）
  - [ ] 需要权限：`audit-logs:read`（菜单权限）

- [ ] Task 2: 前端操作日志列表页 (AC: #1, #2, #3, #5)
  - [ ] 创建 `frontend/src/views/audit-logs/AuditLogList.vue`（或复用架构中的视图路径）
  - [ ] 顶部筛选：业务表名下拉（6个选项 + 全部）、时间范围、操作类型
  - [ ] 表格列：操作时间、操作人、操作表、操作类型（Tag 样式）、记录ID
  - [ ] 行展开：点击行展开显示 `before_data` / `after_data` JSON
  - [ ] **无任何删除/修改按钮**

- [ ] Task 3: AuditLogTable 通用组件（业务记录内嵌日志）(AC: #4)
  - [ ] 创建 `frontend/src/components/common/AuditLogTable.vue`
  - [ ] Props：`tableName: string`、`recordId: string | number`
  - [ ] 自动请求该记录的操作日志（前 20 条）
  - [ ] 「加载更多」按钮追加下一页

- [ ] Task 4: 配置路由和菜单 (AC: #3)
  - [ ] 路由：`/audit-logs` → `AuditLogList.vue`（权限：`audit-logs:read`）
  - [ ] 侧边栏菜单「操作日志」条目（已在 Story 2.5 中预留）

## Dev Notes

### 操作类型中文映射

```typescript
const ACTION_TYPE_MAP: Record<string, { label: string; type: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  CREATE:        { label: '创建', type: 'success' },
  UPDATE:        { label: '修改', type: 'warning' },
  DELETE:        { label: '删除', type: 'error' },
  AUDIT_APPROVE: { label: '审核通过', type: 'success' },
  AUDIT_REJECT:  { label: '审核拒绝', type: 'error' },
  ARCHIVE:       { label: '归档', type: 'default' },
  IMPORT:        { label: '批量导入', type: 'info' },
  EXPORT:        { label: '数据导出', type: 'info' },
}
```

### 业务表名筛选选项

```typescript
const TABLE_NAME_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'users', label: '用户主档' },
  { value: 'payment_records', label: '付费记录' },
  { value: 'group_audits', label: '入群审核' },
  { value: 'agents', label: '客服' },
  { value: 'mentors', label: '导师' },
  { value: 'schools', label: '门派' },
]
```

### JSON 展开显示组件

使用 Naive UI `NCode` 组件（`language="json"` 带语法高亮）：

```vue
<NCode v-if="row.afterData" :code="JSON.stringify(row.afterData, null, 2)" language="json" />
```

### AuditLogsController 确认清单

来自 Story 1.5：
- ✅ `GET /api/v1/audit-logs`（列表 + 筛选）
- ✅ `GET /api/v1/audit-logs/:id`（详情）
- ❌ 无 `POST /api/v1/audit-logs`
- ❌ 无 `PATCH /api/v1/audit-logs/:id`
- ❌ 无 `DELETE /api/v1/audit-logs/:id`

### 关键架构规范（不可偏离）

1. **只读页面**：前端不渲染任何修改/删除操作按钮（满足 NFR10）
2. **`tableName` 筛选限制在 6 张业务表**：不展示系统内部表（如 `import_batches`）
3. **JSON 展示用等宽字体**：JetBrains Mono（UX-DR3）

### 前序 Story 依赖

- **Story 1.5**（AuditLogsController 只读 API 已就绪）
- **Story 2.5**（前端框架 + 路由守卫）

### Project Structure Notes

- FR47 操作日志查看：[Source: epics.md#Story 2.7]
- NFR10 审计日志不可篡改：[Source: architecture.md#操作日志不可篡改设计]
- 操作日志字段：[Source: architecture.md#数据模型设计 AuditLog]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
