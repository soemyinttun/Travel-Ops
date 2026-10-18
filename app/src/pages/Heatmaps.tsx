import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { useApp } from '../state'
import { inRange, monthKey, monthsFor, rangeFor } from '../analytics'
import { DESTINATIONS, ORIGINS } from '../types'
import { Card, Chart, Loading, Page, Seg } from '../components/ui'

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

  return (
    <Page
      title="Heatmaps"
      sub="Where travellers want to go and where they come from. Click a destination bubble to filter the whole app."
      right={<div className="flex min-w-0 max-w-full flex-wrap gap-2"><Seg options={['Destinations', 'Origins'] as const} value={mode} onChange={setMode} /><Seg options={['Enquiries', 'Bookings', 'Revenue'] as const} value={metric} onChange={setMetric} /></div>}
    >
      <Card title={`${mode} — ${metric.toLowerCase()}`}>
        <div ref={el} className="h-[420px] w-full overflow-hidden rounded-2xl" />
        <p className="mt-2 text-xs text-slate-500">Map tiles load online and are cached for offline reuse once viewed; heat and bubbles always render offline.</p>
      </Card>
      <div className="grid gap-3 xl:grid-cols-2">
        <Card title="Demand by month × package (non-cancelled bookings)">
          <Chart height={380} option={hm(months, data.packages.map((p) => p.name), grid, gmax, 45)} />
        </Card>
        <Card title="Origin township × destination (confirmed trips)">
          <Chart height={380} option={hm(dests, origs, od, omax, 45)} />
        </Card>
      </div>
    </Page>
  )
}
