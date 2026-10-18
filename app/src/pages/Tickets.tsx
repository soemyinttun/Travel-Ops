import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { inRange, rangeFor, sumBy } from '../analytics'
import { Card, Chart, Loading, Seg, btn, btnGhost, formGrid, inp, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { ActionButton, Chip, Hint, PageHead, ProgressRow, RecordCard, StatTile, Strip, type Tone } from '../components/kit'
import { CustomerSelect } from '../components/CustomerSelect'
import { DESTINATIONS, ORIGINS } from '../types'

const CITIES = [...ORIGINS, ...DESTINATIONS].map((p) => p.name)
const TONES: Tone[] = ['brand', 'indigo', 'amber', 'sky', 'rose', 'emerald']
const SHOWN = 24

export default function Tickets() {
  const { data, money, filters } = useApp()
  const [dir, setDir] = useState<'All' | 'Inbound' | 'Outbound'>('All')
  const [adding, setAdding] = useState(false)
  const [more, setMore] = useState(SHOWN)
  const [f, setF] = useState({ customerId: '', direction: 'Outbound' as 'Inbound' | 'Outbound', from: 'Yangon', to: 'Bodh Gaya', airline: 'Myanmar Airways Intl', date: today(), fare: 900_000, commission: 40_000 })
  if (!data) return <Loading />
  const r = rangeFor(filters.preset)
  const name = new Map(data.customers.map((c) => [c.id!, c.name]))
  const rows = data.tickets.filter((t) => inRange(t.date, r) && (dir === 'All' || t.direction === dir))
  const sales = rows.map((t) => ({ revenue: t.fare, margin: t.commission, route: `${t.from}→${t.to}`, airline: t.airline }))
  const byRoute = sumBy(sales, (s) => s.route).slice(0, 10)
  const byAirline = sumBy(sales, (s) => s.airline).sort((a, b) => b.revenue - a.revenue)
  const fare = rows.reduce((s, t) => s + t.fare, 0), com = rows.reduce((s, t) => s + t.commission, 0)
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
  const list = sorted.slice(0, more)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.customerId === '' || f.from === f.to) return
    await store.create('tickets', f)
    setF({ ...f, customerId: '' })
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Air tickets" title="Tickets" sub="Inbound to Myanmar and outbound from Myanmar."
        action={<ActionButton icon={adding ? 'chevron' : 'plus'} onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'Add ticket'}</ActionButton>} />

      <Seg options={['All', 'Inbound', 'Outbound'] as const} value={dir} onChange={(v) => { setDir(v); setMore(SHOWN) }} />

      {adding && (
        <Card title="Add ticket">
          <form onSubmit={add} className={formGrid}>
            <CustomerSelect value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} />
            <select className={inp} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as 'Inbound' | 'Outbound' })}><option>Outbound</option><option>Inbound</option></select>
            <select className={inp} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <select className={inp} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input className={inp} value={f.airline} onChange={(e) => setF({ ...f, airline: e.target.value })} placeholder="Airline" />
            <input className={inp} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            <input className={`${inp} w-32`} type="number" value={f.fare} onChange={(e) => setF({ ...f, fare: +e.target.value })} aria-label="Fare (Ks)" />
            <input className={`${inp} w-28`} type="number" value={f.commission} onChange={(e) => setF({ ...f, commission: +e.target.value })} aria-label="Commission (Ks)" />
            <button className={btn}>Add</button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tickets" value={String(rows.length)} icon="tickets" tone="indigo" note={dir === 'All' ? 'in this period' : dir.toLowerCase()} />
        <StatTile label="Ticket sales" value={money(fare, true)} icon="revenue" tone="brand" note="fares collected" />
        <StatTile label="Commission" value={money(com, true)} icon="overview" tone="emerald" note="our earnings" />
        <StatTile label="Avg commission" value={`${fare ? ((com / fare) * 100).toFixed(1) : 0}%`} icon="check" tone="sky" note="of ticket sales" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Airline share and commission" right={<Chip tone="brand">Avg {fare ? ((com / fare) * 100).toFixed(1) : 0}%</Chip>}>
          <div className="space-y-3">
            {byAirline.map((a, i) => (
              <ProgressRow key={a.key} label={a.key} value={money(a.revenue, true)} pct={fare ? (a.revenue / fare) * 100 : 0} tone={TONES[i % TONES.length]}
                right={`${fare ? ((a.revenue / fare) * 100).toFixed(0) : 0}% · ${a.revenue ? ((a.margin / a.revenue) * 100).toFixed(1) : 0}% comm`} />
            ))}
            {!byAirline.length && <p className="text-sm text-slate-400">No tickets in this period.</p>}
          </div>
        </Card>
        <Card title="Top routes by commission">
          <Chart option={{ tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => money(v) }, grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true }, yAxis: { type: 'category', inverse: true, data: byRoute.map((x) => x.key) }, xAxis: { type: 'value', axisLabel: { formatter: (v: number) => money(v, true) } }, series: [{ type: 'bar', data: byRoute.map((x) => x.margin), itemStyle: { borderRadius: [0, 6, 6, 0] } }] }} />
        </Card>
      </div>

      <h2 className="px-1 text-base font-bold text-ink">Latest tickets <span className="text-sm font-medium text-slate-500">({rows.length})</span></h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => (
          <RecordCard key={t.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-base font-bold text-ink">{t.from}<Icon name="chevron" className="h-4 w-4 text-slate-400" />{t.to}</div>
                <div className="truncate text-sm text-slate-500">{t.airline}</div>
              </div>
              <Chip tone={t.direction === 'Inbound' ? 'sky' : 'indigo'}>{t.direction}</Chip>
            </div>
            <Strip>
              <span className="inline-flex min-w-0 items-center gap-2 font-medium text-ink"><Icon name="people" className="h-4 w-4 shrink-0" /><span className="truncate">{name.get(t.customerId) ?? 'Unknown'}</span></span>
              <span className="inline-flex items-center gap-1.5 text-ink-2"><Icon name="trips" className="h-4 w-4" />{t.date}</span>
            </Strip>
            <div className="num flex items-center justify-between text-sm">
              <span>Fare <b className="font-semibold text-ink">{money(t.fare)}</b></span>
              <span className="text-emerald-ink">Commission <b className="font-semibold">{money(t.commission)}</b></span>
            </div>
          </RecordCard>
        ))}
      </div>
      {!list.length && <Hint icon="tickets" tone="indigo" title="No tickets here">Add one with the button above, or change the date range.</Hint>}
      {sorted.length > list.length && <div className="text-center"><button className={btnGhost} onClick={() => setMore((n) => n + SHOWN)}>Show more ({sorted.length - list.length} left)</button></div>}
    </div>
  )
}
