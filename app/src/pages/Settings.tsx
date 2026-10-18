import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { clearDevice } from '../db'
import { DEMO_DATA, loadDemoData } from '../seed'
import { backupStatus, downloadBackup } from '../backup'
import { versionLabel } from '../version'
import { useApp } from '../state'
import { useAuth } from '../auth/AuthProvider'
import { requestSync, useSyncStatus } from '../sync/controller'
import { download } from '../ics'
import { btn, btnGhost, inp } from '../components/ui'
import { Chip, IconTile, PageHead } from '../components/kit'
import type { IconName } from '../components/Icon'

interface InstallEvent extends Event { prompt: () => Promise<void> }

/** One settings block: round icon, title, optional label on the right. */
function Section({ icon, title, tag, danger = false, children }: { icon: IconName; title: string; tag?: ReactNode; danger?: boolean; children: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl border p-4 shadow-sm ${danger ? 'border-rose-200 bg-rose-soft/40' : 'border-line bg-white'}`}>
      <div className="mb-3 flex items-center gap-3">
        <IconTile name={icon} tone={danger ? 'rose' : 'brand'} className="!h-9 !w-9" />
        <h2 className={`flex-1 text-base font-bold ${danger ? 'text-rose-ink' : 'text-ink'}`}>{title}</h2>
        {tag}
      </div>
      {children}
    </section>
  )
}

export default function Settings() {
  const { filters, setFilters, scoped } = useApp()
  const auth = useAuth()
  const sync = useSyncStatus()
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const [backup, setBackup] = useState(backupStatus())
  const exportJson = async () => { await downloadBackup(); setBackup(backupStatus()) }
  const exportCsv = () => {
    const head = 'date,service,label,country,destination,origin,revenue_mmk,margin_mmk'
    const body = scoped.map((s) => [s.date, s.service, s.label, s.country ?? '', s.dest ?? '', s.origin ?? '', s.revenue, s.margin].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    download('sales.csv', [head, ...body].join('\n'), 'text/csv')
  }
  const run = (label: string, f: () => Promise<void>) => f().then(() => setMsg(label)).catch((e: Error) => setMsg(`Failed: ${e.message}`))
  const cloud = auth.mode === 'cloud'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead eyebrow="System" title="Settings" sub={cloud ? 'Your data syncs with the company cloud database.' : 'Data lives on this device only. Back up regularly.'} />

      {cloud && (
        <Section icon="people" title="Account & sync" tag={<Chip tone={sync.state === 'error' ? 'rose' : sync.state === 'offline' ? 'slate' : 'emerald'}>{sync.state === 'synced' ? 'Synced' : sync.state === 'syncing' ? 'Syncing' : sync.state === 'offline' ? 'Offline' : sync.state === 'error' ? 'Problem' : 'On'}</Chip>}>
          <p className="text-sm text-ink-2">Signed in as <b className="text-ink">{auth.email}</b> · role <b className="text-ink">{auth.role}</b></p>
          <p className="mt-1 text-sm text-slate-600">
            {sync.state === 'synced' && `Everything is synced${sync.lastSynced ? ` (last at ${new Date(sync.lastSynced).toLocaleTimeString()})` : ''}.`}
            {sync.state === 'syncing' && 'Syncing…'}
            {sync.state === 'offline' && `Offline. ${sync.pending} change(s) will upload when you are back online.`}
            {sync.state === 'error' && `Sync problem: ${sync.error}`}
          </p>
          {sync.failures && sync.failures.length > 0 && (
            <div role="alert" className="mt-2 rounded-xl bg-rose-soft p-3 text-sm text-rose-ink">
              <p className="font-semibold">These records could not be uploaded (everything else was). Tell your admin:</p>
              <ul className="mt-1 list-disc pl-5">{sync.failures.map((f) => <li key={f.id}>{f.table} {f.id.slice(0, 8)} — {f.message}</li>)}</ul>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => void requestSync()}>Sync now</button>
            <button className={btnGhost} onClick={() => void auth.signOut()}>Sign out</button>
          </div>
          <ChangePassword />
          <p className="mt-2 text-xs text-slate-500">Signing out removes the company data from this device. It stays safe in the cloud.</p>
        </Section>
      )}

      <Section icon="revenue" title="Currency & formats" tag={<Chip tone="brand">Kyat stored</Chip>}>
        <label className="flex flex-wrap items-center gap-2 text-sm text-ink-2">1 USD =<input aria-label="Kyat per US dollar" className={`${inp} w-28`} type="number" min={1} value={filters.fx} onChange={(e) => setFilters({ fx: +e.target.value || 1 })} /> MMK</label>
        <p className="mt-2 text-xs text-slate-500">All data is stored in kyat. This rate is only used to show USD.</p>
      </Section>

      <Section icon="more" title="Install & offline" tag={<Chip tone={install ? 'emerald' : 'slate'}>{install ? 'Ready' : 'Browser'}</Chip>}>
        <p className="mb-3 text-sm text-slate-600">Install to your home screen for a full-screen, offline-ready app. On iPhone use Share, then Add to Home Screen.</p>
        <button className={btn} disabled={!install} onClick={() => install?.prompt()}>{install ? 'Install app' : 'Install prompt not available'}</button>
      </Section>

      <Section icon="bookings" title="Backup & export" tag={backup.due ? <Chip tone="amber">Backup due</Chip> : <Chip tone="emerald">Compliance</Chip>}>
        <p className={`mb-3 text-sm ${backup.due ? 'font-semibold text-amber-ink' : 'text-slate-600'}`}>{backup.text}{backup.due && ' Please download one.'}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="flex items-center justify-between rounded-xl bg-sky-soft/50 p-3 text-left transition active:scale-[0.99] hover:bg-sky-soft" onClick={() => void exportJson()}>
            <span><span className="block text-sm font-semibold text-ink">Backup (JSON)</span><span className="text-xs text-slate-500">Everything, to restore later</span></span>
          </button>
          <button className="flex items-center justify-between rounded-xl bg-sky-soft/50 p-3 text-left transition active:scale-[0.99] hover:bg-sky-soft" onClick={exportCsv}>
            <span><span className="block text-sm font-semibold text-ink">Sales (CSV)</span><span className="text-xs text-slate-500">For Excel or Sheets</span></span>
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {auth.role === 'admin' ? <>To bring data in from a backup, use <Link className="font-semibold text-brand underline" to="/admin">Admin → Import</Link>.</> : 'Only admins can import backups.'}
        </p>
        {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
      </Section>

      {auth.mode === 'local' && (
        <Section icon="alert" title="Restricted actions" danger>
          <p className="mb-3 text-sm text-rose-ink">These change or remove data stored on this device.</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_DATA !== undefined && <button className={btnGhost} onClick={() => { if (confirm('Replace all data with fresh demo data?')) void run('Demo data loaded.', loadDemoData) }}>Reset to demo data</button>}
            <button className="rounded-lg bg-rose px-3 py-2 text-sm font-semibold text-white transition active:scale-95 hover:bg-rose-ink" onClick={() => { if (confirm('Delete ALL data on this device? Package catalog is removed too.')) void run('All data erased.', clearDevice) }}>Erase everything</button>
          </div>
        </Section>
      )}

      <p className="px-1 text-center text-xs text-slate-500">SSM Travel Ops · App version <span className="font-mono">{versionLabel()}</span></p>
    </div>
  )
}

/** Lets a signed-in person replace a temporary password from their admin. */
function ChangePassword() {
  const { setPassword } = useAuth()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [note, setNote] = useState('')
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return setNote('Use at least 8 characters.')
    if (pw !== again) return setNote('The two passwords are not the same.')
    const error = await setPassword(pw)
    if (error) return setNote(error)
    setNote('Password changed.'); setPw(''); setAgain(''); setOpen(false)
  }
  if (!open) return <div className="mt-3"><button className="text-sm font-semibold text-brand underline" onClick={() => { setOpen(true); setNote('') }}>Change password</button>{note && <span className="ml-2 text-sm text-slate-600">{note}</span>}</div>
  return (
    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={save}>
      <label className="text-sm">New password<input className={`${inp} ml-1 w-40`} type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <label className="text-sm">Again<input className={`${inp} ml-1 w-40`} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} /></label>
      <button className={btn}>Save</button>
      <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
      {note && <p role="alert" className="w-full text-sm text-rose-ink">{note}</p>}
    </form>
  )
}
