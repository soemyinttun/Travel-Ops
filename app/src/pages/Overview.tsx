import { Link } from 'react-router-dom'
import { useApp } from '../state'
import { monthKey, monthsFor, pctDelta, presetLabel, sumBy, totals } from '../analytics'
import { Card, Chart, Loading, daysBetween, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { Chip, Hint, IconTile, PageHead, ProgressRow, RecordCard, SectionLabel, StatTile, type Tone } from '../components/kit'
import { SERVICES } from '../types'

const SERVICE_TONE: Record<string, Tone> = { Package: 'brand', Visa: 'amber', Passport: 'indigo', 'Air ticket': 'rose' }

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

  const byService = sumBy(sales, (s) => s.service).sort((a, b) => b.revenue - a.revenue)
  const topRevenue = byService[0]?.revenue ?? 0
  const marginPct = cur.revenue ? (cur.margin / cur.revenue) * 100 : 0
  const alerts = overdue.length + passportRisk.length

  const pipelines = [
    ['Visa open', data.visas.filter((c) => !['Approved', 'Delivered', 'Rejected'].includes(c.stage)).length, '/visa'],
    ['Passport open', data.passports.filter((c) => !['Ready', 'Collected'].includes(c.stage)).length, '/passport'],
    ['Trips in 14 days', soon.length, '/trips'],
  ] as const

  return (
    <div className="space-y-4">
      <PageHead eyebrow={presetLabel(filters.preset)} title="Overview"
        sub={`${filters.service === 'All' ? 'All services' : filters.service}${filters.dest ? ' · ' + filters.dest : ''}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Revenue" value={money(cur.revenue, true)} icon="revenue" tone="brand" delta={noPrev ? undefined : pctDelta(cur.revenue, prev.revenue)} note={noPrev ? undefined : 'vs last period'} />
        <StatTile label="Gross margin" value={money(cur.margin, true)} icon="overview" tone="emerald" delta={noPrev ? undefined : pctDelta(cur.margin, prev.margin)} note={`${marginPct.toFixed(1)}% of revenue`} />
        <StatTile label="Sales" value={String(cur.count)} icon="bookings" tone="indigo" delta={noPrev ? undefined : pctDelta(cur.count, prev.count)} note={noPrev ? undefined : 'vs last period'} />
        <StatTile label="Needs action" value={alerts ? `${alerts}` : '0'} icon="alert" tone={alerts ? 'rose' : 'slate'} note={alerts ? 'see alerts below' : 'all clear'} />
      </div>

      <Card title="Pipelines">
        <div className="grid grid-cols-3 gap-2">
          {pipelines.map(([l, n, to]) => (
            <Link key={l} to={to} className="rounded-xl bg-brand-mist p-3 text-center transition active:scale-95 hover:bg-indigo-soft/50">
              <div className="num text-2xl font-bold text-brand">{n}</div><div className="text-xs font-medium text-slate-600">{l}</div>
            </Link>
          ))}
        </div>
      </Card>

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
        <Card title="Revenue by service (tap to filter)">
          <div className="space-y-3">
            {byService.map((a) => (
              <button key={a.key} className="block w-full text-left" onClick={() => setFilters({ service: a.key as never })}>
                <ProgressRow label={a.key} value={money(a.revenue, true)} pct={topRevenue ? (a.revenue / topRevenue) * 100 : 0}
                  tone={SERVICE_TONE[a.key] ?? 'brand'} right={`${cur.revenue ? ((a.revenue / cur.revenue) * 100).toFixed(0) : 0}%`} />
              </button>
            ))}
            {!byService.length && <p className="text-sm text-slate-400">No sales in this period.</p>}
          </div>
        </Card>
      </div>

      <section className="space-y-2">
        <SectionLabel tone="rose" right={alerts ? <Chip tone="rose">{alerts} to check</Chip> : undefined}>Action required</SectionLabel>
        {overdue.length > 0 && (
          <RecordCard urgent>
            <div className="flex items-start gap-3">
              <IconTile name="alert" tone="rose" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{overdue.length} visa / passport {overdue.length === 1 ? 'case is' : 'cases are'} past the deadline</div>
                <p className="text-sm text-slate-500">Move them on, or call the customer.</p>
              </div>
            </div>
            <Link to="/visa" className="inline-flex items-center gap-2 rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white active:scale-95">Open cases <Icon name="chevron" className="h-4 w-4" /></Link>
          </RecordCard>
        )}
        {passportRisk.length > 0 && (
          <RecordCard>
            <div className="flex items-start gap-3">
              <IconTile name="passport" tone="amber" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{passportRisk.length} {passportRisk.length === 1 ? 'traveller has' : 'travellers have'} a passport valid under 6 months at departure</div>
                <p className="truncate text-sm text-slate-500">{passportRisk.slice(0, 3).map(({ c }) => c.name).join(', ')}{passportRisk.length > 3 ? '…' : ''}</p>
              </div>
            </div>
            <Link to="/customers" className="inline-flex items-center gap-2 rounded-xl bg-indigo-soft/60 px-4 py-2 text-sm font-semibold text-brand active:scale-95">Check customers <Icon name="chevron" className="h-4 w-4" /></Link>
          </RecordCard>
        )}
        {!alerts && <Hint icon="check" tone="emerald" title="All clear">No visa or passport deadlines missed, and every upcoming passport is valid.</Hint>}
      </section>

      <Card title={`Upcoming departures (${soon.length})`} right={<Link to="/trips" className="text-sm font-semibold text-brand">Open trips</Link>}>
        <ul className="divide-y divide-line text-sm">
          {soon.slice(0, 5).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate"><b className="font-semibold text-ink">{custName.get(b.customerId)}</b> · {pkg.get(b.packageId)?.name}</span>
              <Chip tone="brand">{b.departDate.slice(5)}</Chip>
            </li>
          ))}
          {!soon.length && <li className="py-2 text-slate-400">No confirmed trips in the next 14 days.</li>}
        </ul>
      </Card>
    </div>
  )
}
