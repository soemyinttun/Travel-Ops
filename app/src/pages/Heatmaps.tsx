import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { useApp } from '../state'
import { inRange, monthKey, monthsFor, rangeFor } from '../analytics'
import { DESTINATIONS, ORIGINS } from '../types'
import { Card, Chart, Loading, Seg } from '../components/ui'
import { Chip, PageHead } from '../components/kit'

type Mode = 'Destinations' | 'Origins'
type Metric = 'Enquiries' | 'Bookings' | 'Revenue'

export default function Heatmaps() {
  const { data, filters, setFilters, money } = useApp()
  const [mode, setMode] = useState<Mode>('Destinations')
  const [metric, setMetric] = useState<Metric>('Bookings')
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const [width, setWidth] = useState(0)
  const [cell, setCell] = useState<{ title: string; lines: string[] } | null>(null)

  const r = rangeFor(filters.preset)
  const rows = useMemo(() => {
    if (!data) return []
    const pkg = new Map(data.packages.map((p) => [p.id, p]))
    const cust = new Map(data.customers.map((c) => [c.id!, c]))
    return data.bookings.filter((b) => inRange(b.createdAt, r) && b.status !== 'cancelled').map((b) => {
      const won = b.status === 'confirmed' || b.status === 'completed'
      return { b, won, rev: won ? (pkg.get(b.packageId)?.price ?? 0) * b.pax : 0, origin: cust.get(b.customerId)?.township ?? '', stops: pkg.get(b.packageId)?.stops ?? [b.destination] }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters.preset])

  const value = (x: (typeof rows)[number]) => (metric === 'Enquiries' ? 1 : metric === 'Bookings' ? (x.won ? 1 : 0) : x.rev)
  const points = useMemo(() => {
    const places = mode === 'Destinations' ? DESTINATIONS : ORIGINS
    // A trip counts at every stop on its itinerary, so the map shows the whole circuit.
    const visits = (x: (typeof rows)[number], place: string) => (mode === 'Destinations' ? x.stops.includes(place) : x.origin === place)
    return places.map((p) => ({ p, v: rows.filter((x) => visits(x, p.name)).reduce((s, x) => s + value(x), 0) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mode, metric])

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { center: [22, 88], zoom: 5, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 10, attribution: '© OpenStreetMap' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    const ro = new ResizeObserver(() => { m.invalidateSize(); setWidth(el.current?.clientWidth ?? 0) })
    ro.observe(el.current)
    return () => { ro.disconnect(); m.remove(); map.current = null }
  }, [])

  useEffect(() => {
    const m = map.current, g = layer.current
    if (!m || !g || width === 0) return
    m.invalidateSize()
    g.clearLayers()
    const max = Math.max(1, ...points.map((x) => x.v))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(L as any).heatLayer(points.filter((x) => x.v > 0).map((x) => [x.p.lat, x.p.lng, x.v / max]), { radius: 38, blur: 28, maxZoom: 8, max: 1 }).addTo(g)
    for (const { p, v } of points) {
      const sel = mode === 'Destinations' && filters.dest === p.name
      const c = L.circleMarker([p.lat, p.lng], { radius: 5 + 11 * (v / max), color: sel ? '#b45309' : '#0f766e', weight: sel ? 3 : 1.5, fillOpacity: 0.25 })
      c.bindTooltip(`${p.name}: ${metric === 'Revenue' ? money(v) : v}`)
      if (mode === 'Destinations') c.on('click', () => setFilters({ dest: filters.dest === p.name ? null : p.name }))
      c.addTo(g)
    }
    const b = L.latLngBounds(points.map((x) => [x.p.lat, x.p.lng] as [number, number]))
    m.fitBounds(b, { padding: [30, 30], maxZoom: 7 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, filters.dest, mode, width])

  if (!data) return <Loading />
  const months = monthsFor(filters.preset)
  const pkgIds = data.packages.map((p) => p.id)
  const grid: [number, number, number][] = []
  let gmax = 1
  pkgIds.forEach((id, y) => months.forEach((mo, x) => {
    const n = data.bookings.filter((b) => b.packageId === id && b.status !== 'cancelled' && monthKey(b.createdAt) === mo).length
    gmax = Math.max(gmax, n); grid.push([x, y, n])
  }))
  const dests = DESTINATIONS.map((d) => d.name).filter((d) => rows.some((z) => z.won && z.b.destination === d))
  const origs = ORIGINS.map((o) => o.name)
  const od: [number, number, number][] = []
  let omax = 1
  origs.forEach((o, y) => dests.forEach((d, x) => {
    const n = rows.filter((z) => z.origin === o && z.b.destination === d && z.won).length
    omax = Math.max(omax, n); od.push([x, y, n])
  }))

  const hm = (xs: string[], ys: string[], data: [number, number, number][], max: number, rot = 0) => ({
    tooltip: { position: 'top' },
    grid: { left: 8, right: 8, top: 8, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: xs, splitArea: { show: true }, axisLabel: { rotate: rot, interval: 0 } },
    yAxis: { type: 'category', data: ys, splitArea: { show: true }, inverse: true },
    visualMap: { min: 0, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#f0fdfa', '#5eead4', '#0f766e', '#134e4a'] } },
    series: [{ type: 'heatmap', data, label: { show: true, fontSize: 10 }, emphasis: { itemStyle: { shadowBlur: 8 } } }],
  })

  const pkgById = new Map(data.packages.map((p) => [p.id, p]))
  const inspectDemand = (p: { data?: number[] }) => {
    const [x, y] = p.data ?? []
    const month = months[x!], pk = data.packages[y!]
    if (month === undefined || !pk) return
    const bs = data.bookings.filter((b) => b.packageId === pk.id && b.status !== 'cancelled' && monthKey(b.createdAt) === month)
    const won = bs.filter((b) => b.status === 'confirmed' || b.status === 'completed')
    const pax = won.reduce((s, b) => s + b.pax, 0)
    setCell({ title: `${pk.name} · ${month}`, lines: [`${bs.length} enquiries and bookings`, `${won.length} booked, ${pax} travellers`, `Revenue ${money(pax * (pkgById.get(pk.id)?.price ?? 0))}`] })
  }
  const inspectFlow = (p: { data?: number[] }) => {
    const [x, y] = p.data ?? []
    const dest = dests[x!], origin = origs[y!]
    if (!dest || !origin) return
    const hits = rows.filter((z) => z.origin === origin && z.b.destination === dest && z.won)
    setCell({ title: `${origin} to ${dest}`, lines: [`${hits.length} confirmed trips`, `${hits.reduce((s, z) => s + z.b.pax, 0)} travellers`, `Revenue ${money(hits.reduce((s, z) => s + z.rev, 0))}`] })
  }
  const total = points.reduce((x, p) => x + p.v, 0)
  const lead = [...points].sort((x, y) => y.v - x.v)[0]
  const fmt = (v: number) => (metric === 'Revenue' ? money(v, true) : String(v))

  return (
    <div className="space-y-4">
      <PageHead eyebrow="Analytics" title="Heatmaps" sub="Where travellers want to go and where they come from. Tap a destination bubble to filter the whole app." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">View
          <div className="mt-1"><Seg options={['Destinations', 'Origins'] as const} value={mode} onChange={setMode} /></div>
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Count
          <div className="mt-1"><Seg options={['Enquiries', 'Bookings', 'Revenue'] as const} value={metric} onChange={setMetric} /></div>
        </div>
      </div>

      {lead && lead.v > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-sky-soft/60 p-3 sm:p-4">
          <Chip tone="brand">Top {mode === 'Destinations' ? 'destination' : 'origin'}</Chip>
          <p className="min-w-0 flex-1 text-sm text-ink"><b>{lead.p.name}</b> leads with <b className="num">{fmt(lead.v)}</b> ({metric.toLowerCase()}), {total ? Math.round((lead.v / total) * 100) : 0}% of all counted visits.</p>
        </div>
      )}

      <Card title={`${mode} — ${metric.toLowerCase()}`}>
        <div ref={el} className="h-[360px] w-full overflow-hidden rounded-2xl sm:h-[420px]" />
        <p className="mt-2 text-xs text-slate-500">Map tiles load online and are cached for offline reuse once viewed; heat and bubbles always render offline.</p>
      </Card>
      {cell && (
        <div className="rounded-2xl bg-sky-soft/50 p-3 sm:p-4" role="status">
          <div className="flex items-center justify-between gap-2"><div className="text-[11px] font-semibold uppercase tracking-wider text-brand">Cell inspection</div><button className="text-xs font-semibold text-slate-500" onClick={() => setCell(null)}>Clear</button></div>
          <div className="mt-1 text-base font-bold text-ink">{cell.title}</div>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-2">{cell.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
      <p className="px-1 text-xs text-slate-500">Tap a cell in either grid to see the numbers behind it.</p>
      <div className="grid gap-3 xl:grid-cols-2">
        <Card title="Demand by month × package (non-cancelled bookings)" right={<span className="text-xs text-slate-500">scroll sideways on a phone</span>}>
          <div className="overflow-x-auto"><div className="min-w-[560px]"><Chart height={380} onClick={inspectDemand} option={hm(months, data.packages.map((p) => p.name), grid, gmax, 45)} /></div></div>
        </Card>
        <Card title="Origin town × destination (confirmed trips)" right={<span className="text-xs text-slate-500">scroll sideways on a phone</span>}>
          <div className="overflow-x-auto"><div className="min-w-[560px]"><Chart height={380} onClick={inspectFlow} option={hm(dests, origs, od, omax, 45)} /></div></div>
        </Card>
      </div>
    </div>
  )
}
