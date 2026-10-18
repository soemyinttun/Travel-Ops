import { useState } from 'react'
import { useApp } from '../state'
import { monthKey, monthsFor, pctDelta, sumBy, totals, type Sale } from '../analytics'
import { Card, Chart, Loading, Page, Seg, Stat, inp } from '../components/ui'

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

export default function Revenue() {
  const { data, sales, prevSales, scoped, money, filters, setFilters } = useApp()
  const [dim, setDim] = useState<Dim>('Service')
  const [metric, setMetric] = useState<'revenue' | 'margin'>('revenue')
  const [a, setA] = useState('India')
  const [b, setB] = useState('Thailand')
  if (!data) return <Loading />

  const cur = totals(sales), prev = totals(prevSales)
  const agg = sumBy(sales, dimKey[dim])
  const months = monthsFor(filters.preset)
  const series = (name: string) => ({
    name, type: 'line', smooth: true,
    data: months.map((m) => scoped.filter((s) => SEGMENTS[name](s) && monthKey(s.date) === m).reduce((x, s) => x + s[metric], 0)),
  })
  const A = totals(scoped.filter(SEGMENTS[a])), B = totals(scoped.filter(SEGMENTS[b]))
  const noPrev = filters.preset === 'all' || prev.count < cur.count * 0.3

  return (
    <Page title="Revenue & comparison" sub="Click any bar to drill into a destination; compare any two segments head-to-head.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={money(cur.revenue, true)} delta={noPrev ? undefined : pctDelta(cur.revenue, prev.revenue)} />
        <Stat label="Margin" value={money(cur.margin, true)} delta={noPrev ? undefined : pctDelta(cur.margin, prev.margin)} />
        <Stat label="Avg sale" value={money(cur.count ? cur.revenue / cur.count : 0)} />
        <Stat label="Transactions" value={String(cur.count)} delta={noPrev ? undefined : pctDelta(cur.count, prev.count)} />
      </div>

      <Card
        title={`${metric === 'revenue' ? 'Revenue' : 'Margin'} by ${dim.toLowerCase()}`}
        right={<div className="flex min-w-0 max-w-full flex-wrap gap-2"><Seg options={DIMS} value={dim} onChange={setDim} /><Seg options={['revenue', 'margin'] as const} value={metric} onChange={setMetric} /></div>}
      >
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
        {dim === 'Destination' && <p className="text-xs text-slate-500">Tip: click a destination bar to filter the entire app to it.</p>}
      </Card>

      <Card
        title="Head-to-head"
        right={
          <div className="flex w-full items-center gap-2 text-sm sm:w-auto">
            <select className={`${inp} flex-1`} value={a} onChange={(e) => setA(e.target.value)}>{Object.keys(SEGMENTS).map((k) => <option key={k}>{k}</option>)}</select>
            <span>vs</span>
            <select className={`${inp} flex-1`} value={b} onChange={(e) => setB(e.target.value)}>{Object.keys(SEGMENTS).map((k) => <option key={k}>{k}</option>)}</select>
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
          {[[a, A], [b, B]].map(([n, t]) => (
            <div key={n as string} className="rounded-xl bg-slate-50 p-3">
              <div className="font-medium">{n as string}</div>
              <div>{money((t as ReturnType<typeof totals>).revenue)} revenue · {money((t as ReturnType<typeof totals>).margin)} margin</div>
              <div className="text-slate-500">{(t as ReturnType<typeof totals>).count} sales · {(((t as ReturnType<typeof totals>).margin / ((t as ReturnType<typeof totals>).revenue || 1)) * 100).toFixed(1)}% margin</div>
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
    </Page>
  )
}
