'use client';

/**
 * Global error boundary.
 *
 * Also works around a Next.js 16 + Turbopack dev bug: the built-in global-error module fails to
 * resolve in the React Client Manifest, and that uncaught error breaks hydration for the whole
 * app — the form renders in the HTML but is dead in the browser. Defining our own boundary means
 * Next never has to load the built-in one.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '48px 24px',
          color: '#111111',
        }}
      >
        <main style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ fontSize: 22, marginBottom: 10 }}>Something went wrong</h1>
          <p style={{ color: '#666666', marginBottom: 22 }}>
            The proposal generator hit an unexpected error. Your details were not sent anywhere.
          </p>
          <button
            onClick={reset}
            style={{
              font: 'inherit',
              fontWeight: 600,
              padding: '11px 18px',
              border: 0,
              borderRadius: 8,
              background: '#0a0436',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ color: '#999999', fontSize: 12, marginTop: 20 }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
