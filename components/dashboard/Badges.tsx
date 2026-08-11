import { cx } from './utils';
import type { Role, UserStatus } from '@/lib/rbac-schema';

/**
 * ⚠️ FR-044: state is NEVER conveyed by colour alone. Each badge carries its own text — "Admin",
 * "Sales", "Active", "Inactive" — and the colour is decoration on top of a label that already says
 * everything. Removing the text and keeping the hue would fail WCAG 1.4.1 and would be invisible to
 * anyone reading with a screen reader or with a colour-vision deficiency.
 */

const base =
  'inline-flex items-center rounded-control border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

export function RoleBadge({ role }: { role: Role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span
      className={cx(
        base,
        isAdmin ? 'border-brand/40 text-brand' : 'border-border text-muted'
      )}
    >
      {isAdmin ? 'Admin' : 'Sales'}
    </span>
  );
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={cx(
        base,
        isActive ? 'border-success/40 text-success' : 'border-border text-muted'
      )}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
