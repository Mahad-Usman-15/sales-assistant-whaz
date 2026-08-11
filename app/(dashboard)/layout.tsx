import Link from 'next/link';
import { requireUser } from '@/server/auth/guard';
import { signOut } from './dashboard/actions';
import './dashboard.css';

/**
 * Dashboard shell.
 *
 * `requireUser()` here is convenience, not the boundary — each page and action re-checks
 * independently. A layout guard alone would be exactly the "rendered inside a protected layout"
 * reasoning that Principle VI rejects.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="font-display text-base text-foreground">
              Dashboard
            </Link>
            <Link href="/" className="text-muted hover:text-foreground">
              New proposal
            </Link>
            {actor.role === 'ADMIN' && (
              <Link href="/dashboard/members" className="text-muted hover:text-foreground">
                Members
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">{actor.email}</span>
            {/* A form POST, not a link: Server Actions are CSRF-safe by construction (FR-007). */}
            <form action={signOut}>
              <button type="submit" className="text-muted underline hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
