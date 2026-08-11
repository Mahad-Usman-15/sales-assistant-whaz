import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Helpers that pasted Tremor Raw components expect.
 *
 * ⚠️ Upstream imports these from `@/lib/utils`. That import is rewritten to this file on paste,
 * because `lib/CLAUDE.md` declares lib/ framework-free and reserved for the render pipeline —
 * creating `lib/utils.ts` would silently break a stated invariant of that directory.
 */
export function cx(...args: ClassValue[]): string {
  return twMerge(clsx(...args));
}

/** Focus ring shared by interactive dashboard controls (FR-044: focus must always be visible). */
export const focusRing = [
  'outline outline-offset-2 outline-0 focus-visible:outline-2',
  'outline-brand',
] as const;

export const focusInput = [
  'focus:ring-2',
  'focus:ring-brand/20',
  'focus:border-brand',
] as const;

export const hasErrorInput = ['ring-2', 'border-error', 'ring-error/20'] as const;
