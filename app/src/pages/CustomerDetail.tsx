import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as store from '../store'
import { useApp } from '../state'
import { Card, Loading, daysBetween, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { Avatar, Chip, Hint, PageHead, StatTile, Strip, type Tone } from '../components/kit'
import { EditCustomer } from '../components/EditDialogs'
import { smsLink, telLink } from '../contact'

const CASE_DONE = ['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected']
const STATUS_TONE: Record<string, Tone> = { enquiry: 'slate', confirmed: 'brand', completed: 'emerald', cancelled: 'rose' }

/** One person's full file: contact, passport, trips, visa and passport cases, tickets. */
export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, money } = useApp()
  const [editing, setEditing] = useState(false)
  if (!data) return <Loading />
  const c = data.customers.find((x) => x.id === id)
  if (!c) return <div className="space-y-3"><Link to="/customers" className="text-sm font-semibold text-brand">‹ Customers</Link><Hint icon="search" title="Customer not found">They may have been deleted.</Hint></div>

  const t = today()
  const pkg = new Map(data.packages.map((p) => [p.id, p]))
  const bookings = data.bookings.filter((b) => b.customerId === c.id).sort((a, b) => b.departDate.localeCompare(a.departDate))
  const visas = data.visas.filter((v) => v.customerId === c.id)
  const passports = data.passports.filter((v) => v.customerId === c.id)
  const tickets = data.tickets.filter((v) => v.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date))
  const won = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed')
  const spent = won.reduce((s, b) => s + (pkg.get(b.packageId)?.price ?? 0) * b.pax, 0) + [...visas, ...passports].filter((v) => CASE_DONE.includes(v.stage)).reduce((s, v) => s + v.fee, 0) + tickets.reduce((s, v) => s + v.fare, 0)
  const next = bookings.filter((b) => b.status === 'confirmed' && b.departDate >= t).sort((a, b) => a.departDate.localeCompare(b.departDate))[0]
  const open = [...visas, ...passports].filter((v) => !CASE_DONE.includes(v.stage)).length
  const left = c.passportExpiry ? daysBetween(t, c.passportExpiry) : null
  const state: [string, Tone] = left === null ? ['No passport date', 'slate'] : left < 0 ? ['Expired', 'rose'] : left < 180 ? [`Under 6 months · ${left} days`, 'amber'] : ['Valid', 'emerald']

  const remove = async () => {
    if (bookings.length || visas.length || passports.length || tickets.length) return alert('This customer has bookings or cases and cannot be deleted.')
    if (confirm('Delete customer?')) { await store.remove('customers', c.id); nav('/customers') }
  }
  const msg = left !== null && left < 180
    ? `Hello ${c.name}, this is SSM Travel & Tours. Your passport ${left < 0 ? 'has expired' : `expires on ${c.passportExpiry}`}. Please bring it to our office to renew before your next trip.`
    : next
      ? `Hello ${c.name}, this is SSM Travel & Tours. A reminder that your trip leaves on ${next.departDate}. Please contact us if you have any questions.`
      : `Hello ${c.name}, this is SSM Travel & Tours. Please contact us when you are ready to plan your next trip.`

  return (
    <div className="space-y-4">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><Icon name="chevron" className="h-4 w-4 rotate-180" />Customers</Link>
      <div className="flex items-start gap-3">
        <Avatar name={c.name} tone={state[1] === 'rose' ? 'rose' : state[1] === 'amber' ? 'amber' : 'brand'} />
        <div className="min-w-0 flex-1"><PageHead eyebrow="Client file" title={c.name} sub={`${c.township} · ID ${c.id.slice(0, 8).toUpperCase()}`} /></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {c.phone && <a className="inline-flex items-center gap-2 rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 hover:bg-brand-deep" href={telLink(c.phone)}>Call {c.phone}</a>}
        {c.phone && <a className="inline-flex items-center gap-2 rounded-xl bg-indigo-soft/60 px-4 py-2.5 text-sm font-semibold text-brand transition active:scale-95 hover:bg-indigo-soft" href={smsLink(c.phone, msg)}>Send message</a>}
        <button className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 transition active:scale-95 hover:bg-slate-50" onClick={() => setEditing(true)}><Icon name="edit" className="h-4 w-4" />Edit</button>
        <button className="inline-flex items-center gap-2 rounded-xl bg-rose-soft/60 px-4 py-2.5 text-sm font-semibold text-rose-ink transition active:scale-95 hover:bg-rose-soft" onClick={() => void remove()}><Icon name="trash" className="h-4 w-4" />Delete</button>
      </div>
      {!c.phone && <p className="text-sm text-slate-500">No phone number saved. Add one with Edit to call or message.</p>}

      <Strip tone={state[1] === 'rose' ? 'rose' : state[1] === 'amber' ? 'amber' : 'sky'}>
        <span className="inline-flex items-center gap-2 font-medium"><Icon name="passport" className="h-4 w-4" />Passport {c.passportExpiry || '(no date saved)'}</span>
        <Chip tone={state[1]}>{state[0]}</Chip>
      </Strip>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Trips" value={String(won.length)} icon="compass" tone="brand" note={`${bookings.length} bookings in all`} />
        <StatTile label="Total value" value={money(spent, true)} icon="revenue" tone="emerald" note="trips, cases, tickets" />
        <StatTile label="Open cases" value={String(open)} icon="visa" tone={open ? 'amber' : 'slate'} note="visa and passport" />
        <StatTile label="Next trip" value={next ? next.departDate.slice(5) : 'None'} icon="trips" tone="indigo" note={next ? pkg.get(next.packageId)?.name : 'nothing booked'} />
      </div>

      <Card title={`Bookings (${bookings.length})`}>
        <ul className="divide-y divide-line text-sm">
          {bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0"><b className="font-semibold text-ink">{pkg.get(b.packageId)?.name ?? 'Package'}</b><span className="block text-slate-500">{b.destination} · {b.departDate} · {b.pax} {b.pax === 1 ? 'traveller' : 'travellers'}</span></span>
              <Chip tone={STATUS_TONE[b.status]}>{b.status}</Chip>
            </li>
          ))}
          {!bookings.length && <li className="py-2 text-slate-400">No bookings yet.</li>}
        </ul>
      </Card>
      <Card title={`Visa and passport cases (${visas.length + passports.length})`}>
        <ul className="divide-y divide-line text-sm">
          {[...visas.map((v) => ({ ...v, type: 'Visa' })), ...passports.map((v) => ({ ...v, type: 'Passport' }))].map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><b className="font-semibold text-ink">{v.type} · {v.kind}</b><span className="block text-slate-500">Applied {v.appliedAt}{v.deadline ? ` · due ${v.deadline}` : ''} · {money(v.fee)}</span></span>
              <Chip tone={CASE_DONE.includes(v.stage) ? 'emerald' : v.deadline && v.deadline < t ? 'rose' : 'amber'}>{v.stage}</Chip>
            </li>
          ))}
          {!visas.length && !passports.length && <li className="py-2 text-slate-400">No cases.</li>}
        </ul>
      </Card>
      <Card title={`Air tickets (${tickets.length})`}>
        <ul className="divide-y divide-line text-sm">
          {tickets.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><b className="font-semibold text-ink">{x.from} to {x.to}</b><span className="block text-slate-500">{x.airline} · {x.date}</span></span>
              <span className="num font-semibold text-ink">{money(x.fare)}</span>
            </li>
          ))}
          {!tickets.length && <li className="py-2 text-slate-400">No tickets.</li>}
        </ul>
      </Card>
      {editing && <EditCustomer customer={c} onClose={() => setEditing(false)} />}
    </div>
  )
}
