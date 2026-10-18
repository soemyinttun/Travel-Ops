import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { ORIGINS } from '../types'
import { Card, Loading, Page, btn, daysBetween, formGrid, inp, today } from '../components/ui'

export default function Customers() {
  const { data } = useApp()
  const [q, setQ] = useState('')
  const [f, setF] = useState({ name: '', phone: '', township: 'Yangon', passportExpiry: '' })
  if (!data) return <Loading />
  const t = today()
  const rows = data.customers.filter((c) => !q || (c.name + c.phone + c.township).toLowerCase().includes(q.toLowerCase())).slice(0, 60)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return
    await store.create('customers', { ...f, name: f.name.trim() })
    setF({ ...f, name: '', phone: '', passportExpiry: '' })
  }
  const remove = async (id: string) => {
    const used = data.bookings.some((b) => b.customerId === id) || data.visas.some((v) => v.customerId === id) || data.passports.some((v) => v.customerId === id) || data.tickets.some((v) => v.customerId === id)
    if (used) return alert('This customer has bookings or cases and cannot be deleted.')
    if (confirm('Delete customer?')) await store.remove('customers', id)
  }

  return (
    <Page title="Customers" sub={`${data.customers.length} customers`}>
      <Card title="Add customer">
        <form onSubmit={add} className={formGrid}>
          <input className={inp} required placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="Phone" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <select className={inp} value={f.township} onChange={(e) => setF({ ...f, township: e.target.value })}>{ORIGINS.map((o) => <option key={o.name}>{o.name}</option>)}</select>
          <label className="flex flex-wrap items-center gap-1 text-sm text-slate-500">Passport expiry<input className={inp} type="date" value={f.passportExpiry} onChange={(e) => setF({ ...f, passportExpiry: e.target.value })} /></label>
          <button className={btn}>Add</button>
        </form>
      </Card>
      <Card title="Directory" right={<input className={`${inp} w-full sm:w-64`} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Name</th><th>Phone</th><th>Origin</th><th>Passport expiry</th><th /></tr></thead>
          <tbody>{rows.map((c) => {
            const left = c.passportExpiry ? daysBetween(t, c.passportExpiry) : null
            return (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-1.5 font-medium">{c.name}</td><td>{c.phone}</td><td>{c.township}</td>
                <td className={left === null ? '' : left < 0 ? 'text-rose-700' : left < 180 ? 'text-amber-700' : ''}>{c.passportExpiry || '—'}{left !== null && left < 0 ? ' (expired)' : left !== null && left < 180 ? ' (<6 mo)' : ''}</td>
                <td><button aria-label="Delete customer" className="px-2 text-sm text-slate-500 hover:text-rose-600" onClick={() => remove(c.id)}>Delete</button></td>
              </tr>
            )
          })}</tbody></table></div>
      </Card>
    </Page>
  )
}
