import { describe, expect, it } from 'vitest'
import { envReport, projectHost, resolveSupabaseEnv } from './env'

describe('resolveSupabaseEnv', () => {
  it('returns null (local-only mode) when anything is missing or blank', () => {
    expect(resolveSupabaseEnv({})).toBeNull()
    expect(resolveSupabaseEnv({ VITE_SUPABASE_URL: 'https://a.supabase.co' })).toBeNull()
    expect(resolveSupabaseEnv({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_ANON_KEY: 'k' })).toBeNull()
  })
  it('reads the hand-typed names', () => {
    expect(resolveSupabaseEnv({ VITE_SUPABASE_URL: 'https://a.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' })).toEqual({ url: 'https://a.supabase.co', key: 'anon' })
  })
  it('reads the names the Vercel integration adds, including the publishable key', () => {
    expect(resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://b.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toEqual({ url: 'https://b.supabase.co', key: 'sb_publishable_x' })
  })
  it('prefers VITE_ names when both styles are set', () => {
    const r = resolveSupabaseEnv({
      VITE_SUPABASE_URL: 'https://mine.supabase.co', NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'mine', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'other',
    })
    expect(r).toEqual({ url: 'https://mine.supabase.co', key: 'mine' })
  })
  it('never picks up secret-key variables', () => {
    expect(resolveSupabaseEnv({ SUPABASE_URL: 'https://a.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_x' })).toBeNull()
  })
})

describe('envReport and projectHost', () => {
  it('lists names only, never values', () => {
    const r = envReport({ VITE_SUPABASE_URL: 'https://a.supabase.co', VITE_SUPABASE_ANON_KEY: 'supersecretvalue' })
    expect(r.find((x) => x.name === 'VITE_SUPABASE_URL')!.found).toBe(true)
    expect(r.find((x) => x.name === 'NEXT_PUBLIC_SUPABASE_URL')!.found).toBe(false)
    expect(JSON.stringify(r)).not.toContain('supersecretvalue')
  })
  it('shows only the host', () => {
    expect(projectHost('https://abcd.supabase.co/rest/v1')).toBe('abcd.supabase.co')
    expect(projectHost('not a url')).toBeNull()
    expect(projectHost(undefined)).toBeNull()
  })
})
