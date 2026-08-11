import { describe, it, expect } from 'vitest';
import { ROLES, USER_STATUSES } from '../../lib/rbac-schema';
import { Role, UserStatus, InvitationStatus } from '../../generated/prisma/enums';

/**
 * lib/rbac-schema.ts deliberately does NOT import the generated Prisma enums — it is imported by
 * client components, and pulling `generated/prisma` into that graph drags the Prisma client into
 * the browser bundle.
 *
 * That leaves two declarations of the same closed set, so this test is what keeps them honest.
 * It runs in Node, where importing Prisma is free, and turns drift into a red test rather than a
 * runtime 500 the first time someone adds a role.
 *
 * Same shape as the CATALOG_IDS membership check in app/api/generate/route.ts: a set-equality
 * assertion at a boundary the type system cannot span.
 */

const setOf = (values: readonly string[]) => new Set(values);

describe('rbac-schema enums match the Prisma schema', () => {
  it('ROLES set-equals the Prisma Role enum', () => {
    expect(setOf(ROLES)).toEqual(setOf(Object.values(Role)));
  });

  it('USER_STATUSES set-equals the Prisma UserStatus enum', () => {
    expect(setOf(USER_STATUSES)).toEqual(setOf(Object.values(UserStatus)));
  });

  it('has exactly two roles — a third needs a spec change, not just an enum value', () => {
    // Guards the assumption behind having no Role->Permission table (ADR-0002, Principle IV).
    expect(ROLES).toHaveLength(2);
  });

  it('models the four invitation states the spec defines', () => {
    expect(setOf(Object.values(InvitationStatus))).toEqual(
      setOf(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'])
    );
  });
});
