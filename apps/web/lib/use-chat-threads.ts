'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChatThreadRecord, ChatUiMessage } from '@acongm/kb-types';
import {
  createChatThread,
  deleteChatThread,
  getChatThread,
  listChatThreads,
} from '@acongm/agent-session-sdk';

const THREADS_BASE = '/api/chat/threads';

export type UseChatThreadsOptions = {
  accessToken?: string | null;
  /** 初始选中（来自 /t/[id]） */
  initialThreadId?: string | null;
};

export type SeedStatus = 'idle' | 'loading' | 'ready';

export type UseChatThreadsResult = {
  threads: ChatThreadRecord[];
  activeThreadId: string | null;
  activeThread: ChatThreadRecord | null;
  seedMessages: ChatUiMessage[] | null;
  /** 详情 seed 是否已就绪（避免 /t/id 首屏用 sessionStorage 抢跑） */
  seedStatus: SeedStatus;
  /** 首屏列表加载中 */
  loading: boolean;
  /** 后台刷新中（不禁用「新对话」） */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createThread: (input?: {
    title?: string;
    moduleKey?: string;
    pagePath?: string;
    /** 首条消息中途建会话时保留当前 seed，避免打断流式 */
    preserveSeed?: boolean;
  }) => Promise<ChatThreadRecord>;
  selectThread: (id: string) => Promise<void>;
  removeThread: (id: string) => Promise<void>;
  clearActive: () => void;
};

function mapThreadMessages(raw: unknown[]): ChatUiMessage[] {
  const result: ChatUiMessage[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const role = row.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof row.content === 'string' ? row.content : '';
    if (!content.trim()) continue;
    const message: ChatUiMessage = {
      id: typeof row.id === 'string' ? row.id : `thread-msg-${index}`,
      role,
      content,
    };
    if (typeof row.thinking === 'string' && row.thinking.trim()) {
      message.thinking = row.thinking;
    }
    result.push(message);
  }
  return result;
}

export function useChatThreads(
  options: UseChatThreadsOptions = {},
): UseChatThreadsResult {
  const { accessToken, initialThreadId = null } = options;
  const [threads, setThreads] = useState<ChatThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId,
  );
  const [seedMessages, setSeedMessages] = useState<ChatUiMessage[] | null>(null);
  const [seedStatus, setSeedStatus] = useState<SeedStatus>(
    initialThreadId ? 'loading' : 'idle',
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOpts = {
    baseUrl: THREADS_BASE,
    accessToken: accessToken ?? undefined,
  };

  const refresh = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const list = await listChatThreads(requestOpts);
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
      setThreads(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载会话失败');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setActiveThreadId(initialThreadId);
    if (!initialThreadId) {
      setSeedMessages(null);
      setSeedStatus('idle');
    }
  }, [initialThreadId]);

  const selectThread = useCallback(
    async (id: string) => {
      setActiveThreadId(id);
      setSeedStatus('loading');
      setError(null);
      try {
        const detail = await getChatThread(id, requestOpts);
        setSeedMessages(mapThreadMessages(detail.messages ?? []));
        setThreads((prev) => {
          const exists = prev.some((t) => t.id === id);
          if (exists) {
            return prev.map((t) => (t.id === id ? { ...t, ...detail.thread } : t));
          }
          return [detail.thread, ...prev];
        });
        setSeedStatus('ready');
      } catch (err) {
        setSeedMessages([]);
        setSeedStatus('ready');
        setError(err instanceof Error ? err.message : '加载会话详情失败');
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!initialThreadId) return;
    void selectThread(initialThreadId);
  }, [initialThreadId, selectThread]);

  const createThread = useCallback(
    async (input: {
      title?: string;
      moduleKey?: string;
      pagePath?: string;
      preserveSeed?: boolean;
    } = {}) => {
      const thread = await createChatThread(
        {
          title: input.title,
          moduleKey: input.moduleKey,
          pagePath: input.pagePath,
        },
        requestOpts,
      );
      setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
      setActiveThreadId(thread.id);
      if (!input.preserveSeed) {
        setSeedMessages([]);
        setSeedStatus('ready');
      }
      return thread;
    },
    [accessToken],
  );

  const removeThread = useCallback(
    async (id: string) => {
      await deleteChatThread(id, requestOpts);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(null);
        setSeedMessages(null);
        setSeedStatus('idle');
      }
    },
    [accessToken, activeThreadId],
  );

  const clearActive = useCallback(() => {
    setActiveThreadId(null);
    setSeedMessages(null);
    setSeedStatus('idle');
  }, []);

  const activeThread =
    threads.find((t) => t.id === activeThreadId) ?? null;

  return {
    threads,
    activeThreadId,
    activeThread,
    seedMessages,
    seedStatus,
    loading,
    refreshing,
    error,
    refresh,
    createThread,
    selectThread,
    removeThread,
    clearActive,
  };
}
