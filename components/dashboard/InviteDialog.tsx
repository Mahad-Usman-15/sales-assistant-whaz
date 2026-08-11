'use client';

import { useActionState, useState } from 'react';
import { inviteUser, type ActionState } from '@/app/(dashboard)/dashboard/actions';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from './Dialog';
import { FieldError } from '../FieldError';
import { ROLES } from '@/lib/rbac-schema';

const EMPTY: ActionState = {};

/** FR-022: invite by email, choosing Admin or Sales at the time of invitation. */
export function InviteDialog() {
  const [open, setOpen] = useState(false);

  // Close only on success, and do it in the action rather than an effect: an effect that mirrors
  // derived state back into React is the `set-state-in-effect` anti-pattern, and it also renders
  // the open dialog once before closing it. On failure the dialog stays open with the message in
  // place, so the Admin does not lose what they typed.
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await inviteUser(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, EMPTY);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="rounded-control border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-2">
        Invite member
      </DialogTrigger>

      <DialogContent
        title="Invite a member"
        description="They'll get an email with a sign-in link. The role you pick here is the role they get."
      >
        <form action={formAction} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm text-muted">Email address</span>
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              className="rounded-control border border-border bg-surface-1 px-4 py-2 text-foreground"
            />
            <FieldError message={state.fields?.email} />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm text-muted">Role</legend>
            {ROLES.map((role, index) => (
              <label key={role} className="flex items-center gap-2 text-sm">
                <input type="radio" name="role" value={role} defaultChecked={index === ROLES.length - 1} />
                <span>{role === 'ADMIN' ? 'Admin — can manage members' : 'Sales — can generate proposals'}</span>
              </label>
            ))}
            <FieldError message={state.fields?.role} />
          </fieldset>

          <FieldError message={state.fields?._form} />
          {state.message && !state.ok && <p className="text-sm text-muted">{state.message}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <DialogClose className="rounded-control px-4 py-2 text-sm text-muted hover:text-foreground">
              Cancel
            </DialogClose>
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-brand px-4 py-2 text-sm text-background disabled:opacity-60"
            >
              {pending ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
