import { describe, it, expect } from 'vitest';
import {
  inviteInputSchema,
  updateMemberInputSchema,
  revokeInvitationInputSchema,
} from '../../lib/rbac-schema';

const UUID = '018f1a2b-3c4d-7e8f-9012-3456789abcde';

describe('inviteInputSchema', () => {
  it('accepts a valid invite', () => {
    const result = inviteInputSchema.safeParse({ email: 'rep@whaz.com', role: 'SALES' });
    expect(result.success).toBe(true);
  });

  it('normalises case and surrounding whitespace so FR-028 holds before the database sees it', () => {
    const result = inviteInputSchema.safeParse({ email: '  Rep@Whaz.COM  ', role: 'ADMIN' });
    expect(result.success && result.data.email).toBe('rep@whaz.com');
  });

  it('rejects a malformed address', () => {
    expect(inviteInputSchema.safeParse({ email: 'not-an-email', role: 'SALES' }).success).toBe(false);
  });

  it('rejects an empty address', () => {
    expect(inviteInputSchema.safeParse({ email: '   ', role: 'SALES' }).success).toBe(false);
  });

  it('rejects a role outside the closed set', () => {
    expect(inviteInputSchema.safeParse({ email: 'rep@whaz.com', role: 'OWNER' }).success).toBe(false);
  });

  it('rejects a missing role rather than defaulting one', () => {
    // A silently-defaulted role would be a privilege decision made by omission.
    expect(inviteInputSchema.safeParse({ email: 'rep@whaz.com' }).success).toBe(false);
  });
});

describe('updateMemberInputSchema', () => {
  it('accepts a role change alone', () => {
    expect(updateMemberInputSchema.safeParse({ userId: UUID, role: 'ADMIN' }).success).toBe(true);
  });

  it('accepts a status change alone', () => {
    expect(updateMemberInputSchema.safeParse({ userId: UUID, status: 'INACTIVE' }).success).toBe(true);
  });

  it('accepts role and status together, which is how restore-with-role arrives (FR-032)', () => {
    const result = updateMemberInputSchema.safeParse({
      userId: UUID,
      role: 'SALES',
      status: 'ACTIVE',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a request that changes nothing', () => {
    expect(updateMemberInputSchema.safeParse({ userId: UUID }).success).toBe(false);
  });

  it('rejects a non-uuid member id', () => {
    expect(updateMemberInputSchema.safeParse({ userId: 'abc', role: 'ADMIN' }).success).toBe(false);
  });
});

describe('revokeInvitationInputSchema', () => {
  it('requires a uuid', () => {
    expect(revokeInvitationInputSchema.safeParse({ invitationId: UUID }).success).toBe(true);
    expect(revokeInvitationInputSchema.safeParse({ invitationId: '1' }).success).toBe(false);
  });
});
