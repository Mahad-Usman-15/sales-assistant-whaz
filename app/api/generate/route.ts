import { proposalInputSchema, collectFieldErrors } from '@/lib/schema';
import { CATALOG_IDS } from '@/lib/catalog';
import { toViewModel } from '@/lib/view-model';
import { buildProposalHtml } from '@/lib/template';
import { buildFilename } from '@/lib/filename';
import { renderPdf } from '@/lib/pdf';

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
      },
    });
  } catch (error) {
    // Log server-side for debugging; the rep sees a plain retryable message, never a stack trace.
    console.error('[generate] PDF render failed:', error);
    return Response.json(
      {
        error: 'generation_failed',
        message: "We couldn't generate the proposal. Please try again.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
