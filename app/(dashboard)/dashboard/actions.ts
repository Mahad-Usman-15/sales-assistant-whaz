'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/server/auth/supabase';

/**
 * ⚠️ Server Actions are public HTTP endpoints with stable, discoverable ids. Anyone can POST to
 * one; being rendered inside a privileged layout authorizes nothing. Every action in this file
 * begins with its own authorization check (constitution Principle VI, FR-008).
 *
 * `signOut` is the exception that proves the rule: it needs no check, because ending a session you
 * do not have is a no-op that grants nothing.
 */

/**
 * Ends the session (FR-007).
 *
 * Invoked from a `<form action>` POST rather than a link: Next.js Server Actions carry CSRF
 * protection by construction, whereas a GET link could be triggered cross-site — letting a third
 * party sign someone out is a real, if minor, nuisance.
 */
export async function signOut(): Promise<never> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}
