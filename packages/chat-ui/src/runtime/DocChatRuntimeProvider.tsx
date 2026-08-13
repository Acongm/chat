'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import type { ChatUiMessage } from '@acongm/kb-types';
import {
  buildSummaryCardContent,
  clearChatHistory,
  loadChatHistory,
  loadSummaryV1,
  saveChatHistory,
} from '@acongm/agent-session-sdk';
import type { DocChatContext } from '../types';
import { createDocChatModelAdapter } from './createDocChatModelAdapter';

function textPartsOf(
  content: ThreadMessageLike['content'],
): { text: string; thinking: string } {
  if (typeof content === 'string') return { text: content, thinking: '' };
  const parts = content ?? [];
  const text = parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'text',
    )
    .map((part) => part.text)
    .join('');
  const thinking = parts
    .filter(
      (part): part is { type: 'reasoning'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'reasoning',
    )
    .map((part) => part.text)
    .join('');
  return { text, thinking };
}

function toThreadMessage(message: ChatUiMessage): ThreadMessageLike {
  // assistant-ui：status 仅允许出现在 assistant 消息上
  const thinking = message.thinking?.trim() || '';
  const text = message.content || '';
  const content = [
    ...(thinking && message.role === 'assistant'
      ? [{ type: 'reasoning' as const, text: thinking }]
      : []),
    ...(text ? [{ type: 'text' as const, text }] : []),
  ];

  const base: ThreadMessageLike = {
    id: message.id,
    role: message.role,
    content: content.length ? content : [{ type: 'text', text: '' }],
    metadata: {
      custom: {
        isSummary: Boolean(message.isSummary),
        isError: Boolean(message.isError),
      },
    },
  };

  if (message.role !== 'assistant') return base;

  return {
    ...base,
    status: message.isError
      ? { type: 'incomplete', reason: 'error', error: message.content }
      : { type: 'complete', reason: 'stop' },
  };
}

function fromThreadLike(messages: readonly ThreadMessageLike[]): ChatUiMessage[] {
  return messages.map((message, index) => {
    const { text, thinking } = textPartsOf(message.content);
    const custom = message.metadata?.custom as
      | { isSummary?: boolean; isError?: boolean }
      | undefined;
    return {
      id: message.id ?? `msg-${index}`,
      role: (message.role === 'assistant' ? 'assistant' : 'user') as
        | 'user'
        | 'assistant',
      content: text,
      ...(thinking ? { thinking } : {}),
      isSummary: Boolean(custom?.isSummary),
      isError: Boolean(custom?.isError),
    };
  });
}

function historyKey(context: DocChatContext): string {
  if (context.runtimeKey?.trim()) return context.runtimeKey.trim();
  return context.threadId ? `thread:${context.threadId}` : context.pagePath;
}

async function bootstrapMessages(
  storageKey: string,
  pagePath: string,
  summariesUrl?: string,
  skipSummary = false,
): Promise<ChatUiMessage[]> {
  let initial: ChatUiMessage[] = [];
  if (typeof sessionStorage !== 'undefined') {
    initial = loadChatHistory(sessionStorage, storageKey);
  }
  if (skipSummary) return initial;
  if (!initial.some((message) => message.isSummary)) {
    try {
      const result = await loadSummaryV1(pagePath, { url: summariesUrl });
      initial = [
        {
          id: `summary-${pagePath}`,
          role: 'assistant',
          content: buildSummaryCardContent(result),
          isSummary: true,
        },
        ...initial,
      ];
    } catch {
      initial = [
        {
          id: `summary-${pagePath}`,
          role: 'assistant',
          content: buildSummaryCardContent(null, { snapshotMissing: true }),
          isSummary: true,
        },
        ...initial,
      ];
    }
  }
  return initial;
}

export type DocChatRuntimeProviderProps = {
  context: DocChatContext;
  active?: boolean;
  /** 覆盖 bootstrap（如从 Threads API 恢复消息） */
  seedMessages?: ChatUiMessage[] | null;
  children: ReactNode;
};

type RuntimeInnerProps = {
  context: DocChatContext;
  initialMessages: readonly ThreadMessageLike[];
  children: ReactNode;
};

/**
 * LocalRuntime 内核：assistant-ui 管消息 / 停止 / 重试；
 * 仅注入薄 ChatModelAdapter + 初始摘要/历史。
 */
function DocChatRuntimeInner({
  context,
  initialMessages,
  children,
}: RuntimeInnerProps) {
  const contextRef = useRef(context);
  contextRef.current = context;

  const adapter = useMemo(
    () => createDocChatModelAdapter(() => contextRef.current),
    [],
  );

  const runtime = useLocalRuntime(adapter, { initialMessages });

  const historySyncKey = useMemo(
    () => initialMessages.map((message) => message.id ?? '').join('\n'),
    [initialMessages],
  );

  useEffect(() => {
    const { isRunning, messages } = runtime.thread.getState();
    if (isRunning) return;
    if (initialMessages.length <= messages.length) return;
    runtime.thread.reset([...initialMessages]);
  }, [historySyncKey, initialMessages, runtime]);

  const persist = useCallback(() => {
    if (typeof sessionStorage === 'undefined') return;
    const messages = runtime.thread.getState().messages;
    const ui = messages.map((message) => {
      const text = message.content
        .filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text',
        )
        .map((part) => part.text)
        .join('');
      const thinking = message.content
        .filter(
          (part): part is { type: 'reasoning'; text: string } =>
            part.type === 'reasoning',
        )
        .map((part) => part.text)
        .join('')
        .trim();
      return {
        id: message.id,
        role: (message.role === 'assistant' ? 'assistant' : 'user') as
          | 'user'
          | 'assistant',
        content: text,
        ...(thinking ? { thinking } : {}),
        isSummary: Boolean(message.metadata?.custom?.isSummary),
        isError: message.status?.type === 'incomplete',
      };
    });
    saveChatHistory(sessionStorage, historyKey(context), ui);
  }, [context, runtime]);

  useEffect(() => {
    return runtime.thread.subscribe(() => {
      const { isRunning } = runtime.thread.getState();
      if (!isRunning) persist();
    });
  }, [runtime, persist]);

  useEffect(() => {
    const onClear = () => {
      runtime.thread.cancelRun();
      const kept = fromThreadLike(initialMessages).filter((m) => m.isSummary);
      if (typeof sessionStorage !== 'undefined') {
        clearChatHistory(sessionStorage, historyKey(context));
      }
      runtime.thread.reset(kept.map(toThreadMessage));
      saveChatHistory(sessionStorage, historyKey(context), kept);
    };
    window.addEventListener('acongm-chat-clear', onClear);
    return () => window.removeEventListener('acongm-chat-clear', onClear);
  }, [context, initialMessages, runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function seedFingerprint(seed: ChatUiMessage[] | null | undefined): string {
  if (seed == null) return 'null';
  return seed
    .map(
      (m) =>
        `${m.id}\0${m.role}\0${m.content}\0${m.thinking ?? ''}\0${m.isSummary ? 1 : 0}`,
    )
    .join('\n');
}

/**
 * ChatV1 SSE（agent-session-sdk）→ assistant-ui LocalRuntime。
 * portal Drawer 与 chat Fullscreen 共用。
 */
export function DocChatRuntimeProvider({
  context,
  active = true,
  seedMessages = null,
  children,
}: DocChatRuntimeProviderProps) {
  const { pagePath, summariesUrl, threadId } = context;
  const storageKey = historyKey(context);
  const [seed, setSeed] = useState<readonly ThreadMessageLike[] | null>(null);
  const seedKey = seedFingerprint(seedMessages);
  const seedMessagesRef = useRef(seedMessages);
  seedMessagesRef.current = seedMessages;
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;
  const prevStorageKeyRef = useRef(storageKey);

  useEffect(() => {
    let cancelled = false;
    if (!active) {
      setSeed(null);
      return;
    }

    // 仅在会话身份变化时卸掉 runtime；seed 引用抖动（如 ?? []）不得清空进行中的流。
    const storageChanged = prevStorageKeyRef.current !== storageKey;
    prevStorageKeyRef.current = storageKey;
    if (storageChanged) {
      setSeed(null);
    }

    const load = async () => {
      const external = seedMessagesRef.current;
      // null = 无外部 seed，从 sessionStorage bootstrap；[] = 明确空会话
      if (external != null) {
        return external;
      }
      // 通用对话 / 已有 thread：可跳过摘要卡
      // threadId 用 ref：ensureThread 提升会话时不应重跑 bootstrap
      const skipSummary =
        Boolean(threadIdRef.current) ||
        pagePath === '/' ||
        context.moduleKey === '_general';
      return bootstrapMessages(storageKey, pagePath, summariesUrl, skipSummary);
    };

    void load().then((messages) => {
      if (cancelled) return;
      if (typeof sessionStorage !== 'undefined') {
        // 空外部 seed 抖动时不要把已有本地历史抹掉
        if (messages.length > 0) {
          saveChatHistory(sessionStorage, storageKey, messages);
        } else {
          const existing = loadChatHistory(sessionStorage, storageKey);
          if (existing.length === 0) {
            saveChatHistory(sessionStorage, storageKey, messages);
          }
        }
      }
      setSeed(messages.map(toThreadMessage));
    });

    return () => {
      cancelled = true;
    };
  }, [active, pagePath, summariesUrl, storageKey, context.moduleKey, seedKey]);

  if (!active || !seed) return null;

  // key：换 thread / 文档重建 LocalRuntime
  return (
    <DocChatRuntimeInner
      key={storageKey}
      context={context}
      initialMessages={seed}
    >
      {children}
    </DocChatRuntimeInner>
  );
}
