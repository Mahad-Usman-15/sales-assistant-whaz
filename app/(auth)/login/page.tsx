import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

export const metadata = {
  title: 'Sign in · Whaz Proposals',
};

/**
 * The sign-in screen.
 *
 * Deliberately outside the proxy matcher — it must be reachable without a session, or signing in
 * would require already being signed in.
 */
export default function LoginPage() {
  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Sign in</h1>
        <p className="page__subtitle">
          Enter your work email and we&rsquo;ll send you a sign-in link. No password needed.
        </p>
      </header>

      {/* useSearchParams needs a Suspense boundary or the whole route opts out of prerendering. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
