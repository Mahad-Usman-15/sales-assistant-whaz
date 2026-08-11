-- Fix: the last-Admin backstop trigger fired on EVERY update to app_user, including updates that
-- cannot possibly affect the invariant.
--
-- Two consequences, the second serious:
--
--   1. `last_seen_at` is written on the request path (FR-041). Firing a global existence check
--      there is pointless work.
--
--   2. ⚠️ It broke bootstrapping. Before the first Admin exists there is no active Admin by
--      definition, so ANY update to app_user — including the very first sign-in writing
--      `last_seen_at` — would raise `last_admin` and fail. The invariant is "you may not REMOVE
--      the last Admin", not "an Admin must exist before anyone may do anything", and the
--      unscoped trigger silently asserted the stronger, wrong version.
--
-- Scoping the trigger to updates that actually change `role` or `status` fixes both. DELETE is
-- unconditional because a delete always removes a row that might have been the last Admin.
--
-- The advisory-locked check in server/repo/users.ts remains the real mechanism; this is still only
-- a backstop against direct SQL edits. See history/adr/0003-last-admin-invariant-concurrency-control.md

DROP TRIGGER IF EXISTS app_user_admin_invariant ON public.app_user;

CREATE CONSTRAINT TRIGGER app_user_admin_invariant_update
  AFTER UPDATE ON public.app_user
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.assert_active_admin_exists();

CREATE CONSTRAINT TRIGGER app_user_admin_invariant_delete
  AFTER DELETE ON public.app_user
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_active_admin_exists();

-- The check must also not fire while the organisation is legitimately empty — during bootstrap,
-- and during test teardown. An empty app_user table has no Admin to protect.
CREATE OR REPLACE FUNCTION public.assert_active_admin_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_user) THEN
    RETURN NULL;  -- no members at all: nothing to protect
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_user WHERE role = 'ADMIN' AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'last_admin: at least one active Admin must exist'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;
