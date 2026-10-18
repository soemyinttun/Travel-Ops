import { useEffect, useState, type ReactNode } from 'react'
import { deleteLegacyData, readLegacyData } from '../db'
import { checkBackup, withFreshIds, type CheckResult } from '../importer/validate'
import { addMany, replaceAll } from '../store'
import { useAuth, type Role } from '../auth/AuthProvider'
import { listImports, listProfiles, logImport, setRole, type ImportEntry, type Profile } from '../auth/admin'
import { requestSync, useSyncStatus } from '../sync/controller'
import { connection } from '../sync/supabase'
import { AUTH_METHODS } from '../auth/providers'
import { appUrl } from '../auth/redirect'
import { backupStatus, downloadBackup } from '../backup'
import { versionLabel } from '../version'
import { TABLES } from '../types'
import { Card, Page, btn, btnGhost, inp } from '../components/ui'

export default function Admin() {
  const auth = useAuth()
  if (auth.role !== 'admin') return <Page title="Admin"><Card><p className="text-sm text-slate-600">Only admins can open this page.</p></Card></Page>
  return (
    <Page title="Admin" sub={auth.mode === 'cloud' ? 'Import data and manage staff accounts.' : 'Import data into this device.'}>
      <ImportCard cloud={auth.mode === 'cloud'} />
      <BackupCard />
      {auth.mode === 'cloud' && <StaffCard myEmail={auth.email} />}
      <ConnectionCard />
      {auth.mode === 'cloud' && <HistoryCard />}
    </Page>
  )
}

// ── Import ─────────────────────────────────────────────────────────────────

interface Source { name: string; result: CheckResult; legacy: boolean }

function ImportCard({ cloud }: { cloud: boolean }) {
  const [source, setSource] = useState<Source | null>(null)
  const [mode, setMode] = useState<'add' | 'replace'>('add')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [hasLegacy, setHasLegacy] = useState(false)
  useEffect(() => { void readLegacyData().then((d) => setHasLegacy(d !== null)) }, [done])

  const reset = () => { setSource(null); setConfirmText(''); setMode('add') }
  const openFile = async (f: File) => {
    setDone('')
    let raw: unknown
    try { raw = JSON.parse(await f.text()) } catch { raw = null }
    setSource({ name: f.name, result: raw === null ? { data: null, counts: emptyCounts(), errors: ['This file is not valid JSON.'], warnings: [] } : checkBackup(raw), legacy: false })
  }
  const openLegacy = async () => {
    setDone('')
    setSource({ name: 'Data from the previous app version on this device', result: checkBackup(await readLegacyData()), legacy: true })
  }
  const run = async () => {
    if (!source?.result.data) return
    setBusy(true)
    try {
      const data = mode === 'add' ? withFreshIds(source.result.data) : source.result.data
      await (mode === 'add' ? addMany(data) : replaceAll(data))
      if (source.legacy) await deleteLegacyData()
      let note = ''
      if (cloud) {
        await logImport(source.name, mode, source.result.counts).catch((e: Error) => { note = ` (Import history was not saved: ${e.message})` })
        void requestSync()
      }
      setDone(`Imported ${total(source.result.counts)} records (${mode === 'add' ? 'added to current data' : 'replaced all data'}).${cloud ? ' Uploading to the cloud now.' : ''}${note}`)
      reset()
    } catch (e) {
      setDone(`Import failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const r = source?.result
  const canImport = !!r?.data && !busy && (mode === 'add' || confirmText === 'REPLACE')
  return (
    <Card title="Import a backup (JSON)">
      {!source && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Choose a backup file made with Settings → Backup (JSON). Older app versions' backups work too. Nothing changes until you press Import.</p>
          <div className="flex flex-wrap gap-2">
            <label className={`${btn} cursor-pointer`}>Choose file…
              <input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void openFile(f) }} />
            </label>
            {hasLegacy && <button className={btnGhost} onClick={() => void openLegacy()}>Import data from the old app version on this device</button>}
          </div>
        </div>
      )}
      {source && r && (
        <div className="space-y-3">
          <p className="text-sm"><b>{source.name}</b></p>
          <table className="text-sm">
            <tbody>{TABLES.map((t) => <tr key={t}><td className="pr-4 capitalize text-slate-600">{t}</td><td className="text-right font-medium">{r.counts[t]}</td></tr>)}</tbody>
          </table>
          {r.errors.length > 0 && (
            <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              <p className="font-medium">This file can't be imported. Fix these problems and try again:</p>
              <ul className="mt-1 list-disc pl-5">{r.errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {r.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Please check:</p>
              <ul className="mt-1 list-disc pl-5">{r.warnings.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {r.data && (
            <fieldset className="space-y-2 text-sm">
              <legend className="font-medium">How to import</legend>
              <label className="flex items-start gap-2"><input type="radio" checked={mode === 'add'} onChange={() => setMode('add')} />
                <span><b>Add to current data</b> — keeps everything already here and adds these records. Packages with the same code are updated.</span></label>
              <label className="flex items-start gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                <span><b>Replace all data</b> — removes all current customers, bookings, cases, tickets and packages{cloud ? ' for everyone' : ''}, then loads this file.</span></label>
              {mode === 'replace' && (
                <label className="block">Type <b>REPLACE</b> to confirm:
                  <input className={`${inp} ml-2 w-32`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type REPLACE to confirm" />
                </label>
              )}
            </fieldset>
          )}
          <div className="flex gap-2">
            {r.data && <button className={btn} disabled={!canImport} onClick={() => void run()}>{busy ? 'Importing…' : 'Import'}</button>}
            <button className={btnGhost} onClick={reset} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}
      {done && <p className="mt-3 text-sm text-slate-700" role="status">{done}</p>}
    </Card>
  )
}

const emptyCounts = () => Object.fromEntries(TABLES.map((t) => [t, 0])) as CheckResult['counts']
const total = (c: CheckResult['counts']) => Object.values(c).reduce((a, b) => a + b, 0)

// ── Staff ──────────────────────────────────────────────────────────────────

function StaffCard({ myEmail }: { myEmail: string | undefined }) {
  const [people, setPeople] = useState<Profile[] | null>(null)
  const [error, setError] = useState('')
  const load = () => listProfiles().then(setPeople).catch((e: Error) => setError(e.message))
  useEffect(() => { void load() }, [])
  const change = async (p: Profile, role: Role) => {
    if (p.email === myEmail && role !== 'admin' && !confirm('You are removing your own admin access. Continue?')) return
    setError('')
    await setRole(p.id, role).catch((e: Error) => setError(e.message))
    await load()
  }
  return (
    <Card title="Staff accounts">
      <p className="mb-2 text-sm text-slate-600">
        New people: invite them in the Supabase dashboard (Authentication → Users → Invite). They appear here as <b>pending</b>; choose <b>staff</b> or <b>admin</b> to let them in.
      </p>
      {error && <p role="alert" className="mb-2 text-sm text-rose-700">{error}</p>}
      {!people ? <p className="text-sm text-slate-500">{navigator.onLine ? 'Loading…' : 'Connect to the internet to manage staff.'}</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Person</th><th>Signs in with</th><th>Signed up</th><th>Role</th></tr></thead>
          <tbody>{people.map((p) => (
            <tr key={p.id} className={`border-b last:border-0 ${p.role === 'pending' ? 'bg-amber-50' : ''}`}>
              <td className="py-1.5 pr-3">
                {p.display_name && <div className="font-medium">{p.display_name}</div>}
                <div className={p.display_name ? 'text-xs text-slate-500' : ''}>{p.email}{p.email === myEmail && <span className="ml-1 text-xs text-slate-400">(you)</span>}</div>
              </td>
              <td className="pr-3">{p.provider ?? '—'}</td>
              <td className="whitespace-nowrap pr-3">{p.created_at.slice(0, 10)}</td>
              <td><select className={inp} value={p.role} aria-label={`Role for ${p.email}`} onChange={(e) => void change(p, e.target.value as Role)}>
                <option value="pending">pending</option><option value="staff">staff</option><option value="admin">admin</option>
              </select></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </Card>
  )
}

// ── Import history ─────────────────────────────────────────────────────────

function HistoryCard() {
  const [rows, setRows] = useState<ImportEntry[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void listImports().then(setRows).catch((e: Error) => setError(e.message)) }, [])
  return (
    <Card title="Import history">
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {rows && !rows.length && <p className="text-sm text-slate-500">No imports yet.</p>}
      {rows && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="py-1">When</th><th>Who</th><th>File</th><th>Mode</th><th className="text-right">Records</th></tr></thead>
          <tbody>{rows.map((x) => (
            <tr key={x.id} className="border-b last:border-0">
              <td className="py-1.5">{new Date(x.imported_at).toLocaleString()}</td><td>{x.profiles?.email ?? '—'}</td>
              <td>{x.file_name}</td><td>{x.mode}</td><td className="text-right">{total(x.counts)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Card>
  )
}

// ── Backup ─────────────────────────────────────────────────────────────────

function BackupCard() {
  const [status, setStatus] = useState(backupStatus())
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try { await downloadBackup() } finally { setBusy(false); setStatus(backupStatus()) }
  }
  return (
    <Card title="Backup">
      <p className={`text-sm ${status.due ? 'font-medium text-amber-800' : 'text-slate-600'}`}>{status.text}{status.due && ' Please download one now.'}</p>
      <div className="mt-2"><button className={btn} disabled={busy} onClick={() => void run()}>{busy ? 'Preparing…' : 'Download full backup'}</button></div>
      <p className="mt-2 text-xs text-slate-500">The file has customer information: keep it private and never put it on GitHub or any public site. Do this every week.</p>
    </Card>
  )
}

// ── Connection check ───────────────────────────────────────────────────────

/** Shows how this copy of the app is connected, to find problems quickly. Never shows keys. */
function ConnectionCard() {
  const auth = useAuth()
  const sync = useSyncStatus()
  const syncText =
    auth.mode === 'local' ? 'Off (local-only mode)'
    : sync.state === 'synced' ? `Synced${sync.lastSynced ? ` at ${new Date(sync.lastSynced).toLocaleTimeString()}` : ''}${sync.pending ? `, ${sync.pending} waiting` : ''}`
    : sync.state === 'error' ? `Problem: ${sync.error}`
    : sync.state === 'offline' ? `Offline, ${sync.pending} waiting`
    : sync.state === 'syncing' ? 'Syncing…' : 'Starting…'
  const rows: [string, ReactNode][] = [
    ['Mode', auth.mode === 'cloud' ? 'Cloud (Supabase)' : 'Local-only (no sign-in, no sync)'],
    ["This app's address", appUrl()],
    ['Supabase project', connection.host ?? 'not set'],
    ['Sign-in options on', AUTH_METHODS.join(', ')],
    ['Signed in as', auth.email ? `${auth.email} (${auth.role})` : '—'],
    ['Sync', syncText],
    ['App version', versionLabel()],
  ]
  return (
    <Card title="Connection check">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="break-all">{v}</dd></div>)}
        <dt className="text-slate-500">Settings found</dt>
        <dd>
          <ul>{connection.variables.map((v) => (
            <li key={v.name} className="font-mono text-xs"><span aria-hidden="true">{v.found ? '✓' : '·'}</span> {v.name} <span className="font-sans text-slate-400">{v.found ? 'set' : 'not set'}</span></li>
          ))}</ul>
        </dd>
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        In Supabase → Authentication → URL Configuration, the Site URL should be this app's address, and the Redirect URLs should include it (and your Vercel preview wildcard). Only the names of settings are shown here, never their values.
      </p>
    </Card>
  )
}
