'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { FieldError } from './FieldError';

/** Messages for the error codes /auth/callback can redirect back with. */
const CALLBACK_ERRORS: Record<string, string> = {
  link_expired: 'That sign-in link has expired or was already used. Request a new one below.',
  no_access:
    'That address does not have access to this tool. Ask an admin to invite you, then try again.',
  exchange_failed: 'We could not complete sign-in. Request a new link below.',
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | undefined>(
    CALLBACK_ERRORS[searchParams.get('error') ?? '']
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setError(undefined);
    setStatus('sending');

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const next = searchParams.get('next');
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        /**
         * ⚠️ `true` is REQUIRED by FR-043, and is not the intuitive choice.
         *
         * `false` looks right given FR-002 ("no self-service registration"), but it makes the
         * provider return an error for an address it does not know — turning this form into a
         * staff enumerator, since "unknown address" and "known address" would respond differently.
         *
         * With `true`, every address gets the identical response below. Creating an auth row grants
         * nothing: the database trigger finds no invitation and records the member INACTIVE, so
         * they are denied when they follow the link (FR-005). Membership is an ACTIVE app_user row,
         * and only an Admin's invitation produces one.
         */
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback${
          next ? `?next=${encodeURIComponent(next)}` : ''
        }`,
      },
    });

    // ⚠️ Deliberately NOT surfacing whether the address is known. A send failure is reported as a
    // send failure; anything else shows the same confirmation regardless of the address (FR-043).
    if (sendError) {
      setStatus('idle');
      setError('We could not send the link just now. Please try again in a moment.');
      return;
    }

    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <section className="card" role="status">
        <h2 className="section__title">Check your email</h2>
        <p>
          If that address has access, a sign-in link is on its way. The link works once and expires
          shortly.
        </p>
        <p className="field__hint">
          Nothing arrived? Check spam, then request another link in a minute.
        </p>
      </section>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="card grid">
        <label className="field field--wide">
          <span className="field__label">Work email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            maxLength={254}
          />
          <FieldError message={error} />
        </label>
      </div>

      <div className="form__actions">
        <button type="submit" className="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}
        </button>
      </div>
    </form>
  );
}
