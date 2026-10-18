/**
 * Supabase connection. The URL and public key are public by design: what each user may read or
 * change is enforced in the database by Row Level Security (supabase/migrations). Never put the
 * secret / service-role key in the app (the build stops if one is exposed — see build/secretGuard.ts).
 *
 * When the settings are not present, the app runs in local-only mode (no logins, no sync).
 *
 * The sign-in flow stays "implicit" (the library default) on purpose: sign-in links are often opened
 * on a different browser than the one that asked for them (email app → Chrome, while staff use the
 * installed app). The PKCE flow cannot finish in that case; the implicit flow can.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readAuthRedirect } from '../auth/redirect'
import { envReport, projectHost, resolveSupabaseEnv } from './env'

const settings = resolveSupabaseEnv(import.meta.env)

/** What an email link or Google sign-in put in the address. Read before Supabase clears it. */
export const authRedirect = readAuthRedirect(window.location.hash, window.location.search)
// A failed link leaves error details in the address; send the app back to its start page.
if (authRedirect.error) window.history.replaceState(null, '', `${window.location.pathname}#/`)

export const supabase: SupabaseClient | null = settings
  ? createClient(settings.url, settings.key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const cloudEnabled = supabase !== null

/** For Admin → Connection check. Names and host only, never keys. */
export const connection = {
  host: projectHost(settings?.url),
  variables: envReport(import.meta.env),
}
