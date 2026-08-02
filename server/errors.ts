/**
 * Typed failures for the authorization and admin paths.
 *
 * Each maps to exactly one HTTP status in contracts/auth-and-admin.md. They are distinct classes
 * rather than one error with a code because the call sites branch on them, and because
 * `temporarily_unavailable` being indistinguishable from `generation_failed` is a defect the
 * spec names explicitly (FR-045).
 */

export class UnauthenticatedError extends Error {
  readonly code = 'unauthenticated' as const;
  readonly status = 401 as const;
  constructor(message = 'Sign in to continue.') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  readonly code = 'forbidden' as const;
  readonly status = 403 as const;
  constructor(message = 'You do not have access to this.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * The organisation must always retain one active Admin (FR-033).
 *
 * 409, not 400 and not 500: the request is well-formed and the server is healthy — the current
 * state simply forbids the transition. Raised from inside the advisory-locked transaction in
 * server/repo/users.ts; see history/adr/0003-last-admin-invariant-concurrency-control.md.
 */
export class LastAdminError extends Error {
  readonly code = 'last_admin' as const;
  readonly status = 409 as const;
  constructor(message = 'There must always be at least one active Admin.') {
    super(message);
    this.name = 'LastAdminError';
  }
}

/**
 * The member store could not be reached (FR-045).
 *
 * ⚠️ MUST NOT be collapsed into a generation failure. Reporting an unreachable database as
 * `generation_failed` sends diagnosis into the Chromium pipeline when the cause is a dependency,
 * and destroys the only signal that would say otherwise.
 */
export class StoreUnavailableError extends Error {
  readonly code = 'temporarily_unavailable' as const;
  readonly status = 503 as const;
  readonly retryable = true as const;
  constructor(message = 'Temporarily unavailable. Please try again shortly.') {
    super(message);
    this.name = 'StoreUnavailableError';
  }
}

export type AppError =
  | UnauthenticatedError
  | ForbiddenError
  | LastAdminError
  | StoreUnavailableError;
