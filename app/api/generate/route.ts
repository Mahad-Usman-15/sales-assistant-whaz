import { proposalInputSchema, collectFieldErrors } from '@/lib/schema';
import { CATALOG_IDS } from '@/lib/catalog';
import { toViewModel } from '@/lib/view-model';
import { buildProposalHtml } from '@/lib/template';
import { buildFilename } from '@/lib/filename';
import { renderPdf, getRenderStats } from '@/lib/pdf';
import { requireUser } from '@/server/auth/guard';
import { StoreUnavailableError, UnauthenticatedError, ForbiddenError } from '@/server/errors';

// Chromium requires the full Node.js runtime; the Edge runtime cannot run it.
export const runtime = 'nodejs';
// Headroom for a pathological cold start. The acceptance bar is 30s (FR-016); this is not a target.
export const maxDuration = 60;

function methodNotAllowed(): Response {
  return Response.json(
    { error: 'method_not_allowed', message: 'Use POST to generate a proposal.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function POST(request: Request): Promise<Response> {
  // --- Authorize (FR-001) ---
  // First, and before any parsing or rendering: an anonymous caller must not be able to spend a
  // Chromium render, and identity must be established before the metric write that follows a
  // successful one. `proxy.ts` does not match /api, so this is the only gate on this route.
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError || error instanceof ForbiddenError) {
      // Both answer 401, not 403: the client's only useful response to either is "sign in again",
      // and distinguishing "no session" from "your access was withdrawn" would tell an
      // unauthenticated caller whether an address is a member (FR-011).
      return Response.json(
        { error: 'unauthenticated', message: 'Sign in to generate proposals.' },
        { status: 401 }
      );
    }
    if (error instanceof StoreUnavailableError) {
      // ⚠️ 503, and explicitly NOT generation_failed. Reporting an unreachable member store as a
      // render failure sends diagnosis into the Chromium pipeline when the cause is a dependency,
      // and destroys the only signal that would say otherwise (FR-045).
      console.error('[generate] member store unreachable; failing closed');
      return Response.json(
        {
          error: 'temporarily_unavailable',
          message: 'Temporarily unavailable. Please try again shortly.',
          retryable: true,
        },
        { status: 503 }
      );
    }
    throw error;
  }

  // --- Parse ---
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: 'validation_failed',
        message: 'Some details are missing or invalid.',
        fields: { _form: 'Request body must be valid JSON.' },
      },
      { status: 400 }
    );
  }

  // --- Validate (FR-009) ---
  const parsed = proposalInputSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'validation_failed',
        message: 'Some details are missing or invalid.',
        fields: collectFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Unknown service ids are rejected rather than dropped: silently discarding one would
  // produce a proposal the rep did not intend to send (contract case 5).
  const unknownIds = input.selectedServiceIds.filter((id) => !CATALOG_IDS.has(id));
  if (unknownIds.length > 0) {
    return Response.json(
      {
        error: 'validation_failed',
        message: 'Some details are missing or invalid.',
        fields: { selectedServiceIds: `Unknown service: ${unknownIds.join(', ')}.` },
      },
      { status: 400 }
    );
  }

  if (new Set(input.selectedServiceIds).size !== input.selectedServiceIds.length) {
    return Response.json(
      {
        error: 'validation_failed',
        message: 'Some details are missing or invalid.',
        fields: { selectedServiceIds: 'A service was selected more than once.' },
      },
      { status: 400 }
    );
  }

  // --- Render (FR-010: never emit a partial document on failure) ---
  try {
    const html = buildProposalHtml(toViewModel(input));
    const pdf = await renderPdf(html, input.proposalDate);
    const filename = buildFilename(input.clientCompany, input.proposalDate);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.byteLength),
        'Cache-Control': 'no-store',
        ...renderStatsHeaders(),
      },
    });
  } catch (error) {
    // Log server-side for debugging; the rep sees a plain retryable message, never a stack trace.
    // The instance id is logged too, so a log line can be tied to the request that produced it.
    console.error(`[generate] PDF render failed on instance ${getRenderStats().instanceId}:`, error);
    return Response.json(
      {
        error: 'generation_failed',
        message: "We couldn't generate the proposal. Please try again.",
        retryable: true,
      },
      { status: 500, headers: renderStatsHeaders() }
    );
  }
}

/**
 * Diagnostic headers identifying which process served the request and how much work it had already
 * done. Present on BOTH the success and failure paths — the failure path is where they matter,
 * since "this instance had already rendered N times" is exactly what distinguishes resource
 * exhaustion from a cold-start problem, and that is unknowable from outside otherwise.
 *
 * Carries no user or proposal data, and does not affect the PDF bytes (FR-013).
 */
function renderStatsHeaders(): Record<string, string> {
  const stats = getRenderStats();
  return {
    'x-render-instance': stats.instanceId,
    'x-render-count': String(stats.rendersServed),
    'x-browser-launches': String(stats.browserLaunches),
  };
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
