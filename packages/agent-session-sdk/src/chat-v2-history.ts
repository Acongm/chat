import type { ChatV2Message } from '@acongm/kb-types';

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
    : messages[messages.length - 1];
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
