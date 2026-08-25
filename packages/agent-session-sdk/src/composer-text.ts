/** Trim leading/trailing whitespace and blank lines from chat composer text. */
export function normalizeComposerText(value: string): string {
  return value.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').trim();
}
