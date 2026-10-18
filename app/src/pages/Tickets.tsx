import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { inRange, rangeFor, sumBy } from '../analytics'
import { Card, Chart, Loading, Page, Seg, Stat, btn, formGrid, inp, today } from '../components/ui'
import { CustomerSelect } from '../components/CustomerSelect'
import { DESTINATIONS, ORIGINS } from '../types'

const CITIES = [...ORIGINS, ...DESTINATIONS].map((p) => p.name)

export default function Tickets() {
  const { data, money, filters } = useApp()
  const [dir, setDir] = useState<'All' | 'Inbound' | 'Outbound'>('All')
  const [f, setF] = useState({ customerId: '', direction: 'Outbound' as 'Inbound' | 'Outbound', from: 'Yangon', to: 'Bodh Gaya', airline: 'Myanmar Airways Intl', date: today(), fare: 900_000, commission: 40_000 })
  if (!data) return <Loading />
  const r = rangeFor(filters.preset)
  const name = new Map(data.customers.map((c) => [c.id!, c.name]))
  const rows = data.tickets.filter((t) => inRange(t.date, r) && (dir === 'All' || t.direction === dir))
  const sales = rows.map((t) => ({ revenue: t.fare, margin: t.commission, route: `${t.from}→${t.to}`, airline: t.airline }))
  const byRoute = sumBy(sales, (s) => s.route).slice(0, 10)
  const byAirline = sumBy(sales, (s) => s.airline)
  const fare = rows.reduce((s, t) => s + t.fare, 0), com = rows.reduce((s, t) => s + t.commission, 0)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.customerId === '' || f.from === f.to) return
    await store.create('tickets', f)
    setF({ ...f, customerId: '' })
  }

  return (
    <Page title="Air tickets" sub="Inbound to Myanmar and outbound from Myanmar." right={<Seg options={['All', 'Inbound', 'Outbound'] as const} value={dir} onChange={setDir} />}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tickets" value={String(rows.length)} />
        <Stat label="Ticket sales" value={money(fare, true)} />
        <Stat label="Commission" value={money(com, true)} />
        <Stat label="Avg commission" value={`${fare ? ((com / fare) * 100).toFixed(1) : 0}%`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Top routes by commission">
          <Chart option={{ tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => money(v) }, grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true }, yAxis: { type: 'category', inverse: true, data: byRoute.map((x) => x.key) }, xAxis: { type: 'value', axisLabel: { formatter: (v: number) => money(v, true) } }, series: [{ type: 'bar', data: byRoute.map((x) => x.margin), itemStyle: { borderRadius: [0, 6, 6, 0] } }] }} />
        </Card>
        <Card title="Airline share (ticket sales)">
          <Chart option={{ tooltip: { trigger: 'item', valueFormatter: (v: number) => money(v) }, legend: { bottom: 0 }, series: [{ type: 'pie', radius: ['40%', '68%'], data: byAirline.map((x) => ({ name: x.key, value: x.revenue })) }] }} />
        </Card>
      </div>
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
      <Card title={`Latest tickets (${rows.length})`}>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Date</th><th>Customer</th><th>Route</th><th>Dir</th><th>Airline</th><th>Fare</th><th>Comm.</th></tr></thead>
          <tbody>{[...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25).map((t) => (
            <tr key={t.id} className="border-b last:border-0"><td className="py-1.5">{t.date}</td><td>{name.get(t.customerId)}</td><td>{t.from}→{t.to}</td><td>{t.direction}</td><td>{t.airline}</td><td>{money(t.fare)}</td><td>{money(t.commission)}</td></tr>
          ))}</tbody></table></div>
      </Card>
    </Page>
  )
}
