import { Link } from 'react-router-dom'
import { useApp } from '../state'
import { monthKey, monthsFor, pctDelta, presetLabel, sumBy, totals } from '../analytics'
import { Card, Chart, Loading, Page, Stat, daysBetween, today } from '../components/ui'
import { SERVICES } from '../types'

export default function Overview() {
  const { data, sales, prevSales, scoped, money, filters, setFilters } = useApp()
  if (!data) return <Loading />
  const cur = totals(sales), prev = totals(prevSales)
  const noPrev = filters.preset === 'all' || prev.count < cur.count * 0.3
  const months = monthsFor(filters.preset)
  const t = today()

  const custName = new Map(data.customers.map((c) => [c.id!, c.name]))
  const pkg = new Map(data.packages.map((p) => [p.id, p]))
  const soon = data.bookings
    .filter((b) => b.status === 'confirmed' && b.departDate >= t && daysBetween(t, b.departDate) <= 14)
    .sort((a, b) => a.departDate.localeCompare(b.departDate))
  const overdue = [...data.visas.map((c) => ({ ...c, t: 'Visa' })), ...data.passports.map((c) => ({ ...c, t: 'Passport' }))]
    .filter((c) => c.deadline && c.deadline < t && !['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected'].includes(c.stage))
  const passportRisk = data.bookings
    .filter((b) => b.status === 'confirmed' && b.departDate >= t)
    .map((b) => ({ b, c: data.customers.find((c) => c.id === b.customerId)! }))
    .filter(({ b, c }) => c && daysBetween(b.departDate, c.passportExpiry) < 180)

  const pipelines = [
    ['Visa open', data.visas.filter((c) => !['Approved', 'Delivered', 'Rejected'].includes(c.stage)).length, '/visa'],
    ['Passport open', data.passports.filter((c) => !['Ready', 'Collected'].includes(c.stage)).length, '/passport'],
    ['Trips ≤14d', soon.length, '/trips'],
  ] as const

  return (
    <Page title="Overview" sub={`Showing ${filters.service === 'All' ? 'all services' : filters.service}${filters.dest ? ' · ' + filters.dest : ''} · ${presetLabel(filters.preset)}`}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={money(cur.revenue, true)} delta={noPrev ? undefined : pctDelta(cur.revenue, prev.revenue)} />
        <Stat label="Gross margin" value={money(cur.margin, true)} delta={noPrev ? undefined : pctDelta(cur.margin, prev.margin)} />
        <Stat label="Margin %" value={`${cur.revenue ? ((cur.margin / cur.revenue) * 100).toFixed(1) : 0}%`} />
        <Stat label="Sales" value={String(cur.count)} delta={noPrev ? undefined : pctDelta(cur.count, prev.count)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Monthly revenue by service" className="lg:col-span-2">
          <Chart
            height={300}
            option={{
              tooltip: { trigger: 'axis', valueFormatter: (v: number) => money(v) },
              legend: { top: 0 },
              xAxis: { type: 'category', data: months },
              yAxis: { type: 'value', axisLabel: { formatter: (v: number) => money(v, true) } },
              series: SERVICES.map((s) => ({
                name: s, type: 'bar', stack: 'rev',
                data: months.map((m) => scoped.filter((x) => x.service === s && monthKey(x.date) === m).reduce((a, x) => a + x.revenue, 0)),
              })),
            }}
          />
        </Card>
        <Card title="Revenue by market (click to filter)">
          <Chart
            height={300}
            onClick={(p) => p.name && setFilters({ service: p.name as never })}
            option={{
              tooltip: { trigger: 'item', valueFormatter: (v: number) => money(v) },
              series: [{ type: 'pie', radius: ['45%', '72%'], data: sumBy(sales, (s) => s.service).map((a) => ({ name: a.key, value: a.revenue })) }],
            }}
          />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Pipelines">
          <div className="grid grid-cols-3 gap-2">
            {pipelines.map(([l, n, to]) => (
              <Link key={l} to={to} className="rounded-xl bg-slate-50 p-3 text-center hover:bg-teal-50">
                <div className="text-2xl font-semibold">{n}</div><div className="text-xs text-slate-500">{l}</div>
              </Link>
            ))}
          </div>
        </Card>
        <Card title={`Upcoming departures (${soon.length})`}>
          <ul className="space-y-1 text-sm">
            {soon.slice(0, 5).map((b) => (
              <li key={b.id} className="flex justify-between"><span>{custName.get(b.customerId)} · {pkg.get(b.packageId)?.name}</span><span className="text-slate-500">{b.departDate}</span></li>
            ))}
            {!soon.length && <li className="text-slate-400">No trips in the next 14 days</li>}
          </ul>
        </Card>
        <Card title="Alerts">
          <ul className="space-y-1 text-sm">
            <li className={overdue.length ? 'text-rose-700' : 'text-slate-400'}>{overdue.length} visa/passport cases past deadline</li>
            <li className={passportRisk.length ? 'text-amber-700' : 'text-slate-400'}>{passportRisk.length} upcoming travellers with passport valid &lt; 6 months at departure</li>
          </ul>
        </Card>
      </div>
    </Page>
  )
}
