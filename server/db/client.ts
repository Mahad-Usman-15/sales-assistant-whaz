import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * The Prisma singleton.
 *
 * ⚠️ `import 'server-only'` is the first line deliberately. It makes reaching this module from a
 * `'use client'` graph a BUILD failure rather than a runtime surprise, which is what keeps the
 * database driver out of the browser bundle. Convention alone is not enforcement
 * (constitution: Code Quality Standards).
 *
 * ⚠️ This lives in `server/`, not `lib/`. `lib/CLAUDE.md` declares lib/ framework-free and
 * unit-testable without booting Next, Chromium, or a database. Prisma is none of those.
 */

declare global {
  // Reused across hot reloads in dev; without this, every edit leaks a connection pool.
  var __whazPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Expected the Supavisor TRANSACTION pooler (:6543, pgbouncer=true) — see .env.example'
    );
  }

  // max 3, not 1: Supavisor is the real pool, so a small local pool absorbs Fluid Compute's
  // concurrent invocations without multiplying pooler slots across instances. `connection_limit=1`
  // (the common serverless advice) serialises requests behind a single socket for no benefit here.
  const adapter = new PrismaPg({ connectionString, max: 3 });

  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__whazPrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalThis.__whazPrisma = prisma;
