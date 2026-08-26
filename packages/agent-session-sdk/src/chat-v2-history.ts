import type { ChatV2Message } from '@acongm/kb-types';

function latestPersistedMessage(
  messages: readonly ChatV2Message[],
): ChatV2Message | undefined {
  if (messages.length === 0) return undefined;
  const parentIds = new Set(
    messages
      .map((message) => message.parentMessageId)
      .filter((id): id is string => Boolean(id)),
  );
  const leaves = messages.filter((message) => !parentIds.has(message.id));
  const pool = leaves.length > 0 ? leaves : messages;
  return pool.reduce((latest, message) => {
    if (message.createdAt > latest.createdAt) return message;
    if (message.createdAt === latest.createdAt && message.id > latest.id) {
      return message;
    }
    return latest;
  });
}

/**
 * Backend message pages contain all durable sibling branches. LocalRuntime seed
 * must receive one active linear branch, not a createdAt-flattened transcript.
 * The most recently persisted message is the deterministic active head after a
 * reload; walk its server parent ids back to the root.
 */
export function selectActiveChatBranch(
  messages: readonly ChatV2Message[],
  headMessageId?: string,
): ChatV2Message[] {
  if (messages.length === 0) return [];

  const byId = new Map(messages.map((message) => [message.id, message]));
  const head = headMessageId
    ? byId.get(headMessageId)
    : latestPersistedMessage(messages);
  if (!head) return [];

  const branch: ChatV2Message[] = [];
  const visited = new Set<string>();
  let current: ChatV2Message | undefined = head;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    branch.push(current);
    current = current.parentMessageId
      ? byId.get(current.parentMessageId)
      : undefined;
  }

  return branch.reverse();
}
