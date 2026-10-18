import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { DESTINATIONS, type BookingStatus } from '../types'
import { Card, Loading, Page, btn, formGrid, inp, today } from '../components/ui'
import { CustomerSelect } from '../components/CustomerSelect'

const STATUSES: BookingStatus[] = ['enquiry', 'confirmed', 'completed', 'cancelled']
const BADGE: Record<BookingStatus, string> = { enquiry: 'bg-slate-200', confirmed: 'bg-teal-100', completed: 'bg-emerald-100', cancelled: 'bg-rose-100' }

export default function Bookings() {
  const { data, money } = useApp()
  const [f, setF] = useState({ customerId: '', packageId: 'IN8', destination: 'Bodh Gaya', departDate: today(), pax: 2, status: 'enquiry' as BookingStatus })
  const [q, setQ] = useState('')
  if (!data) return <Loading />
  const pkg = new Map(data.packages.map((p) => [p.id, p]))
  const name = new Map(data.customers.map((c) => [c.id!, c.name]))
  const country = pkg.get(f.packageId)?.country
  const dests = DESTINATIONS.filter((d) => d.country === country)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.customerId === '') return
    await store.create('bookings', { ...f, createdAt: today() })
    setF({ ...f, customerId: '' })
  }
  const rows = data.bookings
    .filter((b) => !q || (name.get(b.customerId) ?? '').toLowerCase().includes(q.toLowerCase()) || b.destination.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40)

  return (
    <Page title="Bookings" sub="Create enquiries and move them to confirmed. Works fully offline.">
      <Card title="New booking / enquiry">
        <form onSubmit={add} className={formGrid}>
          <CustomerSelect value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} />
          <select className={inp} value={f.packageId} onChange={(e) => { const c = pkg.get(e.target.value)!.country; setF({ ...f, packageId: e.target.value, destination: DESTINATIONS.find((d) => d.country === c)!.name }) }}>
            {data.packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
          </select>
          <select className={inp} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })}>{dests.map((d) => <option key={d.name}>{d.name}</option>)}</select>
          <input className={inp} type="date" value={f.departDate} onChange={(e) => setF({ ...f, departDate: e.target.value })} />
          <input className={`${inp} w-20`} type="number" min={1} value={f.pax} onChange={(e) => setF({ ...f, pax: Math.max(1, +e.target.value) })} aria-label="Travellers" />
          <select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as BookingStatus })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <button className={btn}>Add</button>
        </form>
      </Card>
      <Card title="Recent bookings" right={<input className={`${inp} w-full sm:w-64`} placeholder="Search name or destination" value={q} onChange={(e) => setQ(e.target.value)} />}>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Created</th><th>Customer</th><th>Package</th><th>Dest.</th><th>Departs</th><th>Pax</th><th>Value</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="py-1.5">{b.createdAt}</td><td>{name.get(b.customerId)}</td><td>{pkg.get(b.packageId)?.name}</td><td>{b.destination}</td><td>{b.departDate}</td><td>{b.pax}</td>
              <td>{money((pkg.get(b.packageId)?.price ?? 0) * b.pax)}</td>
              <td><select className={`${inp} ${BADGE[b.status]}`} value={b.status} onChange={(e) => store.patch('bookings', b.id, { status: e.target.value as BookingStatus })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><button aria-label="Delete booking" className="px-2 text-sm text-slate-500 hover:text-rose-600" onClick={() => confirm('Delete this booking?') && store.remove('bookings', b.id)}>Delete</button></td>
            </tr>))}</tbody></table></div>
      </Card>
    </Page>
  )
}
