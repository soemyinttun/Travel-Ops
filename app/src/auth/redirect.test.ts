import { describe, expect, it } from 'vitest'
import { readAuthRedirect } from './redirect'

describe('readAuthRedirect', () => {
  it('turns an expired link into a plain message', () => {
    const r = readAuthRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=')
    expect(r.kind).toBeNull()
    expect(r.error).toMatch(/expired or was already used/)
  })
  it('falls back to Supabase\'s own description for other errors', () => {
    expect(readAuthRedirect('#error=server_error&error_description=Something+broke').error).toBe('Something broke')
  })
  it('recognises invite and password-reset links', () => {
    expect(readAuthRedirect('#access_token=abc&refresh_token=def&type=invite').kind).toBe('invite')
    expect(readAuthRedirect('#access_token=abc&type=recovery').kind).toBe('recovery')
  })
  it('ignores normal app addresses', () => {
    expect(readAuthRedirect('#/bookings')).toEqual({ kind: null, error: null })
    expect(readAuthRedirect('')).toEqual({ kind: null, error: null })
  })
})
