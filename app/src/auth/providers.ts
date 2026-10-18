/**
 * Which sign-in options the app offers. Set VITE_AUTH_METHODS in Vercel, for example
 * "password,google,magiclink,signup":
 *   google     — "Continue with Google"
 *   magiclink  — "Email me a sign-in link"
 *   signup     — "Create account" (new accounts wait for admin approval)
 * Email + password is always available, so the admin can never be locked out by a provider that is
 * not set up yet.
 *
 * A method must also be turned on in Supabase (Authentication → Sign In / Providers) to work.
 */
export type AuthMethod = 'password' | 'google' | 'magiclink' | 'signup'
const ORDER: AuthMethod[] = ['password', 'google', 'magiclink', 'signup']

export function parseAuthMethods(raw: unknown): AuthMethod[] {
  const wanted = new Set(typeof raw === 'string' ? raw.toLowerCase().split(/[\s,]+/) : [])
  return ORDER.filter((m) => m === 'password' || wanted.has(m))
}

export const AUTH_METHODS = parseAuthMethods(import.meta.env.VITE_AUTH_METHODS)
