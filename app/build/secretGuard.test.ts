import { describe, expect, it } from 'vitest'
import { findExposedSecrets } from './secretGuard'

const jwt = (payload: object) => `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.sig`

describe('findExposedSecrets', () => {
  it('allows the public keys', () => {
    expect(findExposedSecrets({
      VITE_SUPABASE_URL: 'https://a.supabase.co',
      VITE_SUPABASE_ANON_KEY: jwt({ role: 'anon' }),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
      MODE: 'production', DEV: false, PROD: true, BASE_URL: '/',
    })).toEqual([])
  })
  it('flags a new-style secret key under any name', () => {
    expect(findExposedSecrets({ VITE_SUPABASE_ANON_KEY: 'sb_secret_abc' })).toEqual(['VITE_SUPABASE_ANON_KEY'])
  })
  it('flags a service_role JWT under any name', () => {
    expect(findExposedSecrets({ VITE_SUPABASE_ANON_KEY: jwt({ role: 'service_role' }) })).toEqual(['VITE_SUPABASE_ANON_KEY'])
  })
  it('flags variable names that mean a secret, whatever the value', () => {
    expect(findExposedSecrets({ NEXT_PUBLIC_SUPABASE_SECRET_KEY: 'x', VITE_SERVICE_ROLE_KEY: 'y' }).sort()).toEqual(['NEXT_PUBLIC_SUPABASE_SECRET_KEY', 'VITE_SERVICE_ROLE_KEY'])
  })
  it('ignores values that are not JWTs', () => {
    expect(findExposedSecrets({ VITE_X: 'a.b.c', VITE_Y: 'plain' })).toEqual([])
  })
})
