import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state'
import { useAuth } from '../auth/AuthProvider'
import { loadShowcaseData } from '../seed'
import { computeAlerts } from '../alerts'
import { monthKey, monthsFor, pctDelta, presetLabel, sumBy, totals } from '../analytics'
import { Card, Chart, Loading, daysBetween, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { Chip, Donut, Hint, IconTile, PageHead, RecordCard, SectionLabel, SegmentBar, StatTile, type Tone } from '../components/kit'
import { smsLink } from '../contact'
import { SERVICES, type BookingStatus } from '../types'

const SERVICE_TONE: Record<string, Tone> = { Package: 'brand', Visa: 'amber', Passport: 'indigo', 'Air ticket': 'rose' }
const MARKET_TONES: Tone[] = ['brand', 'indigo', 'amber', 'sky', 'rose', 'slate']
const STAGES: { status: BookingStatus; label: string; tone: Tone }[] = [
  { status: 'enquiry', label: 'Enquiry', tone: 'slate' }, { status: 'confirmed', label: 'Confirmed', tone: 'brand' },
  { status: 'completed', label: 'Completed', tone: 'emerald' }, { status: 'cancelled', label: 'Cancelled', tone: 'rose' },
]

export default function Overview() {
  const { data, sales, prevSales, scoped, money, filters, setFilters } = useApp()
  const { mode } = useAuth()
  const [mix, setMix] = useState<string | null>(null)
  const [market, setMarket] = useState<string | null>(null)
  if (!data) return <Loading />
  if (!data.customers.length && mode === 'local') {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-6">
        <PageHead eyebrow="Welcome" title="No data on this device yet" sub="Load made-up presentation data to see every screen, or import a backup in Admin." />
        <button className="w-full rounded-xl bg-brand-solid px-4 py-3 text-sm font-semibold text-white transition active:scale-95 hover:bg-brand-deep" onClick={() => void loadShowcaseData().then(() => setFilters({ preset: '12m', service: 'All', dest: null }))}>Load presentation demo</button>
      </div>
    )
  }
  const cur = totals(sales), prev = totals(prevSales)
  const noPrev = filters.preset === 'all' || prev.count < cur.count * 0.3
  const months = monthsFor(filters.preset)
  const t = today()
  const alerts = computeAlerts(data, t)
  const custName = new Map(data.customers.map((c) => [c.id!, c.name]))
  const pkg = new Map(data.packages.map((p) => [p.id, p]))
  const marginPct = cur.revenue ? (cur.margin / cur.revenue) * 100 : 0

  const active = data.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= t && daysBetween(t, b.departDate) <= 45)
  const pax = active.reduce((s, b) => s + b.pax, 0)
  const stageCount = (s: BookingStatus) => data.bookings.filter((b) => b.status === s).length
  const maxStage = Math.max(1, ...STAGES.map((s) => stageCount(s.status)))

  // Revenue mix: one month at a time, last 3 months of the range that have data.
  const mixMonths = months.slice(-3)
  const mixMonth = mix && mixMonths.includes(mix) ? mix : mixMonths[mixMonths.length - 1] ?? ''
  const mixSales = scoped.filter((s) => monthKey(s.date) === mixMonth)
  const mixItems = SERVICES.map((s) => ({ label: s, value: mixSales.filter((x) => x.service === s).reduce((a, x) => a + x.revenue, 0), tone: SERVICE_TONE[s]! }))
  const mixTotal = mixItems.reduce((s, i) => s + i.value, 0)

  // Market breakdown by country, top 5 and "Other".
  const byCountry = sumBy(sales, (s) => s.country).sort((a, b) => b.revenue - a.revenue)
  const topMarkets = byCountry.slice(0, 5)
  const otherRev = byCountry.slice(5).reduce((s, a) => s + a.revenue, 0)
  const marketItems = [...topMarkets.map((a, i) => ({ label: a.key, value: a.revenue, tone: MARKET_TONES[i]!, count: a.count })), ...(otherRev ? [{ label: 'Other', value: otherRev, tone: 'slate' as Tone, count: 0 }] : [])]
  const marketTotal = marketItems.reduce((s, i) => s + i.value, 0)
  const picked = marketItems.find((m) => m.label === market)

  return (
    <div className="space-y-4">
      <PageHead eyebrow={presetLabel(filters.preset)} title="Overview"
        sub={`${filters.service === 'All' ? 'All services' : filters.service}${filters.dest ? ' · ' + filters.dest : ''}`}
        action={<Chip tone="emerald">{mode === 'cloud' ? 'Live sync' : 'On this device'}</Chip>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total revenue" value={money(cur.revenue, true)} icon="revenue" tone="brand" delta={noPrev ? undefined : pctDelta(cur.revenue, prev.revenue)} note={noPrev ? `${marginPct.toFixed(1)}% margin` : 'vs last period'} />
        <StatTile label="Active trips" value={String(active.length)} icon="compass" tone="indigo" note="confirmed, next 45 days" />
        <StatTile label="Travellers" value={`${pax} pax`} icon="people" tone="sky" note="on those trips" />
        <StatTile label="Needs action" value={alerts.total ? `${alerts.total}` : '0'} icon="alert" tone={alerts.total ? 'rose' : 'slate'} note={alerts.total ? 'see below' : 'all clear'} />
      </div>

      <Card title="Booking pipeline" right={<Link to="/bookings" className="text-sm font-semibold text-brand">Open bookings</Link>}>
        <div className="grid grid-cols-4 gap-2">
          {STAGES.map((s) => (
            <Link key={s.status} to={`/bookings?status=${s.status}`} className="rounded-xl bg-slate-50 p-2.5 text-center transition active:scale-95 hover:bg-brand-mist">
              <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
              <div className="num text-xl font-bold text-ink">{stageCount(s.status)}</div>
              <div className="mx-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${s.tone === 'slate' ? 'bg-slate-500' : s.tone === 'brand' ? 'bg-brand-solid' : s.tone === 'emerald' ? 'bg-emerald' : 'bg-rose'}`} style={{ width: `${(stageCount(s.status) / maxStage) * 100}%` }} /></div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Revenue mix" right={
          <div className="flex rounded-lg bg-indigo-soft/50 p-0.5" role="tablist">
            {mixMonths.map((m) => (
              <button key={m} role="tab" aria-selected={m === mixMonth} onClick={() => setMix(m)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${m === mixMonth ? 'bg-brand-solid text-white' : 'text-ink-2'}`}>{m.slice(2)}</button>
            ))}
          </div>}>
          <div className="mb-3 flex items-baseline justify-between"><span className="num text-2xl font-bold text-ink">{money(mixTotal, true)}</span><span className="text-xs text-slate-500">revenue in {mixMonth || 'this period'}</span></div>
          {mixTotal > 0 ? <SegmentBar items={mixItems} format={(v) => money(v, true)} /> : <p className="text-sm text-slate-400">No sales in this month.</p>}
        </Card>

        <Card title="Market breakdown" right={<span className="text-xs text-slate-500">Top 5 + other</span>}>
          {marketItems.length > 0 ? (
            <div className="flex items-center gap-4">
              <Donut items={marketItems} center={picked ? <><span className="text-sm font-bold text-ink">{marketTotal ? Math.round((picked.value / marketTotal) * 100) : 0}%</span><span className="max-w-[4.5rem] truncate text-[11px] text-slate-500">{picked.label}</span></> : <><span className="num text-sm font-bold text-ink">{marketItems.length}</span><span className="text-[11px] text-slate-500">markets</span></>} />
              <ul className="min-w-0 flex-1 space-y-1">
                {marketItems.map((m) => (
                  <li key={m.label}>
                    <button onClick={() => setMarket(market === m.label ? null : m.label)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${market === m.label ? 'bg-brand-mist' : 'hover:bg-slate-50'}`}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: { brand: '#0f766e', amber: '#f59e0b', rose: '#e11d48', emerald: '#10b981', indigo: '#6366f1', sky: '#0ea5e9', slate: '#64748b' }[m.tone] }} />
                      <span className="min-w-0 flex-1 truncate text-left font-medium text-ink">{m.label}</span>
                      <span className="num text-slate-500">{marketTotal ? Math.round((m.value / marketTotal) * 100) : 0}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="text-sm text-slate-400">No sales in this period.</p>}
          {picked && <div className="mt-3 rounded-xl bg-sky-soft/50 p-3 text-sm"><b className="text-ink">{picked.label}</b>: <span className="num">{money(picked.value)}</span>{picked.count ? ` from ${picked.count} sales` : ''}.</div>}
        </Card>
      </div>

      <Card title="Monthly revenue by service">
        <Chart
          height={280}
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

      <section className="space-y-2">
        <SectionLabel tone="rose" right={alerts.total ? <Chip tone="rose">{alerts.total} pending</Chip> : undefined}>Action required</SectionLabel>
        {alerts.overdue.slice(0, 3).map((c) => {
          const cust = data.customers.find((x) => x.id === c.customerId)
          return (
            <RecordCard key={c.id} urgent>
              <div className="flex items-start gap-3">
                <IconTile name="alert" tone="rose" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">{c.type} case overdue</span><Chip tone="rose">{-daysBetween(t, c.deadline!)} days late</Chip></div>
                  <p className="text-sm text-slate-500">{custName.get(c.customerId) ?? 'Customer'} · {c.kind} · step: {c.stage}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={c.type === 'Visa' ? '/visa' : '/passport'} className="inline-flex items-center gap-2 rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white transition active:scale-95">View case <Icon name="chevron" className="h-4 w-4" /></Link>
                {cust?.phone && <a className="inline-flex items-center gap-2 rounded-xl bg-indigo-soft/60 px-4 py-2 text-sm font-semibold text-brand transition active:scale-95" href={smsLink(cust.phone, `Hello ${cust.name}, this is SSM Travel & Tours about your ${c.type.toLowerCase()} (${c.kind}). Please send any missing documents.`)}>Send ping</a>}
              </div>
            </RecordCard>
          )
        })}
        {alerts.passportRisk.slice(0, 3).map(({ booking, customer }) => (
          <RecordCard key={booking.id}>
            <div className="flex items-start gap-3">
              <IconTile name="passport" tone="amber" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">Passport expiry alert</span><Chip tone="amber">{customer.name}</Chip></div>
                <p className="text-sm text-slate-500">Valid until {customer.passportExpiry}, less than 6 months after departure on {booking.departDate} ({pkg.get(booking.packageId)?.name}).</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/customers/${customer.id}`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-soft/60 px-4 py-2 text-sm font-semibold text-brand transition active:scale-95">View record <Icon name="chevron" className="h-4 w-4" /></Link>
              {customer.phone && <a className="inline-flex items-center gap-2 rounded-xl bg-indigo-soft/60 px-4 py-2 text-sm font-semibold text-brand transition active:scale-95" href={smsLink(customer.phone, `Hello ${customer.name}, this is SSM Travel & Tours. Your passport expires on ${customer.passportExpiry}, less than 6 months after your trip on ${booking.departDate}. Please renew it.`)}>Send ping</a>}
            </div>
          </RecordCard>
        ))}
        {!alerts.total && <Hint icon="check" tone="emerald" title="All clear">No visa or passport deadlines missed, and every upcoming passport is valid.</Hint>}
      </section>

      <Card title={`Upcoming departures (${alerts.soon.length})`} right={<Link to="/trips" className="text-sm font-semibold text-brand">Open trips</Link>}>
        <ul className="divide-y divide-line text-sm">
          {alerts.soon.slice(0, 5).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate"><b className="font-semibold text-ink">{custName.get(b.customerId)}</b> · {pkg.get(b.packageId)?.name}</span>
              <Chip tone="brand">{b.departDate.slice(5)}</Chip>
            </li>
          ))}
          {!alerts.soon.length && <li className="py-2 text-slate-400">No confirmed trips in the next 14 days.</li>}
        </ul>
      </Card>
    </div>
  )
}
