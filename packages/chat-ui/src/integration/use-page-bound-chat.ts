'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatUiMessage, ChatV2Message } from '@acongm/kb-types';
import {
  ChatStreamError,
  createChatV2,
  getChatV2,
  listChatMessagesV2,
  mapDurableBranchToUiMessages,
  type ChatV2RequestOptions,
} from '@acongm/agent-session-sdk';

const MESSAGE_HISTORY_PAGE_SIZE = 100;

export type UsePageBoundChatOptions = {
  userId?: string | null;
  accessToken?: string | null;
  pagePath: string;
  moduleKey?: string | null;
  /** localStorage key for the per-user/page chat pointer */
  pointerKey: string;
  chatsBaseUrl?: string;
  title?: string;
  chips?: Array<{ title?: string; pagePath?: string; moduleKey?: string }>;
  metadata?: Record<string, unknown>;
};

export type UsePageBoundChatResult = {
  chatId: string | null;
  seedMessages: ChatUiMessage[] | null;
  ready: boolean;
  restoreError: string | null;
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  loadOlderMessages: () => Promise<void>;
  ensureChat: (input?: { title?: string }) => Promise<string>;
  persistPointer: (nextChatId: string) => void;
};

export function usePageBoundChat(
  options: UsePageBoundChatOptions,
): UsePageBoundChatResult {
  const {
    userId,
    accessToken,
    pagePath,
    moduleKey,
    pointerKey,
    chatsBaseUrl = '/api/chats',
    title,
    chips = [],
    metadata,
  } = options;

  const [chatId, setChatId] = useState<string | null>(null);
  const [rawMessages, setRawMessages] = useState<ChatV2Message[]>([]);
  const [seedMessages, setSeedMessages] = useState<ChatUiMessage[] | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const requestOptions = useMemo<ChatV2RequestOptions>(
    () => ({
      baseUrl: chatsBaseUrl,
      accessToken: accessToken || undefined,
    }),
    [accessToken, chatsBaseUrl],
  );

  useEffect(() => {
    let cancelled = false;
    setChatId(null);
    setRawMessages([]);
    setSeedMessages(null);
    setReady(false);
    setRestoreError(null);
    setPrevCursor(null);

    if (!userId || !accessToken) {
      setReady(true);
      return;
    }

    const stored = localStorage.getItem(pointerKey)?.trim();
    if (!stored) {
      setReady(true);
      return;
    }

    void getChatV2(stored, requestOptions)
      .then((detail) => {
        if (cancelled) return;
        if (
          detail.chat.userId !== userId ||
          (detail.chat.pagePath && detail.chat.pagePath !== pagePath)
        ) {
          localStorage.removeItem(pointerKey);
          setSeedMessages(null);
          setReady(true);
          return;
        }
        setChatId(detail.chat.id);
        setRawMessages(detail.messages);
        setSeedMessages(mapDurableBranchToUiMessages(detail.messages));
        setPrevCursor(detail.prevCursor ?? null);
        setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ChatStreamError && error.status === 404) {
          localStorage.removeItem(pointerKey);
          setSeedMessages(null);
          setReady(true);
          return;
        }

        setRestoreError(
          error instanceof Error ? error.message : '会话历史恢复失败，请稍后重试。',
        );
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, accessToken, pagePath, pointerKey, requestOptions]);

  const persistPointer = useCallback(
    (nextChatId: string) => {
      localStorage.setItem(pointerKey, nextChatId);
      setChatId(nextChatId);
    },
    [pointerKey],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || !prevCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await listChatMessagesV2(
        chatId,
        {
          order: 'desc',
          before: prevCursor,
          limit: MESSAGE_HISTORY_PAGE_SIZE,
        },
        requestOptions,
      );
      const nextRaw = [...page.items, ...rawMessages];
      setRawMessages(nextRaw);
      setSeedMessages(mapDurableBranchToUiMessages(nextRaw));
      setPrevCursor(page.prevCursor ?? null);
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, loadingOlder, prevCursor, rawMessages, requestOptions]);

  const ensureChat = useCallback(
    async (input?: { title?: string }) => {
      if (restoreError) {
        throw new Error(`无法恢复已有会话：${restoreError}`);
      }
      if (chatId) return chatId;
      if (!userId || !accessToken) {
        throw new Error('安全会话尚未准备完成，请稍后重试。');
      }

      const primary = chips[0];
      const created = await createChatV2(
        {
          title:
            input?.title?.trim().slice(0, 80) ||
            primary?.title ||
            title ||
            undefined,
          pagePath: primary?.pagePath || pagePath,
          moduleKey: primary?.moduleKey || moduleKey || undefined,
          metadata,
        },
        requestOptions,
      );
      persistPointer(created.id);
      return created.id;
    },
    [
      accessToken,
      chatId,
      chips,
      moduleKey,
      pagePath,
      persistPointer,
      metadata,
      requestOptions,
      restoreError,
      title,
      userId,
    ],
  );

  return {
    chatId,
    seedMessages,
    ready,
    restoreError,
    hasOlderMessages: Boolean(prevCursor),
    loadingOlder,
    loadOlderMessages,
    ensureChat,
    persistPointer,
  };
}
