'use client';

import { useActionState } from 'react';
import { revokeInvitationAction, type ActionState } from '@/app/(dashboard)/dashboard/actions';

const EMPTY: ActionState = {};

/** FR-027. No confirm dialog: revoking is reversible by simply inviting again. */
export function RevokeInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(revokeInvitationAction, EMPTY);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      {state.fields?._form && <span className="text-xs text-error">{state.fields._form}</span>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-control border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface-2 disabled:opacity-60"
      >
        {/* The address is in the accessible name: "Revoke" alone repeats down the list and is
            meaningless out of context (FR-044). */}
        <span className="sr-only">{`Revoke invitation for ${email}`}</span>
        <span aria-hidden="true">{pending ? 'Revoking…' : 'Revoke'}</span>
      </button>
    </form>
  );
}
