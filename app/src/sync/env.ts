/**
 * Which Supabase settings the app was built with. Two naming styles are accepted so the app works
 * with variables typed by hand (VITE_…) and with the ones Supabase's Vercel integration adds
 * (NEXT_PUBLIC_…, including its newer "publishable key" name).
 *
 * Only public values are read. The integration also adds SUPABASE_SECRET_KEY etc.; those are never
 * exposed to the app (vite.config.ts only exposes VITE_ and NEXT_PUBLIC_ variables).
 */
export const URL_NAMES = ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const
export const KEY_NAMES = [
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

type Env = Record<string, unknown>
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const firstSet = (env: Env, names: readonly string[]) => names.find((n) => text(env[n]))

export interface SupabaseEnv { url: string; key: string }

/** The URL and public key to use, or null when either is missing (local-only mode). */
export function resolveSupabaseEnv(env: Env): SupabaseEnv | null {
  const urlName = firstSet(env, URL_NAMES)
  const keyName = firstSet(env, KEY_NAMES)
  if (!urlName || !keyName) return null
  return { url: text(env[urlName])!, key: text(env[keyName])! }
}

/** For the Admin "Connection check": which variable names are set. Never includes values. */
export function envReport(env: Env): { name: string; found: boolean }[] {
  return [...URL_NAMES, ...KEY_NAMES].map((name) => ({ name, found: !!text(env[name]) }))
}

/** The address of the Supabase project (host only), for display. */
export function projectHost(url: string | undefined): string | null {
  try { return url ? new URL(url).host : null } catch { return null }
}
