/**
 * T005 / SC-009 — the deployed sustained-render check.
 *
 *   node scripts/check-deployed-renders.mjs https://<preview-url>.vercel.app [sequential] [concurrent]
 *
 * This is the ONLY check that can evidence the /tmp fix. `npm run check:render-scale` runs against
 * the local dev Chromium and proves browser reuse, determinism and memory stability — but the leak
 * it guards against is specific to @sparticuz/chromium inflating ~200 MB into a 512 MB /tmp on
 * Lambda, and lib/pdf.ts does not even load that package unless process.env.VERCEL is set.
 *
 * Before the fix, production failed at render ~7 and STAYED failed until the instance was recycled.
 *
 * ⚠️ The claim is "N sequential renders on the SAME WARM INSTANCE". Vercel may route across
 * instances, which would silently invalidate the result — a fresh instance has an empty /tmp and
 * would pass regardless. Instance identity comes from the app's own `x-render-instance` header,
 * NOT from `x-vercel-id`, whose trailing segment is a per-request id and measures nothing.
 *
 * Exit 1 on any non-200, any non-PDF body, or if the sequential phase never hit one instance
 * repeatedly enough to be meaningful.
 */
const [, , baseUrl, seqArg, conArg] = process.argv;

if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error('Usage: node scripts/check-deployed-renders.mjs <deployment-url> [sequential=20] [concurrent=5]');
  process.exit(2);
}

const SEQUENTIAL = Number(seqArg ?? 20);
const CONCURRENT = Number(conArg ?? 5);
const endpoint = new URL('/api/generate', baseUrl).toString();

/**
 * Vercel Deployment Protection guards preview URLs with SSO by default, rejecting unauthenticated
 * requests at the edge — before the function runs. Set a bypass secret to test through it:
 *   Vercel -> Project -> Settings -> Deployment Protection -> Protection Bypass for Automation
 *   VERCEL_AUTOMATION_BYPASS_SECRET=<secret> npm run check:deployed-renders <url>
 */
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = {
  'content-type': 'application/json',
  ...(BYPASS ? { 'x-vercel-protection-bypass': BYPASS, 'x-vercel-set-bypass-cookie': 'true' } : {}),
};

const payload = {
  recipientName: 'Sustained Render Probe',
  recipientRoleLine1: 'Head of Operations',
  recipientRoleLine2: '',
  clientCompany: 'Probe Co',
  proposalDate: '2026-08-02',
  selectedServiceIds: [],
};

/** One request. Never throws — a failure is data, not an exception. */
async function render(label) {
  const started = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const ms = Date.now() - started;
    const type = res.headers.get('content-type') ?? '';
    // ⚠️ NOT x-vercel-id — its trailing segment is a per-REQUEST id, so counting distinct values
    // measures nothing about instances. The app reports its own process identity instead; see
    // renderStatsHeaders() in app/api/generate/route.ts.
    const instance = res.headers.get('x-render-instance') ?? 'unknown';
    const renderCount = res.headers.get('x-render-count') ?? '?';
    const launches = res.headers.get('x-browser-launches') ?? '?';

    let bytes = 0;
    let errorBody = '';
    if (type.includes('application/pdf')) {
      bytes = (await res.arrayBuffer()).byteLength;
    } else {
      errorBody = (await res.text()).slice(0, 160);
    }
    const ok = res.status === 200 && type.includes('application/pdf') && bytes > 1000;
    return { label, ok, status: res.status, ms, bytes, instance, renderCount, launches, errorBody };
  } catch (error) {
    return {
      label, ok: false, status: 0, ms: Date.now() - started, bytes: 0,
      instance: 'n/a', renderCount: '?', launches: '?', errorBody: error.message,
    };
  }
}

const fmt = (r) =>
  `  ${String(r.label).padStart(3)}  ${r.ok ? 'ok ' : 'FAIL'}  ${String(r.status).padEnd(3)}  ` +
  `${String(r.ms).padStart(6)}ms  ${r.bytes ? (r.bytes / 1024).toFixed(0).padStart(4) + 'kb' : '     -'}  ` +
  `inst=${r.instance} n=${String(r.renderCount).padStart(2)} launches=${r.launches}` +
  `${r.errorBody ? '  ' + r.errorBody.slice(0, 90) : ''}`;

console.log(`POST ${endpoint}`);
console.log(`Phase 1: ${SEQUENTIAL} sequential\n`);

const sequential = [];
for (let i = 1; i <= SEQUENTIAL; i++) {
  const r = await render(i);
  sequential.push(r);
  console.log(fmt(r));
}

console.log(`\nPhase 2: ${CONCURRENT} concurrent\n`);
const concurrent = await Promise.all(
  Array.from({ length: CONCURRENT }, (_, i) => render(`c${i + 1}`))
);
concurrent.forEach((r) => console.log(fmt(r)));

// ---- report -------------------------------------------------------------------------------
const all = [...sequential, ...concurrent];
const failures = all.filter((r) => !r.ok);
const seqOk = sequential.filter((r) => r.ok);
const instances = new Map();
for (const r of sequential) instances.set(r.instance, (instances.get(r.instance) ?? 0) + 1);
const busiest = [...instances.values()].sort((a, b) => b - a)[0] ?? 0;

const times = seqOk.map((r) => r.ms).sort((a, b) => a - b);
const median = times.length ? times[Math.floor(times.length / 2)] : 0;

console.log(`\n${'-'.repeat(70)}`);
console.log(`sequential   ${seqOk.length}/${SEQUENTIAL} ok`);
console.log(`concurrent   ${concurrent.filter((r) => r.ok).length}/${CONCURRENT} ok`);
console.log(`first render ${sequential[0]?.ms}ms (cold start + Chromium launch)`);
console.log(`median       ${median}ms`);
console.log(`instances    ${instances.size} distinct served the sequential phase; busiest handled ${busiest}`);

if (failures.length) {
  const firstFail = sequential.findIndex((r) => !r.ok);
  console.log(`\n✗ FAIL: ${failures.length} request(s) failed.`);

  // Classify BEFORE blaming the render path. Every request failing identically from the very first
  // one means the requests never reached the function at all, and pointing at Chromium then sends
  // the reader in exactly the wrong direction.
  const blocked = failures.filter(
    (r) => r.status === 401 || r.status === 403 || /Protected deployment|vercel_auth/.test(r.errorBody)
  );

  if (blocked.length === all.length) {
    console.log('\n  CAUSE: Vercel Deployment Protection — not the application.');
    console.log('  Every request was rejected at the edge, so the function never ran and this says');
    console.log('  NOTHING about /tmp or the render path. Two ways through:');
    console.log('');
    console.log('   1. Bypass token (keeps the deployment protected — preferred):');
    console.log('      Vercel -> Settings -> Deployment Protection -> Protection Bypass for Automation');
    console.log('      then re-run with:');
    console.log('        VERCEL_AUTOMATION_BYPASS_SECRET=<secret> npm run check:deployed-renders <url>');
    console.log('');
    console.log('   2. Turn Vercel Authentication off for Preview deployments.');
    console.log('      ⚠️ That makes the preview URL publicly reachable, and /api/generate has no');
    console.log('         auth of its own until T048 — anyone with the URL could generate PDFs.');
    if (!BYPASS) console.log('\n  (No VERCEL_AUTOMATION_BYPASS_SECRET was set for this run.)');
    process.exit(1);
  }

  const rendered = sequential.filter((r) => r.ok).length;
  if (firstFail >= 0) {
    console.log(`  First sequential failure at render ${firstFail + 1}, after ${rendered} success(es).`);
    if (rendered > 0 && firstFail + 1 <= 10 && failures.every((r) => r.status === 500)) {
      console.log('  ⚠️ Some renders succeeded and then it failed in single digits with 500s —');
      console.log('     that is the signature of the original /tmp exhaustion defect. Confirm the');
      console.log('     deployment includes the browser-reuse fix in lib/pdf.ts, and look for');
      console.log('     ENOSPC in the Vercel runtime logs.');
    }
  }
  process.exit(1);
}

if (busiest < Math.min(SEQUENTIAL, 10)) {
  console.log(`\n⚠️ INCONCLUSIVE: no single instance served more than ${busiest} of the sequential`);
  console.log('   requests, so this run does not demonstrate sustained use on one warm instance.');
  console.log('   Re-run — the first run warms an instance that a second run tends to reuse.');
  process.exit(1);
}

console.log(`\n✓ PASS: ${SEQUENTIAL} sequential renders succeeded, ${busiest} of them on one instance.`);
console.log('  SC-009 satisfied on the deployed build.');
