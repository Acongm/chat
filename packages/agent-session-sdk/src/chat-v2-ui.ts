import type { ChatUiMessage, ChatV2Message } from '@acongm/kb-types';
import { selectActiveChatBranch } from './chat-v2-history';

export function textParts(message: ChatV2Message): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('\n')
    .trim();
}

export function reasoningParts(message: ChatV2Message): string {
  return message.parts
    .filter(
      (part): part is { type: 'reasoning'; text: string } =>
        part.type === 'reasoning' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('\n')
    .trim();
}

/** Map durable server messages to assistant-ui seed messages (active branch only). */
export function mapDurableBranchToUiMessages(
  messages: readonly ChatV2Message[],
  headMessageId?: string,
): ChatUiMessage[] {
  const branch = selectActiveChatBranch(messages, headMessageId);
  const result: ChatUiMessage[] = [];

  for (const message of branch) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const content = textParts(message);
    const thinking = reasoningParts(message);
    if (!content && !thinking) continue;

    result.push({
      id: message.clientMessageId || message.id,
      role: message.role,
      content,
      ...(thinking ? { thinking } : {}),
    });
  }

  return result;
}
