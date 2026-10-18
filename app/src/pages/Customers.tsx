import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { ORIGINS } from '../types'
import { Card, Loading, btn, btnGhost, daysBetween, formGrid, inp, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { ActionButton, Avatar, Chip, FilterChips, Hint, PageHead, RecordCard, SearchBox, StatTile, Strip, type Tone } from '../components/kit'

type View = 'all' | 'soon' | 'expired' | 'none'
const SHOWN = 40

export default function Customers() {
  const { data } = useApp()
  const [q, setQ] = useState('')
  const [view, setView] = useState<View>('all')
  const [adding, setAdding] = useState(false)
  const [more, setMore] = useState(SHOWN)
  const [f, setF] = useState({ name: '', phone: '', township: 'Yangon', passportExpiry: '' })
  if (!data) return <Loading />
  const t = today()

  const left = (c: { passportExpiry: string }) => (c.passportExpiry ? daysBetween(t, c.passportExpiry) : null)
  const kind = (c: { passportExpiry: string }): View | 'valid' => { const d = left(c); return d === null ? 'none' : d < 0 ? 'expired' : d < 180 ? 'soon' : 'valid' }
  const n = (v: View) => data.customers.filter((c) => kind(c) === v).length
  const valid = data.customers.filter((c) => kind(c) === 'valid').length
  const validPct = data.customers.length ? Math.round((valid / data.customers.length) * 100) : 0

  const needle = q.trim().toLowerCase()
  const matching = data.customers
    .filter((c) => view === 'all' || kind(c) === view)
    .filter((c) => !needle || (c.name + c.phone + c.township).toLowerCase().includes(needle))
  const rows = matching.slice(0, more)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return
    await store.create('customers', { ...f, name: f.name.trim() })
    setF({ ...f, name: '', phone: '', passportExpiry: '' })
    setAdding(false)
  }
  const remove = async (id: string) => {
    const used = data.bookings.some((b) => b.customerId === id) || data.visas.some((v) => v.customerId === id) || data.passports.some((v) => v.customerId === id) || data.tickets.some((v) => v.customerId === id)
    if (used) return alert('This customer has bookings or cases and cannot be deleted.')
    if (confirm('Delete customer?')) await store.remove('customers', id)
  }
  const label: Record<string, [string, Tone]> = { valid: ['Valid', 'emerald'], soon: ['Under 6 months', 'amber'], expired: ['Expired', 'rose'], none: ['No passport date', 'slate'] }

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Customer directory" title="Customers" sub={`${data.customers.length} customers`}
        action={<ActionButton icon={adding ? 'chevron' : 'plus'} onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'Add customer'}</ActionButton>} />

      {adding && (
        <Card title="Add customer">
          <form onSubmit={add} className={formGrid}>
            <input className={inp} required placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className={inp} placeholder="Phone" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <select className={inp} value={f.township} onChange={(e) => setF({ ...f, township: e.target.value })}>{ORIGINS.map((o) => <option key={o.name}>{o.name}</option>)}</select>
            <label className="flex flex-wrap items-center gap-1 text-sm text-slate-500">Passport expiry<input className={inp} type="date" value={f.passportExpiry} onChange={(e) => setF({ ...f, passportExpiry: e.target.value })} /></label>
            <button className={btn}>Add</button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total clients" value={String(data.customers.length)} icon="customers" tone="brand" note="in the directory" />
        <StatTile label="Passport valid" value={`${validPct}%`} icon="passport" tone="emerald" note="6+ months left" />
        <StatTile label="Expiring soon" value={String(n('soon'))} icon="clock" tone={n('soon') ? 'amber' : 'slate'} note="under 6 months" />
        <StatTile label="Expired" value={String(n('expired'))} icon="alert" tone={n('expired') ? 'rose' : 'slate'} note={n('expired') ? 'needs renewal' : 'none'} />
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search name, phone or town" />
      <FilterChips value={view} onChange={(v) => { setView(v); setMore(SHOWN) }} options={[
        { value: 'all', label: 'All clients', count: data.customers.length },
        { value: 'soon', label: 'Expiring soon', count: n('soon') },
        { value: 'expired', label: 'Expired', count: n('expired') },
        { value: 'none', label: 'No date', count: n('none') },
      ]} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => {
          const k = kind(c), d = left(c)
          const [text, tone] = label[k]!
          return (
            <RecordCard key={c.id} urgent={k === 'expired'}>
              <div className="flex items-start gap-3">
                <Avatar name={c.name} tone={k === 'expired' ? 'rose' : k === 'soon' ? 'amber' : 'brand'} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{c.name}</div>
                  <div className="num truncate text-sm text-slate-500">{c.phone || 'No phone'} · {c.township}</div>
                </div>
              </div>
              <Strip tone={k === 'expired' ? 'rose' : k === 'soon' ? 'amber' : 'sky'}>
                <span className="inline-flex items-center gap-2 font-medium"><Icon name="passport" className="h-4 w-4" />{c.passportExpiry || 'No passport date'}</span>
                <Chip tone={tone}>{text}{d !== null && d >= 0 && k !== 'valid' ? ` · ${d} days` : ''}</Chip>
              </Strip>
              <div className="flex justify-end">
                <button aria-label="Delete customer" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-soft/60 px-3 py-2 text-sm font-semibold text-rose-ink transition active:scale-95 hover:bg-rose-soft" onClick={() => remove(c.id)}><Icon name="trash" className="h-4 w-4" />Delete</button>
              </div>
            </RecordCard>
          )
        })}
      </div>

      {!rows.length && <Hint icon="search" title="No customers found">Try another word or choose All clients.</Hint>}
      {matching.length > rows.length && <div className="text-center"><button className={btnGhost} onClick={() => setMore((x) => x + SHOWN)}>Show more ({matching.length - rows.length} left)</button></div>}
    </div>
  )
}
