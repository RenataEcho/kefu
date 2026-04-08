# Story 9.2：管理员全局运营看板

Status: review

## Story

作为**超级管理员**，
我希望看到实时的全局运营看板，包含付费/普通用户数、各门派/导师/客服概览，
以便 5 分钟内完成运营数据汇报（满足 FR39）。

## Acceptance Criteria

1. **Given** 管理员进入 Dashboard（缓存有效时）  
   **When** 页面加载  
   **Then** ≤ 2 秒完整展示：付费用户总数、普通用户总数（`MetricCard` 玻璃拟态，满足 UX-DR9）

2. **Given** 管理员查看各门派概览  
   **When** 切换区域  
   **Then** 各门派学员数量和收益排名，不分页（上限 50 条）

3. **Given** 管理员查看各导师概览  
   **When** 切换  
   **Then** 各导师学员绑定数和学员总收益（第三方 API 缓存数据，标注最后同步时间）

4. **Given** 管理员查看各客服建联数  
   **When** 切换  
   **Then** 各客服本期新增建联用户数（当前日期范围统计）

## Tasks / Subtasks

- [x] Task 1: 实现 Dashboard.vue（管理员视图）(AC: #1, #2, #3, #4)
  - [x] 创建 `frontend/src/views/Dashboard.vue`（已在 Story 2.5 路由预留）
  - [x] 顶部：日期范围筛选器（Story 9.4 实现，此处占位）
  - [x] 第一行：付费/普通用户数 `MetricCard` × 2
  - [x] Tab 切换区：门派概览 / 导师概览 / 客服概览
  - [x] 数据通过 `GET /api/v1/dashboard/global` 获取（Story 9.1）

- [x] Task 2: 各概览区域前端组件
  - [x] 门派概览：NDataTable，列：门派名、学员数、总收益（降序）
  - [x] 导师概览：NDataTable，含同步时间标注
  - [x] 客服概览：NDataTable，本期建联数

## Dev Notes

### MetricCard 使用

```vue
<MetricCard title="付费学员" :value="data.paidUserCount" unit="人" />
<MetricCard title="普通用户" :value="data.regularUserCount" unit="人" />
```

MetricCard 组件在 Story 2.6 中已实现。

### 权限控制

普通客服登录后，`Dashboard` 路由检测权限：
- 有 `dashboard:read` 菜单权限且 `is_auditor` 或管理员 → 全局 Dashboard
- 普通客服 → redirect 到个人 Dashboard（Story 9.3）

### 关键架构规范

1. **数据来自缓存 API**（Story 9.1 实现，此 Story 只做前端展示）
2. **MetricCard 使用玻璃拟态主题**（Story 2.6 组件，UX-DR9）

### 前序 Story 依赖

- **Story 9.1**（Dashboard API）
- **Story 2.6**（MetricCard 组件）

### Project Structure Notes

- FR39 全局运营看板规格：[Source: epics.md#FR39]
- UX-DR9 指标卡片样式：[Source: architecture.md#UX-DR9]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking (BMad Dev Story)

### Debug Log References

### Completion Notes List

- ✅ 创建 `types/dashboard.ts` — Dashboard 全局数据类型定义（DashboardMetrics, SchoolOverviewItem, MentorOverviewItem, AgentOverviewItem, DashboardGlobalData）
- ✅ 创建 `mock/dashboard.ts` — 基于已有 MOCK_AGENTS/MOCK_MENTORS/MOCK_SCHOOLS 生成贴近真实业务的 Mock 数据，注册 `GET /api/v1/dashboard/global` 端点
- ✅ 创建 `api/dashboard.ts` — 封装 `fetchGlobalDashboard()` API 调用
- ✅ 更新 `stores/dashboard.ts` — 完整的 Pinia store，含 loading/error 状态管理和数据拉取逻辑
- ✅ 重写 `views/DashboardView.vue` — 完整管理员全局看板：
  - 页面标题 + 日期筛选器占位（Story 9.4）+ 最后更新时间
  - 2 列 MetricCard（付费学员 / 普通用户），玻璃拟态样式
  - 三 Tab 概览区：门派概览 / 导师概览 / 客服概览，均使用 NDataTable
  - 门派表：门派名、学员数、总收益（默认降序排列）
  - 导师表：导师名、所属门派、学员绑定数、学员总收益、最后同步时间（NTag 展示 fromNow）
  - 客服表：客服名、累计建联用户数、本期新增建联（默认降序）、其中付费学员数
  - 骨架屏加载态 + 错误态 + 空态处理
  - 颜色/字体/间距严格遵循 UX 设计规范
- ✅ 更新 `mock/index.ts` — 注册 dashboard mock 模块
- ✅ Vite 构建通过，无 lint 错误

### File List

- frontend/src/types/dashboard.ts (新增)
- frontend/src/mock/dashboard.ts (新增)
- frontend/src/api/dashboard.ts (新增)
- frontend/src/stores/dashboard.ts (修改)
- frontend/src/views/DashboardView.vue (修改)
- frontend/src/mock/index.ts (修改)

### Change Log

- 2026-04-04: Story 9-2 全量实现 — 管理员全局运营看板前端页面，含 MetricCard 指标卡、三 Tab 概览表格、Mock 数据、API 层、Store 层
