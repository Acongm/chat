# chat

独立 Chat 站（**chat.acongm.com**），从 portal 抽离 `@acongm/chat-ui` 等包，支持按**模块 / 文章**绑定对话上下文，并可配置模块隔离与白名单。

## 功能

- 全屏对话 UI（`ChatFullscreen` + assistant-ui LocalRuntime）
- URL 绑定文档上下文：`/c/{moduleKey}/{...slug}`
- **模块隔离**：`chat.config.yaml` → `isolation.enforceModuleBoundary`
- **白名单**：`allowedDomains` / `allowedModules` 限制可访问知识库范围
- 同源 SSE 代理 → `api.acongm.com`

## 本地开发

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

- 首页：http://localhost:3000 — 模块目录
- 对话：http://localhost:3000/c/react — 模块级
- 文章：http://localhost:3000/c/react/react16 — 绑定 `/react/react16.md`

从 portal 跳转示例：

```
https://chat.acongm.com/c/react/react16?title=React%2016
```

## 目录

```
apps/web/           # Next.js 应用
packages/chat-ui/   # UI（与 portal 同源，可后续迁 npm）
packages/agent-session-sdk/
packages/kb-types/
chat.config.yaml    # 隔离与白名单
```

## 部署

Vercel Root Directory = `apps/web`。环境变量见 `apps/web/.env.example`。
