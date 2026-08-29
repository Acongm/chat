export type AssistantStreamPart =
  | { type: 'reasoning'; text: string }
  | { type: 'text'; text: string };

export function assistantStreamParts(
  thinking: string,
  text: string,
  options: { enableThinking: boolean; streaming: boolean },
): AssistantStreamPart[] {
  const parts: AssistantStreamPart[] = [];
  const showEmptyReasoning =
    options.enableThinking && options.streaming && !thinking && !text;

  if (thinking || showEmptyReasoning) {
    parts.push({ type: 'reasoning', text: thinking });
  }
  if (text) {
    parts.push({ type: 'text', text });
  }
  return parts;
}
