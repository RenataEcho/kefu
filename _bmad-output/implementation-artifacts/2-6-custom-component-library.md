# Story 2.6：定制业务组件库

Status: review

## Story

作为**前端开发者**，
我希望 5 个定制业务组件已完成开发并可独立使用，
以便后续 Epic 可直接复用这些组件，无需在功能开发时同步实现 UI 基础设施。

## Acceptance Criteria

1. **Given** `CodeVerifyInput` 组件，用户在输入框填写内容后失焦  
   **When** API 校验进行中  
   **Then** 输入框右侧显示 loading 转圈图标；校验通过后边框变绿 + ✓ 图标 + "编码有效"文案；校验失败后边框变红 + ✗ 图标 + 具体错误说明（满足 UX-DR8）

2. **Given** `MetricCard` 组件渲染 Dashboard 指标数据  
   **When** 组件挂载  
   **Then** 呈现玻璃拟态样式（`bg-white/10 backdrop-blur-md border border-white/20 shadow-xl`），核心数字以 32px / font-weight:700 展示（满足 UX-DR9）

3. **Given** `SlaStatusBadge` 组件，传入申请提交时间  
   **When** 当前时间已超过 SLA 截止时间（申请提交后第 3 日 23:59 UTC+8）  
   **Then** 显示红色 `#ef4444` 徽标「已超时」+ 超时时长；未超时显示橙色 `#f97316`「待处理」+ 剩余时间（满足 UX-DR10）

4. **Given** `ApiStatusBar` 组件，`degraded` prop 为 `false`  
   **When** 组件渲染  
   **Then** 不渲染任何 DOM 节点（`v-if` 完全不渲染，满足 UX-DR11）

5. **Given** `ApiStatusBar` 组件，`degraded` prop 为 `true`，传入降级消息文字  
   **When** 组件渲染  
   **Then** 页面顶部显示蓝色 `#38bdf8` 信息条，展示降级说明文字，不可手动关闭

6. **Given** `ConversionFunnel` 组件，传入三步数据（录入数/入群数/付费数）  
   **When** 组件渲染  
   **Then** 以梯形漏斗图形式展示三步转化，各步骤显示绝对数量 + 相对上一步的转化百分比（满足 UX-DR12）

## Tasks / Subtasks

- [x] Task 1: 实现 CodeVerifyInput 组件 (AC: #1)
  - [x] 创建 `frontend/src/components/business/CodeVerifyInput.vue`
  - [x] Props：`modelValue: string`、`onVerify: (code: string) => Promise<{valid: boolean, message?: string}>`
  - [x] 三态：`idle`（默认）、`loading`（校验中）、`valid`（有效，绿色）、`invalid`（无效，红色）
  - [x] 失焦时自动触发 `onVerify`，空值不触发
  - [x] 通过 `v-model` 双向绑定，支持父组件读取值

- [x] Task 2: 实现 MetricCard 组件 (AC: #2)
  - [x] 创建 `frontend/src/components/business/MetricCard.vue`
  - [x] Props：`title: string`、`value: number | string`、`unit?: string`、`trend?: { value: number, direction: 'up' | 'down' }`
  - [x] 玻璃拟态样式（`glass-card` CSS 类）
  - [x] 核心数字 32px/700weight，副标题 14px/400weight

- [x] Task 3: 实现 SlaStatusBadge 组件 (AC: #3)
  - [x] 创建 `frontend/src/components/business/SlaStatusBadge.vue`
  - [x] Props：`applyTime: string | Date`（ISO 8601 字符串）
  - [x] SLA 截止时间计算：`dayjs(applyTime).tz('Asia/Shanghai').add(3, 'day').endOf('day')`
  - [x] 使用 `dayjs` + `dayjs-plugin-timezone`，强制 UTC+8 计算（不依赖服务器时区）
  - [x] 每分钟自动更新剩余时间（`setInterval`）

- [x] Task 4: 实现 ApiStatusBar 组件 (AC: #4, #5)
  - [x] 创建 `frontend/src/components/business/ApiStatusBar.vue`
  - [x] Props：`degraded: boolean`、`message: string`
  - [x] `v-if="degraded"` 控制渲染（不可见时零 DOM 开销）
  - [x] 样式：全宽蓝色横幅，固定在布局顶部，`z-index: 50`

- [x] Task 5: 实现 ConversionFunnel 组件 (AC: #6)
  - [x] 创建 `frontend/src/components/business/ConversionFunnel.vue`
  - [x] Props：`data: { label: string, count: number }[]`（顺序：录入→入群→付费）
  - [x] 纯 CSS 实现梯形漏斗（clip-path 或 border 技巧），不依赖 ECharts（轻量化）
  - [x] 转化率计算：`(当前步 / 上一步 * 100).toFixed(1)%`
  - [x] 首步转化率显示为 100%

- [x] Task 6: 编写组件展示 Demo 页（开发用，不进入生产路由）
  - [x] 创建 `frontend/src/views/dev/ComponentDemo.vue`（路由仅在开发模式下注册）
  - [x] 展示所有 5 个组件的各种状态，方便开发时预览

## Dev Notes

### CodeVerifyInput 组件实现

```vue
<!-- frontend/src/components/business/CodeVerifyInput.vue -->
<template>
  <div class="relative">
    <NInput
      v-model:value="inputValue"
      :status="inputStatus"
      :placeholder="placeholder"
      @blur="handleBlur"
    >
      <template #suffix>
        <NIcon v-if="state === 'loading'" class="animate-spin text-primary">
          <Reload />
        </NIcon>
        <NIcon v-else-if="state === 'valid'" class="text-success">
          <CheckmarkCircle />
        </NIcon>
        <NIcon v-else-if="state === 'invalid'" class="text-danger">
          <CloseCircle />
        </NIcon>
      </template>
    </NInput>
    <p v-if="state === 'valid'" class="text-xs text-success mt-1">编码有效</p>
    <p v-if="state === 'invalid'" class="text-xs text-danger mt-1">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  onVerify: (code: string) => Promise<{ valid: boolean; message?: string }>
  placeholder?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

type State = 'idle' | 'loading' | 'valid' | 'invalid'
const state = ref<State>('idle')
const errorMessage = ref('')
const inputValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const inputStatus = computed(() =>
  state.value === 'valid' ? 'success' : state.value === 'invalid' ? 'error' : undefined
)

const handleBlur = async () => {
  if (!inputValue.value) return
  state.value = 'loading'
  try {
    const result = await props.onVerify(inputValue.value)
    state.value = result.valid ? 'valid' : 'invalid'
    errorMessage.value = result.message || '编码不存在'
  } catch {
    state.value = 'invalid'
    errorMessage.value = '校验服务暂时不可用'
  }
}
</script>
```

### SlaStatusBadge SLA 计算逻辑

```typescript
// SLA 截止时间 = 申请提交时间所在日 +3 自然日（UTC+8）的 23:59:59
// 必须使用 dayjs + timezone 插件，不可使用 Date 本地时间
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
dayjs.extend(timezone)

const getSlaDeadline = (applyTime: string) => {
  return dayjs(applyTime)
    .tz('Asia/Shanghai')
    .add(3, 'day')
    .endOf('day')
    .toDate()
}
```

### ApiStatusBar 使用场景

在 `AppLayout.vue` 中：

```vue
<!-- 从 useApiStatus composable 获取降级状态 -->
<ApiStatusBar
  :degraded="appStore.youbaoApiDegraded"
  message="右豹API服务暂时不可用，编码校验功能降级，管理员可选择跳过校验"
/>
```

### 必须安装的依赖

```bash
cd frontend
pnpm add dayjs
pnpm add @vicons/ionicons5   # 图标库
```

### 关键架构规范（不可偏离）

1. **SLA 时间计算必须用 dayjs + timezone**，强制 `Asia/Shanghai`，不得使用 `new Date()` 本地时间
2. **`ApiStatusBar` 使用 `v-if` 而非 `v-show`**：不可见时不渲染 DOM（UX-DR11）
3. **`CodeVerifyInput` 失焦触发校验**：不在输入时实时校验（减少 API 请求，UX-DR8）
4. **`ConversionFunnel` 纯 CSS 实现**：不引入 ECharts 等图表库（漏斗图仅用于 Dashboard，Story 9.5 会用 ECharts 实现完整版本）

### 前序 Story 依赖

- **Story 2.5**（Naive UI 主题、Tailwind CSS 已配置）

### Project Structure Notes

- 业务组件架构：[Source: architecture.md#组件架构策略]
- UX-DR8 编码校验输入框：[Source: architecture.md#UX-DR8]
- UX-DR9 指标卡片：[Source: architecture.md#UX-DR9]
- UX-DR10 SLA状态徽标：[Source: architecture.md#UX-DR10]
- UX-DR11 API降级状态条：[Source: architecture.md#UX-DR11]
- UX-DR12 转化漏斗图：[Source: architecture.md#UX-DR12]
- SLA计算规则：[Source: epics.md#FR25, FR15]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

N/A — clean implementation, no regressions.

### Completion Notes List

- ✅ CodeVerifyInput: 4-state (idle/loading/valid/invalid) with NInput + @vicons/ionicons5 icons, blur-triggered verify, v-model binding, exposes reset()
- ✅ MetricCard: glass-card glassmorphism (bg-white/8 backdrop-blur-xl border-white/12 shadow-xl), top gloss line, 32px/700 value, trend with TrendingUp/Down icons, hover lift animation
- ✅ SlaStatusBadge: dayjs + timezone + duration plugins, forced Asia/Shanghai UTC+8, endOf('day') deadline, setInterval every 60s auto-update, red/orange badge with pulse animation for overdue
- ✅ ApiStatusBar: v-if (not v-show) zero-DOM when degraded=false, sticky top z-50 blue #38bdf8 info bar, ARIA role="status" aria-live="polite"
- ✅ ConversionFunnel: pure CSS clip-path trapezoid, indigo gradient palette, first step=100%, subsequent steps show count/rate vs prev step, ChevronDown arrows
- ✅ ComponentDemo: /dev/components route registered only when import.meta.env.DEV, demonstrates all 5 components in all states
- TypeScript strict check: 0 errors
- 2026-04-07：`pnpm --filter frontend run build` 通过；`sprint-status` 中 2-6 同步为 `review`。

### File List

- frontend/src/components/business/CodeVerifyInput.vue (new)
- frontend/src/components/business/MetricCard.vue (new)
- frontend/src/components/business/SlaStatusBadge.vue (new)
- frontend/src/components/business/ApiStatusBar.vue (new)
- frontend/src/components/business/ConversionFunnel.vue (new)
- frontend/src/views/dev/ComponentDemo.vue (new)
- frontend/src/router/index.ts (modified — added dev-only /dev/components route)

### Change Log

- 2026-04-07: Step 1 验收对齐 — `ConversionFunnel` 改为 clip-path 梯形漏斗 + 首步展示 100%；`MetricCard` 主数字字重 700；`SlaStatusBadge` 前景色对齐 UX 表 `#ef4444` / `#f97316`；`CodeVerifyInput` 后缀图标改用 CSS Token（accent / status）。
- 2026-04-04: Story 2.6 implemented — 5 business components (CodeVerifyInput, MetricCard, SlaStatusBadge, ApiStatusBar, ConversionFunnel) + ComponentDemo dev page
