-- Supabase-specific wiring that Prisma's schema language cannot express: a cross-schema foreign
-- key into `auth`, a trigger on a table Prisma does not own, and row-level security.
--
-- ⚠️ Hand-written. `prisma migrate dev` will not regenerate any of this — if the schema changes,
-- these statements must be revisited by hand.

-- ---------------------------------------------------------------------------------------------
-- 1. app_user.id IS auth.users.id
-- ---------------------------------------------------------------------------------------------
-- RESTRICT, not CASCADE, and deliberately so: removal in this product is reversible deactivation
-- (FR-032), so the row must survive. An accidental delete of an auth user must fail loudly rather
-- than silently vaporise that member's generation history (FR-021).
ALTER TABLE "app_user"
  ADD CONSTRAINT "app_user_id_auth_users_fkey"
  FOREIGN KEY ("id") REFERENCES auth.users ("id") ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------------------------
-- 2. auth.users -> app_user, carrying the invited role
-- ---------------------------------------------------------------------------------------------
-- ⚠️ The role is read from `invitation`, NEVER from NEW.raw_user_meta_data. Auth metadata is
-- writable by the subject via supabase.auth.updateUser(), so sourcing a role from it would be a
-- privilege-escalation primitive: any user could make themselves an Admin. A server-owned
-- invitation row is the only trusted carrier (constitution Principle VI, FR-010, FR-023).
--
-- SECURITY DEFINER because the trigger runs as the authenticating user, who has no rights on
-- public tables under the RLS lockdown in section 3. search_path is pinned so a malicious object
-- on the caller's search_path cannot be resolved instead of ours.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inv public.invitation%ROWTYPE;
BEGIN
  -- Newest unexpired PENDING invitation for this address. citext makes the comparison
  -- case-insensitive (FR-028). Expiry is enforced here as well as by the sweep, so an expired
  -- invitation grants nothing even before it has been relabelled (FR-026).
  SELECT * INTO inv
  FROM public.invitation
  WHERE email = NEW.email
    AND status = 'PENDING'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- No invitation => INACTIVE, never "no row". Deny by default PLUS an audit trail of who tried
  -- to get in (FR-005). A missing row would be indistinguishable from a bug.
  INSERT INTO public.app_user (id, email, role, status, invited_by_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(inv.role, 'SALES'::public."Role"),
    CASE WHEN inv.id IS NULL THEN 'INACTIVE'::public."UserStatus"
         ELSE 'ACTIVE'::public."UserStatus" END,
    inv.invited_by_id
  )
  -- Idempotent: /auth/callback also reconciles, and a user may pre-date this trigger.
  ON CONFLICT (id) DO NOTHING;

  IF inv.id IS NOT NULL THEN
    UPDATE public.invitation
    SET status = 'ACCEPTED', accepted_at = now()
    WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------------------------
-- 3. Backstop for the last-Admin invariant
-- ---------------------------------------------------------------------------------------------
-- ⚠️ THIS IS A BACKSTOP, NOT THE MECHANISM. Under READ COMMITTED it cannot see another
-- transaction's uncommitted work, so two admins deactivating each other simultaneously both pass
-- it — that is write skew, and it is precisely the failure this feature must not have.
--
-- The real enforcement is pg_advisory_xact_lock in server/repo/users.ts. See
-- history/adr/0003-last-admin-invariant-concurrency-control.md before touching either.
--
-- What this DOES catch: direct SQL edits in the Supabase console that bypass the application
-- entirely. That is worth having, and is the only claim made for it.
CREATE OR REPLACE FUNCTION public.assert_active_admin_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_user WHERE role = 'ADMIN' AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'last_admin: at least one active Admin must exist'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER app_user_admin_invariant
  AFTER UPDATE OR DELETE ON public.app_user
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_active_admin_exists();

-- ---------------------------------------------------------------------------------------------
-- 4. RLS: default-deny, plus REVOKE
-- ---------------------------------------------------------------------------------------------
-- ⚠️ Stated honestly, per constitution Principle VI: this is a blast-radius limiter for a leaked
-- publishable key, NOT the authorization model. Prisma connects as the table owner, and owners
-- bypass RLS entirely. The TypeScript guard in server/auth/guard.ts is the authorization model.
--
-- RLS enabled with ZERO policies means anon/authenticated can read nothing through PostgREST.
ALTER TABLE "app_user"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pdf_generation" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "app_user", "invitation", "pdf_generation" FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Anything created later is denied by default too, rather than depending on someone remembering.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
