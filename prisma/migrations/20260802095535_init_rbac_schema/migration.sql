-- Required by the CITEXT columns below. Prisma emits the column type but never the extension,
-- so without this line the migration fails on a fresh database with `type "citext" does not exist`.
-- citext is what makes FR-028 (addresses differing only in case are the same person) a property of
-- the database rather than a normalisation every call site has to remember.
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES',
    "status" "UserStatus" NOT NULL DEFAULT 'INACTIVE',
    "deactivated_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invited_by_id" UUID,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_generation" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "app_user_role_status_idx" ON "app_user"("role", "status");

-- CreateIndex
CREATE INDEX "invitation_status_expires_at_idx" ON "invitation"("status", "expires_at");

-- CreateIndex
CREATE INDEX "pdf_generation_user_id_created_at_idx" ON "pdf_generation"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_generation" ADD CONSTRAINT "pdf_generation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FR-024: at most one OUTSTANDING invitation per address.
-- A partial unique index, which Prisma's schema language cannot express. This makes the rule a
-- database guarantee rather than a checked condition: two admins inviting the same person at the
-- same instant collide on a unique violation (P2002) instead of both passing a read-then-write
-- check. Terminal states (ACCEPTED/EXPIRED/REVOKED) are excluded, so an address can be re-invited
-- after a previous invitation is resolved.
CREATE UNIQUE INDEX "invitation_email_pending_key"
  ON "invitation" ("email")
  WHERE "status" = 'PENDING';
