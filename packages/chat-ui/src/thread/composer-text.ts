/**
 * Trim leading/trailing whitespace and blank lines from composer input.
 * Matches common chat UX: accidental spaces or empty lines at the edges are dropped on send.
 */
export function normalizeComposerText(value: string): string {
  return value.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').trim();
}
