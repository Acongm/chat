'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatUiMessage, ChatV2Record } from '@acongm/kb-types';
import {
  createChatV2,
  deleteChatV2,
  listChatsV2,
  loadChatV2HistoryProgressive,
} from '@acongm/agent-session-sdk';

const DEFAULT_CHATS_BASE = '/api/chats';
const CHAT_PAGE_SIZE = 50;

export type UseChatThreadsOptions = {
  accessToken?: string | null;
  /** Supabase auth.uid() — UI cache isolation only; auth uses access token. */
  identityKey?: string | null;
  /** Initial selection (e.g. from /t/[id]). */
  initialThreadId?: string | null;
  chatsBaseUrl?: string;
};

export type SeedStatus = 'idle' | 'loading' | 'ready';

export type UseChatThreadsResult = {
  threads: ChatV2Record[];
  activeThreadId: string | null;
  activeThread: ChatV2Record | null;
  seedMessages: ChatUiMessage[] | null;
  seedStatus: SeedStatus;
  historySyncing: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  createThread: (input?: {
    title?: string;
    moduleKey?: string;
    pagePath?: string;
    preserveSeed?: boolean;
  }) => Promise<ChatV2Record>;
  selectThread: (id: string) => Promise<void>;
  removeThread: (id: string) => Promise<void>;
  clearActive: () => void;
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

export function useChatThreads(
  options: UseChatThreadsOptions = {},
): UseChatThreadsResult {
  const {
    accessToken = null,
    identityKey = null,
    initialThreadId = null,
    chatsBaseUrl = DEFAULT_CHATS_BASE,
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
      baseUrl: chatsBaseUrl,
      accessToken: accessToken || undefined,
    }),
    [accessToken, chatsBaseUrl],
  );

  useEffect(() => {
    if (previousIdentity.current === identityKey) return;
    previousIdentity.current = identityKey;
    refreshGen.current += 1;
    selectGen.current += 1;
    threadSeedCache.current.clear();
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
      const page = await listChatsV2({ limit: CHAT_PAGE_SIZE }, requestOptions);
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
        await loadChatV2HistoryProgressive(
          id,
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
          {
            ...requestOptions,
            isCancelled: () => gen !== selectGen.current,
          },
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
    [accessToken, identityKey, requestOptions],
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
