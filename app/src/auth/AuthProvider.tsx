/**
 * Sign-in state and roles. Roles live in the cloud `profiles` table (pending / staff / admin); the
 * database enforces them, the app only uses them to show or hide screens.
 *
 * Local-only mode (no Supabase configured): a single user with full access, no sign-in.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { clearDevice } from '../db'
import { pendingCount } from '../store'
import { requestSync, startSync, stopSync } from '../sync/controller'
import { friendlyAuthError } from './errors'
import { appUrl } from './redirect'
import { authRedirect, supabase } from '../sync/supabase'
import { supabaseRemote } from '../sync/supabaseRemote'

export type Role = 'pending' | 'staff' | 'admin'
interface AuthCtx {
  mode: 'local' | 'cloud'
  /** 'setPassword': opened an invite or password-reset link and must choose a password. */
  status: 'loading' | 'signedOut' | 'setPassword' | 'pending' | 'ready'
  email?: string
  role?: Role
  /** Problem with the email link the app was opened from, in plain words. */
  linkError: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  /** Starts Google sign-in (the browser leaves for Google and comes back). Returns an error message or null. */
  signInWithGoogle: () => Promise<string | null>
  /** Emails a one-time sign-in link. Returns an error message or null. */
  sendMagicLink: (email: string) => Promise<string | null>
  /** Creates an account (it stays 'pending' until an admin approves it). */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  /** Emails a link to choose a new password. Returns an error message or null. */
  sendPasswordReset: (email: string) => Promise<string | null>
  /** Sets the password after an invite or reset link. Returns an error message or null. */
  setPassword: (password: string) => Promise<string | null>
  /** Returns false if the user cancelled. */
  signOut: () => Promise<boolean>
  refreshRole: () => Promise<void>
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx)
export const useAuth = () => useContext(Ctx)

const LAST_USER = 'travelops.lastUser'
const roleKey = (uid: string) => `travelops.role.${uid}`

async function loadRole(uid: string): Promise<Role> {
  const { data, error } = await supabase!.from('profiles').select('role').eq('id', uid).maybeSingle()
  if (!error && data) {
    localStorage.setItem(roleKey(uid), data.role)
    return data.role as Role
  }
  // Offline: use the role remembered from the last successful check.
  return (localStorage.getItem(roleKey(uid)) as Role | null) ?? 'pending'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [role, setRole] = useState<Role>()
  const [needsPassword, setNeedsPassword] = useState(authRedirect.kind === 'invite' || authRedirect.kind === 'recovery')

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  const refreshRole = useCallback(async () => { if (uid) setRole(await loadRole(uid)) }, [uid])
  useEffect(() => { setRole(undefined); void refreshRole() }, [refreshRole])

  // Start syncing once an approved user is signed in. A different user on this device first
  // gets a clean local database, so nobody sees or uploads the previous user's records.
  useEffect(() => {
    if (!supabase || !uid || (role !== 'staff' && role !== 'admin')) return
    let cancelled = false
    void (async () => {
      if (localStorage.getItem(LAST_USER) !== uid) { await clearDevice(); localStorage.setItem(LAST_USER, uid) }
      if (!cancelled) startSync(supabaseRemote(supabase!))
    })()
    return () => { cancelled = true; stopSync() }
  }, [uid, role])

  const value: AuthCtx = supabase
    ? {
        mode: 'cloud',
        status: session === undefined ? 'loading' : !session ? 'signedOut' : needsPassword ? 'setPassword' : !role ? 'loading' : role === 'pending' ? 'pending' : 'ready',
        linkError: authRedirect.error,
        ...(session?.user.email ? { email: session.user.email } : {}),
        ...(role ? { role } : {}),
        async signIn(email, password) {
          const { error } = await supabase!.auth.signInWithPassword({ email, password })
          return error ? friendlyAuthError(error.message) : null
        },
        async signInWithGoogle() {
          const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl() } })
          return error ? friendlyAuthError(error.message) : null
        },
        async sendMagicLink(email) {
          // shouldCreateUser: new people can start an account this way; they stay 'pending' until approved.
          const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: appUrl(), shouldCreateUser: true } })
          return error ? friendlyAuthError(error.message) : null
        },
        async signUp(email, password) {
          const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } })
          if (error) return { error: friendlyAuthError(error.message), needsConfirmation: false }
          // For an address that already has an account Supabase answers with a user that has no identities.
          if (data.user && data.user.identities?.length === 0) return { error: friendlyAuthError('User already registered'), needsConfirmation: false }
          return { error: null, needsConfirmation: !data.session }
        },
        async sendPasswordReset(email) {
          // The link brings the person back to this same app address.
          const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
          return error ? friendlyAuthError(error.message) : null
        },
        async setPassword(password) {
          const { error } = await supabase!.auth.updateUser({ password })
          if (error) return friendlyAuthError(error.message)
          setNeedsPassword(false)
          return null
        },
        async signOut() {
          await requestSync()
          const waiting = await pendingCount()
          if (waiting && !confirm(`${waiting} change(s) on this device are not uploaded yet and will be lost. Sign out anyway?`)) return false
          stopSync()
          await supabase!.auth.signOut()
          await clearDevice()
          localStorage.removeItem(LAST_USER)
          return true
        },
        refreshRole,
      }
    : {
        mode: 'local', status: 'ready', role: 'admin', linkError: null,
        signIn: async () => null, signInWithGoogle: async () => null, sendMagicLink: async () => null,
        signUp: async () => ({ error: null, needsConfirmation: false }), sendPasswordReset: async () => null, setPassword: async () => null, signOut: async () => true, refreshRole: async () => {},
      }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
