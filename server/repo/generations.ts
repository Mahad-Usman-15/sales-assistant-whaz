import 'server-only';
import { prisma } from '../db/client';
import type { Actor, AdminActor } from '../auth/guard';

/**
 * Usage records — one row per successfully delivered proposal (FR-014).
 *
 * ⚠️ The two count functions take DIFFERENT actor types, and that is the whole enforcement of
 * FR-009. `countOwnGenerations` takes any `Actor`; `countOrgGenerations` takes `AdminActor`, which
 * only `requireAdmin()` can produce. A Sales member's dashboard therefore *cannot* call the
 * org-wide count — it is a compile error, not a runtime check someone might forget.
 */

/** FR-018. Scoped to the actor's own id, never a caller-supplied one. */
export async function countOwnGenerations(actor: Actor): Promise<number> {
  return prisma.pdfGeneration.count({ where: { userId: actor.id } });
}

/**
 * FR-019, FR-021. All-time and unfiltered (Assumption 4), and deliberately NOT filtered by member
 * status: a removed member's proposals were still produced, so removing someone must not silently
 * reduce the organisation's historical total.
 */
export async function countOrgGenerations(_actor: AdminActor): Promise<number> {
  return prisma.pdfGeneration.count();
}

/**
 * Records one delivered proposal.
 *
 * ⚠️ Called from `after()` in the generate route, so it runs AFTER the response has been sent.
 * It must therefore never throw into the request: FR-016 says a failed metric write must not void
 * a delivered PDF. The counter is an operational metric, not billing — under-reporting by one is
 * strictly better than denying a rep a correctly rendered proposal mid-sales-call.
 */
export async function recordGeneration(actor: Actor): Promise<void> {
  try {
    await prisma.pdfGeneration.create({ data: { userId: actor.id } });
  } catch (error) {
    // Distinct code so the discrepancy is greppable when a count disagrees with reality.
    console.error('[generations] metric_write_failed — PDF was delivered, count under-reports:', error);
  }
}
