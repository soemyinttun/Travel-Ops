import { useState, type FormEvent } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { DESTINATIONS, ORIGINS, PASSPORT_KINDS, PASSPORT_STAGES, VISA_KINDS, VISA_STAGES, type Booking, type BookingStatus, type Case, type Customer, type Ticket } from '../types'
import { btn, btnGhost, inp, today } from './ui'
import { Dialog, Field } from './Dialog'
import { CustomerSelect } from './CustomerSelect'

const STATUSES: BookingStatus[] = ['enquiry', 'confirmed', 'completed', 'cancelled']
const CITIES = [...ORIGINS, ...DESTINATIONS].map((p) => p.name)

function Actions({ onClose, error }: { onClose: () => void; error?: string }) {
  return (
    <>
      {error && <p role="alert" className="text-sm font-medium text-rose-ink">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btn}>Save changes</button>
      </div>
    </>
  )
}

export function EditBooking({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { data, money } = useApp()
  const [f, setF] = useState({ customerId: booking.customerId, packageId: booking.packageId, destination: booking.destination, departDate: booking.departDate, pax: booking.pax, status: booking.status })
  const [error, setError] = useState('')
  const country = data?.packages.find((p) => p.id === f.packageId)?.country
  const dests = DESTINATIONS.filter((d) => d.country === country)
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.customerId) return setError('Choose a customer.')
    if (!f.departDate) return setError('Choose a departure date.')
    if (f.pax < 1) return setError('At least 1 traveller.')
    await store.patch('bookings', booking.id, f)
    onClose()
  }
  return (
    <Dialog title="Edit booking" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Customer"><CustomerSelect value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} /></Field>
        <Field label="Package">
          <select className={inp} value={f.packageId} onChange={(e) => { const c = data?.packages.find((p) => p.id === e.target.value)?.country; setF({ ...f, packageId: e.target.value, destination: DESTINATIONS.find((d) => d.country === c)?.name ?? f.destination }) }}>
            {data?.packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
          </select>
        </Field>
        <Field label="Place"><select className={inp} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })}>{dests.map((d) => <option key={d.name}>{d.name}</option>)}{!dests.some((d) => d.name === f.destination) && <option>{f.destination}</option>}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Departure"><input className={inp} type="date" value={f.departDate} onChange={(e) => setF({ ...f, departDate: e.target.value })} /></Field>
          <Field label="Travellers"><input className={inp} type="number" min={1} value={f.pax || ''} onChange={(e) => setF({ ...f, pax: Math.max(0, Math.floor(+e.target.value)) })} /></Field>
        </div>
        <Field label="Status"><select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as BookingStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Actions onClose={onClose} error={error} />
      </form>
    </Dialog>
  )
}

export function EditCustomer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [f, setF] = useState({ name: customer.name, phone: customer.phone, township: customer.township, passportExpiry: customer.passportExpiry })
  const [error, setError] = useState('')
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return setError('The name cannot be empty.')
    await store.patch('customers', customer.id, { ...f, name: f.name.trim() })
    onClose()
  }
  return (
    <Dialog title="Edit customer" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Full name"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className={inp} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Home town"><select className={inp} value={f.township} onChange={(e) => setF({ ...f, township: e.target.value })}>{ORIGINS.map((o) => <option key={o.name}>{o.name}</option>)}{!ORIGINS.some((o) => o.name === f.township) && <option>{f.township}</option>}</select></Field>
        <Field label="Passport expiry"><input className={inp} type="date" value={f.passportExpiry} onChange={(e) => setF({ ...f, passportExpiry: e.target.value })} /></Field>
        <Actions onClose={onClose} error={error} />
      </form>
    </Dialog>
  )
}

export function EditCase({ kind, row, onClose }: { kind: 'visa' | 'passport'; row: Case; onClose: () => void }) {
  const stages = kind === 'visa' ? VISA_STAGES : PASSPORT_STAGES
  const kinds: string[] = kind === 'visa' ? VISA_KINDS : PASSPORT_KINDS
  const done = kind === 'visa' ? ['Approved', 'Rejected', 'Delivered'] : ['Ready', 'Collected']
  const [f, setF] = useState({ customerId: row.customerId, kind: row.kind, stage: row.stage, fee: row.fee, deadline: row.deadline ?? '' })
  const [error, setError] = useState('')
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.customerId) return setError('Choose a customer.')
    if (f.fee < 0) return setError('The fee cannot be negative.')
    const finished = done.includes(f.stage)
    await store.patch(kind === 'visa' ? 'visas' : 'passports', row.id, {
      customerId: f.customerId, kind: f.kind, stage: f.stage, fee: f.fee, deadline: f.deadline || undefined,
      decidedAt: finished ? row.decidedAt ?? today() : undefined,
    })
    onClose()
  }
  return (
    <Dialog title={`Edit ${kind} case`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Customer"><CustomerSelect value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={inp} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{kinds.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Step"><select className={inp} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>{stages.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Fee (Ks)"><input className={inp} type="number" min={0} value={f.fee} onChange={(e) => setF({ ...f, fee: +e.target.value })} /></Field>
          <Field label="Deadline"><input className={inp} type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        </div>
        <Actions onClose={onClose} error={error} />
      </form>
    </Dialog>
  )
}

export function EditTicket({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const [f, setF] = useState({ customerId: ticket.customerId, direction: ticket.direction, from: ticket.from, to: ticket.to, airline: ticket.airline, date: ticket.date, fare: ticket.fare, commission: ticket.commission })
  const [error, setError] = useState('')
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.customerId) return setError('Choose a passenger.')
    if (f.from === f.to) return setError('From and to must be different.')
    await store.patch('tickets', ticket.id, f)
    onClose()
  }
  return (
    <Dialog title="Edit ticket" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Passenger"><CustomerSelect value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Direction"><select className={inp} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as Ticket['direction'] })}><option>Outbound</option><option>Inbound</option></select></Field>
          <Field label="Date"><input className={inp} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="From"><select className={inp} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="To"><select className={inp} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Fare (Ks)"><input className={inp} type="number" min={0} value={f.fare} onChange={(e) => setF({ ...f, fare: +e.target.value })} /></Field>
          <Field label="Commission (Ks)"><input className={inp} type="number" min={0} value={f.commission} onChange={(e) => setF({ ...f, commission: +e.target.value })} /></Field>
        </div>
        <Field label="Airline"><input className={inp} value={f.airline} onChange={(e) => setF({ ...f, airline: e.target.value })} /></Field>
        <Actions onClose={onClose} error={error} />
      </form>
    </Dialog>
  )
}
