'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cx } from './utils';

/**
 * Modal dialog, on Radix.
 *
 * Radix supplies the parts of FR-044 that are most often missed and most tedious to hand-roll:
 * focus is trapped inside the dialog, returned to the trigger on close, `aria-modal` and the
 * labelling relationships are set, and Escape closes. Building this by hand is exactly how
 * inaccessible dialogs happen.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/70" />
      <DialogPrimitive.Content
        className={cx(
          'fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
          'rounded-card border border-border bg-gray-900 p-6 text-foreground shadow-xl',
          className
        )}
      >
        <DialogPrimitive.Title className="font-display text-lg">{title}</DialogPrimitive.Title>
        {/* Always rendered, even when empty: Radix warns when a dialog has no description, and a
            silent console warning is how the labelling requirement quietly rots. */}
        <DialogPrimitive.Description className={cx('mt-1 text-sm text-muted', !description && 'sr-only')}>
          {description ?? title}
        </DialogPrimitive.Description>
        <div className="mt-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
