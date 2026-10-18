import { useState } from 'react'
import { useApp } from '../state'
import { monthKey, monthsFor, pctDelta, sumBy, totals, type Sale } from '../analytics'
import { Card, Chart, Loading, Seg, inp } from '../components/ui'
import { Chip, Hint, IconTile, PageHead, ProgressRow, StatTile, type Tone } from '../components/kit'

const DIMS = ['Service', 'Country', 'Duration', 'Destination', 'Origin'] as const
type Dim = (typeof DIMS)[number]
const dimKey: Record<Dim, (s: Sale) => string | undefined> = {
  Service: (s) => s.service, Country: (s) => s.country, Duration: (s) => (s.days ? `${s.days} days` : undefined),
  Destination: (s) => s.dest, Origin: (s) => s.origin,
}

const SEGMENTS: Record<string, (s: Sale) => boolean> = {
  Package: (s) => s.service === 'Package', Visa: (s) => s.service === 'Visa', Passport: (s) => s.service === 'Passport',
  'Air ticket': (s) => s.service === 'Air ticket', India: (s) => s.country === 'India', Nepal: (s) => s.country === 'Nepal',
  Thailand: (s) => s.country === 'Thailand', Bhutan: (s) => s.country === 'Bhutan',
  'Myanmar-outbound tickets': (s) => s.service === 'Air ticket' && /^(Yangon|Mandalay)/.test(s.label),
}
const TONES: Tone[] = ['brand', 'indigo', 'amber', 'sky', 'rose', 'emerald']

export default function Revenue() {
  const { data, sales, prevSales, scoped, money, filters, setFilters } = useApp()
  const [dim, setDim] = useState<Dim>('Service')
  const [metric, setMetric] = useState<'revenue' | 'margin'>('revenue')
  const [a, setA] = useState('India')
  const [b, setB] = useState('Thailand')
  if (!data) return <Loading />

  const cur = totals(sales), prev = totals(prevSales)
  const agg = sumBy(sales, dimKey[dim])
  const aggPrev = new Map(sumBy(prevSales, dimKey[dim]).map((x) => [x.key, x[metric]]))
  const months = monthsFor(filters.preset)
  const series = (name: string) => ({
    name, type: 'line', smooth: true,
    data: months.map((m) => scoped.filter((s) => SEGMENTS[name]!(s) && monthKey(s.date) === m).reduce((x, s) => x + s[metric], 0)),
  })
  const A = totals(scoped.filter(SEGMENTS[a]!)), B = totals(scoped.filter(SEGMENTS[b]!))
  const noPrev = filters.preset === 'all' || prev.count < cur.count * 0.3
  const top = [...agg].sort((x, y) => y[metric] - x[metric])
  const topVal = top[0]?.[metric] ?? 0
  const total = top.reduce((s, x) => s + x[metric], 0)
  const marginPct = (t: ReturnType<typeof totals>) => ((t.margin / (t.revenue || 1)) * 100).toFixed(1)

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Financial overview" title="Revenue" sub="Where the money comes from, and how two parts compare." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Gross revenue" value={money(cur.revenue, true)} icon="revenue" tone="brand" delta={noPrev ? undefined : pctDelta(cur.revenue, prev.revenue)} note={noPrev ? undefined : 'vs last period'} />
        <StatTile label="Margin" value={money(cur.margin, true)} icon="overview" tone="emerald" delta={noPrev ? undefined : pctDelta(cur.margin, prev.margin)} note={`${marginPct(cur)}% of revenue`} />
        <StatTile label="Avg sale" value={money(cur.count ? cur.revenue / cur.count : 0, true)} icon="bookings" tone="indigo" note={`${cur.count} sales`} />
        <StatTile label="Transactions" value={String(cur.count)} icon="check" tone="sky" delta={noPrev ? undefined : pctDelta(cur.count, prev.count)} note={noPrev ? undefined : 'vs last period'} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="min-w-0 rounded-2xl border border-line bg-surface p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Group by
          <select aria-label="Group by" className={`${inp} mt-1 w-full !text-sm normal-case tracking-normal text-ink`} value={dim} onChange={(e) => setDim(e.target.value as Dim)}>{DIMS.map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Show
          <div className="mt-1"><Seg options={['revenue', 'margin'] as const} value={metric} onChange={setMetric} /></div>
        </div>
      </div>

      <Card title={`${metric === 'revenue' ? 'Revenue' : 'Margin'} by ${dim.toLowerCase()}`} right={<Chip tone="brand">Total {money(total, true)}</Chip>}>
        <div className="space-y-3">
          {top.slice(0, 6).map((x, i) => (
            <ProgressRow key={x.key} label={x.key} value={money(x[metric], true)} pct={topVal ? (x[metric] / topVal) * 100 : 0} tone={TONES[i % TONES.length]} right={`${total ? ((x[metric] / total) * 100).toFixed(0) : 0}%`} />
          ))}
          {!top.length && <p className="text-sm text-slate-400">No sales in this period.</p>}
        </div>
      </Card>

      <Card title="Chart">
        <Chart
          height={320}
          onClick={(p) => dim === 'Destination' && setFilters({ dest: p.name })}
          option={{
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => money(v) },
            xAxis: { type: 'category', data: agg.map((x) => x.key), axisLabel: { interval: 0, rotate: agg.length > 6 ? 35 : 0 } },
            yAxis: { type: 'value', axisLabel: { formatter: (v: number) => money(v, true) } },
            series: [{ type: 'bar', data: agg.map((x) => x[metric]), itemStyle: { borderRadius: [6, 6, 0, 0] } }],
          }}
        />
        {dim === 'Destination' && <p className="text-xs text-slate-500">Tip: tap a destination bar to filter the whole app to it.</p>}
      </Card>

      {!noPrev && top.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-base font-bold text-ink">{dim} vs last period</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {top.slice(0, 6).map((x) => {
              const before = aggPrev.get(x.key) ?? 0
              const d = before ? pctDelta(x[metric], before) : undefined
              return (
                <div key={x.key} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
                  <IconTile name="overview" tone="brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{x.key}</div>
                    <div className="num text-sm text-slate-500">Now <b className="text-ink">{money(x[metric], true)}</b> · before {money(before, true)}</div>
                  </div>
                  {d !== undefined ? <Chip tone={d >= 0 ? 'emerald' : 'rose'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%</Chip> : <Chip>new</Chip>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Card title="Head-to-head"
        right={
          <div className="flex w-full items-center gap-2 text-sm sm:w-auto">
            <select aria-label="First segment" className={`${inp} flex-1`} value={a} onChange={(e) => setA(e.target.value)}>{Object.keys(SEGMENTS).map((k) => <option key={k}>{k}</option>)}</select>
            <span className="font-semibold text-slate-500">vs</span>
            <select aria-label="Second segment" className={`${inp} flex-1`} value={b} onChange={(e) => setB(e.target.value)}>{Object.keys(SEGMENTS).map((k) => <option key={k}>{k}</option>)}</select>
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
          {([[a, A, 'brand'], [b, B, 'indigo']] as const).map(([n, t, tone]) => (
            <div key={n} className="min-w-0 rounded-xl bg-sky-soft/50 p-3">
              <Chip tone={tone}>{n}</Chip>
              <div className="num mt-2 text-lg font-bold text-ink">{money(t.revenue, true)}</div>
              <div className="num text-slate-500">{money(t.margin, true)} margin · {marginPct(t)}%</div>
              <div className="text-slate-500">{t.count} sales</div>
            </div>
          ))}
        </div>
        <Chart
          option={{
            tooltip: { trigger: 'axis', valueFormatter: (v: number) => money(v) },
            legend: { top: 0 },
            xAxis: { type: 'category', data: months },
            yAxis: { type: 'value', axisLabel: { formatter: (v: number) => money(v, true) } },
            series: [series(a), series(b)],
          }}
        />
      </Card>
      {!sales.length && <Hint icon="search" title="No sales in this period">Pick a wider date range at the top.</Hint>}
    </div>
  )
}
