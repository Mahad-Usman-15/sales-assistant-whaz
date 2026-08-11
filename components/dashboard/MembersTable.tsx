import { RoleBadge, StatusBadge } from './Badges';
import { MemberActions } from './MemberActions';
import type { Member } from '@/server/repo/users';

/**
 * The members list (FR-009 — Admin only; the page enforces that, this only renders).
 *
 * A Server Component: rows are data. Only the row actions are client islands, so no member data is
 * shipped to the browser beyond what is already on screen.
 *
 * Unpaginated and unsearchable by design — Assumption 13 (single-digit to low-double-digit team).
 * Revisit both if Whaz grows.
 */
export function MembersTable({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Members, with their role, status and join date</caption>
        <thead className="border-b border-border text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">Email</th>
            <th scope="col" className="px-4 py-3 font-normal">Role</th>
            <th scope="col" className="px-4 py-3 font-normal">Status</th>
            <th scope="col" className="px-4 py-3 font-normal">Joined</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0">
              <th scope="row" className="px-4 py-3 font-normal text-foreground">
                {member.email}
                {member.id === currentUserId && <span className="ml-2 text-xs text-muted">(you)</span>}
              </th>
              <td className="px-4 py-3">
                <RoleBadge role={member.role} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={member.status} />
              </td>
              <td className="px-4 py-3 text-muted tabular-nums">
                <time dateTime={member.createdAt.toISOString()}>
                  {member.createdAt.toISOString().slice(0, 10)}
                </time>
              </td>
              <td className="px-4 py-3">
                <MemberActions member={member} isSelf={member.id === currentUserId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
