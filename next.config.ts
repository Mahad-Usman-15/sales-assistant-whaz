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
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
