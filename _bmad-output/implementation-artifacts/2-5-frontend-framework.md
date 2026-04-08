# Story 2.5：前端应用框架（玻璃拟态主题 + 权限感知导航）

Status: review

## Story

作为**所有角色用户**，
我希望登录后看到符合自己角色权限的菜单导航，整体界面风格统一专业，
以便我能快速找到工作所需的功能，感受到系统是为我准备的（满足 UX-DR5）。

## Acceptance Criteria

1. **Given** Naive UI `themeOverrides` 配置  
   **When** 应用启动加载  
   **Then** 深色玻璃拟态主题生效：主背景 `#0f172a`、次背景 `#1e293b`、强调色 `#6366f1`、玻璃卡片样式 `rgba(255,255,255,0.08) + backdrop-blur-xl`（满足 UX-DR1）

2. **Given** 已登录的普通客服账号  
   **When** 进入系统主界面  
   **Then** 左侧 240px 固定导航栏只显示该角色有权访问的菜单（`v-if` 完全不渲染无权限项）

3. **Given** 已登录的超级管理员账号  
   **When** 进入系统主界面  
   **Then** 左侧导航栏显示全部菜单项：Dashboard、用户管理、入群审核、消息通知、SLA预警、飞书好友、组织管理、权限管理、操作日志

4. **Given** Pinia auth store  
   **When** 用户登录成功  
   **Then** `useAuthStore` 缓存完整权限对象；`usePermission()` composable 可供任意组件调用，无需重复读取 store

5. **Given** 全局状态色  
   **When** 任意状态徽标/提示渲染  
   **Then** 颜色语义统一：错误/危险红 `#ef4444`、警告橙 `#f97316`、成功绿 `#22c55e`、中性灰 `#475569`、信息蓝 `#38bdf8`（满足 UX-DR2）

6. **Given** 排版配置  
   **When** 任意文字内容渲染  
   **Then** 正文字体 Inter（英文）/ PingFang SC（中文）；等宽字体 JetBrains Mono（代码/ID）；内容区最大宽度 1200px（满足 UX-DR3、UX-DR4）

## Tasks / Subtasks

- [x] Task 1: 安装和配置 Naive UI + Tailwind CSS (AC: #1, #5)
  - [x] 安装：`pnpm add naive-ui @vicons/ionicons5`
  - [x] 安装：`pnpm add -D tailwindcss autoprefixer postcss`
  - [x] 运行：`npx tailwindcss init -p`
  - [x] 配置 `tailwind.config.js`（content 路径、extend 自定义颜色）
  - [x] 在 `src/main.ts` 中导入 `import './assets/styles/main.css'`（含 Tailwind 指令）

- [x] Task 2: 配置 Naive UI 玻璃拟态主题 (AC: #1, #5, #6)
  - [x] 创建 `frontend/src/utils/theme.ts`，定义 `themeOverrides` 对象
  - [x] 在 `App.vue` 中用 `<NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides">` 包裹
  - [x] 配置颜色令牌：primary `#6366f1`、info `#38bdf8`、success `#22c55e`、warning `#f97316`、error `#ef4444`

- [x] Task 3: 实现主布局 AppLayout (AC: #2, #3, #6)
  - [x] 创建 `frontend/src/components/layout/AppLayout.vue`
  - [x] 左侧固定 240px 导航栏 + 右侧内容区（最大宽 1200px，居中）
  - [x] 路由 `<RouterView>` 放置在内容区

- [x] Task 4: 实现权限感知侧边栏 AppSidebar (AC: #2, #3)
  - [x] 创建 `frontend/src/components/layout/AppSidebar.vue`
  - [x] 使用 `usePermission().hasMenuPermission()` + `v-if` 控制菜单项渲染
  - [x] 菜单结构（含图标）：见 Dev Notes

- [x] Task 5: 实现顶部导航 AppHeader (AC: #2, #4)
  - [x] 创建 `frontend/src/components/layout/AppHeader.vue`
  - [x] 右上角：账号显示名 + 下拉菜单（个人设置 + 退出登录）
  - [x] 点击退出登录 → `authStore.clearAuth()` → 跳转 `/login`
  - [x] 显示名从 `authStore.user.displayName` 读取，随 Pinia 实时更新（Story 2.4 昵称修改联动）

- [x] Task 6: 配置 Vue Router (AC: #3, #4)
  - [x] 创建 `frontend/src/router/index.ts`，配置所有路由（含 meta.permission）
  - [x] 实现 `beforeEach` 守卫（Story 2.2 已定义逻辑，此处实现）
  - [x] 路由懒加载（`() => import(...)`）减小首屏体积

- [x] Task 7: 配置 Google Fonts (AC: #6)
  - [x] 在 `index.html` 中引入 Inter 字体：`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`
  - [x] 在 `index.html` 中引入 JetBrains Mono
  - [x] 在 `tailwind.config.js` 中配置 `fontFamily`

## Dev Notes

### Naive UI 主题配置

```typescript
// frontend/src/utils/theme.ts
import type { GlobalThemeOverrides } from 'naive-ui'

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#6366f1',
    primaryColorHover: '#818cf8',
    primaryColorPressed: '#4f46e5',
    infoColor: '#38bdf8',
    successColor: '#22c55e',
    warningColor: '#f97316',
    errorColor: '#ef4444',
    bodyColor: '#0f172a',
    cardColor: 'rgba(255, 255, 255, 0.08)',
    modalColor: '#1e293b',
    tableColor: 'rgba(255, 255, 255, 0.05)',
    fontFamily: 'Inter, PingFang SC, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace',
  },
  DataTable: {
    thColor: '#1e293b',
    tdColorHover: 'rgba(255, 255, 255, 0.05)',
  },
}
```

### 侧边栏菜单配置

```typescript
// frontend/src/components/layout/AppSidebar.vue
const menuItems = [
  { key: 'dashboard', label: '数据看板', icon: 'BarChart', path: '/dashboard', perm: MENU_PERMS.DASHBOARD },
  { key: 'users', label: '用户管理', icon: 'People', path: '/users', perm: MENU_PERMS.USERS },
  { key: 'audit', label: '入群审核', icon: 'CheckmarkCircle', path: '/group-audits', perm: MENU_PERMS.AUDIT },
  { key: 'notifications', label: '消息通知', icon: 'Notifications', path: '/notifications', perm: MENU_PERMS.NOTIFICATIONS },
  { key: 'sla', label: 'SLA预警', icon: 'Warning', path: '/sla-alerts', perm: MENU_PERMS.SLA_ALERTS },
  { key: 'lark', label: '飞书好友', icon: 'PersonAdd', path: '/lark-friends', perm: MENU_PERMS.LARK_FRIENDS },
  { key: 'org', label: '组织管理', icon: 'Business', path: '/organization', perm: MENU_PERMS.ORG_MANAGEMENT },
  { key: 'rbac', label: '权限管理', icon: 'Shield', path: '/rbac', perm: MENU_PERMS.RBAC },
  { key: 'audit-logs', label: '操作日志', icon: 'DocumentText', path: '/audit-logs', perm: MENU_PERMS.AUDIT_LOGS },
]
```

### 玻璃拟态 CSS 类

```css
/* frontend/src/assets/main.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .glass-card {
    @apply bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl;
  }

  .glass-sidebar {
    @apply bg-slate-900/80 backdrop-blur-xl border-r border-white/10;
  }
}
```

### Tailwind 配置

```typescript
// frontend/tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        danger: '#ef4444',
        warning: '#f97316',
        success: '#22c55e',
        info: '#38bdf8',
        neutral: '#475569',
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
}
```

### App.vue 主框架

```vue
<!-- frontend/src/App.vue -->
<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <RouterView />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { darkTheme } from 'naive-ui'
import { themeOverrides } from '@/utils/theme'
</script>
```

### 关键架构规范（不可偏离）

1. **主题颜色严格按 UX-DR1/DR2**：不得自行修改颜色值，所有颜色来自 `themeOverrides`
2. **菜单 `v-if` 不渲染**：无权限菜单从 DOM 移除，不用 `v-show`（UX-DR5）
3. **内容区最大宽 1200px**：`max-w-content mx-auto`（UX-DR4）
4. **字体优先级**：Inter（英文）→ PingFang SC（中文）→ system-ui（UX-DR3）
5. **`NConfigProvider` 在最外层**：包裹所有 Naive UI 组件，统一应用主题

### 前序 Story 依赖

- **Story 2.1**（`useAuthStore` 登录状态）
- **Story 2.2**（`usePermission()` composable）

### Project Structure Notes

- 玻璃拟态主题：[Source: architecture.md#前端架构决策 UX-DR1]
- 路由权限守卫：[Source: architecture.md#路由权限守卫]
- 状态色语义：[Source: architecture.md#UX-DR2]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

None — clean implementation, zero build errors.

### Completion Notes List

- ✅ Created `frontend/src/utils/theme.ts` — extracted Naive UI `themeOverrides` from `App.vue`, corrected `cardColor` to UX-DR1-compliant `rgba(255,255,255,0.08)` glass style (was `#1e293b`).
- ✅ Updated `App.vue` to import `themeOverrides` from `theme.ts`; retained `zhCN` / `dateZhCN` locales.
- ✅ Created `AppSidebar.vue` — 240px sidebar (UX-DR1), all 9 menu items with `v-if` (DOM-removing, not `v-show`), `usePermission().hasMenuPermission()` guard, collapsible mode, NTooltip in collapsed state.
- ✅ Created `AppHeader.vue` — sticky glass header, user `displayName` from `authStore` (Pinia reactive), dropdown with 个人设置 + 退出登录.
- ✅ Refactored `AppLayout.vue` — delegates to `AppSidebar` and `AppHeader`; content area wraps `RouterView` in `<div class="content-inner" style="max-width:1200px;margin:0 auto">` (UX-DR4); token expiry modal retained (Story 2.1 AC#5).
- ✅ Updated `router/index.ts` — canonical paths `/group-audits`, `/organization`, `/notifications`, `/sla-alerts`, `/lark-friends`, `/audit-logs`; legacy `/audit` and `/org` redirect; `beforeEach` guards both unauthenticated redirect and permission check; all routes use lazy `import()`.
- ✅ Created 6 placeholder view components: `NotificationsView`, `SlaAlertsView`, `LarkFriendsView`, `AuditLogsView`, `SettingsView`, `ErrorView` (403).
- ✅ Updated `tailwind.config.js` — added `primary`, `danger`, `warning`, `success`, `neutral`, `info` color aliases; `bg-primary`/`bg-secondary`; `maxWidth.content: 1200px`; `fontFamily.mono`.
- ✅ Updated `index.html` — Google Fonts `<link>` preconnect + Inter + JetBrains Mono stylesheet tags (UX-DR3).
- ✅ Build verified: `pnpm run build` exits 0, zero TypeScript/lint errors.

**AC Validation:**
- AC#1 ✅ — `themeOverrides` applies `bodyColor:#0f172a`, `cardColor:rgba(255,255,255,0.08)`, `primaryColor:#6366f1`, glass backdrop via CSS.
- AC#2 ✅ — `AppSidebar` width: 240px; `v-if` removes DOM nodes for unauthorized items.
- AC#3 ✅ — All 9 menu items present; super admin (`menuPerms:['*']`) sees all.
- AC#4 ✅ — `useAuthStore` caches full permission object; `usePermission()` composable is single-call across components.
- AC#5 ✅ — `themeOverrides` sets error `#ef4444`, warning `#f97316`, success `#22c55e`, neutral `#475569`, info `#38bdf8`.
- AC#6 ✅ — Google Fonts Inter + JetBrains Mono linked; `fontFamily` in tailwind config; `max-w-content` (1200px) in layout.

### File List

- `frontend/src/utils/theme.ts` (new)
- `frontend/src/App.vue` (modified)
- `frontend/src/components/layout/AppSidebar.vue` (new)
- `frontend/src/components/layout/AppHeader.vue` (new)
- `frontend/src/components/layout/AppLayout.vue` (modified)
- `frontend/src/router/index.ts` (modified)
- `frontend/src/views/NotificationsView.vue` (new)
- `frontend/src/views/SlaAlertsView.vue` (new)
- `frontend/src/views/LarkFriendsView.vue` (new)
- `frontend/src/views/AuditLogsView.vue` (new)
- `frontend/src/views/SettingsView.vue` (new)
- `frontend/src/views/ErrorView.vue` (new)
- `frontend/tailwind.config.js` (modified)
- `frontend/index.html` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

## Change Log

- 2026-04-04: Story 2.5 implemented — glass-morphism theme, permission-aware sidebar, AppHeader, full router, placeholder views, Tailwind tokens, Google Fonts (Maziluo)
