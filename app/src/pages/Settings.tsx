import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearDevice } from '../db'
import { DEMO_DATA, loadDemoData } from '../seed'
import { backupStatus, downloadBackup } from '../backup'
import { versionLabel } from '../version'
import { useApp } from '../state'
import { useAuth } from '../auth/AuthProvider'
import { requestSync, useSyncStatus } from '../sync/controller'
import { download } from '../ics'
import { Card, Page, btn, btnGhost, inp } from '../components/ui'

interface InstallEvent extends Event { prompt: () => Promise<void> }

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

  return (
    <Page title="Settings" sub={auth.mode === 'cloud' ? 'Your data syncs with the company cloud database.' : 'Data lives on this device only. Back up regularly.'}>
      {auth.mode === 'cloud' && (
        <Card title="Account & sync">
          <p className="text-sm text-slate-700">Signed in as <b>{auth.email}</b> · role <b>{auth.role}</b></p>
          <p className="mt-1 text-sm text-slate-600">
            {sync.state === 'synced' && `Everything is synced${sync.lastSynced ? ` (last at ${new Date(sync.lastSynced).toLocaleTimeString()})` : ''}.`}
            {sync.state === 'syncing' && 'Syncing…'}
            {sync.state === 'offline' && `Offline. ${sync.pending} change(s) will upload when you are back online.`}
            {sync.state === 'error' && `Sync problem: ${sync.error}`}
          </p>
          {sync.failures && sync.failures.length > 0 && (
            <div role="alert" className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              <p className="font-medium">These records could not be uploaded (everything else was). Tell your admin:</p>
              <ul className="mt-1 list-disc pl-5">{sync.failures.map((f) => <li key={f.id}>{f.table} {f.id.slice(0, 8)} — {f.message}</li>)}</ul>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => void requestSync()}>⟳ Sync now</button>
            <button className={btnGhost} onClick={() => void auth.signOut()}>Sign out</button>
          </div>
          <ChangePassword />
          <p className="mt-2 text-xs text-slate-500">Signing out removes the company data from this device. It stays safe in the cloud.</p>
        </Card>
      )}
      <Card title="Currency">
        <label className="flex items-center gap-2 text-sm">1 USD =<input className={`${inp} w-28`} type="number" min={1} value={filters.fx} onChange={(e) => setFilters({ fx: +e.target.value || 1 })} /> MMK <span className="text-slate-400">(all data is stored in kyat; this rate is only used to show USD)</span></label>
      </Card>
      <Card title="Install & offline">
        <p className="mb-2 text-sm text-slate-600">Install to your home screen for a full-screen, offline-ready app. On iPhone use Share → Add to Home Screen.</p>
        <button className={btn} disabled={!install} onClick={() => install?.prompt()}>{install ? 'Install app' : 'Install prompt not available'}</button>
      </Card>
      <Card title="Backup & export">
        <p className={`mb-2 text-sm ${backup.due ? 'font-medium text-amber-800' : 'text-slate-600'}`}>{backup.text}{backup.due && ' Please download one.'}</p>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => void exportJson()}>Backup (JSON)</button>
          <button className={btnGhost} onClick={exportCsv}>Sales (CSV)</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {auth.role === 'admin' ? <>To bring data in from a backup, use <Link className="text-teal-700 underline" to="/admin">Admin → Import</Link>.</> : 'Only admins can import backups.'}
        </p>
        {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
      </Card>
      {auth.mode === 'local' && (
        <Card title="Danger zone">
          <div className="flex flex-wrap gap-2">
            {DEMO_DATA !== undefined && <button className={btnGhost} onClick={() => { if (confirm('Replace all data with fresh demo data?')) void run('Demo data loaded.', loadDemoData) }}>Reset to demo data</button>}
            <button className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50" onClick={() => { if (confirm('Delete ALL data on this device? Package catalog is removed too.')) void run('All data erased.', clearDevice) }}>Erase everything</button>
          </div>
        </Card>
      )}
      <Card title="About">
        <p className="text-sm text-slate-600">App version: <span className="font-mono">{versionLabel()}</span></p>
      </Card>
    </Page>
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
  if (!open) return <div className="mt-2"><button className="text-sm text-teal-700 underline" onClick={() => { setOpen(true); setNote('') }}>Change password</button>{note && <span className="ml-2 text-sm text-slate-600">{note}</span>}</div>
  return (
    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={save}>
      <label className="text-sm">New password<input className={`${inp} ml-1 w-40`} type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <label className="text-sm">Again<input className={`${inp} ml-1 w-40`} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} /></label>
      <button className={btn}>Save</button>
      <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
      {note && <p role="alert" className="w-full text-sm text-rose-700">{note}</p>}
    </form>
  )
}
