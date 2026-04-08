# Story 1.2：Docker Compose 容器化部署配置

Status: ready-for-dev

## Story

作为**开发者/运维**，
我希望有完整的 Docker Compose 配置，
以便整个系统可以在任何环境中一键启动，保障开发与生产环境一致性。

## Acceptance Criteria

1. **Given** 安装了 Docker 的机器  
   **When** 运行 `docker-compose up`  
   **Then** 五个服务均正常启动：`nginx`（80/443 端口）、`backend`（内部 3000 端口）、`mysql`（内部 3306 端口）、`redis`（内部 6379 端口）、`worker`（BullMQ 独立进程）

2. **Given** nginx 配置  
   **When** 收到 HTTP 80 端口请求  
   **Then** 自动 301 跳转到 HTTPS 443（满足 NFR6，不支持 HTTP 降级）

3. **Given** nginx 配置  
   **When** 收到 `/api/v1/*` 路径请求  
   **Then** 反向代理到 backend 容器 3000 端口；其余请求服务 Vue3 frontend 静态文件（`/usr/share/nginx/html/`）

4. **Given** MySQL 容器启动中  
   **When** backend 容器启动  
   **Then** backend 等待 MySQL 健康检查通过后再开始连接（`depends_on: condition: service_healthy`），避免启动顺序导致连接失败

5. **Given** 生产环境部署  
   **When** 审查端口暴露  
   **Then** MySQL（3306）和 Redis（6379）端口**仅**在 Docker 内部网络可访问，宿主机不暴露（无 `ports` 映射）

6. **Given** 生产 Dockerfile  
   **When** 构建 backend 镜像  
   **Then** 使用多阶段构建（`builder` → `production`），生产镜像不含开发依赖（`pnpm prune --prod`），最终镜像体积最小化

## Tasks / Subtasks

- [ ] Task 1: 编写 Backend Dockerfile（多阶段构建）(AC: #6)
  - [ ] 创建 `backend/Dockerfile`
  - [ ] Stage 1 (`builder`)：基于 `node:20-alpine`，安装全量依赖，运行 `pnpm run build` 生成 `dist/`
  - [ ] Stage 2 (`production`)：基于 `node:20-alpine`，仅复制 `dist/`、`package.json`，运行 `pnpm install --prod`
  - [ ] 暴露端口 3000，`CMD ["node", "dist/main.js"]`

- [ ] Task 2: 编写 Frontend Dockerfile（构建产物复制到 nginx）(AC: #3)
  - [ ] 创建 `frontend/Dockerfile`
  - [ ] Stage 1 (`builder`)：基于 `node:20-alpine`，安装依赖，运行 `pnpm run build` 生成 `dist/`
  - [ ] Stage 2：基于 `nginx:1.24-alpine`，复制 `dist/` 到 `/usr/share/nginx/html/`，复制 nginx 配置

- [ ] Task 3: 编写 Nginx 配置 (AC: #2, #3)
  - [ ] 创建 `nginx/nginx.conf`
  - [ ] HTTP 80 → HTTPS 301 重定向
  - [ ] HTTPS 443 监听，SSL 证书路径从环境变量/挂载卷读取（开发环境可用自签名证书）
  - [ ] `/api/v1/` → `proxy_pass http://backend:3000`（含 `proxy_set_header`）
  - [ ] 其余路径 → `root /usr/share/nginx/html`，配置 `try_files $uri $uri/ /index.html`（Vue Router history 模式）

- [ ] Task 4: 编写 docker-compose.yml (AC: #1, #4, #5)
  - [ ] 创建根目录 `docker-compose.yml`
  - [ ] 定义 5 个服务：`nginx`、`backend`、`mysql`、`redis`、`worker`
  - [ ] MySQL 配置健康检查（`mysqladmin ping -h localhost`），backend 使用 `depends_on: mysql: condition: service_healthy`
  - [ ] MySQL 和 Redis **不暴露** ports 到宿主机（仅 `expose`，不用 `ports`）
  - [ ] nginx 暴露 `ports: ["80:80", "443:443"]`
  - [ ] worker 服务与 backend 共享镜像但运行不同命令（`command: node dist/worker.js`）
  - [ ] 挂载 MySQL 数据卷（持久化）和 Redis 数据卷

- [ ] Task 5: 编写 docker-compose.dev.yml（开发覆盖配置）(AC: #1)
  - [ ] 创建 `docker-compose.dev.yml` 供开发环境覆盖
  - [ ] 开发环境暴露 MySQL 3306 和 Redis 6379 到宿主机（方便本地调试）
  - [ ] 注释说明：生产环境只用 `docker-compose.yml`，开发用 `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up`

- [ ] Task 6: 创建 worker 入口文件 (AC: #1)
  - [ ] 创建 `backend/src/worker.ts`（与 main.ts 同级）
  - [ ] 仅启动 BullMQ Worker，不启动 HTTP 服务器
  - [ ] 引用与 main.ts 相同的 NestJS 模块但激活 worker 模式

- [ ] Task 7: 本地验证 (AC: #1, #2, #3, #4, #5, #6)
  - [ ] `docker-compose build` 无报错
  - [ ] `docker-compose up` 所有服务启动
  - [ ] 验证 HTTP → HTTPS 重定向
  - [ ] 验证 `/api/v1/health`（后端健康检查端点）代理正确

## Dev Notes

### Docker Compose 服务拓扑

```
                        ┌─────────────────────────────────┐
                        │  Docker 内部网络 (kefu-network)  │
                        │                                 │
Internet → nginx:443 ──→│── /api/v1/* → backend:3000      │
           nginx:80  ──→│   (301 → 443)                   │
                        │                                 │
                        │  backend:3000 ──→ mysql:3306    │
                        │  backend:3000 ──→ redis:6379    │
                        │  worker       ──→ redis:6379    │
                        │  worker       ──→ mysql:3306    │
                        └─────────────────────────────────┘
```

### docker-compose.yml 参考结构

```yaml
version: '3.9'

services:
  nginx:
    build: ./nginx
    # 或 image: nginx:1.24-alpine（配合 volumes 挂载配置）
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro  # SSL证书
    networks:
      - kefu-network

  backend:
    build:
      context: ./backend
      target: production
    env_file:
      - .env
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    expose:
      - "3000"
    networks:
      - kefu-network

  worker:
    build:
      context: ./backend
      target: production
    command: node dist/worker.js
    env_file:
      - .env
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - kefu-network

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: kefu_db
      MYSQL_USER: kefu_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    expose:
      - "3306"                          # 不暴露到宿主机（安全要求）
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kefu-network

  redis:
    image: redis:7-alpine
    expose:
      - "6379"                          # 不暴露到宿主机（安全要求）
    volumes:
      - redis_data:/data
    networks:
      - kefu-network

volumes:
  mysql_data:
  redis_data:

networks:
  kefu-network:
    driver: bridge
```

### Nginx 配置关键点

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;  # HTTP → HTTPS 强制跳转（NFR6）
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # API 代理
    location /api/v1/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Vue3 SPA（history 模式）
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Backend Dockerfile 多阶段构建

```dockerfile
# backend/Dockerfile

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Worker 入口文件模式

```typescript
// backend/src/worker.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  // Worker 进程：不启动 HTTP 监听，只启动 BullMQ 消费者
  const app = await NestFactory.createApplicationContext(AppModule)
  console.log('Worker process started')
  // NestJS 模块初始化时 BullMQ Processor 会自动注册
}

bootstrap()
```

### 新增 .env 变量（需补充到 .env.example）

Story 1.1 的 `.env.example` 基础上，Story 1.2 额外需要：
```env
# Docker MySQL 密码（docker-compose 使用）
MYSQL_ROOT_PASSWORD="root_password"
MYSQL_PASSWORD="kefu_password"
```

### 关键架构规范（不可偏离）

1. **MySQL 和 Redis 不暴露到宿主机**：生产 `docker-compose.yml` 中只用 `expose`，不用 `ports`（NFR6 + 安全要求）
2. **depends_on 使用 health check**：backend 必须等待 MySQL `service_healthy` 而非 `service_started`
3. **worker 独立进程**：worker 与 backend 共享代码但是独立 Docker 容器，命令不同（`node dist/worker.js`）
4. **前端静态文件由 nginx 服务**：不需要独立 frontend 容器，frontend 构建产物复制进 nginx 镜像
5. **HTTP 强制跳转 HTTPS**：nginx 80 端口仅做 301 重定向，不提供任何内容

### Project Structure Notes

- Docker 架构：[Source: architecture.md#Docker Compose 架构]
- 环境配置策略：[Source: architecture.md#环境配置策略]
- NFR6 HTTPS 要求：[Source: architecture.md#需求概览 NFR6]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (BMad Story Context Engine)

### Debug Log References

### Completion Notes List

### File List
