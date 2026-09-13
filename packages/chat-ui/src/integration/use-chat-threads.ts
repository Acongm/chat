'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatUiMessage, ChatV2Message, ChatV2Record } from '@acongm/kb-types';
import {
  createChatV2,
  deleteChatV2,
  getChatV2,
  listChatMessagesV2,
  listChatsV2,
  mapDurableBranchToUiMessages,
} from '@acongm/agent-session-sdk';

const DEFAULT_CHATS_BASE = '/api/chats';
const CHAT_PAGE_SIZE = 50;
const MESSAGE_HISTORY_PAGE_SIZE = 100;

export type UseChatThreadsOptions = {
  accessToken?: string | null;
  /** Supabase auth.uid() — UI cache isolation only; auth uses access token. */
  identityKey?: string | null;
  /** Initial selection (e.g. from /t/[id]). */
  initialThreadId?: string | null;
  chatsBaseUrl?: string;
  /** Create guest auth on first send instead of page view. */
  prepareAuth?: () => Promise<{ userId: string; accessToken: string } | null>;
};

export type SeedStatus = 'idle' | 'loading' | 'ready';

type ThreadSeedCacheEntry = {
  rawMessages: ChatV2Message[];
  messages: ChatUiMessage[];
  prevCursor: string | null;
  complete: boolean;
};

type IdentitySnapshot = {
  threads: ChatV2Record[];
  nextCursor: string | null;
  seedCache: Map<string, ThreadSeedCacheEntry>;
};

export type UseChatThreadsResult = {
  threads: ChatV2Record[];
  activeThreadId: string | null;
  activeThread: ChatV2Record | null;
  seedMessages: ChatUiMessage[] | null;
  seedStatus: SeedStatus;
  historySyncing: boolean;
  loadingOlder: boolean;
  hasOlderMessages: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /** Sidebar list fetch failures — does not block composer. */
  sidebarError: string | null;
  /** Active thread history failures — shown in composer area. */
  historyError: string | null;
  /** @deprecated Use sidebarError. */
  error: string | null;
  refresh: (options?: { background?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  createThread: (input?: {
    title?: string;
    moduleKey?: string;
    pagePath?: string;
    preserveSeed?: boolean;
  }) => Promise<ChatV2Record>;
  selectThread: (id: string) => Promise<void>;
  removeThread: (id: string) => Promise<void>;
  clearActive: () => void;
  touchThread: (chatId: string) => void;
};

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

function toCacheEntry(
  rawMessages: ChatV2Message[],
  prevCursor: string | null | undefined,
): ThreadSeedCacheEntry {
  const cursor = prevCursor ?? null;
  return {
    rawMessages,
    messages: mapDurableBranchToUiMessages(rawMessages),
    prevCursor: cursor,
    complete: !cursor,
  };
}

export function useChatThreads(
  options: UseChatThreadsOptions = {},
): UseChatThreadsResult {
  const {
    accessToken = null,
    identityKey = null,
    initialThreadId = null,
    chatsBaseUrl = DEFAULT_CHATS_BASE,
    prepareAuth,
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
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const refreshGen = useRef(0);
  const selectGen = useRef(0);
  const previousIdentity = useRef<string | null>(null);
  const threadSeedCache = useRef(new Map<string, ThreadSeedCacheEntry>());
  const identitySnapshots = useRef(new Map<string, IdentitySnapshot>());

  const requestOptions = useMemo(
    () => ({
      baseUrl: chatsBaseUrl,
      accessToken: accessToken || undefined,
    }),
    [accessToken, chatsBaseUrl],
  );

  const activeSeedCache = activeThreadId
    ? threadSeedCache.current.get(activeThreadId)
    : undefined;
  const hasOlderMessages = Boolean(
    activeThreadId && activeSeedCache && !activeSeedCache.complete,
  );

  useEffect(() => {
    if (previousIdentity.current === identityKey) return;

    previousIdentity.current = identityKey;
    refreshGen.current += 1;
    selectGen.current += 1;

    if (!identityKey) {
      threadSeedCache.current = new Map();
      setThreads([]);
      setNextCursor(null);
      setActiveThreadId(initialThreadId);
      setSeedMessages(null);
      setSeedStatus(initialThreadId ? 'loading' : 'idle');
      setHistorySyncing(false);
      setLoadingOlder(false);
      setSidebarError(null);
      setHistoryError(null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    const restored = identitySnapshots.current.get(identityKey);
    if (restored && (restored.threads.length > 0 || restored.seedCache.size > 0)) {
      threadSeedCache.current = restored.seedCache;
      setThreads(restored.threads);
      setNextCursor(restored.nextCursor);
      setActiveThreadId(initialThreadId);
      if (initialThreadId) {
        const cached = restored.seedCache.get(initialThreadId);
        if (cached) {
          setSeedMessages(cached.messages);
          setSeedStatus('ready');
        } else {
          setSeedMessages(null);
          setSeedStatus('loading');
        }
      } else {
        setSeedMessages(null);
        setSeedStatus('idle');
      }
      setHistorySyncing(false);
      setLoadingOlder(false);
      setSidebarError(null);
      setHistoryError(null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    threadSeedCache.current = new Map();
    setThreads([]);
    setNextCursor(null);
    setActiveThreadId(initialThreadId);
    setSeedMessages(null);
    setSeedStatus(initialThreadId ? 'loading' : 'idle');
    setHistorySyncing(false);
    setLoadingOlder(false);
    setSidebarError(null);
    setHistoryError(null);
    setLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
  }, [identityKey, initialThreadId]);

  const refresh = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!accessToken || !identityKey) {
      if (!background) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }
    const gen = ++refreshGen.current;
    if (!background) {
      setSidebarError(null);
      setRefreshing(true);
    }
    try {
      const page = await listChatsV2({ limit: CHAT_PAGE_SIZE }, requestOptions);
      if (gen !== refreshGen.current) return;
      setThreads(page.items);
      setNextCursor(page.nextCursor || null);
      if (background) {
        setSidebarError(null);
      }
    } catch (err) {
      if (gen !== refreshGen.current) return;
      setSidebarError(err instanceof Error ? err.message : '加载会话失败');
    } finally {
      if (gen === refreshGen.current && !background) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [accessToken, identityKey, requestOptions]);

  useEffect(() => {
    if (!accessToken || !identityKey) {
      setLoading(false);
      return;
    }
    const restored = identitySnapshots.current.get(identityKey);
    void refresh({ background: Boolean(restored) });
  }, [accessToken, identityKey, refresh]);

  useEffect(() => {
    setActiveThreadId(initialThreadId);
    if (!initialThreadId) {
      setSeedMessages(null);
      setSeedStatus('idle');
      setHistoryError(null);
    }
  }, [initialThreadId]);

  const loadMore = useCallback(async () => {
    if (!accessToken || !identityKey || !nextCursor || loadingMore) return;
    const gen = refreshGen.current;
    setLoadingMore(true);
    setSidebarError(null);
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
      setSidebarError(err instanceof Error ? err.message : '加载更多会话失败');
    } finally {
      if (gen === refreshGen.current) {
        setLoadingMore(false);
      }
    }
  }, [accessToken, identityKey, loadingMore, nextCursor, requestOptions]);

  const loadOlderMessages = useCallback(async () => {
    if (!accessToken || !identityKey || !activeThreadId || loadingOlder) return;
    const cached = threadSeedCache.current.get(activeThreadId);
    if (!cached || cached.complete || !cached.prevCursor) return;

    setLoadingOlder(true);
    setHistoryError(null);
    try {
      const page = await listChatMessagesV2(
        activeThreadId,
        {
          order: 'desc',
          before: cached.prevCursor,
          limit: MESSAGE_HISTORY_PAGE_SIZE,
        },
        requestOptions,
      );
      const entry = toCacheEntry(
        [...page.items, ...cached.rawMessages],
        page.prevCursor,
      );
      threadSeedCache.current.set(activeThreadId, entry);
      setSeedMessages(entry.messages);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : '加载更早消息失败');
    } finally {
      setLoadingOlder(false);
    }
  }, [accessToken, activeThreadId, identityKey, loadingOlder, requestOptions]);

  const revalidateThread = useCallback(
    async (id: string, gen: number) => {
      if (!accessToken || !identityKey) return;
      try {
        const detail = await getChatV2(id, requestOptions);
        if (gen !== selectGen.current) return;
        const entry = toCacheEntry(detail.messages, detail.prevCursor);
        threadSeedCache.current.set(id, entry);
        if (gen === selectGen.current) {
          setSeedMessages(entry.messages);
        }
        setThreads((prev) => {
          const exists = prev.some((chat) => chat.id === id);
          if (exists) {
            return prev.map((chat) =>
              chat.id === id ? { ...chat, ...detail.chat } : chat,
            );
          }
          return [detail.chat, ...prev];
        });
      } catch {
        // Background revalidate keeps cached transcript on failure.
      }
    },
    [accessToken, identityKey, requestOptions],
  );

  const selectThread = useCallback(
    async (id: string) => {
      if (!accessToken || !identityKey) {
        setHistoryError('正在准备安全会话身份，请稍后重试。');
        setHistorySyncing(false);
        setSeedStatus((status) => (status === 'loading' ? 'idle' : status));
        return;
      }
      const gen = ++selectGen.current;
      setActiveThreadId(id);
      setHistoryError(null);

      const cached = threadSeedCache.current.get(id);
      if (cached) {
        setSeedMessages(cached.messages);
        setSeedStatus('ready');
        setHistorySyncing(false);
        void revalidateThread(id, gen);
        return;
      }

      setSeedStatus('loading');
      setHistorySyncing(true);
      setSeedMessages(null);

      try {
        const detail = await getChatV2(id, requestOptions);
        if (gen !== selectGen.current) return;

        const entry = toCacheEntry(detail.messages, detail.prevCursor);
        threadSeedCache.current.set(id, entry);
        setSeedMessages(entry.messages);
        setSeedStatus('ready');
        setHistorySyncing(false);
        setThreads((prev) => {
          const exists = prev.some((chat) => chat.id === id);
          if (exists) {
            return prev.map((chat) =>
              chat.id === id ? { ...chat, ...detail.chat } : chat,
            );
          }
          return [detail.chat, ...prev];
        });
      } catch (err) {
        if (gen !== selectGen.current) return;
        setHistorySyncing(false);
        setSeedStatus('ready');
        setHistoryError(err instanceof Error ? err.message : '加载会话详情失败');
      }
    },
    [accessToken, identityKey, revalidateThread, requestOptions],
  );

  useEffect(() => {
    if (!initialThreadId) return;
    if (!accessToken || !identityKey) {
      if (prepareAuth) void prepareAuth();
      return;
    }
    void selectThread(initialThreadId);
  }, [accessToken, identityKey, initialThreadId, prepareAuth, selectThread]);

  const createThread = useCallback(
    async (input: {
      title?: string;
      moduleKey?: string;
      pagePath?: string;
      preserveSeed?: boolean;
    } = {}) => {
      let token = accessToken;
      let key = identityKey;
      if ((!token || !key) && prepareAuth) {
        const prepared = await prepareAuth();
        token = prepared?.accessToken ?? token;
        key = prepared?.userId ?? key;
      }
      if (!token || !key) {
        throw new Error('正在准备安全会话身份，请稍后重试。');
      }
      const chat = await createChatV2(
        {
          title: input.title,
          moduleKey: input.moduleKey,
          pagePath: input.pagePath,
        },
        {
          baseUrl: chatsBaseUrl,
          accessToken: token,
        },
      );
      setThreads((prev) => [chat, ...prev.filter((item) => item.id !== chat.id)]);
      setActiveThreadId(chat.id);
      if (!input.preserveSeed) {
        threadSeedCache.current.set(chat.id, toCacheEntry([], null));
        setSeedMessages([]);
        setSeedStatus('ready');
      }
      return chat;
    },
    [accessToken, chatsBaseUrl, identityKey, prepareAuth],
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
        setHistoryError(null);
      }
    },
    [accessToken, activeThreadId, identityKey, requestOptions],
  );

  const clearActive = useCallback(() => {
    selectGen.current += 1;
    setActiveThreadId(null);
    setSeedMessages(null);
    setSeedStatus('idle');
    setHistoryError(null);
  }, []);

  const touchThread = useCallback(
    (chatId: string) => {
      const now = new Date().toISOString();
      setThreads((prev) => {
        const found = prev.find((chat) => chat.id === chatId);
        if (!found) {
          return [
            {
              id: chatId,
              userId: identityKey || '',
              title: '新对话',
              metadata: {},
              createdAt: now,
              updatedAt: now,
            },
            ...prev,
          ];
        }
        return [
          { ...found, updatedAt: now },
          ...prev.filter((chat) => chat.id !== chatId),
        ];
      });
    },
    [identityKey],
  );

  useEffect(() => {
    if (!identityKey) return;
    identitySnapshots.current.set(identityKey, {
      threads,
      nextCursor,
      seedCache: threadSeedCache.current,
    });
  }, [identityKey, nextCursor, threads]);

  const activeThread =
    threads.find((chat) => chat.id === activeThreadId) ?? null;

  return {
    threads,
    activeThreadId,
    activeThread,
    seedMessages,
    seedStatus,
    historySyncing,
    loadingOlder,
    hasOlderMessages,
    loading,
    refreshing,
    loadingMore,
    hasMore: Boolean(nextCursor),
    sidebarError,
    historyError,
    error: sidebarError,
    refresh,
    loadMore,
    loadOlderMessages,
    createThread,
    selectThread,
    removeThread,
    clearActive,
    touchThread,
  };
}
