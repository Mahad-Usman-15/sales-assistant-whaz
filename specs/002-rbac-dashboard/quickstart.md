# Quickstart & Verification: RBAC Dashboard

**Feature**: `002-rbac-dashboard` · **Date**: 2026-08-01

Every verification claim must name the environment that produced it (Constitution Workflow Rules).
"Tests pass" is incomplete — *which suite, against which build* is the claim.

---

## Local setup

```bash
npm install
npx playwright install chromium          # first run only
npx prisma migrate deploy                # against DIRECT_URL
node scripts/bootstrap-admin.ts you@whaz.com
npm run build && npm start               # integration tests need a production build
```

### `.env` — required keys (documented in `.env.example`, never committed)

| Key | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` — ⚠️ **never** `NEXT_PUBLIC_`; imported only by `server/auth/admin.ts` |
| `DATABASE_URL` | Supavisor **transaction** pooler `:6543`, `?pgbouncer=true` |
| `DIRECT_URL` | Supavisor **session** pooler `:5432` — ⚠️ **not** `db.<ref>.supabase.co` (IPv6-only; migrations fail `ENETUNREACH` from Vercel) |

⚠️ Prisma 7 no longer auto-loads `.env`. `prisma.config.ts` must load it explicitly or
`prisma migrate` sees no connection string.

### Supabase project settings (not code — R1, R2, R4)

- **Auth → Rate limits**: confirm `otp.period` (per-address cooldown) and `otp.requests_per_hour`.
  **This is where FR-042 is satisfied.** Do not write a throttle.
- **Auth → SMTP**: see below. The built-in sender is **2 emails/hour project-wide** and cannot carry
  passwordless sign-in.

### Email delivery — the credential that is NOT in `.env`

⚠️ **No email credential appears in `.env.example`, and that is not an oversight.** This application
never sends email. `signInWithOtp` (sign-in) and `inviteUserByEmail` (invitations) both make
*Supabase* send it, so the credential belongs to the Supabase project, not to this app. A variable
here would be config nothing reads — which the constitution's Code Quality Standards forbid ("no
'just in case' configuration options").

### Why Gmail SMTP and not an email service

Whaz owns **no domain**. Its only address, throughout the brand material, is `whazpk@gmail.com`.
Every transactional provider — Resend, SendGrid, Postmark, SES, Mailgun — requires **domain**
verification (SPF/DKIM DNS records) before it will send from an address, and nobody here can add DNS
records to `gmail.com`. That rules out the entire category, not just one vendor.

Gmail SMTP sidesteps it: the account authenticates **as itself** rather than proving control of a
domain, so no DNS is involved. Decided 2026-08-02; alternatives (buying a domain, switching to
Google OAuth) were declined explicitly.

### Configuration

**Supabase Dashboard → Project Settings → Authentication → SMTP Settings** (or the Management API
`PATCH /v1/projects/{ref}/config/auth`):

| Supabase field | Value |
|---|---|
| `smtp_host` | `smtp.gmail.com` |
| `smtp_port` | `587` (TLS) |
| `smtp_user` | the Gmail account whose App Password you generated |
| `smtp_pass` | **A Google App Password** — 16 characters, *not* the account password |
| `smtp_admin_email` | **must match `smtp_user`** — see below |
| `smtp_sender_name` | `Whaz Proposals` |

⚠️ **`smtp_admin_email` must be the same account as `smtp_user`.** Gmail will not relay mail for an
arbitrary "From" address: it sends as the authenticated account. Authenticating as one Gmail account
while setting the sender to a different one fails at send time — observed 2026-08-02, where the App
Password belonged to `mahadusmn07@gmail.com` while the sender was set to `whazpk@gmail.com`, and
every send returned a bare 500.

This is a *different* failure from the unverified-domain refusal above, and it looks identical from
the application: Supabase returns 500 with an empty body either way. **Supabase → Logs → Auth Logs**
is the only place that distinguishes them.

To send as a different address later, either generate an App Password on that account and use it as
both `smtp_user` and `smtp_admin_email`, or add the address as a verified "Send mail as" alias in the
authenticating account's Gmail settings (Gmail → Settings → Accounts → *Send mail as*), which
requires clicking a confirmation link delivered to the alias.

**Current state (2026-08-02)**: sending as `mahadusmn07@gmail.com`, verified working. Moving the
sender to a Whaz-owned address is deferred — worth doing **before rollout**, since the address is
visible on every sign-in link the sales team receives and this spec's audience is explicitly
non-technical (see the sender-identity note below).

**Prerequisite — 2-Step Verification must be on.** App Passwords are only offered once 2SV is
enabled on the Google account. Google removed "less secure app" access in May 2025, so a plain
account password is rejected by the SMTP server; an App Password (or OAuth2) is now the only way in.
Generate it at Google Account → Security → 2-Step Verification → App passwords.

**Cost: $0.** Supabase custom SMTP is on the **Free** plan — configuration, not a paid feature
(unlike the session controls in R2). Gmail's free sending allowance is roughly 500 recipients/day,
about 25× this team's need. Principle V holds with no domain purchase.

**Sender identity is better here than with an ESP.** The sales team receives sign-in links from
`whazpk@gmail.com` — the address already printed on the letterhead they send to clients. For a
non-technical audience where adoption is a stated success measure, a login link from a recognised
address is a real advantage; an unfamiliar third-party domain would have read as phishing.

⚠️ **The App Password grants send access to the whole mailbox.** Treat it as a credential: rotate it
if it leaks, and revoke it from the Google account if the tool is retired. Its blast radius is
larger than an ESP API key's, which is the honest cost of this choice.

⚠️ Gmail may throttle abnormal volume. At ~10–20 emails/day this will not bind, but a bulk operation
(inviting the whole team at once, repeatedly) is the shape that would trip it.

**Verify before building the invite UI**, not after: request one real sign-in link and confirm it
arrives. On Supabase's built-in sender the 3rd sign-in of the hour silently vanishes, which presents
as "the tool is broken" with nothing in the app's logs — the app is not in the sending path.
- **API → Exposed schemas**: remove `public`. PostgREST is never used here.
- ⚠️ Session time-box / inactivity timeout are **Pro-only** — not used. The 30-day window is
  enforced by the guard's `lastSeenAt` check (R2).

---

## Deploying to Vercel

⚠️ **`generated/prisma` is gitignored, so it does not exist in a fresh clone.** `npm run build` is
therefore `prisma generate && next build` — without the first half, Vercel builds a tree where
`server/db/client.ts` imports a module that was never generated.

⚠️ **`DIRECT_URL` must be present in Vercel's BUILD environment, not only at runtime.**
`prisma.config.ts` resolves it via `env()`, and `prisma generate` aborts with `PrismaConfigEnvError`
if it is unset — so the build fails before Next.js starts. Set all five variables from
`.env.example` for the Preview and Production environments.

⚠️ **Set them as plain environment variables, not from a `.env` file.** Vercel does not read
`.env.local`; that file is local-only and gitignored.

## Phase gates

Run in order. Each gate is a spec Success Criterion, not a vibe.

### Phase 0 — sustained generation (**SC-009**) — *hard prerequisite*
Deploy to a Vercel preview. Issue **20 sequential** `POST /api/generate` requests against the *same
warm instance*; all must return 200. Then 5 concurrent — no OOM. Confirm `/tmp` does not grow
monotonically across requests.
> If this gate is skipped, the Admin's headline figure plateaus at ~6 per instance while reps report
> 500s. Auth makes it worse, not better.

### Phase 1 — data foundation
`npx prisma migrate deploy` succeeds against the pooler.
`node scripts/bootstrap-admin.ts admin@whaz.com` creates exactly one ACTIVE ADMIN **via the invite
path** (the trigger creates the row, not the script) and **exits 1 on a second run**.
Using only the publishable key, attempt to read all three tables through PostgREST — expect zero rows
or permission denied on each.
Send one invite end-to-end and confirm it arrives via the custom SMTP sender.

### Phase 2 — auth + guard (**SC-005**)
`npm run test:integration` green with `globalSetup` + `storageState`.
Manually: sign in; deactivate that member directly in the database; hit `/api/generate` → **401 on
the very next request**, without waiting for any token to expire.
Set a member's `lastSeenAt` to 31 days ago → refused (FR-041).
Stop the database → `/api/generate` returns **503 `temporarily_unavailable`**, *not* 500
`generation_failed` (FR-045).
⚠️ Confirm `proxy` actually runs on the **first** preview deploy (Turbopack NFT risk, R9).

### Phase 3 — design system (**SC-008**)
`npm run build && npm start`; screenshot `/` and diff against a pre-change capture.
**Pixel-identical is the bar** — this is the brand surface, and Constitution Principle II sets a
numeric standard for it.
Confirm `dashboard.css` emits no utilities for classnames used only in `ProposalForm.tsx` (proves
`source(none)` + `@source` scoping works).

### Phase 4 — last-Admin invariant (**SC-004**)
`tests/integration/db/last-admin.test.ts`: **two separate connections**, overlapping transactions,
exactly one succeeds and one raises `LastAdminError`.
> ⚠️ Without this test the invariant is **asserted, not verified** — the naive `count() > 1`
> implementation passes every single-threaded test that can be written.

Manually: as the sole Admin, attempt self-removal → **409**. Add a second Admin, retry → succeeds and
forces sign-out. Restore a removed former Admin **as Sales** → returns with Sales only (FR-032).

### Phase 5 — metrics (**SC-006**)
Generate 3 proposals as a Sales member. Their tile reads 3 and
`select count(*) from pdf_generation where user_id = …` reads 3. As Admin, the org total matches
`select count(*)`. Force a database error during the `after()` write → the member **still receives
the PDF**, and the discrepancy is logged distinguishably (FR-016).

### Phase 6 — accessibility (**SC-014**) and release
`@axe-core/playwright` reports **zero WCAG 2.2 AA violations** on `/login`, `/dashboard`, and
`/dashboard/members`.
Keyboard-only pass: sign in, invite, change a role, remove and restore access, read both dashboards —
all completable with focus visible at every step, focus trapped in dialogs and returned on close.
Confirm badges carry **text**, not colour alone.

---

## Full suite

```bash
npm run test:unit          # vitest — includes role-enum parity (ROLES ↔ Prisma Role)
npm run test:integration   # playwright, against a production build
npm run check:table-fit
npm run lint
npm run build
```

⚠️ The integration suite runs against `npm run build && npm start`, so it **cannot** evidence
dev-mode behaviour — a hydration bug once passed all 13 tests. When touching client components or
app-router files, load the page in a real browser before declaring it working. `reuseExistingServer`
means it silently tests whatever occupies port 3000; state which build produced the result.

---

## Lockout recovery

Deliberately **manual and outside the application**: a documented SQL `UPDATE` in the Supabase SQL
editor, requiring provider-console credentials. Any break-glass path inside the app *is* the back
door FR-036 exists to prevent; requiring separate credentials is the correct second factor.
Full procedure belongs in `docs/DEVELOPMENT.md` (Phase 6).
