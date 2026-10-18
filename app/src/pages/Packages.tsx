import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { inRange, rangeFor } from '../analytics'
import { Card, Chart, Loading, Seg, inp } from '../components/ui'
import { Icon } from '../components/Icon'
import { Chip, FilterChips, Hint, PageHead, RecordCard, type Tone } from '../components/kit'

type Metric = 'Revenue' | 'Margin' | 'Bookings' | 'Conversion'
const SORTS: [string, string][] = [['revenue', 'Revenue'], ['margin', 'Margin'], ['marginPct', 'Margin %'], ['bookings', 'Booked'], ['price', 'Price'], ['days', 'Trip length']]

export default function Packages() {
  const { data, money, filters } = useApp()
  const [metric, setMetric] = useState<Metric>('Revenue')
  const [sort, setSort] = useState('revenue')
  const [len, setLen] = useState('all')
  const [editing, setEditing] = useState<string | null>(null)
  if (!data) return <Loading />
  const r = rangeFor(filters.preset)

  const rows = data.packages.map((p) => {
    const bs = data.bookings.filter((b) => b.packageId === p.id && inRange(b.createdAt, r))
    const won = bs.filter((b) => b.status === 'confirmed' || b.status === 'completed')
    const pax = won.reduce((s, b) => s + b.pax, 0)
    return {
      p, enquiries: bs.length, bookings: won.length, pax,
      price: p.price, days: p.days,
      revenue: pax * p.price, margin: pax * (p.price - p.cost), marginPct: ((p.price - p.cost) / p.price) * 100,
      avgGroup: won.length ? pax / won.length : 0, conv: bs.length ? (won.length / bs.length) * 100 : 0,
    }
  })
  const sorted = [...rows]
    .filter((x) => len === 'all' || String(x.p.days) === len)
    .sort((a, b) => ((b as never)[sort] as number) - ((a as never)[sort] as number))
  const val = (x: (typeof rows)[number]) => (metric === 'Revenue' ? x.revenue : metric === 'Margin' ? x.margin : metric === 'Bookings' ? x.bookings : x.conv)
  const days = [...new Set(data.packages.map((p) => p.days))].sort((a, b) => a - b)
  const countries = [...new Set(data.packages.map((p) => p.country))]
  const fmtAxis = (v: number) => (metric === 'Revenue' || metric === 'Margin' ? money(v, true) : metric === 'Conversion' ? `${v.toFixed(0)}%` : String(v))
  const upd = (id: string, changes: { price?: number; cost?: number }) => store.patch('packages', id, changes)
  const health = (pct: number): [string, Tone] => (pct >= 30 ? ['Healthy', 'emerald'] : pct >= 15 ? ['Fair', 'amber'] : ['Low', 'rose'])

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Trip packages" title="Packages" sub={`${data.packages.length} packages across ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}. Prices are kyat per person.`} />

      <Card title={`${metric} by duration`} right={<Seg options={['Revenue', 'Margin', 'Bookings', 'Conversion'] as const} value={metric} onChange={setMetric} />}>
        <Chart
          height={300}
          option={{
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: 0 },
            xAxis: { type: 'category', data: days.map((d) => `${d} days`) },
            yAxis: { type: 'value', axisLabel: { formatter: fmtAxis } },
            series: countries.map((c) => ({
              name: c, type: 'bar', itemStyle: { borderRadius: [6, 6, 0, 0] },
              data: days.map((d) => { const x = rows.find((y) => y.p.country === c && y.p.days === d); return x ? val(x) : 0 }),
            })),
          }}
        />
      </Card>

      <FilterChips value={len} onChange={setLen} options={[
        { value: 'all', label: 'All lengths', count: data.packages.length },
        ...days.map((d) => ({ value: String(d), label: `${d} days`, count: data.packages.filter((p) => p.days === d).length })),
      ]} />
      <label className="flex items-center gap-2 rounded-xl bg-indigo-soft/40 px-3 py-2 text-sm text-ink-2">
        <Icon name="overview" className="h-4 w-4 text-brand" /><span className="font-medium">Sort by</span>
        <select aria-label="Sort packages" className="ml-auto rounded-lg bg-white px-2 py-1 text-sm font-semibold text-brand" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((x) => {
          const [hText, hTone] = health(x.marginPct)
          const open = editing === x.p.id
          return (
            <RecordCard key={x.p.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="sky">{x.p.days} days</Chip><Chip tone="slate">{x.p.country}</Chip>
              </div>
              <div>
                <h3 className="text-base font-bold leading-snug text-ink">{x.p.name}</h3>
                <p className="inline-flex items-center gap-1.5 text-sm text-slate-500"><Icon name="pin" className="h-4 w-4" />{x.p.stops.slice(0, 3).join(' · ')}{x.p.stops.length > 3 ? '…' : ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-sky-soft/50 p-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Base rate</div>
                  {open
                    ? <input aria-label={`Price of ${x.p.name}`} type="number" className={`${inp} mt-1 w-full`} defaultValue={x.p.price} onBlur={(e) => upd(x.p.id, { price: +e.target.value })} />
                    : <div className="num text-lg font-bold text-ink">{money(x.p.price)}<span className="text-xs font-medium text-slate-500"> / person</span></div>}
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{open ? 'Cost' : 'Net margin'}</div>
                  {open
                    ? <input aria-label={`Cost of ${x.p.name}`} type="number" className={`${inp} mt-1 w-full`} defaultValue={x.p.cost} onBlur={(e) => upd(x.p.id, { cost: +e.target.value })} />
                    : <div className="flex flex-wrap items-center gap-2"><span className="num text-lg font-bold text-brand">{x.marginPct.toFixed(0)}%</span><Chip tone={hTone}>{hText}</Chip></div>}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="num text-sm text-ink-2">
                  <b className="font-semibold text-ink">{x.bookings}</b> booked · {x.pax} travellers · {money(x.revenue, true)}
                  <div className="text-xs text-slate-500">{x.enquiries} enquiries · {x.conv.toFixed(0)}% converted</div>
                </div>
                <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-soft/60 px-3 py-2 text-sm font-semibold text-brand transition active:scale-95 hover:bg-indigo-soft" onClick={() => setEditing(open ? null : x.p.id)}>
                  <Icon name={open ? 'check' : 'edit'} className="h-4 w-4" />{open ? 'Done' : 'Edit pricing'}
                </button>
              </div>
            </RecordCard>
          )
        })}
      </div>
      {!sorted.length && <Hint icon="packages" title="No packages for this length" />}
      <Hint icon="pin" tone="amber" title="Bhutan prices">Include the government Sustainable Development Fee. Set the current rate in the price and cost boxes.</Hint>
    </div>
  )
}
