export type ClassValue = string | false | null | undefined;

/** Dependency-free className joiner for lightweight Acongm UI primitives. */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}
