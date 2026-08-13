'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatUiMessage, ChatV2Message, ChatV2Record } from '@acongm/kb-types';
import {
  createChatV2,
  deleteChatV2,
  getChatV2,
  listChatMessagesV2,
  listChatsV2,
  selectActiveChatBranch,
} from '@acongm/agent-session-sdk';

const CHATS_BASE = '/api/chats';
const CHAT_PAGE_SIZE = 50;
const MESSAGE_PAGE_SIZE = 100;
const MAX_RESTORED_MESSAGES = 5000;

export type UseChatThreadsOptions = {
  accessToken?: string | null;
  /** Supabase auth.uid()，只用于 UI 缓存隔离；真正鉴权始终使用 access token。 */
  identityKey?: string | null;
  /** 初始选中（来自 /t/[id]） */
  initialThreadId?: string | null;
};

export type SeedStatus = 'idle' | 'loading' | 'ready';

export type UseChatThreadsResult = {
  threads: ChatV2Record[];
  activeThreadId: string | null;
  activeThread: ChatV2Record | null;
  seedMessages: ChatUiMessage[] | null;
  /** 详情 seed 是否已从 server durable history 就绪（首屏即可 ready，后台可继续同步）。 */
  seedStatus: SeedStatus;
  /** 后台仍在拉取更早/更多分页时为 true */
  historySyncing: boolean;
  /** 首屏列表加载中 */
  loading: boolean;
  /** 后台刷新中（不禁用「新对话」） */
  refreshing: boolean;
  /** 侧栏继续分页加载 */
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  createThread: (input?: {
    title?: string;
    moduleKey?: string;
    pagePath?: string;
    /** 首条消息中途建 chat 时保留当前 seed，避免打断流式 */
    preserveSeed?: boolean;
  }) => Promise<ChatV2Record>;
  selectThread: (id: string) => Promise<void>;
  removeThread: (id: string) => Promise<void>;
  clearActive: () => void;
};

function textParts(message: ChatV2Message): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('\n');
}

function reasoningParts(message: ChatV2Message): string {
  return message.parts
    .filter(
      (part): part is { type: 'reasoning'; text: string } =>
        part.type === 'reasoning' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('');
}

function mapDurableBranch(messages: readonly ChatV2Message[]): ChatUiMessage[] {
  const branch = selectActiveChatBranch(messages);
  const result: ChatUiMessage[] = [];

  for (const message of branch) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const content = textParts(message);
    const thinking = reasoningParts(message);
    if (!content.trim() && !thinking.trim()) continue;

    result.push({
      // assistant-ui should keep using its stable client-side id when available.
      // Server UUID remains available in ChatV2Message for parent traversal only.
      id: message.clientMessageId || message.id,
      role: message.role,
      content,
      ...(thinking.trim() ? { thinking } : {}),
    });
  }

  return result;
}

async function loadHistoryProgressive(
  chatId: string,
  accessToken: string,
  onUpdate: (detail: {
    chat: ChatV2Record;
    messages: ChatUiMessage[];
    complete: boolean;
  }) => void,
  isCancelled: () => boolean,
): Promise<void> {
  const requestOptions = { baseUrl: CHATS_BASE, accessToken };
  const detail = await getChatV2(chatId, requestOptions);
  if (isCancelled()) return;

  const allMessages = [...detail.messages];
  let cursor = detail.nextCursor;
  const seenCursors = new Set<string>();

  const emit = (complete: boolean) => {
    if (isCancelled()) return;
    onUpdate({
      chat: detail.chat,
      messages: mapDurableBranch(allMessages),
      complete,
    });
  };

  emit(!cursor);

  while (cursor) {
    if (isCancelled()) return;
    if (allMessages.length >= MAX_RESTORED_MESSAGES) {
      throw new Error(
        `会话历史超过 ${MAX_RESTORED_MESSAGES} 条，当前版本不会静默截断分支历史。`,
      );
    }
    if (seenCursors.has(cursor)) {
      throw new Error('会话历史分页游标重复，已停止恢复以避免错误历史。');
    }
    seenCursors.add(cursor);

    const remaining = MAX_RESTORED_MESSAGES - allMessages.length;
    const page = await listChatMessagesV2(
      chatId,
      { limit: Math.min(MESSAGE_PAGE_SIZE, remaining), after: cursor },
      requestOptions,
    );
    if (isCancelled()) return;
    allMessages.push(...page.items);
    cursor = page.nextCursor;
    emit(!cursor);
  }
}

function mergeUniqueChats(
  current: ChatV2Record[],
  incoming: ChatV2Record[],
): ChatV2Record[] {
  const seen = new Set<string>();
  const result: ChatV2Record[] = [];
  for (const chat of [...current, ...incoming]) {
    if (seen.has(chat.id)) continue;
    seen.add(chat.id);
    result.push(chat);
  }
  return result;
}

export function useChatThreads(
  options: UseChatThreadsOptions = {},
): UseChatThreadsResult {
  const {
    accessToken = null,
    identityKey = null,
    initialThreadId = null,
  } = options;
  const [threads, setThreads] = useState<ChatV2Record[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId,
  );
  const [seedMessages, setSeedMessages] = useState<ChatUiMessage[] | null>(null);
  const [seedStatus, setSeedStatus] = useState<SeedStatus>(
    initialThreadId ? 'loading' : 'idle',
  );
  const [historySyncing, setHistorySyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGen = useRef(0);
  const selectGen = useRef(0);
  const previousIdentity = useRef<string | null>(null);
  const threadSeedCache = useRef(
    new Map<string, { messages: ChatUiMessage[]; complete: boolean }>(),
  );

  const requestOptions = useMemo(
    () => ({
      baseUrl: CHATS_BASE,
      accessToken: accessToken || undefined,
    }),
    [accessToken],
  );

  useEffect(() => {
    if (previousIdentity.current === identityKey) return;
    previousIdentity.current = identityKey;
    refreshGen.current += 1;
    selectGen.current += 1;
    threadSeedCache.current.clear();
    // Never display one Supabase principal's chats under another principal.
    setThreads([]);
    setNextCursor(null);
    setActiveThreadId(initialThreadId);
    setSeedMessages(null);
    setSeedStatus(initialThreadId ? 'loading' : 'idle');
    setHistorySyncing(false);
    setError(null);
    setLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
  }, [identityKey, initialThreadId]);

  const refresh = useCallback(async () => {
    if (!accessToken || !identityKey) return;
    const gen = ++refreshGen.current;
    setError(null);
    setRefreshing(true);
    try {
      const page = await listChatsV2(
        { limit: CHAT_PAGE_SIZE },
        requestOptions,
      );
      if (gen !== refreshGen.current) return;
      setThreads(page.items);
      setNextCursor(page.nextCursor || null);
    } catch (err) {
      if (gen !== refreshGen.current) return;
      setError(err instanceof Error ? err.message : '加载会话失败');
    } finally {
      if (gen === refreshGen.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [accessToken, identityKey, requestOptions]);

  useEffect(() => {
    if (!accessToken || !identityKey) return;
    void refresh();
  }, [accessToken, identityKey, refresh]);

  useEffect(() => {
    setActiveThreadId(initialThreadId);
    if (!initialThreadId) {
      setSeedMessages(null);
      setSeedStatus('idle');
    }
  }, [initialThreadId]);

  const loadMore = useCallback(async () => {
    if (!accessToken || !identityKey || !nextCursor || loadingMore) return;
    // Share the list generation with refresh/identity changes so an older
    // principal/page can never append into a newer principal's sidebar.
    const gen = refreshGen.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await listChatsV2(
        { limit: CHAT_PAGE_SIZE, after: nextCursor },
        requestOptions,
      );
      if (gen !== refreshGen.current) return;
      setThreads((prev) => mergeUniqueChats(prev, page.items));
      setNextCursor(page.nextCursor || null);
    } catch (err) {
      if (gen !== refreshGen.current) return;
      setError(err instanceof Error ? err.message : '加载更多会话失败');
    } finally {
      if (gen === refreshGen.current) {
        setLoadingMore(false);
      }
    }
  }, [accessToken, identityKey, loadingMore, nextCursor, requestOptions]);

  const selectThread = useCallback(
    async (id: string) => {
      if (!accessToken || !identityKey) {
        setError('正在准备安全会话身份，请稍后重试。');
        return;
      }
      const gen = ++selectGen.current;
      setActiveThreadId(id);
      setError(null);

      const cached = threadSeedCache.current.get(id);
      if (cached) {
        setSeedMessages(cached.messages);
        setSeedStatus('ready');
        setHistorySyncing(!cached.complete);
      } else {
        setSeedStatus('loading');
        setHistorySyncing(true);
      }

      try {
        await loadHistoryProgressive(
          id,
          accessToken,
          (detail) => {
            if (gen !== selectGen.current) return;
            setSeedMessages(detail.messages);
            setSeedStatus('ready');
            setHistorySyncing(!detail.complete);
            threadSeedCache.current.set(id, {
              messages: detail.messages,
              complete: detail.complete,
            });
            setThreads((prev) => {
              const exists = prev.some((chat) => chat.id === id);
              if (exists) {
                return prev.map((chat) =>
                  chat.id === id ? { ...chat, ...detail.chat } : chat,
                );
              }
              return [detail.chat, ...prev];
            });
          },
          () => gen !== selectGen.current,
        );
        if (gen !== selectGen.current) return;
        setHistorySyncing(false);
      } catch (err) {
        if (gen !== selectGen.current) return;
        setHistorySyncing(false);
        setSeedStatus('ready');
        setError(err instanceof Error ? err.message : '加载会话详情失败');
      }
    },
    [accessToken, identityKey],
  );

  useEffect(() => {
    if (!initialThreadId || !accessToken || !identityKey) return;
    void selectThread(initialThreadId);
  }, [accessToken, identityKey, initialThreadId, selectThread]);

  const createThread = useCallback(
    async (input: {
      title?: string;
      moduleKey?: string;
      pagePath?: string;
      preserveSeed?: boolean;
    } = {}) => {
      if (!accessToken || !identityKey) {
        throw new Error('正在准备安全会话身份，请稍后重试。');
      }
      const chat = await createChatV2(
        {
          title: input.title,
          moduleKey: input.moduleKey,
          pagePath: input.pagePath,
        },
        requestOptions,
      );
      setThreads((prev) => [chat, ...prev.filter((item) => item.id !== chat.id)]);
      setActiveThreadId(chat.id);
      if (!input.preserveSeed) {
        setSeedMessages([]);
        setSeedStatus('ready');
      }
      return chat;
    },
    [accessToken, identityKey, requestOptions],
  );

  const removeThread = useCallback(
    async (id: string) => {
      if (!accessToken || !identityKey) {
        throw new Error('正在准备安全会话身份，请稍后重试。');
      }
      await deleteChatV2(id, requestOptions);
      threadSeedCache.current.delete(id);
      setThreads((prev) => prev.filter((chat) => chat.id !== id));
      if (activeThreadId === id) {
        selectGen.current += 1;
        setActiveThreadId(null);
        setSeedMessages(null);
        setSeedStatus('idle');
      }
    },
    [accessToken, activeThreadId, identityKey, requestOptions],
  );

  const clearActive = useCallback(() => {
    selectGen.current += 1;
    setActiveThreadId(null);
    setSeedMessages(null);
    setSeedStatus('idle');
  }, []);

  const activeThread =
    threads.find((chat) => chat.id === activeThreadId) ?? null;

  return {
    threads,
    activeThreadId,
    activeThread,
    seedMessages,
    seedStatus,
    historySyncing,
    loading,
    refreshing,
    loadingMore,
    hasMore: Boolean(nextCursor),
    error,
    refresh,
    loadMore,
    createThread,
    selectThread,
    removeThread,
    clearActive,
  };
}
