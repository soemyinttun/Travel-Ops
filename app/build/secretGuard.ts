/**
 * Build-time safety check. Every variable that vite.config.ts exposes (VITE_*, NEXT_PUBLIC_*) is
 * written into the public website, so it must never hold a Supabase secret key. The build stops
 * if one does, naming the variable (never its value).
 */
import type { Plugin } from 'vite'

const SECRET_NAME = /SERVICE_ROLE|SECRET/i

function jwtRole(value: string): string | null {
  const parts = value.split('.')
  if (parts.length !== 3) return null
  try {
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))
    const role = (JSON.parse(json) as { role?: unknown }).role
    return typeof role === 'string' ? role : null
  } catch {
    return null
  }
}

/** Names of exposed variables that look like secret keys. */
export function findExposedSecrets(env: Record<string, unknown>): string[] {
  return Object.entries(env)
    .filter(([name, value]) => {
      if (SECRET_NAME.test(name)) return true
      if (typeof value !== 'string') return false
      return value.startsWith('sb_secret_') || jwtRole(value) === 'service_role'
    })
    .map(([name]) => name)
}

export function secretGuard(): Plugin {
  return {
    name: 'travelops-secret-guard',
    configResolved(config) {
      const bad = findExposedSecrets(config.env)
      if (bad.length) {
        throw new Error(
          `Build stopped: ${bad.join(', ')} looks like a secret key but would be published in the website. ` +
            'Only the public "anon"/"publishable" key may be used. Remove it from the VITE_ / NEXT_PUBLIC_ variables.',
        )
      }
    },
  }
}
