# Story 3.2：客服管理（CRUD + 企微二维码上传）

Status: review

## Story

作为**超级管理员**，
我希望能够管理客服记录并上传企微二维码图片，
以便用户录入时可以选择归属客服，并向用户提供企微添加方式（满足 FR33）。

## Acceptance Criteria

1. **Given** 管理员在客服管理页右侧新增抽屉  
   **When** 填写客服名称并上传企微二维码（jpg/png 格式）后提交  
   **Then** 客服记录成功创建，企微二维码图片成功上传并在列表/详情中可预览

2. **Given** 上传非 jpg/png 格式的文件  
   **When** 选择文件后  
   **Then** 前端拦截，提示"仅支持 jpg/png 格式图片"，不发起上传请求

3. **Given** 关联了用户主档的客服记录  
   **When** 管理员尝试删除该客服  
   **Then** 系统拦截，返回 HTTP 400，`code: 10003`，message: "该客服名下有 X 名用户，请先解除关联后再删除"（满足 FR37）

4. **Given** 已存在的客服记录  
   **When** 管理员修改信息（含替换二维码图片）并保存  
   **Then** 更新成功，旧二维码图片在服务器端清理（覆盖写入），新图片可正常预览

5. **Given** 客服列表  
   **When** 管理员查看  
   **Then** 列表分页 20 条/页；支持按状态（启用/禁用）筛选

## Tasks / Subtasks

- [ ] Task 1: 创建 AgentsModule（客服）(AC: #1, #3, #4, #5)
  - [ ] 创建 `backend/src/modules/agents/agents.module.ts`
  - [ ] 创建 `backend/src/modules/agents/agents.service.ts`
  - [ ] 创建 `backend/src/modules/agents/agents.controller.ts`
  - [ ] 创建 DTO：`CreateAgentDto`、`UpdateAgentDto`、`AgentListQueryDto`

- [ ] Task 2: 实现图片上传功能（Multer）(AC: #1, #2, #4)
  - [ ] 配置 Multer：`dest: 'uploads/qrcodes/'`；文件过滤：`mimetype` 为 `image/jpeg` 或 `image/png`；最大 5MB
  - [ ] `POST /api/v1/agents` 使用 `@UseInterceptors(FileInterceptor('wxQrcode'))` 处理二维码上传
  - [ ] `PATCH /api/v1/agents/:id` 支持替换二维码（旧文件删除 via `fs.unlink`）
  - [ ] 上传路径存储为相对路径：`/uploads/qrcodes/{filename}`（通过 Nginx 静态服务）

- [ ] Task 3: 实现 Agents CRUD API (AC: #1, #3, #4, #5)
  - [ ] `GET /api/v1/agents`（分页列表，支持状态筛选）
  - [ ] `GET /api/v1/agents/:id`（详情）
  - [ ] `POST /api/v1/agents`（含图片上传）+ `@Audit('agents')`
  - [ ] `PATCH /api/v1/agents/:id`（含图片替换）+ `@Audit('agents')`
  - [ ] `DELETE /api/v1/agents/:id`（先检查用户关联数量）+ `@Audit('agents')`

- [x] Task 4: 前端客服管理页 (AC: #1, #2, #3, #4, #5) — 当前为 Mock 联调；后端 Task 1～3 完成后需改接真实 `/agents` 或统一网关路径
  - [x] 创建列表与详情（路径：`frontend/src/views/cs-management/*`，路由 `/cs-management`、`/cs-management/:id`）
  - [x] 列表：客服名称、二维码缩略图、关联用户数、状态、创建时间；关键词 + 状态筛选；分页默认 20
  - [x] 新增/编辑客服抽屉（`NDrawer`）+ `NUpload`，`before-upload` 拦截非 jpg/png
  - [x] 删除确认弹窗；关联用户 >0 时拦截 Modal（文案对齐原型 §2.6，仅「关闭」）
  - [x] 详情页：基础信息区 + 企微二维码 + 操作日志表（字段对齐原型）
  - [x] Mock：`/api/v1/cs-agents`（GET 列表、GET 详情、POST、PATCH、DELETE；删除关联用户时 HTTP 400 + `code: 10003`）

## Dev Notes

### Multer 配置

```typescript
// backend/src/modules/agents/agents.controller.ts
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import * as path from 'path'
import * as crypto from 'crypto'

const qrcodeStorage = diskStorage({
  destination: './uploads/qrcodes',
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID()
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const imageFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
    return cb(new BadRequestException({ code: 10001, message: '仅支持 jpg/png 格式图片' }), false)
  }
  cb(null, true)
}

// 在 Controller 方法上：
@Post()
@UseInterceptors(FileInterceptor('wxQrcode', { storage: qrcodeStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }))
@Audit('agents')
async create(
  @Body() dto: CreateAgentDto,
  @UploadedFile() file?: Express.Multer.File,
) {
  return this.agentsService.create(dto, file?.path)
}
```

### 旧图片清理

```typescript
// agents.service.ts
import * as fs from 'fs'

async update(id: bigint, dto: UpdateAgentDto, newQrcodePath?: string) {
  if (newQrcodePath) {
    const agent = await this.prisma.agent.findUnique({ where: { id }, select: { wxQrcodeUrl: true } })
    if (agent?.wxQrcodeUrl) {
      const oldPath = `.${agent.wxQrcodeUrl}`  // 相对路径转绝对
      fs.unlink(oldPath, (err) => { if (err) console.warn('旧二维码删除失败', err) })
    }
  }
  // 更新记录
}
```

### Nginx 静态资源配置

在 Story 1.2 的 Nginx 配置中补充：
```nginx
location /uploads/ {
  alias /app/uploads/;
  expires 30d;
  add_header Cache-Control "public, immutable";
}
```

### 前端图片上传组件

```vue
<!-- 使用 Naive UI NUpload -->
<NUpload
  accept=".jpg,.jpeg,.png"
  :max="1"
  list-type="image-card"
  @before-upload="handleBeforeUpload"
>
  上传二维码
</NUpload>
```

### 关键架构规范（不可偏离）

1. **二维码图片存储在服务器本地** `uploads/qrcodes/`（不使用第三方 OSS，内部工具无需）
2. **前端文件格式校验 + 后端 Multer fileFilter 双重校验**：防止绕过前端直接上传
3. **旧图片替换时清理文件**：防止无限积累无效文件
4. **图片通过 Nginx 静态服务**：不通过 NestJS 流式传输（性能）

### 前序 Story 依赖

- **Story 1.3**（`agents` 表）
- **Story 1.5**（`@Audit` 装饰器）
- **Story 2.2**（`@RequirePermission`）

### Project Structure Notes

- Agent 数据模型（含 wxQrcodeUrl 字段）：[Source: architecture.md#数据模型设计 Agent]
- FR33 客服管理：[Source: epics.md#FR33]
- FR37 关联检查：[Source: epics.md#FR37]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

- **2026-04-07（CoCo）：** 按用户指定范围交付 **纯前端 + vite-plugin-mock**，对齐 UX 规范（间距 24px、标题 24px/700、模块标题 18px/600、玻璃卡片、状态色 badge）与 `prototype-spec.md` §2.6。API 前缀为 **`/api/v1/cs-agents`**（非 Story 原文的 `/agents`）。Story Task 1～3（NestJS/Multer）未实现，留待后续。
- **2026-04-07（Step 19）：** 与 AC 对照：`CsAgentList` / 抽屉 / 详情 / 删除拦截 / 状态筛选 / 分页 20 / jpg·png 前端拦截均已具备；本步无新增代码，仅将 Story 与 sprint 标为 review。

### File List

- `frontend/src/types/csAgent.ts`
- `frontend/src/api/csAgents.ts`
- `frontend/src/mock/csAgents.ts`
- `frontend/src/mock/index.ts`
- `frontend/src/views/cs-management/CsAgentList.vue`
- `frontend/src/views/cs-management/CsAgentFormDrawer.vue`
- `frontend/src/views/cs-management/CsAgentDetailView.vue`
- `frontend/src/views/CsManagementView.vue`
- `frontend/src/router/index.ts`

### Change Log

- 2026-04-07：新增客服管理前端（列表/详情/抽屉/删除拦截）与 `cs-agents` Mock。
