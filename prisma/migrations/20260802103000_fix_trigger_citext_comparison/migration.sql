-- Fix: the invitation lookup in handle_new_auth_user compared case-SENSITIVELY, silently breaking
-- FR-028 ("addresses differing only in letter case are the same person").
--
-- ⚠️ The citext trap, worth understanding because nothing about the schema looks wrong:
--
--     auth.users.email      is VARCHAR   (Supabase owns that table; we cannot change it)
--     public.invitation.email is CITEXT
--
--     citext = citext   ->  case-insensitive   ✅
--     citext = varchar  ->  case-SENSITIVE     ❌  <- what the trigger was doing
--
-- Postgres resolves `citext = varchar` by casting the citext side DOWN to text, so the
-- case-insensitive operator never runs. The column type is correct, the extension is installed in
-- `public`, the search_path is right — and the comparison is still case-sensitive.
--
-- Structural verification cannot catch this: every schema check passes. It was found by inserting
-- an uppercase invitation, signing in with the lowercase address, and observing the user land
-- INACTIVE. Consequence had it shipped: anyone invited as "Name@Company.com" who typed
-- "name@company.com" at sign-in would be silently denied, with an audit row saying they were never
-- invited — and the Admin looking at a PENDING invitation that "did nothing".
--
-- NOTE this does NOT affect application queries. Prisma sends parameters untyped, so Postgres
-- infers the parameter type from the column and the citext operator is used. Verified against this
-- database. Only literals and typed columns (like NEW.email) need the explicit cast.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inv public.invitation%ROWTYPE;
BEGIN
  SELECT * INTO inv
  FROM public.invitation
  WHERE email = NEW.email::citext   -- explicit cast: see the note above
    AND status = 'PENDING'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.app_user (id, email, role, status, invited_by_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(inv.role, 'SALES'::public."Role"),
    CASE WHEN inv.id IS NULL THEN 'INACTIVE'::public."UserStatus"
         ELSE 'ACTIVE'::public."UserStatus" END,
    inv.invited_by_id
  )
  ON CONFLICT (id) DO NOTHING;

  IF inv.id IS NOT NULL THEN
    UPDATE public.invitation
    SET status = 'ACCEPTED', accepted_at = now()
    WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$$;
