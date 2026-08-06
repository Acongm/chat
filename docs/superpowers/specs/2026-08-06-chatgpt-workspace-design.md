# Chat 站 ChatGPT 式工作台 — 设计规格

> 状态：待评审（v2 — portal 统一源码 + 可配置三栏 + 移动优先）  
> 日期：2026-08-06  
> 范围：以 **portal 包为唯一实现源**，chat 仓为薄壳部署；主界面重做

## 0. v2 修订要点（相对 v1）

| 原则 | 说明 |
| --- | --- |
| **代码来自 portal** | 聊天 UI、知识目录、context 解析、移动端布局**全部在 portal `packages/` 实现**；chat 仓不再复制 packages |
| **统一模块处理** | 新增 `@acongm/kb-catalog`，portal / chat / 未来 npm 消费方共用同一套 `doc-modules` + `KnowledgeRef` + resolver |
| **三栏可配置** | `ChatWorkspace` 通过 preset / props 控制左（会话）、中（对话）、右（知识）是否挂载，适配多场景 |
| **移动优先在包内** | 移动端 panel 策略（bottom sheet / fullscreen overlay）在 `@acongm/chat-ui` 统一实现，优于 portal 文档页内嵌 drawer；portal 后续可升级引用 |

---

## 1. 背景与目标

### 现状

- chat 首页为模块卡片目录，须先选模块再进入 `/c/{moduleKey}/...`。
- **chat 仓从 portal 复制了整套 packages**，双份维护易漂移。
- portal 移动端 Chat 为文档页内 **rc-drawer**（FAB + 侧栏/底部 sheet），受 Fumadocs 布局挤压。
- Threads API、auth-client 已存在，chat 站尚未接入。

### 目标

1. 入口对齐 ChatGPT：居中欢迎语 + 主输入框，无强制选模块。
2. 知识上下文为可选辅助（类 Cursor 项目目录）：领域 / 模块 / 文章三级可选。
3. 知识选取：右侧树 + 输入框 `@`，同步为 **context chips**。
4. 完整会话：左侧历史 + 登录跨设备同步（Threads + OAuth claim）。
5. **实现统一在 portal packages**，chat 仅部署与 BFF。

### 非目标

- DocHub、多模型切换、语音输入
- **在 chat 仓重复实现 packages**

---

## 2. 仓库与包边界（portal 为源）

### 2.1 职责划分

```
portal/packages/              ← 唯一实现源（将来发 npm）
├── kb-types/                 契约（已有）
├── kb-catalog/               ★ 新建：doc-modules、KnowledgeRef、resolver、URL
├── agent-session-sdk/        API 客户端（已有）
├── chat-ui/                  工作台、三栏布局、移动 panel、Composer、知识树 UI
├── ui-theme/                 tokens（已有）
└── assistant-ui-theme/       assistant-ui 皮肤（已有）

chat/apps/web/                ← 薄壳：路由、BFF、env、chat.config.yaml
portal/apps/web/              ← DocsChatShell（embed preset）
```

### 2.2 chat 仓消费 portal 包

**阶段 1**：pnpm git dependency 或 submodule 引用 portal packages（删除 chat 内 `packages/*`）。

**阶段 2**：发布 `@acongm/chat-ui`、`@acongm/kb-catalog` 等到 npm，版本对齐。

### 2.3 `@acongm/kb-catalog`（统一模块处理）

| 导出 | 职责 |
| --- | --- |
| `loadDocModules(config?)` | registry + isolation 白名单 |
| `KnowledgeRef` / `KnowledgeLevel` | 三级可选引用 |
| `resolveKnowledgeFromUrl(query)` | URL → chips |
| `buildChatSiteUrl(pagePath)` | portal 深链（从 portal `chat-site-link` 迁入） |
| `resolveChatV1Context(refs[])` | 多 chip → `ChatV1Context` |
| `searchKnowledgeCatalog(q)` | `@` 与树共用检索 |
| `suggestKnowledgeFromText(text)` | P1 本地 summaries 匹配 |

合并 portal `modules.registry.ts` 与 chat `module-catalog.ts`，**单一实现**。

---

## 3. 可配置三栏布局

### 3.1 `ChatWorkspace` API（`@acongm/chat-ui`）

```typescript
type PanelMode = false | true | 'auto' | React.ReactNode;

type ChatWorkspaceSlots = {
  threadSidebar?: PanelMode;   // 左：会话 + 登录
  knowledgePanel?: PanelMode;  // 右：知识树
  main?: React.ReactNode;      // 中：对话区
};

type ChatWorkspaceMobile = {
  threadSidebar: 'sheet' | 'fullscreen' | 'hidden';
  knowledgePanel: 'sheet' | 'fullscreen' | 'hidden';
  showPanelToggles?: boolean;  // 底部 [会话][知识] 图标
};

type ChatWorkspaceProps = {
  preset?: ChatLayoutPreset;
  slots?: ChatWorkspaceSlots;
  mobile?: ChatWorkspaceMobile;
  contextChips?: KnowledgeRef[];
  onContextChipsChange?: (refs: KnowledgeRef[]) => void;
  threadId?: string;
  onThreadChange?: (id: string | null) => void;
};
```

### 3.2 场景预设

| Preset | threadSidebar | knowledgePanel | 使用方 |
| --- | --- | --- | --- |
| `embed` | `false` | `false` | portal 文档内 FAB + Drawer |
| `embedWithContext` | `false` | `'auto'` | portal 跳转全屏（仅知识辅助） |
| `siteFull` | `true` | `'auto'` | chat.acongm.com 默认 |
| `siteFocus` | `true` | `false` | 对话 + 历史，知识仅 `@` |
| `siteKbBrowse` | `false` | `true` | 知识浏览为主 |
| `mainOnly` | `false` | `false` | 极简单栏 |

`'auto'`：桌面显示列；移动降为 sheet（见 §4）。

### 3.3 桌面布局（`siteFull`）

```
┌──────────────┬────────────────────────────────────┬──────────────┐
│ 会话 [可关]   │           主对话区                  │ 知识树 [可关] │
│ [+ 新对话]    │      「我们从哪开始？」              │ ▼ 领域→模块→文│
│ · 会话…      │      [chip] [chip]                   │              │
│ [登录]       │      ┌─────────────────────────┐   │              │
│              │      │  输入…  @               │   │              │
└──────────────┴────────────────────────────────────┴──────────────┘
```

列数 1–3 随 slots 动态计算；折叠状态 `localStorage` 记忆。

---

## 4. 移动端方案（包内统一，便于 npm）

### 4.1 portal 现状问题

- Drawer 与文档 TOC/侧栏争宽度。
- 断点散落 `ChatDrawer`（1180/768），未覆盖多 panel。
- 键盘弹出易遮挡 composer。

### 4.2 `ChatPanelHost`（chat-ui 内）

| 能力 | 实现 |
| --- | --- |
| 主对话全屏 | 移动默认单列 |
| 侧栏 → Sheet | 统一 `ChatBottomSheet`，拖拽把手 |
| 底部工具条 | `[会话] [知识] [新建]` |
| Composer 安全区 | `safe-area-inset` + `visualViewport` 上推 |
| 断点 | `useChatBreakpoints()`：`compact` <768 / `medium` <1180 / `wide` ≥1180 |

### 4.3 portal 迁移

- 短期：portal 保持 `DocsChatShell`（`preset: embed`）。
- 中期：portal 移动改用同一 `ChatBottomSheet` + composer 键盘逻辑。
- 长期：废弃 portal 内重复断点 CSS。

---

## 5. 路由与 URL

| 路径 | 行为 |
| --- | --- |
| `/` | 工作台，`preset` 由 `chat.config.yaml` 决定（默认 `siteFull`） |
| `/t/[threadId]` | 恢复会话 |
| `/c/[moduleKey]/[[...slug]]` | redirect → `/?module=&slug=` |

| 参数 | 含义 |
| --- | --- |
| `module` / `slug` / `title` / `scope` | 预填 knowledge chips（均可选） |
| `layout` | 覆盖 preset：`full` \| `focus` \| `main`（可选） |

---

## 6. 核心概念

### 6.1 KnowledgeRef

```typescript
type KnowledgeRef = {
  id: string;
  level: 'domain' | 'module' | 'article';
  domainId?: string;
  moduleKey?: string;
  pagePath?: string;
  title: string;
  scope?: 'module' | 'article';
};
```

- 0 chip → 通用对话（`moduleKey: '_general'`）
- 多 chip → `resolveChatV1Context` 合并（article > module > domain）
- 自动匹配仅建议 chip，不阻止发送

### 6.2 与 Cursor 类比

| Cursor | Chat |
| --- | --- |
| 项目目录（可选） | 知识树（`knowledgePanel`，可关） |
| @ 文件 | @ 知识 |
| 标签 | context chips |
| 无文件可聊 | 无知识可聊 |

---

## 7. 组件架构（均在 portal packages）

### 7.1 `@acongm/kb-catalog`

数据与纯函数：registry、resolver、URL、搜索、建议。

### 7.2 `@acongm/chat-ui`

| 组件 | 职责 |
| --- | --- |
| `ChatWorkspace` | 三栏 grid + preset + slots |
| `ChatPanelHost` / `ChatBottomSheet` | 移动 panel |
| `ChatEmptyState` | ChatGPT 空态 |
| `ChatComposer` | 输入 + `@` 槽位 |
| `ContextChipBar` | chips |
| `KnowledgePanel` | 三级树（依赖 kb-catalog） |
| `KnowledgeMentionMenu` | `@` 浮层 |
| `ThreadSidebar` | 会话列表槽位（数据由宿主注入 hooks） |
| `DocsChatShell` | 保留，`preset: embed` |
| `createThreadChatModelAdapter` | Threads 流式 |

### 7.3 chat `apps/web`（薄壳）

| 模块 | 职责 |
| --- | --- |
| `page.tsx` / `t/[id]/page.tsx` | 挂载 `ChatWorkspace preset=siteFull` |
| `api/chat/threads/**` | BFF 代理 |
| `api/ai/v1/chat/stream` | 已有 |
| Auth 接线 | `@acongm/auth-client` + returnTo |
| `chat.config.yaml` | preset 默认、isolation、domains |

**不在 chat 仓新建** `components/workspace/*` 或 `lib/knowledge/*`（除非极薄的 Next 适配器）。

---

## 8. 数据流（摘要）

1. 打开 `/` → `ChatWorkspace` + 空 chips → 首条消息 → `createChatThread` → `/t/{id}`。
2. 树 / `@` 加 chip → `ContextChipBar` → URL `replaceState` → 发送时 `resolveChatV1Context`。
3. portal 深链 `?module=&slug=` → `resolveKnowledgeFromUrl` → 预填 chips。

---

## 9. 配置

```yaml
# chat.config.yaml
ui:
  layoutPreset: siteFull          # 可被 URL ?layout= 覆盖
  emptyStateTitle: "我们从哪开始？"
  defaultPanels:
    threadSidebar: true
    knowledgePanel: auto          # auto = 桌面开、移动 sheet
chat:
  allowGeneralChat: true
  historyMode: long
  maxContextChips: 5
isolation:
  enforceModuleBoundary: true
```

---

## 10. 迁移

| 项 | 处理 |
| --- | --- |
| chat `packages/*` | 删除，改依赖 portal |
| chat 模块目录首页 | 移除 |
| `ChatSiteShell` | 废弃 → `ChatWorkspace` |
| portal `buildChatSiteUrl` | 迁至 `@acongm/kb-catalog`，portal re-export |
| portal `modules.registry` | 迁入 kb-catalog |

---

## 11. 实施分期

### Phase 0 — 包统一（前置）

- [ ] portal 新建 `@acongm/kb-catalog`，合并 module 逻辑
- [ ] chat 仓删除 packages 副本，改引用 portal
- [ ] portal 发布/锁定依赖版本

### Phase 1 — 工作台 MVP

- [ ] `ChatWorkspace` + `ChatPanelHost` + `useChatBreakpoints`
- [ ] `preset: siteFull` / `mainOnly`；chat 薄壳接入
- [ ] Threads BFF + `/t/[id]`

### Phase 2 — 知识与 chips

- [ ] `KnowledgePanel` + `KnowledgeMentionMenu` + `ContextChipBar`（均在 chat-ui）
- [ ] URL 同步 + `/c/` redirect

### Phase 3 — Auth

- [ ] ThreadSidebar 登录 + claim

### Phase 4 — 智能建议 + portal 移动升级

- [ ] `suggestKnowledgeFromText`
- [ ] portal `embed` 复用 `ChatBottomSheet`

### Phase 5 — npm 发布

- [ ] `@acongm/chat-ui` + `@acongm/kb-catalog` 发版文档

---

## 12. 测试要点

- 各 preset 下栏位正确显隐（含 `?layout=` 覆盖）
- 移动：sheet 打开/关闭、键盘不挡 composer
- portal 与 chat 同一 `KnowledgeRef` resolver 结果一致
- 无 chip / 多 chip / URL 预填 / 白名单隔离

---

## 13. 风险

| 风险 | 对策 |
| --- | --- |
| 跨仓 git 依赖脆弱 | Phase 0 后尽快 npm |
| chat-ui 包过大 | kb-catalog 纯逻辑独立；UI 按子路径 export |
| portal 回归 | `DocsChatShell` embed preset 单测 + 视觉快照 |

---

## 14. 开放问题

1. portal 包引用方式：git subtree vs npm workspace vs submodule？
2. `KnowledgePanel` 文章列表数据源：summaries-v1 全量 vs 按 module 索引 API？

---

## 附录：关键文件（均在 portal）

```
portal/packages/kb-catalog/src/*              # 新建
portal/packages/chat-ui/src/workspace/*       # ChatWorkspace, PanelHost, Sheet
portal/packages/chat-ui/src/knowledge/*       # Panel, MentionMenu, ChipBar
portal/packages/chat-ui/src/hooks/useChatBreakpoints.ts

chat/apps/web/app/page.tsx                    # 薄：import ChatWorkspace
chat/apps/web/app/api/chat/threads/...        # BFF only
```
