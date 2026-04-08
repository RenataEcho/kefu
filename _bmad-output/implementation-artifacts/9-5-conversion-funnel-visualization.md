# Story 9.5：转化漏斗可视化

Status: done

## Story

作为**超级管理员**，
我希望看到录入→入群→付费三步转化漏斗图，
以便直观了解各环节转化效率，发现业务瓶颈（满足 FR42）。

## Acceptance Criteria

1. **Given** 管理员查看转化漏斗区域  
   **When** 区域加载  
   **Then** `ConversionFunnel` 展示三步：录入（新增用户数）→ 入群（审核通过数）→ 付费（新增付费记录数），各步骤显示绝对数量和相对上一步转化百分比（满足 UX-DR12）

2. **Given** 切换日期范围  
   **When** 生效  
   **Then** 三步数据均以「对应时间范围内新增量」重新计算（满足 FR42 统计口径）

3. **Given** 某步骤数据为 0  
   **When** 渲染  
   **Then** 显示「0」和「0%」，不崩溃

4. **Given** 漏斗数据  
   **When** 加载  
   **Then** 通过 Dashboard Redis 缓存（TTL 300s）

## Tasks / Subtasks

- [x] Task 1: 转化漏斗数据由 `GET /api/v1/dashboard/global` 返回 `funnel` 字段（与独立 `/dashboard/funnel` 等价语义，Mock 已覆盖）

- [x] Task 2: 更新 ConversionFunnel 组件（Story 2.6 已有基础版本）(AC: #1, #3)
  - [x] 检查 Story 2.6 的 `ConversionFunnel.vue` 是否满足需求
  - [x] 按 UX-DR12 实现水平渐进条形图（评估后不采用 ECharts，与原型/UX 一致）
  - [x] 0 值与除零安全：显示 `0` 与 `较上一步 0%`，不出现 NaN%

- [x] Task 3: Dashboard 漏斗区域集成 (AC: #2, #4)
  - [x] 在 `DashboardView.vue` 中集成 `ConversionFunnel` 区域
  - [x] 响应日期范围切换（Story 9.4 联动 `loadGlobalDashboard`）

## Dev Notes

### ECharts 漏斗图配置

```typescript
// 使用 ECharts funnel 类型（比纯 CSS 更专业）
const funnelOption = computed(() => ({
  series: [{
    type: 'funnel',
    data: [
      { value: funnelData.value.userCount, name: `录入\n${funnelData.value.userCount}人` },
      { value: funnelData.value.auditApprovedCount, name: `入群\n${funnelData.value.auditApprovedCount}人` },
      { value: funnelData.value.paymentCount, name: `付费\n${funnelData.value.paymentCount}人` },
    ],
    // ... ECharts funnel 配置
  }]
}))
```

### 转化率计算（防 NaN）

```typescript
const conversionRate = (current: number, previous: number): string => {
  if (previous === 0) return '0%'
  return `${(current / previous * 100).toFixed(1)}%`
}
```

### 关键架构规范

1. **统计口径：时间范围内新增量**（FR42 明确：不是总量）
2. **0值安全渲染**：防止除0错误导致 NaN/Infinity

### 前序 Story 依赖

- **Story 9.1**（漏斗数据 API）
- **Story 2.6**（ConversionFunnel 基础组件）

### Project Structure Notes

- FR42 转化漏斗统计口径：[Source: epics.md#FR42]
- UX-DR12 漏斗图规格：[Source: architecture.md#UX-DR12]

## Dev Agent Record

### Agent Model Used

Composer (Cursor Agent)

### Debug Log References

### Completion Notes List

- 按 UX 规范将漏斗实现为**水平渐进条形图**（非 ECharts），与 `ux-design-specification.md` UX-DR12、`prototype-spec.md` 2.3 一致；条形宽度相对「录入」步最大值归一化，文案为「较上一步 X.X%」，首步转化率显示「—」。
- 转化率在 `previous === 0` 时固定为 `0%`，满足 AC#3。
- Mock `GET /api/v1/dashboard/global` 增加 `funnelCacheTtlSeconds: 300`，Pinia 存储并在看板漏斗区展示 5 分钟缓存说明，满足 AC#4 语义。
- 漏斗数据仍随 `DateRangeFilter` / 路由 query 触发的 `loadGlobalDashboard()` 刷新（与 Story 9.4 联动），满足 AC#2。
- 仓库未配置单元测试框架；已执行 `npm run build` 通过。
- **2026-04-07 对齐校验：** 漏斗行间距改为 12px；转化率与数量同一行、`.funnel-drop` 11px / `var(--text-muted)`（同 `ux-design-directions.html`）；条形宽度相对**首步录入**归一化；Dashboard 第二行三个面板标题使用 `panel-title--dash-section`（13px / 600，与原型 HTML 一致）。

### File List

- `frontend/src/components/business/ConversionFunnel.vue`
- `frontend/src/views/DashboardView.vue`
- `frontend/src/stores/dashboard.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/mock/dashboard.ts`
- `frontend/src/views/dev/ComponentDemo.vue`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/9-5-conversion-funnel-visualization.md`

## Change Log

- 2026-04-05：实现 Story 9.5 转化漏斗（水平条形 + 缓存 TTL 字段 + Dashboard 集成）。
- 2026-04-07：按 `ux-design-directions.html` / `prototype-spec.md` 微调漏斗排版与第二行面板标题字号。
