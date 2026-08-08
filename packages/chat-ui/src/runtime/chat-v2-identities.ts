export type ChatV2RuntimeMessageIdentity = {
  id: string;
  role: string;
};

export type ChatV2RunIdentity = {
  clientMessageId: string;
  parentMessageId?: string;
  assistantMessageId?: string;
  runId: string;
};

export function resolveChatV2RunIdentity(
  messages: readonly ChatV2RuntimeMessageIdentity[],
  assistantMessageId: string | undefined,
  createRunId: () => string,
): ChatV2RunIdentity | null {
  let userIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      userIndex = index;
      break;
    }
  }
  if (userIndex < 0) return null;

  const currentUser = messages[userIndex]!;
  return {
    clientMessageId: currentUser.id,
    parentMessageId:
      userIndex > 0 ? messages[userIndex - 1]?.id || undefined : undefined,
    assistantMessageId: assistantMessageId || undefined,
    runId: createRunId(),
  };
}
