# ChatGPT Workspace Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 以 portal packages 为唯一源，实现可配置三栏 ChatGPT 式工作台；chat 仓为薄壳部署。

**Architecture:** `@acongm/kb-catalog` 统一模块/知识引用；`@acongm/chat-ui` 提供 `ChatWorkspace`（preset/slots + 移动 PanelHost）；chat `apps/web` 只做路由/BFF/env。npm 发布前用 sync 脚本把 portal packages 同步到 chat。

**Tech Stack:** Next.js 16、React 19、pnpm workspace、assistant-ui、Threads API、Supabase auth-client

**Spec:** `docs/superpowers/specs/2026-08-06-chatgpt-workspace-design.md`

---

## File map

| Path | Responsibility |
| --- | --- |
| `portal/packages/kb-catalog/` | KnowledgeRef、catalog、URL、context resolver |
| `portal/packages/chat-ui/src/workspace/` | ChatWorkspace、presets、PanelHost、EmptyState |
| `portal/packages/chat-ui/src/knowledge/` | ChipBar、（P2）Panel/Mention |
| `chat/scripts/sync-packages-from-portal.sh` | 同步 portal packages → chat |
| `chat/apps/web/app/page.tsx` | 挂载 `ChatWorkspace` preset=`siteFull` |
| `chat/apps/web/app/api/chat/threads/` | Threads BFF |

---

### Task 1: `@acongm/kb-catalog` 包骨架

**Files:**
- Create: `portal/packages/kb-catalog/package.json`
- Create: `portal/packages/kb-catalog/tsconfig.json`
- Create: `portal/packages/kb-catalog/src/types.ts`
- Create: `portal/packages/kb-catalog/src/knowledge-ref.ts`
- Create: `portal/packages/kb-catalog/src/catalog.ts`
- Create: `portal/packages/kb-catalog/src/url.ts`
- Create: `portal/packages/kb-catalog/src/resolve-context.ts`
- Create: `portal/packages/kb-catalog/src/index.ts`

- [ ] **Step 1:** 创建包与类型（KnowledgeRef、DocDomain、Isolation）
- [ ] **Step 2:** 实现 `listModules` / `moduleFolderFromLegacyPath` / `buildChatSiteUrl`（query 形式）/ `resolveChatV1Context`
- [ ] **Step 3:** `pnpm --filter @acongm/kb-catalog types:check`
- [ ] **Step 4:** Commit

### Task 2: portal 接入 kb-catalog

**Files:**
- Modify: `portal/apps/web/package.json`（依赖）
- Modify: `portal/apps/web/lib/modules.registry.ts`（薄包装或 re-export）
- Modify: `portal/apps/web/lib/chat-site-link.ts` / `doc-chat-path.ts`（调用 kb-catalog）

- [ ] **Step 1:** 依赖 `@acongm/kb-catalog`
- [ ] **Step 2:** `buildChatSiteUrl` 改为 `/?module=&slug=`（兼容设计）
- [ ] **Step 3:** types:check apps/web
- [ ] **Step 4:** Commit + push portal

### Task 3: `ChatWorkspace` 骨架（portal chat-ui）

**Files:**
- Create: `portal/packages/chat-ui/src/workspace/presets.ts`
- Create: `portal/packages/chat-ui/src/workspace/ChatEmptyState.tsx`
- Create: `portal/packages/chat-ui/src/workspace/ChatWorkspace.tsx`
- Create: `portal/packages/chat-ui/src/workspace/useChatBreakpoints.ts`
- Create: `portal/packages/chat-ui/src/knowledge/ContextChipBar.tsx`
- Modify: `portal/packages/chat-ui/src/index.ts`
- Modify: `portal/packages/chat-ui/src/styles/chat-ui.css`

- [ ] **Step 1:** presets + breakpoints + empty state
- [ ] **Step 2:** ChatWorkspace 三栏 grid（slots 显隐）
- [ ] **Step 3:** ContextChipBar
- [ ] **Step 4:** Commit

### Task 4: chat 同步 + 薄壳入口

**Files:**
- Create: `chat/scripts/sync-packages-from-portal.sh`
- Sync packages from portal
- Rewrite: `chat/apps/web/app/page.tsx`
- Create: Threads BFF stub routes

- [ ] **Step 1:** sync 脚本 + 跑同步
- [ ] **Step 2:** 首页改为 ChatWorkspace siteFull
- [ ] **Step 3:** `pnpm build` in chat
- [ ] **Step 4:** Commit + push chat

### Task 5: Threads BFF + `/t/[threadId]`（Phase 1 续）

- [ ] Threads proxy + 侧栏列表占位
- [ ] 通用对话可发消息（现有 stream 代理）

### Task 6: 知识树 + @（Phase 2）

- [ ] KnowledgePanel / MentionMenu
- [ ] URL sync + `/c/` redirect

### Task 7: Auth（Phase 3）

- [ ] auth-client + claim

---

## Spec coverage

| Spec section | Task |
| --- | --- |
| kb-catalog / portal 源 | 1–2 |
| 三栏 preset | 3 |
| chat 薄壳 | 4 |
| Threads / Auth | 5–7 |
| 移动 PanelHost | 3（骨架）+ 后续迭代 sheet |
| 知识树 / @ | 6 |

## Execution

本会话采用 **Inline Execution**，从 Task 1 起连续落地。
