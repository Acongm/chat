import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-compatible className composition.
 *
 * `clsx` handles conditional/object/array inputs while `tailwind-merge`
 * guarantees consumer classes can intentionally override default utilities.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
