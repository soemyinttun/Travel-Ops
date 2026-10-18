import { useMemo, useState } from 'react'
import { useApp } from '../state'
import { buildICS, download, googleCalendarUrl, plusDay, type CalEvent } from '../ics'
import { Card, Loading, Page, btnGhost, daysBetween, today } from '../components/ui'

const CHIP: Record<CalEvent['kind'], string> = {
  trip: 'bg-teal-100 text-teal-800', visa: 'bg-amber-100 text-amber-800',
  flight: 'bg-indigo-100 text-indigo-800', passport: 'bg-rose-100 text-rose-800',
}
const DONE = ['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected']

export default function Trips() {
  const { data } = useApp()
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [sel, setSel] = useState<string | null>(today())

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
      return {
        b, p, c,
        passport: !!c && daysBetween(b.departDate, c.passportExpiry) >= 180,
        visa: data.visas.some((v) => v.customerId === b.customerId && v.kind === p.country && ['Approved', 'Delivered'].includes(v.stage)),
        flight: data.tickets.some((x) => x.customerId === b.customerId && Math.abs(daysBetween(x.date, b.departDate)) <= 3),
      }
    })

  const selEvents = sel ? byDay.get(sel) ?? [] : []

  return (
    <Page title="Trips & schedule" sub="Departures, visa/passport deadlines and flights. Export to Google Calendar or any calendar app (.ics).">
      <Card
        title={first.toLocaleString('en', { month: 'long', year: 'numeric' })}
        right={<div className="flex flex-wrap gap-2"><button className={btnGhost} onClick={() => nav(-1)}>Prev</button><button className={btnGhost} onClick={() => setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() })}>Today</button><button className={btnGhost} onClick={() => nav(1)}>Next</button><button className={btnGhost} onClick={exportMonth}>Month .ics</button><button className={btnGhost} onClick={exportUpcoming}>Upcoming .ics</button></div>}
      >
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-200 text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="bg-slate-50 p-1 text-center font-medium text-slate-500">{d}</div>)}
          {cells.map((d, i) => {
            const ev = d ? byDay.get(d) ?? [] : []
            return (
              <button key={i} disabled={!d} onClick={() => d && setSel(d)} className={`min-h-16 bg-white p-1 text-left align-top md:min-h-24 ${d === sel ? 'ring-2 ring-inset ring-teal-600' : ''} ${d === t ? 'bg-teal-50' : ''}`}>
                <div className="font-medium text-slate-700">{d?.slice(8)}</div>
                <div className="hidden space-y-0.5 md:block">
                  {ev.slice(0, 3).map((e, j) => <div key={j} className={`truncate rounded px-1 ${CHIP[e.kind]}`}>{e.title}</div>)}
                  {ev.length > 3 && <div className="text-slate-400">+{ev.length - 3} more</div>}
                </div>
                <div className="flex flex-wrap gap-0.5 md:hidden">{ev.slice(0, 4).map((e, j) => <span key={j} className={`h-2 w-2 rounded-full ${CHIP[e.kind].split(' ')[0]}`} />)}</div>
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">{(Object.keys(CHIP) as CalEvent['kind'][]).map((k) => <span key={k} className={`rounded px-2 py-0.5 ${CHIP[k]}`}>{k}</span>)}</div>
      </Card>

      {sel && (
        <Card title={`${sel} — ${selEvents.length} event${selEvents.length === 1 ? '' : 's'}`}>
          <ul className="space-y-2 text-sm">
            {selEvents.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
                <span><span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${CHIP[e.kind]}`}>{e.kind}</span>{e.title}</span>
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

      <Card title="Trip readiness — next 45 days">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Departs</th><th>Traveller</th><th>Package</th><th>Passport ≥6mo</th><th>Visa</th><th>Flight</th></tr></thead>
          <tbody>
            {upcoming.map((u) => (
              <tr key={u.b.id} className="border-b last:border-0"><td className="py-1.5">{u.b.departDate}</td><td>{u.c?.name}</td><td>{u.p.name}</td>
                {[u.passport, u.visa, u.flight].map((ok, i) => <td key={i} className={ok ? 'text-emerald-600' : 'text-rose-600'}>{ok ? 'Yes' : 'Missing'}</td>)}</tr>
            ))}
            {!upcoming.length && <tr><td colSpan={6} className="py-3 text-slate-400">No confirmed departures in the next 45 days.</td></tr>}
          </tbody></table></div>
      </Card>
    </Page>
  )
}
