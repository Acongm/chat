# Chat 模块接入指南

> **唯一源仓库**：`Acongm/chat`  
> **消费方**：`portal`（文档嵌入）、未来 dochub 等 — 只接入，不在消费方仓内改 chat 包源码。

## 模块边界

| 层 | 包 | 职责 |
|----|-----|------|
| API 客户端 | `@acongm/agent-session-sdk` | `/api/chats` v2 CRUD、SSE stream、history restore |
| UI 组件 | `@acongm/chat-ui` | `ChatFullscreen`、`DocsChatShell`、assistant-ui runtime |
| 接入层 | `@acongm/chat-ui/integration` | 消费方复用 hook（如 `usePageBoundChat`） |
| 类型 | `@acongm/kb-types` | ChatV2 DTO |
| 后端 API | `node-vercel-starter` `/api/chats/*` | 持久化 chat/message/run |

## 安装（消费方 monorepo）

```bash
# 在 chat 仓执行 — 将 chat 包同步到 portal
./scripts/sync-chat-packages-to-portal.sh
```

校验漂移：

```bash
./scripts/check-chat-packages-drift.sh
```

## 推荐接入方式

### Portal 文档页嵌入（Drawer）

```tsx
import { useSession } from '@acongm/auth-client';
import { DocsChatShell } from '@acongm/chat-ui';
import { usePageBoundChat } from '@acongm/chat-ui/integration';

const { session } = useSession({ ensureAnonymous: true });

const { chatId, seedMessages, ready, ensureChat } = usePageBoundChat({
  userId: session?.user.id,
  accessToken: session?.access_token,
  pagePath,
  moduleKey,
  pointerKey: `acongm.portal.chat.v2:${userId}:${pagePath}`,
  metadata: { surface: 'portal' },
});
```

完整示例见 `portal/apps/web/components/doc-chat-embed.tsx`。

### 独立 Chat 站（全屏工作台）

使用 `ChatWorkspace` + `useChatThreads`（chat 仓 app 层）；线程列表逻辑在 `apps/web/lib/use-chat-threads.ts`，历史恢复走 SDK `loadChatV2HistoryProgressive`。

### BFF 代理

消费方 Next 需提供同源 `/api/chats` → `api.acongm.com/api/chats`（见各仓 `app/api/chats` 路由）。

## SDK 导出面（稳定）

```ts
// @acongm/agent-session-sdk
createChatV2, getChatV2, listChatMessagesV2, streamChatMessageV2
loadChatV2History, loadChatV2HistoryProgressive
mapDurableBranchToUiMessages, selectActiveChatBranch

// @acongm/chat-ui/integration
usePageBoundChat
```

## 变更流程

1. 在 **chat 仓** 修改 `packages/*`
2. `pnpm types:check`
3. `./scripts/sync-chat-packages-to-portal.sh`
4. portal `pnpm types:check && pnpm test:portal-chat-v2`
5. 分别提交各仓

**禁止** 在 portal 直接改 `packages/chat-ui` 等后不同步回 chat。

## 与 Auth 模块协作

Chat v2 要求 Supabase JWT（含 anonymous）。消费方通过 `@acongm/auth-client` 的 `ensureAnonymous` 接入，见 `auth/docs/module-integration.md`。
