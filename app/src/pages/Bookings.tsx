import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { DESTINATIONS, type BookingStatus } from '../types'
import { Card, Loading, btn, btnGhost, formGrid, inp, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { ActionButton, Avatar, Chip, FilterChips, Hint, PageHead, RecordCard, SearchBox, StatTile, Strip, type Tone } from '../components/kit'
import { CustomerSelect } from '../components/CustomerSelect'

const STATUSES: BookingStatus[] = ['enquiry', 'confirmed', 'completed', 'cancelled']
const STATUS_TONE: Record<BookingStatus, Tone> = { enquiry: 'slate', confirmed: 'brand', completed: 'emerald', cancelled: 'rose' }
const STATUS_LABEL: Record<BookingStatus, string> = { enquiry: 'Enquiry', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }
const SHOWN = 40

export default function Bookings() {
  const { data, money } = useApp()
  const [f, setF] = useState({ customerId: '', packageId: 'IN8', destination: 'Bodh Gaya', departDate: today(), pax: 2, status: 'enquiry' as BookingStatus })
  const [q, setQ] = useState('')
  const [show, setShow] = useState<BookingStatus | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [more, setMore] = useState(SHOWN)
  if (!data) return <Loading />
  const pkg = new Map(data.packages.map((p) => [p.id, p]))
  const name = new Map(data.customers.map((c) => [c.id!, c.name]))
  const country = pkg.get(f.packageId)?.country
  const dests = DESTINATIONS.filter((d) => d.country === country)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.customerId === '') return
    await store.create('bookings', { ...f, createdAt: today() })
    setF({ ...f, customerId: '' })
    setAdding(false)
  }
  const count = (s: BookingStatus) => data.bookings.filter((b) => b.status === s).length
  const needle = q.trim().toLowerCase()
  const matching = data.bookings
    .filter((b) => show === 'all' || b.status === show)
    .filter((b) => !needle || (name.get(b.customerId) ?? '').toLowerCase().includes(needle) || b.destination.toLowerCase().includes(needle) || (pkg.get(b.packageId)?.name ?? '').toLowerCase().includes(needle))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const rows = matching.slice(0, more)
  const done = count('confirmed') + count('completed')
  const rate = data.bookings.length ? Math.round((done / data.bookings.length) * 100) : 0

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Booking pipeline" title="Bookings" action={<ActionButton onClick={() => setAdding((v) => !v)} icon={adding ? 'chevron' : 'plus'}>{adding ? 'Close' : 'New enquiry'}</ActionButton>} />

      {adding && (
        <Card title="New booking / enquiry">
          <form onSubmit={add} className={formGrid}>
            <CustomerSelect value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} />
            <select className={inp} value={f.packageId} onChange={(e) => { const c = pkg.get(e.target.value)!.country; setF({ ...f, packageId: e.target.value, destination: DESTINATIONS.find((d) => d.country === c)!.name }) }}>
              {data.packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
            </select>
            <select className={inp} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })}>{dests.map((d) => <option key={d.name}>{d.name}</option>)}</select>
            <input className={inp} type="date" value={f.departDate} onChange={(e) => setF({ ...f, departDate: e.target.value })} />
            <input className={`${inp} w-20`} type="number" min={1} value={f.pax} onChange={(e) => setF({ ...f, pax: Math.max(1, +e.target.value) })} aria-label="Travellers" />
            <select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as BookingStatus })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <button className={btn}>Add</button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total" value={String(data.bookings.length)} icon="bookings" tone="brand" note="all bookings" />
        <StatTile label="Enquiries" value={String(count('enquiry'))} icon="clock" tone="amber" note="waiting to confirm" />
        <StatTile label="Confirmed" value={String(count('confirmed'))} icon="check" tone="brand" note={`${rate}% confirmed or done`} />
        <StatTile label="Completed" value={String(count('completed'))} icon="check" tone="emerald" note="trips finished" />
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search by name, package or place" />
      <FilterChips value={show} onChange={(v) => { setShow(v); setMore(SHOWN) }}
        options={[{ value: 'all', label: 'All', count: data.bookings.length }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], count: count(s) }))]} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((b) => {
          const who = name.get(b.customerId) ?? 'Unknown customer'
          const p = pkg.get(b.packageId)
          return (
            <RecordCard key={b.id}>
              <div className="flex items-start gap-3">
                <Avatar name={who} tone={STATUS_TONE[b.status] === 'slate' ? 'indigo' : STATUS_TONE[b.status]} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{who}</div>
                  <div className="num truncate text-sm text-slate-500">#{String(b.id).slice(0, 6).toUpperCase()} · {b.pax} {b.pax === 1 ? 'traveller' : 'travellers'}</div>
                </div>
                <Chip tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Chip>
              </div>
              <Strip>
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-ink"><Icon name="packages" className="h-4 w-4 shrink-0 text-brand" /><span className="truncate">{p?.name ?? 'Package'}</span></span>
                <span className="inline-flex items-center gap-1.5 text-ink-2"><Icon name="trips" className="h-4 w-4" />{b.departDate}</span>
              </Strip>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 text-sm text-slate-500">
                  <div className="inline-flex items-center gap-1"><Icon name="pin" className="h-4 w-4" />{b.destination}</div>
                  <div className="num font-semibold text-ink">{money((p?.price ?? 0) * b.pax)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select aria-label={`Status of ${who}`} className={`${inp} !py-1.5 !text-sm`} value={b.status} onChange={(e) => store.patch('bookings', b.id, { status: e.target.value as BookingStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                  <button aria-label="Delete booking" className="rounded-lg bg-rose-soft/60 p-2.5 text-rose-ink transition active:scale-95 hover:bg-rose-soft" onClick={() => confirm('Delete this booking?') && store.remove('bookings', b.id)}><Icon name="trash" className="h-4 w-4" /></button>
                </div>
              </div>
            </RecordCard>
          )
        })}
      </div>

      {!rows.length && <Hint icon="search" title="No bookings found">Try another word or choose All.</Hint>}
      {matching.length > rows.length && <div className="text-center"><button className={btnGhost} onClick={() => setMore((n) => n + SHOWN)}>Show more ({matching.length - rows.length} left)</button></div>}
    </div>
  )
}
