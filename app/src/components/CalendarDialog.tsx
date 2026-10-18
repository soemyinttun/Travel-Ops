import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useApp } from '../state'
import { supabase, connection } from '../sync/supabase'
import { buildEvents, buildICS, download, INCLUDE_ALL, type Include } from '../ics'
import { createFeed, deleteFeed, feedUrls, getFeed, includeOf, renewFeed, updateFeed, type FeedRow } from '../calendar/feed'
import { Dialog } from './Dialog'
import { btn, btnGhost, today } from './ui'
import { Chip } from './kit'

const OPTIONS: { key: keyof Include; label: string; hint: string }[] = [
  { key: 'trips', label: 'Confirmed trips', hint: 'Departure to return, with the package name' },
  { key: 'deadlines', label: 'Visa and passport deadlines', hint: 'Open cases that have a deadline' },
  { key: 'flights', label: 'Flights', hint: 'Air tickets, by date' },
]

const soft = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-soft/60 px-4 py-2.5 text-sm font-semibold text-brand transition active:scale-95 hover:bg-indigo-soft'

/**
 * "Add to calendar": a live link that Google Calendar and Apple Calendar keep up to date by
 * themselves (cloud sync only), and a file to download for any mode.
 * `client` and `host` are only passed in tests.
 */
export function CalendarDialog({ onClose, client = supabase, host = connection.host }: { onClose: () => void; client?: SupabaseClient | null; host?: string | null }) {
  const { data } = useApp()
  const [include, setInclude] = useState<Include>(INCLUDE_ALL)
  const [feed, setFeed] = useState<FeedRow | null>(null)
  const [state, setState] = useState<'loading' | 'ready'>(client ? 'loading' : 'ready')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const live = !!client && !!host

  useEffect(() => {
    if (!client) return
    let on = true
    getFeed(client)
      .then((f) => { if (!on) return; setFeed(f); if (f) setInclude(includeOf(f)); setState('ready') })
      .catch((e: Error) => { if (!on) return; setError(e.message); setState('ready') })
    return () => { on = false }
  }, [client])

  const run = async (task: () => Promise<void>, done = '') => {
    setBusy(true); setError(''); setNote('')
    try { await task(); setNote(done) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const pick = (key: keyof Include, value: boolean) => {
    const next = { ...include, [key]: value }
    if (!next.trips && !next.deadlines && !next.flights) return // at least one thing
    setInclude(next)
    if (client && feed) void run(async () => setFeed(await updateFeed(client, next)), 'Link updated.')
  }
  const downloadFile = () => {
    if (!data) return
    const from = today()
    const events = buildEvents(data, include, { from, to: '9999-12-31' })
    download('ssm-travel-ops.ics', buildICS(events, { name: 'SSM Travel Ops' }), 'text/calendar')
    setNote(`Saved ${events.length} ${events.length === 1 ? 'event' : 'events'}.`)
  }
  const urls = feed && host ? feedUrls(host, feed.token) : null
  const copy = async () => {
    if (!urls) return
    try { await navigator.clipboard.writeText(urls.https); setNote('Link copied. Keep it private.'); setError('') }
    catch { setError('Could not copy. Press and hold the link to copy it.') }
  }

  return (
    <Dialog title="Add to calendar" onClose={onClose}>
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">What to include</legend>
          {OPTIONS.map((o) => (
            <label key={o.key} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" checked={include[o.key]} disabled={busy} onChange={(e) => pick(o.key, e.target.checked)} />
              <span><b className="font-semibold text-ink">{o.label}</b><span className="block text-slate-500">{o.hint}</span></span>
            </label>
          ))}
        </fieldset>

        <section className="space-y-2" aria-label="Live link">
          <div className="flex items-center gap-2"><h3 className="text-base font-bold text-ink">Live link</h3><Chip tone="sky">Updates by itself</Chip></div>
          {!live && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">The live link needs cloud sync (sign-in). On this device you can download a file below.</p>}
          {live && state === 'loading' && <p className="text-sm text-slate-500">Checking your link...</p>}
          {live && state === 'ready' && !feed && (
            <>
              <p className="text-sm text-slate-600">Make a private link once. Google Calendar and Apple Calendar then keep your trips up to date on their own.</p>
              <button className={btn} disabled={busy} onClick={() => void run(async () => setFeed(await createFeed(client!, include)))}>Create my link</button>
            </>
          )}
          {live && feed && urls && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <a className={soft} href={urls.google} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                <a className={soft} href={urls.webcal}>Add to Apple Calendar</a>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => void copy()}>Copy link</button>
                <button className={btnGhost} disabled={busy} onClick={() => { if (confirm('Make a new link? The old link stops working, so you must add the calendar again.')) void run(async () => setFeed(await renewFeed(client!)), 'New link made. The old one no longer works.') }}>Make a new link</button>
                <button className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-ink transition active:scale-95 hover:bg-rose-soft/50" disabled={busy} onClick={() => { if (confirm('Turn off your calendar link? Calendars using it stop updating.')) void run(async () => { await deleteFeed(client!); setFeed(null) }, 'Link turned off.') }}>Turn off</button>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                <li><b>Keep the link private.</b> Anyone who has it can see customer names and trip dates.</li>
                <li>Apple Calendar refreshes about every hour. Google Calendar decides for itself, often 12 to 24 hours, so new trips are not instant.</li>
                <li>If someone leaves, they lose the link when the admin removes their access.</li>
              </ul>
            </>
          )}
        </section>

        <section className="space-y-2" aria-label="Download a file">
          <h3 className="text-base font-bold text-ink">Download a file now</h3>
          <p className="text-sm text-slate-600">A one-time copy of what is coming up. Apple: open the file and choose Calendar. Google: Settings, then Import and export.</p>
          <button className={btnGhost} onClick={downloadFile}>Download .ics file</button>
        </section>

        {note && <p role="status" className="text-sm font-medium text-emerald-ink">{note}</p>}
        {error && <p role="alert" className="text-sm font-medium text-rose-ink">{error}</p>}
      </div>
    </Dialog>
  )
}
