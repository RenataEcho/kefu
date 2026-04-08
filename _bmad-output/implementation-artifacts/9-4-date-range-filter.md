# Story 9.4：日期范围筛选器

Status: review

## Story

作为**管理员/客服**，
我希望 Dashboard 数据支持 5 个快捷日期范围切换，
以便快速进行月度、季度环比分析（满足 FR41）。

## Acceptance Criteria

1. **Given** Dashboard 顶部筛选器  
   **When** 加载  
   **Then** 默认「本月」，5 个快捷选项：本月 / 上月 / 本季度 / 上季度 / 自定义区间

2. **Given** 点击「上月」  
   **When** 选择生效  
   **Then** 所有 Dashboard 区域数据切换；URL query 参数更新（`?dateRange=last_month`）

3. **Given** 选择「自定义区间」  
   **When** 确认  
   **Then** 数据按所选区间重新加载

4. **Given** 切换且缓存命中  
   **When** 数据返回  
   **Then** ≤ 2 秒

## Tasks / Subtasks

- [x] Task 1: 日期范围筛选器组件 (AC: #1, #2, #3)
  - [x] 创建 `frontend/src/components/common/DateRangeFilter.vue`
  - [x] `NRadioGroup` 5 个快捷选项 + `NDatePicker` 自定义区间
  - [x] emit `change` 事件，携带 `{ dateRange, startDate?, endDate? }`
  - [x] URL Query 参数同步（`useRoute`/`useRouter`）

- [x] Task 2: Dashboard Pinia Store 集成 (AC: #2, #4)
  - [x] `frontend/src/stores/dashboard.ts`：`dateRange`、`dashboardData`
  - [x] watch `dateRange` → 重新请求 API

## Dev Notes

### URL 参数同步

```typescript
// 页面刷新保持日期范围
const route = useRoute()
const dateRange = ref(route.query.dateRange as string || 'current_month')

watch(dateRange, (val) => {
  router.replace({ query: { ...route.query, dateRange: val } })
  dashboardStore.fetchData(val)
})
```

### 前序 Story 依赖

- **Story 9.1**（日期范围 API 参数）
- **Story 9.2**（Dashboard 页面框架）

### Project Structure Notes

- FR41 5种日期范围规格：[Source: epics.md#FR41]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- 实现 `DateRangeFilter`：`NRadioButton` 五档 + 自定义时 `NDatePicker`（daterange）与「应用」确认；`router.replace` 同步 `dateRange` / `startDate` / `endDate`；`emit('change')` 供扩展。
- `DashboardView` 监听 `route.query` 与 store `syncDateFilterFromRoute` + `loadGlobalDashboard()`，避免重复请求逻辑分叉。
- `fetchGlobalDashboard` 携带 query；Mock 按 `dateRange`（及 custom 的日期）缩放漏斗与门派/导师/客服「本期」数据；核心指标中「本月建联」与待审核列表按原型与筛选解耦（Mock 中保持固定）。
- 看板页标题/模块标题字号对齐 UX 规范（24px / 16px）；筛选器样式使用全局 CSS 变量（indigo 强调、8px 圆角、13px 正文）。
- 仓库未配置单元测试运行器；以 `npm run build`（tsc + vite build）作为回归验证。

### File List

- `frontend/src/components/common/DateRangeFilter.vue`（新建）
- `frontend/src/views/DashboardView.vue`
- `frontend/src/stores/dashboard.ts`
- `frontend/src/api/dashboard.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/mock/dashboard.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-05：完成 Story 9.4 日期范围筛选、URL 同步、Dashboard store 与 Mock 参数联动；sprint 状态 `9-4-date-range-filter` → `review`。
