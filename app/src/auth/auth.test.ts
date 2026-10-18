import { describe, expect, it } from 'vitest'
import { friendlyAuthError } from './errors'
import { parseAuthMethods } from './providers'
import { readAuthRedirect } from './redirect'

describe('friendlyAuthError', () => {
  it.each([
    ['Invalid login credentials', /Wrong email or password/],
    ['Email not confirmed', /confirm your email/],
    ['User already registered', /already has an account/],
    ['Unsupported provider: provider is not enabled', /isn't turned on yet/],
    ['Signups not allowed for this instance', /New accounts are closed/],
    ['email rate limit exceeded', /Too many emails/],
    ['For security purposes, you can only request this after 32 seconds', /Too many emails/],
    ['Password should be at least 6 characters', /at least 8 characters/],
    ['Failed to fetch', /No internet/],
    ['Email link is invalid or has expired', /expired or was already used/],
  ])('"%s"', (message, expected) => expect(friendlyAuthError(message)).toMatch(expected))
  it('passes unknown messages through and handles empty ones', () => {
    expect(friendlyAuthError('Something odd')).toBe('Something odd')
    expect(friendlyAuthError('')).toMatch(/went wrong/)
    expect(friendlyAuthError(null)).toMatch(/went wrong/)
  })
})

describe('parseAuthMethods', () => {
  it('always keeps password and defaults to password only', () => {
    expect(parseAuthMethods(undefined)).toEqual(['password'])
    expect(parseAuthMethods('')).toEqual(['password'])
    expect(parseAuthMethods('google')).toEqual(['password', 'google'])
  })
  it('reads a list in any order, spacing and case, in a fixed order', () => {
    expect(parseAuthMethods('SignUp, MagicLink, google ,password')).toEqual(['password', 'google', 'magiclink', 'signup'])
  })
  it('ignores methods that do not exist', () => {
    expect(parseAuthMethods('facebook,github,phone')).toEqual(['password'])
  })
})

describe('readAuthRedirect (query and hash)', () => {
  it('reads errors from the query string too', () => {
    const r = readAuthRedirect('', '?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    expect(r.error).toMatch(/expired or was already used/)
  })
  it('explains a cancelled Google sign-in', () => {
    const r = readAuthRedirect('#error=access_denied&error_description=The+user+denied+access')
    expect(r.error).toMatch(/did not finish/)
  })
  it('explains closed sign-ups', () => {
    expect(readAuthRedirect('#error=server_error&error_code=signup_disabled&error_description=Signups+not+allowed').error).toMatch(/New accounts are closed/)
  })
  it('does not treat Google tokens as an invite', () => {
    expect(readAuthRedirect('#access_token=abc&refresh_token=def&provider_token=ghi&token_type=bearer')).toEqual({ kind: null, error: null })
  })
  it('still recognises invite links', () => {
    expect(readAuthRedirect('#access_token=abc&type=invite').kind).toBe('invite')
  })
})
