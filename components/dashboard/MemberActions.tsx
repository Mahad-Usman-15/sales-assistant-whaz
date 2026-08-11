'use client';

import { useActionState, useState } from 'react';
import { updateMemberAction, type ActionState } from '@/app/(dashboard)/dashboard/actions';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from './Dialog';
import { FieldError } from '../FieldError';
import type { Role, UserStatus } from '@/lib/rbac-schema';

const EMPTY: ActionState = {};

interface Props {
  member: { id: string; email: string; role: Role; status: UserStatus };
  /** True when the Admin is acting on their own row — changes the copy, not the rules (FR-034). */
  isSelf: boolean;
}

/**
 * Row actions: change role, remove access, restore access.
 *
 * All three go through one Server Action and therefore one advisory-locked mutation. There is
 * deliberately no separate "deactivate" path — two paths would mean two places to get the
 * last-Admin check right, and the second gets added later by someone who did not read ADR-0003.
 */
export function MemberActions({ member, isSelf }: Props) {
  const isActive = member.status === 'ACTIVE';
  const nextRole: Role = member.role === 'ADMIN' ? 'SALES' : 'ADMIN';

  return (
    <div className="flex justify-end gap-2">
      <ConfirmAction
        member={member}
        isSelf={isSelf}
        trigger={member.role === 'ADMIN' ? 'Make Sales' : 'Make Admin'}
        title={member.role === 'ADMIN' ? 'Change to Sales?' : 'Change to Admin?'}
        description={
          isSelf && member.role === 'ADMIN'
            ? 'You will lose admin access immediately and cannot undo this yourself — another Admin would have to restore it.'
            : `${member.email} will ${nextRole === 'ADMIN' ? 'be able to manage members' : 'no longer be able to manage members'}.`
        }
        confirmLabel="Change role"
        fields={{ role: nextRole }}
      />

      {isActive ? (
        <ConfirmAction
          member={member}
          isSelf={isSelf}
          trigger="Remove access"
          title="Remove access?"
          description={
            isSelf
              ? 'You will be signed out immediately and cannot undo this yourself — another Admin would have to restore your access.'
              : `${member.email} will be signed out on their next action. Their generated proposals stay counted, and access can be restored later.`
          }
          confirmLabel="Remove access"
          destructive
          fields={{ status: 'INACTIVE' }}
        />
      ) : (
        // FR-032: restore asks for the role explicitly rather than silently reinstating the old
        // one — restore is the only path where a privilege could otherwise appear as a side effect.
        <RestoreAction member={member} />
      )}
    </div>
  );
}

function ConfirmAction({
  member,
  trigger,
  title,
  description,
  confirmLabel,
  fields,
  destructive,
}: Props & {
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  fields: Record<string, string>;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Closed from the action, not an effect — see the note in InviteDialog.
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await updateMemberAction(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, EMPTY);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`rounded-control border border-border px-3 py-1.5 text-xs hover:bg-surface-2 ${
          destructive ? 'text-error' : 'text-foreground'
        }`}
      >
        {/* The row's email is in the accessible name so an icon-free but repeated control is still
            distinguishable out of context (FR-044). */}
        <span className="sr-only">{`${trigger} for ${member.email}`}</span>
        <span aria-hidden="true">{trigger}</span>
      </DialogTrigger>

      <DialogContent title={title} description={description}>
        <form action={formAction}>
          <input type="hidden" name="userId" value={member.id} />
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <FieldError message={state.fields?._form} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose className="rounded-control px-4 py-2 text-sm text-muted hover:text-foreground">
              Cancel
            </DialogClose>
            <button
              type="submit"
              disabled={pending}
              className={`rounded-control px-4 py-2 text-sm disabled:opacity-60 ${
                destructive ? 'bg-error text-background' : 'bg-brand text-background'
              }`}
            >
              {pending ? 'Working…' : confirmLabel}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RestoreAction({ member }: { member: Props['member'] }) {
  const [open, setOpen] = useState(false);

  // Closed from the action, not an effect — see the note in InviteDialog.
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await updateMemberAction(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, EMPTY);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="rounded-control border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface-2">
        <span className="sr-only">{`Restore access for ${member.email}`}</span>
        <span aria-hidden="true">Restore</span>
      </DialogTrigger>

      <DialogContent
        title="Restore access?"
        description={`${member.email} will be able to sign in again, with the proposals they generated still counted.`}
      >
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="userId" value={member.id} />
          <input type="hidden" name="status" value="ACTIVE" />

          <fieldset className="grid gap-2">
            <legend className="text-sm text-muted">Restore with role</legend>
            {(['ADMIN', 'SALES'] as const).map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm">
                {/* Defaulted to the role held at removal, but chosen explicitly every time. */}
                <input type="radio" name="role" value={role} defaultChecked={member.role === role} />
                <span>{role === 'ADMIN' ? 'Admin' : 'Sales'}</span>
              </label>
            ))}
          </fieldset>

          <FieldError message={state.fields?._form} />

          <div className="flex justify-end gap-2">
            <DialogClose className="rounded-control px-4 py-2 text-sm text-muted hover:text-foreground">
              Cancel
            </DialogClose>
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-brand px-4 py-2 text-sm text-background disabled:opacity-60"
            >
              {pending ? 'Working…' : 'Restore access'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
