# Chat 站 ChatGPT 式工作台 — 设计规格

> 状态：待评审  
> 日期：2026-08-06  
> 范围：`Acongm/chat` 入口与主界面重做

## 1. 背景与目标

### 现状

- 首页 `/` 为**模块卡片目录**，必须先选模块才能进入 `/c/{moduleKey}/...` 聊天。
- 聊天 UI 基于 `@acongm/chat-ui` 的 `ChatFullscreen`，带站点 header，与 ChatGPT 极简入口差异大。
- Threads API、auth-client 已存在于平台，但 chat 站尚未接入登录与跨设备会话。

### 目标

1. **入口与主界面**对齐 [chatgpt.com](https://chatgpt.com)：居中欢迎语 + 主输入框，无强制选模块。
2. **知识上下文**为可选辅助（类 Cursor 项目目录）：领域 / 模块 / 文章三级均可独立挂载，可有可无。
3. **知识选取方式**（组合 C）：
   - 右侧可折叠知识树面板（浏览勾选）
   - 输入框 `@` 快速检索（与树操作同步）
   - 选中项统一显示为 **context chips**（可移除）
4. **会话能力**（完整版 C）：
   - 左侧栏：会话列表、新建对话、登录态
   - 登录后 Threads 跨设备同步；匿名 `x-client-id` + OAuth 认领

### 非目标（本阶段不做）

- DocHub 编辑能力
- 多模型切换 UI（沿用 API 默认 provider）
- 语音输入（可预留按钮占位）
- 替换 portal 内嵌 ChatDrawer（保持独立，仅深链协议对齐）

---

## 2. 方案对比

| 方案 | 描述 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **A. 单页巨石组件** | 一个 `ChatWorkspace.tsx` 承载三栏 + 全部逻辑 | 上线快 | 难测、难复用、与 portal chat-ui 分叉 |
| **B. App 层组装** | `chat-ui` 提供通用 Thread/Composer；`apps/web` 组装三栏与知识树 | 边界清晰、可测 | 需拆分现有 `ChatFullscreen` |
| **C. 扩展 chat-ui 全家桶** | 在 `chat-ui` 内新建 `ChatWorkspace` 含知识树 | 包内一致 | 知识树与 `doc-modules.json` 强耦合 portal 域，不应进通用包 |

**推荐：方案 B**

- `@acongm/chat-ui`：ChatGPT 式 **Thread 区 + Composer + chips 槽位**（与知识来源无关）
- `apps/web`：**三栏布局、知识树、@ 检索、auth、threads BFF、URL 同步**
- 与现有 `DocsChatShell`（portal 抽屉）共存，共享底层 `DocChatRuntimeProvider` / adapter

---

## 3. 信息架构与路由

### 3.1 布局（桌面）

```
┌──────────────┬────────────────────────────────────┬──────────────┐
│ 会话侧栏      │           主对话区                  │ 知识树（可折叠）│
│              │                                    │              │
│ [+ 新对话]    │      「我们从哪开始？」              │ ▼ 前端核心    │
│              │                                    │   ▼ react    │
│ · 会话标题 1  │      [chip] [chip]  （可选）        │     · react16│
│ · 会话标题 2  │      ┌─────────────────────────┐   │   ▼ vue      │
│ · …          │      │  输入消息…  @ 引用知识    │   │              │
│              │      └─────────────────────────┘   │              │
│ ─────────    │                                    │              │
│ [登录/头像]   │                                    │              │
└──────────────┴────────────────────────────────────┴──────────────┘
```

### 3.2 路由

| 路径 | 行为 |
| --- | --- |
| `/` | 主工作台；无 `threadId` 时展示新对话空态 |
| `/t/[threadId]` | 加载并恢复指定会话（消息 + 已保存的 context chips） |
| `/c/[moduleKey]/[[...slug]]` | **301/客户端 redirect** → `/?module=…&slug=…`（兼容 portal 深链） |

### 3.3 URL 查询参数（知识上下文，均可选）

| 参数 | 含义 | 示例 |
| --- | --- | --- |
| `domain` | 领域 id（仅作分组/过滤提示，不单独发 API） | `domain=core` |
| `module` | 模块 folder | `module=react` |
| `slug` | 文章路径（不含扩展名） | `slug=react16` |
| `title` | 展示标题 | `title=React%2016` |
| `scope` | `module` \| `article` | `scope=article` |
| `thread` | 打开已有会话（与 `/t/` 二选一，优先 path） | `thread=uuid` |

**portal 深链映射**（已由 portal `buildChatSiteUrl` 生成）：

```
https://chat.acongm.com/?module=interview-prep&title=面试准备
https://chat.acongm.com/?module=react&slug=react16&title=React+16
```

旧路径 `/c/react/react16` 重定向到上述 query 形式。

---

## 4. 核心概念

### 4.1 KnowledgeRef（知识引用）

可选辅助上下文单元，三级之一：

```typescript
type KnowledgeLevel = 'domain' | 'module' | 'article';

type KnowledgeRef = {
  id: string;              // 稳定 id，如 "module:react" | "article:/react/react16.md"
  level: KnowledgeLevel;
  domainId?: string;
  moduleKey?: string;      // doc-modules folder
  pagePath?: string;       // legacy pagePath，article 级必填
  title: string;           // chip 展示
  scope?: 'module' | 'article';
};
```

**规则：**

- 0 个 chip → **通用对话**（见 4.3）
- 允许多个 chip；发送时由 **ContextResolver** 合并（见 4.4）
- chips 与 thread 绑定持久化（`CreateChatThreadRequest` + thread metadata 扩展）

### 4.2 与 Cursor 的类比

| Cursor | Chat 站 |
| --- | --- |
| 项目目录（可选打开） | 右侧知识树（默认折叠） |
| @ 引用文件 | @ 引用领域/模块/文章 |
| 已选文件标签 | context chips |
| 无文件也能对话 | 无知识也能对话 |

### 4.3 无知识时的 API 上下文

`ChatV1Context` 字段在 API DTO 中为可选。无 chip 时使用**通用占位上下文**：

```typescript
const GENERAL_CONTEXT: ChatV1Context = {
  scope: 'module',
  pagePath: '/',
  moduleKey: '_general',
  title: '通用对话',
  tags: [],
  // 不传 content
};
```

`historyMode: 'long'`，走 Threads 流式接口。

> 若线上策略需要限制通用对话，可在 `chat.config.yaml` 增加 `chat.allowGeneralChat: false`，UI 仍展示入口但发送前提示挂载知识。

### 4.4 多 chip 合并策略（发送前）

1. 取**最具体**的 chip 作为 primary：`article` > `module` > `domain`
2. `scope`：有 article → `article`；仅 module/domain → `module`
3. `pagePath` / `moduleKey` / `title` 来自 primary
4. 若有多个 article chip：并行拉取 summaries/content，**拼接**进 `context.content`（上限 8k 字符，与 portal 一致）
5. `domain` 级 chip 仅用于 UI 过滤，不单独作为 API context（除非仅有 domain，则 scope=module + moduleKey 为空 + 在 tags 注明领域）

### 4.5 对话自动匹配知识（辅助建议，非强制）

三阶段实现：

| 阶段 | 机制 | 用户体验 |
| --- | --- | --- |
| P1 | 本地 **summaries-v1** 标题模糊匹配 + 模块名关键词 | 首条用户消息后，输入框上方出现「建议引用：react / react16」可一键加 chip |
| P2 | 调用 API **轻量分类**（新 endpoint 或 ChatV1 meta 事件） | 置信度 ≥ 0.7 自动加 chip；否则仅建议 |
| P3 | 结合 thread 历史与多轮消歧 | 用户可点「不再自动建议」 |

**原则：** 自动匹配**永不阻止发送**；仅增加/建议 chip，用户可删除。

---

## 5. 组件架构

### 5.1 `apps/web`（站点专属）

| 组件/模块 | 职责 |
| --- | --- |
| `ChatWorkspaceLayout` | 三栏响应式布局、侧栏折叠状态 |
| `ThreadSidebar` | 会话列表、新建、删除、登录入口 |
| `KnowledgePanel` | 右侧树：domain → module → article（懒加载文章列表） |
| `KnowledgeMentionMenu` | Composer `@` 触发的模糊搜索浮层 |
| `ContextChipBar` | chips 展示与移除（可被 chat-ui 复用） |
| `useKnowledgeContext` | chips 状态、URL 同步、thread 持久化 |
| `useChatThreads` | list/create/load/delete + auth header |
| `useAuthSession` | 封装 `@acongm/auth-client` |
| `resolveKnowledgeFromUrl` | 解析 query → 初始 chips |
| `context-resolver.ts` | KnowledgeRef[] → ChatV1Context |

### 5.2 `@acongm/chat-ui`（通用聊天内核）

新增/改造：

| 导出 | 说明 |
| --- | --- |
| `ChatWorkspace` | 替代 `ChatFullscreen` 用于主站：消息区 + 空态 + composer 槽位 |
| `ChatEmptyState` | 「我们从哪开始？」居中欢迎 |
| `ChatComposer` | 支持 `onMentionTrigger`、`chipSlot`、`footerActions` |
| `createThreadChatModelAdapter` | 基于 Threads `streamThreadMessage`，替代纯 ChatV1 短对话 |
| 保留 `DocsChatShell` | portal 嵌入不变 |

### 5.3 API BFF（`apps/web/app/api`）

| 路由 | 上游 |
| --- | --- |
| `POST /api/ai/v1/chat/stream` | 已有，保留 |
| `/api/chat/threads/**` | **新增** 代理至 `api.acongm.com`（转发 `authorization`、`x-client-id`） |
| `GET /api/kb/articles` | 可选：按 module 列出文章标题（读 summaries-v1 或静态索引） |

### 5.4 Auth

环境变量（`apps/web/.env`）：

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_AUTH_URL=https://auth.acongm.com
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.acongm.com
```

- 未登录：匿名 threads（`x-client-id`）
- 登录：跳转 `auth.acongm.com/login?returnTo=https://chat.acongm.com/t/{id}`
- 回调后调用 threads claim（API 已支持 `claimThreads`）

---

## 6. 数据流

### 6.1 新建对话

```
用户打开 / → 空态
  → 输入首条消息
  → 若无 threadId：createChatThread({ title: 首条摘要, moduleKey, pagePath from chips })
  → streamThreadMessage(threadId, { content, context: resolved })
  → 导航到 /t/{threadId}
  → 侧栏列表刷新
```

### 6.2 挂载知识后发送

```
用户从知识树或 @ 添加 chip
  → ContextChipBar 更新
  → useKnowledgeContext 同步 URL（replaceState，不刷新）
  → 发送时 context-resolver 合并 → streamThreadMessage
  → thread 记录更新 moduleKey/pagePath
```

### 6.3 从 portal 深链进入

```
portal「全屏对话」→ chat.acongm.com/?module=react&slug=react16&title=...
  → resolveKnowledgeFromUrl → 预填 1 个 article chip
  → 空态展示 chips，用户直接输入
```

---

## 7. 视觉与交互规范

### 7.1 ChatGPT 对齐项

- 深色/浅色跟随系统（沿用 `@acongm/ui-theme` tokens，新增 workspace 中性背景）
- 主区垂直居中空态；有消息后消息区顶对齐、composer 贴底
- 侧栏宽度 ~260px；知识树 ~280px；可拖拽调宽（P2）
- 输入框圆角胶囊、单行起始、Shift+Enter 换行
- 新建对话按钮在侧栏顶部

### 7.2 知识树

- 默认**折叠**右栏；工具栏图标（书本/文件夹）切换
- 树节点：domain（不可单独成 chip，仅展开）→ module（可勾选）→ article（可勾选）
- 勾选 = 添加 chip；取消勾选 = 移除对应 chip
- 与 `@` 菜单共用 `KnowledgeCatalog` 数据源

### 7.3 移动端

- 单栏主对话；侧栏与知识树改为 **drawer**
- chips 横向滚动

---

## 8. 配置

`chat.config.yaml` 扩展：

```yaml
chat:
  allowGeneralChat: true
  enableThinking: true
  historyMode: long
  callSourcePrefix: chat-site
  autoSuggestKnowledge: true   # P1 本地建议
  maxContextChips: 5
ui:
  emptyStateTitle: "我们从哪开始？"
  showKnowledgePanel: true
```

隔离策略不变：`isolation.enforceModuleBoundary` 仅限制**可添加**的 module/article，不阻止进入站点。

---

## 9. 迁移与兼容

| 项 | 处理 |
| --- | --- |
| 首页模块网格 | 移除；由知识树取代 |
| `/c/...` 路由 | middleware redirect 到 query 形式 |
| `ChatSiteShell` | 废弃，由 `ChatWorkspaceLayout` 替代 |
| portal `buildChatSiteUrl` | 改为生成 `/?module=&slug=`（portal 侧小改，可并行 PR） |
| sessionStorage 单页 thread | 迁移到 Threads API；旧 key 一次性读取后废弃 |

---

## 10. 实施分期

### Phase 1 — 外壳与通用对话（MVP 可见）

- [ ] `ChatWorkspaceLayout` 三栏骨架 + ChatGPT 空态
- [ ] `ChatWorkspace` + `ChatComposer`（无知识也可发）
- [ ] Threads BFF + 侧栏列表 + `/t/[threadId]`
- [ ] 废弃模块目录首页

### Phase 2 — 知识上下文

- [ ] `KnowledgeRef` + `ContextChipBar`
- [ ] 右侧 `KnowledgePanel`（三级树）
- [ ] Composer `@` mention 菜单
- [ ] URL 参数同步 + `/c/` redirect
- [ ] `context-resolver` 多 chip 合并

### Phase 3 — Auth 与同步

- [ ] 接入 `@acongm/auth-client`
- [ ] 登录/登出 UI
- [ ] 匿名 thread claim
- [ ] 跨设备列表一致

### Phase 4 — 智能建议

- [ ] summaries 本地匹配建议 chip
- [ ] 可选 API 分类 endpoint
- [ ] 用户关闭自动建议偏好（localStorage）

### Phase 5 — 打磨

- [ ] 响应式 drawer
- [ ] 侧栏宽度拖拽
- [ ] portal 深链联调 + E2E

---

## 11. 测试要点

- 无 chip 可创建 thread 并流式回复
- URL `?module=react&slug=react16` 预填 chip 且可移除后继续聊
- 知识树与 `@` 添加同一文章，chip 不重复
- 多 chip 合并后 API context 符合 4.4 规则
- 未登录创建 → 登录 → claim 后会话仍在侧栏
- `/c/react/react16` redirect 后功能等价
- `enforceModuleBoundary` + 白名单外模块无法添加 chip

---

## 12. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 通用对话质量/成本 | `allowGeneralChat` 配置开关；限额沿用 API tier |
| summaries 体积大 | 文章列表按 module 懒加载；@ 搜索 debounce |
| auth 包跨仓依赖 | chat `package.json` 引用 `@acongm/auth-client`（npm/git）或 workspace copy |
| chat-ui 膨胀 | 知识相关仅放 apps/web；chat-ui 只保留槽位型组件 |

---

## 13. 开放问题（实现前确认）

1. **auth-client 依赖方式**：chat 仓 npm 安装 `@acongm/auth-client` 还是从 auth 仓 copy workspace？（建议 npm 发布或 git submodule，与 portal 一致）
2. **thread title 生成**：首条用户消息截断 vs API 摘要（建议先截断 40 字）
3. **P2 分类 API**：是否在 node-vercel-starter 新增 `POST /api/ai/v1/kb/suggest`？（可 Phase 4 再定）

---

## 附录：关键文件（计划变更）

```
chat/apps/web/app/page.tsx                    # → ChatWorkspace 入口
chat/apps/web/app/t/[threadId]/page.tsx       # 新建
chat/apps/web/app/c/...                       # → redirect only
chat/apps/web/components/workspace/*          # 新建三栏组件
chat/apps/web/lib/knowledge/*                 # KnowledgeRef, resolver, catalog
chat/apps/web/app/api/chat/threads/[...]/route.ts  # BFF
chat/packages/chat-ui/src/ChatWorkspace.tsx   # 新建
chat/packages/chat-ui/src/ChatComposer.tsx    # 新建/拆分
chat/chat.config.yaml                         # 扩展 ui/chat 配置
```
