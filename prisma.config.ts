import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * ⚠️ Loading env here is load-bearing. Prisma 7 no longer reads `.env` automatically, so without
 * it the CLI resolves no connection string and fails with `PrismaConfigEnvError`, which points at
 * the datasource rather than at the missing load.
 *
 * ⚠️ `.env.local` FIRST, and it must be loaded at all. The stock Prisma snippet is
 * `import 'dotenv/config'`, which reads `.env` only — but this is a Next.js app, where secrets
 * conventionally live in `.env.local` (gitignored by the Next template; plain `.env` is not).
 * With the stock import, keys placed in the idiomatic location are invisible to Prisma and the
 * CLI reports a missing variable while the app itself works fine — a confusing split.
 *
 * dotenv does not overwrite already-set variables, so loading `.env.local` before `.env` gives
 * `.env.local` precedence, matching Next.js's own resolution order.
 *
 * ⚠️ `datasource.url` here is the URL the **CLI uses for migrations**, so it must be the
 * SESSION pooler (:5432) — the DIRECT_URL — not the transaction pooler. In Prisma 7 the
 * schema's `datasource` block accepts neither `url` nor `directUrl` (validation error P1012);
 * this file is the only place migration connectivity is configured.
 *
 * The pooled runtime connection (:6543, pgbouncer=true) is a separate concern: it is passed to
 * `new PrismaClient({ adapter })` in server/db/client.ts and never appears here.
 *
 * ⚠️ DIRECT_URL must be Supavisor's session pooler, NOT db.<ref>.supabase.co — that host is
 * IPv6-only on projects created since 2024 and unreachable from Vercel's IPv4 build containers,
 * where it fails with ENETUNREACH.
 */
config({ path: '.env.local' });
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
