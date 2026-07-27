import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// A stray package-lock.json in the user's home directory makes Next infer the workspace root
// as C:\Users\<user>, which breaks the React Client Manifest (client components then fail to
// hydrate, so the form's submit handler never fires). Pin the root explicitly.
// __dirname is not available in an ESM config, hence import.meta.url.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // @sparticuz/chromium and playwright-core must stay external to the server bundle:
  // they load native binaries at runtime that a bundler cannot trace or inline.
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  // Marking a package external stops it being bundled but does NOT guarantee every file it needs
  // ships with the function: Next traces static requires only, and both packages resolve paths at
  // runtime. The two that were silently dropped and broke production:
  //   - playwright-core/browsers.json, required by lib/coreBundle.js. Missing it throws while the
  //     route module is still loading, so the request 500s before zod ever validates the body.
  //   - @sparticuz/chromium/bin/*.br (~67 MB), decompressed by executablePath() at launch.
  // Both are listed as whole directories rather than individual files, because the runtime lookups
  // are computed and a narrower list just fails again on the next file.
  //
  // Local dev cannot catch this — lib/pdf.ts branches on process.env.VERCEL and uses the `playwright`
  // devDependency instead, so the serverless path only ever executes on Vercel.
  outputFileTracingIncludes: {
    '/api/generate': [
      './node_modules/playwright-core/**',
      './node_modules/@sparticuz/chromium/bin/**',
    ],
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
