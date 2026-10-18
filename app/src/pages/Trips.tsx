import { useMemo, useState } from 'react'
import { useApp } from '../state'
import { buildICS, download, googleCalendarUrl, plusDay, type CalEvent } from '../ics'
import { Card, Loading, btnGhost, daysBetween, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { Chip, FilterChips, Hint, PageHead, RecordCard, StatTile, Strip, type Tone } from '../components/kit'
import { Dialog } from '../components/Dialog'
import { smsLink, telLink } from '../contact'
import type { Booking, Pkg } from '../types'

const CHIP: Record<CalEvent['kind'], string> = {
  trip: 'bg-brand-mist text-brand', visa: 'bg-amber-soft text-amber-ink',
  flight: 'bg-indigo-soft text-indigo-700', passport: 'bg-rose-soft text-rose-ink',
}
const DONE = ['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected']
type View = 'agenda' | 'grid'

export default function Trips() {
  const { data } = useApp()
  const [view, setView] = useState<View>('agenda')
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [sel, setSel] = useState<string | null>(today())
  const [region, setRegion] = useState('all')
  const [roster, setRoster] = useState<{ pkg: Pkg; date: string } | null>(null)

  const events = useMemo<CalEvent[]>(() => {
    if (!data) return []
    const name = new Map(data.customers.map((c) => [c.id!, c.name]))
    const pkg = new Map(data.packages.map((p) => [p.id, p]))
    const out: CalEvent[] = []
    for (const b of data.bookings) {
      if (b.status !== 'confirmed') continue
      const p = pkg.get(b.packageId)
      if (!p) continue
      out.push({ uid: `trip-${b.id}`, kind: 'trip', title: `${name.get(b.customerId)} · ${p.name}`, start: b.departDate, end: plusDay(b.departDate, p.days - 1), desc: `${p.name} to ${b.destination}, ${b.pax} pax` })
    }
    for (const c of data.visas) if (c.deadline && !DONE.includes(c.stage)) out.push({ uid: `visa-${c.id}`, kind: 'visa', title: `Visa due: ${name.get(c.customerId)} (${c.kind})`, start: c.deadline, desc: `Stage: ${c.stage}` })
    for (const c of data.passports) if (c.deadline && !DONE.includes(c.stage)) out.push({ uid: `pp-${c.id}`, kind: 'passport', title: `Passport due: ${name.get(c.customerId)} (${c.kind})`, start: c.deadline, desc: `Stage: ${c.stage}` })
    for (const t of data.tickets) out.push({ uid: `fl-${t.id}`, kind: 'flight', title: `Flight ${t.from}→${t.to}: ${name.get(t.customerId)}`, start: t.date, desc: `${t.airline} · ${t.direction}` })
    return out
  }, [data])

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) {
      const span = Math.min(daysBetween(e.start, e.end ?? e.start), 20)
      for (let i = 0; i <= span; i++) {
        const d = plusDay(e.start, i)
        m.set(d, [...(m.get(d) ?? []), e])
      }
    }
    return m
  }, [events])

  if (!data) return <Loading />
  const first = new Date(cursor.y, cursor.m, 1)
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const dim = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((lead + dim) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1
    return d < 1 || d > dim ? null : `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })
  const t = today()
  const nav = (n: number) => setCursor(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
  const exportMonth = () => download(`travel-${monthPrefix}.ics`, buildICS(events.filter((e) => e.start.startsWith(monthPrefix))), 'text/calendar')
  const exportUpcoming = () => download('travel-upcoming.ics', buildICS(events.filter((e) => (e.end ?? e.start) >= t)), 'text/calendar')

  // Readiness for confirmed trips in the next 45 days
  const custs = new Map(data.customers.map((c) => [c.id!, c]))
  const upcoming = data.bookings
    .filter((b) => b.status === 'confirmed' && b.departDate >= t && daysBetween(t, b.departDate) <= 45)
    .sort((a, b) => a.departDate.localeCompare(b.departDate))
    .map((b) => {
      const p = data.packages.find((x) => x.id === b.packageId)!
      const c = custs.get(b.customerId)!
      const checks: [string, boolean][] = [
        ['Passport valid 6+ months', !!c && daysBetween(b.departDate, c.passportExpiry) >= 180],
        ['Visa approved', data.visas.some((v) => v.customerId === b.customerId && v.kind === p.country && ['Approved', 'Delivered'].includes(v.stage))],
        ['Flight booked', data.tickets.some((x) => x.customerId === b.customerId && Math.abs(daysBetween(x.date, b.departDate)) <= 3)],
      ]
      return { b, p, c, checks, ready: checks.filter(([, ok]) => ok).length }
    })
  const regions = [...new Set(upcoming.map((u) => u.p.country))]
  const shown = region === 'all' ? upcoming : upcoming.filter((u) => u.p.country === region)
  const pax = shown.reduce((s, u) => s + u.b.pax, 0)
  const selEvents = sel ? byDay.get(sel) ?? [] : []
  const when = (d: string) => { const n = daysBetween(t, d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days` }

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Trips and schedule" title="Trips" sub="Departures, visa and passport deadlines, and flights."
        action={<button className={`${btnGhost} inline-flex items-center gap-2`} onClick={exportUpcoming}><Icon name="trips" className="h-4 w-4" />Export calendar (.ics)</button>} />

      <div className="inline-flex rounded-xl bg-indigo-soft/50 p-1 text-sm font-semibold" role="tablist">
        {(['agenda', 'grid'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-lg px-4 py-2 capitalize transition ${view === v ? 'bg-white text-brand shadow-sm' : 'text-ink-2'}`}>{v === 'grid' ? 'Calendar' : 'Agenda'}</button>
        ))}
      </div>

      {view === 'agenda' && (
        <>
          {regions.length > 1 && <FilterChips value={region} onChange={setRegion} options={[{ value: 'all', label: 'All regions', count: upcoming.length }, ...regions.map((r) => ({ value: r, label: r, count: upcoming.filter((u) => u.p.country === r).length }))]} />}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile label="Next 45 days" value={String(shown.length)} icon="compass" tone="brand" note="confirmed departures" />
            <StatTile label="Travellers" value={String(pax)} icon="people" tone="indigo" note="on those trips" />
            <StatTile label="Not ready" value={String(shown.filter((u) => u.ready < 3).length)} icon="alert" tone={shown.some((u) => u.ready < 3) ? 'amber' : 'slate'} note="missing a document" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((u) => {
              const urgent = daysBetween(t, u.b.departDate) <= 7 && u.ready < 3
              const ev = events.find((e) => e.uid === `trip-${u.b.id}`)
              const tone: Tone = u.ready === 3 ? 'emerald' : u.ready === 0 ? 'rose' : 'amber'
              return (
                <RecordCard key={u.b.id} urgent={urgent}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={daysBetween(t, u.b.departDate) <= 7 ? 'brand' : 'slate'}>{when(u.b.departDate)}</Chip>
                    <Chip tone="sky">{u.b.destination}</Chip>
                    <Chip tone={tone} className="ml-auto">{u.ready === 3 ? 'All ready' : `${u.ready}/3 ready`}</Chip>
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-snug text-ink">{u.p.name}</h3>
                    <p className="inline-flex flex-wrap items-center gap-x-3 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><Icon name="clock" className="h-4 w-4" />{u.p.days} days</span><span className="inline-flex items-center gap-1"><Icon name="people" className="h-4 w-4" />{u.b.pax} {u.b.pax === 1 ? 'traveller' : 'travellers'}</span></p>
                  </div>
                  <Strip><span className="inline-flex items-center gap-2 font-medium text-ink"><Icon name="customers" className="h-4 w-4" />{u.c?.name ?? 'Unknown'}</span><span className="text-ink-2">{u.b.departDate}</span></Strip>
                  <ul className="space-y-1.5 text-sm">
                    {u.checks.map(([label, ok]) => (
                      <li key={label} className={`flex items-center justify-between rounded-lg px-3 py-2 ${ok ? 'bg-emerald-soft/50' : 'bg-rose-soft/50'}`}>
                        <span className="inline-flex items-center gap-2"><Icon name={ok ? 'check' : 'alert'} className={`h-4 w-4 ${ok ? 'text-emerald-ink' : 'text-rose-ink'}`} />{label}</span>
                        <span className={`text-xs font-semibold ${ok ? 'text-emerald-ink' : 'text-rose-ink'}`}>{ok ? 'Yes' : 'Missing'}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={btnGhost} onClick={() => setRoster({ pkg: u.p, date: u.b.departDate })}>View roster</button>
                    {ev ? <a className={`${btnGhost} block text-center`} href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer">Add to calendar</a> : <span />}
                  </div>
                </RecordCard>
              )
            })}
          </div>
          {!shown.length && <Hint icon="compass" tone="sky" title="No departures in the next 45 days">Confirmed bookings with a departure date show up here, with a checklist of passport, visa and flight.</Hint>}
        </>
      )}

      {view === 'grid' && (
        <>
          <Card
            title={first.toLocaleString('en', { month: 'long', year: 'numeric' })}
            right={<div className="flex flex-wrap gap-2"><button className={btnGhost} onClick={() => nav(-1)}>Prev</button><button className={btnGhost} onClick={() => setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() })}>Today</button><button className={btnGhost} onClick={() => nav(1)}>Next</button><button className={btnGhost} onClick={exportMonth}>Month .ics</button></div>}
          >
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="bg-slate-50 p-1 text-center font-semibold text-slate-500">{d}</div>)}
              {cells.map((d, i) => {
                const ev = d ? byDay.get(d) ?? [] : []
                return (
                  <button key={i} disabled={!d} onClick={() => d && setSel(d)} className={`min-h-16 bg-white p-1 text-left align-top md:min-h-24 ${d === sel ? 'ring-2 ring-inset ring-brand' : ''} ${d === t ? 'bg-brand-mist' : ''}`}>
                    <div className="num font-semibold text-slate-700">{d?.slice(8)}</div>
                    <div className="hidden space-y-0.5 md:block">
                      {ev.slice(0, 3).map((e, j) => <div key={j} className={`truncate rounded px-1 ${CHIP[e.kind]}`}>{e.title}</div>)}
                      {ev.length > 3 && <div className="text-slate-400">+{ev.length - 3} more</div>}
                    </div>
                    <div className="flex flex-wrap gap-0.5 md:hidden">{ev.slice(0, 4).map((e, j) => <span key={j} className={`h-2 w-2 rounded-full ${CHIP[e.kind].split(' ')[0]}`} />)}</div>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">{(Object.keys(CHIP) as CalEvent['kind'][]).map((k) => <span key={k} className={`rounded-full px-2.5 py-0.5 font-semibold ${CHIP[k]}`}>{k}</span>)}</div>
          </Card>

          {sel && (
            <Card title={`${sel} — ${selEvents.length} event${selEvents.length === 1 ? '' : 's'}`}>
              <ul className="space-y-2 text-sm">
                {selEvents.map((e, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5">
                    <span><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[e.kind]}`}>{e.kind}</span>{e.title}</span>
                    <span className="flex gap-2">
                      <a className={btnGhost} href={googleCalendarUrl(e)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                      <button className={btnGhost} onClick={() => download(`${e.uid}.ics`, buildICS([e]), 'text/calendar')}>.ics</button>
                    </span>
                  </li>
                ))}
                {!selEvents.length && <li className="text-slate-400">Nothing scheduled.</li>}
              </ul>
            </Card>
          )}
        </>
      )}
      {roster && <RosterDialog bookings={data.bookings.filter((b) => b.status === 'confirmed' && b.packageId === roster.pkg.id && b.departDate === roster.date)} pkg={roster.pkg} date={roster.date} onClose={() => setRoster(null)} />}
    </div>
  )
}

/** Everyone leaving together on one package and date, with a way to call or message each. */
function RosterDialog({ bookings, pkg, date, onClose }: { bookings: Booking[]; pkg: Pkg; date: string; onClose: () => void }) {
  const { data } = useApp()
  const people = bookings.map((b) => ({ b, c: data?.customers.find((c) => c.id === b.customerId) }))
  const pax = bookings.reduce((s, b) => s + b.pax, 0)
  return (
    <Dialog title={`Roster · ${date}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">{pkg.name} · {pax} {pax === 1 ? 'traveller' : 'travellers'} in {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</p>
      <ul className="divide-y divide-line">
        {people.map(({ b, c }) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="min-w-0"><b className="font-semibold text-ink">{c?.name ?? 'Unknown'}</b><span className="block text-slate-500">{b.pax} {b.pax === 1 ? 'traveller' : 'travellers'}{c?.passportExpiry ? ` · passport ${c.passportExpiry}` : ''}</span></span>
            {c?.phone && <span className="flex gap-2"><a className="rounded-lg bg-indigo-soft/60 px-3 py-1.5 text-xs font-semibold text-brand" href={telLink(c.phone)}>Call</a><a className="rounded-lg bg-indigo-soft/60 px-3 py-1.5 text-xs font-semibold text-brand" href={smsLink(c.phone, `Hello ${c.name}, this is SSM Travel & Tours. Reminder: your ${pkg.name} leaves on ${date}. Please bring your passport and documents.`)}>Message</a></span>}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
