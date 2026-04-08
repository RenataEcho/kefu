# 纯前端开发顺序清单（按序一次做完）

**项目：** kefu 客户服务中心  
**用途：** 自顶向下依次实现前端；每步完成后更新 `sprint-status.yaml` 对应 Story 状态。  
**生成：** 2026-04-07  

---

## 硬性约束（全程遵守）

1. **纯前端**：不实现 NestJS、Prisma、Docker 等真实后端逻辑。  
2. **Mock**：所有 `/api/v1/*` 由 **`frontend` 内 `vite-plugin-mock`**（`src/mock/`）拦截并返回合理 Mock 数据。  
3. **设计还原**：界面与交互严格对照  
   - `_bmad-output/planning-artifacts/ux-design-specification.md`  
   - `_bmad-output/planning-artifacts/prototype-spec.md`  
4. **视觉一致**：颜色 / 字体 / 间距 / Badge / 玻璃拟态等以工程 `src/assets/styles/main.css` Token 与上述 UX 文档为准，避免组件内随意硬编码。

---

## 不纳入本清单的 Story（非纯前端或延后）

| Story | 原因 |
|--------|------|
| **1-2** ~ **1-4** | Docker / Prisma / Nest 后端基建 |
| **1-5** | 服务端审计拦截器；前端侧用 **2-7** 做日志页 + Mock 即可 |
| **7-1** | 真实飞书对接；前端用 Mock 模拟健康/降级即可 |
| **6-1**、**6-2** | 真实微信推送；前端用 **6-3** Mock 失败队列与通知 UI |

---

## 已完成基线（本清单跳过，除非要做 UX 对齐修补）

以下在 `sprint-status.yaml` 中为 **`review`** 或 **`done`**，默认不再排进顺序；若验收未过，单独开修补任务。

- **2-1**、**2-2**、**2-5**；**4-1**、**4-2**；**7-2**、**7-3**、**7-4**；**9-2**、**9-3**、**9-4**；**9-5**（done）；**1-1**（工程脚手架）

---

## 开发顺序（逐项打勾）

**说明：** Story 文件路径均为相对本目录：`implementation-artifacts/<文件名>`。

### 前置（无独立 Story 文件，建议最先做）

- [x] **Step 0 — 全局 HTTP 与反馈**  
  - **内容：** `request.ts`：**401** 全屏 Modal +「去登录」；**403** Toast「您的权限已更新，请刷新页面重试」（对齐 `prototype-spec` §1.3）。可与 Step 1 并行。  
  - **Mock：** 可选 `GET/POST /api/v1/dev/trigger-401` 仅用于本地验收。  
  - **参考：** `frontend/src/api/request.ts`

---

### Phase A — 基础能力与管理台（Epic 2）

- [x] **Step 1** — `2-6-custom-component-library.md`  
  - **Epic 2**｜既有 5 个业务组件 + `/dev/components` 已落地；本步已按 AC/UX 做漏斗梯形化、指标字重、SLA 色值与编码校验图标 Token 对齐。  

- [x] **Step 2** — `2-3-account-management.md`  
  - **Epic 2**｜账号管理页 + Mock：`/api/v1/accounts` 等。  
  - **视图：** `AccountsView.vue`

- [x] **Step 3** — `2-4-personal-settings.md`  
  - **Epic 2**｜个人设置 + Mock：`GET/PATCH /api/v1/me`、`POST /api/v1/me/password`；登录 Mock 校验 `effectivePassword`。  
  - **视图：** `views/settings/ProfileSettings.vue`，路由 `/settings/profile`。

- [x] **Step 4** — `2-7-audit-log-viewer.md`  
  - **Epic 2**｜操作日志列表 + Mock `GET /api/v1/audit-logs`；`AuditLogTable` 嵌入用户编辑抽屉。  
  - **视图：** `AuditLogsView.vue`

---

### Phase B — 用户主档闭环（Epic 4）

- [x] **Step 5** — `4-8-user-profile-detail.md`  
  - **Epic 4**｜`UserDetailView`（`/users/:id`）+ 列表行进入；Mock：`GET /users/:id`（`toDetailPayload`）、`GET /users/:id/audit-logs`、`POST /users/:id/sync-youbao`；删除弹窗抽 `UserDeleteModals` + `useUserDeleteFlow`。  

- [x] **Step 6** — `4-3-user-profile-edit-delete.md`  
  - **Epic 4**｜详情页联动已在 Step 5 完成；本步：`PATCH/DELETE users` Mock 写入全局 `audit-logs`（before/after）；编辑抽屉归属区按 `org:read` 显隐且提交时省略归属字段；`AuditLogTable` 支持 `reloadNonce` 保存后刷新。  

- [x] **Step 7** — `4-4-youbao-data-sync.md`  
  - **Epic 4**｜`UserDetailView`：`PENDING_VERIFY` → youbao `syncing` + 指标 Spin；降级开关 `POST /api/v1/dev/youbao-degraded` + `ApiStatusBar` + `youbaoDegraded`；`POST sync-youbao` → `{ status: 'queued' }` 后延迟 `GET` 刷新；同步按钮 `users:update`；Mock `youbaoFlags.ts`。  

- [x] **Step 8** — `4-5-payment-record-management.md`  
  - **Epic 4**｜`PaymentList` + Mock：`GET/POST/PATCH/DELETE /payments`、`GET /users/:userId/payments`；与用户主档 `isPaid`/金额/对接人同步；`appendMockAuditLog`；详情抽屉 + 嵌入审计表。  
  - **视图：** `PaymentsView.vue` → `payments/PaymentList.vue`

- [x] **Step 9** — `4-6-payment-excel-import.md`  
  - **Epic 4**｜`PaymentList`：`n-tabs` **付费记录 | 导入记录**（`payments:import`）；`downloadPaymentImportTemplate` / `parsePaymentImportFile` / `downloadPaymentImportFailures`（`paymentImportExcel.ts`）；`POST /payments/import`（JSON：`fileName`+`rows`）+ `GET /payments/import-batches`、`GET /payments/import-batches/:batchId`；Mock `setTimeout` 异步批次 + `tryInsertPayment` 与单条录入共用；导入成功后切至导入记录 Tab、Tab 内 5s 轮询 PROCESSING、展开行拉详情并导出失败明细。  
  - **视图：** `payments/PaymentList.vue`、`payments/PaymentImportRecordsTab.vue`  

- [x] **Step 10** — `4-7-user-payment-data-export.md`  
  - **Epic 4**｜`POST /users/export`、`POST /payments/export` + `GET /exports/:exportId` 轮询；`exportJobsStore` 内存任务 ~720ms 完成并返回 `sheet`；前端 `runExportWithPolling` + `dataExportXlsx` 写文件；用户导出列不含 wxOpenId；`UserList`/`PaymentList` 导出按钮 `users:export` / `payments:export`；>1000 条 §1.9 提示文案。  
  - **视图：** `users/UserList.vue`、`payments/PaymentList.vue`  

---

### Phase C — 入群审核深化（Epic 7）

- [x] **Step 11** — `7-10-audit-detail-drawer.md`  
  - **Epic 7**｜审核详情 §2.1.1 + Mock `GET /api/v1/group-audits/:id`、日志、归档。  

- [x] **Step 12** — `7-5-manual-import-fallback.md`  
  - **Epic 7**｜飞书降级 sticky Banner、手动导入入口 + Mock。  

- [x] **Step 13** — `7-6-duplicate-request-archive.md`  
  - **Epic 7**｜归档/重复策略与列表、详情展示一致。  

- [x] **Step 14** — `7-9-audit-data-export.md`  
  - **Epic 7**｜入群审核列表导出 §1.9。  

- [x] **Step 15** — `7-8-sla-alert-record-viewer.md`  
  - **Epic 7**｜SLA 预警列表 + Mock。  
  - **视图：** `SlaAlertsView.vue`

- [x] **Step 16** — `7-7-sla-scan-task-alert.md`（**可选**)  
  - **Epic 7**｜若与 7-8 合并验收可跳过；否则仅 Mock 扫描任务状态 UI。  
  - **交付：** `GET /group-audits/sla-banner` Mock + `AppLayout` 橙色全局条，60s 轮询，跳转入群审核。  

---

### Phase D — 通知失败队列（Epic 6）

- [x] **Step 17** — `6-3-notification-failure-queue.md`  
  - **Epic 6**｜通知失败记录 §2.4 + Mock。  
  - **视图：** `NotificationsView.vue` → `notifications/NotificationFailed.vue`  

---

### Phase E — 组织管理（Epic 3）

- [x] **Step 18** — `3-1-sect-management.md`  
  - **Epic 3**｜门派管理 + Mock。  
  - **视图：** `SectManagementView.vue`

- [x] **Step 19** — `3-2-kefu-management.md`  
  - **Epic 3**｜客服管理 + Mock（若已部分实现，本步收齐 AC）。  
  - **视图：** `CsManagementView.vue` / `cs-management/*`

- [x] **Step 20** — `3-3-mentor-management.md`  
  - **Epic 3**｜导师管理 + Mock。  
  - **视图：** `MentorManagementView.vue`

- [x] **Step 21** — `3-4-mentor-data-sync.md`  
  - **Epic 3**｜导师数据缓存/同步 Badge、§4.1 降级展示。  

- [x] **Step 22** — `3-5-org-hierarchy-drill-down.md`  
  - **Epic 3**｜门派→导师→用户下钻路由；依赖 Step 5 用户详情路由。  

---

### Phase F — 飞书好友（Epic 8）

- [x] **Step 23** — `8-1-feishu-friend-priority-list.md`  
- [x] **Step 24** — `8-2-kefu-mentor-oauth.md`  
- [x] **Step 25** — `8-3-send-friend-request.md`  
- [x] **Step 26** — `8-4-friend-request-status-tracking.md`  
- [x] **Step 27** — `8-5-manual-decision-zone.md`  
  - **视图：** `LarkFriendsView.vue`（Step 23 起逐步充实）

---

### Phase G — 看板收尾（Epic 9）

- [x] **Step 28** — `9-6-dashboard-export-report.md`  
  - **Epic 9**｜全局看板「导出报告」§1.9 扩展 + Mock。  

- [x] **Step 29** — `9-1-dashboard-aggregation-api.md`  
  - **Epic 9**｜**仅前端**：补全/文档化 `GET /api/v1/dashboard/global`（及 agent）Mock 字段与类型，与 `9-2` 页面对齐；不写真实聚合服务。  

---

### Phase H — 批量导入 / 历史迁移 Story（Epic 5）

- [x] **Step 30** — `5-1-historical-user-profile-import.md`  
  - **Epic 5**｜用户主档侧导入流程 + **导入记录 Tab**；与 §1.6 一致。  

- [x] **Step 31** — `5-2-historical-payment-record-import.md`  
  - **Epic 5**｜与 **4-6** 高度重叠时，可合并实现并在此 Story 中交叉引用 AC。  

- [x] **Step 32** — `5-3-batch-reverification-task.md`（**可选**)  
  - **Epic 5**｜补校验任务管理 UI + Mock。  

---

## 每步完成后

1. 将对应 Story 在 **`sprint-status.yaml`** 中更新为 `review`（或团队约定的完成状态）。  
2. 在 Story 文件 **`Dev Agent Record`** 中补 **Completion Notes / File List**。  
3. 可选：跑一次 `pnpm --filter frontend run build` 确认无类型与构建错误。  

---

## BMad 下一步

- 按序号实现时，在新对话中对当前 Step 的 Story 使用 **`bmad-dev-story`**（或口述「实现 Step N」）。  
- 一轮做完后可用 **`bmad-code-review` [CR]** 做交叉评审。  

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-04-07 | 初版：纯前端顺序 + 排除后端 Story + Phase 划分 |
| 2026-04-07 | Step 16–20 完成：SLA Banner、通知记录、门派/客服/导师（Mock） |
| 2026-04-07 | Step 11–15 完成：入群审核详情、飞书降级/手动导入、归档列与 Mock 类型、异步导出、SLA 预警页 |
| 2026-04-07 | Step 26–30：`LarkFriendsView` 状态/决策区、看板多 Sheet 导出、`types/mock` 文档、用户主档「历史迁移导入」Tab |
| 2026-04-07 | Step 21–25：导师详情同步+ApiStatusBar+dev 降级开关；门派/导师详情 Tab 下钻；飞书好友优先级列表+OAuth Mock+BroadcastChannel+发起申请 |
| 2026-04-07 | Step 31–32：`/migration` 数据迁移中心；`POST/GET /migration/payments/*` 历史付费导入（无 500 上限、AC 失败文案）；`migration/report` + `reverify` Mock；编码状态 INVALID/FAILED 与列表/详情/编辑抽屉 |
| 2026-04-08 | **Phase I**：基于根目录 `补充需求.md` 增补纯前端迭代步骤（Supplement Step 1–14），与既有 Step 0–32 独立编号 |
| 2026-04-08 | **Phase I Supplement Step 15**：录入审核（路由/侧栏/Mock）、客服信息录入专属码（`entryFormUrl`+`qrcode`）、SLA 预警与消息通知「审核类型」筛选与列、`pnpm build` 通过 |

---

## Phase I — 补充需求迭代（`补充需求.md`）

**需求来源：** 仓库根目录 `补充需求.md`  
**与上文关系：** Phase A–H（Step 0–32）为已交付基线；以下 **Supplement Step** 为新增/变更，按依赖顺序执行，完成后在 Story 或 PR 中注明「补充需求 Phase I」。  
**设计依据：** 同篇首「硬性约束」；对照 `ux-design-specification.md`、`prototype-spec.md` 与 `src/assets/styles/main.css` Token。

### Supplement Step 1 — 路由与侧栏

- [x] **菜单：** `AppSidebar.vue`  
  - 移除「转化漏斗」入口（`MENU_GROUPS` 中 `funnel` 项）。  
  - 「飞书好友管理」文案改为 **「飞书好友管理-暂不做」**。  
  - 参考「用户管理」分组样式，在侧栏增加父级 **「权限管理」**，其下两项：**角色管理**（`/rbac`）、**账号管理**（`/accounts`）；原 footer 两链接迁入该分组或改为与子菜单等价的结构（视觉为树列/分组即可）。  
- [x] **路由（可选）：** `router/index.ts` — 删除 `funnel` 路由或 `redirect` 至 `/dashboard`；`LarkFriends` 的 `meta.title` 与菜单一致。  
- [x] **页面标题：** `views/rbac/RoleList.vue` — 页头「权限管理」改为 **「角色管理」**，描述文案与「菜单权限 + 操作权限 + 字段权限」一致。

**验收：** 侧栏无独立转化漏斗；权限区为分组下两子项；飞书菜单名正确；角色页标题为「角色管理」。

---

### Supplement Step 2 — 全局组件：InfoTooltip

- [x] **新建：** `src/components/common/InfoTooltip.vue`（路径按项目惯例可微调）— 悬停 ℹ️ 展示**玻璃拟态**浮层（`backdrop-filter`、边框、阴影与 UX 规范一致），支持 `title` / 默认插槽（字段说明 + 规则）。  
- [x] **演示：** `views/dev/ComponentDemo.vue` 增加一节示例。  
- [x] **接入策略：** 先在 1–2 个高频表单/列表试点（如客服抽屉、用户详情），再按需扩展到「所有字段」——可通过表格 `title` 列头、表单项 `label` 后缀图标统一封装。

**验收：** 浅色/深色下可读；不遮挡必填校验提示；与 `prototype-spec` 提示层级不冲突。

---

### Supplement Step 3 — Mock 与类型：组织 / 用户 / 付费 依赖字段

- [x] **`mock/csAgents.ts` + `api/csAgents.ts`：** 客服增加 `客服类型`（`普通客服` | `付费客服`）、`飞书手机号`；列表筛选支持 `客服类型`。  
- [x] **新建 `mock/mentorTypes.ts`（及 `api` 若需）：** 导师类型 CRUD Mock（类型名称、添加时间、状态）；在 `mock/index.ts` 注册。  
- [x] **`mock/mentors.ts`：** 导师增加 `导师类型 id`、`飞书手机号`、去掉「同步学员数」字段展示所需数据源、增加 `负责项目数` 及可点击拉取的**项目列表** Mock（Drawer/Modal 数据源）。详情：基础信息富文本 `导师介绍`；名下学员表增加题词/回填/订单/已结算/待结算；**项目数据** Tab 列表字段与 `补充需求` 一致。  
- [x] **`mock/schools.ts`：** 门派增加 `门派负责人`、`门派项目数`；总收益语义改为 **学员总收益**（字段名或展示文案与 Mock 一致）；详情基础信息 `导师介绍` 富文本。  
- [x] **`mock/users.ts`：** 主档列表「付费金额」→ **项目收益**（key/列配置同步）；用户详情接口增加 **项目明细** 数组（项目名称、业务大类枚举、题词/回填/订单/已结算/待结算）。  
- [x] **空列表/空图表：** 对仍返回空数组的界面，在 Mock 中给**合理非空**示例数据（`补充需求` 全局补充 2）。

**验收：** 付费客服下拉（Step 5）仅依赖本步 Mock 即可联调。

---

### Supplement Step 4 — 客服管理 UI

- [x] **视图：** `cs-management/CsAgentList.vue`、`CsAgentFormDrawer.vue`、`CsAgentDetailView.vue`  
- [x] 表格列 + 表单：`客服类型`、`飞书手机号`（手机号格式校验）；列表筛选 `客服类型`。

---

### Supplement Step 5 — 付费记录：对接人下拉

- [x] **视图：** `payments/PaymentList.vue`、`PaymentDetailDrawer.vue`（及关联创建/编辑表单）  
- [x] 「付费对接人」改为 **下拉**，选项 = Mock 中 `客服类型 === 付费客服` 的客服名称（去重、空态提示）。  
- [x] **Mock `payments.ts`：** 字段与下拉值一致。

---

### Supplement Step 6 — 导师管理 + 导师类型 Tab

- [x] **容器：** `MentorManagementView.vue` — 使用 `n-tabs`：**导师列表 | 导师类型**（或等价结构）。  
- [x] **导师类型页：** 新组件如 `organization/MentorTypeList.vue` — 表格列：类型名称、添加时间、状态、操作（编辑、删除）；支持新增；全部走 Mock。  
- [x] **导师列表/抽屉/详情：** `MentorList.vue`、`MentorFormDrawer.vue`、`MentorDetailView.vue` — 对齐 Step 3 Mock 字段；富文本编辑器选型需与现有工程一致（Naive UI / 第三方）；「负责项目数」点击打开项目列表。

---

### Supplement Step 7 — 门派管理

- [x] **视图：** `organization/SchoolList.vue`、`SchoolFormDrawer.vue`、`SchoolDetailView.vue`  
- [x] 列表/表单：`门派负责人`、`门派项目数`；「总收益」→ **学员总收益**。  
- [x] 详情基础信息：`导师介绍` 富文本展示；编辑弹窗同步字段。

---

### Supplement Step 8 — 用户主档与详情 Tab

- [x] **列表：** `users/UserList.vue` — 列「项目收益」。  
- [x] **详情：** `users/UserDetailView.vue` — `n-tabs`：**基础信息**（含原基础 + 归属 + 付费）、**项目信息**（原右豹动作数据 + **项目明细表**）、**操作日志**（现有日志迁入 Tab）。  
- [x] **API/Mock：** `users.ts`、`auditLogs.ts` 与 Tab 数据一致。

---

### Supplement Step 9 — 审核工作台

- [x] **入群审核：** `group-audits/AuditWorkbench.vue` — 「近10天动作数」列移到**第 3 列**；单元格展示 **关键词、回填、订单、收益**；筛选区改为多列栅格（避免一字段一行）；增加筛选 **右豹编码**。  
- [x] **Mock/API：** `groupAudits.ts`、`groupAudits.ts`（api）。  
- [x] **SLA 预警：** `SlaAlertsView.vue` — 增加列「近10天动作数」（展示规则与审核列表对齐或简化，需 UX 一致）。  
- [x] **消息通知：** `NotificationsView.vue`（及 `notifications/NotificationFailed.vue` 若需）— 筛选：**右豹编码、通知场景、渠道、推送状态**；操作：**立即推送、重新推送**（待推送/可重推状态显示按钮，Mock 返回成功 + Toast）。

---

### Supplement Step 10 — 数据看板

- [x] **视图：** `DashboardView.vue`  
- [x] **转化漏洞：** 漏斗区块仅做 **UI/样式** 优化（对齐 UX）。  
- [x] **导师概览：** 新增区块，结构参考**门派概览**；Mock：`dashboard.ts` / `api/dashboard.ts` 增加导师统计（学员数、项目数、收益总金额）。  
- [x] **跳转：** 门派/导师概览「查看更多」→ `router.push` 至 `SectManagement` / `MentorManagement`；点击单条 → `SchoolDetail` / `MentorDetail`（`:id`）。

---

### Supplement Step 11 — 权限分配扩展

- [x] **视图：** `rbac/RoleList.vue` — 角色创建/编辑抽屉或 Modal 内：  
  - **操作权限：** 枚举所有 `OPERATION_PERMS`（及业务所需）为可选项。  
  - **敏感字段权限：** 将所有需管控的数据字段列为可勾选（与 `FIELD_PERMS` 及业务字段表对齐；Mock `roles.ts` 持久化结构扩展）。  
- [ ] **验收：** 保存后再次打开角色，勾选状态与 Mock 一致。

---

### Supplement Step 12 — 全局 UI/UX 优化

- [x] **表单操作栏：** 各 Drawer/Modal 底部固定操作区 — 调整 `z-index`、背景不透明、`box-shadow`，避免滚动时透出下层字段阴影（重点排查 `User*Drawer`、`CsAgentFormDrawer`、`MentorFormDrawer`、`SchoolFormDrawer`、`PaymentDetailDrawer` 等）。  
- [x] **表格列宽：** 在通用表格封装或各 `n-data-table` 上支持 **列宽拖拽**或用户可调（与 Naive UI `resizable` 能力对齐）；默认列宽与字段内容匹配。  
- [x] **看板时间筛选：** `DashboardView.vue` — 选中态、间隔线、hover 样式优化（去掉突兀分割线，对齐 UX）。

---

### Supplement Step 13 — 回归与文档

- [x] 全站对照 `prototype-spec` §1.1 Token、§1.2 Badge 走查一遍变更页。  
- [x] `pnpm --filter frontend run build` 通过。  
- [x] 在 `sprint-status.yaml` 或团队看板增加一条「补充需求 Phase I」跟踪（可选）。

---

### Supplement Step 14 —（可选）清理死代码

- [x] 若 `funnel` 路由已移除且无入口：删除或归档 `views/FunnelView.vue`（确认无深层链接后再删）。  
  - **说明：** 当前工程仍保留 `/funnel` 与侧栏入口，故**未删除** `FunnelView.vue`；Step 14 视为已核对结论并结案。

---

### Supplement Step 15 — 补充需求「九～十一」（录入审核 · 客服录入码 · 审核类型）

**依据：** 根目录 `补充需求.md` §九、§十、§十一。  
**约束：** 纯前端；`vite-plugin-mock`；风格对齐 `AuditWorkbench.vue` / `prototype-spec`。

#### 15-A 录入审核（新菜单 + 列表/详情 + Mock）

- [x] **类型**  
  - 新增 `frontend/src/types/entryAudit.ts`：列表行、详情、分页查询、状态枚举（含 SLA 状态、超时状态、审核状态、`source: 'admin_import' | 'qr_entry'` 等）。  
  - 截图字段：`codeScreenshotUrl`、`idScreenshotUrl`（Mock 用占位图 URL 即可）。

- [x] **Mock**  
  - 新增 `frontend/src/mock/entryAudits.ts`（并在 `mock` 聚合处注册），至少包含：  
    - `GET`、`POST` `/api/v1/entry-audits` — 分页列表，支持筛选（所属客服、右豹编码、右豹 ID、状态、申请时间范围等，与入群审核复杂度相当即可）。  
    - `GET /api/v1/entry-audits/:id` — 详情。  
    - `GET /api/v1/entry-audits/:id/audit-logs` — 可选，与入群审核详情日志体验一致时加。  
    - `POST /api/v1/entry-audits/:id/approve`、`POST .../reject`；若有批量/导出，对称 `groupAudits` Mock 行为。  
  - Mock 数据覆盖两种来源（后台导入 / 二维码录入），等待时长可由 `applyTime` 与当前时间推算展示。

- [x] **API**  
  - 新增 `frontend/src/api/entryAudits.ts`，方法命名与参数风格对齐 `api/groupAudits.ts`。

- [x] **视图与路由**  
  - 新建 `frontend/src/views/entry-audits/EntryAuditWorkbench.vue`（或 `EntryAuditList.vue`）：筛选区（多列栅格，与现入群审核一致）、表格列顺序与需求一致 — **所属客服、右豹编码、右豹 ID、两列截图（缩略图 + 点击预览）、申请时间、等待时长、SLA 状态、超时状态、审核状态、处理人、操作**。  
  - 详情：`EntryAuditDetailView.vue` 或抽屉，交互对齐 `GroupAuditDetailView.vue`；审核动作复用/参考 `composables/useAuditActions.ts` 模式。  
  - `router/index.ts`：增加路由（如 `/entry-audits`），`meta.title` / `permission` 与审核工作台分组一致或新增 Mock 权限键。  
  - 侧栏菜单配置：增加「录入审核」入口。

- [x] **验收**  
  - 列表筛选、分页、通过/拒绝（及 Toast）可用；截图可预览；空态用 Mock 数据填满便于演示。

#### 15-B 客服管理 — 信息录入专属码

- [x] **类型 + Mock**  
  - `frontend/src/types/csAgent.ts`：增加字段，例如 `entryFormUrl` 或 `{ entryQrUrl: string; entryAgentParam: number }`（URL 需带 `agentId` 查询参数，Mock 写死域名即可）。  
  - `frontend/src/mock/csAgents.ts`：列表/详情/创建/更新返回该字段；创建时生成稳定 Mock 链接。

- [x] **UI**  
  - `frontend/src/views/cs-management/CsAgentList.vue`：表格增加列「信息录入专属码」— 小图二维码 + **复制链接**（二维码可用 `qrcode` 依赖由 URL 生成，或 Mock 直接返回 `data:image/png;base64,...`）。  
  - `frontend/src/views/cs-management/CsAgentFormDrawer.vue`：只读展示说明 + 复制；不可手工改 ID 参数。  
  - `CsAgentDetailView.vue`：同步展示（若详情需见码）。

- [x] **验收**  
  - 新建客服后列表可见新链接/二维码；复制内容含对应 `agentId`。

#### 15-C SLA 预警 + 消息通知 — 审核类型（入群 / 录入）

- [x] **类型**  
  - `frontend/src/types/groupAudit.ts` 中 `SlaAlertRow`：增加 `auditType: 'group_audit' | 'entry_audit'`（或等价枚举，展示文案映射为「入群审核」「录入审核」）。  
  - `frontend/src/types/notification.ts` 中 `NotificationRow`：同样增加 `auditType`。

- [x] **Mock**  
  - `frontend/src/mock/groupAudits.ts`：`buildSlaAlertRows()` 为部分行赋值 `auditType`；`GET /api/v1/group-audits/sla-alerts` 支持 query `auditType` 过滤。  
  - 消息通知列表所用 Mock（与 `NotificationFailed.vue` / `notifications` 相关 mock）：行数据带 `auditType`，列表接口支持 `auditType` 筛选。

- [x] **页面**  
  - `frontend/src/views/SlaAlertsView.vue`：表格增列「审核类型」；筛选区增加 `n-select`（全部 / 入群审核 / 录入审核）。  
  - `frontend/src/views/notifications/NotificationFailed.vue`（及若存在共用通知列表组件）：表格增列 + 筛选同步。  
  - `frontend/src/api/groupAudits.ts`、通知相关 `api/*.ts`：`fetch` 参数扩展 `auditType`。

- [x] **验收**  
  - 切换筛选后列表与总数一致（Mock 侧过滤正确）；列展示与入群/录入文案正确。

#### 15-D 联调与构建

- [x] `pnpm --filter frontend run build` 通过。  
- [x] 可选：在 `sprint-status.yaml` 增加 Story 或勾选本 Step 子项。

---

## Phase I 完成后

1. 在 PR / 交接说明中列出 **Supplement Step** 完成范围与已知限制（仅 Mock）。  
2. 若需同步产品文档，可触发 `bmad-edit-prd` 将 `补充需求.md` 合入 PRD。
