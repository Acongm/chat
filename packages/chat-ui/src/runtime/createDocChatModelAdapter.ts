import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react';
import {
  deriveTagOptions,
  modelHistory,
  resolveCallSource,
  streamChatMessageV2,
  streamChatV1,
} from '@acongm/agent-session-sdk';
import type { ChatUiMessage, ChatV1Context } from '@acongm/kb-types';
import type { DocChatContext } from '../types';

function textFromMessage(message: ThreadMessage | undefined): string {
  if (!message) return '';
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function toUiMessages(messages: readonly ThreadMessage[]): ChatUiMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: textFromMessage(message),
      isSummary: Boolean(message.metadata?.custom?.isSummary),
      isError: message.status?.type === 'incomplete',
    }));
}

function yieldParts(thinking: string, text: string) {
  return {
    content: [
      ...(thinking ? [{ type: 'reasoning' as const, text: thinking }] : []),
      ...(text ? [{ type: 'text' as const, text }] : []),
    ],
  };
}

/** Omit empty optional strings — Nest `@IsOptional` + `@Length` rejects `""`. */
function buildRequestContext(
  scope: ChatV1Context['scope'],
  pagePath: string,
  moduleKey: string | undefined,
  title: string | undefined,
  tags: string[] | undefined,
  content: string | undefined,
): ChatV1Context {
  const context: ChatV1Context = {
    scope,
    pagePath: pagePath || '/',
    moduleKey: moduleKey?.trim() || '_general',
    title: title?.trim() || '通用对话',
    tags: tags ?? [],
  };
  const trimmed = content?.trim();
  if (trimmed) context.content = trimmed;
  return context;
}

function findLastUser(messages: readonly ThreadMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return { index, message: messages[index]! };
    }
  }
  return null;
}

/**
 * assistant-ui LocalRuntime 的 `unstable_parentId` 指向“本次 assistant 的 parent”
 * （通常就是当前 user），而 Chat v2 `parentMessageId` 表示“当前 user 的 parent”。
 * 因此从 active message branch 中取当前 user 前一条消息，而不能直接透传
 * `unstable_parentId`。
 */
function parentOfCurrentUser(
  messages: readonly ThreadMessage[],
  userIndex: number,
): string | undefined {
  if (userIndex <= 0) return undefined;
  return messages[userIndex - 1]?.id || undefined;
}

function createRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('Chat v2 requires crypto.randomUUID() for durable run ids.');
}

/**
 * ChatModelAdapter：
 * - chatId 存在时走 Chat v2 durable API；
 * - portal 等无 durable chat 场景继续走 ChatV1 short stream；
 * - 不从 Chat v2 静默回退到 legacy `/api/chat/threads`。
 */
export function createDocChatModelAdapter(
  getContext: () => DocChatContext,
): ChatModelAdapter {
  return {
    async *run({
      messages,
      abortSignal,
      unstable_assistantMessageId,
    }) {
      const ctx = getContext();
      const {
        pagePath,
        moduleKey,
        title,
        tags = [],
        content,
        streamUrl,
        enableThinking = true,
        maxTokens,
        historyMode = 'short',
        chatsBaseUrl,
        accessToken,
        ensureChat,
        onChatPersisted,
      } = ctx;

      const currentUser = findLastUser(messages);
      const question = textFromMessage(currentUser?.message).trim();
      if (!currentUser || !question) {
        yield { content: [{ type: 'text', text: '' }] };
        return;
      }

      const tagOptions = deriveTagOptions(question);
      const callSource = resolveCallSource(
        tagOptions.scope,
        tagOptions.enableWebSearch,
      );

      const requestContext = buildRequestContext(
        tagOptions.scope,
        pagePath,
        moduleKey,
        title,
        tags,
        content,
      );

      let chatId = ctx.chatId?.trim() || '';
      if (!chatId && ensureChat) {
        chatId = (
          await ensureChat({
            title: question.replace(/\s+/g, ' ').trim().slice(0, 80) || undefined,
          })
        ).trim();
      }

      const events = chatId
        ? await streamChatMessageV2(
            chatId,
            {
              content: question,
              clientMessageId: currentUser.message.id,
              parentMessageId: parentOfCurrentUser(messages, currentUser.index),
              assistantMessageId: unstable_assistantMessageId,
              runId: createRunId(),
              enableWebSearch: tagOptions.enableWebSearch,
              enableThinking,
              maxTokens,
              context: requestContext,
            },
            {
              signal: abortSignal,
              accessToken: accessToken ?? undefined,
              baseUrl: chatsBaseUrl,
            },
          )
        : await streamChatV1(
            {
              messages: modelHistory(toUiMessages(messages)),
              context: requestContext,
              enableWebSearch: tagOptions.enableWebSearch,
              enableThinking,
              maxTokens,
              historyMode,
            },
            { signal: abortSignal, callSource, url: streamUrl },
          );

      let thinking = '';
      let text = '';

      for await (const event of events) {
        if (event.type === 'thinking') {
          thinking += event.content || '';
          yield yieldParts(thinking, text);
        }
        if (event.type === 'delta') {
          text += event.content || '';
          yield yieldParts(thinking, text);
        }
        if (event.type === 'persisted' && 'chatId' in event && event.chatId) {
          onChatPersisted?.(event.chatId);
        }
        if (event.type === 'error') {
          const error = new Error(event.message || '回答失败');
          if ('code' in event && event.code) error.name = event.code;
          throw error;
        }
      }

      if (!text && thinking) {
        yield yieldParts(thinking, '');
      }
    },
  };
}
