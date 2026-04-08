# Story 9.3：客服个人建联看板

Status: review

## Story

作为**普通客服/专属顾问**，
我希望在 Dashboard 只看到自己的建联数据，
以便了解个人工作成果，不被其他数据干扰（满足 FR40）。

## Acceptance Criteria

1. **Given** 普通客服登录后进入 Dashboard  
   **When** 页面加载  
   **Then** 只展示该客服本人的建联用户数统计（不展示全局数据）

2. **Given** 客服查看个人 Dashboard  
   **When** 显示  
   **Then** 本月新增建联、历史累计建联、近30天每日建联趋势图；专属顾问额外可见本期付费转化数（字段权限；对齐原型 2.3「本月/历史」）

3. **Given** 普通客服访问全局 Dashboard 路由  
   **When** 路由守卫  
   **Then** redirect 到个人 Dashboard

## Tasks / Subtasks

- [x] Task 1: 个人 Dashboard API（Story 9.1 已实现 `/dashboard/agent`）

- [x] Task 2: 前端个人 Dashboard 视图 (AC: #1, #2)
  - [x] 在 `DashboardView.vue` 中根据权限渲染不同视图
  - [x] 个人视图：本月/历史建联 `MetricCard`、近30天趋势折线图（ECharts）
  - [x] 付费转化数：`hasFieldPermission('paymentAmount')` → `v-if`

- [x] Task 3: 路由权限处理 (AC: #3)
  - [x] 在 `router/index.ts` Dashboard 路由守卫中：非管理员/非审核员 → 去掉全局日期 query，等同个人看板入口
  - [x] `/funnel` 仅管理员/审核员可进，其余重定向至 Dashboard（与原型「客服不看漏斗」一致）

## Dev Notes

### ECharts 趋势图

```bash
pnpm add echarts vue-echarts
```

```vue
<!-- 近30天每日建联趋势 -->
<VChart :option="trendChartOption" style="height: 200px" />
```

### 路由守卫

```typescript
// 若无管理员权限，强制跳转个人视图
{ path: '/dashboard', beforeEnter: (to, from, next) => {
  const { hasOperationPermission } = usePermission()
  if (!hasOperationPermission('*')) {
    return next({ query: { view: 'personal' } })
  }
  next()
}}
```

### 前序 Story 依赖

- **Story 9.1**（个人 Dashboard API）
- **Story 9.2**（Dashboard.vue 框架）

### Project Structure Notes

- FR40 个人建联看板：[Source: epics.md#FR40]

## Dev Agent Record

### Agent Model Used

Composer (Cursor Agent)

### Debug Log References

### Completion Notes List

- `usePermission` 新增 `canViewGlobalDashboard`：`role === 'admin' || isAuditor` 为全局看板；`supervisor` / `kefu` 仅个人看板。
- Mock：`kefu`、`auditor` 增加 `dashboard:read`；`GET /api/v1/dashboard/agent` 返回 `periodNewConnections`、`periodPaymentConversions`、`trend30d`、`lastUpdatedAt`。
- 趋势图组件 `AgentConnectionTrendChart.vue` 使用 `echarts` 直接初始化（高度 200px），随 `data-theme` 切换配色。
- 对齐原型 `prototype-spec.md` 2.3：个人看板增加「历史累计建联」`MetricCard`，首卡文案改为「本月新增建联」；Mock/API 类型字段 `totalHistoricalConnections`。
- 侧栏对非全局用户隐藏「转化漏斗」菜单；直接访问 `/funnel` 重定向到 Dashboard。

### File List

- `frontend/src/composables/usePermission.ts`
- `frontend/src/mock/auth.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/api/dashboard.ts`
- `frontend/src/mock/dashboard.ts`
- `frontend/src/stores/dashboard.ts`
- `frontend/src/views/DashboardView.vue`
- `frontend/src/components/business/AgentConnectionTrendChart.vue`
- `frontend/src/router/index.ts`
- `frontend/src/components/layout/AppSidebar.vue`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/9-3-kefu-personal-dashboard.md`

## Change Log

- 2026-04-05：实现 Story 9.3 客服个人建联看板、Mock agent API、路由与侧栏约束。
- 2026-04-06：对齐原型客服个人视图「本月/历史」双指标，补充 `totalHistoricalConnections` 与骨架屏数量。
