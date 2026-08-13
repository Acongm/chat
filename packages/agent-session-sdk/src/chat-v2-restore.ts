import type { ChatUiMessage, ChatV2Message, ChatV2Record } from '@acongm/kb-types';
import {
  getChatV2,
  listChatMessagesV2,
  type ChatV2RequestOptions,
} from './chats';
import { mapDurableBranchToUiMessages } from './chat-v2-ui';

export const DEFAULT_CHAT_RESTORE_PAGE_SIZE = 100;
export const DEFAULT_CHAT_RESTORE_MAX_MESSAGES = 5000;

export type LoadChatV2HistoryOptions = ChatV2RequestOptions & {
  messagePageSize?: number;
  maxMessages?: number;
};

export type ChatV2HistoryDetail = {
  chat: ChatV2Record;
  messages: ChatUiMessage[];
};

export type ChatV2HistoryProgress = ChatV2HistoryDetail & {
  complete: boolean;
};

async function paginateOlderTailMessages(
  chatId: string,
  initialMessages: readonly ChatV2Message[],
  initialPrevCursor: string | null | undefined,
  options: LoadChatV2HistoryOptions,
): Promise<ChatV2Message[]> {
  const messagePageSize =
    options.messagePageSize ?? DEFAULT_CHAT_RESTORE_PAGE_SIZE;
  const maxMessages = options.maxMessages ?? DEFAULT_CHAT_RESTORE_MAX_MESSAGES;
  let allMessages = [...initialMessages];
  let cursor = initialPrevCursor;
  const seenCursors = new Set<string>();

  while (cursor) {
    if (allMessages.length >= maxMessages) {
      throw new Error(
        `会话历史超过 ${maxMessages} 条，当前版本不会静默截断 durable branch。`,
      );
    }
    if (seenCursors.has(cursor)) {
      throw new Error('会话历史分页游标重复，已停止恢复以避免错误历史。');
    }
    seenCursors.add(cursor);

    const remaining = maxMessages - allMessages.length;
    const page = await listChatMessagesV2(
      chatId,
      {
        order: 'desc',
        before: cursor,
        limit: Math.min(messagePageSize, remaining),
      },
      options,
    );
    allMessages = [...page.items, ...allMessages];
    cursor = page.prevCursor;
  }

  return allMessages;
}

/** Load full durable history (tail-first pages, active branch mapped to UI). */
export async function loadChatV2History(
  chatId: string,
  options: LoadChatV2HistoryOptions = {},
): Promise<ChatV2HistoryDetail> {
  const detail = await getChatV2(chatId, options);
  const allMessages = await paginateOlderTailMessages(
    chatId,
    detail.messages,
    detail.prevCursor,
    options,
  );

  return {
    chat: detail.chat,
    messages: mapDurableBranchToUiMessages(allMessages),
  };
}

/**
 * Progressive tail-first restore: emit after the latest page, then prepend older pages.
 */
export async function loadChatV2HistoryProgressive(
  chatId: string,
  onUpdate: (detail: ChatV2HistoryProgress) => void,
  options: LoadChatV2HistoryOptions & { isCancelled?: () => boolean } = {},
): Promise<void> {
  const { isCancelled = () => false, ...requestOptions } = options;
  const detail = await getChatV2(chatId, requestOptions);
  if (isCancelled()) return;

  const messagePageSize =
    requestOptions.messagePageSize ?? DEFAULT_CHAT_RESTORE_PAGE_SIZE;
  const maxMessages =
    requestOptions.maxMessages ?? DEFAULT_CHAT_RESTORE_MAX_MESSAGES;
  let allMessages = [...detail.messages];
  let cursor = detail.prevCursor;
  const seenCursors = new Set<string>();

  const emit = (complete: boolean) => {
    if (isCancelled()) return;
    onUpdate({
      chat: detail.chat,
      messages: mapDurableBranchToUiMessages(allMessages),
      complete,
    });
  };

  emit(!cursor);

  while (cursor) {
    if (isCancelled()) return;
    if (allMessages.length >= maxMessages) {
      throw new Error(
        `会话历史超过 ${maxMessages} 条，当前版本不会静默截断分支历史。`,
      );
    }
    if (seenCursors.has(cursor)) {
      throw new Error('会话历史分页游标重复，已停止恢复以避免错误历史。');
    }
    seenCursors.add(cursor);

    const remaining = maxMessages - allMessages.length;
    const page = await listChatMessagesV2(
      chatId,
      {
        order: 'desc',
        before: cursor,
        limit: Math.min(messagePageSize, remaining),
      },
      requestOptions,
    );
    if (isCancelled()) return;
    allMessages = [...page.items, ...allMessages];
    cursor = page.prevCursor;
    emit(!cursor);
  }
}
