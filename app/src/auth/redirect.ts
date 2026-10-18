/**
 * Email links and Google sign-in send the person back to the app with details in the address:
 * after '#' (invite / reset links, and Google sign-in) or after '?' (errors). Supabase signs the user
 * in from a valid link by itself; this reads what kind of link it was (so the app can ask for a new
 * password) and turns errors into plain words.
 */
import { friendlyAuthError } from './errors'

export interface AuthRedirect {
  /** 'invite' or 'recovery' links need the user to choose a password. */
  kind: 'invite' | 'recovery' | 'signup' | 'magiclink' | null
  error: string | null
}

const hasAny = (raw: string, names: string[]) => names.some((n) => new RegExp(`(^|&)${n}=`).test(raw))

export function readAuthRedirect(hash: string, search = ''): AuthRedirect {
  const fromHash = hash.replace(/^#\/?/, '')
  const fromQuery = search.replace(/^\?/, '')
  const params = hasAny(fromHash, ['access_token', 'error', 'error_code'])
    ? new URLSearchParams(fromHash)
    : hasAny(fromQuery, ['error', 'error_code'])
      ? new URLSearchParams(fromQuery)
      : null
  if (!params) return { kind: null, error: null }
  const code = params.get('error_code') ?? params.get('error')
  if (code) {
    const description = params.get('error_description')
    const byDescription = description ? friendlyAuthError(description) : null
    const byCode = friendlyAuthError(code)
    const error =
      byDescription && byDescription !== description ? byDescription : byCode !== code ? byCode : (description ?? 'This sign-in link could not be used.')
    return { kind: null, error }
  }
  const type = params.get('type')
  const kind = type === 'invite' || type === 'recovery' || type === 'signup' || type === 'magiclink' ? type : null
  return { kind, error: null }
}

/** The app's own address (without any '#' part): where emails and Google send the person back to. */
export const appUrl = () => `${window.location.origin}${window.location.pathname}`
