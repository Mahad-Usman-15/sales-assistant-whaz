-- Allow invitation.invited_by_id to be NULL.
--
-- Found while writing scripts/bootstrap-admin.ts: the first Admin's invitation has no inviter,
-- because no member exists yet to have issued it. NOT NULL made bootstrap impossible without
-- inventing a synthetic "system" user — a fiction in what FR-029 requires to be a truthful audit
-- trail of who invited whom.
--
-- NULL means "self-bootstrapped" and occurs at most once per organisation. Every invitation created
-- through the dashboard has an inviter by construction, because inviteUser() requires an AdminActor
-- that only requireAdmin() can produce.
--
-- SetNull rather than Restrict, matching app_user.invited_by_id: an inviter's departure must never
-- block a write elsewhere. (In practice app_user rows are never deleted — removal is reversible
-- deactivation — so this branch is close to unreachable.)

ALTER TABLE "invitation" ALTER COLUMN "invited_by_id" DROP NOT NULL;

ALTER TABLE "invitation" DROP CONSTRAINT "invitation_invited_by_id_fkey";

ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "app_user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
