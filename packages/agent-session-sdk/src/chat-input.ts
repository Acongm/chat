/** Strip leading/trailing spaces and blank lines from composer input. */
export function trimChatInput(value: string): string {
  return String(value ?? '').trim();
}
