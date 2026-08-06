# @acongm Chat packages（portal / chat 共用）

## 包职责

| 包 | 职责 |
|----|------|
| `@acongm/kb-types` | ChatV1 / SummariesV1 类型契约 |
| `@acongm/ui-theme` | Codex 基础 CSS tokens |
| `@acongm/assistant-ui-theme` | 将 tokens 映射到 assistant-ui CSS 变量 |
| `@acongm/agent-session-sdk` | 与 UI 无关：SSE 流式、client/conversation、历史、摘要 |
| `@acongm/chat-ui` | 基于 `@assistant-ui/react` 的 Drawer / Fullscreen / Thread |

## 数据流

```
DocChatEmbed (portal)
  → DocsChatShell / ChatFullscreen (chat)
    → DocChatRuntimeProvider  (ExternalStoreRuntime)
         ↳ agent-session-sdk.streamChatV1
    → AssistantThread         (ThreadPrimitive + MarkdownTextPrimitive)
```

## chat 仓复用

```ts
import { ChatFullscreen, DocChatRuntimeProvider, AssistantThread } from '@acongm/chat-ui';
import '@acongm/assistant-ui-theme/assistant-ui.css';
import '@acongm/chat-ui/styles.css';
```

或只拿 SDK：

```ts
import { streamChatV1, getClientId } from '@acongm/agent-session-sdk';
```
