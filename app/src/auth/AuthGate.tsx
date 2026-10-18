import { useState, type FormEvent, type ReactNode } from 'react'
import { Loading, btn, btnGhost, inp } from '../components/ui'
import { Logo } from '../components/Icon'
import { useAuth } from './AuthProvider'
import { AUTH_METHODS, type AuthMethod } from './providers'

/** Shows the sign-in or "waiting for approval" screen until the user may use the app. */
export function AuthGate({ children, methods = AUTH_METHODS }: { children: ReactNode; methods?: AuthMethod[] }) {
  const auth = useAuth()
  if (auth.status === 'loading') return <Loading />
  if (auth.status === 'signedOut') return <SignIn methods={methods} />
  if (auth.status === 'setPassword') return <ChoosePassword />
  if (auth.status === 'pending') return <Pending />
  return <>{children}</>
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Logo className="text-lg" />
        {children}
      </div>
    </div>
  )
}

const linkBtn = 'text-teal-700 underline'
type Mode = 'password' | 'link' | 'create' | 'forgot'

function SignIn({ methods }: { methods: AuthMethod[] }) {
  const { signIn, signInWithGoogle, sendMagicLink, signUp, linkError } = useAuth()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = (m: Mode) => { setMode(m); setError(null); setNotice(null) }
  const needOnline = () => { if (navigator.onLine) return false; setError('You need internet to sign in.'); return true }
  const run = async (task: () => Promise<void>) => {
    if (needOnline()) return
    setBusy(true); setError(null); setNotice(null)
    try { await task() } finally { setBusy(false) }
  }

  const submitPassword = (e: FormEvent) => { e.preventDefault(); void run(async () => setError(await signIn(email.trim(), password))) }
  const submitLink = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const err = await sendMagicLink(email.trim())
      if (err) setError(err)
      else setNotice(`We sent a sign-in link to ${email.trim()}. Open it on this phone or computer. The link works once.`)
    })
  }
  const submitCreate = (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== again) { setError('The two passwords are not the same.'); return }
    void run(async () => {
      const r = await signUp(email.trim(), password)
      if (r.error) setError(r.error)
      else if (r.needsConfirmation) setNotice(`Almost done. We sent a confirmation link to ${email.trim()}. Open it, then sign in. An admin must approve your account before you see company data.`)
    })
  }

  if (mode === 'forgot') return <ForgotPassword email={email} onBack={() => go('password')} />

  const title = mode === 'create' ? 'Create account' : mode === 'link' ? 'Sign in with an email link' : 'Sign in'
  const emailField = (
    <label className="block text-sm">Email
      <input className={`${inp} mt-1 w-full`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
    </label>
  )
  return (
    <Screen>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {linkError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{linkError}</p>}

      {methods.includes('google') && mode === 'password' && (
        <>
          <button type="button" className={`${btnGhost} w-full`} disabled={busy} onClick={() => void run(async () => setError(await signInWithGoogle()))}>
            Continue with Google
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
        </>
      )}

      {mode === 'password' && (
        <form className="space-y-3" onSubmit={submitPassword}>
          {emailField}
          <label className="block text-sm">Password
            <input className={`${inp} mt-1 w-full`} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className={`${btn} w-full`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      )}

      {mode === 'link' && (
        <form className="space-y-3" onSubmit={submitLink}>
          <p className="text-sm text-slate-600">Type your email. We send you a link that signs you in, with no password.</p>
          {emailField}
          <button className={`${btn} w-full`} disabled={busy}>{busy ? 'Sending…' : 'Send sign-in link'}</button>
        </form>
      )}

      {mode === 'create' && (
        <form className="space-y-3" onSubmit={submitCreate}>
          <p className="text-sm text-slate-600">An admin must approve your account before you can see company data.</p>
          {emailField}
          <label className="block text-sm">Password
            <input className={`${inp} mt-1 w-full`} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block text-sm">Type it again
            <input className={`${inp} mt-1 w-full`} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
          </label>
          <button className={`${btn} w-full`} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
      )}

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
        {mode === 'password' && methods.includes('magiclink') && <button type="button" className={linkBtn} onClick={() => go('link')}>Email me a sign-in link</button>}
        {mode === 'password' && methods.includes('signup') && <button type="button" className={linkBtn} onClick={() => go('create')}>Create account</button>}
        {mode === 'password' && <button type="button" className={linkBtn} onClick={() => setMode('forgot')}>Forgot password?</button>}
        {mode !== 'password' && <button type="button" className={linkBtn} onClick={() => go('password')}>Back to sign in</button>}
        {mode === 'password' && !methods.includes('signup') && <span className="basis-full">No account? Ask your admin to invite you.</span>}
      </div>
    </Screen>
  )
}

function Pending() {
  const { email, refreshRole, signOut } = useAuth()
  return (
    <Screen>
      <h1 className="text-xl font-semibold text-slate-900">Waiting for approval</h1>
      <p className="text-sm text-slate-600">You are signed in as <b>{email}</b>. An admin needs to approve your account before you can see company data.</p>
      <div className="flex gap-2">
        <button className={btn} onClick={() => void refreshRole()}>Check again</button>
        <button className={btnGhost} onClick={() => void signOut()}>Sign out</button>
      </div>
    </Screen>
  )
}

function ForgotPassword({ email: initial, onBack }: { email: string; onBack: () => void }) {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState(initial)
  const [state, setState] = useState<{ busy?: boolean; sent?: boolean; error?: string | null }>({})
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!navigator.onLine) { setState({ error: 'You need internet to reset your password.' }); return }
    setState({ busy: true })
    const error = await sendPasswordReset(email.trim())
    setState(error ? { error } : { sent: true })
  }
  return (
    <Screen>
      <h1 className="text-xl font-semibold text-slate-900">Forgot password</h1>
      {state.sent ? (
        <p role="status" className="text-sm text-slate-700">
          If <b>{email}</b> has an account, we sent an email with a link. Open the link <b>on this phone or computer</b> and choose a new password. The link works once and expires after a while.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          <p className="text-sm text-slate-600">Type your email. We will send you a link to choose a new password.</p>
          <label className="block text-sm">Email
            <input className={`${inp} mt-1 w-full`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
          <button className={`${btn} w-full`} disabled={state.busy}>{state.busy ? 'Sending…' : 'Send link'}</button>
        </form>
      )}
      <button className={btnGhost} onClick={onBack}>Back to sign in</button>
    </Screen>
  )
}

/** After opening an invite or password-reset link: the person chooses their password. */
function ChoosePassword() {
  const { email, setPassword } = useAuth()
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) { setError('Use at least 8 characters.'); return }
    if (pw !== again) { setError('The two passwords are not the same.'); return }
    setBusy(true)
    setError(await setPassword(pw))
    setBusy(false)
  }
  return (
    <Screen>
      <h1 className="text-xl font-semibold text-slate-900">Choose your password</h1>
      <p className="text-sm text-slate-600">For <b>{email}</b>. You will use it to sign in on any phone or computer.</p>
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm">New password
          <input className={`${inp} mt-1 w-full`} type="password" autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <label className="block text-sm">Type it again
          <input className={`${inp} mt-1 w-full`} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button className={`${btn} w-full`} disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </Screen>
  )
}
